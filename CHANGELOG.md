# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Non-blocking async command execution** - `:AiEdit` and `:AiRewrite` commands now execute asynchronously using `denops#notify()`, allowing continued editor use during API calls
- **Cursor position preservation** - AI responses are inserted at the command execution position, even if cursor moves during processing
- **Buffer-level execution control** - Multiple buffers can process AI requests simultaneously without blocking each other
- **Saved position tracking** - New `savedPosition` field in `TextContext` to track original command execution position
- **Per-buffer cancellation** - `:AiEditCancel` cancels requests for the current buffer only
- **Enhanced progress messages** - Show line numbers in status messages for better user feedback

### Changed
- Command execution from `denops#request()` to `denops#notify()` for async non-blocking behavior
- Processing lock from global to per-buffer map, enabling concurrent operations across buffers
- Abort controller management from global to per-buffer for precise cancellation control
- Insert position logic to prioritize `savedPosition` over `cursorPosition` for async operations

### Fixed
- Type safety improved by removing `any` type usage in OpenRouter provider
- Added `provider` field to `ChatRequest` interface for proper type checking

### Technical Details
- Added 4 new test files with 28 total passing tests
- Implemented TDD Red-Green-Refactor cycle for all changes
- All code passes `deno check`, `deno test`, and `deno lint`
- No breaking changes to existing API or configuration

## [0.1.0] - Initial Release

### Added
- Basic LLM integration with OpenRouter
- Streaming response support
- Visual mode context support
- Configuration management
- Error handling
- Provider abstraction layer
