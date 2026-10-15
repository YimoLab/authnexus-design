# ADOPT.md — 接入指南

> 目标读者：要在新项目里使用本设计系统的你（或 AI 助手）。
> **纪律：迁移 = 复制文件 + 改 import + 按序引入；禁止重写组件。**
> 组件行为与交互铁律见 [BEHAVIOR.md](BEHAVIOR.md)；逐项验收用 `audit/`（浏览器黑盒审计）。

---

## 0. 快速开始（Vue 3 项目，5 步）

1. **复制资产**：把 `css/`、`fonts/`、`vue/` 复制到项目（建议 `src/design/`）；
2. **按序引入样式**（顺序敏感）：

   ```ts
   // main.ts 或入口 css
   import './design/fonts/fonts.css'      // 1. 字体（最先）
   import './design/css/tokens.css'       // 2. 设计令牌
   import './design/css/brand.css'        // 3. 品牌覆盖（唯一改这里）
   import './design/css/base.css'         // 4. 元素与基础组件
   import './design/css/components.css'   // 5. 浮层与交互组件
   import './design/css/motion.css'       // 6. 动效（含「减少动效」全局压缩）
   import './design/css/shell.css'        // 7. 中后台外壳（用到侧栏 + 顶栏布局时）
   ```

3. **index.html**：加字体 preload + 主题预置脚本（见 §3）；
4. **接线**：两件事缺一不可——
   a. `index.html` 的 `<body>` 里提供两个 **Teleport 目标容器**（缺了浮层与 Toast 不会显示，且无报错）：

      ```html
      <div id="overlay-layer" class="overlay-layer"></div>
      <div id="toast-layer" class="toast-layer" role="region" aria-live="polite" aria-label="操作通知"></div>
      ```

      `#overlay-layer` 的 `z-index: 100` 是浮层压住顶栏(30) / 侧栏(40) 的关键（浮层组件自身
      不设 z-index）；不经 OverlayHost 手动挂浮层（静态页 / 原生 JS）时，要把每组
      scrim + 面板同样包进 `<div class="overlay-layer">`。

   b. 应用根挂载 `<OverlayHost />` 与 `<ToastHost />` 各一次；
   复制需要的组件，改 import 别名（组件间引用全部是相对路径，同结构复制可零改动）；
5. **验收**：跑 `audit/`（配置 `audit.config.json` 指向你的路由），对照 `gallery/` 检查观感。

## 1. 复制清单

**必带（最小集）**

| 文件 | 用途 |
|---|---|
| `css/tokens.css` `css/brand.css` `css/base.css` | 令牌 / 品牌 / 元素基础 |
| `fonts/fonts.css` + `fonts/*.woff2` + `fonts/OFL-*.txt` | 自托管字体（OFL 许可证必须随包） |

**用到浮层/交互组件时**

| 文件 | 用途 |
|---|---|
| `css/components.css` `css/motion.css` | 浮层 / 下拉 / 分页 / 标签栏 / 过渡 |
| `css/shell.css` | 中后台外壳：玻璃侧栏 + 顶栏 + 内容区（含窄屏侧栏抽屉），见 `demo/admin/` 的完整用法 |
| `vue/overlay/*` + `vue/ui/Icon.vue` + `vue/lib/icons.ts` | 弹窗 / 抽屉 / Toast 体系 |
| 按需组件 | 见 `vue/README.md` 的组件清单（含各自依赖） |

**外部 npm 依赖**：`vue ^3.3+`；`vue-router ^4`（仅 RouteFade）；`qrcode-generator`（仅 QrCode）。

## 2. 引入顺序与覆盖边界

- 顺序：**fonts → tokens → brand → base → components → motion → shell**。
  顺序错误的表现：brand 覆盖不生效（放在 tokens 前）、动效压缩失效（motion 未引入）。
- 冲突高发区：`base.css` 里有**元素级选择器**（`body / a / button / input` 的重置）。
  项目自有样式请用具体类名，避免再写全局元素覆盖；确需覆盖时，把项目样式放在六件套**之后**引入。
- `.od-*` 布局工具在 `@layer od-layout` 内（优先级最低），项目 CSS 天然可覆盖，无需担心。

## 3. index.html 参考

```html
<!-- 字体：预加载最常用的一两个字重（可选），其余按需加载 -->
<link rel="preload" href="/src/design/fonts/albert-sans-500-latin.woff2"
      as="font" type="font/woff2" crossorigin />

<!-- 主题预置：必须在首帧前执行，键名与 lib/theme.ts 一致（authnexus.theme） -->
<script>
  (function () {
    try {
      var t = localStorage.getItem('authnexus.theme')
      if (t !== 'dark' && t !== 'light') t = 'light' // 如需跟随系统可改为 prefers-color-scheme 判断
      document.documentElement.setAttribute('data-theme', t)
    } catch (e) {}
  })()
</script>
```

页面结构（`<body>` 末尾）需要两个浮层容器（见 §0 第 4 步）：

```html
<!-- 浮层与通知的 Teleport 目标容器（必需） -->
<div id="overlay-layer" class="overlay-layer"></div>
<div id="toast-layer" class="toast-layer" role="region" aria-live="polite" aria-label="操作通知"></div>
```

## 4. Vue 用法示例

**分页表格**（滑动过渡 + 裁剪容器 + 分页条）：

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePager } from '@/design/vue/lib/usePager'
import TablePager from '@/design/vue/ui/TablePager.vue'

const all = ref<Row[]>([])
const pager = usePager(computed(() => all.value), 10)
</script>

<template>
  <div class="panel">
    <div class="paged-clip">
      <table class="table">
        <Transition :name="pager.direction.value > 0 ? 'paged-fwd' : 'paged-back'">
          <tbody :key="pager.page.value">
            <tr v-for="row in pager.paged.value" :key="row.id">…</tr>
          </tbody>
        </Transition>
      </table>
    </div>
    <TablePager
      :total="pager.total.value"
      :page="pager.page.value"
      :page-size="pager.pageSize.value"
      @update:page="pager.page.value = $event"
      @update:page-size="pager.pageSize.value = $event"
    />
  </div>
</template>
```

**通知与确认**：

```ts
import { toast } from '@/design/vue/overlay/toast'
import { confirmDialog } from '@/design/vue/overlay/manager'

toast({ tone: 'ok', title: '已保存' })
toast('单行消息') // 快捷形态
confirmDialog({
  title: '确认删除？',
  desc: '该操作不可撤销。',
  tone: 'danger',
  confirmText: '删除',
  onConfirm: ({ close }) => { /* … */ close() },
})
```

**主题切换**（务必传 origin）：

```vue
<button class="iconbtn" @click="toggleTheme({ origin: $event.currentTarget })">…</button>
```

## 5. React 项目路径

1. 复制 `css/` 与 `fonts/`（与 Vue 项目完全相同，class 约定不变）；
2. 组件**不复制 Vue 实现**：按 `docs/BEHAVIOR.md` 逐条实现（浮层铁律、键盘、定位算法、动效参数）；
3. 用 `audit/` 的同一套断言验收——审计是浏览器黑盒，不看框架，通过即「一模一样」；
4. 接线示例骨架见 `examples/react/`。

## 6. 来源版本记录（防漂移）

每个消费项目在自己的 README 或 docs 记一行：

```
Design system: authnexus-design v0.1.0（复制于 2026-10-DD，三平台同名仓库）
```

本资产每次变更记录在 `CHANGELOG.md` 并打 tag；要升级时对照 CHANGELOG 决定是否重新复制。

## 7. 常见坑速查（详见 BEHAVIOR.md 对应小节）

| 坑 | 规则 |
|---|---|
| **浮层 / Toast 完全不显示且无报错** | 检查 index.html 是否有 `#overlay-layer` / `#toast-layer` 容器（§0 第 4 步） |
| scrim 压不暗顶栏 / 抽屉顶部被顶栏盖住 | 浮层对必须包在 `.overlay-layer` 内（z-index:100；浮层自身不设 z-index，手动挂载时最容易漏；BEHAVIOR §1.2） |
| 三种 tone 的 toast 长得一样 | tone 的区分在 `.toast__icon` 的图标颜色（ok→check-circle / danger→alert-circle / info→info）——自绘 toast 必须包含 `<span class="toast__icon">` + 对应图标，漏了则三态无视觉区分 |
| 浮层挂在玻璃祖先里，磨砂失效 | Teleport 挂 body + fixed + JS 坐标（BEHAVIOR §1.1） |
| 下拉面板向右溢出 | 先设 min-width 再测量（§1.3） |
| 只给 tbody 加 transform → 出横向滚动条 | 整块滑动 + `.paged-clip`（§4） |
| 路由过渡整页空白 | RouteFade 内必须包 keyed 普通 div（§6） |
| 主题闪一下 | index.html 预置脚本与 `authnexus.theme` 同键（§7 / 本文件 §3） |
| 选中态样式不生效 | 检查 ARIA 属性是否设对（`aria-selected` 等即样式钩子，§9） |
| 元素级样式互相打架 | 六件套引入顺序 + 项目样式后置（本文件 §2） |
