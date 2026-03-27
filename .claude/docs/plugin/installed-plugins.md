# インストール済みプラグイン一覧（BUZZ BASE）

各プラグインの詳細は個別ファイルを参照。

## プラグイン一覧

| プラグイン | ファイル | 種別 |
|---|---|---|
| superpowers | [superpowers.md](superpowers.md) | 開発ワークフロー |
| claude-md-management | [claude-md-management.md](claude-md-management.md) | CLAUDE.md管理 |
| feature-dev | [feature-dev.md](feature-dev.md) | 開発ワークフロー |
| commit-commands | [commit-commands.md](commit-commands.md) | Git操作 |
| ralph-loop | [ralph-loop.md](ralph-loop.md) | 自律ループ |
| code-review | [code-review.md](code-review.md) | レビュー |
| pr-review-toolkit | [pr-review-toolkit.md](pr-review-toolkit.md) | レビュー |
| code-simplifier | [code-simplifier.md](code-simplifier.md) | リファクタリング |
| plugin-dev | [plugin-dev.md](plugin-dev.md) | プラグイン開発 |
| skill-creator | [skill-creator.md](skill-creator.md) | スキル開発 |
| claude-code-setup | [claude-code-setup.md](claude-code-setup.md) | セットアップ |
| security-guidance | [security-guidance.md](security-guidance.md) | セキュリティ |
| frontend-design | [frontend-design.md](frontend-design.md) | UI生成 |
| typescript-lsp | [typescript-lsp.md](typescript-lsp.md) | LSP |
| ruby-lsp | [ruby-lsp.md](ruby-lsp.md) | LSP |
| github | [github.md](github.md) | 外部連携 |
| playwright | [playwright.md](playwright.md) | ブラウザテスト |

## 既存スキルとの対応表

| プラグイン | 置き換え元 | 備考 |
|---|---|---|
| `commit-commands` | `smart-commit`（削除済み） | `/commit` で同等機能。CLAUDE.mdの日本語ルール優先 |
| `code-review` | — | `/create-pr` と組み合わせて使う |
| `frontend-design` | — | 既存の ui-ux-pro-max スキルと補完関係 |
| `typescript-lsp` / `ruby-lsp` | — | serena MCPと補完関係 |
