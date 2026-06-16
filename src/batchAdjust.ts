/**
 * 批量加减仓 - Extension Host 端数据管理
 * 使用 vscode.ExtensionContext.globalState 持久化 Pending 买入记录
 * 数据仅本地存储，不参与云同步
 */

import * as vscode from 'vscode'

const PENDING_BUYS_KEY = 'fund_helper_pending_buys'

// ===================== 类型定义 =====================

export interface BuyRecord {
  id: string
  code: string
  name: string
  /** 买入日期 YYYY-MM-DD */
  buyDate: string
  /** 买入金额（元） */
  amount: number
  /** 买入日净值，null = 待更新 */
  navOnBuyDate: number | null
  status: 'pending' | 'confirmed' | 'cancelled'
  createdAt: number
  confirmedAt?: number
}

// ===================== Context 单例 =====================

let _ctx: vscode.ExtensionContext | null = null

export function initBatchAdjust(ctx: vscode.ExtensionContext): void {
  _ctx = ctx

  // 测试用：如果 pending 列表为空，添加一条默认测试记录
  // 可以在此修改 code/amount/buyDate 来模拟不同测试场景
  // const existing = loadPendingBuys()
  // if (existing.length === 0) {
  //   addPendingBuy({
  //     code: '002963',
  //     name: '易方达黄金ETF联接C',
  //     // 昨天
  //     buyDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  //     amount: 10000,
  //     navOnBuyDate: null,
  //     status: 'pending'
  //   })
  // }
}

// ===================== CRUD =====================

export function loadPendingBuys(): BuyRecord[] {
  if (!_ctx) return []
  return _ctx.globalState.get<BuyRecord[]>(PENDING_BUYS_KEY, [])
}

function savePendingBuys(list: BuyRecord[]): void {
  if (!_ctx) return
  _ctx.globalState.update(PENDING_BUYS_KEY, list)
}

export function addPendingBuy(record: Omit<BuyRecord, 'id' | 'createdAt'>): BuyRecord {
  const list = loadPendingBuys()
  const newRecord: BuyRecord = {
    ...record,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now()
  }
  list.push(newRecord)
  savePendingBuys(list)
  return newRecord
}

export function cancelPendingBuy(id: string): void {
  const list = loadPendingBuys().filter(r => r.id !== id)
  savePendingBuys(list)
}

export function getPendingCount(): number {
  return loadPendingBuys().filter(r => r.status === 'pending').length
}

// ===================== 净值更新检查 =====================

export interface ReadyBuyRecord extends BuyRecord {
  navOnBuyDate: number
}

/**
 * 检查哪些 pending 记录的净值已更新。
 * netValueDates: Map<code, netValueDate YYYY-MM-DD>
 * netValues:     Map<code, netValue number>
 */
export function getReadyPendingBuys(
  netValueDates: Map<string, string>,
  netValues: Map<string, number>
): ReadyBuyRecord[] {
  const pendingList = loadPendingBuys().filter(r => r.status === 'pending')
  const readyList: ReadyBuyRecord[] = []

  for (const record of pendingList) {
    const navDate = netValueDates.get(record.code)
    const nav = netValues.get(record.code)
    if (navDate && nav && navDate >= record.buyDate) {
      readyList.push({ ...record, navOnBuyDate: nav })
    }
  }

  return readyList
}

// ===================== 确认加仓 =====================

/**
 * 确认 ready 列表中的 pending 记录
 * 返回需要更新持仓的基金列表（新份额、新成本价）
 */
export interface PositionUpdate {
  code: string
  newNum: number
  newCost: number
}

export function buildPositionUpdates(
  readyList: ReadyBuyRecord[],
  currentFunds: Array<{ code: string; num: string; cost: string }>
): PositionUpdate[] {
  const updates: PositionUpdate[] = []

  for (const record of readyList) {
    // 防御性类型转换：globalState 的 JSON 序列化/反序列化可能导致字段类型丢失
    const nav = Number(record.navOnBuyDate)
    const amount = Number(record.amount)
    if (!nav || nav <= 0) continue  // 跳过无效净值，避免 amount/0 = Infinity
    if (!amount || amount <= 0) continue
    const addNum = amount / nav
    const existing = currentFunds.find(f => f.code === record.code)
    const oldNum = existing ? (parseFloat(existing.num) || 0) : 0
    const oldCost = existing ? (parseFloat(existing.cost) || 0) : 0
    const newNum = oldNum + addNum
    const newCost = newNum > 0 ? (oldCost * oldNum + nav * addNum) / newNum : nav
    if (!isFinite(newNum) || !isFinite(newCost)) continue  // 防止 NaN/Infinity 写入持仓
    updates.push({ code: record.code, newNum, newCost })
  }

  return updates
}

export function removePendingBuys(ids: string[]): void {
  const idSet = new Set(ids)
  const remaining = loadPendingBuys().filter(r => !idSet.has(r.id))
  savePendingBuys(remaining)
}
