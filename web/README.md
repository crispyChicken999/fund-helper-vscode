# 基金助手 Web 版

基于 Vue 3 + TypeScript + Element Plus 构建的基金投资组合管理应用，与 VSCode 插件版共享云同步配置。

## 功能

**基金列表**
- 实时估算涨跌幅、估算收益、日涨跌、日收益、持仓收益等多列展示
- 自定义列显示/隐藏与排列顺序
- 分组管理：创建、重命名、删除分组，拖拽调整分组顺序
- 分组筛选：点击分组标签快速过滤，点击行内分组标签跳转对应分组
- 基金排序：按涨跌幅、收益等字段排序
- 搜索：按基金名称或代码过滤
- 拖拽排序：全部视图下可拖拽调整基金顺序
- 分组 Tooltip：hover 分组标签显示该组汇总统计
- 基金 Tooltip：hover 基金名称显示持仓详情

**基金详情**
- 基金基本信息、净值走势图
- 持仓股票/债券列表（含实时行情）
- 历史净值、基金经理等详情

**行情中心**
- 大盘指数、板块行情实时展示

**设置**
- 隐私模式（隐藏所有金额）
- 灰色模式（移除色彩）
- 浅色/深色主题
- 自动刷新间隔配置
- 列配置（显示/隐藏/排序）
- 数据导入/导出（JSON）

**云同步**
- 基于 JSONBox 的云端配置同步
- 上传/下载云端数据
- 二维码分享 Box Name（供移动端扫码同步）
- 与 VSCode 插件版数据格式完全兼容

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 项目结构

```
src/
├── api/              # 接口封装（基金数据、JSONBox）
├── components/       # 公共组件
│   ├── ColumnSettingsDialog.vue  # 列配置弹窗
│   ├── FundTooltip.vue           # 基金 Tooltip
│   ├── GroupManageDialog.vue     # 分组管理弹窗
│   ├── GroupTooltip.vue          # 分组统计 Tooltip
│   └── SyncDialog.vue            # 云同步弹窗
├── layouts/          # 布局组件
├── router/           # 路由配置
├── services/         # 业务服务层（同步、存储）
├── stores/           # Pinia 状态管理
│   ├── fundStore.ts
│   ├── groupStore.ts
│   ├── settingStore.ts
│   └── syncStore.ts
├── types/            # TypeScript 类型定义
├── utils/            # 工具函数（格式化、计算、校验）
└── views/
    ├── HomeView.vue        # 首页（基金列表）
    ├── FundDetailView.vue  # 基金详情
    ├── MarketView.vue      # 行情中心
    └── SettingsView.vue    # 设置
```

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3 + Composition API |
| 语言 | TypeScript |
| 构建 | Vite |
| UI | Element Plus |
| 状态管理 | Pinia |
| 路由 | Vue Router |
| HTTP | Axios |
| 工具 | @vueuse/core |

## 与 VSCode 版同步

两端使用相同的 JSONBox 数据格式，可通过云同步互相导入配置。VSCode 专属字段（`hideStatusBar`、`defaultViewMode`）在 Web 端上传时会自动保留，不会被覆盖。

## License

MIT
