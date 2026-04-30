# 隐私模式和估算涨幅列优化

## 修改日期
2026-04-30

## 修改内容

### 1. 估算涨幅列显示优化

#### 修改前
```
估算涨幅列：
  第一行：+3.73%（涨幅百分比）
  第二行：2.1703（估算净值）
```

#### 修改后
```
估算涨幅列：
  第一行：+3.73%（涨幅百分比）
  第二行：14:03（更新时分）
```

#### 修改理由
1. **数据新鲜度提示**：用户可以直观看到数据的更新时间
2. **不涉及隐私**：更新时间不是敏感数据，无需在隐私模式下隐藏
3. **简洁明了**：只显示时分（HH:mm），不显示日期，节省空间
4. **休市状态提示**：休市时显示"休市"，而不是过时的时间

#### 隐私模式处理
- 第一行（涨幅百分比）：**不隐藏**（百分比不是敏感数据）
- 第二行（更新时分）：**不隐藏**（时间不是敏感数据）

#### 休市状态显示
- 正常交易日：显示更新时分（如 `14:03`）
- 休市日：显示 `休市`

---

### 2. 隐私模式 Hover 显示优化

#### 修改前
```css
body.privacy-mode .privacy-hide-amount {
  filter: blur(4px);
  user-select: none;
}
```

用户无法查看被模糊的数据，即使需要临时查看也必须关闭隐私模式。

#### 修改后
```css
body.privacy-mode .privacy-hide-amount {
  filter: blur(4px);
  user-select: none;
  cursor: help; /* 鼠标变成问号，提示用户可以 hover */
  transition: filter 0.2s ease; /* 添加平滑过渡动画 */
}

body.privacy-mode .privacy-hide-amount:hover {
  filter: blur(0px); /* hover 时取消模糊 */
}
```

#### 修改理由
1. **用户体验提升**：用户可以临时查看数据，无需关闭隐私模式
2. **视觉提示**：`cursor: help` 提示用户可以 hover 查看
3. **平滑过渡**：添加 `transition` 动画，视觉效果更好
4. **保持隐私**：默认仍然是模糊的，只有主动 hover 才显示

#### 应用范围
所有隐私数据都支持 hover 显示：
- ✅ 账户资产总额（`.stat-value-large`）
- ✅ 持有收益金额（`#holdingAmount`）
- ✅ 日收益金额（`#dailyAmount`）
- ✅ 表格中的所有金额数据（`.privacy-hide-amount`）

---

## 修改的文件

### 1. `src/sidebar/webview/script.ts`

#### 修改位置：`generateFundRow()` 函数中的 `estimatedChange` 单元格

**修改前**：
```typescript
estimatedChange: `<td class="td-value" data-column="estimatedChange">
  <div class="${estimatedChangeColor}">${isMarketClosedNow ? "--" : formatPercent(gszzl)}</div>
  <div class="td-sub">${gsz.toFixed(4)}</div>
</td>`,
```

**修改后**：
```typescript
estimatedChange: `<td class="td-value" data-column="estimatedChange">
  <div class="${estimatedChangeColor}">${isMarketClosedNow ? "--" : formatPercent(gszzl)}</div>
  <div class="td-sub">${isMarketClosedNow ? "休市" : updateTime}</div>
</td>`,
```

**关键变化**：
- 第二行从 `${gsz.toFixed(4)}`（估算净值）改为 `${updateTime}`（更新时分）
- 休市时显示 `"休市"` 而不是过时的时间
- `updateTime` 是从 `gztime` 中提取的时分（HH:mm 格式，如 `14:03`）

---

### 2. `src/sidebar/webview/style.ts`

#### 修改位置：隐私模式相关的 CSS

**修改内容**：

1. **账户资产总额**：
```css
body.privacy-mode .stat-value-large {
  filter: blur(4px);
  user-select: none;
  cursor: help;
  transition: filter 0.2s ease;
}

body.privacy-mode .stat-value-large:hover {
  filter: blur(0px);
}
```

2. **持有收益和日收益金额**：
```css
body.privacy-mode #holdingAmount,
body.privacy-mode #dailyAmount {
  filter: blur(4px);
  user-select: none;
  cursor: help;
  transition: filter 0.2s ease;
}

body.privacy-mode #holdingAmount:hover,
body.privacy-mode #dailyAmount:hover {
  filter: blur(0px);
}
```

3. **表格中的所有隐私数据**：
```css
body.privacy-mode .privacy-hide-amount {
  filter: blur(4px);
  user-select: none;
  cursor: help;
  transition: filter 0.2s ease;
}

body.privacy-mode .privacy-hide-amount:hover {
  filter: blur(0px);
}
```

4. **更新注释**：
```css
/* 表格数据隐藏规则（使用 class 而不是 nth-child，因为列顺序可调整）：
   - 估算涨幅：不隐藏（百分比和更新时间都不是敏感数据）
   - 估算收益：第一行隐藏（金额）
   - 当日涨幅：不隐藏
   - 当日收益：隐藏（金额）
   - 持有收益：第一行隐藏（金额）
   - 总收益率：第一行不隐藏（百分比），第二行隐藏（金额）
   - 关联板块：不隐藏
   - 金额/份额：全部隐藏
   - 成本/最新：不隐藏
*/
```

---

## 视觉效果

### 估算涨幅列（正常模式）
```
估算涨幅
  +3.73%
  14:03
```

### 估算涨幅列（休市日）
```
估算涨幅
  --
  休市
```

### 估算涨幅列（隐私模式）
```
估算涨幅
  +3.73%
  14:03
```
（注：更新时间不是敏感数据，隐私模式下也不隐藏）

---

## 用户体验提升

### 1. 估算涨幅列
- ✅ 数据新鲜度：用户可以直观看到数据的更新时间
- ✅ 不涉及隐私：更新时间不是敏感数据，无需隐藏
- ✅ 简洁明了：只显示时分（HH:mm），节省空间
- ✅ 休市提示：休市时显示"休市"，避免显示过时的时间

### 2. 隐私模式
- ✅ 临时查看：无需关闭隐私模式即可临时查看数据
- ✅ 视觉提示：`cursor: help` 提示用户可以 hover
- ✅ 平滑过渡：0.2秒的过渡动画，视觉效果更好
- ✅ 保持隐私：默认仍然模糊，只有主动 hover 才显示

---

## 注意事项

1. **触摸屏设备**：hover 效果在触摸屏上无法使用，但这是可以接受的，因为隐私模式主要用于防止他人偷看
2. **截图工具**：如果在 hover 状态下截图，数据会被捕获，但这是用户主动操作的结果
3. **更新时间格式**：只显示时分（HH:mm），不显示日期，因为日期已经在表头显示了
4. **休市状态**：休市时显示"休市"而不是过时的更新时间，避免用户误解

---

## 相关文件
- `src/sidebar/webview/script.ts` - 前端显示逻辑
- `src/sidebar/webview/style.ts` - CSS 样式
