// JSONBox API封装

import axios, { type AxiosInstance } from 'axios'
import type { Fund, Settings } from '@/types'

// JSONBox API基础URL
const JSONBOX_API_BASE = 'https://jsonbox.cloud.exo-imaging.com'

/**
 * JSONBox存储的数据结构
 */
export interface JsonboxData {
  funds: Fund[]
  groups: Record<string, string[]>
  groupOrder: string[]
  settings: Partial<Settings>
  version: number
  lastModified: number
}

/**
 * JSONBox API客户端
 */
class JsonboxClient {
  private client: AxiosInstance
  private boxId: string = ''

  constructor() {
    this.client = axios.create({
      baseURL: JSONBOX_API_BASE,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  /**
   * 设置Box ID
   */
  setBoxId(boxId: string) {
    this.boxId = boxId
  }

  /**
   * 获取Box ID
   */
  getBoxId(): string {
    return this.boxId
  }

  /**
   * 读取Box中的所有数据
   */
  async read(): Promise<JsonboxData | null> {
    if (!this.boxId) {
      throw new Error('Box ID未设置')
    }

    try {
      const response = await this.client.get(`/${this.boxId}`)
      const data = response.data

      // jsonbox 对无效 box id 返回 {"message":"Invalid or empty box id"}
      if (data && typeof data === 'object' && !Array.isArray(data) && data.message) {
        throw new Error(data.message)
      }

      if (Array.isArray(data) && data.length > 0) {
        // JSONBox返回的是数组，取第一个元素
        const item = data[0]
        return {
          funds: item.funds || [],
          groups: item.groups || {},
          groupOrder: item.groupOrder || [],
          settings: item.settings || {},
          version: item.version || 1,
          lastModified: item.lastModified || Date.now()
        }
      }

      return null
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null // Box不存在
      }
      throw new Error(`读取数据失败: ${error.message}`)
    }
  }

  /**
   * 写入数据到Box
   */
  async write(data: JsonboxData): Promise<void> {
    if (!this.boxId) {
      throw new Error('Box ID未设置')
    }

    try {
      // 先删除旧数据
      await this.clear()

      // 写入新数据
      await this.client.post(`/${this.boxId}`, {
        ...data,
        lastModified: Date.now()
      })
    } catch (error: any) {
      throw new Error(`写入数据失败: ${error.message}`)
    }
  }

  /**
   * 更新Box中的数据
   */
  async update(data: Partial<JsonboxData>): Promise<void> {
    const currentData = await this.read()

    if (!currentData) {
      // 如果Box不存在，创建新的
      await this.write({
        funds: [],
        groups: {},
        groupOrder: [],
        settings: {},
        version: 1,
        lastModified: Date.now(),
        ...data
      })
      return
    }

    // 合并数据
    const updatedData: JsonboxData = {
      ...currentData,
      ...data,
      version: currentData.version + 1,
      lastModified: Date.now()
    }

    await this.write(updatedData)
  }

  /**
   * 清空Box中的所有数据
   */
  async clear(): Promise<void> {
    if (!this.boxId) {
      throw new Error('Box ID未设置')
    }

    try {
      // 获取所有记录
      const response = await this.client.get(`/${this.boxId}`)

      if (response.data && response.data.length > 0) {
        // 删除所有记录
        const deletePromises = response.data.map((item: any) =>
          this.client.delete(`/${this.boxId}/${item._id}`)
        )
        await Promise.all(deletePromises)
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        throw new Error(`清空数据失败: ${error.message}`)
      }
    }
  }

  /**
   * 检查Box是否存在
   */
  async exists(): Promise<boolean> {
    try {
      const data = await this.read()
      return data !== null
    } catch {
      return false
    }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/_meta/info')
      return true
    } catch {
      return false
    }
  }
}

// 导出单例
export const jsonboxClient = new JsonboxClient()

// 导出便捷方法
export const jsonboxApi = {
  setBoxId: (boxId: string) => jsonboxClient.setBoxId(boxId),
  getBoxId: () => jsonboxClient.getBoxId(),
  read: () => jsonboxClient.read(),
  write: (data: JsonboxData) => jsonboxClient.write(data),
  update: (data: Partial<JsonboxData>) => jsonboxClient.update(data),
  clear: () => jsonboxClient.clear(),
  exists: () => jsonboxClient.exists(),
  testConnection: () => jsonboxClient.testConnection()
}
