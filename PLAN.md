# title: LLM Chat Editor (ai-edit.vim) プラグイン実装

## 概要
- Vim/Neovim環境でOpenRouter APIを使用してLLMと対話できるプラグインを実装
- カーソル位置への直接出力とビジュアルモード選択範囲のコンテキスト活用が可能

### goal
- ユーザーがVimを離れることなく、`:AiEdit [prompt]`コマンドでLLMの支援を受けられる
- 選択したコードに対してLLMからの提案を直接エディタ内で受け取れる

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 日本語での説明を行う
- cdコマンドの代わりにj(zoxide)コマンドを使用しない

## 開発のゴール
- Denopsを使用したTypeScriptベースのVimプラグインを完成させる
- OpenRouter APIとの連携を実現し、将来的に他のLLMプロバイダも追加可能な設計にする
- ストリーミングレスポンスによるリアルタイム表示を実現

## 実装仕様
- **アーキテクチャ**: Strategy Pattern with Factoryによるプロバイダ抽象化
- **技術スタック**: Deno 1.40+, Denops v6+, TypeScript, OpenRouter API v1
- **プログレス表示**: エコーメッセージによるシンプルな進捗表示
- **主要コンポーネント**:
  - LLMService（通信統括）
  - ProviderFactory（プロバイダ生成）
  - BufferManager（バッファ操作）
  - ConfigManager（設定管理）
  - ErrorHandler（エラー処理）

## 生成AIの学習用コンテキスト
### 要件定義
- /Users/ttakeda/.config/nvim/plugged/ai-edit.vim/.kiro/specs/llm-chat-editor/requirements.md
  - 6つの主要要件（プロバイダ抽象化、コマンド実行、ビジュアルモード、Denops統合、設定管理、エラーハンドリング）

### 技術設計
- /Users/ttakeda/.config/nvim/plugged/ai-edit.vim/.kiro/specs/llm-chat-editor/design.md
  - コンポーネント設計とインターフェース定義

### 調査結果
- /Users/ttakeda/.config/nvim/plugged/ai-edit.vim/.kiro/specs/llm-chat-editor/research.md
  - OpenRouter API仕様、Denopsフレームワーク詳細、設計決定の根拠

### 参考実装
- ~/.config/nvim/plugged/denops.vim
- ~/.config/nvim/plugged/aider.vim

## Process
### process1 Denopsプラグイン基礎セットアップ
#### sub1 プロジェクト構造の初期化
@target: /Users/ttakeda/.config/nvim/plugged/ai-edit.vim/
@ref: ~/.config/nvim/plugged/aider.vim/denops/
- [ ] denops/ai-edit/ディレクトリを作成
- [ ] deno.jsonを作成（TypeScript設定、importマップ定義）
- [ ] .gitignoreにDeno関連ファイルを追加
  - 根拠: Denopsプラグインの標準構造（research.md参照）

#### sub2 プラグインエントリーファイル作成
@target: /Users/ttakeda/.config/nvim/plugged/ai-edit.vim/plugin/ai-edit.vim
@ref: ~/.config/nvim/plugged/denops.vim/plugin/denops.vim
- [ ] Vim/Neovimバージョンチェック（9.1.1646+/0.11.3+）
- [ ] Denops起動確認処理
- [ ] 自動コマンド登録（DenopsReady）
  - 根拠: Denopsの最小要件（design.md Technology Stack参照）

### process2 型定義とインターフェース設計
#### sub1 LLMプロバイダインターフェース定義
@target: /Users/ttakeda/.config/nvim/plugged/ai-edit.vim/denops/ai-edit/types.ts
- [ ] LLMProviderInterfaceの定義（sendRequest, validateConfig）
- [ ] Message, ChatRequest, ChatResponse型の定義
- [ ] ProviderConfig型の定義
  - 根拠: OpenRouter API仕様（research.md参照）

#### sub2 エラー型定義
@target: /Users/ttakeda/.config/nvim/plugged/ai-edit.vim/denops/ai-edit/errors.ts
- [ ] カスタムエラークラスの作成
- [ ] エラーコード定義（ネットワーク、API、バリデーション）
  - 根拠: エラーハンドリング要件（requirements.md Requirement 6）

### process3 設定管理システム実装
#### sub1 ConfigManagerの実装
@target: /Users/ttakeda/.config/nvim/plugged/ai-edit.vim/denops/ai-edit/config.ts
@ref: ~/.config/nvim/plugged/aider.vim/denops/aider/main.ts
- [ ] Vimグローバル変数の読み込み（g:ai_edit_*）
- [ ] 環境変数からのAPIキー取得（OPENROUTER_API_KEY）
- [ ] デフォルト値の設定とマージ処理
  - 根拠: 設定管理要件（requirements.md Requirement 5）

### process4 バッファ管理システム実装
#### sub1 BufferManagerの実装
@target: /Users/ttakeda/.config/nvim/plugged/ai-edit.vim/denops/ai-edit/buffer.ts
@ref: ~/.config/nvim/plugged/aider.vim/denops/aider/bufferOperation.ts
- [ ] カーソル位置の取得・設定
- [ ] テキスト挿入処理（append, insert）
- [ ] ビジュアルモード選択範囲の取得
- [ ] 選択範囲最終行への出力
  - 根拠: バッファ操作要件（requirements.md Requirement 2, 3）

### process5 プロバイダ実装
#### sub1 プロバイダファクトリー実装
@target: /Users/ttakeda/.config/nvim/plugged/ai-edit.vim/denops/ai-edit/providers/factory.ts
- [ ] プロバイダ登録メカニズム
- [ ] 設定に基づくインスタンス生成
- [ ] デフォルトプロバイダ選択
  - 根拠: Strategy Pattern（design.md Architecture Pattern）

#### sub2 OpenRouterプロバイダ実装
@target: /Users/ttakeda/.config/nvim/plugged/ai-edit.vim/denops/ai-edit/providers/openrouter.ts
- [ ] API通信実装（fetch使用）
- [ ] Bearer認証トークン管理
- [ ] ストリーミングレスポンス処理（AsyncGenerator）
- [ ] エラーハンドリング（レート制限、ネットワークエラー）
  - 根拠: OpenRouter API仕様（research.md参照）

### process6 LLMサービス実装
#### sub1 LLMServiceコア実装
@target: /Users/ttakeda/.config/nvim/plugged/ai-edit.vim/denops/ai-edit/service.ts
- [ ] プロンプト実行メソッド（executePrompt）
- [ ] コンテキスト結合処理
- [ ] ストリーミングレスポンスの受信と処理
- [ ] エコーメッセージによる進捗表示（"Generating response..."）
- [ ] キャンセル機能の実装（Ctrl-Cで中断）
  - 根拠: LLMService設計（design.md Components参照）

### process7 コマンドディスパッチャー実装
#### sub1 ディスパッチャー実装
@target: /Users/ttakeda/.config/nvim/plugged/ai-edit.vim/denops/ai-edit/dispatcher.ts
- [ ] コマンド引数パース
- [ ] 実行モード判定（通常/ビジュアル）
- [ ] コンテキスト情報収集
- [ ] 適切なハンドラーへのルーティング
  - 根拠: コマンド実行フロー（design.md System Flows）

### process8 メインエントリーポイント実装
#### sub1 main.ts実装
@target: /Users/ttakeda/.config/nvim/plugged/ai-edit.vim/denops/ai-edit/main.ts
@ref: ~/.config/nvim/plugged/aider.vim/denops/aider/main.ts
- [ ] main関数のエクスポート
- [ ] denops.dispatcherへのメソッド登録
- [ ] AiEditコマンドの定義
- [ ] AiEditVisualコマンドの定義
  - 根拠: Denops Dispatcher Pattern（research.md参照）

### process9 エラーハンドリング実装
#### sub1 ErrorHandlerの実装
@target: /Users/ttakeda/.config/nvim/plugged/ai-edit.vim/denops/ai-edit/error-handler.ts
- [ ] エラー分類と処理
- [ ] ユーザー通知機能（エコーメッセージ表示）
- [ ] エラーログ記録（~/.cache/ai-edit/error.log）
- [ ] リトライメカニズム（exponential backoff）
  - 根拠: エラーハンドリング設計（design.md Error Handling）

### process10 ユニットテスト
#### sub1 プロバイダテスト
@target: /Users/ttakeda/.config/nvim/plugged/ai-edit.vim/tests/providers.test.ts
- [ ] OpenRouterプロバイダのモックテスト
- [ ] ストリーミングレスポンステスト
- [ ] エラーケーステスト

#### sub2 サービステスト
@target: /Users/ttakeda/.config/nvim/plugged/ai-edit.vim/tests/service.test.ts
- [ ] LLMService統合テスト
- [ ] コンテキスト結合テスト
- [ ] キャンセル機能テスト

### process11 統合とE2Eテスト
#### sub1 コマンド実行テスト
@target: /Users/ttakeda/.config/nvim/plugged/ai-edit.vim/tests/integration.test.ts
- [ ] :AiEditコマンドの動作確認
- [ ] ビジュアルモード動作確認
- [ ] エラー表示の確認
  - 根拠: テスト戦略（design.md Testing Strategy）

### process50 フォローアップ
#### sub1 パフォーマンス最適化
- [ ] ストリーミング処理の最適化
- [ ] メモリ使用量の監視
- [ ] 大規模レスポンスへの対応

#### sub2 追加プロバイダ対応（将来）
- [ ] Claude API対応
- [ ] OpenAI API対応
- [ ] ローカルLLM対応

### process100 リファクタリング
#### sub1 コードの整理
- [ ] 共通処理の抽出
- [ ] 型定義の最適化
- [ ] エラーハンドリングの統一

### process200 ドキュメンテーション
#### sub1 ユーザードキュメント作成
@target: /Users/ttakeda/.config/nvim/plugged/ai-edit.vim/README.md
- [ ] インストール手順
- [ ] 設定方法（APIキー、モデル選択）
- [ ] 使用例とベストプラクティス

#### sub2 開発者ドキュメント作成
@target: /Users/ttakeda/.config/nvim/plugged/ai-edit.vim/docs/
- [ ] アーキテクチャ説明
- [ ] プロバイダ追加ガイド
- [ ] API仕様書
