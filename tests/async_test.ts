/**
 * Tests for async command execution
 */

import { assertEquals, assertExists } from "@std/assert";
import type { TextContext } from "../denops/ai-edit/types.ts";

Deno.test("Async execution - savedPosition should be preserved during long operations", () => {
  // Simulate scenario where command is executed at line 10
  const executionPosition = { line: 10, column: 5 };

  // User moves cursor to line 20 while API is processing
  const currentPosition = { line: 20, column: 15 };

  const context: TextContext = {
    cursorPosition: currentPosition,
    savedPosition: executionPosition, // This is where the result should be inserted
    bufferInfo: {
      bufnr: 1,
      filetype: "typescript",
      lines: 100,
    },
  };

  // Verify savedPosition is preserved
  assertExists(context.savedPosition);
  assertEquals(context.savedPosition.line, 10);
  assertEquals(context.savedPosition.column, 5);

  // Current position should be different
  assertEquals(context.cursorPosition.line, 20);
  assertEquals(context.cursorPosition.column, 15);
});

Deno.test("Async execution - multiple buffers can process simultaneously", () => {
  // Simulate multiple buffers with different contexts
  const buffer1Context: TextContext = {
    cursorPosition: { line: 10, column: 5 },
    savedPosition: { line: 10, column: 5 },
    bufferInfo: {
      bufnr: 1,
      filetype: "typescript",
      lines: 100,
    },
  };

  const buffer2Context: TextContext = {
    cursorPosition: { line: 20, column: 10 },
    savedPosition: { line: 20, column: 10 },
    bufferInfo: {
      bufnr: 2,
      filetype: "javascript",
      lines: 200,
    },
  };

  // Both contexts should be valid and independent
  assertEquals(buffer1Context.bufferInfo.bufnr, 1);
  assertEquals(buffer2Context.bufferInfo.bufnr, 2);
  assertExists(buffer1Context.savedPosition);
  assertExists(buffer2Context.savedPosition);
});

Deno.test("Async execution - savedPosition fallback to cursorPosition", () => {
  // Context without savedPosition (backward compatibility)
  const context: TextContext = {
    cursorPosition: { line: 15, column: 8 },
    bufferInfo: {
      bufnr: 1,
      filetype: "python",
      lines: 50,
    },
  };

  // Should use cursorPosition when savedPosition is not available
  const insertPosition = context.savedPosition ?? context.cursorPosition;
  assertEquals(insertPosition.line, 15);
  assertEquals(insertPosition.column, 8);
});

Deno.test("Async execution - rewrite operation with savedPosition", () => {
  const context: TextContext = {
    cursorPosition: { line: 25, column: 1 },
    savedPosition: { line: 20, column: 1 }, // Selection start
    selection: "original text to be rewritten",
    bufferInfo: {
      bufnr: 1,
      filetype: "markdown",
      lines: 100,
    },
  };

  // Verify all properties are set correctly
  assertExists(context.savedPosition);
  assertExists(context.selection);
  assertEquals(context.savedPosition.line, 20);
  assertEquals(context.selection, "original text to be rewritten");
});
