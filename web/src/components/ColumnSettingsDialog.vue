<template>
  <el-dialog
    :model-value="visible"
    title="列设置"
    width="min(92%, 480px)"
    top="5vh"
    :close-on-click-modal="true"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div class="col-settings-hint">
      勾选显示，取消隐藏；拖动 ☰ 手柄或点击箭头排序
    </div>

    <ul ref="sortableRef" class="col-settings-list">
      <li
        v-for="(col, index) in draft"
        :key="col.key"
        :data-key="col.key"
        class="col-settings-item"
        :class="{ fixed: col.key === 'name' }"
        @click="col.key !== 'name' && toggleVisible(index, !col.visible)"
      >
        <span class="drag-handle" :class="{ disabled: col.key === 'name' }">☰</span>
        <el-checkbox
          :model-value="col.visible"
          :disabled="col.key === 'name'"
          @click.stop
          @update:model-value="toggleVisible(index, $event as boolean)"
        />
        <span class="col-label">{{ col.label }}</span>
        <span v-if="col.key === 'name'" class="col-fixed-tag">固定</span>
        <template v-else>
          <el-button
            size="small"
            link
            :disabled="index <= 1"
            @click.stop="moveUp(index)"
          >↑</el-button>
          <el-button
            size="small"
            link
            :disabled="index >= draft.length - 1"
            @click.stop="moveDown(index)"
          >↓</el-button>
        </template>
      </li>
    </ul>

    <template #footer>
      <el-button @click="resetToDefault">恢复默认</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import Sortable from 'sortablejs'
import { useSettingStore } from '@/stores'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const settingStore = useSettingStore()

const ALL_COLUMNS: { key: string; label: string }[] = [
  { key: 'name', label: '基金名称' },
  { key: 'estimatedChange', label: '估算涨幅' },
  { key: 'estimatedGain', label: '估算收益' },
  { key: 'dailyChange', label: '当日涨幅' },
  { key: 'dailyGain', label: '当日收益' },
  { key: 'holdingGain', label: '持有收益' },
  { key: 'holdingGainRate', label: '总收益率' },
  { key: 'sector', label: '关联板块' },
  { key: 'amountShares', label: '金额/份额' },
  { key: 'cost', label: '成本/最新' }
]

const DEFAULT_VISIBLE = [
  'name', 'estimatedGain', 'estimatedChange', 'holdingGainRate',
  'holdingGain', 'dailyChange', 'dailyGain'
]

interface DraftItem {
  key: string
  label: string
  visible: boolean
}

const draft = ref<DraftItem[]>([])
const sortableRef = ref<HTMLElement | null>(null)
let sortableInstance: Sortable | null = null

function buildDraft() {
  const order = settingStore.columnOrder
  const vis = new Set(settingStore.visibleColumns)

  // Build ordered list: start with items in columnOrder, then append any missing
  const seen = new Set<string>()
  const result: DraftItem[] = []

  for (const key of order) {
    const meta = ALL_COLUMNS.find(c => c.key === key)
    if (meta) {
      result.push({ key, label: meta.label, visible: key === 'name' || vis.has(key) })
      seen.add(key)
    }
  }

  for (const col of ALL_COLUMNS) {
    if (!seen.has(col.key)) {
      result.push({ key: col.key, label: col.label, visible: col.key === 'name' || vis.has(col.key) })
    }
  }

  draft.value = result
}

function toggleVisible(index: number, value: boolean) {
  const item = draft.value[index]
  if (item && item.key !== 'name') {
    item.visible = value
  }
}

function moveUp(index: number) {
  if (index <= 1) return // Can't move above 'name' (index 0)
  const arr = draft.value
  const item = arr.splice(index, 1)[0]!
  arr.splice(index - 1, 0, item)
}

function moveDown(index: number) {
  if (index >= draft.value.length - 1) return
  const arr = draft.value
  const item = arr.splice(index, 1)[0]!
  arr.splice(index + 1, 0, item)
}

function resetToDefault() {
  draft.value = ALL_COLUMNS.map(col => ({
    key: col.key,
    label: col.label,
    visible: DEFAULT_VISIBLE.includes(col.key)
  }))
}

function handleSave() {
  const newOrder = draft.value.map(d => d.key)
  const newVisible = draft.value.filter(d => d.visible).map(d => d.key)
  settingStore.setColumnOrder(newOrder)
  settingStore.setVisibleColumns(newVisible)
  emit('update:visible', false)
}

function initSortable() {
  destroySortable()
  const el = sortableRef.value
  if (!el) return
  sortableInstance = Sortable.create(el, {
    handle: '.drag-handle:not(.disabled)',
    animation: 200,
    ghostClass: 'sortable-ghost',
    filter: '.fixed',
    onEnd(evt) {
      const { oldIndex, newIndex } = evt
      if (oldIndex == null || newIndex == null || oldIndex === newIndex) return
      // Don't allow moving to position 0 (name is fixed)
      if (newIndex === 0) {
        // Revert: re-insert at old position
        const item = draft.value.splice(newIndex, 1)[0]!
        draft.value.splice(oldIndex, 0, item)
        return
      }
      const item = draft.value.splice(oldIndex, 1)[0]!
      draft.value.splice(newIndex, 0, item)
    }
  })
}

function destroySortable() {
  if (sortableInstance) {
    sortableInstance.destroy()
    sortableInstance = null
  }
}

watch(() => props.visible, async (val) => {
  if (val) {
    buildDraft()
    await nextTick()
    initSortable()
  } else {
    destroySortable()
  }
})

onBeforeUnmount(() => {
  destroySortable()
})
</script>

<style scoped>
.col-settings-hint {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 12px;
}

.col-settings-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.col-settings-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  margin-bottom: 6px;
  background: var(--el-bg-color);
  transition: background 0.2s;
  cursor: pointer;
  user-select: none;
  min-height: 44px; /* 移动端触摸友好 */
}

.col-settings-item.fixed {
  background: var(--el-fill-color-light);
}

.drag-handle {
  cursor: grab;
  font-size: 16px;
  color: var(--el-text-color-secondary);
  user-select: none;
  flex-shrink: 0;
  padding: 4px;
  touch-action: none;
}

.drag-handle.disabled {
  cursor: default;
  opacity: 0.3;
}

.drag-handle:not(.disabled):active {
  cursor: grabbing;
}

.col-label {
  flex: 1;
  font-size: 14px;
}

.col-fixed-tag {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color);
  padding: 2px 6px;
  border-radius: 4px;
}

:deep(.sortable-ghost) {
  opacity: 0.4;
  background: var(--el-color-primary-light-9);
  border-radius: 8px;
}

/* 移动端：按钮更大，更易点击 */
@media (max-width: 600px) {
  .col-settings-hint {
    font-size: 12px;
  }

  .col-label {
    font-size: 13px;
  }

  :deep(.el-dialog__body) {
    padding: 12px 16px;
  }

  :deep(.el-dialog__footer) {
    padding: 10px 16px;
  }
}
</style>
