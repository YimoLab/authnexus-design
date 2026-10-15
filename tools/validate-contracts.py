#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""authnexus-design · 契约校验器

不依赖 jsonschema（保持零依赖），实现 schema.json 里实际用到的关键字子集：
  type / required / enum / pattern / properties / items / $ref(忽略)

用法：python tools/validate-contracts.py
"""
import re
import sys
import json
import pathlib

ROOT = pathlib.Path(r"E:/CasuaIness/Personal/authnexus-design")
SCHEMA = ROOT / "contracts" / "schema.json"
COMPONENTS = ROOT / "contracts" / "components"

TYPES = {
    "object": dict,
    "array": list,
    "string": str,
    "boolean": bool,
    "null": type(None),
}


def type_ok(value, tname: str) -> bool:
    if tname == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if tname == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if tname == "boolean":
        return isinstance(value, bool)
    cls = TYPES.get(tname)
    if cls is None:
        return True
    if cls is dict or cls is list or cls is str:
        return isinstance(value, cls)
    return isinstance(value, cls)


def validate(data, schema, path="$", errors=None):
    if errors is None:
        errors = []
    if not isinstance(schema, dict):
        return errors

    # type
    t = schema.get("type")
    if t:
        names = t if isinstance(t, list) else [t]
        if not any(type_ok(data, n) for n in names):
            errors.append(f"{path}: 类型应为 {t}，实际 {type(data).__name__}")
            return errors

    # enum
    if "enum" in schema and data not in schema["enum"]:
        errors.append(f"{path}: 取值 {data!r} 不在 enum {schema['enum']}")

    # pattern
    if "pattern" in schema and isinstance(data, str):
        if not re.match(schema["pattern"], data):
            errors.append(f"{path}: {data!r} 不匹配 {schema['pattern']}")

    # required
    for key in schema.get("required", []):
        if isinstance(data, dict) and key not in data:
            errors.append(f"{path}: 缺少必填字段 {key}")

    # properties
    props = schema.get("properties")
    if props and isinstance(data, dict):
        for key, sub in props.items():
            if key in data:
                validate(data[key], sub, f"{path}.{key}", errors)

    # items
    if "items" in schema and isinstance(data, list):
        for i, item in enumerate(data):
            validate(item, schema["items"], f"{path}[{i}]", errors)

    return errors


def main() -> int:
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    files = sorted(COMPONENTS.glob("*.json"))
    if not files:
        print("FAIL: 契约目录为空")
        return 1

    total_err = 0
    for f in files:
        data = json.loads(f.read_text(encoding="utf-8"))
        errs = validate(data, schema, f"$.{f.stem}")
        if errs:
            total_err += len(errs)
            print(f"[FAIL] {f.name}")
            for e in errs[:6]:
                print("       " + e)
    if total_err:
        print(f"\nRESULT: FAIL（{total_err} 处不符）")
        return 1

    # 交叉校验：class 资产类必须都在映射表里（防止有人手写契约时漏前缀）
    cmap = json.loads((ROOT / "tools" / "class-map.json").read_text(encoding="utf-8"))
    known = set(cmap.keys())
    orphans = []
    for f in files:
        d = json.loads(f.read_text(encoding="utf-8"))
        for c in d["classes"]["asset"]:
            root = re.split(r"__|--", c, 1)[0]
            if root.replace("anx-", "", 1) not in known:
                orphans.append(f"{f.stem}: {c}")
    if orphans:
        print(f"[WARN] {len(orphans)} 个资产类不在映射表中（可能是拼写错误或新组件未登记）：")
        for o in orphans[:10]:
            print("       " + o)
    else:
        print(f"[PASS] 全部 {len(files)} 份契约符合 schema.json")
        print("[PASS] 资产类均在 class-map.json 中登记（无孤儿 class）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
