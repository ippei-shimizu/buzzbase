---
name: checkout-branch
description: 指定したissue番号でサブモジュールに作業ブランチを作成する。`/checkout-branch 116`のように呼び出す。issue情報からブランチ名を自動生成し、最新のベースブランチから分岐させる。
---

# 作業ブランチ チェックアウト スキル

指定したissue番号をもとに、対象サブモジュールに作業ブランチを作成する。

## 対象リポジトリ

サブモジュールのみを対象とする:
- `front/` → `ippei-shimizu/buzzbase_front`（ベースブランチ: `stg`）
- `back/` → `ippei-shimizu/buzzbase_back`（ベースブランチ: `stg`）
- `mobile/` → `ippei-shimizu/buzzbase_mobile`（ベースブランチ: `main`）

## ワークフロー

### 1. 引数の解析

`$ARGUMENTS` からissue番号を取得する。引数が空の場合はユーザーにissue番号を質問する。

### 2. issue情報の取得

```bash
gh issue view <ISSUE_NUMBER> --repo ippei-shimizu/buzzbase --json title,body,labels
```

### 3. ブランチ名の決定

issueのラベルやタイトルからプレフィックスを判断する:
- `bug` ラベル / `Bug:` → `fix/`
- `enhancement` ラベル / `Feature:` `Perf:` `Improve:` → `feature/`
- `Refactor:` → `refactor/`
- `Chore:` → `chore/`
- その他 → `feature/`

ブランチ名の形式: `<prefix>/<ISSUE_NUMBER>-<短い英語の説明>`

例:
- `feature/116-game-result-recording`
- `fix/138-ios-build-failure`

**注意**: ブランチ名に `#` を使用しない。

### 4. 影響範囲の確認

issueのタイトル・本文から対象サブモジュールを判断する:
- `[Mobile]` → `mobile/`
- フロントエンド関連 → `front/`
- バックエンド関連 → `back/`
- 両方に影響 → `front/` と `back/`
- 不明な場合はユーザーに確認する

### 5. ユーザーに確認

作成内容をプレビュー表示し、承認を待つ:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ブランチ作成 プレビュー
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue: #<NUMBER> <タイトル>
対象: <サブモジュール名>
ブランチ名: <ブランチ名>
ベースブランチ: <stg or main>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

ユーザーの明示的な承認を待つ。ブランチ名の変更希望があれば修正する。

### 6. ブランチの作成

承認後、対象サブモジュールごとに以下を実行する:

```bash
cd /Users/shimizuippei/projects/dev/buzzbase/<submodule>

# ベースブランチを最新に更新
git checkout <base_branch>
git pull origin <base_branch>

# 作業ブランチを作成してチェックアウト
git checkout -b <BRANCH_NAME>
```

複数のサブモジュールが対象の場合は、それぞれで実行する。

### 7. 完了報告

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ブランチ作成完了
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue: #<NUMBER> <タイトル>

<サブモジュール名>:
  ブランチ: <ブランチ名>
  パス: /Users/shimizuippei/projects/dev/buzzbase/<submodule>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 注意事項

- ユーザーの承認なしにブランチを作成しない
- mainブランチへの直接コミット・プッシュは絶対にしない
- 既に同名のブランチが存在する場合はユーザーに確認する（チェックアウトするか、別名にするか）
- 未コミットの変更がある場合はユーザーに通知し、stashするか確認する
- ルートリポジトリ（buzzbase）ではブランチ作成を行わない
