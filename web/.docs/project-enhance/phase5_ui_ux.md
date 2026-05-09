# Phase 5 — UI/UX 现代化精化

> **目标**：让 Web 版界面达到现代、科技感强、令人眼前一亮的设计水准，完整实现响应式布局、微动画、骨架屏等体验细节。  
> **预计工时**：1.5 天

---

## 5.1 全局字体与排版

### 引入 Google Fonts

在 `index.html` 的 `<head>` 中加入：

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

`src/style.css` 全局字体：
```css
body {
  font-family: 'Inter', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## 5.2 深色模式设计升级

### 深色模式配色（科技感）

```css
[data-theme="dark"] {
  --bg-primary:     #0a0e1a;   /* 极深蓝黑 */
  --bg-secondary:   #111827;   /* 深蓝黑 */
  --bg-card:        #1a2035;   /* 卡片深蓝 */
  --bg-card-hover:  #1e2a45;
  --border-color:   #2d3748;
  --border-glow:    rgba(99, 179, 237, 0.15); /* 蓝色光晕边框 */

  --text-primary:   #e2e8f0;
  --text-secondary: #718096;

  /* 渐变主色 */
  --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --gradient-accent:  linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}
```

### 卡片玻璃拟态效果（深色模式专用）

```css
[data-theme="dark"] .glass-card {
  background: rgba(26, 32, 53, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(99, 179, 237, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
```

---

## 5.3 账户总览区视觉升级

### 当前问题

- 纯色渐变背景，过于简单
- 数值大小不突出
- 缺少数据状态提示（加载中、隐私模式等）

### 目标设计

```
┌─────────────────────────────────────────┐
│  ✦ 资产总值                    👁 隐藏  │  ← 右上角隐私切换
│                                          │
│         ¥ 123,456.78                    │  ← 超大字号，渐变色
│                                          │
│  持有收益          日收益                │
│  +2,345.67         +89.12               │
│  +1.94%            +0.07%               │
│                                          │
│  最后更新：10:30:22 ●自动刷新中          │  ← 底部状态
└─────────────────────────────────────────┘
```

CSS 关键点：
```css
.asset-header {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 20px 16px 16px;
  position: relative;
  overflow: hidden;
}
/* 背景装饰光效 */
.asset-header::before {
  content: '';
  position: absolute;
  top: -50%; right: -20%;
  width: 200px; height: 200px;
  background: radial-gradient(circle, rgba(102,126,234,0.3) 0%, transparent 70%);
  border-radius: 50%;
}
.asset-total-value {
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(90deg, #667eea, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

## 5.4 基金列表视觉升级

### 表格整体

```css
.fund-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

/* 表头 sticky + 毛玻璃 */
.fund-table-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(var(--bg-secondary-rgb), 0.95);
  backdrop-filter: blur(8px);
}

/* 基金行 hover 效果 */
.fund-row {
  transition: background 0.15s ease;
  border-bottom: 1px solid var(--border-color);
}
.fund-row:hover {
  background: var(--bg-card-hover);
}

/* 涨跌行背景（可选，灰色模式时禁用） */
.fund-row.row-up   { background: rgba(239, 68, 68, 0.03); }
.fund-row.row-down { background: rgba(34, 197, 94, 0.03); }
```

### 分组 Tab 升级

从简单的 `el-tag` 升级为自定义滚动 Tab：

```css
.group-tabs-inner {
  display: flex;
  gap: 4px;
  align-items: center;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 8px 12px;
}
.group-tabs-inner::-webkit-scrollbar { display: none; }

.group-tab-btn {
  flex-shrink: 0;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 13px;
  border: 1px solid var(--border-color);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.group-tab-btn.active {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
}
```

---

## 5.5 骨架屏加载

在基金列表数据加载时（首次进入或刷新），显示骨架屏而非 spinner：

```vue
<!-- FundSkeleton.vue -->
<template>
  <div class="skeleton-table">
    <div v-for="i in 8" :key="i" class="skeleton-row">
      <div class="skeleton-cell skeleton-name">
        <div class="skeleton-bar" style="width: 80%; height: 14px" />
        <div class="skeleton-bar" style="width: 50%; height: 11px; margin-top: 4px" />
      </div>
      <div v-for="j in 4" :key="j" class="skeleton-cell">
        <div class="skeleton-bar" style="width: 70%; height: 13px" />
        <div class="skeleton-bar" style="width: 50%; height: 11px; margin-top: 4px" />
      </div>
    </div>
  </div>
</template>

<style>
.skeleton-bar {
  border-radius: 4px;
  background: linear-gradient(90deg,
    var(--bg-secondary) 25%,
    var(--bg-card-hover) 50%,
    var(--bg-secondary) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
```

---

## 5.6 微动画系统

### 页面切换动画

```css
/* router-view 过渡 */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
```

### 数值更新动画

基金数值更新时，数字闪烁高亮：

```typescript
// 使用 CSS class 触发
function flashUpdate(el: HTMLElement, direction: 'up' | 'down') {
  el.classList.add(`flash-${direction}`)
  setTimeout(() => el.classList.remove(`flash-${direction}`), 600)
}
```

```css
@keyframes flash-up {
  0%, 100% { background: transparent; }
  50%       { background: rgba(239, 68, 68, 0.15); }
}
@keyframes flash-down {
  0%, 100% { background: transparent; }
  50%       { background: rgba(34, 197, 94, 0.15); }
}
.flash-up   { animation: flash-up   0.6s ease; }
.flash-down { animation: flash-down 0.6s ease; }
```

### 弹窗动画

FundTooltip / GroupTooltip 弹出动画：

```css
.tooltip-enter-active {
  animation: slideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
```

---

## 5.7 底部导航升级

```css
.bottom-nav {
  display: flex;
  align-items: stretch;
  height: 60px;
  background: var(--bg-card);
  border-top: 1px solid var(--border-color);
  /* 安全区域（iPhone X+） */
  padding-bottom: env(safe-area-inset-bottom);
}
.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 11px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.2s;
  position: relative;
}
.nav-item.active {
  color: var(--color-primary);
}
/* 激活指示线 */
.nav-item.active::before {
  content: '';
  position: absolute;
  top: 0;
  width: 24px;
  height: 2px;
  background: var(--color-primary);
  border-radius: 0 0 2px 2px;
}
.nav-icon {
  font-size: 20px;
  transition: transform 0.2s;
}
.nav-item.active .nav-icon {
  transform: scale(1.1);
}
```

---

## 5.8 移动端适配

### 触摸手势

- 长按（500ms）检测使用 `useLongPress` 自定义 composable
- 滑动关闭弹窗：FundTooltip 弹窗支持向下滑动关闭

```typescript
// composables/useLongPress.ts
export function useLongPress(
  target: Ref<HTMLElement | null>,
  handler: () => void,
  delay = 500
) {
  let timer: ReturnType<typeof setTimeout>
  const start = () => { timer = setTimeout(handler, delay) }
  const cancel = () => clearTimeout(timer)
  useEventListener(target, 'touchstart', start, { passive: true })
  useEventListener(target, 'touchend', cancel)
  useEventListener(target, 'touchmove', cancel)
}
```

### 表格水平滚动优化

```css
.fund-table-wrapper {
  overflow-x: auto;
  overflow-y: visible;
  -webkit-overflow-scrolling: touch;
  /* 名称列固定（sticky） */
}
.td-name, .th-name {
  position: sticky;
  left: 0;
  z-index: 2;
  background: var(--bg-primary);
  /* 右侧阴影分隔线 */
  box-shadow: 2px 0 4px rgba(0,0,0,0.1);
}
```

### 响应式断点

```css
/* 手机：< 480px */
@media (max-width: 480px) {
  .asset-total-value { font-size: 1.6rem; }
  .td-value { min-width: 64px; font-size: 12px; }
  .group-tab-btn { font-size: 12px; padding: 4px 10px; }
}

/* 平板：480px - 768px */
@media (min-width: 480px) and (max-width: 768px) {
  .asset-total-value { font-size: 1.8rem; }
}

/* 桌面：> 768px */
@media (min-width: 768px) {
  .detail-content { max-width: 900px; margin: 0 auto; }
}
```

---

## 5.9 空状态优化

### 基金列表为空

```vue
<div class="empty-state">
  <div class="empty-icon">📊</div>
  <h3>还没有添加基金</h3>
  <p>点击下方按钮添加您关注的基金</p>
  <el-button type="primary" @click="showAddFund = true">
    + 添加第一只基金
  </el-button>
</div>
```

### 加载失败

```vue
<div class="error-state">
  <div class="error-icon">⚠️</div>
  <h3>数据加载失败</h3>
  <p>{{ errorMessage }}</p>
  <el-button @click="retry">重试</el-button>
</div>
```

---

## 验收标准

- [ ] 全局使用 Inter 字体（中文回退 PingFang/微软雅黑）
- [ ] 深色模式下卡片有玻璃拟态效果（毛玻璃+边框发光）
- [ ] 账户总览区渐变背景+装饰光效+渐变文字
- [ ] 分组 Tab 横向滚动不显示滚动条
- [ ] 首次加载时显示骨架屏，不显示空白或 spinner
- [ ] 页面切换有淡入淡出+上移动画
- [ ] 基金数值更新时有红/绿闪烁动画
- [ ] 弹窗弹出有弹性缩放动画
- [ ] 底部导航激活项有指示线+图标放大
- [ ] iPhone 刘海屏适配（safe-area-inset-bottom）
- [ ] 名称列在水平滚动时保持 sticky 固定
- [ ] 长按手势正确触发 GroupTooltip
