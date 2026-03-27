---
name: sync-to-toolkit
description: buzzbaseで作成・更新したスキルやエージェントをclaude-code-toolkitリポジトリに同期する。「toolkitに同期して」「共通化して」「toolkitに追加して」などのリクエストで起動する。
mode: bypassPermissions
---

# Toolkit同期スキル

buzzbaseで作成・更新したスキルやエージェントを `claude-code-toolkit` リポジトリに同期する。

## 前提

- toolkit リポジトリ: `https://github.com/ippei-shimizu/claude-code-toolkit`
- ローカルクローン先: `/tmp/claude-code-toolkit`（なければcloneする）

## ワークフロー

### 1. 対象の特定

`$ARGUMENTS` で指定されたスキル名・エージェント名を対象とする。指定がない場合はユーザーに確認する。

### 2. プロジェクト固有チェック

対象ファイルの内容を読み、以下が含まれていないか確認する:

- `ippei-shimizu/buzzbase` 等のリポジトリ名ハードコード
- `buzzbase` 固有のサブモジュール構造（`front/`, `back/`, `mobile/`）
- 固有のブランチ名（`stg`）
- 固有のDocker構成
- 固有のGitHub Projects名

**含まれている場合**: ユーザーに「プロジェクト固有の内容が含まれています。汎用化してから同期しますか？」と確認する。汎用化する場合は、固有部分を「CLAUDE.mdを参照」等の汎用的な記述に置き換えたコピーを作成する。

### 3. toolkitリポジトリの準備

```bash
# ローカルにクローンがなければ取得
if [ ! -d /tmp/claude-code-toolkit ]; then
  git clone --recurse-submodules git@github.com:ippei-shimizu/claude-code-toolkit.git /tmp/claude-code-toolkit
else
  cd /tmp/claude-code-toolkit && git pull
fi
```

### 4. ファイルの同期

対象の種類に応じてコピー先を決定:

| 種類 | buzzbase側のパス | toolkit側のパス |
|------|-----------------|----------------|
| スキル | `.claude/skills/<name>/` | `/tmp/claude-code-toolkit/skills/<name>/` |
| エージェント | `.claude/agents/<name>.md` | `/tmp/claude-code-toolkit/agents/<name>.md` |

ディレクトリごとコピーする（SKILL.md, AGENTS.md, rules/ 等すべて含む）。

### 5. README更新

`/tmp/claude-code-toolkit/README.md` のスキル一覧・エージェント一覧に、新規追加分のエントリを追加する。既存エントリの場合は更新不要。

### 6. コミット・プッシュ

```bash
cd /tmp/claude-code-toolkit
git add -A
git commit -m "Add: <スキル/エージェント名>を追加

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
git push
```

### 7. 完了報告

同期した内容のサマリーを出力する:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
toolkit同期完了
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
対象: <スキル/エージェント名>
種類: スキル / エージェント
汎用化: あり / なし
リポジトリ: https://github.com/ippei-shimizu/claude-code-toolkit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 注意事項

- プロジェクト固有のスキル（create-issue, strategy-analysis等）は同期しない
- 汎用化が必要な場合は元ファイルは変更せず、コピーを修正してtoolkitに同期する
- toolkitのREADMEは適切なカテゴリに追加する
