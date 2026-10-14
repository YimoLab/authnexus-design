#!/usr/bin/env bash
# =============================================================================
# AuthNexus Design · 三平台同权推送
# 依次推送到 github / codeberg / gitee（全部分支 + 全部标签）
# 用法：bash tools/push-all.sh
# =============================================================================
set -e
cd "$(dirname "$0")/.."

for remote in github codeberg gitee; do
  echo "== push -> $remote =="
  git push "$remote" --all
  git push "$remote" --tags
done
echo "== all done =="
