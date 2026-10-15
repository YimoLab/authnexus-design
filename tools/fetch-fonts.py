#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""authnexus-design · 字体获取与 fonts.css 生成

从 Google Fonts 官方 CSS（fonts/_gf.css）解析并下载 latin / latin-ext 段的
woff2（零修改官方子集文件），生成自托管 fonts.css。

关键处理（可变字体）：
  Google 对**可变字体**（如 Albert Sans）每个 unicode-range 只返回**一份**文件，
  多个字重的 @font-face 指向同一个 URL。若按字重各存一份，会得到 4 个 md5 相同
  的文件（白多 ~87KB）。本脚本按 (family, subset) 分组：
    组内 URL 唯一 ⇒ 可变字体：只存一份 `{slug}-{subset}.woff2`，
      @font-face 用权重区间 `font-weight: <min> <max>` 声明（浏览器自行插值 wght 轴）；
    组内 URL 多个 ⇒ 静态字体：逐字重存 `{slug}-{weight}-{subset}.woff2`。
  生成后会删除不再被引用的旧 woff2（fonts/ 专用于本脚本，不会误删其他文件）。

用法：
  1. curl 获取官方 CSS 到 fonts/_gf.css（现代 UA 以获得 woff2）
  2. python tools/fetch-fonts.py
"""

import re
import sys
import pathlib
import urllib.request

FONTS_DIR = pathlib.Path(r"E:/CasuaIness/Personal/authnexus-design/fonts")
GF_CSS = FONTS_DIR / "_gf.css"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
SLUG = {"Albert Sans": "albert-sans", "IBM Plex Mono": "ibm-plex-mono"}
ORDER = {"Albert Sans": 0, "IBM Plex Mono": 1}
KEEP_SUBSETS = {"latin", "latin-ext"}
SUBSET_ORDER = {"latin": 0, "latin-ext": 1}
WEIGHT_RE = r"font-weight:\s*(\d+)(?:\s+(\d+))?\s*;"


def parse(css: str):
    faces = []
    current_subset = None
    for m in re.finditer(r"/\*\s*([a-z0-9-]+)\s*\*/|@font-face\s*{([^}]*)}", css, re.S):
        if m.group(1):
            current_subset = m.group(1)
        else:
            body = m.group(2)
            fam = re.search(r"font-family:\s*'([^']+)'", body).group(1)
            wm = re.search(WEIGHT_RE, body)
            w_min = int(wm.group(1))
            w_max = int(wm.group(2)) if wm.group(2) else w_min
            url = re.search(r"url\((https://[^)]+)\)", body).group(1)
            ur = re.search(r"unicode-range:\s*([^;]+);", body)
            faces.append({
                "subset": current_subset,
                "family": fam,
                "w_min": w_min,
                "w_max": w_max,
                "url": url,
                "unicode_range": ur.group(1).strip() if ur else None,
            })
    return faces


def download(url: str, dest: pathlib.Path) -> None:
    if dest.exists():
        print(f"  已存在 {dest.name}")
        return
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    data = urllib.request.urlopen(req, timeout=30).read()
    dest.write_bytes(data)
    print(f"  下载 {dest.name:34s} {len(data) / 1024:6.1f} KB")


def main() -> int:
    if not GF_CSS.exists():
        print(f"ERROR: 未找到 {GF_CSS}，请先用 curl 获取官方 CSS")
        return 1
    css = GF_CSS.read_text(encoding="utf-8")
    faces = parse(css)
    print(f"解析出 {len(faces)} 个 @font-face")

    kept = [f for f in faces if f["subset"] in KEEP_SUBSETS]
    skipped = len(faces) - len(kept)
    if skipped:
        print(f"跳过非 latin 段 {skipped} 个（cyrillic / vietnamese / …）")

    # 按 (family, subset) 分组，判断可变 / 静态
    groups: dict[tuple, list] = {}
    for f in kept:
        groups.setdefault((f["family"], f["subset"]), []).append(f)

    entries = []
    for (fam, subset), gfaces in groups.items():
        urls = {f["url"] for f in gfaces}
        w_min = min(f["w_min"] for f in gfaces)
        w_max = max(f["w_max"] for f in gfaces)
        if len(urls) == 1 and w_max > w_min:
            # 可变字体：一份文件 + 权重区间
            fname = f"{SLUG[fam]}-{subset}.woff2"
            download(gfaces[0]["url"], FONTS_DIR / fname)
            entries.append({
                "family": fam, "subset": subset, "fname": fname,
                "w_min": w_min, "w_max": w_max,
                "unicode_range": gfaces[0]["unicode_range"],
                "note": "可变字体（一份文件覆盖该区间，wght 轴由浏览器插值）",
            })
        else:
            # 静态字体：逐字重
            for f in sorted(gfaces, key=lambda x: x["w_min"]):
                fname = f"{SLUG[fam]}-{f['w_min']}-{subset}.woff2"
                download(f["url"], FONTS_DIR / fname)
                entries.append({
                    "family": fam, "subset": subset, "fname": fname,
                    "w_min": f["w_min"], "w_max": f["w_max"],
                    "unicode_range": f["unicode_range"],
                    "note": "静态字体" if f["w_min"] == f["w_max"] else "可变区间",
                })

    entries.sort(key=lambda e: (ORDER.get(e["family"], 9), e["w_min"], SUBSET_ORDER.get(e["subset"], 9)))

    # 清理不再被引用的旧 woff2
    expected = {e["fname"] for e in entries}
    removed = []
    for p in sorted(FONTS_DIR.glob("*.woff2")):
        if p.name not in expected:
            p.unlink()
            removed.append(p.name)
    if removed:
        print("清理冗余字体文件：" + ", ".join(removed))

    lines = [
        "/* ==========================================================================",
        "   AuthNexus Design · fonts.css — 自托管字体",
        "   --------------------------------------------------------------------------",
        "   Albert Sans（可变字体，一份文件覆盖 400–700）· IBM Plex Mono（静态 500/600）",
        "   各取 latin + latin-ext 两个 unicode-range 子集。",
        "   来源：Google Fonts 官方子集 woff2（零修改）；两族均为 SIL OFL 1.1，",
        "   许可证与版权声明见同目录 OFL-AlbertSans.txt / OFL-IBMPlexMono.txt。",
        "   引入顺序：fonts.css 最先（字体定义），随后 tokens → brand → base → components → motion。",
        "   ========================================================================== */",
        "",
    ]
    for e in entries:
        w = str(e["w_min"]) if e["w_min"] == e["w_max"] else f"{e['w_min']} {e['w_max']}"
        lines += [
            f"/* {e['family']} · {w} · {e['subset']} — {e['note']} */",
            "@font-face {",
            f"  font-family: '{e['family']}';",
            "  font-style: normal;",
            f"  font-weight: {w};",
            "  font-display: swap;",
            f"  src: url({e['fname']}) format('woff2');",
        ]
        if e["unicode_range"]:
            lines.append(f"  unicode-range: {e['unicode_range']};")
        lines += ["}", ""]

    out = FONTS_DIR / "fonts.css"
    out.write_text("\n".join(lines), encoding="utf-8")
    total = sum((FONTS_DIR / e["fname"]).stat().st_size for e in entries)
    print(f"生成 {out.name}：{len(entries)} 个 @font-face / {len(expected)} 个文件，字体总体积 {total / 1024:.1f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
