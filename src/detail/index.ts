import * as vscode from 'vscode';
import { FundInfo } from '../fundModel';
import { getHTML } from './html';

export class FundDetailWebview {
  public static currentPanel: FundDetailWebview | undefined;
  public static readonly viewType = 'fundDetailWebview';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri, fund: FundInfo) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (FundDetailWebview.currentPanel) {
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

    FundDetailWebview.currentPanel = new FundDetailWebview(panel, extensionUri, fund);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, fund: FundInfo) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this.update(fund);

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

  public update(fund: FundInfo) {
    this._panel.title = `详情 - ${fund.name}`;
    this._panel.webview.html = this._getHtmlForWebview(fund);
  }

  private _getHtmlForWebview(fund: FundInfo) {
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
      dailyGain
    ).join('\n');
  }
}
