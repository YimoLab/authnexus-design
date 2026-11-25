# AuthNexus Design（鉴枢设计系统）

鉴枢（AuthNexus）的视觉体系与交互组件，抽离为可跨项目复用的设计系统资产。

> Cross-project design system: CSS design tokens + custom-built UI components (light/dark themes, liquid-glass overlays). Vue 3 components included; React reuses the CSS and follows the behavior spec.

- **风格**：明亮纸白画布 + 墨黑文字 + 1px 描边分层；液态玻璃浮层；酸橙绿只做强调与品牌时刻
- **技术**：纯 CSS 令牌 + 自绘组件（零 UI 库依赖）；Vue3 项目直接复用组件源码，React 项目复用 CSS 资产 + 按规范实现组件
- **保真**：跨框架一致性由 `docs/BEHAVIOR.md`（交互规范）+ `audit/`（浏览器黑盒审计）保障

## 仓库地址（三平台同权）

| 平台 | 地址 |
|---|---|
| GitHub | https://github.com/yimolab/authnexus-design |
| Codeberg | https://codeberg.org/yimolab/authnexus-design |
| Gitee | https://gitee.com/yimolab/authnexus-design |

## 结构

```
css/       设计令牌 / 品牌覆盖 / 基础样式 / 组件配方 / 动效 / 中后台外壳（单入口 css/index.css）
brand/     品牌标识（SVG：自适应深浅色 / 固定浅色 / 固定深色）
fonts/     自托管字体（SIL OFL 1.1）+ @font-face
vue/       Vue3 组件源码（ui/ + overlay/ + lib/，文件即组件）
contracts/ 组件契约（唯一数据源）：生成 TS 类型 / API 文档 / MCP 工具描述，四端不漂移
mcp/       面向 AI 的 MCP Server（list_components / get_component / get_tokens / search_patterns）
tools/     构建与校验（契约提取、类型生成、官网构建、lint、前缀迁移、CSS 校验）
audit/     浏览器黑盒审计（组件级 + 页面级，配置驱动）
docs/      BEHAVIOR.md（交互规范与铁律）/ ADOPT.md（接入步骤）/ NAMESPACE-MIGRATION.md
gallery/   纯静态样式画廊（零框架依赖，双主题）
demo/      中后台演示（官网首页内嵌的实时预览）
_site/     官网构建产物：`node tools/build-docs.mjs` → 中英双语文档站 + 33 个组件详情页
examples/  vue 接线示例 + react 接线骨架
```

## 用法

见 [`docs/ADOPT.md`](docs/ADOPT.md)。核心纪律：**迁移 = 复制文件 + 改 import，禁止重写组件**。

## 版本

语义化版本 + tag。消费项目在 ADOPT 记录来源版本（如 `authnexus-design v0.1.0`），漂移可追溯。

## 许可证

- 代码与样式：待定
- 字体：SIL Open Font License 1.1（详见 `fonts/OFL-AlbertSans.txt`、`fonts/OFL-IBMPlexMono.txt`）
