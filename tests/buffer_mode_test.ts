/**
 * Tests for BufferManager mode detection
 * This verifies that getVisualSelection() correctly handles Normal vs Visual mode
 */

import { assertEquals } from "@std/assert";
import { BufferManager } from "../denops/ai-edit/buffer.ts";
import type { Denops } from "jsr:@denops/std@^8.1.1";

class MockDenops {
  private currentMode: string;
  private visualMarks: { start: number[], end: number[] };

  constructor(mode: string, hasVisualMarks: boolean = false) {
    this.currentMode = mode;
    // Simulate previous visual selection marks
    this.visualMarks = hasVisualMarks
      ? { start: [0, 10, 1, 0], end: [0, 15, 10, 0] }
      : { start: [0, 0, 0, 0], end: [0, 0, 0, 0] };
  }

  async call(fn: string, ...args: unknown[]): Promise<unknown> {
    if (fn === "mode") {
      return this.currentMode;
    }
    if (fn === "getpos") {
      const mark = args[0] as string;
      if (mark === "'<") {
        return this.visualMarks.start;
      }
      if (mark === "'>") {
        return this.visualMarks.end;
      }
    }
    if (fn === "bufnr") {
      return 1;
    }
    if (fn === "getline") {
      // Return mock line content
      return ["Mock line content for testing"];
    }
    return undefined;
  }

  // Add required Denops interface properties (minimal implementation)
  name = "ai-edit-test";
  dispatcher = {};
  async cmd(_command: string): Promise<void> {}
  async eval(_expr: string): Promise<unknown> { return undefined; }
  async batch(..._calls: unknown[]): Promise<unknown[]> { return []; }
  async redraw(_force?: boolean): Promise<void> {}

  // Additional required properties
  meta = {
    host: "nvim" as const,
    mode: "debug" as const,
    platform: "linux" as const,
    version: "0.10.0",
  };
  context = {};
  async dispatch(_name: string, ..._args: unknown[]): Promise<unknown> {
    return undefined;
  }
}

Deno.test("getVisualSelection() returns undefined in Normal mode (even with previous marks)", async () => {
  // Simulate: User was in Visual mode, now in Normal mode with marks still present
  const denops = new MockDenops("n", true); // Normal mode with visual marks
  const bufferManager = new BufferManager(denops as Denops);

  const selection = await bufferManager.getVisualSelection();

  assertEquals(
    selection,
    undefined,
    "Should return undefined in Normal mode, even if visual marks exist from previous selection"
  );
});

Deno.test("getVisualSelection() returns text in Visual line mode", async () => {
  // Simulate: User is in Visual line mode with active selection
  const denops = new MockDenops("V", true); // Visual line mode with marks
  const bufferManager = new BufferManager(denops as Denops);

  const selection = await bufferManager.getVisualSelection();

  assertEquals(
    typeof selection,
    "string",
    "Should return text content in Visual line mode"
  );
});

Deno.test("getVisualSelection() returns text in Visual character mode", async () => {
  const denops = new MockDenops("v", true); // Visual character mode with marks
  const bufferManager = new BufferManager(denops as Denops);

  const selection = await bufferManager.getVisualSelection();

  assertEquals(
    typeof selection,
    "string",
    "Should return text content in Visual character mode"
  );
});

Deno.test("getVisualSelection() returns text in Visual block mode", async () => {
  const denops = new MockDenops("\x16", true); // Ctrl-V (Visual block mode) with marks
  const bufferManager = new BufferManager(denops as Denops);

  const selection = await bufferManager.getVisualSelection();

  assertEquals(
    typeof selection,
    "string",
    "Should return text content in Visual block mode"
  );
});

Deno.test("getVisualSelection() returns undefined in Normal mode without marks", async () => {
  const denops = new MockDenops("n", false); // Normal mode without marks
  const bufferManager = new BufferManager(denops as Denops);

  const selection = await bufferManager.getVisualSelection();

  assertEquals(
    selection,
    undefined,
    "Should return undefined in Normal mode without visual marks"
  );
});

Deno.test("getVisualSelection() returns undefined in Insert mode", async () => {
  const denops = new MockDenops("i", true); // Insert mode (even with marks)
  const bufferManager = new BufferManager(denops as Denops);

  const selection = await bufferManager.getVisualSelection();

  assertEquals(
    selection,
    undefined,
    "Should return undefined in Insert mode"
  );
});
