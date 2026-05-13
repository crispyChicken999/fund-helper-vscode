# Web 端二次增强 — 总览

> **总目标**：将 Web 端 1:1 还原 VSCode 版的功能和界面，修复所有已知问题。  
> **总预计工时**：11 天

---

## 问题总览

| 模块 | 问题描述 | 对应阶段 |
|------|---------|---------|
| 首页资产栏 | 配色丑、布局不对、缺少按钮 | Phase 1 |
| 搜索栏 | 缺少开市/休市状态 | Phase 1 |
| 分组管理 | 功能不完整、弹窗样式差 | Phase 2 |
| 分组 Tab | 缺少长按弹窗、设置按钮 | Phase 2 |
| 基金列表 | 表头日期错误、TD 数据不全 | Phase 3 |
| 列设置 | 可见列和排序分离 | Phase 3 / Phase 6 |
| 行情中心 | 标题看不清、ECharts 不渲染 | Phase 4 |
| 基金详情 | 日收益无数据、概况/经理缺失 | Phase 5 |
| 设置页面 | 标题看不清、导入导出不兼容 | Phase 6 |
| API 限制 | FundMNFInfo 接口被拦截 | Phase 7 |
| 数据同步 | 缺少二维码同步方案 | Phase 8 |

---

## 阶段规划

### Phase 1 — 首页资产栏 & 布局对齐
- 资产栏三栏布局重构
- 隐藏/显示金额按钮 + 灰色模式按钮
- 搜索栏 + 开市/休市状态
- 📄 [phase1_homepage_asset_and_layout.md](./phase1_homepage_asset_and_layout.md)

### Phase 2 — 分组管理全面重构
- 分组 Tab 横向滚动 + 设置按钮
- 长按分组弹出统计概况
- 分组管理弹窗（拖拽排序/编辑/删除/基金跨分组）
- 📄 [phase2_group_management.md](./phase2_group_management.md)

### Phase 3 — 基金列表表格 1:1 复刻
- 表头日期逻辑修正
- TD 双行数据完整复刻
- 长按基金名弹出详情 Dialog
- 列设置弹窗重构
- 📄 [phase3_fund_list_table.md](./phase3_fund_list_table.md)

### Phase 4 — 行情中心修复与完善
- Header 配色修复
- 板块 ECharts 图表渲染修复
- 子 Tab 切换逻辑
- 📄 [phase4_market_center.md](./phase4_market_center.md)

### Phase 5 — 基金详情页重写
- 持仓信息修复（日收益估算）
- 基金概况完善
- 基金经理信息
- 历史净值/累计收益图表修复
- 📄 [phase5_fund_detail.md](./phase5_fund_detail.md)

### Phase 6 — 设置页面修复 & 导入导出同步
- Header 配色修复
- 列配置 UI 合并重构
- 导入导出 JSON 格式兼容 VSCode 版
- Jsonbox boxName 生成规则
- 📄 [phase6_settings_and_import_export.md](./phase6_settings_and_import_export.md)

### Phase 7 — API CORS 绕过 & Worker 方案
- Cloudflare Worker 代理
- Vite proxy 开发环境配置
- 统一 proxyFetch 层
- 📄 [phase7_api_cors_and_worker.md](./phase7_api_cors_and_worker.md)

### Phase 8 — 数据同步 & 二维码方案
- VSCode 端数据上传/下载/二维码
- Web 端扫码同步
- 跨端配置同步流程
- 📄 [phase8_data_sync_qrcode.md](./phase8_data_sync_qrcode.md)

---

## 执行顺序建议

```
Phase 7 (API 代理)  ← 基础设施，优先解决
    ↓
Phase 1 (首页布局)  ← 视觉基础
    ↓
Phase 3 (基金列表)  ← 核心功能
    ↓
Phase 2 (分组管理)  ← 依赖列表数据
    ↓
Phase 4 (行情中心)  ← 独立模块
    ↓
Phase 5 (基金详情)  ← 独立模块
    ↓
Phase 6 (设置/导入导出)  ← 依赖前面的数据结构
    ↓
Phase 8 (数据同步)  ← 最后集成
```

建议先做 Phase 7（解决 API 限制），再做 Phase 1 和 Phase 3（核心视觉和功能），其余阶段可并行或按顺序推进。

---

## 技术栈确认

- **框架**：Vue 3 + TypeScript + Vite
- **UI 库**：Element Plus
- **状态管理**：Pinia
- **图表**：ECharts 5
- **拖拽**：原生 HTML5 Drag & Drop（与 VSCode 版一致）
- **二维码**：html5-qrcode（扫码）+ qrcode（生成）
- **CORS 代理**：Cloudflare Worker
- **数据同步**：Jsonbox

---

## 参照文件索引

| Web 端文件 | 对应 VSCode 版参照 |
|-----------|-------------------|
| `web/src/views/HomeView.vue` | `src/sidebar/webview/script.ts` + `index.ts` |
| `web/src/views/MarketView.vue` | `src/marketWebview.ts` |
| `web/src/views/FundDetailView.vue` | `src/detail/scripts.ts` + `html.ts` |
| `web/src/views/SettingsView.vue` | VSCode settings + `script.ts` 列设置 |
| `web/src/components/GroupManageDialog.vue` | `src/sidebar/webview/group.ts` |
| `web/src/components/FundTooltip.vue` | `script.ts` handleFundNameHover |
| `web/src/services/fundService.ts` | `src/fundService.ts` + `fundDataManager.ts` |
| `web/src/api/market.ts` | `src/marketWebview.ts` _getJs() |
