/**
 * Provider factory for ai-edit.vim
 */

import type { LLMProviderConstructor, LLMProviderInterface, ProviderConfig } from "../types.ts";
import { ErrorCode, ProviderError } from "../errors.ts";

/**
 * Provider factory for creating LLM provider instances
 */
export class ProviderFactory {
  private providers: Map<string, LLMProviderConstructor> = new Map();
  private defaultProvider = "openrouter";

  /**
   * Register a provider
   */
  registerProvider(name: string, provider: LLMProviderConstructor): void {
    this.providers.set(name.toLowerCase(), provider);
  }

  /**
   * Get provider instance
   */
  getProvider(name: string | undefined, config: ProviderConfig): LLMProviderInterface {
    const providerName = (name || this.defaultProvider).toLowerCase();
    const ProviderClass = this.providers.get(providerName);

    if (!ProviderClass) {
      throw new ProviderError(
        `Provider '${providerName}' not found. Available providers: ${
          Array.from(this.providers.keys()).join(", ")
        }`,
        ErrorCode.PROVIDER_NOT_FOUND_ERROR,
      );
    }

    try {
      return new ProviderClass(config);
    } catch (error) {
      throw new ProviderError(
        `Failed to initialize provider '${providerName}'`,
        ErrorCode.PROVIDER_INITIALIZATION_ERROR,
        error,
      );
    }
  }

  /**
   * Check if provider is registered
   */
  hasProvider(name: string): boolean {
    return this.providers.has(name.toLowerCase());
  }

  /**
   * Get list of registered providers
   */
  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }
}
