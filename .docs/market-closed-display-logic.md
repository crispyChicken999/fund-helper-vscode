# 休市日显示逻辑优化

## 修改日期
2026-04-30

## 问题描述
之前的代码在非交易日（周末、节假日）时，仍然显示估算涨幅和估算收益，但这些数据实际上是上一个交易日的数据，容易让用户误解。

## 解决方案

### 核心逻辑
1. **非交易日（休市）**：
   - 估算涨幅：显示 `--`
   - 估算收益：显示 `--`
   - 估算日期（表头）：显示 `休市`
   - 当日涨幅：显示最后一个交易日的真实涨跌幅
   - 当日收益：显示最后一个交易日的真实收益
   - 当日日期（表头）：显示上一个交易日的日期

2. **交易日（包括开盘前、盘中、收盘后）**：
   - 估算涨幅：显示估算涨跌幅
   - 估算收益：显示估算收益
   - 估算日期（表头）：显示 `gztime` 的日期
   - 当日涨幅：显示上一个交易日的真实涨跌幅
   - 当日收益：显示上一个交易日的真实收益
   - 当日日期（表头）：显示上一个交易日的日期

### 用户体验优化
- ✅ 交易日中午休市（11:30-13:00）时，仍显示上午收盘时的估算数据
- ✅ 交易日收盘后（15:00后），仍显示收盘时的估算数据
- ✅ 非交易日明确显示"休市"，避免用户误解
- ✅ 数据的日期标注清晰，不会混淆

## 修改的文件

### 1. `src/fundModel.ts`
**修改内容**：移除了 `calcDailyGain` 函数中的休市判断，使其在休市日也返回最后一个交易日的真实收益。

**修改前**：
```typescript
export function calcDailyGain(fund: FundInfo): number {
  if (fund.shares <= 0) {
    return 0;
  }

  // 如果当天是休市，当日收益应返回 0
  if (isMarketClosed()) {
    return 0;
  }

  // 始终使用 navChgRt（上一个交易日的真实涨跌幅）来计算当日收益
  if (fund.navChgRt !== 0) {
    return (
      (fund.netValue - fund.netValue / (1 + fund.navChgRt * 0.01)) *
      fund.shares
    );
  }
  
  return 0;
}
```

**修改后**：
```typescript
export function calcDailyGain(fund: FundInfo): number {
  if (fund.shares <= 0) {
    return 0;
  }

  // 始终使用 navChgRt（上一个交易日的真实涨跌幅）来计算当日收益
  // 注意：即使在休市日，也显示最后一个交易日的真实收益
  if (fund.navChgRt !== 0) {
    return (
      (fund.netValue - fund.netValue / (1 + fund.navChgRt * 0.01)) *
      fund.shares
    );
  }
  
  return 0;
}
```

### 2. `src/sidebar/webview/script.ts`

#### 2.1 新增 `getEstimatedDate()` 函数
用于获取估算日期，在休市时返回"休市"。

```typescript
/**
 * 获取估算日期（用于表头显示）
 * 如果是休市日，返回 "休市"
 * 否则返回 gztime 的日期
 */
function getEstimatedDate() {
  if (fundDataCache.length === 0) {
    return getTodayDateStr();
  }
  
  const firstFund = fundDataCache[0];
  
  // 判断是否休市
  if (marketStatus.isClosed) {
    return "休市";
  }
  
  // 返回 gztime 的日期
  if (firstFund.gztime) {
    return extractDate(firstFund.gztime);
  }
  
  return getTodayDateStr();
}
```

#### 2.2 修改 `getLatestTradeDate()` 函数
简化逻辑，始终返回净值日期（上一个交易日的日期）。

**修改前**：
```typescript
function getLatestTradeDate() {
  if (fundDataCache.length === 0) {
    return getTodayDateStr();
  }
  
  const firstFund = fundDataCache[0];
  if (!firstFund.gztime || !firstFund.netValueDate) {
    return getTodayDateStr();
  }
  
  // 从 gztime 中提取日期部分（格式：2026-04-30 15:00）
  const gztimeDatePart = firstFund.gztime.split(' ')[0]; // "2026-04-30"
  const netValueDate = firstFund.netValueDate; // "2026-04-29"
  
  // 如果 gztime 的日期 == netValueDate，说明今天已经收盘
  if (gztimeDatePart === netValueDate) {
    return formatNetValueDate(netValueDate);
  }
  
  // 否则显示净值日期（上一个交易日）
  return formatNetValueDate(netValueDate);
}
```

**修改后**：
```typescript
function getLatestTradeDate() {
  if (fundDataCache.length === 0) {
    return getTodayDateStr();
  }
  
  const firstFund = fundDataCache[0];
  if (!firstFund.netValueDate) {
    return getTodayDateStr();
  }
  
  // 始终显示净值日期（上一个交易日）
  return formatNetValueDate(firstFund.netValueDate);
}
```

#### 2.3 修改 `generateTableHeaders()` 函数
使用新的 `getEstimatedDate()` 函数来显示估算日期。

**修改前**：
```typescript
function generateTableHeaders() {
  const todayStr = getTodayDateStr();
  const lastTradeDate = getLatestTradeDate();
  
  const headerMap = {
    // ...
    estimatedChange: `<th data-sort="estimatedChange" class="th-center">
      <div class="th-content">
        <div class="th-text">
          <div>估算涨幅</div>
          <div class="th-date">${todayStr}</div>
        </div>
        ${getSortIndicator('estimatedChange')}
      </div>
    </th>`,
    // ...
  };
}
```

**修改后**：
```typescript
function generateTableHeaders() {
  const estimatedDateStr = getEstimatedDate(); // 估算日期（休市时显示"休市"）
  const lastTradeDate = getLatestTradeDate(); // 最新交易日日期
  
  const headerMap = {
    // ...
    estimatedChange: `<th data-sort="estimatedChange" class="th-center">
      <div class="th-content">
        <div class="th-text">
          <div>估算涨幅</div>
          <div class="th-date">${estimatedDateStr}</div>
        </div>
        ${getSortIndicator('estimatedChange')}
      </div>
    </th>`,
    // ...
  };
}
```

#### 2.4 修改 `generateFundRow()` 函数
在休市时，估算涨幅和估算收益显示为 `--`。

**关键修改**：
```typescript
// 判断是否休市
const isMarketClosedNow = marketStatus.isClosed;

// 估算收益（盘中）- 使用估算净值和单位净值的差值
// 如果休市，则不显示估算收益
const estimatedGain = isMarketClosedNow ? 0 : (gsz - dwjz) * num;

// 提取日期和时间
const estimatedDate = isMarketClosedNow ? "休市" : extractDate(fund.gztime);

// 颜色类
const estimatedChangeColor = isMarketClosedNow ? 'color-flat' : getColorClass(gszzl);
const estimatedGainColor = isMarketClosedNow ? 'color-flat' : getColorClass(estimatedGain);

// 单元格显示
estimatedChange: `<td class="td-value" data-column="estimatedChange">
  <div class="${estimatedChangeColor}">${isMarketClosedNow ? "--" : formatPercent(gszzl)}</div>
  <div class="td-sub">${gsz.toFixed(4)}</div>
</td>`,
estimatedGain: `<td class="td-value" data-column="estimatedGain">
  <div class="${estimatedGainColor} privacy-hide-amount">${isMarketClosedNow ? "--" : formatMoney(estimatedGain)}</div>
  <div class="${estimatedChangeColor} td-sub">${isMarketClosedNow ? "--" : formatPercent(gszzl)}</div>
</td>`,
```

#### 2.5 修改 `calculateEstimatedGain()` 函数
在休市时返回 0，确保排序功能正常。

```typescript
function calculateEstimatedGain(fund) {
  // 如果休市，返回 0
  if (marketStatus.isClosed) {
    return 0;
  }
  
  const num = parseFloat(fund.num || "0");
  const gsz = parseFloat(fund.gsz || "0");
  const gszzl = parseFloat(fund.gszzl || "0");
  const holdingAmount = num * gsz;
  return (holdingAmount * gszzl) / 100;
}
```

## 测试场景

### 场景1：交易日（4月30日周四）
- **开盘前（< 9:30）**：显示上一交易日的估算数据
- **开盘中（9:30-11:30, 13:00-15:00）**：显示实时估算数据
- **中午休市（11:30-13:00）**：显示上午收盘时的估算数据
- **收盘后（15:00-24:00）**：显示收盘时的估算数据

### 场景2：非交易日（5月1日周四，假期）
- **任何时间**：
  - 估算涨幅：`--`
  - 估算收益：`--`
  - 估算日期：`休市`
  - 当日涨幅：显示最后一个交易日的真实涨跌幅
  - 当日收益：显示最后一个交易日的真实收益

### 场景3：新交易日开盘前（5月5日周一 9:00）
- 显示上一交易日的估算数据和真实数据

## 注意事项
1. `marketStatus.isClosed` 由后端的 `isMarketClosed()` 函数判断，基于节假日数据和周末判断
2. 估算数据的日期始终跟随 `gztime`
3. 当日数据的日期始终跟随 `netValueDate`（上一个交易日）
4. Tooltip 中的数据也会相应显示 `--`

## 相关文件
- `src/fundModel.ts` - 后端计算逻辑
- `src/sidebar/webview/script.ts` - 前端显示逻辑
- `src/holidayService.ts` - 节假日判断服务
