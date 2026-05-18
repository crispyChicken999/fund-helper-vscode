/**
 * 批量加减仓 - Pending 买入记录服务
 * 仅存本地 localStorage，不参与云同步
 */

import { useFundStore } from '@/stores'
import { fundService } from './fundService'

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

export interface SellRecord {
  code: string
  name: string
  sellShares: number
  navOnSell: number
}

// ===================== 本地存储 =====================

export function loadPendingBuys(): BuyRecord[] {
  try {
    const raw = localStorage.getItem(PENDING_BUYS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function savePendingBuys(list: BuyRecord[]): void {
  localStorage.setItem(PENDING_BUYS_KEY, JSON.stringify(list))
}

// ===================== CRUD =====================

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
  const list = loadPendingBuys()
  const idx = list.findIndex(r => r.id === id)
  if (idx !== -1) {
    list.splice(idx, 1)
    savePendingBuys(list)
  }
}

export function getPendingCount(): number {
  return loadPendingBuys().filter(r => r.status === 'pending').length
}

// ===================== 净值更新检查 =====================

/**
 * 检查哪些 pending 记录的净值已更新
 * 返回 navOnBuyDate 已填充的 ready 列表（不修改存储）
 */
export function getReadyPendingBuys(): BuyRecord[] {
  const fundStore = useFundStore()
  const pendingList = loadPendingBuys().filter(r => r.status === 'pending')
  const readyList: BuyRecord[] = []

  for (const record of pendingList) {
    const detail = fundStore.fundDetails.get(record.code)
    if (!detail) continue

    // 基金净值日期 >= 买入日期，说明当天净值已经更新了
    if (detail.netValueDate && detail.netValueDate >= record.buyDate) {
      readyList.push({ ...record, navOnBuyDate: detail.netValue })
    }
  }

  return readyList
}

// ===================== 确认加仓 =====================

/**
 * 批量确认 ready 的 pending 买入
 * 直接更新基金持仓数据（本地），不触发云同步
 */
export async function confirmPendingBuys(readyList: BuyRecord[]): Promise<void> {
  const fundStore = useFundStore()

  for (const record of readyList) {
    if (!record.navOnBuyDate) continue

    const fund = fundStore.getFund(record.code)
    if (fund) {
      // 已持仓：加权平均成本
      const addNum = record.amount / record.navOnBuyDate
      const oldNum = fund.num
      const oldCost = fund.cost
      const newNum = oldNum + addNum
      const newCost = newNum > 0 ? (oldCost * oldNum + record.navOnBuyDate * addNum) / newNum : record.navOnBuyDate
      await fundService.updateFund(record.code, newNum, newCost, fund.groupKey)
    } else {
      // 新持仓：直接用买入净值作成本
      const newNum = record.amount / record.navOnBuyDate
      await fundService.addFund(record.code, newNum, record.navOnBuyDate)
    }
  }

  // 从 pending 列表中移除已确认的记录
  const confirmedIds = new Set(readyList.map(r => r.id))
  const remaining = loadPendingBuys().filter(r => !confirmedIds.has(r.id))
  savePendingBuys(remaining)
}

// ===================== 即时加仓（有净值，无需 pending） =====================

export interface ImmediateBuyItem {
  code: string
  name: string
  buyDate: string
  amount: number
  nav: number
}

export async function executeImmediateBuys(items: ImmediateBuyItem[]): Promise<void> {
  const fundStore = useFundStore()

  for (const item of items) {
    const fund = fundStore.getFund(item.code)
    const addNum = item.amount / item.nav

    if (fund) {
      const newNum = fund.num + addNum
      const newCost = newNum > 0
        ? (fund.cost * fund.num + item.nav * addNum) / newNum
        : item.nav
      await fundService.updateFund(item.code, newNum, newCost, fund.groupKey)
    } else {
      await fundService.addFund(item.code, addNum, item.nav)
    }
  }
}

// ===================== 减仓 =====================

export interface SellItem {
  code: string
  name: string
  sellShares: number
}

export async function executeSells(items: SellItem[]): Promise<void> {
  const fundStore = useFundStore()

  for (const item of items) {
    const fund = fundStore.getFund(item.code)
    if (!fund) continue
    const newNum = fund.num - item.sellShares
    if (newNum < 0) continue
    await fundService.updateFund(item.code, newNum, fund.cost, fund.groupKey)
  }
}
