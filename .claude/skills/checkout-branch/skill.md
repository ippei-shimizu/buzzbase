---
name: checkout-branch
description: 指定したissue番号でサブモジュールに作業ブランチを作成する。`/checkout-branch 116`のように呼び出す。issue情報からブランチ名を自動生成し、最新のベースブランチから分岐させる。
mode: bypassPermissions
---

# 作業ブランチ チェックアウト スキル

指定issue番号でサブモジュールに作業ブランチを作成。**確認なしで即実行**。

## 対象リポジトリとベースブランチ

| パス | リポジトリ | ベース |
| ---- | ---------- | ------ |
| `/Users/shimizuippei/projects/dev/buzzbase/front` | `ippei-shimizu/buzzbase_front` | `stg` |
| `/Users/shimizuippei/projects/dev/buzzbase/back` | `ippei-shimizu/buzzbase_back` | `stg` |
| `/Users/shimizuippei/projects/dev/buzzbase/mobile` | `ippei-shimizu/buzzbase_mobile` | `main` |

ルートリポジトリ（buzzbase）ではブランチ作成しない。

## トークン削減原則

- issue取得は **`title,labels` のみ** で済む場合は body を取らない（タイトルとラベルでプレフィックス・対象が判定できるなら body 不要）
- body が必要な場合のみ追加で `gh issue view ... --json body` を実行
- 既存の作業状況確認（`status --short`）は **対象サブモジュールに対してのみ**実行
- ブランチ作成は **fetch + checkout -b の2コマンド**（checkout→pull→checkout -b の3コマンドから短縮）

## ワークフロー

### 1. 引数解析

`$ARGUMENTS` からissue番号取得。空なら質問。

### 2. issue情報取得（最小フィールド）

```bash
gh issue view <NUM> --repo ippei-shimizu/buzzbase --json title,labels
```

タイトル・ラベルから対象とプレフィックスが特定できれば body は不要。曖昧な場合のみ追加で body を取得：

```bash
gh issue view <NUM> --repo ippei-shimizu/buzzbase --json body
```

### 3. ブランチ名決定

プレフィックス判定:

| 条件 | プレフィックス |
| ---- | -------------- |
| `bug` ラベル / タイトル `Bug:` | `fix/` |
| `Refactor:` | `refactor/` |
| `Chore:` | `chore/` |
| `enhancement` ラベル / `Feature:` `Perf:` `Improve:` / その他 | `feature/` |

形式: `<prefix>/<NUM>-<短い英語の説明>`（例: `feature/116-game-result-recording`、`fix/138-ios-build-failure`）

**ブランチ名に `#` を使わない**（CI/CD互換性）。

### 4. 対象サブモジュール特定

タイトル・ラベルから判定:

- `[Mobile]` / モバイル関連 → `mobile/`
- フロント関連 → `front/`
- バックエンド関連 → `back/`
- 両方 → `front/` と `back/`
- 不明 → ユーザーに確認

### 5. ブランチ作成（対象サブモジュールのみ、各2コマンド）

```bash
# 1. ベースブランチを最新化（fetchはローカルブランチを切り替えない）
git -C <path> fetch origin <base>

# 2. fetched origin/<base> から新ブランチを作成
git -C <path> checkout -b <BRANCH_NAME> origin/<base>
```

実行前確認:

```bash
# 未コミット変更があるか
git -C <path> status --short
```

未コミット変更がある場合はユーザーに通知し、stashするか確認。同名ブランチが既に存在する場合もユーザーに確認。

### 6. 完了報告

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ブランチ作成完了
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue: #<NUM> <タイトル>
<submodule>:
  ブランチ: <BRANCH_NAME>
  パス: /Users/shimizuippei/projects/dev/buzzbase/<submodule>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## コマンド実行制約

- `cd ... && git ...` 禁止
- `git -C` には**必ず絶対パス**
- `echo "..."` を含む複合コマンドを Bash 一発で書かない
- 個別 Bash 呼び出し
