" Test script for mode detection bug fix
" This verifies that Normal mode uses savedPosition, not selection marks

" Create a test buffer
enew
call setline(1, range(1, 20))

" Simulate previous visual selection (lines 5-10)
normal! 5Gv5j
normal! <Esc>

" Now we're in Normal mode, but visual marks '<, '> are still set
" Move cursor to line 15
normal! 15G

" Get current mode and mark positions
let l:mode = mode()
let l:cursor_line = line('.')
let l:visual_start = line("'<")
let l:visual_end = line("'>")

echo "=== Mode Detection Test ==="
echo "Current mode: " . l:mode
echo "Cursor line: " . l:cursor_line
echo "Visual start mark: " . l:visual_start
echo "Visual end mark: " . l:visual_end
echo ""
echo "Expected behavior:"
echo "  - Mode should be 'n' (normal)"
echo "  - Cursor at line 15"
echo "  - Visual marks still exist (5 and 10)"
echo "  - getVisualSelection() should return undefined"
echo "  - AiEdit should use savedPosition (line 16), not selection end"
echo ""
echo "Press Enter to continue..."
call getchar()

" Clean up
bwipeout!
