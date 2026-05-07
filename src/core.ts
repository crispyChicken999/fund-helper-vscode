import * as vscode from "vscode";
import * as fs from "fs";
import { FundConfig } from "./fundModel";
import { searchFund, getNetValueHistory, fetchMarketIndices } from "./fundService";
import { isMarketClosed } from "./holidayService";
import { FundTreeDataProvider, SortMethod, FundTreeItem } from "./sidebar/treeview";
import { updateStatusBar } from "./statusBar";
import { FundDataManager } from "./fundDataManager";
import { FundWebviewViewProvider } from "./sidebar/webview";

let refreshTimer: NodeJS.Timeout | undefined;
let treeDataProvider: FundTreeDataProvider;
let treeView: vscode.TreeView<FundTreeItem>;
let dataManager: FundDataManager | undefined;
let webviewProvider: FundWebviewViewProvider | undefined;

export function initCore(
  provider: FundTreeDataProvider, 
  view: vscode.TreeView<FundTreeItem>,
  fundDataManager?: FundDataManager,
  webviewViewProvider?: FundWebviewViewProvider
) {
  treeDataProvider = provider;
  treeView = view;
  dataManager = fundDataManager;
  webviewProvider = webviewViewProvider;
}

export function deactivateCore() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
}

export async function refreshData() {
  // 并行：刷新基金 + 刷新大盘指数
  const [, indices] = await Promise.all([
    treeDataProvider.refresh(),
    fetchMarketIndices(),
  ]);
  if (indices.length > 0) {
    treeDataProvider.setMarketIndices(indices);
  } else {
    // 如果指数拉取失败，不覆盖已有缓存
  }
  const list = treeDataProvider.fundDataList;
  updateStatusBar(list);
  if (treeView) {
    treeView.title = `基金列表(${list.length})`;
  }
  
  // 同时刷新 webview（如果存在）
  if (webviewProvider) {
    await webviewProvider.refresh();
  }
}

export function getFundConfigs(): FundConfig[] {
  return vscode.workspace
    .getConfiguration("fund-helper")
    .get<FundConfig[]>("funds", []);
}

export function getFundGroups(): Record<string, string[]> {
  return vscode.workspace
    .getConfiguration("fund-helper")
    .get<Record<string, string[]>>("fundGroups", {});
}

export async function saveFundGroups(groups: Record<string, string[]>) {
  await vscode.workspace
    .getConfiguration("fund-helper")
    .update("fundGroups", groups, vscode.ConfigurationTarget.Global);
}

export function getFundGroupOrder(): string[] {
  return vscode.workspace
    .getConfiguration("fund-helper")
    .get<string[]>("fundGroupOrder", []);
}

export async function saveFundGroupOrder(order: string[]) {
  await vscode.workspace
    .getConfiguration("fund-helper")
    .update("fundGroupOrder", order, vscode.ConfigurationTarget.Global);
}
export async function saveFundConfigs(funds: FundConfig[]) {
  await vscode.workspace
    .getConfiguration("fund-helper")
    .update("funds", funds, vscode.ConfigurationTarget.Global);
}

// ======================== 添加/删除 ========================
export async function addFund() {
  const keyword = await vscode.window.showInputBox({
    prompt: "请输入基金名称或代码进行搜索",
    placeHolder: "例如：沪深300、110020",
  });
  if (!keyword) {
    return;
  }

  try {
    const results = await searchFund(keyword);
    if (results.length === 0) {
      vscode.window.showWarningMessage("未找到匹配的基金");
      return;
    }

    const items = results.map((r) => ({
      label: r.name,
      description: r.code,
      code: r.code,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "选择要添加的基金",
      canPickMany: true,
    });
    if (!selected || selected.length === 0) {
      return;
    }

    const funds = getFundConfigs();
    let addedCount = 0;
    for (const s of selected) {
      if (!funds.some((f) => f.code === s.code)) {
        let num = "0";
        let cost = "0";
        
        const numInput = await vscode.window.showInputBox({
          prompt: `请输入 ${s.label} 的持有份额 (选填)`,
          placeHolder: "默认: 0",
        });
        if (numInput === undefined) {
          // 用户按了取消，直接跳过当前基金添加
          continue;
        }
        if (numInput.trim() !== "") {
          num = numInput.trim();
        }

        const costInput = await vscode.window.showInputBox({
          prompt: `请输入 ${s.label} 的持仓成本价 (选填)`,
          placeHolder: "默认: 0",
        });
        if (costInput === undefined) {
          // 用户按了取消
          continue;
        }
        if (costInput.trim() !== "") {
          cost = costInput.trim();
        }

        funds.push({ code: s.code, num, cost });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      await saveFundConfigs(funds);
      await refreshData();
      vscode.window.showInformationMessage(`成功添加 ${addedCount} 个基金`);
    } else {
      vscode.window.showWarningMessage("所选基金已在列表中");
    }
  } catch (e: any) {
    vscode.window.showErrorMessage(`搜索基金失败: ${e.message}`);
  }
}

export async function deleteFund(code: string) {
  const confirm = await vscode.window.showWarningMessage(
    `确认删除基金 ${code}？`,
    { modal: true },
    "确认",
  );
  if (confirm !== "确认") {
    return;
  }

  // 1. 从 funds 列表中删除
  const funds = getFundConfigs().filter((f) => f.code !== code);
  await saveFundConfigs(funds);
  
  // 2. 从所有分组中删除该基金
  const fundGroups = getFundGroups();
  let groupsModified = false;
  
  for (const groupName of Object.keys(fundGroups)) {
    const originalLength = fundGroups[groupName].length;
    fundGroups[groupName] = fundGroups[groupName].filter((c: string) => c !== code);
    if (fundGroups[groupName].length !== originalLength) {
      groupsModified = true;
    }
  }
  
  if (groupsModified) {
    await saveFundGroups(fundGroups);
  }
  
  await refreshData();
  vscode.window.showInformationMessage(`已删除基金 ${code}`);
}

export async function addPosition(code: string, name: string) {
  // 1. 获取最近历史净值供用户选择
  let historyItems: { label: string; description: string; netValue: number }[];
  try {
    const history = await getNetValueHistory(code, 15);
    if (history.length === 0) {
      vscode.window.showWarningMessage("未获取到历史净值数据");
      return;
    }
    historyItems = history.map((h) => ({
      label: h.date,
      description: `净值: ${h.netValue.toFixed(4)}   涨跌: ${h.changePercent >= 0 ? "+" : ""}${h.changePercent.toFixed(2)}%`,
      netValue: h.netValue,
    }));
  } catch (e: any) {
    vscode.window.showErrorMessage(`获取历史净值失败: ${e.message}`);
    return;
  }

  // 2. 选择买入日期的净值
  const selected = await vscode.window.showQuickPick(historyItems, {
    placeHolder: `加仓 ${name} — 请选择买入日期的净值`,
  });
  if (!selected) {
    return;
  }

  // 3. 输入买入金额
  const amountStr = await vscode.window.showInputBox({
    prompt: `加仓 ${name} — 买入净值 ${selected.netValue.toFixed(4)}，请输入买入金额`,
    placeHolder: "例如：1000",
    validateInput: (v) =>
      isNaN(Number(v)) || Number(v) <= 0 ? "请输入正数" : undefined,
  });
  if (!amountStr) {
    return;
  }

  const buyAmount = parseFloat(amountStr);
  const buyPrice = selected.netValue;
  const addNum = buyAmount / buyPrice;

  // 4. 计算加权平均成本并保存
  const funds = getFundConfigs();
  const fund = funds.find((f) => f.code === code);
  if (fund) {
    const oldNum = parseFloat(fund.num) || 0;
    const oldCost = parseFloat(fund.cost) || 0;
    const totalCost = oldCost * oldNum + buyPrice * addNum;
    const newNum = oldNum + addNum;
    const newCost = newNum > 0 ? totalCost / newNum : 0;

    fund.num = newNum.toFixed(2);
    fund.cost = newCost.toFixed(4);
    await saveFundConfigs(funds);
    await refreshData();
    vscode.window.showInformationMessage(
      `加仓成功！份额: ${fund.num}，成本: ${fund.cost}`,
    );
  }
}

export async function reducePosition(code: string, name: string) {
  const funds = getFundConfigs();
  const fund = funds.find((f) => f.code === code);
  if (!fund) {
    return;
  }

  const currentNum = parseFloat(fund.num) || 0;
  if (currentNum <= 0) {
    vscode.window.showWarningMessage("当前无持仓");
    return;
  }

  // 1. 获取最近历史净值
  let historyItems: { label: string; description: string; netValue: number }[];
  try {
    const history = await getNetValueHistory(code, 15);
    historyItems = history.map((h) => ({
      label: h.date,
      description: `净值: ${h.netValue.toFixed(4)}   涨跌: ${h.changePercent >= 0 ? "+" : ""}${h.changePercent.toFixed(2)}%`,
      netValue: h.netValue,
    }));
  } catch {
    historyItems = [];
  }

  // 2. 选择卖出日期（可选，如果获取不到就跳过）
  if (historyItems.length > 0) {
    const selected = await vscode.window.showQuickPick(historyItems, {
      placeHolder: `减仓 ${name} — 请选择卖出日期（用于参考，不影响成本）`,
    });
    if (!selected) {
      return;
    }
  }

  // 3. 输入减仓份额
  const numStr = await vscode.window.showInputBox({
    prompt: `减仓 ${name} — 当前份额 ${currentNum}，请输入减仓份额`,
    placeHolder: "例如：500" + `，最多不能超过${currentNum}`,
    validateInput: (v) => {
      const n = Number(v);
      if (isNaN(n) || n <= 0) {
        return "请输入正数";
      }
      if (n > currentNum) {
        return `不能超过当前份额 ${currentNum}`;
      }
      return undefined;
    },
  });
  if (!numStr) {
    return;
  }

  const newNum = currentNum - parseFloat(numStr);
  fund.num = newNum > 0 ? newNum.toFixed(2) : "0";
  if (newNum <= 0) {
    fund.cost = "0";
  }

  await saveFundConfigs(funds);
  await refreshData();
  vscode.window.showInformationMessage(`减仓成功！剩余份额: ${fund.num}`);
}

export async function editPosition(code: string, name: string) {
  const funds = getFundConfigs();
  const fund = funds.find((f) => f.code === code);
  if (!fund) {
    return;
  }

  const title = `${name}（${code}）`;

  const numStr = await vscode.window.showInputBox({
    prompt: `修改 ${title} — 请输入总份额`,
    value: fund.num,
    validateInput: (v) =>
      isNaN(Number(v)) || Number(v) < 0 ? "请输入非负数" : undefined,
  });
  if (numStr === undefined) {
    return;
  }

  const numVal = parseFloat(numStr);
  let costStr = fund.cost;

  if (numVal > 0) {
    const inputCost = await vscode.window.showInputBox({
      prompt: `修改 ${title} — 请输入成本价`,
      value: fund.cost,
      validateInput: (v) =>
        isNaN(Number(v)) || Number(v) < 0 ? "请输入非负数" : undefined,
    });
    if (inputCost === undefined) {
      return;
    }
    costStr = inputCost;
  } else {
    costStr = "0";
  }

  fund.num = numVal.toFixed(2);
  fund.cost = parseFloat(costStr).toFixed(4);
  await saveFundConfigs(funds);
  await refreshData();
  vscode.window.showInformationMessage(
    `修改成功！份额: ${fund.num}，成本: ${fund.cost}`,
  );
}


export async function exportFund() {
  const config = vscode.workspace.getConfiguration("fund-helper");
  const funds = getFundConfigs();
  const groups = getFundGroups();
  const groupOrder = getFundGroupOrder();
  const columnOrder = config.get<string[]>("webviewColumnOrder", []);
  const visibleColumns = config.get<string[]>("webviewVisibleColumns", []);
  const sortMethod = config.get<string>("sortMethod", "default");
  const refreshInterval = config.get<number>("refreshInterval", 30);
  const hideStatusBar = config.get<boolean>("hideStatusBar", false);
  const defaultViewMode = config.get<string>("defaultViewMode", "tree");
  const privacyMode = config.get<boolean>("privacyMode", false);
  const grayscaleMode = config.get<boolean>("grayscaleMode", false);

  const exportData = {
    funds,
    groups,
    groupOrder,
    columnSettings: {
      columnOrder,
      visibleColumns
    },
    sortMethod,
    refreshInterval,
    hideStatusBar,
    defaultViewMode,
    privacyMode,
    grayscaleMode
  };

  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const defaultFilename = `VSCode_基金助手配置备份_${timestamp}.json`;

  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(defaultFilename),
    filters: { "JSON 文件": ["json"] },
  });

  if (uri) {
    // 自定义 JSON 格式化：
    // - funds 数组中的每个对象在一行显示
    // - groups 的每个数组在一行显示
    // - groupOrder、columnOrder、visibleColumns 数组在一行显示

    const fundsJson = funds.map(f => JSON.stringify(f)).join(',\n    ');

    // groups: 每个分组的数组在一行显示
    const groupsLines: string[] = [];
    for (const [key, value] of Object.entries(groups)) {
      groupsLines.push(`    ${JSON.stringify(key)}: ${JSON.stringify(value)}`);
    }
    const groupsJson = groupsLines.length > 0
      ? '{\n' + groupsLines.join(',\n') + '\n  }'
      : '{}';

    // 数组在一行显示
    const groupOrderJson = JSON.stringify(groupOrder);
    const columnOrderJson = JSON.stringify(columnOrder);
    const visibleColumnsJson = JSON.stringify(visibleColumns);

    const formattedJson = `{
  "funds": [
    ${fundsJson}
  ],
  "groups": ${groupsJson},
  "groupOrder": ${groupOrderJson},
  "columnSettings": {
    "columnOrder": ${columnOrderJson},
    "visibleColumns": ${visibleColumnsJson}
  },
  "sortMethod": ${JSON.stringify(sortMethod)},
  "refreshInterval": ${refreshInterval},
  "hideStatusBar": ${hideStatusBar},
  "defaultViewMode": ${JSON.stringify(defaultViewMode)},
  "privacyMode": ${privacyMode},
  "grayscaleMode": ${grayscaleMode}
}`;

    fs.writeFileSync(uri.fsPath, formattedJson, "utf-8");
    vscode.window.showInformationMessage(`基金列表已导出到 ${uri.fsPath}`);
  }
}

export async function importFund() {
  const uris = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectMany: false,
    filters: { "JSON 文件": ["json"] },
    openLabel: "导入",
  });

  if (!uris || uris.length === 0) {
    return;
  }

  try {
    const content = fs.readFileSync(uris[0].fsPath, "utf-8");
    const data = JSON.parse(content);

    let fundsList: any[] = [];
    let groupsData: Record<string, string[]> = {};
    let groupOrderData: string[] = [];
    let columnSettingsData: { columnOrder?: string[]; visibleColumns?: string[] } = {};
    let sortMethodData: string | undefined;
    let refreshIntervalData: number | undefined;
    let hideStatusBarData: boolean | undefined;
    let defaultViewModeData: string | undefined;
    let privacyModeData: boolean | undefined;
    let grayscaleModeData: boolean | undefined;

    if (Array.isArray(data.funds)) {
      fundsList = data.funds;
      // 导入分组信息
      if (data.groups && typeof data.groups === 'object') {
        groupsData = data.groups;
      }
      // 导入分组顺序
      if (data.groupOrder && Array.isArray(data.groupOrder)) {
        groupOrderData = data.groupOrder;
      }
      // 导入列设置
      if (data.columnSettings && typeof data.columnSettings === 'object') {
        columnSettingsData = data.columnSettings;
      }
      // 导入其他设置
      if (typeof data.sortMethod === 'string') {
        sortMethodData = data.sortMethod;
      }
      if (typeof data.refreshInterval === 'number') {
        refreshIntervalData = data.refreshInterval;
      }
      if (typeof data.hideStatusBar === 'boolean') {
        hideStatusBarData = data.hideStatusBar;
      }
      if (typeof data.defaultViewMode === 'string') {
        defaultViewModeData = data.defaultViewMode;
      }
      if (typeof data.privacyMode === 'boolean') {
        privacyModeData = data.privacyMode;
      }
      if (typeof data.grayscaleMode === 'boolean') {
        grayscaleModeData = data.grayscaleMode;
      }
    } else if (Array.isArray(data)) {
      fundsList = data;
    } else {
      vscode.window.showErrorMessage("JSON 格式不正确，需要包含 funds 数组");
      return;
    }

    // 标准化为 { code, num, cost } 字符串格式
    const newFunds: FundConfig[] = fundsList
      .map((f: any) => ({
        code: String(f.code || ""),
        num: String(f.num ?? f.shares ?? "0"),
        cost: String(f.cost ?? "0"),
      }))
      .filter((f: FundConfig) => f.code.length > 0);

    if (newFunds.length === 0) {
      vscode.window.showWarningMessage("未找到有效的基金数据");
      return;
    }

    const config = vscode.workspace.getConfiguration("fund-helper");

    // 直接覆盖导入，不再询问用户
    await saveFundConfigs(newFunds);

    // 导入分组信息
    if (Object.keys(groupsData).length > 0) {
      await saveFundGroups(groupsData);
    }

    // 导入分组顺序
    if (groupOrderData.length > 0) {
      await saveFundGroupOrder(groupOrderData);
    }

    // 导入列设置
    if (columnSettingsData.columnOrder && Array.isArray(columnSettingsData.columnOrder)) {
      await config.update("webviewColumnOrder", columnSettingsData.columnOrder, vscode.ConfigurationTarget.Global);
    }
    if (columnSettingsData.visibleColumns && Array.isArray(columnSettingsData.visibleColumns)) {
      await config.update("webviewVisibleColumns", columnSettingsData.visibleColumns, vscode.ConfigurationTarget.Global);
    }

    // 导入其他设置
    if (sortMethodData !== undefined) {
      await config.update("sortMethod", sortMethodData, vscode.ConfigurationTarget.Global);
    }
    if (refreshIntervalData !== undefined) {
      await config.update("refreshInterval", refreshIntervalData, vscode.ConfigurationTarget.Global);
    }
    if (hideStatusBarData !== undefined) {
      await config.update("hideStatusBar", hideStatusBarData, vscode.ConfigurationTarget.Global);
    }
    if (defaultViewModeData !== undefined) {
      await config.update("defaultViewMode", defaultViewModeData, vscode.ConfigurationTarget.Global);
    }
    if (privacyModeData !== undefined) {
      await config.update("privacyMode", privacyModeData, vscode.ConfigurationTarget.Global);
    }
    if (grayscaleModeData !== undefined) {
      await config.update("grayscaleMode", grayscaleModeData, vscode.ConfigurationTarget.Global);
    }

    await refreshData();

    // 构建导入成功消息
    const messages: string[] = [`${newFunds.length} 个基金`];
    if (Object.keys(groupsData).length > 0) {
      messages.push(`${Object.keys(groupsData).length} 个分组`);
    }
    if (groupOrderData.length > 0) {
      messages.push('分组顺序');
    }
    if (columnSettingsData.columnOrder || columnSettingsData.visibleColumns) {
      messages.push('列设置');
    }
    const otherSettings: string[] = [];
    if (sortMethodData !== undefined) otherSettings.push('排序方式');
    if (refreshIntervalData !== undefined) otherSettings.push('刷新间隔');
    if (hideStatusBarData !== undefined) otherSettings.push('状态栏设置');
    if (defaultViewModeData !== undefined) otherSettings.push('默认视图');
    if (privacyModeData !== undefined) otherSettings.push('隐私模式');
    if (grayscaleModeData !== undefined) otherSettings.push('灰色模式');
    if (otherSettings.length > 0) {
      messages.push(otherSettings.join('、'));
    }

    vscode.window.showInformationMessage(
      `导入成功！${messages.join('、')}（已覆盖原有数据）`,
    );
  } catch (e: any) {
    vscode.window.showErrorMessage(`导入失败: ${e.message}`);
  }
}

// ======================== 自动刷新 ========================
export function setupAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = undefined;
  }

  const config = vscode.workspace.getConfiguration("fund-helper");
  const interval = config.get<number>("refreshInterval", 60);

  // interval 等于 0 或者小于 5 认为不开启自动刷新，但为了安全最低生效时间是 5 秒
  if (interval <= 0) {
    return;
  }

  const effectiveInterval = Math.max(interval, 5);

  refreshTimer = setInterval(() => {
    if (isDuringTradeTime()) {
      refreshData();
    }
  }, effectiveInterval * 1000);
}

function isDuringTradeTime(): boolean {
  // 如果是休市日（包括周末和节假日），直接返回 false
  if (isMarketClosed()) {
    return false;
  }

  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const cn = new Date(utc + 8 * 3600000);

  const h = cn.getHours();
  const m = cn.getMinutes();
  const t = h * 100 + m;

  return (t >= 930 && t <= 1130) || (t >= 1300 && t <= 1500);
}
