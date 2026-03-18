---
name: create-pr
description: 現在のブランチからGitHub PRを作成する。差分・コミット履歴を分析し、テンプレートに沿ったタイトルとdescriptionを生成する。「PRを作成して」「プルリク作って」などのリクエストで起動する。
mode: bypassPermissions
---

# PR作成スキル

現在のブランチの変更内容を分析し、PRを作成する。

## 対象リポジトリ

**サブモジュール（front / back / mobile）のみを対象とする。ルートリポジトリ（buzzbase）ではPRを作成しない。**

変更があるサブモジュールに対してそれぞれPRを作成する:
- `front/` → `ippei-shimizu/buzzbase_front`
- `back/` → `ippei-shimizu/buzzbase_back`
- `mobile/` → `ippei-shimizu/buzzbase_mobile`

複数のサブモジュールに変更がある場合はそれぞれPRを作成する。issueはメインリポジトリ（`ippei-shimizu/buzzbase`）で管理されているため、issueの検索・close指定はメインリポジトリを参照する。

## ルール

- PRは変更のあるサブモジュールのリポジトリに作成する（上記参照）
- ベースブランチはデフォルトで `stg`（`$ARGUMENTS` で指定があればそちらを使用）
- **mobileサブモジュールのみベースブランチは `main`**（front/backは `stg`）
- Assigneeは常に `ippei-shimizu` を設定する
- すべて日本語で記述する
- **確認なしで即座にPRを作成する**（プレビュー・承認ステップは不要）
- リモートにプッシュされていない場合は先にプッシュする

## ワークフロー

### 1. 現在のブランチ状態を確認

各サブモジュールの状態を確認する:

```bash
# backサブモジュール
cd back
git branch --show-current
git status --short
git log origin/$(git branch --show-current)..HEAD --oneline 2>/dev/null
git log stg..HEAD --oneline
git diff stg...HEAD --stat

# frontサブモジュール
cd front
git branch --show-current
git status --short
git log origin/$(git branch --show-current)..HEAD --oneline 2>/dev/null
git log stg..HEAD --oneline
git diff stg...HEAD --stat

# mobileサブモジュール（ベースブランチは main）
cd mobile
git branch --show-current
git status --short
git log origin/$(git branch --show-current)..HEAD --oneline 2>/dev/null
git log main..HEAD --oneline
git diff main...HEAD --stat
```

変更のないサブモジュールはスキップする。
未コミットの変更がある場合はユーザーに通知し、先にコミットするか確認する。

### 2. 差分の分析

変更のある各サブモジュールについて分析する:

```bash
cd <submodule>

# コミットメッセージ一覧
git log stg..HEAD --format="%s"

# 変更ファイル一覧
git diff stg...HEAD --stat

# 詳細な差分（大きい場合はサブエージェントで分析）
git diff stg...HEAD
```

以下を把握する:
- 変更されたファイルとその種類（新規/変更/削除）
- 実装の目的と内容
- 影響範囲（front / back / 両方）

### 3. 関連issueの特定

以下の手順で関連するissue番号を特定する:

1. **ブランチ名から抽出**: ブランチ名に含まれるissue番号を確認（例: `feature/123-some-feature` → #123、`fix/issue-45` → #45）
2. **コミットメッセージから抽出**: `#123`、`close #123`、`fix #123` などのパターンを検索
3. **GitHub Projects から検索**: 上記で見つからない場合、PRの内容に関連するissueをGitHub Projectsから検索する

```bash
# メインリポジトリのopen issueを一覧取得し、PRの内容に関連するものを探す
gh issue list --repo ippei-shimizu/buzzbase --state open --limit 30 --json number,title,body
```

見つかった場合は `close #ISSUE_NUMBER` に設定する。
**注意**: issueはメインリポジトリ（ippei-shimizu/buzzbase）に集約されている場合があるため、サブモジュールのPRでもメインリポジトリのissueを検索すること。

### 4. PRタイトルの生成

- コミット履歴と差分から変更の主目的を要約する
- 70文字以内の簡潔な日本語タイトル
- `$ARGUMENTS` にタイトルのヒントがあればそれを優先する

### 5. PR descriptionの生成

`/pr-description` スキルと同じテンプレートに沿って生成する:

```markdown
## issue
close #ISSUE_NUMBER

## 実装概要
<!-- 何をしたかを簡潔に（1-3行） -->

## 背景
<!-- なぜこの変更が必要だったか -->

## やらなかったこと
<!-- スコープ外にしたこと。なければ「特になし」 -->

## 受入基準
<!-- この PR がマージ可能と判断するための条件をチェックリストで -->
- [ ] 基準1
- [ ] 基準2

## 実装詳細
<!-- 技術的な実装内容。ファイル単位やモジュール単位で説明 -->

## スクリーンショット
<!-- UI変更がある場合のみ。なければ「なし」 -->

## 確認手順
<!-- レビュワーが動作確認するための具体的な手順 -->
1. 手順1
2. 手順2

## 影響範囲
<!-- この変更が影響する画面・機能・モジュール -->

## コード上の懸念点
<!-- レビュワーに特に見てほしい箇所や、判断に迷った実装 -->

## その他
<!-- 補足情報。なければ「特になし」 -->
```

### 6. プッシュとPR作成

変更のある各サブモジュールに対して即座に実行する:

```bash
cd <submodule>

# リモートにプッシュされていない場合
git push -u origin $(git branch --show-current)

# PR作成（リポジトリはサブモジュールに対応するものを使用）
# ベースブランチ: front/back は stg、mobile は main
gh pr create \
  --repo ippei-shimizu/buzzbase_<front|back|mobile> \
  --base <stg|main> \
  --title "<タイトル>" \
  --assignee ippei-shimizu \
  --body "$(cat <<'EOF'
<description内容>
EOF
)"
```

両方のサブモジュールに変更がある場合は2つのPRを作成する。

### 7. 結果報告

作成されたPRのURLを表示する。複数の場合はすべてのURLを一覧表示する。

## 注意事項

- **確認なしで即座にPR作成・pushを実行する**
- 差分から読み取れる事実に基づいて記述し、推測が入る箇所は明示する
- issue番号が特定できない場合は `close #` の行は空欄にする（推測で番号を入れない）
- 関連issueが見つかった場合は必ず `close #ISSUE_NUMBER` を設定する
- `$ARGUMENTS` が指定された場合、それをPRの背景コンテキストとして活用する
- 会話の文脈（直前の実装作業など）がある場合は、それを活用してdescriptionを充実させる
