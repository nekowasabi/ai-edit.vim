" Test script for ai-edit.vim plugin loading
" Usage: nvim -u test_plugin.vim

" Minimal configuration for testing
set nocompatible

" Disable version check for testing
let g:denops_disable_version_check = 1

" Set runtimepath to include denops and ai-edit
set runtimepath+=~/.config/nvim/plugged/denops.vim
set runtimepath+=~/.config/nvim/plugged/ai-edit.vim

" Enable filetype detection
filetype plugin indent on

" Wait for denops to be ready
autocmd User DenopsReady echom "[test] Denops is ready"

" Check if ai-edit plugin is loaded
autocmd User DenopsReady call timer_start(1000, {-> TestAiEdit()})

function! TestAiEdit()
  echom "[test] Checking ai-edit plugin..."

  " Check if plugin is loaded
  let loaded = denops#plugin#is_loaded('ai-edit')
  if loaded
    echom "[test] ✓ ai-edit plugin is loaded successfully!"
  else
    echom "[test] ✗ ai-edit plugin failed to load"
    cquit 1
  endif

  " Check if commands are available
  if exists(':AiEdit')
    echom "[test] ✓ :AiEdit command is available"
  else
    echom "[test] ✗ :AiEdit command not found"
  endif

  if exists(':AiEditVisual')
    echom "[test] ✓ :AiEditVisual command is available"
  else
    echom "[test] ✗ :AiEditVisual command not found"
  endif

  if exists(':AiEditCancel')
    echom "[test] ✓ :AiEditCancel command is available"
  else
    echom "[test] ✗ :AiEditCancel command not found"
  endif

  echom "[test] All checks passed! Plugin is working."
  qall!
endfunction

" Start vim and wait for denops
echom "[test] Starting ai-edit plugin test..."
