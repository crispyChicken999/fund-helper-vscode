<template>
  <el-dialog
    v-model="visible"
    title="编辑指数卡片"
    width="90%"
    :style="{ maxWidth: '600px' }"
    @close="handleClose"
  >
    <div class="index-edit-container">
      <el-alert
        type="warning"
        size="small"
        :closable="false"
        style="--el-alert-padding: 4px 16px;"
        >拖动 ☰ 或点击箭头调整顺序，点击删除按钮移除</el-alert
      >

      <!-- 当前已选指数列表 -->
      <el-scrollbar class="selected-list-scrollbar">
        <ul ref="sortableRef" class="selected-list">
          <li
            v-for="(item, index) in localIndexCards"
            :key="item.code"
            :data-code="item.code"
            class="index-item"
            draggable="true"
            @dragstart="handleDragStart(index)"
            @dragover.prevent
            @drop="handleDrop(index)"
          >
            <span class="drag-handle">☰</span>
            <span class="index-name">{{ item.name }}</span>
            <el-button
              size="small"
              :disabled="index === 0"
              @click.stop="moveUp(index)"
              >↑</el-button
            >
            <el-button
              size="small"
              style="margin: 0"
              :disabled="index >= localIndexCards.length - 1"
              @click.stop="moveDown(index)"
              >↓</el-button
            >
            <el-button
              type="danger"
              size="small"
              style="margin: 0"
              @click="removeIndex(index)"
            >
              删除
            </el-button>
          </li>
        </ul>
      </el-scrollbar>

      <!-- 添加新指数 -->
      <div class="add-section">
        <el-select
          v-model="selectedNewIndex"
          placeholder="选择要添加的指数"
          style="width: 100%"
          @change="handleAddIndex"
        >
          <el-option
            v-for="item in availableIndices"
            :key="item.code"
            :label="item.name"
            :value="item.code"
          />
        </el-select>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from "vue";
import Sortable from "sortablejs";
import { GLOBAL_INDEX_GROUPS } from "@/api/market";

interface IndexCardConfig {
  code: string;
  name: string;
}

const props = defineProps<{
  modelValue: boolean;
  indexCards: IndexCardConfig[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "save", cards: IndexCardConfig[]): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const localIndexCards = ref<IndexCardConfig[]>([]);
const selectedNewIndex = ref("");
const dragStartIndex = ref(-1);
const sortableRef = ref<HTMLElement | null>(null);
let sortableInstance: Sortable | null = null;

// 所有可用的指数（从 GLOBAL_INDEX_GROUPS 中提取）
const allIndices = computed(() => {
  const indices: IndexCardConfig[] = [];
  for (const group of Object.values(GLOBAL_INDEX_GROUPS)) {
    for (const item of group) {
      indices.push({
        code: item.nid,
        name: item.name,
      });
    }
  }
  return indices;
});

// 可添加的指数（排除已选的）
const availableIndices = computed(() => {
  const selectedCodes = new Set(localIndexCards.value.map((c) => c.code));
  return allIndices.value.filter((item) => !selectedCodes.has(item.code));
});

// 拖拽开始
function handleDragStart(index: number) {
  dragStartIndex.value = index;
}

// 拖拽放下
function handleDrop(dropIndex: number) {
  if (dragStartIndex.value === -1 || dragStartIndex.value === dropIndex) {
    return;
  }

  const dragItem = localIndexCards.value[dragStartIndex.value];
  localIndexCards.value.splice(dragStartIndex.value, 1);
  localIndexCards.value.splice(dropIndex, 0, dragItem);
  dragStartIndex.value = -1;
}

// 上移
function moveUp(index: number) {
  if (index === 0) return;
  const arr = localIndexCards.value;
  const item = arr.splice(index, 1)[0]!;
  arr.splice(index - 1, 0, item);
}

// 下移
function moveDown(index: number) {
  if (index >= localIndexCards.value.length - 1) return;
  const arr = localIndexCards.value;
  const item = arr.splice(index, 1)[0]!;
  arr.splice(index + 1, 0, item);
}

// 移除指数
function removeIndex(index: number) {
  localIndexCards.value.splice(index, 1);
}

// 添加指数
function handleAddIndex() {
  if (!selectedNewIndex.value) return;

  const item = allIndices.value.find((i) => i.code === selectedNewIndex.value);
  if (item) {
    localIndexCards.value.push({ ...item });
  }

  selectedNewIndex.value = "";
}

// 保存
function handleSave() {
  emit("save", [...localIndexCards.value]);
  visible.value = false;
}

// 关闭
function handleClose() {
  visible.value = false;
}

// 初始化 Sortable
function initSortable() {
  destroySortable();
  const el = sortableRef.value;
  if (!el) return;
  sortableInstance = Sortable.create(el, {
    handle: ".drag-handle",
    animation: 200,
    ghostClass: "sortable-ghost",
    onEnd(evt) {
      const { oldIndex, newIndex } = evt;
      if (oldIndex == null || newIndex == null || oldIndex === newIndex) return;
      const item = localIndexCards.value.splice(oldIndex, 1)[0]!;
      localIndexCards.value.splice(newIndex, 0, item);
    },
  });
}

// 销毁 Sortable
function destroySortable() {
  if (sortableInstance) {
    sortableInstance.destroy();
    sortableInstance = null;
  }
}

// 监听弹窗打开，初始化本地数据
watch(
  () => props.modelValue,
  async (val) => {
    if (val) {
      localIndexCards.value = [...props.indexCards];
      selectedNewIndex.value = "";
      dragStartIndex.value = -1;
      await nextTick();
      initSortable();
    } else {
      destroySortable();
    }
  }
);

onBeforeUnmount(() => {
  destroySortable();
});
</script>

<style scoped>
.index-edit-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.selected-list-scrollbar {
  height: 300px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
}

.selected-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.index-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  transition: background 0.2s;
  cursor: pointer;
  user-select: none;
  min-height: 42px;
}

.index-item:hover {
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

.drag-handle:active {
  cursor: grabbing;
}

.index-name {
  flex: 1;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-section {
  padding-top: 8px;
  border-top: 1px dashed var(--el-border-color);
}

:deep(.sortable-ghost) {
  opacity: 0.4;
  background: var(--el-color-primary-light-9);
  border-radius: 8px;
}

/* 移动端：按钮更大，更易点击 */
@media (max-width: 600px) {
  .index-name {
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
