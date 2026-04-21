/**
 * 基金 Webview 视图提供者（侧边栏）
 * 使用 WebviewViewProvider 在侧边栏展示
 */

import * as vscode from "vscode";
import { FundDataManager, ExtendedFundInfo } from "../../fundDataManager";
import { getStyles } from "./style";
import { getGroupScripts } from "./group";
import { getScripts } from "./script";
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
    console.log('[Webview] _sendDataToWebview called, fundDataList length:', fundDataList.length);
    
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
      gsz: fund.estimatedValue?.toString() || fund.netValue.toString(),
      gszzl: fund.changePercent.toString(),
      dwjz: fund.netValue.toString(),
      gztime: fund.updateTime,
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
    console.log('[Webview] fundGroups:', fundGroups);
    console.log('[Webview] fundGroupOrder:', fundGroupOrder);
    
    const allGroups = fundGroupOrder.length > 0 
      ? fundGroupOrder 
      : Object.keys(fundGroups);  // 如果没有保存顺序，使用对象键顺序

    console.log('[Webview] Sending to frontend - allGroups:', allGroups);
    console.log('[Webview] Sending to frontend - fundGroups:', fundGroups);

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
  }

  private _sendMarketStatus(): void {
    const { isMarketOpen, isMarketClosed } = require("../../holidayService");
    const now = new Date();
    const marketOpen = isMarketOpen(now);
    const marketClosed = isMarketClosed(now);

    this.postMessage({
      command: "updateMarketStatus",
      data: {
        isOpen: marketOpen,
        isClosed: marketClosed,
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
          console.log('[Webview] saveGroupManagement received, payload:', message.payload);
          
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

          console.log('[Webview] incomingGroups:', incomingGroups);
          console.log('[Webview] incomingOrder:', incomingOrder);

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

          console.log('[Webview] nextGroups to save:', nextGroups);
          console.log('[Webview] incomingOrder to save:', incomingOrder);

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
            console.log('[Webview] Saving orderedFunds, count:', orderedFunds.length);
            await config.update("funds", orderedFunds, vscode.ConfigurationTarget.Global);
          }

          // 先保存分组数据到设置
          console.log('[Webview] Saving fundGroups...');
          await saveFundGroups(nextGroups);
          console.log('[Webview] Saving fundGroupOrder...');
          await saveFundGroupOrder(incomingOrder);
          
          console.log('[Webview] Reloading fund data...');
          // 重新刷新数据，确保从设置中读取最新的分组信息
          await this._loadFundData();
          
          console.log('[Webview] Group management saved successfully');
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

      case "savePrivacyMode":
        if (message.value !== undefined) {
          const config = vscode.workspace.getConfiguration("fund-helper");
          await config.update("privacyMode", message.value, vscode.ConfigurationTarget.Global);
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
      '    <div class="account-summary">',
      '      <div class="account-stats">',
      '        <div class="stat-item">',
      '          <div class="stat-label">',
      '            账户资产',
      '            <button class="btn-toggle-privacy" id="btnTogglePrivacy" title="隐藏/显示敏感数据">',
      '              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="icon-eye-open">',
      '                <path d="M8 3C4.5 3 1.5 5.5 0 8c1.5 2.5 4.5 5 8 5s6.5-2.5 8-5c-1.5-2.5-4.5-5-8-5zm0 8c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/>',
      '                <circle cx="8" cy="8" r="1.5"/>',
      '              </svg>',
      '              <svg width="16" height="16" viewBox="0 0 32 32" class="icon-eye-closed" style="display: none;">',
      '                <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 16a5 5 0 0 1-5 5m-5-5a5 5 0 0 1 5-5m-3 13.654A13.4 13.4 0 0 0 16 25c7.18 0 13-6 13-9c0-1.336-1.155-3.268-3.071-5M19.5 7.47A13.5 13.5 0 0 0 16 7C8.82 7 3 13 3 16c0 1.32 1.127 3.22 3 4.935M7 25L25 7"/>',
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
      `  <script nonce="${nonce}">`,
      ...getGroupScripts(),
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
