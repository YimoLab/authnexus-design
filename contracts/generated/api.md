# 组件 API

> 本文件由 `tools/gen-types.mjs` 从 `contracts/components/*.json` 自动生成，请勿手改。

## 数据展示

### 代码框 · `CodeBox`

等宽代码块 + 一键复制

**Props**

| 名称 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `value` | `string` | 是 | — |  |
| `wrap` | `boolean` | 否 | `false` |  |
| `copy` | `boolean` | 否 | `true` |  |

**Class 契约**

资产类（照抄，不要自造）：

`anx-code` `anx-code--plain` `anx-code--wrap` `anx-codeblock` `anx-codeblock__copy` `anx-copybtn` `anx-visually-hidden`

**依赖**: `Icon` · `toast`

**无障碍**: 隐藏文本用 .anx-visually-hidden

<sub>源码: `vue/ui/CodeBox.vue`</sub>

### KV 列表 · `KvList`

键值对列表

**Props**

| 名称 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `rows` | `KvRow[]; tight?: boolean` | 是 | — |  |

**Class 契约**

资产类（照抄，不要自造）：

`anx-kv` `anx-kv--tight` `anx-kv__row`

**依赖**: `ui.types`

<sub>源码: `vue/ui/KvList.vue`</sub>

### 统计块 · `StatCard`

指标卡：标签 / 数值 / 涨跌

**Props**

| 名称 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `label` | `string` | 是 | — |  |
| `value` | `string` | 是 | — |  |
| `unit` | `string` | 否 | — |  |
| `delta` | `string` | 否 | — |  |
| `deltaTone` | `'up' | 'down'` | 否 | — |  |

**Slots**: `delta`

**Class 契约**

资产类（照抄，不要自造）：

`anx-stat` `anx-stat__delta` `anx-stat__delta--` `anx-stat__label` `anx-stat__num` `anx-stat__unit`

<sub>源码: `vue/ui/StatCard.vue`</sub>

### 分页条 · `TablePager`

总数 + 每页条数 + 页码，整块滑动过渡

**Props**

| 名称 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `total` | `number` | 是 | — |  |
| `page` | `number` | 是 | — |  |
| `pageSize` | `number` | 是 | — |  |
| `sizes` | `number[]` | 否 | `() => [10, 20, 50]` |  |

**Events**

- `update:page` — `v: number`
- `update:pageSize` — `v: number`

**Class 契约**

资产类（照抄，不要自造）：

`anx-pager` `anx-pager__btn` `anx-pager__btn--num` `anx-pager__gap` `anx-pager__nav` `anx-pager__select` `anx-pager__size` `anx-pager__total`

**依赖**: `Icon` · `SelectMenu`

<sub>源码: `vue/ui/TablePager.vue`</sub>

## 展示

### 提示条 · `AlertBox`

info / ok / warn / danger 四种语气

**Props**

| 名称 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `tone` | `'info' | 'ok' | 'warn' | 'danger' | 'plain'` | 否 | `'info'` |  |
| `title` | `string` | 否 | — |  |
| `text` | `string` | 否 | — |  |
| `lines` | `string[]` | 否 | — |  |

**Class 契约**

资产类（照抄，不要自造）：

`anx-alert` `anx-alert--` `anx-alert__body` `anx-alert__text` `anx-alert__title`

**依赖**: `Icon`

<sub>源码: `vue/ui/AlertBox.vue`</sub>

### 徽记 · `Badge`

小圆角状态标签

**Props**

| 名称 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `text` | `string` | 是 | — |  |
| `tone` | `string` | 否 | `'neutral'` |  |
| `icon` | `string` | 否 | — |  |

**Class 契约**

资产类（照抄，不要自造）：

`anx-badge` `anx-badge--`

**依赖**: `Icon`

<sub>源码: `vue/ui/Badge.vue`</sub>

### 空状态 · `EmptyState`

空列表占位：图标 + 文案 + 动作

**Props**

| 名称 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `icon` | `string` | 否 | `'file'` |  |
| `title` | `string` | 是 | — |  |
| `text` | `string` | 否 | — |  |

**Slots**: `actions` · `text`

**Class 契约**

资产类（照抄，不要自造）：

`anx-empty` `anx-empty__actions` `anx-empty__icon` `anx-empty__text` `anx-empty__title`

**依赖**: `Icon`

<sub>源码: `vue/ui/EmptyState.vue`</sub>

### 图标 · `Icon`

24 视框内联 SVG 图标组件

**Props**

| 名称 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `name` | `string` | 是 | — |  |
| `size` | `number` | 否 | `18` |  |
| `stroke` | `number` | 否 | `1.6` |  |

**依赖**: `icons`

<sub>源码: `vue/ui/Icon.vue`</sub>

### 二维码 · `QrCode`

无依赖二维码渲染

**Props**

| 名称 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `text` | `string` | 是 | — |  |
| `label` | `string` | 否 | `'二维码'` |  |
| `size` | `number` | 否 | `216` |  |

**依赖**: `qr`

<sub>源码: `vue/ui/QrCode.vue`</sub>

### 时间线 · `TimelineList`

竖向动态流

**Props**

| 名称 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `items` | `TimelineItem[]` | 是 | — |  |

**Class 契约**

资产类（照抄，不要自造）：

`anx-timeline` `anx-timeline__dot` `anx-timeline__dot--` `anx-timeline__item` `anx-timeline__meta` `anx-timeline__title`

<sub>源码: `vue/ui/TimelineList.vue`</sub>

### 用户头像 · `UserAvatar`

图片 / 首字母回退，支持三档尺寸

**Props**

| 名称 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `user` | `AvatarUser | null` | 否 | `null` |  |
| `size` | `'' | 'sm' | 'lg'` | 否 | `''` |  |

**Class 契约**

资产类（照抄，不要自造）：

`anx-avatar` `anx-avatar--` `anx-avatar__img`

<sub>源码: `vue/ui/UserAvatar.vue`</sub>

## 反馈

### 骨架屏 · `RouteSkeleton`

路由懒加载占位

**Class 契约**

资产类（照抄，不要自造）：

`anx-sk` `anx-sk--card` `anx-sk--row` `anx-sk--sub` `anx-sk--title` `anx-sk-cards` `anx-sk-head` `anx-sk-page` `anx-sk-panel`

<sub>源码: `vue/ui/RouteSkeleton.vue`</sub>

## 表单

### 输入框 · `FieldInput`

输入框 / 文本域 / 下拉三态合一

**Props**

| 名称 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `modelValue` | `string` | 否 | `''` |  |
| `label` | `string` | 否 | — |  |
| `type` | `'text' | 'email' | 'password' | 'search' | 'url' | 'number' | 'textarea' | 'select'` | 否 | `'text'` |  |
| `id` | `string` | 否 | — |  |
| `name` | `string` | 否 | — |  |
| `required` | `boolean` | 否 | — |  |
| `placeholder` | `string` | 否 | — |  |
| `hint` | `string` | 否 | — |  |
| `error` | `string` | 否 | — |  |
| `mono` | `boolean` | 否 | — |  |
| `rows` | `number` | 否 | `3` |  |
| `options` | `FieldOption[]` | 否 | — |  |
| `autocomplete` | `string` | 否 | — |  |
| `spellcheck` | `boolean` | 否 | `true` |  |
| `disabled` | `boolean` | 否 | — |  |
| `inputmode` | `'text' | 'numeric' | 'email' | 'url'` | 否 | — |  |
| `ariaLabel` | `string` | 否 | — |  |

**Events**

- `update:modelValue` — `v: string`

**Slots**: `hint`

**Class 契约**

资产类（照抄，不要自造）：

`anx-field` `anx-field__error` `anx-field__hint` `anx-field__label` `anx-input` `anx-input--mono` `anx-req` `anx-textarea`

**依赖**: `Icon` · `SelectMenu` · `ui.types`

<sub>源码: `vue/ui/FieldInput.vue`</sub>

### 图片选择器 · `ImagePicker`

点击选图 → 中心裁剪 → dataURL

**Props**

| 名称 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `modelValue` | `string | null` | 否 | `null` |  |
| `variant` | `'avatar' | 'icon'` | 否 | `'avatar'` |  |
| `size` | `number` | 否 | `256` |  |
| `hint` | `string` | 否 | — |  |

**Events**

- `update:modelValue` — `v: string | null`

**Class 契约**

资产类（照抄，不要自造）：

`anx-btn` `anx-btn--danger-quiet` `anx-btn--ghost` `anx-btn--sm` `anx-imgpick` `anx-imgpick--` `anx-imgpick__hint` `anx-imgpick__input` `anx-imgpick__mask` `anx-imgpick__meta` `anx-imgpick__ph` `anx-imgpick__preview` `anx-t-faint` `anx-t-xs`

**依赖**: `Icon` · `toast`

<sub>源码: `vue/ui/ImagePicker.vue`</sub>

### 分段开关 · `SegmentedControl`

2–4 个互斥选项，选中项以滑块平移

**Props**

| 名称 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `modelValue` | `string` | 是 | — |  |
| `options` | `FieldOption[]` | 是 | — |  |

**Events**

- `update:modelValue` — `v: string`

**Class 契约**

资产类（照抄，不要自造）：

`anx-segmented` `anx-segmented__opt` `anx-segmented__thumb`

**依赖**: `ui.types`

**无障碍**: 分段/开关选中态用 aria-pressed

<sub>源码: `vue/ui/SegmentedControl.vue`</sub>

### 下拉选择 · `SelectMenu`

自绘 listbox 取代原生 <select>；键盘/翻转/先设宽再测量

**Props**

| 名称 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `modelValue` | `string` | 否 | `''` |  |
| `options` | `FieldOption[]` | 否 | `() => []` |  |
| `id` | `string` | 否 | — |  |
| `placeholder` | `string` | 否 | `''` |  |
| `disabled` | `boolean` | 否 | — |  |
| `ariaLabel` | `string` | 否 | — |  |
| `compact` | `boolean` | 否 | `false` |  |

**Events**

- `update:modelValue` — `v: string`

**Class 契约**

资产类（照抄，不要自造）：

`anx-fsel` `anx-fsel--sm` `anx-fsel__btn` `anx-fsel__caret` `anx-fsel__check` `anx-fsel__opt` `anx-fsel__optlabel` `anx-fsel__panel` `anx-fsel__panel--sm` `anx-fsel__value` `anx-fsel__value--empty`

**依赖**: `Icon` · `ui.types`

**无障碍**: 选中态用 aria-selected（同时是样式钩子）；展开态用 aria-expanded；弹层用 aria-controls 关联触发器；listbox 焦点管理用 aria-activedescendant；自定义下拉用 listbox/option 语义

<sub>源码: `vue/ui/SelectMenu.vue`</sub>

## 布局

### 页面头 · `PageHead`

标题 / 描述 / 右侧动作

**Props**

| 名称 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `title` | `string` | 是 | — |  |
| `desc` | `string` | 否 | — |  |

**Slots**: `actions` · `desc`

**Class 契约**

资产类（照抄，不要自造）：

`anx-page-head` `anx-page-head__actions` `anx-page-head__desc` `anx-page-head__text` `anx-t-h1`

<sub>源码: `vue/ui/PageHead.vue`</sub>

### 面板 · `PanelBlock`

带标题栏的内容面板

**Props**

| 名称 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `title` | `string` | 否 | — |  |
| `subtitle` | `string` | 否 | — |  |
| `tight` | `boolean` | 否 | — |  |

**Slots**: `actions` · `foot`

**Class 契约**

资产类（照抄，不要自造）：

`anx-panel` `anx-panel__body` `anx-panel__body--tight` `anx-panel__foot` `anx-panel__head` `anx-panel__head-actions`

<sub>源码: `vue/ui/PanelBlock.vue`</sub>

### 路由过渡 · `RouteFade`

进出场位移淡入，keyed 单根约束

<sub>源码: `vue/ui/RouteFade.vue`</sub>

## 逻辑

### 图标 · `icons`

内联 SVG 图标表（24 视框）

**导出**: `ICONS` · `iconBody`

<sub>源码: `vue/lib/icons.ts`</sub>

### 浮层管理 · `manager`

多层浮层的挂载与销毁

**导出**: `ConfirmOptions` · `confirmDialog`

<sub>源码: `vue/overlay/manager.ts`</sub>

### 浮层栈 · `overlayState`

浮层登记 / 关闭动画 / 焦点管理

**导出**: `OVERLAY_KEY` · `OverlayContext` · `OverlayEntry` · `OverlayHandle` · `closeAllOverlays` · `closeEntry` · `closeTop` · `isTopEntry` · `openDrawer` · `openModal` · `overlayState`

<sub>源码: `vue/overlay/overlayState.ts`</sub>

### 二维码 · `qr`

无依赖二维码生成

**导出**: `QrCodeMatrix` · `qrMatrix`

<sub>源码: `vue/lib/qr.ts`</sub>

### 主题 · `theme`

明暗切换 + View Transitions 涟漪兜底

**导出**: `Theme` · `ToggleThemeOptions` · `applyTheme` · `currentTheme` · `themeState` · `toggleTheme`

<sub>源码: `vue/lib/theme.ts`</sub>

### 通知队列 · `toast`

Toast 状态机与自动消失

**导出**: `ToastItem` · `ToastOptions` · `ToastTone` · `dismissToast` · `toast` · `toastState`

<sub>源码: `vue/overlay/toast.ts`</sub>

### 分页逻辑 · `usePager`

分页状态机：页码 / 每页条数 / 切片 / 重置

**导出**: `Pager` · `usePager`

<sub>源码: `vue/lib/usePager.ts`</sub>

## 导航

### 标签栏容器 · `TabBar`

Tabs 的受控包装（v-model + aria 接线）

**Props**

| 名称 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `active` | `string` | 否 | — |  |

**Class 契约**

资产类（照抄，不要自造）：

`anx-tabs` `anx-tabs__ink`

**无障碍**: 选中态用 aria-selected（同时是样式钩子）

<sub>源码: `vue/ui/TabBar.vue`</sub>

## 浮层

### 确认对话框 · `ConfirmDialog`

危险操作二次确认

**Props**

| 名称 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `title` | `string` | 是 | — |  |
| `desc` | `string` | 否 | — |  |
| `tone` | `'danger' | 'primary'` | 否 | `'primary'` |  |
| `confirmText` | `string` | 否 | — |  |
| `cancelText` | `string` | 否 | — |  |
| `confirmIcon` | `string` | 否 | — |  |
| `body` | `() => VNodeChild` | 否 | — |  |
| `infoOnly` | `boolean` | 否 | — |  |
| `onConfirm` | `(ctx: { close: () => void }) => void` | 否 | — |  |

**Class 契约**

资产类（照抄，不要自造）：

`anx-btn` `anx-btn--danger` `anx-btn--ghost` `anx-btn--primary`

**依赖**: `Icon` · `ModalShell` · `overlayState`

<sub>源码: `vue/overlay/ConfirmDialog.vue`</sub>

### 抽屉 · `DrawerShell`

右侧贴边抽屉，仅左侧圆角

**Props**

| 名称 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `title` | `string` | 否 | — |  |
| `desc` | `string` | 否 | — |  |

**Slots**: `foot`

**Class 契约**

资产类（照抄，不要自造）：

`anx-drawer` `anx-drawer__body` `anx-drawer__foot` `anx-drawer__head` `anx-drawer__title` `anx-iconbtn` `anx-scrim` `anx-t-faint` `anx-t-xs`

**依赖**: `Icon` · `overlayState`

**无障碍**: 模态用 aria-modal

<sub>源码: `vue/overlay/DrawerShell.vue`</sub>

### 弹窗 · `ModalShell`

液态玻璃弹窗；必须挂在 .anx-overlay-layer 内

**Props**

| 名称 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `title` | `string` | 否 | — |  |
| `desc` | `string` | 否 | — |  |
| `size` | `'' | 'sm' | 'lg'` | 否 | `''` |  |

**Slots**: `foot`

**Class 契约**

资产类（照抄，不要自造）：

`anx-iconbtn` `anx-modal` `anx-modal__body` `anx-modal__close` `anx-modal__desc` `anx-modal__foot` `anx-modal__head` `anx-modal__head-text` `anx-modal__title` `anx-scrim`

**依赖**: `Icon` · `overlayState`

**无障碍**: 模态用 aria-modal

<sub>源码: `vue/overlay/ModalShell.vue`</sub>

### 浮层宿主 · `OverlayHost`

把浮层 Teleport 到 #overlay-layer 的出口

**依赖**: `OverlaySlot` · `overlayState`

<sub>源码: `vue/overlay/OverlayHost.vue`</sub>

### 浮层插槽 · `OverlaySlot`

在 #overlay-layer 内声明式挂载浮层

**Props**

| 名称 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `entry` | `OverlayEntry` | 是 | — |  |

**依赖**: `overlayState`

<sub>源码: `vue/overlay/OverlaySlot.vue`</sub>

### 通知宿主 · `ToastHost`

把 Toast Teleport 到 #toast-layer 的出口

**Class 契约**

资产类（照抄，不要自造）：

`anx-toast` `anx-toast__body` `anx-toast__close` `anx-toast__icon` `anx-toast__text` `anx-toast__title`

**依赖**: `Icon` · `toast`

<sub>源码: `vue/overlay/ToastHost.vue`</sub>
