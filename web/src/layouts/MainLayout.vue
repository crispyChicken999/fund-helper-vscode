<template>
  <div class="main-layout">
    <div class="layout-header">
      <slot name="header" />
    </div>

    <div class="layout-content">
      <slot />
    </div>

    <nav class="layout-footer bottom-nav" aria-label="主导航">
      <router-link
        to="/"
        class="nav-item"
        :class="{ active: route.path === '/' }"
      >
        <el-icon class="nav-icon"><HomeFilled /></el-icon>
        <span>首页</span>
      </router-link>
      <router-link
        to="/market"
        class="nav-item"
        :class="{ active: route.path === '/market' }"
      >
        <el-icon class="nav-icon"><TrendCharts /></el-icon>
        <span>行情</span>
      </router-link>
      <router-link
        to="/settings"
        class="nav-item"
        :class="{ active: route.path === '/settings' }"
      >
        <el-icon class="nav-icon"><Setting /></el-icon>
        <span>设置</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { HomeFilled, TrendCharts, Setting } from '@element-plus/icons-vue'

const route = useRoute()
</script>

<style scoped>
.main-layout {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.layout-header {
  flex-shrink: 0;
}

.layout-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.layout-footer {
  flex-shrink: 0;
  min-height: calc(60px + env(safe-area-inset-bottom, 0px));
  height: auto;
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  padding: 0 0 env(safe-area-inset-bottom, 0px);
  border-top: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
  box-sizing: border-box;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-decoration: none;
  transition: color 0.2s;
  position: relative;
}

.nav-item .nav-icon {
  font-size: 18px;
  transition: transform 0.2s;
}

.nav-item.active {
  color: var(--el-color-primary);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  top: 0;
  width: 24px;
  height: 2px;
  background: var(--el-color-primary);
  border-radius: 0 0 2px 2px;
}

.nav-item.active .nav-icon {
  transform: scale(1.1);
}

.nav-item:not(.active):hover {
  color: var(--el-text-color-regular);
}
</style>
