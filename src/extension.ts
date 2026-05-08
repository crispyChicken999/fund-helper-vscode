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
} from "./sidebar/treeview";
import {
  createStatusBar,
  disposeStatusBar,
} from "./statusBar";
import { analyzeFunds, configureAI } from "./aiService";
import { FundDetailWebview } from "./detail";
import { MarketWebview } from "./marketWebview";
import { DonateWebview } from "./donate";
import { FundWebviewViewProvider } from "./sidebar/webview";
import { FundDataManager } from "./fundDataManager";
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
  getFundGroups,
  saveFundGroups,
} from "./core";

let treeDataProvider: FundTreeDataProvider;
let treeView: vscode.TreeView<FundTreeItem>;
let webviewViewProvider: FundWebviewViewProvider;
let fundDataManager: FundDataManager;

export async function activate(context: vscode.ExtensionContext) {
  // 0️⃣ 初始化节假日数据
  await initHolidayData(context);

  // 0.5️⃣ 创建共享数据管理器
  fundDataManager = new FundDataManager();

  // 1️⃣ 注册 TreeView - 使用共享数据管理器
  treeDataProvider = new FundTreeDataProvider(context.extensionPath, fundDataManager);
  const dragAndDropController = new FundDragAndDropController(treeDataProvider);
  treeView = vscode.window.createTreeView("fundList", {
    treeDataProvider,
    showCollapseAll: true,
    dragAndDropController,
  });
  context.subscriptions.push(treeView);

  // 1.5️⃣ 注册 WebviewView（新视图）- 使用共享数据管理器
  webviewViewProvider = new FundWebviewViewProvider(context.extensionUri, fundDataManager);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      FundWebviewViewProvider.viewType,
      webviewViewProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
  );

  initCore(treeDataProvider, treeView, fundDataManager, webviewViewProvider);

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
    vscode.commands.registerCommand("fund-helper.deleteFund", (item: FundTreeItem | string) => {
      const code = typeof item === 'string' ? item : item?.fundInfo?.code;
      return code && deleteFund(code);
    }),
    vscode.commands.registerCommand("fund-helper.addPosition", (itemOrCode: FundTreeItem | string, name?: string) => {
      if (typeof itemOrCode === 'string') {
        // 从 webview 调用：第一个参数是 code，第二个参数是 name
        return addPosition(itemOrCode, name || '');
      } else {
        // 从 TreeView 调用：第一个参数是 FundTreeItem
        return itemOrCode?.fundInfo && addPosition(itemOrCode.fundInfo.code, itemOrCode.fundInfo.name);
      }
    }),
    vscode.commands.registerCommand("fund-helper.reducePosition", (itemOrCode: FundTreeItem | string, name?: string) => {
      if (typeof itemOrCode === 'string') {
        return reducePosition(itemOrCode, name || '');
      } else {
        return itemOrCode?.fundInfo && reducePosition(itemOrCode.fundInfo.code, itemOrCode.fundInfo.name);
      }
    }),
    vscode.commands.registerCommand("fund-helper.editPosition", (itemOrCode: FundTreeItem | string, name?: string) => {
      if (typeof itemOrCode === 'string') {
        return editPosition(itemOrCode, name || '');
      } else {
        return itemOrCode?.fundInfo && editPosition(itemOrCode.fundInfo.code, itemOrCode.fundInfo.name);
      }
    }),
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
    vscode.commands.registerCommand("fund-helper.setStatusBarAmountVisible", async () => {
      const config = vscode.workspace.getConfiguration("fund-helper");
      await config.update("hideStatusBar", false, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage("已显示状态栏收益");
    }),
    vscode.commands.registerCommand("fund-helper.setStatusBarAmountVisibleCurrent", async () => {
      await vscode.commands.executeCommand("fund-helper.setStatusBarAmountVisible");
    }),
    vscode.commands.registerCommand("fund-helper.setStatusBarAmountHidden", async () => {
      const config = vscode.workspace.getConfiguration("fund-helper");
      await config.update("hideStatusBar", true, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage("已隐藏状态栏收益，鼠标悬停可查看详情");
    }),
    vscode.commands.registerCommand("fund-helper.setStatusBarAmountHiddenCurrent", async () => {
      await vscode.commands.executeCommand("fund-helper.setStatusBarAmountHidden");
    }),
    vscode.commands.registerCommand("fund-helper.togglePrivacyMode", async () => {
      const config = vscode.workspace.getConfiguration("fund-helper");
      const current = config.get<boolean>("privacyMode", false);
      await config.update("privacyMode", !current, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(current ? "已关闭隐私模式" : "已开启隐私模式");
    }),
    vscode.commands.registerCommand("fund-helper.setPrivacyModeOn", async () => {
      const config = vscode.workspace.getConfiguration("fund-helper");
      await config.update("privacyMode", true, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage("已开启隐私模式");
    }),
    vscode.commands.registerCommand("fund-helper.setPrivacyModeOnCurrent", async () => {
      await vscode.commands.executeCommand("fund-helper.setPrivacyModeOn");
    }),
    vscode.commands.registerCommand("fund-helper.setPrivacyModeOff", async () => {
      const config = vscode.workspace.getConfiguration("fund-helper");
      await config.update("privacyMode", false, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage("已关闭隐私模式");
    }),
    vscode.commands.registerCommand("fund-helper.setPrivacyModeOffCurrent", async () => {
      await vscode.commands.executeCommand("fund-helper.setPrivacyModeOff");
    }),
    vscode.commands.registerCommand("fund-helper.toggleGrayscaleMode", async () => {
      const config = vscode.workspace.getConfiguration("fund-helper");
      const current = config.get<boolean>("grayscaleMode", false);
      await config.update("grayscaleMode", !current, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(current ? "已关闭灰色模式" : "已开启灰色模式");
    }),
    vscode.commands.registerCommand("fund-helper.setGrayscaleModeOn", async () => {
      const config = vscode.workspace.getConfiguration("fund-helper");
      await config.update("grayscaleMode", true, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage("已开启灰色模式");
    }),
    vscode.commands.registerCommand("fund-helper.setGrayscaleModeOnCurrent", async () => {
      await vscode.commands.executeCommand("fund-helper.setGrayscaleModeOn");
    }),
    vscode.commands.registerCommand("fund-helper.setGrayscaleModeOff", async () => {
      const config = vscode.workspace.getConfiguration("fund-helper");
      await config.update("grayscaleMode", false, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage("已关闭灰色模式");
    }),
    vscode.commands.registerCommand("fund-helper.setGrayscaleModeOffCurrent", async () => {
      await vscode.commands.executeCommand("fund-helper.setGrayscaleModeOff");
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
      (item: FundTreeItem) =>
        item?.fundInfo &&
        FundDetailWebview.createOrShow(
          context.extensionUri,
          item.fundInfo,
          async (code: string) => {
            await fundDataManager.refreshFundData();
            return fundDataManager.getCachedFundData().find((fund) => fund.code === code);
          },
        )
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

    vscode.commands.registerCommand("fund-helper.addGroup", async () => {
      const groupName = await vscode.window.showInputBox({
        prompt: "请输入新分组名称",
        placeHolder: "例如：自定组合A"
      });
      if (!groupName) return;
      
      const fundGroups = getFundGroups();
      if (fundGroups[groupName] !== undefined) {
        vscode.window.showErrorMessage(`分组 "${groupName}" 已存在`);
        return;
      }
      
      fundGroups[groupName] = [];
      await saveFundGroups(fundGroups);
      await refreshData();
      vscode.window.showInformationMessage(`成功添加分组: ${groupName}`);
    }),

    vscode.commands.registerCommand("fund-helper.setFundGroup", async (code: string) => {
      // 如果没有传code进来，则需要让用户先选基金
      if (!code) return;
      const fundGroups = getFundGroups();
      const groups = Object.keys(fundGroups);
      const items = [{ label: '无分组 (移出当前组)', description: '' }, ...groups.map(g => ({ label: g }))];
      
      const picked = await vscode.window.showQuickPick(items, { placeHolder: '选择要移入的分组' });
      if (!picked) return;

      // 移出原分组
      for (const key of Object.keys(fundGroups)) {
        fundGroups[key] = fundGroups[key].filter((c: string) => c !== code);
      }

      // 加入新分组
      if (picked.label !== '无分组 (移出当前组)') {
        if (!fundGroups[picked.label]) fundGroups[picked.label] = [];
        if (!fundGroups[picked.label].includes(code)) {
          fundGroups[picked.label].push(code);
        }
      }

      await saveFundGroups(fundGroups);
      await refreshData();
      vscode.window.showInformationMessage(`已将基金 ${code} 移至 ${picked.label}`);
    }),

    vscode.commands.registerCommand("fund-helper.manageGroups", async () => {
      const fundGroups = getFundGroups();
      const groups = Object.keys(fundGroups);
      
      const actions = [
        { label: '$(add) 添加新分组', action: 'add' },
        { label: '$(edit) 重命名分组', action: 'rename' },
        { label: '$(trash) 删除分组', action: 'delete' },
        { label: '$(arrow-both) 调整分组顺序', action: 'reorder' },
      ];
      
      const picked = await vscode.window.showQuickPick(actions, { placeHolder: '选择操作' });
      if (!picked) return;
      
      switch (picked.action) {
        case 'add':
          await vscode.commands.executeCommand("fund-helper.addGroup");
          break;
          
        case 'rename':
          const groupToRename = await vscode.window.showQuickPick(groups, { placeHolder: '选择要重命名的分组' });
          if (!groupToRename) return;
          
          const newName = await vscode.window.showInputBox({
            prompt: '输入新的分组名称',
            value: groupToRename,
            validateInput: (value) => {
              if (!value) return '分组名称不能为空';
              if (value !== groupToRename && groups.includes(value)) return '分组名称已存在';
              return null;
            }
          });
          
          if (newName && newName !== groupToRename) {
            fundGroups[newName] = fundGroups[groupToRename];
            delete fundGroups[groupToRename];
            await saveFundGroups(fundGroups);
            await refreshData();
            vscode.window.showInformationMessage(`已将分组 "${groupToRename}" 重命名为 "${newName}"`);
          }
          break;
          
        case 'delete':
          const groupToDelete = await vscode.window.showQuickPick(groups, { placeHolder: '选择要删除的分组' });
          if (!groupToDelete) return;
          
          const confirm = await vscode.window.showWarningMessage(
            `确定要删除分组 "${groupToDelete}" 吗？该分组下的基金将变为无分组状态。`,
            { modal: true },
            '确定'
          );
          
          if (confirm === '确定') {
            delete fundGroups[groupToDelete];
            await saveFundGroups(fundGroups);
            await refreshData();
            vscode.window.showInformationMessage(`已删除分组 "${groupToDelete}"`);
          }
          break;
          
        case 'reorder':
          vscode.window.showInformationMessage('分组顺序调整功能开发中...');
          break;
      }
    }),

    vscode.commands.registerCommand("fund-helper.openDonate", () => {
      DonateWebview.createOrShow();
    }),

    // 模式切换命令
    vscode.commands.registerCommand("fund-helper.switchToWebview", async () => {
      // 保存用户选择
      const config = vscode.workspace.getConfiguration("fund-helper");
      await config.update("defaultViewMode", "webview", vscode.ConfigurationTarget.Global);
      vscode.commands.executeCommand("fundWebviewView.focus");
      vscode.window.showInformationMessage("已切换到表格视图");
    }),

    vscode.commands.registerCommand("fund-helper.switchToTreeView", async () => {
      // 保存用户选择
      const config = vscode.workspace.getConfiguration("fund-helper");
      await config.update("defaultViewMode", "tree", vscode.ConfigurationTarget.Global);
      vscode.commands.executeCommand("fundList.focus");
      vscode.window.showInformationMessage("已切换到普通视图");
    }),

    vscode.commands.registerCommand("fund-helper.refreshWebview", async () => {
      await webviewViewProvider.refresh();
      vscode.window.showInformationMessage("数据已刷新");
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
    vscode.commands.registerCommand("fund-helper.setAutoRefreshOn", async () => {
      const config = vscode.workspace.getConfiguration("fund-helper");
      const current = config.get<number>("refreshInterval", 60);
      const next = current > 0 ? current : 60;
      await config.update("refreshInterval", next, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(`已开启自动刷新，刷新间隔: ${next} 秒`);
    }),
    vscode.commands.registerCommand("fund-helper.setAutoRefreshOnCurrent", async () => {
      await vscode.commands.executeCommand("fund-helper.setAutoRefreshOn");
    }),
    vscode.commands.registerCommand("fund-helper.setAutoRefreshOff", async () => {
      const config = vscode.workspace.getConfiguration("fund-helper");
      await config.update("refreshInterval", 0, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage("已关闭自动刷新");
    }),
    vscode.commands.registerCommand("fund-helper.setAutoRefreshOffCurrent", async () => {
      await vscode.commands.executeCommand("fund-helper.setAutoRefreshOff");
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
        webviewViewProvider.refresh();
        webviewViewProvider.refreshAutoRefresh(); // 重新设置 WebviewView 的自动刷新
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
