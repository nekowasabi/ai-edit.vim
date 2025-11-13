/**
 * Main entry point for ai-edit.vim Denops plugin
 */

import type { Denops } from "jsr:@denops/std@^8.1.1";
import { CommandDispatcher } from "./dispatcher.ts";

/**
 * Main function - entry point for Denops plugin
 */
export async function main(denops: Denops): Promise<void> {
  const dispatcher = new CommandDispatcher(denops);

  // Register dispatcher methods
  denops.dispatcher = {
    /**
     * Execute AI edit command (supports both normal and visual mode)
     */
    async aiEdit(...args: unknown[]): Promise<void> {
      await dispatcher.aiEdit(denops, args as string[]);
    },

    /**
     * Cancel ongoing AI request
     */
    async aiEditCancel(): Promise<void> {
      await dispatcher.aiEditCancel(denops);
    },

    /**
     * Execute AI rewrite command (visual mode only)
     */
    async aiRewrite(...args: unknown[]): Promise<void> {
      await dispatcher.aiRewrite(denops, args as string[]);
    },
  };

  // Define Vim commands
  // Use denops#notify() for async commands (AiEdit, AiRewrite) to avoid blocking Vim
  // Use denops#request() for AiEditCancel to ensure immediate cancellation
  await denops.cmd(
    `command! -range -nargs=+ AiEdit call denops#notify('${denops.name}', 'aiEdit', [<f-args>])`,
  );

  await denops.cmd(
    `command! AiEditCancel call denops#request('${denops.name}', 'aiEditCancel', [])`,
  );

  await denops.cmd(
    `command! -range -nargs=+ AiRewrite call denops#notify('${denops.name}', 'aiRewrite', [<f-args>])`,
  );

  // Log successful initialization
  console.log("ai-edit.vim plugin loaded successfully");
}
