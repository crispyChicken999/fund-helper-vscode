<template>
  <div class="detail-layout" :style="contentStyle">
    <div class="layout-header">
      <slot name="header" />
    </div>
    <div class="layout-content">
      <el-scrollbar>
        <slot />
      </el-scrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useSettingStore } from "@/stores";

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
.detail-layout {
  display: flex;
  height: 100dvh;
  overflow: hidden;
  flex-direction: column;
  background: var(--el-bg-color);
  border-left: 1px solid var(--el-border-color);
  border-right: 1px solid var(--el-border-color);
  transition: width 0.3s;
}

@media (max-width: 768px) {
  .detail-layout {
    position: fixed;
    inset: 0;
  }
}

.layout-header {
  flex-shrink: 0;
}

.layout-content {
  flex: 1;
  min-height: 0;
  background: var(--el-bg-color);
  -webkit-overflow-scrolling: touch;
}
</style>
