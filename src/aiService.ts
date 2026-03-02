import * as vscode from "vscode";
import OpenAI from "openai";
import { FundInfo, calcHoldingAmount } from "./fundModel";

interface FundAnalysisRequest {
  funds: Array<{
    code: string;
    name: string;
    holdingAmount: number;
    cost: number;
    currentPrice: number;
    changePercent: number;
  }>;
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

// AI分析核心函数
async function performAIAnalysis(fundList: FundInfo[]): Promise<string> {
  const config = vscode.workspace.getConfiguration("fund-helper");
  const aiProvider = config.get<string>("aiProvider", "openai");
  const aiApiKey = config.get<string>("aiApiKey", "");
  const aiModel = config.get<string>("aiModel", "gpt-3.5-turbo");
  const aiTemperature = config.get<number>("aiTemperature", 0.7);
  const aiMaxTokens = config.get<number>("aiMaxTokens", 2000);

  if (!aiApiKey) {
    throw new Error("AI API密钥未配置");
  }

  // 构造分析请求
  const fundData = fundList.map(fund => ({
    code: fund.code,
    name: fund.name,
    holdingAmount: calcHoldingAmount(fund),
    cost: fund.cost,
    currentPrice: fund.netValue,
    changePercent: fund.changePercent
  }));

  const prompt = `请对以下基金组合进行专业分析：

${fundData.map((fund, index) => `
${index + 1}. ${fund.name} (${fund.code})
   - 持有金额: ¥${fund.holdingAmount.toFixed(2)}
   - 成本价: ¥${fund.cost.toFixed(4)}
   - 当前净值: ¥${fund.currentPrice.toFixed(4)}
   - 涨跌幅: ${fund.changePercent > 0 ? '+' : ''}${fund.changePercent.toFixed(2)}%
`).join('')}

请从以下角度进行分析：
1. 整体组合表现评估
2. 个股风险分析
3. 资产配置建议
4. 投资策略优化建议
5. 风险提示

要求：
- 分析要具体、有针对性
- 语言简洁明了
- 提供可操作的建议
- 总字数控制在1000字以内`;

  try {
    // 使用OpenAI SDK进行分析
    const openai = new OpenAI({
      apiKey: aiApiKey,
      baseURL: getBaseURL(aiProvider),
    });

    const completion = await openai.chat.completions.create({
      model: aiModel,
      messages: [{ role: "user", content: prompt }],
      temperature: aiTemperature,
      max_tokens: aiMaxTokens,
    });

    const analysis = completion.choices[0]?.message?.content || "分析失败";
    return analysis;
  } catch (error) {
    throw new Error(`AI分析失败: ${(error as Error).message}`);
  }
}

// 获取不同提供商的基础URL
function getBaseURL(provider: string): string {
  const urls: Record<string, string> = {
    'openai': 'https://api.openai.com/v1',
    'azure-openai': '', // Azure需要特殊处理
    'claude': 'https://api.anthropic.com',
    'gemini': 'https://generativelanguage.googleapis.com/v1beta',
    'siliconflow': 'https://api.siliconflow.cn/v1',
    'aliyun': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    'deepseek': 'https://api.deepseek.com/v1',
    'custom': '' // 自定义需要用户提供完整URL
  };
  return urls[provider] || 'https://api.openai.com/v1';
}

// AI分析功能
export async function analyzeFunds(context: vscode.ExtensionContext, fundList: FundInfo[]) {
  if (fundList.length === 0) {
    vscode.window.showWarningMessage("请先添加基金后再进行AI分析");
    return;
  }

  // 检查AI配置
  const config = vscode.workspace.getConfiguration("fund-helper");
  const aiProvider = config.get<string>("aiProvider", "");
  const aiApiKey = config.get<string>("aiApiKey", "");

  if (!aiProvider || !aiApiKey) {
    const selection = await vscode.window.showWarningMessage(
      "尚未配置AI服务，请先配置AI服务",
      "配置AI服务",
      "取消"
    );

    if (selection === "配置AI服务") {
      configureAI();
    }
    return;
  }

  // 跳转到AI分析页面
  showAIAnalysisPanel(context, fundList);
}

async function callAIAnalysis(request: FundAnalysisRequest, apiKey: string): Promise<string> {
  const config = vscode.workspace.getConfiguration("fund-helper");
  const provider = config.get<string>('aiProvider', 'openai');
  const endpoint = config.get<string>('aiApiEndpoint', 'https://api.openai.com/v1');
  const model = config.get<string>('aiModel', 'gpt-3.5-turbo');
  const temperature = config.get<number>('aiTemperature', 0.7);
  const maxTokens = config.get<number>('aiMaxTokens', 2000);

  // 构造提示词
  const fundInfo = request.funds.map(fund =>
    `- ${fund.name} (${fund.code}): 持有金额${fund.holdingAmount.toFixed(2)}元, 成本价${fund.cost.toFixed(4)}元, 当前涨跌幅${fund.changePercent.toFixed(2)}%`
  ).join('\n');

  const prompt = `你是一位专业的基金投资顾问，请根据以下基金持仓情况进行分析：

基金持仓详情：
${fundInfo}

请从以下几个维度进行专业分析：
1、宏观与政策：当前国内外重要政策/事件对该行业是利好、利空还是中性？政策支持度如何？
2、行业地位：该标的所属行业是否处于政策鼓励方向？政策资源具体流向产业链哪个环节？
3、基金持仓（如适用）：基金最新持仓是否符合主题？调仓是否反映产业趋势？重仓股风险暴露如何？
4、财务健康：价值与质量因子：估值是否合理？有无价值陷阱（如持续亏损、盈余波动大）？自由现金流与盈利趋势：现金流是否健康？净现比是否大于1？盈利是否内生增长？
5、资金与量价：近期主力资金动向如何？量价关系处于吸筹、洗盘、拉升还是出货阶段？
6、综合结论：给出核心矛盾、主要风险及明确的操作建议（增持/持有/减持）。

要求：
- 分析要具体、有针对性
- 语言简洁明了
- 给出可操作的建议
- 总字数控制在1000字以内`;

  try {
    let openai: OpenAI;
    let finalModel: string;

    // 根据不同提供商初始化OpenAI客户端
    switch (provider) {
      case 'openai':
        openai = new OpenAI({
          apiKey: apiKey,
          baseURL: endpoint
        });
        finalModel = model;
        break;

      case 'siliconflow':
        openai = new OpenAI({
          apiKey: apiKey,
          baseURL: endpoint
        });
        finalModel = model;
        break;

      case 'aliyun':
        // 阿里云百炼使用兼容模式
        openai = new OpenAI({
          apiKey: apiKey,
          baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
        });
        // 阿里云模型名称处理
        finalModel = model.startsWith('qwen') ? model : `qwen-${model}`;
        break;

      case 'deepseek':
        openai = new OpenAI({
          apiKey: apiKey,
          baseURL: endpoint
        });
        finalModel = model;
        break;

      default:
        throw new Error(`不支持的AI提供商: ${provider}`);
    }

    console.log(`调用AI API: ${openai.baseURL}`);
    console.log(`使用模型: ${finalModel}`);

    const completion = await openai.chat.completions.create({
      model: finalModel,
      messages: [{ role: "user", content: prompt }],
      temperature: temperature,
      max_tokens: maxTokens
    });

    const analysisText = completion.choices[0]?.message?.content || 'AI分析完成，但未返回有效内容';
    return analysisText;

  } catch (error: any) {
    console.error('AI API调用错误:', error);

    if (error.response) {
      const status = error.response.status;
      const errorMessage = error.response.data?.error?.message || '未知错误';

      let detailedError = `API调用失败: ${status}`;
      if (status === 404) {
        detailedError += ' - 请检查API端点地址是否正确';
      } else if (status === 401) {
        detailedError += ' - API密钥无效或权限不足';
      } else if (status === 400) {
        detailedError += ' - 请求参数错误';
      }
      detailedError += ` (${errorMessage})`;

      throw new Error(detailedError);
    } else if (error.request) {
      throw new Error('网络请求失败，请检查网络连接和API配置');
    } else {
      throw new Error(`请求配置错误: ${error.message}`);
    }
  }
}

function showAnalysisResult(analysisText: string) {
  // 创建分析结果显示面板
  const panel = vscode.window.createWebviewPanel(
    'fundAnalysis',
    '基金AI分析报告',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );

  panel.webview.html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>基金AI分析报告</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                padding: 20px;
                margin: 0;
                line-height: 1.6;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
            }
            h2 {
                color: var(--vscode-foreground);
                border-bottom: 1px solid var(--vscode-panel-border);
                padding-bottom: 10px;
            }
            .analysis-content {
                white-space: pre-wrap;
                background-color: var(--vscode-textBlockQuote-background);
                border-left: 4px solid var(--vscode-textBlockQuote-border);
                padding: 15px;
                margin: 15px 0;
                border-radius: 3px;
            }
            .timestamp {
                color: var(--vscode-descriptionForeground);
                font-size: 0.9em;
                text-align: right;
                margin-top: 20px;
            }
            button {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 8px 16px;
                border-radius: 3px;
                cursor: pointer;
                margin-right: 10px;
                font-size: var(--vscode-font-size);
            }
            button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            .button-group {
                margin-top: 20px;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>📊 基金组合AI分析报告</h2>
            <div class="analysis-content">${analysisText.replace(/\n/g, '<br>')}</div>
            <div class="timestamp">分析时间: ${new Date().toLocaleString()}</div>
            <div class="button-group">
                <button onclick="copyToClipboard()">复制报告</button>
                <button onclick="closePanel()">关闭</button>
            </div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            
            function copyToClipboard() {
                const content = ${JSON.stringify(analysisText)};
                navigator.clipboard.writeText(content).then(() => {
                    vscode.postMessage({ command: 'copied' });
                });
            }
            
            function closePanel() {
                vscode.postMessage({ command: 'close' });
            }
            
            window.addEventListener('message', event => {
                const message = event.data;
                if (message.command === 'copied') {
                    alert('报告已复制到剪贴板');
                }
            });
        </script>
    </body>
    </html>
  `;

  panel.webview.onDidReceiveMessage(message => {
    switch (message.command) {
      case 'copied':
        vscode.window.showInformationMessage('分析报告已复制到剪贴板');
        break;
      case 'close':
        panel.dispose();
        break;
    }
  });
}

// ======================== AI配置管理 ========================

interface AISavedConfig {
  id: string;
  name: string;
  provider: string;
  model: string;
  endpoint: string;
  temperature: number;
  maxTokens: number;
  isDefault: boolean;
}

interface ProviderData {
  name: string;
  info: string;
  models: Array<{ name: string; desc: string }>;
  endpoint: string;
}

const providerData: Record<string, ProviderData> = {
  'aliyun': {
    name: '阿里云百炼',
    info: '阿里云百炼：提供通义千问系列大模型',
    models: [
      { name: 'qwen-max', desc: '通义千问超大规模语言模型' },
      { name: 'qwen-plus', desc: '通义千问增强版语言模型' },
      { name: 'qwen-turbo', desc: '通义千问极速版语言模型' }
    ],
    endpoint: 'https://dashscope.aliyuncs.com/api/v1'
  },
  'openai': {
    name: 'OpenAI',
    info: 'OpenAI官方API：提供GPT系列大模型',
    models: [
      { name: 'gpt-4', desc: 'GPT-4最新版本' },
      { name: 'gpt-3.5-turbo', desc: 'GPT-3.5 Turbo版本' },
      { name: 'gpt-4-turbo', desc: 'GPT-4 Turbo版本' }
    ],
    endpoint: 'https://api.openai.com/v1'
  },
  'siliconflow': {
    name: '硅基流动',
    info: '硅基流动：提供多种开源大模型服务',
    models: [
      { name: 'Qwen/Qwen2-72B-Instruct', desc: '通义千问2 72B指令版' },
      { name: 'THUDM/chatglm3-6b', desc: 'ChatGLM3 6B版本' },
      { name: 'meta-llama/Llama-2-70b-chat-hf', desc: 'Llama2 70B聊天版' }
    ],
    endpoint: 'https://api.siliconflow.cn/v1'
  },
  'deepseek': {
    name: 'DeepSeek',
    info: 'DeepSeek：深度求索大模型服务',
    models: [
      { name: 'deepseek-chat', desc: 'DeepSeek Chat对话模型' },
      { name: 'deepseek-coder', desc: 'DeepSeek Coder编程模型' }
    ],
    endpoint: 'https://api.deepseek.com/v1'
  }
};

export async function configureAI() {
  const config = vscode.workspace.getConfiguration("fund-helper");

  // 创建配置面板
  const panel = vscode.window.createWebviewPanel(
    'aiConfig',
    'AI服务配置',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );

  // 获取当前配置和保存的配置
  const currentProvider = config.get<string>('aiProvider', 'openai');
  const currentApiKey = config.get<string>('aiApiKey', '');
  const currentModel = config.get<string>('aiModel', 'gpt-3.5-turbo');
  const currentEndpoint = config.get<string>('aiApiEndpoint', 'https://api.openai.com/v1');
  const currentTemperature = config.get<number>('aiTemperature', 0.7);
  const currentMaxTokens = config.get<number>('aiMaxTokens', 2000);
  const savedConfigs = config.get<AISavedConfig[]>('savedAIConfigs', []);

  // 设置HTML内容
  panel.webview.html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI服务配置</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                padding: 20px;
                margin: 0;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
            }
            .step {
                display: none;
                animation: fadeIn 0.3s ease-in;
            }
            .step.active {
                display: block;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .form-group {
                margin-bottom: 20px;
            }
            label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
            }
            select, input[type="text"], input[type="password"], input[type="number"], textarea {
                width: 100%;
                padding: 8px;
                border: 1px solid var(--vscode-input-border);
                background-color: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border-radius: 3px;
                box-sizing: border-box;
            }
            input[type="checkbox"] {
                margin-right: 8px;
            }
            button {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 10px 20px;
                border-radius: 3px;
                cursor: pointer;
                margin-right: 10px;
                font-size: var(--vscode-font-size);
            }
            button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            button.secondary {
                background-color: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
            }
            button.secondary:hover {
                background-color: var(--vscode-button-secondaryHoverBackground);
            }
            .button-group {
                margin-top: 30px;
                text-align: center;
            }
            .provider-info {
                font-size: 12px;
                color: var(--vscode-descriptionForeground);
                margin-top: 5px;
            }
            .warning {
                background-color: var(--vscode-editorWarning-background);
                border: 1px solid var(--vscode-editorWarning-border);
                padding: 10px;
                border-radius: 3px;
                margin: 15px 0;
            }
            .model-selector {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 10px;
                margin-top: 10px;
            }
            .model-card {
                border: 1px solid var(--vscode-panel-border);
                border-radius: 5px;
                padding: 15px;
                cursor: pointer;
                transition: all 0.2s;
                text-align: center;
            }
            .model-card:hover {
                border-color: var(--vscode-focusBorder);
                background-color: var(--vscode-list-hoverBackground);
            }
            .model-card.selected {
                border-color: var(--vscode-focusBorder);
                background-color: var(--vscode-list-activeSelectionBackground);
            }
            .model-name {
                font-weight: bold;
                margin-bottom: 5px;
            }
            .model-desc {
                font-size: 0.9em;
                color: var(--vscode-descriptionForeground);
            }
            .test-section {
                border-top: 1px solid var(--vscode-panel-border);
                margin-top: 25px;
                padding-top: 20px;
            }
            .test-result {
                margin-top: 15px;
                padding: 15px;
                border-radius: 5px;
                white-space: pre-wrap;
                font-family: monospace;
                font-size: 0.9em;
            }
            .test-result.success {
                background-color: var(--vscode-diffEditor-insertedTextBackground);
                border: 1px solid var(--vscode-editorGutter-addedBackground);
            }
            .test-result.error {
                background-color: var(--vscode-diffEditor-removedTextBackground);
                border: 1px solid var(--vscode-editorGutter-deletedBackground);
            }
            .step-indicator {
                display: flex;
                justify-content: center;
                margin-bottom: 30px;
            }
            .step-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background-color: var(--vscode-descriptionForeground);
                margin: 0 5px;
                transition: background-color 0.3s;
            }
            .step-dot.active {
                background-color: var(--vscode-focusBorder);
            }
            .password-container {
                position: relative;
            }
            .password-toggle {
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                cursor: pointer;
                color: var(--vscode-textLink-foreground);
            }
            .advanced-settings {
                border-top: 1px solid var(--vscode-panel-border);
                margin-top: 25px;
                padding-top: 20px;
            }
            .advanced-toggle {
                cursor: pointer;
                color: var(--vscode-textLink-foreground);
                text-decoration: underline;
            }
            .success-indicator {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                padding: 15px;
                margin: 20px 0;
                background-color: var(--vscode-diffEditor-insertedTextBackground);
                border: 1px solid var(--vscode-editorGutter-addedBackground);
                border-radius: 5px;
                animation: fadeIn 0.3s ease-in;
            }
            .success-icon {
                font-size: 24px;
                color: var(--vscode-editorGutter-addedBackground);
                font-weight: bold;
            }
            .success-text {
                font-size: 16px;
                color: var(--vscode-foreground);
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }

        </style>
    </head>
    <body>
        <div class="container">
            <h2>🤖 AI服务配置向导</h2>
            
            <!-- 步骤指示器 -->
            <div class="step-indicator">
                <div class="step-dot active" data-step="1"></div>
                <div class="step-dot" data-step="2"></div>
                <div class="step-dot" data-step="3"></div>
                <div class="step-dot" data-step="4"></div>
                <div class="step-dot" data-step="5"></div>
            </div>

            <!-- 步骤1：选择AI服务商 -->
            <div id="step1" class="step active">
                <h3>步骤 1：选择AI服务商</h3>
                <div class="form-group">
                    <label for="provider">请选择AI服务提供商：</label>
                    <select id="provider">
                        <option value="aliyun" ${currentProvider === 'aliyun' ? 'selected' : ''}>阿里云百炼</option>
                        <option value="openai" ${currentProvider === 'openai' ? 'selected' : ''}>OpenAI</option>
                        <option value="siliconflow" ${currentProvider === 'siliconflow' ? 'selected' : ''}>硅基流动</option>
                        <option value="deepseek" ${currentProvider === 'deepseek' ? 'selected' : ''}>DeepSeek</option>
                    </select>
                    <div class="provider-info" id="providerInfo">
                        阿里云百炼：提供通义千问系列大模型
                    </div>
                </div>
                <div class="button-group">
                    <button id="nextStep1">下一步</button>
                </div>
            </div>

            <!-- 步骤2：输入API密钥 -->
            <div id="step2" class="step">
                <h3>步骤 2：配置API密钥</h3>
                <div class="warning">
                    ⚠️ 请注意保护您的API密钥安全，不要分享给他人
                </div>
                <div class="form-group">
                    <label for="apiKey">API密钥：</label>
                    <div class="password-container">
                        <input type="password" id="apiKey" placeholder="请输入您的API密钥" value="${currentApiKey}">
                        <span class="password-toggle" id="togglePassword">👁️</span>
                    </div>
                </div>
                <div class="button-group">
                    <button id="prevStep2" class="secondary">上一步</button>
                    <button id="nextStep2">下一步</button>
                </div>
            </div>

            <!-- 步骤3：选择模型 -->
            <div id="step3" class="step">
                <h3>步骤 3：选择AI模型</h3>
                <div class="form-group">
                    <label>请选择模型：</label>
                    <div class="model-selector" id="modelSelector"></div>
                </div>
                <div class="form-group">
                    <label for="customModel">或自定义模型名称：</label>
                    <input type="text" id="customModel" placeholder="输入自定义模型名称">
                </div>
                <div class="button-group">
                    <button id="prevStep3" class="secondary">上一步</button>
                    <button id="nextStep3">下一步</button>
                </div>
            </div>

            <!-- 步骤4：高级参数设置 -->
            <div id="step4" class="step">
                <h3>步骤 4：高级参数设置（可选）</h3>
                <div class="advanced-settings">
                    <div class="advanced-toggle" onclick="toggleAdvancedSettings()">
                        ▼ 高级设置
                    </div>
                    <div id="advancedSettings" style="display: none;">
                        <div class="form-group">
                            <label for="temperature">温度参数 (0-2)：</label>
                            <input type="number" id="temperature" value="${currentTemperature}" min="0" max="2" step="0.1" placeholder="0.7">
                            <div class="provider-info">控制AI输出的随机性，数值越高越随机</div>
                        </div>
                        
                        <div class="form-group">
                            <label for="maxTokens">最大Token数：</label>
                            <input type="number" id="maxTokens" value="${currentMaxTokens}" min="100" max="4000" placeholder="2000">
                            <div class="provider-info">限制AI分析结果的最大长度</div>
                        </div>
                    </div>
                </div>
                <div class="button-group">
                    <button id="prevStep4" class="secondary">上一步</button>
                    <button id="nextStep4">下一步</button>
                </div>
            </div>

            <!-- 步骤5：测试与分析 -->
            <div id="step5" class="step">
                <h3>步骤 5：测试配置</h3>
                <div class="test-section">
                    <div class="form-group">
                        <label for="testPrompt">测试提示词：</label>
                        <textarea id="testPrompt" rows="4" placeholder="请输入测试提示词，例如：你好，请简单介绍一下你自己">你好，请简单介绍一下你自己</textarea>
                    </div>
                    <div class="button-group">
                        <button id="testConnection">📡 测试连接</button>
                        <button id="analyzeFundsBtn">📊 分析基金组合</button>
                    </div>
                    <div id="testResult" class="test-result" style="display: none;"></div>
                </div>
                <!-- 添加配置成功提示区域 -->
                <div id="successIndicator" class="success-indicator" style="display: none;">
                    <span class="success-icon">✓</span>
                    <span class="success-text">配置已成功保存</span>
                </div>
                <div class="button-group">
                    <button id="prevStep5" class="secondary">上一步</button>
                    <button id="finishConfig">完成配置</button>
                </div>
            </div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            
            // 当前步骤
            let currentStep = 1;
            let selectedModel = '${currentModel}';
            let isPasswordVisible = false;
            
            // 服务商信息和模型
            const providerData = ${JSON.stringify(providerData)};
            
            // 切换密码可见性
            function togglePasswordVisibility() {
                const passwordInput = document.getElementById('apiKey');
                const toggleButton = document.getElementById('togglePassword');
                isPasswordVisible = !isPasswordVisible;
                passwordInput.type = isPasswordVisible ? 'text' : 'password';
                toggleButton.textContent = isPasswordVisible ? '🙈' : '👁️';
            }

            // 更新服务商信息
            function updateProviderInfo() {
                const provider = document.getElementById('provider').value;
                const providerInfo = providerData[provider];
                document.getElementById('providerInfo').textContent = providerInfo.info;
                
                // 更新模型选择器
                updateModelSelector(provider);
            }

            // 更新模型选择器
            function updateModelSelector(provider) {
                const modelSelector = document.getElementById('modelSelector');
                const models = providerData[provider].models;
                
                modelSelector.innerHTML = models.map(model => 
                    \`<div class="model-card \${model.name === selectedModel ? 'selected' : ''}" onclick="selectModel('\${model.name}')">
                        <div class="model-name">\${model.name}</div>
                        <div class="model-desc">\${model.desc}</div>
                    </div>\`
                ).join('');
            }

            // 选择模型
            function selectModel(modelName) {
                selectedModel = modelName;
                const provider = document.getElementById('provider').value;
                updateModelSelector(provider);
                document.getElementById('customModel').value = '';
            }

            // 切换高级设置显示
            function toggleAdvancedSettings() {
                const advancedSettings = document.getElementById('advancedSettings');
                const toggle = document.querySelector('.advanced-toggle');
                if (advancedSettings.style.display === 'none') {
                    advancedSettings.style.display = 'block';
                    toggle.textContent = '▲ 高级设置';
                } else {
                    advancedSettings.style.display = 'none';
                    toggle.textContent = '▼ 高级设置';
                }
            }

            // 切换步骤
            function goToStep(step) {
                // 隐藏所有步骤
                document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
                document.querySelectorAll('.step-dot').forEach(dot => dot.classList.remove('active'));
                
                // 显示目标步骤
                document.getElementById('step' + step).classList.add('active');
                document.querySelector('[data-step="' + step + '"]').classList.add('active');
                
                currentStep = step;
            }

            // 验证步骤
            function validateStep(step) {
                switch(step) {
                    case 1:
                        return document.getElementById('provider').value !== '';
                    case 2:
                        const apiKey = document.getElementById('apiKey').value.trim();
                        return apiKey !== '';
                    case 3:
                        const customModel = document.getElementById('customModel').value.trim();
                        return selectedModel !== '' || customModel !== '';
                    default:
                        return true;
                }
            }

            // 绑定事件
            document.getElementById('provider').addEventListener('change', updateProviderInfo);
            document.getElementById('togglePassword').addEventListener('click', togglePasswordVisibility);
            
            // 步骤导航按钮
            document.getElementById('nextStep1').addEventListener('click', () => {
                if (validateStep(1)) goToStep(2);
            });
            
            document.getElementById('prevStep2').addEventListener('click', () => goToStep(1));
            document.getElementById('nextStep2').addEventListener('click', () => {
                if (validateStep(2)) goToStep(3);
            });
            
            document.getElementById('prevStep3').addEventListener('click', () => goToStep(2));
            document.getElementById('nextStep3').addEventListener('click', () => goToStep(4));
            
            document.getElementById('prevStep4').addEventListener('click', () => goToStep(3));
            document.getElementById('nextStep4').addEventListener('click', () => goToStep(5));
            
            document.getElementById('prevStep5').addEventListener('click', () => goToStep(4));

            // 测试连接
            document.getElementById('testConnection').addEventListener('click', () => {
                const provider = document.getElementById('provider').value;
                const apiKey = document.getElementById('apiKey').value;
                const customModel = document.getElementById('customModel').value.trim();
                const model = customModel || selectedModel;
                const temperature = parseFloat(document.getElementById('temperature').value);
                const maxTokens = parseInt(document.getElementById('maxTokens').value);
                const testPrompt = document.getElementById('testPrompt').value;
                
                const testResult = document.getElementById('testResult');
                testResult.style.display = 'block';
                testResult.className = 'test-result';
                testResult.textContent = '正在测试连接...';
                
                vscode.postMessage({
                    command: 'testConnection',
                    provider: provider,
                    apiKey: apiKey,
                    model: model,
                    temperature: temperature,
                    maxTokens: maxTokens,
                    testPrompt: testPrompt
                });
            });

            // 分析基金组合
            document.getElementById('analyzeFundsBtn').addEventListener('click', () => {
                vscode.postMessage({ command: 'analyzeFunds' });
            });

            // 完成配置
            document.getElementById('finishConfig').addEventListener('click', () => {
                const provider = document.getElementById('provider').value;
                const apiKey = document.getElementById('apiKey').value;
                const customModel = document.getElementById('customModel').value.trim();
                const model = customModel || selectedModel;
                const temperature = parseFloat(document.getElementById('temperature').value);
                const maxTokens = parseInt(document.getElementById('maxTokens').value);

                vscode.postMessage({
                    command: 'saveConfig',
                    provider: provider,
                    apiKey: apiKey,
                    model: model,
                    temperature: temperature,
                    maxTokens: maxTokens
                });
            });

            // 接收来自扩展的消息
            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case 'testResult':
                        const testResult = document.getElementById('testResult');
                        testResult.style.display = 'block';
                        if (message.success) {
                            testResult.className = 'test-result success';
                            testResult.textContent = '✅ 连接测试成功！\\n' + message.result;
                        } else {
                            testResult.className = 'test-result error';
                            testResult.textContent = '❌ 连接测试失败：' + message.error;
                        }
                        break;
                    case 'configSaved':
                        // 隐藏完成配置按钮，显示成功提示
                        document.getElementById('finishConfig').style.display = 'none';
                        const successIndicator = document.getElementById('successIndicator');
                        successIndicator.style.display = 'flex';
                        // 3秒后自动关闭面板
                        setTimeout(() => {
                            vscode.postMessage({ command: 'close' });
                        }, 3000);
                        break;
                }
            });

            // 初始化
            function init() {
                updateProviderInfo();
                
                const provider = document.getElementById('provider').value;
                const models = providerData[provider].models;
                const isModelInList = models.some(m => m.name === '${currentModel}');
                
                if ('${currentModel}' && !isModelInList) {
                    document.getElementById('customModel').value = '${currentModel}';
                }
            }
            init();
        </script>
    </body>
    </html>
  `;

  // 处理webview消息
  panel.webview.onDidReceiveMessage(async (message) => {
    switch (message.command) {
      case 'testConnection':
        try {
          const testResult = await testAIConnection(
            message.provider,
            message.apiKey,
            message.model,
            message.temperature,
            message.maxTokens,
            message.testPrompt
          );

          panel.webview.postMessage({
            command: 'testResult',
            success: true,
            result: testResult
          });
        } catch (error) {
          panel.webview.postMessage({
            command: 'testResult',
            success: false,
            error: (error as Error).message
          });
        }
        break;

      case 'analyzeFunds':
        panel.dispose();
        vscode.commands.executeCommand('fund-helper.analyzeFunds');
        break;

      case 'saveConfig':
        try {
          // 自动保存当前配置，替换旧配置
          await config.update('aiProvider', message.provider, vscode.ConfigurationTarget.Global);
          await config.update('aiApiKey', message.apiKey, vscode.ConfigurationTarget.Global);
          await config.update('aiModel', message.model, vscode.ConfigurationTarget.Global);
          await config.update('aiApiEndpoint', providerData[message.provider].endpoint, vscode.ConfigurationTarget.Global);
          await config.update('aiTemperature', message.temperature, vscode.ConfigurationTarget.Global);
          await config.update('aiMaxTokens', message.maxTokens, vscode.ConfigurationTarget.Global);
          await config.update('enableAIAnalysis', true, vscode.ConfigurationTarget.Global);

          // 清空旧的保存配置列表，只保留当前配置
          await config.update('savedAIConfigs', [], vscode.ConfigurationTarget.Global);

          // 显示成功提示
          vscode.window.showInformationMessage('✅ AI配置已完成并保存！');
          panel.webview.postMessage({ command: 'configSaved' });
        } catch (error) {
          vscode.window.showErrorMessage('保存配置失败: ' + (error as Error).message);
        }
        break;

      case 'close':
        panel.dispose();
        break;
    }
  });
}

// 测试AI连接功能
async function testAIConnection(
  provider: string,
  apiKey: string,
  model: string,
  temperature: number,
  maxTokens: number,
  testPrompt: string
): Promise<string> {
  // 获取当前配置的端点
  const config = vscode.workspace.getConfiguration("fund-helper");
  const endpoint = config.get<string>('aiApiEndpoint', 'https://api.openai.com/v1');

  try {
    let openai: OpenAI;
    let finalModel: string;

    // 根据不同提供商初始化OpenAI客户端
    switch (provider) {
      case 'openai':
        openai = new OpenAI({
          apiKey: apiKey,
          baseURL: endpoint
        });
        finalModel = model;
        break;

      case 'siliconflow':
        openai = new OpenAI({
          apiKey: apiKey,
          baseURL: endpoint
        });
        finalModel = model;
        break;

      case 'aliyun':
        // 阿里云百炼使用兼容模式
        openai = new OpenAI({
          apiKey: apiKey,
          baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
        });
        finalModel = model.startsWith('qwen') ? model : `qwen-${model}`;
        break;

      case 'deepseek':
        openai = new OpenAI({
          apiKey: apiKey,
          baseURL: endpoint
        });
        finalModel = model;
        break;

      default:
        throw new Error(`不支持的AI提供商: ${provider}`);
    }

    console.log(`测试连接 - 调用API: ${openai.baseURL}`);
    console.log(`使用模型: ${finalModel}`);

    const completion = await openai.chat.completions.create({
      model: finalModel,
      messages: [{ role: "user", content: testPrompt }],
      temperature: temperature,
      max_tokens: Math.min(maxTokens, 100) // 测试时限制token数量
    });

    const result = completion.choices[0]?.message?.content || '收到空响应';
    return result;

  } catch (error: any) {
    console.error('测试连接错误:', error);

    if (error.response) {
      const status = error.response.status;
      const errorMessage = error.response.data?.error?.message || '未知错误';

      let detailedError = `API调用失败: ${status}`;
      if (status === 404) {
        detailedError += ' - 请检查API端点地址是否正确';
      } else if (status === 401) {
        detailedError += ' - API密钥无效或权限不足';
      } else if (status === 400) {
        detailedError += ' - 请求参数错误';
      }
      detailedError += ` (${errorMessage})`;

      throw new Error(detailedError);
    } else if (error.request) {
      throw new Error('网络请求失败，请检查网络连接和API配置');
    } else {
      throw new Error(`请求配置错误: ${error.message}`);
    }
  }
}

// 获取服务商信息帮助文本
function getProviderInfo(provider: string): string {
  const infos: Record<string, string> = {
    'openai': 'OpenAI官方API端点: https://api.openai.com/v1',
    'azure-openai': 'Azure OpenAI端点格式: https://your-resource.openai.azure.com/openai/deployments/your-deployment',
    'claude': 'Anthropic Claude端点: https://api.anthropic.com',
    'gemini': 'Google Gemini端点: https://generativelanguage.googleapis.com/v1beta',
    'siliconflow': '硅基流动端点: https://api.siliconflow.cn/v1',
    'aliyun': '阿里云百炼端点: https://dashscope.aliyuncs.com/api/v1',
    'deepseek': 'DeepSeek端点: https://api.deepseek.com/v1',
    'custom': '请输入您自定义的API端点地址'
  };
  return infos[provider] || '';
}

// 显示AI分析结果页面
async function showAIAnalysisPanel(context: vscode.ExtensionContext, fundList: FundInfo[]) {
  // 创建分析面板
  const panel = vscode.window.createWebviewPanel(
    'aiAnalysis',
    'AI基金分析报告',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );

  // 获取上次分析结果
  const lastAnalysis = context.globalState.get<string>('lastAIAnalysis', '');
  const lastAnalysisTime = context.globalState.get<string>('lastAIAnalysisTime', '');

  // 设置HTML内容
  panel.webview.html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI基金分析报告</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                padding: 20px;
                margin: 0;
                line-height: 1.6;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            .header h1 {
                color: var(--vscode-foreground);
                margin-bottom: 10px;
            }
            .timestamp {
                color: var(--vscode-descriptionForeground);
                font-size: 14px;
            }
            .analysis-content {
                background-color: var(--vscode-editor-background);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 5px;
                padding: 20px;
                margin-bottom: 30px;
                white-space: pre-wrap;
                font-family: var(--vscode-editor-font-family);
                line-height: 1.8;
            }
            .placeholder {
                color: var(--vscode-descriptionForeground);
                font-style: italic;
                text-align: center;
                padding: 40px 20px;
            }
            .button-group {
                text-align: center;
                margin-top: 30px;
            }
            button {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 12px 24px;
                border-radius: 5px;
                cursor: pointer;
                font-size: var(--vscode-font-size);
                margin: 0 10px;
            }
            button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            button:disabled {
                background-color: var(--vscode-button-secondaryBackground);
                cursor: not-allowed;
            }
            .loading {
                text-align: center;
                padding: 20px;
                color: var(--vscode-descriptionForeground);
            }
            .spinner {
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 3px solid var(--vscode-progressBar-background);
                border-radius: 50%;
                border-top-color: var(--vscode-progressBar-foreground);
                animation: spin 1s ease-in-out infinite;
                margin-right: 10px;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            .status-message {
                text-align: center;
                padding: 15px;
                margin: 20px 0;
                border-radius: 5px;
            }
            .status-success {
                background-color: var(--vscode-diffEditor-insertedTextBackground);
                border: 1px solid var(--vscode-editorGutter-addedBackground);
            }
            .status-error {
                background-color: var(--vscode-diffEditor-removedTextBackground);
                border: 1px solid var(--vscode-editorGutter-deletedBackground);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🤖 AI基金分析报告</h1>
                ${lastAnalysisTime ? `<div class="timestamp">上次分析时间: ${lastAnalysisTime}</div>` : ''}
            </div>
            
            <div id="analysisContent" class="analysis-content">
                ${lastAnalysis ? lastAnalysis : '<div class="placeholder">暂无分析记录\n\n点击下方"重新分析持仓"按钮开始AI分析</div>'}
            </div>
            
            <div id="statusMessage" class="status-message" style="display: none;"></div>
            
            <div class="button-group">
                <button id="reanalyzeBtn">🔄 重新分析持仓</button>
                <button id="copyBtn">📋 复制报告</button>
                <button id="closeBtn">❌ 关闭</button>
            </div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            
            // 重新分析按钮
            document.getElementById('reanalyzeBtn').addEventListener('click', async () => {
                const btn = document.getElementById('reanalyzeBtn');
                const contentDiv = document.getElementById('analysisContent');
                const statusDiv = document.getElementById('statusMessage');
                
                // 显示加载状态
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner"></span>分析中...';
                contentDiv.innerHTML = '<div class="loading">正在为您生成专业的基金分析报告...</div>';
                statusDiv.style.display = 'none';
                
                // 发送重新分析请求
                vscode.postMessage({ command: 'reanalyze' });
            });
            
            // 复制报告按钮
            document.getElementById('copyBtn').addEventListener('click', () => {
                const content = document.getElementById('analysisContent').innerText;
                if (content && !content.includes('暂无分析记录')) {
                    navigator.clipboard.writeText(content).then(() => {
                        vscode.postMessage({ command: 'copied' });
                    });
                }
            });
            
            // 关闭按钮
            document.getElementById('closeBtn').addEventListener('click', () => {
                vscode.postMessage({ command: 'close' });
            });
            
            // 接收来自扩展的消息
            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case 'analysisComplete':
                        // 显示分析结果
                        document.getElementById('analysisContent').innerHTML = message.result.replace(/\\n/g, '<br>');
                        document.getElementById('reanalyzeBtn').disabled = false;
                        document.getElementById('reanalyzeBtn').innerHTML = '🔄 重新分析持仓';
                        
                        // 显示成功状态
                        const statusDiv = document.getElementById('statusMessage');
                        statusDiv.className = 'status-message status-success';
                        statusDiv.innerHTML = '✅ 分析完成！报告已更新';
                        statusDiv.style.display = 'block';
                        
                        // 3秒后隐藏状态消息
                        setTimeout(() => {
                            statusDiv.style.display = 'none';
                        }, 3000);
                        break;
                        
                    case 'analysisError':
                        // 显示错误信息
                        document.getElementById('analysisContent').innerHTML = '<div class="placeholder">分析失败<br><br>错误信息: ' + message.error + '</div>';
                        document.getElementById('reanalyzeBtn').disabled = false;
                        document.getElementById('reanalyzeBtn').innerHTML = '🔄 重新分析持仓';
                        
                        // 显示错误状态
                        const errorStatusDiv = document.getElementById('statusMessage');
                        errorStatusDiv.className = 'status-message status-error';
                        errorStatusDiv.innerHTML = '❌ 分析失败: ' + message.error;
                        errorStatusDiv.style.display = 'block';
                        break;
                        
                    case 'copied':
                        // 显示复制成功提示
                        const copyStatusDiv = document.getElementById('statusMessage');
                        copyStatusDiv.className = 'status-message status-success';
                        copyStatusDiv.innerHTML = '📋 报告已复制到剪贴板';
                        copyStatusDiv.style.display = 'block';
                        
                        setTimeout(() => {
                            copyStatusDiv.style.display = 'none';
                        }, 2000);
                        break;
                }
            });
        </script>
    </body>
    </html>
  `;

  // 处理webview消息
  panel.webview.onDidReceiveMessage(async (message) => {
    switch (message.command) {
      case 'reanalyze':
        try {
          // 执行AI分析
          const analysisResult = await performAIAnalysis(fundList);

          // 保存分析结果
          const currentTime = new Date().toLocaleString('zh-CN');
          await context.globalState.update('lastAIAnalysis', analysisResult);
          await context.globalState.update('lastAIAnalysisTime', currentTime);

          // 发送分析完成消息
          panel.webview.postMessage({
            command: 'analysisComplete',
            result: analysisResult
          });
        } catch (error) {
          // 发送错误消息
          panel.webview.postMessage({
            command: 'analysisError',
            error: (error as Error).message
          });
        }
        break;

      case 'copied':
        vscode.window.showInformationMessage('分析报告已复制到剪贴板');
        break;

      case 'close':
        panel.dispose();
        break;
    }
  });
}