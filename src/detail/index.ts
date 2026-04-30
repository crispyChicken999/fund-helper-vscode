import * as vscode from 'vscode';
import { FundInfo } from '../fundModel';
import { getHTML } from './html';

export class FundDetailWebview {
  public static currentPanel: FundDetailWebview | undefined;
  public static readonly viewType = 'fundDetailWebview';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _refreshCurrentFund?: (code: string) => Promise<FundInfo | undefined>;
  private _currentFund: FundInfo;
  private _activeTab = 'holding';
  private _refreshing = false;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(
    extensionUri: vscode.Uri,
    fund: FundInfo,
    refreshCurrentFund?: (code: string) => Promise<FundInfo | undefined>
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (FundDetailWebview.currentPanel) {
      FundDetailWebview.currentPanel._refreshCurrentFund = refreshCurrentFund;
      FundDetailWebview.currentPanel.update(fund);
      FundDetailWebview.currentPanel._panel.reveal(column);
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

    FundDetailWebview.currentPanel = new FundDetailWebview(
      panel,
      extensionUri,
      fund,
      refreshCurrentFund,
    );
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    fund: FundInfo,
    refreshCurrentFund?: (code: string) => Promise<FundInfo | undefined>
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._currentFund = fund;
    this._refreshCurrentFund = refreshCurrentFund;

    this.update(fund);

    this._panel.webview.onDidReceiveMessage((message) => {
      if (message?.command === 'refresh') {
        void this.refresh(typeof message.activeTab === 'string' ? message.activeTab : undefined);
      }
    }, null, this._disposables);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public dispose() {
    FundDetailWebview.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  public update(fund: FundInfo, activeTab?: string) {
    this._currentFund = fund;
    if (activeTab) {
      this._activeTab = activeTab;
    }
    this._panel.title = `详情 - ${fund.name}`;
    this._panel.webview.html = this._getHtmlForWebview(fund, this._activeTab);
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

      this.update(latestFund || this._currentFund, activeTab || this._activeTab);
    } finally {
      this._refreshing = false;
    }
  }

  private _getHtmlForWebview(fund: FundInfo, activeTab: string) {
    // Determine VSCode theme for ECharts colors
    const isDark = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;

    // Calculate holding info
    const holdingAmount = fund.shares * fund.netValue;
    const costAmount = fund.shares * fund.cost;
    const holdingGain = holdingAmount - costAmount;
    const holdingGainRate = costAmount > 0 ? (holdingGain / costAmount) * 100 : 0;

    // Calculate daily gain
    let dailyGain = 0;
    if (fund.shares > 0) {
      if (fund.isRealValue) {
        dailyGain = (fund.netValue - fund.netValue / (1 + fund.navChgRt * 0.01)) * fund.shares;
      } else if (fund.estimatedValue !== null) {
        dailyGain = (fund.estimatedValue - fund.netValue) * fund.shares;
      }
    }

    return getHTML(
      fund,
      isDark,
      holdingAmount,
      costAmount,
      holdingGain,
      holdingGainRate,
      dailyGain,
      activeTab
    ).join('\n');
  }
}
