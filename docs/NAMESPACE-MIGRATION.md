# 鉴枢设计系统 · anx- 前缀迁移方案

> 状态：已盘点（`python tools/scan-classes.py`），待执行（任务 #14–#19）。
> 目标：把 authnexus-design 从"可复制的资产"升级为"可安装的库"，class 全部进入
> `anx-` 命名空间，避免污染宿主框架与全局样式——这是 Element 用 `el-`、AntD 用 `ant-` 的
> 同一个理由。差异点：契约驱动 + MCP，让 AI 一次做对。

## 盘点结论（基准）

| 类别 | 数量 | 处置 |
|---|---|---|
| A 资产类（定义在 `css/*.css`） | 134 | **加 `anx-` 前缀**（如 `.btn`→`.anx-btn`、`.fsel__btn`→`.anx-fsel__btn`） |
| B demo/examples 私有类 | ~12 | 留在原地（`chart` `view` `side-user` `form-col` `paged-anim` `topbar-search` `list-search` `routefade-view` `demo-wrap` `demo-head` …） |
| C 状态与第三方层 | 不变 | `is-*` `has-*` `js-*` `od-*` `g-*` 不加前缀 |
| D 误报 | ~23 | JS 变量/图标名（`true` `iconName` `chevron-down` `modelValue` …），非 class |

**B 类 35 个逐条核对完毕，无一是真问题**——要么是 demo 页自己的类，要么是 JS 变量名被误抓。

## 命名规则

1. **前缀**：`anx-`（短、可读、不与宿主框架撞车；不用 `auth-` 因为太长）。
2. **BEM 根名统一加前缀**：`.fsel` → `.anx-fsel`，`.fsel__btn` → `.anx-fsel__btn`，
   `.btn--primary` → `.anx-btn--primary`。
3. **状态类不加前缀**：`.is-open` `.is-active` `.has-error` `.g-*` `.od-*` 保持原样
   （它们依附于具体组件类，脱离组件不成立）。
4. **自定义属性不动**：`--r` `--acid` `--glass-*` `--nav-h` 等 CSS 变量与 class 无关。
5. **单连字符属名字一部分**：`page-head` `t-h1` `grid-2` `toast-layer` `fsel-pop-enter-from`
   只在**根名**前加前缀（`anx-page-head` `anx-t-h1` `anx-grid-2`），中间的 `-` 不动。

## 迁移影响面

| 位置 | 内容 | 风险 |
|---|---|---|
| `css/*.css`（7 个） | 选择器前缀 | 低——`verify-css.py` 逐条比对源，迁移后需同步更新它的期望 |
| `vue/`（33 个组件） | 模板 class + 代码内 class 字符串 | 中——`classList`、`querySelector` 里的字面量 |
| `audit/`（6 个脚本） | 选择器与断言文案 | 中——改完须重跑全部审计 |
| `gallery/` `demo/` `examples/` | 页面 class | 低——有截图对照 |
| `docs/*.md` | class 契约示例 | 低 |
| **鉴枢 `app/`** | 全部 `.vue` + `styles/app.css` + `index.html` | **高——breaking change**，需整目录备份 + 全量验收（typecheck → build → 测试 → 冒烟 → 审计） |

## 迁移顺序（每步可独立验收）

1. **#14 CSS 七件套** → `verify-css.py` 通过
2. **#15 Vue 组件** → 组件内无裸根类名
3. **#16 审计脚本** → `audit-gallery` 54/54
4. **#17 gallery/demo/examples** → 截图与迁移前逐像素一致
5. **#18 文档** → class 契约改前缀
6. **#19 鉴枢**（先备份）→ typecheck → build:prod → 测试 → mock 冒烟 15 步 → http 冒烟 9 步 → 5 审计全绿
7. **#20 package.json**（单仓多入口）

## 关键原则

- **迁移 = 机械替换 + 逐项验收**，不改任何样式值、不改任何交互逻辑；
- 每一步都有可执行的验收（`verify-css` / 审计 / 截图 / 冒烟），不靠肉眼；
- 鉴枢不是 git 仓库——**迁移前必须整目录备份**（`app/` 全量复制），出问题可一键回滚。
