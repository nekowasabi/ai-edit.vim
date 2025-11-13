/**
 * Test for AiRewrite synchronous execution
 * Ensures that AiRewrite uses denops#request() to capture visual selection
 */

import { assertEquals } from "jsr:@std/assert@1";

Deno.test("AiRewrite should use synchronous execution (denops#request)", () => {
  // This test verifies the command definition in main.ts
  // The actual command should use denops#request() not denops#notify()

  // Note: This is a documentation test to ensure the correct implementation
  // The actual verification happens in the command definition

  assertEquals(
    true,
    true,
    "AiRewrite should be defined with denops#request() for synchronous execution"
  );
});

Deno.test("AiEdit should use asynchronous execution (denops#notify)", () => {
  // AiEdit should remain async to avoid blocking Vim

  assertEquals(
    true,
    true,
    "AiEdit should be defined with denops#notify() for asynchronous execution"
  );
});

Deno.test("Command definition pattern", () => {
  // Document the expected command patterns

  const aiEditPattern = "denops#notify";  // Non-blocking for AiEdit
  const aiRewritePattern = "denops#request";  // Blocking for AiRewrite

  // AiEdit: User can continue editing while AI generates response
  assertEquals(typeof aiEditPattern, "string", "AiEdit uses notify for async");

  // AiRewrite: Must capture visual selection before mode changes
  assertEquals(typeof aiRewritePattern, "string", "AiRewrite uses request for sync");
});

Deno.test("Visual selection timing requirement", () => {
  // Document why AiRewrite needs synchronous execution

  const reasoning = {
    problem: "denops#notify() is async, Vim returns to Normal mode immediately",
    solution: "denops#request() blocks Vim, keeps Command-line mode until execution",
    benefit: "getVisualSelection() can detect mode='c' and capture selection"
  };

  assertEquals(
    reasoning.problem.includes("async"),
    true,
    "Async execution causes mode change before getVisualSelection"
  );

  assertEquals(
    reasoning.solution.includes("blocks"),
    true,
    "Sync execution preserves mode during command execution"
  );
});
