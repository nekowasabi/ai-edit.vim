# title: AI-Edit.vim 非同期コマンド実装

## 概要

- `:AiEdit`と`:AiRewrite`コマンドを非同期化し、コマンド実行後すぐにVimの操作を可能にする
- API呼び出し中もユーザーがエディタ操作を継続でき、完了時にコマンド実行時のカーソル位置に結果を挿入する

### goal

- ユーザーが`:AiEdit`または`:AiRewrite`コマンドを実行した直後に、Vimがブロックされずに他の編集作業を継続できる
- API処理が完了したら、コマンド実行時のカーソル位置に自動的に結果が挿入される

## 必須のルール

- 必ず `CLAUDE.md` を参照し、ルールを守ること

## 開発のゴール

- Denopsの非同期機能(`denops#notify()`)を活用し、Vimコマンドラインからのコマンド実行を非ブロッキング化
- API呼び出し中もVimの応答性を維持
- コマンド実行時のカーソル位置を保存し、完了時にその位置に結果を挿入

## 実装仕様

### 調査結果の要約

#### Parrot.nvimの非同期パターン分析

1. **`vim.schedule_wrap()`の使用** (`response_handler.lua:197`)
   - UIスレッドでのバッファ更新を非同期化
   - コールバック関数をVimのイベントループでスケジュール

2. **ハンドラパターン**
   - API呼び出しはコールバック形式
   - レスポンスチャンクを`handler`関数で受け取り、逐次バッファに書き込み

3. **即座のリターン**
   - `ChatHandler:prompt()`関数はAPI呼び出しを開始後すぐにリターン（ブロックしない）

#### AI-Edit.vimの現在の実装フロー

**ブロック箇所の特定:**

- `dispatcher.ts:24-41` - `aiEdit()`が`await`で同期的にLLMサービスを待機
- `dispatcher.ts:55-71` - `aiRewrite()`も同様に同期待機
- `service.ts:49-106` - `executePrompt()`がfor-awaitループでストリーミングレスポンス全体を処理
- `service.ts:120-166` - `executeRewrite()`も同様に全レスポンス完了まで待機

**現在のフロー:**

```
Vimコマンド実行 → denops.request() → dispatcher.aiEdit()
→ [await] llmService.executePrompt() → [await] API完了まで待機
→ Vimに制御を返す（この間Vimはブロック）
```

### 実装方針

1. **`denops.request()`を`denops.notify()`に変更**: Fire-and-forgetパターンでVimを即座に解放
2. **カーソル位置の事前保存**: コマンド実行時の位置を`TextContext`に記録
3. **エラーハンドリングの非同期化**: try-catchでラップし、エラーも非同期でVimに通知

## 生成AIの学習用コンテキスト

### Denopsプラグイン実装ファイル

- `denops/ai-edit/main.ts`
  - Denopsプラグインのエントリポイント、コマンド定義
- `denops/ai-edit/dispatcher.ts`
  - コマンドディスパッチャー、各コマンドの処理を振り分け
- `denops/ai-edit/service.ts`
  - LLMサービス、API呼び出しとストリーミング処理
- `denops/ai-edit/buffer.ts`
  - バッファ操作、カーソル位置取得と挿入処理
- `denops/ai-edit/types.ts`
  - 型定義ファイル

### 参考実装

- `/Users/ttakeda/.config/nvim/plugged/parrot.nvim/lua/parrot/response_handler.lua`
  - `vim.schedule_wrap()`を使った非同期レスポンス処理の参考実装
- `/Users/ttakeda/.config/nvim/plugged/parrot.nvim/lua/parrot/chat_handler.lua`
  - コールバックパターンとハンドラの実装パターン

## Process

### process1 型定義の拡張

#### sub1 TextContextにsavedPositionフィールドを追加

@target: `denops/ai-edit/types.ts` @ref: `denops/ai-edit/buffer.ts`

- [ ] `TextContext`インターフェースに`savedPosition?: Position`を追加
  - コマンド実行時のカーソル位置を保存するためのフィールド
  - 既存の`cursorPosition`は現在位置、`savedPosition`は実行時位置として区別

### process2 カーソル位置保存機能の実装

#### sub1 dispatcherでコマンド実行時の位置を保存

@target: `denops/ai-edit/dispatcher.ts` @ref: `denops/ai-edit/buffer.ts`, `denops/ai-edit/types.ts`

- [ ] `aiEdit()`関数の冒頭でカーソル位置を取得し保存
  - `const savedPosition = await this.bufferManager.getCursorPosition()`
  - `context.savedPosition = savedPosition`を設定
- [ ] `aiRewrite()`関数でも同様にカーソル位置を保存
  - Rewriteの場合は選択範囲の開始位置を保存
- [ ] エラーハンドリングをtry-catchで囲み、非同期エラーもVimに通知
  - `catch`ブロックで`denops.cmd("echomsg ...")`を使用

#### sub2 バックグラウンド実行への変更準備

@target: `denops/ai-edit/dispatcher.ts`

- [ ] `aiEdit()`と`aiRewrite()`の戻り値を`Promise<void>`のまま維持
  - 内部の`await`は維持（処理自体は非同期のまま）
  - `denops.notify()`で呼び出されるため、戻り値を待たない

### process3 Vimコマンド定義の変更

#### sub1 denops.request()からdenops.notify()への変更

@target: `denops/ai-edit/main.ts` @ref: なし

- [ ] `:AiEdit`コマンドの定義を`denops#request()`から`denops#notify()`に変更
  ```vim
  command! -range -nargs=+ AiEdit call denops#notify('${denops.name}', 'aiEdit', [<f-args>])
  ```
- [ ] `:AiRewrite`コマンドも同様に`denops#notify()`に変更
  ```vim
  command! -range -nargs=+ AiRewrite call denops#notify('${denops.name}', 'aiRewrite', [<f-args>])
  ```
- [ ] `:AiEditCancel`は`denops#request()`のまま（即座のキャンセルが必要）

### process4 サービス層での位置管理の修正

#### sub1 保存されたカーソル位置を使用するように変更

@target: `denops/ai-edit/service.ts` @ref: `denops/ai-edit/types.ts`

- [ ] `executePrompt()`で挿入位置の決定ロジックを修正
  - 現在の`context?.cursorPosition`を`context?.savedPosition ?? context?.cursorPosition`に変更
  - `savedPosition`が存在する場合はそれを使用、なければ現在位置にフォールバック
- [ ] `getSelectionEndPosition()`の戻り値も保存位置を考慮
  - `context.savedPosition`が選択範囲内なら、それを基準に計算

#### sub2 進行状況メッセージの改善

@target: `denops/ai-edit/service.ts`

- [ ] 開始メッセージに位置情報を追加
  - `echo '[ai-edit] Generating response at line ${line}...'`
- [ ] 完了メッセージにも位置情報を追加
  - `echo '[ai-edit] Response inserted at line ${line}'`
- [ ] エラーメッセージのフォーマットを統一

### process5 バッファマネージャーの確認と調整

#### sub1 既存の非同期API使用を確認

@target: `denops/ai-edit/buffer.ts` @ref: なし

- [ ] `insertText()`が既に非同期APIを使用していることを確認
  - `buffer.append()`は既に非同期対応
- [ ] `appendStreamChunk()`の動作を確認
  - ストリーミング中の挿入が正しく動作することを検証
- [ ] 変更不要と判断（既に非同期対応済み）

### process6 複数同時実行の制御強化（オプション）

#### sub1 バッファ単位での実行管理

@target: `denops/ai-edit/service.ts` @ref: `denops/ai-edit/types.ts`

- [ ] グローバル`isProcessing`をバッファ単位の`Map<number, boolean>`に変更
  - `private processingBuffers = new Map<number, boolean>()`
- [ ] `executePrompt()`と`executeRewrite()`でバッファ番号を取得
  - `const bufnr = context.bufferInfo.bufnr`
- [ ] バッファ単位でのロックチェック
  - `if (this.processingBuffers.get(bufnr)) { ... }`
- [ ] 処理開始時と終了時にフラグを更新
  - 開始: `this.processingBuffers.set(bufnr, true)`
  - 終了: `this.processingBuffers.delete(bufnr)`

### process10 ユニットテスト

#### sub1 カーソル位置保存のテスト

@target: `tests/dispatcher.test.ts` (新規作成)

- [ ] `aiEdit()`呼び出し時に`savedPosition`が正しく設定されることを確認
- [ ] `aiRewrite()`でも同様にテスト

#### sub2 非同期実行のテスト

@target: `tests/integration.test.ts` (新規作成)

- [ ] `denops.notify()`が即座にリターンすることを確認
- [ ] API完了後に正しい位置に挿入されることを確認
- [ ] エラー時のメッセージ表示を確認

### process50 フォローアップ

#### sub1 実際の動作確認

- [ ] Vim/Neovimで`:AiEdit`を実行し、即座に操作可能か確認
- [ ] API完了時に正しい位置に挿入されるか確認
- [ ] エラーケースでの動作確認

#### sub2 パフォーマンス確認

- [ ] 複数バッファでの同時実行が可能か確認
- [ ] メモリリークがないか確認（長時間使用テスト）

### process100 リファクタリング

#### sub1 コードの整理

@target: `denops/ai-edit/service.ts`, `denops/ai-edit/dispatcher.ts`

- [ ] 重複コードの抽出（位置取得ロジックなど）
- [ ] エラーハンドリングの共通化
- [ ] コメントの追加と既存コメントの更新

#### sub2 型安全性の向上

@target: `denops/ai-edit/types.ts`

- [ ] `savedPosition`の必須/オプションの適切な設定
- [ ] 型ガードの追加（必要に応じて）

### process200 ドキュメンテーション

#### sub1 README更新

@target: `README.md`

- [ ] 非同期実行の説明を追加
- [ ] 使用例の更新（非ブロッキングであることを明記）
- [ ] トラブルシューティングセクションの追加

#### sub2 CHANGELOG更新

@target: `CHANGELOG.md` (新規作成または更新)

- [ ] 非同期化の機能追加を記載
- [ ] Breaking Changesの確認（ない場合はその旨記載）

#### sub3 コードコメントの充実

@target: 全実装ファイル

- [ ] `savedPosition`の目的と使い方をJSDocで説明
- [ ] 非同期パターンの説明コメントを追加
- [ ] Parrot.nvimから学んだパターンへの参照を追加

