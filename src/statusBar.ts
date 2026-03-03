/**
 * 状态栏收益摘要
 */

import * as vscode from "vscode";
import { FundInfo, calcDailyGain, calcHoldingGain, calcHoldingAmount } from "./fundModel";

let statusBarItem: vscode.StatusBarItem | undefined;

export function createStatusBar(): vscode.StatusBarItem {
  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100,
    );
    statusBarItem.command = "fund-helper.refreshFund";
    statusBarItem.tooltip = "点击刷新基金数据";
    statusBarItem.show();
  }
  updateStatusBar([]);
  return statusBarItem;
}

export function updateStatusBar(fundList: FundInfo[]): void {
  if (!statusBarItem) {
    return;
  }

  if (fundList.length === 0) {
    statusBarItem.text = "$(graph-line) 基金助手";
    statusBarItem.color = undefined;
    return;
  }

  let totalDailyGain = 0;
  let totalAmount = 0;
  let totalHoldingGain = 0;
  let upCount = 0;
  let downCount = 0;
  let totalDailyUp = 0;
  let totalDailyDown = 0;

  for (const fund of fundList) {
    const dailyGain = calcDailyGain(fund);
    totalDailyGain += dailyGain;
    totalAmount += calcHoldingAmount(fund);
    totalHoldingGain += calcHoldingGain(fund);

    if (dailyGain > 0) {
      upCount++;
      totalDailyUp += dailyGain;
    } else if (dailyGain < 0) {
      downCount++;
      totalDailyDown += dailyGain;
    }
  }

  let totalHoldingUp = 0;
  let totalHoldingDown = 0;
  let holdingUpCount = 0;
  let holdingDownCount = 0;

  for (const fund of fundList) {
    const holdingGain = calcHoldingGain(fund);
    if (holdingGain > 0) {
      holdingUpCount++;
      totalHoldingUp += holdingGain;
    } else if (holdingGain < 0) {
      holdingDownCount++;
      totalHoldingDown += holdingGain;
    }
  }

  const sign = totalDailyGain >= 0 ? "+" : "";
  const gainStr = `${sign}${totalDailyGain.toFixed(2)}`;

  let rateStr = "";
  if (totalAmount > 0) {
    const rate = (totalDailyGain / totalAmount) * 100;
    rateStr = ` (${rate >= 0 ? "+" : ""}${rate.toFixed(2)}%)`;
  }

  const config = vscode.workspace.getConfiguration("fund-helper");
  const hideStatusBar = config.get<boolean>("hideStatusBar", false);

  if (hideStatusBar) {
    statusBarItem.text = `$(eye-closed) 基金助手`;
    statusBarItem.color = undefined;
  } else {
    const icon = totalDailyGain >= 0 ? "$(triangle-up)" : "$(triangle-down)";
    statusBarItem.text = `${icon} ${gainStr}${rateStr}`;
    statusBarItem.color = totalDailyGain >= 0 ? "#f56c6c" : "#4eb61b";
  }

  // 构建 Tooltip 统计信息
  const md = new vscode.MarkdownString();
  md.isTrusted = true;
  md.supportHtml = true;
  md.appendMarkdown(`#### 📊 今日基金统计\n\n`);
  md.appendMarkdown(`\n ___ \n\n`);
  md.appendMarkdown(`📈 上涨基金：**${upCount}** 只，共计：<span style="color:#f56c6c;">+${totalDailyUp.toFixed(2)}</span>\n\n`);
  md.appendMarkdown(`📉 下跌基金：**${downCount}** 只，共计：<span style="color:#4eb61b;">${totalDailyDown.toFixed(2)}</span>\n\n`);
  const dayColor = totalDailyGain > 0 ? "#f56c6c" : totalDailyGain < 0 ? "#4eb61b" : "#909399";
  md.appendMarkdown(`💰 日总收益：**<span style="color:${dayColor};">${totalDailyGain >= 0 ? "+" : ""}${totalDailyGain.toFixed(2)}</span>**\n\n`);

  md.appendMarkdown(`\n ___ \n\n`);
  const holdingColor = totalHoldingGain > 0 ? "#f56c6c" : totalHoldingGain < 0 ? "#4eb61b" : "#909399";

  md.appendMarkdown(`🏦 **累计收益：<span style="color:${holdingColor};">${totalHoldingGain >= 0 ? "+" : ""}${totalHoldingGain.toFixed(2)}</span>**\n\n`);
  md.appendMarkdown(`📈 累计盈利：**${holdingUpCount}** 只，共计：<span style="color:#f56c6c;">+${totalHoldingUp.toFixed(2)}</span>\n\n`);
  md.appendMarkdown(`📉 累计亏损：**${holdingDownCount}** 只，共计：<span style="color:#4eb61b;">${totalHoldingDown.toFixed(2)}</span>\n\n`);
  md.appendMarkdown(`\n ___ \n\n`);

  md.appendMarkdown(`📦 自选数量：**${fundList.length}** 只\n\n`);
  md.appendMarkdown(`*点击状态栏刷新， [点击这里隐藏/显示金额](command:fund-helper.toggleStatusBarHide)*`);

  statusBarItem.tooltip = md;
}

export function disposeStatusBar(): void {
  statusBarItem?.dispose();
  statusBarItem = undefined;
}
