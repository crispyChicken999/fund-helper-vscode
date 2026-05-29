<template>
  <div class="theme-toggle-float" :class="{ expanded: isExpanded }">
    <!-- 主按钮 -->
    <el-button
      class="toggle-main-btn"
      :icon="currentIcon"
      circle
      size="large"
      @click="toggleExpanded"
      :title="isExpanded ? '收起' : '主题设置'"
    />

    <!-- 展开的选项面板 -->
    <transition name="slide-fade">
      <div v-show="isExpanded" class="toggle-options">
        <div class="option-item" @click="setThemeMode('light')" :class="{ active: themeMode === 'light' }">
          <el-icon><Sunny /></el-icon>
          <span>亮色</span>
        </div>
        <div class="option-item" @click="setThemeMode('dark')" :class="{ active: themeMode === 'dark' }">
          <el-icon><Moon /></el-icon>
          <span>暗色</span>
        </div>
        <div class="option-item" @click="setThemeMode('auto')" :class="{ active: themeMode === 'auto' }">
          <el-icon><Monitor /></el-icon>
          <span>跟随系统</span>
        </div>
        <div class="option-divider"></div>
        <div class="option-item" @click="toggleGrayscale" :class="{ active: grayscaleMode }">
          <el-icon><Picture /></el-icon>
          <span>灰色模式</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Sunny, Moon, Monitor, Picture } from '@element-plus/icons-vue'
import { useSettingStore } from '@/stores'

const settingStore = useSettingStore()
const isExpanded = ref(false)

// 直接使用共享的设置源，避免不同页面维护两套主题模式
const themeMode = computed(() => settingStore.themeMode as 'light' | 'dark' | 'auto')

// 灰色模式
const grayscaleMode = computed(() => settingStore.grayscaleMode)

// 当前图标
const currentIcon = computed(() => {
  if (grayscaleMode.value) return Picture
  if (themeMode.value === 'auto') return Monitor
  if (themeMode.value === 'dark') return Moon
  return Sunny
})

// 系统主题媒体查询
let mediaQuery: MediaQueryList | null = null

// 切换展开状态
function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}

// 设置主题模式
async function setThemeMode(mode: 'light' | 'dark' | 'auto') {
  // 同步到 settingStore 的主题模式
  await settingStore.setThemeMode(mode)
  applyTheme()
  isExpanded.value = false
}

// 切换灰色模式
function toggleGrayscale() {
  settingStore.setGrayscaleMode(!grayscaleMode.value)
  isExpanded.value = false
}

// 应用主题
function applyTheme() {
  let targetTheme: 'light' | 'dark' = 'light'

  if (themeMode.value === 'auto') {
    // 跟随系统
    targetTheme = mediaQuery?.matches ? 'dark' : 'light'
  } else {
    targetTheme = themeMode.value
  }

  // 使用 View Transition API 实现平滑过渡
  if (document.startViewTransition && settingStore.theme !== targetTheme) {
    document.startViewTransition(() => {
      settingStore.setTheme(targetTheme)
    })
  } else {
    settingStore.setTheme(targetTheme)
  }
}

// 监听系统主题变化
function handleSystemThemeChange(_e: MediaQueryListEvent) {
  if (themeMode.value === 'auto') {
    applyTheme()
  }
}

// 点击外部关闭
function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.theme-toggle-float')) {
    isExpanded.value = false
  }
}

onMounted(() => {
  // 设置系统主题监听
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', handleSystemThemeChange)

  // 初始应用主题
  applyTheme()

  // 添加点击外部关闭的监听
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  if (mediaQuery) {
    mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.theme-toggle-float {
  position: absolute;
  right: 20px;
  bottom: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.toggle-main-btn {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.toggle-main-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.toggle-options {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 140px;
}

[data-theme="dark"] .toggle-options {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.option-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--el-text-color-regular);
  font-size: 14px;
  user-select: none;
}

.option-item:hover {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
}

.option-item.active {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 500;
}

[data-theme="dark"] .option-item.active {
  background: rgba(64, 158, 255, 0.2);
}

.option-item .el-icon {
  font-size: 18px;
}

.option-divider {
  height: 1px;
  background: var(--el-border-color-lighter);
  margin: 4px 0;
}

/* 动画 */
.slide-fade-enter-active {
  transition: all 0.3s ease;
}

.slide-fade-leave-active {
  transition: all 0.2s ease;
}

.slide-fade-enter-from {
  transform: translateY(10px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateY(10px);
  opacity: 0;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .theme-toggle-float {
    right: 16px;
    bottom: 16px;
  }

  .toggle-options {
    min-width: 130px;
  }

  .option-item {
    padding: 8px 12px;
    font-size: 13px;
  }
}
</style>
