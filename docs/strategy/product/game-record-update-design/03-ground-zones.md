# 03. グラウンドゾーン定義

**親ドキュメント**: `../game-record-update-design-doc.md`
**前提**: `01-data-model.md`
**関連 Issue**: #330（マスタ）/ #333（mobile UI）

---

## 1. 概要

打球方向の絶対位置タップから、`hit_direction_id`（13方向）と `hit_depth_id`（3層）を自動判定するため、グラウンド上にゾーン（多角形）を定義する。

### 1.1 ゾーン数の最終定義

| カテゴリ | 方向 | 深さ | ゾーン数 |
|---------|------|------|---------|
| 内野 | 投・捕・一・二・三・遊（6方向） | 固定（内野のみ） | **6** |
| 外野 | 左線・左・左中・中・右中・右・右線（7方向） | 内野超え / 外野 / フェンス際（3層） | **21** |
| **合計** | | | **27** |

> **注意**: Design Doc 本体（`game-record-update-design-doc.md`）の「13方向 × 深さ3 = 39ゾーン」表記は誤り。本Doc定義の **27ゾーン** が正。Design Doc 側は後続で修正する。

---

## 2. 座標系

### 2.1 正規化座標

DBに保存する `hit_location_x` / `hit_location_y` は **0.0〜1.0 の正規化座標**:

```
x_norm = pixel_x / canvas_width
y_norm = pixel_y / canvas_height
```

- 画面サイズが変わってもDBの値は不変
- ゾーン判定は正規化座標空間で行う

### 2.2 基準キャンバス

既存 `SprayChart.tsx` の座標系を踏襲:

| パラメータ | 値 | 正規化値 |
|----------|-----|---------|
| WIDTH | 420 px | 1.0 |
| HEIGHT | 340 px | 1.0 |
| HOME | (210, 295) | (0.500, 0.868) |
| FIRST | (268, 238) | (0.638, 0.700) |
| SECOND | (210, 185) | (0.500, 0.544) |
| THIRD | (152, 238) | (0.362, 0.700) |
| 外野フェンス半径 | 250 px | x方向: 0.595, y方向: 0.735 |
| ファウルライン左 | 135° | |
| ファウルライン右 | 45° | |

### 2.3 アスペクト比の扱い

正規化座標は **正方形 (1.0×1.0)** ではなく、**420:340 の比率を保つ** 前提。描画時に画面のキャンバスサイズに対して x/y それぞれをスケーリングする。

---

## 3. ゾーン定義

### 3.1 内野ゾーン（深さなし）

ホームベース周辺の6方向。各ゾーンは多角形で定義。

#### 3.1.1 投（id=1）

ホームベースから二塁方向の中央。ピッチャーマウンド周辺。

```json
{
  "id": 1,
  "name": "投",
  "depth": null,
  "polygon": [
    { "x": 0.452, "y": 0.700 },
    { "x": 0.548, "y": 0.700 },
    { "x": 0.548, "y": 0.844 },
    { "x": 0.452, "y": 0.844 }
  ]
}
```

#### 3.1.2 捕（id=2）

ホームベース直後（ファウル背面）。プレートに当たった打球など。

```json
{
  "id": 2,
  "name": "捕",
  "depth": null,
  "polygon": [
    { "x": 0.452, "y": 0.844 },
    { "x": 0.548, "y": 0.844 },
    { "x": 0.548, "y": 0.920 },
    { "x": 0.452, "y": 0.920 }
  ]
}
```

#### 3.1.3 一（id=3）

一塁ベース周辺の内野ゴロエリア。

```json
{
  "id": 3,
  "name": "一",
  "depth": null,
  "polygon": [
    { "x": 0.548, "y": 0.700 },
    { "x": 0.700, "y": 0.700 },
    { "x": 0.700, "y": 0.844 },
    { "x": 0.548, "y": 0.844 }
  ]
}
```

#### 3.1.4 二（id=4）

二塁ベース右寄り（一二塁間）の内野エリア。

```json
{
  "id": 4,
  "name": "二",
  "depth": null,
  "polygon": [
    { "x": 0.548, "y": 0.560 },
    { "x": 0.700, "y": 0.560 },
    { "x": 0.700, "y": 0.700 },
    { "x": 0.548, "y": 0.700 }
  ]
}
```

#### 3.1.5 三（id=5）

三塁ベース周辺の内野エリア。

```json
{
  "id": 5,
  "name": "三",
  "depth": null,
  "polygon": [
    { "x": 0.300, "y": 0.700 },
    { "x": 0.452, "y": 0.700 },
    { "x": 0.452, "y": 0.844 },
    { "x": 0.300, "y": 0.844 }
  ]
}
```

#### 3.1.6 遊（id=6）

二塁ベース左寄り（二遊間）の内野エリア。

```json
{
  "id": 6,
  "name": "遊",
  "depth": null,
  "polygon": [
    { "x": 0.300, "y": 0.560 },
    { "x": 0.452, "y": 0.560 },
    { "x": 0.452, "y": 0.700 },
    { "x": 0.300, "y": 0.700 }
  ]
}
```

### 3.2 外野ゾーン（深さ3層）

外野7方向 × 深さ3層 = 21ゾーン。各方向の角度範囲 × 距離範囲で扇形セクター状に分割。

#### 3.2.1 角度範囲（ホームを中心とする極座標、0°=右、90°=上）

| direction_id | 名称 | 角度範囲（度） |
|-------------|------|-------------|
| 7 | 左線 | 130° 〜 140° |
| 8 | 左 | 113° 〜 130° |
| 9 | 左中 | 99° 〜 113° |
| 10 | 中 | 81° 〜 99° |
| 11 | 右中 | 67° 〜 81° |
| 12 | 右 | 50° 〜 67° |
| 13 | 右線 | 40° 〜 50° |

#### 3.2.2 距離範囲（ホームからの距離、正規化座標）

x/y を別々に扱うのが面倒なため、**距離は擬似的に「ホームからの正規化ユークリッド距離」** で定義。

```
distance_norm = sqrt((x - HOME_x)^2 * (WIDTH^2) + (y - HOME_y)^2 * (HEIGHT^2)) / DIAGONAL
```

ただし実装上は **ピクセル距離 / 内野距離・外野距離・フェンス距離の3段階閾値** で判定:

| 深さ | depth_id | ピクセル距離（HOMEから） | 用途 |
|------|----------|------------------------|------|
| 内野超え | 1 | 80px 〜 170px | テキサスヒット、ポテン |
| 外野 | 2 | 170px 〜 230px | 標準的な外野ヒット・フライ |
| フェンス際 | 3 | 230px 〜 250px (=OUTFIELD_R) | 長打候補・本塁打 |

#### 3.2.3 外野ゾーン例: 中・外野 (direction_id=10, depth_id=2)

```json
{
  "id": "10-2",
  "direction_id": 10,
  "depth_id": 2,
  "name": "中・外野",
  "polygon": [
    /* 角度81°, 距離170 */
    { "x": 0.563, "y": 0.371 },
    /* 角度99°, 距離170 */
    { "x": 0.437, "y": 0.371 },
    /* 角度99°, 距離230 */
    { "x": 0.413, "y": 0.203 },
    /* 角度81°, 距離230 */
    { "x": 0.587, "y": 0.203 }
  ]
}
```

実装時は、各方向×深さの組み合わせで多角形を生成する **ヘルパー関数** を用意して、データ migration で投入する。

---

## 4. ゾーン判定アルゴリズム

### 4.1 Point in Polygon (PiP) アルゴリズム

タップ座標 `(x_norm, y_norm)` がどのゾーンに含まれるかを判定する。

```typescript
// mobile/utils/groundZoneDetector.ts
type Point = { x: number; y: number };
type Polygon = Point[];

export function isPointInPolygon(point: Point, polygon: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function detectZone(
  point: Point,
  zones: Array<{ direction_id: number; depth_id: number | null; polygon: Polygon }>,
): { direction_id: number; depth_id: number | null } | null {
  for (const zone of zones) {
    if (isPointInPolygon(point, zone.polygon)) {
      return { direction_id: zone.direction_id, depth_id: zone.depth_id };
    }
  }
  return null;
}
```

### 4.2 サーバー側判定 vs クライアント側判定

**クライアント側判定 推奨**:
- ゾーン定義 JSON を `/api/v2/hit_directions` から取得し、フロント側で判定
- 利点: ネットワーク往復不要、リアルタイム判定
- 保存時は座標 (x, y) + 判定済み `hit_direction_id`, `hit_depth_id` の両方を送信

サーバー側でも保存時にダブルチェック（多角形からの再判定）してデータ整合性を担保。

---

## 5. データ migration 用ヘルパー

### 5.1 `db/data/seed_hit_direction_zones.rb`（仮）

```ruby
# 内野ゾーン定義
INFIELD_ZONES = [
  { id: 1, name: '投', polygon: [[0.452, 0.700], [0.548, 0.700], [0.548, 0.844], [0.452, 0.844]] },
  { id: 2, name: '捕', polygon: [[0.452, 0.844], [0.548, 0.844], [0.548, 0.920], [0.452, 0.920]] },
  { id: 3, name: '一', polygon: [[0.548, 0.700], [0.700, 0.700], [0.700, 0.844], [0.548, 0.844]] },
  { id: 4, name: '二', polygon: [[0.548, 0.560], [0.700, 0.560], [0.700, 0.700], [0.548, 0.700]] },
  { id: 5, name: '三', polygon: [[0.300, 0.700], [0.452, 0.700], [0.452, 0.844], [0.300, 0.844]] },
  { id: 6, name: '遊', polygon: [[0.300, 0.560], [0.452, 0.560], [0.452, 0.700], [0.300, 0.700]] }
].freeze

# 外野ゾーン定義（角度範囲）
OUTFIELD_ANGLES = {
  7  => [130, 140], # 左線
  8  => [113, 130], # 左
  9  => [99,  113], # 左中
  10 => [81,  99],  # 中
  11 => [67,  81],  # 右中
  12 => [50,  67],  # 右
  13 => [40,  50]   # 右線
}.freeze

# 距離閾値（ピクセル / 正規化前）
DEPTH_RANGES = {
  1 => [80, 170],
  2 => [170, 230],
  3 => [230, 250]
}.freeze

HOME = [210.0, 295.0].freeze
CANVAS_W = 420.0
CANVAS_H = 340.0

def polar_to_normalized(deg, dist)
  rad = deg * Math::PI / 180.0
  px = HOME[0] + dist * Math.cos(rad)
  py = HOME[1] - dist * Math.sin(rad)
  [px / CANVAS_W, py / CANVAS_H]
end

def build_outfield_polygon(angles, depths)
  a1, a2 = angles
  d1, d2 = depths
  [
    polar_to_normalized(a1, d1),
    polar_to_normalized(a2, d1),
    polar_to_normalized(a2, d2),
    polar_to_normalized(a1, d2)
  ]
end

# 既存 hit_directions レコードに zone_polygon を投入
HitDirection.find_each do |hd|
  if INFIELD_ZONES.any? { |z| z[:id] == hd.id }
    zone = INFIELD_ZONES.find { |z| z[:id] == hd.id }
    polygon = zone[:polygon].map { |x, y| { x:, y: } }
    # 内野は depth ごとに分けず、1つの大ポリゴンとして保存
    hd.update!(zone_polygon: { depth: null, polygon: polygon })
  elsif OUTFIELD_ANGLES.key?(hd.id)
    # 外野は深さ3層を持つ複数ポリゴンを保存
    polygons = DEPTH_RANGES.map do |depth_id, range|
      poly = build_outfield_polygon(OUTFIELD_ANGLES[hd.id], range)
                .map { |x, y| { x:, y: } }
      { depth_id:, polygon: poly }
    end
    hd.update!(zone_polygon: polygons)
  end
end
```

### 5.2 `hit_directions.zone_polygon` の JSON 構造

```json
// 内野方向（depth_id null）
{
  "depth": null,
  "polygon": [
    { "x": 0.452, "y": 0.700 },
    { "x": 0.548, "y": 0.700 },
    ...
  ]
}

// 外野方向（depth_id 別の複数ポリゴン）
[
  { "depth_id": 1, "polygon": [...] },
  { "depth_id": 2, "polygon": [...] },
  { "depth_id": 3, "polygon": [...] }
]
```

---

## 6. ファウルゾーン・無効領域

### 6.1 タップ無効領域

- ファウルライン外側（左下三角・右下三角）
- 外野フェンス外側（円弧の外）
- 上記領域をタップした場合は **「打球方向が不明」として扱う**（`hit_direction_id` null）

### 6.2 強制再タップを要求しない

「打球方向タップ済み」のステップ進行を許可するが、`hit_direction_id` が決まらなかった場合は分析対象から外す。UIで「タップ位置が範囲外です」など視覚的フィードバックを出してもよい。

---

## 7. 描画用 SVG 仕様

### 7.1 既存 `SprayChart.tsx` の踏襲

- WIDTH 420 × HEIGHT 340
- ホーム・1塁・2塁・3塁・外野フェンス・ファウルラインの描画は流用
- 新規UIではゾーンの境界線を **薄いグレー** で表示し、ユーザーに区分を視覚化（任意）

### 7.2 タップ反映

- タップ位置に **マーカー（円）** を表示
- 確定したゾーンを薄いハイライト色でマーキング
- 再タップで上書き

### 7.3 詳細仕様は `04-mobile-ui.md` に委ねる

UI 詳細は次ドキュメント参照。

---

## 8. 検証

### 8.1 ゾーン重複・隙間チェック

データ migration 後に以下をチェック:

- すべての内野ゾーンが重なっていない
- すべての外野ゾーン（角度・深さの組合せ）が隣接ゾーンと境界を共有
- グラウンド全域がどこかのゾーンに割り当てられている（ファウルゾーン除く）

### 8.2 サンプルタップでの判定検証

- 「キャッチャー前のゴロ」位置 → `direction_id=2 捕`
- 「センター前ヒット」位置 → `direction_id=10 中, depth_id=2 外野`
- 「左中間フェンス際」位置 → `direction_id=9 左中, depth_id=3 フェンス際`

ユニットテスト（mobile/utils 配下）で確認。

---

## 9. Pro機能（A-3, A-4）との接続

- A-3 打球の深さ分析: `hit_depth_id` で `GROUP BY`
- A-4 打球種類×深さマトリクス: `out_type/hit_type` × `hit_depth_id` のクロス集計

ゾーン判定で `hit_depth_id` を自動付与することで、ユーザーが手動入力せずに深さ分析が可能になる。
