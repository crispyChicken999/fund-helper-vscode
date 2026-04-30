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
      '.page-header { display: flex; align-items: center; gap: 10px; padding-bottom: 12px; border-bottom: 1px solid var(--vscode-panel-border); }',
      '.page-header h1 { font-size: 1.2rem; font-weight: 600; }',
      '.update-time { font-size: .8em; color: var(--vscode-descriptionForeground); margin-left: auto; }',
      '.refresh-btn { padding: 4px 12px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: 1px solid var(--vscode-panel-border); border-radius: 4px; cursor: pointer; font-size: .82em; font-family: inherit; transition: background .2s; white-space: nowrap; }',
      '.refresh-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }',
      '.tabs { display: flex; gap: 2px; border-bottom: 2px solid var(--vscode-panel-border); overflow-x: auto; padding-bottom: 2px; position: relative; overflow-y: hidden; scrollbar-width: none;}',
      '.tabs::-webkit-scrollbar { display: none; }',
      '.tabs::before { content:"";  position: absolute; bottom: 0; width: max(100%, 530px); height: 1px; background: var(--vscode-panel-border);',
      '.tab-btn { padding: 7px 16px; background: transparent; border: none; border-bottom: 3px solid transparent; color: var(--vscode-descriptionForeground); cursor: pointer; font-size: .88rem; font-family: inherit; transition: all .2s; margin-bottom: -2px; border-radius: 4px 4px 0 0; white-space: nowrap; }',
      '.tab-btn:hover { color: var(--vscode-editor-foreground); background: var(--vscode-list-hoverBackground); }',
      '.tab-btn.active { color: var(--vscode-editor-foreground); border-bottom-color: var(--vscode-focusBorder); font-weight: 600; background: var(--vscode-list-hoverBackground);}',
      '.tab-content { display: none; }',
      '.tab-content.active { display: flex; flex-direction: column; gap: 14px; }',
      '.card { background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 14px 16px; }',
      '.card-title { font-size: .85rem; font-weight: 600; color: var(--vscode-descriptionForeground); margin-bottom: 10px; }',
      '.market-stat { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; font-size: .88em; padding: 10px 14px; background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-panel-border); border-radius: 8px; }',
      '.stat-item { display: flex; align-items: center; gap: 5px; }',
      '.stat-label { color: var(--vscode-descriptionForeground); }',
      '.stat-val { font-weight: 600; }',
      '.up { color: #f56c6c; } .down { color: #4eb61b; } .flat { color: var(--vscode-descriptionForeground); }',
      '.index-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(170px,1fr)); gap: 10px; }',
      '.index-card { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 7px; padding: 12px 14px; transition: box-shadow .2s; }',
      '.index-card:hover { box-shadow: 0 3px 10px rgba(0,0,0,.18); }',
      '.index-card.up-card { border-left: 3px solid #f56c6c; }',
      '.index-card.down-card { border-left: 3px solid #4eb61b; }',
      '.index-card.flat-card { border-left: 3px solid var(--vscode-descriptionForeground); }',
      '.idx-name { font-size: .8em; color: var(--vscode-descriptionForeground); margin-bottom: 5px; }',
      '.idx-value { font-size: 1.5em; font-weight: 700; margin-bottom: 3px; }',
      '.idx-change { font-size: .85em; font-weight: 600; }',
      '.idx-abs { font-size: .78em; color: var(--vscode-descriptionForeground); }',
      '.flow-chart { width: 100%; height: 340px; }',
      '.unit-label { font-size: .78em; color: var(--vscode-descriptionForeground); margin-bottom: 4px; }',
      '.sub-tabs { display: flex; gap: 10px; margin-bottom: 10px; }',
      '.sub-tab-btn { padding: 4px 14px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: 1px solid var(--vscode-panel-border); border-radius: 4px; cursor: pointer; font-size: .82em; font-family: inherit; transition: background .2s; }',
      '.sub-tab-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }',
      '.sub-tab-btn.active { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-color: var(--vscode-button-background); }',
      '.plate-chart { width: 100%; height: 320px; }',
      '.loading-wrap { display: flex; align-items: center; justify-content: center; padding: 36px; color: var(--vscode-descriptionForeground); gap: 8px; }',
      '.spinner { width: 18px; height: 18px; border: 2px solid var(--vscode-panel-border); border-top-color: var(--vscode-focusBorder); border-radius: 50%; animation: spin .8s linear infinite; }',
      '@keyframes spin { to { transform: rotate(360deg); } }',
      '.error-msg { color: var(--vscode-errorForeground); padding: 20px; text-align: center; font-size: .88em; }',
      '.index-images-container { position: relative; }',
      '.index-images { display: none; flex-wrap: wrap; gap: 10px; justify-content: flex-start; }',
      '.index-images.active { display: flex; }',
      '.index-img-item { width: 100px; height: 117.64px; object-fit: cover; border-radius: 8px; border: 1px solid var(--vscode-panel-border); background: var(--vscode-editor-background); cursor: pointer; }',
      '.index-img-item:hover { box-shadow: 0 4px 12px rgba(0,0,0,.2); transition: all 0.2s; }',
      '</style>',
      '</head>',
      '<body>',

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
      '<div class="market-stat" id="marketStat"><div class="loading-wrap" style="padding:6px 0"><div class="spinner"></div>加载中...</div></div>',
      '<div class="card"><div class="card-title">大盘指数</div><div id="indexCards" class="index-grid"><div class="loading-wrap" style="grid-column:1/-1"><div class="spinner"></div>加载中...</div></div></div>',
      
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
    document.getElementById('marketStat').innerHTML  = '<div class="loading-wrap" style="padding:6px 0"><div class="spinner"></div>加载中...</div>';
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

window.addEventListener('message', function(ev) {
    var msg = ev.data;
    if (msg.command === 'proxyResponse' || msg.command === 'marketStatResponse') {
        var fn = pending[msg.reqId];
        if (fn) { delete pending[msg.reqId]; fn(msg.data); }
    }
});

/* ---- 大盘资金 ---- */
function loadMarket() {
    Promise.all([loadIndexAndStat(), loadFlowKline()]).then(function() {
        document.getElementById('updateTime').textContent = '更新于 ' + new Date().toLocaleTimeString('zh-CN');
    });
}

function loadIndexAndStat() {
    var secids = '1.000001,1.000300,0.399001,0.399006';
    var url = 'https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f4,f12,f13,f14&secids=' + secids + '&_=' + Date.now();
    return fetch(url).then(function(r){ return r.json(); }).then(function(json) {
        var data = (json && json.data && json.data.diff) || [];
        var formatted = data.map(function(d) {
            return {
                name: d.f14,
                price: d.f2,
                changePct: d.f3,
                changeAbs: d.f4
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
        if (!stat) { document.getElementById('marketStat').innerHTML = '<span style="color:var(--vscode-descriptionForeground)">统计数据获取失败</span>'; return; }
        var amtStr = stat.totalAmount > 0 ? (stat.totalAmount / 1e8).toFixed(2) : '--';
        document.getElementById('marketStat').innerHTML =
            '<div class="stat-item"><span class="stat-label">两市合计成交额：</span><span class="stat-val">' + amtStr + '亿元</span></div>' +
            '<div class="stat-item"><span class="stat-label">上涨：</span><span class="stat-val up">' + (stat.upCount || '--') + '</span></div>' +
            '<div class="stat-item"><span class="stat-label">平盘：</span><span class="stat-val flat">' + (stat.flatCount || '--') + '</span></div>' +
            '<div class="stat-item"><span class="stat-label">下跌：</span><span class="stat-val down">' + (stat.downCount || '--') + '</span></div>';
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

function renderFlowChart(klines) {
    var times = [], main = [], superBig = [], big = [], mid = [], small = [];
    klines.forEach(function(line) {
        var p = line.split(',');
        times.push(p[0].slice(11));
        main.push(    (parseFloat(p[1]) / 1e8).toFixed(4));
        superBig.push((parseFloat(p[2]) / 1e8).toFixed(4));
        big.push(     (parseFloat(p[3]) / 1e8).toFixed(4));
        mid.push(     (parseFloat(p[4]) / 1e8).toFixed(4));
        small.push(   (parseFloat(p[5]) / 1e8).toFixed(4));
    });
    var chart = getChart('flowChart');
    function mkS(name, data, color) { return { name: name, type: 'line', data: data, smooth: true, showSymbol: false, lineStyle: { color: color, width: 1.5 }, itemStyle: { color: color } }; }
    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', formatter: function(params) {
            var s = '<div style="margin-bottom:4px;font-weight:600;">' + params[0].name + '</div>';
            params.forEach(function(p) {
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
    container.innerHTML = data.map(function(item) {
        var chgPct = item.changePct, chgAbs = item.changeAbs;
        var cls     = chgPct > 0 ? 'up' : chgPct < 0 ? 'down' : 'flat';
        var cardCls = chgPct > 0 ? 'up-card' : chgPct < 0 ? 'down-card' : 'flat-card';
        var sign    = chgPct >= 0 ? '+' : '';
        return '<div class="index-card ' + cardCls + '">' +
            '<div class="idx-name">' + item.name + '</div>' +
            '<div class="idx-value ' + cls + '">' + (item.price != null ? item.price.toFixed(2) : '--') + '</div>' +
            '<div class="idx-change ' + cls + '">' + sign + (chgPct != null ? chgPct.toFixed(2) : '--') + '%</div>' +
            '<div class="idx-abs ' + cls + '">' + sign + (chgAbs != null ? chgAbs.toFixed(2) : '--') + '</div>' +
            '</div>';
    }).join('');
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
setupAutoRefresh();
`;
    /* eslint-enable */
  }
}
