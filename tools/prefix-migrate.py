#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""authnexus-design · anx- 前缀迁移工具

从 css/*.css 反推「资产类根名」集合（唯一真相），生成 tools/class-map.json，
再按目标类型做机械前缀替换。

替换规则：把 class 根名前加 anx-，BEM 后缀与单连字符原样保留
    btn                → anx-btn
    btn--primary       → anx-btn--primary
    fsel__btn          → anx-fsel__btn
    page-head          → anx-page-head
    t-h1               → anx-t-h1
    fsel-pop-enter-from→ anx-fsel-pop-enter-from
不加前缀：is-* has-* js-* od-* g-*（状态与第三方/画廊层）、CSS 自定义属性、元素选择器。

用法：
  python tools/prefix-migrate.py --map                 # 生成/刷新 class-map.json
  python tools/prefix-migrate.py --target css --dry-run # 预演（打印将要改的文件与命中数）
  python tools/prefix-migrate.py --target css --apply   # 执行
  python tools/prefix-migrate.py --target all  --apply
可用 --only <子串> 限定文件（可重复）。

安全：CSS 侧先保护注释与 url(...) 内容；已经是 anx- 的名字跳过（可重复执行）。
"""
import re
import sys
import json
import argparse
import pathlib

ROOT = pathlib.Path(r"E:/CasuaIness/Personal/authnexus-design")
MAP_FILE = ROOT / "tools" / "class-map.json"
PREFIX = "anx-"

# 明确不加前缀的前缀
SKIP_PREFIX = ("is-", "has-", "js-", "od-", "g-", "anx-")

# 各目标的文件集合
TARGETS = {
    "css":    ["css/*.css"],
    "vue":    ["vue/**/*.vue", "vue/**/*.ts"],
    "audit":  ["audit/*.mjs"],
    "web":    ["gallery/index.html", "gallery/gallery.js",
               "demo/admin/index.html", "demo/admin/admin.js",
               "examples/react/index.html", "examples/react/src/*.tsx"],
    "docs":   ["README.md", "docs/*.md", "vue/README.md", "demo/README.md",
               "audit/README.md", "examples/vue/README.md", "examples/react/README.md",
               "gallery/*.md", "tools/*.py", "tools/*.sh", "tools/*.mjs"],
}
# 只在 docs/tools 里替换「反引号包裹的 class」与「选择器」，避免误伤散文
DOC_SAFE = True


def root_of(name: str) -> str:
    return re.split(r"__|--", name, 1)[0]


def clean_css(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", " ", text, flags=re.S)
    return re.sub(r"url\([^)]*\)", " ", text)


def build_map() -> dict:
    """从 css/*.css 反推资产类根名 → 映射到 anx- 版本"""
    roots = set()
    for p in sorted(ROOT.glob("css/*.css")):
        for name in re.findall(r"\.([a-zA-Z][\w-]*)", clean_css(p.read_text(encoding="utf-8"))):
            if name.startswith(SKIP_PREFIX):
                continue
            roots.add(root_of(name))
    return {r: PREFIX + r for r in sorted(roots)}


def load_map() -> dict:
    if MAP_FILE.exists():
        return json.loads(MAP_FILE.read_text(encoding="utf-8"))
    return build_map()


# ---------------------------------------------------------------- CSS
CSS_CLASS = re.compile(r"\.([a-zA-Z][\w-]*)")
CSS_PROTECT = re.compile(r"(/\*.*?\*/|url\([^)]*\))", re.S)


def map_name(name: str, cmap: dict) -> str | None:
    if name.startswith(SKIP_PREFIX):
        return None
    r = root_of(name)
    if r not in cmap:
        return None
    return cmap[r] + name[len(r):]


def migrate_css(text: str, cmap: dict):
    parts = CSS_PROTECT.split(text)
    changed = [0]
    for i in range(0, len(parts), 2):        # 偶数位是「正文」，奇数位是被保护的分隔符
        seg = parts[i]
        if not seg:                          # 分隔符之间可能出现空/None 段
            continue

        def repl(m):
            new = map_name(m.group(1), cmap)
            if new:
                changed[0] += 1
                return "." + new
            return m.group(0)

        parts[i] = CSS_CLASS.sub(repl, seg)
    return "".join(parts), changed[0]


# ---------------------------------------------------------------- HTML class 属性
HTML_CLASS_ATTR = re.compile(r"""(?<![:\w-])class\s*=\s*(["'])([^"']*)\1""")


def migrate_class_attr(value: str, cmap: dict):
    out, changed = [], 0
    for tok in value.split():
        new = map_name(tok, cmap)
        if new:
            out.append(new)
            changed += 1
        else:
            out.append(tok)
    return " ".join(out), changed


def migrate_html(text: str, cmap: dict):
    changed = [0]

    def repl(m):
        q, val = m.group(1), m.group(2)
        new, n = migrate_class_attr(val, cmap)
        changed[0] += n
        return f"class={q}{new}{q}"

    return HTML_CLASS_ATTR.sub(repl, text), changed[0]


# ---------------------------------------------------------------- JS/TS 选择器字面量
JS_SELECTOR = re.compile(
    r"""(querySelectorAll|querySelector|closest|matches|getElementsByClassName)\s*\(\s*(['"])([^'"]*)\2""")
JS_CLASSLIST = re.compile(r"""(classList\.(?:add|remove|toggle|contains|replace)\s*\(\s*)(['"])([^'"]*)\2""")
JS_CLASSNAME = re.compile(r"""(className\s*=\s*)(['"])([^'"]*)\2""")
JS_SETCLASS = re.compile(r"""(setAttribute\(\s*(['"])class\2\s*,\s*)(['"])([^'"]*)\3""")
# Vue 模板里 :class="{ 'btn btn--acid': cond }" 的键
VUE_BIND_KEY = re.compile(r"""(['"])([a-z][\w\s-]*)\1(\s*:)""")


def migrate_js(text: str, cmap: dict):
    changed = [0]

    def sub_attr(m, value_group):
        new, n = migrate_class_attr(m.group(value_group), cmap)
        changed[0] += n
        return m.group(0)[: m.start(value_group) - m.start(0)] + new + m.group(0)[m.end(value_group) - m.start(0):]

    def repl_selector(m):
        head, q, val = m.group(1), m.group(2), m.group(3)
        new, n = migrate_class_attr(val, cmap)
        changed[0] += n
        return f"{head}({q}{new}{q}"

    def repl_classlist(m):
        head, q, val = m.group(1), m.group(2), m.group(3)
        new, n = migrate_class_attr(val, cmap)
        changed[0] += n
        return f"{head}{q}{new}{q}"

    text = JS_SELECTOR.sub(repl_selector, text)
    text = JS_CLASSLIST.sub(repl_classlist, text)

    def repl_classname(m):
        q, val = m.group(2), m.group(3)
        new, n = migrate_class_attr(val, cmap)
        changed[0] += n
        return f"{m.group(1)}{q}{new}{q}"

    text = JS_CLASSNAME.sub(repl_classname, text)
    text = JS_SETCLASS.sub(repl_classname, text)
    return text, changed[0]


# ---------------------------------------------------------------- 文档（保守）
DOC_CLASS = re.compile(r"\.([a-zA-Z][\w-]*)")


def migrate_doc(text: str, cmap: dict):
    """文档里只替换反引号包裹的 `.class` 与行内代码块中的 class 引用，
    避免把散文/文件名里的点号误改。"""
    changed = [0]
    protect = re.compile(r"(```.*?```|`[^`\n]*`)", re.S)
    parts = protect.split(text)

    def repl(seg):
        def inner(m):
            new = map_name(m.group(1), cmap)
            if new:
                changed[0] += 1
                return "." + new
            return m.group(0)
        return DOC_CLASS.sub(inner, seg)

    for i in range(0, len(parts), 2):
        parts[i] = inner(parts[i])
    return "".join(parts), changed[0]


HANDLERS = {
    "css": lambda t, m: migrate_css(t, m),
    "web_html": lambda t, m: migrate_html(t, m),
    "web": lambda t, m: migrate_js(migrate_html(t, m)[0], m),
    "vue": lambda t, m: migrate_js(migrate_html(t, m)[0], m),
    "audit": lambda t, m: migrate_js(migrate_html(t, m)[0], m),
    "docs": migrate_doc,
}


def handler_for(path: pathlib.Path, target: str):
    if target == "css":
        return HANDLERS["css"]
    if target == "docs":
        return HANDLERS["docs"]
    if path.suffix == ".html":
        return HANDLERS["web_html"]
    if path.suffix in (".js", ".mjs", ".ts", ".tsx", ".vue"):
        return HANDLERS[target if target in ("vue", "audit") else "web"]
    return HANDLERS[target]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--map", action="store_true", help="生成 class-map.json")
    ap.add_argument("--target", default="all", choices=list(TARGETS) + ["all"])
    ap.add_argument("--apply", "--write", dest="apply", action="store_true",
                    help="实际写入（缺省为预演，只报告不落盘）")
    ap.add_argument("--dry-run", dest="apply", action="store_false",
                    help="显式预演（默认行为）")
    ap.add_argument("--only", action="append", default=[])
    args = ap.parse_args()

    if args.map:
        cmap = build_map()
        MAP_FILE.write_text(json.dumps(cmap, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"class-map.json：{len(cmap)} 个根类 → {PREFIX}*")
        return 0

    cmap = load_map()
    if not cmap:
        print("ERROR: class-map 为空，请先 --map", file=sys.stderr)
        return 1
    print(f"载入映射 {len(cmap)} 条（前缀 {PREFIX}）｜模式：{'APPLY' if args.apply else 'DRY-RUN'}\n")

    targets = list(TARGETS) if args.target == "all" else [args.target]
    total_files = total_hits = 0
    for t in targets:
        for pat in TARGETS[t]:
            for p in sorted(ROOT.glob(pat)):
                if not p.is_file():
                    continue
                rel = str(p.relative_to(ROOT)).replace("\\", "/")
                if args.only and not any(o in rel for o in args.only):
                    continue
                text = p.read_text(encoding="utf-8")
                new, n = handler_for(p, t)(text, cmap)
                if n == 0:
                    continue
                total_files += 1
                total_hits += n
                print(f"  {n:5d}  {rel}")
                if args.apply:
                    p.write_text(new, encoding="utf-8")

    print(f"\n{'已修改' if args.apply else '将修改'} {total_files} 个文件 / {total_hits} 处")
    if not args.apply:
        print("（这是预演，加 --apply 才会写入）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
