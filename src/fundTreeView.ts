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
import { getFundData } from "./fundService";

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

  constructor(extensionPath: string) {
    this._extensionPath = extensionPath;
    // 从用户配置读取排序方式
    this._sortMethod = vscode.workspace
      .getConfiguration("fund-helper")
      .get<SortMethod>("sortMethod", "default");
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
      if (fundItems.length === 0) {
        return []; // 返回空让 viewsWelcome 显示
      }
      return [this._createSortHeader(), ...fundItems];
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

    // 汇总计算
    const UP = "#f56c6c";
    const DOWN = "#4eb61b";
    const NEUTRAL = "#909399";
    const pickColor = (v: number) => (v > 0 ? UP : v < 0 ? DOWN : NEUTRAL);
    const hl = (text: string, color: string) =>
      `**<span style="color:${color};background-color:${color}33;">&nbsp;${text}&nbsp;</span>**`;
    const signFmt = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}`;

    let totalAmount = 0;
    let totalDailyGain = 0;
    let totalHoldingGain = 0;
    for (const f of this._fundDataList) {
      totalAmount += calcHoldingAmount(f);
      totalDailyGain += calcDailyGain(f);
      totalHoldingGain += calcHoldingGain(f);
    }
    const totalHoldingRate =
      totalAmount > 0
        ? (totalHoldingGain / (totalAmount - totalHoldingGain)) * 100
        : 0;

    // 构建 tooltip
    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportThemeIcons = true;
    md.supportHtml = true;

    md.appendMarkdown(`#### 📊 持仓概览\n\n`);
    md.appendMarkdown(`\n ___ \n\n`);
    md.appendMarkdown(`持有金额\u3000：**${fmtMoney(totalAmount)}**\n\n`);
    md.appendMarkdown(
      `日收益\u3000\u3000：${hl(signFmt(totalDailyGain), pickColor(totalDailyGain))}\n\n`,
    );
    md.appendMarkdown(
      `持有收益\u3000：${hl(signFmt(totalHoldingGain), pickColor(totalHoldingGain))}\n\n`,
    );
    md.appendMarkdown(
      `持有收益率：${hl(`${signFmt(totalHoldingRate)}%`, pickColor(totalHoldingRate))}\n\n`,
    );
    md.appendMarkdown(`\n ___ \n\n`);
    md.appendMarkdown(`$(list-ordered) 排序：**${fieldName}${arrow}**\n\n`);
    md.appendMarkdown(`悬浮显示排序按钮，点击循环：降序 → 升序 → 默认\n`);

    item.tooltip = md;

    return item;
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

    // 基金名称 + 代码
    md.appendMarkdown(`#### **${fund.name}**&emsp;*${fund.code}*\n\n`);
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

    return md;
  }

  private _getDetailItems(fund: FundInfo): FundTreeItem[] {
    const holdingAmount = calcHoldingAmount(fund);
    const holdingGain = calcHoldingGain(fund);
    const holdingGainRate = calcHoldingGainRate(fund);
    const dailyGain = calcDailyGain(fund);

    // emoji 指示器: 正=🔴 负=🟢 零=⚪
    const dot = (val: number) => (val > 0 ? "🔴" : val < 0 ? "🟢" : "⚪");
    const signStr = (val: number) => `${val >= 0 ? "+" : ""}${val.toFixed(2)}`;

    const details: { label: string; value: string }[] = [
      { label: "基金代码\u3000", value: fund.code },
      { label: "持有额\u3000\u3000", value: fmtMoney(holdingAmount) },
      {
        label: `持有收益\u3000`,
        value: `${dot(holdingGain)} ${signStr(holdingGain)}`,
      },
      {
        label: `持有收益率`,
        value:
          fund.cost > 0
            ? `${dot(holdingGainRate)} ${signStr(holdingGainRate)}%`
            : "--",
      },
      { label: "成本价\u3000\u3000", value: fund.cost > 0 ? fund.cost.toFixed(4) : "--" },
      {
        label: "单位净值\u3000",
        value: fund.netValue > 0 ? fund.netValue.toFixed(4) : "--",
      },
      {
        label: "估算净值\u3000",
        value:
          fund.estimatedValue !== null ? fund.estimatedValue.toFixed(4) : "--",
      },
      {
        label: `涨跌幅\u3000\u3000`,
        value: `${dot(fund.changePercent)} ${signStr(fund.changePercent)}%`,
      },
      {
        label: `估算收益\u3000`,
        value: `${dot(dailyGain)} ${signStr(dailyGain)}`,
      },
      {
        label: "更新时间\u3000",
        value: fund.updateTime
          ? fund.updateTime.length > 10
            ? fund.updateTime.substring(11)
            : fund.updateTime
          : "--",
      },
    ];

    return details.map((d) => {
      const item = new FundTreeItem(
        `${d.label}：${d.value}`,
        vscode.TreeItemCollapsibleState.None,
        fund,
        true,
      );
      item.contextValue = "detailItem";
      return item;
    });
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
