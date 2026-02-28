/**
 * 基金助手 VSCode 插件入口
 */

import * as vscode from "vscode";
import * as fs from "fs";
import { FundConfig } from "./fundModel";
import { searchFund, getNetValueHistory } from "./fundService";
import { initHolidayData, isMarketClosed } from "./holidayService";
import {
  FundTreeDataProvider,
  FundTreeItem,
  SortMethod,
  FundDragAndDropController,
} from "./fundTreeView";
import {
  createStatusBar,
  updateStatusBar,
  disposeStatusBar,
} from "./statusBar";

let refreshTimer: NodeJS.Timeout | undefined;
let treeDataProvider: FundTreeDataProvider;

export async function activate(context: vscode.ExtensionContext) {
  // 0️⃣ 初始化节假日数据
  await initHolidayData(context);

  // 1️⃣ 注册 TreeView
  treeDataProvider = new FundTreeDataProvider(context.extensionPath);
  const dragAndDropController = new FundDragAndDropController(treeDataProvider);
  const treeView = vscode.window.createTreeView("fundList", {
    treeDataProvider,
    showCollapseAll: true,
    dragAndDropController,
  });
  context.subscriptions.push(treeView);

  // 2️⃣ 状态栏
  const statusBar = createStatusBar();
  context.subscriptions.push(statusBar);

  // 3️⃣ 注册命令
  context.subscriptions.push(
    vscode.commands.registerCommand("fund-helper.refreshFund", async () => {
      await refreshData();
      vscode.window.showInformationMessage("基金数据已刷新");
    }),

    vscode.commands.registerCommand("fund-helper.addFund", () => addFund()),
    vscode.commands.registerCommand(
      "fund-helper.deleteFund",
      (item: FundTreeItem) => {
        if (item?.fundInfo) {
          deleteFund(item.fundInfo.code);
        }
      },
    ),
    vscode.commands.registerCommand(
      "fund-helper.addPosition",
      (item: FundTreeItem) => {
        if (item?.fundInfo) {
          addPosition(item.fundInfo.code, item.fundInfo.name);
        }
      },
    ),
    vscode.commands.registerCommand(
      "fund-helper.reducePosition",
      (item: FundTreeItem) => {
        if (item?.fundInfo) {
          reducePosition(item.fundInfo.code, item.fundInfo.name);
        }
      },
    ),
    vscode.commands.registerCommand(
      "fund-helper.editPosition",
      (item: FundTreeItem) => {
        if (item?.fundInfo) {
          editPosition(item.fundInfo.code, item.fundInfo.name);
        }
      },
    ),
    vscode.commands.registerCommand("fund-helper.sortFund", () => sortFund()),
    vscode.commands.registerCommand("fund-helper.exportFund", () =>
      exportFund(),
    ),
    vscode.commands.registerCommand("fund-helper.importFund", () =>
      importFund(),
    ),

    // 排序快捷命令（inline 按钮用）
    vscode.commands.registerCommand("fund-helper.sortByDefault", () => {
      treeDataProvider.sortMethod = "default";
    }),
    vscode.commands.registerCommand("fund-helper.sortByChangePercent", () => {
      treeDataProvider.toggleSort("changePercent");
    }),
    vscode.commands.registerCommand("fund-helper.sortByDailyGain", () => {
      treeDataProvider.toggleSort("dailyGain");
    }),
    vscode.commands.registerCommand("fund-helper.sortByHoldingAmount", () => {
      treeDataProvider.toggleSort("holdingAmount");
    }),
    vscode.commands.registerCommand("fund-helper.sortByHoldingGain", () => {
      treeDataProvider.toggleSort("holdingGain");
    }),
    vscode.commands.registerCommand("fund-helper.sortByHoldingGainRate", () => {
      treeDataProvider.toggleSort("holdingGainRate");
    }),
  );

  // 4️⃣ 监听配置变更
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("fund-helper")) {
        refreshData();
        setupAutoRefresh();
      }
    }),
  );

  // 5️⃣ 初始加载 & 自动刷新
  refreshData();
  setupAutoRefresh();
}

export function deactivate() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  disposeStatusBar();
}

// ======================== 核心 ========================

async function refreshData() {
  await treeDataProvider.refresh();
  updateStatusBar(treeDataProvider.fundDataList);
}

function getFundConfigs(): FundConfig[] {
  return vscode.workspace
    .getConfiguration("fund-helper")
    .get<FundConfig[]>("funds", []);
}

async function saveFundConfigs(funds: FundConfig[]) {
  await vscode.workspace
    .getConfiguration("fund-helper")
    .update("funds", funds, vscode.ConfigurationTarget.Global);
}

// ======================== 添加/删除 ========================

async function addFund() {
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
        funds.push({ code: s.code, num: "0", cost: "0" });
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

async function deleteFund(code: string) {
  const confirm = await vscode.window.showWarningMessage(
    `确认删除基金 ${code}？`,
    { modal: true },
    "确认",
  );
  if (confirm !== "确认") {
    return;
  }

  const funds = getFundConfigs().filter((f) => f.code !== code);
  await saveFundConfigs(funds);
  await refreshData();
  vscode.window.showInformationMessage(`已删除基金 ${code}`);
}

// ======================== 加仓 / 减仓 ========================

async function addPosition(code: string, name: string) {
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

  // 3. 输入加仓份额
  const numStr = await vscode.window.showInputBox({
    prompt: `加仓 ${name} — 买入净值 ${selected.netValue.toFixed(4)}，请输入加仓份额`,
    placeHolder: "例如：1000",
    validateInput: (v) =>
      isNaN(Number(v)) || Number(v) <= 0 ? "请输入正数" : undefined,
  });
  if (!numStr) {
    return;
  }

  const addNum = parseFloat(numStr);
  const buyPrice = selected.netValue;

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

async function reducePosition(code: string, name: string) {
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
    placeHolder: "例如：500",
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

async function editPosition(code: string, name: string) {
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

  const costStr = await vscode.window.showInputBox({
    prompt: `修改 ${title} — 请输入成本价`,
    value: fund.cost,
    validateInput: (v) =>
      isNaN(Number(v)) || Number(v) < 0 ? "请输入非负数" : undefined,
  });
  if (costStr === undefined) {
    return;
  }

  fund.num = parseFloat(numStr).toFixed(2);
  fund.cost = parseFloat(costStr).toFixed(4);
  await saveFundConfigs(funds);
  await refreshData();
  vscode.window.showInformationMessage(
    `修改成功！份额: ${fund.num}，成本: ${fund.cost}`,
  );
}

// ======================== 排序 ========================

async function sortFund() {
  const options: { label: string; method: SortMethod }[] = [
    { label: "默认排序（添加顺序）", method: "default" },
    { label: "涨跌幅 ↓（从高到低）", method: "changePercent_desc" },
    { label: "涨跌幅 ↑（从低到高）", method: "changePercent_asc" },
    { label: "估算收益 ↓（从高到低）", method: "dailyGain_desc" },
    { label: "估算收益 ↑（从低到高）", method: "dailyGain_asc" },
    { label: "持有额 ↓（从高到低）", method: "holdingAmount_desc" },
    { label: "持有额 ↑（从低到高）", method: "holdingAmount_asc" },
    { label: "持有收益 ↓（从高到低）", method: "holdingGain_desc" },
    { label: "持有收益 ↑（从低到高）", method: "holdingGain_asc" },
    { label: "持有收益率 ↓（从高到低）", method: "holdingGainRate_desc" },
    { label: "持有收益率 ↑（从低到高）", method: "holdingGainRate_asc" },
  ];

  const current = treeDataProvider.sortMethod;
  const selected = await vscode.window.showQuickPick(
    options.map((o) => ({
      ...o,
      description: o.method === current ? "（当前）" : "",
    })),
    { placeHolder: "选择排序方式" },
  );

  if (selected) {
    treeDataProvider.sortMethod = (selected as any).method;
  }
}

// ======================== 导入 / 导出 ========================

async function importFund() {
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
    if (Array.isArray(data.funds)) {
      fundsList = data.funds;
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

    // 询问是否覆盖
    const choice = await vscode.window.showQuickPick(
      [
        { label: "合并导入（保留现有基金）", mode: "merge" },
        { label: "覆盖导入（替换全部基金）", mode: "replace" },
      ],
      { placeHolder: `发现 ${newFunds.length} 个基金，请选择导入方式` },
    );
    if (!choice) {
      return;
    }

    let finalFunds: FundConfig[];
    if ((choice as any).mode === "replace") {
      finalFunds = newFunds;
    } else {
      // 合并：新增不存在的，已存在的更新份额和成本
      finalFunds = [...getFundConfigs()];
      for (const nf of newFunds) {
        const existing = finalFunds.find((f) => f.code === nf.code);
        if (existing) {
          existing.num = nf.num;
          existing.cost = nf.cost;
        } else {
          finalFunds.push(nf);
        }
      }
    }

    await saveFundConfigs(finalFunds);
    await refreshData();
    vscode.window.showInformationMessage(
      `导入成功！共 ${finalFunds.length} 个基金`,
    );
  } catch (e: any) {
    vscode.window.showErrorMessage(`导入失败: ${e.message}`);
  }
}

async function exportFund() {
  const funds = getFundConfigs();
  const exportData = { funds };

  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file("fund-list.json"),
    filters: { "JSON 文件": ["json"] },
  });

  if (uri) {
    fs.writeFileSync(uri.fsPath, JSON.stringify(exportData, null, 2), "utf-8");
    vscode.window.showInformationMessage(`基金列表已导出到 ${uri.fsPath}`);
  }
}

// ======================== 自动刷新 ========================

function setupAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  const config = vscode.workspace.getConfiguration("fund-helper");
  const interval = config.get<number>("refreshInterval", 60);

  refreshTimer = setInterval(() => {
    if (isDuringTradeTime()) {
      refreshData();
    }
  }, interval * 1000);
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
