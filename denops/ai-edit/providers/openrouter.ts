/**
 * OpenRouter provider implementation
 */

import type {
  ChatRequest,
  ChatResponse,
  LLMProviderInterface,
  Message,
  ProviderConfig,
} from "../types.ts";
import {
  ApiError,
  AuthenticationError,
  ErrorCode,
  NetworkError,
  RateLimitError,
  ValidationError,
} from "../errors.ts";

/**
 * OpenRouter API provider
 */
export class OpenRouterProvider implements LLMProviderInterface {
  private config: ProviderConfig;
  private baseUrl: string;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || "https://openrouter.ai/api/v1";

    if (!this.validateConfig(config)) {
      throw new ValidationError("Invalid OpenRouter configuration", ErrorCode.INVALID_CONFIG_ERROR);
    }
  }

  /**
   * Validate provider configuration
   */
  validateConfig(config: ProviderConfig): boolean {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new ValidationError("API key is required", ErrorCode.MISSING_API_KEY_ERROR);
    }
    return true;
  }

  /**
   * Send request to OpenRouter API and get streaming response
   */
  async *sendRequest(messages: Message[]): AsyncGenerator<string, void, unknown> {
    const request: ChatRequest = {
      messages,
      model: this.config.model || "anthropic/claude-3.5-sonnet",
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      stream: this.config.stream !== false, // Default to true
    };

    // Add provider preference if specified
    if (this.config.provider) {
      request.provider = { order: [this.config.provider] };
    }

    const url = `${this.baseUrl}/chat/completions`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.apiKey}`,
          "HTTP-Referer": "https://github.com/your-username/ai-edit.vim",
          "X-Title": "ai-edit.vim",
        },
        body: JSON.stringify(request),
      });

      // Handle error responses
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // Handle streaming response
      if (request.stream && response.body) {
        yield* this.handleStreamingResponse(response.body);
      } else {
        // Handle non-streaming response
        const data = await response.json() as ChatResponse;
        const content = data.choices[0]?.message?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new NetworkError("Network connection failed", error);
      }
      throw new NetworkError("Failed to send request to OpenRouter", error);
    }
  }

  /**
   * Handle error response
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    const statusCode = response.status;
    let errorMessage = `API Error: ${statusCode}`;

    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorMessage;
    } catch {
      // Failed to parse error response
    }

    switch (statusCode) {
      case 401:
        throw new AuthenticationError(
          "Invalid API key or authentication failed",
          { statusCode, message: errorMessage },
        );
      case 429: {
        const retryAfter = response.headers.get("Retry-After");
        throw new RateLimitError(
          "Rate limit exceeded",
          retryAfter ? parseInt(retryAfter, 10) : undefined,
          { statusCode, message: errorMessage },
        );
      }
      case 400:
        throw new ApiError(
          `Bad request: ${errorMessage}`,
          ErrorCode.INVALID_REQUEST_ERROR,
          statusCode,
        );
      case 500:
      case 502:
      case 503:
        throw new ApiError(
          `Server error: ${errorMessage}`,
          ErrorCode.SERVER_ERROR,
          statusCode,
        );
      default:
        throw new ApiError(
          errorMessage,
          ErrorCode.API_ERROR,
          statusCode,
        );
    }
  }

  /**
   * Handle streaming response
   */
  private async *handleStreamingResponse(
    body: ReadableStream<Uint8Array>,
  ): AsyncGenerator<string, void, unknown> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Keep the last incomplete line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") {
            continue;
          }

          if (trimmed.startsWith("data: ")) {
            try {
              const jsonStr = trimmed.substring(6);
              const data = JSON.parse(jsonStr) as ChatResponse;
              const content = data.choices[0]?.delta?.content;

              if (content) {
                yield content;
              }
            } catch (error) {
              // Skip invalid JSON
              console.error("Failed to parse streaming response:", error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
