"""App Store スクリーンショットを生の画面キャプチャから合成する。

現行のリスティング（ダーク背景 + オレンジのうねり + 3D 風の端末モック）を踏襲する。
UI を変えたらキャプチャを撮り直して再実行すれば全枚が揃う。
"""

from __future__ import annotations

import math
import os
from dataclasses import dataclass, field

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from device import render_device

# App Store の 6.9 インチ枠。この 1 サイズを登録すれば他サイズへ自動適用される。
CANVAS = (1290, 2796)

BG = (46, 46, 46)
BRAND = (223, 138, 8)
INK = (250, 250, 250)
SUB_INK = (226, 226, 226)

FONT_DIR = "/System/Library/Fonts"
FONT_HEAVY = f"{FONT_DIR}/ヒラギノ角ゴシック W8.ttc"
FONT_BOLD = f"{FONT_DIR}/ヒラギノ角ゴシック W6.ttc"

# シミュレータのキャプチャ上端にあるステータスバー（時刻・電波・電池）を落とす高さ。
STATUS_BAR_CROP = 170

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CAPTURE_DIR = os.path.join(BASE_DIR, "captures")
OUT_DIR = os.path.join(BASE_DIR, "v2")


@dataclass
class Shot:
    """1 枚のスクリーンショットの設定。"""

    key: str
    # captures/ 配下のファイル名。
    source: str
    headline: list[str]
    subtitle: str
    pro: bool = False
    phone_width: int = 1150
    phone_top: int = 620
    shift_x: int = 0
    yaw: float = -17.0
    pitch: float = 4.0
    roll: float = 11.0
    # (始点, 制御点, 終点, 太さ) のうねり。画面座標で指定する。
    swooshes: list[tuple] = field(default_factory=list)


# 見出しの下から端末の背後を通って抜ける、v1 と同系統のうねり。
DEFAULT_SWOOSHES = [
    ((-180, 2440), (200, 1560), (600, 980), 104),
    ((-220, 2760), (700, 2520), (1460, 1720), 150),
]

SHOTS = [
    Shot(
        key="01-dashboard",
        source="dashboard.png",
        headline=["打率も防御率も", "自動で計算"],
        subtitle="試合結果を入れるだけ",
        swooshes=DEFAULT_SWOOSHES,
    ),
    Shot(
        key="02-pitch-course",
        source="pitch-course.png",
        headline=["コースごとの", "打率までわかる"],
        subtitle="ボール球も含めた 25 コースを自動集計",
        pro=True,
        swooshes=DEFAULT_SWOOSHES,
    ),
]


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size, index=0)


def load_screen(name: str) -> Image.Image:
    """ステータスバーを落とし、同じ背景色の余白を戻す。"""
    shot = Image.open(os.path.join(CAPTURE_DIR, name)).convert("RGBA")
    shot = shot.crop((0, STATUS_BAR_CROP, shot.width, shot.height))
    padded = Image.new("RGBA", (shot.width, shot.height + STATUS_BAR_CROP), BG + (255,))
    padded.alpha_composite(shot, (0, STATUS_BAR_CROP))
    return padded


def _quad_bezier(
    p0: tuple[float, float], p1: tuple[float, float], p2: tuple[float, float], steps: int = 80
) -> list[tuple[float, float]]:
    pts = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        pts.append(
            (
                u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
                u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
            )
        )
    return pts


def _stroke_outline(pts: list[tuple[float, float]], width: float) -> list[tuple[float, float]]:
    """曲線を法線方向へ太らせた輪郭を返す。太い折れ線の継ぎ目の欠けを避ける。"""
    half = width / 2
    left, right = [], []
    n = len(pts)
    for i, (x, y) in enumerate(pts):
        if i == 0:
            dx, dy = pts[1][0] - x, pts[1][1] - y
        elif i == n - 1:
            dx, dy = x - pts[-2][0], y - pts[-2][1]
        else:
            dx, dy = pts[i + 1][0] - pts[i - 1][0], pts[i + 1][1] - pts[i - 1][1]
        length = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / length * half, dx / length * half
        left.append((x + nx, y + ny))
        right.append((x - nx, y - ny))
    return left + right[::-1]


def draw_swooshes(canvas: Image.Image, swooshes: list[tuple]) -> None:
    """太い曲線を丸い端点付きで描く。v1 のオレンジのうねりに合わせる。"""
    ss = 2
    big = Image.new("RGBA", (canvas.width * ss, canvas.height * ss), (0, 0, 0, 0))
    draw = ImageDraw.Draw(big)
    for p0, p1, p2, width in swooshes:
        pts = [(x * ss, y * ss) for x, y in _quad_bezier(p0, p1, p2, steps=160)]
        w = width * ss
        draw.polygon(_stroke_outline(pts, w), fill=BRAND + (255,))
        for end in (pts[0], pts[-1]):
            draw.ellipse(
                [end[0] - w / 2, end[1] - w / 2, end[0] + w / 2, end[1] + w / 2],
                fill=BRAND + (255,),
            )
    canvas.alpha_composite(big.resize(canvas.size, Image.LANCZOS))


def draw_text_block(canvas: Image.Image, shot: Shot) -> None:
    draw = ImageDraw.Draw(canvas)
    headline_font = font(FONT_HEAVY, 100)
    sub_font = font(FONT_BOLD, 48)

    y = 150
    for line in shot.headline:
        w = draw.textlength(line, font=headline_font)
        draw.text(((CANVAS[0] - w) / 2, y), line, font=headline_font, fill=INK)
        y += 132

    y += 30
    sub_w = draw.textlength(shot.subtitle, font=sub_font)
    if shot.pro:
        badge_font = font(FONT_HEAVY, 38)
        badge_w = round(draw.textlength("PRO", font=badge_font)) + 56
        gap = 24
        sub_x = (CANVAS[0] - (sub_w + gap + badge_w)) / 2
        bx = sub_x + sub_w + gap
        draw.rounded_rectangle([bx, y - 6, bx + badge_w, y + 60], 33, fill=BRAND)
        draw.text((bx + 28, y + 5), "PRO", font=badge_font, fill=INK)
    else:
        sub_x = (CANVAS[0] - sub_w) / 2
    draw.text((sub_x, y), shot.subtitle, font=sub_font, fill=SUB_INK)


def render(shot: Shot) -> str:
    canvas = Image.new("RGBA", CANVAS, BG + (255,))
    draw_swooshes(canvas, shot.swooshes)

    device = render_device(
        load_screen(shot.source),
        target_width=shot.phone_width,
        yaw=shot.yaw,
        pitch=shot.pitch,
        roll=shot.roll,
    )

    # 接地影。端末の形をぼかして少し下にずらす。
    shadow = Image.new("RGBA", device.size, (0, 0, 0, 0))
    shadow.paste((0, 0, 0, 170), (0, 0), device.split()[3])
    shadow = shadow.filter(ImageFilter.GaussianBlur(42))

    px = (CANVAS[0] - device.width) // 2 + shot.shift_x
    py = shot.phone_top
    canvas.alpha_composite(shadow, (px + 14, py + 36))
    canvas.alpha_composite(device, (px, py))

    draw_text_block(canvas, shot)

    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, f"{shot.key}.png")
    canvas.convert("RGB").save(path, "PNG")
    return path


if __name__ == "__main__":
    for s in SHOTS:
        path = render(s)
        print(path, Image.open(path).size)
