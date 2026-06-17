import * as vscode from 'vscode';

export class AboutWebview {
  public static currentPanel: AboutWebview | undefined;
  public static readonly viewType = 'aboutWebview';

  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow() {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (AboutWebview.currentPanel) {
      AboutWebview.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      AboutWebview.viewType,
      '关于基金助手',
      column || vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    AboutWebview.currentPanel = new AboutWebview(panel);
  }

  private constructor(panel: vscode.WebviewPanel) {
    this._panel = panel;
    this._panel.webview.html = aboutTemplate;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'openLink':
            if (message.url) {
              if (message.url === 'openWebVersion') {
                vscode.window.showQuickPick([
                  { label: '🚀 主站 Cloudflare', description: 'fund-helper.ccwu.cc', detail: 'Cloudflare Pages 托管，全球 CDN 加速，速度最快', url: 'https://fund-helper.ccwu.cc/settings' },
                  { label: '🔗 备用 GitHub Pages', description: 'crispychicken999.github.io/fund-helper-vscode/', detail: '实时更新，与仓库同步', url: 'https://crispychicken999.github.io/fund-helper-vscode/settings' },
                  { label: '⚠️ 已废弃 Netlify', description: 'fund-helper.netlify.app', detail: '已停止更新，请使用主站', url: 'https://fund-helper.netlify.app' }
                ], { placeHolder: '选择要打开的网页版站点' }).then(pick => {
                  if (pick) vscode.env.openExternal(vscode.Uri.parse((pick as any).url));
                });
              } else {
                vscode.env.openExternal(vscode.Uri.parse(message.url));
              }
            }
            return;
        }
      },
      null,
      this._disposables
    );
  }

  public dispose() {
    AboutWebview.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) { x.dispose(); }
    }
  }
}

export const aboutTemplate = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>关于基金助手</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 32px 24px;
      margin: 0;
      height: 100vh;
      overflow-y: auto;
    }
    .container { max-width: 480px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 28px; }
    .logo {
      width: 80px; height: 80px; border-radius: 16px;
      margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .app-name {
      font-size: 22px; font-weight: bold; margin-bottom: 4px;
      background: linear-gradient(90deg, #ff6b6b, #ffa500);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .app-version { font-size: 13px; color: var(--vscode-descriptionForeground); margin-bottom: 4px; }
    .app-author { font-size: 12px; color: var(--vscode-descriptionForeground); }
    .card {
      background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-panel-border);
      border-radius: 10px; padding: 16px 18px; margin-bottom: 14px;
    }
    .card h3 { font-size: 14px; font-weight: 600; margin-bottom: 10px; color: var(--vscode-foreground); }
    .card p { font-size: 13px; color: var(--vscode-descriptionForeground); line-height: 1.7; }
    .card p a { color: var(--vscode-textLink-foreground); text-decoration: none; }
    .card p a:hover { text-decoration: underline; }
    .feature-list { list-style: none; padding: 0; }
    .feature-list li {
      font-size: 13px; color: var(--vscode-descriptionForeground);
      padding: 4px 0; padding-left: 16px; position: relative;
    }
    .feature-list li::before { content: '•'; position: absolute; left: 2px; color: #ffa500; font-weight: bold; }
    .actions { display: flex; flex-direction: column; gap: 8px; margin-top: 20px; }
    .btn {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 10px 16px; border: none; border-radius: 8px;
      font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; text-decoration: none;
    }
    .btn-primary { background: linear-gradient(90deg, #333, #555); color: white; }
    .btn-primary:hover { background: linear-gradient(90deg, #555, #777); }
    .btn-secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
    .btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .footer { text-align: center; margin-top: 24px; font-size: 11px; color: var(--vscode-descriptionForeground); opacity: 0.7; }
    svg { flex-shrink: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://img2024.cnblogs.com/blog/3085939/202602/3085939-20260227162146255-1419431948.png" alt="logo" class="logo" />
      <div class="app-name">基金助手 Fund Helper</div>
      <div class="app-author">by CrispyChicken</div>
    </div>

    <div class="card">
      <h3>📋 功能介绍</h3>
      <ul class="feature-list">
        <li>实时查看基金估算净值与涨跌幅</li>
        <li>持仓管理与加权成本价计算</li>
        <li>批量加减仓操作，支持待确认队列</li>
        <li>多分组管理，拖拽排序</li>
        <li>行情中心大盘数据展示</li>
        <li>云同步（跨设备数据同步）</li>
        <li>AI 智能分析基金表现</li>
        <li>隐私模式 & 灰色模式</li>
      </ul>
    </div>

    <div class="card">
      <h3>🔗 相关链接</h3>
      <p>🚀 主站：<a href="#" data-link="https://fund-helper.ccwu.cc/settings">fund-helper.ccwu.cc</a></p>
      <p>🔗 备用：<a href="#" data-link="https://crispychicken999.github.io/fund-helper-vscode/settings">crispychicken999.github.io/fund-helper-vscode/</a></p>
      <p>⚠️ 已废弃：<a href="#" data-link="https://fund-helper.netlify.app">fund-helper.netlify.app</a></p>
      <p>⭐ GitHub：<a href="#" data-link="https://github.com/crispyChicken999/fund-helper-vscode">github.com/crispyChicken999/fund-helper-vscode</a></p>
    </div>

    <div class="actions">
      <a class="btn btn-primary" href="#" data-link="https://github.com/crispyChicken999/fund-helper-vscode">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
        GitHub 给个 Star
      </a>
      <a class="btn btn-secondary" href="#" data-link="openWebVersion">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><g fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="4" ry="10"/><path stroke-linecap="round" stroke-linejoin="round" d="M2 12h20"/></g></svg>
        打开网页版
      </a>
      <a class="btn btn-secondary" href="#" data-link="https://github.com/crispyChicken999/fund-helper-vscode/blob/main/CHANGELOG.md">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h5l2 2h5v10H2V2zm1 1v10h10V5h-4.586L6.414 3H3z"/></svg>
        更新日志
      </a>
    </div>

    <div class="footer">
      MIT License · &copy; 2026 CrispyChicken
    </div>
  </div>

  <script>
    (function() {
      var vscode = acquireVsCodeApi();
      document.querySelectorAll('a[data-link]').forEach(function(a) {
        a.addEventListener('click', function(e) {
          e.preventDefault();
          vscode.postMessage({ command: 'openLink', url: this.dataset.link });
        });
      });
    })();
  </script>
</body>
</html>
`;
