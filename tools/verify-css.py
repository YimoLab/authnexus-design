#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""authnexus-design · 资产 CSS 校验

对照鉴枢源 app.css，校验 css/ 资产的完整性：
  A. 资产规则 ⊆ 源规则（剥离注释、归一化空白后按「单条规则」比对；
     允许的差异=头注释 / 已知剔除项，凡资产有源没有的规则将逐条列出）
  B. 四条资产文件的括号平衡
  C. var() 引用完整性：资产内引用的自定义属性须有定义或带 fallback

用法：python tools/verify-css.py
"""

import re
import sys
import pathlib

SRC = pathlib.Path(r"E:/CasuaIness/Personal/auth-nexus/app/src/styles/app.css")
CSS_DIR = pathlib.Path(r"E:/CasuaIness/Personal/authnexus-design/css")
FILES = ["tokens.css", "brand.css", "base.css", "components.css", "motion.css"]

# 已知预期差异（来源：品牌项移入 brand.css、资产版 print 块收窄）
EXPECTED_DIFF = {
    ("tokens.css", ":root"),
    ("tokens.css", '[data-theme="dark"]'),
    ("brand.css", ":root"),
    ("brand.css", '[data-theme="dark"]'),
    ("base.css", ".toast-layer, .overlay-layer"),
}


def strip_comments(text: str) -> str:
    return re.sub(r"/\*.*?\*/", "", text, flags=re.S)


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def rules_of(text: str):
    """切出规则集合：{(归一化选择器, 归一化声明体)}，含嵌套（@media 内、@keyframes 内）"""
    text = strip_comments(text)
    rules = set()
    stack = []
    buf = []
    for ch in text:
        if ch == "{":
            stack.append(normalize("".join(buf)))
            buf = []
        elif ch == "}":
            body = normalize("".join(buf))
            if stack:
                # 选择器前缀去掉 @media 条件（只对比最内层选择器+声明，宽松匹配）
                header = stack.pop()
                if not header.startswith("@"):
                    rules.add((header, body))
                elif rules or True:
                    # @media 内层规则已在入栈时作为独立条目；@keyframes 的 0%/to 帧
                    rules.add((header, body))
            buf = []
        else:
            if ch == ";" and stack and not stack[-1].startswith("@") and False:
                pass
            buf.append(ch)
    return rules


def collect_var_usage(text: str):
    text = strip_comments(text)
    defined = set(re.findall(r"(--[a-z0-9-]+)\s*:", text))
    used = []
    for m in re.finditer(r"var\(\s*(--[a-z0-9-]+)\s*(,)?", text):
        used.append((m.group(1), bool(m.group(2))))
    return defined, used


def main() -> int:
    src_text = SRC.read_text(encoding="utf-8")
    src_rules = rules_of(src_text)
    print(f"源规则数：{len(src_rules)}")

    ok = True

    # A + B
    combined_defs = set()
    for name in FILES:
        p = CSS_DIR / name
        text = p.read_text(encoding="utf-8")
        stripped = strip_comments(text)

        # B 括号平衡
        if stripped.count("{") != stripped.count("}"):
            print(f"[FAIL] {name} 括号不平衡：{{={stripped.count('{')} }}={stripped.count('}')}")
            ok = False

        # A 规则子集
        asset_rules = rules_of(text)
        missing = {r for r in asset_rules if r not in src_rules and not r[0].startswith("@")}
        # @media 条件层不算：过滤掉纯类规则里不在源的（逐条打印）
        extra = []
        expected = 0
        for (h, b) in missing:
            if h and not h.startswith("@") and "{" not in h:
                if (name, h) in EXPECTED_DIFF:
                    expected += 1
                    continue
                extra.append(f"  {name}: {h[:90]}  =>  {b[:90]}")
        if extra:
            print(f"[WARN] {name} 中 {len(extra)} 条规则在源中未找到（需人工确认是否为手写误差）：")
            print("\n".join(extra[:40]))
            ok = False
        else:
            note = f"（其中 {expected} 条为已知预期差异）" if expected else ""
            print(f"[PASS] {name}：全部规则可在源中找到（共 {len(asset_rules)} 条）{note}")

        defined, used = collect_var_usage(text)
        combined_defs |= defined

    # C 变量完整性（跨文件合并定义；带 fallback 的引用跳过）
    all_used = []
    for name in FILES:
        text = (CSS_DIR / name).read_text(encoding="utf-8")
        defined, used = collect_var_usage(text)
        for (v, has_fb) in used:
            if not has_fb and v not in defined:
                all_used.append((name, v))
    # 跨文件定义合并检查
    cross = [(n, v) for (n, v) in all_used if v not in combined_defs]
    if cross:
        print(f"[WARN] 以下 var() 引用无定义且无 fallback（跨文件合并后仍未定义）：")
        for (n, v) in sorted(set(cross)):
            print(f"  {n}: var({v})")
        ok = False
    else:
        print("[PASS] 变量引用完整（无定义引用均带 fallback）")

    print("RESULT:", "PASS" if ok else "CHECK")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
