/**
 * Core type definitions for ai-edit.vim
 */

/**
 * Supported languages
 */
export type Language = "en" | "ja";

/**
 * Message role types for LLM chat
 */
export type MessageRole = "system" | "user" | "assistant";

/**
 * Chat message structure
 */
export interface Message {
  role: MessageRole;
  content: string;
}

/**
 * LLM Provider configuration
 */
export interface ProviderConfig {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for API endpoint (optional, provider-specific default used if not set) */
  baseUrl?: string;
  /** Model name (e.g., "anthropic/claude-3.5-sonnet") */
  model?: string;
  /** Temperature for response generation (0.0-1.0) */
  temperature?: number;
  /** Maximum tokens in response */
  maxTokens?: number;
  /** Enable streaming response */
  stream?: boolean;
}

/**
 * Chat completion request
 */
export interface ChatRequest {
  messages: Message[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/**
 * Chat completion response (non-streaming)
 */
export interface ChatResponse {
  id: string;
  choices: Array<{
    message?: {
      role: string;
      content: string;
    };
    delta?: {
      content?: string;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Position in buffer
 */
export interface Position {
  line: number;
  column: number;
}

/**
 * Buffer information
 */
export interface BufferInfo {
  bufnr: number;
  filetype: string;
  lines: number;
}

/**
 * Text context for LLM request
 */
export interface TextContext {
  /** Selected text (if in visual mode) */
  selection?: string;
  /** Current cursor position */
  cursorPosition: Position;
  /** Buffer information */
  bufferInfo: BufferInfo;
}

/**
 * LLM Provider interface
 */
export interface LLMProviderInterface {
  /**
   * Send request to LLM and get streaming response
   * @param messages - Chat messages
   * @returns AsyncGenerator yielding response chunks
   */
  sendRequest(messages: Message[]): AsyncGenerator<string, void, unknown>;

  /**
   * Validate provider configuration
   * @param config - Provider configuration
   * @returns true if valid, false otherwise
   */
  validateConfig(config: ProviderConfig): boolean;
}

/**
 * Constructor type for LLM providers
 */
export type LLMProviderConstructor = new (config: ProviderConfig) => LLMProviderInterface;
