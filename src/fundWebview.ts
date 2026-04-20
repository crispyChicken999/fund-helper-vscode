import * as vscode from 'vscode';
import { FundInfo } from './fundModel';

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

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${fund.name} - 基金详情</title>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
    <style>
        body {
            font-family: var(--vscode-font-family), sans-serif;
            color: var(--vscode-editor-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        h2 {
            margin-top: 0;
            margin-bottom: 5px;
            font-size: 1.2rem;
        }
        h3 {
            margin-top: 0;
            margin-bottom: 12px;
            font-size: 1.1rem;
            color: var(--vscode-editor-foreground);
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 15px;
        }
        .card {
            background-color: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .chart-container {
            width: 100%;
            height: 350px;
            margin-top: 10px;
        }
        .controls {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        .btn-group {
            display: flex;
            gap: 5px;
        }
        .btn-group button {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-panel-border);
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            outline: none;
            transition: all 0.2s;
        }
        .btn-group button:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        .btn-group button.active {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-color: var(--vscode-button-background);
        }
        
        .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 15px;
        }
        .info-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 10px;
            background: var(--vscode-editor-background);
            border-radius: 6px;
            border: 1px solid var(--vscode-panel-border);
        }
        .info-label {
            font-size: 0.85em;
            color: var(--vscode-descriptionForeground);
        }
        .info-value {
            font-size: 1.05em;
            font-weight: 500;
        }
        .info-value.up { color: #f56c6c; }
        .info-value.down { color: #4eb61b; }
        
        .manager-info {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .manager-card {
            display: flex;
            gap: 20px;
            padding: 20px;
            background: var(--vscode-editor-background);
            border-radius: 12px;
            border: 1px solid var(--vscode-panel-border);
            transition: all 0.2s ease;
        }
        .manager-card:hover {
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .manager-avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            object-fit: cover;
            background: linear-gradient(135deg, var(--vscode-button-secondaryBackground) 0%, var(--vscode-button-background) 100%);
            border: 3px solid var(--vscode-panel-border);
            flex-shrink: 0;
        }
        .manager-details {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .manager-name {
            font-size: 1.2em;
            font-weight: 600;
            color: var(--vscode-editor-foreground);
            margin-bottom: 4px;
        }
        .manager-tag {
            display: inline-block;
            padding: 4px 12px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border-radius: 16px;
            font-size: 0.85em;
            margin-right: 8px;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        .manager-tag:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .manager-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 12px;
            margin-top: 4px;
        }
        .manager-stat {
            text-align: center;
            padding: 12px;
            background: var(--vscode-editorWidget-background);
            border-radius: 8px;
            border: 1px solid var(--vscode-panel-border);
            transition: all 0.2s ease;
        }
        .manager-stat:hover {
            border-color: var(--vscode-focusBorder);
            transform: translateY(-2px);
        }
        .manager-stat-label {
            font-size: 0.85em;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 6px;
            font-weight: 500;
        }
        .manager-stat-value {
            font-size: 1.1em;
            font-weight: 600;
            color: var(--vscode-editor-foreground);
        }
        .manager-resume {
            margin-top: 8px;
            padding: 14px;
            background: var(--vscode-editorWidget-background);
            border-radius: 8px;
            border: 1px solid var(--vscode-panel-border);
            font-size: 0.9em;
            line-height: 1.6;
            color: var(--vscode-editor-foreground);
            max-height: 150px;
            overflow-y: auto;
        }
        .manager-resume::-webkit-scrollbar {
            width: 6px;
        }
        .manager-resume::-webkit-scrollbar-thumb {
            background: var(--vscode-scrollbarSlider-background);
            border-radius: 3px;
        }
        .manager-resume::-webkit-scrollbar-thumb:hover {
            background: var(--vscode-scrollbarSlider-hoverBackground);
        }
        
        .theme-info {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }
        .theme-tag {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 16px;
            background: var(--vscode-editor-background);
            border-radius: 24px;
            border: 1px solid var(--vscode-panel-border);
            font-size: 0.9em;
            transition: all 0.2s ease;
            cursor: default;
        }
        .theme-tag:hover {
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
            transform: translateY(-1px);
        }
        .theme-name {
            font-weight: 600;
            color: var(--vscode-editor-foreground);
        }
        .theme-corr {
            font-size: 0.85em;
            color: var(--vscode-descriptionForeground);
            background: var(--vscode-button-secondaryBackground);
            padding: 3px 8px;
            border-radius: 12px;
            font-weight: 500;
        }
    </style>
</head>
<body>

    <div class="header">
        <div>
            <h2>${fund.name} (${fund.code})</h2>
            <div style="font-size: 0.9em; color: var(--vscode-descriptionForeground);">数据呈现与走势对比估算</div>
        </div>
    </div>
    
    <!-- 持仓信息 -->
    <div class="card">
        <h3>持仓信息</h3>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">持仓份额</div>
                <div class="info-value">${fund.shares.toFixed(2)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">持仓成本</div>
                <div class="info-value">${fund.cost.toFixed(4)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">当前金额</div>
                <div class="info-value">${holdingAmount.toFixed(2)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">最新净值</div>
                <div class="info-value">${fund.netValue.toFixed(4)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">估算净值</div>
                <div class="info-value ${fund.changePercent > 0 ? 'up' : fund.changePercent < 0 ? 'down' : ''}">${fund.estimatedValue !== null ? fund.estimatedValue.toFixed(4) : '--'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">估算涨跌幅</div>
                <div class="info-value ${fund.changePercent > 0 ? 'up' : fund.changePercent < 0 ? 'down' : ''}">${fund.changePercent > 0 ? '+' : ''}${fund.changePercent.toFixed(2)}%</div>
            </div>
            <div class="info-item">
                <div class="info-label">持有收益</div>
                <div class="info-value ${holdingGain > 0 ? 'up' : holdingGain < 0 ? 'down' : ''}">${holdingGain > 0 ? '+' : ''}${holdingGain.toFixed(2)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">持有收益率</div>
                <div class="info-value ${holdingGainRate > 0 ? 'up' : holdingGainRate < 0 ? 'down' : ''}">${holdingGainRate > 0 ? '+' : ''}${holdingGainRate.toFixed(2)}%</div>
            </div>
            <div class="info-item">
                <div class="info-label">日收益（估）</div>
                <div class="info-value ${dailyGain > 0 ? 'up' : dailyGain < 0 ? 'down' : ''}">${dailyGain > 0 ? '+' : ''}${dailyGain.toFixed(2)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">更新时间</div>
                <div class="info-value">${fund.updateTime}</div>
            </div>
        </div>
    </div>
    
    <!-- 基金概况 -->
    <div class="card" style="position: relative;">
        <h3>基金概况</h3>
        <div id="loadingInfo" class="loading">加载中...</div>
        <div id="infoGrid" class="info-grid" style="display: none;">
            <!-- Rendered by JS -->
        </div>
    </div>

    <!-- 基金经理 -->
    <div class="card" style="position: relative;">
        <h3>基金经理</h3>
        <div id="loadingManager" class="loading">加载中...</div>
        <div id="managerInfo" class="manager-info" style="display: none;">
            <!-- Rendered by JS -->
        </div>
    </div>

    <!-- 关联板块 -->
    <div class="card" style="position: relative;">
        <h3>关联板块</h3>
        <div id="loadingTheme" class="loading">加载中...</div>
        <div id="themeInfo" class="theme-info" style="display: none;">
            <!-- Rendered by JS -->
        </div>
    </div>

    <!-- 历史净值 -->
    <div class="card" style="position: relative;">
        <h3>历史净值</h3>
        <div class="controls">
            <div class="btn-group" id="rangeBtns2">
                <button data-value="1w">近1周</button>
                <button data-value="y" class="active">近1月</button>
                <button data-value="3y">近3月</button>
                <button data-value="6y">近6月</button>
                <button data-value="n">近1年</button>
                <button data-value="3n">近3年</button>
                <button data-value="5n">近5年</button>
            </div>
        </div>
        <div id="loading2" class="loading">加载中...</div>
        <div id="chart2" class="chart-container"></div>
    </div>

    <!-- 累计收益率 -->
    <div class="card" style="position: relative;">
        <h3>累计收益</h3>
        <div class="controls">
            <div class="btn-group" id="rangeBtns3">
                <button data-value="1w">近1周</button>
                <button data-value="y" class="active">近1月</button>
                <button data-value="3y">近3月</button>
                <button data-value="6y">近6月</button>
                <button data-value="n">近1年</button>
                <button data-value="3n">近3年</button>
                <button data-value="5n">近5年</button>
            </div>
        </div>
        <div id="loading3" class="loading">加载中...</div>
        <div id="chart3" class="chart-container"></div>
    </div>

    <script>
        const fundCode = '${fund.code}';
        const isDark = ${isDark ? 'true' : 'false'};
        let defaultTextColor = isDark ? '#cccccc' : '#333333';
        let defaultGridColor = isDark ? '#444444' : '#dddddd';

        // Utility: JSONP loader
        function loadJSONP(url, callbackName) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                const fullUrl = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
                script.src = fullUrl;
                
                window[callbackName] = function(data) {
                    resolve(data);
                    document.head.removeChild(script);
                    delete window[callbackName];
                };
                
                script.onerror = function() {
                    reject(new Error('JSONP failed'));
                    document.head.removeChild(script);
                    delete window[callbackName];
                };
                
                document.head.appendChild(script);
            });
        }

        const chart2 = echarts.init(document.getElementById('chart2'));
        const chart3 = echarts.init(document.getElementById('chart3'));

        window.addEventListener('resize', () => {
            chart2.resize();
            chart3.resize();
        });

        const getCommonOption = (title) => ({
            tooltip: { trigger: 'axis' },
            legend: { 
                data: [], 
                textStyle: { color: defaultTextColor } 
            },
            grid: { left: '2%', right: '2%', bottom: '2%', containLabel: true },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: [],
                axisLabel: { color: defaultTextColor, rotate: 45, margin: 12 },
                axisLine: { lineStyle: { color: defaultGridColor } }
            },
            yAxis: {
                type: 'value',
                scale: true, // Auto scaling without strictly starting from 0, makes small fluctuations visible
                axisLabel: { color: defaultTextColor },
                splitLine: { lineStyle: { color: defaultGridColor, type: 'dashed' } }
            },
            series: []
        });

        // Current Ranges
        let range2 = 'y';
        let range3 = 'y';

        // Button Click Binders
        document.querySelectorAll('#rangeBtns2 button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#rangeBtns2 button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                range2 = e.target.getAttribute('data-value');
                fetchHistoryNetVal();
            });
        });

        document.querySelectorAll('#rangeBtns3 button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#rangeBtns3 button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                range3 = e.target.getAttribute('data-value');
                fetchHistoryYield();
            });
        });

        // 基金概况
        function fetchFundInfo() {
            let url = \`https://fundmobapi.eastmoney.com/FundMApi/FundBaseTypeInformation.ashx?FCODE=\${fundCode}&deviceid=Wap&plat=Wap&product=EFund&version=2.0.0&Uid=&_=\${new Date().getTime()}\`;
            let callbackName = 'jsonpInfo_' + Date.now();
            
            loadJSONP(url, callbackName).then(res => {
                document.getElementById('loadingInfo').style.display = 'none';
                if(!res || !res.Datas) return;
                let data = res.Datas;
                
                function formatMoney(val) {
                    if (!val) return '--';
                    if (val >= 100000000) return (val / 100000000).toFixed(2) + ' 亿';
                    if (val >= 10000) return (val / 10000).toFixed(2) + ' 万';
                    return val.toFixed(2);
                }
                
                function renderColor(val) {
                    if(!val) return '';
                    let num = parseFloat(val);
                    if(num > 0) return 'up';
                    if(num < 0) return 'down';
                    return '';
                }

                let html = \`
                    <div class="info-item">
                        <div class="info-label">基金类型</div>
                        <div class="info-value">\${data.FTYPE || '--'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">成立日期</div>
                        <div class="info-value">\${data.ESTABDATE || '--'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">基金公司</div>
                        <div class="info-value">\${data.JJGS || '--'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">基金经理</div>
                        <div class="info-value">\${data.JJJL || '--'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">单位净值</div>
                        <div class="info-value">\${data.DWJZ || '--'} (\${data.FSRQ || '--'})</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">累计净值</div>
                        <div class="info-value">\${data.LJJZ || '--'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">基金规模</div>
                        <div class="info-value">\${formatMoney(data.ENDNAV)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">交易状态</div>
                        <div class="info-value">\${data.SGZT || '--'} / \${data.SHZT || '--'}</div>
                    </div>
                    
                    <div class="info-item">
                        <div class="info-label">近1周收益率</div>
                        <div class="info-value \${renderColor(data.SYL_Z)}">\${data.SYL_Z > 0 ? '+':''}\${data.SYL_Z || '0'}%</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">近1月收益率 (排名)</div>
                        <div class="info-value \${renderColor(data.SYL_Y)}">\${data.SYL_Y > 0 ? '+':''}\${data.SYL_Y || '0'}% (\${data.RANKM || '--'})</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">近3月收益率 (排名)</div>
                        <div class="info-value \${renderColor(data.SYL_3Y)}">\${data.SYL_3Y > 0 ? '+':''}\${data.SYL_3Y || '0'}% (\${data.RANKQ || '--'})</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">近6月收益率 (排名)</div>
                        <div class="info-value \${renderColor(data.SYL_6Y)}">\${data.SYL_6Y > 0 ? '+':''}\${data.SYL_6Y || '0'}% (\${data.RANKHY || '--'})</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">近1年收益率 (排名)</div>
                        <div class="info-value \${renderColor(data.SYL_1N)}">\${data.SYL_1N > 0 ? '+':''}\${data.SYL_1N || '0'}% (\${data.RANKY || '--'})</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">近3年收益率 (排名)</div>
                        <div class="info-value \${renderColor(data.SYL_3N)}">\${data.SYL_3N > 0 ? '+':''}\${data.SYL_3N || '0'}% (\${data.RANK3N || '--'})</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">近5年收益率 (排名)</div>
                        <div class="info-value \${renderColor(data.SYL_5N)}">\${data.SYL_5N > 0 ? '+':''}\${data.SYL_5N || '0'}% (\${data.RANK5N || '--'})</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">成立以来收益率</div>
                        <div class="info-value \${renderColor(data.SYL_LN)}">\${data.SYL_LN > 0 ? '+':''}\${data.SYL_LN || '0'}%</div>
                    </div>
                \`;
                
                document.getElementById('infoGrid').innerHTML = html;
                document.getElementById('infoGrid').style.display = 'grid';
            }).catch(e => {
                document.getElementById('loadingInfo').style.display = 'none';
            });
        }

        // 获取详细基金信息（包括基金经理和关联板块）
        function fetchDetailedFundInfo() {
            const url = 'https://dgs.tiantianfunds.com/merge/m/api/jjxqy1_2';
            const params = new URLSearchParams({
                deviceid: 'fd7dac76-c5e9-4723-8fe6-7b436b2b1443',
                version: '9.9.9',
                appVersion: '6.5.5',
                product: 'EFund',
                plat: 'Web',
                uid: '',
                fcode: fundCode,
                ISRG: '0',
                indexfields: '_id,INDEXCODE,BKID,INDEXNAME,INDEXVALUA,NEWINDEXTEXCH,PEP100',
                fields: 'BENCH,ESTDIFF,INDEXNAME,LINKZSB,INDEXCODE,NEWTEXCH,FTYPE,FCODE,BAGTYPE,RISKLEVEL,TTYPENAME,PTDT_FY,PTDT_TRY,PTDT_TWY,PTDT_Y,DWDT_FY,DWDT_TRY,DWDT_TWY,DWDT_Y,MBDT_FY,MBDT_TRY,MBDT_TWY,MBDT_Y,YDDT_FY,YDDT_TRY,YDDT_TWY,YDDT_Y,BFUNDTYPE,YMATCHCODEA,RLEVEL_SZ,RLEVEL_CX,ESTABDATE,JJGS,JJGSID,ENDNAV,FEGMRQ,SHORTNAME,TTYPE,TJDIN,FUNDEXCHG,LISTTEXCHMARK,FSRQ,ISSBDATE,ISSEDATE,FEATURE,DWJZ,LJJZ,MINRG,RZDF,PERIODNAME,SYL_1N,SYL_LN,SYL_Z,SOURCERATE,RATE,TSRQ,BTYPE,BUY,BENCHCODE,BENCH_CORR,TRKERROR,BENCHRATIO,NEWINDEXTEXCH,BESTDT_STRATEGY,BESTDT_Y,BESTDT_TWY,BESTDT_TRY,BESTDT_FY',
                fundUniqueInfo_fIELDS: 'FCODE,STDDEV1,STDDEV_1NRANK,STDDEV_1NFSC,STDDEV3,STDDEV_3NRANK,STDDEV_3NFSC,STDDEV5,STDDEV_5NRANK,STDDEV_5NFSC,SHARP1,SHARP_1NRANK,SHARP_1NFSC,SHARP3,SHARP_3NRANK,SHARP_3NFSC,SHARP5,SHARP_5NRANK,SHARP_5NFSC,MAXRETRA1,MAXRETRA_1NRANK,MAXRETRA_1NFSC,MAXRETRA3,MAXRETRA_3NRANK,MAXRETRA_3NFSC,MAXRETRA5,MAXRETRA_5NRANK,MAXRETRA_5NFSC,TRKERROR1,TRKERROR_1NRANK,TRKERROR_1NFSC,TRKERROR3,TRKERROR_3NRANK,TRKERROR_3NFSC,TRKERROR5,TRKERROR_5NRANK,TRKERROR_5NFSC',
                fundUniqueInfo_fLFIELDS: 'FCODE,BUSINESSTYPE,BUSINESSTEXT,BUSINESSCODE,BUSINESSSUBTYPE,MARK',
                cfhFundFInfo_fields: 'INVESTMENTIDEAR,INVESTMENTIDEARIMG',
                relateThemeFields: 'FCODE,SEC_CODE,SEC_NAME,CORR_1Y,OL2TOP'
            });

            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Origin': 'https://h5.1234567.com.cn',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
                    'Referer': 'https://servicewechat.com/',
                },
                body: params.toString()
            }).then(response => response.json()).then(data => {
                if (data && data.data) {
                    // 处理基金经理信息
                    if (data.data.FundManagerInformation && data.data.FundManagerInformation.currentManagerInfos) {
                        renderManagerInfo(data.data.FundManagerInformation.currentManagerInfos);
                    } else {
                        document.getElementById('loadingManager').style.display = 'none';
                        document.getElementById('managerInfo').innerHTML = '<p style="text-align: center; color: var(--vscode-descriptionForeground);">暂无基金经理信息</p>';
                        document.getElementById('managerInfo').style.display = 'block';
                    }

                    // 处理关联板块信息
                    if (data.data.fundRelateTheme && data.data.fundRelateTheme.length > 0) {
                        renderThemeInfo(data.data.fundRelateTheme);
                    } else {
                        document.getElementById('loadingTheme').style.display = 'none';
                        document.getElementById('themeInfo').innerHTML = '<p style="text-align: center; color: var(--vscode-descriptionForeground);">暂无关联板块信息</p>';
                        document.getElementById('themeInfo').style.display = 'flex';
                    }

                    // 更新基金概况中的近1周收益率（从详细接口获取）
                    if (data.data.baseInfo && data.data.baseInfo.length > 0) {
                        const baseInfo = data.data.baseInfo[0];
                        updateWeeklyReturn(baseInfo.SYL_Z);
                    }
                }
            }).catch(error => {
                console.error('获取详细基金信息失败:', error);
                document.getElementById('loadingManager').style.display = 'none';
                document.getElementById('loadingTheme').style.display = 'none';
                document.getElementById('managerInfo').innerHTML = '<p style="text-align: center; color: var(--vscode-descriptionForeground);">加载失败</p>';
                document.getElementById('themeInfo').innerHTML = '<p style="text-align: center; color: var(--vscode-descriptionForeground);">加载失败</p>';
                document.getElementById('managerInfo').style.display = 'block';
                document.getElementById('themeInfo').style.display = 'flex';
            });
        }

        // 渲染基金经理信息
        function renderManagerInfo(managers) {
            document.getElementById('loadingManager').style.display = 'none';
            
            let html = '';
            managers.forEach(manager => {
                const sInfo = manager.SINFO || {};
                const pInfo = manager.PINFO && manager.PINFO.length > 0 ? manager.PINFO[0] : {};
                
                const managerName = sInfo.MGRNAME || pInfo.MGRNAME || '--';
                const totalDays = sInfo.TOTALDAYS || 0;
                const penavGrowth = sInfo.PENAVGROWTH || 0;
                const yieldSe = pInfo.YIELDSE || 0;
                const resume = pInfo.RESUME || '暂无简历信息';
                const avatar = pInfo.NEWPHOTOURL || '';
                const investmentIdea = pInfo.INVESTMENTIDEAR || '暂无投资理念';
                
                // 计算任职年限
                const years = Math.floor(totalDays / 365);
                const months = Math.floor((totalDays % 365) / 30);
                const tenureText = years > 0 ? \`\${years}年\${months}个月\` : \`\${months}个月\`;
                
                html += \`
                    <div class="manager-card">
                        <img class="manager-avatar" src="\${avatar}" alt="\${managerName}" onerror="this.style.display='none'">
                        <div class="manager-details">
                            <div class="manager-name">\${managerName}</div>
                            <div>
                                <span class="manager-tag">任职 \${tenureText}</span>
                                <span class="manager-tag">任职回报 \${penavGrowth > 0 ? '+' : ''}\${penavGrowth.toFixed(2)}%</span>
                            </div>
                            <div class="manager-stats">
                                <div class="manager-stat">
                                    <div class="manager-stat-label">任职天数</div>
                                    <div class="manager-stat-value">\${totalDays}天</div>
                                </div>
                                <div class="manager-stat">
                                    <div class="manager-stat-label">年化收益</div>
                                    <div class="manager-stat-value">\${yieldSe > 0 ? '+' : ''}\${yieldSe.toFixed(2)}%</div>
                                </div>
                            </div>
                            <div style="margin-top: 10px;">
                                <strong>投资理念：</strong>\${investmentIdea}
                            </div>
                            <div class="manager-resume">
                                <strong>个人简历：</strong>\${resume}
                            </div>
                        </div>
                    </div>
                \`;
            });
            
            document.getElementById('managerInfo').innerHTML = html;
            document.getElementById('managerInfo').style.display = 'block';
        }

        // 渲染关联板块信息
        function renderThemeInfo(themes) {
            document.getElementById('loadingTheme').style.display = 'none';
            
            let html = '';
            themes.forEach(theme => {
                const secName = theme.SEC_NAME || '--';
                const corr1Y = theme.CORR_1Y || 0;
                const ol2Top = theme.OL2TOP || 0;
                
                html += \`
                    <div class="theme-tag">
                        <span class="theme-name">\${secName}</span>
                        <span class="theme-corr">相关性 \${corr1Y.toFixed(1)}%</span>
                    </div>
                \`;
            });
            
            document.getElementById('themeInfo').innerHTML = html;
            document.getElementById('themeInfo').style.display = 'flex';
        }

        // 更新近1周收益率
        function updateWeeklyReturn(sylZ) {
            // 等待基金概况加载完成后更新
            setTimeout(() => {
                const weeklyElements = document.querySelectorAll('.info-grid .info-item');
                weeklyElements.forEach(item => {
                    const label = item.querySelector('.info-label');
                    if (label && label.textContent === '近1周收益率') {
                        const valueElement = item.querySelector('.info-value');
                        if (valueElement && sylZ !== undefined && sylZ !== null) {
                            const colorClass = sylZ > 0 ? 'up' : sylZ < 0 ? 'down' : '';
                            valueElement.className = \`info-value \${colorClass}\`;
                            valueElement.textContent = \`\${sylZ > 0 ? '+' : ''}\${sylZ}%\`;
                        }
                    }
                });
            }, 1000);
        }

        // 历史净值
        function fetchHistoryNetVal() {
            document.getElementById('loading2').style.display = 'block';
            let actualRange = range2 === '1w' ? 'y' : range2;
            let url = \`https://fundmobapi.eastmoney.com/FundMApi/FundNetDiagram.ashx?FCODE=\${fundCode}&RANGE=\${actualRange}&deviceid=Wap&plat=Wap&product=EFund&version=2.0.0&_=\${new Date().getTime()}\`;
            
            let callbackName = 'jsonpCallback2_' + new Date().getTime() + Math.floor(Math.random() * 10000);
            
            loadJSONP(url, callbackName).then(data => {
                document.getElementById('loading2').style.display = 'none';
                if (!data || !data.Datas || data.Datas.length === 0) {
                    chart2.clear();
                    chart2.setOption({
                        title: { text: '暂无净值数据', left: 'center', top: 'center', textStyle: { color: defaultTextColor, fontSize: 13, fontWeight: 'normal' } }
                    });
                    return;
                }
                let dataList = data.Datas;
                if (range2 === '1w') {
                    dataList = dataList.slice(-5);
                    if (dataList.length === 0) {
                        chart2.clear();
                        chart2.setOption({ title: { text: '暂无近一周数据', left: 'center', top: 'center', textStyle: { color: defaultTextColor, fontSize: 13, fontWeight: 'normal' } }});
                        return;
                    }
                }
                let dates = dataList.map(item => item.FSRQ);
                let dwjz = dataList.map(item => +item.DWJZ);
                let ljjz = dataList.map(item => +item.LJJZ);
                let jzzzl = dataList.map(item => item.JZZZL);

                let option = getCommonOption('历史净值');
                option.legend.data = ['单位净值', '累计净值'];
                option.xAxis.data = dates;
                
                // Set more precise Y-axis label formatting to catch small nav value changes
                option.yAxis.axisLabel.formatter = function(val) {
                    return val.toFixed(4); // Use 4 decimal degrees for accuracy
                };

                option.tooltip.formatter = function (params) {
                    let dataIndex = params[0].dataIndex;
                    let date = params[0].name;
                    let res = '时间: ' + date + '<br/>';
                    params.forEach(p => {
                        res += p.marker + p.seriesName + ': ' + Number(p.value).toFixed(4) + '<br/>';
                    });
                    
                    let rate = jzzzl[dataIndex];
                    if (rate !== undefined && rate !== '' && rate !== null) {
                        let colorStr = Number(rate) > 0 ? '#f56c6c' : Number(rate) < 0 ? '#4eb61b' : defaultTextColor;
                        res += '<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:#909399;"></span>日增长率: <span style="color:'+colorStr+';font-weight:bold;">' + rate + '%</span><br/>';
                    }
                    return res;
                };
                option.series = [
                    { name: '单位净值', type: 'line', data: dwjz, showSymbol: false, lineStyle: { color: '#409EFF' } },
                    { name: '累计净值', type: 'line', data: ljjz, showSymbol: false, lineStyle: { color: '#E6A23C' } }
                ];
                chart2.setOption(option);
            }).catch(e => {
                document.getElementById('loading2').style.display = 'none';
            });
        }

        // 历史累计收益率
        function fetchHistoryYield() {
            document.getElementById('loading3').style.display = 'block';
            let actualRange = range3 === '1w' ? 'y' : range3;
            let url = \`https://dataapi.1234567.com.cn/dataapi/fund/FundVPageAcc?INDEXCODE=000300&CODE=\${fundCode}&FCODE=\${fundCode}&RANGE=\${actualRange}&deviceid=Wap&product=EFund\`;
            
            fetch(url, {
                headers: {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "zh-CN,zh;q=0.9",
                }
            }).then(r => r.json()).then(data => {
                document.getElementById('loading3').style.display = 'none';
                if (!data || data.errorCode !== 0 || !data.data || data.data.length === 0) {
                    chart3.clear();
                    chart3.setOption({
                        title: { text: '暂无累计收益数据', left: 'center', top: 'center', textStyle: { color: defaultTextColor, fontSize: 13, fontWeight: 'normal' } }
                    });
                    return;
                }
                let dataList = data.data;
                if (range3 === '1w') {
                    dataList = dataList.slice(-5);
                    if (dataList.length === 0) {
                        chart3.clear();
                        chart3.setOption({ title: { text: '暂无近一周数据', left: 'center', top: 'center', textStyle: { color: defaultTextColor, fontSize: 13, fontWeight: 'normal' } }});
                        return;
                    }
                }
                let dates = dataList.map(item => item.pdate);
                let yieldData = dataList.map(item => +(item.yield || 0));
                let indexYieldData = dataList.map(item => +(item.indexYield || 0));
                let fundTypeYieldData = dataList.map(item => +(item.fundTypeYield || 0));

                let option = getCommonOption('历史累计收益率');
                option.legend.data = ['涨幅', '沪深300', '同类平均'];
                option.xAxis.data = dates;
                option.yAxis.axisLabel.formatter = '{value}%';
                option.tooltip.formatter = function (params) {
                    let date = params[0].name;
                    let res = '时间: ' + date + '<br/>';
                    params.forEach(p => {
                        res += p.marker + p.seriesName + ': ' + Number(p.value).toFixed(2) + '%<br/>';
                    });
                    return res;
                };
                option.series = [
                    { name: '涨幅', type: 'line', data: yieldData, showSymbol: false, lineStyle: { color: '#F56C6C' } },
                    { name: '沪深300', type: 'line', data: indexYieldData, showSymbol: false, lineStyle: { color: '#67C23A' } },
                    { name: '同类平均', type: 'line', data: fundTypeYieldData, showSymbol: false, lineStyle: { color: '#E6A23C' } }
                ];
                chart3.setOption(option);
            }).catch(e => {
                document.getElementById('loading3').style.display = 'none';
                console.error(e);
            });
        }

        fetchFundInfo();
        fetchDetailedFundInfo();
        fetchHistoryNetVal();
        fetchHistoryYield();
    </script>
</body>
</html>`;
  }
}
