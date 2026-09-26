"""v1 のスクリーンショットから背景のオレンジ曲線だけを抜き出して SVG 化する。

画面内の UI（ボタン・アバター・ロゴ）も同じオレンジなので、連結成分に分けたうえで
「キャンバス端に接している」か「単独で置かれた太い棒」だけを背景要素として拾う。
"""

from __future__ import annotations

import os

import numpy as np
from PIL import Image
from scipy import ndimage

BRAND = np.array([208, 128, 0])
TOLERANCE = 110
CANVAS = (1290, 2796)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(BASE_DIR, "v1")
OUT_DIR = os.path.join(BASE_DIR, "swooshes")

# 端に接しないが背景要素である「単独の丸棒」。bbox の左上をおおよそで指定する。
STANDALONE_BARS = {
    "01-mypage-stats.png": [(319, 531)],
    "02-dashboard-radar.png": [(299, 288)],
}

MIN_AREA = 2000
EDGE = 4


def orange_mask(path: str) -> np.ndarray:
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(int)
    mask = np.abs(rgb - BRAND).sum(axis=2) < TOLERANCE
    # アンチエイリアスで空いた隙間を埋めて輪郭を滑らかにする。
    return ndimage.binary_closing(mask, np.ones((5, 5)))


def background_components(mask: np.ndarray, name: str) -> list[np.ndarray]:
    labels, count = ndimage.label(mask)
    boxes = ndimage.find_objects(labels)
    keep = []
    for i in range(count):
        ys, xs = boxes[i]
        area = int((labels[boxes[i]] == i + 1).sum())
        if area < MIN_AREA:
            continue
        touches_edge = (
            xs.start <= EDGE
            or xs.stop >= CANVAS[0] - EDGE
            or ys.start <= EDGE
            or ys.stop >= CANVAS[1] - EDGE
        )
        standalone = any(
            abs(xs.start - bx) < 30 and abs(ys.start - by) < 30
            for bx, by in STANDALONE_BARS.get(name, [])
        )
        if touches_edge or standalone:
            keep.append(labels == i + 1)
    return keep


# 8 近傍を時計回りに並べたオフセット（西から開始）。
_NEIGHBORS = [(0, -1), (-1, -1), (-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1)]


def trace_boundary(component: np.ndarray) -> list[tuple[int, int]]:
    """Moore 近傍法で輪郭を時計回りに 1 周たどる。"""
    ys, xs = np.nonzero(component)
    start = (int(ys[0]), int(xs[0]))
    h, w = component.shape

    def solid(p: tuple[int, int]) -> bool:
        y, x = p
        return 0 <= y < h and 0 <= x < w and bool(component[y, x])

    contour = [start]
    current = start
    # 開始画素の西隣を最初のバックトラック位置にする。
    back_idx = 0
    guard = 0
    while guard < 4_000_000:
        guard += 1
        found = False
        for step in range(1, 9):
            idx = (back_idx + step) % 8
            dy, dx = _NEIGHBORS[idx]
            cand = (current[0] + dy, current[1] + dx)
            if solid(cand):
                # 新しいバックトラックは 1 つ手前に調べた近傍。
                back_idx = (idx + 4 + 1) % 8
                current = cand
                contour.append(cand)
                found = True
                break
        if not found:
            break
        if current == start and len(contour) > 2:
            break
    return contour


def _perp_distance(
    p: tuple[float, float], a: tuple[float, float], b: tuple[float, float]
) -> float:
    if a == b:
        return float(np.hypot(p[0] - a[0], p[1] - a[1]))
    num = abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1]))
    return num / float(np.hypot(b[0] - a[0], b[1] - a[1]))


def simplify(points: list[tuple[float, float]], tolerance: float) -> list[tuple[float, float]]:
    """Douglas-Peucker で頂点を間引く。"""
    if len(points) < 3:
        return points
    stack = [(0, len(points) - 1)]
    keep = np.zeros(len(points), dtype=bool)
    keep[0] = keep[-1] = True
    while stack:
        first, last = stack.pop()
        if last <= first + 1:
            continue
        worst, worst_i = 0.0, first
        for i in range(first + 1, last):
            d = _perp_distance(points[i], points[first], points[last])
            if d > worst:
                worst, worst_i = d, i
        if worst > tolerance:
            keep[worst_i] = True
            stack.append((first, worst_i))
            stack.append((worst_i, last))
    return [p for p, k in zip(points, keep) if k]


def to_bezier_path(points: list[tuple[float, float]], corner_deg: float = 32.0) -> str:
    """閉じた折れ線を SVG の d 属性にする。

    曲線部分は Catmull-Rom で滑らかにつなぎ、鋭角の頂点は折れたまま残す。
    全頂点を一律に丸めると、キャンバス端で切れた直線の角がふくらんで太る。
    """
    n = len(points)
    if n < 3:
        return ""

    def angle_at(i: int) -> float:
        prev = np.array(points[(i - 1) % n])
        cur = np.array(points[i])
        nxt = np.array(points[(i + 1) % n])
        v1, v2 = cur - prev, nxt - cur
        n1, n2 = np.linalg.norm(v1), np.linalg.norm(v2)
        if n1 == 0 or n2 == 0:
            return 0.0
        cosine = float(np.clip(np.dot(v1, v2) / (n1 * n2), -1.0, 1.0))
        return float(np.degrees(np.arccos(cosine)))

    corners = [angle_at(i) > corner_deg for i in range(n)]

    d = [f"M {points[0][0]:.1f} {points[0][1]:.1f}"]
    for i in range(n):
        p0 = points[(i - 1) % n]
        p1 = points[i]
        p2 = points[(i + 1) % n]
        p3 = points[(i + 2) % n]
        if corners[i] and corners[(i + 1) % n]:
            d.append(f"L {p2[0]:.1f} {p2[1]:.1f}")
            continue
        # 角に接する側はハンドルを潰して直線的に出入りさせる。
        c1 = p1 if corners[i] else (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (
            p2
            if corners[(i + 1) % n]
            else (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        )
        d.append(
            f"C {c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}"
        )
    d.append("Z")
    return " ".join(d)


def build_svg(paths: list[str]) -> str:
    body = "\n".join(f'  <path d="{d}" fill="#d08000" />' for d in paths)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS[0]} {CANVAS[1]}" '
        f'width="{CANVAS[0]}" height="{CANVAS[1]}">\n{body}\n</svg>\n'
    )


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    for name in sorted(f for f in os.listdir(SRC_DIR) if f.endswith(".png")):
        mask = orange_mask(os.path.join(SRC_DIR, name))
        parts = background_components(mask, name)
        paths = []
        for part in parts:
            contour = trace_boundary(part)
            pts = [(float(x), float(y)) for y, x in contour]
            pts = simplify(pts, tolerance=1.2)
            path = to_bezier_path(pts)
            if path:
                paths.append(path)

        stem = os.path.splitext(name)[0]
        out = os.path.join(OUT_DIR, f"{stem}.svg")
        with open(out, "w", encoding="utf-8") as fp:
            fp.write(build_svg(paths))
        print(f"{out}  曲線 {len(paths)} 本")


if __name__ == "__main__":
    main()
