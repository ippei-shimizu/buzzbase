---
name: smart-commit
description: 現在の作業差分を分析し、適切な粒度でコミットを分割し、自動で add / commit / push まで実行する。「コミットして」「コミットを分けて」「差分を整理して」などのリクエストで起動する。
mode: bypassPermissions
---

# Smart Commit スキル

作業差分を分析し、論理的な単位でコミットを分割して、自動で git add / commit / push まで実行する。
**承認なしで即実行する。途中で確認を挟まない。**

## 対象リポジトリ

サブモジュール + ルートリポジトリの両方を対象とする。

- `front/` → `ippei-shimizu/buzzbase_front`
- `back/` → `ippei-shimizu/buzzbase_back`
- `mobile/` → `ippei-shimizu/buzzbase_mobile`
- ルート → `ippei-shimizu/buzzbase`

## ワークフロー

### 1. 差分の取得

各リポジトリの差分を取得する:

```bash
# ルートリポジトリ（サブモジュール以外の変更）
git status --short
git diff HEAD

# 各サブモジュール
cd front && git status --short && git diff HEAD
cd back && git status --short && git diff HEAD
cd mobile && git status --short && git diff HEAD

# 未追跡の新規ファイル内容
git diff --no-index /dev/null <file>
```

変更がないリポジトリはスキップする。

### 2. 変更の分類

各ファイルの変更内容を分析し、以下の観点でグルーピングする:

- **機能単位**: 同じ機能に関する変更はまとめる（例: コントローラ + テスト + ルーティング）
- **関心の分離**: 設定変更、リファクタリング、新機能、バグ修正は分ける
- **依存関係**: 後のコミットが前のコミットに依存する場合、依存される側を先にする

#### 分割の粒度ガイドライン

- 1コミット = 1つの論理的変更（「なぜこの変更をしたか」を1文で説明できる単位）
- 設定ファイルの変更（Gemfile, package.json 等）は関連する機能変更と同じコミットに含める
- テストは対応する実装と同じコミットにする
- リンティング修正やフォーマット変更は独立したコミットにする
- ファイル削除は、その理由となる変更と同じコミットにまとめる

### 3. コミットメッセージの生成

プロジェクトのコミットプレフィックス規約に従う:
`Fix:`, `Add:`, `Update:`, `Change:`, `Refactor:`, `Remove:`, `Test:`, `Chore:`, `Docs:`

メッセージは変更の「なぜ」を日本語で簡潔に記述する。

### 4. 安全チェック

実行前に以下を確認する（ユーザーに確認せず自動判定）:

- 現在のブランチが `main` でないことを確認。`main` の場合は**中断してエラーを出す**
- サブモジュールも同様に `main` ブランチでないことを確認

### 5. 自動実行

分類が完了したら、**承認を待たずに**以下を順番に自動実行する:

1. **backサブモジュール**: `back/` ディレクトリで add → commit → push
2. **frontサブモジュール**: `front/` ディレクトリで add → commit → push
3. **mobileサブモジュール**: `mobile/` ディレクトリで add → commit → push
4. **ルートリポジトリ**: ルートで add → commit → push（サブモジュール参照更新含む）

各リポジトリで `git push -u origin $(git branch --show-current)` を実行する。
変更がないリポジトリはスキップする。

実行中は各コミットの内容を以下のフォーマットで出力する:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
コミット 1/N [リポジトリ名]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
メッセージ: <prefix>: <コミットメッセージ>

対象ファイル:
  A  path/to/new-file.ts
  M  path/to/modified-file.rb
  D  path/to/deleted-file.ts

変更概要: <このコミットで何をしたかの1行説明>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

ステータス記号: `A` = 新規追加, `M` = 変更, `D` = 削除

### 6. 完了報告

すべてのコミットとプッシュが完了したら、実行結果のサマリーを出力する:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
完了サマリー
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
back:   N commits pushed
front:  N commits pushed
mobile: N commits pushed
root:   N commits pushed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 注意事項

- **承認不要で自動実行する**（差分分析 → add → commit → push を一気に行う）
- **途中で確認を挟まない**
- mainブランチへの直接コミット・プッシュは絶対にしない（検出した場合はエラーを出して中断する）
- `$ARGUMENTS` が指定された場合、それを変更の背景コンテキストとして活用する
- `.env`, `credentials.json` 等の秘密情報を含むファイルはコミットしない
