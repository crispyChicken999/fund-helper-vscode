import * as vscode from 'vscode';
import { FundInfo, calcEstimatedGain, calcDailyGain } from '../fundModel';
import { fetchFundInvestmentPosition, fetchSinaFundData } from '../fundService';
import { getHTML } from './html';

export class FundDetailWebview {
  // 每个基金代码对应一个独立的 panel
  private static panels: Map<string, FundDetailWebview> = new Map();
  public static readonly viewType = 'fundDetailWebview';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _refreshCurrentFund?: (code: string) => Promise<FundInfo | undefined>;
  private _getAllFunds?: () => FundInfo[];
  private _currentFund: FundInfo;
  private _activeTab = 'holding';
  private _refreshing = false;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(
    extensionUri: vscode.Uri,
    fund: FundInfo,
    refreshCurrentFund?: (code: string) => Promise<FundInfo | undefined>,
    getAllFunds?: () => FundInfo[]
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // 检查该基金是否已有打开的 panel
    const existing = FundDetailWebview.panels.get(fund.code);
    if (existing) {
      existing._refreshCurrentFund = refreshCurrentFund;
      existing._getAllFunds = getAllFunds;
      void existing.update(fund);
      existing._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      FundDetailWebview.viewType,
      `详情 - ${fund.name}`,
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    const instance = new FundDetailWebview(
      panel,
      extensionUri,
      fund,
      refreshCurrentFund,
      getAllFunds
    );
    FundDetailWebview.panels.set(fund.code, instance);
  }

  /** 获取当前打开的所有 panel（供外部刷新等使用） */
  public static get currentPanel(): FundDetailWebview | undefined {
    // 兼容旧代码：返回最近活跃的 panel（如果有）
    for (const panel of FundDetailWebview.panels.values()) {
      return panel;
    }
    return undefined;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    fund: FundInfo,
    refreshCurrentFund?: (code: string) => Promise<FundInfo | undefined>,
    getAllFunds?: () => FundInfo[]
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._currentFund = fund;
    this._refreshCurrentFund = refreshCurrentFund;
    this._getAllFunds = getAllFunds;

    void this.update(fund);

    this._panel.webview.onDidReceiveMessage((message) => {
      if (message?.command === 'refresh') {
        void this.refresh(typeof message.activeTab === 'string' ? message.activeTab : undefined);
      } else if (message?.command === 'fetchInvestmentPosition') {
        const fundCode = message.fundCode;
        if (fundCode) {
          fetchFundInvestmentPosition(fundCode).then(data => {
            this._panel.webview.postMessage({ command: 'investmentPositionData', data });
          });
        }
      } else if (message?.command === 'navigateToFund') {
        const targetCode = message.code;
        if (targetCode && this._getAllFunds) {
          const allFunds = this._getAllFunds();
          const targetFund = allFunds.find(f => f.code === targetCode);
          if (targetFund) {
            void FundDetailWebview.createOrShow(
              this._extensionUri,
              targetFund,
              this._refreshCurrentFund,
              this._getAllFunds
            );
          }
        }
      }
    }, null, this._disposables);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public dispose() {
    FundDetailWebview.panels.delete(this._currentFund.code);
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  public async update(fund: FundInfo, activeTab?: string) {
    this._currentFund = fund;
    if (activeTab) {
      this._activeTab = activeTab;
    }
    this._panel.title = `详情 - ${fund.name}`;
    this._panel.webview.html = await this._getHtmlForWebview(fund, this._activeTab);
  }

  private async refresh(activeTab?: string) {
    if (this._refreshing || !this._currentFund) {
      return;
    }

    this._refreshing = true;
    try {
      let latestFund: FundInfo | undefined;

      try {
        latestFund = this._refreshCurrentFund
          ? await this._refreshCurrentFund(this._currentFund.code)
          : undefined;
      } catch (error) {
        console.error("刷新基金详情失败:", error);
      }

      await this.update(latestFund || this._currentFund, activeTab || this._activeTab);
    } finally {
      this._refreshing = false;
    }
  }

  private async _getHtmlForWebview(fund: FundInfo, activeTab: string) {
    // Determine VSCode theme for ECharts colors
    const isDark = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;
    
    // Get grayscale mode setting
    const config = vscode.workspace.getConfiguration("fund-helper");
    const grayscaleMode = config.get<boolean>("grayscaleMode", false);

    // 独立拉取新浪分时估值数据（供走势图使用），不阻塞 HTML 生成
    // 直接写入 fund 对象以便后续刷新时复用，避免重复请求
    if (!fund._sinaData) {
      try {
        const sinaResult = await fetchSinaFundData(fund.code);
        if (sinaResult?._sinaData) {
          fund._sinaData = sinaResult._sinaData;
        }
      } catch {
        // 静默失败，走势图无数据时不显示即可
      }
    }

    // Calculate holding info
    const holdingAmount = fund.shares * fund.netValue;
    const costAmount = fund.shares * fund.cost;
    const holdingGain = holdingAmount - costAmount;
    const holdingGainRate = costAmount > 0 ? (holdingGain / costAmount) * 100 : 0;

    // Calculate daily gain (使用统一公式，与 TreeView/WebView 一致)
    const dailyGain = calcDailyGain(fund);

    // Calculate estimated gain (对齐 Web fundDisplay.ts 反推公式)
    const estimatedGain = calcEstimatedGain(fund);

    // Get all funds and current index
    const allFunds = this._getAllFunds ? this._getAllFunds() : [];
    const allFundCodes = allFunds.map(f => f.code);
    const currentIndex = allFundCodes.indexOf(fund.code);

    return getHTML(
      fund,
      isDark,
      holdingAmount,
      costAmount,
      holdingGain,
      holdingGainRate,
      dailyGain,
      estimatedGain,
      activeTab,
      grayscaleMode,
      allFundCodes,
      currentIndex
    ).join('\n');
  }
}
