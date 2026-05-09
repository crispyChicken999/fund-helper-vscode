<template>
  <div class="market-view">
    <el-container>
      <!-- 顶部标题栏 -->
      <el-header class="market-header">
        <div class="header-content">
          <h2>行情中心</h2>
          <div class="market-stats">
            <span class="stat-item">
              总计: <strong>{{ marketStats.total }}</strong>
            </span>
            <span class="stat-item positive">
              上涨: <strong>{{ marketStats.rising }}</strong>
            </span>
            <span class="stat-item negative">
              下跌: <strong>{{ marketStats.falling }}</strong>
            </span>
          </div>
        </div>
      </el-header>

      <!-- 分类筛选区 -->
      <div class="category-tabs">
        <el-scrollbar>
          <div class="category-tabs-inner">
            <el-tag
              v-for="category in categories"
              :key="category"
              :type="selectedCategory === category ? 'primary' : 'info'"
              class="category-tag"
              @click="selectCategory(category)"
            >
              {{ category }}
            </el-tag>
          </div>
        </el-scrollbar>
      </div>

      <!-- 搜索区 -->
      <div class="search-bar">
        <el-input
          v-model="searchQuery"
          placeholder="搜索行情代码或名称"
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button @click="handleRefresh" :loading="loading">
          <el-icon><Refresh /></el-icon>
          <span>刷新</span>
        </el-button>
      </div>

      <!-- 行情列表区 -->
      <el-main class="market-list-main" v-loading="loading">
        <div v-if="displayMarkets.length > 0" class="market-list">
          <div
            v-for="market in displayMarkets"
            :key="market.code"
            class="market-item"
            @click="handleMarketClick(market)"
          >
            <div class="market-info">
              <div class="market-name">{{ market.name }}</div>
              <div class="market-code">{{ market.code }}</div>
            </div>
            <div class="market-data">
              <div class="market-price">{{ formatPrice(market.price) }}</div>
              <div class="market-change" :class="getChangeClass(market.changePercent)">
                <span class="change-amount">{{ formatChange(market.changeAmount) }}</span>
                <span class="change-percent">{{ formatPercent(market.changePercent) }}</span>
              </div>
            </div>
          </div>
        </div>

        <el-empty v-else description="暂无行情数据" />

        <!-- 最后更新时间 -->
        <div v-if="lastUpdateTime" class="update-time">
          最后更新: {{ formatUpdateTime(lastUpdateTime) }}
        </div>
      </el-main>

      <!-- 底部导航 -->
      <el-footer class="bottom-nav">
        <el-menu mode="horizontal" :default-active="'/market'" router>
          <el-menu-item index="/">
            <el-icon><HomeFilled /></el-icon>
            <span>首页</span>
          </el-menu-item>
          <el-menu-item index="/market">
            <el-icon><TrendCharts /></el-icon>
            <span>行情</span>
          </el-menu-item>
          <el-menu-item index="/settings">
            <el-icon><Setting /></el-icon>
            <span>设置</span>
          </el-menu-item>
        </el-menu>
      </el-footer>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, HomeFilled, TrendCharts, Setting } from '@element-plus/icons-vue'
import { useMarketStore, useSettingStore } from '@/stores'
import { marketService } from '@/services'
import { formatRelativeTime } from '@/utils/format'
import type { MarketInfo } from '@/types'

const marketStore = useMarketStore()
const settingStore = useSettingStore()

// 状态
const loading = ref(false)
const searchQuery = ref('')

// 计算属性
const categories = computed(() => marketStore.getCategories())
const selectedCategory = computed(() => marketStore.selectedCategory)
const lastUpdateTime = computed(() => marketStore.lastUpdateTime)

const displayMarkets = computed(() => {
  let markets = marketStore.filteredMarkets
  
  // 按涨跌幅排序（降序）
  return markets.sort((a, b) => b.changePercent - a.changePercent)
})

const marketStats = computed(() => marketService.getMarketStats())

// 方法
const selectCategory = async (category: string) => {
  marketStore.selectCategory(category)
  
  // 如果该分类没有数据，则刷新
  const markets = marketStore.marketsByCategory(category)
  if (markets.length === 0) {
    await handleRefresh()
  }
}

const handleSearch = () => {
  marketStore.setSearchQuery(searchQuery.value)
}

const handleRefresh = async () => {
  loading.value = true
  try {
    await marketService.refreshByCategory(selectedCategory.value)
    ElMessage.success('刷新成功')
  } catch (error: any) {
    ElMessage.error('刷新失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const handleMarketClick = (market: MarketInfo) => {
  // 可以跳转到行情详情页（待实现）
  ElMessage.info(`${market.name} 详情功能开发中`)
}

const formatPrice = (price: number): string => {
  return price.toFixed(2)
}

const formatChange = (change: number): string => {
  const sign = change > 0 ? '+' : ''
  return `${sign}${change.toFixed(2)}`
}

const formatPercent = (percent: number): string => {
  const sign = percent > 0 ? '+' : ''
  return `${sign}${percent.toFixed(2)}%`
}

const getChangeClass = (changePercent: number): string => {
  if (settingStore.grayscaleMode) return ''
  return changePercent > 0 ? 'positive' : changePercent < 0 ? 'negative' : ''
}

const formatUpdateTime = (timestamp: number): string => {
  return formatRelativeTime(timestamp)
}

// 生命周期
onMounted(async () => {
  // 初始化行情数据
  loading.value = true
  try {
    await marketService.initialize()
    
    // 启动自动刷新（60秒）
    marketService.startAutoRefresh(60)
  } catch (error) {
    console.error('初始化行情失败:', error)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  // 停止自动刷新
  marketService.stopAutoRefresh()
})
</script>

<style scoped>
.market-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.market-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
}

.header-content h2 {
  margin: 0 0 10px 0;
  font-size: 24px;
}

.market-stats {
  display: flex;
  gap: 20px;
  font-size: 14px;
}

.stat-item {
  opacity: 0.9;
}

.stat-item strong {
  font-size: 16px;
  margin-left: 4px;
}

.category-tabs {
  padding: 10px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
}

.category-tabs-inner {
  display: flex;
  gap: 10px;
  align-items: center;
}

.category-tag {
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  font-size: 14px;
  padding: 8px 16px;
}

.search-bar {
  padding: 10px;
  display: flex;
  gap: 10px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
}

.search-bar .el-input {
  flex: 1;
}

.market-list-main {
  flex: 1;
  overflow: auto;
  padding: 10px;
}

.market-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.market-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.market-item:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.market-info {
  flex: 1;
}

.market-name {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.market-code {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.market-data {
  text-align: right;
}

.market-price {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 4px;
}

.market-change {
  font-size: 14px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.positive {
  color: #67c23a;
}

.negative {
  color: #f56c6c;
}

.update-time {
  text-align: center;
  padding: 20px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.bottom-nav {
  height: 60px;
  padding: 0;
  border-top: 1px solid var(--el-border-color);
}

.bottom-nav :deep(.el-menu) {
  border: none;
}

.bottom-nav :deep(.el-menu-item) {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
}

@media (max-width: 768px) {
  .market-header h2 {
    font-size: 20px;
  }
  
  .market-stats {
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .market-name {
    font-size: 14px;
  }
  
  .market-price {
    font-size: 16px;
  }
}
</style>
