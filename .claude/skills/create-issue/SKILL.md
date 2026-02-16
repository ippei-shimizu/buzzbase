---
name: create-issue
description: buzzbaseリポジトリ(ippei-shimizu/buzzbase)にGitHub issueを作成し、GitHub Projects "BUZZ BASE"に自動追加する。`/create-issue バグの説明`のように呼び出す。作成前に必ずユーザーに確認を取る。
---

# Issue作成スキル

`ippei-shimizu/buzzbase` リポジトリにissueを作成し、GitHub Projects "BUZZ BASE" (`ippei-shimizu/projects/2`) に自動追加する。

## ルール

- issueは常に `ippei-shimizu/buzzbase` に作成する（front/backサブモジュールには作らない）
- プロジェクト "BUZZ BASE" に自動追加する
- ラベルは既存のものから選択する: `bug`, `enhancement`, `documentation`, `duplicate`, `good first issue`, `help wanted`, `invalid`, `question`, `wontfix`
- すべて日本語で記述する
- 作成前に必ずユーザーの承認を得る

## ワークフロー

### 1. 引数の解析

`$ARGUMENTS` からissueの概要・コンテキストを取得する。引数が空の場合はユーザーに概要を質問する。

### 2. issueの構成要素を決定

引数の内容を分析し、以下を決定する:

- **タイトル**: 簡潔な日本語タイトル
- **ラベル**: 内容に応じて適切なラベルを選択（複数可）
  - バグ報告 → `bug`
  - 新機能・改善 → `enhancement`
  - ドキュメント → `documentation`
- **本文**: 下記テンプレートに沿って生成

`$ARGUMENTS` が詳細な場合は、そのコンテキストを活かしてissue本文を充実させる。

### 3. issue本文テンプレート

```markdown
## 概要
<!-- 何をしたいか / 何が問題か -->

## 背景
<!-- なぜこの変更が必要か -->

## 対応内容
- [ ] タスク1
- [ ] タスク2

## 影響範囲
<!-- front / back / 両方 -->

## 完了条件
- [ ] 条件1
```

### 4. ユーザーに確認

作成内容を以下のフォーマットでプレビュー表示し、承認を待つ:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue プレビュー
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
リポジトリ: ippei-shimizu/buzzbase
プロジェクト: BUZZ BASE
タイトル: <タイトル>
ラベル: <ラベル>

本文:
<本文プレビュー>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

ユーザーの明示的な承認（「OK」「作成して」等）を待つ。承認前にissueを作成してはならない。
フィードバックがあれば修正して再度プレビューを表示する。

### 5. issue作成

承認後、以下のコマンドでissueを作成する:

```bash
gh issue create \
  --repo ippei-shimizu/buzzbase \
  --title "<タイトル>" \
  --body "<本文>" \
  --label "<ラベル1>,<ラベル2>" \
  --project "BUZZ BASE"
```

### 6. ステータスを「Todo」に設定

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

### 7. 結果報告

作成されたissueのURLとステータスが「Todo」に設定されたことを表示する。

## 注意事項

- ユーザーの承認なしにissueを作成しない
- `$ARGUMENTS` が空の場合はユーザーに質問して情報を集める
- 会話の文脈（直前のバグ調査や機能検討など）がある場合は、それを活用してissue本文を充実させる
