/**
 * Error handling for ai-edit.vim
 */

/**
 * Error codes
 */
export enum ErrorCode {
  // Network errors (1xxx)
  NETWORK_ERROR = 1000,
  TIMEOUT_ERROR = 1001,
  CONNECTION_ERROR = 1002,

  // API errors (2xxx)
  API_ERROR = 2000,
  AUTHENTICATION_ERROR = 2001,
  RATE_LIMIT_ERROR = 2002,
  INVALID_REQUEST_ERROR = 2003,
  SERVER_ERROR = 2004,

  // Validation errors (3xxx)
  VALIDATION_ERROR = 3000,
  INVALID_CONFIG_ERROR = 3001,
  MISSING_API_KEY_ERROR = 3002,
  INVALID_PROMPT_ERROR = 3003,

  // Buffer errors (4xxx)
  BUFFER_ERROR = 4000,
  BUFFER_NOT_FOUND_ERROR = 4001,
  BUFFER_READ_ERROR = 4002,
  BUFFER_WRITE_ERROR = 4003,

  // Provider errors (5xxx)
  PROVIDER_ERROR = 5000,
  PROVIDER_NOT_FOUND_ERROR = 5001,
  PROVIDER_INITIALIZATION_ERROR = 5002,

  // Unknown error
  UNKNOWN_ERROR = 9999,
}

/**
 * Base error class for ai-edit.vim
 */
export class AiEditError extends Error {
  code: ErrorCode;
  details?: unknown;

  constructor(message: string, code: ErrorCode, details?: unknown) {
    super(message);
    this.name = "AiEditError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AiEditError.prototype);
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends AiEditError {
  constructor(message: string, details?: unknown) {
    super(message, ErrorCode.NETWORK_ERROR, details);
    this.name = "NetworkError";
  }
}

/**
 * API-related errors
 */
export class ApiError extends AiEditError {
  statusCode?: number;

  constructor(message: string, code: ErrorCode, statusCode?: number, details?: unknown) {
    super(message, code, details);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(message, ErrorCode.AUTHENTICATION_ERROR, 401, details);
    this.name = "AuthenticationError";
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends ApiError {
  retryAfter?: number;

  constructor(message: string, retryAfter?: number, details?: unknown) {
    super(message, ErrorCode.RATE_LIMIT_ERROR, 429, details);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Validation error
 */
export class ValidationError extends AiEditError {
  constructor(message: string, details?: unknown) {
    super(message, ErrorCode.VALIDATION_ERROR, details);
    this.name = "ValidationError";
  }
}

/**
 * Buffer operation error
 */
export class BufferError extends AiEditError {
  constructor(message: string, code: ErrorCode, details?: unknown) {
    super(message, code, details);
    this.name = "BufferError";
  }
}

/**
 * Provider error
 */
export class ProviderError extends AiEditError {
  constructor(message: string, code: ErrorCode, details?: unknown) {
    super(message, code, details);
    this.name = "ProviderError";
  }
}
