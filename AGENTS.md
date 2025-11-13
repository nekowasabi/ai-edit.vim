# Repository Guidelines

## Project Structure & Module Organization
- `denops/ai-edit/` contains the TypeScript runtime used by Denops; `main.ts` wires together the dispatcher, services, and provider factory, while submodules (`buffer.ts`, `config.ts`, `providers/`) isolate responsibilities.
- `plugin/ai-edit.vim` exposes `:AiEdit`, `:AiRewrite`, and related commands to Vim/Neovim and should stay thin, delegating real work to the Denops layer.
- `tests/*.ts` exercise buffer, dispatcher, provider, and visual-selection workflows end-to-end; `denops/ai-edit/__tests__` houses smaller unit specs. Vimscript fixtures in `test_*.vim` help reproduce editor states.

## Build, Test, and Development Commands
- `deno task check` – type-checks `denops/ai-edit/main.ts` with the strict compiler options defined in `deno.json`.
- `deno task test` (or `deno test --allow-env --allow-read --allow-net`) – runs all suites under `tests/` and `denops/ai-edit/__tests__`.
- `deno fmt` / `deno lint` – auto-format and lint the entire workspace (`denops`, `plugin`, `tests`) before sending a PR.

## Coding Style & Naming Conventions
- Adhere to `deno fmt` defaults: 2-space indentation, 100-character line width, and trailing newline. Never hand-format files that `fmt` can handle.
- Use strict TypeScript with named exports; classes such as `BufferManager` stay PascalCase, functions/variables camelCase, and enums/constants SCREAMING_SNAKE_CASE when needed.
- Prefer `async`/`await`, exhaustive `switch` statements, and descriptive error classes (`BufferError`, `ErrorCode`). Keep docblocks in `/** ... */` form for public APIs.

## Testing Guidelines
- Mirror new modules with `*_test.ts` files placed beside the feature (unit) or under `tests/` (integration). Follow existing `describe`/`it` naming for clarity.
- Capture editor scenarios via helpers in `tests/buffer_*` to avoid fragile manual mocks. Regression tests should fail without the fix and cover streaming plus visual-selection flows.
- Always run `deno task test` before pushing; include logs or failing cases if the suite exposes flaky behavior.

## Commit & Pull Request Guidelines
- Use Conventional Commit headers like `fix(buffer): explain issue` (see `COMMIT_MESSAGE.txt`), followed by a blank line and a concise body listing key changes and validation (`deno task test`, `deno task check`).
- PRs should link issues, summarize user-facing changes, note config additions, and attach screenshots/asciicasts when UI or UX shifts occur. Update `README.md` and `CHANGELOG.md` whenever behavior or commands change.

## Security & Configuration Tips
- Never commit API keys; set `OPENROUTER_API_KEY` (preferred) or `g:ai_edit_api_key` locally and document any per-provider settings in the PR description.
- If troubleshooting, inspect `~/.cache/ai-edit/error.log` but strip sensitive data before sharing snippets. Default to secure provider endpoints and mention any scope changes in reviews.
