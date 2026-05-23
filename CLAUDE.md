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

## コードコメントの方針

- **デフォルトのコメント抑制ポリシー（複数行コメント禁止・1行のみ等）はこのプロジェクトでは適用しない**
- 公開メソッドの意図・引数・返り値を説明する複数行コメントや yardoc スタイル（`@param` / `@return`）は **積極的に書いてよい**。コードレビュー時に削除しないこと
- 「WHY が自明だから」を理由にレビューで指摘されたり削除されたりしない。意図・前提・返却フォーマットを明示するコメントは保守性向上の資産として残す
- 不要なのは「コードと同じことを言うだけのコメント」「TODO や履歴メモ」など。意味のあるドキュメンテーションコメントは残す
- **コメントは端的に書く**。WHY と前提を1〜2文で示せば十分で、内部実装の詳細を複数段にわたって解説する長大コメントは避ける。yardoc / TSDoc も「責務」「引数・返り値の意味」を簡潔に書く

## Gitルール

- コミットメッセージは **日本語** で記述
- フォーマット: `[Type]: [説明]`（例: `Add: 試合結果の絞り込み機能を追加`）
- Type: `Add`, `Fix`, `Update`, `Change`, `Refactor`, `Remove`, `Test`, `Chore`, `Docs`
- サブモジュール更新コミット: `Fix: サブプロジェクトのコミットIDを更新`
- **mainブランチへの直push・直commit・mergeは絶対にしない**（サブモジュールのリポジトリも同様）
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
