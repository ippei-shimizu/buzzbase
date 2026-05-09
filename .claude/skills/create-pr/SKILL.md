---
name: create-pr
description: 現在のブランチからGitHub PRを作成する。差分・コミット履歴を分析し、テンプレートに沿ったタイトルとdescriptionを生成する。「PRを作成して」「プルリク作って」などのリクエストで起動する。
mode: bypassPermissions
allowedTools:
  - Bash
  - Read
  - Glob
  - Grep
---

# PR作成スキル

現在のブランチからPRを作成する。確認なしで即実行。

## 絶対ルール

- ユーザー確認・承認は**一切行わない**。分析→PR作成を即実行
- 報告は**実行後の結果のみ**

## 対象リポジトリとベースブランチ

| パス | リポジトリ | ベースブランチ |
| ---- | ---------- | -------------- |
| `/Users/shimizuippei/projects/dev/buzzbase` | `ippei-shimizu/buzzbase` | `main` |
| `/Users/shimizuippei/projects/dev/buzzbase/front` | `ippei-shimizu/buzzbase_front` | `stg` |
| `/Users/shimizuippei/projects/dev/buzzbase/back` | `ippei-shimizu/buzzbase_back` | `stg` |
| `/Users/shimizuippei/projects/dev/buzzbase/mobile` | `ippei-shimizu/buzzbase_mobile` | `main` |

issueはメインリポジトリ（`ippei-shimizu/buzzbase`）で集約管理。サブモジュールのPRでもメインリポジトリのissueを参照する。

## トークン削減原則

- **`status --short` を最初に1回**回し、変更ありリポジトリだけに絞る。他はスキップ
- description は**コミットメッセージ（`log --format="%s"`）+ ファイル統計（`diff --stat`）から生成**。フルdiffは投げない
- diff の中身が必要な場合のみ `diff --name-status` を追加で取得
- 会話文脈に直前の作業があれば**それを最優先でdescriptionに反映**（git解析を最小化）

## ワークフロー

### 1. 変更ありリポジトリの絞り込み

```bash
git -C /Users/shimizuippei/projects/dev/buzzbase status --short
git -C /Users/shimizuippei/projects/dev/buzzbase/front status --short
git -C /Users/shimizuippei/projects/dev/buzzbase/back status --short
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile status --short
```

未コミット変更がある場合は先に `/smart-commit` で処理。

各リポジトリで `branch --show-current` してブランチ名取得。ベースブランチと一致するリポジトリ・空のリポジトリはスキップ。

### 2. 変更内容の取得（変更ありリポジトリのみ）

```bash
# コミットメッセージ
git -C <path> log <base>..HEAD --format="%s"

# ファイル統計
git -C <path> diff <base>...HEAD --stat
```

これだけで title / description は十分書ける。**フルdiffは原則投げない**。

`<base>` は表参照（front/back: `stg`、mobile/ルート: `main`）。`$ARGUMENTS` でベース指定があれば優先。

### 3. issue番号特定

優先順位:

1. ブランチ名から抽出（例: `chore/154-...` → #154、`fix/issue-45` → #45）
2. コミットメッセージから抽出（`#123`, `close #123`, `fix #123`）
3. 上記で不明なら、メインリポジトリの open issues から PR内容に近いものを検索:

```bash
gh issue list --repo ippei-shimizu/buzzbase --state open --limit 30 --json number,title
```

見つかれば `close #ISSUE_NUMBER`。**推測で番号を入れない**。不明なら空欄。

### 4. タイトル・description生成

- タイトル: 70文字以内・日本語・コミットメッセージから要約。`$ARGUMENTS` にヒントあれば優先
- description: 下のテンプレートに沿う。**会話文脈優先**、不足部分のみコミット情報で補完

```markdown
## issue
close #ISSUE_NUMBER

## 実装概要
<!-- 1-3行 -->

## 背景
<!-- なぜ -->

## やらなかったこと
<!-- スコープ外。なければ「特になし」 -->

## 受入基準
- [ ] 基準1
- [ ] 基準2

## 実装詳細
<!-- ファイル単位/モジュール単位 -->

## スクリーンショット
<!-- UI変更時のみ。なければ「なし」 -->

## 確認手順
1. 手順1
2. 手順2

## 影響範囲

## コード上の懸念点

## その他
<!-- なければ「特になし」 -->
```

### 5. push + PR作成（即実行）

```bash
# 必要ならpush
git -C <path> push -u origin <branch>

# PR作成
gh pr create \
  --repo <repo> \
  --head <branch> \
  --base <base> \
  --title "<title>" \
  --assignee ippei-shimizu \
  --body "$(cat <<'EOF'
<description>
EOF
)"
```

複数リポジトリに変更がある場合は各々で作成。

### 6. 結果報告

作成された PR の URL を一覧表示。

## コマンド実行制約

- `cd ... && git ...` 禁止
- `git -C` には**必ず絶対パス**
- `echo "..."` を含む複合コマンドを Bash 一発で書かない
- コマンドは個別 Bash 呼び出し
