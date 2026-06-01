import * as vscode from 'vscode';

export class MarketWebview {
  public static currentPanel: MarketWebview | undefined;
  public static readonly viewType = 'marketWebview';

  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _messageHandler?: (message: any) => void;

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (MarketWebview.currentPanel) {
      MarketWebview.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      MarketWebview.viewType,
      '行情中心',
      column || vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    MarketWebview.currentPanel = new MarketWebview(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._panel.webview.html = this._getHtml();
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  /** 注册来自 Webview 的消息处理器（由 extension 注入，实现 CORS 代理） */
  public setMessageHandler(handler: (message: any) => void): void {
    this._messageHandler = handler;
    this._panel.webview.onDidReceiveMessage(
      (msg) => { if (this._messageHandler) { this._messageHandler(msg); } },
      null,
      this._disposables
    );
  }

  /** 向 Webview 发送消息 */
  public postMessage(message: any): void {
    this._panel.webview.postMessage(message);
  }

  /** 注册配置变化监听器 */
  public registerConfigListener(listener: vscode.Disposable): void {
    this._disposables.push(listener);
  }

  public dispose() {
    MarketWebview.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) { x.dispose(); }
    }
  }

  private _getHtml(): string {
    const isDark = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;
    const TC = isDark ? "'#cccccc'" : "'#333333'";
    const GC = isDark ? "'#3a3a3a'" : "'#e0e0e0'";
    const IS_DARK = isDark ? 'true' : 'false';

    // 返回完整 HTML 字符串（JS 代码中不用模板字符串，避免转义问题）
    return [
      '<!DOCTYPE html>',
      '<html lang="zh-CN">',
      '<head>',
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '<title>行情中心</title>',
      '<script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></scr' + 'ipt>',
      '<style>',
      '* { box-sizing: border-box; margin: 0; padding: 0; }',
      'body { font-family: var(--vscode-font-family),"Segoe UI",sans-serif; color: var(--vscode-editor-foreground); background-color: var(--vscode-editor-background); padding: 16px; display: flex; flex-direction: column; gap: 14px; }',
      '.page-header { display: flex; align-items: center; gap: 10px; padding-bottom: 12px; border-bottom: 1px solid var(--vscode-panel-border); flex-wrap: wrap; }',
      '.page-header h1 { font-size: 1.1rem; font-weight: 600; flex: 0 1 auto; }',
      '.update-time { font-size: .75em; color: var(--vscode-descriptionForeground); margin-left: auto; }',
      '.refresh-btn { padding: 4px 12px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: 1px solid var(--vscode-panel-border); border-radius: 4px; cursor: pointer; font-size: .82em; font-family: inherit; transition: background .2s; white-space: nowrap; }',
      '.refresh-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }',
      '.tabs { display: flex; gap: 2px; overflow-x: auto; padding-bottom: 2px; position: relative; overflow-y: hidden; scrollbar-width: none; }',
      '.tabs::-webkit-scrollbar { display: none; }',
      '.tabs::before { content: ""; position: absolute; bottom: 0; width: max(100%, 530px); height: 1px; background: var(--vscode-panel-border); }',
      '.tab-btn { padding: 6px 12px; background: transparent; border: none; border-bottom: 3px solid transparent; color: var(--vscode-descriptionForeground); cursor: pointer; font-size: .85rem; font-family: inherit; transition: all .2s; margin-bottom: -2px; border-radius: 4px 4px 0 0; white-space: nowrap; }',
      '.tab-btn:hover { color: var(--vscode-editor-foreground); background: var(--vscode-list-hoverBackground); }',
      '.tab-btn.active { color: var(--vscode-editor-foreground); border-bottom-color: var(--vscode-focusBorder); font-weight: 600; background: var(--vscode-list-hoverBackground); }',
      '.tab-content { display: none; }',
      '.tab-content.active { display: flex; flex-direction: column; gap: 14px; }',
      '.card { background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 14px 16px; }',
      '.card-title { font-size: .85rem; font-weight: 600; color: var(--vscode-descriptionForeground); margin-bottom: 10px; }',
      '.market-stat-bar { display: flex; flex-direction: column; gap: 8px; padding: 14px; background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-panel-border); border-radius: 8px; }',
      '.market-stat-heading { font-size: 1rem; font-weight: 700; text-align: center; margin-bottom: 4px; }',
      '.market-stat-meta { display: flex; align-items: baseline; justify-content: center; flex-wrap: wrap; gap: 6px; font-size: .85em; }',
      '.market-stat-title { color: var(--vscode-descriptionForeground); }',
      '.market-stat-volume { font-size: 1.1em; font-weight: 700; }',
      '.market-stat-unit { color: var(--vscode-descriptionForeground); }',
      '.market-stat-progress { position: relative; display: flex; width: 100%; min-height: 10px; overflow: hidden; border-radius: 999px; background: var(--vscode-input-background); border: 1px solid var(--vscode-panel-border); }',
      '.market-stat-progress.empty { justify-content: center; align-items: center; min-height: 28px; }',
      '.market-stat-segment { min-width: 0; transition: width 0.2s ease; }',
      '.market-stat-segment.is-up { background: linear-gradient(90deg, #ef4444, #f97316); }',
      '.market-stat-segment.is-flat { background: #9ca3af; }',
      '.market-stat-segment.is-down { background: linear-gradient(90deg, #22c55e, #16a34a); }',
      '.market-stat-empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--vscode-descriptionForeground); font-size: .75em; }',
      '.market-stat-legend { display: flex; align-items: center; justify-content: space-between; gap: 12px; }',
      '.market-stat-legend-item { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: .85em; font-weight: 500; }',
      '.market-stat-legend-item.is-up { color: #f56c6c; }',
      '.market-stat-legend-item.is-flat { color: var(--vscode-descriptionForeground); }',
      '.market-stat-legend-item.is-down { color: #4eb61b; }',
      '.market-stat-legend-label { font-weight: 500; }',
      '.up { color: #f56c6c; } .down { color: #4eb61b; } .flat { color: var(--vscode-descriptionForeground); }',
      '.index-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }',
      '.index-card { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 7px; padding: 12px 14px; transition: all .2s; cursor: pointer; }',
      '.index-card:hover { box-shadow: 0 3px 10px rgba(0,0,0,.18); transform: translateY(-2px); }',
      '.index-card.up-card { border-left: 3px solid #f56c6c; }',
      '.index-card.down-card { border-left: 3px solid #4eb61b; }',
      '.index-card.flat-card { border-left: 3px solid var(--vscode-descriptionForeground); }',
      '.idx-name { font-size: .8em; color: var(--vscode-descriptionForeground); margin-bottom: 5px; }',
      '.idx-value { font-size: 1.3em; font-weight: 700; margin-bottom: 3px; }',
      '.idx-change { font-size: .8em; font-weight: 600; }',
      '.idx-abs { font-size: .75em; color: var(--vscode-descriptionForeground); }',
      '.flow-chart { width: 100%; min-height: 250px; }',
      '.unit-label { font-size: .75em; color: var(--vscode-descriptionForeground); margin-bottom: 6px; }',
      '.sub-tabs { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }',
      '.sub-tab-btn { padding: 4px 12px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: 1px solid var(--vscode-panel-border); border-radius: 4px; cursor: pointer; font-size: .78em; font-family: inherit; transition: background .2s; }',
      '.sub-tab-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }',
      '.sub-tab-btn.active { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-color: var(--vscode-button-background); }',
      '.plate-chart { width: 100%; min-height: 280px; }',
      '.loading-wrap { display: flex; align-items: center; justify-content: center; padding: 24px; color: var(--vscode-descriptionForeground); gap: 8px; }',
      '.spinner { width: 16px; height: 16px; border: 2px solid var(--vscode-panel-border); border-top-color: var(--vscode-focusBorder); border-radius: 50%; animation: spin .8s linear infinite; }',
      '@keyframes spin { to { transform: rotate(360deg); } }',
      '.error-msg { color: var(--vscode-errorForeground); padding: 16px; text-align: center; font-size: .85em; }',
      '.index-images-container { position: relative; }',
      '.index-images { display: none; flex-wrap: wrap; gap: 8px; justify-content: flex-start; }',
      '.index-images.active { display: flex; }',
      '.index-img-item { width: 90px; height: 106px; object-fit: cover; border-radius: 6px; border: 1px solid var(--vscode-panel-border); background: var(--vscode-editor-background); cursor: pointer; }',
      '.index-img-item:hover { box-shadow: 0 2px 8px rgba(0,0,0,.15); transition: all 0.2s; }',
      IS_DARK ? '.index-img-item { filter: invert(1) hue-rotate(173deg) brightness(0.9); border-color: #c0c0c0; }' : '',
      '.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; }',
      '.dialog-content { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 8px; width: 90%; max-width: 900px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }',
      '.dialog-content-edit { max-width: 600px; }',
      '.dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--vscode-panel-border); }',
      '.dialog-header h3 { margin: 0; font-size: 1rem; font-weight: 600; }',
      '.dialog-close { background: transparent; border: none; color: var(--vscode-descriptionForeground); font-size: 24px; cursor: pointer; padding: 0; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 4px; }',
      '.dialog-close:hover { background: var(--vscode-list-hoverBackground); }',
      '.dialog-body { padding: 16px; overflow-y: auto; flex: 1; }',
      '.dialog-footer { padding: 12px 16px; border-top: 1px solid var(--vscode-panel-border); display: flex; justify-content: flex-end; gap: 8px; }',
      '.index-detail-chart { width: 100%; height: 500px; }',
      '.edit-hint { padding: 8px 12px; background: var(--vscode-inputValidation-warningBackground); border: 1px solid var(--vscode-inputValidation-warningBorder); border-radius: 4px; font-size: .85em; margin-bottom: 12px; }',
      '.index-edit-list { max-height: 300px; overflow-y: auto; border: 1px solid var(--vscode-panel-border); border-radius: 6px; margin-bottom: 12px; }',
      '.index-edit-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-bottom: 1px solid var(--vscode-panel-border); cursor: move; }',
      '.index-edit-item:last-child { border-bottom: none; }',
      '.index-edit-item:hover { background: var(--vscode-list-hoverBackground); }',
      '.index-edit-drag { cursor: grab; color: var(--vscode-descriptionForeground); font-size: 16px; user-select: none; }',
      '.index-edit-name { flex: 1; font-size: .9em; }',
      '.index-edit-btn { padding: 2px 8px; font-size: .75em; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: 1px solid var(--vscode-panel-border); border-radius: 3px; cursor: pointer; }',
      '.index-edit-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }',
      '.index-edit-btn-danger { background: var(--vscode-inputValidation-errorBackground); color: var(--vscode-errorForeground); border-color: var(--vscode-inputValidation-errorBorder); }',
      '.edit-add-section { display: flex; gap: 8px; padding-top: 8px; border-top: 1px dashed var(--vscode-panel-border); }',
      '.edit-select { flex: 1; padding: 6px 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-panel-border); border-radius: 4px; font-family: inherit; font-size: .85em; }',
      '.edit-btn { padding: 6px 16px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: 1px solid var(--vscode-panel-border); border-radius: 4px; cursor: pointer; font-family: inherit; font-size: .85em; white-space: nowrap; }',
      '.edit-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }',
      '.edit-btn-primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-color: var(--vscode-button-background); }',
      '.edit-btn-primary:hover { background: var(--vscode-button-hoverBackground); }',
      '.edit-btn-cancel { background: transparent; }',
      'body.grayscale-mode { filter: grayscale(1); }',
      'body.grayscale-mode .dialog-overlay { filter: none; }',
      'body.grayscale-mode .dialog-content { filter: grayscale(1); }',
      '@media (max-width: 600px) {',
      '  body { padding: 8px; gap: 10px; }',
      '  .page-header { padding-bottom: 8px; }',
      '  .page-header h1 { font-size: 1rem; }',
      '  .update-time { font-size: .7em; }',
      '  .refresh-btn { padding: 4px 8px; font-size: .75em; }',
      '  .card { padding: 10px 12px; border-radius: 6px; }',
      '  .card-title { font-size: .8rem; margin-bottom: 8px; }',
      '  .tab-btn { padding: 5px 10px; font-size: .8rem; }',
      '  .market-stat { gap: 8px; padding: 8px; font-size: .78em; }',
      '  .stat-item { gap: 3px; }',
      '  .index-grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; }',
      '  .index-card { padding: 10px 12px; }',
      '  .idx-name { font-size: .75em; margin-bottom: 4px; }',
      '  .idx-value { font-size: 1.1em; margin-bottom: 2px; }',
      '  .idx-change { font-size: .7em; }',
      '  .idx-abs { font-size: .65em; }',
      '  .flow-chart { min-height: 200px; }',
      '  .plate-chart { min-height: 240px; }',
      '  .sub-tab-btn { padding: 3px 8px; font-size: .7em; }',
      '  .sub-tabs { gap: 6px; margin-bottom: 8px; }',
      '  .unit-label { font-size: .7em; margin-bottom: 4px; }',
      '  .index-img-item { width: 70px; height: 82px; }',
      '  .loading-wrap { padding: 16px; }',
      '}',
      '</style>',
      '</head>',
      '<body id="marketBody">',

      '<div class="page-header">',
      '<h1>行情中心</h1>',
      '<span class="update-time" id="updateTime">&#8212;</span>',
      '<button class="refresh-btn" onclick="refreshAll()">刷新</button>',
      '</div>',

      '<div class="tabs">',
      '<button class="tab-btn active" data-tab="market">大盘资金</button>',
      '<button class="tab-btn" data-tab="industry">行业板块</button>',
      '<button class="tab-btn" data-tab="style">风格板块</button>',
      '<button class="tab-btn" data-tab="concept">概念板块</button>',
      '<button class="tab-btn" data-tab="region">地域板块</button>',
      '</div>',

      // 大盘资金
      '<div class="tab-content active" id="tab-market">',
      '<div class="market-stat-bar" id="marketStatBar"><div class="loading-wrap" style="padding:6px 0"><div class="spinner"></div>加载中...</div></div>',
      '<div class="card">',
      '<div class="card-title" style="display:flex;align-items:center;justify-content:space-between;">',
      '<span>大盘指数（点击查看详情）</span>',
      '<button class="refresh-btn" style="padding:2px 8px;font-size:.75em;margin:0;" onclick="handleEditIndexCards()">编辑</button>',
      '</div>',
      '<div id="indexCards" class="index-grid"><div class="loading-wrap" style="grid-column:1/-1"><div class="spinner"></div>加载中...</div></div>',
      '</div>',
      
      // 扩展指数（使用子标签页）
      '<div class="card">',
      '<div class="card-title">全球指数</div>',
      '<div class="sub-tabs">',
      '<button class="sub-tab-btn active" data-index-tab="a-stock">A股指数</button>',
      '<button class="sub-tab-btn" data-index-tab="hk-stock">港股指数</button>',
      '<button class="sub-tab-btn" data-index-tab="us-stock">美股指数</button>',
      '<button class="sub-tab-btn" data-index-tab="asia-pacific">亚太指数</button>',
      '</div>',
      '<div class="index-images-container">',
      '<div class="index-images active" id="index-a-stock"></div>',
      '<div class="index-images" id="index-hk-stock"></div>',
      '<div class="index-images" id="index-us-stock"></div>',
      '<div class="index-images" id="index-asia-pacific"></div>',
      '</div>',
      '</div>',
      
      '<div class="card"><div class="card-title">沪深两市资金流向（分钟级）</div><div class="unit-label">单位：亿元</div><div id="flowLoading" class="loading-wrap"><div class="spinner"></div>加载中...</div><div id="flowChart" class="flow-chart" style="display:none"></div></div>',
      '</div>',

      // 行业
      '<div class="tab-content" id="tab-industry"><div class="card">',
      '<div class="sub-tabs"><button class="sub-tab-btn active" data-key="f62" data-tab="industry">今日排行</button><button class="sub-tab-btn" data-key="f164" data-tab="industry">5日排行</button><button class="sub-tab-btn" data-key="f174" data-tab="industry">10日排行</button></div>',
      '<div class="unit-label">单位：亿元</div>',
      '<div id="industryLoading" class="loading-wrap"><div class="spinner"></div>加载中...</div><div id="industryChart" class="plate-chart" style="display:none"></div>',
      '</div></div>',

      // 风格
      '<div class="tab-content" id="tab-style"><div class="card">',
      '<div class="sub-tabs"><button class="sub-tab-btn active" data-key="f62" data-tab="style">今日排行</button><button class="sub-tab-btn" data-key="f164" data-tab="style">5日排行</button><button class="sub-tab-btn" data-key="f174" data-tab="style">10日排行</button></div>',
      '<div class="unit-label">单位：亿元</div>',
      '<div id="styleLoading" class="loading-wrap"><div class="spinner"></div>加载中...</div><div id="styleChart" class="plate-chart" style="display:none"></div>',
      '</div></div>',

      // 概念
      '<div class="tab-content" id="tab-concept"><div class="card">',
      '<div class="sub-tabs"><button class="sub-tab-btn active" data-key="f62" data-tab="concept">今日排行</button><button class="sub-tab-btn" data-key="f164" data-tab="concept">5日排行</button><button class="sub-tab-btn" data-key="f174" data-tab="concept">10日排行</button></div>',
      '<div class="unit-label">单位：亿元</div>',
      '<div id="conceptLoading" class="loading-wrap"><div class="spinner"></div>加载中...</div><div id="conceptChart" class="plate-chart" style="display:none"></div>',
      '</div></div>',

      // 地域
      '<div class="tab-content" id="tab-region"><div class="card">',
      '<div class="sub-tabs"><button class="sub-tab-btn active" data-key="f62" data-tab="region">今日排行</button><button class="sub-tab-btn" data-key="f164" data-tab="region">5日排行</button><button class="sub-tab-btn" data-key="f174" data-tab="region">10日排行</button></div>',
      '<div class="unit-label">单位：亿元</div>',
      '<div id="regionLoading" class="loading-wrap"><div class="spinner"></div>加载中...</div><div id="regionChart" class="plate-chart" style="display:none"></div>',
      '</div></div>',

      // 指数详情弹窗
      '<div id="indexDetailDialog" class="dialog-overlay" style="display:none;" onclick="closeIndexDetailDialog(event)">',
      '<div class="dialog-content" onclick="event.stopPropagation();">',
      '<div class="dialog-header">',
      '<h3 id="indexDetailTitle">指数详情</h3>',
      '<button class="dialog-close" onclick="closeIndexDetailDialog()">×</button>',
      '</div>',
      '<div class="dialog-body">',
      '<div id="indexDetailLoading" class="loading-wrap"><div class="spinner"></div>加载中...</div>',
      '<div id="indexDetailChart" class="index-detail-chart" style="display:none;"></div>',
      '</div>',
      '</div>',
      '</div>',

      // 指数编辑弹窗
      '<div id="indexEditDialog" class="dialog-overlay" style="display:none;" onclick="closeIndexEditDialog(event)">',
      '<div class="dialog-content dialog-content-edit" onclick="event.stopPropagation();">',
      '<div class="dialog-header">',
      '<h3>编辑指数卡片</h3>',
      '<button class="dialog-close" onclick="closeIndexEditDialog()">×</button>',
      '</div>',
      '<div class="dialog-body">',
      '<div class="edit-hint">拖动调整顺序，点击删除按钮移除</div>',
      '<div id="indexEditList" class="index-edit-list"></div>',
      '<div class="edit-add-section">',
      '<select id="indexAddSelect" class="edit-select">',
      '<option value="">选择要添加的指数...</option>',
      '</select>',
      '<button class="edit-btn" onclick="handleAddIndexToEdit()">添加</button>',
      '</div>',
      '</div>',
      '<div class="dialog-footer">',
      '<button class="edit-btn edit-btn-cancel" onclick="closeIndexEditDialog()">取消</button>',
      '<button class="edit-btn edit-btn-primary" onclick="handleSaveIndexEdit()">保存</button>',
      '</div>',
      '</div>',
      '</div>',

      // ========== JS ==========
      '<script>',
      'var TC=' + TC + ', GC=' + GC + ', IS_DARK=' + IS_DARK + ';',
      this._getJs(),
      '</' + 'script>',

      '</body>',
      '</html>',
    ].join('\n');
  }

  /** 返回 JS 字符串，完全避免与 TS 模板字符串冲突 */
  private _getJs(): string {
    /* eslint-disable */
    return String.raw`
var charts = {};
function getChart(id) {
    if (!charts[id]) { charts[id] = echarts.init(document.getElementById(id)); }
    return charts[id];
}

var loadedTabs = new Set();
document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
        document.querySelectorAll('.tab-content').forEach(function(c){ c.classList.remove('active'); });
        btn.classList.add('active');
        var tab = btn.dataset.tab;
        document.getElementById('tab-' + tab).classList.add('active');
        loadTabOnce(tab);
        setTimeout(function(){ Object.values(charts).forEach(function(c){ c.resize(); }); }, 60);
    });
});

var plateCodes = {};
document.querySelectorAll('.sub-tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        var tabId = btn.dataset.tab;
        var indexTab = btn.dataset.indexTab;
        
        // 处理板块子标签
        if (tabId) {
            document.querySelectorAll('.sub-tab-btn[data-tab="' + tabId + '"]').forEach(function(b){ b.classList.remove('active'); });
            btn.classList.add('active');
            fetchPlateData(tabId, plateCodes[tabId], btn.dataset.key);
        }
        
        // 处理指数子标签
        if (indexTab) {
            document.querySelectorAll('.sub-tab-btn[data-index-tab]').forEach(function(b){ b.classList.remove('active'); });
            document.querySelectorAll('.index-images').forEach(function(c){ c.classList.remove('active'); });
            btn.classList.add('active');
            document.getElementById('index-' + indexTab).classList.add('active');
        }
    });
});

function loadTabOnce(tab) {
    if (loadedTabs.has(tab)) { return; }
    loadedTabs.add(tab);
    if (tab === 'market')   { loadMarket(); loadIndexImages(); }
    if (tab === 'industry') { loadPlate('industry', 'm:90+s:4'); }
    if (tab === 'style')    { loadPlate('style',    'm:90+e:4'); }
    if (tab === 'concept')  { loadPlate('concept',  'm:90+t:3'); }
    if (tab === 'region')   { loadPlate('region',   'm:90+t:1'); }
}

function refreshAll() {
    loadedTabs.clear();
    document.getElementById('marketStatBar').innerHTML  = '<div class="loading-wrap" style="padding:6px 0"><div class="spinner"></div>加载中...</div>';
    document.getElementById('indexCards').innerHTML  = '<div class="loading-wrap" style="grid-column:1/-1"><div class="spinner"></div>加载中...</div>';
    document.getElementById('flowLoading').style.display = 'flex';
    document.getElementById('flowChart').style.display   = 'none';
    ['industry','style','concept','region'].forEach(function(id) {
        document.getElementById(id + 'Loading').style.display = 'flex';
        document.getElementById(id + 'Chart').style.display   = 'none';
    });
    loadTabOnce(document.querySelector('.tab-btn.active').dataset.tab);
}

window.addEventListener('resize', function(){ Object.values(charts).forEach(function(c){ c.resize(); }); });

/* ---- VSCode postMessage 代理（绕过 CORS） ---- */
var vsc = acquireVsCodeApi();
var pending = {};
var rid = 0;

function proxyFetch(url) {
    return new Promise(function(resolve) {
        var id = ++rid;
        pending[id] = resolve;
        vsc.postMessage({ command: 'fetchProxy', reqId: id, url: url });
        setTimeout(function(){ if (pending[id]){ delete pending[id]; resolve(null); } }, 12000);
    });
}

function proxyMarketStat() {
    return new Promise(function(resolve) {
        var id = ++rid;
        pending[id] = resolve;
        vsc.postMessage({ command: 'fetchMarketStat', reqId: id });
        setTimeout(function(){ if (pending[id]){ delete pending[id]; resolve(null); } }, 12000);
    });
}

/* ---- 大盘资金 ---- */
var DEFAULT_INDEX_CARDS = [
    { code: '1.000001', name: '上证指数' },
    { code: '1.000300', name: '沪深300' },
    { code: '0.399001', name: '深证成指' },
    { code: '0.399006', name: '创业板指' }
];
var indexCardsConfig = DEFAULT_INDEX_CARDS.slice();
var isGrayscaleMode = false;

// 从 VSCode 配置加载（通过消息通信）
function loadIndexCardsConfig() {
    vsc.postMessage({ command: 'getIndexCardsConfig' });
}

function loadGrayscaleMode() {
    vsc.postMessage({ command: 'getGrayscaleMode' });
}

function applyGrayscaleMode(enabled) {
    isGrayscaleMode = enabled;
    var body = document.getElementById('marketBody');
    if (enabled) {
        body.classList.add('grayscale-mode');
    } else {
        body.classList.remove('grayscale-mode');
    }
}

// 接收配置更新
window.addEventListener('message', function(ev) {
    var msg = ev.data;
    if (msg.command === 'proxyResponse' || msg.command === 'marketStatResponse') {
        var fn = pending[msg.reqId];
        if (fn) { delete pending[msg.reqId]; fn(msg.data); }
    } else if (msg.command === 'indexCardsConfigResponse') {
        if (msg.config && msg.config.length > 0) {
            indexCardsConfig = msg.config;
            // 如果已经加载过市场数据，重新加载
            if (loadedTabs.has('market')) {
                loadIndexAndStat();
            }
        }
    } else if (msg.command === 'grayscaleModeResponse') {
        applyGrayscaleMode(msg.enabled);
    } else if (msg.command === 'openIndexDetailDialog') {
        openIndexDetailDialog(msg.code, msg.name);
    } else if (msg.command === 'openIndexEditDialog') {
        openIndexEditDialog();
    }
});

function loadMarket() {
    Promise.all([loadIndexAndStat(), loadFlowKline()]).then(function() {
        document.getElementById('updateTime').textContent = '更新于 ' + new Date().toLocaleTimeString('zh-CN');
    });
}

function loadIndexAndStat() {
    var secids = indexCardsConfig.map(function(c){ return c.code; }).join(',');
    var url = 'https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f4,f12,f13,f14&secids=' + secids + '&_=' + Date.now();
    return fetch(url).then(function(r){ return r.json(); }).then(function(json) {
        var data = (json && json.data && json.data.diff) || [];
        var dataMap = {};
        data.forEach(function(d) {
            dataMap[d.f13 + '.' + d.f12] = {
                name: d.f14,
                price: d.f2,
                changePct: d.f3,
                changeAbs: d.f4
            };
        });
        // 按照用户配置的顺序显示
        var formatted = indexCardsConfig.map(function(cfg) {
            return dataMap[cfg.code] || {
                name: cfg.name,
                price: 0,
                changePct: 0,
                changeAbs: 0
            };
        });
        renderIndexCards(formatted, 'indexCards');
        loadMarketStat();
    }).catch(function() {
        document.getElementById('indexCards').innerHTML = '<div class="error-msg">大盘指数加载失败</div>';
        loadMarketStat();
    });
}

function loadMarketStat() {
    proxyMarketStat().then(function(stat) {
        if (!stat) { 
            document.getElementById('marketStatBar').innerHTML = '<span style="color:var(--vscode-descriptionForeground)">统计数据获取失败</span>'; 
            return; 
        }
        var total = (stat.upCount || 0) + (stat.flatCount || 0) + (stat.downCount || 0);
        var upPct = total > 0 ? ((stat.upCount || 0) / total * 100).toFixed(2) : 0;
        var flatPct = total > 0 ? ((stat.flatCount || 0) / total * 100).toFixed(2) : 0;
        var downPct = total > 0 ? ((stat.downCount || 0) / total * 100).toFixed(2) : 0;
        var amtStr = stat.totalAmount > 0 ? (stat.totalAmount / 1e8).toFixed(2) : '--';
        
        var html = '<div class="market-stat-heading">股市概况</div>' +
            '<div class="market-stat-meta">' +
            '<span class="market-stat-title">两市合计成交额：</span>' +
            '<strong class="market-stat-volume">' + amtStr + '</strong>' +
            '<span class="market-stat-unit">亿元</span>' +
            '</div>';
        
        if (total > 0) {
            html += '<div class="market-stat-progress">' +
                '<div class="market-stat-segment is-up" style="width:' + upPct + '%"></div>' +
                '<div class="market-stat-segment is-flat" style="width:' + flatPct + '%"></div>' +
                '<div class="market-stat-segment is-down" style="width:' + downPct + '%"></div>' +
                '</div>';
        } else {
            html += '<div class="market-stat-progress empty"><div class="market-stat-empty">暂无数据</div></div>';
        }
        
        html += '<div class="market-stat-legend">' +
            '<div class="market-stat-legend-item is-up"><span class="market-stat-legend-label">上涨</span><strong>' + (stat.upCount || 0) + '</strong></div>' +
            '<div class="market-stat-legend-item is-flat"><span class="market-stat-legend-label">平盘</span><strong>' + (stat.flatCount || 0) + '</strong></div>' +
            '<div class="market-stat-legend-item is-down"><span class="market-stat-legend-label">下跌</span><strong>' + (stat.downCount || 0) + '</strong></div>' +
            '</div>';
        
        document.getElementById('marketStatBar').innerHTML = html;
    });
}

function loadFlowKline() {
    var url = 'https://push2.eastmoney.com/api/qt/stock/fflow/kline/get?lmt=0&klt=1&secid=1.000001&secid2=0.399001&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63&_=' + Date.now();
    return fetch(url).then(function(r){ return r.json(); }).then(function(json) {
        document.getElementById('flowLoading').style.display = 'none';
        document.getElementById('flowChart').style.display   = 'block';
        renderFlowChart((json && json.data && json.data.klines) || []);
    }).catch(function() {
        document.getElementById('flowLoading').innerHTML = '<div class="error-msg">资金流向数据加载失败</div>';
    });
}

// 生成完整时间轴（9:30-15:00）
function generateTimeArray() {
    var times = [];
    times.push('09:30');
    // 09:30 - 11:30
    var current = '09:30';
    while (current !== '11:30') {
        current = addMinutes(current, 1);
        times.push(current);
    }
    // 13:00 - 15:00
    current = '13:00';
    times.push(current);
    while (current !== '15:00') {
        current = addMinutes(current, 1);
        times.push(current);
    }
    return times;
}

function addMinutes(time, minutes) {
    var parts = time.split(':');
    var hour = parseInt(parts[0]);
    var min = parseInt(parts[1]);
    min += minutes;
    if (min >= 60) {
        hour += Math.floor(min / 60);
        min = min % 60;
    }
    return (hour < 10 ? '0' : '') + hour + ':' + (min < 10 ? '0' : '') + min;
}

function renderFlowChart(klines) {
    var times = generateTimeArray();
    var dataMap = {};
    
    // 将数据映射到时间点
    klines.forEach(function(line) {
        var p = line.split(',');
        var time = p[0].slice(11); // 提取时间部分
        dataMap[time] = {
            main: parseFloat(p[1]) / 1e8,
            superBig: parseFloat(p[2]) / 1e8,
            big: parseFloat(p[3]) / 1e8,
            mid: parseFloat(p[4]) / 1e8,
            small: parseFloat(p[5]) / 1e8
        };
    });
    
    // 按照完整时间轴填充数据（没有数据的点为 null）
    var main = [], superBig = [], big = [], mid = [], small = [];
    times.forEach(function(time) {
        var d = dataMap[time];
        if (d) {
            main.push(d.main.toFixed(4));
            superBig.push(d.superBig.toFixed(4));
            big.push(d.big.toFixed(4));
            mid.push(d.mid.toFixed(4));
            small.push(d.small.toFixed(4));
        } else {
            // 没有数据的点为 null，echarts 会自动断开连线
            main.push(null);
            superBig.push(null);
            big.push(null);
            mid.push(null);
            small.push(null);
        }
    });
    
    var chart = getChart('flowChart');
    function mkS(name, data, color) { return { name: name, type: 'line', data: data, smooth: false, showSymbol: false, lineStyle: { color: color, width: 1.5 }, itemStyle: { color: color }, connectNulls: false }; }
    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', formatter: function(params) {
            var s = '<div style="margin-bottom:4px;font-weight:600;">' + params[0].name + '</div>';
            params.forEach(function(p) {
                if (p.value === null || p.value === undefined) { return; }
                var v = parseFloat(p.value), sign = v >= 0 ? '+' : '', col = v >= 0 ? '#f56c6c' : '#4eb61b';
                s += p.marker + p.seriesName + ': <span style="color:' + col + ';font-weight:600;">' + sign + v.toFixed(2) + '</span> 亿<br/>';
            });
            return s;
        }},
        legend: { data: ['主力净流入','超大单净流入','大单净流入','中单净流入','小单净流入'], textStyle: { color: TC }, top: 0, itemWidth: 14, itemHeight: 3 },
        grid: { left: '1%', right: '2%', top: 40, bottom: 30, containLabel: true },
        xAxis: { type: 'category', boundaryGap: false, data: times, axisLabel: { color: TC, fontSize: 11 }, axisLine: { lineStyle: { color: GC } }, splitLine: { show: false } },
        yAxis: { type: 'value', axisLabel: { color: TC, fontSize: 11, formatter: function(v){ return v.toFixed(0); } }, splitLine: { lineStyle: { color: GC, type: 'dashed' } }, axisLine: { show: false } },
        series: [
            mkS('主力净流入',   main,     '#5470c6'),
            mkS('超大单净流入', superBig, '#ee6666'),
            mkS('大单净流入',   big,      '#73c0de'),
            mkS('中单净流入',   mid,      '#3ba272'),
            mkS('小单净流入',   small,    '#fc8452')
        ]
    });
}

/* ---- 板块（走宿主代理） ---- */
function loadPlate(tabId, code) {
    plateCodes[tabId] = code;
    var activeBtn = document.querySelector('.sub-tab-btn.active[data-tab="' + tabId + '"]');
    var key = activeBtn ? activeBtn.dataset.key : 'f62';
    fetchPlateData(tabId, code, key);
}

function fetchPlateData(tabId, code, key) {
    if (!code) { return; }
    var lEl = document.getElementById(tabId + 'Loading');
    var cEl = document.getElementById(tabId + 'Chart');
    lEl.style.display = 'flex';
    cEl.style.display = 'none';
    var url = 'https://data.eastmoney.com/dataapi/bkzj/getbkzj?key=' + key + '&code=' + encodeURIComponent(code);
    proxyFetch(url).then(function(json) {
        if (!json) { lEl.innerHTML = '<div class="error-msg">数据加载失败，请重试</div>'; return; }
        lEl.style.display = 'none';
        cEl.style.display = 'block';
        // 接口返回结构: { data: { diff: [{f12,f13,f14,f62/f164/f174,...}] } }
        renderPlateChart(tabId, (json && json.data && json.data.diff) || [], key);
    });
}

function renderPlateChart(tabId, list, key) {
    var cEl = document.getElementById(tabId + 'Chart');
    if (!list || !list.length) { cEl.innerHTML = '<div class="error-msg">暂无数据</div>'; return; }
    // f14=板块名称, key=f62/f164/f174 对应今日/5日/10日净流入（单位：元，转亿元）
    var sorted = list.slice().sort(function(a, b){ return (b[key] || 0) - (a[key] || 0); });
    var names  = sorted.map(function(d){ return d.f14 || '--'; });
    var values = sorted.map(function(d){ return parseFloat(((d[key] || 0) / 1e8).toFixed(4)); });
    var colors = values.map(function(v){ return v >= 0 ? '#f56c6c' : '#4eb61b'; });
    var chart  = getChart(tabId + 'Chart');
    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', formatter: function(params) {
            var p = params[0], v = parseFloat(p.value), sign = v >= 0 ? '+' : '', col = v >= 0 ? '#f56c6c' : '#4eb61b';
            return p.name + '<br/>净流入: <span style="color:' + col + ';font-weight:600;">' + sign + v.toFixed(2) + '</span> 亿';
        }},
        grid: { left: 50, right: 20, top: 20, bottom: 130, containLabel: false },
        xAxis: { type: 'category', data: names, axisLabel: {
            color: TC, fontSize: 11, rotate: 0,
            formatter: function(value) { return value.split('').join('\n'); }
        }, axisLine: { lineStyle: { color: GC } } },
        yAxis: { type: 'value', axisLabel: { color: TC, fontSize: 11 }, splitLine: { lineStyle: { color: GC, type: 'dashed' } } },
        dataZoom: [
            { type: 'slider', xAxisIndex: 0, bottom: 8, height: 18, borderColor: GC, fillerColor: IS_DARK ? 'rgba(100,100,120,.3)' : 'rgba(180,180,200,.3)', handleStyle: { color: IS_DARK ? '#888' : '#aaa' }, textStyle: { color: TC, fontSize: 10 }, startValue: 0, endValue: Math.min(29, names.length - 1) },
            { type: 'inside', xAxisIndex: 0 }
        ],
        series: [{ type: 'bar', data: values.map(function(v, i){ return { value: v, itemStyle: { color: colors[i] } }; }), barMaxWidth: 30 }]
    }, true);
}

/* ---- 加载指数图片 ---- */
function loadIndexImages() {
    var indexConfigs = {
        'a-stock': [
            { nid: '1.000001', name: '上证指数' },
            { nid: '1.000300', name: '沪深300' },
            { nid: '0.399001', name: '深证成指' },
            { nid: '1.000688', name: '科创50' },
            { nid: '0.399006', name: '创业板指' },
            { nid: '0.399005', name: '中小100' },
            { nid: '118.AU9999', name: '黄金9999' }
        ],
        'hk-stock': [
            { nid: '100.HSI', name: '恒生指数' },
            { nid: '124.HSTECH', name: '恒生科技' }
        ],
        'us-stock': [
            { nid: '100.DJIA', name: '道琼斯' },
            { nid: '100.NDX', name: '纳斯达克' },
            { nid: '100.NDX100', name: '纳斯达克100' },
            { nid: '100.SPX', name: '标普500' },
            { nid: '101.GC00Y', name: 'COMEX黄金' }
        ],
        'asia-pacific': [
            { nid: '100.N225', name: '日经225' },
            { nid: '100.VNINDEX', name: '越南胡志明' },
            { nid: '100.SENSEX', name: '印度孟买SENS' }
        ]
    };
    
    Object.keys(indexConfigs).forEach(function(category) {
        var container = document.getElementById('index-' + category);
        if (!container) { return; }
        
        var html = indexConfigs[category].map(function(idx) {
            var url = 'https://webquotepic.eastmoney.com/GetPic.aspx?imageType=WAPINDEX2&nid=' + idx.nid + '&rnd=' + Date.now();
            return '<img class="index-img-item" src="' + url + '" alt="' + idx.name + '" title="' + idx.name + '" loading="lazy" />';
        }).join('');
        
        container.innerHTML = html;
    });
}

function renderIndexCards(data, containerId) {
    var container = document.getElementById(containerId || 'indexCards');
    if (!container) { return; }
    if (!data || !data.length) { 
        container.innerHTML = '<div class="error-msg">暂无数据</div>'; 
        return; 
    }
    container.innerHTML = data.map(function(item, index) {
        var chgPct = item.changePct, chgAbs = item.changeAbs;
        var cls     = chgPct > 0 ? 'up' : chgPct < 0 ? 'down' : 'flat';
        var cardCls = chgPct > 0 ? 'up-card' : chgPct < 0 ? 'down-card' : 'flat-card';
        var sign    = chgPct >= 0 ? '+' : '';
        var code = indexCardsConfig[index] ? indexCardsConfig[index].code : '';
        return '<div class="index-card ' + cardCls + '" onclick="handleIndexCardClick(\'' + code + '\', \'' + item.name + '\')">' +
            '<div class="idx-name">' + item.name + '</div>' +
            '<div class="idx-value ' + cls + '">' + (item.price != null ? item.price.toFixed(2) : '--') + '</div>' +
            '<div class="idx-change ' + cls + '">' + sign + (chgPct != null ? chgPct.toFixed(2) : '--') + '%</div>' +
            '<div class="idx-abs ' + cls + '">' + sign + (chgAbs != null ? chgAbs.toFixed(2) : '--') + '</div>' +
            '</div>';
    }).join('');
}

// 点击指数卡片，查看详情
function handleIndexCardClick(code, name) {
    openIndexDetailDialog(code, name);
}

// 编辑指数卡片
function handleEditIndexCards() {
    openIndexEditDialog();
}

/* ---- 指数详情弹窗 ---- */
var indexDetailChartInstance = null;

function openIndexDetailDialog(code, name) {
    document.getElementById('indexDetailTitle').textContent = name + ' (' + code + ')';
    document.getElementById('indexDetailDialog').style.display = 'flex';
    document.getElementById('indexDetailLoading').style.display = 'flex';
    document.getElementById('indexDetailChart').style.display = 'none';
    
    // 加载数据
    loadIndexDetailData(code);
}

function closeIndexDetailDialog(event) {
    if (event && event.target !== event.currentTarget) { return; }
    document.getElementById('indexDetailDialog').style.display = 'none';
}

function loadIndexDetailData(code) {
    var url = 'https://push2.eastmoney.com/api/qt/stock/trends2/get?secid=' + code + '&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f53,f56,f58&iscr=0&iscca=0&ndays=1&forcect=1&_=' + Date.now();
    
    fetch(url).then(function(r){ return r.json(); }).then(function(json) {
        if (!json || !json.data) {
            document.getElementById('indexDetailLoading').innerHTML = '<div class="error-msg">数据加载失败</div>';
            return;
        }
        
        document.getElementById('indexDetailLoading').style.display = 'none';
        document.getElementById('indexDetailChart').style.display = 'block';
        renderIndexDetailChart(json.data);
    }).catch(function() {
        document.getElementById('indexDetailLoading').innerHTML = '<div class="error-msg">数据加载失败</div>';
    });
}

function renderIndexDetailChart(data) {
    var DWJZ = data.prePrice;
    var dataList = data.trends.map(function(item) {
        var parts = item.split(',');
        return [
            parts[0],
            parseFloat(parts[1]),
            parseFloat(parts[2]),
            parseFloat(parts[3])
        ];
    });
    
    // 生成时间轴
    var timeData = generateTimeArray();
    
    var seriesData = dataList.map(function(item){ return item[1]; });
    var volumeData = dataList.map(function(item, index) {
        var color = index === 0 || item[1] > dataList[index - 1][1] ? '#f56c6c' : '#4eb61b';
        return { value: item[2], itemStyle: { color: color } };
    });
    
    // 计算Y轴范围
    var maxPrice = Math.max.apply(null, seriesData);
    var minPrice = Math.min.apply(null, seriesData);
    var aa = Math.max(Math.abs((maxPrice - DWJZ) / DWJZ), Math.abs((minPrice - DWJZ) / DWJZ));
    var minVal = DWJZ - DWJZ * aa;
    var maxVal = DWJZ + DWJZ * aa;
    var interval = Math.abs((DWJZ - minVal) / 4);
    
    var el = document.getElementById('indexDetailChart');
    if (!indexDetailChartInstance) {
        indexDetailChartInstance = echarts.init(el);
    }
    
    function yAxisLabelColor(val) {
        return val > DWJZ ? '#f56c6c' : val === DWJZ ? '#666' : '#4eb61b';
    }
    
    indexDetailChartInstance.setOption({
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross', label: { show: true, color: '#ccc', backgroundColor: 'rgba(0,0,0,0.6)' } },
            formatter: function(p) {
                if (!p || p.length === 0) { return ''; }
                var dataIndex = p[0].dataIndex;
                var color = dataIndex === 0 || dataList[dataIndex][1] > dataList[dataIndex - 1][1] ? '#f56c6c' : '#4eb61b';
                var changePercent = (((dataList[dataIndex][1] - DWJZ) * 100) / DWJZ).toFixed(2);
                return '<div style="font-weight:600;margin-bottom:8px;">' + p[0].name + '</div>' +
                    '<div style="display:flex;align-items:center;margin:4px 0;gap:8px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:#3b82f6;"></span><span style="flex:1;">价格:</span><span style="font-weight:600;">' + dataList[dataIndex][1] + '</span></div>' +
                    '<div style="display:flex;align-items:center;margin:4px 0;gap:8px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:' + color + ';"></span><span style="flex:1;">涨幅:</span><span style="color:' + color + ';font-weight:600;">' + changePercent + '%</span></div>' +
                    '<div style="display:flex;align-items:center;margin:4px 0;gap:8px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:#999;"></span><span style="flex:1;">成交量:</span><span style="font-weight:600;">' + (dataList[dataIndex][2] / 10000).toFixed(3) + '万</span></div>';
            }
        },
        axisPointer: { link: { xAxisIndex: 'all' } },
        grid: [
            { top: 20, left: 60, right: 60, height: '50%' },
            { show: true, left: 60, right: 60, top: '65%', height: '28%' }
        ],
        xAxis: [
            {
                data: timeData,
                position: 'bottom',
                axisLine: { onZero: false },
                axisLabel: {
                    formatter: function(val) { return val === '11:30' ? '11:30/13:00' : val; },
                    interval: function(index, value) { return ['09:30', '10:30', '11:30', '14:00', '15:00'].indexOf(value) !== -1; }
                }
            },
            {
                splitNumber: 2,
                type: 'category',
                gridIndex: 1,
                boundaryGap: false,
                data: timeData,
                axisTick: { show: false },
                splitLine: { show: true, lineStyle: { type: 'dashed', color: '#ccc' } },
                axisLine: { lineStyle: {} },
                axisLabel: {
                    formatter: function(val) { return val === '11:30' ? '11:30/13:00' : val; },
                    interval: function(index, value) { return ['09:30', '10:30', '11:30', '14:00', '15:00'].indexOf(value) !== -1; }
                },
                axisPointer: {
                    show: true,
                    label: {
                        formatter: function(p) {
                            if (p.seriesData[0] && dataList[p.seriesData[0].dataIndex]) {
                                return (dataList[p.seriesData[0].dataIndex][2] / 10000).toFixed(3) + '万';
                            }
                            return '';
                        }
                    }
                }
            }
        ],
        yAxis: [
            {
                type: 'value',
                min: minVal,
                max: maxVal,
                interval: interval,
                axisLine: { show: true },
                axisLabel: {
                    color: yAxisLabelColor,
                    formatter: function(val) { return val.toFixed(2); }
                },
                splitLine: { show: true, lineStyle: { type: 'dashed', color: '#ccc' } },
                axisPointer: {
                    show: true,
                    label: { formatter: function(params) { return params.value.toFixed(2); } }
                }
            },
            {
                type: 'value',
                min: minVal,
                max: maxVal,
                interval: interval,
                axisLabel: {
                    color: yAxisLabelColor,
                    formatter: function(val) {
                        var num = (((val - DWJZ) * 100) / DWJZ).toFixed(2);
                        if (num === '-0.00') { num = '0.00'; }
                        return num + '%';
                    }
                },
                splitLine: { show: true, lineStyle: { type: 'dashed', color: '#ccc' } },
                axisPointer: {
                    show: true,
                    label: { formatter: function(p) { return (((p.value - DWJZ) * 100) / DWJZ).toFixed(2) + '%'; } }
                }
            },
            {
                gridIndex: 1,
                z: 4,
                splitNumber: 3,
                axisLine: { onZero: false, show: false },
                axisTick: { show: false },
                splitLine: { show: false },
                axisPointer: {
                    show: true,
                    label: { formatter: function(params) { return (params.value / 10000).toFixed(2) + '万'; } }
                },
                axisLabel: {
                    inside: false,
                    fontSize: 10,
                    onZero: false,
                    formatter: function(params) {
                        var _p = (params / 10000).toFixed(2);
                        if (params === 0) { return '(万)'; }
                        return _p;
                    }
                }
            }
        ],
        series: [
            {
                name: '涨幅',
                type: 'line',
                data: seriesData,
                symbol: 'none',
                lineStyle: { width: 1.5, color: '#3b82f6' },
                markLine: {
                    silent: true,
                    symbol: 'none',
                    animation: false,
                    label: { show: false },
                    lineStyle: { type: 'solid' },
                    data: [{ yAxis: DWJZ }]
                }
            },
            {
                name: '价格',
                type: 'line',
                yAxisIndex: 1,
                symbol: 'none',
                data: seriesData,
                lineStyle: { width: 0 }
            },
            {
                name: '成交量',
                type: 'bar',
                gridIndex: 1,
                xAxisIndex: 1,
                yAxisIndex: 2,
                data: volumeData
            }
        ]
    }, true);
}

/* ---- 指数编辑弹窗 ---- */
var ALL_AVAILABLE_INDICES = [
    { code: '1.000001', name: '上证指数' },
    { code: '1.000300', name: '沪深300' },
    { code: '0.399001', name: '深证成指' },
    { code: '1.000688', name: '科创50' },
    { code: '0.399006', name: '创业板指' },
    { code: '0.399005', name: '中小100' },
    { code: '118.AU9999', name: '黄金9999' },
    { code: '100.HSI', name: '恒生指数' },
    { code: '124.HSTECH', name: '恒生科技' },
    { code: '100.DJIA', name: '道琼斯' },
    { code: '100.NDX', name: '纳斯达克' },
    { code: '100.SPX', name: '标普500' },
    { code: '101.GC00Y', name: 'COMEX黄金' },
    { code: '100.N225', name: '日经225' },
    { code: '100.VNINDEX', name: '越南胡志明' },
    { code: '100.SENSEX', name: '印度孟买' }
];

var editingIndexCards = [];
var dragStartIndex = -1;

function openIndexEditDialog() {
    editingIndexCards = JSON.parse(JSON.stringify(indexCardsConfig));
    renderIndexEditList();
    updateIndexAddSelect();
    document.getElementById('indexEditDialog').style.display = 'flex';
}

function closeIndexEditDialog(event) {
    if (event && event.target !== event.currentTarget) { return; }
    document.getElementById('indexEditDialog').style.display = 'none';
}

function renderIndexEditList() {
    var html = editingIndexCards.map(function(item, index) {
        return '<div class="index-edit-item" draggable="true" data-index="' + index + '" ondragstart="handleDragStart(event)" ondragover="handleDragOver(event)" ondrop="handleDrop(event)">' +
            '<span class="index-edit-drag">☰</span>' +
            '<span class="index-edit-name">' + item.name + '</span>' +
            '<button class="index-edit-btn" onclick="moveIndexUp(' + index + ')" ' + (index === 0 ? 'disabled' : '') + '>↑</button>' +
            '<button class="index-edit-btn" onclick="moveIndexDown(' + index + ')" ' + (index >= editingIndexCards.length - 1 ? 'disabled' : '') + '>↓</button>' +
            '<button class="index-edit-btn index-edit-btn-danger" onclick="removeIndexFromEdit(' + index + ')">删除</button>' +
            '</div>';
    }).join('');
    document.getElementById('indexEditList').innerHTML = html;
}

function updateIndexAddSelect() {
    var selectedCodes = editingIndexCards.map(function(c){ return c.code; });
    var available = ALL_AVAILABLE_INDICES.filter(function(item){ return selectedCodes.indexOf(item.code) === -1; });
    var html = '<option value="">选择要添加的指数...</option>' +
        available.map(function(item){ return '<option value="' + item.code + '">' + item.name + '</option>'; }).join('');
    document.getElementById('indexAddSelect').innerHTML = html;
}

function handleDragStart(event) {
    dragStartIndex = parseInt(event.target.dataset.index);
}

function handleDragOver(event) {
    event.preventDefault();
}

function handleDrop(event) {
    event.preventDefault();
    var dropIndex = parseInt(event.currentTarget.dataset.index);
    if (dragStartIndex === -1 || dragStartIndex === dropIndex) { return; }
    
    var dragItem = editingIndexCards[dragStartIndex];
    editingIndexCards.splice(dragStartIndex, 1);
    editingIndexCards.splice(dropIndex, 0, dragItem);
    dragStartIndex = -1;
    renderIndexEditList();
}

function moveIndexUp(index) {
    if (index === 0) { return; }
    var item = editingIndexCards.splice(index, 1)[0];
    editingIndexCards.splice(index - 1, 0, item);
    renderIndexEditList();
}

function moveIndexDown(index) {
    if (index >= editingIndexCards.length - 1) { return; }
    var item = editingIndexCards.splice(index, 1)[0];
    editingIndexCards.splice(index + 1, 0, item);
    renderIndexEditList();
}

function removeIndexFromEdit(index) {
    editingIndexCards.splice(index, 1);
    renderIndexEditList();
    updateIndexAddSelect();
}

function handleAddIndexToEdit() {
    var select = document.getElementById('indexAddSelect');
    var code = select.value;
    if (!code) { return; }
    
    var item = ALL_AVAILABLE_INDICES.find(function(i){ return i.code === code; });
    if (item) {
        editingIndexCards.push({ code: item.code, name: item.name });
        renderIndexEditList();
        updateIndexAddSelect();
        select.value = '';
    }
}

function handleSaveIndexEdit() {
    indexCardsConfig = JSON.parse(JSON.stringify(editingIndexCards));
    vsc.postMessage({ command: 'saveIndexCardsConfig', config: indexCardsConfig });
    closeIndexEditDialog();
    // 重新加载数据
    loadIndexAndStat();
}

/* ---- 自动刷新机制（每分钟整点） ---- */
var autoRefreshTimer = null;
var countdownTimer = null;

function setupAutoRefresh() {
    // 清除旧定时器
    if (autoRefreshTimer) { clearInterval(autoRefreshTimer); }
    if (countdownTimer) { clearInterval(countdownTimer); }
    
    // 每分钟整点刷新
    function scheduleNextRefresh() {
        var now = new Date();
        var seconds = now.getSeconds();
        var ms = now.getMilliseconds();
        var delay = (60 - seconds) * 1000 - ms;
        
        setTimeout(function() {
            // 检查是否在交易时间内（工作日 9:00-15:00）
            var hour = new Date().getHours();
            var day = new Date().getDay();
            if (day >= 1 && day <= 5 && hour >= 9 && hour < 15) {
                refreshAll();
            }
            scheduleNextRefresh();
        }, delay);
    }
    
    scheduleNextRefresh();
    
    // 倒计时显示
    countdownTimer = setInterval(function() {
        var now = new Date();
        var seconds = 60 - now.getSeconds();
        var timeEl = document.getElementById('updateTime');
        if (timeEl && timeEl.textContent.indexOf('更新于') !== -1) {
            var baseText = timeEl.textContent.split('（')[0];
            timeEl.textContent = baseText + ' （' + seconds + '秒后刷新）';
        }
    }, 1000);
}

loadTabOnce('market');
loadIndexCardsConfig();
loadGrayscaleMode();
setupAutoRefresh();
`;
    /* eslint-enable */
  }
}
