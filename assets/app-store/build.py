"""App Store スクリーンショットを生の画面キャプチャから合成する。

現行のリスティング（ダーク背景 + オレンジの帯 + 斜めの端末モック）を踏襲する。
UI を変えたらキャプチャを撮り直して再実行すれば全枚が揃う。
"""

from __future__ import annotations

import math
import os
from dataclasses import dataclass, field

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# App Store の 6.9 インチ枠。この 1 サイズを登録すれば他サイズへ自動適用される。
CANVAS = (1290, 2796)

BG = (46, 46, 46)
BRAND = (208, 128, 0)
INK = (244, 244, 244)
SUB_INK = (196, 196, 196)
BEZEL = (24, 24, 26)

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
    # 端末の傾き（度、時計回り）と拡大率、位置の微調整。
    angle: float = 12.0
    phone_width: int = 960
    phone_top: int = 740
    shift_x: int = 0
    bands: list[tuple[int, int, int]] = field(default_factory=list)


SHOTS = [
    Shot(
        key="01-dashboard",
        source="dashboard.png",
        headline=["打率も防御率も", "自動で計算"],
        subtitle="試合結果を入れるだけ",
        bands=[(-300, 1560, 156), (-240, 2340, 96)],
    ),
    Shot(
        key="02-pitch-course",
        source="pitch-course.png",
        headline=["コースごとの", "打率までわかる"],
        subtitle="ボール球も含めた 25 コースを自動集計",
        pro=True,
        bands=[(-300, 1560, 156), (-240, 2340, 96)],
    ),
]


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size, index=0)


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius, fill=255)
    return mask


def build_phone(source_path: str, width: int) -> Image.Image:
    """キャプチャを角丸にして端末フレームとダイナミックアイランドを重ねる。"""
    shot = Image.open(source_path).convert("RGBA")
    shot = shot.crop((0, STATUS_BAR_CROP, shot.width, shot.height))

    # ダイナミックアイランドがアプリのヘッダーに重ならないよう、落とした分だけ
    # 画面と同じ背景色の余白を戻す。
    strip = Image.new("RGBA", (shot.width, STATUS_BAR_CROP), BG + (255,))
    padded = Image.new("RGBA", (shot.width, shot.height + STATUS_BAR_CROP))
    padded.alpha_composite(strip, (0, 0))
    padded.alpha_composite(shot, (0, STATUS_BAR_CROP))
    shot = padded

    screen_w = width
    screen_h = round(shot.height * screen_w / shot.width)
    shot = shot.resize((screen_w, screen_h), Image.LANCZOS)

    screen_radius = round(screen_w * 0.062)
    shot.putalpha(rounded_mask(shot.size, screen_radius))

    pad = round(screen_w * 0.019)
    frame_w, frame_h = screen_w + pad * 2, screen_h + pad * 2
    frame = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
    ImageDraw.Draw(frame).rounded_rectangle(
        [0, 0, frame_w - 1, frame_h - 1], screen_radius + pad, fill=BEZEL + (255,)
    )
    frame.alpha_composite(shot, (pad, pad))

    # ダイナミックアイランド。切り落としたステータスバーの代わりに置く。
    island_w, island_h = round(screen_w * 0.30), round(screen_w * 0.088)
    island_x = (frame_w - island_w) // 2
    island_y = pad + round(screen_w * 0.028)
    ImageDraw.Draw(frame).rounded_rectangle(
        [island_x, island_y, island_x + island_w, island_y + island_h],
        island_h // 2,
        fill=(0, 0, 0, 255),
    )
    return frame


def draw_bands(canvas: Image.Image, bands: list[tuple[int, int, int]]) -> None:
    """背景に走らせるオレンジの帯。左下から右上へ抜ける。"""
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for x, y, thickness in bands:
        length = canvas.size[0] * 2
        angle = math.radians(-28)
        x2 = x + length * math.cos(angle)
        y2 = y + length * math.sin(angle)
        draw.line([(x, y), (x2, y2)], fill=BRAND + (255,), width=thickness)
        draw.ellipse(
            [x - thickness / 2, y - thickness / 2, x + thickness / 2, y + thickness / 2],
            fill=BRAND + (255,),
        )
    canvas.alpha_composite(layer)


def draw_text_block(canvas: Image.Image, shot: Shot) -> None:
    draw = ImageDraw.Draw(canvas)
    headline_font = font(FONT_HEAVY, 96)
    sub_font = font(FONT_BOLD, 46)

    y = 168
    for line in shot.headline:
        w = draw.textlength(line, font=headline_font)
        draw.text(((CANVAS[0] - w) / 2, y), line, font=headline_font, fill=INK)
        y += 126

    y += 26
    sub_w = draw.textlength(shot.subtitle, font=sub_font)
    badge_w = 0
    if shot.pro:
        badge_font = font(FONT_HEAVY, 36)
        badge_text_w = draw.textlength("PRO", font=badge_font)
        badge_w = round(badge_text_w) + 52
        gap = 22
        total = sub_w + gap + badge_w
        sub_x = (CANVAS[0] - total) / 2
        bx = sub_x + sub_w + gap
        draw.rounded_rectangle([bx, y - 4, bx + badge_w, y + 58], 30, fill=BRAND)
        draw.text((bx + 26, y + 6), "PRO", font=badge_font, fill=INK)
    else:
        sub_x = (CANVAS[0] - sub_w) / 2

    draw.text((sub_x, y), shot.subtitle, font=sub_font, fill=SUB_INK)


def render(shot: Shot) -> str:
    canvas = Image.new("RGBA", CANVAS, BG + (255,))
    draw_bands(canvas, shot.bands)

    phone = build_phone(os.path.join(CAPTURE_DIR, shot.source), shot.phone_width)
    rotated = phone.rotate(-shot.angle, expand=True, resample=Image.BICUBIC)

    shadow = Image.new("RGBA", rotated.size, (0, 0, 0, 0))
    shadow.paste((0, 0, 0, 150), (0, 0), rotated.split()[3])
    shadow = shadow.filter(ImageFilter.GaussianBlur(34))

    px = (CANVAS[0] - rotated.width) // 2 + shot.shift_x
    py = shot.phone_top
    canvas.alpha_composite(shadow, (px + 18, py + 30))
    canvas.alpha_composite(rotated, (px, py))

    draw_text_block(canvas, shot)

    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, f"{shot.key}.png")
    canvas.convert("RGB").save(path, "PNG")
    return path


if __name__ == "__main__":
    for s in SHOTS:
        path = render(s)
        print(path, Image.open(path).size)
