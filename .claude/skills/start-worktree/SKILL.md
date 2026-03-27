---
name: start-worktree
description: 指定したissue番号でgit worktreeを作成し、開発環境を自動セットアップする。`/start-worktree 88`のように呼び出す。front/backサブモジュールのworktree作成、ブランチ作成、.envコピー、Docker Compose起動までを一括実行する。
---

# Git Worktree 開発スタートスキル

指定したissue番号をもとに、front/backサブモジュールのgit worktreeを作成し、開発環境を自動セットアップする。

## 前提

- メインリポジトリ: `/Users/shimizuippei/projects/dev/buzzbase`
- frontサブモジュール: `./front`（リモート: `ippei-shimizu/buzzbase_front`）
- backサブモジュール: `./back`（リモート: `ippei-shimizu/buzzbase_back`）
- worktree配置先: メインリポジトリの親ディレクトリ（`../`）

## ワークフロー

### 1. 引数の解析

`$ARGUMENTS` からissue番号を取得する。引数が空の場合はユーザーにissue番号を質問する。

### 2. issue情報の取得

```bash
gh issue view <ISSUE_NUMBER> --repo ippei-shimizu/buzzbase --json title,body,labels
```

issueのタイトルからブランチ名を決定する:
- プレフィックス: issueのラベルやタイトルから判断
  - `bug` ラベル / `Bug:` → `fix/`
  - `enhancement` ラベル / `Feature:` `Perf:` → `feature/`
  - `Refactor:` → `refactor/`
  - `Chore:` → `chore/`
  - その他 → `feature/`
- 形式: `<prefix>/issue-<NUMBER>-<短い英語の説明>`
- 例: `feature/issue-88-v2-game-api`

### 3. 影響範囲の確認

issueの本文から影響範囲（front / back / 両方）を確認する。
明確でない場合はユーザーに確認する。

### 4. ユーザーに確認

作成内容をプレビュー表示し、承認を待つ:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Worktree セットアップ プレビュー
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue: #<NUMBER> <タイトル>
ブランチ名: <ブランチ名>
影響範囲: front / back / 両方

作成されるworktree:
  front: /Users/shimizuippei/projects/dev/buzzbase-front-issue<NUMBER>
  back:  /Users/shimizuippei/projects/dev/buzzbase-back-issue<NUMBER>

Docker Compose起動コマンド:
  FRONT_DIR=../buzzbase-front-issue<NUMBER> BACK_DIR=../buzzbase-back-issue<NUMBER> docker compose up -d
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

ユーザーの明示的な承認を待つ。ブランチ名の変更希望があれば修正する。

### 5. worktreeの作成

承認後、以下を自動実行する。

#### 5a. frontサブモジュール（影響範囲にfrontが含まれる場合）

```bash
cd /Users/shimizuippei/projects/dev/buzzbase/front

# stgブランチを最新に更新
git checkout stg
git pull origin stg

# worktree作成（新規ブランチを切る）
git worktree add -b <BRANCH_NAME> /Users/shimizuippei/projects/dev/buzzbase-front-issue<NUMBER>
```

#### 5b. backサブモジュール（影響範囲にbackが含まれる場合）

```bash
cd /Users/shimizuippei/projects/dev/buzzbase/back

# stgブランチを最新に更新
git checkout stg
git pull origin stg

# worktree作成（新規ブランチを切る）
git worktree add -b <BRANCH_NAME> /Users/shimizuippei/projects/dev/buzzbase-back-issue<NUMBER>
```

### 6. .envファイルのコピー

worktreeには `.gitignore` 対象のファイルが含まれないため、手動でコピーする。

#### frontの場合

```bash
cp /Users/shimizuippei/projects/dev/buzzbase/front/.env.development \
   /Users/shimizuippei/projects/dev/buzzbase-front-issue<NUMBER>/.env.development

cp /Users/shimizuippei/projects/dev/buzzbase/front/.env.production \
   /Users/shimizuippei/projects/dev/buzzbase-front-issue<NUMBER>/.env.production
```

#### backの場合

```bash
cp /Users/shimizuippei/projects/dev/buzzbase/back/.env \
   /Users/shimizuippei/projects/dev/buzzbase-back-issue<NUMBER>/.env
```

### 7. Docker Compose起動

影響範囲に応じた環境変数付きでDocker Composeを起動する:

```bash
cd /Users/shimizuippei/projects/dev/buzzbase

# front + back 両方の場合
FRONT_DIR=../buzzbase-front-issue<NUMBER> BACK_DIR=../buzzbase-back-issue<NUMBER> docker compose up -d

# frontのみの場合
FRONT_DIR=../buzzbase-front-issue<NUMBER> docker compose up -d

# backのみの場合
BACK_DIR=../buzzbase-back-issue<NUMBER> docker compose up -d
```

### 8. 完了報告

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
セットアップ完了
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue: #<NUMBER> <タイトル>
ブランチ: <ブランチ名>

Worktree:
  front: /Users/shimizuippei/projects/dev/buzzbase-front-issue<NUMBER>
  back:  /Users/shimizuippei/projects/dev/buzzbase-back-issue<NUMBER>

Docker Compose: 起動済み（http://localhost:8100）

開発が完了したら:
  1. worktreeディレクトリでcommit & push
  2. PRを作成
  3. マージ後に以下でworktreeを削除:
     cd buzzbase/front && git worktree remove ../buzzbase-front-issue<NUMBER>
     cd buzzbase/back && git worktree remove ../buzzbase-back-issue<NUMBER>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 注意事項

- ユーザーの承認なしにworktreeを作成しない
- ブランチは必ず `stg` の最新から分岐させる
- 既に同名のworktreeやブランチが存在する場合はエラーを表示し、ユーザーに対応を確認する
- docker-compose.yml の `FRONT_DIR` / `BACK_DIR` 環境変数を利用してパスを切り替える
- worktree削除は別途手動で行う（`git worktree remove` を使用すること。`rm -rf` は使わない）
