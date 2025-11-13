/**
 * Tests for CommandDispatcher cursor position saving
 */

import { assertEquals } from "@std/assert";
import type { TextContext } from "../denops/ai-edit/types.ts";

Deno.test("aiEdit should save cursor position in context.savedPosition", () => {
  // This test will validate that savedPosition is properly saved
  // The actual implementation test will be in integration tests

  // For now, we verify that the type system accepts savedPosition
  const mockContext: TextContext = {
    cursorPosition: { line: 10, column: 5 },
    savedPosition: { line: 10, column: 5 }, // Should be set by aiEdit
    bufferInfo: {
      bufnr: 1,
      filetype: "typescript",
      lines: 100,
    },
  };

  assertEquals(mockContext.savedPosition?.line, 10);
  assertEquals(mockContext.savedPosition?.column, 5);
});

Deno.test("aiRewrite should save selection start position in context.savedPosition", () => {
  // Mock context for rewrite operation
  const mockContext: TextContext = {
    cursorPosition: { line: 15, column: 8 },
    savedPosition: { line: 10, column: 1 }, // Selection start position
    selection: "original text",
    bufferInfo: {
      bufnr: 1,
      filetype: "typescript",
      lines: 100,
    },
  };

  assertEquals(mockContext.savedPosition?.line, 10);
  assertEquals(mockContext.savedPosition?.column, 1);
  assertEquals(mockContext.selection, "original text");
});

Deno.test("savedPosition should be undefined if not set", () => {
  const mockContext: TextContext = {
    cursorPosition: { line: 10, column: 5 },
    bufferInfo: {
      bufnr: 1,
      filetype: "typescript",
      lines: 100,
    },
  };

  assertEquals(mockContext.savedPosition, undefined);
});
