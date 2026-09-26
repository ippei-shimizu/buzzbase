"""App Store 用の合成画像と生キャプチャから、端末フレーム無しの画面だけを切り出す。

v3 の合成画像は端末モックの上に画面が乗っているため、黒いベゼルの外形を検出して
一定量インセットした矩形を画面として扱う。生キャプチャはそのままリサイズする。
"""

import numpy as np
from PIL import Image

SRC_V3 = "../app-store/v3"
SRC_CAP = "../app-store/captures"
OUT = "public/screens"

SCREEN = (920, 2002)
BEZEL = 21

# (出力名, 元ファイル, 種別)
JOBS = [
    ("dashboard", f"{SRC_CAP}/dashboard.png", "raw"),
    ("plate-input", f"{SRC_V3}/v3_03.png", "mock"),
    ("plate-detail", f"{SRC_V3}/v3_04.png", "mock"),
    ("contact", f"{SRC_V3}/v3_05.png", "mock"),
    ("course", f"{SRC_CAP}/pitch-course.png", "raw"),
    ("direction", f"{SRC_V3}/v3_06.png", "mock"),
    ("pitcher", f"{SRC_V3}/v3_07.png", "mock"),
    ("ranking", f"{SRC_V3}/v3_08.png", "mock"),
    ("practice", f"{SRC_V3}/v3_09.png", "mock"),
    ("note", f"{SRC_V3}/v3_10.png", "mock"),
]


def device_bounds(path):
    array = np.array(Image.open(path).convert("RGB")).astype(int)
    luminance = array.sum(2) / 3
    dark = luminance < 22
    columns = np.where(dark.sum(0) > 200)[0]
    rows = np.where(dark.sum(1) > 200)[0]
    return columns.min(), rows.min()


for name, path, kind in JOBS:
    image = Image.open(path).convert("RGB")
    if kind == "mock":
        left, top = device_bounds(path)
        box = (left + BEZEL, top + BEZEL, left + BEZEL + SCREEN[0], top + BEZEL + SCREEN[1])
        image = image.crop(box)
    image = image.resize(SCREEN, Image.LANCZOS)
    image.save(f"{OUT}/{name}.png", optimize=True)
    print(f"{name}.png <- {path}")
