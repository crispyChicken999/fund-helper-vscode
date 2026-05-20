<template>
  <el-dialog
    :model-value="visible"
    :title="dialogTitle"
    :fullscreen="isFullscreen"
    width="min(92%, 600px)"
    top="5vh"
    :close-on-click-modal="true"
    @update:model-value="$emit('update:visible', $event)"
  >
    <template #header>
      <div style="display: flex; align-items: center; width: 100%; gap: 15px">
        <span>{{ dialogTitle }}</span>
        <el-button
          size="small"
          link
          plain
          @click="toggleFullscreen"
          :title="isFullscreen ? '退出全屏' : '全屏'"
        >
          <el-icon>
            <FullScreen />
          </el-icon>
        </el-button>
      </div>
    </template>

    <el-alert
      type="warning"
      :closable="false"
      show-icon
      style="margin-bottom: 12px"
    >
      <div style="font-size: 13px; line-height: 1.6; text-align: left">
        <div>• 点击文件夹展开/收起查看基金</div>
        <div>• 拖动 ☰ 或点击 ↑↓ 调整排序</div>
        <div>• 点击分组展开详情，可跨组拖拽</div>
        <div>• 拖动基金到其他分组可调整归属</div>
      </div>
    </el-alert>

    <!-- 分组管理器 -->
    <div class="section-header">
      <span>分组管理器</span>
      <div style="display: flex; gap: 8px">
        <el-button
          size="small"
          v-if="expandedFolders.size > 0"
          @click="collapseAll"
          >全部折叠</el-button
        >
        <el-button size="small" v-else @click="openAll">全部展开</el-button>
        <el-button
          type="primary"
          size="small"
          @click="addNewGroup"
          style="margin: 0"
          >+ 新建分组</el-button
        >
      </div>
    </div>

    <el-scrollbar class="gm-scrollbar">
      <ul ref="groupListRef" class="gm-folder-list">
        <!-- 未分类（固定，不可拖拽） -->
        <li class="gm-folder gm-folder-fixed">
          <div
            class="gm-folder-header"
            :class="{
              'gm-highlighted': highlightedGroupKey === '__uncategorized__',
            }"
            @click="toggleFolder('__uncategorized__')"
          >
            <span class="drag-handle disabled" title="未分类不能修改排序"
              >☰</span
            >
            <el-icon class="folder-icon">
              <component
                :is="
                  expandedFolders.has('__uncategorized__')
                    ? FolderOpened
                    : Folder
                "
              />
            </el-icon>
            <span class="folder-name">未分类</span>
            <span class="folder-count">{{ uncategorizedFunds.length }} 只</span>
            <span class="folder-fixed-tag">固定</span>
          </div>
          <ul
            v-show="expandedFolders.has('__uncategorized__')"
            :ref="(el) => setFundListRef('__uncategorized__', el)"
            class="gm-fund-list"
            data-group-key="__uncategorized__"
          >
            <!-- <li v-if="uncategorizedFunds.length === 0" class="gm-empty">暂无基金</li> -->
            <li
              v-for="(fund, index) in uncategorizedFunds"
              :key="fund.code"
              :data-code="fund.code"
              class="gm-fund-item"
              :class="{
                'gm-fund-highlighted': highlightedFundCode === fund.code,
              }"
            >
              <span class="drag-handle">☰</span>
              <span class="fund-name">{{ fund.name }}</span>
              <span class="fund-code">{{ fund.code }}</span>
              <el-button
                size="small"
                :disabled="index === 0"
                @click.stop="moveFundUp('__uncategorized__', index)"
                >↑</el-button
              >
              <el-button
                size="small"
                style="margin: 0"
                :disabled="index >= uncategorizedFunds.length - 1"
                @click.stop="moveFundDown('__uncategorized__', index)"
                >↓</el-button
              >
            </li>
          </ul>
        </li>

        <!-- 自定义分组 -->
        <li
          v-for="(g, index) in draftGroupOrder"
          :key="g.key"
          :data-key="g.key"
          class="gm-folder"
        >
          <div
            class="gm-folder-header"
            :class="{ 'gm-highlighted': highlightedGroupKey === g.key }"
            @click="toggleFolder(g.key)"
          >
            <span class="drag-handle">☰</span>
            <el-icon class="folder-icon">
              <component
                :is="expandedFolders.has(g.key) ? FolderOpened : Folder"
              />
            </el-icon>
            <span class="folder-name">{{ g.name }}</span>
            <span class="folder-count">{{ getGroupFundCount(g.key) }} 只</span>
            <el-button
              size="small"
              :disabled="index === 0"
              @click.stop="moveGroupUp(index)"
              >↑</el-button
            >
            <el-button
              size="small"
              style="margin: 0"
              :disabled="index >= draftGroupOrder.length - 1"
              @click.stop="moveGroupDown(index)"
              >↓</el-button
            >
            <el-button
              size="small"
              style="margin: 0"
              link
              type="primary"
              @click.stop="renameGroup(g)"
            >
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button
              size="small"
              link
              type="danger"
              style="margin: 0"
              @click.stop="deleteGroup(g)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          <ul
            v-show="expandedFolders.has(g.key)"
            :ref="(el) => setFundListRef(g.key, el)"
            class="gm-fund-list"
            :class="{ active: expandedFolders.has(g.key) }"
            :data-group-key="g.key"
          >
            <!-- <li v-if="getGroupFunds(g.key).length === 0" class="gm-empty">
              暂无基金
            </li> -->
            <li
              v-for="(fund, fundIndex) in getGroupFunds(g.key)"
              :key="fund.code"
              :data-code="fund.code"
              class="gm-fund-item"
              :class="{
                'gm-fund-highlighted': highlightedFundCode === fund.code,
              }"
            >
              <span class="drag-handle">☰</span>
              <span class="fund-name">{{ fund.name }}</span>
              <span class="fund-code">{{ fund.code }}</span>
              <el-button
                size="small"
                :disabled="fundIndex === 0"
                @click.stop="moveFundUp(g.key, fundIndex)"
                >↑</el-button
              >
              <el-button
                size="small"
                style="margin: 0"
                :disabled="fundIndex >= getGroupFunds(g.key).length - 1"
                @click.stop="moveFundDown(g.key, fundIndex)"
                >↓</el-button
              >
            </li>
          </ul>
        </li>
      </ul>
    </el-scrollbar>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Edit,
  Delete,
  Folder,
  FolderOpened,
  FullScreen,
  Close,
} from "@element-plus/icons-vue";
import Sortable from "sortablejs";
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
const expandedFolders = ref<Set<string>>(new Set()); // 展开的文件夹
const isFullscreen = ref(true); // 默认全屏

// --- Refs ---
const groupListRef = ref<HTMLElement | null>(null);
const fundListRefs = ref<Map<string, HTMLElement>>(new Map());

// --- Sortable instances ---
let groupSortableInstance: Sortable | null = null;
const fundSortableInstances = new Map<string, Sortable>();

// --- 高亮基金相关 ---
const highlightedFundCode = ref<string>("");
const highlightedGroupKey = ref<string>("");

const dialogTitle = computed(() => "分组管理");

// 切换全屏
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
}

// 全部折叠
function collapseAll() {
  expandedFolders.value.clear();
}

// 全部展开
function openAll() {
  expandedFolders.value = new Set([
    "__uncategorized__",
    ...draftGroupOrder.value.map((g) => g.key),
  ]);
}

// --- Init ---
function initDraft() {
  const groups = groupStore.getGroupList;
  draftGroupOrder.value = groups.map((g) => ({ key: g.key, name: g.name }));
  const map = new Map<string, string[]>();
  for (const g of groups) {
    map.set(g.key, [...g.fundCodes]);
  }
  draftFundGroups.value = map;

  // 默认展开所有分组
  expandedFolders.value = new Set([
    "__uncategorized__",
    ...groups.map((g) => g.key),
  ]);

  // 如果有需要高亮的基金，自动展开其所在分组
  if (props.highlightFundCode) {
    highlightedFundCode.value = props.highlightFundCode;
    const groupKey = getFundGroupKey(props.highlightFundCode);
    highlightedGroupKey.value = groupKey;
    expandedFolders.value.add(groupKey);
  }
}

// 设置基金列表 ref
function setFundListRef(groupKey: string, el: any) {
  if (el) {
    fundListRefs.value.set(groupKey, el as HTMLElement);
  }
}

// 切换文件夹展开/收起
function toggleFolder(groupKey: string) {
  if (expandedFolders.value.has(groupKey)) {
    expandedFolders.value.delete(groupKey);
  } else {
    expandedFolders.value.add(groupKey);
    // 展开后初始化该分组的 Sortable
    nextTick(() => {
      initFundSortable(groupKey);
    });
  }
}

// --- Computed ---
const uncategorizedFunds = computed(() => {
  const allGrouped = new Set<string>();
  for (const codes of draftFundGroups.value.values()) {
    for (const c of codes) allGrouped.add(c);
  }
  return fundStore.funds
    .filter((f) => !allGrouped.has(f.code))
    .map((f) => {
      const row = props.fundRows.find((r) => r.code === f.code);
      return { code: f.code, name: row?.name || f.code };
    });
});

function getGroupFunds(groupKey: string) {
  const codes = draftFundGroups.value.get(groupKey) || [];
  return codes.map((code) => {
    const row = props.fundRows.find((r) => r.code === code);
    return { code, name: row?.name || code };
  });
}

function getGroupFundCount(key: string): number {
  return (draftFundGroups.value.get(key) || []).length;
}

function getFundGroupKey(code: string): string {
  for (const [key, codes] of draftFundGroups.value.entries()) {
    if (codes.includes(code)) return key;
  }
  return "__uncategorized__";
}

// --- Group operations ---
function moveGroupUp(index: number) {
  if (index === 0) return;
  const arr = draftGroupOrder.value;
  const item = arr.splice(index, 1)[0]!;
  arr.splice(index - 1, 0, item);
}

function moveGroupDown(index: number) {
  if (index >= draftGroupOrder.value.length - 1) return;
  const arr = draftGroupOrder.value;
  const item = arr.splice(index, 1)[0]!;
  arr.splice(index + 1, 0, item);
}

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
    expandedFolders.value.delete(g.key);
  } catch {
    /* cancel */
  }
}

// --- Fund operations ---
function moveFundUp(groupKey: string, index: number) {
  if (index === 0) return;

  if (groupKey === "__uncategorized__") {
    // 未分类：操作全局顺序
    const codes = fundStore.funds.map((f) => f.code);
    const fundCode = uncategorizedFunds.value[index].code;
    const fromIdx = codes.indexOf(fundCode);
    if (fromIdx > 0) {
      codes.splice(fromIdx, 1);
      codes.splice(fromIdx - 1, 0, fundCode);
      fundStore.reorderFunds(codes);
    }
  } else {
    // 分组内排序
    const codes = draftFundGroups.value.get(groupKey);
    if (codes && index > 0) {
      const item = codes.splice(index, 1)[0]!;
      codes.splice(index - 1, 0, item);
    }
  }
}

function moveFundDown(groupKey: string, index: number) {
  if (groupKey === "__uncategorized__") {
    // 未分类：操作全局顺序
    const codes = fundStore.funds.map((f) => f.code);
    const fundCode = uncategorizedFunds.value[index].code;
    const fromIdx = codes.indexOf(fundCode);
    if (fromIdx !== -1 && fromIdx < codes.length - 1) {
      codes.splice(fromIdx, 1);
      codes.splice(fromIdx + 1, 0, fundCode);
      fundStore.reorderFunds(codes);
    }
  } else {
    // 分组内排序
    const codes = draftFundGroups.value.get(groupKey);
    if (codes && index < codes.length - 1) {
      const item = codes.splice(index, 1)[0]!;
      codes.splice(index + 1, 0, item);
    }
  }
}

// 移动基金到指定分组
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

// --- Sortable 初始化和销毁 ---
function initGroupSortable() {
  destroyGroupSortable();

  const ulElement = groupListRef.value;
  if (!ulElement) return;

  groupSortableInstance = Sortable.create(ulElement, {
    handle: ".gm-folder-header .drag-handle:not(.disabled)",
    animation: 200,
    ghostClass: "sortable-ghost",
    filter: ".gm-folder-fixed", // 过滤掉"未分类"
    draggable: ".gm-folder:not(.gm-folder-fixed)", // 只有非固定的文件夹可拖拽
    onEnd(evt) {
      const { oldIndex, newIndex } = evt;
      if (oldIndex == null || newIndex == null || oldIndex === newIndex) return;

      // 注意：oldIndex 和 newIndex 是包含"未分类"的索引，需要减1
      const actualOldIndex = oldIndex - 1;
      const actualNewIndex = newIndex - 1;

      if (actualOldIndex < 0 || actualNewIndex < 0) return;

      const item = draftGroupOrder.value.splice(actualOldIndex, 1)[0]!;
      draftGroupOrder.value.splice(actualNewIndex, 0, item);
    },
  });
}

function destroyGroupSortable() {
  if (groupSortableInstance) {
    groupSortableInstance.destroy();
    groupSortableInstance = null;
  }
}

function initFundSortable(groupKey: string) {
  // 销毁旧实例
  const oldInstance = fundSortableInstances.get(groupKey);
  if (oldInstance) {
    oldInstance.destroy();
    fundSortableInstances.delete(groupKey);
  }

  const ulElement = fundListRefs.value.get(groupKey);
  if (!ulElement) return;

  const instance = Sortable.create(ulElement, {
    group: "fund-items", // 设置共享组名，允许跨分组拖拽
    handle: ".drag-handle",
    animation: 200,
    ghostClass: "sortable-ghost",
    onEnd(evt) {
      const { oldIndex, newIndex, from, to } = evt;

      if (oldIndex == null || newIndex == null) return;

      const fromGroupKey = from.getAttribute("data-group-key");
      const toGroupKey = to.getAttribute("data-group-key");

      if (!fromGroupKey || !toGroupKey) return;

      // 获取被拖拽的基金代码
      const fundCode = evt.item.getAttribute("data-code");
      if (!fundCode) return;

      // 跨分组拖拽
      if (fromGroupKey !== toGroupKey) {
        // 获取当前全局列表（只获取一次）
        const codes = fundStore.funds.map((f) => f.code);

        // 从原分组移除
        if (fromGroupKey === "__uncategorized__") {
          // 未分类：从全局顺序中移除
          const idx = codes.indexOf(fundCode);
          if (idx !== -1) {
            codes.splice(idx, 1);
          }
        } else {
          // 从分组数据中移除
          const fromCodes = draftFundGroups.value.get(fromGroupKey);
          if (fromCodes) {
            const idx = fromCodes.indexOf(fundCode);
            if (idx !== -1) {
              fromCodes.splice(idx, 1);
            }
          }

          // 从全局列表中移除
          const globalIdx = codes.indexOf(fundCode);
          if (globalIdx !== -1) {
            codes.splice(globalIdx, 1);
          }
        }

        // 添加到目标分组
        if (toGroupKey === "__uncategorized__") {
          // 找到未分类基金在全局列表中的位置范围
          const allGrouped = new Set<string>();
          for (const groupCodes of draftFundGroups.value.values()) {
            for (const c of groupCodes) allGrouped.add(c);
          }

          // 找到第一个未分类基金的位置
          let firstUncatIndex = -1;
          for (let i = 0; i < codes.length; i++) {
            if (!allGrouped.has(codes[i])) {
              firstUncatIndex = i;
              break;
            }
          }

          // 计算插入位置
          if (firstUncatIndex === -1) {
            // 没有未分类基金，添加到最后
            codes.push(fundCode);
          } else {
            // 在未分类区域插入
            const insertIndex = firstUncatIndex + newIndex;
            codes.splice(insertIndex, 0, fundCode);
          }
        } else {
          const toCodes = draftFundGroups.value.get(toGroupKey);
          if (toCodes) {
            toCodes.splice(newIndex, 0, fundCode);
          } else {
            draftFundGroups.value.set(toGroupKey, [fundCode]);
          }
        }

        // 最后统一更新全局列表
        fundStore.reorderFunds(codes);

        const toGroupName =
          toGroupKey === "__uncategorized__"
            ? "未分类"
            : draftGroupOrder.value.find((g) => g.key === toGroupKey)?.name ||
              "未知分组";

        ElMessage.success(`已移动到「${toGroupName}」`);
      } else {
        // 同分组内排序
        if (oldIndex === newIndex) return;

        if (fromGroupKey === "__uncategorized__") {
          // 未分类：操作全局顺序
          const codes = fundStore.funds.map((f) => f.code);
          const fromIdx = codes.indexOf(fundCode);
          if (fromIdx !== -1) {
            codes.splice(fromIdx, 1);
            // 重新计算插入位置
            const uncatCodes = uncategorizedFunds.value.map((f) => f.code);
            const targetCode = uncatCodes[newIndex];
            const targetIdx = codes.indexOf(targetCode);
            codes.splice(targetIdx, 0, fundCode);
            fundStore.reorderFunds(codes);
          }
        } else {
          // 分组内排序
          const codes = draftFundGroups.value.get(fromGroupKey);
          if (codes) {
            const item = codes.splice(oldIndex, 1)[0]!;
            codes.splice(newIndex, 0, item);
          }
        }
      }
    },
  });

  fundSortableInstances.set(groupKey, instance);
}

function initAllFundSortables() {
  // 为所有展开的文件夹初始化 Sortable
  for (const groupKey of expandedFolders.value) {
    initFundSortable(groupKey);
  }
}

function destroyAllFundSortables() {
  for (const instance of fundSortableInstances.values()) {
    instance.destroy();
  }
  fundSortableInstances.clear();
}

// 监听展开状态变化，初始化 Sortable
watch(
  expandedFolders,
  async () => {
    await nextTick();
    initAllFundSortables();
  },
  { deep: true },
);

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      initDraft();
      await nextTick();

      // 初始化 Sortable
      initGroupSortable();
      initAllFundSortables();

      // 如果有高亮的基金，滚动到该基金位置
      if (highlightedFundCode.value) {
        await nextTick();
        await nextTick(); // 确保 DOM 完全渲染
        scrollToHighlightedFund();
      }
    } else {
      // 清除高亮状态
      highlightedFundCode.value = "";
      highlightedGroupKey.value = "";

      // 销毁 Sortable
      destroyGroupSortable();
      destroyAllFundSortables();
    }
  },
);

// 滚动到高亮的基金位置
function scrollToHighlightedFund() {
  if (!highlightedFundCode.value) return;

  // 找到包含该基金的分组
  const groupKey = highlightedGroupKey.value;
  if (!groupKey) return;

  // 确保该分组已展开
  if (!expandedFolders.value.has(groupKey)) {
    expandedFolders.value.add(groupKey);
  }

  nextTick(() => {
    const fundListEl = fundListRefs.value.get(groupKey);
    if (!fundListEl) return;

    const highlightedItem = fundListEl.querySelector(
      `[data-code="${highlightedFundCode.value}"]`,
    ) as HTMLElement;

    if (highlightedItem) {
      highlightedItem.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
}

onBeforeUnmount(() => {
  destroyGroupSortable();
  destroyAllFundSortables();
});

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
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--el-text-color-primary);
}

.gm-scrollbar {
  height: 65vh;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
}

.gm-folder-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

/* 文件夹样式 */
.gm-folder {
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.gm-folder:last-child {
  border-bottom: none;
}

.gm-folder-fixed {
  background: var(--el-fill-color-lighter);
}

.gm-folder-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  min-height: 44px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 14px;
  user-select: none;
  font-weight: 500;
}

.gm-folder-header:has(+ .gm-fund-list.active) {
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.gm-folder-header:hover {
  background: var(--el-fill-color-light);
}

.gm-folder-header.gm-highlighted {
  box-shadow: 0 0 0 2px var(--el-color-primary) inset;
  animation: pulse-highlight 1.5s ease-in-out;
}

.folder-icon {
  font-size: 18px;
  color: var(--el-color-warning);
  flex-shrink: 0;
}

.folder-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
  font-weight: normal;
}

.folder-fixed-tag {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  background: var(--el-border-color-light);
  padding: 2px 49px;
  border-radius: 4px;
  white-space: nowrap;
  line-height: 1.6;
}

/* 基金列表样式 */
.gm-fund-list {
  list-style: none;
  padding: 0;
  margin: 0;
  background: var(--el-fill-color-lighter);
}

.gm-fund-list:not(:has(.gm-fund-item))::before {
  content: "👀 暂无基金";
  display: block;
  padding: 6px 16px;
  text-align: center;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  border-top: 1px solid var(--el-border-color-light);
}

.gm-fund-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px 0 36px; /* 左侧缩进 */
  min-height: 38px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  transition: background 0.15s;
  font-size: 13px;
  user-select: none;
}

.gm-fund-item:last-child {
  border-bottom: none;
}

.gm-fund-item:hover {
  background: var(--el-fill-color);
}

.gm-fund-item.gm-fund-highlighted {
  background: var(--el-color-warning-light-9);
  box-shadow: 0 0 0 2px var(--el-color-warning) inset;
  animation: pulse-highlight 1.5s ease-in-out;
}

.fund-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fund-code {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.gm-empty {
  padding: 16px;
  text-align: center;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

/* 拖拽手柄 */
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

/* Sortable 幽灵效果 */
:deep(.sortable-ghost) {
  opacity: 0.4;
  background: var(--el-color-primary-light-9);
  border-radius: 4px;
}

/* 动画 */
@keyframes pulse-highlight {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* 移动端适配 */
@media (max-width: 600px) {
  .gm-folder-header {
    font-size: 13px;
    min-height: 42px;
    gap: 5px;
  }

  .folder-fixed-tag {
    padding: 2px 44px;
  }

  .gm-fund-item {
    font-size: 12px;
    min-height: 36px;
    padding: 0 12px 0 32px;
    gap: 6px;
  }

  :deep(.el-dialog__body) {
    padding: 12px 16px;
  }

  :deep(.el-dialog__footer) {
    padding: 10px 16px;
  }
}
</style>
