# プロモーション動画（Remotion）

TikTok / Instagram リール / X 向けの縦型（1080x1920）プロモーション動画を Remotion で書き出す。
画面収録ではなくコードから MP4 を生成するため、文言や尺を変えたら同じコマンドで作り直せる。

## 3本ある

| コンポジション | 出力 | 尺 | 狙い |
| ---- | ---- | ---- | ---- |
| `BuzzBaseReel` | `out/buzzbase-reel-vertical.mp4` | 34.7秒 | 機能を順番に見せる王道の紹介。共通レイアウトに実画面を差し替えていく |
| `BuzzBaseStory` | `out/buzzbase-story-vertical.mp4` | 32.0秒 | 「1打席を思い出せない」から入る物語型。カットごとに地の色も構図も変える |
| `BuzzBaseJourney` | `out/buzzbase-journey-vertical.mp4` | 40.0秒 | **カットを1回も割らない**ワンカット。1シーズン分のデータの中をカメラが移動し続ける |

いずれも 1080x1920 / 30fps / 音声 AAC。

## コマンド

```bash
npm install
npm run studio        # ブラウザでプレビュー・スクラブ
npm run build           # 機能紹介版を書き出す
npm run build:story     # 物語版を書き出す
npm run build:journey   # ワンカット版を書き出す
npm run audio           # 3本ぶんの音を作り直す
```

特定フレームだけ静止画で確認する場合:

```bash
npx remotion still BuzzBaseReel out/frame.png --frame=700
```

## 構成

| ファイル | 役割 |
| ---- | ---- |
| `src/Reel.tsx` | 機能紹介版のシーンの並びと尺 |
| `src/Story.tsx` | 物語版のカット割り。`src/story/` の各カットを並べるだけ |
| `src/Journey.tsx` | ワンカット版。カメラの寄り引きと進行のキーフレームがすべて |
| `src/journey/season.ts` | ワンカット版が舞台にする1シーズン分のデータと座標 |
| `src/journey/World.tsx` | その座標系に描いた折れ線・注釈カード・寄りで見せる小カード |
| `src/scenes/Hook.tsx` | 冒頭1.5秒。1フレーム目からゴールドの全面で問いかける |
| `src/scenes/Thesis.tsx` | 記憶 → 記録 の言い換えでアプリの存在理由を言い切る |
| `src/scenes/LogoScene.tsx` | ロゴの着地とタグライン |
| `src/scenes/FeatureScene.tsx` | 機能紹介シーンの共通レイアウト（見出し＋端末モック＋背面マーキー） |
| `src/scenes/DuoScene.tsx` | 練習記録と野球ノートを2台並べる |
| `src/scenes/Cta.tsx` | 締めのロゴとダウンロード導線 |
| `src/components/Backdrop.tsx` | 全編に敷くナイターの球場。視差付きの 3D レイヤー |
| `src/components/Phone.tsx` | 実画面をはめ込む端末モック |
| `src/components/Transitions.tsx` | シーン転換。全面フラッド / トレイル / スラブの3種を順番に回す |
| `src/components/Marquee.tsx` | 継ぎ目なくループする横スクロール文字 |
| `src/components/Hud.tsx` | 上端の常設バーと進捗線 |
| `src/story/*.tsx` | 物語版の各カット。1ファイル = 1デザイン |
| `src/theme.ts` | 配色とフォント。`SCENE` が物語版の場面ごとの地の色 |

## 素材

`public/screens/*.png` は `extract_screens.py` が生成する。
App Store 用の合成画像（`../app-store/v3`）から端末フレームを除いた実画面を切り出し、
生キャプチャ（`../app-store/captures`）と同じ 920x2002 に揃えている。

```bash
python3 extract_screens.py
```

App Store のスクリーンショットを差し替えたら、このスクリプトを流し直す。

## 尺と音の同期

両方の動画のカットを **90BPM・1小節 = 80フレーム** のグリッドに乗せてある。
機能紹介版は1シーン1小節（2.67秒）、物語版は 2〜2.67秒で切り替わる。
音側も同じグリッドで Am - F - C - G のコード進行を組み、小節ごとにパートを足して盛り上げる。

## 音

`public/audio/*.m4a` は `make_audio.py` が numpy で合成する。
3本ぶんの設定はスクリプト冒頭の `TRACKS` にある。
既製曲を使わないので権利処理が要らない。キック / スネア / ハイハット /
ベース / アルペジオ / パッドを小節単位で積み上げ、カット位置にインパクトを置いている。

```bash
python3 make_audio.py
```

**カットの frame を変えたら `TRACKS` の `cuts` と `frames` も合わせる。**
シーンの尺は 80 フレームの倍数（または 20 フレーム刻み）に保つと拍から外れない。
ずれると効果音が画の切り替わりから外れる。ライセンス済みの楽曲に差し替える場合は
`public/audio/reel.m4a` を置き換えるだけでよい。

## ワンカット版の作り

`src/journey/season.ts` が 6800x1920 の「シーズンの座標系」を持ち、`World.tsx` がそこに
折れ線・月・注釈カードを置く。`Journey.tsx` はその上を動くカメラ（`progress` / `zoom`）の
キーフレームだけを持つ。**カメラが止まって寄る区間の `progress` は、カードの `ratio` より
少し先の値にする**。カードの真上で止めると出現条件（`progress > ratio`）を満たさず、
寄ったのに何も出ないフレームになる。

## 物語版のつなぎ方

物語版はカットごとに地の色（ゴールド / 生成り / グラウンドの緑 / 電光掲示板の紺）が変わるため、
**シーン同士を溶かさずハードカットでつなぐ**。各シーンにフェードアウトを持たせると
切り替わる直前に一瞬黒が挟まるので、`src/story/` のシーンは抜きのアニメーションを持たない。
切れ目の演出は `Transitions` のフラッシュとワイプだけが担当する。

## 見出しの改行について

和文の見出しは自動折り返しに任せず、`Reel.tsx` の `lines` に1行ずつ配列で書く。
`Headline` は `white-space: nowrap` で描画するため、1行が長すぎると画面外にはみ出す。
全角 12 文字程度を上限の目安にする。
