#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""authnexus-design · class 名只读盘点（anx- 前缀迁移的基准）

按文件类型分别精确提取 class 名，避免把 JS 属性/方法访问误判成 class：
  · .css          → 去掉注释与 url() 后，`.foo` 全部是 class 选择器
  · .html/.vue 模板→ class="..." 属性 + :class 里的字符串字面量
  · .js/.mjs/.ts/.tsx/.vue 脚本 → 只从「选择器类 API」的字符串实参里取
    （querySelector(All) / closest / matches / classList.* / className / setAttribute('class')）

分类输出：
  A 资产类   —— 定义在 css/*.css 里，必须加 anx- 前缀
  B 待审类   —— 代码里用到但资产 CSS 未定义（demo 私有 / 拼写错误 / 已废弃），需人工判定

本脚本不修改任何文件。
用法：python tools/scan-classes.py            # 摘要
      python tools/scan-classes.py --full     # 含引用位置
      python tools/scan-classes.py --review   # 只看 B 类
"""
import re
import sys
import pathlib
import collections

ROOT = pathlib.Path(r"E:/CasuaIness/Personal/authnexus-design")

CSS_FILES = ["css/*.css"]
CODE_FILES = [
    "vue/**/*.vue", "vue/**/*.ts",
    "audit/*.mjs",
    "gallery/gallery.js",
    "demo/admin/admin.js",
    "examples/react/src/*.tsx",
]
TEMPLATE_FILES = ["vue/**/*.vue", "gallery/index.html", "demo/admin/index.html",
                  "examples/react/index.html", "examples/vue/index.html"]
DOC_FILES = ["README.md", "docs/*.md", "vue/README.md", "demo/README.md",
             "audit/README.md", "examples/vue/README.md", "gallery/*.md"]

EXCLUDE_PREFIX = ("od-", "g-", "is-", "has-", "js-")
NOT_CLASS = {"css", "js", "ts", "mjs", "html", "vue", "json", "md", "woff2",
             "svg", "png", "txt", "ttf", "otf", "woff"}

# --- 选择器类 API：只从这些调用的字符串实参里取 class ---
SELECTOR_CALLS = re.compile(
    r"(?:querySelectorAll|querySelector|closest|matches|querySelector\w*)\s*\(\s*['\"]([^'\"]+)['\"]")
CLASSLIST_CALL = re.compile(r"classList\.\w+\s*\(\s*['\"]([^'\"]+)['\"]")
CLASSNAME_SET = re.compile(r"className\s*=\s*['\"]([^'\"]*)['\"]")
SETATTR_CLASS = re.compile(r"setAttribute\s*\(\s*['\"]class['\"]\s*,\s*['\"]([^'\"]*)['\"]")
HTML_CLASS = re.compile(r"""(?<!:)class\s*=\s*["']([^"']*)["']""")
BIND_CLASS = re.compile(r"""(?:^|[\s:])class\s*=\s*["']([^"']*)["']""")
CSS_CLASS = re.compile(r"\.([a-zA-Z][\w-]*)")


def root_of(name: str) -> str:
    # BEM：__ 元素、-- 修饰；单连字符（page-head / t-h1 / grid-2 / fsel-pop-enter）属名字的一部分
    return re.split(r"__|--", name, 1)[0]


def clean_css(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", " ", text, flags=re.S)
    text = re.sub(r"url\([^)]*\)", " ", text)
    return text


def valid(name: str) -> bool:
    name = name.lstrip(".")
    if not name or name in NOT_CLASS:
        return False
    if not re.match(r"^[a-zA-Z][\w-]*$", name):
        return False
    if name.startswith(EXCLUDE_PREFIX):
        return False
    return True


def roots_from_tokens(tokens, sink, where):
    for tok in tokens:
        for piece in tok.split():
            piece = piece.strip().lstrip(".")  # 选择器字符串可能带前导点
            if valid(piece):
                sink[root_of(piece)].append(where)


def scan_css_assets():
    defined = collections.defaultdict(list)
    for pat in CSS_FILES:
        for p in sorted(ROOT.glob(pat)):
            rel = str(p.relative_to(ROOT)).replace("\\", "/")
            text = clean_css(p.read_text(encoding="utf-8"))
            for name in CSS_CLASS.findall(text):
                if valid(name):
                    defined[root_of(name)].append((rel, name))
    return defined


def scan_code():
    used = collections.defaultdict(list)
    for pat in CODE_FILES:
        for p in sorted(ROOT.glob(pat)):
            rel = str(p.relative_to(ROOT)).replace("\\", "/")
            text = p.read_text(encoding="utf-8")
            for i, line in enumerate(text.splitlines(), 1):
                where = f"{rel}:{i}"
                for rx in (SELECTOR_CALLS, CLASSLIST_CALL, CLASSNAME_SET, SETATTR_CLASS):
                    for m in rx.finditer(line):
                        roots_from_tokens(re.split(r"[\s,>+~]+", m.group(1)), used, where)
    return used


def scan_templates():
    used = collections.defaultdict(list)
    for pat in TEMPLATE_FILES:
        for p in sorted(ROOT.glob(pat)):
            rel = str(p.relative_to(ROOT)).replace("\\", "/")
            text = p.read_text(encoding="utf-8")
            for i, line in enumerate(text.splitlines(), 1):
                where = f"{rel}:{i}"
                for rx in (HTML_CLASS, BIND_CLASS):
                    for m in rx.finditer(line):
                        roots_from_tokens(m.group(1).split(), used, where)
                # :class="{ a: cond, 'btn btn--acid': cond }" 里的字符串字面量
                for m in re.finditer(r"""['"]([a-z][\w\s\-]*)['"]\s*:""", line):
                    roots_from_tokens(m.group(1).split(), used, where)
    return used


def scan_docs():
    used = collections.defaultdict(list)
    for pat in DOC_FILES:
        for p in sorted(ROOT.glob(pat)):
            if not p.is_file():
                continue
            rel = str(p.relative_to(ROOT)).replace("\\", "/")
            for i, line in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
                for m in re.finditer(r"\.([a-zA-Z][\w-]*)", line):
                    if valid(m.group(1)):
                        used[root_of(m.group(1))].append(f"{rel}:{i}")
    return used


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    defined = scan_css_assets()
    code = scan_code()
    tpl = scan_templates()
    docs = scan_docs()

    print(f"A 资产类（css/*.css 定义，必须加 anx- 前缀）：{len(defined)} 个")
    print(f"   代码引用：{len({k for k in list(code) + list(tpl)})} 个根类")
    print(f"   文档引用：{len(docs)} 个根类")

    asset_roots = set(defined)
    all_used = collections.defaultdict(list)
    for d in (code, tpl):
        for k, v in d.items():
            all_used[k].extend(v)
    review = {k: v for k, v in all_used.items() if k not in asset_roots}

    if mode == "--review":
        print(f"\nB 待审类（代码用到、资产 CSS 未定义）：{len(review)} 个")
        for r in sorted(review, key=lambda k: -len(review[k])):
            locs = collections.Counter(f.split(":")[0] for f in review[r])
            print(f"  {r:<22}{len(review[r]):>4}  {', '.join(f'{f}×{c}' for f, c in list(locs.most_common())[:3])}")
        return 0

    if mode == "--full":
        print("\n── A 资产类 ──")
        for r in sorted(defined, key=lambda k: -len(defined[k])):
            names = sorted({n for _, n in defined[r]})
            u = len(all_used.get(r, []))
            print(f"  {r:<22} 定义{len(defined[r]):>4}  引用{u:>4}  {', '.join(names[:5])}{' …' if len(names) > 5 else ''}")
    else:
        print("\n── A 资产类（摘要）──")
        for r in sorted(defined, key=lambda k: -len(defined[k])):
            names = sorted({n for _, n in defined[r]})
            print(f"  {r:<22} 定义{len(defined[r]):>4}  引用{len(all_used.get(r, [])):>4}  {', '.join(names[:4])}{' …' if len(names) > 4 else ''}")

    print(f"\nB 待审类：{len(review)} 个 → python tools/scan-classes.py --review")
    return 0


if __name__ == "__main__":
    sys.exit(main())
