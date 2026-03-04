/**
 * 基金助手 VSCode 插件入口
 */

import * as vscode from "vscode";
import { fetchMarketStat, fetchJsonProxy } from "./fundService";
import { initHolidayData } from "./holidayService";
import {
  FundTreeDataProvider,
  FundTreeItem,
  FundDragAndDropController,
} from "./fundTreeView";
import {
  createStatusBar,
  disposeStatusBar,
} from "./statusBar";
import { analyzeFunds, configureAI } from "./aiService";
import { FundDetailWebview } from "./fundWebview";
import { MarketWebview } from "./marketWebview";
import {
  initCore,
  deactivateCore,
  refreshData,
  addFund,
  deleteFund,
  addPosition,
  reducePosition,
  editPosition,
  exportFund,
  importFund,
  setupAutoRefresh,
} from "./core";

let treeDataProvider: FundTreeDataProvider;
let treeView: vscode.TreeView<FundTreeItem>;

export async function activate(context: vscode.ExtensionContext) {
  // 0️⃣ 初始化节假日数据
  await initHolidayData(context);

  // 1️⃣ 注册 TreeView
  treeDataProvider = new FundTreeDataProvider(context.extensionPath);
  const dragAndDropController = new FundDragAndDropController(treeDataProvider);
  treeView = vscode.window.createTreeView("fundList", {
    treeDataProvider,
    showCollapseAll: true,
    dragAndDropController,
  });
  context.subscriptions.push(treeView);

  initCore(treeDataProvider, treeView);

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
    vscode.commands.registerCommand("fund-helper.deleteFund", (item: FundTreeItem) => item?.fundInfo && deleteFund(item.fundInfo.code)),
    vscode.commands.registerCommand("fund-helper.addPosition", (item: FundTreeItem) => item?.fundInfo && addPosition(item.fundInfo.code, item.fundInfo.name)),
    vscode.commands.registerCommand("fund-helper.reducePosition", (item: FundTreeItem) => item?.fundInfo && reducePosition(item.fundInfo.code, item.fundInfo.name)),
    vscode.commands.registerCommand("fund-helper.editPosition", (item: FundTreeItem) => item?.fundInfo && editPosition(item.fundInfo.code, item.fundInfo.name)),
    vscode.commands.registerCommand("fund-helper.exportFund", () => exportFund()),
    vscode.commands.registerCommand("fund-helper.importFund", () => importFund()),
    vscode.commands.registerCommand("fund-helper.configureAI", () => configureAI()),
    vscode.commands.registerCommand("fund-helper.analyzeFunds", () => analyzeFunds(context, treeDataProvider.fundDataList)),
    vscode.commands.registerCommand("fund-helper.importFunds", () => importFund()),
    vscode.commands.registerCommand("fund-helper.exportFunds", () => exportFund()),
    vscode.commands.registerCommand("fund-helper.toggleStatusBarHide", async () => {
      const config = vscode.workspace.getConfiguration("fund-helper");
      const current = config.get<boolean>("hideStatusBar", false);
      await config.update("hideStatusBar", !current, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(current ? "已显示状态栏收益" : "已隐藏状态栏收益，鼠标悬停可查看详情");
    }),
    vscode.commands.registerCommand(
      "fund-helper.copyFundDetail",
      async (arg: FundTreeItem | string) => {
        let text = "";
        if (typeof arg === "string") {
          text = arg;
        } else if (arg && arg.detailValue) {
          text = arg.detailValue;
        }
        if (text) {
          await vscode.env.clipboard.writeText(text);
          vscode.window.showInformationMessage(`已复制: \n${text}`);
        }
      },
    ),
    vscode.commands.registerCommand(
      "fund-helper.copyFundCode",
      async (code: string) => {
        if (code) {
          await vscode.env.clipboard.writeText(code);
          vscode.window.showInformationMessage(`已复制基金代码: ${code}`);
        }
      },
    ),
    vscode.commands.registerCommand(
      "fund-helper.viewFundDetail",
      (item: FundTreeItem) => item?.fundInfo && FundDetailWebview.createOrShow(context.extensionUri, item.fundInfo)
    ),

    vscode.commands.registerCommand("fund-helper.openMarket", () => {
      MarketWebview.createOrShow(context.extensionUri);
      // 将宿主侧代理请求挂到 webview
      const panel = MarketWebview.currentPanel;
      if (panel) {
        panel.setMessageHandler(async (message: any) => {
          if (message.command === 'fetchProxy') {
            const data = await fetchJsonProxy(message.url);
            panel.postMessage({ command: 'proxyResponse', reqId: message.reqId, data });
          } else if (message.command === 'fetchMarketStat') {
            const stat = await fetchMarketStat();
            panel.postMessage({ command: 'marketStatResponse', reqId: message.reqId, data: stat });
          }
        });
      }
    }),

    vscode.commands.registerCommand("fund-helper.filterFunds", async () => {
      const keyword = await vscode.window.showInputBox({
        prompt: "输入基金名称或代码以进行筛选",
        placeHolder: "例如：沪深300 或 000300 （清空则显示全部）",
        value: treeDataProvider.filterKeyword
      });
      if (keyword !== undefined) {
        treeDataProvider.setFilterKeyword(keyword);
      }
    }),

    vscode.commands.registerCommand("fund-helper.clearFilter", () => treeDataProvider.setFilterKeyword("")),

    vscode.commands.registerCommand("fund-helper.setRefreshInterval", async () => {
      const config = vscode.workspace.getConfiguration("fund-helper");
      const current = config.get<number>("refreshInterval", 60);
      const input = await vscode.window.showInputBox({
        prompt: "设置自动刷新间隔（秒），设置为 0 表示关闭自动刷新",
        value: current.toString(),
        validateInput: (v) => isNaN(Number(v)) || Number(v) < 0 ? "请输入一个非负整数" : undefined
      });
      if (input !== undefined) {
        await config.update("refreshInterval", parseInt(input, 10), vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`自动刷新间隔已设置为 ${input} 秒`);
      }
    }),

    vscode.commands.registerCommand("fund-helper.toggleAutoRefresh", async () => {
      const config = vscode.workspace.getConfiguration("fund-helper");
      const current = config.get<number>("refreshInterval", 60);
      if (current === 0) {
        await config.update("refreshInterval", 60, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`已开启自动刷新，刷新间隔: 60 秒`);
      } else {
        await config.update("refreshInterval", 0, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`已关闭自动刷新`);
      }
    }),

    // 排序快捷命令（inline 按钮用）
    vscode.commands.registerCommand("fund-helper.sortByDefault", () => { treeDataProvider.sortMethod = "default"; }),
    vscode.commands.registerCommand("fund-helper.sortByChangePercent", () => treeDataProvider.toggleSort("changePercent")),
    vscode.commands.registerCommand("fund-helper.sortByDailyGain", () => treeDataProvider.toggleSort("dailyGain")),
    vscode.commands.registerCommand("fund-helper.sortByHoldingAmount", () => treeDataProvider.toggleSort("holdingAmount")),
    vscode.commands.registerCommand("fund-helper.sortByHoldingGain", () => treeDataProvider.toggleSort("holdingGain")),
    vscode.commands.registerCommand("fund-helper.sortByHoldingGainRate", () => treeDataProvider.toggleSort("holdingGainRate")),
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
  deactivateCore();
  disposeStatusBar();
}
