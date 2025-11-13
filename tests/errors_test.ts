/**
 * Tests for error classes
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  AiEditError,
  ApiError,
  AuthenticationError,
  BufferError,
  ErrorCode,
  NetworkError,
  ProviderError,
  RateLimitError,
  ValidationError,
} from "../denops/ai-edit/errors.ts";

Deno.test("AiEditError - create base error", () => {
  const error = new AiEditError("Test error", ErrorCode.UNKNOWN_ERROR);
  assertEquals(error.message, "Test error");
  assertEquals(error.code, ErrorCode.UNKNOWN_ERROR);
  assertEquals(error.name, "AiEditError");
});

Deno.test("ValidationError - create validation error", () => {
  const error = new ValidationError("Invalid input");
  assertEquals(error.message, "Invalid input");
  assertEquals(error.code, ErrorCode.VALIDATION_ERROR);
  assertEquals(error.name, "ValidationError");
});

Deno.test("AuthenticationError - create auth error", () => {
  const error = new AuthenticationError("Invalid API key");
  assertEquals(error.message, "Invalid API key");
  assertEquals(error.code, ErrorCode.AUTHENTICATION_ERROR);
  assertEquals(error.name, "AuthenticationError");
  assertEquals(error.statusCode, 401);
});

Deno.test("RateLimitError - create rate limit error with retry", () => {
  const error = new RateLimitError("Too many requests", 60);
  assertEquals(error.message, "Too many requests");
  assertEquals(error.code, ErrorCode.RATE_LIMIT_ERROR);
  assertEquals(error.retryAfter, 60);
  assertEquals(error.statusCode, 429);
});

Deno.test("NetworkError - create network error", () => {
  const error = new NetworkError("Connection failed");
  assertEquals(error.message, "Connection failed");
  assertEquals(error.code, ErrorCode.NETWORK_ERROR);
  assertEquals(error.name, "NetworkError");
});

Deno.test("ApiError - create API error with status code", () => {
  const error = new ApiError("Bad request", ErrorCode.INVALID_REQUEST_ERROR, 400);
  assertEquals(error.message, "Bad request");
  assertEquals(error.code, ErrorCode.INVALID_REQUEST_ERROR);
  assertEquals(error.statusCode, 400);
});

Deno.test("BufferError - create buffer error", () => {
  const error = new BufferError("Buffer not found", ErrorCode.BUFFER_NOT_FOUND_ERROR);
  assertEquals(error.message, "Buffer not found");
  assertEquals(error.code, ErrorCode.BUFFER_NOT_FOUND_ERROR);
  assertEquals(error.name, "BufferError");
});

Deno.test("ProviderError - create provider error", () => {
  const error = new ProviderError("Provider initialization failed", ErrorCode.PROVIDER_INITIALIZATION_ERROR);
  assertEquals(error.message, "Provider initialization failed");
  assertEquals(error.code, ErrorCode.PROVIDER_INITIALIZATION_ERROR);
  assertEquals(error.name, "ProviderError");
});

Deno.test("Error with details", () => {
  const details = { foo: "bar" };
  const error = new AiEditError("Test error", ErrorCode.UNKNOWN_ERROR, details);
  assertExists(error.details);
  assertEquals(error.details, details);
});
