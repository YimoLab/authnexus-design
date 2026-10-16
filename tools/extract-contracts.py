#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""authnexus-design · 契约提取器

从 Vue 源码（vue/ui、vue/overlay）与逻辑模块（vue/lib）提取**机器可读的组件契约**，
输出到 contracts/components/*.json。契约是「类型定义 / 官网 API 表 / MCP 工具描述」
的**唯一数据源**——三者都从它生成，因此永不漂移。

提取内容：
  props   名称 / 类型 / 是否必填 / 默认值 / JSDoc 描述
  emits   事件名与参数类型
  slots   具名插槽
  classes 模板中真实使用的 class（区分资产类与状态类）——class 契约
  deps    依赖的其他组件/模块
  a11y    从源码注释里识别的无障碍约定
  notes   源码头部注释（组件用途说明）

用法：
  python tools/extract-contracts.py            # 生成
  python tools/extract-contracts.py --check    # 只校验与源码是否漂移（CI 用）
"""
import re
import sys
import json
import argparse
import pathlib
import datetime

ROOT = pathlib.Path(r"E:/CasuaIness/Personal/authnexus-design")
VUE_DIR = ROOT / "vue"
OUT_DIR = ROOT / "contracts" / "components"

SKIP_CLASS_PREFIX = ("anx-", "is-", "has-", "js-", "od-", "g-")

# 组件中文名与分类（人工维护的一次性映射：分类是「官网导航」需要的语义，
# 无法从源码推导；放进映射而不是硬编在提取器里，便于日后调整）
META = {
    # ui —— 基础件
    "SelectMenu":      ("下拉选择", "form", "自绘 listbox 取代原生 <select>；键盘/翻转/先设宽再测量"),
    "FieldInput":      ("输入框", "form", "输入框 / 文本域 / 下拉三态合一"),
    "SegmentedControl": ("分段开关", "form", "2–4 个互斥选项，选中项以滑块平移"),
    "TablePager":      ("分页条", "data", "总数 + 每页条数 + 页码，整块滑动过渡"),
    "CodeBox":         ("代码框", "data", "等宽代码块 + 一键复制"),
    "KvList":          ("KV 列表", "data", "键值对列表"),
    "StatCard":        ("统计块", "data", "指标卡：标签 / 数值 / 涨跌"),
    "Badge":           ("徽记", "display", "小圆角状态标签"),
    "Tag":             ("标签", "display", "带键名的能力标签"),
    "AlertBox":        ("提示条", "display", "info / ok / warn / danger 四种语气"),
    "EmptyState":      ("空状态", "display", "空列表占位：图标 + 文案 + 动作"),
    "PageHead":        ("页面头", "layout", "标题 / 描述 / 右侧动作"),
    "PanelBlock":      ("面板", "layout", "带标题栏的内容面板"),
    "TimelineList":    ("时间线", "display", "竖向动态流"),
    "UserAvatar":      ("用户头像", "display", "图片 / 首字母回退，支持三档尺寸"),
    "AppMark":         ("应用图标", "display", "圆角方形图标，支持图片与品牌字母"),
    "ImagePicker":     ("图片选择器", "form", "点击选图 → 中心裁剪 → dataURL"),
    "RouteSkeleton":   ("骨架屏", "feedback", "路由懒加载占位"),
    "RouteFade":       ("路由过渡", "layout", "进出场位移淡入，keyed 单根约束"),
    "Tabs":            ("标签栏", "nav", "滑动指示条 + 面板左右滑动"),
    "TabBar":          ("标签栏容器", "nav", "Tabs 的受控包装（v-model + aria 接线）"),
    "Icon":            ("图标", "display", "24 视框内联 SVG 图标组件"),
    "QrCode":          ("二维码", "display", "无依赖二维码渲染"),
    "OverlaySlot":     ("浮层插槽", "overlay", "在 #overlay-layer 内声明式挂载浮层"),
    # overlay —— 浮层
    "ModalShell":      ("弹窗", "overlay", "液态玻璃弹窗；必须挂在 .anx-overlay-layer 内"),
    "DrawerShell":     ("抽屉", "overlay", "右侧贴边抽屉，仅左侧圆角"),
    "ConfirmDialog":   ("确认对话框", "overlay", "危险操作二次确认"),
    "OverlayHost":     ("浮层宿主", "overlay", "把浮层 Teleport 到 #overlay-layer 的出口"),
    "ToastHost":       ("通知宿主", "overlay", "把 Toast Teleport 到 #toast-layer 的出口"),
    # lib —— 逻辑
    "usePager":        ("分页逻辑", "logic", "分页状态机：页码 / 每页条数 / 切片 / 重置"),
    "theme":           ("主题", "logic", "明暗切换 + View Transitions 涟漪兜底"),
    "toast":           ("轻提示", "overlay", "命令式 toast：toast(opts) 显示，返回关闭函数"),
    "manager":         ("浮层命令 API", "overlay", "openModal / openDrawer / confirmDialog 统一入口"),
    "overlayState":    ("浮层状态", "overlay", "浮层栈状态与句柄（openModal/openDrawer/closeTop）"),
    "icons":           ("图标", "logic", "内联 SVG 图标表（24 视框）"),
    "qr":              ("二维码", "logic", "无依赖二维码生成"),
    "overlayState":    ("浮层栈", "logic", "浮层登记 / 关闭动画 / 焦点管理"),
    "manager":         ("浮层管理", "logic", "多层浮层的挂载与销毁"),
    "toast":           ("通知队列", "logic", "Toast 状态机与自动消失"),
}


def read(p: pathlib.Path) -> str:
    return p.read_text(encoding="utf-8")


def strip_ts_comments(src: str) -> str:
    """去掉块注释与行注释（保留内容，注释里常含类型说明）"""
    return src


# ------------------------------------------------------------------ props
def split_top_level(body: str) -> list:
    """按顶层逗号切分（跳过 <> {} [] () 内部与字符串）。用于运行时式 props 与默认值对象。"""
    return _split(body, ",")


def split_fields(body: str) -> list:
    """按顶层换行切分 TS 类型体里的字段。

    两个坑：
      1. TS 接口成员**无逗号**（`modelValue?: string` 换行 `id?: string`）→ 不能按逗号切；
      2. 字段类型里可能有**箭头函数**（`body?: () => VNodeChild`）与泛型（`Array<{a:1}>`），
         里面的 `>` / `(` / `)` 会让括号深度算错，把后续内容误切成新字段。
    做法：把 `=>` 当普通字符（不参与深度），只对 `<{` 与 `(` 计深度、对 `}>` `)` 减深度。
    """
    parts, buf, depth, quote = [], [], 0, None
    i, n = 0, len(body)
    while i < n:
        ch = body[i]
        # 字符串
        if quote:
            buf.append(ch)
            if ch == "\\" and i + 1 < n:
                buf.append(body[i + 1]); i += 2; continue
            if ch == quote:
                quote = None
            i += 1
            continue
        if ch in "\"'`":
            quote = ch; buf.append(ch); i += 1; continue
        # 箭头函数：整体跳过，=> 不参与深度
        if ch == "=" and i + 1 < n and body[i + 1] == ">":
            buf.append("=>"); i += 2; continue
        # 深度控制：< { ( 加深，> } ) 变浅
        if ch in "<{(":
            depth += 1
        elif ch in ">})":
            depth = max(0, depth - 1)
        if ch == "\n" and depth <= 0:
            seg = "".join(buf)
            if seg.strip():
                parts.append(seg)
            buf = []
        else:
            buf.append(ch)
        i += 1
    if buf and "".join(buf).strip():
        parts.append("".join(buf))
    return [p.strip() for p in parts if p.strip()]


def _split(body: str, sep: str = ",") -> list:
    """按顶层分隔符切分，跳过字符串与嵌套括号。

    特别处理箭头函数 `=>`：其中的 = 与 > 不参与深度计数，
    否则 `options: () => []` 会让深度错乱、把相邻字段粘在一起。
    """
    parts, buf, depth = [], [], 0
    quote = None
    i, n = 0, len(body)
    while i < n:
        ch = body[i]
        if quote:
            buf.append(ch)
            if ch == "\\" and i + 1 < n:
                buf.append(body[i + 1])
                i += 2
                continue
            if ch == quote:
                quote = None
            i += 1
            continue
        if ch in "\"'`":
            quote = ch
            buf.append(ch)
            i += 1
            continue
        if ch == "=" and i + 1 < n and body[i + 1] == ">":
            buf.append("=>")
            i += 2
            continue
        if ch in "<{[(":
            depth += 1
        elif ch in ">]})":
            depth -= 1
        if ch == sep and depth == 0:
            parts.append("".join(buf).strip())
            buf = []
        else:
            buf.append(ch)
        i += 1
    if buf:
        parts.append("".join(buf).strip())
    return [x for x in parts if x]


def _match_brace(s: str, start: int = 0) -> int | None:
    """返回与 s[start] 处 '{' 配对的 '}' 的下标；找不到返回 None。"""
    depth = 0
    for i in range(start, len(s)):
        if s[i] == "{":
            depth += 1
        elif s[i] == "}":
            depth -= 1
            if depth == 0:
                return i
    return None


def extract_type_body(script: str) -> str | None:
    """取出 defineProps<{ ... }> 里的类型体。

    不能用 `defineProps<\\s*\\{(.*?)\\}\\s*>` —— 类型体内可能有嵌套 {}（如
    `options?: { label: string }[]`），非贪婪会截断在第一个 }，导致整个 props
    塌成一个字段。改为：从 defineProps 后的 < 开始做**括号配平**扫描。
    """
    m = re.search(r"defineProps\s*<\s*\{", script)
    if not m:
        return None
    i = m.end() - 1          # 指向 '{'
    depth = 0
    for j in range(i, len(script)):
        c = script[j]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return script[i + 1:j]
    return None


def extract_props(script: str) -> list:
    """支持两种形态：
       defineProps<{ ... }>()                     —— 类型式（本仓库主流）
       withDefaults(defineProps<{...}>(), {...})  —— 带默认值
       defineProps({ key: { type, default } })    —— 运行时式（兜底）
    """
    props = []

    # --- 类型式：defineProps<{ ... }>() ---
    body = extract_type_body(script)
    if body is not None:
        defaults = {}
        # 注意：必须取**第一个** withDefaults —— 脚本里可能还有第二处（如逻辑实现），
        # 用 search 贪婪匹配会定位到后面那处，导致默认值提取到无关内容。
        wm = None
        for cand in re.finditer(r"withDefaults\s*\(\s*defineProps\s*<\s*\{", script):
            wm = cand
            break
        if wm:
            # withDefaults(defineProps<{类型}>(), { 默认值 })
            # 从类型体的 '{' 起做括号配平，闭合后应紧跟 ">()," 再跟默认值对象
            after = script[wm.end() - 1:]
            close = _match_brace(after)
            if close is not None:
                tail = after[close + 1:]
                m2 = re.search(r"\(\s*\)\s*,\s*", tail)
                if m2:
                    obj = _match_brace(tail, m2.end())
                    if obj is not None:
                        # 去掉对象字面量的首尾花括号再切分——
                        # 否则 split 的深度从 1 起算，所有逗号都在 depth>0，切不开
                        inner = tail[m2.end():obj]
                        if inner.lstrip().startswith("{"):
                            inner = inner.lstrip()[1:]
                        if inner.rstrip().endswith("}"):
                            inner = inner.rstrip()[:-1]
                        for d in split_top_level(inner):
                            if ":" in d:
                                k, v = d.split(":", 1)
                                defaults[k.strip()] = v.strip().rstrip(",")
        for field in split_fields(body):
            doc = ""
            dm = re.match(r"/\*\*\s*(.*?)\*/\s*", field, re.S)
            if dm:
                doc = " ".join(l.strip(" *") for l in dm.group(1).splitlines()).strip()
                field = field[dm.end():]
            if not field or ":" not in field:
                continue
            # 只在**顶层**第一个冒号处切分：`body?: () => VNodeChild` 里没有冒号问题，
            # 但 `onConfirm?: (ctx: {...}) => void` 的类型里含冒号——按顶层切才安全。
            depth, cut = 0, None
            for idx, ch in enumerate(field):
                if ch in "<{(":
                    depth += 1
                elif ch in ">})":
                    depth = max(0, depth - 1)
                elif ch == ":" and depth == 0:
                    cut = idx
                    break
            if cut is None:
                continue
            name, rest = field[:cut], field[cut + 1:]
            name = name.strip()
            # TS 可选标记在名字**末尾**（modelValue?: string），要用 rstrip 而非 lstrip
            optional_marker = name.endswith("?")
            name = name.rstrip("?").strip()
            # TS 里 name? 表示可选；除 ? 外都视为必填
            required = not optional_marker
            # 类型本体：去掉可选的 `= 默认值` 尾巴（箭头函数里的 => 不能当赋值）
            ptype = re.split(r"=(?!>)", rest, 1)[0].strip().rstrip("?").strip()
            props.append({
                "name": name,
                "type": ptype or "unknown",
                "required": required,
                "default": defaults.get(name),
                "description": doc,
            })
        return props

    # --- 运行时式：defineProps({ key: { type: String, default: 'x' } }) ---
    m = re.search(r"defineProps\s*\(\s*\{(.*?)\}\s*\)", script, re.S)
    if m:
        for field in split_top_level(m.group(1)):
            if ":" not in field:
                continue
            name, rest = field.split(":", 1)
            name = name.strip()
            t = re.search(r"type\s*:\s*(\w+)", rest)
            d = re.search(r"default\s*:\s*(.+?),?\s*$", rest.strip().rstrip("}").strip())
            props.append({
                "name": name,
                "type": t.group(1).lower() if t else "unknown",
                "required": "required" not in rest,
                "default": d.group(1).strip().rstrip(",") if d else None,
                "description": "",
            })
    return props


# ------------------------------------------------------------------ emits
def extract_emits(script: str) -> list:
    events = []
    # 调用签名式：(e: 'update:modelValue', v: string): void
    for m in re.finditer(r"\(\s*e\s*:\s*'([^']+)'\s*(?:,\s*([^)]*))?\)\s*:\s*\S+", script):
        name = m.group(1)
        payload = (m.group(2) or "").strip()
        events.append({
            "name": name,
            "payload": payload or None,
            "description": "",
        })
    # 数组式：defineEmits(['change', 'update:x'])
    m = re.search(r"defineEmits\s*\(\s*\[([^\]]*)\]", script)
    if m:
        for e in re.findall(r"'([^']+)'", m.group(1)):
            if not any(x["name"] == e for x in events):
                events.append({"name": e, "payload": None, "description": ""})
    # 去重
    seen, uniq = set(), []
    for e in events:
        if e["name"] not in seen:
            seen.add(e["name"])
            uniq.append(e)
    return uniq


# ------------------------------------------------------------------ slots
def extract_slots(template: str, script: str) -> list:
    slots = set()
    for m in re.finditer(r"<slot\b[^>]*\bname\s*=\s*[\"']([^\"']+)[\"']", template):
        slots.add(m.group(1))
    m = re.search(r"defineSlots\s*<\s*\{(.*?)\}\s*>", script, re.S)
    if m:
        for field in split_top_level(m.group(1)):
            if ":" in field:
                slots.add(field.split(":", 1)[0].strip().lstrip("?"))
    return [{"name": s} for s in sorted(slots)]


# ------------------------------------------------------------------ class 契约
def extract_classes(template: str) -> dict:
    """提取模板真实使用的 class —— 这是「class 契约」，AI 拼 class 时照抄即可"""
    asset, state, other = set(), set(), set()
    for m in re.finditer(r"class\s*=\s*\"([^\"]*)\"", template):
        for tok in m.group(1).split():
            (asset if tok.startswith("anx-") else state if tok.startswith(("is-", "has-")) else other).add(tok)
    for m in re.finditer(r"['\"]([a-z][\w-]*(?:__|--)[\w-]*)['\"]", template):
        tok = m.group(1)
        (asset if tok.startswith("anx-") else other).add(tok)
    return {
        "asset": sorted(asset),
        "state": sorted(state),
        "other": sorted(other),
    }


# ------------------------------------------------------------------ 依赖与注释
def extract_deps(script: str) -> list:
    deps = []
    for m in re.finditer(r"from\s+['\"](\.[^'\"]+)['\"]", script):
        p = m.group(1)
        name = pathlib.PurePosixPath(p).name
        if name.endswith(".vue"):
            name = name[:-4]
        deps.append(name)
    # Icon 等模板里用到的组件
    for m in re.finditer(r"<([A-Z][A-Za-z0-9]+)[\s/>]", script + ""):
        pass
    return sorted(set(deps))


def header_note(text: str) -> str:
    """取文件头部的块注释（组件用途说明）"""
    m = re.match(r"\s*(?:<!--\s*)?(/\*\*.*?\*/)", text, re.S)
    if not m:
        return ""
    body = m.group(1)
    lines = [l.strip().lstrip("*").strip() for l in body.splitlines()]
    lines = [l for l in lines if l and not l.startswith("鉴枢 AuthNexus ·") and not l.startswith("@")]
    return lines[0] if lines else ""


A11Y_PATTERNS = [
    (r"aria-selected", "选中态用 aria-selected（同时是样式钩子）"),
    (r"aria-pressed", "分段/开关选中态用 aria-pressed"),
    (r"aria-expanded", "展开态用 aria-expanded"),
    (r"aria-controls", "弹层用 aria-controls 关联触发器"),
    (r"aria-activedescendant", "listbox 焦点管理用 aria-activedescendant"),
    (r"role=\"listbox\"|role=\"option\"", "自定义下拉用 listbox/option 语义"),
    (r"aria-modal|aria-modal=\"true\"", "模态用 aria-modal"),
    (r"visually-hidden", "隐藏文本用 .anx-visually-hidden"),
]


def extract_a11y(text: str) -> list:
    return [desc for pat, desc in A11Y_PATTERNS if re.search(pat, text)]


# ------------------------------------------------------------------ 主流程
def build() -> dict:
    out = {}
    for p in sorted(VUE_DIR.rglob("*.vue")):
        name = p.stem
        text = read(p)
        tm = re.search(r"<template>(.*)</template>\s*(?:<script|</script>|$)", text, re.S)
        sm = re.search(r"<script[^>]*>(.*?)</script>", text, re.S)
        template = tm.group(1) if tm else ""
        script = sm.group(1) if sm else ""
        zh, group, desc = META.get(name, (name, "other", ""))
        out[name] = {
            "$schema": "../schema.json#",
            "name": name,
            "label": {"zh": zh, "en": name},
            "group": group,
            "kind": "vue-component",
            "source": str(p.relative_to(ROOT)).replace("\\", "/"),
            "summary": {"zh": header_note(text) or desc, "en": desc},
            "props": extract_props(script),
            "emits": extract_emits(script),
            "slots": extract_slots(template, script),
            "classes": extract_classes(template + script),
            "deps": extract_deps(script),
            "a11y": extract_a11y(text),
        }
    # 逻辑模块（.ts）：lib/ 通用逻辑 + overlay/ 浮层命令式 API（toast / manager / overlayState）
    module_files = []
    for d in ("lib", "overlay"):
        module_files += [q for q in sorted((VUE_DIR / d).rglob("*.ts"))]
    for p in module_files:
        if p.name.endswith(".test.ts"):
            continue
        name = p.stem
        text = read(p)
        zh, group, desc = META.get(name, (name, "logic", ""))
        exports = re.findall(r"export\s+(?:const|function|async function|type|interface|class)\s+(\w+)", text)
        out[name] = {
            "$schema": "../schema.json#",
            "name": name,
            "label": {"zh": zh, "en": name},
            "group": group,
            "kind": "module",
            "source": str(p.relative_to(ROOT)).replace("\\", "/"),
            "summary": {"zh": header_note(text) or desc, "en": desc},
            "props": [],
            "emits": [],
            "slots": [],
            "classes": extract_classes(text),
            "deps": [],
            "a11y": extract_a11y(text),
            "exports": sorted(set(exports)),
        }
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="只校验漂移，不写入")
    args = ap.parse_args()

    data = build()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    if args.check:
        bad = []
        for name, c in sorted(data.items()):
            f = OUT_DIR / f"{name}.json"
            if not f.exists():
                bad.append(f"{name}: 契约缺失")
                continue
            if json.loads(read(f)) != c:
                bad.append(f"{name}: 与源码漂移")
        if bad:
            print("[FAIL] 契约与源码不一致：")
            for b in bad:
                print("  " + b)
            return 1
        print(f"[PASS] {len(data)} 个契约与源码一致")
        return 0

    for name, c in data.items():
        (OUT_DIR / f"{name}.json").write_text(
            json.dumps(c, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    meta = {
        "generatedAt": datetime.datetime.now().strftime("%Y-%m-%d"),
        "source": "vue/（Vue SFC + lib 模块）",
        "count": len(data),
        "groups": sorted({c["group"] for c in data.values()}),
        "components": sorted(data),
    }
    (ROOT / "contracts" / "index.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    groups = {}
    for c in data.values():
        groups.setdefault(c["group"], []).append(c["label"]["zh"])
    print(f"生成 {len(data)} 个契约 → contracts/components/")
    for g, items in sorted(groups.items()):
        print(f"  {g:10s} {len(items):2d}  {', '.join(sorted(items))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
