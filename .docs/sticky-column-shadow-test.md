# 固定列滚动阴影功能测试指南

## 功能说明

基金名称列（第一列）是固定列，当表格横向滚动时，该列右侧会显示渐变阴影，提示用户这是固定列。

## 实现方案

使用 **CSS 伪元素 `::after`** 创建阴影效果，避免被 `overflow: auto` 裁剪：

```css
.th-name::after {
  content: "";
  position: absolute;
  right: -10px;  /* 放在固定列右侧 */
  width: 10px;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.15), transparent);
  opacity: 0;  /* 默认隐藏 */
}

.th-name.scrolled::after {
  opacity: 1;  /* 滚动时显示 */
}
```

这种方案的优势：
- ✅ 阴影不会被 `overflow` 裁剪
- ✅ 使用渐变背景，视觉效果自然
- ✅ 通过 `opacity` 控制显示/隐藏，性能更好
- ✅ 平滑的过渡动画

## 测试步骤

### 1. 重新加载扩展
- 按 `F5` 或在命令面板中运行 `Developer: Reload Window`
- 确保使用最新编译的代码

### 2. 打开基金助手
- 点击侧边栏的基金助手图标
- 确保有足够多的基金数据（至少 5 个基金）
- 确保列足够多，表格需要横向滚动

### 3. 测试滚动阴影

#### 测试 A：初始状态（无阴影）
- 表格未滚动时，基金名称列右侧**不应该**有阴影
- 界面应该看起来干净简洁

#### 测试 B：滚动后（显示阴影）
- 横向滚动表格（向右滚动）
- 基金名称列的右侧应该出现**渐变阴影**
- 阴影应该是从深灰色渐变到透明

#### 测试 C：滚动回来（隐藏阴影）
- 横向滚动回到最左侧
- 阴影应该**平滑淡出**（0.2s 过渡动画）

### 4. 检查点

如果看不到阴影，请检查：

1. **是否真的在滚动？**
   - 打开浏览器开发者工具（`Ctrl+Shift+I`）
   - 在 Console 中输入：
     ```javascript
     document.querySelector('.fund-table-wrapper').scrollLeft
     ```
   - 滚动表格，看这个值是否变化（应该大于 1）

2. **是否添加了 scrolled 类？**
   - 在 Elements 面板中找到 `<th class="th-name">` 或 `<td class="td-name">`
   - 滚动时，应该看到类名变为 `<th class="th-name scrolled">`

3. **伪元素是否存在？**
   - 在 Elements 面板中选中 `.th-name` 元素
   - 展开元素，应该看到 `::after` 伪元素
   - 滚动时，`::after` 的 `opacity` 应该从 0 变为 1

4. **阴影样式是否生效？**
   - 选中 `::after` 伪元素
   - 在 Styles 面板中查看样式：
     ```css
     background: linear-gradient(to right, rgba(0, 0, 0, 0.15), transparent);
     opacity: 1;  /* 滚动时 */
     ```

## 当前实现细节

### 阴影参数
- **触发阈值**：滚动超过 1px
- **阴影效果**：渐变背景
  - 宽度：10px
  - 颜色：`rgba(0, 0, 0, 0.15)` 渐变到透明
  - 位置：固定列右侧 `-10px` 处
- **过渡动画**：`opacity 0.2s ease`

### 事件监听
- 监听 `.fund-table-wrapper` 的 `scroll` 事件
- 每次滚动时检查 `scrollLeft` 值
- 动态添加/移除 `scrolled` 类

## 为什么使用伪元素而不是 box-shadow？

**问题**：`box-shadow` 的 outset 阴影会被 `overflow: auto` 裁剪

**解决方案**：使用 `::after` 伪元素 + 渐变背景
- 伪元素是独立的 DOM 节点，不会被父元素的 `overflow` 裁剪
- 使用 `position: absolute` 定位到固定列右侧
- 使用 `linear-gradient` 创建自然的渐变效果
- 使用 `opacity` 控制显示/隐藏，性能更好

## 视觉效果

```
┌─────────────────┬──────────┬──────────┐
│ 基金名称        │░ 估算涨幅 │ 估算收益 │  ← 滚动时
│ (固定列)        │░          │          │     右侧显示
│                 │░          │          │     渐变阴影
├─────────────────┼──────────┼──────────┤
│ 永赢先进制造    │░ +3.73%  │ +898.64  │
│ 018125          │░          │          │
└─────────────────┴──────────┴──────────┘
                   ↑
                   渐变阴影（10px 宽）
```
