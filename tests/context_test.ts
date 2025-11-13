/**
 * Tests for TextContext with savedPosition
 */

import { assertEquals } from "@std/assert";
import type { Position, TextContext } from "../denops/ai-edit/types.ts";

Deno.test("TextContext should have optional savedPosition field", () => {
  // Red phase: This test expects savedPosition to be available
  const cursorPos: Position = { line: 1, column: 1 };
  const savedPos: Position = { line: 5, column: 10 };

  const context: TextContext = {
    cursorPosition: cursorPos,
    savedPosition: savedPos, // This should be accepted by type checker
    bufferInfo: {
      bufnr: 1,
      filetype: "typescript",
      lines: 100,
    },
  };

  assertEquals(context.savedPosition, savedPos);
  assertEquals(context.cursorPosition, cursorPos);
});

Deno.test("TextContext should work without savedPosition", () => {
  const cursorPos: Position = { line: 1, column: 1 };

  const context: TextContext = {
    cursorPosition: cursorPos,
    bufferInfo: {
      bufnr: 1,
      filetype: "typescript",
      lines: 100,
    },
  };

  assertEquals(context.savedPosition, undefined);
  assertEquals(context.cursorPosition, cursorPos);
});

Deno.test("savedPosition should preserve original cursor position for async commands", () => {
  const originalPos: Position = { line: 10, column: 5 };
  const currentPos: Position = { line: 20, column: 15 };

  // Simulate scenario: command executed at line 10, but cursor moved to line 20
  const context: TextContext = {
    cursorPosition: currentPos, // Current cursor position
    savedPosition: originalPos, // Position when command was executed
    bufferInfo: {
      bufnr: 1,
      filetype: "typescript",
      lines: 100,
    },
  };

  // Should be able to retrieve original position
  assertEquals(context.savedPosition?.line, 10);
  assertEquals(context.savedPosition?.column, 5);

  // Current position should also be available
  assertEquals(context.cursorPosition.line, 20);
  assertEquals(context.cursorPosition.column, 15);
});
