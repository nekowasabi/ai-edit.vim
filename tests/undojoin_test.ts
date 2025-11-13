import { assertEquals } from "@std/assert";
import type { Denops } from "jsr:@denops/std@^8.1.1";

import { BufferManager } from "../denops/ai-edit/buffer.ts";
import type { Position } from "../denops/ai-edit/types.ts";

class RecordingDenops implements Denops {
  lines: string[];
  cmdHistory: string[] = [];

  constructor(initialLines: string[]) {
    this.lines = [...initialLines];
  }

  async cmd(command: string): Promise<void> {
    this.cmdHistory.push(command);
  }

  clearCmdHistory() {
    this.cmdHistory = [];
  }

  async call(fn: string, ...args: unknown[]): Promise<unknown> {
    switch (fn) {
      case "bufnr":
        return 1;
      case "line":
        if (args[0] === "$") {
          return this.lines.length;
        }
        return 0;
      case "getline": {
        const [start, end] = args as [number, number];
        if (start === end) {
          return this.lines[start - 1];
        }
        return this.lines.slice(start - 1, end);
      }
      case "setline": {
        const [lineNum, content] = args as [number, string];
        this.lines[lineNum - 1] = content;
        return 0;
      }
      case "appendbufline": {
        const [, lineNum, newLines] = args as [number, number, string[]];
        this.lines.splice(lineNum, 0, ...newLines);
        return 0;
      }
    }
    return 0;
  }

  // Minimal stubs for Denops interface
  name = "test";
  meta = { host: "nvim" as const, mode: "test" as const, platform: "linux" as const, version: "0.9" };
  context = {};
  dispatcher = {};
  async eval(_expr: string): Promise<unknown> { return undefined; }
  async batch(_calls: unknown[]): Promise<unknown[]> { return []; }
  async redraw(_force?: boolean): Promise<void> {}
  async dispatch(_name: string, ..._args: unknown[]): Promise<unknown> { return undefined; }
}

async function setupManager(initialLines: string[]): Promise<{
  manager: BufferManager;
  denops: RecordingDenops;
}> {
  const denops = new RecordingDenops(initialLines);
  const manager = new BufferManager(denops as Denops);

  const insertPosition: Position = { line: 2, column: 1 };
  await manager.insertText("FIRST", insertPosition);
  denops.clearCmdHistory();

  return { manager, denops };
}

Deno.test("appendStreamChunk should undojoin single-line chunks", async () => {
  const { manager, denops } = await setupManager(["line 1", "line 2", "line 3"]);

  await manager.appendStreamChunk(" chunk");

  assertEquals(
    denops.cmdHistory,
    ["undojoin"],
    "Single-line chunks should trigger one undojoin before modifying the buffer",
  );
});

Deno.test("appendStreamChunk should undojoin multi-line chunks for each buffer write", async () => {
  const { manager, denops } = await setupManager(["line 1", "line 2", "line 3"]);

  await manager.appendStreamChunk(" chunk\nextra line");

  assertEquals(
    denops.cmdHistory,
    ["undojoin", "undojoin"],
    "Multi-line chunks should undojoin before setline and before appendbufline",
  );
});
