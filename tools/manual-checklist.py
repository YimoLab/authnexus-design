#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""authnexus-design · 人工迁移清单（只读）

自动迁移只处理「能 100% 判定安全」的字面量（class 属性 / classList / className）；
JS 里的选择器字符串（querySelector / locator / page.click 等）一律由人工确认——
正则改代码里的字符串必然有误伤风险（曾把 e.target.closest('[data-close]')
改成 e.target.'('[data-close]')）。

本脚本输出待改清单：文件:行号 + 原文 + 建议替换，可直接照着改。

用法：python tools/manual-checklist.py [子串过滤...]
"""
import re
import sys
import json
import pathlib

ROOT = pathlib.Path(r"E:/CasuaIness/Personal/authnexus-design")
MAP_FILE = ROOT / "tools" / "class-map.json"
SKIP_PREFIX = ("anx-", "is-", "has-", "js-", "od-", "g-")

FILES = [
    "vue/**/*.vue", "vue/**/*.ts",
    "audit/*.mjs",
    "gallery/gallery.js", "gallery/index.html",
    "demo/admin/admin.js", "demo/admin/index.html",
    "examples/react/index.html", "examples/react/src/*.tsx",
    "docs/*.md", "README.md", "vue/README.md", "demo/README.md", "audit/README.md",
]

# 选择器字符串所在位置：函数名 + 参数序号（0 起）
SELECTOR_CALLS = {
    "querySelector": 0, "querySelectorAll": 0, "closest": 0, "matches": 0,
    "getElementsByClassName": 0,
    "waitForSelector": 0, "waitForSelectorAll": 0, "locator": 0,
    "click": 0, "dblclick": 0, "hover": 0, "focus": 0, "blur": 0,
    "fill": 0, "type": 0, "press": 0, "selectOption": 0, "setInputFiles": 0,
    "getAttribute": 0, "waitForFunction": 0,
}
# 自建别名（本仓审计脚本里的 q()）
ALIAS_CALLS = {"q": 0}
# 元素标签名（不是 class）
ELEMS = {
    "select", "textarea", "input", "button", "div", "span", "svg", "table", "code",
    "a", "p", "dl", "h1", "h2", "h3", "h4", "li", "ul", "ol", "section", "header",
    "strong", "em", "label", "pre", "td", "th", "tr", "tbody", "thead", "small",
    "img", "b", "i", "main", "nav", "footer", "aside", "article", "figure", "hr",
    "br", "option", "form", "fieldset", "legend", "dt", "dd", "html", "body", "head",
    "title", "style", "script", "link", "meta", "path", "circle", "g",
}
EXT = {"css", "js", "ts", "mjs", "html", "vue", "json", "md", "woff2", "svg",
       "png", "txt", "ttf", "otf", "woff", "out", "png", "ico"}


def root_of(name: str) -> str:
    return re.split(r"__|--", name, 1)[0]


def map_name(name: str, cmap: dict):
    if name.startswith(SKIP_PREFIX) or name in EXT:
        return None
    r = root_of(name)
    return cmap[r] + name[len(r):] if r in cmap else None


def suggest(sel: str, cmap: dict):
    """给选择器字符串生成建议替换；只动点号后的类名，其余原样"""
    out, changed = [], 0
    pos = 0
    for m in re.finditer(r"\.([a-zA-Z][\w-]*)", sel):
        nm = map_name(m.group(1), cmap)
        if nm:
            out.append(sel[pos:m.start()])
            out.append("." + nm)
            pos = m.end()
            changed += 1
    out.append(sel[pos:])
    return "".join(out), changed


def main() -> int:
    filters = sys.argv[1:]
    cmap = json.loads(MAP_FILE.read_text(encoding="utf-8"))
    total = 0
    print("人工迁移清单（只读，不修改文件）\n")

    for pat in FILES:
        for p in sorted(ROOT.glob(pat)):
            if not p.is_file():
                continue
            rel = str(p.relative_to(ROOT)).replace("\\", "/")
            if filters and not any(f in rel for f in filters):
                continue
            text = p.read_text(encoding="utf-8")
            lines_out = []
            for i, line in enumerate(text.splitlines(), 1):
                # 找所有 xxx('...') 形式的调用
                for m in re.finditer(
                    r"\b(" + "|".join(list(SELECTOR_CALLS) + list(ALIAS_CALLS)) +
                    r")\s*(?:<[^>]*>)?\s*\(\s*(['\"])(.+?)\2", line
                ):
                    fn, q, sel = m.group(1), m.group(2), m.group(3)
                    if not sel.lstrip().startswith("."):
                        continue          # 非选择器（className 值等）→ 交给自动迁移
                    new, n = suggest(sel, cmap)
                    if n:
                        total += n
                        lines_out.append((i, sel, new))
            for i, sel, new in lines_out:
                print(f"{rel}:{i}")
                print(f"    旧  {q}{sel}{q}")
                print(f"    新  {q}{new}{q}")

    print(f"\n合计待人工迁移 {total} 处")
    return 0


if __name__ == "__main__":
    sys.exit(main())
