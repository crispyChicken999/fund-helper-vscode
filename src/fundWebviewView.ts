/**
 * 基金 Webview 视图提供者（侧边栏）
 * 使用 WebviewViewProvider 在侧边栏展示
 */

import * as vscode from "vscode";
import { FundDataManager, ExtendedFundInfo } from "./fundDataManager";

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
      // 使用缓存数据立即显示
      this._sendDataToWebview(cachedData);
    } else {
      // 没有缓存，加载新数据
      await this._loadFundData();
    }

    // 监听可见性变化
    webviewView.onDidChangeVisibility(() => {
      this._isVisible = webviewView.visible;
      if (webviewView.visible) {
        // 可见时，如果有缓存就用缓存，否则加载
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

    // 设置自动刷新
    this._isVisible = true;
    this._setupAutoRefresh();
  }

  /**
   * 刷新数据
   */
  public async refresh(): Promise<void> {
    await this._loadFundData();
  }

  /**
   * 发送消息到 Webview
   */
  public postMessage(message: any): void {
    this._view?.webview.postMessage(message);
  }

  /**
   * 发送数据到 Webview
   */
  private _sendDataToWebview(fundDataList: ExtendedFundInfo[]): void {
    // 转换数据格式
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
    }));

    // 发送数据到前端
    this.postMessage({
      command: "updateFundData",
      data: mergedData,
    });

    // 计算并发送账户汇总数据
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

    // 发送市场状态
    this._sendMarketStatus();
  }

  /**
   * 发送市场状态到前端
   */
  private _sendMarketStatus(): void {
    const { isMarketOpen, isMarketClosed } = require("./holidayService");
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

  /**
   * 发送列设置到前端
   */
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

  /**
   * 保存列设置
   */
  private async _saveColumnSettings(data: { columnOrder: string[]; visibleColumns: string[] }): Promise<void> {
    const config = vscode.workspace.getConfiguration("fund-helper");
    await config.update("webviewColumnOrder", data.columnOrder, vscode.ConfigurationTarget.Global);
    await config.update("webviewVisibleColumns", data.visibleColumns, vscode.ConfigurationTarget.Global);
    
    this.postMessage({
      command: "columnSettingsSaved",
    });
    
    // 重新加载数据以应用新设置
    await this._loadFundData();
  }

  /**
   * 加载基金数据
   */
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

      // 使用共享数据管理器获取数据
      const fundDataList = await this._dataManager.refreshFundData();

      // 发送数据到前端
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

  /**
   * 处理来自 Webview 的消息
   */
  private async _handleMessage(message: any): Promise<void> {
    switch (message.command) {
      case "switchToTreeView":
        // 切换回 TreeView
        await vscode.commands.executeCommand("fund-helper.switchToTreeView");
        break;

      case "refreshData":
        // 刷新数据
        this.postMessage({
          command: "refreshStatus",
          text: "刷新中...",
          duration: 0,
        });
        await this._loadFundData();
        break;

      case "addFund":
        // 添加基金
        await vscode.commands.executeCommand("fund-helper.addFund");
        await this._loadFundData();
        break;

      case "openMarket":
        // 打开行情中心
        await vscode.commands.executeCommand("fund-helper.openMarket");
        break;

      case "deleteFund":
        // 删除基金
        if (message.code) {
          const config = vscode.workspace.getConfiguration("fund-helper");
          const funds = config.get<
            Array<{ code: string; cost: string; num: string }>
          >("funds", []);
          const newFunds = funds.filter((f) => f.code !== message.code);
          await config.update(
            "funds",
            newFunds,
            vscode.ConfigurationTarget.Global
          );
          await this._loadFundData();
        }
        break;

      case "viewFundDetail":
        // 查看基金详情
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

      case "addPosition":
        // 加仓
        if (message.code) {
          await vscode.commands.executeCommand("fund-helper.addPosition", message.code, message.name);
          await this._loadFundData();
        }
        break;

      case "reducePosition":
        // 减仓
        if (message.code) {
          await vscode.commands.executeCommand("fund-helper.reducePosition", message.code, message.name);
          await this._loadFundData();
        }
        break;

      case "editPosition":
        // 编辑持仓
        if (message.code) {
          await vscode.commands.executeCommand("fund-helper.editPosition", message.code, message.name);
          await this._loadFundData();
        }
        break;

      case "getColumnSettings":
        // 获取列设置
        this._sendColumnSettings();
        break;

      case "saveColumnSettings":
        // 保存列设置
        if (message.data) {
          await this._saveColumnSettings(message.data);
        }
        break;

      default:
        console.log("未知消息:", message);
    }
  }

  /**
   * 生成 Webview HTML 内容
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "webview", "main.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "webview", "style.css")
    );

    const nonce = this._getNonce();

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data:; script-src 'nonce-${nonce}';">
  <link href="${styleUri}" rel="stylesheet">
  <title>基金助手</title>
</head>
<body>
  <div class="fund-webview-container">
    <!-- 列设置弹窗 -->
    <div class="column-settings-modal" id="columnSettingsModal" style="display: none;">
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>列设置</h3>
          <button class="modal-close" id="btnCloseModal">×</button>
        </div>
        <div class="modal-body">
          <div class="settings-section">
            <h4>列顺序和显示</h4>
            <p class="settings-hint">勾选显示，取消隐藏；拖动或使用箭头调整顺序</p>
            <div class="column-order-list" id="columnOrderList">
              <!-- 动态生成，可拖拽排序 -->
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="btnResetColumns">恢复默认</button>
          <button class="btn-primary" id="btnSaveColumns">保存</button>
        </div>
      </div>
    </div>

    <!-- 账户资产模块 - 一行展示 -->
    <div class="account-summary">
      <div class="account-stats">
        <div class="stat-item">
          <div class="stat-label">
            账户资产
            <button class="btn-toggle-privacy" id="btnTogglePrivacy" title="隐藏/显示敏感数据">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="icon-eye-open">
                <path d="M8 3C4.5 3 1.5 5.5 0 8c1.5 2.5 4.5 5 8 5s6.5-2.5 8-5c-1.5-2.5-4.5-5-8-5zm0 8c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/>
                <circle cx="8" cy="8" r="1.5"/>
              </svg>
              <svg width="16" height="16" viewBox="0 0 32 32" class="icon-eye-closed" style="display: none;">
                <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 16a5 5 0 0 1-5 5m-5-5a5 5 0 0 1 5-5m-3 13.654A13.4 13.4 0 0 0 16 25c7.18 0 13-6 13-9c0-1.336-1.155-3.268-3.071-5M19.5 7.47A13.5 13.5 0 0 0 16 7C8.82 7 3 13 3 16c0 1.32 1.127 3.22 3 4.935M7 25L25 7"/
              ></svg>
            </button>
          </div>
          <div class="stat-value-large" id="totalAssets">0.00</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">持有收益</div>
          <div class="stat-value" id="holdingAmount">0.00</div>
          <div class="stat-value" id="holdingRate">+0.00%</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">日收益</div>
          <div class="stat-value" id="dailyAmount">0.00</div>
          <div class="stat-value" id="dailyRate">+0.00%</div>
        </div>
      </div>
    </div>

    <!-- 基金列表模块 -->
    <div class="fund-list">
      <div class="fund-list-header">
        <span class="header-title">持仓基金</span>
        <div class="header-actions">
          <div class="market-status" id="marketStatus">
            <span class="status-dot"></span>
            <span class="status-text">--</span>
          </div>

          <button class="btn-settings" id="btnSettings" title="列设置">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.5 2h-1v5h1V2zm6.1 5H6.4L6 6.45v-1L6.4 5h3.2l.4.5v1l-.4.5zm-5 3H1.4L1 9.5v-1l.4-.5h3.2l.4.5v1l-.4.5zm3.9-8h-1v2h1V2zm-1 6h1v6h-1V8zm-4 3h-1v3h1v-3zm7.9 0h3.19l.4-.5v-.95l-.4-.5H11.4l-.4.5v.95l.4.5zm2.1-9h-1v6h1V2zm-1 10h1v2h-1v-2z"/>
            </svg>
            <span>设置</span>
          </button>

          <button class="btn-market" id="btnOpenMarket" title="行情中心">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 14h14v1H1v-1zm13-1V6h-2v7h2zm-3 0V3h-2v10h2zm-3 0V0H6v13h2zm-3 0V8H3v5h2z"/>
            </svg>
            <span>行情</span>
          </button>
          <div class="search-box">
            <input type="text" id="searchInput" placeholder="搜索基金..." />
            <button class="btn-clear" id="btnClearSearch" title="清除" style="display: none;">×</button>
          </div>
        </div>
      </div>
      
      <div class="fund-list-content" id="fundListContent">
        <div class="loading">加载中...</div>
      </div>
    </div>
  </div>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  /**
   * 生成随机 nonce
   */
  private _getNonce(): string {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * 设置自动刷新
   */
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

  /**
   * 清除自动刷新
   */
  private _clearAutoRefresh(): void {
    if (this._updateTimer) {
      clearInterval(this._updateTimer);
      this._updateTimer = undefined;
    }
  }

  /**
   * 判断是否在交易时间
   */
  private _isDuringTradeTime(): boolean {
    const now = new Date();
    const day = now.getDay();

    // 周末不刷新
    if (day === 0 || day === 6) {
      return false;
    }

    const h = now.getHours();
    const m = now.getMinutes();
    const t = h * 100 + m;

    // 交易时间：9:30-11:30, 13:00-15:00
    return (t >= 930 && t <= 1130) || (t >= 1300 && t <= 1500);
  }

  /**
   * 释放资源
   */
  public dispose(): void {
    this._clearAutoRefresh();
  }
}
