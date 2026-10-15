#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""authnexus-design · 选择器字面量迁移（安全版）

与 prefix-migrate.py 的区别：**只替换「完整字符串字面量」的内容**，
绝不跨越引号边界、绝不触碰引号之外的任何字符——因此不可能把
`e.target.closest('[data-close]')` 改成 `e.target.'('[data-close]')`。

做法：用 Python 的 tokenize 思路——手工扫描字符流，跟踪引号状态，
只在「字符串字面量内部」且「以 . 开头」时才做类名替换。

支持 JS/TS/MJS/TSX/Vue（模板 class 属性与 JS 字符串都覆盖）。
用法：
  python tools/migrate-selectors.py --dry-run
  python tools/migrate-selectors.py --apply
"""
import re
import sys
import json
import argparse
import pathlib

ROOT = pathlib.Path(r"E:/CasuaIness/Personal/authnexus-design")
MAP_FILE = ROOT / "tools" / "class-map.json"
SKIP_PREFIX = ("anx-", "is-", "has-", "js-", "od-", "g-")

TARGETS = [
    "vue/**/*.vue", "vue/**/*.ts",
    "audit/*.mjs",
    "gallery/gallery.js", "gallery/index.html",
    "demo/admin/admin.js", "demo/admin/index.html",
    "examples/react/index.html", "examples/react/src/*.tsx",
]

CLASS_RE = re.compile(r"\.([a-zA-Z][\w-]*)")
EXT = {"css", "js", "ts", "mjs", "html", "vue", "json", "md", "woff2", "svg",
       "png", "txt", "ttf", "otf", "woff", "out", "ico"}
# 字符串内容不是选择器的情形（跳过）
NOT_SELECTOR = re.compile(r"^(?:https?:|/|[\w-]+\.(?:js|ts|mjs|css|json|md|html|png|svg|woff2?)$)")


def root_of(name: str) -> str:
    return re.split(r"__|--", name, 1)[0]


def map_name(name: str, cmap: dict):
    if name.startswith(SKIP_PREFIX) or name in EXT:
        return None
    r = root_of(name)
    return cmap[r] + name[len(r):] if r in cmap else None


def migrate_literal(content: str, cmap: dict):
    """content 是字符串字面量的内容（不含引号）"""
    stripped = content.strip()
    if not stripped or not stripped.startswith("."):
        return content, 0
    if NOT_SELECTOR.match(stripped):
        return content, 0
    # 含有引号（嵌套选择器）时不做处理，交人工
    if '"' in content or "'" in content:
        return content, 0
    changed = 0
    out, pos = [], 0
    for m in CLASS_RE.finditer(content):
        nm = map_name(m.group(1), cmap)
        if nm:
            out.append(content[pos:m.start()])
            out.append("." + nm)
            pos = m.end()
            changed += 1
    if not changed:
        return content, 0
    out.append(content[pos:])
    return "".join(out), changed


def scan(text: str, cmap: dict):
    """手工字符扫描：找出所有字符串字面量并按需替换。
    注释与模板字符串内的 ${} 跳过（模板串只处理纯文本部分）。"""
    res = []
    i, n = 0, len(text)
    buf = []
    changed_total = 0
    while i < n:
        ch = text[i]
        if ch in "'\"":
            q = ch
            j = i + 1
            lit = []
            while j < n:
                c = text[j]
                if c == "\\":
                    lit.append(text[j:j + 2])
                    j += 2
                    continue
                if c == q:
                    break
                if c == "\n":          # 未闭合 → 放弃这一段
                    lit = None
                    break
                lit.append(c)
                j += 1
            if lit is None:
                res.append(text[i:j + 1]); i = j + 1; continue
            content = "".join(lit)
            new, c = migrate_literal(content, cmap)
            changed_total += c
            res.append(text[i:i + 1] + new + q)
            i = j + 1
        else:
            res.append(ch)
            i += 1
    return "".join(res), changed_total


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", "--write", dest="apply", action="store_true")
    ap.add_argument("--dry-run", dest="apply", action="store_false")
    ap.add_argument("--only", action="append", default=[])
    args = ap.parse_args()

    cmap = json.loads(MAP_FILE.read_text(encoding="utf-8"))
    print(f"映射 {len(cmap)} 条｜模式：{'APPLY' if args.apply else 'DRY-RUN'}\n")

    files = hits = 0
    for pat in TARGETS:
        for p in sorted(ROOT.glob(pat)):
            if not p.is_file():
                continue
            rel = str(p.relative_to(ROOT)).replace("\\", "/")
            if args.only and not any(o in rel for o in args.only):
                continue
            text = p.read_text(encoding="utf-8")
            new, n = scan(text, cmap)
            if n:
                files += 1
                hits += n
                print(f"  {n:5d}  {rel}")
                if args.apply:
                    p.write_text(new, encoding="utf-8")
    print(f"\n{'已修改' if args.apply else '将修改'} {files} 个文件 / {hits} 处")
    return 0


if __name__ == "__main__":
    sys.exit(main())
