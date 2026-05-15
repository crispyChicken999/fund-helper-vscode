<template>
  <div id="app">
    <router-view v-slot="{ Component }">
        <component :is="Component" />
    </router-view>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useSettingStore } from '@/stores'

const settingStore = useSettingStore()

function applyChromeTheme() {
  const root = document.documentElement
  const theme = settingStore.theme
  root.dataset.theme = theme
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  root.dataset.grayscale = settingStore.grayscaleMode ? 'true' : 'false'
}

watch(
  () => [settingStore.theme, settingStore.grayscaleMode] as const,
  () => applyChromeTheme(),
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

/* 数值闪烁动画 */
@keyframes flash-up {
  0%, 100% { background: transparent; }
  50% { background: rgba(239, 68, 68, 0.12); }
}

@keyframes flash-down {
  0%, 100% { background: transparent; }
  50% { background: rgba(34, 197, 94, 0.12); }
}

.flash-up { animation: flash-up 0.6s ease; }
.flash-down { animation: flash-down 0.6s ease; }

/* View Transitions API 样式 */
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}

::view-transition-old(root) {
  z-index: 1;
}

::view-transition-new(root) {
  z-index: 2147483646;
}

html.dark::view-transition-old(root) {
  z-index: 2147483646;
}

html.dark::view-transition-new(root) {
  z-index: 1;
}

/* 移动端适配 */
@media (max-width: 768px) {
  #app {
    font-size: 14px;
  }
}
</style>
