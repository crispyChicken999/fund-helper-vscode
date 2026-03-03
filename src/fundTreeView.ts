/**
 * 基金列表 TreeView 数据提供者
 *
 * 父节点格式: (±收益) 基金名称  ±涨跌幅%
 * 子节点: 展开显示详情
 * 悬浮: inline 按钮(+加仓 -减仓 ✏修改 🗑删除)
 * Tooltip: 完整信息带涨红跌绿高亮
 */

import * as vscode from "vscode";
import * as path from "path";
import {
  FundInfo,
  FundConfig,
  calcHoldingAmount,
  calcDailyGain,
  calcHoldingGain,
  calcHoldingGainRate,
} from "./fundModel";
import { getFundData, MarketIndex } from "./fundService";
import { isMarketClosed, isMarketOpen } from "./holidayService";

export type SortMethod =
  | "default"
  | "changePercent_desc"
  | "changePercent_asc"
  | "dailyGain_desc"
  | "dailyGain_asc"
  | "holdingAmount_desc"
  | "holdingAmount_asc"
  | "holdingGain_desc"
  | "holdingGain_asc"
  | "holdingGainRate_desc"
  | "holdingGainRate_asc";

/** 排序字段中文名 */
const SORT_FIELD_NAMES: Record<string, string> = {
  default: "默认",
  changePercent: "涨跌幅",
  dailyGain: "估算收益",
  holdingAmount: "持有额",
  holdingGain: "持有收益",
  holdingGainRate: "收益率",
};

export class FundTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string | vscode.TreeItemLabel,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly fundInfo?: FundInfo,
    public readonly isDetailItem: boolean = false,
    public readonly detailValue?: string,
  ) {
    super(label, collapsibleState);
  }
}

export class FundTreeDataProvider implements vscode.TreeDataProvider<FundTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    FundTreeItem | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private _fundDataList: FundInfo[] = [];
  private _sortMethod: SortMethod = "default";
  private _extensionPath: string;
  private _marketIndices: MarketIndex[] = [];
  private _filterKeyword: string = "";

  constructor(extensionPath: string) {
    this._extensionPath = extensionPath;
    // 从用户配置读取排序方式
    this._sortMethod = vscode.workspace
      .getConfiguration("fund-helper")
      .get<SortMethod>("sortMethod", "default");
  }

  /** 更新大盘指数缓存并刷新 tree */
  setMarketIndices(indices: MarketIndex[]): void {
    this._marketIndices = indices;
    this._onDidChangeTreeData.fire();
  }

  get marketIndices(): MarketIndex[] {
    return this._marketIndices;
  }

  setFilterKeyword(keyword: string): void {
    this._filterKeyword = keyword.trim().toLowerCase();
    this._onDidChangeTreeData.fire();
  }

  get filterKeyword(): string {
    return this._filterKeyword;
  }

  get fundDataList(): FundInfo[] {
    return this._fundDataList;
  }

  set sortMethod(method: SortMethod) {
    this._sortMethod = method;
    this._saveSortMethod(method);
    this._onDidChangeTreeData.fire();
  }
  get sortMethod(): SortMethod {
    return this._sortMethod;
  }

  async refresh(): Promise<void> {
    const configs = this._getFundConfigs();
    if (configs.length === 0) {
      this._fundDataList = [];
      this._onDidChangeTreeData.fire();
      return;
    }
    try {
      this._fundDataList = await getFundData(configs, this._fundDataList);
    } catch (e: any) {
      vscode.window.showErrorMessage(`获取基金数据失败: ${e.message}`);
    }
    this._onDidChangeTreeData.fire();
  }

  fireChange(): void {
    this._onDidChangeTreeData.fire();
  }
  getTreeItem(element: FundTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: FundTreeItem): FundTreeItem[] {
    if (!element) {
      const fundItems = this._getSortedFundItems();
      if (fundItems.length === 0 && !this._filterKeyword) {
        return []; // 返回空让 viewsWelcome 显示
      }
      // 顺序：排序 → 筛选 → 行情中心 → 统计收益 → 基金列表
      return [
        this._createSortHeader(),
        this._createFilterItem(),
        this._createMarketItem(),
        this._createSummaryFolder(),
        ...fundItems
      ];
    }
    if (element.contextValue === "marketFolderItem") {
      return this._getMarketDetails();
    }
    if (element.contextValue === "summaryFolderItem") {
      return this._getSummaryDetails();
    }
    if (element.fundInfo && !element.isDetailItem) {
      return this._getDetailItems(element.fundInfo);
    }
    return [];
  }

  /** 切换排序：desc → asc → default 循环 */
  toggleSort(field: string): void {
    const [currentField, currentDir] = this._sortMethod.split("_");
    if (currentField === field) {
      if (currentDir === "desc") {
        this._sortMethod = `${field}_asc` as SortMethod;
      } else {
        this._sortMethod = "default";
      }
    } else {
      this._sortMethod = `${field}_desc` as SortMethod;
    }
    this._saveSortMethod(this._sortMethod);
    this._onDidChangeTreeData.fire();
  }

  private _saveSortMethod(method: SortMethod): void {
    vscode.workspace
      .getConfiguration("fund-helper")
      .update("sortMethod", method, vscode.ConfigurationTarget.Global);
  }

  private _getFundConfigs(): FundConfig[] {
    return vscode.workspace
      .getConfiguration("fund-helper")
      .get<FundConfig[]>("funds", []);
  }

  private _getSortedFundItems(): FundTreeItem[] {
    let list = [...this._fundDataList];
    if (this._filterKeyword) {
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(this._filterKeyword) ||
          f.code.toLowerCase().includes(this._filterKeyword),
      );
    }
    const [field, dir] = this._sortMethod.split("_");
    const asc = dir === "asc";

    const sorters: Record<string, (f: FundInfo) => number> = {
      changePercent: (f) => f.changePercent,
      dailyGain: (f) => calcDailyGain(f),
      holdingAmount: (f) => calcHoldingAmount(f),
      holdingGain: (f) => calcHoldingGain(f),
      holdingGainRate: (f) => calcHoldingGainRate(f),
    };

    if (sorters[field]) {
      const fn = sorters[field];
      list.sort((a, b) => (asc ? fn(a) - fn(b) : fn(b) - fn(a)));
    }

    return list.map((fund) => this._createFundItem(fund));
  }

  private _createFilterItem(): FundTreeItem {
    const label = this._filterKeyword ? `筛选中: ${this._filterKeyword}` : `搜索 / 筛选基金...`;
    const item = new FundTreeItem(label, vscode.TreeItemCollapsibleState.None, undefined, false);
    item.iconPath = new vscode.ThemeIcon("search");
    item.id = "filterItem";
    item.contextValue = this._filterKeyword ? "filterItem_active" : "filterItem";
    item.command = {
      command: "fund-helper.filterFunds",
      title: "筛选基金",
    };
    return item;
  }

  private _createMarketItem(): FundTreeItem {
    // 从缓存指数里汇总一个简短描述，如 "沪 -1.43%  深 -3.07%"
    let desc = "大盘 · 板块";
    if (this._marketIndices.length > 0) {
      const fmt = (idx: MarketIndex) => {
        const sign = idx.changePct >= 0 ? '+' : '';
        return `${idx.name.slice(0, 2)} ${sign}${idx.changePct.toFixed(2)}%`;
      };
      desc = this._marketIndices.slice(0, 2).map(fmt).join('  ');
    }

    const open = isMarketOpen();
    const statusText = open ? "「开市」" : "「休市中」";

    const item = new FundTreeItem(
      `${statusText} 行情中心`,
      vscode.TreeItemCollapsibleState.Collapsed,
      undefined,
      false,
    );
    item.id = "marketFolder";
    item.contextValue = "marketFolderItem";
    item.iconPath = new vscode.ThemeIcon("graph");
    item.description = desc;

    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportThemeIcons = true;
    md.supportHtml = true;

    md.appendMarkdown(`### \u3000行情中心\n\n`);
    if (this._marketIndices.length > 0) {
      const pickColor = (val: number) =>
        val > 0 ? "#f56c6c" : val < 0 ? "#4eb61b" : "#909399";
      const hl = (text: string, color: string) =>
        `**<span style="color:${color};background-color:${color}33;">&nbsp;${text}&nbsp;</span>**`;

      md.appendMarkdown(`\n ___ \n\n`);
      this._marketIndices.forEach(idx => {
        const sign = idx.changePct >= 0 ? '+' : '';
        const color = pickColor(idx.changePct);
        const valStr = `${idx.price.toFixed(2)} \u3000 ${sign}${idx.changePct.toFixed(2)}%`;
        md.appendMarkdown(`**${idx.name}**\u3000\u3000：${hl(valStr, color)}\n\n`);
      });
    }

    md.appendMarkdown(`\n ___ \n\n`);
    md.appendMarkdown(`*(展开查看大盘指数，点击【查看行情】打开详情面板)*\n\n`);
    item.tooltip = md;
    return item;
  }

  private _getMarketDetails(): FundTreeItem[] {
    const items: FundTreeItem[] = [];

    if (this._marketIndices.length === 0) {
      const loading = new FundTreeItem("加载中...", vscode.TreeItemCollapsibleState.None, undefined, true);
      loading.iconPath = new vscode.ThemeIcon("loading~spin");
      loading.contextValue = "marketDetailItem";
      items.push(loading);
    } else {
      for (const idx of this._marketIndices) {
        const sign = idx.changePct >= 0 ? '+' : '';
        const label = `${idx.price.toFixed(2)}　${sign}${idx.changePct.toFixed(2)}%`;
        const colorVal = idx.changePct > 0 ? 'errorForeground' : idx.changePct < 0 ? 'testing.iconPassed' : 'descriptionForeground';
        const iconName = idx.changePct > 0 ? 'arrow-up' : idx.changePct < 0 ? 'arrow-down' : 'dash';

        const fullLabel = `${idx.name}　${label}`;
        // 对数值部分补高亮
        const highlights: [number, number][] = [];
        if (idx.changePct > 0) {
          highlights.push([idx.name.length + 1, fullLabel.length]);
        }

        const sub = new FundTreeItem(
          highlights.length > 0 ? { label: fullLabel, highlights } : fullLabel,
          vscode.TreeItemCollapsibleState.None,
          undefined,
          true,
          `${idx.price.toFixed(2)} ${sign}${idx.changePct.toFixed(2)}%`
        );
        sub.contextValue = "marketDetailItem";
        sub.iconPath = new vscode.ThemeIcon(iconName, new vscode.ThemeColor(colorVal));
        items.push(sub);
      }
    }

    // 查看行情入口
    const viewBtn = new FundTreeItem("查看行情详情", vscode.TreeItemCollapsibleState.None, undefined, true);
    viewBtn.iconPath = new vscode.ThemeIcon("link-external");
    viewBtn.contextValue = "marketViewItem";
    viewBtn.command = {
      command: "fund-helper.openMarket",
      title: "查看行情详情",
      arguments: []
    };
    items.push(viewBtn);
    return items;
  }

  private _createSortHeader(): FundTreeItem {
    const [field, dir] = this._sortMethod.split("_");
    const fieldName = SORT_FIELD_NAMES[field] || "默认";
    const arrow = dir === "desc" ? " ↓" : dir === "asc" ? " ↑" : "";

    let labelText: string;
    if (this._sortMethod === "default") {
      labelText = "排序";
    } else {
      labelText = `排序（${fieldName}${arrow}）`;
    }

    const item = new FundTreeItem(
      labelText,
      vscode.TreeItemCollapsibleState.None,
      undefined,
      false,
    );
    item.contextValue = "sortItem";
    item.iconPath = new vscode.ThemeIcon("list-ordered");
    item.description = this._sortMethod === "default" ? "默认顺序" : "点击切换";

    // 构建 tooltip
    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportThemeIcons = true;
    md.supportHtml = true;

    md.appendMarkdown(`$(list-ordered) 排序：**${fieldName}${arrow}**\n\n`);
    md.appendMarkdown(`悬浮显示排序按钮，点击循环：降序 → 升序 → 默认\n`);

    item.tooltip = md;

    return item;
  }

  private _createSummaryFolder(): FundTreeItem {
    let totalAmount = 0;
    let totalDailyGain = 0;
    let totalHoldingGain = 0;
    let upCount = 0;
    let downCount = 0;
    let totalDailyUp = 0;
    let totalDailyDown = 0;
    let holdingUpCount = 0;
    let holdingDownCount = 0;
    let totalHoldingUp = 0;
    let totalHoldingDown = 0;

    for (const f of this._fundDataList) {
      const amount = calcHoldingAmount(f);
      const daily = calcDailyGain(f);
      const holding = calcHoldingGain(f);

      totalAmount += amount;
      totalDailyGain += daily;
      totalHoldingGain += holding;

      if (daily > 0) {
        upCount++;
        totalDailyUp += daily;
      } else if (daily < 0) {
        downCount++;
        totalDailyDown += daily;
      }

      if (holding > 0) {
        holdingUpCount++;
        totalHoldingUp += holding;
      } else if (holding < 0) {
        holdingDownCount++;
        totalHoldingDown += holding;
      }
    }

    const totalHoldingRate =
      totalAmount > 0
        ? (totalHoldingGain / (totalAmount - totalHoldingGain)) * 100
        : 0;

    const totalDailyRate =
      totalAmount - totalDailyGain > 0
        ? (totalDailyGain / (totalAmount - totalDailyGain)) * 100
        : 0;

    const signFmt = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}`;
    const dailyStr = signFmt(totalDailyGain);
    const holdStr = signFmt(totalHoldingGain);

    const labelText = `日收益: ${dailyStr} | 累计收益: ${holdStr}`;

    const item = new FundTreeItem(
      labelText,
      vscode.TreeItemCollapsibleState.Collapsed,
      undefined,
      false,
    );
    item.id = "summaryFolder";
    item.contextValue = "summaryFolderItem";
    item.iconPath = new vscode.ThemeIcon("pie-chart");

    // 富文本 tooltip
    const pickColor = (val: number) =>
      val > 0 ? "#f56c6c" : val < 0 ? "#4eb61b" : "#909399";
    const hl = (text: string, color: string) =>
      `**<span style="color:${color};background-color:${color}33;">&nbsp;${text}&nbsp;</span>**`;

    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportThemeIcons = true;
    md.supportHtml = true;

    md.appendMarkdown(`### \u3000持仓统计\n\n`);
    md.appendMarkdown(`\n ___ \n\n`);

    md.appendMarkdown(`持有金额：${fmtMoney(totalAmount)}\n\n`);
    md.appendMarkdown(`日总收益：${hl(signFmt(totalDailyGain), pickColor(totalDailyGain))}\n\n`);
    md.appendMarkdown(`日收益率：${hl(signFmt(totalDailyRate) + "%", pickColor(totalDailyRate))}\n\n`);
    md.appendMarkdown(`今日上涨：${upCount} 只\u3000${hl("+" + totalDailyUp.toFixed(2), pickColor(1))}\n\n`);
    md.appendMarkdown(`今日下跌：${downCount} 只\u3000${hl(totalDailyDown.toFixed(2), pickColor(-1))}\n\n`);
    md.appendMarkdown(`\n ___ \n\n`);
    md.appendMarkdown(`累计收益：${hl(signFmt(totalHoldingGain), pickColor(totalHoldingGain))}\n\n`);
    md.appendMarkdown(`累计收益率：${hl(signFmt(totalHoldingRate) + "%", pickColor(totalHoldingRate))}\n\n`);
    md.appendMarkdown(`累计盈利：${holdingUpCount} 只\u3000${hl("+" + totalHoldingUp.toFixed(2), pickColor(1))}\n\n`);
    md.appendMarkdown(`累计亏损：${holdingDownCount} 只\u3000${hl(totalHoldingDown.toFixed(2), pickColor(-1))}\n\n`);
    md.appendMarkdown(`\n ___ \n\n`);

    const copyText = `【持仓统计】\n持有金额：${fmtMoney(totalAmount)}\n日总收益：${signFmt(totalDailyGain)}\n日收益率：${signFmt(totalDailyRate)}%\n今日上涨：${upCount} 只 (+${totalDailyUp.toFixed(2)})\n今日下跌：${downCount} 只 (${totalDailyDown.toFixed(2)})\n累计收益：${signFmt(totalHoldingGain)}\n累计收益率：${signFmt(totalHoldingRate)}%\n累计盈利：${holdingUpCount} 只 (+${totalHoldingUp.toFixed(2)})\n累计亏损：${holdingDownCount} 只 (${totalHoldingDown.toFixed(2)})`;
    const uriEncoded = encodeURIComponent(JSON.stringify(copyText));
    md.appendMarkdown(`[$(copy) 一键复制统计信息](command:fund-helper.copyFundDetail?${uriEncoded})\n`);

    item.tooltip = md;

    return item;
  }

  private _getSummaryDetails(): FundTreeItem[] {
    let totalAmount = 0;
    let totalDailyGain = 0;
    let totalHoldingGain = 0;
    let upCount = 0;
    let downCount = 0;
    let totalDailyUp = 0;
    let totalDailyDown = 0;
    let holdingUpCount = 0;
    let holdingDownCount = 0;
    let totalHoldingUp = 0;
    let totalHoldingDown = 0;

    for (const f of this._fundDataList) {
      const amount = calcHoldingAmount(f);
      const daily = calcDailyGain(f);
      const holding = calcHoldingGain(f);

      totalAmount += amount;
      totalDailyGain += daily;
      totalHoldingGain += holding;

      if (daily > 0) {
        upCount++;
        totalDailyUp += daily;
      } else if (daily < 0) {
        downCount++;
        totalDailyDown += daily;
      }

      if (holding > 0) {
        holdingUpCount++;
        totalHoldingUp += holding;
      } else if (holding < 0) {
        holdingDownCount++;
        totalHoldingDown += holding;
      }
    }

    const totalHoldingRate =
      totalAmount > 0
        ? (totalHoldingGain / (totalAmount - totalHoldingGain)) * 100
        : 0;

    const totalDailyRate =
      totalAmount - totalDailyGain > 0
        ? (totalDailyGain / (totalAmount - totalDailyGain)) * 100
        : 0;

    const signStr = (val: number) => `${val >= 0 ? "+" : ""}${val.toFixed(2)}`;
    const getIcon = (val: number) => (val > 0 ? "arrow-up" : val < 0 ? "arrow-down" : "dash");
    const getColor = (val: number) =>
      val > 0 ? "errorForeground" : val < 0 ? "testing.iconPassed" : "descriptionForeground";

    const details: { label: string; value: string; icon: string; color?: string; highlight?: boolean }[] = [
      { label: "持有金额\u3000", value: fmtMoney(totalAmount), icon: "database" },
      { label: "日总收益\u3000", value: signStr(totalDailyGain), icon: getIcon(totalDailyGain), color: getColor(totalDailyGain), highlight: totalDailyGain > 0 },
      { label: "日收益率\u3000", value: `${signStr(totalDailyRate)}%`, icon: getIcon(totalDailyRate), color: getColor(totalDailyRate), highlight: totalDailyRate > 0 },
      { label: "今日上涨\u3000", value: `${upCount} 只 (+${totalDailyUp.toFixed(2)})`, icon: "arrow-up", color: "errorForeground", highlight: true },
      { label: "今日下跌\u3000", value: `${downCount} 只 (${totalDailyDown.toFixed(2)})`, icon: "arrow-down", color: "testing.iconPassed" },
      { label: "累计收益\u3000", value: signStr(totalHoldingGain), icon: getIcon(totalHoldingGain), color: getColor(totalHoldingGain), highlight: totalHoldingGain > 0 },
      { label: "累计收益率", value: `${signStr(totalHoldingRate)}%`, icon: getIcon(totalHoldingRate), color: getColor(totalHoldingRate), highlight: totalHoldingRate > 0 },
      { label: "累计盈利\u3000", value: `${holdingUpCount} 只 (+${totalHoldingUp.toFixed(2)})`, icon: "triangle-up", color: "errorForeground", highlight: true },
      { label: "累计亏损\u3000", value: `${holdingDownCount} 只 (${totalHoldingDown.toFixed(2)})`, icon: "triangle-down", color: "testing.iconPassed" },
    ];

    const itemNodes = details.map((d) => {
      const fullLabel = `${d.label}：${d.value}`;
      const highlights: [number, number][] = [];
      if (d.highlight) {
        const startIdx = fullLabel.indexOf(d.value);
        if (startIdx !== -1) {
          highlights.push([startIdx, startIdx + d.value.length]);
        }
      }

      const item = new FundTreeItem(
        highlights.length > 0 ? { label: fullLabel, highlights } : fullLabel,
        vscode.TreeItemCollapsibleState.None,
        undefined,
        true,
        d.value,
      );
      item.contextValue = "summaryDetailItem";
      item.iconPath = new vscode.ThemeIcon(d.icon, d.color ? new vscode.ThemeColor(d.color) : undefined);
      return item;
    });

    return itemNodes;
  }

  private _createFundItem(fund: FundInfo): FundTreeItem {
    const dailyGain = calcDailyGain(fund);
    const holdingAmount = calcHoldingAmount(fund);
    const holdingGain = calcHoldingGain(fund);
    const holdingGainRate = calcHoldingGainRate(fund);
    const [sortField] = this._sortMethod.split("_");

    const fmtPercent = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
    const fmtVal = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}`;

    // 根据排序方式决定括号内容、description
    let bracketText = ""; // 括号内显示
    let bracketValue = 0; // 括号内对应数值（用于决定颜色）
    let descText = ""; // description 文本
    let iconValue: number; // 用于决定涨跌图标的数值

    switch (sortField) {
      case "changePercent":
        // (涨跌幅) 名称  估算收益
        bracketText = fmtPercent(fund.changePercent);
        bracketValue = fund.changePercent;
        descText = fund.shares > 0 ? fmtVal(dailyGain) : "";
        iconValue = fund.changePercent;
        break;

      case "holdingAmount":
        // (持有额) 名称  涨跌幅 估算收益
        bracketText = fmtMoney(holdingAmount);
        bracketValue = holdingAmount;
        descText = `${fmtPercent(fund.changePercent)}  ${fund.shares > 0 ? fmtVal(dailyGain) : ""}`;
        iconValue = fund.changePercent;
        break;

      case "holdingGain":
        // (持有收益) 名称  涨跌幅 估算收益
        bracketText = fmtVal(holdingGain);
        bracketValue = holdingGain;
        descText = `${fmtPercent(fund.changePercent)}  ${fund.shares > 0 ? fmtVal(dailyGain) : ""}`;
        iconValue = fund.changePercent;
        break;

      case "holdingGainRate":
        // (持有收益率) 名称  涨跌幅 估算收益
        bracketText = fund.cost > 0 ? fmtPercent(holdingGainRate) : "--";
        bracketValue = holdingGainRate;
        descText = `${fmtPercent(fund.changePercent)}  ${fund.shares > 0 ? fmtVal(dailyGain) : ""}`;
        iconValue = fund.changePercent;
        break;

      default:
        // 默认 / 估算收益排序: (估算收益) 名称  涨跌幅
        if (fund.shares > 0) {
          bracketText = fmtVal(dailyGain);
          bracketValue = dailyGain;
        }
        descText = fmtPercent(fund.changePercent);
        iconValue = fund.changePercent;
        break;
    }

    // 构建 label
    let labelText: string;
    if (bracketText) {
      labelText = `(${bracketText}) ${fund.name}`;
    } else {
      labelText = fund.name;
    }

    // highlights 只在正值时高亮
    const highlights: [number, number][] = [];
    if (bracketText && bracketValue > 0) {
      const closeParen = labelText.indexOf(")") + 1;
      highlights.push([0, closeParen]);
    }

    const item = new FundTreeItem(
      { label: labelText, highlights },
      vscode.TreeItemCollapsibleState.Collapsed,
      fund,
      false,
    );

    item.id = fund.code;
    item.description = descText.trim();
    item.contextValue = "fundItem";

    // 涨跌图标：根据 iconValue 选择
    let iconName: string;
    if (iconValue > 0) {
      iconName = "up.svg";
    } else if (iconValue < 0) {
      iconName = "down.svg";
    } else {
      iconName = "flat.svg";
    }
    item.iconPath = path.join(this._extensionPath, "resources", iconName);

    // 富文本 tooltip
    item.tooltip = this._buildTooltip(fund);

    return item;
  }

  private _buildTooltip(fund: FundInfo): vscode.MarkdownString {
    // 涨=红色, 跌=绿色
    const UP = "#f56c6c";
    const DOWN = "#4eb61b";
    const NEUTRAL = "#909399";

    const holdingAmount = calcHoldingAmount(fund);
    const holdingGain = calcHoldingGain(fund);
    const holdingGainRate = calcHoldingGainRate(fund);
    const dailyGain = calcDailyGain(fund);

    const pickColor = (val: number) =>
      val > 0 ? UP : val < 0 ? DOWN : NEUTRAL;
    const sign = (val: number) => (val >= 0 ? "+" : "");

    // 高亮 span（涨红跌绿带背景色+加粗）
    const hl = (text: string, color: string) =>
      `**<span style="color:${color};background-color:${color}33;">&nbsp;${text}&nbsp;</span>**`;

    const changeStr = `${sign(fund.changePercent)}${fund.changePercent.toFixed(2)}%`;
    const dailyGainStr = `${sign(dailyGain)}${dailyGain.toFixed(2)}`;
    const holdGainStr = `${sign(holdingGain)}${holdingGain.toFixed(2)}`;
    const holdRateStr =
      fund.cost > 0
        ? `${sign(holdingGainRate)}${holdingGainRate.toFixed(2)}%`
        : "--";
    const estValueStr =
      fund.estimatedValue !== null ? fund.estimatedValue.toFixed(4) : "--";
    const updateStr = fund.updateTime
      ? fund.updateTime.length > 10
        ? fund.updateTime.substring(11)
        : fund.updateTime
      : "--";

    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportThemeIcons = true;
    md.supportHtml = true;

    // 基金名称 + 代码（与统计收益相同的一级标题）
    md.appendMarkdown(`### \u3000${fund.name}\n\n`);
    md.appendMarkdown(`*代码：${fund.code}*\n\n`);
    md.appendMarkdown(`\n ___ \n\n`);

    // 持仓信息
    md.appendMarkdown(`持有额\u3000\u3000：${fmtMoney(holdingAmount)}\n\n`);
    md.appendMarkdown(
      `持有收益\u3000：${hl(holdGainStr, pickColor(holdingGain))}\n\n`,
    );
    md.appendMarkdown(
      `持有收益率：${hl(holdRateStr, pickColor(holdingGainRate))}\n\n`,
    );
    md.appendMarkdown(
      `成本价\u3000\u3000：${fund.cost > 0 ? fund.cost.toFixed(4) : "--"}\n\n`,
    );
    md.appendMarkdown(`\n ___ \n\n`);

    // 估值信息
    md.appendMarkdown(`单位净值\u3000：${fund.netValue > 0 ? fund.netValue.toFixed(4) : "--"}\n\n`);
    md.appendMarkdown(`估算净值\u3000：${estValueStr}\n\n`);
    md.appendMarkdown(
      `涨跌幅\u3000\u3000：${hl(changeStr, pickColor(fund.changePercent))}\n\n`,
    );
    md.appendMarkdown(
      `估算收益\u3000：${hl(dailyGainStr, pickColor(dailyGain))}\n\n`,
    );
    md.appendMarkdown(`\n ___ \n\n`);

    // 时间
    md.appendMarkdown(`更新时间\u3000：${updateStr}\n`);
    md.appendMarkdown(`\n ___ \n\n`);

    // 复制命令
    const copyText = `【${fund.name} (${fund.code})】\n持有额：${fmtMoney(holdingAmount)}\n持有收益：${holdGainStr}\n持有收益率：${holdRateStr}\n成本价：${fund.cost > 0 ? fund.cost.toFixed(4) : "--"}\n单位净值：${fund.netValue > 0 ? fund.netValue.toFixed(4) : "--"}\n估算净值：${estValueStr}\n涨跌幅：${changeStr}\n估算收益：${dailyGainStr}\n更新时间：${updateStr}`;
    const uriEncoded = encodeURIComponent(JSON.stringify(copyText));
    md.appendMarkdown(`[$(copy) 复制基金信息](command:fund-helper.copyFundDetail?${uriEncoded})\n`);

    return md;
  }

  private _getDetailItems(fund: FundInfo): FundTreeItem[] {
    const holdingAmount = calcHoldingAmount(fund);
    const holdingGain = calcHoldingGain(fund);
    const holdingGainRate = calcHoldingGainRate(fund);
    const dailyGain = calcDailyGain(fund);

    const getIcon = (val: number) => (val > 0 ? "arrow-up" : val < 0 ? "arrow-down" : "dash");
    const getColor = (val: number) =>
      val > 0 ? "errorForeground" : val < 0 ? "testing.iconPassed" : "descriptionForeground";
    const signStr = (val: number) => `${val >= 0 ? "+" : ""}${val.toFixed(2)}`;

    const details: { label: string; value: string; icon: string; color?: string; copyValue?: string; highlight?: boolean }[] = [
      { label: "基金名称\u3000", value: fund.name, icon: "tag", copyValue: fund.name },
      { label: "基金代码\u3000", value: fund.code, icon: "symbol-number", copyValue: fund.code },
      { label: "持有额\u3000\u3000", value: fmtMoney(holdingAmount), icon: "database" },
      {
        label: `持有收益\u3000`,
        value: signStr(holdingGain),
        icon: getIcon(holdingGain),
        color: getColor(holdingGain),
        highlight: holdingGain > 0,
      },
      {
        label: `持有收益率`,
        value: fund.cost > 0 ? `${signStr(holdingGainRate)}%` : "--",
        icon: fund.cost > 0 ? getIcon(holdingGainRate) : "dash",
        color: fund.cost > 0 ? getColor(holdingGainRate) : undefined,
        highlight: holdingGainRate > 0,
      },
      { label: "成本价\u3000\u3000", value: fund.cost > 0 ? fund.cost.toFixed(4) : "--", icon: "credit-card" },
      {
        label: "单位净值\u3000",
        value: fund.netValue > 0 ? fund.netValue.toFixed(4) : "--",
        icon: "pulse",
      },
      {
        label: "估算净值\u3000",
        value: fund.estimatedValue !== null ? fund.estimatedValue.toFixed(4) : "--",
        icon: "graph",
      },
      {
        label: `涨跌幅\u3000\u3000`,
        value: `${signStr(fund.changePercent)}%`,
        icon: getIcon(fund.changePercent),
        color: getColor(fund.changePercent),
        highlight: fund.changePercent > 0,
      },
      {
        label: `估算收益\u3000`,
        value: signStr(dailyGain),
        icon: getIcon(dailyGain),
        color: getColor(dailyGain),
        highlight: dailyGain > 0,
      },
      {
        label: "更新时间\u3000",
        value: fund.updateTime
          ? fund.updateTime.length > 10
            ? fund.updateTime.substring(11)
            : fund.updateTime
          : "--",
        icon: "clock",
      }
    ];

    const itemNodes = details.map((d) => {
      const copyVal = d.copyValue !== undefined ? d.copyValue : d.value;
      const fullLabel = `${d.label}：${d.value}`;
      const highlights: [number, number][] = [];
      if (d.highlight) {
        const startIdx = fullLabel.indexOf(d.value);
        if (startIdx !== -1) {
          highlights.push([startIdx, startIdx + d.value.length]);
        }
      }

      const item = new FundTreeItem(
        highlights.length > 0 ? { label: fullLabel, highlights } : fullLabel,
        vscode.TreeItemCollapsibleState.None,
        fund,
        true,
        copyVal,
      );
      item.contextValue = "detailItem";
      item.iconPath = new vscode.ThemeIcon(d.icon, d.color ? new vscode.ThemeColor(d.color) : undefined);
      return item;
    });

    const webviewItem = new FundTreeItem(
      "查看详情",
      vscode.TreeItemCollapsibleState.None,
      fund,
      true,
    );
    webviewItem.iconPath = new vscode.ThemeIcon("graph-line");
    webviewItem.command = {
      command: "fund-helper.viewFundDetail",
      title: "查看详情",
      arguments: [webviewItem]
    };
    webviewItem.contextValue = "actionItem";

    itemNodes.push(webviewItem);
    return itemNodes;
  }
}

function fmtMoney(val: number): string {
  return val.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtSignedMoney(val: number): string {
  return (val >= 0 ? "+" : "") + fmtMoney(val);
}

// ========== 拖拽排序 ==========

const FUND_MIME = "application/vnd.fund-helper.fund";

export class FundDragAndDropController implements vscode.TreeDragAndDropController<FundTreeItem> {
  readonly dragMimeTypes = [FUND_MIME];
  readonly dropMimeTypes = [FUND_MIME];

  private _provider: FundTreeDataProvider;

  constructor(provider: FundTreeDataProvider) {
    this._provider = provider;
  }

  handleDrag(
    source: readonly FundTreeItem[],
    dataTransfer: vscode.DataTransfer,
    _token: vscode.CancellationToken,
  ): void {
    // 只允许默认排序时拖拽，且只拖基金 item
    if (this._provider.sortMethod !== "default") {
      return;
    }
    const fundItem = source.find((s) => s.fundInfo && !s.isDetailItem);
    if (fundItem?.fundInfo) {
      dataTransfer.set(
        FUND_MIME,
        new vscode.DataTransferItem(fundItem.fundInfo.code),
      );
    }
  }

  async handleDrop(
    target: FundTreeItem | undefined,
    dataTransfer: vscode.DataTransfer,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    if (this._provider.sortMethod !== "default") {
      return;
    }

    const draggedCode = dataTransfer.get(FUND_MIME)?.value as string;
    if (!draggedCode || !target?.fundInfo) {
      return;
    }
    const targetCode = target.fundInfo.code;
    if (draggedCode === targetCode) {
      return;
    }

    // 读取配置，重新排列
    const config = vscode.workspace.getConfiguration("fund-helper");
    const funds = [...config.get<FundConfig[]>("funds", [])];

    const fromIdx = funds.findIndex((f) => f.code === draggedCode);
    const toIdx = funds.findIndex((f) => f.code === targetCode);
    if (fromIdx < 0 || toIdx < 0) {
      return;
    }

    // 移动元素
    const [moved] = funds.splice(fromIdx, 1);
    funds.splice(toIdx, 0, moved);

    await config.update("funds", funds, vscode.ConfigurationTarget.Global);
    // refresh 会由 onDidChangeConfiguration 自动触发
  }
}
