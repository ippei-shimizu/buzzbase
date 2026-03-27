# CLAUDE.md Management プラグイン使用ガイド（BUZZ BASE）

## 概要

[claude-md-management](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-md-management) は、CLAUDE.md ファイルの品質維持とセッション学習の記録を行う Anthropic 公式プラグイン。

## インストール・管理

```bash
# インストール済み
/plugin install claude-md-management@claude-plugins-official

# 更新
/plugin update claude-md-management

# スキル再読み込み
/reload-plugins
```

## 提供ツール

| ツール | 種類 | 目的 | 使うタイミング |
|--------|------|------|----------------|
| `claude-md-improver` | スキル | CLAUDE.md をコードベースと同期 | 定期メンテナンス、コード変更後 |
| `/revise-claude-md` | コマンド | セッション中の学習をキャプチャ | セッション終了時 |

---

## 1. claude-md-improver（品質監査スキル）

### トリガー

```
「CLAUDE.md を監査して」
「CLAUDE.md が最新か確認して」
"audit my CLAUDE.md files"
```

### 実行フロー

```
1. Discovery  → リポジトリ内の全 CLAUDE.md を検出
2. Assessment → 品質基準に基づいて 0〜100 点でスコアリング
3. Report     → 結果を報告（変更前に必ず表示）
4. Proposal   → 改善提案
5. Updates    → ユーザー承認後に反映
```

### 品質スコア（6軸評価）

| 評価軸 | 内容 |
|--------|------|
| Commands/Workflows | コマンドがコピペで使えるか |
| Architecture Clarity | アーキテクチャの説明が明確か |
| Non-obvious Patterns | 非自明なパターンやgotchaが記載されているか |
| Conciseness | 簡潔さ（冗長でないか） |
| Currency | 現在のコードベースと一致しているか |
| Actionability | 実用的で行動可能な内容か |

### 検出対象のファイル

| パス | 用途 |
|------|------|
| `./CLAUDE.md` | プロジェクト共有の設定（git管理） |
| `./.claude.local.md` | 個人設定（gitignore対象） |
| `~/.claude/CLAUDE.md` | ユーザー全体のデフォルト |
| `./packages/*/CLAUDE.md` | モノレポの各モジュール用 |

### 核心思想

CLAUDE.md は**最小限かつ実用的**に保つ。プロジェクト固有のパターンや「落とし穴」に集中し、自明な情報や汎用的な内容は書かない。

---

## 2. /revise-claude-md（セッション学習キャプチャ）

### 使い方

セッション終了前に実行:

```
/revise-claude-md
```

### やること

1. セッション中に発見・使用した情報を振り返る
   - 使用した Bash コマンド
   - コードスタイルのパターン
   - テストアプローチ
   - 環境設定の詳細
   - 遭遇した警告や落とし穴
2. 追加すべき内容を提案（diff形式）
3. ユーザー承認後に CLAUDE.md を更新

### 更新先の振り分け

| 内容 | 更新先 |
|------|--------|
| チーム共有すべき情報 | `CLAUDE.md`（git管理） |
| 個人的な設定・メモ | `.claude.local.md`（gitignore） |

### 追加内容の品質基準

- **簡潔**: 1概念1行
- **実用的**: 再発しそうなパターンのみ
- **軽量**: トークン消費を抑えるため冗長な説明は避ける
- 一度きりの修正や自明な情報は追加しない

---

## BUZZ BASE での活用

### 監査対象ファイル

```
buzzbase/CLAUDE.md          ← ルート（サービス間通信、Gitルール）
buzzbase/front/CLAUDE.md    ← フロントエンド（Next.js ルール）
buzzbase/back/CLAUDE.md     ← バックエンド（Rails 設定）
```

### 推奨ワークフロー

**定期メンテナンス（月1回程度）:**
```
「CLAUDE.md を監査して」
→ 各ファイルのスコアを確認 → コードベースとの乖離を修正
```

**セッション終了時:**
```
/revise-claude-md
→ 新しいAPI規約、環境設定の変更、ハマりポイントなどを記録
```
