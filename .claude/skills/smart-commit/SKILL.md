---
name: smart-commit
description: 現在の作業差分を分析し、適切な粒度でコミットを分割し、自動で add / commit / push まで実行する。「コミットして」「コミットを分けて」「差分を整理して」などのリクエストで起動する。
mode: bypassPermissions
allowedTools:
  - Bash
  - Read
  - Glob
  - Grep
---

# Smart Commit スキル

作業差分を論理的単位で分割し、自動で add / commit / push する。

## 絶対ルール

- ユーザー確認・承認は**一切行わない**。差分分析→add→commit→push を一気に実行
- mainブランチでの直接コミット・pushは禁止（検出時は中断してエラー）
- 報告は**実行後のサマリーのみ**

## 対象リポジトリ（絶対パス使用）

| リポジトリ | パス |
| ---------- | ---- |
| ルート | `/Users/shimizuippei/projects/dev/buzzbase` |
| front | `/Users/shimizuippei/projects/dev/buzzbase/front` |
| back | `/Users/shimizuippei/projects/dev/buzzbase/back` |
| mobile | `/Users/shimizuippei/projects/dev/buzzbase/mobile` |

## トークン削減原則

- 最初に `status --short` で**変更があるリポジトリだけに絞る**。他は以後すべてスキップ
- 分類は **`diff --stat` + `diff --name-status`** で十分。フルdiffは**分類が曖昧な場合のみ**個別ファイル単位で取得
- 新規ファイルの中身は**ファイル名・拡張子から推測**で分類。中身読み込みは最終手段

## ワークフロー

### 1. 変更検出（status --short のみを各リポジトリで1回）

```bash
git -C /Users/shimizuippei/projects/dev/buzzbase status --short
git -C /Users/shimizuippei/projects/dev/buzzbase/front status --short
git -C /Users/shimizuippei/projects/dev/buzzbase/back status --short
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile status --short
```

出力が空のリポジトリは以後**完全にスキップ**（diff も log も投げない）。

### 2. ブランチ確認（変更ありリポジトリのみ）

```bash
git -C <path> branch --show-current
```

`main` の場合は中断・エラー。

### 3. グルーピング情報取得（変更ありリポジトリのみ）

```bash
git -C <path> diff --stat HEAD
git -C <path> diff --name-status HEAD
```

ファイル一覧 + 変更行数 + 種類（A/M/D）が取得できる。**フルdiffは投げない**。

### 4. コミット分割

ファイルパス・拡張子・ステータスから分類：

- **機能単位**: 同じ機能・モジュール配下のファイルはまとめる
- **テスト**: 対応する実装と同コミット
- **設定ファイル**（package.json, Gemfile等）: 関連する機能変更と同コミット
- **lint/format修正**: 単独コミット
- **削除のみ**: 理由となる変更と同コミット

1コミット = 1つの「なぜ」で説明できる単位。

### 5. コミットメッセージ生成

プレフィックス: `Add:` / `Fix:` / `Update:` / `Change:` / `Refactor:` / `Remove:` / `Test:` / `Chore:` / `Docs:`

ファイル名・パスから内容推測。**曖昧な場合のみ**該当ファイルの diff を個別取得：

```bash
git -C <path> diff HEAD -- <file>
```

メッセージは日本語で「なぜ」を簡潔に。

### 6. add / commit / push（自動実行）

実行順序: **back → front → mobile → ルート**（ルートはサブモジュール参照更新を含むため最後）

```bash
git -C <path> add <files>
git -C <path> commit -m "Type: 説明"
git -C <path> push origin <branch>
```

各コミット時に出力：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
コミット N/M [リポジトリ名]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
メッセージ: Type: 説明
ファイル: A app/foo.ts / M app/bar.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 7. 完了サマリー

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

## コマンド実行制約

- `cd ... && git ...` 禁止（権限プロンプトの原因）
- `git -C` には**必ず絶対パス**
- `echo "..."` を含む複合コマンドを Bash 一発で書かない
- コマンドは個別 Bash 呼び出し

## 安全

- `.env` / `credentials.*` / `master.key` 等の秘密情報はコミットしない
- `$ARGUMENTS` があれば変更の背景コンテキストとして活用
