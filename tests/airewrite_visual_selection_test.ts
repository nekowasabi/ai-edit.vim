/**
 * Test for AiRewrite visual selection bug
 * Reproduces the issue where visual selection is not captured in Command-line mode
 */

import { assertEquals } from "@std/assert";
import { BufferManager } from "../denops/ai-edit/buffer.ts";
import type { Denops } from "jsr:@denops/std@^8.1.1";

class MockDenops {
  private currentMode: string;

  constructor(mode: string) {
    this.currentMode = mode;
  }

  async call(fn: string, ...args: unknown[]): Promise<unknown> {
    if (fn === "mode") {
      return this.currentMode;
    }
    if (fn === "getpos") {
      const mark = args[0] as string;
      if (mark === "'<") {
        return [0, 10, 1, 0]; // Valid start mark
      }
      if (mark === "'>") {
        return [0, 15, 10, 0]; // Valid end mark
      }
    }
    if (fn === "bufnr") {
      return 1;
    }
    if (fn === "getline") {
      return ["Hello World"];
    }
    return undefined;
  }

  // Minimal Denops implementation
  name = "test";
  dispatcher = {};
  async cmd(_: string): Promise<void> {}
  async eval(_: string): Promise<unknown> { return undefined; }
  async batch(..._: unknown[]): Promise<unknown[]> { return []; }
  async redraw(_?: boolean): Promise<void> {}
  meta = { host: "nvim" as const, mode: "debug" as const, platform: "linux" as const, version: "0.10.0" };
  context = {};
  async dispatch(_: string, ..._args: unknown[]): Promise<unknown> { return undefined; }
}

Deno.test("AiRewrite: should capture selection in Command-line mode", async () => {
  // Simulate: User selected text in Visual mode, then executed :AiRewrite
  // At execution time, Vim is in Command-line mode ('c')
  const denops = new MockDenops("c");
  const bufferManager = new BufferManager(denops as Denops);

  const selection = await bufferManager.getVisualSelection();

  assertEquals(
    typeof selection,
    "string",
    "BUG: Should capture selection in Command-line mode (denops#request), but currently returns undefined"
  );
});

Deno.test("AiRewrite: should work with valid visual marks regardless of mode", async () => {
  // The fix: When visual marks are valid, mode should not matter
  const modes = ["c", "n", "v", "V", "\x16"];

  for (const mode of modes) {
    const denops = new MockDenops(mode);
    const bufferManager = new BufferManager(denops as Denops);

    const selection = await bufferManager.getVisualSelection();

    assertEquals(
      typeof selection,
      "string",
      `Should return selection in mode '${mode}' when marks are valid`
    );
  }
});
