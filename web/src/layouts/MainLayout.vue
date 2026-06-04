<template>
  <div class="main-layout" :style="contentStyle">
    <div class="layout-header">
      <slot name="header" />
    </div>

    <div class="layout-content">
      <template v-if="route.path === '/'">
        <slot />
      </template>
      <el-scrollbar v-else>
        <slot />
      </el-scrollbar>
    </div>

    <nav class="layout-footer bottom-nav" aria-label="主导航">
      <router-link
        to="/"
        class="nav-item"
        @contextmenu.prevent
        :class="{ active: route.path === '/' }"
      >
        <el-icon class="nav-icon"><HomeFilled /></el-icon>
        <span>首页</span>
      </router-link>
      <router-link
        to="/market"
        class="nav-item"
        @contextmenu.prevent
        :class="{ active: route.path === '/market' }"
      >
        <el-icon class="nav-icon"><TrendCharts /></el-icon>
        <span>行情</span>
      </router-link>
      <router-link
        to="/settings"
        class="nav-item"
        @contextmenu.prevent
        :class="{ active: route.path === '/settings' }"
      >
        <el-icon class="nav-icon"><Setting /></el-icon>
        <span>设置</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import { HomeFilled, TrendCharts, Setting } from "@element-plus/icons-vue";
import { computed } from "vue";
import { useSettingStore } from "@/stores";

const route = useRoute();
const settingStore = useSettingStore();

const contentStyle = computed(() => {
  const mode = settingStore.maxContentWidthMode;
  if (mode === "full") {
    return {};
  }

  let maxWidth: number;
  if (mode === "preset") {
    maxWidth = settingStore.maxContentWidth;
  } else {
    maxWidth = settingStore.maxContentWidth;
  }

  return {
    width: `${maxWidth}px`,
    maxWidth: `100%`,
    margin: "0 auto",
  };
});
</script>

<style scoped>
.main-layout {
  display: flex;
  height: 100vh;
  height: 100svh; /* 使用稳定视口高度 */
  flex-direction: column;
  overflow: hidden;
  background: var(--el-bg-color);
  border-left: 1px solid var(--el-border-color);
  border-right: 1px solid var(--el-border-color);
  transition: width 0.3s;
  /* 防止下拉刷新导致的布局问题 */
  overscroll-behavior-y: contain;
  position: relative;
}

@media (max-width: 768px) {
  .main-layout {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: auto;
    /* 移动端禁用下拉刷新 */
    overscroll-behavior: none;
    touch-action: pan-y;
  }
}

.layout-header {
  flex-shrink: 0;
  position: relative;
  z-index: 11;
  background: var(--el-bg-color);
}

.layout-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  position: relative;
}

.layout-footer {
  flex-shrink: 0;
  height: 60px;
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  padding: 0 0 0;
  border-top: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
  box-sizing: border-box;
  position: relative;
  z-index: 11;
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
  -webkit-tap-highlight-color: transparent;
}

.nav-item .nav-icon {
  font-size: 18px;
  transition: transform 0.2s;
}

.nav-item.active {
  color: var(--el-color-primary);
}

.nav-item.active::before {
  content: "";
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
