# 基金助手Web端 - 项目初始化与快速开始指南

## 第一部分：项目初始化

### 1.1 前置条件检查

在开始项目前，请确保已安装以下环境：

```bash
# 检查Node.js版本 (需要 >= 16.x)
node --version

# 检查npm版本 (需要 >= 7.x)
npm --version

# 或使用pnpm (推荐)
# 安装pnpm: npm install -g pnpm
pnpm --version

# 安装Git
git --version
```

**要求**:
- Node.js: ≥ 16.0.0
- npm: ≥ 7.0.0 或 pnpm ≥ 7.0.0
- Git: 最新版本

### 1.2 项目克隆与初始化

```bash
# 1. 克隆项目 (假设已有repo)
git clone https://github.com/yourname/fund-helper-web.git
cd fund-helper-web

# 2. 安装依赖
pnpm install
# 或
npm install

# 3. 验证安装
pnpm --version
pnpm list vue

# 4. 启动开发服务器
pnpm dev
# 或
npm run dev

# 应该看到类似输出:
# VITE v4.4.0  ready in 200 ms
# ➜  Local:   http://localhost:5173/
# ➜  press h to show help
```

### 1.3 IDE配置

#### VSCode推荐扩展
```
必装:
- Volar (Vue Language Features) - Vue3官方语言支持
- TypeScript Vue Plugin (Volar)
- ESLint - 代码检测
- Prettier - 代码格式化

可选:
- Vue 3 Snippets - Vue代码片段
- Pinia - Pinia官方支持
- Element Plus Extension Pack
```

#### VSCode工作区设置 (.vscode/settings.json)
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[vue]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "vue.enableTakeover": true
}
```

### 1.4 初始化开发环境

```bash
# 1. 配置本地环境变量 (.env.local)
cp .env.example .env.local

# 编辑 .env.local，配置必要变量:
VITE_API_BASEURL=https://jsonbox.cloud.exo-imaging.com
VITE_FUNDGZ_API=http://api.fund.eastmoney.com
VITE_APP_TITLE=基金助手

# 2. 验证环境
pnpm run build:check

# 3. 本地开发启动
pnpm run dev

# 4. 在浏览器中打开
# http://localhost:5173
```

---

## 第二部分：项目文件结构初始化

### 2.1 核心文件结构

创建以下文件结构（按优先级）:

```
fund-helper-web/
├── src/
│   ├── App.vue                          ✓ 必须
│   ├── main.ts                          ✓ 必须
│   │
│   ├── router/
│   │   └── index.ts                     ✓ 第1阶段
│   │
│   ├── stores/
│   │   ├── index.ts
│   │   ├── fundStore.ts                 ✓ 第1阶段
│   │   ├── groupStore.ts                ✓ 第1阶段
│   │   ├── marketStore.ts               ✓ 第1阶段
│   │   ├── settingStore.ts              ✓ 第1阶段
│   │   ├── syncStore.ts                 ✓ 第1阶段
│   │   └── uiStore.ts                   ✓ 第1阶段
│   │
│   ├── services/
│   │   ├── index.ts
│   │   ├── fundService.ts               ✓ 第1阶段
│   │   ├── groupService.ts              ✓ 第1阶段
│   │   ├── marketService.ts             ✓ 第1阶段
│   │   ├── syncService.ts               ✓ 第1阶段
│   │   ├── apiService.ts                ✓ 第1阶段
│   │   └── storageService.ts            ✓ 第1阶段
│   │
│   ├── api/
│   │   ├── jsonbox.ts                   ✓ 第1阶段
│   │   ├── fundgz.ts                    ✓ 第1阶段
│   │   └── index.ts
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Card.vue
│   │   │   ├── Modal.vue
│   │   │   └── Toast.vue
│   │   ├── home/
│   │   │   ├── AssetDisplay.vue         ✓ 第2阶段
│   │   │   ├── GroupTags.vue            ✓ 第2阶段
│   │   │   ├── FundTable.vue            ✓ 第2阶段
│   │   │   └── FundOperationMenu.vue    ✓ 第2阶段
│   │   ├── market/
│   │   │   ├── MarketList.vue           ✓ 第3阶段
│   │   │   └── MarketFilter.vue         ✓ 第3阶段
│   │   ├── detail/
│   │   │   ├── FundDetailCard.vue       ✓ 第4阶段
│   │   │   └── FundEditModal.vue        ✓ 第4阶段
│   │   └── settings/
│   │       ├── JsonboxConfig.vue        ✓ 第5阶段
│   │       ├── DisplaySettings.vue      ✓ 第5阶段
│   │       └── ColumnConfig.vue         ✓ 第5阶段
│   │
│   ├── pages/
│   │   ├── Home.vue                     ✓ 第2阶段
│   │   ├── Market.vue                   ✓ 第3阶段
│   │   ├── Settings.vue                 ✓ 第5阶段
│   │   └── FundDetail.vue               ✓ 第4阶段
│   │
│   ├── utils/
│   │   ├── format.ts                    ✓ 第1阶段
│   │   ├── calc.ts                      ✓ 第1阶段
│   │   ├── validate.ts                  ✓ 第1阶段
│   │   ├── types.ts                     ✓ 第1阶段
│   │   └── constants.ts
│   │
│   ├── types/
│   │   ├── fund.ts                      ✓ 第1阶段
│   │   ├── group.ts                     ✓ 第1阶段
│   │   ├── market.ts                    ✓ 第1阶段
│   │   ├── setting.ts                   ✓ 第1阶段
│   │   └── index.ts
│   │
│   ├── styles/
│   │   ├── main.css                     ✓ 第1阶段
│   │   ├── variables.css                ✓ 第1阶段
│   │   ├── responsive.css               ✓ 第1阶段
│   │   └── themes.css
│   │
│   └── hooks/
│       ├── useAsync.ts
│       ├── useFund.ts
│       └── useSync.ts
│
├── tests/
│   ├── unit/
│   │   ├── stores/
│   │   ├── services/
│   │   └── utils/
│   └── e2e/
│       └── main.spec.ts
│
├── docs/
│   └── (存放前面生成的文档)
│
├── public/
│   └── favicon.ico
│
├── index.html                           ✓ 必须
├── vite.config.ts                       ✓ 第1阶段
├── tsconfig.json                        ✓ 第1阶段
├── eslint.config.js                     ✓ 第1阶段
├── package.json                         ✓ 必须
└── .gitignore                           ✓ 必须
```

### 2.2 关键文件模板

#### package.json
```json
{
  "name": "fund-helper-web",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "type-check": "vue-tsc --noEmit",
    "lint": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts",
    "lint:fix": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts --fix",
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  },
  "dependencies": {
    "vue": "^3.3.0",
    "vue-router": "^4.2.0",
    "pinia": "^2.1.0",
    "element-plus": "^2.4.0",
    "axios": "^1.5.0",
    "jsonp": "^0.2.1",
    "@vueuse/core": "^10.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.3.0",
    "typescript": "^5.1.0",
    "vite": "^4.4.0",
    "vue-tsc": "^1.8.0",
    "eslint": "^8.46.0",
    "@typescript-eslint/eslint-plugin": "^6.3.0",
    "@typescript-eslint/parser": "^6.3.0",
    "eslint-plugin-vue": "^9.16.0",
    "prettier": "^3.0.0"
  }
}
```

#### vite.config.ts
```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    strictPort: false,
    cors: true
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'element-plus': ['element-plus']
        }
      }
    }
  }
})
```

#### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,

    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,

    "moduleResolution": "node",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",

    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## 第三部分：快速开始任务

### 3.1 第一天任务清单

```bash
# 1. 项目初始化
[ ] 克隆或创建项目
[ ] 安装依赖 (pnpm install)
[ ] 验证依赖安装成功
[ ] 启动开发服务器 (pnpm dev)
[ ] 验证浏览器可访问 http://localhost:5173

# 2. IDE配置
[ ] 安装VSCode推荐扩展
[ ] 配置.vscode/settings.json
[ ] 测试格式化功能 (Ctrl+Shift+P -> Format Document)

# 3. 创建基础文件结构
[ ] 创建 src/types/ 目录和类型定义文件
[ ] 创建 src/stores/ 目录
[ ] 创建 src/services/ 目录
[ ] 创建 src/api/ 目录
[ ] 创建 src/components/ 目录
[ ] 创建 src/pages/ 目录
[ ] 创建 src/router/ 目录

# 4. 提交第一个commit
[ ] git add .
[ ] git commit -m "init: project structure"
[ ] git push
```

### 3.2 第一周核心任务（第1-2天完成）

按优先级执行：

#### 优先级P0（必须完成）
```
1. 创建基础类型定义
   - src/types/fund.ts
   - src/types/group.ts
   - src/types/market.ts
   - src/types/setting.ts
   
2. 创建Pinia stores
   - src/stores/fundStore.ts
   - src/stores/groupStore.ts
   - src/stores/marketStore.ts
   - src/stores/settingStore.ts
   - src/stores/syncStore.ts
   - src/stores/uiStore.ts
   
3. 创建Services
   - src/services/fundService.ts
   - src/services/groupService.ts
   - src/services/marketService.ts
   - src/services/syncService.ts
   - src/services/apiService.ts
   - src/services/storageService.ts

4. 创建API模块
   - src/api/jsonbox.ts
   - src/api/fundgz.ts

5. 创建工具函数
   - src/utils/format.ts
   - src/utils/calc.ts
   - src/utils/validate.ts

6. 路由配置
   - src/router/index.ts
   
7. 主应用入口
   - src/App.vue
   - src/main.ts
```

### 3.3 开发流程规范

#### 分支管理
```bash
# 创建功能分支
git checkout -b feature/首页-列表视图

# 开发完成后提交
git add .
git commit -m "feat: implement home page list view"
git push origin feature/首页-列表视图

# 提交PR，等待审查
# 审查通过后merge到main分支
```

#### 代码风格
```bash
# 在提交前运行
pnpm lint:fix
pnpm type-check

# 确保无错误和警告
```

#### 开发周期
```
1. 阅读需求文档
2. 理解相关任务详情
3. 创建分支
4. 编写代码和测试
5. 本地验证功能
6. 提交PR和代码审查
7. 合并到主分支
8. 验证部署
```

---

## 第四部分：常用命令

### 4.1 开发命令

```bash
# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview

# 类型检查
pnpm type-check

# 代码检测和格式化
pnpm lint
pnpm lint:fix

# 运行单元测试
pnpm test

# 生成测试覆盖率报告
pnpm test:coverage
```

### 4.2 git命令

```bash
# 查看状态
git status

# 查看分支
git branch -a

# 创建新分支
git checkout -b feature/xxxxx

# 切换分支
git checkout main

# 提交更改
git add .
git commit -m "message"

# 推送到远程
git push origin feature/xxxxx

# 拉取最新代码
git pull origin main

# 合并分支
git merge feature/xxxxx
```

### 4.3 troubleshooting命令

```bash
# 清除node_modules和package-lock
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 清除构建缓存
rm -rf dist .vite

# 重新启动开发服务器
pnpm dev

# 检查Port占用 (Mac/Linux)
lsof -i :5173

# 检查Port占用 (Windows)
netstat -ano | findstr :5173
```

---

## 第五部分：数据初始化

### 5.1 LocalStorage初始化

首次使用应用时需要初始化本地数据：

```typescript
// src/services/storageService.ts 中的初始化逻辑

const initializeStorage = () => {
  const defaultFunds = []
  const defaultGroups = {}
  const defaultSettings = {
    jsonboxName: `box_${generateRandomId()}`,
    privacyMode: false,
    grayscaleMode: false,
    refreshInterval: 20,
    columnOrder: ['name', 'estimatedGain', 'estimatedChange', ...],
    visibleColumns: ['name', 'estimatedGain', 'estimatedChange', ...]
  }
  
  localStorage.setItem('funds_local', JSON.stringify(defaultFunds))
  localStorage.setItem('groups_local', JSON.stringify(defaultGroups))
  localStorage.setItem('settings', JSON.stringify(defaultSettings))
  localStorage.setItem('sync_meta', JSON.stringify({
    lastSyncTime: null,
    localVersion: 0,
    cloudVersion: 0
  }))
}
```

### 5.2 示例数据加载

开发时可以加载示例数据用于测试：

```typescript
// src/utils/mockData.ts

export const MOCK_FUNDS = [
  { code: '018125', num: 8745.52, cost: 2.5156 },
  { code: '020256', num: 7317.33, cost: 1.6399 },
  // ... 更多示例
]

export const MOCK_GROUPS = {
  '有色金属': ['002963', '018168'],
  '半导体': ['015968', '023829'],
  // ... 更多分组
}
```

---

## 第六部分：部署准备

### 6.1 pre-deployment检查

```bash
# 1. 类型检查无错误
pnpm type-check

# 2. 代码检测无严重问题
pnpm lint

# 3. 单元测试全部通过
pnpm test

# 4. 构建成功
pnpm build

# 5. 构建后文件大小正常 (dist/ 目录)
du -sh dist/
```

### 6.2 环境配置

创建 `.env.production` 文件用于生产环境：

```env
VITE_API_BASEURL=https://jsonbox.cloud.exo-imaging.com
VITE_FUNDGZ_API=http://api.fund.eastmoney.com
VITE_APP_TITLE=基金助手
```

### 6.3 部署命令

```bash
# GitHub Pages 部署
pnpm build
# 将 dist 目录内容上传到 gh-pages 分支

# Vercel 部署 (自动)
# 连接GitHub repo，自动部署

# 手动部署
pnpm build
# 将 dist 目录部署到服务器
```

---

## 第七部分：故障排除

### 常见问题

#### Q1: 启动开发服务器报错
```
A: 检查以下几点:
1. Node版本是否 >= 16
2. 依赖是否安装完整 (pnpm install)
3. Port 5173 是否被占用
4. 删除 node_modules 和 pnpm-lock.yaml 重新安装
```

#### Q2: 类型检查错误
```
A: 
1. 检查 tsconfig.json 配置
2. 确保所有类型定义正确
3. 运行 pnpm type-check 查看错误
4. 根据错误信息修复类型问题
```

#### Q3: ESLint检查失败
```
A:
1. 运行 pnpm lint:fix 自动修复
2. 检查 eslint.config.js 配置
3. 检查代码是否符合规范
```

#### Q4: 构建失败
```
A:
1. 检查类型检查是否通过
2. 查看构建错误信息
3. 清除缓存: rm -rf .vite dist
4. 重新构建: pnpm build
```

---

## 总结检查清单

### ✅ 项目初始化完成标志

- [ ] Node环境配置完成
- [ ] 依赖安装成功
- [ ] IDE配置完成
- [ ] 开发服务器可正常启动
- [ ] 文件结构已创建
- [ ] 基础配置文件已创建
- [ ] 第一个commit已提交
- [ ] 团队成员可以成功拉取并运行项目

### ✅ 开发环境完全就绪标志

- [ ] 所有Pinia stores已初始化
- [ ] 所有Services已实现
- [ ] 类型定义完整
- [ ] 路由配置完成
- [ ] 工具函数已编写
- [ ] 单元测试框架已搭建
- [ ] 代码检测规则已配置
- [ ] 持续集成流程已配置

---

