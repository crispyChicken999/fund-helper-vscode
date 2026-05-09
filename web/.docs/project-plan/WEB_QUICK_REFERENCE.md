# 基金助手Web端 - 快速参考指南

## 🎯 核心架构

### 项目结构
```
fund-helper-web/
├── src/
│   ├── components/          # 组件
│   │   ├── common/         # 公共组件
│   │   ├── home/           # 首页组件
│   │   ├── market/         # 行情中心组件
│   │   ├── settings/       # 设置页面组件
│   │   └── detail/         # 基金详情组件
│   ├── stores/             # Pinia stores
│   │   ├── fundStore.ts
│   │   ├── groupStore.ts
│   │   ├── marketStore.ts
│   │   ├── settingStore.ts
│   │   ├── syncStore.ts
│   │   └── uiStore.ts
│   ├── services/           # 业务逻辑
│   │   ├── fundService.ts
│   │   ├── groupService.ts
│   │   ├── marketService.ts
│   │   ├── syncService.ts
│   │   ├── apiService.ts
│   │   └── storageService.ts
│   ├── api/                # API调用
│   │   ├── jsonbox.ts      # JSONBox接口
│   │   ├── fundgz.ts       # fundgz接口
│   │   └── index.ts
│   ├── utils/              # 工具函数
│   │   ├── format.ts       # 格式化
│   │   ├── calc.ts         # 计算
│   │   ├── validate.ts     # 验证
│   │   └── types.ts        # 类型定义
│   ├── types/              # TypeScript类型
│   ├── router/             # Vue Router
│   ├── styles/             # 全局样式
│   ├── App.vue
│   └── main.ts
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── eslint.config.js
└── package.json
```

---

## 📊 数据流向图

```
┌─────────────────────────────────────────────────────────────┐
│                    Vue组件 (UI层)                            │
│  首页 | 行情中心 | 设置 | 基金详情                          │
└────────────────────┬────────────────────────────────────────┘
                     │ 触发actions
                     ↓
┌─────────────────────────────────────────────────────────────┐
│            Pinia Stores (状态管理层)                        │
│  fundStore | groupStore | marketStore | settingStore      │
│  syncStore | uiStore                                        │
└────────────────────┬────────────────────────────────────────┘
                     │ 调用services
                     ↓
┌─────────────────────────────────────────────────────────────┐
│           Services (业务逻辑层)                             │
│  fundService | groupService | marketService | syncService  │
│  apiService | storageService                               │
└────────────────────┬────────────────────────────────────────┘
                     │ 调用API/存储
                     ↓
         ┌───────────┴────────────┐
         ↓                        ↓
    ┌─────────────┐        ┌──────────────┐
    │  LocalStorage│        │  JSONBox API │
    │  (本地缓存)  │        │ (云端存储)   │
    └─────────────┘        └──────────────┘
         ↓                        ↓
    ┌─────────────┐        ┌──────────────┐
    │   fundgz    │        │  fundgz API  │
    │   JSONP     │        │  (行情数据)  │
    └─────────────┘        └──────────────┘
```

---

## 🔄 数据同步流程

### 启动时同步
```
启动应用
  ↓
加载LocalStorage (同步)
  ↓
初始化Pinia stores
  ↓
尝试从JSONBox同步数据 (异步)
  ├─ 成功 → 版本比对 → 冲突处理 → 更新stores
  └─ 失败 → 使用本地缓存
  ↓
加载行情数据 (JSONP, 异步)
  ├─ 成功 → 更新marketStore → 显示行情
  └─ 失败 → 显示缓存的行情
  ↓
显示UI，启动自动刷新
```

### 数据修改时同步
```
用户修改数据 (添加/编辑/删除)
  ↓
触发store action
  ↓
更新本地store (同步)
  ↓
保存到LocalStorage (同步)
  ↓
显示UI更新 (同步)
  ↓
异步上传到JSONBox
  ├─ 成功 → 更新syncStore状态
  └─ 失败 → 加入离线队列
```

---

## 📱 页面导航结构

```
┌─────────────────────┐
│    首页(Home)       │
│  ├─ 资产展示        │
│  ├─ 分组管理        │
│  ├─ 基金列表        │
│  └─ [点击] → 详情   │
└─────────────────────┘
         ↓
┌─────────────────────┐
│  基金详情(Detail)   │
│  ├─ 基金信息        │
│  ├─ 持仓信息        │
│  ├─ 预计收益        │
│  ├─ 编辑/删除       │
│  └─ [返回] → 首页   │
└─────────────────────┘

┌─────────────────────┐
│  行情中心(Market)   │
│  ├─ 分类筛选        │
│  ├─ 搜索            │
│  └─ 行情列表        │
└─────────────────────┘

┌─────────────────────┐
│   设置(Settings)    │
│  ├─ JSONBox配置     │
│  ├─ 显示设置        │
│  ├─ 列表配置        │
│  └─ 关于            │
└─────────────────────┘
```

---

## 🧮 关键计算公式

### 基金收益计算
```javascript
// 持有收益 = (当前净值 - 成本价) × 持有份额
holdingGain = (currentPrice - cost) × num

// 持有收益率 = 持有收益 / (成本价 × 持有份额) × 100%
holdingGainRate = (holdingGain / (cost × num)) × 100

// 日收益 = 日涨跌额 × 持有份额
dailyGain = changeAmount × num

// 预计收益 = 持有收益 (与持有收益相同)
estimatedGain = holdingGain

// 预计涨幅 = (当前净值 / 成本价 - 1) × 100%
estimatedChange = (currentPrice / cost - 1) × 100

// 资产总值
totalAsset = ∑(当前净值 × 持有份额)

// 持有收益总和
totalHoldingGain = ∑holdingGain

// 日收益总和
totalDailyGain = ∑dailyGain
```

### 涨跌幅判断
```javascript
// 绿色: 收益 > 0 或 涨幅 > 0
// 红色: 收益 < 0 或 涨幅 < 0
// 灰色: 无色差模式，统一灰色
```

---

## 🔑 关键技术决策

### 1. 为什么选择Pinia而不是Vuex?
- Vue 3官方推荐
- API更简洁，学习曲线平缓
- TypeScript支持更好
- 模块化更灵活

### 2. 为什么使用LocalStorage而不是IndexedDB?
- 数据量小（几千条基金记录）
- LocalStorage简单足够
- 跨浏览器兼容性好
- 与JSONBox配合足以

### 3. 为什么使用JSONP获取fundgz数据?
- fundgz接口返回JSONP格式
- 浏览器同源策略限制
- JSONP是标准解决方案
- 无需后端代理

### 4. 为什么使用JSONBox而不是自建后端?
- 无需后端维护成本
- 免费存储30天
- 简单JSON操作，足以满足需求
- 用户可自定义Box，隐私更好

### 5. 为什么不用虚拟滚动?
- 初期基金数量不多（50-100个）
- 后期再优化
- Element Plus已支持虚拟滚表格

---

## 🎨 UI设计原则

### 移动端优先
- 所有交互设计针对手指点击优化
- 按钮、区域足够大（> 44px）
- 弹窗而非Tooltip（移动端适配）

### 简洁直观
- 三页制：首页、行情、设置
- Tab导航固定在底部
- 关键信息突出显示

### 性能优先
- 首屏加载 < 3秒
- 列表滚动流畅
- 动画不卡顿

### 无障碍考虑
- 足够的色彩对比度
- 灰色模式支持
- 隐私模式保护用户隐私

---

## 💾 数据存储与同步

### LocalStorage键值
```javascript
// 本地缓存键
{
  'funds_local': JSON.stringify(funds),
  'groups_local': JSON.stringify(groups),
  'markets_local': JSON.stringify(markets),
  'settings': JSON.stringify(settings),
  'sync_meta': JSON.stringify({
    lastSyncTime: timestamp,
    localVersion: number,
    jsonboxName: string,
    cloudVersion: number
  }),
  'offline_queue': JSON.stringify(syncActions)
}
```

### JSONBox数据结构
```javascript
{
  funds: [
    { code, num, cost, groupKey },
    ...
  ],
  groups: {
    "groupName": [code1, code2, ...],
    ...
  },
  groupOrder: [groupName, ...],
  columnSettings: {
    columnOrder: [...],
    visibleColumns: [...]
  },
  sortMethod: "holdingGainRate_desc",
  refreshInterval: 20,
  settings: {
    privacyMode: boolean,
    grayscaleMode: boolean,
    theme: "light|dark"
  },
  version: number,
  lastModified: timestamp
}
```

---

## 🌐 API调用规范

### 请求配置
```typescript
const apiClient = {
  timeout: 5000,           // 5秒超时
  retries: 3,              // 失败重试3次
  retryDelay: 1000,        // 重试延迟1秒
  cacheTime: 15 * 60 * 1000 // 15分钟缓存
}
```

### 错误处理
```javascript
// 网络错误 → 使用缓存数据，显示提示
// 超时 → 自动重试
// 数据格式错误 → 记录日志，显示错误提示
// JSONBox连接失败 → 离线模式
```

---

## 🚀 性能目标

| 指标 | 目标 | 说明 |
|------|------|------|
| FCP | < 1.5s | First Contentful Paint |
| LCP | < 2.5s | Largest Contentful Paint |
| CLS | < 0.1 | Cumulative Layout Shift |
| 列表滚动帧率 | 60fps | 流畅滚动 |
| 基金列表(100项)渲染 | < 500ms | 首次渲染 |
| 增量更新 | < 100ms | 刷新价格数据 |

---

## 🧪 测试覆盖范围

### 单元测试 (目标: > 80%)
- Store: 状态初始化、action、getter、mutation
- Service: 计算、转换、验证函数
- Utils: 格式化、计算工具函数

### 集成测试
- Store + Service 交互
- 页面加载流程
- 数据修改流程

### E2E测试
- 首页：筛选、搜索、排序、编辑、删除
- 详情页：加载、编辑、删除、返回
- 行情页：分类切换、搜索
- 设置页：配置修改、同步

### 兼容性测试
- iOS Safari 11+
- Android Chrome 最新版
- 浏览器: Chrome, Firefox, Safari 最新版

---

## 📦 依赖版本

```json
{
  "vue": "^3.3.0",
  "vue-router": "^4.2.0",
  "pinia": "^2.1.0",
  "element-plus": "^2.4.0",
  "axios": "^1.5.0",
  "jsonp": "^0.2.1",
  "@vueuse/core": "^10.0.0",
  "vite": "^4.4.0",
  "typescript": "^5.1.0",
  "@vitejs/plugin-vue": "^4.3.0"
}
```

---

## 🔐 安全检查清单

- [ ] 输入验证：基金代码、分组名称、数字字段
- [ ] 输出转义：防止XSS
- [ ] JSONBox Box名称验证：20-64字符，只允许字母数字下划线
- [ ] 离线队列操作序列化，防止并发冲突
- [ ] 敏感信息不记录日志
- [ ] HTTPS访问强制

---

## 🐛 常见问题排查

### 问题1: 行情数据加载失败
```
原因: fundgz接口跨域/超时
方案:
1. 检查JSONP包装是否正确
2. 检查网络连接和超时设置
3. 使用缓存数据显示
4. 显示错误提示给用户
```

### 问题2: JSONBox连接失败
```
原因: Box名称错误/网络问题/JSONBox不可用
方案:
1. 检查Box名称有效性
2. 验证网络连接
3. 使用离线模式
4. 提示用户检查设置
```

### 问题3: 数据不同步
```
原因: 网络断开/同步失败/版本冲突
方案:
1. 检查网络连接
2. 检查离线队列
3. 检查版本号和冲突处理
4. 允许用户手动同步
```

### 问题4: 列表卡顿
```
原因: 数据过多/渲染复杂
方案:
1. 使用虚拟滚动（如果数据>1000）
2. 优化渲染，减少重排
3. 使用分页加载
4. 增加缓存
```

---

## 📚 参考资源

- **Vue 3文档**: https://vuejs.org/
- **Pinia文档**: https://pinia.vuejs.org/
- **Element Plus**: https://element-plus.org/
- **Vite文档**: https://vitejs.dev/
- **JSONBox**: https://jsonbox.io/
- **TypeScript**: https://www.typescriptlang.org/

---

## ✅ 上线检查清单

### 功能检查
- [ ] 首页显示基金列表
- [ ] 分组功能正常
- [ ] 基金编辑、删除可用
- [ ] 基金详情可正常打开
- [ ] 行情中心显示行情数据
- [ ] 设置页面所有功能可用
- [ ] JSONBox同步正常
- [ ] 隐私模式、灰色模式工作

### 性能检查
- [ ] 首屏加载 < 3秒
- [ ] 列表滚动流畅 60fps
- [ ] 移动设备响应灵敏

### 兼容性检查
- [ ] iOS Safari 正常
- [ ] Android Chrome 正常
- [ ] 浏览器 Chrome/Firefox/Safari 正常

### 安全检查
- [ ] HTTPS已启用
- [ ] 输入验证完成
- [ ] 无XSS漏洞
- [ ] JSONBox隐私设置正确

### 部署检查
- [ ] 环境变量配置正确
- [ ] 构建成功无警告
- [ ] CI/CD流程通过
- [ ] 域名/CDN配置完成

---

## 🚦 部署流程

```bash
# 1. 代码提交
git add .
git commit -m "feature: xxx"
git push origin main

# 2. CI/CD自动触发
# GitHub Actions自动构建和测试

# 3. 自动部署到GitHub Pages/Vercel
# 部署完成后自动发布

# 4. 验证部署
# 访问https://yourdomain.com 验证
```

---

