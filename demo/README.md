# demo/ — 演示页

**中后台静态演示**（零框架，`demo/admin/`）：玻璃外壳 + 概览 / 应用管理 / 新建应用 / 偏好设置四视图，含 SVG 图表、表格翻页、下拉、抽屉、弹窗、Toast、窄屏侧栏抽屉、明暗双主题。

它同时是「用资产搭出一个真实界面」的参考实现——壳布局来自 `css/shell.css`，其余全部来自 `css/` 令牌与基础样式。

## 本地预览

```bash
# 在仓库根启动任意静态服务器
python -m http.server 8123
# → http://127.0.0.1:8123/demo/admin/
```

## 在线预览 / 发布

```bash
bash tools/build-site.sh     # 组装自包含站点 _site/（落地页 + demo + gallery + css + fonts）
```

`_site/` 可直接静态托管（GitHub Pages / 静态服务器 / 任意 hosting）。

> 当前在线：<https://authnexus-design.app.workbuddy.host/>（随时可下线）

## 说明

- `admin.js` / `admin.css` 是演示专属的静态实现；真实项目请使用 `vue/` 下的组件与 `lib/`（下拉定位、滑块测量等算法与组件保持一致）。
- `gallery/`（组件平铺画廊）与 `audit/`（浏览器黑盒审计）配套使用，见各自目录的 README。
