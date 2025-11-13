/**
 * Command dispatcher for ai-edit.vim
 */

import type { Denops } from "jsr:@denops/std@^8.1.1";
import { LLMService } from "./service.ts";
import { BufferManager } from "./buffer.ts";

/**
 * Command dispatcher
 */
export class CommandDispatcher {
  private llmService: LLMService;
  private bufferManager: BufferManager;

  constructor(denops: Denops) {
    this.llmService = new LLMService(denops);
    this.bufferManager = new BufferManager(denops);
  }

  /**
   * Handle :AiEdit command (supports both normal and visual mode)
   */
  async aiEdit(denops: Denops, args: string[]): Promise<void> {
    const prompt = args.join(" ").trim();

    if (!prompt) {
      await denops.cmd("echo '[ai-edit] Error: Prompt is required'");
      return;
    }

    try {
      // Get context including visual selection (if any)
      const context = await this.bufferManager.getCurrentContext();

      // Save the current cursor position for async operations
      const savedPosition = await this.bufferManager.getCursorPosition();
      context.savedPosition = savedPosition;

      // Automatically handle both normal and visual mode
      // based on whether a selection exists
      await this.llmService.executePrompt(prompt, context);
    } catch (error) {
      await denops.cmd(
        `echo '[ai-edit] Error: ${error instanceof Error ? error.message : "Unknown error"}'`,
      );
    }
  }

  /**
   * Cancel ongoing request
   */
  async aiEditCancel(denops: Denops): Promise<void> {
    await this.llmService.cancelRequest();
    await denops.cmd("echo '[ai-edit] Cancelling request...'");
  }

  /**
   * Handle :AiRewrite command (visual mode only)
   */
  async aiRewrite(denops: Denops, args: string[]): Promise<void> {
    const instruction = args.join(" ").trim();

    if (!instruction) {
      await denops.cmd("echo '[ai-edit] Error: Instruction is required'");
      return;
    }

    try {
      // Get context including visual selection
      const context = await this.bufferManager.getCurrentContext();

      // Save the cursor position when command was executed
      // For rewrite, we save the selection start position
      const savedPosition = await this.bufferManager.getCursorPosition();
      context.savedPosition = savedPosition;

      // Execute rewrite operation
      await this.llmService.executeRewrite(instruction, context);
    } catch (error) {
      await denops.cmd(
        `echo '[ai-edit] Error: ${error instanceof Error ? error.message : "Unknown error"}'`,
      );
    }
  }
}
