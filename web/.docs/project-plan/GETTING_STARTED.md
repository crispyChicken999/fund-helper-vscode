# 基金助手Web端 - 快速开始指南

## 🚀 快速启动

### 1. 确认环境
确保你已安装：
- Node.js 16+ 
- npm 或 pnpm

### 2. 安装依赖
```bash
cd web
npm install
```

### 3. 启动开发服务器
```bash
npm run dev
```

浏览器会自动打开 `http://localhost:5173`

### 4. 构建生产版本
```bash
npm run build
```

构建产物会生成在 `dist/` 目录

### 5. 预览生产版本
```bash
npm run preview
```

---

## 📁 项目结构说明

```
web/
├── src/
│   ├── stores/              # Pinia状态管理
│   │   ├── fundStore.ts     # 基金数据
│   │   ├── groupStore.ts    # 分组管理
│   │   └── settingStore.ts  # 用户设置
│   ├── views/               # 页面组件
│   │   ├── HomeView.vue     # 首页
│   │   ├── MarketView.vue   # 行情中心
│   │   ├── SettingsView.vue # 设置
│   │   └── FundDetailView.vue # 基金详情
│   ├── router/              # 路由配置
│   ├── utils/               # 工具函数
│   │   ├── format.ts        # 格式化
│   │   ├── calc.ts          # 计算
│   │   └── validate.ts      # 验证
│   ├── types/               # TypeScript类型
│   ├── App.vue              # 根组件
│   └── main.ts              # 入口文件
├── public/                  # 静态资源
├── vite.config.ts           # Vite配置
└── package.json             # 项目配置
```

---

## 🎯 当前功能状态

### ✅ 已实现
- [x] 项目基础架构
- [x] Pinia状态管理
- [x] Vue Router路由
- [x] Element Plus UI组件
- [x] TypeScript类型定义
- [x] 工具函数库
- [x] 基础页面框架
- [x] 设置页面（基础功能）

### 🚧 开发中
- [ ] 首页基金列表完整功能
- [ ] 基金数据获取（fundgz接口）
- [ ] 分组管理完整功能
- [ ] 本地存储持久化
- [ ] 数据同步（JSONBox）

### 📅 计划中
- [ ] 行情中心
- [ ] 基金详情页
- [ ] 数据同步与冲突处理
- [ ] 测试与优化
- [ ] 部署上线

---

## 🔧 开发指南

### 添加新页面
1. 在 `src/views/` 创建新的Vue组件
2. 在 `src/router/index.ts` 添加路由配置
3. 在底部导航添加菜单项

### 添加新Store
1. 在 `src/stores/` 创建新的store文件
2. 定义State、Getters、Actions
3. 在 `src/stores/index.ts` 导出

### 添加新工具函数
1. 在 `src/utils/` 对应文件中添加函数
2. 添加TypeScript类型注解
3. 添加JSDoc注释

---

## 🐛 常见问题

### Q: 启动时报错找不到模块
A: 运行 `npm install` 重新安装依赖

### Q: 路径别名@不生效
A: 检查 `vite.config.ts` 和 `tsconfig.app.json` 配置

### Q: Element Plus样式不生效
A: 确保在 `main.ts` 中导入了 `element-plus/dist/index.css`

### Q: 热更新不生效
A: 重启开发服务器 `npm run dev`

---

## 📚 相关文档

- [Vue 3文档](https://vuejs.org/)
- [Vite文档](https://vitejs.dev/)
- [Element Plus文档](https://element-plus.org/)
- [Pinia文档](https://pinia.vuejs.org/)
- [Vue Router文档](https://router.vuejs.org/)

---

## 📝 开发规范

### 代码风格
- 使用TypeScript严格模式
- 使用Vue 3 Composition API
- 使用`<script setup>`语法
- 组件名使用PascalCase
- 文件名使用PascalCase（组件）或camelCase（工具）

### Git提交规范
```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具链相关
```

---

## 🎨 UI设计原则

- **移动端优先**: 所有交互针对触摸优化
- **简洁直观**: 三页制设计，信息层级清晰
- **性能优先**: 首屏加载<3秒，滚动流畅60fps
- **无障碍**: 足够的色彩对比度，支持灰色模式

---

## 🚀 下一步

1. **完善首页功能**
   - 实现基金数据获取
   - 完善表格交互
   - 实现搜索排序

2. **创建Service层**
   - fundService - 基金业务逻辑
   - apiService - API调用封装
   - storageService - 本地存储

3. **实现数据持久化**
   - LocalStorage存储
   - JSONBox同步

---

## 💬 反馈与贡献

欢迎提交Issue和Pull Request！

- GitHub: [项目地址]
- 文档: `.docs/web-docs/`

---

**祝你开发愉快！** 🎉
