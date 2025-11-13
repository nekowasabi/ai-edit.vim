# ai-edit.vim

A Vim/Neovim plugin for AI-powered code editing using LLM providers. Edit code directly in your editor with AI assistance through streaming responses.

## Features

- 🤖 **Multiple LLM Providers** - Abstracted provider interface (OpenRouter supported, extensible for others)
- ⚡ **Streaming Responses** - Real-time AI responses streamed directly into your buffer
- 📝 **Visual Mode Support** - Select code and ask AI questions with context
- 🔧 **Highly Configurable** - Customize API keys, models, temperature, and more
- 🚀 **Built with Denops** - Fast, async TypeScript implementation for Vim/Neovim

## Requirements

- Vim 9.1.1646+ or Neovim 0.11.3+
- Deno 1.40+
- [denops.vim](https://github.com/vim-denops/denops.vim)
- OpenRouter API key (or other provider API key)

## Installation

### Using [vim-plug](https://github.com/junegunn/vim-plug)

```vim
Plug 'vim-denops/denops.vim'
Plug 'your-username/ai-edit.vim'
```

### Using [dein.vim](https://github.com/Shougo/dein.vim)

```vim
call dein#add('vim-denops/denops.vim')
call dein#add('your-username/ai-edit.vim')
```

### Using [lazy.nvim](https://github.com/folke/lazy.nvim)

```lua
{
  'your-username/ai-edit.vim',
  dependencies = { 'vim-denops/denops.vim' },
}
```

## Configuration

### API Key Setup

Set your OpenRouter API key as an environment variable (recommended for security):

```bash
export OPENROUTER_API_KEY="your-api-key-here"
```

Or set it in your Vim configuration:

```vim
let g:ai_edit_api_key = 'your-api-key-here'
```

### Configuration Options

```vim
" Provider (default: 'openrouter')
let g:ai_edit_provider = 'openrouter'

" Model name (default: 'anthropic/claude-3.5-sonnet')
let g:ai_edit_model = 'anthropic/claude-3.5-sonnet'

" Temperature (default: 0.7, range: 0.0-2.0)
let g:ai_edit_temperature = 0.7

" Max tokens (default: 4096)
let g:ai_edit_max_tokens = 4096

" Enable streaming (default: 1)
let g:ai_edit_stream = 1

" Language for system messages (default: 'en', options: 'en' or 'ja')
let g:ai_edit_language = 'en'

" Provider preference for OpenRouter (optional)
" Specify a preferred provider when using OpenRouter
" Examples: 'DeepInfra', 'Together', 'OpenAI', 'Anthropic', 'Google'
" Leave unset for automatic provider selection
" let g:ai_edit_provider_preferences = 'DeepInfra'

" Custom base URL (optional)
" let g:ai_edit_base_url = 'https://custom.api.com/v1'
```

## Usage

### Basic Command

The `:AiEdit` command works in both Normal mode and Visual mode:

**Normal Mode** - Ask AI to edit at cursor position:

```vim
:AiEdit explain this function
:AiEdit refactor this code to be more efficient
:AiEdit add error handling
```

**Visual Mode** - Select code to provide context:

1. Select code in visual mode (`v`, `V`, or `Ctrl-v`)
2. Run `:AiEdit` with your prompt (the `'<,'>` range will be added automatically):

```vim
" Select code first
V}

" Then run AiEdit - Vim automatically adds :'<,'> when in visual mode
:AiEdit explain this code
:AiEdit find potential bugs
:AiEdit convert this to TypeScript
```

When you have a selection, the selected code is automatically used as context for the AI.

### Cancel Request

Cancel ongoing AI request:

```vim
:AiEditCancel
```

Or press `Ctrl-C` during request.

## Examples

### Example 1: Code Explanation (Normal Mode)

```vim
" Position cursor on function
:AiEdit explain what this function does
```

AI will insert explanation below cursor.

### Example 2: Refactoring with Context (Visual Mode)

```vim
" Select function in visual mode
V}

" Run AiEdit with your prompt
:AiEdit refactor to use async/await
```

AI will analyze the selected code and provide a refactored version below the selection.

### Example 3: Bug Detection (Visual Mode)

```vim
" Select suspicious code block
vip

" Ask AI to analyze it
:AiEdit find potential bugs and suggest fixes
```

### Example 4: Multiple Commands with Same Selection

```vim
" Select code once
V}

" Ask multiple questions about the same selection
:AiEdit what does this code do?
:AiEdit how can this be optimized?
:AiEdit are there any security issues?
```

The selection remains active, so you can ask multiple questions without re-selecting.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Vim/Neovim                         │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│              Denops Runtime                         │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│           CommandDispatcher                         │
│  ┌─────────────────────────────────────────────┐   │
│  │         LLMService                          │   │
│  │  ┌─────────────────────────────────────┐   │   │
│  │  │    ProviderFactory                  │   │   │
│  │  │  ┌───────────────────────────────┐  │   │   │
│  │  │  │   OpenRouterProvider         │  │   │   │
│  │  │  └───────────────────────────────┘  │   │   │
│  │  └─────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Key Components

- **CommandDispatcher** - Routes commands and collects context
- **LLMService** - Manages LLM interactions and streaming
- **ProviderFactory** - Creates provider instances (Strategy Pattern)
- **OpenRouterProvider** - OpenRouter API implementation
- **BufferManager** - Handles Vim/Neovim buffer operations
- **ConfigManager** - Manages plugin configuration
- **ErrorHandler** - Centralized error handling

## Development

### Running Tests

```bash
deno test --allow-env --allow-read --allow-net
```

### Type Checking

```bash
deno check denops/ai-edit/main.ts
```

### Linting

```bash
deno lint
```

### Formatting

```bash
deno fmt
```

## Adding New Providers

To add a new LLM provider:

1. Implement the `LLMProviderInterface`:

```typescript
export class CustomProvider implements LLMProviderInterface {
  async *sendRequest(messages: Message[]): AsyncGenerator<string> {
    // Implementation
  }

  validateConfig(config: ProviderConfig): boolean {
    // Validation logic
  }
}
```

2. Register provider in `main.ts`:

```typescript
providerFactory.registerProvider("custom", CustomProvider);
```

3. Configure in Vim:

```vim
let g:ai_edit_provider = 'custom'
```

## Troubleshooting

### Plugin Not Loading

Check Denops is installed and running:

```vim
:checkhealth denops
```

### API Errors

Check API key is set correctly:

```vim
:echo $OPENROUTER_API_KEY
" or
:echo g:ai_edit_api_key
```

### View Error Logs

```bash
cat ~/.cache/ai-edit/error.log
```

## License

MIT

## Contributing

Contributions welcome! Please open issues or pull requests.

## Acknowledgments

- [denops.vim](https://github.com/vim-denops/denops.vim) - Ecosystem for writing Vim/Neovim plugins in TypeScript
- [OpenRouter](https://openrouter.ai/) - Unified API for LLM providers
