# audit/ — 浏览器黑盒审计

> 不看框架、只看行为与像素的验收工具。分两层：
>
> - **页面级**（本目录 5 个脚本）：跑「项目的真实页面路由」，断言业务行为与像素。
>   当前配置的是鉴枢（AuthNexus）的回归用例——脚本断言里含鉴枢的业务文案与流程；
>   **新项目请参照其方法论编写自己的用例**（把 `audit.config.json` 的路由换成你的）。
> - **组件级**（`audit-gallery.mjs`，54 项）：跑 `gallery/` 静态样式画廊，对资产本身做
>   框架无关的断言——令牌值 / 实底文字对比度 / 玻璃配方 / 自托管字体与字重插值 /
>   组件关键几何 / 浮层承载层与命中测试 / toast 三态区分。作为「新项目接入后是否
>   与鉴枢一模一样」的第一道闸门，不依赖任何框架与业务文案。

## 运行

前置：目标应用已启动（鉴枢本地开发：`server npm run dev` + `app npm run dev`，http 模式）；
Node 侧依赖 `playwright-core`（`audit-consent` / `audit-brand-gate` 另需 `pngjs`）。

**依赖解析方式（ESM 从脚本所在目录向上找 node_modules）**：二选一——

- 方式 A：在本目录里安装依赖，然后直接运行：

  ```bash
  cd audit && npm i playwright-core pngjs && node audit-select.mjs
  ```

- 方式 B：把 `audit/` 复制到已有依赖的工作目录中运行（如本机的工作区
  `~/.workbuddy/binaries/node/workspace`，其 node_modules 里已有 playwright-core）。

常用命令：

```bash
export CHROME_PATH=".../chrome.exe"   # 可选，缺省读 audit.config.json
export BASE_URL="http://127.0.0.1:5173"  # 可选
node audit-contrast.mjs dark          # 对比度审计（dark | light）
node audit-select.mjs                 # 下拉选择专项（28 项，含键盘/动效/翻转/遮挡）
node audit-anim.mjs                   # 动效时间线（35 项，含减少动效压缩）
node audit-consent.mjs                # 授权页玻璃材质 + 像素级对比度（20 项）
node audit-brand-gate.mjs             # 品牌色与演示门禁
node audit-gallery.mjs                # 组件级审计（54 项，跑 gallery/；可传 URL 参数）
```

> 组件级审计默认目标是 `http://127.0.0.1:8123/gallery/`（用任意静态服务器托管仓库根目录即可）；
> 也可 `node audit-gallery.mjs http://127.0.0.1:5173/gallery/` 或 `GALLERY_URL=… ` 指定。
> 跑在**项目页面**上时它是同一套断言：断言的是资产契约，未加 `.select` 类的原生下拉会被判失败。

## 配置

`audit.config.json`：

| 字段 | 说明 |
|---|---|
| `chromePath` | Chromium 可执行文件路径 |
| `baseUrl` | 目标应用地址（Vite dev 默认 5173） |
| `outDir` | 截图 / 报告输出目录（相对本目录，默认 `.out`） |
| `profiles.authnexus.contrastRoutes` | 对比度审计的页面清单 `[标签, 路径]` |

环境变量 `CHROME_PATH` / `BASE_URL` / `OUT_DIR` 覆盖同名配置。

## 纪律

- **断言强度是底线**：迁移或更新脚本时不得删减断言项（如 select 审计的 28 项）。
- 审计脚本与 `docs/BEHAVIOR.md` 一一对应：改行为 → 改规范 → 改断言，三者同步。
- 像素采样类断言（玻璃对比度）不可用 DOM 审计替代——backdrop 的合成结果只能看截图。
