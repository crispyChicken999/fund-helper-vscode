<template>
  <div class="detail-layout">
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

<style scoped>
.detail-layout {
  display: flex;
  height: 100dvh;
  overflow: hidden;
  flex-direction: column;
  background: var(--el-bg-color);
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
