/**
 * 新浪 API 原始数据缓存（非响应式）
 *
 * 将 _sinaData（包含完整分时估值数组）与 Pinia 响应式状态分离，
 * 避免大量 intraday 数据被 Vue reactive 代理拖慢性能。
 *
 * 详情页通过 `getSinaData(code)` 获取数据用于绘制走势图。
 * 通过 `sinaVersion` 响应式计数器让 Vue 能感知数据到达，
 * 但实际的大数据对象本身不被 reactive 代理。
 */

import { shallowRef } from 'vue'
import type { SinaFundData } from '@/api/fundSina'

/** 非响应式存储：code → SinaFundData */
const cache = new Map<string, SinaFundData>()

/**
 * 响应式版本号计数器
 * 每次 setSinaData 时递增，computed 读取此值以建立响应式依赖
 */
const version = shallowRef(0)

/** 存入新浪原始数据 */
export function setSinaData(code: string, data: SinaFundData): void {
  cache.set(code, data)
  version.value++
}

/** 读取新浪原始数据 */
export function getSinaData(code: string): SinaFundData | undefined {
  return cache.get(code)
}

/**
 * 获取当前版本号（用于 computed 中建立响应式依赖）
 * computed 可以通过 `void sinaVersion.value` 订阅版本变更
 */
export { version as sinaVersion }

/** 删除指定基金的新浪数据（删除基金时清理） */
export function removeSinaData(code: string): void {
  cache.delete(code)
}

/** 清空所有缓存 */
export function clearSinaData(): void {
  cache.clear()
  version.value++
}
