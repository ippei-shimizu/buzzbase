# Web → iOSアプリ登録数 統合マスタープラン (2026-04)

作成日: 2026-04-30
作成者: 戦略リーダー (BUZZ BASE Revenue Strategy Lead)
対象期間: 2026-05〜2026-07 (3ヶ月) / 中期目標: 2026-10末
目的: **Webからの流入を起点に、iOSアプリの月間新規登録数を最大化する**

---

## 0. 本ドキュメントの位置づけ

- 4/2公開の前回統合レポート [`ios-app-download-growth-integrated-202604.md`](./ios-app-download-growth-integrated-202604.md) で打ち出した「SmartAppBanner / CalculatorFormCTA / App Storeメタデータ最適化」は **すべて実装済み**。
- それでも月間DLが想定より伸びていないため、本マスタープランで **次の打ち手** に踏み込む。
- 並行で3エージェント（analytics-analyst / product-planner / growth-marketing）が個別の領域別プランを作成中。本ドキュメントはそれらを統合する **上位戦略**。
  - 各エージェントの出力ファイル（後追い統合）:
    - `docs/strategy/measurement-plan-web-to-app-202604.md`
    - `docs/strategy/product/web-to-app-conversion-202604.md`
    - `docs/strategy/marketing/web-traffic-to-app-202604.md`
- 独立してこのマスタープランだけを読んでも、5月の最初の2週間で何をやるかが分かる構造になっている。

---

## 1. 現状サマリー (2026-04-01〜2026-04-29)

### 数字
| 指標 | 値 | 備考 |
|------|----|------|
| 総アクティブユーザー | 1,162 | 前年同月比 +約40% |
| セッション | 1,723 | |
| 新規率 | 94.6% | リピート率の低さが課題 |
| App Store発信クリック | 約85件/月 | 粗いproxy指標、CV未設定 |
| TOPページ App Store CTR | 11% | 健全 |
| tools系 App Store CTR | 1〜3% | **要改善** |
| /tools/k-bb CTA CTR | 0% | **CTA不具合の疑い** |
| SC quick-wins ポテンシャル | +700クリック | タイトル・ディスクリプション最適化 |

### 流入構成
- Google 50% / Yahoo 22% / Direct 17% / Bing 9% / SNS 0.3%
- AI検索（ChatGPT, Perplexity, Gemini）からの流入が **4月に出始めた**（新シグナル）

### 構造的課題（仮説）
1. **計測の盲点**: 「Webクリック → App Store表示 → DL → アカウント作成」の各ファネルが断絶している。
2. **tools系のCTA設計**: TOPは11%出ているのに、tools系が1〜3%。**ユーザー文脈に合っていない可能性**。
3. **/tools/k-bb のCTA 0%**: 計測バグ or CTA表示バグの可能性。即調査すべき。
4. **SNS 0.3%の異常値**: ターゲット中高生は X/Instagram/TikTok中心のはず。**未開拓チャネル**。
5. **AI検索流入**: 新しい上流。LLMが拾いやすい構造化コンテンツへの先行投資価値あり。

---

## 2. North Star Metric と KPIツリー

### North Star Metric (NSM)
**月間アプリ新規登録数（推定）**

直接計測は困難なので、以下のproxy指標の組み合わせで推定する:
- App Store Connect Analytics の「Page Views」「First-Time Downloads」（月次）
- Webからの App Store発信クリック数 × 推定DL率 × 推定登録率

### KPIツリー

```
[NSM] 月間アプリ新規登録数（推定）
  │
  ├── [L1-A] Web → App Storeクリック数   ← 我々が直接コントロールできる主戦場
  │     │
  │     ├── [L2-A1] SEO流入セッション数
  │     │     ├── [L3] 表示回数（インプレッション）
  │     │     ├── [L3] 検索順位
  │     │     └── [L3] SEO CTR（タイトル・ディスクリプション）
  │     │
  │     ├── [L2-A2] tools系ページ → CTAクリック率（現状 1〜3% / 目標 5〜8%）
  │     │     ├── [L3] CTA表示位置（結果直後 / フッター / SmartAppBanner）
  │     │     ├── [L3] CTAコピー（結果値の動的表示）
  │     │     └── [L3] CTA表示率（現状 /tools/k-bb で 0% の不具合疑い）
  │     │
  │     ├── [L2-A3] / (TOP) → CTAクリック率（現状 11% / 維持）
  │     │
  │     ├── [L2-A4] /signup → app_store_click 率（ほぼ未計測）
  │     │     └── [L3] Web会員登録完了画面でアプリDL誘導
  │     │
  │     └── [L2-A5] SNS / AI検索 流入セッション数（新規開拓）
  │           ├── [L3] X 公式アカウント運用
  │           └── [L3] LLM最適化（FAQ / 構造化データ）
  │
  ├── [L1-B] App Storeページ → DL率
  │     │
  │     ├── [L2-B1] App Storeメタデータ（実装済み、継続テスト）
  │     ├── [L2-B2] スクリーンショット A/B（未着手）
  │     └── [L2-B3] レビュー数（現状少 / 目標 25件@7月末）
  │
  └── [L1-C] DL → アカウント作成率
        │
        ├── [L2-C1] アプリ初回起動の摩擦（オンボーディング）
        └── [L2-C2] サインアップフォームの離脱率
```

### KPI担当領域マッピング
| KPI階層 | 主担当エージェント |
|---------|------------------|
| L1-A 全体 | growth-marketing + product-planner |
| L2-A1 SEO流入 | growth-marketing |
| L2-A2 tools系CTA | product-planner |
| L2-A4 /signup→app誘導 | product-planner |
| L2-A5 SNS / AI検索 | growth-marketing |
| L1-B App Store | growth-marketing (ASO) |
| 全KPI 計測実装 | analytics-analyst |

---

## 3. 3ヶ月実行ロードマップ

> **大原則**: 週10〜15時間の個人開発工数。**5月は「計測 × 不具合修正 × Quick Win」に全振り**。新機能開発は6月後半以降。

### 5月（計測整備 + 漏れバケツの穴塞ぎ）目標DL: +60〜80
**目玉施策3つ**
1. **GA4ファネル計測の本格実装**（analytics-analyst のプランに従う）
   - `app_store_click` イベントを全CTAで統一
   - tools系ページ別のCTRをセグメント計測
   - /signup 完了後の `app_store_click` をクロスセル指標化
2. **/tools/k-bb のCTA不具合調査・修正**
   - 計測実装の最初のチェックで原因特定（CTA非表示 or イベント未発火）
   - 同型バグが他tools系に潜んでいないかも横断確認
3. **SC quick-win タイトル・ディスクリプション最適化**（+700クリック相当のポテンシャル回収）
   - 既存記事のmetaタグだけ書き換え、新規執筆は最小限

**何を捨てるか**
- アプリ側の新機能開発（招待URL、シェア機能）→ 6月後半以降に延期
- AdMob導入 → 7月以降（DLが伸びる前にマネタイズしても意味が薄い）
- Instagram運用 → 7月以降（X一本に集中）

**5月の最初の2週間で具体的にやること**
| 日付目安 | タスク | 工数 | 担当領域 |
|---------|------|------|---------|
| 5/1〜5/3 | analytics-analyst の計測プランをレビュー、`app_store_click` を全CTAに実装 | 半日〜1日 | analytics |
| 5/4 | GA4 デバッグビューで全CTAのイベント発火確認 | 1時間 | analytics |
| 5/4〜5/5 | /tools/k-bb の CTA表示状況を実機確認、原因特定 | 1〜2時間 | product |
| 5/5 | /tools/k-bb 修正リリース | 1〜2時間 | product |
| 5/6〜5/8 | SC quick-win 記事10件のmetaタグ書き換え | 半日 | growth-marketing |
| 5/9〜5/10 | tools系CTAのABテスト準備（コピー2案を用意） | 半日 | product |
| 5/11〜5/14 | tools系CTA ABテスト開始（最低7日回す） | 30分/日モニタリング | product + analytics |

### 6月（CTA最適化 + SNS本格運用）目標DL: +100〜130
**目玉施策3つ**
1. **tools系CTA最適化（5月のABテスト結果を反映）**
   - 勝ちパターンを全tools系に横展開
   - 結果値の動的表示・スクリーンショット差し込み等
2. **X 公式アカウントの本格運用**
   - 週3〜5投稿、成績Tips系コンテンツ
   - 計算ツールの結果シェアテンプレを提供（バイラル設計）
3. **/signup 完了後のアプリ誘導画面追加**
   - Web登録ユーザー（月170人）への確実なDL誘導
   - 「アプリでこの成績の推移をグラフで見よう」訴求

**何を捨てるか**
- 新規SEO記事の量産は止める（5月のSC最適化で十分な伸びがあれば）
- Instagram / TikTok は7月以降
- グループ招待URL機能は6月後半に着手 → リリースは7月

### 7月（夏の大会シーズン × 拡大）目標DL: +150〜200
**目玉施策3つ**
1. **グループ招待URL機能リリース**（チーム単位での口コミ普及）
2. **App Storeスクリーンショット ABテスト**（DL率改善）
3. **AI検索（LLM）最適化**
   - 「中学野球 OPS とは」等のクエリでLLMに引用される構造化コンテンツ
   - FAQ schema、明確な定義文、引用しやすい段落構成

**何を捨てるか**
- 新たな計算ツール追加は8月以降
- AdMob は8月（DLベースが整ってから）

---

## 4. 優先度マトリクス（効果 × 工数）

> 効果は「月間DL推定 +X」、工数は実装〜検証まで。

| 工数↓ / 効果→ | 高 (+50DL/月以上) | 中 (+15〜50DL/月) | 低 (+15DL未満) |
|---------------|-------------------|-------------------|----------------|
| **30分** | **[QW] /tools/k-bb CTA不具合修正** | SmartAppBannerの dismiss仕様の `app-argument` 調整 | TOPページ CTA文言微調整 |
| **半日** | **[QW] GA4 `app_store_click` 統一実装**, **[QW] SC quick-win メタタグ最適化10記事** | tools系CTAコピーABテスト準備 | App Storeリンクに UTM 付与 |
| **1日** | **tools系CTA ABテスト本実装** | /signup完了画面のアプリ誘導 | Xアカウント開設・初期投稿 |
| **数日** | **tools系CTAの結果値動的表示** | スクリーンショット差し替え | LLM向けFAQ schema実装 |
| **週単位** | グループ招待URL機能 | アプリ初回オンボーディング改善 | TikTok運用 |

**Quick Win (QW) の実行順序（5月最初の2週間で全部やる）**
1. /tools/k-bb CTA不具合修正（30分、効果: 単独で +5〜15DL/月、副次的に他tools系の同型バグ発見の可能性）
2. GA4 `app_store_click` 統一実装（半日、効果: ここから全施策の効果計測が可能になるので**全施策の前提**）
3. SC quick-win メタタグ最適化10記事（半日、効果: 月+700クリックの一部回収で +20〜40DL/月）

---

## 5. PDCAサイクル設計

### 週次レビュー指標（最大5つ）
1. **Web → App Storeクリック数**（前週比）
2. **tools系ページ別 CTR**（特に /tools/k-bb と OPS計算）
3. **SEO流入セッション数**（Google + Yahoo + Bing）
4. **/signup 完了後の `app_store_click` 率**
5. **App Store Connect の First-Time Downloads**（取得可能な場合のみ）

毎週月曜の朝30分でGA4 + Search Console + ASCを横断チェック。

### 月次レビュー指標
- 上記5指標 + 以下を追加
  - 月間アプリ新規登録数（推定）
  - X 公式アカウントのインプレッション・フォロワー増加数
  - レビュー獲得数
  - AI検索流入の有無・量
- 月初に前月の結果サマリーを `docs/strategy/pdca/` 配下にレポート化。

### 計測実装後 最初のCheckポイント（5月中旬目安）
**成功基準**:
- 全CTAの `app_store_click` が GA4 デバッグビューで発火確認できている
- tools系ページ別のCTRが計測できている
- /tools/k-bb のCTAが正常動作している（CTR > 0%）
- /signup → app_store_click の遷移率が初めて可視化できている

これが達成されていれば、5月後半〜6月のCTA最適化施策に進めるGOサイン。

### Plan-Do-Check-Actサイクル運用
| フェーズ | 実施タイミング | 所要時間 |
|---------|--------------|---------|
| Plan | 月初 | 半日 |
| Do | 月中 | 通常実装 |
| Check | 毎週月曜 + 月末 | 30分/週 + 1時間/月 |
| Act | 月末 | 1時間 |

---

## 6. KPI目標値

| 指標 | 4月実績 | 5月末 | 6月末 | 7月末 | 10月末 |
|------|--------|-------|-------|-------|--------|
| 月間アプリDL推定 | ~50 | 110 | 230 | 400 | 800 |
| App Storeクリック数 | 85 | 200 | 400 | 650 | 1,200 |
| Webセッション数 | 1,723 | 2,000 | 2,400 | 3,000 | 4,500 |
| SEO流入CTR（平均） | 1.8% | 2.5% | 3.2% | 3.8% | 4.5% |
| tools系→CTAクリック率 | 1〜3% | 4% | 6% | 8% | 10% |
| TOP→CTAクリック率 | 11% | 11% | 12% | 13% | 14% |
| Xフォロワー | 0 | 30 | 100 | 250 | 700 |
| App Storeレビュー | 0 | 5 | 15 | 30 | 60 |

**計算根拠**
- 5月: tools系CTA改善 + SC quick-win = +60〜80DL想定 → 累積110
- 6月: SNS流入立ち上がり + signup後誘導 = +100〜130DL想定 → 累積230
- 7月: 招待URL + 大会シーズン = +150〜200DL想定 → 累積400（ただし夏は中高生が大会で忙しいので登録は鈍化リスクあり、保守側に倒した数字）
- 10月: 新チーム始動シーズン × 累積効果 = 月800（中学新チーム8月、高校新チーム7月のため、10月は安定期）

---

## 7. リスクと緩和策

### R1. SmartAppBanner の dismiss後7日間表示されない仕様
- **影響**: 一度閉じたユーザーには再露出のチャンスがない。リピーター（5%程度）には効かない。
- **緩和策**:
  - SmartAppBannerに**過度に依存しない設計**（CTAをコンテンツ内・フッターにも配置）
  - ファーストビュー上のインライン誘導をtools系結果直後に強化
  - Web/SP共通でdismiss後でも表示されるカスタムバナー（控えめなフッター固定）の検討（ただし二重露出になるとUX悪化なので慎重に）

### R2. iOS Safariネイティブ apple-itunes-app バナーと SmartAppBanner の二重表示問題
- **影響**: ユーザーには同じバナーが2つ見える事故。UX毀損 + 開発者の信頼低下。
- **緩和策**:
  - 実機でiOS Safariの実際の挙動を確認（5月最初の2週間のチェックリストに追加）
  - もし二重表示があれば、SmartAppBanner側のJS実装を `if (isIOSSafari) return null` で抑制
  - 計測上は「Safariからのクリック」「それ以外からのクリック」を分離して計測

### R3. Quick-win SEO施策が Google アルゴリズム更新で吹き飛ぶリスク
- **影響**: SC quick-win で得た +700クリックが消える可能性。
- **緩和策**:
  - SEO一本足にせず、X / signup後誘導 / 招待URL の **複数チャネル** を並行で立ち上げる
  - SEO施策は「メタタグ最適化」中心（ペナルティリスクの低い王道施策）
  - AI検索流入を早期に取りに行く（GoogleとAIで分散）

### R4. 3つの並行エージェント提案の衝突解決方針
**衝突パターンと解決原則**:
1. **計測 vs 実装スピード**: analytics-analystが「先に計測整備」、product-plannerが「先にCTA改善」を主張するケース。
   → **計測優先**（5月は計測なしでは効果検証できない）。ただし計測が30分以内で済むなら同時並行OK。
2. **SEO vs 製品改善**: growth-marketingがSEO記事追加、product-plannerがCTA改善を主張するケース。
   → **既存トラフィックの転換率改善（CTA）を優先**。流入が増えても変換しないと意味がない。
3. **施策の優先順位**: 全エージェントの提案を本マスタープランの「優先度マトリクス」に強制マッピングし、Quick Win → 高効果 → 中効果の順で実行。
4. **競合する技術選定**: GA4のイベント命名、CTAコンポーネント設計などで競合した場合は、**既存実装との一貫性**を最優先（CalculatorFormCTAの設計を踏襲）。

### R5. 7月夏の大会シーズン中の登録鈍化
- **影響**: 中高生が大会・遠征で忙しく、アプリ登録に手が回らない可能性。
- **緩和策**:
  - 大会前（6月後半）に「**大会前に登録すれば成績がそのまま蓄積される**」訴求を強化
  - 大会後（7月後半〜8月）の「**新チーム始動 × 招待URL**」が本来のピーク。7月は仕込み期と割り切る。

### R6. 個人開発の工数オーバーリスク
- **影響**: 並行業務（front, back, mobile）と戦略実行で工数破綻。
- **緩和策**:
  - 5月の最初の2週間は「計測 + Quick Win」のみ。新機能開発を完全に止める。
  - 週次レビューで進捗が遅れていたら、優先度マトリクスの「下段」を即座に切り捨てる。
  - 月10時間を切ったら、ロードマップを翌月に1ヶ月ずつ後ろ倒しする勇気を持つ。

---

## 8. 次のアクション（このドキュメント完成直後）

1. analytics-analyst / product-planner / growth-marketing の3エージェントの結果ファイルが上がってきたら、本マスタープランに **個別施策の詳細** をマージする。
2. 5/1の作業開始前に、本マスタープランの「5月最初の2週間タスク表」を `docs/strategy/pdca/cycle-202605.md` に転記し、進捗管理に使う。
3. 5/4のチェックポイントで /tools/k-bb のCTA不具合の有無を必ず確認。

---

## 関連ドキュメント
- 前回統合レポート: [`ios-app-download-growth-integrated-202604.md`](./ios-app-download-growth-integrated-202604.md)
- 全体戦略: [`ios-app-growth-strategy-202604.md`](./ios-app-growth-strategy-202604.md)
- ASO: [`marketing/aso-and-app-growth-plan.md`](./marketing/aso-and-app-growth-plan.md)
- 競合分析: [`research/ios-growth-strategy-202604.md`](./research/ios-growth-strategy-202604.md)
- プロダクト企画: [`product/ios-app-download-growth.md`](./product/ios-app-download-growth.md)
- 収益化戦略: [`monetization-strategy-ios-web-202604.md`](./monetization-strategy-ios-web-202604.md)
- SNS成長: [`mobile-app-sns-growth-202604.md`](./mobile-app-sns-growth-202604.md)
