/**
 * Configuration manager for ai-edit.vim
 */

import type { Denops } from "jsr:@denops/std@^8.1.1";
import * as vars from "jsr:@denops/std@^8.1.1/variable";
import type { ProviderConfig, Language } from "./types.ts";
import { ValidationError, ErrorCode } from "./errors.ts";

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  provider: "openrouter",
  model: "anthropic/claude-3.5-sonnet",
  temperature: 0.7,
  maxTokens: 4096,
  stream: true,
  baseUrl: "https://openrouter.ai/api/v1",
  language: "en" as Language,
} as const;

/**
 * Configuration manager
 */
export class ConfigManager {
  private denops: Denops;

  constructor(denops: Denops) {
    this.denops = denops;
  }

  /**
   * Get provider name from Vim variable or default
   */
  async getProvider(): Promise<string> {
    try {
      const provider = await vars.g.get(this.denops, "ai_edit_provider");
      return typeof provider === "string" ? provider : DEFAULT_CONFIG.provider;
    } catch {
      return DEFAULT_CONFIG.provider;
    }
  }

  /**
   * Get API key from environment variable or Vim variable
   */
  async getApiKey(): Promise<string> {
    // Try environment variable first (more secure)
    const envKey = Deno.env.get("OPENROUTER_API_KEY");
    if (envKey) {
      return envKey;
    }

    // Fallback to Vim variable
    try {
      const vimKey = await vars.g.get(this.denops, "ai_edit_api_key");
      if (typeof vimKey === "string" && vimKey.length > 0) {
        return vimKey;
      }
    } catch {
      // Variable not set
    }

    throw new ValidationError(
      "API key not found. Set OPENROUTER_API_KEY environment variable or g:ai_edit_api_key.",
      ErrorCode.MISSING_API_KEY_ERROR,
    );
  }

  /**
   * Get model name from Vim variable or default
   */
  async getModel(): Promise<string> {
    try {
      const model = await vars.g.get(this.denops, "ai_edit_model");
      return typeof model === "string" ? model : DEFAULT_CONFIG.model;
    } catch {
      return DEFAULT_CONFIG.model;
    }
  }

  /**
   * Get temperature from Vim variable or default
   */
  async getTemperature(): Promise<number> {
    try {
      const temp = await vars.g.get(this.denops, "ai_edit_temperature");
      if (typeof temp === "number" && temp >= 0 && temp <= 2) {
        return temp;
      }
      return DEFAULT_CONFIG.temperature;
    } catch {
      return DEFAULT_CONFIG.temperature;
    }
  }

  /**
   * Get max tokens from Vim variable or default
   */
  async getMaxTokens(): Promise<number> {
    try {
      const maxTokens = await vars.g.get(this.denops, "ai_edit_max_tokens");
      if (typeof maxTokens === "number" && maxTokens > 0) {
        return maxTokens;
      }
      return DEFAULT_CONFIG.maxTokens;
    } catch {
      return DEFAULT_CONFIG.maxTokens;
    }
  }

  /**
   * Get stream flag from Vim variable or default
   */
  async getStream(): Promise<boolean> {
    try {
      const stream = await vars.g.get(this.denops, "ai_edit_stream");
      return typeof stream === "number" ? stream !== 0 : DEFAULT_CONFIG.stream;
    } catch {
      return DEFAULT_CONFIG.stream;
    }
  }

  /**
   * Get base URL from Vim variable or default
   */
  async getBaseUrl(): Promise<string | undefined> {
    try {
      const baseUrl = await vars.g.get(this.denops, "ai_edit_base_url");
      return typeof baseUrl === "string" ? baseUrl : DEFAULT_CONFIG.baseUrl;
    } catch {
      return DEFAULT_CONFIG.baseUrl;
    }
  }

  /**
   * Get language from Vim variable or default
   */
  async getLanguage(): Promise<Language> {
    try {
      const language = await vars.g.get(this.denops, "ai_edit_language");
      if (typeof language === "string" && (language === "en" || language === "ja")) {
        return language;
      }
      return DEFAULT_CONFIG.language;
    } catch {
      return DEFAULT_CONFIG.language;
    }
  }

  /**
   * Get full provider configuration
   */
  async getProviderConfig(): Promise<ProviderConfig> {
    const [apiKey, model, temperature, maxTokens, stream, baseUrl] = await Promise.all([
      this.getApiKey(),
      this.getModel(),
      this.getTemperature(),
      this.getMaxTokens(),
      this.getStream(),
      this.getBaseUrl(),
    ]);

    return {
      apiKey,
      model,
      temperature,
      maxTokens,
      stream,
      baseUrl,
    };
  }

  /**
   * Validate configuration
   */
  validateConfig(config: ProviderConfig): boolean {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new ValidationError(
        "API key is required",
        ErrorCode.MISSING_API_KEY_ERROR,
      );
    }

    if (config.temperature !== undefined) {
      if (config.temperature < 0 || config.temperature > 2) {
        throw new ValidationError(
          "Temperature must be between 0 and 2",
          ErrorCode.INVALID_CONFIG_ERROR,
        );
      }
    }

    if (config.maxTokens !== undefined) {
      if (config.maxTokens <= 0) {
        throw new ValidationError(
          "Max tokens must be greater than 0",
          ErrorCode.INVALID_CONFIG_ERROR,
        );
      }
    }

    return true;
  }
}
