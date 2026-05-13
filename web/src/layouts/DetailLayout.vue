<template>
  <div class="detail-layout">
    <div class="layout-header">
      <slot name="header" />
    </div>
    <div class="layout-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.detail-layout {
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
</style>
