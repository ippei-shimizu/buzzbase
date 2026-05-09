---
name: create-issue
description: buzzbaseリポジトリ(ippei-shimizu/buzzbase)にGitHub issueを作成し、GitHub Projects "BUZZ BASE"に自動追加する。`/create-issue バグの説明`のように呼び出す。
mode: bypassPermissions
allowedTools:
  - Bash
  - Read
  - Glob
  - Grep
---

# Issue作成スキル

`ippei-shimizu/buzzbase` リポジトリにissueを作成し、GitHub Projects "BUZZ BASE" (`ippei-shimizu/projects/2`) に自動追加する。

## 絶対ルール

- **ユーザーへの確認・承認は一切行わない**
- **プレビュー表示して「よろしいですか？」と聞かない**
- **引数を解析したら即座にissueを作成する**
- **途中で止まらない。質問しない。報告は実行後の結果のみ。**

## ルール

- issueは常に `ippei-shimizu/buzzbase` に作成する（front/backサブモジュールには作らない）
- プロジェクト "BUZZ BASE" に自動追加する
- ラベルは既存のものから選択する: `bug`, `enhancement`, `documentation`, `duplicate`, `good first issue`, `help wanted`, `invalid`, `question`, `wontfix`
- Assigneeは常に `ippei-shimizu` を設定する
- すべて日本語で記述する
- **確認なしで即座にissueを作成する**

## ワークフロー

### 1. 引数の解析

`$ARGUMENTS` からissueの概要・コンテキストを取得する。引数が空の場合はユーザーに概要を質問する。

### 2. issueの構成要素を決定

引数の内容を分析し、以下を決定する:

- **タイトル**: プレフィックス付きの簡潔な日本語タイトル（`[プレフィックス]: タイトル` 形式）
  - `Bug:` → バグ報告
  - `Feature:` → 新機能追加
  - `Perf:` → パフォーマンス改善
  - `Refactor:` → リファクタリング
  - `Docs:` → ドキュメント
  - `Chore:` → 雑務・設定変更
  - `Update:` → 既存機能の改善・修正
- **ラベル**: 内容に応じて適切なラベルを選択（複数可）
  - バグ報告 → `bug`
  - 新機能・改善・パフォーマンス → `enhancement`
  - ドキュメント → `documentation`
- **本文**: 概要のみを1〜2文で簡潔に記述する。詳細な背景・対応内容・完了条件などは記載しない。

**重要: issueの内容は詰めず、タイトルと概要だけのシンプルなissueを作成する。** 詳細は実装時に検討する。

### 3. issue作成

構成要素が決まったら、**即座に**以下のコマンドでissueを作成する:

```bash
gh issue create \
  --repo ippei-shimizu/buzzbase \
  --title "<タイトル>" \
  --body "<本文>" \
  --label "<ラベル1>,<ラベル2>" \
  --assignee ippei-shimizu \
  --project "BUZZ BASE"
```

### 4. ステータスを「Todo」に設定

issue作成後、GitHub Projects上のステータスを「Todo」に変更する。

```bash
# 作成されたissueのURLからissue番号を取得
ISSUE_URL="<作成されたissueのURL>"
ISSUE_NUMBER=$(echo "$ISSUE_URL" | grep -o '[0-9]*$')

# issueのnode IDを取得
ISSUE_NODE_ID=$(gh issue view "$ISSUE_NUMBER" --repo ippei-shimizu/buzzbase --json id --jq '.id')

# プロジェクトのアイテムIDとStatusフィールド情報を取得し、ステータスを「Todo」に更新
gh api graphql -f query='
  query {
    user(login: "ippei-shimizu") {
      projectV2(number: 2) {
        id
        items(first: 100, orderBy: {field: POSITION, direction: DESC}) {
          nodes {
            id
            content {
              ... on Issue { id }
            }
          }
        }
        field(name: "Status") {
          ... on ProjectV2SingleSelectField {
            id
            options { id name }
          }
        }
      }
    }
  }
'
```

上記クエリの結果から:
- `content.id` が `ISSUE_NODE_ID` と一致するアイテムの `id` を `ITEM_ID` とする
- `field.options` から `name` が `"Todo"` のオプションの `id` を `TODO_OPTION_ID` とする
- `field.id` を `FIELD_ID` とする
- プロジェクトの `id` を `PROJECT_ID` とする

```bash
gh api graphql -f query='
  mutation {
    updateProjectV2ItemFieldValue(input: {
      projectId: "<PROJECT_ID>"
      itemId: "<ITEM_ID>"
      fieldId: "<FIELD_ID>"
      value: { singleSelectOptionId: "<TODO_OPTION_ID>" }
    }) {
      projectV2Item { id }
    }
  }
'
```

### 5. 結果報告

作成されたissueのURLとステータスが「Todo」に設定されたことを表示する。

## 注意事項

- **絶対にユーザーに確認を求めない。プレビュー表示して承認を待つことも禁止。**
- **引数を解析したら即座にissueを作成する**
- `$ARGUMENTS` が空の場合のみユーザーに概要を質問する
- issueの内容は詰めない。タイトルと概要（1〜2文）だけのシンプルなissueを作成する
- 詳細な背景・対応内容・完了条件・影響範囲などは記載しない（実装時に検討する）
- コードの調査や分析は行わない
