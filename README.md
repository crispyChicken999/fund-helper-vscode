<p align="center">
  <img src="https://img2024.cnblogs.com/blog/3085939/202602/3085939-20260227162146255-1419431948.png" alt="fund-helper" width="200" height="200" />
</p>

<div align="center">

<h1>📈 基金助手 (Fund Helper)</h1>

![License](https://img.shields.io/badge/License-MIT-orange.svg)
![VSCode](https://img.shields.io/badge/VSCode-1.82.0%2B-blue.svg)
![Version](https://img.shields.io/badge/Version-0.1.3-green.svg)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20MacOS%20%7C%20Linux-purple.svg)

![Downloads](https://img.shields.io/visual-studio-marketplace/d/CrispyChicken.fund-helper)
![Rating](https://img.shields.io/visual-studio-marketplace/r/CrispyChicken.fund-helper)
![Stars](https://img.shields.io/github/stars/crispyChicken999/fund-helper-vscode?style=social)

</div>

在 VSCode 侧边栏实时查看自选基金估值、涨跌幅与收益，支持加减仓操作、多维度排序、拖拽排序、导入导出等功能。摸鱼理财两不误！

## 📑 目录 (Table of Contents)
# 基金助手 VSCode 插件

在 VSCode 侧边栏查看自选基金实时估值、涨跌幅与收益 📈

## 功能特性

- **实时数据**：获取基金实时估值和涨跌幅（基于天天基金接口）
- **直观展示**：TreeView 展示基金列表，支持展开查看详情
- **智能排序**：支持按涨跌幅、估算收益、持有额、持有收益、收益率等多维度排序
- **便捷操作**：支持拖拽调整顺序、加减仓操作、修改持仓
- **数据管理**：JSON 格式导入导出基金列表（合并或覆盖）
- **状态监控**：状态栏显示总日收益与百分比
- **自动刷新**：交易时间内可配置自动刷新（最小5秒）
- **🤖 AI智能分析**：采用OpenAI SDK标准实现，支持多种AI服务商
- **💾 简化配置**：自动保存单份配置，新设置自动替换旧设置

## 🆕 AI功能设计理念

### 简化配置流程
插件采用简化的配置管理模式：

**AI配置功能**：
- 专注于AI服务配置管理
- 自动保存当前配置，新设置自动替换旧配置
- 提供友好的配置向导界面
- 内置连接测试功能

**AI分析功能**：
- 独立的分析按钮，始终可见
- 未配置时智能引导用户配置
- 配置完成后直接进行基金分析

### 使用流程
1. **首次使用**：点击"AI分析"按钮 → 系统提示未配置 → 引导至配置页面
2. **配置AI**：完成服务商、API密钥等配置 → 自动保存设置
3. **更新配置**：再次点击"配置AI" → 修改设置 → 自动替换旧配置
4. **日常使用**：点击"AI分析"按钮 → 直接获得分析结果

## 🤖 AI服务提供商配置指南

### OpenAI
- **API端点**: `https://api.openai.com/v1`
- **常用模型**: `gpt-3.5-turbo`, `gpt-4`, `gpt-4-turbo`
- **获取API密钥**: [OpenAI Platform](https://platform.openai.com/api-keys)

### 硅基流动 (SiliconFlow)
- **API端点**: `https://api.siliconflow.cn/v1`
- **常用模型**: `Qwen/Qwen2-7B-Instruct`, `THUDM/chatglm3-6b`

### 阿里云百炼
- **API端点**: `https://dashscope.aliyuncs.com/compatible-mode/v1` (自动配置)
- **常用模型**: `qwen-turbo`, `qwen-plus`, `qwen-max`
- **特点**: 自动处理模型名称前缀

### DeepSeek
- **API端点**: `https://api.deepseek.com/v1`
- **常用模型**: `deepseek-chat`, `deepseek-coder`
- **获取API密钥**: [DeepSeek开放平台](https://platform.deepseek.com/)

## ❓ 常见问题解答

### Q: 测试连接正常，但AI分析失败返回404错误？
**A**: 这通常是API端点配置问题，请检查：
1. 确认选择了正确的AI服务提供商
2. 验证API端点地址是否正确（参考上面的配置指南）
3. 检查网络连接是否正常
4. 确认API密钥有效且有足够额度

### Q: 如何更新AI配置？
**A**: 
1. 点击侧边栏的"配置AI"按钮
2. 修改相应的配置项
3. 点击保存，新配置会自动替换旧配置

### Q: AI分析结果为空或不准确？
**A**:
1. 确保已添加基金并设置了持仓数据
2. 检查API密钥和模型配置是否正确
3. 调整温度参数（0-2之间）控制输出随机性
4. 增加最大token数以获得更详细的分析

## 安装使用

### 方法一：VSCode Marketplace（推荐）
1. 在 VSCode 扩展市场搜索 `基金助手`
2. 点击安装
3. 重启 VSCode

### 方法二：手动安装
```bash
# 下载 .vsix 文件
# 在 VSCode 中：Ctrl+Shift+P → Extensions: Install from VSIX
```

## 基本操作

### 添加基金
1. 点击侧边栏 "+" 按钮
2. 输入基金名称或代码搜索
3. 选择要添加的基金

### 查看详情
- 点击基金条目可展开查看历史净值
- 鼠标悬停查看详细信息

### 操作持仓
- **加仓**：点击 "+" 按钮
- **减仓**：点击 "-" 按钮
- **修改**：点击编辑图标修改总份额和成本价
- **删除**：右键选择删除或点击垃圾桶图标

### 排序功能
- 点击排序按钮选择排序方式
- 支持升序/降序切换
- 默认排序下支持拖拽调整顺序

### 导入导出
- **导出**：将当前基金列表导出为 JSON 文件
- **导入**：从 JSON 文件导入基金列表（支持合并或覆盖）

### AI功能
- **配置AI**：设置AI服务商和API密钥，自动保存配置
- **AI分析**：一键获取基金组合专业分析报告
- **智能引导**：未配置时自动提示配置

## 配置选项

在 VSCode 设置中搜索 `fund-helper` 可配置：

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| funds | array | [] | 自选基金列表 |
| refreshInterval | number | 30 | 数据刷新间隔（秒） |
| sortMethod | string | "default" | 排序方式 |
| aiProvider | string | "openai" | AI服务提供商 |
| aiApiKey | string | "" | AI API密钥 |
| aiApiEndpoint | string | "https://api.openai.com/v1" | AI API端点 |
| aiModel | string | "gpt-3.5-turbo" | AI模型名称 |
| enableAIAnalysis | boolean | false | 是否启用AI分析 |
| aiTemperature | number | 0.7 | AI分析温度参数 |
| aiMaxTokens | number | 2000 | AI最大输出token数 |

## 开发调试

```bash
# 安装依赖
npm install

# 编译
npm run compile

# 监听编译
npm run watch

# 调试
按 F5 启动调试实例
```

## 注意事项

- 数据来源于天天基金，仅供参考
- 仅在交易时间内自动刷新
- 建议刷新间隔不少于5秒
- API密钥请妥善保管
- AI分析结果仅供参考，投资需谨慎

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！