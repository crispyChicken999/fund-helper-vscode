/**
 * 基金 Webview 视图提供者（侧边栏）
 * 使用 WebviewViewProvider 在侧边栏展示
 */

import * as vscode from "vscode";
import { FundDataManager, ExtendedFundInfo } from "../../fundDataManager";
import { getStyles } from "./style";
import { getGroupScripts } from "./group";
import { getScripts } from "./script";
import { getBatchAdjustScript, getBatchAdjustScript2, getBatchAdjustScript3 } from "./batchAdjust";
import { getBatchAdjustStyles } from "./batchAdjustStyle";
import { getFundGroups, saveFundGroups, getFundGroupOrder, saveFundGroupOrder } from "../../core";

export class FundWebviewViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "fundWebviewView";
  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _updateTimer: ReturnType<typeof setInterval> | undefined;
  private _isVisible: boolean = false;
  private _dataManager: FundDataManager;

  constructor(
    private readonly extensionUri: vscode.Uri,
    dataManager: FundDataManager
  ) {
    this._extensionUri = extensionUri;
    this._dataManager = dataManager;
  }

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): Promise<void> {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, "out"),
        vscode.Uri.joinPath(this._extensionUri, "resources"),
      ],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // 监听来自 Webview 的消息
    webviewView.webview.onDidReceiveMessage((message) =>
      this._handleMessage(message)
    );

    // 先尝试使用缓存数据（如果有）
    const cachedData = this._dataManager.getCachedFundData();
    if (cachedData.length > 0) {
      this._sendDataToWebview(cachedData);
    } else {
      await this._loadFundData();
    }

    // 监听可见性变化
    webviewView.onDidChangeVisibility(() => {
      this._isVisible = webviewView.visible;
      if (webviewView.visible) {
        const cached = this._dataManager.getCachedFundData();
        if (cached.length > 0) {
          this._sendDataToWebview(cached);
        } else {
          this._loadFundData();
        }
        this._setupAutoRefresh();
      } else {
        this._clearAutoRefresh();
      }
    });

    // 处理视图被销毁
    webviewView.onDidDispose(() => {
      this._view = undefined;
      this._isVisible = false;
      this._clearAutoRefresh();
    });

    this._isVisible = true;
    this._setupAutoRefresh();
  }

  public async refresh(): Promise<void> {
    if (!this._view) {
      console.warn("Webview is not initialized or has been disposed");
      return;
    }
    await this._loadFundData();
  }

  /**
   * 重新设置自动刷新（配置变化时调用）
   */
  public refreshAutoRefresh(): void {
    if (this._isVisible) {
      this._setupAutoRefresh();
    }
  }

  public postMessage(message: any): void {
    if (this._view) {
      try {
        this._view.webview.postMessage(message);
      } catch (e) {
        console.warn("无法向 Webview 发送消息，Webview 可能已被销毁:", e);
      }
    }
  }

  private _sendDataToWebview(fundDataList: ExtendedFundInfo[]): void {
    try {
      if (this._view) {
        // 像普通视图一样，在表格视图上也添加数量显示
        this._view.title = `表格视图(${fundDataList.length})`;
      }
    } catch (e) {
      console.warn("更新 Webview 标题失败:", e);
    }

    const mergedData = fundDataList.map((fund) => ({
      code: fund.code,
      name: fund.name,
      gsz: fund.estimatedValue?.toString() || "0",  // QDII基金estimatedValue为null时，gsz应该为"0"而不是netValue
      gszzl: fund.changePercent.toString(),
      dwjz: fund.netValue.toString(),
      gztime: fund.updateTime,
      netValueDate: fund.netValueDate, // 净值日期（上一个交易日的日期）
      num: fund.shares.toString(),
      cost: fund.cost.toString(),
      navChgRt: fund.navChgRt.toString(),
      isRealValue: fund.isRealValue,
      relateTheme: fund.relateTheme || '',
      group: fund.group || '全部'
    }));

    // 获取所有可用分组
    const fundGroups = getFundGroups();
    const fundGroupOrder = getFundGroupOrder();

    const allGroups = fundGroupOrder.length > 0
      ? fundGroupOrder
      : Object.keys(fundGroups);  // 如果没有保存顺序，使用对象键顺序

    this.postMessage({
      command: "updateFundData",
      data: mergedData,
      groups: allGroups,
      fundGroups: fundGroups  // 发送完整的分组数据
    });

    const summary = this._dataManager.calculateAccountSummary(fundDataList);
    this.postMessage({
      command: "updateAccountSummary",
      data: {
        totalAssets: summary.totalAssets.toFixed(2),
        holdingGain: summary.holdingGain.toFixed(2),
        holdingGainRate: summary.holdingGainRate.toFixed(2),
        dailyGain: summary.dailyGain.toFixed(2),
        dailyGainRate: summary.dailyGainRate.toFixed(2),
      },
    });

    this._sendMarketStatus();
    this._sendPrivacyMode();
    this._sendGrayscaleMode();
    this._sendJsonboxName();

    // 刷新完成后检查 pending 买入记录
    this._checkPendingBuys(fundDataList);
  }

  private _sendMarketStatus(): void {
    const { isMarketOpen, isMarketClosed } = require("../../holidayService");
    const now = new Date();
    const marketOpen = isMarketOpen(now);
    const marketClosed = isMarketClosed(now);

    // 获取当前日期（MM-DD 格式）
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayDate = `${month}-${day}`;

    this.postMessage({
      command: "updateMarketStatus",
      data: {
        isOpen: marketOpen,
        isClosed: marketClosed,
        todayDate: todayDate,
      },
    });
  }

  private _sendPrivacyMode(): void {
    const config = vscode.workspace.getConfiguration("fund-helper");
    const privacyMode = config.get<boolean>("privacyMode", false);
    this.postMessage({
      command: "updatePrivacyMode",
      value: privacyMode,
    });
  }

  private _sendGrayscaleMode(): void {
    const config = vscode.workspace.getConfiguration("fund-helper");
    const grayscaleMode = config.get<boolean>("grayscaleMode", false);
    this.postMessage({
      command: "updateGrayscaleMode",
      value: grayscaleMode,
    });
  }

  private _sendJsonboxName(): void {
    const config = vscode.workspace.getConfiguration("fund-helper");
    const jsonboxName = config.get<string>("jsonboxName", "");
    // 初始加载用 initJsonboxName，让 webview 同时更新 savedBoxName 和 input
    this.postMessage({
      command: "initJsonboxName",
      value: jsonboxName,
    });
  }

  private _checkPendingBuys(fundDataList: ExtendedFundInfo[]): void {
    try {
      const { getReadyPendingBuys } = require("../../batchAdjust");
      const netValueDates = new Map<string, string>();
      const netValues = new Map<string, number>();
      for (const f of fundDataList) {
        if (f.netValueDate) netValueDates.set(f.code, f.netValueDate);
        netValues.set(f.code, f.netValue);
      }
      const readyList = getReadyPendingBuys(netValueDates, netValues);
      if (readyList.length > 0) {
        this.postMessage({ command: "batchAdjust_pendingReady", list: readyList });
      }
      // 始终更新 pending 列表（角标）
      const { loadPendingBuys } = require("../../batchAdjust");
      this.postMessage({ command: "batchAdjust_pendingList", list: loadPendingBuys() });
    } catch { /* ignore */ }
  }

  private _sendColumnSettings(): void {
    const config = vscode.workspace.getConfiguration("fund-helper");
    const columnOrder = config.get<string[]>("webviewColumnOrder", [
      "name",
      "estimatedChange",
      "estimatedGain",
      "dailyChange",
      "dailyGain",
      "holdingGain",
      "holdingGainRate",
      "sector",
      "amountShares",
      "cost"
    ]);
    const visibleColumns = config.get<string[]>("webviewVisibleColumns", [
      "name",
      "estimatedChange",
      "estimatedGain",
      "dailyChange",
      "dailyGain",
      "holdingGain",
      "holdingGainRate",
      "sector",
      "amountShares",
      "cost"
    ]);

    this.postMessage({
      command: "updateColumnSettings",
      data: {
        columnOrder,
        visibleColumns,
      },
    });
  }

  private async _saveColumnSettings(data: { columnOrder: string[]; visibleColumns: string[] }): Promise<void> {
    const config = vscode.workspace.getConfiguration("fund-helper");
    await config.update("webviewColumnOrder", data.columnOrder, vscode.ConfigurationTarget.Global);
    await config.update("webviewVisibleColumns", data.visibleColumns, vscode.ConfigurationTarget.Global);

    this.postMessage({
      command: "columnSettingsSaved",
    });

    await this._loadFundData();
  }

  private async _loadFundData(): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration("fund-helper");
      const funds = config.get<
        Array<{ code: string; cost: string; num: string }>
      >("funds", []);

      if (funds.length === 0) {
        this.postMessage({
          command: "updateFundData",
          data: [],
        });
        this.postMessage({
          command: "updateAccountSummary",
          data: {
            totalAssets: "0.00",
            holdingGain: "0.00",
            holdingGainRate: "0.00",
            dailyGain: "0.00",
            dailyGainRate: "0.00",
          },
        });
        this.postMessage({
          command: "refreshStatus",
          text: "暂无数据",
          duration: 3000,
        });
        return;
      }

      const fundDataList = await this._dataManager.refreshFundData();
      this._sendDataToWebview(fundDataList);
    } catch (error) {
      console.error("加载基金数据失败:", error);
      vscode.window.showErrorMessage(`加载基金数据失败: ${error}`);
      this.postMessage({
        command: "refreshStatus",
        text: "刷新失败",
        duration: 3000,
      });
    }
  }

  private async _handleMessage(message: any): Promise<void> {
    switch (message.command) {
      case "switchToTreeView":
        await vscode.commands.executeCommand("fund-helper.switchToTreeView");
        break;

      case "refreshData":
        this.postMessage({
          command: "refreshStatus",
          text: "刷新中...",
          duration: 0,
        });
        await this._loadFundData();
        break;

      case "addFund":
        await vscode.commands.executeCommand("fund-helper.addFund");
        await this._loadFundData();
        break;

      case "openMarket":
        await vscode.commands.executeCommand("fund-helper.openMarket");
        break;

      case "saveOrder":
        if (message.orderedCodes && Array.isArray(message.orderedCodes)) {
          const config = vscode.workspace.getConfiguration("fund-helper");
          const funds = config.get<
            Array<{ code: string; cost: string; num: string; group?: string }>
          >("funds", []);

          // 根据 orderedCodes 对 funds 进行重新排序
          const orderedFunds: any[] = [];
          message.orderedCodes.forEach((code: string) => {
            const found = funds.find(f => f.code === code);
            if (found) {
              orderedFunds.push(found);
            }
          });

          // 添加可能遗漏的（正常情况不会，但为了安全）
          funds.forEach(f => {
            if (!orderedFunds.some(of => of.code === f.code)) {
              orderedFunds.push(f);
            }
          });

          await config.update("funds", orderedFunds, vscode.ConfigurationTarget.Global);
          await this._loadFundData();
        }
        break;

      case "deleteFund":
        if (message.code) {
          const config = vscode.workspace.getConfiguration("fund-helper");

          // 1. 从 funds 列表中删除
          const funds = config.get<
            Array<{ code: string; cost: string; num: string }>
          >("funds", []);
          const newFunds = funds.filter((f) => f.code !== message.code);
          await config.update(
            "funds",
            newFunds,
            vscode.ConfigurationTarget.Global
          );

          // 2. 从所有分组中删除该基金
          const fundGroups = getFundGroups();
          let groupsModified = false;

          for (const groupName of Object.keys(fundGroups)) {
            const originalLength = fundGroups[groupName].length;
            fundGroups[groupName] = fundGroups[groupName].filter((c: string) => c !== message.code);
            if (fundGroups[groupName].length !== originalLength) {
              groupsModified = true;
            }
          }

          if (groupsModified) {
            await saveFundGroups(fundGroups);
          }

          await this._loadFundData();
        }
        break;

      case "viewFundDetail":
        if (message.code) {
          const fundData = this._dataManager.getCachedFundData();
          const fund = fundData.find(f => f.code === message.code);
          if (fund) {
            await vscode.commands.executeCommand("fund-helper.viewFundDetail", {
              fundInfo: fund,
            });
          }
        }
        break;

      case "setGroup":
        if (message.code && message.group !== undefined) {
          const fundGroups = getFundGroups();
          const code = message.code;
          const targetGroup = message.group;

          // 移出原分组
          for (const key of Object.keys(fundGroups)) {
            fundGroups[key] = fundGroups[key].filter((c: string) => c !== code);
          }

          // 加入新分组（如果不是移出分组）
          if (targetGroup) {
            if (!fundGroups[targetGroup]) fundGroups[targetGroup] = [];
            if (!fundGroups[targetGroup].includes(code)) {
              fundGroups[targetGroup].push(code);
            }
          }

          await saveFundGroups(fundGroups);
          await this._loadFundData();

          const groupName = targetGroup || "无分组";
          vscode.window.showInformationMessage(`已将基金 ${code} 移至 ${groupName}`);
        }
        break;

      case "deleteGroup":
        if (message.group) {
          const fundGroups = getFundGroups();
          const groupName = message.group;

          // 删除分组
          delete fundGroups[groupName];

          await saveFundGroups(fundGroups);
          await this._loadFundData();

          vscode.window.showInformationMessage(`已删除分组 "${groupName}"`);
        }
        break;

      case "openGroupManagement":
        await vscode.commands.executeCommand("fund-helper.manageGroups");
        break;

      case "saveGroupManagement":
        if (message.payload) {

          const payload = message.payload as {
            groupOrder?: string[];
            groups?: Record<string, string[]>;
            orderedCodes?: string[];
          };
          const config = vscode.workspace.getConfiguration("fund-helper");
          const funds = config.get<Array<{ code: string; cost: string; num: string }>>(
            "funds",
            []
          );
          const validCodes = new Set(funds.map((f) => f.code));

          const incomingGroups = payload.groups || {};
          const incomingOrder = Array.isArray(payload.groupOrder)
            ? payload.groupOrder.filter((g) => g && g !== "全部")
            : Object.keys(incomingGroups).filter((g) => g !== "全部");


          // 单个基金仅允许属于一个分组，按 groupOrder 的优先级去重。
          const usedCodes = new Set<string>();
          const orderedGroupEntries: Array<[string, string[]]> = [];
          for (const groupName of incomingOrder) {
            const codes = Array.isArray(incomingGroups[groupName])
              ? incomingGroups[groupName]
              : [];
            const normalized: string[] = [];
            for (const code of codes) {
              if (!validCodes.has(code) || usedCodes.has(code)) {
                continue;
              }
              usedCodes.add(code);
              normalized.push(code);
            }
            orderedGroupEntries.push([groupName, normalized]);
          }

          const nextGroups: Record<string, string[]> = {};
          for (const [groupName, codes] of orderedGroupEntries) {
            nextGroups[groupName] = codes;
          }

          // 保存基金顺序
          if (Array.isArray(payload.orderedCodes) && payload.orderedCodes.length > 0) {
            const orderedFunds: Array<{ code: string; cost: string; num: string }> = [];
            for (const code of payload.orderedCodes) {
              const found = funds.find((f) => f.code === code);
              if (found && !orderedFunds.some((x) => x.code === code)) {
                orderedFunds.push(found);
              }
            }
            for (const fund of funds) {
              if (!orderedFunds.some((x) => x.code === fund.code)) {
                orderedFunds.push(fund);
              }
            }
            await config.update("funds", orderedFunds, vscode.ConfigurationTarget.Global);
          }

          // 先保存分组数据到设置
          await saveFundGroups(nextGroups);
          await saveFundGroupOrder(incomingOrder);

          // 重新刷新数据，确保从设置中读取最新的分组信息
          await this._loadFundData();

          vscode.window.showInformationMessage("分组变更已保存");
        }
        break;

      case "addPosition":
        if (message.code) {
          await vscode.commands.executeCommand("fund-helper.addPosition", message.code, message.name);
          await this._loadFundData();
        }
        break;

      case "reducePosition":
        if (message.code) {
          await vscode.commands.executeCommand("fund-helper.reducePosition", message.code, message.name);
          await this._loadFundData();
        }
        break;

      case "editPosition":
        if (message.code) {
          await vscode.commands.executeCommand("fund-helper.editPosition", message.code, message.name);
          await this._loadFundData();
        }
        break;

      case "getColumnSettings":
        this._sendColumnSettings();
        break;

      case "getPrivacyMode":
        this._sendPrivacyMode();
        break;

      case "getGrayscaleMode":
        this._sendGrayscaleMode();
        break;

      case "savePrivacyMode":
        if (message.value !== undefined) {
          const config = vscode.workspace.getConfiguration("fund-helper");
          await config.update("privacyMode", message.value, vscode.ConfigurationTarget.Global);
        }
        break;

      case "saveGrayscaleMode":
        if (message.value !== undefined) {
          const config = vscode.workspace.getConfiguration("fund-helper");
          await config.update("grayscaleMode", message.value, vscode.ConfigurationTarget.Global);
        }
        break;

      case "saveColumnSettings":
        if (message.data) {
          await this._saveColumnSettings(message.data);
        }
        break;

      case "addGroup":
        await vscode.commands.executeCommand("fund-helper.addGroup");
        break;

      case "getJsonboxName":
        {
          const { getJsonboxName } = require("../../core");
          this.postMessage({ command: "initJsonboxName", value: getJsonboxName() });
        }
        break;

      case "saveJsonboxName":
        if (typeof message.value === "string") {
          const { saveJsonboxName } = require("../../core");
          await saveJsonboxName(message.value);
          this.postMessage({ command: "jsonboxNameSaved", value: message.value });
        }
        break;

      case "generateJsonboxName":
        {
          const { generateJsonboxName } = require("../../core");
          const newName = generateJsonboxName();
          // 只回传给 webview 填入 input，不保存到用户配置
          // 用户需要点击"保存"才会真正写入配置
          this.postMessage({ command: "updateJsonboxName", value: newName });
        }
        break;

      case "generateQRCode":
        {
          const text = message.value;
          if (text) {
            try {
              const QRCode = require("qrcode");
              const dataUrl = await QRCode.toDataURL(text, {
                width: 200,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
              });
              this.postMessage({ command: "qrCodeGenerated", value: dataUrl });
            } catch (e: any) {
              console.error("QR code generation failed:", e);
              this.postMessage({ command: "qrCodeGenerated", value: "" });
            }
          }
        }
        break;

      case "syncToCloud":
        {
          const { buildExportPayload, jsonboxUpload, getJsonboxName } = require("../../core");
          const boxName = getJsonboxName();
          if (!boxName) {
            this.postMessage({ command: "syncResult", success: false, message: "请先设置 Box Name" });
            break;
          }
          try {
            const payload = buildExportPayload();
            await jsonboxUpload(boxName, payload);
            this.postMessage({ command: "syncResult", success: true, message: "上传至云端成功" });
          } catch (e: any) {
            this.postMessage({ command: "syncResult", success: false, message: `上传至云端失败: ${e.message}` });
          }
        }
        break;

      case "syncFromCloud":
        {
          const { jsonboxRead, applyImportPayload, getJsonboxName } = require("../../core");
          const boxName = getJsonboxName();
          if (!boxName) {
            this.postMessage({ command: "syncResult", success: false, message: "请先设置 Box Name" });
            break;
          }
          try {
            const records = await jsonboxRead(boxName);
            if (!records || records.length === 0) {
              this.postMessage({ command: "syncResult", success: false, message: "云端暂无数据" });
              break;
            }
            // 取最新一条（最后一条）
            const data = records[records.length - 1];
            const messages = await applyImportPayload(data);
            await this._loadFundData();
            this.postMessage({ command: "syncResult", success: true, message: `同步到本地成功：${messages.join('、')}` });
          } catch (e: any) {
            this.postMessage({ command: "syncResult", success: false, message: `同步到本地失败: ${e.message}` });
          }
        }
        break;

      case "clearRemote":
        {
          const { jsonboxClear, getJsonboxName } = require("../../core");
          const boxName = getJsonboxName();
          if (!boxName) {
            this.postMessage({ command: "syncResult", success: false, message: "请先设置 Box Name" });
            break;
          }
          try {
            await jsonboxClear(boxName);
            this.postMessage({ command: "syncResult", success: true, message: "远程数据已清空" });
          } catch (e: any) {
            this.postMessage({ command: "syncResult", success: false, message: `清空失败: ${e.message}` });
          }
        }
        break;

      case "openJsonLink":
        {
          const { getJsonboxName } = require("../../core");
          const boxName = getJsonboxName();
          if (boxName) {
            vscode.env.openExternal(vscode.Uri.parse(`https://jsonbox.cloud.exo-imaging.com/${boxName}`));
          }
        }
        break;

      case "openWebVersion": {
        const pick = await vscode.window.showQuickPick([
          { label: '🚀 主站 Cloudflare', description: 'fund-helper.ccwu.cc', detail: 'Cloudflare Pages 托管，全球 CDN 加速，速度最快', url: 'https://fund-helper.ccwu.cc' },
          { label: '🔗 备用 GitHub Pages', description: 'crispychicken999.github.io/fund-helper-vscode/', detail: '实时更新，与仓库同步', url: 'https://crispychicken999.github.io/fund-helper-vscode' },
          { label: '⚠️ 已废弃 Netlify', description: 'fund-helper.netlify.app', detail: '已停止更新，请使用主站', url: 'https://fund-helper.netlify.app' }
        ], { placeHolder: '选择要打开的网页版站点' });
        if (pick) {
          vscode.env.openExternal(vscode.Uri.parse((pick as any).url));
        }
        break;
      }

      case "batchAdjust_loadPending": {
        const { loadPendingBuys } = require("../../batchAdjust");
        const list = loadPendingBuys();
        this.postMessage({ command: "batchAdjust_pendingList", list });
        break;
      }

      case "batchAdjust_searchFund": {
        const { searchFund } = require("../../fundService");
        try {
          const results = await searchFund(message.keyword || "");
          this.postMessage({ command: "batchAdjust_searchResult", results, target: message.target });
        } catch {
          this.postMessage({ command: "batchAdjust_searchResult", results: [], target: message.target });
        }
        break;
      }

      case "batchAdjust_getNavHistory": {
        const { getNetValueHistory } = require("../../fundService");
        try {
          const rawList = await getNetValueHistory(message.code, 15);
          this.postMessage({ command: "batchAdjust_navHistory", code: message.code, list: rawList });
        } catch {
          this.postMessage({ command: "batchAdjust_navHistory", code: message.code, list: [], error: true });
        }
        break;
      }

      case "batchAdjust_cancelPending": {
        const { cancelPendingBuy } = require("../../batchAdjust");
        cancelPendingBuy(message.id);
        break;
      }

      case "batchAdjust_confirmBuy": {
        const { addPendingBuy } = require("../../batchAdjust");
        const config = vscode.workspace.getConfiguration("fund-helper");
        const funds = config.get<Array<{ code: string; num: string; cost: string }>>("funds", []);
        const items: Array<{ code: string; name: string; buyDate: string; amount: number; nav: number | null; isPending: boolean }> = message.items || [];

        const immediateItems = items.filter((i: any) => !i.isPending && i.nav);
        const pendingItems = items.filter((i: any) => i.isPending);

        try {
          // 即时加仓
          for (const item of immediateItems) {
            const nav = Number(item.nav);
            const amount = Number(item.amount);
            if (!nav || nav <= 0 || !amount || amount <= 0) continue;
            const addNum = amount / nav;
            const existing = funds.find((f: any) => f.code === item.code);
            const oldNum = existing ? parseFloat(existing.num) || 0 : 0;
            const oldCost = existing ? parseFloat(existing.cost) || 0 : 0;
            const newNum = oldNum + addNum;
            const newCost = newNum > 0 ? (oldCost * oldNum + nav * addNum) / newNum : nav;
            if (!isFinite(newNum) || !isFinite(newCost)) continue;
            if (existing) {
              existing.num = String(newNum);
              existing.cost = String(newCost);
            } else {
              funds.push({ code: item.code, num: String(addNum), cost: String(nav) });
            }
          }
          if (immediateItems.length > 0) {
            await config.update("funds", funds, vscode.ConfigurationTarget.Global);
          }

          // Pending 加仓
          for (const item of pendingItems) {
            addPendingBuy({ code: item.code, name: item.name, buyDate: item.buyDate, amount: item.amount, navOnBuyDate: null, status: 'pending' });
          }

          await this._loadFundData();
          const msgs: string[] = [];
          if (immediateItems.length > 0) msgs.push(`${immediateItems.length} 笔加仓已完成`);
          if (pendingItems.length > 0) msgs.push(`${pendingItems.length} 笔已记录，等待净值更新后确认`);
          this.postMessage({ command: "batchAdjust_buyDone", message: msgs.join("，") });
        } catch (e: any) {
          this.postMessage({ command: "batchAdjust_error", message: e?.message || "加仓失败" });
        }
        break;
      }

      case "batchAdjust_confirmSell": {
        const config = vscode.workspace.getConfiguration("fund-helper");
        const funds = config.get<Array<{ code: string; num: string; cost: string }>>("funds", []);
        const items: Array<{ code: string; sellShares: number }> = message.items || [];

        try {
          for (const item of items) {
            const fund = funds.find((f: any) => f.code === item.code);
            if (!fund) continue;
            const newNum = (parseFloat(fund.num) || 0) - item.sellShares;
            if (newNum < 0) continue;
            fund.num = String(newNum);
          }
          await config.update("funds", funds, vscode.ConfigurationTarget.Global);
          await this._loadFundData();
          this.postMessage({ command: "batchAdjust_sellDone", message: `${items.length} 笔减仓已完成` });
        } catch (e: any) {
          this.postMessage({ command: "batchAdjust_error", message: e?.message || "减仓失败" });
        }
        break;
      }

      case "batchAdjust_confirmPending": {
        const { loadPendingBuys, getReadyPendingBuys, buildPositionUpdates, removePendingBuys } = require("../../batchAdjust");
        const config = vscode.workspace.getConfiguration("fund-helper");
        const funds = config.get<Array<{ code: string; num: string; cost: string }>>("funds", []);
        const ids: string[] = message.ids || [];

        // 重新计算净值：globalState 中存放的 pending 记录 navOnBuyDate 为 null，
        // 必须用最新的缓存数据重新计算，否则 buildPositionUpdates 中 amount/null = Infinity
        const cachedData = this._dataManager.getCachedFundData();
        const netValueDates = new Map<string, string>();
        const netValues = new Map<string, number>();
        for (const f of cachedData) {
          if (f.netValueDate) netValueDates.set(f.code, f.netValueDate);
          netValues.set(f.code, f.netValue);
        }
        const allReady = getReadyPendingBuys(netValueDates, netValues);
        const readyList = allReady.filter((r: any) => ids.includes(r.id));

        try {
          const updates = buildPositionUpdates(readyList, funds);
          for (const upd of updates) {
            const fund = funds.find((f: any) => f.code === upd.code);
            if (fund) { fund.num = String(upd.newNum); fund.cost = String(upd.newCost); }
            else { funds.push({ code: upd.code, num: String(upd.newNum), cost: String(upd.newCost) }); }
          }
          await config.update("funds", funds, vscode.ConfigurationTarget.Global);
          removePendingBuys(ids);
          await this._loadFundData();
          // 更新 pending 角标
          const { loadPendingBuys: lpb } = require("../../batchAdjust");
          this.postMessage({ command: "batchAdjust_pendingList", list: lpb() });
        } catch (e: any) {
          this.postMessage({ command: "batchAdjust_error", message: e?.message || "确认失败" });
        }
        break;
      }

      default:
        console.log("未知消息:", message);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = this._getNonce();

    return [
      '<!DOCTYPE html>',
      '<html lang="zh-CN">',
      '<head>',
      '  <meta charset="UTF-8">',
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
      `  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data:; script-src 'nonce-${nonce}';">`,
      '  <style>',
      ...getStyles(),
      ...getBatchAdjustStyles(),
      '  </style>',
      '  <title>基金助手</title>',
      '</head>',
      '<body>',
      '  <div class="fund-webview-container">',
      '    <div class="column-settings-modal" id="columnSettingsModal" style="display: none;">',
      '      <div class="modal-overlay"></div>',
      '      <div class="modal-content">',
      '        <div class="modal-header">',
      '          <h3>列设置</h3>',
      '          <button class="modal-close" id="btnCloseModal">×</button>',
      '        </div>',
      '        <div class="modal-body">',
      '          <div class="settings-section">',
      '            <h4>列顺序和显示</h4>',
      '            <p class="settings-hint">勾选显示，取消隐藏；拖动或使用箭头调整顺序</p>',
      '            <div class="column-order-list" id="columnOrderList"></div>',
      '          </div>',
      '        </div>',
      '        <div class="modal-footer">',
      '          <button class="btn-secondary" id="btnResetColumns">恢复默认</button>',
      '          <button class="btn-primary" id="btnSaveColumns">保存</button>',
      '        </div>',
      '      </div>',
      '    </div>',
      '    <!-- 云同步弹窗 -->',
      '    <div class="sync-modal" id="syncModal">',
      '      <div class="sync-modal-overlay"></div>',
      '      <div class="sync-modal-content">',
      '        <div class="sync-modal-header">',
      '          <h3>☁ 云同步配置</h3>',
      '          <button class="sync-modal-close" id="syncModalClose">×</button>',
      '        </div>',
      '        <div class="sync-modal-body">',
      '          <!-- Box Name -->',
      '          <div class="sync-section">',
      '            <div class="sync-section-label">Box Name</div>',
      '            <div class="sync-input-row">',
      '              <input class="sync-input" id="syncBoxNameInput" type="text" placeholder="fundhelper_xxxxxxxx" />',
      '            </div>',
      '            <div class="sync-btn-group">',
      '              <button class="sync-btn primary" id="btnSyncSaveBoxName">保存</button>',
      '              <button class="sync-btn" id="btnSyncCancelBoxName">取消</button>',
      '              <button class="sync-btn" id="btnSyncRegenBoxName">重新生成</button>',
      '            </div>',
      '            <div class="sync-tip">字母数字下划线，至少 20 字符</div>',
      '          </div>',
      '          <div class="sync-divider"></div>',
      '          <!-- 同步操作 -->',
      '          <div class="sync-section">',
      '            <div class="sync-section-label">同步操作</div>',
      '            <div class="sync-btn-group">',
      '              <button class="sync-btn primary" id="btnSyncUpload" disabled>⬆ 上传至云端</button>',
      '              <button class="sync-btn" id="btnSyncDownload" disabled>⬇ 同步到本地</button>',
      '              <button class="sync-btn" id="btnSyncOpenJson" disabled>🔗 查看 JSON</button>',
      '              <button class="sync-btn danger" id="btnSyncClearRemote" disabled>清空远程</button>',
      '            </div>',
      '          </div>',
      '          <!-- 状态消息 -->',
      '          <div class="sync-status" id="syncStatusMsg"></div>',
      '          <div class="sync-divider"></div>',
      '          <!-- 二维码 -->',
      '          <div class="sync-section sync-qr-container" id="syncQRSection" style="display:none;">',
      '            <div class="sync-section-label">我的二维码（供其他设备扫描获取 Box Name）</div>',
      '            <img id="syncQRImg" class="sync-qr-canvas" width="160" height="160" alt="QR Code" />',
      '            <div class="sync-qr-hint">其他设备扫描此二维码可获取 Box Name</div>',
      '          </div>',
      '        </div>',
      '      </div>',
      '    </div>',
      '    <div class="account-summary">',
      '      <div class="account-stats">',
      '        <div class="stat-item">',
      '          <div class="stat-label">',
      '            账户资产',
      '            <button class="btn-toggle-privacy" id="btnTogglePrivacy" title="隐藏/显示敏感数据">',
      '              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="icon-eye-open">',
      '                <path fill="currentColor" d="M12 9a3 3 0 0 1 3 3a3 3 0 0 1-3 3a3 3 0 0 1-3-3a3 3 0 0 1 3-3m0-4.5c5 0 9.27 3.11 11 7.5c-1.73 4.39-6 7.5-11 7.5S2.73 16.39 1 12c1.73-4.39 6-7.5 11-7.5M3.18 12a9.821 9.821 0 0 0 17.64 0a9.821 9.821 0 0 0-17.64 0"/>',
      '              </svg>',
      '              <svg width="16" height="16" viewBox="0 0 24 24" class="icon-eye-closed" style="display: none;">',
      '                <path fill="currentColor" d="M2 5.27L3.28 4L20 20.72L18.73 22l-3.08-3.08c-1.15.38-2.37.58-3.65.58c-5 0-9.27-3.11-11-7.5c.69-1.76 1.79-3.31 3.19-4.54zM12 9a3 3 0 0 1 3 3a3 3 0 0 1-.17 1L11 9.17A3 3 0 0 1 12 9m0-4.5c5 0 9.27 3.11 11 7.5a11.8 11.8 0 0 1-4 5.19l-1.42-1.43A9.86 9.86 0 0 0 20.82 12A9.82 9.82 0 0 0 12 6.5c-1.09 0-2.16.18-3.16.5L7.3 5.47c1.44-.62 3.03-.97 4.7-.97M3.18 12A9.82 9.82 0 0 0 12 17.5c.69 0 1.37-.07 2-.21L11.72 15A3.064 3.064 0 0 1 9 12.28L5.6 8.87c-.99.85-1.82 1.91-2.42 3.13"/>',
      '              </svg>',
      '            </button>',
      '            <button class="btn-toggle-grayscale" id="btnToggleGrayscale" title="开启灰色模式">',
      '              <svg width="16" height="16" viewBox="0 0 24 24" class="icon-grayscale-on" style="display: none;">',
      '                <path fill="currentColor" d="M20.49 20.49L3.51 3.51A.996.996 0 1 0 2.1 4.92l3.5 3.5a7.73 7.73 0 0 0-1.6 4.7C4 17.48 7.58 21 12 21c1.75 0 3.36-.56 4.67-1.5l2.4 2.4c.39.39 1.02.39 1.41 0c.4-.39.4-1.02.01-1.41M12 19c-3.31 0-6-2.63-6-5.87c0-1.19.36-2.32 1.02-3.28L12 14.83zM8.38 5.56l2.91-2.87c.39-.38 1.01-.38 1.4 0l4.95 4.87C19.1 8.99 20 10.96 20 13.13c0 1.18-.27 2.29-.74 3.3L12 9.17V4.81L9.8 6.97z"/>',
      '              </svg>',
      '              <svg width="16" height="16" viewBox="0 0 24 24" class="icon-grayscale-off">',
      '                <path fill="currentColor" d="M12 4.81V19c-3.31 0-6-2.63-6-5.87c0-1.56.62-3.03 1.75-4.14zM6.35 7.56C4.9 8.99 4 10.96 4 13.13C4 17.48 7.58 21 12 21s8-3.52 8-7.87c0-2.17-.9-4.14-2.35-5.57L12.7 2.69c-.39-.38-1.01-.38-1.4 0z"/>',
      '              </svg>',
      '            </button>',
      '            <button class="btn-toggle-sync" id="btnOpenSync" title="云同步配置">',
      '              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">',
      '                <path fill="currentColor" d="M6.5 20q-2.28 0-3.89-1.57Q1 16.85 1 14.58q0-1.95 1.17-3.48q1.18-1.53 3.08-1.95q.63-2.3 2.5-3.72Q9.63 4 12 4q2.93 0 4.96 2.04Q19 8.07 19 11q1.73.2 2.86 1.5q1.14 1.28 1.14 3q0 1.88-1.31 3.19T18.5 20H13q-.82 0-1.41-.59Q11 18.83 11 18v-5.15L9.4 14.4L8 13l4-4l4 4l-1.4 1.4l-1.6-1.55V18h5.5q1.05 0 1.77-.73q.73-.72.73-1.77t-.73-1.77Q19.55 13 18.5 13H17v-2q0-2.07-1.46-3.54Q14.08 6 12 6Q9.93 6 8.46 7.46Q7 8.93 7 11h-.5q-1.45 0-2.47 1.03Q3 13.05 3 14.5T4.03 17q1.02 1 2.47 1H9v2m3-7"/>',
      '              </svg>',
      '            </button>',
      '            <button class="btn-toggle-web" id="btnOpenWebVersion" title="打开网页版基金助手">',
      '              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">',
      '                <g fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="4" ry="10"/><path stroke-linecap="round" stroke-linejoin="round" d="M2 12h20"/></g>',
      '              </svg>',
      '            </button>',
      '            <button class="btn-toggle-web" id="btnBatchAdjust" title="批量加减仓" style="position:relative;">',
      '              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">',
      '                <path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h8.925l-2 2H5v14h14v-6.95l2-2V19q0 .825-.587 1.413T19 21zm4-6v-4.25l9.175-9.175q.3-.3.675-.45t.75-.15q.4 0 .763.15t.662.45L22.425 3q.275.3.425.663T23 4.4t-.137.738t-.438.662L13.25 15zM21.025 4.4l-1.4-1.4zM11 13h1.4l5.8-5.8l-.7-.7l-.725-.7L11 11.575zm6.5-6.5l-.725-.7zl.7.7z"/>',
      '              </svg>',
      '            </button>',
      '          </div>',
      '          <div class="stat-value-large" id="totalAssets">0.00</div>',
      '        </div>',
      '        <div class="stat-item-wrapper">',
      '          <div class="stat-item">',
      '            <div class="stat-label">持有收益</div>',
      '            <div class="stat-value" id="holdingAmount">0.00</div>',
      '            <div class="stat-value" id="holdingRate">+0.00%</div>',
      '          </div>',
      '          <div class="stat-item">',
      '            <div class="stat-label">日收益</div>',
      '            <div class="stat-value" id="dailyAmount">0.00</div>',
      '            <div class="stat-value" id="dailyRate">+0.00%</div>',
      '          </div>',
      '        </div>',
      '      </div>',
      '    </div>',
      '    <div class="fund-list">',
      '      <div class="fund-list-header">',
      '        <span class="header-title">持仓基金</span>',
      '        <div class="header-actions">',
      '          <div class="market-status" id="marketStatus">',
      '            <span class="status-dot"></span>',
      '            <span class="status-text">--</span>',
      '          </div>',
      '          <button class="btn-settings" id="btnSettings" title="列设置">',
      '            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">',
      '              <path d="M3.5 2h-1v5h1V2zm6.1 5H6.4L6 6.45v-1L6.4 5h3.2l.4.5v1l-.4.5zm-5 3H1.4L1 9.5v-1l.4-.5h3.2l.4.5v1l-.4.5zm3.9-8h-1v2h1V2zm-1 6h1v6h-1V8zm-4 3h-1v3h1v-3zm7.9 0h3.19l.4-.5v-.95l-.4-.5H11.4l-.4.5v.95l.4.5zm2.1-9h-1v6h1V2zm-1 10h1v2h-1v-2z"/>',
      '            </svg>',
      '            <span>设置</span>',
      '          </button>',
      '          <button class="btn-market" id="btnOpenMarket" title="行情中心">',
      '            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">',
      '              <path d="M1 14h14v1H1v-1zm13-1V6h-2v7h2zm-3 0V3h-2v10h2zm-3 0V0H6v13h2zm-3 0V8H3v5h2z"/>',
      '            </svg>',
      '            <span>行情</span>',
      '          </button>',
      '          <div class="search-box">',
      '            <input type="text" id="searchInput" placeholder="搜索基金..." />',
      '            <button class="btn-clear" id="btnClearSearch" title="清除" style="display: none;">×</button>',
      '          </div>',
      '        </div>',
      '      </div>',
      '      <div class="group-tags-wrapper" style="display: none;">',
      '        <div class="group-tags-container" id="groupTagsContainer"></div>',
      '        <button class="group-tag-settings" id="groupTagSettings" title="分组管理">⚙</button>',
      '      </div>',
      '      <div class="fund-list-content" id="fundListContent">',
      '        <div class="loading">加载中...</div>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <!-- 批量加减仓弹窗 -->',
      '  <div id="batchAdjustOverlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2000;align-items:flex-end;justify-content:center;">',
      '    <div id="batchAdjustPanel" style="background:var(--vscode-editor-background);width:100%;max-width:520px;max-height:82vh;border-radius:12px 12px 0 0;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -4px 24px rgba(0,0,0,.2);"></div>',
      '  </div>',
      '  <!-- Pending 确认弹窗 -->',
      '  <div id="pendingConfirmOverlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2100;align-items:flex-end;justify-content:center;">',
      '    <div id="pendingConfirmPanel" style="background:var(--vscode-editor-background);width:100%;max-width:520px;max-height:80vh;border-radius:12px 12px 0 0;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -4px 24px rgba(0,0,0,.2);"></div>',
      '  </div>',
      `  <script nonce="${nonce}">`,
      ...getGroupScripts(),
      ...getBatchAdjustScript(),
      ...getBatchAdjustScript2(),
      ...getBatchAdjustScript3(),
      ...getScripts(),
      '  </script>',
      '</body>',
      '</html>',
    ].join('\n');
  }

  private _getNonce(): string {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  private _setupAutoRefresh(): void {
    this._clearAutoRefresh();

    const config = vscode.workspace.getConfiguration("fund-helper");
    const interval = config.get<number>("refreshInterval", 60);

    if (interval <= 0 || !this._isVisible) {
      return;
    }

    const effectiveInterval = Math.max(interval, 5);

    this._updateTimer = setInterval(() => {
      if (this._isVisible && this._isDuringTradeTime()) {
        this.postMessage({
          command: "refreshStatus",
          text: "自动刷新中...",
          duration: 0,
        });
        this._loadFundData();
      }
    }, effectiveInterval * 1000);
  }

  private _clearAutoRefresh(): void {
    if (this._updateTimer) {
      clearInterval(this._updateTimer);
      this._updateTimer = undefined;
    }
  }

  private _isDuringTradeTime(): boolean {
    const now = new Date();
    const day = now.getDay();

    if (day === 0 || day === 6) {
      return false;
    }

    const h = now.getHours();
    const m = now.getMinutes();
    const t = h * 100 + m;

    return (t >= 930 && t <= 1130) || (t >= 1300 && t <= 1500);
  }

  public dispose(): void {
    this._clearAutoRefresh();
  }
}
