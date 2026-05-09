# 基金助手 Web端

> 基于Vue 3 + Vite + TypeScript + Element Plus的基金投资组合管理Web应用

## 📋 项目状态

### ✅ 已完成（第一阶段：项目初期化与基础建设）

- [x] 项目创建与配置（Vue 3 + Vite + TypeScript）
- [x] 依赖包安装（Pinia、Vue Router、Element Plus、Axios等）
- [x] TypeScript类型定义（Fund、Group、Market、Settings等）
- [x] 工具函数库（format、calc、validate）
- [x] Pinia Store架构
  - [x] fundStore - 基金数据管理
  - [x] groupStore - 分组管理
  - [x] settingStore - 用户设置管理
- [x] 路由配置（首页、行情、设置、详情）
- [x] 基础视图组件
  - [x] HomeView - 首页（基础框架）
  - [x] MarketView - 行情中心（占位）
  - [x] SettingsView - 设置页面（基础功能）
  - [x] FundDetailView - 基金详情（占位）
- [x] 全局样式与主题配置
- [x] 路径别名配置（@指向src）

### 🚧 待开发

#### 第二阶段：首页-列表视图开发
- [ ] 完善资产展示模块
- [ ] 完善分组管理功能
- [ ] 完善基金列表表格
- [ ] 实现基金CRUD操作
- [ ] 实现搜索、排序、筛选功能
- [ ] 实现下拉刷新和自动刷新

#### 第三阶段：行情中心开发
- [ ] 行情数据获取（JSONP）
- [ ] 行情分类管理
- [ ] 行情搜索功能
- [ ] 行情列表显示

#### 第四阶段：基金详情页开发
- [ ] 基金信息展示
- [ ] 持仓信息展示
- [ ] 预计收益计算
- [ ] 编辑和删除功能

#### 第五阶段：设置页面与数据同步
- [ ] JSONBox数据同步
- [ ] 数据冲突处理
- [ ] 离线队列管理
- [ ] 列表配置功能

#### 第六阶段：测试与优化
- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能优化
- [ ] 兼容性测试

#### 第七阶段：部署与上线
- [ ] 生产构建配置
- [ ] GitHub Pages部署
- [ ] CI/CD配置

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

### 预览生产版本
```bash
npm run preview
```

## 📁 项目结构

```
web/
├── src/
│   ├── components/          # 组件（待创建）
│   ├── stores/             # Pinia stores
│   │   ├── fundStore.ts    # 基金数据管理
│   │   ├── groupStore.ts   # 分组管理
│   │   ├── settingStore.ts # 用户设置管理
│   │   └── index.ts        # Store导出
│   ├── views/              # 视图组件
│   │   ├── HomeView.vue    # 首页
│   │   ├── MarketView.vue  # 行情中心
│   │   ├── SettingsView.vue # 设置
│   │   └── FundDetailView.vue # 基金详情
│   ├── router/             # 路由配置
│   │   └── index.ts
│   ├── utils/              # 工具函数
│   │   ├── format.ts       # 格式化
│   │   ├── calc.ts         # 计算
│   │   └── validate.ts     # 验证
│   ├── types/              # TypeScript类型
│   │   └── index.ts
│   ├── App.vue             # 根组件
│   ├── main.ts             # 入口文件
│   └── style.css           # 全局样式
├── public/                 # 静态资源
├── index.html              # HTML模板
├── vite.config.ts          # Vite配置
├── tsconfig.json           # TypeScript配置
└── package.json            # 项目配置
```

## 🛠️ 技术栈

- **前端框架**: Vue 3
- **构建工具**: Vite
- **UI库**: Element Plus
- **状态管理**: Pinia
- **路由**: Vue Router
- **HTTP客户端**: Axios
- **跨域方案**: JSONP
- **工具库**: @vueuse/core
- **语言**: TypeScript

## 📖 文档

详细文档请查看 `.docs/web-docs/` 目录：

- [README.md](.docs/web-docs/README.md) - 文档导航索引
- [WEB_REQUIREMENTS.md](.docs/web-docs/WEB_REQUIREMENTS.md) - 详细需求文档
- [WEB_IMPLEMENTATION_PLAN.md](.docs/web-docs/WEB_IMPLEMENTATION_PLAN.md) - 阶段任务表
- [WEB_DATA_MODELS.md](.docs/web-docs/WEB_DATA_MODELS.md) - 数据模型与接口文档
- [WEB_QUICK_REFERENCE.md](.docs/web-docs/WEB_QUICK_REFERENCE.md) - 快速参考指南

## 📝 开发规范

### 代码风格
- 使用TypeScript严格模式
- 遵循Vue 3 Composition API规范
- 使用ESLint + Prettier格式化代码

### 提交规范
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 重构
- test: 测试相关
- chore: 构建/工具链相关

## 📄 License

MIT

## 👥 贡献

欢迎提交Issue和Pull Request！
