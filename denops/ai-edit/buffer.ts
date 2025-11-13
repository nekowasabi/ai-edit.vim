/**
 * Buffer manager for ai-edit.vim
 */

import type { Denops } from "jsr:@denops/std@^8.1.1";
import * as buffer from "jsr:@denops/std@^8.1.1/buffer";
import * as fn from "jsr:@denops/std@^8.1.1/function";
import type { BufferInfo, Position, TextContext } from "./types.ts";
import { BufferError, ErrorCode } from "./errors.ts";

/**
 * Buffer manager for Vim/Neovim operations
 */
export class BufferManager {
  private denops: Denops;

  constructor(denops: Denops) {
    this.denops = denops;
  }

  /**
   * Get current cursor position
   */
  async getCursorPosition(): Promise<Position> {
    try {
      const pos = await fn.getcurpos(this.denops) as number[];
      return {
        line: pos[1], // 1-indexed
        column: pos[2], // 1-indexed
      };
    } catch (error) {
      throw new BufferError(
        "Failed to get cursor position",
        ErrorCode.BUFFER_READ_ERROR,
        error,
      );
    }
  }

  /**
   * Get current buffer information
   */
  async getBufferInfo(): Promise<BufferInfo> {
    try {
      const bufnr = await fn.bufnr(this.denops, "%") as number;
      const filetype = await fn.getbufvar(this.denops, bufnr, "&filetype") as string;
      const lines = await fn.line(this.denops, "$") as number;

      return {
        bufnr,
        filetype: filetype || "text",
        lines,
      };
    } catch (error) {
      throw new BufferError(
        "Failed to get buffer info",
        ErrorCode.BUFFER_READ_ERROR,
        error,
      );
    }
  }

  /**
   * Check if visual selection marks are valid
   */
  private async isVisualSelectionValid(): Promise<boolean> {
    try {
      const startPos = await fn.getpos(this.denops, "'<") as number[];
      const endPos = await fn.getpos(this.denops, "'>") as number[];

      // Check if marks are set
      if (startPos[1] === 0 || endPos[1] === 0) {
        return false;
      }

      // Check if marks are in current buffer
      const currentBuf = await fn.bufnr(this.denops, "%") as number;
      if (startPos[0] !== 0 && startPos[0] !== currentBuf) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get visual mode selection
   */
  async getVisualSelection(): Promise<string | undefined> {
    try {
      // Validate selection marks
      if (!await this.isVisualSelectionValid()) {
        return undefined;
      }

      // Get visual selection marks
      const startPos = await fn.getpos(this.denops, "'<") as number[];
      const endPos = await fn.getpos(this.denops, "'>") as number[];

      const startLine = startPos[1];
      const endLine = endPos[1];
      const startCol = startPos[2];
      const endCol = endPos[2];

      // Get lines
      const lines = await fn.getline(this.denops, startLine, endLine) as string | string[];
      const selectedLines = Array.isArray(lines) ? lines : [lines];

      if (selectedLines.length === 0) {
        return undefined;
      }

      // Handle single line selection
      if (selectedLines.length === 1) {
        return selectedLines[0].substring(startCol - 1, endCol);
      }

      // Handle multi-line selection
      const result: string[] = [];
      for (let i = 0; i < selectedLines.length; i++) {
        if (i === 0) {
          // First line: from startCol to end
          result.push(selectedLines[i].substring(startCol - 1));
        } else if (i === selectedLines.length - 1) {
          // Last line: from start to endCol
          result.push(selectedLines[i].substring(0, endCol));
        } else {
          // Middle lines: full line
          result.push(selectedLines[i]);
        }
      }

      return result.join("\n");
    } catch (error) {
      throw new BufferError(
        "Failed to get visual selection",
        ErrorCode.BUFFER_READ_ERROR,
        error,
      );
    }
  }

  /**
   * Get current text context (cursor position, buffer info, and optional selection)
   */
  async getCurrentContext(): Promise<TextContext> {
    try {
      const [cursorPosition, bufferInfo, selection] = await Promise.all([
        this.getCursorPosition(),
        this.getBufferInfo(),
        this.getVisualSelection(),
      ]);

      return {
        cursorPosition,
        bufferInfo,
        selection,
      };
    } catch (error) {
      throw new BufferError(
        "Failed to get current context",
        ErrorCode.BUFFER_READ_ERROR,
        error,
      );
    }
  }

  /**
   * Insert text at cursor position
   */
  async insertText(text: string, position: Position): Promise<void> {
    try {
      const lines = text.split("\n");
      const bufnr = await fn.bufnr(this.denops, "%") as number;

      // Set cursor to target position
      await fn.cursor(this.denops, position.line, position.column);

      // Append lines after current line
      await buffer.append(this.denops, bufnr, lines);
    } catch (error) {
      throw new BufferError(
        "Failed to insert text",
        ErrorCode.BUFFER_WRITE_ERROR,
        error,
      );
    }
  }

  /**
   * Append text to the end of visual selection
   */
  async appendToSelection(text: string): Promise<void> {
    try {
      // Get end position of visual selection
      const endPos = await fn.getpos(this.denops, "'>") as number[];
      const endLine = endPos[1];

      if (endLine === 0) {
        // No selection, insert at cursor
        const cursorPos = await this.getCursorPosition();
        await this.insertText(text, cursorPos);
        return;
      }

      const lines = text.split("\n");
      const bufnr = await fn.bufnr(this.denops, "%") as number;

      // Append after the last line of selection
      await fn.appendbufline(this.denops, bufnr, endLine, lines);
    } catch (error) {
      throw new BufferError(
        "Failed to append to selection",
        ErrorCode.BUFFER_WRITE_ERROR,
        error,
      );
    }
  }

  /**
   * Append streaming text chunk at the end of buffer
   */
  async appendStreamChunk(chunk: string): Promise<number> {
    try {
      const bufnr = await fn.bufnr(this.denops, "%") as number;
      const currentLastLine = await fn.line(this.denops, "$") as number;

      // Get the last line content
      const lastLineContent = await fn.getline(this.denops, currentLastLine) as string;

      // Split chunk by newlines
      const chunkLines = chunk.split("\n");

      if (chunkLines.length === 1) {
        // Single line chunk: append to current last line
        const newContent = lastLineContent + chunkLines[0];
        await fn.setline(this.denops, currentLastLine, newContent);
      } else {
        // Multi-line chunk
        // Append first chunk to current last line
        const newContent = lastLineContent + chunkLines[0];
        await fn.setline(this.denops, currentLastLine, newContent);

        // Append remaining lines
        if (chunkLines.length > 1) {
          await fn.appendbufline(this.denops, bufnr, currentLastLine, chunkLines.slice(1));
        }
      }

      return await fn.line(this.denops, "$") as number;
    } catch (error) {
      throw new BufferError(
        "Failed to append stream chunk",
        ErrorCode.BUFFER_WRITE_ERROR,
        error,
      );
    }
  }
}
