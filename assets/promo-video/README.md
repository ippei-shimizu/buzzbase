# プロモーション動画（Remotion）

TikTok / Instagram リール / X 向けの縦型（1080x1920）プロモーション動画を Remotion で書き出す。
画面収録ではなくコードから MP4 を生成するため、文言や尺を変えたら同じコマンドで作り直せる。

## 出力

| 項目 | 値 |
| ---- | ---- |
| 解像度 | 1080 x 1920（9:16） |
| フレームレート | 30fps |
| 尺 | 34.7秒（1040 フレーム） |
| 音声 | AAC。`make_audio.py` で合成（90BPM / 13小節） |

## コマンド

```bash
npm install
npm run studio   # ブラウザでプレビュー・スクラブ
npm run build    # out/buzzbase-reel-vertical.mp4 を書き出す
```

特定フレームだけ静止画で確認する場合:

```bash
npx remotion still BuzzBaseReel out/frame.png --frame=700
```

## 構成

| ファイル | 役割 |
| ---- | ---- |
| `src/Reel.tsx` | シーンの並びと尺。文言・紹介する機能はここで変える |
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
| `src/theme.ts` | 配色とフォント |

## 素材

`public/screens/*.png` は `extract_screens.py` が生成する。
App Store 用の合成画像（`../app-store/v3`）から端末フレームを除いた実画面を切り出し、
生キャプチャ（`../app-store/captures`）と同じ 920x2002 に揃えている。

```bash
python3 extract_screens.py
```

App Store のスクリーンショットを差し替えたら、このスクリプトを流し直す。

## 尺と音の同期

映像のカットは **90BPM・1小節 = 80フレーム** のグリッドに乗せてあり、
機能紹介は1シーン1小節（2.67秒）で切り替わる。音側も同じグリッドで
Am - F - C - G のコード進行を組み、小節ごとにパートを足して盛り上げている。

## 音

`public/audio/reel.m4a` は `make_audio.py` が numpy で合成する。
既製曲を使わないので権利処理が要らない。キック / スネア / ハイハット /
ベース / アルペジオ / パッドを小節単位で積み上げ、カット位置にインパクトを置いている。

```bash
python3 make_audio.py
```

**カットの frame を変えたら `make_audio.py` の `CUTS` と `TOTAL_FRAMES` も合わせる。**
シーンの尺は 80 フレームの倍数（または 20 フレーム刻み）に保つと拍から外れない。
ずれると効果音が画の切り替わりから外れる。ライセンス済みの楽曲に差し替える場合は
`public/audio/reel.m4a` を置き換えるだけでよい。

## 見出しの改行について

和文の見出しは自動折り返しに任せず、`Reel.tsx` の `lines` に1行ずつ配列で書く。
`Headline` は `white-space: nowrap` で描画するため、1行が長すぎると画面外にはみ出す。
全角 12 文字程度を上限の目安にする。
