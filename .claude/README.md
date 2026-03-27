# Claude Code 設定一覧（BUZZ BASE）

## Plugins

| プラグイン | 概要 |
|---|---|
| superpowers | 体系的な開発ワークフロー（設計→計画→TDD→レビュー） |
| claude-md-management | CLAUDE.md の品質監査・セッション学習キャプチャ |
| feature-dev | 7フェーズのガイド付き機能開発 |
| commit-commands | Git操作の自動化（コミット・プッシュ・PR・ブランチ掃除） |
| code-review | 4エージェント並列のPR自動レビュー |
| pr-review-toolkit | 6観点の多角的PRレビュー |
| code-simplifier | 機能を保持したリファクタリングエージェント |
| ralph-loop | 完了条件までの自律ループ実行 |
| plugin-dev | プラグイン開発ツールキット |
| skill-creator | スキル作成・改善・評価 |
| claude-code-setup | コードベース解析による自動化推薦 |
| security-guidance | ファイル編集時のセキュリティ自動検査フック |
| frontend-design | 本番グレードの高品質UI生成 |
| typescript-lsp | TypeScript/JavaScript LSP連携 |
| ruby-lsp | Ruby LSP連携 |
| github | GitHub MCP連携 |
| playwright | Playwright MCPブラウザテスト |

詳細: [.claude/docs/plugin/](docs/plugin/)

## Skills（カスタム）

| スキル | 概要 |
|---|---|
| `/checkout-branch` | issue番号からサブモジュールに作業ブランチを作成 |
| `/create-issue` | GitHub issue作成 + Projects自動追加 |
| `/create-pr` | PR作成（テンプレート付きdescription自動生成） |
| `/pr-description` | 既存PRのdescription自動生成・反映 |
| `/start-worktree` | issue番号からgit worktree + 開発環境を一括セットアップ |
| `/rspec-behavior-test` | 古典派テスト方針に基づくRSpecテスト作成 |
| `/strategy-analysis` | 6エージェント並列の戦略分析 |
| `react-native-skills` | React Native/Expo ベストプラクティス（自動トリガー） |
| `vercel-react-best-practices` | React/Next.js パフォーマンス最適化（自動トリガー） |
| `vercel-composition-patterns` | React コンポジションパターン（自動トリガー） |

詳細: [.claude/skills/README.md](skills/README.md)

## Agents

| エージェント | 概要 |
|---|---|
| strategy-lead | 収益化戦略の統括・PDCAサイクル管理 |
| ad-revenue-optimizer | AdSense・アフィリエイト広告収益の最大化 |
| growth-marketing | ユーザー獲得・定着・SNSマーケティング |
| product-planner | 収益化に必要な機能設計・GitHub Issue作成 |
| market-researcher | 競合分析・市場調査・収益モデル調査 |
| analytics-analyst | GA・Search Consoleデータ分析・データドリブン施策 |
| react-perf-reviewer | front/配下のReactパフォーマンスレビュー |
| composition-reviewer | front/配下のReactコンポジションパターンレビュー |

## Rules

| ルール | 概要 |
|---|---|
| ubiquitous-language | ドメイン用語の定義（「新チーム」等） |
