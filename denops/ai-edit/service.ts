/**
 * LLM service for ai-edit.vim
 */

import type { Denops } from "jsr:@denops/std@^8.1.1";
import type { Language, Message, Position, TextContext } from "./types.ts";
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
    base:
      "あなたはコード編集を支援する有用なAIアシスタントです。現在のファイルタイプは: {filetype}",
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
  /**
   * Per-buffer processing state for concurrent operations
   * Maps buffer number to processing status
   */
  private processingBuffers = new Map<number, boolean>();
  /**
   * Per-buffer abort controllers for granular cancellation
   * Maps buffer number to its AbortController instance
   */
  private abortControllers = new Map<number, AbortController>();

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
    const bufnr = context?.bufferInfo.bufnr ?? await this.denops.call("bufnr", "%") as number;

    // Check if this buffer is already processing
    if (this.processingBuffers.get(bufnr)) {
      await this.denops.cmd("echo '[ai-edit] Another request is in progress for this buffer'");
      return;
    }

    // Mark buffer as processing
    this.processingBuffers.set(bufnr, true);
    const abortController = new AbortController();
    this.abortControllers.set(bufnr, abortController);

    try {
      // Show progress message with position info
      const line = context?.savedPosition?.line ?? context?.cursorPosition.line;
      await this.denops.cmd(`echo '[ai-edit] Generating response at line ${line}...'`);

      // Build messages
      const messages = await this.buildMessages(prompt, context);

      // Get provider config and create provider
      const providerConfig = await this.configManager.getProviderConfig();
      const providerName = await this.configManager.getProvider();
      const provider = this.providerFactory.getProvider(providerName, providerConfig);

      // Get starting position for insertion
      // Use savedPosition (position when command was executed) if available
      // This ensures async operations insert at the correct location even if cursor moved
      let insertPosition: Position;

      if (context?.selection && context.selection.length > 0) {
        // Visual mode with selection: insert after selection
        insertPosition = await this.getSelectionInsertPosition();
      } else if (context?.savedPosition) {
        // Normal mode: use saved position (cursor + 1)
        insertPosition = context.savedPosition;
      } else {
        // Fallback: use current cursor position
        insertPosition = context?.cursorPosition ??
          await this.bufferManager.getCursorPosition();
      }

      // Reset streaming position for this new request
      this.bufferManager.resetStreamPosition();

      // Process streaming response
      let isFirstChunk = true;
      for await (const chunk of provider.sendRequest(messages)) {
        if (abortController.signal.aborted) {
          await this.denops.cmd("echo '[ai-edit] Request cancelled'");
          break;
        }

        if (isFirstChunk) {
          // For first chunk, insert at the saved position
          await this.bufferManager.insertText(chunk, insertPosition);
          isFirstChunk = false;
        } else {
          // For subsequent chunks, join with previous undo block
          // This allows all chunks to be undone in a single operation
          try {
            await this.denops.cmd("undojoin");
          } catch {
            // undojoin may fail in some edge cases, but continue streaming
          }
          // Append to buffer
          await this.bufferManager.appendStreamChunk(chunk);
        }

        // Redraw to show streaming updates
        await this.denops.cmd("redraw");
      }

      // Show completion message with position info
      const completionLine = context?.savedPosition?.line ?? context?.cursorPosition.line;
      await this.denops.cmd(`echo '[ai-edit] Response inserted at line ${completionLine}'`);
    } catch (error) {
      await this.handleError(error);
    } finally {
      // Clean up buffer processing state
      this.processingBuffers.delete(bufnr);
      this.abortControllers.delete(bufnr);
    }
  }

  /**
   * Cancel ongoing request for current buffer
   */
  async cancelRequest(): Promise<void> {
    const bufnr = await this.denops.call("bufnr", "%") as number;
    const abortController = this.abortControllers.get(bufnr);

    if (abortController) {
      abortController.abort();
      this.processingBuffers.delete(bufnr);
      this.abortControllers.delete(bufnr);
    }
  }

  /**
   * Execute rewrite with LLM and replace selection
   */
  async executeRewrite(instruction: string, context: TextContext): Promise<void> {
    const bufnr = context.bufferInfo.bufnr;

    // Check if this buffer is already processing
    if (this.processingBuffers.get(bufnr)) {
      await this.denops.cmd("echo '[ai-edit] Another request is in progress for this buffer'");
      return;
    }

    // Validate that we have a selection
    if (!context.selection) {
      await this.denops.cmd(
        "echo '[ai-edit] Error: No text selected. Please select text in visual mode first.'",
      );
      return;
    }

    // Mark buffer as processing
    this.processingBuffers.set(bufnr, true);
    const abortController = new AbortController();
    this.abortControllers.set(bufnr, abortController);

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
        if (abortController.signal.aborted) {
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
      // Clean up buffer processing state
      this.processingBuffers.delete(bufnr);
      this.abortControllers.delete(bufnr);
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
  private async buildRewriteMessages(
    instruction: string,
    context: TextContext,
  ): Promise<Message[]> {
    const messages: Message[] = [];

    // Add system message
    const language = await this.configManager.getLanguage();
    let systemMessage: string;

    if (language === "ja") {
      systemMessage =
        "あなたはテキスト書き換えの専門家です。ユーザーが選択したテキストを、指示に従って書き換えてください。";
      if (context.bufferInfo.filetype && context.bufferInfo.filetype !== "text") {
        systemMessage += `\n現在のファイルタイプ: ${context.bufferInfo.filetype}`;
      }
      systemMessage +=
        "\n\n重要: 書き換えたテキストのみを出力してください。説明や追加のコメントは不要です。";
    } else {
      systemMessage =
        "You are a text rewriting specialist. Rewrite the user's selected text according to their instructions.";
      if (context.bufferInfo.filetype && context.bufferInfo.filetype !== "text") {
        systemMessage += `\nCurrent file type: ${context.bufferInfo.filetype}`;
      }
      systemMessage +=
        "\n\nImportant: Output only the rewritten text. No explanations or additional comments needed.";
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
  private async getSelectionInsertPosition() {
    const endPos = await this.denops.call("getpos", "'>") as number[];
    return {
      // Insert on the line AFTER the selection ends so the AI response does not
      // overwrite or precede the highlighted text. `appendbufline` expects the
      // target line to be the one we are inserting before, so we offset by +1.
      line: endPos[1] + 1,
      column: 1,
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
