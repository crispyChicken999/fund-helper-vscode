# VSCode 版 vs Web 版 功能差异分析

> 目标：将 VSCode 版的核心功能 1:1 复刻到 Web 端
> 分析日期：2026-05-13

---

## 一、总体结论

Web 端已经实现了 VSCode 版的绝大部分核心功能，整体完成度约 **90%**。以下是逐功能对比和需要补齐的差异点。

---

## 二、功能对比总表

| 功能模块 | VSCode 版 | Web 版 | 状态 | 差异说明 |
|---------|-----------|--------|------|---------|
| 基金列表展示 | ✅ | ✅ | ✅ 已对齐 | 表格列、数据字段一致 |
| 添加基金（搜索） | ✅ | ✅ | ✅ 已对齐 | 都支持代码/名称搜索 |
| 删除基金 | ✅ | ✅ | ✅ 已对齐 | |
| 分组管理 | ✅ | ✅ | ✅ 已对齐 | 增删改查、排序、拖拽 |
| 行情中心 | ✅ | ✅ | ✅ 已对齐 | 大盘/行业/风格/概念/地域 |
| 导入导出 | ✅ | ✅ | ⚠️ 有差异 | 见下方详细说明 |
| 列设置 | ✅ | ✅ | ✅ 已对齐 | 顺序+可见性+拖拽 |
| 基金详情页 | ✅ | ✅ | ✅ 已对齐 | 6个Tab一致 |
| 隐私模式 | ✅ | ✅ | ✅ 已对齐 | |
| 灰色模式 | ✅ | ✅ | ✅ 已对齐 | |
| 自动刷新 | ✅ | ✅ | ⚠️ 有差异 | 见下方说明 |
| 排序 | ✅ | ✅ | ✅ 已对齐 | 多字段升降序 |
| 搜索/筛选 | ✅ | ✅ | ✅ 已对齐 | |
| 拖拽排序 | ✅ | ✅ | ✅ 已对齐 | |
| 加仓/减仓 | ✅ | ✅ | ⚠️ 有差异 | 见下方详细说明 |
| 开市/休市状态 | ✅ | ✅ | ⚠️ 有差异 | 见下方说明 |
| 云端同步 | ❌ | ✅ | Web 独有 | JSONBox 同步 |
| AI 分析 | ✅ | ❌ | ❌ 未实现 | 非必需功能 |
| 状态栏 | ✅ | N/A | N/A | VSCode 特有，Web 不需要 |

---

## 三、需要关注的差异点（按优先级排序）

### 🔴 P0 - 核心功能差异

#### 1. 加仓/减仓流程差异

**VSCode 版：**
- 加仓时会拉取最近 15 天历史净值，让用户选择买入日期
- 根据选择的净值和输入的买入金额，自动计算新增份额
- 自动计算加权平均成本 = (旧成本×旧份额 + 买入净值×新增份额) / 总份额
- 减仓时也展示历史净值供参考

**Web 版：**
- 加仓/减仓只是简单的 prompt 输入份额数字
- 没有历史净值选择
- 没有自动计算加权平均成本的逻辑

**建议：**
- 在 Web 端的加仓/减仓弹窗中增加「选择买入日期」功能
- 调用 `getNetValueHistory` API 获取近 15 天净值
- 实现加权平均成本自动计算
- 加仓输入改为「买入金额」而非直接输入份额

---

### 🟡 P1 - 体验差异

#### 2. 导入导出格式兼容性

**VSCode 版导出格式：**
```json
{
  "funds": [{"code":"000001","num":"100.00","cost":"1.2345"}],
  "groups": {"分组A": ["000001"]},
  "groupOrder": ["分组A"],
  "columnSettings": {"columnOrder": [...], "visibleColumns": [...]},
  "sortMethod": "default",
  "refreshInterval": 30,
  "hideStatusBar": false,
  "defaultViewMode": "tree",
  "privacyMode": false,
  "grayscaleMode": false
}
```

**Web 版导出格式：**
```json
{
  "funds": [{"code":"000001","num":"100","cost":"1.2345"}],
  "groups": {"分组A": ["000001"]},
  "groupOrder": ["分组A"],
  "columnSettings": {"columnOrder": [...], "visibleColumns": [...]},
  "sortMethod": "holdingGainRate_desc",
  "refreshInterval": 20,
  "hideStatusBar": false,
  "defaultViewMode": "webview",
  "privacyMode": false,
  "grayscaleMode": false
}
```

**差异点：**
- ✅ 格式基本兼容，Web 端已做了 `normalizeImportData` 处理 string→number 转换
- ⚠️ `sortMethod` 格式不同：VSCode 用 `changePercent_desc`，Web 用 `holdingGainRate_desc`
- ⚠️ Web 端导入时提供「覆盖/合并」选项，VSCode 版直接覆盖

**建议：**
- 确认 `sortMethod` 字段的映射关系是否完整（VSCode 的 `default` 对应 Web 的什么？）
- 导入时对 `sortMethod` 做映射转换

#### 3. 自动刷新 - 节假日检测 ⚠️ 已确认缺失

**VSCode 版：**
- 使用 `holidayService.ts` 从远程 `https://funds.rabt.top/funds/holiday.json` 加载节假日数据
- 数据格式：`{ "2026": { "01-01": { "holiday": true, "name": "元旦" } } }`
- 精确判断法定节假日（春节、国庆等），周末一定休市
- 只在交易时间（工作日 9:30-11:30, 13:00-15:00）且非节假日时刷新

**Web 版（已确认）：**
- `utils/marketChina.ts` 中的 `getChinaMarketStatus()` **仅判断周末**
- **完全没有节假日数据**，`isClosed` 字段只在周六日为 `true`
- 法定节假日（如春节、国庆）期间会错误地触发自动刷新

**建议：**
- 在 Web 端增加节假日数据加载（从同一远程 URL 获取）
- 将节假日判断集成到 `getChinaMarketStatus()` 中
- 可以在 `appInit.ts` 中初始化时加载并缓存到 localStorage

#### 4. 行情中心 - 两市统计数据获取方式

**VSCode 版：**
- 通过 `fetchMarketStat()` 获取两市统计（成交额、涨跌家数）
- 使用 VSCode 扩展作为代理绕过 CORS

**Web 版：**
- 通过 Netlify serverless function 代理请求
- 需要确认 `marketStat`（两市成交额、涨跌家数）的 API 是否已正确代理

**建议：**
- 确认 Web 端的 `fetchMarketStat` 等价实现是否完整
- 确认 Netlify proxy 是否覆盖了所有需要代理的 API 端点

---

### 🟢 P2 - 细节差异

#### 5. 基金详情页 Tab 对比

| Tab | VSCode 版 | Web 版 | 状态 |
|-----|-----------|--------|------|
| 持仓信息 | ✅ | ✅ | ✅ |
| 基金概况 | ✅ | ✅ | ✅ |
| 基金经理 | ✅ | ✅ | ✅ |
| 关联板块 | ✅ | ✅ | ✅ |
| 历史净值 | ✅ (ECharts图表) | ✅ (ECharts图表) | ✅ |
| 累计收益 | ✅ (ECharts图表) | ✅ (ECharts图表) | ✅ |

**结论：** 详情页 Tab 结构已完全对齐。

#### 6. 列定义对比

| 列 Key | VSCode 版 | Web 版 | 状态 |
|--------|-----------|--------|------|
| name | 基金名称 | 基金名称 | ✅ |
| estimatedChange | 估算涨幅 | 估算涨幅 | ✅ |
| estimatedGain | 估算收益 | 估算收益 | ✅ |
| dailyChange | 当日涨幅 | 当日涨幅 | ✅ |
| dailyGain | 当日收益 | 当日收益 | ✅ |
| holdingGain | 持有收益 | 持有收益 | ✅ |
| holdingGainRate | 收益率 | 总收益率 | ✅ |
| sector | 关联板块 | 关联板块 | ✅ |
| amountShares | 金额/份额 | 金额/份额 | ✅ |
| cost | 成本/最新 | 成本/最新 | ✅ |

**结论：** 列定义完全一致。

#### 7. 分组管理对比

| 功能 | VSCode 版 | Web 版 | 状态 |
|------|-----------|--------|------|
| 添加分组 | ✅ | ✅ | ✅ |
| 重命名分组 | ✅ | ✅ | ✅ |
| 删除分组 | ✅ | ✅ | ✅ |
| 分组排序 | ✅ (拖拽) | ✅ (拖拽) | ✅ |
| 基金移入分组 | ✅ | ✅ | ✅ |
| 分组内基金排序 | ✅ | ✅ | ✅ |
| 分组统计 Tooltip | ❌ | ✅ (长按) | Web 独有增强 |

**结论：** Web 端分组管理功能已超越 VSCode 版。

---

## 四、不需要复刻的 VSCode 特有功能

以下功能是 VSCode 平台特有的，Web 端不需要实现：

1. **状态栏显示** - VSCode 底部状态栏显示日收益，Web 端已在首页顶部展示
2. **TreeView 模式** - VSCode 的树形列表视图，Web 端使用表格视图即可
3. **命令面板** - VSCode 的 Ctrl+Shift+P 命令，Web 端通过 UI 按钮操作
4. **AI 分析** - 如果不需要可暂不实现（需要用户配置 API Key）
5. **视图切换（Tree ↔ Webview）** - Web 端只需要一种视图

---

## 五、下一步行动计划

### 第一优先级（P0）
1. **实现加仓/减仓的历史净值选择功能**
   - 新增 API：获取基金近 15 天历史净值
   - 修改加仓弹窗：增加日期选择 → 显示对应净值 → 输入金额 → 自动计算份额和加权成本
   - 修改减仓弹窗：展示历史净值供参考

### 第二优先级（P1）
2. **完善节假日检测**
   - 确认 `marketChina.ts` 是否已集成节假日数据
   - 如未集成，将 `holiday.json` 数据引入 Web 端
   - 确保自动刷新在节假日正确停止

3. **导入导出 sortMethod 映射**
   - 添加 VSCode `sortMethod` 格式到 Web 格式的双向映射

### 第三优先级（P2）
4. **确认行情中心 API 代理完整性**
   - 检查 Netlify proxy 是否覆盖 `fetchMarketStat` 所需的 API
   - 确认两市统计数据（成交额、涨跌家数）能正常获取

---

## 六、数据流对比

### VSCode 版数据流
```
VSCode Settings (全局) → FundDataManager → TreeView / WebviewView
                       ↓
              fundService.ts (API 调用)
                       ↓
              东方财富 API (直接请求，无 CORS 问题)
```

### Web 版数据流
```
localStorage → Pinia Stores → Vue Components
                    ↓
          services/ (业务逻辑)
                    ↓
          api/ (API 调用)
                    ↓
          Netlify Proxy → 东方财富 API
```

**关键差异：** Web 端需要通过 Netlify serverless function 代理所有东方财富 API 请求以绕过 CORS，而 VSCode 扩展可以直接发起请求。

---

## 七、总结

Web 端已经很好地复刻了 VSCode 版的核心功能。主要的功能性差距在于**加仓/减仓流程**缺少历史净值选择和自动成本计算。其余差异主要是体验层面的细节（节假日检测、sortMethod 映射等），不影响核心使用。

建议按照上述优先级逐步补齐，预计 1-2 天可以完成所有差异点的对齐。
