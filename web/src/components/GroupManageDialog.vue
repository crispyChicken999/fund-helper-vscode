<template>
  <el-dialog
    :model-value="visible"
    title="分组管理"
    width="min(92%, 520px)"
    top="5vh"
    :close-on-click-modal="true"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div class="gm-hint">
      拖动 ☰ 手柄排序；拖动基金到分组可调整分组；点击分组查看基金
    </div>

    <!-- 分组管理器 -->
    <div class="section-header">
      <span>分组管理器</span>
      <el-button type="primary" size="small" @click="addNewGroup"
        >+ 新建分组</el-button
      >
    </div>
    
    <ul ref="groupListRef" class="gm-list">
      <el-scrollbar ref="groupScrollbarRef">
        <!-- 未分类（固定，不可拖拽） -->
        <li
          class="gm-item gm-group-fixed"
          :class="{ 
            'gm-active': selectedGroup === '__uncategorized__',
            'gm-highlighted': highlightedGroupKey === '__uncategorized__',
            'gm-drop-target': dropTargetGroupKey === '__uncategorized__'
          }"
          @click="selectGroupItem('__uncategorized__')"
          @dragover.prevent="onGroupDragOver($event, '__uncategorized__')"
          @dragleave="onGroupDragLeave"
          @drop.prevent="onGroupDrop($event, '__uncategorized__')"
        >
          <span class="drag-handle disabled" title="未分类不能修改排序">☰</span>
          <span class="gm-name">未分类</span>
          <span class="gm-count">{{ uncategorizedFunds.length }} 只</span>
          <span class="gm-fix-tip">固定</span>
        </li>
        <!-- 自定义分组 -->
        <li
          v-for="g in draftGroupOrder"
          :key="g.key"
          :data-key="g.key"
          draggable="true"
          class="gm-item"
          :class="{ 
            'gm-active': selectedGroup === g.key,
            'gm-highlighted': highlightedGroupKey === g.key,
            'gm-drop-target': dropTargetGroupKey === g.key,
            'dragging': draggingGroupKey === g.key
          }"
          @click="selectGroupItem(g.key)"
          @dragstart="onGroupDragStart($event, g.key)"
          @dragend="onGroupDragEnd"
          @dragover.prevent="onGroupDragOver($event, g.key)"
          @dragleave="onGroupDragLeave"
          @drop.prevent="onGroupDrop($event, g.key)"
        >
          <span class="drag-handle">☰</span>
          <span class="gm-name">{{ g.name }}</span>
          <span class="gm-count">{{ getGroupFundCount(g.key) }} 只</span>
          <el-button
            size="small"
            link
            type="primary"
            @click.stop="renameGroup(g)"
          >
            <el-icon><Edit /></el-icon>
          </el-button>
          <el-button size="small" link type="danger" @click.stop="deleteGroup(g)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </li>
      </el-scrollbar>
    </ul>

    <!-- 基金列表 -->
    <div class="section-header" style="margin-top: 16px">
      <span
        >基金列表（{{ selectedGroupLabel }}）- 共
        {{ currentFundList.length }} 只</span
      >
    </div>

    <ul ref="fundListRef" class="gm-list">
      <el-scrollbar ref="fundScrollbarRef">
        <li v-if="currentFundList.length === 0" class="gm-empty">暂无基金</li>
        <li
          v-for="fund in currentFundList"
          :key="fund.code"
          :data-code="fund.code"
          draggable="true"
          class="gm-item gm-fund-item"
          :class="{ 
            'gm-fund-highlighted': highlightedFundCode === fund.code,
            'dragging': draggingFundCode === fund.code,
            'gm-drop-target': dropTargetFundCode === fund.code
          }"
          @dragstart="onFundDragStart($event, fund.code)"
          @dragend="onFundDragEnd"
          @dragover.prevent="onFundDragOver($event, fund.code)"
          @dragleave="onFundDragLeave"
          @drop.prevent="onFundDrop($event, fund.code)"
        >
          <span class="drag-handle">☰</span>
          <span class="gm-name">{{ fund.name }}</span>
          <span class="gm-fund-code">{{ fund.code }}</span>
        </li>
      </el-scrollbar>
    </ul>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Edit, Delete } from "@element-plus/icons-vue";
import { useGroupStore, useFundStore } from "@/stores";
import { validateGroupName } from "@/utils/validate";
import type { FundRowDisplay } from "@/utils/fundDisplay";

const props = defineProps<{
  visible: boolean;
  fundRows: FundRowDisplay[];
  highlightFundCode?: string; // 需要高亮的基金代码
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
  saved: [];
}>();

const groupStore = useGroupStore();
const fundStore = useFundStore();

// --- Draft state ---
const draftGroupOrder = ref<{ key: string; name: string }[]>([]);
const draftFundGroups = ref<Map<string, string[]>>(new Map()); // groupKey -> fundCodes[]
const selectedGroup = ref<string>("__uncategorized__");

// --- Refs ---
const groupListRef = ref<HTMLElement | null>(null);
const fundListRef = ref<HTMLElement | null>(null);
const groupScrollbarRef = ref<any>(null);
const fundScrollbarRef = ref<any>(null);

// --- 高亮基金相关 ---
const highlightedFundCode = ref<string>("");
const highlightedGroupKey = ref<string>("");

// --- 拖拽状态 ---
const draggingGroupKey = ref<string>("");
const draggingFundCode = ref<string>("");
const dropTargetGroupKey = ref<string>("");
const dropTargetFundCode = ref<string>("");

// --- Init ---
function initDraft() {
  const groups = groupStore.getGroupList;
  draftGroupOrder.value = groups.map((g) => ({ key: g.key, name: g.name }));
  const map = new Map<string, string[]>();
  for (const g of groups) {
    map.set(g.key, [...g.fundCodes]);
  }
  draftFundGroups.value = map;
  selectedGroup.value = "__uncategorized__";
  
  // 如果有需要高亮的基金，自动选中其所在分组
  if (props.highlightFundCode) {
    highlightedFundCode.value = props.highlightFundCode;
    const groupKey = getFundGroupKey(props.highlightFundCode);
    highlightedGroupKey.value = groupKey;
    selectedGroup.value = groupKey;
  }
}

// --- Computed ---
const uncategorizedFunds = computed(() => {
  const allGrouped = new Set<string>();
  for (const codes of draftFundGroups.value.values()) {
    for (const c of codes) allGrouped.add(c);
  }
  return fundStore.funds.filter((f) => !allGrouped.has(f.code));
});

const currentFundList = computed(() => {
  if (selectedGroup.value === "__uncategorized__") {
    return uncategorizedFunds.value.map((f) => {
      const row = props.fundRows.find((r) => r.code === f.code);
      return { code: f.code, name: row?.name || f.code };
    });
  }
  const codes = draftFundGroups.value.get(selectedGroup.value) || [];
  return codes.map((code) => {
    const row = props.fundRows.find((r) => r.code === code);
    return { code, name: row?.name || code };
  });
});

const selectedGroupLabel = computed(() => {
  if (selectedGroup.value === "__uncategorized__") return "未分类";
  return (
    draftGroupOrder.value.find((x) => x.key === selectedGroup.value)?.name || ""
  );
});

function getGroupFundCount(key: string): number {
  return (draftFundGroups.value.get(key) || []).length;
}

function getFundGroupKey(code: string): string {
  for (const [key, codes] of draftFundGroups.value.entries()) {
    if (codes.includes(code)) return key;
  }
  return "__uncategorized__";
}

function selectGroupItem(key: string) {
  selectedGroup.value = key;
}

// --- Group operations ---
async function addNewGroup() {
  try {
    const { value } = await ElMessageBox.prompt("请输入分组名称", "新建分组", {
      inputPattern: /^.{1,50}$/,
      inputErrorMessage: "分组名称长度为 1-50 个字符",
    });
    const name = String(value).trim();
    if (!validateGroupName(name)) {
      ElMessage.warning("分组名称无效");
      return;
    }
    if (draftGroupOrder.value.some((g) => g.name === name)) {
      ElMessage.warning("分组名称已存在");
      return;
    }
    const key = `group_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    draftGroupOrder.value.push({ key, name });
    draftFundGroups.value.set(key, []);
  } catch {
    /* cancel */
  }
}

async function renameGroup(g: { key: string; name: string }) {
  try {
    const { value } = await ElMessageBox.prompt("新名称", "重命名分组", {
      inputValue: g.name,
    });
    const name = String(value).trim();
    if (!validateGroupName(name)) {
      ElMessage.warning("分组名称无效");
      return;
    }
    if (draftGroupOrder.value.some((x) => x.name === name && x.key !== g.key)) {
      ElMessage.warning("分组名称已存在");
      return;
    }
    const item = draftGroupOrder.value.find((x) => x.key === g.key);
    if (item) item.name = name;
  } catch {
    /* cancel */
  }
}

async function deleteGroup(g: { key: string; name: string }) {
  try {
    await ElMessageBox.confirm(
      `删除分组「${g.name}」？分组内基金将变为未分类。`,
      "确认",
      { type: "warning" },
    );
    draftGroupOrder.value = draftGroupOrder.value.filter(
      (x) => x.key !== g.key,
    );
    draftFundGroups.value.delete(g.key);
    if (selectedGroup.value === g.key)
      selectedGroup.value = "__uncategorized__";
  } catch {
    /* cancel */
  }
}

// --- Fund group move ---
function moveFundToGroup(fundCode: string, targetKey: string) {
  // 从所有分组中移除
  for (const codes of draftFundGroups.value.values()) {
    const idx = codes.indexOf(fundCode);
    if (idx >= 0) codes.splice(idx, 1);
  }
  // 加入目标分组（未分类不需要加）
  if (targetKey !== "__uncategorized__") {
    const codes = draftFundGroups.value.get(targetKey);
    if (codes) codes.push(fundCode);
    else draftFundGroups.value.set(targetKey, [fundCode]);
  }
}

// --- 拖拽事件处理 - 分组 ---
function onGroupDragStart(e: DragEvent, groupKey: string) {
  draggingGroupKey.value = groupKey;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", groupKey);
  }
}

function onGroupDragEnd() {
  draggingGroupKey.value = "";
  dropTargetGroupKey.value = "";
}

function onGroupDragOver(e: DragEvent, groupKey: string) {
  if (draggingFundCode.value) {
    // 基金拖到分组上
    dropTargetGroupKey.value = groupKey;
  } else if (draggingGroupKey.value && draggingGroupKey.value !== groupKey) {
    // 分组拖到分组上（排序）
    dropTargetGroupKey.value = groupKey;
  }
}

function onGroupDragLeave() {
  dropTargetGroupKey.value = "";
}

function onGroupDrop(e: DragEvent, groupKey: string) {
  dropTargetGroupKey.value = "";
  
  if (draggingFundCode.value) {
    // 基金拖到分组
    moveFundToGroup(draggingFundCode.value, groupKey);
    ElMessage.success("已移动到分组");
    return;
  }
  
  if (draggingGroupKey.value && draggingGroupKey.value !== groupKey) {
    // 分组排序
    const fromIdx = draftGroupOrder.value.findIndex(g => g.key === draggingGroupKey.value);
    const toIdx = draftGroupOrder.value.findIndex(g => g.key === groupKey);
    
    if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
      const [item] = draftGroupOrder.value.splice(fromIdx, 1);
      // 重新计算目标位置
      const newToIdx = draftGroupOrder.value.findIndex(g => g.key === groupKey);
      // 如果向下拖，插入到目标后面；向上拖，插入到目标位置
      if (fromIdx < toIdx) {
        draftGroupOrder.value.splice(newToIdx + 1, 0, item);
      } else {
        draftGroupOrder.value.splice(newToIdx, 0, item);
      }
    }
  }
}

// --- 拖拽事件处理 - 基金 ---
function onFundDragStart(e: DragEvent, fundCode: string) {
  draggingFundCode.value = fundCode;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-fund-code", fundCode);
  }
}

function onFundDragEnd() {
  draggingFundCode.value = "";
  dropTargetFundCode.value = "";
}

function onFundDragOver(e: DragEvent, fundCode: string) {
  if (draggingFundCode.value && draggingFundCode.value !== fundCode) {
    dropTargetFundCode.value = fundCode;
  }
}

function onFundDragLeave() {
  dropTargetFundCode.value = "";
}

function onFundDrop(e: DragEvent, fundCode: string) {
  dropTargetFundCode.value = "";
  
  if (!draggingFundCode.value || draggingFundCode.value === fundCode) {
    return;
  }
  
  // 基金列表内排序
  if (selectedGroup.value === "__uncategorized__") {
    // 未分类：操作全局顺序
    const codes = fundStore.funds.map((f) => f.code);
    const fromIdx = codes.indexOf(draggingFundCode.value);
    const toIdx = codes.indexOf(fundCode);
    
    if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
      codes.splice(fromIdx, 1);
      const newToIdx = codes.indexOf(fundCode);
      if (fromIdx < toIdx) {
        codes.splice(newToIdx + 1, 0, draggingFundCode.value);
      } else {
        codes.splice(newToIdx, 0, draggingFundCode.value);
      }
      fundStore.reorderFunds(codes);
    }
  } else {
    // 分组内排序
    const codes = draftFundGroups.value.get(selectedGroup.value);
    if (!codes) return;
    
    const fromIdx = codes.indexOf(draggingFundCode.value);
    const toIdx = codes.indexOf(fundCode);
    
    if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
      codes.splice(fromIdx, 1);
      const newToIdx = codes.indexOf(fundCode);
      if (fromIdx < toIdx) {
        codes.splice(newToIdx + 1, 0, draggingFundCode.value);
      } else {
        codes.splice(newToIdx, 0, draggingFundCode.value);
      }
    }
  }
}

// 切换分组时，如果有高亮的基金，滚动到该基金位置
watch(selectedGroup, async () => {
  await nextTick();
  
  // 如果有高亮的基金，滚动到该基金位置
  if (highlightedFundCode.value && selectedGroup.value === highlightedGroupKey.value) {
    await nextTick();
    scrollToHighlightedFund();
  }
});

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      initDraft();
      await nextTick();
      
      // 如果有高亮的基金，滚动到该基金和分组位置
      if (highlightedFundCode.value) {
        await nextTick();
        await nextTick(); // 确保 DOM 完全渲染
        scrollToHighlightedGroup();
        scrollToHighlightedFund();
      }
    } else {
      // 清除高亮状态
      highlightedFundCode.value = "";
      highlightedGroupKey.value = "";
    }
  },
);

// 滚动到高亮的分组位置
function scrollToHighlightedGroup() {
  if (!highlightedGroupKey.value || !groupScrollbarRef.value) return;
  
  const highlightedItem = groupListRef.value?.querySelector(
    `[data-key="${highlightedGroupKey.value}"]`
  ) as HTMLElement;
  
  if (highlightedItem && groupScrollbarRef.value.wrapRef) {
    const containerHeight = groupScrollbarRef.value.wrapRef.clientHeight;
    const itemTop = highlightedItem.offsetTop;
    const itemHeight = highlightedItem.offsetHeight;
    
    // 计算滚动位置，使该项居中
    const scrollTop = itemTop - containerHeight / 2 + itemHeight / 2;
    groupScrollbarRef.value.setScrollTop(Math.max(0, scrollTop));
  }
}

// 滚动到高亮的基金位置
function scrollToHighlightedFund() {
  if (!highlightedFundCode.value || !fundScrollbarRef.value) return;
  
  const highlightedItem = fundListRef.value?.querySelector(
    `[data-code="${highlightedFundCode.value}"]`
  ) as HTMLElement;
  
  if (highlightedItem && fundScrollbarRef.value.wrapRef) {
    const containerHeight = fundScrollbarRef.value.wrapRef.clientHeight;
    const itemTop = highlightedItem.offsetTop;
    const itemHeight = highlightedItem.offsetHeight;
    
    // 计算滚动位置，使该项居中
    const scrollTop = itemTop - containerHeight / 2 + itemHeight / 2;
    fundScrollbarRef.value.setScrollTop(Math.max(0, scrollTop));
  }
}

// --- Save ---
async function handleSave() {
  try {
    const newOrder = draftGroupOrder.value.map((g) => g.key);
    const existingKeys = new Set(groupStore.getGroupList.map((g) => g.key));
    const draftKeys = new Set(newOrder);

    // 删除移除的分组
    for (const key of existingKeys) {
      if (!draftKeys.has(key)) await groupStore.deleteGroup(key);
    }

    // 新增分组
    for (const g of draftGroupOrder.value) {
      if (!existingKeys.has(g.key)) {
        groupStore.groups.set(g.key, {
          key: g.key,
          name: g.name,
          fundCodes: draftFundGroups.value.get(g.key) || [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        if (!groupStore.groupOrder.includes(g.key))
          groupStore.groupOrder.push(g.key);
      }
    }

    // 更新名称和基金列表
    for (const g of draftGroupOrder.value) {
      const existing = groupStore.getGroup(g.key);
      if (existing) {
        existing.name = g.name;
        existing.fundCodes = draftFundGroups.value.get(g.key) || [];
        existing.updatedAt = Date.now();
      }
    }

    groupStore.groupOrder = newOrder;

    // 同步 fund.groupKey
    for (const fund of fundStore.funds) {
      let foundGroup: string | undefined;
      for (const [groupKey, codes] of draftFundGroups.value.entries()) {
        if (codes.includes(fund.code)) {
          foundGroup = groupKey;
          break;
        }
      }
      fund.groupKey = foundGroup;
    }

    emit("saved");
    emit("update:visible", false);
    ElMessage.success("分组已保存");
  } catch (e: any) {
    ElMessage.error(e?.message || "保存失败");
  }
}
</script>

<style scoped>
.gm-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--el-text-color-primary);
}

.gm-list {
  list-style: none;
  padding: 0;
  margin: 0;
  height: 220px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
}

.gm-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  min-height: 42px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  transition: background 0.15s;
  font-size: 13px;
  user-select: none;
}


.gm-item .el-button {
  margin: 0;
}

.gm-item:hover {
  background: var(--el-fill-color-light);
}

.gm-item.gm-active {
  background: var(--el-color-primary-light-9);
}

.gm-item.gm-highlighted {
  box-shadow: 0 0 0 2px var(--el-color-primary) inset;
  animation: pulse-highlight 1.5s ease-in-out;
}

.gm-item.gm-fund-highlighted {
  background: var(--el-color-warning-light-9);
  box-shadow: 0 0 0 2px var(--el-color-warning) inset;
  animation: pulse-highlight 1.5s ease-in-out;
}

.gm-item.gm-drop-target {
  background: var(--el-color-success-light-9);
  box-shadow: 0 0 0 2px var(--el-color-success) inset;
  transform: scale(1.02);
  transition: all 0.2s ease;
}

.gm-item.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

@keyframes pulse-highlight {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.gm-group-fixed {
  opacity: 0.8;
}

.gm-fix-tip {
  border: 1px solid var(--el-border-color-light);
  border-radius: 3px;
  background: var(--el-fill-color-light);
  padding: 0px 8px;
}

/* 关键：touch-action: none 让 Sortable 在移动端能捕获 touch 事件 */
.drag-handle {
  cursor: grab;
  font-size: 16px;
  color: var(--el-text-color-secondary);
  user-select: none;
  flex-shrink: 0;
  padding: 4px 2px;
  touch-action: none;
}

.drag-handle.disabled {
  cursor: not-allowed;
  opacity: 0.3;
}

.drag-handle:not(.disabled):active {
  cursor: grabbing;
}

.gm-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gm-count {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.gm-fund-code {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.gm-group-select {
  width: 90px;
  flex-shrink: 0;
}

.gm-empty {
  padding: 16px;
  text-align: center;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

:deep(.sortable-ghost) {
  opacity: 0.4;
  background: var(--el-color-primary-light-9);
  border-radius: 8px;
}

@media (max-width: 600px) {
  .gm-hint {
    font-size: 11px;
  }

  :deep(.el-dialog__body) {
    padding: 12px 16px;
  }
}
</style>
