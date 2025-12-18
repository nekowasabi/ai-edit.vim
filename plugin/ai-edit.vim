if exists('g:loaded_ai_edit')
  finish
endif
let g:loaded_ai_edit = 1

" Version check: Vim 9.1.1646+ or Neovim 0.11.3+
if !get(g:, 'ai_edit_disable_version_check') && !has('nvim-0.11.3') && !has('patch-9.1.1646')
  echohl WarningMsg
  echomsg '[ai-edit] ai-edit.vim requires Vim 9.1.1646 or Neovim 0.11.3.'
  echomsg '[ai-edit] Set g:ai_edit_disable_version_check = 1 to disable this check.'
  echohl None
  finish
endif

" Check if Denops is available
if !exists('g:loaded_denops')
  echohl WarningMsg
  echomsg '[ai-edit] Denops is not installed. Please install denops.vim first.'
  echomsg '[ai-edit] See: https://github.com/vim-denops/denops.vim'
  echohl None
  finish
endif

" Default settings
if !exists('g:ai_edit_provider')
  let g:ai_edit_provider = 'openrouter'
endif

if !exists('g:ai_edit_model')
  let g:ai_edit_model = 'anthropic/claude-3.5-sonnet'
endif

if !exists('g:ai_edit_temperature')
  let g:ai_edit_temperature = 0.7
endif

if !exists('g:ai_edit_max_tokens')
  let g:ai_edit_max_tokens = 4096
endif

if !exists('g:ai_edit_stream')
  let g:ai_edit_stream = 1
endif

" Wait for Denops to be ready before registering plugin
augroup ai_edit_plugin
  autocmd!
  autocmd User DenopsReady call s:on_denops_ready()
augroup END

function! s:on_denops_ready() abort
  " Wait a bit for denops to fully initialize
  call timer_start(100, {-> s:register_plugin()})
endfunction

function! s:register_plugin() abort
  " Check if denops is available
  if !exists('*denops#plugin#is_loaded')
    echohl WarningMsg
    echomsg '[ai-edit] Denops is not available'
    echohl None
    return
  endif

  " Load the plugin
  call denops#plugin#load('ai-edit', expand('<sfile>:h:h') .. '/denops/ai-edit/main.ts')

  " Wait for plugin to load before using it
  call timer_start(500, {-> s:check_plugin_loaded()})
endfunction

function! s:check_plugin_loaded() abort
  if !denops#plugin#is_loaded('ai-edit')
    echohl WarningMsg
    echomsg '[ai-edit] Plugin failed to load'
    echohl None
  endif
endfunction
