---
name: implement-issue
description: issue番号（複数可）を引数に受け取り、issueの内容が妥当かを検証したうえで、issueごとに作業ブランチを作成して実装し、Draft PR を作成して request-claude-review スキルでレビュー依頼・指摘対応まで一連で行う。`/implement-issue 340` `/implement-issue 340 341 342` のように呼び出す。「issue #340 を実装してPRまで出して」などのリクエストで起動する。
mode: bypassPermissions
allowedTools:
  - Bash
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - Skill
  - AskUserQuestion
---

# issue 実装 → Draft PR → レビュー依頼 スキル

引数の issue を1件ずつ、次の流れで最後まで通す。

```
issue内容の検証 → Status を In Progress → 作業ブランチ作成 → 実装 → 検証(lint/typecheck/test)
→ コミット(適切な粒度で分割) → push → Draft PR 作成 → request-claude-review → 次の issue へ
```

## 絶対ルール

- **PR をマージしない**。`gh pr merge` を絶対に実行しない。マージは常にユーザーが行う
- **PR は必ず Draft で作成する**（`gh pr create --draft`）。Ready for review への変更もユーザーが行う
- **PR の assignee には必ず `ippei-shimizu` を指定する**（`gh pr create --assignee ippei-shimizu`）。省略しない
- **issue の内容に疑義がある場合は実装に入らず、その issue をスキップしてユーザーに確認する**（判定基準は「2. issue 内容の検証」）。疑義のない他の issue は先に最後まで進める
- **ユーザーの未コミット変更が残っている作業ツリーでは `git stash` / `git checkout` しない**。対象サブモジュールに未コミット変更があれば、その issue は着手せずユーザーに報告する
- issue は**逐次処理**する。front / back / mobile の作業ツリーは1つしかないため、同一サブモジュールを対象とする複数 issue を並行して進めると互いの変更が混ざる
- PR / コミット / コメント等の永続化される文章に**絵文字を使わない**
- PR body・コメント本文は必ず `--body-file` で渡す。`--body "$(cat <<EOF ...)"` はバッククォートやドル記号が展開されて崩れる
- issue 内容の検証で止める以外は、ユーザーへの確認・承認を求めず最後まで進める

## 対象リポジトリ

issue は**メインリポジトリ `ippei-shimizu/buzzbase` に集約**されている。実装先はサブモジュール。

| パス | リポジトリ | ベースブランチ |
| ---- | ---------- | -------------- |
| `/Users/shimizuippei/projects/dev/buzzbase` | `ippei-shimizu/buzzbase` | `main` |
| `/Users/shimizuippei/projects/dev/buzzbase/front` | `ippei-shimizu/buzzbase_front` | `stg` |
| `/Users/shimizuippei/projects/dev/buzzbase/back` | `ippei-shimizu/buzzbase_back` | `stg` |
| `/Users/shimizuippei/projects/dev/buzzbase/mobile` | `ippei-shimizu/buzzbase_mobile` | `main` |

## ワークフロー

### 1. 引数の解析

`$ARGUMENTS` から issue を特定する。

- 数字の列挙（`340 341 342` / `#340,#341` / `340、341`）→ すべて対象
- issue の URL → URL から番号を抽出
- 引数なし → どの issue を対象にするかユーザーに質問して終了（推測で選ばない）

引数に実装方針の指示（例: `340 サーバーアクションで実装して`）が含まれる場合は、それを最優先の制約として扱う。

複数指定された場合、**処理順は引数の順**。ただし後述の検証で依存関係が判明した場合は依存元を先に処理する。

### 2. issue 内容の検証

**実装に手を付ける前に必ず行う**。issue ごとに以下を取得する。

```bash
gh issue view <NUM> --repo ippei-shimizu/buzzbase --json number,title,body,state,labels,comments,url
```

検証項目:

| 観点 | 確認すること |
| ---- | ---- |
| 状態 | `state` が `OPEN` か（`CLOSED` なら着手しない） |
| 対象リポジトリ | front / back / mobile のどれが対象か、タイトル・ラベル・本文から一意に決まるか |
| 実装済みでないか | issue の要求が既にコードに入っていないか。該当箇所を Grep / Read で実際に確認する |
| 既存実装との矛盾 | issue の記述する現状（既存の仕様・定数・画面構成）が実際のコードと一致するか。ずれていれば issue 側が古い |
| 数値・文言の整合 | 価格・上限値・文言などが、コードや `docs/` 配下のドキュメントと矛盾しないか |
| ユビキタス言語 | `.claude/rules/ubiquitous-language.md` の定義と用語の使い方が一致するか（例: 「新チーム」） |
| 受入基準 | 完了条件が読み取れるか。書かれていなければ差分から自分で定義できる程度に具体的か |
| 依存関係 | 他の issue / 未マージの PR・ブランチが前提になっていないか。前提があるならどのブランチに積むべきか |
| スコープ | 1つの issue に独立した複数の変更が混在していないか |

判定と分岐:

- **疑義なし** → そのまま 3 へ進む
- **軽微な曖昧さ**（受入基準が薄い、命名が未定など、妥当な既定値を自分で選べるもの）→ **前提を明示して進める**。選んだ前提は Draft PR の description と最終報告に書く
- **ブロッカー**（issue が CLOSED / 対象リポジトリが判別できない / 既に実装済み / issue の前提が実際のコードと矛盾する / 未マージの前提ブランチがあり積む先が決められない）→ **その issue は着手せずスキップ**。何がどう矛盾しているのかを根拠（ファイルパスと行）付きで控え、他の issue の処理を続ける。全 issue の処理後、最終報告で確認事項として提示する

「実装済みでないか」「既存実装との矛盾」は記憶や issue の記述からではなく、**必ず実コードを読んで**判定する。

### 3. Status を In Progress に変更

CLAUDE.md の「Issue 着手ルール」に従い、実装に手を付ける前に GitHub Projects "BUZZ BASE"（`ippei-shimizu/projects/2`）の Status を `In Progress` に変更する。確認は取らない。

```bash
gh api graphql -f query='
  query($number: Int!) {
    user(login: "ippei-shimizu") {
      projectV2(number: 2) {
        items(first: 100, orderBy: {field: POSITION, direction: DESC}) {
          nodes { id content { ... on Issue { number } } }
        }
      }
    }
  }
' -F number=<NUM> --jq '.data.user.projectV2.items.nodes[] | select(.content.number == <NUM>) | .id'

gh api graphql -f query='
  mutation {
    updateProjectV2ItemFieldValue(input: {
      projectId: "PVT_kwHOBn5Bw84AYbis"
      itemId: "<ITEM_ID>"
      fieldId: "PVTSSF_lAHOBn5Bw84AYbiszgPnoDw"
      value: { singleSelectOptionId: "47fc9ee4" }
    }) { projectV2Item { id } }
  }
'
```

失敗しても実装は続行し、最終報告にその旨を添える。`Check` / `Done` への変更は行わない（ユーザーが行う）。

### 4. 作業ブランチ作成

`Skill` ツールで `checkout-branch` を呼び出し、issue 番号を渡す（ブランチ名規約・ベースブランチ最新化・Status 変更を内包しているため自前で組まない）。既に 3 で Status を変更している場合の二重実行は無害。

呼び出し前に、対象サブモジュールの未コミット変更を確認する。

```bash
git -C <path> status --short
```

- 出力がある → ユーザーの作業中の変更。その issue は着手せずスキップし、最終報告に記載する
- 同名ブランチが既に存在する → 既存ブランチを流用してよいか判断できないため、スキップしてユーザーに確認する

ブランチ名に `#` は使わない。1 issue が front / back 両方に及ぶ場合は、両サブモジュールに同名のブランチを作る。

### 5. 実装

issue の受入基準を満たす最小の変更を入れる。

- 各リポジトリの CLAUDE.md / `.claude/rules/*.md` の規約に従う（front: Server Component 優先・サーバーアクション・Container/Presentational、back: services / serializers の配置、mobile: 振る舞いベーステスト + MSW など）
- **ローカル変数に略称・一文字変数を使わない**（モノレポ共通の命名規約）
- **コメントはデフォルトで書かない**。書くのは WHY・公開 API のドキュメントコメント・TODO のみ。issue / PR 番号をコメントに書かない
- issue のスコープ外の変更（気付いた別の問題の修正、リファクタ）を混ぜない。気付いた点は最終報告に書く
- 不具合修正では、その不具合を止めるのに不要な新規制約（ドメインバリデーション追加など）を第一候補にしない
- テストが必要な変更ならテストも同じブランチに含める（back: rspec、front: jest、mobile: jest + MSW）

### 6. 検証

対象リポジトリに応じて実行する。**個別ファイル単位ではなく、最後の編集が終わったあとにリポジトリ全体で1回**回す。

| 対象 | コマンド |
| ---- | ---- |
| front | `yarn lint` / `yarn typecheck` / `yarn test`（`front/` で実行） |
| back | `docker compose exec back bundle exec rubocop` / `docker compose exec back bundle exec rspec` |
| mobile | `yarn typecheck` / `yarn lint`（`mobile/` で実行） |

- **mobile の `yarn test` はローカル実行しない**（1ファイルでも約5分かかるため CI に任せる）。代わりに、変更した UI 文言・`accessibilityLabel` を旧文字列で grep し、テストのアサーションが残っていないか確認する
- back のコマンドはリポジトリルート（`/Users/shimizuippei/projects/dev/buzzbase`）から実行する
- 失敗したら直してから次へ進む。落ちたまま PR を作らない

### 7. コミット

`Skill` ツールで `smart-commit` を呼び出すか、同等の粒度で自分でコミットする。

- コミットメッセージは日本語・`[Type]: [説明]` 形式（`Add` / `Fix` / `Update` / `Change` / `Refactor` / `Remove` / `Test` / `Chore` / `Docs`）
- 独立した変更は分割する。`git add -A` を使わず、**自分が編集したファイルだけ** add する
- commit 直前に必ず現在ブランチを確認する（作業ツリー共有のため）

```bash
git -C <path> branch --show-current
git -C <path> status --short
```

- **ルートリポジトリのサブモジュール参照更新は commit / push しない**（差分を残すだけ。commit はユーザーが手動で行う）

### 8. push

```bash
git -C <path> push -u origin <branch>
```

push が Internal Server Error / publickey で落ちても、SSH 設定の調査より先にまずリトライする（GitHub 側の一過性障害が多い）。

### 9. Draft PR 作成

ベースブランチはリポジトリ別（front / back: `stg`、mobile / ルート: `main`）。ユーザーが明示指定した場合はそれに従う。

description は `create-pr` スキルのテンプレートに合わせ、一時ファイル（scratchpad）に書き出してから渡す。

```bash
gh pr create \
  --repo <repo> \
  --head <branch> \
  --base <base> \
  --draft \
  --title "<title>" \
  --assignee ippei-shimizu \
  --body-file <scratchpad>/pr-body-<NUM>.md
```

description の要点:

- 冒頭に `close #<ISSUE_NUMBER>`（issue はメインリポジトリなので、サブモジュールの PR では `ippei-shimizu/buzzbase#<NUM>` 形式で参照する）
- 2 の検証で置いた**前提・既定値の選択**を「その他」または「やらなかったこと」に明記する
- issue のスコープ外として見送った点を「やらなかったこと」に書く
- 1 issue が front / back 両方に及ぶ場合は、それぞれのリポジトリで Draft PR を作り、互いの PR URL を description に相互参照として書く

作成された PR の URL を控える。

### 10. レビュー依頼（request-claude-review）

`Skill` ツールで `request-claude-review` を呼び出し、引数に**作成した Draft PR の URL** を渡す。issue から読み取った重点観点があれば併せて渡す。

```
request-claude-review <PR_URL> <重点観点があれば>
```

このスキルがレビュー依頼コメントの投稿・ワークフロー完了待ち・指摘への対応・返信・resolve・`record-learning` の実行まで面倒を見る。**その処理が完了するまで次の issue に進まない**（作業ツリーが共有されているため）。

- front / back 両方に PR がある場合は、PR ごとに呼び出す
- `request-claude-review` が対象ブランチ上で追加コミット・push を行う。戻ってきた時点で作業ツリーがそのブランチのままであることを確認してから次の issue に進む
- レビュー依頼が起動しなかった場合（ワークフロー skipped 等）は、その issue は「レビュー未実施」として最終報告に明記し、次の issue へ進む

### 11. 次の issue へ

複数 issue がある場合、2 に戻って次の issue を処理する。前の issue のブランチはそのまま残す（切り戻さない）。

### 12. 最終報告

issue ごとに以下を表でまとめる。

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
実装完了
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#<NUM> <タイトル>
  対象: <submodule> / ブランチ: <branch>
  Draft PR: <URL>
  レビュー: 指摘 N 件（対応 N 件 / 見送り N 件）
  前提: <自分で決めた既定値があれば>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

加えて:

- **スキップした issue** とその理由（根拠のファイルパス・行付き）を必ず書く。ここが一番重要な出力
- スコープ外として見送った気付き
- Status 変更や push などで失敗したものがあればその旨
- PR は Draft のままであり、Ready 化とマージはユーザーが行うこと

## コマンド実行制約

- `cd ... && git ...` 禁止
- `git -C` には**必ず絶対パス**
- `echo "..."` を含む複合コマンドを Bash 一発で書かない
- コマンドは個別 Bash 呼び出し
- ファイルの書き換えに `sed -i` / python heredoc を使わない（整形フックが走らず CI の `format:check` で落ちる）。編集は Edit / Write で行う
- import の追加とその使用箇所の追加は**同じ Edit 内**で行う（別 Edit に分けると整形フックが未使用 import を消す）

## 注意事項

- このスキルは「issue の内容を鵜呑みにしない」ことに価値がある。issue が間違っているまま実装するより、スキップして確認を返すほうが正しい
- 1回の呼び出しで多数の issue を渡された場合も、逐次で最後まで通す。時間がかかることを理由に検証やテストを省略しない
- `record-learning` はこのスキルから直接呼ばない（`request-claude-review` の最終ステップで実行されるため二重に呼ばない）
- Heroku CLI / ダッシュボードには一切アクセスしない。本番確認が必要な受入基準があれば、最終報告でユーザーに依頼する
- データを削除しうる DB 操作（`rails db:schema:load` / `db:reset` / `db:drop`）を無断で実行しない
