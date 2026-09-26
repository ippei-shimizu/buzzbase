# Claude Code Skills 使い方

## コマンド型スキル

### `/checkout-branch` — 作業ブランチ作成

issue番号からサブモジュールに作業ブランチを作成。issue情報からブランチ名を自動生成し、最新のベースブランチから分岐。

```
/checkout-branch 116
```

---

### `/create-issue` — GitHub Issue作成

buzzbaseリポジトリにissueを作成し、GitHub Projects "BUZZ BASE" に自動追加。作成前にプレビュー表示。

```
/create-issue ログイン画面でバリデーションが効いていない
```

---

### `/create-pr` — PR作成

現在のブランチからPRを作成。差分・コミット履歴からテンプレートに沿ったタイトルとdescriptionを自動生成。

```
/create-pr
/create-pr 認証機能の実装
```

---

### `/pr-description` — PR Description自動生成

既存PRのdescriptionを自動生成し、`gh pr edit` で直接反映。

```
/pr-description
/pr-description 123
/pr-description https://github.com/ippei-shimizu/buzzbase/pull/123
```

---

### `/implement-issue` — issue 実装 → Draft PR → レビュー依頼

issue の内容が妥当か（実装済みでないか、既存コードと矛盾していないか、対象リポジトリが判別できるか）を先に検証し、問題なければ作業ブランチ作成・実装・検証・コミット・push・**Draft PR** 作成まで実行。続けて `request-claude-review` を呼び出してレビュー依頼と指摘対応まで完了させる（マージはしない）。issue は複数指定でき、作業ツリーが共有されるため逐次処理する。issue の前提が矛盾している場合はその issue をスキップし、最終報告で確認事項として返す。

```
/implement-issue 340
/implement-issue 340 341 342
/implement-issue https://github.com/ippei-shimizu/buzzbase/issues/340
```

トリガー: 「issue #340 を実装してPRまで出して」

---

### `/implement-issue-cloud` — issue 実装 → Draft PR → レビュー依頼（クラウドセッション版）

`/implement-issue` を Claude Code on the web（クラウドセッション）で動くように置き換えたもの。`gh` CLI の代わりに GitHub MCP を使い、リポジトリの場所は remote URL から検出し、push 先はセッションが指定したブランチに固定する。レビューは `gh run watch` で待たず、PR を購読してイベントで起こされてから指摘対応する。Projects の Status 変更は MCP でできないため、最終報告でユーザーに依頼する。1ブランチ = 1 PR のため、同じリポジトリを対象とする issue は1セッション1件まで。

```
/implement-issue-cloud 340
/implement-issue-cloud 340 341
```

トリガー: クラウドセッションでの「issue #340 を実装してPRまで出して」

---

### `/request-claude-review` — @claude コードレビュー依頼＋自動対応

PRの差分を分析し、重点観点を明記した `@claude` メンションのコメントを投稿してGitHub ActionsのClaude Codeレビューを起動。指摘は差分の該当行へのインラインコメントで返る。レビューが返ってくるまで待機し、指摘内容を確認して対応要否を判断したうえで、修正の実装・コミット（指摘1件につき1コミット）・pushまでを自動で行う（マージはしない）。

```
/request-claude-review https://github.com/ippei-shimizu/buzzbase_back/pull/335
/request-claude-review 335
/request-claude-review 335 N+1とマイグレーションの非可逆性を重点的に
```

トリガー: 「PRにレビュー依頼して」「@claudeでレビューお願いして」

---

### `/request-claude-review-cloud` — @claude コードレビュー依頼＋自動対応（クラウドセッション版）

`/request-claude-review` を Claude Code on the web（クラウドセッション）で動くように置き換えたもの。`gh` CLI の代わりに GitHub MCP でコメント投稿・返信・resolve を行い、レビューは `gh run watch` で待たず PR を購読してイベントで起こされてから対応する。レビュー観点・依頼本文・指摘の分類基準はローカル版を参照する。PR の head がセッション指定ブランチと異なる場合は、修正を push する前に一度だけ許可を確認する。`/implement-issue-cloud` のレビュー依頼・指摘対応もこのスキルの手順を使う。

```
/request-claude-review-cloud https://github.com/ippei-shimizu/buzzbase_back/pull/335
/request-claude-review-cloud 335 N+1とマイグレーションの非可逆性を重点的に
```

トリガー: クラウドセッションでの「PRにレビュー依頼して」「@claudeでレビューお願いして」

---

### `/start-worktree` — Git Worktree + 開発環境セットアップ

issue番号からgit worktreeを作成。front/backサブモジュールのworktree作成、ブランチ作成、.envコピー、Docker Compose起動まで一括実行。

```
/start-worktree 88
```

---

### `/rspec-behavior-test` — RSpecテスト作成

古典派テスト（振る舞いテスト）の方針に基づいてRSpecテストを作成。

```
/rspec-behavior-test
```

トリガー: 「テストを書いて」「振る舞いテストを書いて」「specを追加して」

---

### `/strategy-analysis` — 戦略分析

6つの戦略系エージェントを並列起動し、GAデータ・競合・広告収益を総合分析して成長施策を提案。

```
/strategy-analysis
```

トリガー: 「戦略分析して」「施策を考えて」「GAデータを分析して」

---

## 自動トリガー型スキル

以下のスキルは手動呼び出し不要。対象作業時に自動で適用される。

### `react-native-skills`

React Native/Expo のベストプラクティス。モバイルアプリ開発時に自動適用。

### `vercel-react-best-practices`

Vercel Engineering によるReact/Next.js パフォーマンス最適化ガイドライン。`front/` 配下の作業時に自動適用。

優先度順: ウォーターフォール排除 → バンドルサイズ最適化 → サーバーサイド → クライアントサイド → 再レンダリング → レンダリング → JS最適化

### `vercel-composition-patterns`

React コンポジションパターン。コンポーネント設計・リファクタリング時に自動適用。Compound Components、Render Props、Context Providers 等。

### `record-learning`

PRレビュー指摘への対応完了時、またはユーザーが手動修正を伝えたときに学びを抽出し、個人の好み（自動memory）かプロジェクト規約候補かを判定する。同じ指摘が2回目に出た時点でのみCLAUDE.md/`.claude/rules/*.md`への追加をdiffで提案し、承認後に反映する。`/record-learning` で明示的に呼び出すことも可能。詳細: `CLAUDE.md` の「学習ループ」セクション参照。
