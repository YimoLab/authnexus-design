#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""authnexus-design · 字体获取与 fonts.css 生成

从 Google Fonts 官方 CSS（fonts/_gf.css）解析并下载 latin / latin-ext 段的
woff2（零修改官方子集文件），生成自托管 fonts.css。
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


def parse(css: str):
    faces = []
    current_subset = None
    for m in re.finditer(r"/\*\s*([a-z0-9-]+)\s*\*/|@font-face\s*{([^}]*)}", css, re.S):
        if m.group(1):
            current_subset = m.group(1)
        else:
            body = m.group(2)
            fam = re.search(r"font-family:\s*'([^']+)'", body).group(1)
            w = re.search(r"font-weight:\s*(\d+)", body).group(1)
            url = re.search(r"url\((https://[^)]+)\)", body).group(1)
            ur = re.search(r"unicode-range:\s*([^;]+);", body)
            faces.append({
                "subset": current_subset,
                "family": fam,
                "weight": int(w),
                "url": url,
                "unicode_range": ur.group(1).strip() if ur else None,
            })
    return faces


def main() -> int:
    if not GF_CSS.exists():
        print(f"ERROR: 未找到 {GF_CSS}，请先用 curl 获取官方 CSS")
        return 1
    css = GF_CSS.read_text(encoding="utf-8")
    faces = parse(css)
    print(f"解析出 {len(faces)} 个 @font-face")

    keep = []
    skipped = []
    for f in faces:
        if f["subset"] not in KEEP_SUBSETS:
            skipped.append(f"{f['family']} {f['weight']} ({f['subset']})")
            continue
        slug = SLUG[f["family"]]
        fname = f"{slug}-{f['weight']}-{f['subset']}.woff2"
        dest = FONTS_DIR / fname
        if not dest.exists():
            req = urllib.request.Request(f["url"], headers={"User-Agent": UA})
            data = urllib.request.urlopen(req, timeout=30).read()
            dest.write_bytes(data)
            print(f"  下载 {fname:38s} {len(data) / 1024:6.1f} KB")
        else:
            print(f"  已存在 {fname}")
        keep.append((f, fname))

    if skipped:
        print(f"跳过非 latin 段 {len(skipped)} 个：{', '.join(sorted(set(skipped))[:10])}{' …' if len(skipped) > 10 else ''}")

    keep.sort(key=lambda t: (ORDER.get(t[0]["family"], 9), t[0]["weight"], SUBSET_ORDER.get(t[0]["subset"], 9)))

    lines = [
        "/* ==========================================================================",
        "   AuthNexus Design · fonts.css — 自托管字体",
        "   --------------------------------------------------------------------------",
        "   Albert Sans 400/500/600/700 · IBM Plex Mono 500/600（latin + latin-ext 子集）",
        "   来源：Google Fonts 官方子集 woff2（零修改）；两族均为 SIL OFL 1.1，",
        "   许可证与版权声明见同目录 OFL-AlbertSans.txt / OFL-IBMPlexMono.txt。",
        "   引入顺序：fonts.css 最先（字体定义），随后 tokens → brand → base → components → motion。",
        "   ========================================================================== */",
        "",
    ]
    for f, fname in keep:
        lines += [
            f"/* {f['family']} · {f['weight']} · {f['subset']} */",
            "@font-face {",
            f"  font-family: '{f['family']}';",
            "  font-style: normal;",
            f"  font-weight: {f['weight']};",
            "  font-display: swap;",
            f"  src: url({fname}) format('woff2');",
        ]
        if f["unicode_range"]:
            lines.append(f"  unicode-range: {f['unicode_range']};")
        lines += ["}", ""]

    out = FONTS_DIR / "fonts.css"
    out.write_text("\n".join(lines), encoding="utf-8")
    total = sum((FONTS_DIR / fn).stat().st_size for _f, fn in keep)
    print(f"生成 {out.name}：{len(keep)} 个 @font-face，字体总体积 {total / 1024:.1f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
