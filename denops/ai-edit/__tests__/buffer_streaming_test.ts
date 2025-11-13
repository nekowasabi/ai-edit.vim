/**
 * Tests for streaming output position in BufferManager
 * This test verifies that streaming chunks are inserted at the correct position,
 * not at the end of the buffer.
 */

import { assertEquals } from "@std/assert";
import type { Denops } from "@denops/std";
import { BufferManager } from "../buffer.ts";

// Mock Denops implementation for testing
class MockDenops {
  private lines: string[] = [];
  private bufnr = 1;

  async call(fn: string, ...args: unknown[]): Promise<unknown> {
    if (fn === "bufnr") {
      return this.bufnr;
    }
    if (fn === "getpos") {
      // Mock getpos for visual selection (not used in this test)
      return [0, 0, 0, 0];
    }
    if (fn === "line") {
      const lineArg = args[0];
      if (lineArg === "$") {
        return this.lines.length;
      }
      return this.lines.length;
    }
    if (fn === "getline") {
      const line = args[0] as number;
      if (line >= 1 && line <= this.lines.length) {
        return this.lines[line - 1];
      }
      return "";
    }
    if (fn === "setline") {
      const line = args[0] as number;
      const content = args[1] as string;
      if (line >= 1 && line <= this.lines.length) {
        this.lines[line - 1] = content;
      }
      return null;
    }
    if (fn === "appendbufline") {
      const line = args[1] as number;
      const newLines = args[2] as string[];

      // Insert after 'line'
      this.lines.splice(line, 0, ...newLines);
      return null;
    }
    return null;
  }

  // Helper methods for testing
  setLines(lines: string[]) {
    this.lines = [...lines];
  }

  getLines(): string[] {
    return [...this.lines];
  }

  getLinesCount(): number {
    return this.lines.length;
  }
}

Deno.test("BufferManager - streaming chunks insert at correct position (line 5)", async () => {
  // Setup: Create buffer with 10 lines
  const mockDenops = new MockDenops();
  mockDenops.setLines([
    "line 1",
    "line 2",
    "line 3",
    "line 4",
    "line 5",  // User executes AiEdit here
    "line 6",
    "line 7",
    "line 8",
    "line 9",
    "line 10",
  ]);

  const bufferManager = new BufferManager(mockDenops as unknown as Denops);

  // Position where user executed the command (line 5)
  const insertPosition = { line: 5, column: 1 };

  // First chunk: Should insert at line 5
  await bufferManager.insertText("AI output line 1", insertPosition);

  // Verify first chunk is at line 5
  let lines = mockDenops.getLines();
  assertEquals(lines[4], "AI output line 1", "First chunk should be at line 5 (index 4)");
  assertEquals(lines[5], "line 5", "Original line 5 should now be at line 6 (index 5)");

  // Second chunk: Should append to line 6 (after first chunk), NOT to last line
  await bufferManager.appendStreamChunk("\nAI output line 2");

  lines = mockDenops.getLines();
  assertEquals(lines[5], "AI output line 2", "Second chunk should be at line 6 (index 5)");
  assertEquals(lines[6], "line 5", "Original line 5 should now be at line 7 (index 6)");

  // Verify last line is still "line 10", not AI output
  assertEquals(
    lines[lines.length - 1],
    "line 10",
    "Last line should still be 'line 10', not AI output"
  );

  // Third chunk: Should continue after second chunk
  await bufferManager.appendStreamChunk("\nAI output line 3");

  lines = mockDenops.getLines();
  assertEquals(lines[6], "AI output line 3", "Third chunk should be at line 7 (index 6)");
  assertEquals(lines[7], "line 5", "Original line 5 should now be at line 8 (index 7)");
});

Deno.test("BufferManager - streaming chunks with partial lines", async () => {
  // Setup
  const mockDenops = new MockDenops();
  mockDenops.setLines([
    "line 1",
    "line 2",
    "line 3",
  ]);

  const bufferManager = new BufferManager(mockDenops as unknown as Denops);
  const insertPosition = { line: 2, column: 1 };

  // First chunk: partial line (no newline)
  await bufferManager.insertText("Hello", insertPosition);

  let lines = mockDenops.getLines();
  assertEquals(lines[1], "Hello", "First partial chunk should be at line 2");

  // Second chunk: continue on same line (no newline)
  await bufferManager.appendStreamChunk(" World");

  lines = mockDenops.getLines();
  assertEquals(lines[1], "Hello World", "Second chunk should append to same line");

  // Third chunk: newline and new content
  await bufferManager.appendStreamChunk("\nNext line");

  lines = mockDenops.getLines();
  assertEquals(lines[1], "Hello World", "First line should remain unchanged");
  assertEquals(lines[2], "Next line", "New line should be added after first line");
});
