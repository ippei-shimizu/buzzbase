# BUZZ BASE

野球の個人成績をランキング形式で共有するWebアプリのモノレポ。

## プロジェクト構造

- `front/`、`back/`、`mobile/` はgitサブモジュール（別リポジトリ）
- サブモジュール内の変更はサブモジュール側でコミットしてから、ルートでサブモジュール参照を更新する
- 詳細: @front/CLAUDE.md / @back/CLAUDE.md / @mobile/CLAUDE.md

## 開発環境

`docker compose up` で全サービス起動。ポートマッピング:

| サービス | コンテナ内ポート | ホストポート |
| -------- | ---------------- | ------------ |
| front    | 4100             | 8100         |
| back     | 3000             | 3100         |
| db       | 5432             | 5532         |

- ブラウザ: `http://localhost:8100`
- API直接確認: `http://localhost:3100`
- バックエンドコマンド: `docker compose exec back <command>`（例: `docker compose exec back rails console`）
- フロントエンドコマンド: `front/` ディレクトリで `yarn dev`, `yarn build`, `yarn lint`, `yarn typecheck`, `yarn test`
- バックエンドテスト: `docker compose exec back bundle exec rspec`
- モバイルコマンド: `mobile/` ディレクトリで `yarn start`, `yarn ios`, `yarn android`

## サービス間通信

フロントエンドのServer ComponentsからバックエンドAPIへは **Dockerサービス名** で接続:

- `http://back:3000`（`front/app/constants/api.ts` で定義）
- ホスト側ポート(`localhost:3100`)ではないので注意

APIのベースパス: `/api/v1/`

## 命名規約

モノレポ全体（front / back / mobile）で共通のローカル変数命名ルール:

- **ローカル変数は略称（abbreviation）を使わず、意味の明確な名前にする**
  - NG: `pa = PlateAppearance.find(...)` / `ba = BattingAverage.new` / `mr = MatchResult.create(...)`
  - OK: `plate_appearance = PlateAppearance.find(...)` / `batting_average = BattingAverage.new` / `match_result = MatchResult.create(...)`
- 一文字変数（`u`, `t`, `m` 等）も使わない。`user`, `team`, `match` のように省略しない
- 例外: ループの index（`i`, `j`）、`each_with_index { |item, i| ... }` のような慣用的なもの
- 理由: 変数名から「何が入っているか」が即読みでき、レビューやメンテ時のコスト削減

## コードコメントの方針

**デフォルトは「コメントを書かない」**。コードを読めばわかること（WHAT）は書かない。書いてよいのは次の3種類だけ。

1. **WHY コメント**: コードからは読み取れない意図・前提・制約（外部仕様への追従、性能上の理由、ハマりどころ）
2. **公開 API のドキュメントコメント**: 公開メソッド / 公開関数の責務・引数・返り値（yardoc `@param` / `@return`、JSDoc / TSDoc）
3. **TODO コメント**: 何を対応するのかを必ず明記する（例: `# TODO: 各 event_type に応じた handler を実装する`）。**issue / PR 番号は書かない**（`# TODO(#346):` のような書き方は禁止）

### 分量の上限

- WHY コメントは **1行、長くても2行**。3行以上にわたる解説は書かない（必要なら PR description か `docs/` に書く）
- ドキュメンテーションコメントは **責務の要約1文 + タグ** まで。`@example` は使い方が非自明なときだけ
- **メソッド・関数の中に「見出しコメント」を書かない**（`// バリデーション` `# 保存する` のような処理ブロックの区切り）。区切りたくなったらメソッド抽出で表現する
- 迷ったら書かない。**「このコメントが無いと読み手が誤読する」と言えるものだけ**を残す

### 残すもの / 消すもの

- 上記2のドキュメンテーションコメントは保守性向上の資産。「WHY が自明だから」を理由にレビューで削除しない
- 消すのは「コードと同じことを言うだけのコメント」「履歴メモ」「issue / PR 番号への参照」「長大な実装解説」

## Issue 着手ルール

issue の対応を始めるときは、**実装に手を付ける前に** GitHub Projects "BUZZ BASE"（`ippei-shimizu/projects/2`）の Status を `In Progress` に変更する。確認は不要で即実行する。

- 発火条件: 「issue #XXX に着手して」「#XXX やって」など、特定 issue の実装を開始するとき（`/checkout-branch` 経由でも手動着手でも同じ）
- 変更後に実装・ブランチ作成へ進む。Status 変更が失敗した場合は報告だけして実装は続行する
- 完了時の `Check` / `Done` への変更は従来どおりユーザーが行う

```bash
# 1. issue の node ID とプロジェクトアイテム ID を取得
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
' -F number=<ISSUE_NUMBER> --jq '.data.user.projectV2.items.nodes[] | select(.content.number == <ISSUE_NUMBER>) | .id'

# 2. Status を In Progress に更新（ID は固定値。変更されていたら Status フィールドを取得し直す）
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

## Gitルール

- コミットメッセージは **日本語** で記述
- フォーマット: `[Type]: [説明]`（例: `Add: 試合結果の絞り込み機能を追加`）
- Type: `Add`, `Fix`, `Update`, `Change`, `Refactor`, `Remove`, `Test`, `Chore`, `Docs`
- サブモジュール更新コミット: `Fix: サブプロジェクトのコミットIDを更新`
- **ルートリポジトリ（`ippei-shimizu/buzzbase`）は例外的にmainブランチへ直接commit・pushしてよい**（ブランチ作成・PR作成は不要）
- **サブモジュール（front / back / mobile）は引き続きmainブランチへの直push・直commit・mergeを絶対にしない**
- **ブランチ名に `#` を使用しない**（CI/CDツールとの互換性のため）
  - OK: `feature/93-private-account`, `feature/issue-93-private-account`
  - NG: `feature/#93-private-account`

### PR のマージ先（base）はリポジトリごとに規定する

ユーザーから明示指示がない限り、以下の base ブランチに向けて PR を作成する。front / back は本番(main)前に stg で動作確認するリリースフローのため、新規 PR は必ず stg に向ける。mobile / ルートは main 直接運用。

| リポジトリ | PR base（指示なし時） |
| ---- | ---- |
| `ippei-shimizu/buzzbase` | `main` |
| `ippei-shimizu/buzzbase_front` | `stg` |
| `ippei-shimizu/buzzbase_back` | `stg` |
| `ippei-shimizu/buzzbase_mobile` | `main` |

- `gh pr create --base <table-value> ...` をリポジトリ別に切り替える
- ユーザーが「main に向けて」「develop に向けて」等と明示した場合はそれに従う

### PR レビュー指摘対応のコミットは指摘ごとに分割する

- 「Fix: PR レビュー指摘に対応 (A / B / C)」のように複数の独立した指摘を1コミットにまとめるのは **禁止**
- 指摘 N 件なら N コミットに分割し、各コミットメッセージで「どの指摘に対応したか」が単独で読み取れるようにする
- 例:
  - `Fix: GameResult の eager load に :stadium を追加（N+1 防止）`
  - `Fix: match_results_spec の issue 番号コメントを削除`
  - `Refactor: Stadium.create! を create(:stadium) factory に統一`
- 粒度を細かくする目的: 再レビュー時の差分把握が容易、特定指摘の revert が安全、各指摘ごとに rspec / typecheck を回せる
- push は最後にまとめて1回でよい

## 学習ループ（レビュー指摘・修正からの自己改善）

- PRレビュー指摘への対応が完了しpushし終えたとき、またはユーザーから手動修正を伝えられたときは、`record-learning` スキルの手順で学びを抽出・分類する
- 個人の好み（Claudeとの協働の進め方）は既存の自動memory機構にそのまま保存する（確認不要）
- コード規約・設計判断としてチーム全体に効く学びは、**同じ指摘が2回目に出た時点でのみ** CLAUDE.md / 各リポジトリの `.claude/rules/*.md` へ昇格させる
- 昇格して問題ない・した方がいいと判断できるものは**確認を取らずに追加してコミットする**。追加した内容は報告する。判断が割れるもの（既存ルールと矛盾する、影響範囲が広い、書き方に複数案がある）だけdiffで提案して承認を待つ
- 通常の実装タスク完了時など、上記2つの発火条件以外では実行しない
- 詳細手順: `.claude/skills/record-learning/SKILL.md`

## Sentry運用ルール

エラー監視はSentry（無料 Developerプラン）。GitHub Integration有効化済み。

### Issue対応フロー（手動Resolve運用）

無料プランでは GitHub Status Sync が使えないため、Sentry Issueの解決はSentry UIで手動Resolveする。

| 状態 | 操作 | 用途 |
| ---- | ---- | ---- |
| Unresolved | デフォルト | 未調査・未対応 |
| Resolved | Sentry UIで「Resolve」ボタン | 対応完了。再発時は自動Regression検知（無料で動く） |
| Archive (until X occurrences) | Sentry UIで操作 | 様子見・通知抑制したい既知Issue |

### 無料で使える連携機能

- **Suspect Commits**: Issue画面に「原因の可能性が高いコミット」が自動表示
- **Suspect PR Comments**: 怪しいPRにSentryが自動でコメント（PR時点で気付ける）
- **Stack Trace Linking**: スタックトレース行からGitHubソースへジャンプ（Code Mappings設定後）
- **Regression検知**: Resolved後に再発したIssueを自動再オープン＋通知

### 将来的に整備するもの（任意）

`Fixes <SENTRY-SHORT-ID>` キーワードによる自動Resolveを動かすには、GitHub Actionsで `sentry-cli releases new` + `set-commits` を設定する必要がある（Sentry Auth Token発行 + Heroku Labs設定 + Rails initializer修正）。当面は手動Resolveで運用し、必要に応じて後日整備する。

### Sentry組織情報

- Organization: `0dd1e9c639d9`
- Projects: `buzzbase-frontend`, `buzzbase-backend`, `buzzbase-mobile`
- ダッシュボード: https://0dd1e9c639d9.sentry.io/
