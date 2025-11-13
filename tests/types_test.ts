/**
 * Tests for type definitions
 */

import { assertEquals, assertExists } from "@std/assert";
import type { Message, ProviderConfig, ChatRequest, TextContext } from "../denops/ai-edit/types.ts";

Deno.test("Message type - create valid message", () => {
  const message: Message = {
    role: "user",
    content: "Hello, world!",
  };

  assertEquals(message.role, "user");
  assertEquals(message.content, "Hello, world!");
});

Deno.test("ProviderConfig type - create valid config", () => {
  const config: ProviderConfig = {
    apiKey: "test-key",
    model: "test-model",
    temperature: 0.7,
    maxTokens: 1000,
  };

  assertExists(config.apiKey);
  assertEquals(config.model, "test-model");
  assertEquals(config.temperature, 0.7);
  assertEquals(config.maxTokens, 1000);
});

Deno.test("ChatRequest type - create valid request", () => {
  const request: ChatRequest = {
    messages: [
      { role: "user", content: "Test message" },
    ],
    model: "test-model",
    temperature: 0.5,
    max_tokens: 500,
    stream: true,
  };

  assertEquals(request.messages.length, 1);
  assertEquals(request.model, "test-model");
  assertEquals(request.stream, true);
});

Deno.test("TextContext type - create valid context", () => {
  const context: TextContext = {
    cursorPosition: { line: 10, column: 5 },
    bufferInfo: {
      bufnr: 1,
      filetype: "typescript",
      lines: 100,
    },
    selection: "selected text",
  };

  assertEquals(context.cursorPosition.line, 10);
  assertEquals(context.bufferInfo.filetype, "typescript");
  assertExists(context.selection);
});
