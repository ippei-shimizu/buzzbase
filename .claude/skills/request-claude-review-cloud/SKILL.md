---
name: request-claude-review-cloud
description: Claude Code on the web（クラウドセッション / Cloud Agents）向けの request-claude-review。PRのURLまたは番号を受け取り、差分を分析して観点付きの `@claude` レビュー依頼コメントを GitHub MCP で投稿し、PR を購読してレビューが届いたら対応要否の判断・修正・push・スレッドへの返信と resolve まで行う。gh CLI や sleep に依存しない。`/request-claude-review-cloud 335` `/request-claude-review-cloud https://github.com/ippei-shimizu/buzzbase_back/pull/335` のように呼び出す。クラウドセッションで「PRにレビュー依頼して」「@claudeでレビューお願いして」と頼まれたときも起動する。
allowedTools:
  - Bash
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - Skill
  - ToolSearch
  - AskUserQuestion
---

# @claude コードレビュー依頼＋対応スキル（クラウドセッション版）

ローカル版 `request-claude-review` と同じ流れを、クラウドのコンテナで通せるように置き換えたもの。ローカル（Mac + gh）で動かすときは `request-claude-review` を使う。

**レビュー観点・依頼本文の構成・指摘の分類・返信と resolve の基準はローカル版が正**。このスキルはそれらを複製せず参照し、GitHub 操作とレビュー待ちの方法だけを置き換える。

```
環境確認 → PR 特定 → 差分収集 → 依頼本文作成 → 投稿(MCP) → PR 購読してターン終了
（PR イベント / チェックインで起こされる）→ 指摘取得 → 対応要否の判断 → 修正・検証・コミット → push → 返信 → resolve → 報告 → record-learning
```

## ローカル版との違い

| 項目 | ローカル版 | クラウド版（このスキル） |
| ---- | ---- | ---- |
| GitHub 操作 | `gh` CLI / `gh api graphql` | GitHub MCP（`mcp__github__*`）。`gh` は存在しない |
| リポジトリの場所 | カレントディレクトリ | 手順 0 で remote URL から検出（通常は `/home/user/buzzbase_front` などの兄弟ディレクトリ） |
| ワークフロー起動の確認 | `sleep 12` → `gh run list` | 投稿直後は確認しない（フォアグラウンドの `sleep` は禁止）。チェックイン時に `actions_list` で確認する |
| レビュー待ち | `gh run watch` でブロック | `subscribe_pr_activity` で PR を購読してターンを終え、PR イベントで起こされてから対応する |
| push 先 | PR の head ブランチ | PR の head ブランチ。ただしセッション指定ブランチと異なる場合は push 前にユーザーの許可を取る（手順 2） |
| 返信本文の渡し方 | `-F body=@<file>`（シェル展開を避けるため） | MCP の `body` 引数に直接渡す（シェルを経由しないので展開の問題は無い） |

## 絶対ルール

- **PR をマージしない**。`merge_pull_request` / `enable_pr_auto_merge` を呼ばない。マージは常にユーザーが行う
- **PR の本文・タイトル・ラベル・状態を変更しない**（`update_pull_request` を呼ばない）。行うのはコメント投稿・スレッドへの返信と resolve・head ブランチへのコミットと push のみ
- 依頼本文に `@claude` を必ず含め、インラインコメントで指摘するよう明示する（ローカル版「4. コメント本文の作成」）
- 絵文字を使わない
- GitHub に投稿するコメント・返信の末尾には、セッションのルールどおり Claude Code の attribution footer を付ける
- コミット・コメントにモデル名やモデル ID を書かない
- レビュー指摘への対応は**指摘1件につき1コミット**。push は最後にまとめて1回
- **すべての指摘スレッドに返信し、返信してから resolve する**。コミットに触れるときは URL リンクを添える
- 修正後に自動で再度 `@claude` レビューを依頼しない（無限ループになりうるため）
- 対応を push し終えたら、最終ステップとして必ず `record-learning` スキルを実行する
- ユーザーへの確認は、手順 2 の push 先の許可と、PR を一意に特定できないときだけ。それ以外は確認なしで進める

## フェーズ A: レビュー依頼（呼び出されたターン）

### 0. 環境確認

GitHub MCP のツールは deferred なので、使う前に `ToolSearch` で読み込む。

```
ToolSearch: select:mcp__github__pull_request_read,mcp__github__add_issue_comment,mcp__github__add_reply_to_pull_request_comment,mcp__github__resolve_review_thread,mcp__github__list_pull_requests,mcp__github__actions_list,mcp__github__get_job_logs,mcp__Claude_Code_Remote__subscribe_pr_activity,mcp__Claude_Code_Remote__unsubscribe_pr_activity,mcp__Claude_Code_Remote__send_later
```

- GitHub MCP が接続エラーで使えない場合は、この時点で止めてユーザーに「GitHub MCP が接続できていない」ことを伝える

リポジトリの場所を remote URL から特定する。パスは決め打ちしない。

```bash
for dir in /home/user/*/ /home/user/buzzbase/*/; do url=$(git -C "$dir" remote get-url origin 2>/dev/null) && echo "$dir $url $(git -C "$dir" branch --show-current)"; done
```

同じ remote が複数のパスに出た場合は、**PR の head ブランチ（なければセッション指定ブランチ）に checkout されている方**を作業ツリーとする。

### 1. 引数の解析

`$ARGUMENTS` から PR を特定する。

- **PR の URL** → `owner` / `repo` / PR 番号を抽出する
- **PR 番号のみ** → リポジトリが決まらない（4リポジトリが同じセッションに並ぶため）。会話の文脈（直前に作った PR など）から一意に決まればそれを使い、決まらなければ `AskUserQuestion` でリポジトリを聞く
- **引数なし** → 各作業ツリーの現在のブランチを head とする open な PR を `mcp__github__list_pull_requests` で探す。1件に絞れなければユーザーに聞く

引数にレビュー観点の指示が含まれていれば（例: `335 N+1に注意して見て`）、最優先の観点として依頼本文に入れる。

### 2. PR 情報と差分の収集

`mcp__github__pull_request_read` で取得する。

| 取得するもの | method |
| ---- | ---- |
| タイトル・本文・状態・base / head・変更量 | `get` |
| 変更ファイル一覧 | `get_files` |
| コミット一覧 | `get_commits` |
| 差分 | `get_diff` |

- PR が merged / closed なら、その旨を報告して投稿せずに終了する
- 差分が大きい場合（変更ファイル 30 超など）は、ファイル一覧とコミットで全体像を掴んでから中心となるファイルに絞って読む。ローカルの作業ツリーで `git -C <path> diff origin/<base>...<head>` を読んでもよい

**push 先の確認**（フェーズ B で修正を push するため、ここで決めておく）:

- head ブランチがセッション指定ブランチ（システムプロンプトの「Git Development Branch Requirements」）と同じ → そのまま進める
- 異なる → セッションのルール上、指定外ブランチへの push にはユーザーの明示許可が要る。`AskUserQuestion` で「修正を `<head>` に push してよいか」を1回だけ確認し、答えを控える。許可が無ければ、フェーズ B では修正コミットを作らず、返信で対応方針だけ示す
- 作業ツリーを head ブランチに合わせる。未コミットの変更がある場合はユーザーの作業中の可能性があるため、checkout せず報告する

```bash
git -C <path> status --short
git -C <path> fetch origin <head>
git -C <path> checkout <head>
git -C <path> pull --ff-only origin <head>
```

### 3. 重点観点の抽出と依頼本文の作成

ローカル版 `request-claude-review` の「3. 重点観点の抽出」「4. コメント本文の作成」に従う。要点:

- 「既存機能への影響・不具合・デグレ」「セキュリティ」の2観点は必ず入れ、差分固有の懸念を具体的に書き添える
- 「指摘の投稿方法」セクション（該当行へのインラインコメント・`mcp__github_inline_comment__create_inline_comment` を `confirmed: true` で使う）と、末尾の「マージはこちらで行う」の一文を必ず入れる
- 関連 issue は `ippei-shimizu/buzzbase#NNN` 形式で参照する
- 同じ PR に再依頼する場合は、前回のレビュー結果を踏まえて観点を更新する（同一内容の再投稿はしない）

### 4. 投稿

`mcp__github__add_issue_comment`（`issue_number`: PR 番号）で投稿し、返ってきたコメントの URL と作成時刻を控える。作成時刻はフェーズ B で「この依頼以降の指摘」を絞り込むのに使う。

### 5. 購読してターンを終える

- `mcp__Claude_Code_Remote__subscribe_pr_activity` で PR を購読する
- `mcp__Claude_Code_Remote__send_later` で約15分後のチェックインを予約する（レビューのイベントが届かなかったとき用）。メッセージには PR の URL・依頼コメントの作成時刻・push 先の許可の有無を書いておく
- ユーザーに依頼コメントの URL を報告し、「レビューが届いたら対応する」と伝えてターンを終える。**`sleep` やポーリングで待たない**

## フェーズ B: 指摘への対応（PR イベント / チェックインで起こされたとき）

### 6. レビューが届いたかの確認

起こされたら、まず PR の現在の状態を取る（イベントは遅延・欠落・順不同がありうる）。

- `pull_request_read`（`get_review_comments`）でレビュースレッド
- `pull_request_read`（`get_reviews`）でレビュー本体
- `pull_request_read`（`get_comments`）で行に紐づかない全体所感

依頼コメントの作成時刻より後のものが無い場合は、ワークフローの状態を見る。

```
mcp__github__actions_list: method=list_workflow_runs, workflow_runs_filter={ event: "issue_comment" }
```

| run の状態 | 対応 |
| ---- | ---- |
| `queued` / `in_progress` | 何もせず、`send_later` で次のチェックイン（約15分後）を予約して終える |
| `completed` / `success` なのに指摘が無い | 投稿に失敗した可能性がある。`get_job_logs` でログを見て、ユーザーに報告して終える |
| `completed` / `failure` | `get_job_logs` で失敗理由を確認し、ユーザーに報告して終える |
| `skipped` / run が無い | ワークフローが起動していない。本文に `@claude` が含まれているか確認し、ユーザーに報告して終える |

途中経過（まだレビュー待ち）の報告はしない。

### 7. 指摘の取得と分類

`get_review_comments` の各スレッドから次を控える。以降はスレッド単位で扱う。

- `path` / `line`（outdated で `line` が無ければ `original_line`）… 指摘の識別子
- スレッド先頭コメントの数値 ID … 返信先（`commentId`）
- スレッドの node ID（`PRRT_...`）… resolve 先（`threadId`）
- 既に resolve 済みか

インラインコメントが0件で全体所感だけが返ってきた場合は、所感を指摘ごとに分解して対応を進め、最終報告に「インラインで返らなかった」ことを書く（原因の切り分けはローカル版「インラインコメントの前提条件」を参照）。

分類（対応する / 対応しない（既知・意図的）/ 対応しない（誤検知）/ 対応不要（確認事項））と resolve 要否の判断は、ローカル版「9. 指摘への対応要否の判断」「12. 指摘スレッドへの返信と resolve」の基準に従う。判断に迷う指摘は `path:line` の実コードを読んで裏を取る。

### 8. 修正・検証・コミット

手順 2 で push の許可が無い場合はこの手順を飛ばし、9 の返信で対応方針だけを示す。

- 「対応する」と判断した指摘ごとに、作業ツリーの head ブランチ上で修正する
- 各リポジトリの CLAUDE.md / `.claude/rules/*.md` の規約に従う（略称のローカル変数を使わない・コメントはデフォルトで書かない、など）
- 指摘1件 = 1コミット。日本語・`[Type]: [説明]` 形式で、どの指摘に対応したかが単独で読み取れるようにする。末尾にはセッションの system-reminder で指定された attribution 行を付ける
- コミットごとに該当リポジトリの検証を回す（コマンドは `implement-issue-cloud` の「6. 検証」の表と同じ）。回せなかった検証は通ったと書かない
- `git add -A` を使わず、自分が編集したファイルだけ add する。commit 直前に `git -C <path> branch --show-current` でブランチを確認する

### 9. push

```bash
git -C <path> push origin <head>
```

ネットワークエラーのときだけ 2s / 4s / 8s / 16s 間隔で最大4回リトライする。403 などで拒否された場合は `mcp__Claude_Code_Remote__read_documentation`（topic: `github.access`）を読み、その内容に沿ってユーザーに報告する。

### 10. 返信と resolve

push が終わってから、**すべての指摘スレッド**に返信する。返信に書く内容と resolve するかの判断は、ローカル版「12. 指摘スレッドへの返信と resolve」の表に従う。

| 操作 | ツール |
| ---- | ---- |
| 返信 | `mcp__github__add_reply_to_pull_request_comment`（`commentId`: スレッド先頭コメントの数値 ID、`pullNumber`、`body`） |
| resolve | `mcp__github__resolve_review_thread`（`threadId`: `PRRT_...` の node ID） |

- コミットに触れるときは `[<短縮ハッシュ>](https://github.com/<owner>/<repo>/commit/<フルハッシュ>)` でリンクする。ハッシュは `git -C <path> log -1 --format='%h %H' <commit>` で取る
- 返信より先に resolve しない。マージ直前の作業や PR 外のアクションが残るスレッドは resolve せず、返信にその理由を書く
- 全体所感（通常コメント）で返ってきた指摘は、`add_issue_comment` で1件にまとめて返信する
- 最後に `get_review_comments` をもう一度取り、各スレッドの resolve 状態を確認する

### 11. 結果報告

- 投稿した依頼コメントの URL
- 指摘の一覧を `path:line` 付きの表で示し、対応要否・理由・resolve したかを併記する
- 対応した指摘のコミット一覧（リンク付き）と push 済みであること
- resolve せずに残したスレッドとその理由
- 回せなかった検証があればその理由

### 12. 学習ループの実行

報告の直後に `Skill` ツールで `record-learning` を呼び出す（対応する指摘が0件でも呼ぶ）。

### 13. 購読の後始末

- レビュー対応が済んでも、PR の購読はセッションのルール（PR が merged / closed になるまで、CI 赤やレビューコメントに対応する）に従って続ける
- ユーザーから止めるよう言われたら `unsubscribe_pr_activity` で購読を解除し、以降は push しない

## コマンド実行制約

- `cd ... && git ...` は使わず `git -C <絶対パス>` を使う
- 一時ファイルは scratchpad ディレクトリに置く
- Heroku CLI / ダッシュボードには一切アクセスしない
