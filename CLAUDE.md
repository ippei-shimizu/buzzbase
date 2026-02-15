# BUZZ BASE

野球の個人成績をランキング形式で共有するWebアプリのモノレポ。

## プロジェクト構造

- `front/` と `back/` はgitサブモジュール（別リポジトリ）
- サブモジュール内の変更はサブモジュール側でコミットしてから、ルートでサブモジュール参照を更新する
- 詳細: @front/CLAUDE.md / @back/CLAUDE.md

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
- フロントエンドコマンド: `front/` ディレクトリで `yarn dev`, `yarn build`, `yarn lint`, `yarn check`, `yarn test`

## サービス間通信

フロントエンドのServer ComponentsからバックエンドAPIへは **Dockerサービス名** で接続:

- `http://back:3000`（`front/app/constants/api.ts` で定義）
- ホスト側ポート(`localhost:3100`)ではないので注意

APIのベースパス: `/api/v1/`

## Gitルール

- コミットメッセージは **日本語** で記述
- フォーマット: `[Type]: [説明]`（例: `Add: 試合結果の絞り込み機能を追加`）
- Type: `Add`, `Fix`, `Update`, `Change`, `Refactor`, `Remove`, `Test`, `Chore`, `Docs`
- サブモジュール更新コミット: `Fix: サブプロジェクトのコミットIDを更新`
