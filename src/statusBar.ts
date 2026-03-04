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
    statusBarItem.color = totalDailyGain >= 0 ? undefined : "#4eb61b";
  }

  // 构建 Tooltip 统计信息
  const md = new vscode.MarkdownString();
  md.isTrusted = true;
  md.supportThemeIcons = true;
  md.supportHtml = true;
  md.appendMarkdown(`#### $(graph-line) 今日基金统计\n\n`);
  md.appendMarkdown(`\n ___ \n\n`);
  const hl = (text: string, color: string) =>
    `**<span style="color:${color};background-color:${color}33;">&nbsp;${text}&nbsp;</span>**`;

  md.appendMarkdown(`$(arrow-up) 上涨基金：**${upCount}** 只，共计：${hl("+" + totalDailyUp.toFixed(2), "#f56c6c")}\n\n`);
  md.appendMarkdown(`$(arrow-down) 下跌基金：**${downCount}** 只，共计：${hl(totalDailyDown.toFixed(2), "#4eb61b")}\n\n`);
  const dayColor = totalDailyGain > 0 ? "#f56c6c" : totalDailyGain < 0 ? "#4eb61b" : "#909399";
  md.appendMarkdown(`$(pulse) 日总收益：${hl(`${totalDailyGain >= 0 ? "+" : ""}${totalDailyGain.toFixed(2)}`, dayColor)}\n\n`);

  md.appendMarkdown(`\n ___ \n\n`);
  const holdingColor = totalHoldingGain > 0 ? "#f56c6c" : totalHoldingGain < 0 ? "#4eb61b" : "#909399";

  md.appendMarkdown(`$(triangle-up) 累计盈利：**${holdingUpCount}** 只，共计：${hl("+" + totalHoldingUp.toFixed(2), "#f56c6c")}\n\n`);
  md.appendMarkdown(`$(triangle-down) 累计亏损：**${holdingDownCount}** 只，共计：${hl(totalHoldingDown.toFixed(2), "#4eb61b")}\n\n`);
  md.appendMarkdown(`$(diff) 累计收益：${hl(`${totalHoldingGain >= 0 ? "+" : ""}${totalHoldingGain.toFixed(2)}`, holdingColor)}\n\n`);
  md.appendMarkdown(`\n ___ \n\n`);

  md.appendMarkdown(`$(database) 自选数量：**${fundList.length}** 只\n\n`);

  const now = new Date();
  const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  md.appendMarkdown(`$(clock) 更新时间：**${timeStr}**\n\n`);
  md.appendMarkdown(`\n ___ \n\n`);

  const copyText = `【今日基金统计】\n上涨基金：${upCount} 只 (+${totalDailyUp.toFixed(2)})\n下跌基金：${downCount} 只 (${totalDailyDown.toFixed(2)})\n日总收益：${totalDailyGain >= 0 ? "+" : ""}${totalDailyGain.toFixed(2)}\n累计盈利：${holdingUpCount} 只 (+${totalHoldingUp.toFixed(2)})\n累计亏损：${holdingDownCount} 只 (${totalHoldingDown.toFixed(2)})\n累计收益：${totalHoldingGain >= 0 ? "+" : ""}${totalHoldingGain.toFixed(2)}\n自选数量：${fundList.length} 只\n更新时间：${timeStr}`;
  const uriEncoded = encodeURIComponent(JSON.stringify(copyText));
  md.appendMarkdown(`[$(copy) 复制今日统计](command:fund-helper.copyFundDetail?${uriEncoded})\n\n`);

  md.appendMarkdown(`*点击状态栏刷新， [点击这里隐藏/显示金额](command:fund-helper.toggleStatusBarHide)*`);

  statusBarItem.tooltip = md;
}

export function disposeStatusBar(): void {
  statusBarItem?.dispose();
  statusBarItem = undefined;
}
