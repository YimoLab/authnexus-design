#!/usr/bin/env bash
# =============================================================================
# AuthNexus Design · 组装可托管的静态站点（_site/）
# 用法：bash tools/build-site.sh
# 产物：_site/ = 落地页 + demo/admin + gallery + css + fonts（自包含，零路径改写）
# =============================================================================
set -e
cd "$(dirname "$0")/.."

rm -rf _site
mkdir -p _site
cp -r css fonts gallery demo _site/
rm -rf _site/demo/.shot

cat > _site/index.html <<'EOF'
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>AuthNexus Design · 在线成果预览</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23262626'/%3E%3Cpath d='M11 21.5V10.5L21 21.5V10.5' stroke='%23fff' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E" />
<link rel="stylesheet" href="./fonts/fonts.css" />
<link rel="stylesheet" href="./css/tokens.css" />
<link rel="stylesheet" href="./css/brand.css" />
<link rel="stylesheet" href="./css/base.css" />
<link rel="stylesheet" href="./css/components.css" />
<style>
  body { display: grid; place-items: center; min-height: 100dvh; padding: 24px; }
  .landing {
    width: min(560px, 100%); text-align: center;
    display: grid; gap: 18px; justify-items: center;
    padding: 56px 36px;
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--r);
  }
  .landing h1 { font-size: 24px; font-weight: 700; letter-spacing: -.02em; }
  .landing p { color: var(--muted-text); font-size: 14px; line-height: 1.6; }
  .landing .actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 6px; }
  .landing .foot { font-size: 12px; color: var(--muted-text); margin-top: 8px; }
</style>
<script>
  (function () {
    try {
      var t = localStorage.getItem('authnexus.theme')
      if (t !== 'dark' && t !== 'light') t = 'light'
      document.documentElement.setAttribute('data-theme', t)
    } catch (e) {}
  })()
</script>
</head>
<body>
  <div class="landing">
    <svg viewBox="0 0 32 32" width="44" height="44" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--logo-bg)"/><path d="M11 21.5V10.5L21 21.5V10.5" stroke="var(--logo-fg)" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
    <h1>AuthNexus Design</h1>
    <p>鉴枢设计系统 · 在线成果预览<br />同一套令牌与组件，直接搭出的中后台界面与组件全貌。</p>
    <div class="actions">
      <a class="btn btn--primary" href="./demo/admin/">中后台演示 →</a>
      <a class="btn btn--ghost" href="./gallery/">组件画廊</a>
    </div>
    <div class="foot">CSS 令牌 · 自托管字体 · 明暗双主题 · 液态玻璃</div>
  </div>
</body>
</html>
EOF

echo "built: _site/"
find _site -maxdepth 2 -type d | sort
