# 品牌标识

AuthNexus Design 的图形标：圆角方形底 + N 形折线。几何与官网、画廊、演示页中内联的
SVG 完全一致（`viewBox="0 0 32 32"`、`rx="8"`、线宽 `2.8`、圆头圆角）。

## 文件

| 文件 | 用途 |
|---|---|
| `logo.svg` | 独立使用（`<img>` / CSS background / favicon）。跟随系统 `prefers-color-scheme` 自动切换深浅色 |
| `logo-light.svg` | 固定浅色主题配色：深底 `#262626` + 白线 `#FFFFFF` |
| `logo-dark.svg` | 固定深色主题配色：浅底 `#F5F5F5` + 墨线 `#1A1A1A` |

颜色取值对应 `css/brand.css` 的 `--logo-bg` / `--logo-fg`（浅色下深底白线，深色下浅底墨线）。

## 用法

### 独立文件

```html
<img src="/brand/logo.svg" width="32" height="32" alt="AuthNexus Design" />
```

作为 favicon（现代浏览器支持 SVG）：

```html
<link rel="icon" href="/brand/logo.svg" type="image/svg+xml" />
```

注意：`<img>` 里的 SVG 只跟随**系统**深浅色，不会跟随页面的 `data-theme` 手动切换。

### 内联到页面（跟随 `data-theme`）

页面内联时不要用 `logo.svg` 里的固定色，直接用主题变量，与现有站点写法一致：

```html
<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
  <rect width="32" height="32" rx="8" fill="var(--logo-bg)"/>
  <path d="M11 21.5V10.5L21 21.5V10.5" fill="none"
        stroke="var(--logo-fg)" stroke-width="2.8"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

外层若是链接，用 `aria-label` 描述品牌，SVG 保持 `aria-hidden="true"`。

### 需要固定配色时

- 浅色背景/浅色主题：`logo-light.svg`
- 深色背景/深色主题：`logo-dark.svg`
- 不确定：优先 `logo.svg`

## 规律

- 始终保持正方形画布与 `viewBox="0 0 32 32"`，不要拉伸。
- `rx="8"`（画布 25%）、线宽 `2.8`、圆头圆角是标识的一部分，不要单独调整。
- 最小显示尺寸建议 16px；小于 16px 时线宽会因取整失真，可改用固定色版本保证对比度。
- 图形四周无额外留白，间距由使用方布局控制。
