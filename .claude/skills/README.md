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

## gstack (外部プラグイン)

Garry Tan製のClaude Codeエンジニアリングツールスイート。AIエージェントに組織的な役割を割り当て、開発プロセスを自動化する。

### 開発フロー

```
/office-hours → /plan-ceo-review → /plan-eng-review → 実装 → /review → /qa → /ship
```

### コマンド一覧

#### 企画・設計

| コマンド | 役割 | 内容 |
|----------|------|------|
| `/office-hours` | プロダクト思考家 | 要件を再考し実装案を生成 |
| `/plan-ceo-review` | CEO | スコープと製品ビジョンを評価 |
| `/plan-eng-review` | EM | アーキテクチャ設計・技術検証 |
| `/plan-design-review` | デザインレビュー | UIデザイン監査（レポートのみ） |
| `/design-review` | デザインレビュー | UIデザイン監査 + 修正ループ |
| `/design-consultation` | デザインコンサル | デザインシステムをゼロから構築 |
| `/autoplan` | 自動レビュー | CEO → デザイン → EMレビューを自動パイプライン実行 |

#### 実装・レビュー

| コマンド | 役割 | 内容 |
|----------|------|------|
| `/review` | スタッフエンジニア | コードレビューと自動修正 |
| `/cso` | セキュリティ責任者 | OWASP Top 10 / STRIDE脅威モデル分析 |
| `/investigate` | デバッガー | 体系的な根本原因分析 |

#### テスト・QA

| コマンド | 役割 | 内容 |
|----------|------|------|
| `/qa` | QAリード | ヘッドレスブラウザでテスト実行・バグ修正 |
| `/qa-only` | QAリード | テスト実行・レポートのみ（修正なし） |
| `/browse` | QAエンジニア | ヘッドレスブラウザ操作（ページ遷移、スクショ等） |
| `/benchmark` | パフォーマンス | パフォーマンスリグレッション検出 |

#### デプロイ・運用

| コマンド | 役割 | 内容 |
|----------|------|------|
| `/ship` | リリースエンジニア | テスト → PR作成 → デプロイ |
| `/land-and-deploy` | リリース | マージ → デプロイ → canary検証 |
| `/canary` | 監視 | デプロイ後の監視ループ |
| `/setup-deploy` | セットアップ | デプロイ設定の初期化 |
| `/document-release` | ドキュメント | リリース後のドキュメント更新 |

#### ユーティリティ

| コマンド | 内容 |
|----------|------|
| `/retro` | 振り返り・レトロスペクティブ |
| `/freeze` | デプロイフリーズ |
| `/unfreeze` | デプロイフリーズ解除 |
| `/careful` | 慎重モード有効化 |
| `/guard` | ガードレール有効化 |
| `/connect-chrome` | ブラウザ接続設定 |
| `/setup-browser-cookies` | ブラウザCookie設定 |
| `/gstack-upgrade` | gstack自体のアップデート |

### 使い方の例

```
# 新機能の企画から始める
/office-hours

# コードレビューを依頼
/review

# ブラウザでQAテスト
/qa

# セキュリティ監査
/cso

# PR作成からデプロイまで一気に
/ship
```

### 管理

- インストール先: `.claude/skills/gstack/`（プロジェクトローカル）
- アップデート: `/gstack-upgrade`
- `.gitignore` でリポジトリからは除外済み

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
