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
    const textColor = 'var(--vscode-editor-foreground)';
    const gridColor = 'var(--vscode-editorLineNumber-foreground)';
    const bgColor = 'var(--vscode-editor-background)';

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
    </style>
</head>
<body>

    <div class="header">
        <div>
            <h2>${fund.name} (${fund.code})</h2>
            <div style="font-size: 0.9em; color: var(--vscode-descriptionForeground);">数据呈现与走势对比估算</div>
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
                        <div class="info-label">类型 / 成立日</div>
                        <div class="info-value">\${data.FTYPE || '--'} / \${data.ESTABDATE || '--'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">基金公司设置 / 基金经理</div>
                        <div class="info-value">\${data.JJGS || '--'} / \${data.JJJL || '--'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">单位净值 / 累计净值</div>
                        <div class="info-value">\${data.DWJZ || '--'} (\${data.FSRQ || '--'}) / \${data.LJJZ || '--'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">基金规模 / 交易状态</div>
                        <div class="info-value">\${formatMoney(data.ENDNAV)} / \${data.SGZT || '--'} \${data.SHZT || '--'}</div>
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
                \`;
                
                document.getElementById('infoGrid').innerHTML = html;
                document.getElementById('infoGrid').style.display = 'grid';
            }).catch(e => {
                document.getElementById('loadingInfo').style.display = 'none';
            });
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
        fetchHistoryNetVal();
        fetchHistoryYield();
    </script>
</body>
</html>`;
  }
}
