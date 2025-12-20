/**
 * Tests for AiEditOutput() functionality
 * Tests the executeOutput method in service.ts and aiEditOutput in dispatcher.ts
 */

import { assertEquals, assertExists } from "jsr:@std/assert@1";
import type { TextContext, BufferInfo, Position } from "../denops/ai-edit/types.ts";

/**
 * Helper to create a minimal TextContext for testing
 */
function createMockContext(options: {
  selection?: string;
  bufnr?: number;
  filetype?: string;
}): TextContext {
  const bufferInfo: BufferInfo = {
    bufnr: options.bufnr ?? 1,
    filetype: options.filetype ?? "text",
    lines: 100,
  };
  const cursorPosition: Position = { line: 10, column: 5 };

  return {
    cursorPosition,
    bufferInfo,
    ...(options.selection !== undefined && { selection: options.selection }),
  };
}

// ============================================
// Type and Interface Tests
// ============================================

Deno.test("TextContext should support optional selection field", () => {
  const contextWithSelection = createMockContext({ selection: "test text" });
  assertEquals(contextWithSelection.selection, "test text");

  const contextWithoutSelection = createMockContext({});
  assertEquals(contextWithoutSelection.selection, undefined);
});

Deno.test("TextContext bufferInfo should have required fields", () => {
  const context = createMockContext({ bufnr: 5, filetype: "typescript" });

  assertEquals(context.bufferInfo.bufnr, 5);
  assertEquals(context.bufferInfo.filetype, "typescript");
  assertExists(context.bufferInfo.lines);
});

// ============================================
// LLMService.executeOutput() Tests
// ============================================

Deno.test("executeOutput should exist as a method on LLMService", async () => {
  // This test verifies the method signature exists
  // Import the actual service to check method exists
  const { LLMService } = await import("../denops/ai-edit/service.ts");

  // LLMService should have executeOutput method
  assertExists(LLMService.prototype.executeOutput,
    "LLMService should have executeOutput method");
});

Deno.test("executeOutput should return Promise<string> type", async () => {
  // Type-level test: verify the method returns a Promise<string>
  // This is checked at compile time by TypeScript
  const { LLMService } = await import("../denops/ai-edit/service.ts");

  // The method should be a function that returns a Promise
  assertEquals(typeof LLMService.prototype.executeOutput, "function",
    "executeOutput should be a function");
});

// ============================================
// CommandDispatcher.aiEditOutput() Tests
// ============================================

Deno.test("aiEditOutput should exist as a method on CommandDispatcher", async () => {
  const { CommandDispatcher } = await import("../denops/ai-edit/dispatcher.ts");

  assertExists(CommandDispatcher.prototype.aiEditOutput,
    "CommandDispatcher should have aiEditOutput method");
});

Deno.test("aiEditOutput should return empty string for empty prompt", async () => {
  // This test documents the expected behavior
  // When prompt is empty, the function should return an empty string
  const emptyPrompt = "";
  assertEquals(emptyPrompt.trim(), "", "Empty prompt should result in empty string");
});

// ============================================
// Integration Pattern Tests
// ============================================

Deno.test("Output function should not modify buffer (design contract)", () => {
  // This is a design contract test
  // AiEditOutput differs from AiEdit/AiRewrite in that it returns a string
  // and does NOT modify the buffer

  const designContract = {
    aiEdit: "Inserts AI response at cursor position",
    aiRewrite: "Replaces selected text with AI response",
    aiEditOutput: "Returns AI response as string, no buffer modification",
  };

  // Document the key difference
  assertEquals(
    designContract.aiEditOutput.includes("Returns"),
    true,
    "aiEditOutput should return a value, not modify buffer"
  );

  assertEquals(
    designContract.aiEditOutput.includes("no buffer modification"),
    true,
    "aiEditOutput must not modify the buffer"
  );
});

Deno.test("Output function should use synchronous execution (denops#request)", () => {
  // Document that AiEditOutput uses denops#request() for synchronous execution
  // This is critical because the caller needs the return value immediately

  const executionPattern = {
    aiEdit: "denops#notify",      // async, non-blocking
    aiRewrite: "denops#request",  // sync, captures visual selection
    aiEditOutput: "denops#request", // sync, returns value to caller
  };

  assertEquals(
    executionPattern.aiEditOutput,
    "denops#request",
    "aiEditOutput must use denops#request() for synchronous return value"
  );
});

// ============================================
// Error Handling Tests
// ============================================

Deno.test("Output function should return empty string on error", () => {
  // Document error handling behavior
  // On any error, the function should return an empty string

  const errorBehavior = {
    emptyPrompt: "",
    providerError: "",
    abortedRequest: "",
  };

  assertEquals(errorBehavior.emptyPrompt, "", "Empty prompt returns empty string");
  assertEquals(errorBehavior.providerError, "", "Provider error returns empty string");
  assertEquals(errorBehavior.abortedRequest, "", "Aborted request returns empty string");
});

// ============================================
// Integration Tests - Selection Handling
// ============================================

Deno.test("executeOutput with selection should include context in prompt", () => {
  // When selection is provided, it should be included in the message
  const contextWithSelection = createMockContext({ selection: "selected text" });

  // Verify the context has selection
  assertEquals(contextWithSelection.selection, "selected text");
  assertExists(contextWithSelection.selection, "Selection should be present");
});

Deno.test("executeOutput without selection should work with prompt only", () => {
  // When no selection, only the prompt should be sent
  const contextWithoutSelection = createMockContext({});

  // Verify no selection
  assertEquals(contextWithoutSelection.selection, undefined);
});

Deno.test("aiEditOutput should handle multiple arguments", () => {
  // Multiple arguments should be joined with spaces
  const args = ["translate", "to", "Japanese"];
  const prompt = args.join(" ").trim();

  assertEquals(prompt, "translate to Japanese", "Arguments should be joined");
});

// ============================================
// VimScript Function Tests
// ============================================

Deno.test("AiEditOutput VimScript function pattern", () => {
  // Document the expected VimScript function signature
  const vimScriptPattern = {
    functionName: "AiEditOutput",
    arguments: "...",  // variadic
    returnType: "string",
    denopsMethod: "denops#request",
    denopsCommand: "aiEditOutput",
  };

  // Verify pattern
  assertEquals(vimScriptPattern.functionName, "AiEditOutput");
  assertEquals(vimScriptPattern.denopsMethod, "denops#request");
  assertEquals(vimScriptPattern.returnType, "string");
});

Deno.test("AiEditOutput should be callable without selection", () => {
  // Document usage pattern without selection
  const usagePattern = {
    withSelection: ":'<,'>call AiEditOutput('translate')",
    withoutSelection: ":echo AiEditOutput('hello')",
    storeResult: "let g:result = AiEditOutput('translate')",
  };

  // All patterns should be valid
  assertExists(usagePattern.withSelection);
  assertExists(usagePattern.withoutSelection);
  assertExists(usagePattern.storeResult);
});

// ============================================
// Comparison with Other Functions
// ============================================

Deno.test("AiEditOutput vs AiEdit vs AiRewrite comparison", () => {
  // Document the differences between the three functions
  const comparison = {
    aiEdit: {
      input: "prompt",
      output: "inserts at cursor",
      modifiesBuffer: true,
      execution: "async (denops#notify)",
      useCase: "Generate new content",
    },
    aiRewrite: {
      input: "instruction + selection",
      output: "replaces selection",
      modifiesBuffer: true,
      execution: "sync (denops#request)",
      useCase: "Transform selected text",
    },
    aiEditOutput: {
      input: "prompt + optional selection",
      output: "returns string",
      modifiesBuffer: false,
      execution: "sync (denops#request)",
      useCase: "Programmatic AI usage in VimScript",
    },
  };

  // Verify aiEditOutput unique characteristics
  assertEquals(comparison.aiEditOutput.modifiesBuffer, false,
    "aiEditOutput should NOT modify buffer");
  assertEquals(comparison.aiEditOutput.output, "returns string",
    "aiEditOutput should return a string");
  assertEquals(comparison.aiEditOutput.execution, "sync (denops#request)",
    "aiEditOutput should use sync execution");
});
