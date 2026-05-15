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
      拖动 ☰ 手柄排序；点击分组查看基金；点击基金右侧分组名可移动
    </div>

    <!-- 分组管理器 -->
    <div class="section-header">
      <span>分组管理器</span>
      <el-button type="primary" size="small" @click="addNewGroup"
        >+ 新建分组</el-button
      >
    </div>
    <ul ref="groupListRef" class="gm-list">
      <!-- 未分类（固定，不可拖拽） -->
      <li
        class="gm-item gm-group-fixed"
        :class="{ 'gm-active': selectedGroup === '__uncategorized__' }"
        @click="selectGroupItem('__uncategorized__')"
      >
        <span class="drag-handle disabled">☰</span>
        <span class="gm-name">未分类</span>
        <span class="gm-count">{{ uncategorizedFunds.length }} 只</span>
      </li>
      <!-- 自定义分组 -->
      <li
        v-for="g in draftGroupOrder"
        :key="g.key"
        :data-key="g.key"
        class="gm-item"
        :class="{ 'gm-active': selectedGroup === g.key }"
        @click="selectGroupItem(g.key)"
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
    </ul>

    <!-- 基金列表 -->
    <div class="section-header" style="margin-top: 16px">
      <span
        >基金列表（{{ selectedGroupLabel }}）- 共
        {{ currentFundList.length }} 只</span
      >
    </div>
    <ul ref="fundListRef" class="gm-list">
      <li v-if="currentFundList.length === 0" class="gm-empty">暂无基金</li>
      <li
        v-for="fund in currentFundList"
        :key="fund.code"
        :data-key="fund.code"
        class="gm-item"
      >
        <span class="drag-handle">☰</span>
        <span class="gm-name">{{ fund.name }}</span>
        <span class="gm-fund-code">{{ fund.code }}</span>
        <!-- 移动到分组 -->
        <el-select
          :model-value="getFundGroupKey(fund.code)"
          size="small"
          placeholder="移至分组"
          clearable
          class="gm-group-select"
          @click.stop
          @change="
            (val: string) =>
              moveFundToGroup(fund.code, val || '__uncategorized__')
          "
          @clear="moveFundToGroup(fund.code, '__uncategorized__')"
        >
          <el-option label="未分类" value="__uncategorized__" />
          <el-option
            v-for="g in draftGroupOrder"
            :key="g.key"
            :label="g.name"
            :value="g.key"
          />
        </el-select>
      </li>
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
import Sortable from "sortablejs";
import { useGroupStore, useFundStore } from "@/stores";
import { validateGroupName } from "@/utils/validate";
import type { FundRowDisplay } from "@/utils/fundDisplay";

const props = defineProps<{
  visible: boolean;
  fundRows: FundRowDisplay[];
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

// --- Sortable refs & instances ---
const groupListRef = ref<HTMLElement | null>(null);
const fundListRef = ref<HTMLElement | null>(null);
let groupSortable: Sortable | null = null;
let fundSortable: Sortable | null = null;

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

// --- Sortable ---
function initSortables() {
  destroySortables();
  initGroupSortable();
  initFundSortable();
}

function destroySortables() {
  groupSortable?.destroy();
  groupSortable = null;
  fundSortable?.destroy();
  fundSortable = null;
}

function initGroupSortable() {
  const el = groupListRef.value;
  if (!el) return;
  groupSortable = Sortable.create(el, {
    handle: ".drag-handle:not(.disabled)",
    animation: 200,
    ghostClass: "sortable-ghost",
    filter: ".gm-group-fixed",
    onEnd(evt) {
      const { oldIndex, newIndex } = evt;
      if (oldIndex == null || newIndex == null || oldIndex === newIndex) return;
      // 第0项是固定的"未分类"，自定义分组从索引1开始
      const adjOld = oldIndex - 1;
      const adjNew = newIndex - 1;
      if (adjOld < 0 || adjNew < 0) return;
      const arr = draftGroupOrder.value;
      const [item] = arr.splice(adjOld, 1);
      if (item) arr.splice(adjNew, 0, item);
    },
  });
}

function initFundSortable() {
  const el = fundListRef.value;
  if (!el) return;
  fundSortable = Sortable.create(el, {
    handle: ".drag-handle",
    animation: 200,
    ghostClass: "sortable-ghost",
    onEnd(evt) {
      const { oldIndex, newIndex } = evt;
      if (oldIndex == null || newIndex == null || oldIndex === newIndex) return;
      if (selectedGroup.value === "__uncategorized__") {
        // 未分类：直接操作 fundStore 全局顺序
        const codes = fundStore.funds.map((f) => f.code);
        const [moved] = codes.splice(oldIndex, 1);
        if (moved) {
          codes.splice(newIndex, 0, moved);
          fundStore.reorderFunds(codes);
        }
      } else {
        const codes = draftFundGroups.value.get(selectedGroup.value);
        if (!codes) return;
        const [moved] = codes.splice(oldIndex, 1);
        if (moved) codes.splice(newIndex, 0, moved);
      }
    },
  });
}

// 切换分组时重新初始化基金列表 Sortable（DOM 重新渲染）
watch(selectedGroup, async () => {
  await nextTick();
  fundSortable?.destroy();
  fundSortable = null;
  initFundSortable();
});

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      initDraft();
      await nextTick();
      initSortables();
    } else {
      destroySortables();
    }
  },
);

onBeforeUnmount(() => destroySortables());

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
  max-height: 220px;
  overflow-y: auto;
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

.gm-item:last-child {
  border-bottom: none;
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

.gm-group-fixed {
  opacity: 0.75;
  padding-right: 60px;
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
  cursor: default;
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
