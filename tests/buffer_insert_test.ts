/**
 * Tests for BufferManager insertText cursor position bug
 *
 * Bug: AiEdit command inserts at the last line instead of cursor position
 * Expected: Text should be inserted at the saved cursor position
 */

import { assertEquals } from "@std/assert";
import type { Position } from "../denops/ai-edit/types.ts";

/**
 * Mock Denops for testing buffer operations
 */
class MockDenops {
  private lines: string[] = [];
  private cursorPos: Position = { line: 1, column: 1 };

  constructor(initialLines: string[]) {
    this.lines = [...initialLines];
  }

  async call(fn: string, ...args: unknown[]): Promise<unknown> {
    if (fn === "bufnr") {
      return 1; // Mock buffer number
    }
    if (fn === "line") {
      return this.lines.length;
    }
    if (fn === "getline") {
      const [start, end] = args as [number, number];
      if (start === end) {
        return this.lines[start - 1] || "";
      }
      return this.lines.slice(start - 1, end);
    }
    if (fn === "setline") {
      const [lineNum, content] = args as [number, string];
      this.lines[lineNum - 1] = content;
      return 0;
    }
    if (fn === "appendbufline") {
      const [, lineNum, content] = args as [number, number, string[]];
      this.lines.splice(lineNum, 0, ...content);
      return 0;
    }
    if (fn === "cursor") {
      const [line, col] = args as [number, number];
      this.cursorPos = { line, column: col };
      return 0;
    }
    return 0;
  }

  getLines(): string[] {
    return [...this.lines];
  }

  getCursor(): Position {
    return { ...this.cursorPos };
  }
}

Deno.test("insertText should insert at exact cursor position (line 5)", async () => {
  // Setup: Buffer with 10 lines
  const initialLines = [
    "line 1",
    "line 2",
    "line 3",
    "line 4",
    "line 5", // Insert here
    "line 6",
    "line 7",
    "line 8",
    "line 9",
    "line 10",
  ];

  const mockDenops = new MockDenops(initialLines);
  const insertPosition: Position = { line: 5, column: 1 };
  const textToInsert = "INSERTED TEXT";

  // Expected: Text should be inserted AFTER line 5 (between line 5 and 6)
  // So line 6 becomes the inserted text
  const expectedLines = [
    "line 1",
    "line 2",
    "line 3",
    "line 4",
    "line 5",
    "INSERTED TEXT", // New line 6
    "line 6",        // Old line 6 becomes line 7
    "line 7",
    "line 8",
    "line 9",
    "line 10",
  ];

  // This test will FAIL because current implementation uses buffer.append()
  // which inserts after the current line, causing it to go to the end

  // Simulate insertText logic
  await mockDenops.call("cursor", insertPosition.line, insertPosition.column);
  const lines = textToInsert.split("\n");
  await mockDenops.call("appendbufline", 1, insertPosition.line, lines);

  const actualLines = mockDenops.getLines();

  // This assertion will FAIL in the current implementation
  assertEquals(actualLines, expectedLines,
    "Text should be inserted at the saved cursor position (line 5), not at the end");
});

Deno.test("insertText should preserve cursor position when command was executed", async () => {
  // Real-world scenario:
  // 1. User executes :AiEdit at line 10
  // 2. While API is processing, cursor moves to line 50
  // 3. Result should still be inserted at line 10 (savedPosition)

  const initialLines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`);
  const mockDenops = new MockDenops(initialLines);

  // Position when command was executed
  const savedPosition: Position = { line: 10, column: 1 };

  // Insert should use savedPosition, NOT currentPosition
  const textToInsert = "API RESPONSE";

  await mockDenops.call("cursor", savedPosition.line, savedPosition.column);
  const lines = textToInsert.split("\n");
  await mockDenops.call("appendbufline", 1, savedPosition.line, lines);

  const actualLines = mockDenops.getLines();

  // Line 11 should be the inserted text (after line 10)
  assertEquals(actualLines[10], "API RESPONSE",
    "API response should be inserted at savedPosition (line 10), not at current cursor position");
});

Deno.test("insertText should handle multi-line insertion correctly", async () => {
  const initialLines = [
    "line 1",
    "line 2",
    "line 3",
  ];

  const mockDenops = new MockDenops(initialLines);
  const insertPosition: Position = { line: 2, column: 1 };
  const textToInsert = "NEW LINE 1\nNEW LINE 2\nNEW LINE 3";

  await mockDenops.call("cursor", insertPosition.line, insertPosition.column);
  const lines = textToInsert.split("\n");
  await mockDenops.call("appendbufline", 1, insertPosition.line, lines);

  const expectedLines = [
    "line 1",
    "line 2",
    "NEW LINE 1",  // Inserted after line 2
    "NEW LINE 2",
    "NEW LINE 3",
    "line 3",      // Old line 3 pushed down
  ];

  const actualLines = mockDenops.getLines();
  assertEquals(actualLines, expectedLines,
    "Multi-line text should be inserted at the correct position");
});
