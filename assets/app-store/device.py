"""端末モックを 3D 風に描く。

平面回転ではなく、板を 3 軸で回して透視投影した位置へパース変形する。
側面の厚み・ボタン・フレームの光沢まで描いて v1 の 3D レンダリングに寄せる。
"""

from __future__ import annotations

import math

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# 端末フレームの金属色。面の向きごとに明るさを変えて質感を出す。
FRAME_DARK = (38, 38, 42)
FRAME_MID = (92, 92, 98)
FRAME_LIGHT = (176, 176, 184)
SIDE_DARK = (28, 28, 32)


def _rotation(ax: float, ay: float, az: float) -> np.ndarray:
    ax, ay, az = map(math.radians, (ax, ay, az))
    rx = np.array([[1, 0, 0], [0, math.cos(ax), -math.sin(ax)], [0, math.sin(ax), math.cos(ax)]])
    ry = np.array([[math.cos(ay), 0, math.sin(ay)], [0, 1, 0], [-math.sin(ay), 0, math.cos(ay)]])
    rz = np.array([[math.cos(az), -math.sin(az), 0], [math.sin(az), math.cos(az), 0], [0, 0, 1]])
    return rz @ ry @ rx


def project(
    points: list[tuple[float, float, float]],
    ax: float,
    ay: float,
    az: float,
    distance: float,
) -> list[tuple[float, float]]:
    """3D 点群を回転させて透視投影する。distance が小さいほどパースが強い。"""
    rot = _rotation(ax, ay, az)
    out = []
    for p in points:
        x, y, z = rot @ np.array(p, dtype=float)
        scale = distance / (distance - z)
        out.append((x * scale, y * scale))
    return out


def _find_coeffs(
    source: list[tuple[float, float]], target: list[tuple[float, float]]
) -> np.ndarray:
    """source の 4 点が target の 4 点へ移る透視変換の係数を解く。"""
    matrix = []
    for s, t in zip(source, target):
        matrix.append([t[0], t[1], 1, 0, 0, 0, -s[0] * t[0], -s[0] * t[1]])
        matrix.append([0, 0, 0, t[0], t[1], 1, -s[1] * t[0], -s[1] * t[1]])
    a = np.array(matrix, dtype=float)
    b = np.array(source, dtype=float).reshape(8)
    return np.linalg.solve(a, b)


def _gradient_polygon(
    size: tuple[int, int],
    quad: list[tuple[float, float]],
    color_a: tuple[int, int, int],
    color_b: tuple[int, int, int],
    horizontal: bool = True,
) -> Image.Image:
    """四辺形をグラデーションで塗る。側面の金属感に使う。"""
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).polygon(quad, fill=255)

    grad = Image.new("RGB", (256, 1) if horizontal else (1, 256))
    px = grad.load()
    for i in range(256):
        t = i / 255
        c = tuple(round(color_a[k] + (color_b[k] - color_a[k]) * t) for k in range(3))
        px[(i, 0) if horizontal else (0, i)] = c
    grad = grad.resize(size, Image.BILINEAR).convert("RGBA")
    layer.paste(grad, (0, 0), mask)
    return layer


def render_device(
    screen: Image.Image,
    *,
    target_width: int,
    yaw: float = -26.0,
    pitch: float = 6.0,
    roll: float = 14.0,
    distance: float = 2600.0,
    thickness: float = 34.0,
    supersample: int = 2,
) -> Image.Image:
    """画面キャプチャを 3D 風の端末モックに仕立てる。

    :param screen: 角丸処理前の画面画像
    :param target_width: 出力するモックのおおよその幅
    :param yaw: 縦軸まわりの回転。負で左側面が見える
    :param pitch: 横軸まわりの回転
    :param roll: 画面奥行き軸まわりの回転（見た目の傾き）
    :param distance: 視点までの距離。小さいほどパースが強い
    :param thickness: 端末の厚み
    """
    ss = supersample
    sw, sh = screen.size
    # 端末の面サイズ。画面の外側にフレームぶんの余白を取る。
    bezel = sw * 0.042
    fw, fh = sw + bezel * 2, sh + bezel * 2

    half_w, half_h, half_t = fw / 2, fh / 2, thickness / 2

    # 前面と背面の 4 隅。順番は左上・右上・右下・左下。
    front = [
        (-half_w, -half_h, half_t),
        (half_w, -half_h, half_t),
        (half_w, half_h, half_t),
        (-half_w, half_h, half_t),
    ]
    back = [(x, y, -half_t) for x, y, _ in front]

    pf = project(front, pitch, yaw, roll, distance)
    pb = project(back, pitch, yaw, roll, distance)

    xs = [p[0] for p in pf + pb]
    ys = [p[1] for p in pf + pb]
    span = max(xs) - min(xs)
    scale = target_width * ss / span

    pad = target_width * ss * 0.06
    off_x = -min(xs) * scale + pad
    off_y = -min(ys) * scale + pad
    out_w = round(span * scale + pad * 2)
    out_h = round((max(ys) - min(ys)) * scale + pad * 2)

    def place(pts: list[tuple[float, float]]) -> list[tuple[float, float]]:
        return [(p[0] * scale + off_x, p[1] * scale + off_y) for p in pts]

    qf, qb = place(pf), place(pb)
    canvas = Image.new("RGBA", (out_w, out_h), (0, 0, 0, 0))

    # 側面。前面と背面の対応する辺を結んだ四辺形を、向きに応じた明るさで塗る。
    sides = [
        ([qf[0], qf[3], qb[3], qb[0]], FRAME_MID, SIDE_DARK),  # 左
        ([qf[1], qf[2], qb[2], qb[1]], SIDE_DARK, FRAME_MID),  # 右
        ([qf[0], qf[1], qb[1], qb[0]], FRAME_LIGHT, FRAME_DARK),  # 上
        ([qf[3], qf[2], qb[2], qb[3]], FRAME_DARK, SIDE_DARK),  # 下
    ]
    for quad, ca, cb in sides:
        canvas.alpha_composite(_gradient_polygon(canvas.size, quad, ca, cb))

    # 前面（フレーム + 画面）を作ってからパース変形する。
    face = Image.new("RGBA", (round(fw), round(fh)), (0, 0, 0, 0))
    body_radius = fw * 0.088
    body_mask = Image.new("L", (round(fw), round(fh)), 0)
    ImageDraw.Draw(body_mask).rounded_rectangle([0, 0, fw - 1, fh - 1], body_radius, fill=255)

    # チタンレール。左上から右下へ明→暗のグラデーションで金属の反射を作る。
    rail = Image.new("RGB", (256, 256))
    rail_px = rail.load()
    for yy in range(256):
        for xx in range(0, 256, 8):
            t = min(1.0, (xx / 255 * 0.55 + yy / 255 * 0.45))
            c = tuple(
                round(FRAME_LIGHT[k] + (FRAME_DARK[k] - FRAME_LIGHT[k]) * t) for k in range(3)
            )
            for dx in range(8):
                if xx + dx < 256:
                    rail_px[xx + dx, yy] = c
    rail = rail.resize((round(fw), round(fh)), Image.BILINEAR).convert("RGBA")
    face.paste(rail, (0, 0), body_mask)

    face_draw = ImageDraw.Draw(face)
    # レールと画面の間の暗い落ち込み。
    inner = bezel * 0.45
    face_draw.rounded_rectangle(
        [inner, inner, fw - 1 - inner, fh - 1 - inner],
        body_radius - inner,
        fill=(14, 14, 16, 255),
    )

    screen_radius = sw * 0.062
    rounded = screen.copy().convert("RGBA")
    mask = Image.new("L", rounded.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, rounded.width - 1, rounded.height - 1], screen_radius, fill=255
    )
    rounded.putalpha(mask)
    face.alpha_composite(rounded, (round(bezel), round(bezel)))

    island_w, island_h = sw * 0.30, sw * 0.088
    ix = (fw - island_w) / 2
    iy = bezel + sw * 0.028
    face_draw.rounded_rectangle(
        [ix, iy, ix + island_w, iy + island_h], island_h / 2, fill=(0, 0, 0, 255)
    )

    coeffs = _find_coeffs(
        [(0, 0), (fw, 0), (fw, fh), (0, fh)],
        qf,
    )
    warped = face.transform(canvas.size, Image.PERSPECTIVE, coeffs, Image.BICUBIC)
    canvas.alpha_composite(warped)

    _draw_buttons(canvas, qf, qb, scale)

    return canvas.resize((out_w // ss, out_h // ss), Image.LANCZOS)


def _lerp(a: tuple[float, float], b: tuple[float, float], t: float) -> tuple[float, float]:
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def _draw_buttons(
    canvas: Image.Image, qf: list[tuple[float, float]], qb: list[tuple[float, float]], scale: float
) -> None:
    """左側面に音量ボタンとアクションボタンを置く。"""
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    # 左辺は前面 qf[0]-qf[3] と背面 qb[0]-qb[3] で挟まれた帯。
    for start, end in ((0.16, 0.23), (0.28, 0.39), (0.42, 0.53)):
        quad = [
            _lerp(qf[0], qf[3], start),
            _lerp(qf[0], qf[3], end),
            _lerp(qb[0], qb[3], end),
            _lerp(qb[0], qb[3], start),
        ]
        draw.polygon(quad, fill=FRAME_LIGHT + (255,))
        draw.line([quad[0], quad[1]], fill=(226, 226, 232, 220), width=max(2, round(scale * 2.0)))
    canvas.alpha_composite(layer)


def _draw_gloss(canvas: Image.Image, qf: list[tuple[float, float]]) -> None:
    """画面に斜めの光の帯を薄く重ねる。"""
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    top = _lerp(qf[0], qf[1], 0.12)
    top2 = _lerp(qf[0], qf[1], 0.58)
    bottom = _lerp(qf[3], qf[2], -0.18)
    bottom2 = _lerp(qf[3], qf[2], 0.28)
    draw.polygon([top, top2, bottom2, bottom], fill=(255, 255, 255, 16))

    mask = Image.new("L", canvas.size, 0)
    ImageDraw.Draw(mask).polygon(qf, fill=255)
    layer.putalpha(Image.composite(layer.split()[3], Image.new("L", canvas.size, 0), mask))
    canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(6)))
