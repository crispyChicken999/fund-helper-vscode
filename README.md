<p align="center">
  <img src="https://img2024.cnblogs.com/blog/3085939/202602/3085939-20260227162146255-1419431948.png" alt="fund-helper" width="200" height="200" />
</p>

<div align="center">

<h1>📈 基金助手 (Fund Helper)</h1>

![License](https://img.shields.io/badge/License-MIT-orange.svg)
![VSCode](https://img.shields.io/badge/VSCode-1.82.0%2B-blue.svg)
![Version](https://img.shields.io/badge/Version-0.1.2-green.svg)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20MacOS%20%7C%20Linux-purple.svg)

![Downloads](https://img.shields.io/visual-studio-marketplace/d/CrispyChicken.fund-helper)
![Rating](https://img.shields.io/visual-studio-marketplace/r/CrispyChicken.fund-helper)
![Stars](https://img.shields.io/github/stars/crispyChicken999/fund-helper-vscode?style=social)

</div>

在 VSCode 侧边栏实时查看自选基金估值、涨跌幅与收益，支持加减仓操作、多维度排序、拖拽排序、导入导出等功能。摸鱼理财两不误！

## 📑 目录 (Table of Contents)

- [📑 目录 (Table of Contents)](#-目录-table-of-contents)
- [🔮 项目背景 (Project Background)](#-项目背景-project-background)
- [✨ 主要功能 (Key Features)](#-主要功能-key-features)
- [💻 系统要求 (System Requirements)](#-系统要求-system-requirements)
- [🚀 快速开始 (Quick Start)](#-快速开始-quick-start)
  - [1. 安装插件](#1-安装插件)
  - [2. 添加基金](#2-添加基金)
  - [3. 导入持仓](#3-导入持仓)
  - [4. 开始使用](#4-开始使用)
- [⚙️ 配置说明 (Configuration)](#️-配置说明-configuration)
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

1. 📊 **实时估值**：基于天天基金 JSONP 接口，实时获取基金估算净值和涨跌幅
2. 📋 **侧边栏展示**：TreeView 形式展示基金列表，展开查看详细信息
3. 🎨 **涨红跌绿**：图标、Tooltip、详情项均直观标识涨跌状态
4. 🔄 **多维排序**：支持按涨跌幅、估算收益、持有额、持有收益、持有收益率进行升降序排序
5. 🖱️ **拖拽排序**：默认排序下可拖拽调整基金顺序
6. ➕ **加仓/减仓**：选择历史净值日期操作，自动计算加权平均成本
7. ✏️ **修改持仓**：直接修改总份额和成本价
8. 📤 **导入/导出**：JSON 格式导入导出基金列表，支持合并或覆盖
9. 📌 **状态栏摘要**：底部状态栏显示总日收益和百分比
10. ⏰ **自动刷新**：交易时间内自动刷新数据，间隔可配置（最小 5 秒）
11. 💾 **数据持久化**：基金列表、排序方式保存到 VSCode 用户全局配置

## 💻 系统要求 (System Requirements)

- **VSCode 版本**：1.82.0 及以上
- **操作系统**：Windows / MacOS / Linux
- **网络**：需要访问天天基金 API（`fundgz.1234567.com.cn`）

## 🚀 快速开始 (Quick Start)

### 1. 安装插件

在 VSCode 扩展市场搜索 "基金助手" 或 "Fund Helper" 并安装，安装完成后在侧边栏中找到 📈 图标。

### 2. 添加基金

点击侧边栏标题栏的 `+` 按钮，输入基金名称或代码进行搜索，选择要添加的基金。

### 3. 导入持仓

如果已有持仓数据，可以通过标题栏 `...` → `导入基金列表` 导入 JSON 文件：

```json
{
  "funds": [
    { "code": "020256", "cost": "1.6399", "num": "7317.33" },
    { "code": "110020", "cost": "2.1500", "num": "5000.00" }
  ]
}
```

### 4. 开始使用

添加基金后，插件会自动获取实时估值数据。

- 🔺/🔻 图标直观显示涨跌
- 悬浮基金查看详细 Tooltip（涨红跌绿高亮）
- 悬浮排序栏查看持仓概览
- 展开基金查看详情信息
- 使用 inline 按钮（`+` `-` `✏` `🗑`）快速操作

## ⚙️ 配置说明 (Configuration)

在 VSCode 设置中搜索 `fund-helper`，可配置以下选项：

| 配置项                        | 说明                               | 默认值    |
| ----------------------------- | ---------------------------------- | --------- |
| `fund-helper.funds`           | 自选基金列表（{code, cost, num}）  | `[]`      |
| `fund-helper.refreshInterval` | 数据刷新间隔（秒），仅交易时间生效 | `30`      |
| `fund-helper.sortMethod`      | 排序方式                           | `default` |

## 💥 更新日志 (Changelog)

- 查看[完整更新日志](./CHANGELOG.md)，了解所有版本的详细更改。

## 🗺️ TODO (Roadmap)

- [ ] 支持查看基金历史走势图
- [ ] 支持 Webview 详情页展示更丰富的基金信息
- [ ] 支持自定义涨跌颜色主题
- [ ] 支持多组合切换（如：A股组合、港股组合）
- [ ] 支持交易日/非交易日智能提醒
- [ ] ...

## 🔧 技术实现 (Technical Implementation)

- 基于 VSCode Extension API 开发，使用 TreeView 构建侧边栏界面
- 使用 `fundgz.1234567.com.cn` JSONP 接口获取基金实时估值
- 使用 `fundsuggest.eastmoney.com` 接口进行基金搜索
- 使用 `api.fund.eastmoney.com` 接口获取历史净值
- 技术栈：TypeScript、Axios、VSCode Extension API

## ⚠️ 免责声明 (Disclaimer)

- **本插件仅供学习和个人使用，不构成任何投资建议。**
- **基金投资有风险，入市需谨慎。插件展示的数据均为估算值，实际收益以基金公司公布为准。**
- **本项目与天天基金、东方财富等平台无任何关联，仅为个人学习项目。**

## 📄 开源协议 (License)

- 本项目采用 [MIT 协议](./LICENSE) 开源，您可以自由使用、修改和分发。
