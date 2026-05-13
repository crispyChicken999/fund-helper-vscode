<template>
  <div class="skeleton-table">
    <div v-for="i in rows" :key="i" class="skeleton-row">
      <div class="skeleton-cell skeleton-name">
        <div class="skeleton-bar" style="width: 80%; height: 14px"></div>
        <div class="skeleton-bar" style="width: 50%; height: 11px; margin-top: 4px"></div>
      </div>
      <div v-for="j in cols" :key="j" class="skeleton-cell">
        <div class="skeleton-bar" style="width: 70%; height: 13px"></div>
        <div class="skeleton-bar" style="width: 50%; height: 11px; margin-top: 4px"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ rows?: number; cols?: number }>(), { rows: 8, cols: 4 })
</script>

<style scoped>
.skeleton-table {
  padding: 12px;
}

.skeleton-row {
  display: flex;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.skeleton-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.skeleton-name {
  flex: 1.5;
}

.skeleton-bar {
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--el-fill-color-light) 25%,
    var(--el-fill-color) 50%,
    var(--el-fill-color-light) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
