#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""authnexus-design · CSS 摘离工具

从鉴枢 app.css 按「节」机械摘离为 css/ 五件套的 raw 版本（逐字、零丢失）。
- 节头识别：`/* ------` + `   N. 标题` 两行组合
- 节映射见 SECTIONS；`leftover` = 留在鉴枢、不抽走
- 运行结束自动校验：所有区间拼回 == 原文件（逐字），并打印报告
- 精修（剔除兼容别名/品牌项、追加子拆块、头注释）在 raw 之上手工完成

用法：python tools/extract-css.py [源文件] [输出目录]
"""

import re
import sys
import pathlib

SRC = sys.argv[1] if len(sys.argv) > 1 else r"E:/CasuaIness/Personal/auth-nexus/app/src/styles/app.css"
OUT_DIR = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else r"E:/CasuaIness/Personal/authnexus-design/css")

# 节号 -> 目标（tokens / base / components / motion / leftover）
SECTIONS = {
    "1": "tokens",
    "2": "base", "3": "base",
    "4": "leftover",
    "5": "base", "6": "base", "6b": "base", "7": "base", "8": "base",
    "9": "base", "10": "base", "11": "base", "12": "base", "13": "base",
    "14": "base", "15": "base",
    "16": "components",
    "17": "leftover", "18": "leftover", "19": "leftover", "20": "leftover",
    "20b": "components",
    "20c": "leftover",
    "20d": "tokens",
    "20e": "leftover",
    "21": "leftover", "22": "leftover", "23": "leftover", "24": "leftover",
    "25": "leftover", "26": "leftover", "27": "leftover",
    "28": "components", "29": "components", "30": "components",
    "31": "leftover",
    "32": "motion",
    "33": "components", "34": "components",
    "35": "motion",
    "36": "leftover",
}


def main() -> int:
    text = pathlib.Path(SRC).read_text(encoding="utf-8")
    lines = text.splitlines(keepends=True)

    # 找节头
    heads = []  # (line_index_of_comment_start, section_name)
    for i, ln in enumerate(lines):
        if re.match(r"/\* -{10,}\s*$", ln.rstrip("\n")) and i + 1 < len(lines):
            m = re.match(r"   (\d+[a-z]?)\. ", lines[i + 1])
            if m:
                heads.append((i, m.group(1)))

    if not heads:
        print("ERROR: 未找到任何节头，检查节头格式")
        return 1

    # 切节区间
    spans = []  # (name, start, end) inclusive
    for idx, (start, name) in enumerate(heads):
        end = heads[idx + 1][0] - 1 if idx + 1 < len(heads) else len(lines) - 1
        spans.append((name, start, end))

    # 头部区间：文件开头到第一节之前
    head_part = (0, heads[0][0] - 1)

    # od-layout 块（头部内的 @layer 区块）
    od_start = od_end = None
    for i in range(*[head_part[0], head_part[1] + 1]):
        if "OD-LAYOUT-PRIMITIVES v1" in lines[i] and od_start is None:
            od_start = i
        if "/OD-LAYOUT-PRIMITIVES v1 */" in lines[i]:
            od_end = i
    od_block = []
    if od_start is not None and od_end is not None:
        od_block = lines[od_start: od_end + 1]

    # 完整校验：head + 所有节拼回 == 原文
    rebuilt = "".join(lines[head_part[0]: head_part[1] + 1])
    rebuilt += "".join("".join(lines[s:e + 1]) for (_n, s, e) in spans)
    if rebuilt != text:
        print("ERROR: 区间拼回与原文不一致，终止")
        return 2

    # 按目标归组（保持源顺序）
    grouped = {"tokens": [], "base": [], "components": [], "motion": [], "leftover": []}
    unknown = []
    for (name, s, e) in spans:
        target = SECTIONS.get(name)
        if target is None:
            unknown.append(name)
            continue
        grouped[target].append(lines[s:e + 1])
    if unknown:
        print("ERROR: 未映射的节：", unknown)
        return 3

    # base 前置 od-layout 块
    if od_block:
        grouped["base"].insert(0, od_block)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    report = []
    for target in ("tokens", "base", "components", "motion"):
        content = "".join("".join(part) for part in grouped[target])
        out = OUT_DIR / f"{target}.raw.css"
        out.write_text(content, encoding="utf-8")
        report.append((target, content.count("\n") + 1, len(content)))

    # leftover 写到临时区供人工核对（不入资产）
    left = "".join("".join(part) for part in grouped["leftover"])
    (OUT_DIR / "_leftover.raw.css").write_text(left, encoding="utf-8")

    print(f"源：{SRC}（{len(lines)} 行）")
    for name, ln, ch in report:
        print(f"  {name:12s} -> {name}.raw.css  {ln:5d} 行 / {ch:7d} 字符")
    print(f"  {'leftover':12s} -> _leftover.raw.css  {left.count(chr(10)) + 1:5d} 行（留在鉴枢）")
    print(f"节总数：{len(spans)}；拼接校验：PASS（逐字一致）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
