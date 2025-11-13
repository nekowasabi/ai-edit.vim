/**
 * Tests for provider factory and OpenRouter provider
 */

import { assertEquals, assertExists } from "@std/assert";
import { ProviderFactory } from "../denops/ai-edit/providers/factory.ts";
import { OpenRouterProvider } from "../denops/ai-edit/providers/openrouter.ts";
import type { ProviderConfig } from "../denops/ai-edit/types.ts";

Deno.test("ProviderFactory - register and get provider", () => {
  const factory = new ProviderFactory();
  factory.registerProvider("openrouter", OpenRouterProvider);

  const config: ProviderConfig = {
    apiKey: "test-key",
    model: "test-model",
  };

  const provider = factory.getProvider("openrouter", config);
  assertExists(provider);
});

Deno.test("ProviderFactory - has provider check", () => {
  const factory = new ProviderFactory();
  factory.registerProvider("openrouter", OpenRouterProvider);

  assertEquals(factory.hasProvider("openrouter"), true);
  assertEquals(factory.hasProvider("unknown"), false);
});

Deno.test("ProviderFactory - list registered providers", () => {
  const factory = new ProviderFactory();
  factory.registerProvider("openrouter", OpenRouterProvider);
  factory.registerProvider("test-provider", OpenRouterProvider);

  const providers = factory.getProviderNames();
  assertEquals(providers.length, 2);
  assertEquals(providers.includes("openrouter"), true);
  assertEquals(providers.includes("test-provider"), true);
});

Deno.test("OpenRouterProvider - validate config with valid API key", () => {
  const config: ProviderConfig = {
    apiKey: "test-api-key",
    model: "anthropic/claude-3.5-sonnet",
  };

  const provider = new OpenRouterProvider(config);
  assertEquals(provider.validateConfig(config), true);
});

Deno.test("OpenRouterProvider - create with custom base URL", () => {
  const config: ProviderConfig = {
    apiKey: "test-key",
    baseUrl: "https://custom.api.com/v1",
    model: "custom-model",
  };

  const provider = new OpenRouterProvider(config);
  assertExists(provider);
});
