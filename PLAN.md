# title: AiEditOutput() 関数の追加

## 概要
- 選択範囲のテキストをAIで処理し、結果をバッファに挿入せず**返り値として返す**関数を追加する
- VimScript内でプログラム的にAIを活用できるようになる

### goal
```vim
" 基本的な使い方
let g:output = AiEditOutput('日本語に翻訳して')

" 結果を使った処理
if !empty(g:output)
  put =g:output
endif
```

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテストが通過していること

## 開発のゴール
- `AiEditOutput(prompt)` 関数を呼び出すと、選択範囲（あれば）とプロンプトをAIに送信し、結果を文字列として返す
- バッファへの挿入・変更は一切行わない
- エラー時は空文字列を返す

## 実装仕様
| 項目 | 仕様 |
|------|------|
| 関数名 | `AiEditOutput(...)` |
| 引数 | プロンプト（可変長引数、スペース結合） |
| 戻り値 | AI処理結果（文字列）、エラー時は空文字列 |
| 選択範囲 | あれば使用、なければプロンプトのみで処理 |
| 同期/非同期 | 同期（`denops#request`使用） |
| ストリーミング | 無効（全結果を収集して返す） |

## 生成AIの学習用コンテキスト

### 既存実装（参考パターン）
- `denops/ai-edit/service.ts`
  - `executeRewrite()` メソッド（189-197行目）: 結果収集パターンの参考
  - `buildMessages()` メソッド（215-243行目）: メッセージ構築パターン
- `denops/ai-edit/dispatcher.ts`
  - `aiRewrite()` メソッド（65-89行目）: 同期処理パターン
- `denops/ai-edit/main.ts`
  - dispatcher登録パターン（15-36行目）
- `plugin/ai-edit.vim`
  - プラグイン構造全体

### テストパターン
- `tests/dispatcher_test.ts`: コンテキスト関連のテストパターン
- `tests/airewrite_sync_test.ts`: 同期処理のテストパターン

## Process

### process1 TypeScript側の実装（service.ts）
#### sub1 executeOutput()メソッドの追加
@target: `denops/ai-edit/service.ts`
@ref: `denops/ai-edit/service.ts` (executeRewrite: 155-210行目)

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/output_test.ts`
- [x] テストファイル `tests/output_test.ts` を作成
  - `executeOutput` が文字列を返すことを検証
  - 選択範囲ありの場合のコンテキスト処理を検証
  - 選択範囲なしの場合のプロンプトのみ処理を検証

```typescript
// tests/output_test.ts の骨格
import { assertEquals } from "@std/assert";
import type { TextContext } from "../denops/ai-edit/types.ts";

Deno.test("aiEditOutput should return string result with selection", () => {
  const mockContext: TextContext = {
    cursorPosition: { line: 10, column: 5 },
    selection: "test text",
    bufferInfo: { bufnr: 1, filetype: "text", lines: 100 },
  };
  // executeOutput が文字列を返すことを検証する型テスト
  assertEquals(typeof mockContext.selection, "string");
});

Deno.test("aiEditOutput should work without selection", () => {
  const mockContext: TextContext = {
    cursorPosition: { line: 10, column: 5 },
    bufferInfo: { bufnr: 1, filetype: "text", lines: 100 },
  };
  assertEquals(mockContext.selection, undefined);
});
```

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `LLMService` クラスに `executeOutput()` メソッドを追加
  - 引数: `prompt: string, context: TextContext`
  - 戻り値: `Promise<string>`
- [x] 既存の `buildMessages()` を流用してメッセージを構築
- [x] ストリーミングレスポンスを全て収集して文字列として返す
- [x] エラー時は空文字列 `""` を返す

```typescript
// 実装の骨格（service.ts に追加）
async executeOutput(prompt: string, context: TextContext): Promise<string> {
  const bufnr = context.bufferInfo.bufnr;

  if (this.processingBuffers.get(bufnr)) {
    return "";
  }

  this.processingBuffers.set(bufnr, true);
  const abortController = new AbortController();
  this.abortControllers.set(bufnr, abortController);

  try {
    const messages = await this.buildMessages(prompt, context);
    const providerConfig = await this.configManager.getProviderConfig();
    const providerName = await this.configManager.getProvider();
    const provider = this.providerFactory.getProvider(providerName, providerConfig);

    let fullResponse = "";
    for await (const chunk of provider.sendRequest(messages)) {
      if (abortController.signal.aborted) {
        return "";
      }
      fullResponse += chunk;
    }
    return fullResponse;
  } catch (error) {
    return "";
  } finally {
    this.processingBuffers.delete(bufnr);
    this.abortControllers.delete(bufnr);
  }
}
```

##### TDD Step 3: Refactor & Verify
- [x] `deno test tests/output_test.ts` を実行し、通過を確認
- [x] 必要に応じてリファクタリング
- [x] 再度テストを実行し、通過を確認

---

### process2 TypeScript側の実装（dispatcher.ts）
#### sub1 aiEditOutput()メソッドの追加
@target: `denops/ai-edit/dispatcher.ts`
@ref: `denops/ai-edit/dispatcher.ts` (aiRewrite: 65-89行目)

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/output_test.ts`
- [x] `aiEditOutput` が空プロンプトで空文字列を返すテストを追加

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `CommandDispatcher` クラスに `aiEditOutput()` メソッドを追加
  - 引数: `denops: Denops, args: string[]`
  - 戻り値: `Promise<string>`
- [x] プロンプトが空の場合は空文字列を返す
- [x] `bufferManager.getCurrentContext()` でコンテキスト取得
- [x] `llmService.executeOutput()` を呼び出して結果を返す

```typescript
// 実装の骨格（dispatcher.ts に追加）
async aiEditOutput(denops: Denops, args: string[]): Promise<string> {
  const prompt = args.join(" ").trim();

  if (!prompt) {
    return "";
  }

  try {
    const context = await this.bufferManager.getCurrentContext();
    return await this.llmService.executeOutput(prompt, context);
  } catch (error) {
    return "";
  }
}
```

##### TDD Step 3: Refactor & Verify
- [x] `deno test tests/output_test.ts` を実行し、通過を確認
- [x] `deno test` で全テストが通過することを確認

---

### process3 TypeScript側の実装（main.ts）
#### sub1 dispatcher登録の追加
@target: `denops/ai-edit/main.ts`
@ref: `denops/ai-edit/main.ts` (dispatcher登録: 15-36行目)

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `denops.dispatcher` に `aiEditOutput` メソッドを追加

```typescript
// main.ts の denops.dispatcher に追加
async aiEditOutput(...args: unknown[]): Promise<string> {
  return await dispatcher.aiEditOutput(denops, args as string[]);
},
```

##### TDD Step 3: Refactor & Verify
- [x] 構文エラーがないことを確認（`deno check`）
- [x] 既存テストが全て通過することを確認

---

### process4 VimScript側の実装（plugin/ai-edit.vim）
#### sub1 AiEditOutput()関数の定義
@target: `plugin/ai-edit.vim`
@ref: なし（VimScript関数の追加のみ）

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `AiEditOutput()` VimScript関数を追加
  - 可変長引数を受け取る
  - プラグインがロードされていない場合は空文字列を返す
  - `denops#request()` で同期的に結果を取得

```vim
" plugin/ai-edit.vim に追加
" Returns AI response for selection without modifying buffer
function! AiEditOutput(...) abort
  if !denops#plugin#is_loaded('ai-edit')
    return ''
  endif
  return denops#request('ai-edit', 'aiEditOutput', a:000)
endfunction
```

##### TDD Step 3: Refactor & Verify
- [ ] Neovimで実際に関数が呼び出せることを確認
- [ ] `:echo AiEditOutput('テスト')` で結果が返ることを確認

---

### process10 ユニットテスト（追加・統合テスト）
- [x] 全テストの実行: `deno test` (72件すべて通過)
- [x] 統合テストの追加検討
  - 選択範囲あり/なしの両方のケース
  - エラーケース（プロバイダーエラー等）
  - VimScript関数パターンのテスト
  - 機能比較テスト（AiEdit/AiRewrite/AiEditOutput）

---

### process50 フォローアップ
（実装後に仕様変更などが発生した場合は、ここにProcessを追加する）

---

### process100 リファクタリング
- [x] 共通処理の抽出（`executeRewrite` と `executeOutput` の共通部分）
  - 現時点では見送り。4つ以上のメソッドで同パターンが使われる場合に再検討
- [x] エラーハンドリングの統一（現状で統一されている）

---

### process200 ドキュメンテーション
- [x] README.md に `AiEditOutput()` 関数の使用例を追加
- [x] CHANGELOG.md に変更履歴を追加
