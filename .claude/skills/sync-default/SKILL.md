---
name: sync-default
description: サブモジュール（front, back, mobile）を各デフォルトブランチに切り替えてpullし、最新状態にする。`/sync-default`や「デフォルトブランチに戻して」「最新に同期して」などのリクエストで起動する。
mode: bypassPermissions
---

# デフォルトブランチ同期スキル

各サブモジュールを作業ブランチからデフォルトブランチに切り替え、リモートからpullして最新状態にする。
**確認なしで即実行する。**

## 対象リポジトリとデフォルトブランチ

| サブモジュール | パス | デフォルトブランチ |
| -------------- | ---- | ------------------ |
| front          | `/Users/shimizuippei/projects/dev/buzzbase/front` | `stg` |
| back           | `/Users/shimizuippei/projects/dev/buzzbase/back` | `stg` |
| mobile         | `/Users/shimizuippei/projects/dev/buzzbase/mobile` | `main` |

## ワークフロー

### 1. 現在の状態を確認

各サブモジュールで現在のブランチと未コミットの変更を並列で確認する:

```bash
git -C /Users/shimizuippei/projects/dev/buzzbase/front status --short
git -C /Users/shimizuippei/projects/dev/buzzbase/front rev-parse --abbrev-ref HEAD

git -C /Users/shimizuippei/projects/dev/buzzbase/back status --short
git -C /Users/shimizuippei/projects/dev/buzzbase/back rev-parse --abbrev-ref HEAD

git -C /Users/shimizuippei/projects/dev/buzzbase/mobile status --short
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile rev-parse --abbrev-ref HEAD
```

**未コミットの変更がある場合**: ユーザーに通知し、stashするか確認する。変更がなければそのまま進む。

### 2. デフォルトブランチに切り替えてpull

各サブモジュールで順番に実行する:

```bash
# front (デフォルト: stg)
git -C /Users/shimizuippei/projects/dev/buzzbase/front checkout stg
git -C /Users/shimizuippei/projects/dev/buzzbase/front pull origin stg

# back (デフォルト: stg)
git -C /Users/shimizuippei/projects/dev/buzzbase/back checkout stg
git -C /Users/shimizuippei/projects/dev/buzzbase/back pull origin stg

# mobile (デフォルト: main)
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile checkout main
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile pull origin main
```

既にデフォルトブランチにいる場合はcheckoutをスキップし、pullのみ実行する。

### 3. 元の作業ブランチを削除

ステップ1で記録した元のブランチがデフォルトブランチと異なる場合、ローカルブランチを削除する:

```bash
# front の元ブランチが stg でなければ削除
git -C /Users/shimizuippei/projects/dev/buzzbase/front branch -d <元のブランチ名>

# back の元ブランチが stg でなければ削除
git -C /Users/shimizuippei/projects/dev/buzzbase/back branch -d <元のブランチ名>

# mobile の元ブランチが main でなければ削除
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile branch -d <元のブランチ名>
```

- **`-d`（小文字）を使う**。マージされていないブランチは削除せず、警告を報告する。
- 元のブランチがデフォルトブランチと同じ場合はスキップする。

### 4. 完了報告

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
デフォルトブランチ同期完了
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
front:
  stg ← <元のブランチ名>（削除済み）
  ステータス: 最新

back:
  stg ← <元のブランチ名>（削除済み）
  ステータス: 最新

mobile:
  main ← <元のブランチ名>（削除済み）
  ステータス: 最新
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

既にデフォルトブランチだった場合は `<デフォルトブランチ名>（変更なし）` と表示する。

## コマンド実行ルール

- **`cd dir && git ...` は絶対に使わない** → Claude Codeのセキュリティチェックで承認を求められる
- **`git -C` には必ず絶対パスを使う** → cwdがサブモジュール内の場合、相対パスは失敗する
- **`echo "..."` を含む複合コマンドは使わない** → 「quoted characters in flag names」で承認を求められる
- 各コマンドは個別のBash呼び出しで実行する（`&&` でのチェーンは最小限にする）
- 独立したコマンドは並列で実行してパフォーマンスを最大化する

## 注意事項

- **ユーザーへの確認は不要。即実行する。**（未コミット変更がある場合のみ例外）
- ルートリポジトリ（buzzbase）は対象外。サブモジュールのみ操作する。
- pullに失敗した場合はエラー内容を報告し、残りのサブモジュールは続行する。
