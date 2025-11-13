/**
 * Error handler for ai-edit.vim
 */

import type { Denops } from "jsr:@denops/std@^8.1.1";
import {
  AiEditError,
  ApiError,
  AuthenticationError,
  BufferError,
  NetworkError,
  ProviderError,
  RateLimitError,
  ValidationError,
} from "./errors.ts";

/**
 * Error handler for managing and reporting errors
 */
export class ErrorHandler {
  private denops: Denops;
  private logFilePath: string;

  constructor(denops: Denops) {
    this.denops = denops;
    // Default log file path
    this.logFilePath = "~/.cache/ai-edit/error.log";
  }

  /**
   * Handle error and notify user
   */
  async handleError(error: unknown): Promise<void> {
    let message = "An unknown error occurred";
    let shouldLog = true;

    if (error instanceof ValidationError) {
      message = this.formatValidationError(error);
      shouldLog = false; // User errors don't need logging
    } else if (error instanceof AuthenticationError) {
      message = this.formatAuthenticationError(error);
    } else if (error instanceof RateLimitError) {
      message = this.formatRateLimitError(error);
    } else if (error instanceof ApiError) {
      message = this.formatApiError(error);
    } else if (error instanceof NetworkError) {
      message = this.formatNetworkError(error);
    } else if (error instanceof BufferError) {
      message = this.formatBufferError(error);
    } else if (error instanceof ProviderError) {
      message = this.formatProviderError(error);
    } else if (error instanceof AiEditError) {
      message = `[ai-edit] ${error.name}: ${error.message}`;
    } else if (error instanceof Error) {
      message = `[ai-edit] Error: ${error.message}`;
    }

    // Display error to user
    await this.denops.cmd(`echo '${message.replace(/'/g, "''")}'`);

    // Log error if needed
    if (shouldLog) {
      await this.logError(error, message);
    }
  }

  /**
   * Format validation error
   */
  private formatValidationError(error: ValidationError): string {
    return `[ai-edit] Configuration Error: ${error.message}`;
  }

  /**
   * Format authentication error
   */
  private formatAuthenticationError(error: AuthenticationError): string {
    return `[ai-edit] Authentication Error: ${error.message}\n` +
      "Please check your API key in OPENROUTER_API_KEY or g:ai_edit_api_key";
  }

  /**
   * Format rate limit error
   */
  private formatRateLimitError(error: RateLimitError): string {
    let message = `[ai-edit] Rate Limit Exceeded: ${error.message}`;
    if (error.retryAfter) {
      message += `\nRetry after ${error.retryAfter} seconds`;
    }
    return message;
  }

  /**
   * Format API error
   */
  private formatApiError(error: ApiError): string {
    let message = `[ai-edit] API Error (${error.statusCode}): ${error.message}`;

    // Add helpful hints for common errors
    if (error.statusCode === 400) {
      message += "\nCheck your request parameters and model name";
    } else if (error.statusCode === 500) {
      message += "\nThe API server is experiencing issues. Please try again later";
    }

    return message;
  }

  /**
   * Format network error
   */
  private formatNetworkError(error: NetworkError): string {
    return `[ai-edit] Network Error: ${error.message}\n` +
      "Check your internet connection and try again";
  }

  /**
   * Format buffer error
   */
  private formatBufferError(error: BufferError): string {
    return `[ai-edit] Buffer Error: ${error.message}\n` +
      "Failed to read/write buffer content";
  }

  /**
   * Format provider error
   */
  private formatProviderError(error: ProviderError): string {
    return `[ai-edit] Provider Error: ${error.message}`;
  }

  /**
   * Log error to file
   */
  private async logError(error: unknown, message: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${message}\n`;

      // Expand home directory
      const expandedPath = await this.denops.call("expand", this.logFilePath) as string;

      // Ensure directory exists
      const logDir = expandedPath.substring(0, expandedPath.lastIndexOf("/"));
      await Deno.mkdir(logDir, { recursive: true });

      // Append to log file
      await Deno.writeTextFile(expandedPath, logEntry, { append: true });

      // Log stack trace if available
      if (error instanceof Error && error.stack) {
        await Deno.writeTextFile(expandedPath, `${error.stack}\n\n`, { append: true });
      }
    } catch (logError) {
      // Failed to log - just print to console
      console.error("Failed to write error log:", logError);
    }
  }

  /**
   * Retry with exponential backoff
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry on validation or authentication errors
        if (error instanceof ValidationError || error instanceof AuthenticationError) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries - 1) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await this.denops.cmd(`echo '[ai-edit] Retry attempt ${attempt + 1}/${maxRetries} in ${delay / 1000}s...'`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}
