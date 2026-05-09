<template>
  <div id="app" :class="{ 'dark-mode': isDarkMode, 'grayscale-mode': isGrayscaleMode }">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useSettingStore } from '@/stores'

const settingStore = useSettingStore()

const isDarkMode = computed(() => settingStore.theme === 'dark')
const isGrayscaleMode = computed(() => settingStore.grayscaleMode)

// 监听主题变化，应用到document
watch(
  () => settingStore.theme,
  (theme) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  },
  { immediate: true }
)
</script>

<style>
#app {
  width: 100%;
  min-height: 100vh;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
}

/* 灰色模式 */
.grayscale-mode {
  filter: grayscale(100%);
}

/* 移动端适配 */
@media (max-width: 768px) {
  #app {
    font-size: 14px;
  }
}
</style>
