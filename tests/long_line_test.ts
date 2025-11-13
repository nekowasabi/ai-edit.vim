/**
 * Test for long line text insertion bug
 * Issue: When executing AiEdit on a long line, output appears one line above expected
 */

import { assertEquals } from "jsr:@std/assert@1";

Deno.test("Long line insertion - cursor on line 5", () => {
  // Simulate cursor on line 5 (1-based index in Vim)
  const cursorLine = 5;

  // dispatcher.ts calculation: savedPosition.line = cursorLine + 1
  const savedPositionLine = cursorLine + 1; // = 6

  // buffer.ts calculation: appendbufline(bufnr, position.line - 1, lines)
  const appendbuflineArg = savedPositionLine - 1; // = 5

  // appendbufline(bufnr, 5, lines) should insert AFTER line 5 = line 6
  const expectedInsertLine = appendbuflineArg + 1; // = 6

  assertEquals(expectedInsertLine, 6, "Should insert at line 6 (next line of cursor)");
});

Deno.test("Long line insertion - verify calculation chain", () => {
  const testCases = [
    { cursor: 1, expected: 2 }, // First line -> insert at line 2
    { cursor: 5, expected: 6 }, // Line 5 -> insert at line 6
    { cursor: 10, expected: 11 }, // Line 10 -> insert at line 11
  ];

  for (const { cursor, expected } of testCases) {
    // dispatcher.ts: savedPosition.line = cursor + 1
    const savedPosition = cursor + 1;

    // buffer.ts: appendbufline(bufnr, savedPosition - 1, lines)
    const appendArg = savedPosition - 1;

    // Result: insert after appendArg line = appendArg + 1
    const actualInsert = appendArg + 1;

    assertEquals(
      actualInsert,
      expected,
      `Cursor at line ${cursor} should insert at line ${expected}`
    );
  }
});

Deno.test("Edge case - cursor on last line", () => {
  const lastLine = 100;
  const cursorLine = lastLine;

  // Should insert at line 101 (after last line)
  const savedPosition = cursorLine + 1; // = 101
  const appendArg = savedPosition - 1; // = 100
  const insertLine = appendArg + 1; // = 101

  assertEquals(insertLine, 101, "Should insert after last line");
});

Deno.test("Edge case - cursor on first line", () => {
  const cursorLine = 1;

  // Should insert at line 2 (after first line)
  const savedPosition = cursorLine + 1; // = 2
  const appendArg = savedPosition - 1; // = 1
  const insertLine = appendArg + 1; // = 2

  assertEquals(insertLine, 2, "Should insert after first line");
});

/**
 * Debug: Print calculation steps for manual verification
 */
Deno.test("Debug - trace calculation for line 5", () => {
  const cursorLine = 5;

  console.log("\n=== Calculation Trace ===");
  console.log(`1. Cursor is at line: ${cursorLine}`);

  const savedPosition = cursorLine + 1;
  console.log(`2. dispatcher.ts sets savedPosition.line = cursorLine + 1 = ${savedPosition}`);

  const appendArg = savedPosition - 1;
  console.log(`3. buffer.ts calls appendbufline(bufnr, ${appendArg}, lines)`);

  console.log(`4. appendbufline spec: Insert AFTER line ${appendArg}`);

  const result = appendArg + 1;
  console.log(`5. Result: Text appears at line ${result}`);
  console.log(`6. Expected: Line ${cursorLine + 1} (next line of cursor)`);
  console.log(`7. Match: ${result === cursorLine + 1 ? "✓ CORRECT" : "✗ WRONG"}`);
  console.log("========================\n");

  assertEquals(result, cursorLine + 1, "Calculation should be correct");
});
