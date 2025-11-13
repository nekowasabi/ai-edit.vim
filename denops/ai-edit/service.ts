/**
 * LLM service for ai-edit.vim
 */

import type { Denops } from "jsr:@denops/std@^8.1.1";
import type { Message, TextContext, Language } from "./types.ts";
import { ConfigManager } from "./config.ts";
import { BufferManager } from "./buffer.ts";
import { ProviderFactory } from "./providers/factory.ts";
import { OpenRouterProvider } from "./providers/openrouter.ts";
import { AiEditError } from "./errors.ts";

/**
 * System message templates for different languages
 */
const SYSTEM_MESSAGES: Record<Language, Record<string, string>> = {
  en: {
    base: "You are a helpful AI assistant for editing code. The current file type is: {filetype}",
  },
  ja: {
    base: "あなたはコード編集を支援する有用なAIアシスタントです。現在のファイルタイプは: {filetype}",
  },
};

/**
 * LLM Service for managing LLM interactions
 */
export class LLMService {
  private denops: Denops;
  private configManager: ConfigManager;
  private bufferManager: BufferManager;
  private providerFactory: ProviderFactory;
  private isProcessing = false;
  private abortController: AbortController | null = null;

  constructor(denops: Denops) {
    this.denops = denops;
    this.configManager = new ConfigManager(denops);
    this.bufferManager = new BufferManager(denops);
    this.providerFactory = new ProviderFactory();

    // Register default providers
    this.providerFactory.registerProvider("openrouter", OpenRouterProvider);
  }

  /**
   * Execute prompt with LLM
   */
  async executePrompt(prompt: string, context?: TextContext): Promise<void> {
    if (this.isProcessing) {
      await this.denops.cmd("echo '[ai-edit] Another request is in progress'");
      return;
    }

    this.isProcessing = true;
    this.abortController = new AbortController();

    try {
      // Show progress message
      await this.denops.cmd("echo '[ai-edit] Generating response...'");

      // Build messages
      const messages = await this.buildMessages(prompt, context);

      // Get provider config and create provider
      const providerConfig = await this.configManager.getProviderConfig();
      const providerName = await this.configManager.getProvider();
      const provider = this.providerFactory.getProvider(providerName, providerConfig);

      // Get starting position for insertion
      const insertPosition = context?.selection
        ? await this.getSelectionEndPosition()
        : context?.cursorPosition || await this.bufferManager.getCursorPosition();

      // Insert empty line to start streaming
      await this.bufferManager.insertText("", insertPosition);

      // Process streaming response
      let isFirstChunk = true;
      for await (const chunk of provider.sendRequest(messages)) {
        if (this.abortController?.signal.aborted) {
          await this.denops.cmd("echo '[ai-edit] Request cancelled'");
          break;
        }

        if (isFirstChunk) {
          // For first chunk, replace the empty line
          await this.bufferManager.insertText(chunk, insertPosition);
          isFirstChunk = false;
        } else {
          // For subsequent chunks, append to buffer
          await this.bufferManager.appendStreamChunk(chunk);
        }

        // Redraw to show streaming updates
        await this.denops.cmd("redraw");
      }

      await this.denops.cmd("echo '[ai-edit] Response complete'");
    } catch (error) {
      await this.handleError(error);
    } finally {
      this.isProcessing = false;
      this.abortController = null;
    }
  }

  /**
   * Cancel ongoing request
   */
  cancelRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Execute rewrite with LLM and replace selection
   */
  async executeRewrite(instruction: string, context: TextContext): Promise<void> {
    if (this.isProcessing) {
      await this.denops.cmd("echo '[ai-edit] Another request is in progress'");
      return;
    }

    // Validate that we have a selection
    if (!context.selection) {
      await this.denops.cmd("echo '[ai-edit] Error: No text selected. Please select text in visual mode first.'");
      return;
    }

    this.isProcessing = true;
    this.abortController = new AbortController();

    try {
      // Show progress message
      await this.denops.cmd("echo '[ai-edit] Rewriting text...'");

      // Build messages with rewrite instruction
      const messages = await this.buildRewriteMessages(instruction, context);

      // Get provider config and create provider
      const providerConfig = await this.configManager.getProviderConfig();
      const providerName = await this.configManager.getProvider();
      const provider = this.providerFactory.getProvider(providerName, providerConfig);

      // Collect the full response
      let fullResponse = "";
      for await (const chunk of provider.sendRequest(messages)) {
        if (this.abortController?.signal.aborted) {
          await this.denops.cmd("echo '[ai-edit] Request cancelled'");
          return;
        }
        fullResponse += chunk;
      }

      // Replace selection with the response
      await this.bufferManager.replaceSelection(fullResponse);

      await this.denops.cmd("echo '[ai-edit] Text rewritten successfully'");
    } catch (error) {
      await this.handleError(error);
    } finally {
      this.isProcessing = false;
      this.abortController = null;
    }
  }

  /**
   * Build messages from prompt and context
   */
  private async buildMessages(prompt: string, context?: TextContext): Promise<Message[]> {
    const messages: Message[] = [];

    // Add system message if needed
    if (context?.bufferInfo.filetype && context.bufferInfo.filetype !== "text") {
      const language = await this.configManager.getLanguage();
      const template = SYSTEM_MESSAGES[language].base;
      const systemMessage = template.replace("{filetype}", context.bufferInfo.filetype);

      messages.push({
        role: "system",
        content: systemMessage,
      });
    }

    // Build user message
    let userContent = prompt;

    if (context?.selection) {
      userContent = `Context:\n\`\`\`\n${context.selection}\n\`\`\`\n\n${prompt}`;
    }

    messages.push({
      role: "user",
      content: userContent,
    });

    return messages;
  }

  /**
   * Build messages for rewrite operation
   */
  private async buildRewriteMessages(instruction: string, context: TextContext): Promise<Message[]> {
    const messages: Message[] = [];

    // Add system message
    const language = await this.configManager.getLanguage();
    let systemMessage: string;

    if (language === "ja") {
      systemMessage = "あなたはテキスト書き換えの専門家です。ユーザーが選択したテキストを、指示に従って書き換えてください。";
      if (context.bufferInfo.filetype && context.bufferInfo.filetype !== "text") {
        systemMessage += `\n現在のファイルタイプ: ${context.bufferInfo.filetype}`;
      }
      systemMessage += "\n\n重要: 書き換えたテキストのみを出力してください。説明や追加のコメントは不要です。";
    } else {
      systemMessage = "You are a text rewriting specialist. Rewrite the user's selected text according to their instructions.";
      if (context.bufferInfo.filetype && context.bufferInfo.filetype !== "text") {
        systemMessage += `\nCurrent file type: ${context.bufferInfo.filetype}`;
      }
      systemMessage += "\n\nImportant: Output only the rewritten text. No explanations or additional comments needed.";
    }

    messages.push({
      role: "system",
      content: systemMessage,
    });

    // Build user message with selected text and instruction
    const userContent = language === "ja"
      ? `選択されたテキスト:\n\`\`\`\n${context.selection}\n\`\`\`\n\n指示: ${instruction}`
      : `Selected text:\n\`\`\`\n${context.selection}\n\`\`\`\n\nInstruction: ${instruction}`;

    messages.push({
      role: "user",
      content: userContent,
    });

    return messages;
  }

  /**
   * Get end position of visual selection
   */
  private async getSelectionEndPosition() {
    const endPos = await this.denops.call("getpos", "'>") as number[];
    return {
      line: endPos[1],
      column: endPos[2],
    };
  }

  /**
   * Handle errors
   */
  private async handleError(error: unknown): Promise<void> {
    let errorMessage = "An unknown error occurred";

    if (error instanceof AiEditError) {
      errorMessage = `[ai-edit] ${error.name}: ${error.message}`;
      if (error.details) {
        console.error("Error details:", error.details);
      }
    } else if (error instanceof Error) {
      errorMessage = `[ai-edit] Error: ${error.message}`;
    }

    await this.denops.cmd(`echo '${errorMessage.replace(/'/g, "''")}'`);
  }
}
