# Web→アプリ登録ファネル 導線設計・CTA企画

作成日: 2026-04-30

---

## 現状サマリー

| 指標 | 値 |
|------|-----|
| Web総セッション | 1,723/月（mobile 1,358、desktop 365） |
| TOPページ App Store CTR | 11%（健全） |
| /signup ページ App Store CTR | 4%（弱い） |
| 計算ツール系合計PV | 約1,000/月 |
| 計算ツール App Store クリック | 約12件（CTR 1.2%） |
| 主要流入クエリ意図 | アプリ探索（「野球 個人成績 アプリ 無料」357impr/CTR15%） |

### 既実装済みCTA（重複企画を避けるための確認）
- `SmartAppBanner`: 全ページ上部固定（7日localStorage dismiss、Client Component）
- `CtaBanner`: 計算ツールページ上下に2箇所（Server Component、固定文言）
- `CalculatorForm`: 計算結果表示直後にインラインCTAボタンを動的表示
- `apple-itunes-app` meta タグ: iOS Safariネイティブバナー有効化済み

---

## 施策1: SmartAppBanner と iOS Safari Smart App Bannerの重複問題解消

### タイトル
iOS Safariネイティブバナーと自前SmartAppBannerの重複解消

### 背景（なぜ必要か、データ根拠）
- iOS Safariは `<meta name="apple-itunes-app">` を検出すると独自のSmartAppBannerをページ上部に自動表示する
- 現在の実装では自前の `SmartAppBanner`（黒帯バナー）と、iOSネイティブバナーが同時に表示される場合がある
- ネイティブバナーはOSレベルで信頼感が高くCTRも高いが、自前バナーと重なると視覚的に邪魔になりUXを損なう
- mobile PV比率が78%（1,358/1,723）のため、iOS Safariユーザーへの影響が大きい

### 実装内容
- `SmartAppBanner.tsx` の `useEffect` 内に iOS Safari のStandalone判定とUserAgent判定を追加する
- iOSネイティブバナーが表示されている状態（= `navigator.standalone !== true` かつ iOS Safari）では自前バナーを非表示にする
- 代替案: iOS Safari向けには表示せず、Androidブラウザ・デスクトップ Chrome向けにのみ自前バナーを出す

```typescript
// SmartAppBanner.tsx useEffect内に追加するロジック例
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
if (isIOS && isSafari) {
  // iOSネイティブバナーに任せる
  setVisible(false);
  return;
}
```

### 受け入れ条件
- iOS SafariでURLを開いたとき、自前バナーと Apple ネイティブバナーが同時に表示されない
- Android Chrome・デスクトップブラウザでは自前バナーが引き続き表示される
- dismissしたユーザーには7日間非表示のロジックが維持される

### 工数見積もり
0.5日

### 期待効果
- iOS Safariユーザーのバナー領域UX改善
- ネイティブバナーのCTRが自前バナーより高い傾向があるため、アプリDL +3〜5件/月の改善

### 優先度
**A**

---

## 施策2: 計算ツール結果CTAの個別化文言（成績レベル連動）

### タイトル
計算ツール結果CTA文言の個別化（計算値のレベル判定に応じた訴求）

### 背景（なぜ必要か、データ根拠）
- 計算ツール合計CTR 1.2%は低い。現行の `CalculatorForm` 内インラインCTAは「アプリで成績を記録する（無料）」という固定文言
- ユーザーが計算結果を見た直後が最もモチベーションが高い瞬間。このタイミングで計算値を反映した個別化文言を出すことで共感を生みやすい
- 例: OPS .850 → 「OPS .850！高校野球トップレベルの成績。アプリで毎試合の推移を記録しよう」
- 例: 打率.220 → 「打率.220、まだ伸びしろあり。アプリで試合ごとの成績を記録して改善しよう」
- guide（レベル判定テーブル）が `calculator-definitions.ts` に既に定義されているため、実装コストが低い

### 実装内容

**`CalculatorForm.tsx` の変更**:
- `results` に加えて `levelLabel`（guide配列からマッチしたdescription）を導出する
- インラインCTA部分に `levelLabel` と計算値（`results[0].value`）を組み合わせた文言を生成する
- 文言生成ロジックは `CalculatorForm` に直接書かず、`getCtaMessage(slug, value, levelLabel)` のようなユーティリティ関数に切り出す
- 既存の `CtaBanner`（ページ上下の静的バナー）とは別レイヤーで管理する

**文言テンプレート案（各ツール）**:
```
OPS計算:    "OPS {value}（{level}）。アプリで毎試合の推移グラフを確認しよう"
打率計算:   "打率{value}（{level}）。試合ごとに入力してシーズン通算を自動集計"
防御率計算: "防御率{value}（{level}）。アプリで自責点・投球回を記録して推移を管理"
K/BB計算:   "K/BB{value}（{level}）。制球力の推移をアプリで見える化しよう"
```

**`data-cta` 属性の追加**（施策6と連携）:
```tsx
<a
  href={APP_STORE_URL}
  data-cta={`calculator_result_${slug}`}
  ...
>
```

### 受け入れ条件
- 計算実行後、結果値とレベル説明を組み合わせたCTA文言が表示される
- guide定義のないツール・マッチしないレベルの場合はフォールバック文言が表示される
- `data-cta` 属性がCTAボタンに付与されている

### 工数見積もり
1日（文言定義含む）

### 期待効果
- 計算ツールCTR 1.2% → 3%への改善（+20件/月）

### 優先度
**S**（最高インパクト・低工数）

---

## 施策3: /tools/k-bb のCTA計測欠落の原因究明

### タイトル
/tools/k-bb のApp Storeクリック「0件」の原因調査

### 背景（なぜ必要か、データ根拠）
- 「/tools/k-bb のApp Storeクリックが0件（CTR 0%）」と報告されているが、コードを確認した結果、以下が判明している
  - `KBBCalculator.tsx` は他ツールと同様に `CalculatorForm` を使用しており、結果表示後のインラインCTA表示ロジックは存在する
  - `calculator-definitions.ts` の k-bb エントリには `cta` フィールドが定義されており、`CalculatorPageContent` 経由の `CtaBanner` も表示されている
  - 構造上、CTAが「欠落している」ことはなく、**トラッキングタグ（`data-cta`）が全CTAに未付与**のため、計測できていない可能性が高い
- ただし、以下の可能性も排除できない
  - ページPV自体が少なく、計算実行まで到達しているユーザーが極めて少ない（直帰率50%）
  - `calculate` 関数に `walks === 0` の場合 `null` を返すロジックがあり、「与四球0」と入力したユーザーでエラーが出て離脱している

### 実装内容（調査タスク）
1. GA4 または Search Console でk-bbページの実際の流入クエリとPVを確認
2. 全CTAに `data-cta` 属性を付与してクリック計測を開始（施策6と同時実施）
3. 「与四球=0」入力時のエラー文言を「与四球が0の場合K/BBは計算できません（∞扱い）」と明示的に変更する

### 受け入れ条件
- k-bbページの App Store クリックが GA4 または類似ツールで計測できるようになっている
- 与四球0入力時にユーザーが理解できるエラーメッセージが表示される

### 工数見積もり
0.5日（調査）+ 0.5日（エラー文言修正）= 1日

### 期待効果
- 問題の正確な把握により適切な改善施策の立案が可能に
- エラー文言改善で計算完了率が向上 → CTA表示機会増加

### 優先度
**A**

---

## 施策4: /signup ページのアプリ誘導強化

### タイトル
/signup ページのアプリ優先誘導UI追加（Web登録完了後DL促進 + 登録前アプリ提案）

### 背景（なぜ必要か、データ根拠）
- /signup ページのApp Store CTR が 4%（月150PV × 4% = 月6件のクリック）
- 現在の実装: `CtaBanner` がSignUpフォームの下に1つあるだけ（body文言が「アプリならもっと便利に成績を記録・管理できます。」と弱い）
- 「野球 個人成績 アプリ 無料」で検索して着地したユーザーはアプリへの関心が高いが、Web登録フォームを見て迷っている可能性がある
- 戦略的論点: Web登録完了後にアプリDLを促す「Web登録→アプリDL誘導」と、「最初からアプリへ誘導」のどちらが効果的か

**戦略判断: 両方実施する（段階的アプローチ）**
- フォーム上部に「iPhoneをお使いの方はアプリから登録がおすすめ」という軽量なバナーを追加（アプリ優先の選択肢を提示）
- Web登録完了後の成功画面（またはトースト）でアプリDLへの導線を追加

### 実装内容

**A. 登録フォーム上部にアプリ優先バナー（Server Component）**:
- `/signup/page.tsx` の SignUpフォームの上に小さいバナーを追加
- 文言案: 「iPhoneユーザーはアプリからの登録がスムーズです（30秒・完全無料）」
- App Store リンク付きのシンプルなボックス（CtaBannerより軽量）

**B. 登録完了後アプリDL誘導（既存SignUpコンポーネントの拡張）**:
- `SignUp` コンポーネントの登録成功時のコールバック後にアプリDLモーダルまたはページ遷移を追加
- または `/signup/complete` ページを新設して登録完了後にリダイレクト

```
/signup/complete/page.tsx:
  - 「登録完了！」メッセージ
  - App Store ダウンロードボタン（大きく）
  - 「Webで続ける」リンク（小さく）
```

### 受け入れ条件
- /signup ページにアプリ優先誘導バナーが表示されている
- Web登録完了後にアプリDLを促す画面またはモーダルが表示される
- 「Webで続ける」の導線が残っており、Web登録フローが完全に壊れない

### 工数見積もり
- A（フォーム上部バナー）: 0.5日
- B（登録完了後誘導）: 1.5日
- 合計: 2日

### 期待効果
- /signup CTR 4% → 15%への改善（月150PV → +17件/月）

### 優先度
**A**（登録意向の高いユーザーへのラストマイル施策）

---

## 施策5: 未実装計算ツール・ナレッジ記事の追加（SEO流入拡大）

### タイトル
Search Console上位クエリに対応する計算ツール・記事ページの新規作成

### 背景（なぜ必要か、データ根拠）
- 「野球 個人成績 アプリ 無料」(357impr / CTR 15%)など、アプリ探索クエリで上位表示できている
- 「長打率 計算」「k/bb 野球」「自責点 失点 違い」などの検索クエリは計算ツールとナレッジ記事の両方で攻略可能
- 既存の計算ツールが11種あり、関連するコンテンツを増やすことでサイト全体のトピカルオーソリティを高められる
- 計算ツールは `calculator-definitions.ts` にエントリを追加するだけで実装できるため工数が低い

### 実装内容

**A. 未実装の可能性が高い計算ツール候補**:
| ツール名 | 検索クエリ | 既存状況 |
|---------|-----------|--------|
| FIP計算ツール | 「FIP 野球 計算」 | 未実装 |
| BB/9計算ツール | 「BB/9 計算」 | 未実装 |
| RC（得点創出）計算ツール | 「RC 野球 計算」 | 未実装 |
| 盗塁成功率計算ツール | 「盗塁成功率 計算」 | 未実装 |

**B. 記事コンテンツ候補（`/column/` 配下）**:
| 記事タイトル | 検索クエリ | 期待PV |
|------------|-----------|------|
| 「自責点と失点の違いを徹底解説」 | 「自責点 失点 違い」 | 月200〜500PV |
| 「野球の個人成績管理アプリ徹底比較2026」 | 「野球成績 アプリ 比較」 | 月300〜800PV |
| 「高校野球の成績管理ノートアプリ おすすめ」 | 「野球 記録 アプリ」 | 月200〜500PV |
| 「OPS・wOBA・FIPまとめ：セイバーメトリクス入門」 | 「セイバーメトリクス 野球 指標」 | 月100〜300PV |

**「野球の個人成績管理アプリ徹底比較」記事の戦略的価値**:
- 比較記事はトランザクショナル検索（アプリをDLする直前の検索）に応答できる
- BUZZ BASEを筆頭に比較しつつ、機能面の優位性を訴求できる
- アプリへの直接誘導CTAを記事内に組み込める

### 受け入れ条件
- 計算ツール: 新規ツールページが `/tools/{slug}` で公開され、sitemap.xmlに追加されている
- 記事: `/column/` 配下に新規ページが公開されており、構造化データ（Article）が付与されている
- 各ページにCtaBannerが配置されている

### 工数見積もり
- 計算ツール1本: 0.5日（定義追加 + ページ作成）
- 記事1本: 1〜2日（本文執筆 + 実装）
- 優先4本分: 5〜8日

### 期待効果
- SEO流入増加で月+200〜500PV（3ヶ月後）→ アプリDL +5〜15件/月

### 優先度
**B**（中期施策、SEOは時間がかかる）

---

## 施策6: ランキングWebプレビューページ（未ログインユーザー向け）

### タイトル
グループランキングのWebプレビュー機能（未登録ユーザーへのデモ表示）

### 背景（なぜ必要か、データ根拠）
- `/groups/[slug]/page.tsx` は `useRequireAuth()` で認証必須となっており、未ログインユーザーはランキングを一切見られない
- `/mypage/[slug]/page.tsx` も未ログイン時は「成績・試合情報を閲覧するにはログインが必要です」とオーバーレイ表示
- 「自分も載りたい」「チームランキングを見てみたい」というFOMO（機会損失恐怖）を未登録者に感じさせる導線がない
- Webからアプリ登録へのファネルで最も欠けているのは「サービスの価値を体験させるステップ」

### 実装内容

**A. ランキングデモページ `/ranking/demo` の新規作成（Server Component）**:
- モックデータを使ったランキングテーブルを表示（実データ不使用）
- 打撃・投手ランキングをタブ切り替えで表示
- 表のいくつかのセルをぼかし処理（CSS blur）して「続きを見るにはアプリ登録が必要」と訴求
- ページ下部に大きなApp Store CTAバナー

**B. `/mypage/[slug]` の未ログイン時表示改善**:
- 現在のオーバーレイ上にApp Storeへの誘導を追加
- 「このユーザーの成績を見るにはアプリ登録が必要です」→「アプリで無料登録 →」ボタン

**モックデータ設計**:
```typescript
// app/(app)/ranking/demo/_data/mock-ranking.ts
const mockBattingRanking = [
  { rank: 1, name: "田中 一郎", team: "〇〇高校", battingAverage: ".380", hits: 19 },
  { rank: 2, name: "鈴木 二郎", team: "△△中学", battingAverage: ".340", hits: 17 },
  // ... 5〜8件
];
```

### 受け入れ条件
- `/ranking/demo` ページが未ログインユーザーでもアクセスできる
- ランキングの一部（上位3件程度）は表示され、残りはブラー/マスク処理
- App Store CTAが目立つ位置に配置されている
- `/mypage/[slug]` の未ログイン時にApp Store誘導ボタンが表示される

### 工数見積もり
- Aデモページ: 2日
- B mypage改善: 0.5日
- 合計: 2.5日

### 期待効果
- サービス価値の可視化によりアプリDL +5〜10件/月（3ヶ月後）

### 優先度
**B**（インパクトは大きいが実装量も多い）

---

## 施策7: 全CTAへの `data-cta` 属性付与規約の策定と実施

### タイトル
CTA計測規約（`data-cta` 属性統一）の策定と全CTAへの適用

### 背景（なぜ必要か、データ根拠）
- 現状、どのCTAが何件クリックされているか計測できていない
- 計算ツール全体でApp Storeクリック12件/月と分かっているが、どのツールのどのCTA（インラインか静的バナーか）からのクリックか不明
- /tools/k-bb の「クリック0件」も、計測できていないだけで実際はクリックされている可能性がある
- 施策の効果測定ができなければPDCAが回せない

### 実装内容

**命名規約**:
```
data-cta="{場所}_{コンテキスト}"

例:
  data-cta="smart_banner_top"                  // SmartAppBannerのApp Storeリンク
  data-cta="cta_banner_calculator_batting-average"  // 打率ページのCtaBanner（上）
  data-cta="calculator_result_ops"              // OPS計算結果直後のインラインCTA
  data-cta="signup_page_top_banner"             // signupページ上部バナー
  data-cta="signup_complete_main"               // 登録完了ページメインCTA
  data-cta="ranking_demo_bottom"                // ランキングデモページCTA
  data-cta="mypage_unauthenticated"             // mypageの未ログインCTA
```

**対象ファイルと変更箇所**:
| ファイル | 変更箇所 |
|---------|---------|
| `SmartAppBanner.tsx` | App Storeリンクの `<a>` タグ |
| `CtaBanner.tsx` | App Storeリンクの `<a>` タグ（`ctaId` propを追加） |
| `CalculatorForm.tsx` | インラインCTAの `<a>` タグ（`slug` propを追加） |
| `/signup/page.tsx` | 新設バナーのリンク |
| 将来実装のページ | 都度適用 |

**`CtaBanner.tsx` の型定義変更**:
```typescript
type Props = {
  heading?: string;
  body: string;
  className?: string;
  ctaId: string;  // 追加（必須化）
};
```

### 受け入れ条件
- 全てのApp StoreリンクにURL以外で識別可能な `data-cta` 属性が付与されている
- GA4 または類似ツールのカスタムイベントでclickイベントを計測できる
- CTAId命名規約がこのドキュメントに記載されており、新規実装時に参照できる

### 工数見積もり
0.5日（既存ファイルの属性追加のみ）

### 期待効果
- 計測基盤の整備により、以降の施策のA/Bテストと効果測定が可能になる
- 間接的にアプリDL +X件（施策の最適化を通じて）

### 優先度
**S**（他の施策の前提条件。最初に実施すべき）

---

## 実装優先度サマリー

| 優先度 | 施策 | 工数 | 期待DL増（/月） |
|--------|------|------|---------------|
| S | 施策7: data-cta属性規約と適用 | 0.5日 | 計測基盤（間接効果） |
| S | 施策2: 計算結果CTA文言個別化 | 1日 | +20件 |
| A | 施策1: SmartAppBanner重複解消 | 0.5日 | +3〜5件 |
| A | 施策3: k-bb CTA計測調査 | 1日 | 計測精度向上 |
| A | 施策4: /signup アプリ誘導強化 | 2日 | +17件 |
| B | 施策5: 未実装ツール・記事追加 | 5〜8日 | +5〜15件（3ヶ月後） |
| B | 施策6: ランキングWebプレビュー | 2.5日 | +5〜10件（3ヶ月後） |

### 推奨実施順序
1. 施策7（data-cta規約）→ 計測基盤を先に整える
2. 施策2（計算結果CTA個別化）→ 既存トラフィックへの即効性
3. 施策4（signup誘導強化）→ 登録意向ユーザーへのラストマイル
4. 施策1（SmartAppBanner重複解消）→ UX改善
5. 施策3（k-bb調査）→ 施策7と同時実施可
6. 施策5 / 施策6 → 中期でPDCAしながら

---

## GitHub Issue 起票案

以下5本のIssueを起票する。

---

### Issue 1: [Add] 全CTAにdata-cta属性を付与してApp Storeクリックを計測できるようにする

**本文**:

#### 背景
計算ツール全体のApp Storeクリックが月12件と分かっているが、どのページのどのCTAからのクリックかが計測できていない。施策の効果測定・改善のためにCTAクリックの計測基盤を整備する。

#### タスク

**命名規約**
`data-cta="{場所}_{コンテキスト}"` の形式で統一する。

例:
- `data-cta="smart_banner_top"` — SmartAppBanner
- `data-cta="cta_banner_{slug}"` — CtaBannerのツール別
- `data-cta="calculator_result_{slug}"` — 計算結果直後のインラインCTA

**変更対象ファイル**
- `front/app/(app)/_components/SmartAppBanner.tsx`: App Storeリンク `<a>` に `data-cta="smart_banner_top"` 追加
- `front/app/(app)/_components/CtaBanner.tsx`: `ctaId: string` propを追加（必須）し、リンクに `data-cta={ctaId}` を付与
- `front/app/(app)/tools/_components/CalculatorForm.tsx`: `slug: string` propを追加し、インラインCTAに `data-cta={`calculator_result_${slug}`}` を付与
- `CtaBanner` の呼び出し元（`CalculatorPageContent.tsx` 等）に `ctaId` を渡す修正

#### 受け入れ条件
- [ ] 全てのApp StoreリンクにURL以外で識別可能な `data-cta` 属性が付与されている
- [ ] `CtaBanner` に `ctaId` propが追加され、呼び出し元で指定されている
- [ ] `CalculatorForm` に `slug` propが追加されている

#### 工数見積もり
0.5日

---

### Issue 2: [Add] 計算ツールの結果CTA文言を計算値とレベルに応じて個別化する

**本文**:

#### 背景
計算ツール全体のApp Store CTRが1.2%と低い。計算完了直後が最もユーザーのモチベーションが高い瞬間であるにもかかわらず、現行のインラインCTA（`CalculatorForm.tsx` 内）は「アプリで成績を記録する（無料）」という固定文言のみ。計算結果の値とレベル判定（guide配列）を組み合わせた個別化文言に変更することで、共感を生みCTRを高める。

#### 実装内容

1. `CalculatorForm` のpropsに `slug: string` を追加する（施策7のIssue 1と同時実施）
2. `calculator-definitions.ts` の `guide` 配列から計算値に対応する `description` を導出するユーティリティ関数 `getStatLevel(guide, value)` を `app/utils/getStatLevel.ts` に作成する
3. `CalculatorForm.tsx` の計算結果表示後のインラインCTA文言を、`{results[0].value}（{levelDescription}）アプリで毎試合の推移を記録しよう` 形式に変更する
4. guide定義がないツールやマッチしない値の場合は既存の固定文言にフォールバックする

#### 受け入れ条件
- [ ] 計算実行後、計算値とレベル説明を組み合わせたCTA文言が表示される
- [ ] guide定義のないツールでフォールバック文言が表示される
- [ ] `data-cta` 属性がCTAボタンに付与されている（Issue 1と連携）
- [ ] TypeScriptの型エラーがない

#### 工数見積もり
1日

---

### Issue 3: [Fix] /tools/k-bb のApp Storeクリック計測ゼロの原因調査と修正

**本文**:

#### 背景
`/tools/k-bb` のApp Storeクリックが「0件」と報告されているが、コードを確認すると `KBBCalculator.tsx` は他ツールと同様に `CalculatorForm` を使用しており、CTAの実装漏れはないと思われる。原因を特定して修正する。

#### 調査項目

1. **計測問題の可能性**: 全CTAに `data-cta` 属性が未付与のため、k-bb含む全ツールのクリックが正確に計測できていない可能性がある。Issue 1の実施後に再計測する
2. **エラーによる離脱の可能性**: `calculate` 関数に `walks === 0` で `null` を返すロジックがあり、「与四球=0」と入力したユーザーが「入力値が正しくありません」エラーで計算完了できず離脱している可能性がある
3. **PVの少なさ**: 直帰率50%で実際に計算を実行しているユーザーが極めて少ない可能性がある

#### タスク
- [ ] GA4またはSCで/tools/k-bbの実際のPVと流入クエリを確認する
- [ ] 「与四球=0」入力時のエラーメッセージを `"与四球が0の場合K/BBは∞（計算不能）です。1以上を入力してください"` に変更する（`calculator-definitions.ts` の k-bb エントリのバリデーションメッセージを改善するか、`CalculatorForm.tsx` のエラー文言を動的化する）
- [ ] Issue 1（data-cta属性付与）実施後に計測を開始する

#### 受け入れ条件
- [ ] 与四球=0入力時に分かりやすいエラーメッセージが表示される
- [ ] Issue 1実施後にk-bbのクリックが計測できる状態になっている

#### 工数見積もり
1日（調査0.5日 + エラー文言修正0.5日）

---

### Issue 4: [Add] /signup ページにアプリ優先誘導バナーと登録完了後アプリDL促進画面を追加する

**本文**:

#### 背景
`/signup` ページのApp Store CTRが4%（月6件程度）と低い。「野球 個人成績 アプリ 無料」で検索して流入しているユーザーはアプリへの関心が高いが、Webの会員登録フォームに着地してしまい、アプリDLへの誘導が弱い。

#### 実装内容

**A. 登録フォーム上部にアプリ優先提案バナーを追加**
- `front/app/(app)/signup/page.tsx` の SignUpコンポーネントの上部にバナーを追加
- Server Component として実装（`_components/AppSuggestionBanner.tsx`）
- 文言: 「iPhoneユーザーはアプリからの登録がスムーズです（30秒・完全無料）」
- App Storeバッジリンク付き
- `data-cta="signup_page_app_suggestion"` を付与

**B. 登録完了後アプリDL誘導ページ `/signup/complete` を新設**
- 登録成功後に `/signup/complete` へリダイレクト
- App Store CTAを大きく表示し、「Webで続ける」を小リンクとして配置
- `data-cta="signup_complete_main"` を付与

#### 受け入れ条件
- [ ] /signup ページのSignUpフォーム上部にアプリ提案バナーが表示される
- [ ] Web登録完了後に /signup/complete へ遷移し、App Store CTAが表示される
- [ ] 「Webで続ける」リンクからトップページ（または/mypage）に戻れる
- [ ] Webフォームでの登録フローが壊れていない

#### 工数見積もり
2日（バナー0.5日 + complete画面1.5日）

---

### Issue 5: [Add] ランキングのWebデモページ `/ranking/demo` を新規作成する（未ログインユーザー向け）

**本文**:

#### 背景
`/groups/[slug]` と `/mypage/[slug]` は認証必須のため、未ログインユーザーはランキングを一切見られない。サービスの価値を体験できないまま離脱しているユーザーが多い。モックデータを使ったデモページを作ることで、「自分も載りたい」というFOMO（機会損失恐怖）を訴求し、アプリ登録への動機を生む。

#### 実装内容
- `front/app/(app)/ranking/demo/page.tsx` を新規作成（Server Component）
- `_data/mock-ranking.ts` にモックデータを定義（実ユーザーデータは使用しない）
  - 打撃ランキング: 打率・本塁打・打点・安打・盗塁・出塁率の各上位5件
  - 投手ランキング: 防御率・勝利・奪三振の各上位5件
- ランキングテーブルの上位3件は表示し、4位以降をぼかし（TailwindCSS `blur-sm`）
- ページ下部にApp Store CTAを大きく配置（`data-cta="ranking_demo_bottom"`）
- 「これはデモ表示です。実際のランキングはアプリ内で確認できます」という注記を入れる
- 構造化データ（WebPage）を付与
- `/mypage/[slug]` の未ログイン時オーバーレイにApp Storeリンクボタンを追加

#### 受け入れ条件
- [ ] `/ranking/demo` が未ログインユーザーでもアクセスできる
- [ ] モックデータによるランキングが表示され、4位以降がぼかし表示
- [ ] App Store CTAが目立つ位置に配置されている
- [ ] モックデータであることが明記されている
- [ ] `/mypage/[slug]` の未ログイン時にApp Storeリンクが表示される

#### 工数見積もり
2.5日

