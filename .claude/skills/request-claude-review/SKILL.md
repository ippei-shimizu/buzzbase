---
name: request-claude-review
description: PRのURLまたは番号を引数に受け取り、差分を分析して観点付きの `@claude` コードレビュー依頼コメントをPRに投稿する。GitHub Actions の Claude Code ワークフローが起動したことまで確認する。「PRにレビュー依頼して」「@claudeでレビューお願いして」「request-claude-review」などで起動する。
mode: bypassPermissions
allowedTools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
---

# @claude コードレビュー依頼スキル

PR の URL または番号を受け取り、差分を分析したうえで**重点観点を明記した** `@claude` メンションのコメントを投稿し、GitHub Actions の Claude Code ワークフローによるレビューを起動する。

## 絶対ルール

- **PR をマージしない**。`gh pr merge` を絶対に実行しない。マージは常にユーザーが行う
- **PR の本文・タイトル・ラベル・状態を変更しない**。このスキルが行うのはコメント投稿のみ
- **コメント本文は必ず `--body-file` で渡す**。`--body "$(cat <<EOF ...)"` はバッククォートやドル記号が展開されて本文が崩れる
- **絵文字を使わない**（Issue / PR / コミット等の永続化される文章の共通ルール）
- 本文に `@claude` の文字列を必ず含める。これが無いとワークフローが起動しない
- ユーザーへの確認・承認を求めない。引数を解析したら分析して即座に投稿する

## 前提

対象4リポジトリすべてに `.github/workflows/claude.yml` が配置済みで、以下の条件で起動する。

| リポジトリ | ワークフロー名 |
| ---- | ---- |
| `ippei-shimizu/buzzbase` | Claude Code |
| `ippei-shimizu/buzzbase_front` | Claude Code |
| `ippei-shimizu/buzzbase_back` | Claude Code |
| `ippei-shimizu/buzzbase_mobile` | Claude Code |

起動条件は `issue_comment` の `created` イベントで、`github.event.comment.body` に `@claude` が含まれること。したがって PR へのコメント投稿（`gh pr comment`）で起動する。

## ワークフロー

### 1. 引数の解析

`$ARGUMENTS` から PR を特定する。

- **PR の URL**（例: `https://github.com/ippei-shimizu/buzzbase_back/pull/335`）→ URL から `owner/repo` と PR 番号を抽出する
- **PR 番号のみ**（例: `335`）→ カレントディレクトリの git remote からリポジトリを判定する
- **引数なし** → 現在のブランチに紐づく PR を対象とする

URL からの抽出例:

```bash
PR_URL="$ARGUMENTS"
REPO=$(echo "$PR_URL" | sed -E 's#https://github.com/([^/]+/[^/]+)/pull/[0-9]+.*#\1#')
PR_NUMBER=$(echo "$PR_URL" | sed -E 's#.*/pull/([0-9]+).*#\1#')
```

引数にレビュー観点の指示が含まれている場合（例: `<URL> N+1に注意して見て`）は、それを最優先の観点としてコメントに反映する。

### 2. PR 情報と差分の収集

```bash
gh pr view "$PR_NUMBER" --repo "$REPO" --json number,title,body,state,baseRefName,headRefName,additions,deletions,changedFiles,labels
gh pr view "$PR_NUMBER" --repo "$REPO" --json commits --jq '.commits[].messageHeadline'
gh pr diff "$PR_NUMBER" --repo "$REPO" --name-only
gh pr diff "$PR_NUMBER" --repo "$REPO"
```

PR が `MERGED` または `CLOSED` の場合は、その旨を報告して投稿せずに終了する。

差分が大きい場合（`changedFiles` が 30 を超える、または `gh pr diff` の出力が長大な場合）は、まずファイル一覧とコミット履歴で全体像を把握し、変更の中心となるファイルに絞って差分を読む。

### 3. 重点観点の抽出

**ここがこのスキルの本体**。単なる「レビューお願いします」ではなく、差分から具体的な懸念点を抽出して観点として明記する。汎用的なチェックリストを貼るのではなく、**そのPRの差分に固有の懸念**を書くこと。

差分の種類ごとに、以下のような観点を検討する。

| 差分に含まれるもの | 検討すべき観点 |
| ---- | ---- |
| マイグレーション | 既存データへの影響、非可逆な操作（カラム削除・データ変換）、backfill の取りこぼし、`down` の妥当性、実行順序の依存 |
| 定数・閾値の変更 | 変更前の値で作成済みの既存レコードがバリデーションで壊れないか、境界値の扱い、front / mobile 側との整合 |
| モデルのスコープ・クエリ | N+1、意図しないレコードの巻き込み、既存スコープとの矛盾 |
| API のレスポンス変更 | front / mobile 側の期待形式との整合、タイムゾーン、nil のときのクライアント挙動 |
| Pro / 課金まわり | エンタイトルメント判定の境界、キルスイッチ（`pro_features`）OFF 時の挙動、無料枠との境界値 |
| ファイルアップロード | クライアント側の圧縮仕様と back 側の検証基準の非対称性（長辺基準と height 基準など）、無料枠との境界 |
| 冪等な upsert / seed | 再実行時にユーザーデータを巻き込まないか、定義の二重管理 |
| React コンポーネント | 不要な Client Component 化、useEffect の使用、Container/Presentational の分離 |

また、**PR の範囲外でも関連して確認してほしい懸念があれば、その旨を明記して依頼に含める**。リリース前の PR では特に有効。

### 4. コメント本文の作成

一時ファイルに Markdown で書き出す。scratchpad ディレクトリが利用可能ならそこに置く。

構成:

```markdown
@claude このPRのコードレビューをお願いします。

（PR の位置づけ・背景を 1〜3 文。関連 issue があれば `ippei-shimizu/buzzbase#NNN` 形式で参照する）

## 重点的に見てほしい観点

### 1. （観点の見出し）

- （具体的な確認内容）
- （具体的な確認内容）

### 2. （観点の見出し）

- （具体的な確認内容）

## リリース前の懸念（このPRの範囲外でも指摘してほしい）

（該当する場合のみ。無ければセクションごと省略する）

なお、このPRのマージはこちらで行うので、レビューコメントのみお願いします。
```

- 関連 issue の参照はモノレポの慣習に従い `ippei-shimizu/buzzbase#NNN` 形式で書く（サブモジュールの PR でも issue はメインリポジトリに集約されている）
- 末尾のマージ禁止の一文は必ず入れる
- 会話の中でユーザーが既に共有している調査結果や事象があれば、レビューの手がかりとして背景に含める

### 5. コメント投稿

```bash
gh pr comment "$PR_NUMBER" --repo "$REPO" --body-file <一時ファイルのパス>
```

投稿されたコメントの URL が出力される。

### 6. ワークフロー起動の確認

コメント投稿だけでは起動したか分からないため、必ず確認する。反映まで数秒かかるので待機してから照会する。

```bash
sleep 12
gh run list --repo "$REPO" --workflow "Claude Code" --limit 3 \
  --json databaseId,status,conclusion,createdAt,event
```

- 直近の run が `event: issue_comment` かつ `status: in_progress`（または `queued`）→ 起動成功
- `conclusion: skipped` になっている → `if` 条件を満たしていない。本文に `@claude` が含まれているか確認する
- run が現れない → さらに 15 秒ほど待って再照会する。それでも現れなければ、ワークフローの有無と権限をユーザーに確認してもらう

### 7. 結果報告

以下を簡潔に報告する。

- 投稿したコメントの URL
- 起動したワークフローの run ID と status
- 依頼した重点観点の要約（表形式が読みやすい）

## 注意事項

- `gh pr comment` は PR を変更しないが、**外部に公開されるコメントの投稿**である。引数で対象 PR が明示されている場合はそのまま実行してよい
- 同じ PR に対して繰り返し依頼する場合、前回のレビュー結果を踏まえて観点を更新する。同一内容の再投稿は避ける
- レビュー依頼の投稿までがこのスキルの責務。返ってきたレビュー結果への対応（コード修正）は行わない
- レビュー指摘に対応する際は、モノレポのルールどおり**指摘1件につき1コミット**に分割する
