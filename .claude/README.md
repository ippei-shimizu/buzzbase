# Claude Code Skills

本プロジェクトで利用可能なClaude Codeスキル一覧。

## スキル一覧

### `/smart-commit` - スマートコミット

作業差分を分析し、論理的な単位でコミットを分割提案する。ユーザーの承認後、実際のgit操作（add / commit）も実行する。

**使い方:**
```
/smart-commit
/smart-commit 認証機能の実装とバグ修正を分けてコミットして
```

**トリガー例:** 「コミットを分けて」「コミットメッセージを考えて」「差分を整理して」

**機能:**
- ステージング済み・未ステージングの全差分を取得・分析
- 機能単位・関心の分離・依存関係を考慮してコミットを分割
- プロジェクトのプレフィックス規約（`fix:`, `add:`, `feat:` 等）に従ったメッセージを生成
- ユーザーの承認後に実際のコミットを実行

---

### `/pr-description` - PR Description自動生成

GitHub PRのdescriptionを自動生成し、`gh pr edit`で直接PRに反映する。

**使い方:**
```
/pr-description
/pr-description 123
/pr-description https://github.com/ippei-shimizu/buzzbase/pull/123
```

**トリガー例:** 「PRのdescriptionを作成して」「PR 123のdescription書いて」

**機能:**
- `gh` CLIでPRの差分・コミット履歴を取得
- テンプレート（実装概要・背景・受入基準・影響範囲など）に沿った日本語descriptionを生成
- 生成後、`gh pr edit`で直接PRに反映（対話確認なしで即座に反映）

---

### `/create-pr` - PR作成

現在のブランチからGitHub PRを作成する。差分・コミット履歴を分析し、テンプレートに沿ったタイトルとdescriptionを自動生成する。

**使い方:**
```
/create-pr
/create-pr Claude Code設定の整備
```

**トリガー例:** 「PRを作成して」「プルリク作って」「プルリクエスト出して」

**機能:**
- ベースブランチ（main）からの全コミット・差分を分析
- `/pr-description`と同じテンプレートでdescriptionを生成
- プレビュー表示後、ユーザーの承認を得てからプッシュ・PR作成
- 関連issueがあればブランチ名・コミットから自動検出

---

### `/create-issue` - Issue作成

`ippei-shimizu/buzzbase`リポジトリにGitHub issueを作成し、GitHub Projects "BUZZ BASE"に自動追加する。

**使い方:**
```
/create-issue ログイン画面でメールアドレスのバリデーションが効いていない
/create-issue チーム管理画面の新規追加機能
```

**トリガー例:** 「issueを作成して」「バグ報告したい」

**機能:**
- 引数からissueのタイトル・本文・ラベルを自動決定
- テンプレート（概要・背景・対応内容・影響範囲・完了条件）に沿って本文を生成
- 作成前にプレビューを表示し、ユーザーの承認を待つ
- 承認後に`gh issue create`で作成し、プロジェクト "BUZZ BASE"に追加

---

### `vercel-react-best-practices` - React/Next.jsパフォーマンス最適化

Vercel Engineeringによるパフォーマンス最適化ガイドライン。`front/`ディレクトリ（Next.jsフロントエンド）のコード作成・レビュー時に自動適用される。

**適用タイミング:** `front/`配下のReactコンポーネントやNext.jsページの作成・レビュー・リファクタリング時に自動で参照される（手動呼び出し不要）

**カテゴリ（優先度順）:**
1. **ウォーターフォール排除** (CRITICAL) - `Promise.all()`の活用、Suspenseストリーミング等
2. **バンドルサイズ最適化** (CRITICAL) - barrel importの回避、動的インポート等
3. **サーバーサイドパフォーマンス** (HIGH) - `React.cache()`、並列フェッチ等
4. **クライアントサイドデータ取得** (MEDIUM-HIGH) - SWR活用、イベントリスナー最適化等
5. **再レンダリング最適化** (MEDIUM) - メモ化、派生ステート、`startTransition`等
6. **レンダリングパフォーマンス** (MEDIUM) - `content-visibility`、条件付きレンダリング等
7. **JavaScriptパフォーマンス** (LOW-MEDIUM) - Map/Setの活用、ループ最適化等
8. **高度なパターン** (LOW) - イベントハンドラーのref格納等
