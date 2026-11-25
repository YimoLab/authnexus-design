#!/usr/bin/env python3
"""生成站点分享图与 iOS 主屏图标。

产物：
  brand/og.png               1200×630  Open Graph / Twitter 分享图
  brand/apple-touch-icon.png 180×180   iOS 主屏图标

配色取自 css/brand.css：--logo-bg #262626、--logo-fg #FFFFFF、--acid #78EA57。
用法：python tools/gen-site-images.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / "brand"

BG = (38, 38, 38)          # #262626 --logo-bg
FG = (255, 255, 255)       # #FFFFFF --logo-fg
INK = (26, 26, 26)         # #1A1A1A 深色主题下的 logo 前景
LIGHT = (245, 245, 245)    # #F5F5F5 深色主题下的 logo 底
ACID = (120, 234, 87)      # #78EA57 --acid
MUTED = (163, 163, 163)
DIM = (138, 138, 138)

FONT_CANDIDATES = (
    "C:/Windows/Fonts/msyhbd.ttc",
    "C:/Windows/Fonts/msyh.ttc",
    "C:/Windows/Fonts/arialbd.ttf",
)


def font(size: int):
    for candidate in FONT_CANDIDATES:
        path = Path(candidate)
        if path.exists():
            try:
                return ImageFont.truetype(str(path), size)
            except OSError:
                continue
    return ImageFont.load_default()


def draw_n(draw: ImageDraw.ImageDraw, x: float, y: float, size: float, color):
    """按 brand/logo.svg 的几何画 N 折线（viewBox 32）。"""
    scale = size / 32
    points = [
        (x + 11 * scale, y + 21.5 * scale),
        (x + 11 * scale, y + 10.5 * scale),
        (x + 21 * scale, y + 21.5 * scale),
        (x + 21 * scale, y + 10.5 * scale),
    ]
    width = max(2, round(2.8 * scale))
    draw.line(points, fill=color, width=width, joint="curve")
    radius = width / 2
    for px, py in (points[0], points[-1]):
        draw.ellipse([px - radius, py - radius, px + radius, py + radius], fill=color)


def build_og() -> Image.Image:
    width, height = 1200, 630
    image = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(image)

    # 右侧几何装饰
    draw.ellipse([830, 80, 1180, 430], outline=ACID, width=3)
    draw.ellipse([1084, 426, 1174, 516], fill=ACID)
    draw.line([80, 152, 292, 152], fill=ACID, width=6)

    # logo：深色背景上用浅底墨线的固定深色版
    draw.rounded_rectangle([80, 80, 176, 176], radius=24, fill=LIGHT)
    draw_n(draw, 80, 80, 96, INK)

    draw.text((80, 224), "AuthNexus Design", font=font(76), fill=FG)
    draw.text((80, 330), "Token-driven design system", font=font(38), fill=MUTED)
    draw.text((80, 402), "鉴枢设计系统 · 零 UI 框架 · 明暗双主题", font=font(32), fill=ACID)
    draw.text((80, 536), "authnexus-design.casuainess.cn", font=font(24), fill=DIM)
    return image


def build_icon() -> Image.Image:
    size = 180
    image = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(image)
    draw_n(draw, 0, 0, size, FG)
    return image


def main() -> None:
    BRAND.mkdir(parents=True, exist_ok=True)
    og = build_og()
    og.save(BRAND / "og.png", optimize=True)
    icon = build_icon()
    icon.save(BRAND / "apple-touch-icon.png", optimize=True)
    print(f"wrote {BRAND / 'og.png'} ({og.width}x{og.height})")
    print(f"wrote {BRAND / 'apple-touch-icon.png'} ({icon.width}x{icon.height})")


if __name__ == "__main__":
    main()
