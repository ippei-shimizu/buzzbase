# App Storeレビュー促進施策 設計書

Issue: #196 Feature: iOSアプリのApp Storeレビュー促進施策を実装する

## 概要

試合記録の完了時に、条件を満たしたユーザーへOS標準のApp Storeレビューダイアログを表示する。`expo-store-review` の `requestReview()` を使用し、カスタムUIは設けない。

## 表示条件

以下をすべて満たす場合にレビューダイアログを表示する:

1. 累計試合記録回数がマイルストーン値（5, 20, 50, 80, 100）のいずれかに一致
2. インストールから7日以上経過
3. 今年の表示回数が3回未満
4. 前回表示から90日以上経過（初回は条件スキップ）
5. `StoreReview.isAvailableAsync()` が `true`

## データモデル

`expo-secure-store` に以下のキーで保存:

| キー | 型 | 説明 |
|------|------|------|
| `store_review_game_count` | string(数値) | 累計試合記録回数 |
| `store_review_install_date` | string(ISO日付) | 初回起動日 |
| `store_review_last_shown` | string(ISO日付) | 最後にレビュー依頼を表示した日 |
| `store_review_shown_count` | string(数値) | 今年の表示回数 |
| `store_review_shown_year` | string(数値) | 表示回数を管理している年 |

## アーキテクチャ

専用カスタムフック方式を採用。レビュー表示ロジックを `useStoreReview` フックに集約する。

### フックのインターフェース

```typescript
// hooks/useStoreReview.ts
export const useStoreReview = () => {
  const checkAndRequestReview: () => Promise<void>
  const initInstallDate: () => Promise<void>
}
```

- `initInstallDate()` — 初回起動日を記録（既に記録済みの場合はスキップ）
- `checkAndRequestReview()` — 試合記録完了時に呼び出し。記録回数をインクリメントし、条件判定してレビューを表示

### 処理フロー

```
checkAndRequestReview() 呼び出し
  ↓
game_count をインクリメント & 保存
  ↓
マイルストーン値（5, 20, 50, 80, 100）に一致するか？
  → No → 終了
  ↓ Yes
install_date から7日以上経過？
  → No → 終了
  ↓ Yes
shown_year が今年か確認（違えば shown_count を0にリセット）
  ↓
shown_count < 3 か？
  → No → 終了
  ↓ Yes
last_shown から90日以上経過？（初回は条件スキップ）
  → No → 終了
  ↓ Yes
StoreReview.isAvailableAsync() で端末対応を確認
  → No → 終了
  ↓ Yes
StoreReview.requestReview() を実行
  ↓
last_shown, shown_count, shown_year を更新
```

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `mobile/hooks/useStoreReview.ts` | 新規作成 — レビュー判定ロジック全体 |
| `mobile/app/_layout.tsx` | 修正 — `initInstallDate()` の呼び出しを追加 |
| `mobile/app/(game-record)/` 内の記録完了画面 | 修正 — 記録保存成功後に `checkAndRequestReview()` を呼び出し |

## 追加パッケージ

- `expo-store-review`

## スコープ外

- バックエンドAPIの変更
- カスタムダイアログ・UIの追加
- 既存の試合記録フローの変更（完了後のコールバックに1行追加するのみ）
