<p align="center">
  <img src="https://img2024.cnblogs.com/blog/3085939/202602/3085939-20260227162146255-1419431948.png" alt="fund-helper" width="200" height="200" />
</p>

<div align="center">

<h1>📈 基金助手 (Fund Helper)</h1>

![License](https://badgen.net/badge/License/MIT/red)
![VSCode](https://badgen.net/badge/VSCode/1.82.0+/blue?icon=visualstudio)
![Version](https://badgen.net/badge/Version/0.2.9/orange?icon=git)
![Platform](https://badgen.net/badge/Platform/Windows|MacOS|Linux/purple?icon=windows)

![Downloads](https://badgen.net/vs-marketplace/d/CrispyChicken.fund-helper?label=Downloads&color=blue)
![Installs](https://badgen.net/vs-marketplace/i/CrispyChicken.fund-helper?label=Installs&color=green)
![Rating](https://badgen.net/vs-marketplace/rating/CrispyChicken.fund-helper?label=Rating&color=yellow)
![Stars](https://badgen.net/github/stars/crispyChicken999/fund-helper-vscode?icon=github&label=Stars&color=gray)

</div>

在 VSCode 侧边栏实时查看自选基金估值、涨跌幅与收益，支持加减仓操作、多维度排序、拖拽排序、行情中心大盘数据、AI 分析等功能。摸鱼理财两不误！

## 📑 目录 (Table of Contents)

- [📑 目录 (Table of Contents)](#-目录-table-of-contents)
- [🔮 项目背景 (Project Background)](#-项目背景-project-background)
- [✨ 主要功能 (Key Features)](#-主要功能-key-features)
  - [核心功能](#核心功能)
  - [持仓管理](#持仓管理)
  - [分组与筛选](#分组与筛选)
  - [表格视图（新）](#表格视图新)
  - [隐私与安全](#隐私与安全)
  - [AI 智能分析](#ai-智能分析)
  - [行情中心](#行情中心)
  - [基金详情](#基金详情)
  - [数据持久化](#数据持久化)
- [💻 系统要求 (System Requirements)](#-系统要求-system-requirements)
- [🚀 快速开始 (Quick Start)](#-快速开始-quick-start)
  - [1. 安装插件](#1-安装插件)
  - [2. 添加基金](#2-添加基金)
  - [3. 导入持仓](#3-导入持仓)
    - [基础格式（仅基金数据）](#基础格式仅基金数据)
    - [完整格式（包含所有配置）](#完整格式包含所有配置)
  - [4. 开始使用](#4-开始使用)
    - [树形视图模式](#树形视图模式)
    - [表格视图模式（推荐）](#表格视图模式推荐)
    - [其他功能](#其他功能)
- [⚙️ 配置说明 (Configuration)](#️-配置说明-configuration)
  - [基础配置](#基础配置)
  - [分组配置](#分组配置)
  - [隐私配置](#隐私配置)
  - [表格视图配置](#表格视图配置)
  - [AI 配置](#ai-配置)
  - [快捷操作](#快捷操作)
  - [如何使用 AI 分析功能](#如何使用-ai-分析功能)
  - [如何使用分组功能](#如何使用分组功能)
  - [如何自定义表格列](#如何自定义表格列)
- [💥 更新日志 (Changelog)](#-更新日志-changelog)
- [🗺️ TODO (Roadmap)](#️-todo-roadmap)
- [🔧 技术实现 (Technical Implementation)](#-技术实现-technical-implementation)
- [⚠️ 免责声明 (Disclaimer)](#️-免责声明-disclaimer)
- [📄 开源协议 (License)](#-开源协议-license)

## 🔮 项目背景 (Project Background)

- 上班想偷偷看看基金涨跌？打开浏览器太明显，手机也不方便？💰
- 那就直接在 VSCode 里看吧！侧边栏一瞥，涨跌尽收眼底，摸鱼理财两不误 🐟
- 灵感来源于浏览器端的基金查看插件，将核心功能迁移到 VSCode 环境中，让开发者在写代码的间隙就能关注持仓动态

## ✨ 主要功能 (Key Features)

### 核心功能

1. 📊 **实时估值**：基于天天基金 JSONP 接口，实时获取基金估算净值和涨跌幅
2. 📋 **双视图模式**：支持传统树形列表视图和全新表格视图，可自由切换
3. 🎨 **涨红跌绿**：图标、Tooltip、详情项均直观标识涨跌状态
4. 🔄 **多维排序**：支持按涨跌幅、估算收益、持有额、持有收益、持有收益率进行升降序排序
5. 🖱️ **拖拽排序**：默认排序下可拖拽调整基金顺序
6. 📌 **状态栏摘要**：底部状态栏显示总日收益和百分比，仅亏损时显示绿色提醒
7. ⏰ **智能刷新**：交易时间内自动刷新数据，间隔可配置。智能识别周末和法定节假日，非交易日停止刷新

### 持仓管理

8. ➕ **加仓操作**：选择历史净值日期买入，直接输入买入金额自动精算持有份额
9. ➖ **减仓操作**：按照卖出金额快速减仓，自动计算剩余份额
10. ✏️ **修改持仓**：自由修改总份额和成本价；份额清仓记为 0 时自动跳过成本价输入
11. 📤 **导入/导出增强**：JSON 格式导入导出，支持合并或覆盖；导出包含分组顺序、排序方式、刷新间隔、默认视图等全部用户设置，一键备份恢复更完整

### 分组与筛选

12. 🏷️ **基金分组**：支持创建多个分组，灵活管理不同类型的基金
13. � **分组统计**：分组标签 hover 显示详细统计 Tooltip，包含基金数量、估算收益/涨幅、当日收益/涨幅、持有收益/收益率、总资产/成本等 9 项统计信息
14. 📋 **分组复制**：分组 Tooltip 新增复制按钮，一键复制分组统计信息到剪贴板
15. 🔍 **搜索/筛选**：侧边栏内置搜索框，按名称或代码实时筛选基金列表，支持一键清除

### 表格视图（新）

16. 📊 **表格布局**：全新表格视图设计，支持按列排序、调整列宽、自定义列显示
17. 🔒 **固定列**：基金名称列固定在左侧，横向滚动时显示渐变阴影，视觉层次更清晰
18. 🎯 **列设置**：自定义列的显示/隐藏和顺序，支持拖拽排序
19. 📅 **日期标注**：表头和 Tooltip 显示估算日期和净值日期，信息更准确
20. 🌙 **休市状态**：非交易日（周末、节假日）时，估算涨幅和估算收益显示为 `--`，估算日期显示为 `休市`

### 隐私与安全

21. 🔐 **隐私模式**：一键隐藏敏感数据（金额、收益等），hover 时可临时查看
22. 👁️ **状态栏隐藏**：开启后状态栏只显示图标，鼠标悬停时可查看具体金额

### AI 智能分析

23. 🧠 **AI 分析**：接入多种 AI 大模型（OpenAI, 阿里云百炼, 硅基流动, DeepSeek 等），自动生成专业投资诊断报告
24. ⚙️ **多配置管理**：支持保存多个 AI 配置，快速切换不同的 AI 服务

### 行情中心

25. 📈 **指数监控**：侧边栏可折叠节点，展示沪深300、上证指数、深证成指、创业板指四大指数实时数据
26. 💰 **资金流向**：行情 Webview 包含大盘资金统计、资金流向折线图（ECharts）
27. 🏭 **板块排行**：行业/风格/概念/地域四大板块排行，支持今日/5日/10日切换
28. 📅 **开市提示**：行情中心 item 前实时显示「开市」/「休市中」状态

### 基金详情

29. 📊 **详情页面**：Webview 展示基金详细信息，包括基金经理、成立日期、基金类型等
30. 📈 **历史走势**：查看基金历史净值走势图
31. � **持仓明细**：展示基金的十大持仓股票

### 数据持久化

32. 💾 **配置保存**：基金列表、分组、排序方式、列设置等保存到 VSCode 用户全局配置
33. 🔄 **状态恢复**：重启 VSCode 后自动恢复上次的视图状态

## 💻 系统要求 (System Requirements)

- **VSCode 版本**：1.82.0 及以上
- **操作系统**：Windows / MacOS / Linux
- **网络**：需要访问天天基金 API（`fundgz.1234567.com.cn`）和东方财富行情 API

## 🚀 快速开始 (Quick Start)

### 1. 安装插件

在 VSCode 扩展市场搜索 "基金助手" 或 "Fund Helper" 并安装，安装完成后在侧边栏中找到 📈 图标。

### 2. 添加基金

点击侧边栏标题栏的 `+` 按钮，输入基金名称或代码进行搜索，选择要添加的基金。

### 3. 导入持仓

如果已有持仓数据，可以通过标题栏 `...` → `导入基金列表` 导入 JSON 文件。

#### 基础格式（仅基金数据）

```json
{
  "funds": [
    { "code": "020256", "cost": "1.6399", "num": "7317.33" },
    { "code": "110020", "cost": "2.1500", "num": "5000.00" }
  ]
}
```

#### 完整格式（包含所有配置）

从 v0.2.2 开始，导出功能支持完整配置备份：

```json
{
  "funds": [
    { "code": "020256", "cost": "1.6399", "num": "7317.33" },
    { "code": "110020", "cost": "2.1500", "num": "5000.00" }
  ],
  "fundGroups": {
    "股票型": ["020256"],
    "混合型": ["110020"]
  },
  "fundGroupOrder": ["股票型", "混合型"],
  "sortMethod": "default",
  "refreshInterval": 30,
  "defaultViewMode": "webview",
  "webviewColumnOrder": ["name", "estimatedChange", "estimatedGain", "dailyChange", "dailyGain", "holdingGain", "holdingGainRate", "sector", "amountShares", "cost"],
  "webviewVisibleColumns": ["name", "estimatedChange", "estimatedGain", "dailyChange", "dailyGain", "holdingGain", "holdingGainRate", "sector", "amountShares", "cost"]
}
```

### 4. 开始使用

添加基金后，插件会自动获取实时估值数据。

#### 树形视图模式

- 🔺/🔻 图标直观显示涨跌
- 悬浮基金查看详细 Tooltip（涨红跌绿高亮）
- 悬浮排序栏查看持仓概览
- 展开基金查看详情信息
- 使用 inline 按钮（`+` `-` `✏` `🗑`）快速操作

#### 表格视图模式（推荐）

- 📊 清晰的表格布局，一目了然
- 🔒 基金名称列固定，横向滚动时显示阴影
- 📅 表头显示估算日期和净值日期
- 🖱️ 点击列名排序，支持升序/降序/默认
- ⚙️ 自定义列的显示/隐藏和顺序
- 🏷️ 分组标签快速切换，hover 查看详细统计
- 🔐 隐私模式一键隐藏敏感数据

#### 其他功能

- 点击「🔍 搜索 / 筛选基金...」快速找到指定基金
- 点击「行情中心」节点展开查看四大指数，再点展开「查看行情详情」打开完整行情 Webview
- 点击标题栏的 `⚙️` 配置 AI，点击 `💡` 生成 AI 分析报告
- 点击标题栏的 `📊` 切换视图模式（树形/表格）

## ⚙️ 配置说明 (Configuration)

在 VSCode 设置中搜索 `fund-helper`，可配置以下选项：

### 基础配置

| 配置项                        | 说明                                    | 默认值                      |
| ----------------------------- | --------------------------------------- | --------------------------- |
| `fund-helper.funds`           | 自选基金列表（{code, cost, num}）       | `[]`                        |
| `fund-helper.refreshInterval` | 数据刷新间隔（秒），设为 0 关闭自动刷新 | `30`                        |
| `fund-helper.sortMethod`      | 排序方式                                | `default`                   |
| `fund-helper.defaultViewMode` | 默认视图模式（tree/webview）            | `tree`                      |

### 分组配置

| 配置项                        | 说明                                    | 默认值                      |
| ----------------------------- | --------------------------------------- | --------------------------- |
| `fund-helper.fundGroups`      | 基金分组配置（格式：{ "groupName": ["code1", "code2"] }） | `{}`                        |
| `fund-helper.fundGroupOrder`  | 基金分组顺序（格式：["groupName1", "groupName2"]）        | `[]`                        |

### 隐私配置

| 配置项                        | 说明                                    | 默认值                      |
| ----------------------------- | --------------------------------------- | --------------------------- |
| `fund-helper.hideStatusBar`   | 隐藏状态栏金额（hover 时显示）          | `false`                     |
| `fund-helper.privacyMode`     | 开启隐私模式（自动隐藏敏感数据）        | `false`                     |

### 表格视图配置

| 配置项                              | 说明                                    | 默认值                      |
| ----------------------------------- | --------------------------------------- | --------------------------- |
| `fund-helper.webviewColumnOrder`    | 表格视图列的显示顺序                    | `["name", "estimatedChange", ...]` |
| `fund-helper.webviewVisibleColumns` | 表格视图中显示的列                      | `["name", "estimatedChange", ...]` |

### AI 配置

| 配置项                        | 说明                                    | 默认值                      |
| ----------------------------- | --------------------------------------- | --------------------------- |
| `fund-helper.aiProvider`      | AI服务商(openai/aliyun/deepseek等)      | `openai`                    |
| `fund-helper.aiApiKey`        | AI服务的 API Key                        | `""`                        |
| `fund-helper.aiModel`         | 使用的 AI 模型 (如 gpt-3.5-turbo)       | `gpt-3.5-turbo`             |
| `fund-helper.aiApiEndpoint`   | AI API 自定义请求地址                   | `https://api.openai.com/v1` |
| `fund-helper.enableAIAnalysis`| 启用AI分析功能                          | `false`                     |
| `fund-helper.aiTemperature`   | AI分析温度参数（0-2）                   | `0.7`                       |
| `fund-helper.aiMaxTokens`     | AI最大输出token数                       | `2000`                      |
| `fund-helper.savedAIConfigs`  | 保存的AI配置列表                        | `[]`                        |

### 快捷操作

也可通过侧边栏 `...` More Actions 快速：
- **修改刷新间隔**
- **一键开关自动刷新**
- **导入/导出基金列表**（包含完整配置）
- **切换隐私模式**

### 如何使用 AI 分析功能

1. 点击标题栏的 **⚙️ （配置AI）** 按钮
2. 按照向导选择对应的 AI 提供商，输入您的 API Key 和对应的模型
3. 点击 **测试连接**，成功后点击 **完成配置**
4. 返回基金列表点击标题栏的 **💡 （AI 分析）** 按钮，即可生成详细的持仓分析报告

### 如何使用分组功能

1. 在表格视图中，点击标题栏的 **⚙️ （分组管理）** 按钮
2. 创建新分组，输入分组名称
3. 将基金拖拽到对应分组，或使用基金 Tooltip 中的「分组」按钮
4. 点击分组标签切换显示，hover 查看分组统计信息

### 如何自定义表格列

1. 在表格视图中，点击标题栏的 **⚙️ （列设置）** 按钮
2. 勾选/取消勾选列来显示/隐藏
3. 拖拽列来调整顺序（基金名称列固定在第一位）
4. 点击 **保存** 应用更改，或点击 **恢复默认** 重置

## 💥 更新日志 (Changelog)

- 查看[完整更新日志](./CHANGELOG.md)，了解所有版本的详细更改。

## 🗺️ TODO (Roadmap)

- [x] 支持查看基金历史走势图（Webview 详情页）
- [x] 支持 Webview 详情页展示更丰富的基金信息
- [x] 行情中心：大盘指数、资金流向、板块排行
- [x] 表格视图：支持按列排序、调整列宽、自定义列显示
- [x] 基金分组：支持创建多个分组，灵活管理不同类型的基金
- [x] 隐私模式：一键隐藏敏感数据
- [x] 导入导出增强：支持完整配置备份
- [ ] 支持自定义涨跌颜色主题
- [ ] 支持多组合切换（如：A股组合、港股组合）
- [ ] 支持基金对比功能
- [ ] 支持基金提醒功能（涨跌幅达到阈值时提醒）
- [ ] ...

## 🔧 技术实现 (Technical Implementation)

- 基于 VSCode Extension API 开发，使用 TreeView 构建侧边栏界面
- 使用 `fundgz.1234567.com.cn` JSONP 接口获取基金实时估值
- 使用 `fundsuggest.eastmoney.com` 接口进行基金搜索
- 使用 `api.fund.eastmoney.com` 接口获取历史净值
- 使用 `push2.eastmoney.com` 接口获取大盘指数与资金流向
- 使用 `data.eastmoney.com` 接口获取板块排行（通过宿主进程代理解决 CORS）
- 使用 [ECharts](https://echarts.apache.org/) 绘制资金流向折线图与板块柱状图
- 技术栈：TypeScript、VSCode Extension API、ECharts

## ⚠️ 免责声明 (Disclaimer)

- **本插件仅供学习和个人使用，不构成任何投资建议。**
- **基金投资有风险，入市需谨慎。插件展示的数据均为估算值，实际收益以基金公司公布为准。**
- **本项目与天天基金、东方财富等平台无任何关联，仅为个人学习项目。**

## 📄 开源协议 (License)

- 本项目采用 [MIT 协议](./LICENSE) 开源，您可以自由使用、修改和分发。
