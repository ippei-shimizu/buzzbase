# Superpowers プラグイン使用ガイド（BUZZ BASE）

## 概要

[obra/superpowers](https://github.com/obra/superpowers) は、AIコーディングエージェントに体系的なソフトウェア開発プロセスを適用するスキルフレームワーク。v5.0.6 を使用中。

## インストール・管理

```bash
# インストール済み
/plugin install superpowers@claude-plugins-official

# 更新
/plugin update superpowers

# スキル再読み込み
/reload-plugins
```

## 開発ワークフロー全体像

```
1. brainstorming     → 要件整理・設計
2. writing-plans     → 実装計画作成
3. 実装（以下のいずれか）
   ├─ subagent-driven-development（推奨：サブエージェント並行実装）
   ├─ executing-plans（単一セッションで順次実装）
   └─ test-driven-development（個別タスクのTDD実装）
4. requesting-code-review → コードレビュー
5. verification-before-completion → 完了前検証
6. finishing-a-development-branch → ブランチ統合
```

## スキル一覧と使い方

### 1. brainstorming（設計・壁打ち）

**トリガー:** 新機能の開発、既存機能の変更、コンポーネント追加など、あらゆる「作る」作業の前。

**やること:**
- プロジェクトのコンテキスト調査
- 質問を1つずつ投げて要件を深掘り
- 2〜3つのアプローチ提案（トレードオフ付き）
- 設計書を `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` に保存

**使用例:**
```
「打率ランキングにカテゴリフィルターを追加したい」
→ brainstorming が自動起動し、設計を固めてから実装に進む
```

**重要:** 設計がユーザーに承認されるまで、コードは一切書かない。

---

### 2. writing-plans（実装計画）

**トリガー:** 設計完了後、マルチステップのタスクに着手する前。

**やること:**
- 設計書を元に、2〜5分単位の小タスクに分解
- 各タスクに「どのファイルを触るか」「テスト方法」「検証方法」を明記
- 計画書を `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md` に保存

**原則:** 「プロジェクトの文脈を全く知らないエンジニアでも追従できる」レベルの詳細さ。DRY・YAGNI・TDD を前提。

---

### 3. subagent-driven-development（サブエージェント並行実装）

**トリガー:** 実装計画があり、タスクが独立している場合。

**やること:**
- タスクごとに新しいサブエージェントを起動
- 各サブエージェントには必要なコンテキストのみを渡す
- 実装後に2段階レビュー（仕様準拠 → コード品質）

**BUZZ BASEでの活用:**
- front（Next.js）と back（Rails）のタスクを並行実装
- 複数の独立したコンポーネントを同時に作成

---

### 4. executing-plans（計画の順次実行）

**トリガー:** 実装計画があるが、サブエージェントが使えない/タスクが密結合の場合。

**やること:**
- 計画を読み込み、懸念点があれば先に確認
- タスクを順番に実行（開始→検証→完了マーク）

---

### 5. test-driven-development（TDD）

**トリガー:** あらゆる機能実装・バグ修正。

**サイクル:**
1. **RED** — テストを書き、失敗を確認
2. **GREEN** — テストが通る最小限のコードを書く
3. **REFACTOR** — テストが通った状態でリファクタリング

**BUZZ BASEでの適用:**
- back: RSpec でモデル・API のテスト
- front: Jest/Testing Library でコンポーネントテスト

---

### 6. systematic-debugging（体系的デバッグ）

**トリガー:** バグ、テスト失敗、予期しない動作に遭遇したとき。

**鉄則:** 根本原因を特定するまで修正コードを書かない。

**フェーズ:**
1. 情報収集 — エラーメッセージ、ログ、再現手順
2. 仮説生成 — 可能性のある原因をリストアップ
3. 仮説検証 — 1つずつ検証
4. 修正と確認 — 根本原因に対する修正を実装・検証

---

### 7. dispatching-parallel-agents（並列エージェント派遣）

**トリガー:** 2つ以上の独立したタスク（共有状態なし・順序依存なし）がある場合。

**やること:**
- 問題領域ごとに1エージェントを割り当て
- 各エージェントに必要なコンテキストのみを渡して並行実行

**例:** 複数の異なるテスト失敗を同時に調査

---

### 8. requesting-code-review（コードレビュー依頼）

**トリガー:** タスク完了後、機能実装完了後、main マージ前。

**やること:**
- コードレビュー用サブエージェントを起動
- git diff ベースでレビュー実施
- 仕様準拠とコード品質の両面をチェック

---

### 9. receiving-code-review（レビュー受領）

**トリガー:** コードレビューのフィードバックを受けたとき。

**原則:** 盲目的に同意するのではなく、技術的に検証してから対応する。

**フロー:** フィードバック読了 → 要件を自分の言葉で再確認 → コードベースで検証 → 技術的に妥当か評価 → 対応 or 理由付き反論

---

### 10. verification-before-completion（完了前検証）

**トリガー:** 「完了」「修正済み」「テスト通過」と主張する前。

**鉄則:** 検証コマンドの実行結果なしに、完了を宣言しない。

```
「直しました」→ NG（証拠なし）
「テストを実行して全件パスを確認しました」→ OK
```

---

### 11. using-git-worktrees（Git Worktree）

**トリガー:** 現在のワークスペースから隔離して作業したい場合。

**注意:** BUZZ BASE には既存の `/start-worktree` スキルがあり、front/back サブモジュール対応済み。superpowers の worktree スキルは汎用的なので、サブモジュール構成では `/start-worktree` を優先。

---

### 12. finishing-a-development-branch（ブランチ完了）

**トリガー:** 実装完了・テストパス後、ブランチを統合する段階。

**フロー:**
1. テストが通ることを検証
2. 選択肢を提示（マージ / PR作成 / クリーンアップ）
3. ユーザーの選択に従って実行

---

### 13. writing-skills（スキル作成）

**トリガー:** 新しいスキルを作成・編集するとき。

**保存先:** `~/.claude/skills/`（個人スキル）

---

### 14. using-superpowers（自動判定）

会話開始時に自動的に動作し、適用可能なスキルがあれば自動トリガーする。明示的に呼ぶ必要はない。

## BUZZ BASE 固有の注意事項

### 既存スキルとの併用

| superpowers スキル | BUZZ BASE 既存スキル | 優先 |
|---|---|---|
| using-git-worktrees | `/start-worktree` | 既存（サブモジュール対応済み） |
| finishing-a-development-branch | `/create-pr` | 既存（テンプレート対応済み） |
| — | `/commit`（commit-commands） | プラグイン（smart-commitから移行） |
| — | `/rspec-behavior-test` | 既存（古典派テスト方針） |

### CLAUDE.md ルールが常に優先

- コミットメッセージは日本語（superpowers のデフォルト英語より優先）
- Server Component 優先のルール
- Container/Presentational パターン
- mainブランチへの直push禁止

### 推奨される使い分け

- **小さな修正・バグ修正**: superpowers なしで直接対応（大げさになりすぎる）
- **中規模の機能追加**: `brainstorming` → `writing-plans` → `test-driven-development`
- **大規模な機能開発**: フルフロー（brainstorming → plans → subagent-driven-development → review → finish）
- **デバッグ**: `systematic-debugging` は規模問わず有用
