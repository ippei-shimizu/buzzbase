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
