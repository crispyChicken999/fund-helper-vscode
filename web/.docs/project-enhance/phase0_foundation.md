# Phase 0 — 基础架构整改

> **目标**：在动功能之前，先把架构地基打好。抽离公共 Layout、完善全局样式 Design Token、修正 Jsonbox 初始化逻辑。  
> **预计工时**：0.5 天

---

## 0.1 抽离公共 Layout 组件

### 问题现状

`HomeView.vue`、`MarketView.vue`、`SettingsView.vue` 三个视图里都各自写了重复的 `<el-footer class="bottom-nav">` 导航 + `<el-container>` 骨架，修改一处需要同步三处。

### 目标效果

创建 `src/layouts/MainLayout.vue`，实现三栏布局：

```
┌────────────────────────────┐
│         Header (slot)      │  ← 固定高度，各页自定义
├────────────────────────────┤
│                            │
│    Content (slot)          │  ← flex:1，overflow-y: auto，自动滚动
│                            │
├────────────────────────────┤
│     BottomNav (公共)       │  ← 固定 60px，三个 tab
└────────────────────────────┘
```

### 实施要求

**1. 创建 `src/layouts/MainLayout.vue`**

```vue
<template>
  <div class="main-layout">
    <!-- Header slot，高度由使用方传入 -->
    <div class="layout-header">
      <slot name="header" />
    </div>

    <!-- 主体内容区，自动 overflow -->
    <div class="layout-content">
      <slot />
    </div>

    <!-- 公共底部 Tab 导航 -->
    <nav class="layout-footer bottom-nav">
      <router-link to="/" class="nav-item" :class="{ active: route.path === '/' }">
        <i class="nav-icon">🏠</i>
        <span>首页</span>
      </router-link>
      <router-link to="/market" class="nav-item" :class="{ active: route.path === '/market' }">
        <i class="nav-icon">📈</i>
        <span>行情</span>
      </router-link>
      <router-link to="/settings" class="nav-item" :class="{ active: route.path === '/settings' }">
        <i class="nav-icon">⚙️</i>
        <span>设置</span>
      </router-link>
    </nav>
  </div>
</template>
```

CSS 核心：
```css
.main-layout {
  height: 100dvh;          /* 使用 dvh 适配移动端地址栏 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.layout-header { flex-shrink: 0; }
.layout-content { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.layout-footer  { flex-shrink: 0; height: 60px; }
```

**2. 改造各视图**

- `HomeView.vue`：外层换成 `<MainLayout>`，去掉原来的 `el-footer bottom-nav`
- `MarketView.vue`：同上
- `SettingsView.vue`：同上

**3. `FundDetailView.vue` 使用独立 Layout**

详情页没有底部导航，使用 `DetailLayout.vue`（只有 header + content）。

---

## 0.2 全局 Design Token & 深色模式

### 问题现状

- 颜色硬编码（`#67c23a`、`#f56c6c`）散落各组件
- 深色模式切换时颜色没有响应式更新
- 正红负绿（A 股习惯）被反了：应该**涨红跌绿**

### 目标

在 `src/style.css` 添加 CSS 变量，并支持 `[data-theme="dark"]` 切换：

```css
:root {
  /* 主品牌色 */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;

  /* 涨跌色（A股习惯：涨红跌绿） */
  --color-up:   #ef4444;   /* 涨：红 */
  --color-down: #22c55e;   /* 跌：绿 */
  --color-flat: #9ca3af;   /* 平 */

  /* 背景 */
  --bg-primary:   #ffffff;
  --bg-secondary: #f8fafc;
  --bg-card:      #ffffff;

  /* 文字 */
  --text-primary:   #1e293b;
  --text-secondary: #64748b;
  --text-muted:     #94a3b8;

  /* 边框 */
  --border-color: #e2e8f0;
}

[data-theme="dark"] {
  --bg-primary:   #0f172a;
  --bg-secondary: #1e293b;
  --bg-card:      #1e293b;
  --text-primary:   #f1f5f9;
  --text-secondary: #94a3b8;
  --border-color: #334155;
}

/* 灰色模式（覆盖涨跌色） */
[data-grayscale="true"] {
  --color-up:   var(--text-primary);
  --color-down: var(--text-primary);
}
```

**`settingStore.ts` 切换主题时**，同步更新 `document.documentElement.dataset.theme`。

---

## 0.3 Jsonbox Box Name 初始化逻辑

### 问题现状

当前 `jsonboxName` 需要用户手动在设置页输入，体验差，且用户若未输入则同步功能全部不可用。

### 目标行为

```
App 首次启动
  ↓
localStorage.getItem('fund_helper_box_name')
  ├─ 有值 → 直接使用，无需任何提示
  └─ 无值 → 自动生成：'fh_' + nanoid(21)
             → 写入 localStorage
             → settingStore.jsonboxName = 生成值
             → 无需弹窗，静默完成
```

后续 VSCode 版本会展示二维码，用户在 Web 扫码即可获取同一个 `boxName`，届时只需在设置页手动输入/扫码覆盖 `localStorage` 值即可。

### 实施位置

在 `src/main.ts` 或 `App.vue` 的 `onMounted` 最早时机执行：

```typescript
// storageService.ts 新增
export function ensureBoxName(): string {
  const KEY = 'fund_helper_box_name'
  let name = localStorage.getItem(KEY)
  if (!name) {
    name = 'fh_' + generateId(21)   // 自定义 nanoid-like
    localStorage.setItem(KEY, name)
  }
  return name
}
```

---

## 0.4 路由守卫 & 加载初始化

### 问题现状

App 启动时，`fundStore`、`groupStore`、`settingStore` 的数据从 `localStorage` 加载存在竞态，导致首屏白屏或闪烁。

### 目标

在 `router/index.ts` 中添加全局 `beforeEach` 守卫，确保 store 初始化完成后再进入路由：

```typescript
router.beforeEach(async (to, from, next) => {
  if (!appInitialized) {
    await initApp()   // 加载 localStorage + 同步 jsonbox
    appInitialized = true
  }
  next()
})
```

`initApp()` 按顺序：
1. `ensureBoxName()` — 确保 box name
2. `settingStore.loadFromStorage()` — 加载设置
3. `groupStore.loadFromStorage()` — 加载分组
4. `fundStore.loadFromStorage()` — 加载基金配置

---

## 验收标准

- [ ] 三个主视图不再包含重复的底部导航代码
- [ ] 主体内容区在手机上可以正常滚动，不会被 footer 遮挡
- [ ] 深色/浅色模式切换即时生效，不需要刷新页面
- [ ] 首次进入 App 时 localStorage 中自动出现 `fund_helper_box_name` 键
- [ ] 刷新页面后 `fund_helper_box_name` 保持不变
