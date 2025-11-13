import { assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import type { Denops } from "jsr:@denops/std@^8.1.1";

import { LLMService } from "../denops/ai-edit/service.ts";
import { BufferManager } from "../denops/ai-edit/buffer.ts";
import { ConfigManager } from "../denops/ai-edit/config.ts";
import { ProviderFactory } from "../denops/ai-edit/providers/factory.ts";
import type { Language, Position, TextContext } from "../denops/ai-edit/types.ts";

class MockDenops {
  constructor(private readonly selectionEnd: Position) {}

  async cmd(_command: string): Promise<void> {
    // no-op for testing
  }

  async call(fn: string, ...args: unknown[]): Promise<unknown> {
    if (fn === "bufnr") {
      return 1;
    }

    if (fn === "getpos" && args[0] === "'>") {
      return [0, this.selectionEnd.line, this.selectionEnd.column, 0];
    }

    if (fn === "line" && args[0] === "$") {
      return 999;
    }

    return 0;
  }
}

Deno.test("AiEdit should insert streaming output after visual selection", async () => {
  const selectionEnd: Position = { line: 42, column: 7 };
  const denops = new MockDenops(selectionEnd) as unknown as Denops;
  const service = new LLMService(denops);

  const insertCalls: Position[] = [];

  const insertStub = stub(BufferManager.prototype, "insertText", async (_text, position) => {
    insertCalls.push(position);
  });
  const resetStub = stub(BufferManager.prototype, "resetStreamPosition", () => {});
  const appendStub = stub(BufferManager.prototype, "appendStreamChunk", async () => {
    return selectionEnd.line + 1;
  });

  const providerConfigStub = stub(ConfigManager.prototype, "getProviderConfig", async () => ({
    apiKey: "test-key",
  }));
  const providerStub = stub(ConfigManager.prototype, "getProvider", async () => "openrouter");
  const languageStub = stub(
    ConfigManager.prototype,
    "getLanguage",
    async (): Promise<Language> => "en",
  );

  const providerFactoryStub = stub(ProviderFactory.prototype, "getProvider", () => ({
    validateConfig: () => true,
    async *sendRequest() {
      yield "chunk-1";
      yield "chunk-2";
    },
  }));

  const context: TextContext = {
    selection: "const foo = 1;",
    cursorPosition: { line: 10, column: 1 },
    bufferInfo: { bufnr: 1, filetype: "typescript", lines: 200 },
  };

  try {
    await service.executePrompt("Explain selection", context);
  } finally {
    insertStub.restore();
    resetStub.restore();
    appendStub.restore();
    providerConfigStub.restore();
    providerStub.restore();
    languageStub.restore();
    providerFactoryStub.restore();
  }

  if (insertCalls.length === 0) {
    throw new Error("insertText was not called");
  }

  const firstInsert = insertCalls[0];
  assertEquals(
    firstInsert.line,
    selectionEnd.line + 1,
    "AiEdit output should start after the visual selection",
  );
  assertEquals(firstInsert.column, 1);
});
