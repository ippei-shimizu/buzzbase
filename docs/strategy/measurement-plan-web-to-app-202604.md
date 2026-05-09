# Web→App 登録獲得 計測実装プラン

作成日: 2026-04-30
対象期間データ: 2026-04-01〜2026-04-29
GA4 Property: 428100753

---

## 1. 現状の計測穴の特定

### 1-1. 現状で「見えていないこと」

GA4 Enhanced Measurement（標準自動計測）で取得できているのは以下だけ。

| 取得できているもの | 限界 |
| --- | --- |
| page_view, session_start, first_visit | どのCTAから飛んだか不明 |
| scroll (90%スクロール) | どのCTAがビューポートに入ったか不明 |
| outbound click（linkUrl） | cta_locationが区別できない。SmartBanner/CtaBanner/CalculatorResultが全部まとめて "outbound" |
| form_start（フォームクリック） | どのフォームか不明。signup/signinが区別できない |

現状では以下のファネルが**完全に不可視**。

```
ランディング
  → どのCTAを見た (impression)
  → どのCTAをクリックした (click with location)
  → App Store到達 (proxy指標 = クリック数)
  → アプリ登録 (App Store内のため計測不可)
```

### 1-2. 具体的な穴

#### 穴1: /tools/ops でのCTAクリックが1.2%なのに原因が特定できない

- 計算実行後に表示される `CalculatorForm` 内の「アプリで成績を記録する」ボタン（`calculator_result` CTA）と、ページ末尾の `CtaBanner` のどちらがクリックされているか区別できない
- 計算を実行したユーザーが何人いるかも不明（`calculator_calculate` イベントなし）
- 計算未実行で直帰しているのか、計算後に離脱しているのかが不明

#### 穴2: /tools/k-bb でクリック0件 → CTAコンポーネント状況の確認

- コードを確認したところ `CalculatorPageContent` を使っており `CtaBanner` は配置されている
- しかし `CalculatorForm` 内の calculator_result CTAは `results.length > 0` の条件付きなので計算実行がゼロなら表示もゼロ
- k-bbページへの流入が計算実行に至っているか確認できない

#### 穴3: SmartAppBanner の貢献度がゼロ

- SmartAppBanner は全ページ上部に表示、月間約85クリックの大半がTOPページ（48クリック）
- SmartBanner経由クリックかCtaBanner経由クリックか区別できない
- dismissした比率も不明（7日間リセット設計だが効果測定できていない）

#### 穴4: signup/signin フローの分断

- form_start が 161回発火しているが、どのフォームか不明
- signupフォームのsubmitが成功したか（registration-confirmationへの遷移）が計測されていない
- Googleログイン経由のsignupは別フローだが区別できない

#### 穴5: コンバージョン（key_event）が1件も設定されていない

- GA4のキーイベント未設定のため、Googleの機械学習・オーディエンス・広告連携がすべて無効化されている

---

## 2. 実装すべき GA4 カスタムイベント設計

### 2-1. イベント一覧

| イベント名 | トリガー | 優先度 |
| --- | --- | --- |
| `app_store_click` | App Store URLへの遷移クリック | 最高 |
| `cta_banner_view` | CTAバナーがビューポートに入った | 高 |
| `calculator_calculate` | 計算ボタン押下（結果表示） | 高 |
| `signup_start` | /signup ページ到達 または フォーム最初の入力 | 中 |
| `signup_complete` | registration-confirmationページ到達 | 最高 |
| `smart_banner_dismiss` | SmartAppBannerの✕ボタンクリック | 中 |

### 2-2. イベントパラメータ設計

#### `app_store_click`（最重要）

```
event_name: "app_store_click"
parameters:
  cta_location: "smart_banner" | "hero" | "calculator_result" | "cta_banner_top" | "cta_banner_bottom" | "signup_page" | "signin_page"
  source_page: "/tools/ops" など pathname
  calculator_stat: "ops" | "obp" | "k-bb" | null  （toolsページのみ）
  has_calculated: true | false  （calculator_result のみ。計算後クリックかどうか）
```

`cta_location` の命名規則:
- `smart_banner`: ページ上部の固定バナー
- `hero`: TOPページのヒーローセクション内CTA（TopLoaderコンポーネント内）
- `calculator_result`: CalculatorForm の計算結果直後のボタン
- `cta_banner_top`: CalculatorPageContent の calculatorSlot 直後のCtaBanner（1個目）
- `cta_banner_bottom`: CalculatorPageContent の末尾のCtaBanner（2個目）
- `signup_page`: /signup ページ内のCtaBanner
- `signin_page`: /signin ページ内のCtaBanner

#### `cta_banner_view`

```
event_name: "cta_banner_view"
parameters:
  cta_location: （app_store_click と同じ値）
  source_page: pathname
```

#### `calculator_calculate`

```
event_name: "calculator_calculate"
parameters:
  calculator_stat: "ops" | "obp" | "k-bb" | "era" | "bb-9" | "k-9" など
  source_page: pathname
```

#### `signup_complete`

```
event_name: "signup_complete"
parameters:
  signup_method: "email" | "google"
  source_page: 直前のreferer（signupへ来る前のページ）
```

#### `smart_banner_dismiss`

```
event_name: "smart_banner_dismiss"
parameters:
  source_page: pathname
```

### 2-3. GA4 キーイベント（コンバージョン）登録

以下の2つを必ず登録する。残りは参考指標として活用。

| イベント | キーイベント登録 | 理由 |
| --- | --- | --- |
| `app_store_click` | 登録する（主KPI） | App Store到達の proxy指標 |
| `signup_complete` | 登録する（主KPI） | Webアカウント登録完了 |
| `calculator_calculate` | 登録しない（参考） | 中間指標。CVに直結しない |
| `cta_banner_view` | 登録しない（参考） | impression指標 |

---

## 3. Next.js App Router での実装方法

### 3-1. 共通ユーティリティ関数の設計

Server Component優先方針に準拠しつつ、イベント発火はすべてクライアントサイドで行う。Server Componentはトラッキングに関与しない。

**ファイル: `front/app/utils/gtag.ts`**

```typescript
// クライアントサイド専用（"use client" は不要、呼び出し側がClient Component）
declare global {
  interface Window {
    gtag: (command: string, action: string, params?: Record<string, unknown>) => void;
  }
}

export type CtaLocation =
  | "smart_banner"
  | "hero"
  | "calculator_result"
  | "cta_banner_top"
  | "cta_banner_bottom"
  | "signup_page"
  | "signin_page";

export type GtagEventParams = {
  app_store_click: {
    cta_location: CtaLocation;
    source_page: string;
    calculator_stat?: string;
    has_calculated?: boolean;
  };
  cta_banner_view: {
    cta_location: CtaLocation;
    source_page: string;
  };
  calculator_calculate: {
    calculator_stat: string;
    source_page: string;
  };
  signup_complete: {
    signup_method: "email" | "google";
  };
  smart_banner_dismiss: {
    source_page: string;
  };
};

export function trackEvent<K extends keyof GtagEventParams>(
  eventName: K,
  params: GtagEventParams[K],
): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params as Record<string, unknown>);
}
```

この `trackEvent` は型安全にイベント名とパラメータをペアで管理できる。呼び出し側で `import { trackEvent } from "@app/utils/gtag"` するだけで使える。

### 3-2. SmartAppBanner の改修

SmartAppBanner はすでに `"use client"` のため、onClick を追加するだけでよい。`usePathname` を使って `source_page` を取得する。

**改修箇所: `front/app/(app)/_components/SmartAppBanner.tsx`**

```typescript
"use client";

import { usePathname } from "next/navigation";
import { trackEvent } from "@app/utils/gtag";
// ... 既存 import

export default function SmartAppBanner() {
  const pathname = usePathname();
  // ... 既存 state/ref

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);
    trackEvent("smart_banner_dismiss", { source_page: pathname });
  };

  // App Store リンクの onClick
  const handleAppStoreClick = () => {
    trackEvent("app_store_click", {
      cta_location: "smart_banner",
      source_page: pathname,
    });
  };

  // ... 既存の表示ロジック

  return (
    <div ...>
      ...
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleAppStoreClick}  // 追加
        className="shrink-0"
      >
        ...
      </a>
    </div>
  );
}
```

### 3-3. CtaBanner の改修方針（Server Component を保持しつつ計測する）

CtaBanner は現在 Server Component。App Storeリンクに onClick を付けるためだけに全体を Client Component にするのは避ける。以下のパターンを採用する。

**パターン: リンク部分のみを薄い Client Component に切り出す**

**新規ファイル: `front/app/(app)/_components/AppStoreLinkButton.tsx`**

```typescript
"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { trackEvent, type CtaLocation } from "@app/utils/gtag";
import { APP_STORE_URL } from "@app/constants/app";

type Props = {
  ctaLocation: CtaLocation;
};

export default function AppStoreLinkButton({ ctaLocation }: Props) {
  const pathname = usePathname();

  const handleClick = () => {
    trackEvent("app_store_click", {
      cta_location: ctaLocation,
      source_page: pathname,
    });
  };

  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block"
      onClick={handleClick}
    >
      <Image
        src="/images/download_app_store_badge_jp.svg"
        alt="App Storeからダウンロード"
        width={150}
        height={50}
        className="h-[44px] w-auto"
      />
    </a>
  );
}
```

**改修: `front/app/(app)/_components/CtaBanner.tsx`**

```typescript
import Image from "next/image";
import AppStoreLinkButton from "./AppStoreLinkButton";
import type { CtaLocation } from "@app/utils/gtag";

type Props = {
  heading?: string;
  body: string;
  className?: string;
  ctaLocation?: CtaLocation;  // 追加
};

export default function CtaBanner({
  heading,
  body,
  className = "mt-10",
  ctaLocation = "cta_banner_top",  // デフォルト
}: Props) {
  return (
    <section className={...}>
      ...
      <AppStoreLinkButton ctaLocation={ctaLocation} />
      ...
    </section>
  );
}
```

**CtaBanner 呼び出し側の変更（CalculatorPageContent.tsx）:**

```typescript
// 1個目のCtaBanner（calculatorSlot直後）
<CtaBanner
  heading={...}
  body={...}
  ctaLocation="cta_banner_top"
/>

// 2個目のCtaBanner（ページ末尾）
<CtaBanner
  heading="チームの成績をアプリでまとめて管理"
  body="..."
  ctaLocation="cta_banner_bottom"
/>
```

signup/signin ページ内の CtaBanner:

```typescript
// signup/page.tsx
<CtaBanner
  body="アプリならもっと便利に成績を記録・管理できます。"
  ctaLocation="signup_page"
/>

// signin/page.tsx
<CtaBanner
  body="アプリならもっと便利に成績を記録・管理できます。"
  ctaLocation="signin_page"
/>
```

### 3-4. CalculatorForm の改修

`CalculatorForm` はすでに `"use client"` なので、`usePathname` と `trackEvent` を直接呼ぶ。

**改修箇所: `front/app/(app)/tools/_components/CalculatorForm.tsx`**

```typescript
"use client";

import { usePathname } from "next/navigation";
import { trackEvent } from "@app/utils/gtag";
// ... 既存 import

type Props = {
  fields: CalculatorField[];
  outputs: CalculatorOutput[];
  calculate: (...) => ...;
  nextActions?: NextAction[];
  calculatorStat?: string;  // 追加: "ops" | "obp" | "k-bb" など
};

export default function CalculatorForm({ fields, outputs, calculate, nextActions, calculatorStat }: Props) {
  const pathname = usePathname();
  // ... 既存 state

  const handleCalculate = useCallback(() => {
    // ... 既存ロジック（計算処理）

    // 計算成功時にイベント発火
    if (calculatorStat) {
      trackEvent("calculator_calculate", {
        calculator_stat: calculatorStat,
        source_page: pathname,
      });
    }
  }, [values, fields, outputs, calculate, calculatorStat, pathname]);

  const handleAppStoreClick = () => {
    trackEvent("app_store_click", {
      cta_location: "calculator_result",
      source_page: pathname,
      calculator_stat: calculatorStat,
      has_calculated: true,
    });
  };

  return (
    ...
    {results.length > 0 ? (
      <div className="mt-4 text-center">
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleAppStoreClick}  // 追加
          className="inline-block w-full ..."
        >
          アプリで成績を記録する（無料）
        </a>
      </div>
    ) : null}
    ...
  );
}
```

**各Calculator コンポーネントの変更（例: OpsCalculator.tsx）:**

```typescript
export default function OpsCalculator() {
  return (
    <CalculatorForm
      fields={definition.fields}
      outputs={definition.outputs}
      calculate={definition.calculate}
      nextActions={nextActions}
      calculatorStat="ops"  // 追加
    />
  );
}
```

### 3-5. signup_complete の計測

`SignUp.tsx` の `handleSubmit` は成功時に `router.push("/registration-confirmation")` している。この直前にイベント発火を挿入する。

**改修箇所: `front/app/components/auth/SignUp.tsx`**

```typescript
import { trackEvent } from "@app/utils/gtag";

const handleSubmit = async (event: React.FormEvent) => {
  // ... 既存ロジック
  try {
    await signUp({ ... });
    trackEvent("signup_complete", { signup_method: "email" });  // 追加
    router.push("/registration-confirmation");
  } catch ...
};
```

Googleログイン経由のsignupは `GoogleLoginButton` コンポーネント内に同様の発火処理を追加する。

### 3-6. GTM導入の判断

**結論: GTM は導入しない。**

理由:
- 現状 `layout.tsx` に gtag.js を直書きしており、カスタムイベントの追加も `window.gtag()` 呼び出しで完結する
- GTMを追加するとスクリプトが2重になるリスクがある
- 個人開発の工数制約で、GTMのコンテナ設定・公開フローを維持するコストは不要
- 今回の計測要件はすべて `trackEvent()` util と各コンポーネントの onClick で実装できる

---

## 4. GA4 側の設定

### 4-1. キーイベント（コンバージョン）登録手順

GA4管理画面 > 管理 > イベント > カスタムイベントを作成後、以下を「キーイベントとしてマーク」:

1. `app_store_click`（主KPI: App Store到達 proxy）
2. `signup_complete`（主KPI: Webアカウント登録完了）

### 4-2. カスタムディメンション登録

GA4管理画面 > 管理 > カスタム定義 > カスタムディメンション で以下を登録する。これをしないとイベントパラメータをレポートで絞り込めない。

| ディメンション名 | スコープ | イベントパラメータ名 |
| --- | --- | --- |
| CTA設置場所 | イベント | cta_location |
| 計算指標 | イベント | calculator_stat |
| サインアップ方法 | イベント | signup_method |

### 4-3. Looker Studio / GA4 探索レポートで構築するファネル

#### Web→App 登録ファネル（探索レポート > ファネルデータ探索）

```
ステップ1: セッション開始（session_start）
ステップ2: CTAバナー表示（cta_banner_view）  ← impression率
ステップ3: App Storeクリック（app_store_click）  ← CTA CTR
ステップ4: App Store登録（計測不可、別途Apple Search Ads Console参照）
```

このファネルを cta_location ディメンションでセグメント分割すると「どのCTAが最もApp Store送客に貢献しているか」が可視化できる。

#### 計算ツール→App Store クリック率レポート（GA4 探索 > 自由形式）

- ディメンション: source_page, calculator_stat, cta_location
- 指標: app_store_click（イベント数）, calculator_calculate（イベント数）
- 計算フィールド: app_store_click / calculator_calculate = 計算後クリック率

#### Looker Studio 構築定義（Web→App 登録パフォーマンスダッシュボード）

```
ブロック1: KPIカード
  - 月間 app_store_click 数（前月比）
  - 月間 signup_complete 数（前月比）
  - ページ別 App Store CTR（app_store_click / sessions）

ブロック2: CTA別パフォーマンス（棒グラフ）
  - ディメンション: cta_location
  - 指標: app_store_click数, session数, CTR

ブロック3: ツールページ別 計算→クリックファネル（テーブル）
  - source_page, calculator_calculate, app_store_click, クリック率

ブロック4: 流入元別 App Store クリック（パイチャート）
  - ディメンション: セッションのデフォルトチャネルグループ
  - 指標: app_store_click数
```

---

## 5. Apple Search Ads / `ct=` パラメータの活用案

App Storeクリックの正確なアトリビューションは AppsFlyer/Adjust なしでは困難だが、以下2点は無料で対応できる。

### 5-1. `ct=` キャンペーンパラメータ

App Store URL に `ct=` パラメータを付与することで、Apple Search Ads Console および App Store Connect Analytics でキャンペーン別クリック数・インストール数が分かる。

```typescript
// app/constants/app.ts を改修

export const APP_STORE_BASE_URL = "https://apps.apple.com/jp/app/buzz-base/id6761011816";

export const APP_STORE_URLS = {
  smart_banner:       `${APP_STORE_BASE_URL}?ct=web_smart_banner`,
  hero:               `${APP_STORE_BASE_URL}?ct=web_hero`,
  calculator_result:  `${APP_STORE_BASE_URL}?ct=web_calc_result`,
  cta_banner_top:     `${APP_STORE_BASE_URL}?ct=web_cta_top`,
  cta_banner_bottom:  `${APP_STORE_BASE_URL}?ct=web_cta_bottom`,
  signup_page:        `${APP_STORE_BASE_URL}?ct=web_signup`,
  signin_page:        `${APP_STORE_BASE_URL}?ct=web_signin`,
} as const;

export type CtaLocationKey = keyof typeof APP_STORE_URLS;
```

`AppStoreLinkButton.tsx` と各コンポーネントで `APP_STORE_URL` の代わりに `APP_STORE_URLS[ctaLocation]` を使う。App Store Connect Analytics で「キャンペーン」列を確認するとCTA別のインストール数が分かるようになる。

### 5-2. Apple Search Ads Attribution API

Apple Search Ads を出稿しない場合でも Attribution API（`iAd` フレームワーク後継）はアプリ初回起動時のオーガニック流入元を返す。現在の iOS アプリでこの API を叩いてサーバーに送信すれば、「どのページからApp Storeを開いてインストールしたか」を間接的に追えるが、実装工数が大きいため今フェーズでは非推奨。`ct=` パラメータのみで十分な精度が得られる。

---

## 6. 計測実装後に実行する初回分析プラン

計測が2週間程度まわったタイミング（実装後 2026-05-14 前後）で以下を確認する。

### 仮説1: /tools/ops の App Store CTR 1.2% は「計算未実行ユーザーが多い」ことが原因

- 確認方法: `calculator_calculate` 数 / sessions on /tools/ops = 計算実行率
- 期待値: 計算実行ユーザーの CTR が 10% 超なら「流入後に計算しないで離脱」が問題
- アクション: ページ上部にフォームを移動する、またはデフォルト値を入れておく

### 仮説2: SmartAppBanner は dismiss 率が高く、実質的に邪魔なだけになっている

- 確認方法: `smart_banner_dismiss` 数 / `cta_banner_view`（smart_banner） 数 = dismiss 率
- 期待値: dismiss率が 60% 超なら7日間 → 14日間に延ばすか、表示タイミングを変更
- 対比: SmartBanner CTR（app_store_click with cta_location=smart_banner / views）

### 仮説3: /tools/k-bb の CTR 0 は計算実行率が低いことで説明できる

- 確認方法: `calculator_calculate` where calculator_stat = "k-bb" の数
- 期待値: 計算実行率が ops と同等なら CTA の問題、低ければフォーム UI の問題

### 仮説4: cta_location 別 CTR には 3倍以上の差がある

- 確認方法: `app_store_click` を cta_location でブレイクダウン
- 期待値: calculator_result が最高 CTR（計算直後は動機が最も高い）
- アクション: CTR が最も高い CTA のデザインを他の CTA にも適用する

### 仮説5: オーガニック流入ユーザーの signup_complete 率は 1% 未満

- 確認方法: sessions（google/organic）に対する signup_complete 数の比率
- 期待値: 1% 未満なら「ツールのみ使って離脱」が常態化している証拠
- アクション: 計算結果に「この成績を保存するにはアプリ登録が必要」のコピー追加

---

## 実装工数見積もり（優先順位順）

| 実装項目 | 工数 | 優先度 |
| --- | --- | --- |
| `gtag.ts` util 作成 | 30分 | 最高 |
| `AppStoreLinkButton.tsx` 作成 | 30分 | 最高 |
| `CtaBanner.tsx` 改修（AppStoreLinkButton組み込み） | 30分 | 最高 |
| `SmartAppBanner.tsx` 改修（onClick追加） | 15分 | 最高 |
| `CalculatorForm.tsx` 改修（trackEvent追加、calculatorStat prop追加） | 30分 | 最高 |
| 各Calculator（Ops/Obp/KBB等）に calculatorStat prop 追加 | 30分 | 高 |
| `SignUp.tsx` に signup_complete 発火追加 | 15分 | 高 |
| GA4 カスタムディメンション登録（管理画面操作） | 15分 | 高 |
| GA4 キーイベント登録（管理画面操作） | 10分 | 高 |
| `app/constants/app.ts` に ct= パラメータ対応URL追加 | 20分 | 中 |
| GA4 探索レポート / Looker Studio 構築 | 60分 | 中 |

**合計: 約4〜5時間（1日以内に完結）**

---

## まとめ: 最小実装セット（今日やること）

1. `front/app/utils/gtag.ts` を新規作成
2. `AppStoreLinkButton.tsx` を新規作成（`"use client"` の薄いラッパー）
3. `CtaBanner.tsx` を改修（AppStoreLinkButton + ctaLocation prop）
4. `SmartAppBanner.tsx` を改修（usePathname + onClick + trackEvent）
5. `CalculatorForm.tsx` を改修（handleCalculate内にtrackEvent追加、アプリリンクにonClick追加）
6. `OpsCalculator.tsx` / `KBBCalculator.tsx` / `ObpCalculator.tsx` に `calculatorStat` prop 追加
7. `SignUp.tsx` に `signup_complete` 発火追加
8. GA4管理画面でキーイベント2件登録・カスタムディメンション3件登録

これだけで「どのCTAが何回クリックされたか」「どのツールページで計算が実行されたか」「何人がWebアカウント登録を完了したか」がすべてGA4で可視化できるようになる。
