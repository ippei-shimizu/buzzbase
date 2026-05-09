# App Storeレビュー促進施策 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 試合記録完了時にマイルストーン条件を満たしたユーザーへOS標準のApp Storeレビューダイアログを表示する

**Architecture:** `expo-store-review` で OS 標準ダイアログを表示し、表示条件の状態管理は `expo-secure-store` でローカルに保持。ロジックは `useStoreReview` カスタムフックに集約し、ルートレイアウトで初期化、試合記録完了画面から条件判定を呼び出す。

**Tech Stack:** Expo SDK 55, React Native, expo-store-review, expo-secure-store, TypeScript

---

## ファイル構成

| ファイル | 操作 | 責務 |
|---------|------|------|
| `mobile/hooks/useStoreReview.ts` | 新規作成 | レビュー表示の条件判定・状態管理・実行 |
| `mobile/app/_layout.tsx` | 修正 | `initInstallDate()` の呼び出し追加（1行） |
| `mobile/app/(game-record)/summary.tsx` | 修正 | `checkAndRequestReview()` の呼び出し追加（数行） |

---

### Task 1: expo-store-review パッケージのインストール

**Files:**
- Modify: `mobile/package.json`

- [ ] **Step 1: パッケージをインストール**

```bash
cd /Users/shimizuippei/projects/dev/buzzbase/mobile && yarn add expo-store-review
```

- [ ] **Step 2: インストール確認**

```bash
cd /Users/shimizuippei/projects/dev/buzzbase/mobile && grep expo-store-review package.json
```

Expected: `"expo-store-review": "~X.X.X"` が表示される

- [ ] **Step 3: コミット**

```bash
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile add package.json yarn.lock
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile commit -m "Add: expo-store-reviewパッケージを追加"
```

---

### Task 2: useStoreReview フックの作成

**Files:**
- Create: `mobile/hooks/useStoreReview.ts`

- [ ] **Step 1: フックファイルを作成**

```typescript
import { useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import * as StoreReview from "expo-store-review";

const KEYS = {
  GAME_COUNT: "store_review_game_count",
  INSTALL_DATE: "store_review_install_date",
  LAST_SHOWN: "store_review_last_shown",
  SHOWN_COUNT: "store_review_shown_count",
  SHOWN_YEAR: "store_review_shown_year",
} as const;

const MILESTONES = [5, 20, 50, 80, 100];
const MIN_DAYS_SINCE_INSTALL = 7;
const MAX_SHOWS_PER_YEAR = 3;
const MIN_DAYS_BETWEEN_SHOWS = 90;

function daysSince(dateString: string | null): number {
  if (!dateString) return Infinity;
  const then = new Date(dateString).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

export const useStoreReview = () => {
  const initInstallDate = useCallback(async () => {
    const existing = await SecureStore.getItemAsync(KEYS.INSTALL_DATE);
    if (existing) return;
    await SecureStore.setItemAsync(KEYS.INSTALL_DATE, new Date().toISOString());
  }, []);

  const checkAndRequestReview = useCallback(async () => {
    // 1. game_count をインクリメント
    const currentCount = await SecureStore.getItemAsync(KEYS.GAME_COUNT);
    const newCount = (parseInt(currentCount ?? "0", 10) || 0) + 1;
    await SecureStore.setItemAsync(KEYS.GAME_COUNT, String(newCount));

    // 2. マイルストーンに一致するか
    if (!MILESTONES.includes(newCount)) return;

    // 3. インストールから7日以上経過しているか
    const installDate = await SecureStore.getItemAsync(KEYS.INSTALL_DATE);
    if (daysSince(installDate) < MIN_DAYS_SINCE_INSTALL) return;

    // 4. 年の表示回数をチェック（年が変わっていたらリセット）
    const currentYear = new Date().getFullYear();
    const storedYear = await SecureStore.getItemAsync(KEYS.SHOWN_YEAR);
    let shownCount = parseInt(
      (await SecureStore.getItemAsync(KEYS.SHOWN_COUNT)) ?? "0",
      10,
    ) || 0;

    if (storedYear !== String(currentYear)) {
      shownCount = 0;
    }

    if (shownCount >= MAX_SHOWS_PER_YEAR) return;

    // 5. 前回表示から90日以上経過しているか（初回はスキップ）
    const lastShown = await SecureStore.getItemAsync(KEYS.LAST_SHOWN);
    if (lastShown && daysSince(lastShown) < MIN_DAYS_BETWEEN_SHOWS) return;

    // 6. 端末が対応しているか
    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return;

    // 7. レビューダイアログを表示
    await StoreReview.requestReview();

    // 8. 表示状態を更新
    await SecureStore.setItemAsync(KEYS.LAST_SHOWN, new Date().toISOString());
    await SecureStore.setItemAsync(KEYS.SHOWN_COUNT, String(shownCount + 1));
    await SecureStore.setItemAsync(KEYS.SHOWN_YEAR, String(currentYear));
  }, []);

  return { initInstallDate, checkAndRequestReview };
};
```

- [ ] **Step 2: TypeScriptの型チェック**

```bash
cd /Users/shimizuippei/projects/dev/buzzbase/mobile && yarn typecheck
```

Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile add hooks/useStoreReview.ts
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile commit -m "Add: useStoreReviewフックを作成"
```

---

### Task 3: ルートレイアウトに initInstallDate を追加

**Files:**
- Modify: `mobile/app/_layout.tsx:5,12`

- [ ] **Step 1: import文を追加**

`mobile/app/_layout.tsx` の5行目の後に追加:

```typescript
import { useStoreReview } from "@hooks/useStoreReview";
```

- [ ] **Step 2: RootLayoutInner 内でフックを呼び出し**

`mobile/app/_layout.tsx` の `RootLayoutInner` 関数内、`usePushNotifications();` の直後に追加:

```typescript
  const { initInstallDate } = useStoreReview();
  initInstallDate();
```

変更後の `RootLayoutInner` は以下のようになる:

```typescript
function RootLayoutInner() {
  usePushNotifications();
  const { initInstallDate } = useStoreReview();
  initInstallDate();

  return (
    <>
      <StatusBar style="light" />
      ...
```

- [ ] **Step 3: TypeScriptの型チェック**

```bash
cd /Users/shimizuippei/projects/dev/buzzbase/mobile && yarn typecheck
```

Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile add app/_layout.tsx
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile commit -m "Add: ルートレイアウトにインストール日記録を追加"
```

---

### Task 4: 試合記録完了画面に checkAndRequestReview を追加

**Files:**
- Modify: `mobile/app/(game-record)/summary.tsx:2,6,59-65`

- [ ] **Step 1: import文を追加**

`mobile/app/(game-record)/summary.tsx` の6行目の後に追加:

```typescript
import { useStoreReview } from "@hooks/useStoreReview";
```

- [ ] **Step 2: フックを呼び出し、handleComplete を修正**

`SummaryScreen` コンポーネント内でフックを呼び出す。13行目（`const store = useGameRecordStore();`）の後に追加:

```typescript
  const { checkAndRequestReview } = useStoreReview();
```

`handleComplete` を async に変更し、`checkAndRequestReview()` を呼び出す。ルーター遷移の前に呼ぶ:

```typescript
  const handleComplete = async () => {
    resetFlow();
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["gameResults"] });
    queryClient.invalidateQueries({ queryKey: ["userGameResults"] });
    await checkAndRequestReview();
    router.replace("/(tabs)/(game-results)");
  };
```

- [ ] **Step 3: TypeScriptの型チェック**

```bash
cd /Users/shimizuippei/projects/dev/buzzbase/mobile && yarn typecheck
```

Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile add app/\(game-record\)/summary.tsx
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile commit -m "Add: 試合記録完了時にApp Storeレビュー表示を追加"
```

---

## 手動テスト手順

実機（iOS）での確認:

1. アプリをクリーンインストールして起動 → `store_review_install_date` が記録されることを確認
2. 試合記録を完了 → `store_review_game_count` がインクリメントされることを確認
3. 5回目の試合記録完了時（インストールから7日以上経過している場合） → レビューダイアログが表示されることを確認
4. ダイアログ表示後、`store_review_last_shown`, `store_review_shown_count`, `store_review_shown_year` が更新されることを確認

※ 開発中は `StoreReview.isAvailableAsync()` が `false` を返す場合がある（シミュレータ等）。実機TestFlightビルドでの確認を推奨。
