/**
 * 状态栏收益摘要
 */

import * as vscode from "vscode";
import { FundInfo, calcDailyGain } from "./fundModel";

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
  for (const fund of fundList) {
    totalDailyGain += calcDailyGain(fund);
    totalAmount += fund.netValue * fund.shares;
  }

  const sign = totalDailyGain >= 0 ? "+" : "";
  const gainStr = `${sign}${totalDailyGain.toFixed(2)}`;

  let rateStr = "";
  if (totalAmount > 0) {
    const rate = (totalDailyGain / totalAmount) * 100;
    rateStr = ` (${rate >= 0 ? "+" : ""}${rate.toFixed(2)}%)`;
  }

  const icon = totalDailyGain >= 0 ? "$(triangle-up)" : "$(triangle-down)";
  statusBarItem.text = `${icon} ${gainStr}${rateStr}`;
  statusBarItem.color = totalDailyGain >= 0 ? "#f56c6c" : "#4eb61b";
}

export function disposeStatusBar(): void {
  statusBarItem?.dispose();
  statusBarItem = undefined;
}
