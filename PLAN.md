# title: Visual selection判定ロジックの修正

## 概要
- `:AiRewrite`コマンドがVisual modeで正常に動作するように、`buffer.ts`のモード判定ロジックを修正する
- モード判定を削除し、マーク検証のみで選択範囲を判定する

### goal
- ユーザーがVisual modeでテキストを選択して`:AiRewrite`を実行すると、選択範囲が正しく取得され、書き換えが実行される

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること

## 開発のゴール
- `:AiRewrite`コマンドで「No text selected」エラーが発生しないようにする
- Visual selection marksの検証のみで、確実に選択範囲を取得する
- 既存の`:AiEdit`機能を壊さない

## 実装仕様

### 問題の根本原因
1. **コミット`74a009b6`以降の変更**:
   - `buffer.ts:getVisualSelection()`にモード判定を追加
   - `fn.mode()`で現在のモードをチェック
   - Normal mode (`'n'`) の場合は`undefined`を返す

2. **問題が発生する理由**:
   - `denops#request()`で同期実行しても、実行時点でNormal modeに戻っている
   - `fn.mode()`は実行時点のモードを返すため、`mode='n'`となる
   - Visual selection marks (`'<`, `'>`) は有効なのに、モードチェックで弾かれる

3. **デバッグログから判明した事実**:
   ```
   [DEBUG] getVisualSelection: mode=n
   [DEBUG] getVisualSelection: isVisualMode=false
   [DEBUG] aiRewrite: selection=undefined
   ```

### 解決策
**モード判定を完全に削除**し、`isVisualSelectionValid()`によるマーク検証のみで判定する

**理由**:
- Visual selection marksは、コマンド実行後もVimに保持される
- `isVisualSelectionValid()`で十分な検証を行っている
- モード判定は不要であり、むしろ問題を引き起こしている

### 修正前のコード (buffer.ts:97-115)
```typescript
async getVisualSelection(): Promise<string | undefined> {
  try {
    // Check current mode - allow Visual mode and Command-line mode
    const currentMode = await fn.mode(this.denops) as string;

    const isVisualMode =
      currentMode === 'v' ||
      currentMode === 'V' ||
      currentMode === '\x16' ||
      currentMode === 'c';

    // In Normal mode, ignore previous visual selection marks
    if (!isVisualMode) {
      return undefined;
    }

    // Validate selection marks
    if (!await this.isVisualSelectionValid()) {
      return undefined;
    }
    // ... 以降のロジック
  }
}
```

### 修正後のコード (コミット74a009b6の実装に戻す)
```typescript
async getVisualSelection(): Promise<string | undefined> {
  try {
    // Validate selection marks
    if (!await this.isVisualSelectionValid()) {
      return undefined;
    }

    // Get visual selection marks
    const startPos = await fn.getpos(this.denops, "'<") as number[];
    // ... 以降のロジック
  }
}
```

## 生成AIの学習用コンテキスト

### Denopsプラグイン実装ファイル
- `denops/ai-edit/buffer.ts`
  - `getVisualSelection()`メソッドのモード判定を削除
  - Line 97-115 を修正対象とする

### テストファイル
- `tests/airewrite_sync_test.ts`
  - 既存のテストケース（52テスト）が全てパスすることを確認

### 参考コミット
- `74a009b6`: 非同期実装導入（モード判定なし）
- `399243f`: ストリーミング位置修正（モード判定追加）← この変更が問題

## Process

### process1 buffer.tsのモード判定削除
#### sub1 getVisualSelection()からモードチェックを削除
@target: `denops/ai-edit/buffer.ts`
@ref: なし

- [ ] Line 97-115のモードチェックコードを削除
  - `fn.mode()`の呼び出しを削除
  - `isVisualMode`変数の定義を削除
  - `if (!isVisualMode)`条件分岐を削除
- [ ] `isVisualSelectionValid()`の呼び出しのみを残す
- [ ] コミット`74a009b6`の実装と一致することを確認

**期待される結果**:
```typescript
async getVisualSelection(): Promise<string | undefined> {
  try {
    // Validate selection marks
    if (!await this.isVisualSelectionValid()) {
      return undefined;
    }

    // Get visual selection marks
    const startPos = await fn.getpos(this.denops, "'<") as number[];
    const endPos = await fn.getpos(this.denops, "'>") as number[];
    // ... 既存のロジック
  }
}
```

### process10 ユニットテスト

#### sub1 既存テストの実行
@target: すべてのテストファイル
@ref: なし

- [ ] `deno test`を実行し、全52テストがパスすることを確認
- [ ] 特に以下のテストが正常であることを確認:
  - `tests/airewrite_sync_test.ts` (4テスト)
  - `tests/buffer_mode_test.ts` (6テスト)
  - `tests/async_test.ts` (4テスト)

#### sub2 型チェックの実行
@target: TypeScriptコード全体
@ref: なし

- [ ] `deno check denops/ai-edit/main.ts`を実行
- [ ] 型エラーがゼロであることを確認

### process50 フォローアップ

#### sub1 実環境での動作確認
@target: Vim/Neovim環境
@ref: なし

- [ ] プラグインを再読み込み (`:call denops#server#restart()`)
- [ ] Visual line modeでテキストを選択
  - 例: `V3j` で複数行選択
- [ ] `:AiRewrite translate to English`を実行
- [ ] 選択範囲が正しく翻訳されることを確認
- [ ] エラーメッセージが表示されないことを確認

#### sub2 Normal modeでの挙動確認
@target: Vim/Neovim環境
@ref: なし

- [ ] Normal modeで`:AiEdit hello`を実行
- [ ] カーソル位置の次の行に出力されることを確認
- [ ] 古いVisual selection marksがあっても誤動作しないことを確認

#### sub3 `:AiEdit`の動作確認
@target: Vim/Neovim環境
@ref: なし

- [ ] Visual modeでテキストを選択して`:AiEdit explain`を実行
- [ ] 選択範囲がコンテキストとして使用されることを確認
- [ ] 正常に動作することを確認

### process100 リファクタリング

#### sub1 不要なテストファイルの確認
@target: `tests/buffer_mode_test.ts`
@ref: なし

- [ ] モード判定を削除したため、`buffer_mode_test.ts`が不要になった可能性を検討
- [ ] テストが依然として有効か確認
- [ ] 必要に応じて削除または更新

#### sub2 コメントの更新
@target: `denops/ai-edit/buffer.ts`
@ref: なし

- [ ] `getVisualSelection()`のJSDocコメントを確認
- [ ] モード判定に関する記述があれば削除
- [ ] 現在の動作を正確に説明するコメントに更新

### process200 ドキュメンテーション

#### sub1 CHANGELOG.mdの更新
@target: `CHANGELOG.md`
@ref: なし

- [ ] 修正内容を追記
  - バージョン: 未定（次回リリース）
  - 内容: "fix: Remove mode check from getVisualSelection to fix :AiRewrite in Visual mode"
  - 詳細: "`:AiRewrite`コマンドがVisual modeで「No text selected」エラーを出す問題を修正"

#### sub2 README.mdの確認
@target: `README.md`
@ref: なし

- [ ] `:AiRewrite`の使用方法が正しく記載されているか確認
- [ ] 必要に応じて使用例を追加
- [ ] 既知の問題セクションから関連する記述を削除（あれば）

#### sub3 コミットメッセージの作成
@target: Git commit
@ref: なし

- [ ] 以下のようなコミットメッセージを作成:
  ```
  fix(buffer): remove mode check from getVisualSelection

  Remove mode check that was preventing :AiRewrite from working
  in Visual mode. The mode check was causing false negatives
  because Vim returns to Normal mode before the denops function
  executes, even with denops#request().

  Visual selection marks are still validated by isVisualSelectionValid(),
  which is sufficient for determining if a selection exists.

  Fixes the issue where :AiRewrite would show "No text selected"
  error even when text was properly selected in Visual mode.
  ```
