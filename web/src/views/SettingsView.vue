<template>
  <MainLayout>
    <template #header>
      <el-header class="settings-page-header">
        <h2>设置</h2>
      </el-header>
    </template>

    <div class="settings-main">
      <!-- 使用说明 -->
      <el-alert class="usage-guide" :closable="false" show-icon type="success">
        <template #title>
          <span class="usage-guide-title">使用说明</span>
        </template>
        <ul class="usage-guide-list">
          <li>
            📌<strong>长按分组</strong>，可查看该分组的详情信息（持仓汇总、收益统计等）
          </li>
          <li>
            ➕ 点击首页右上角
            <strong>+</strong> 按钮可添加新基金，支持按代码或名称搜索
          </li>
          <li>✏️ <strong>点击基金名称</strong>，可查看基金详情、编辑持仓成本、份额和进行删除等操作</li>
          <li>↕️ 默认排序时，<strong>拖动基金行</strong>可调整排列顺序</li>
          <li>
            🔒 开启<strong>隐私模式</strong>后所有数值将被隐藏，适合截图分享
          </li>
          <li>☁️ 配置 <strong>Box Name</strong>后，可在多设备间（VSCode插件、PC、Mobile）云同步数据</li>
        </ul>
      </el-alert>

      <el-form label-position="right" :label-width="formLabelWidth">
        <el-collapse v-model="activeCollapseItems" class="settings-collapse">
          <!-- 显示设置 -->
          <el-collapse-item name="display" class="settings-collapse-item">
            <template #title>
              <span class="collapse-section-title">显示设置</span>
            </template>
            <el-form-item label="隐私模式">
              <el-switch v-model="privacyMode" />
              <div class="form-item-tip">开启后隐藏所有数值</div>
            </el-form-item>

            <el-form-item label="灰色模式">
              <el-switch v-model="grayscaleMode" />
              <div class="form-item-tip">移除所有色彩，仅保留黑白灰</div>
            </el-form-item>

            <el-form-item label="主题">
              <el-radio-group v-model="theme">
                <el-radio value="light">浅色</el-radio>
                <el-radio value="dark">深色</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="刷新间隔">
              <el-select
                v-model="refreshInterval"
                allow-create
                filterable
                placeholder="选择或输入刷新间隔（秒）"
                default-first-option
              >
                <el-option label="10秒" :value="10" />
                <el-option label="20秒" :value="20" />
                <el-option label="30秒" :value="30" />
                <el-option label="40秒" :value="40" />
                <el-option label="50秒" :value="50" />
                <el-option label="1分钟" :value="60" />
                <el-option label="5分钟" :value="300" />
              </el-select>
            </el-form-item>
          </el-collapse-item>

          <!-- 列表配置 -->
          <el-collapse-item name="columns" class="settings-collapse-item">
            <template #title>
              <span class="collapse-section-title">列表配置</span>
            </template>
            <el-form-item label="列配置">
              <div class="form-item-tip" style="margin-bottom: 8px">
                勾选显示，取消隐藏；拖动 ☰ 或点击箭头调整顺序
              </div>
              <ul ref="columnSortRef" class="column-settings-list">
                <li
                  v-for="(col, index) in columnOrderDraft"
                  :key="col.key"
                  :data-key="col.key"
                  class="column-settings-item"
                  :class="{ fixed: col.key === 'name' }"
                  @click="
                    col.key !== 'name' && toggleColVisible(index, !col.visible)
                  "
                >
                  <span
                    class="drag-handle"
                    :class="{ disabled: col.key === 'name' }"
                    >☰</span
                  >
                  <el-checkbox
                    :model-value="col.visible"
                    :disabled="col.key === 'name'"
                    @click.stop
                    @update:model-value="
                      toggleColVisible(index, $event as boolean)
                    "
                  />
                  <span class="col-label">{{ col.label }}</span>
                  <template v-if="col.key === 'name'">
                    <span class="col-fixed-tag">固定</span>
                  </template>
                  <template v-else>
                    <el-button
                      size="small"
                      plain
                      :disabled="index <= 1"
                      @click.stop="moveColUp(index)"
                      >↑</el-button
                    >
                    <el-button
                      size="small"
                      plain
                      style="margin: 0"
                      :disabled="index >= columnOrderDraft.length - 1"
                      @click.stop="moveColDown(index)"
                      >↓</el-button
                    >
                  </template>
                </li>
              </ul>
              <div style="display: flex; gap: 8px; margin-top: 10px">
                <el-button @click="resetColumnSettings">恢复默认</el-button>
                <el-button type="primary" @click="saveColumnSettings"
                  >保存</el-button
                >
              </div>
            </el-form-item>
          </el-collapse-item>

          <!-- 数据同步 -->
          <el-collapse-item name="sync" class="settings-collapse-item">
            <template #title>
              <span class="collapse-section-title">数据同步</span>
            </template>
            <el-form-item label="Box Name">
              <el-input
                v-model="jsonboxName"
                placeholder="fundhelper_xxxxxxxx"
                clearable
                minlength="20"
                maxlength="64"
                show-word-limit
                @blur="handleJsonboxNameChange"
              />
              <div
                style="
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  margin-top: 6px;
                  flex-wrap: wrap;
                  width: 100%;
                "
              >
                <div style="display: flex; gap: 8px; flex-wrap: wrap">
                  <el-button
                    size="small"
                    type="primary"
                    @click="handleSaveBoxName"
                    :disabled="!jsonboxNameChanged"
                    >保存</el-button
                  >
                  <el-button
                    size="small"
                    style="margin: 0"
                    @click="handleCancelBoxName"
                    :disabled="!jsonboxNameChanged"
                    >取消</el-button
                  >
                  <el-button
                    size="small"
                    style="margin: 0"
                    @click="handleRegenerateBoxName"
                    >重新生成</el-button
                  >
                </div>
                <div class="form-item-tip">
                  仅允许输入字母、数字、下划线，至少20字符
                </div>
              </div>
            </el-form-item>

            <el-form-item label="同步操作">
              <el-space wrap>
                <el-button
                  type="primary"
                  :icon="Upload"
                  @click="handleSyncToCloud"
                  :loading="isSyncing"
                  :disabled="!jsonboxName"
                >
                  上传至云端
                </el-button>
                <el-button
                  :icon="Download"
                  @click="handleSyncFromCloud"
                  :loading="isSyncing"
                  :disabled="!jsonboxName"
                >
                  从云端同步
                </el-button>
                <el-button @click="showSyncDialog = true" :icon="Cellphone">
                  扫码同步/查看二维码
                </el-button>
                <el-button @click="handleOpenJsonLink" :disabled="!jsonboxName">
                  查看在线JSON
                </el-button>
                <el-button
                  type="danger"
                  plain
                  @click="handleClearRemote"
                  :disabled="!jsonboxName"
                >
                  清空云端数据
                </el-button>
              </el-space>
            </el-form-item>
          </el-collapse-item>

          <!-- 数据管理 -->
          <el-collapse-item name="data" class="settings-collapse-item">
            <template #title>
              <span class="collapse-section-title">数据管理</span>
            </template>
            <el-form-item label="导入导出">
              <el-space wrap>
                <el-button :icon="Download" @click="handleImportJson">
                  导入 JSON
                </el-button>
                <el-button :icon="Upload" @click="handleExportJson">
                  导出 JSON
                </el-button>
              </el-space>
              <div class="form-item-tip">
                支持导入 VSCode 版导出的 JSON 文件
              </div>
            </el-form-item>

            <el-form-item label="危险操作">
              <el-button
                type="danger"
                :icon="Delete"
                @click="handleClearAll"
                plain
              >
                清空本地数据
              </el-button>
            </el-form-item>
          </el-collapse-item>

          <!-- 关于我们 -->
          <el-collapse-item name="about" class="settings-collapse-item">
            <template #title>
              <span class="collapse-section-title">关于我们</span>
            </template>
            <el-form-item label="版本" label-width="120px">
              <span>1.0.0</span>
            </el-form-item>

            <el-form-item label="数据来源" label-width="120px">
              <span>天天基金 / 东方财富</span>
            </el-form-item>

            <el-form-item label="项目仓库" label-width="120px">
              <div style="display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 8px">
                <div>
                  <a
                    href="https://github.com/crispyChicken999/fund-helper-vscode"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="cursor: pointer"
                  >
                    <img
                      src="https://badgen.net/github/stars/crispyChicken999/fund-helper-vscode?icon=github&label=Stars&color=blue"
                      alt="GitHub Stars"
                      style="height: 100%; vertical-align: middle"
                    />
                  </a>
                </div>
                <el-button link type="primary" @click="openRepository">
                  GitHub - fund-helper-vscode
                </el-button>
                <div class="form-item-tip" style="margin: 0px; text-align: justify">
                  本项目已开源，欢迎大家点个Star支持一下！
                </div>
              </div>
            </el-form-item>

            <el-form-item label="VSCode 插件" label-width="120px">
              <div style="display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 8px">
                <div class="form-item-tip" style="margin: 0px; text-align: justify">
                  本项目同时提供 VSCode 插件版本，在编码的同时随时关注基金行情，支持与本页面云同步数据，欢迎使用！点击下方按钮前往插件市场下载。
                </div>
                <el-button
                  type="primary"
                  plain
                  size="small"
                  @click="openVscodeExtension"
                >
                  前往 VSCode 插件市场下载
                </el-button>
              </div>
            </el-form-item>
          </el-collapse-item>
        </el-collapse>
      </el-form>
    </div>

    <!-- 同步对话框 -->
    <SyncDialog v-model:visible="showSyncDialog" @synced="onSyncCompleted" />

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".json"
      style="display: none"
      @change="onFileSelected"
    />
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from "vue";
import MainLayout from "@/layouts/MainLayout.vue";
import SyncDialog from "@/components/SyncDialog.vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Upload, Download, Delete, Cellphone } from "@element-plus/icons-vue";
import Sortable from "sortablejs";
import {
  useSettingStore,
  useFundStore,
  useGroupStore,
  useSyncStore,
} from "@/stores";
import { syncService } from "@/services";
import { storageService } from "@/services/storageService";
import { generateJsonboxName } from "@/utils/validate";

const settingStore = useSettingStore();
const fundStore = useFundStore();
const groupStore = useGroupStore();
const syncStore = useSyncStore();

// ==================== 响应式数据 ====================

const privacyMode = computed({
  get: () => settingStore.privacyMode,
  set: async (value: boolean) => {
    await settingStore.setPrivacyMode(value);
    ElMessage.success(`已${value ? "开启" : "关闭"}隐私模式`);
  },
});

const grayscaleMode = computed({
  get: () => settingStore.grayscaleMode,
  set: async (value: boolean) => {
    await settingStore.setGrayscaleMode(value);
    document.documentElement.dataset.grayscale = String(value);
    ElMessage.success(`已${value ? "开启" : "关闭"}灰色模式`);
  },
});

const theme = computed({
  get: () => settingStore.theme,
  set: async (value: "light" | "dark") => {
    await settingStore.setTheme(value);
    document.documentElement.dataset.theme = value;
    ElMessage.success(`已切换到${value === "light" ? "浅色" : "深色"}主题`);
  },
});

const refreshInterval = computed({
  get: () => settingStore.refreshInterval,
  set: async (value: number) => {
    await settingStore.setRefreshInterval(value);
    ElMessage.success(`刷新间隔已设置为 ${value} 秒`);
  },
});

const jsonboxName = ref("");
const savedJsonboxName = ref("");
const showSyncDialog = ref(false);
const visibleColumns = ref<string[]>([]);
const columnOrderDraft = ref<
  { key: string; label: string; visible: boolean }[]
>([]);

const fileInputRef = ref<HTMLInputElement | null>(null);
const columnSortRef = ref<HTMLElement | null>(null);
let columnSortable: Sortable | null = null;

// 默认全部展开
const activeCollapseItems = ref([
  "display",
  "columns",
  "sync",
  "data",
  "about",
]);

// 移动端label宽度适配
const formLabelWidth = computed(() => "90px");

const jsonboxNameChanged = computed(
  () => jsonboxName.value !== savedJsonboxName.value,
);

const allColumns = [
  { key: "name", label: "基金名称" },
  { key: "estimatedGain", label: "估算收益" },
  { key: "estimatedChange", label: "估算涨幅" },
  { key: "holdingGainRate", label: "总收益率" },
  { key: "holdingGain", label: "持有收益" },
  { key: "amountShares", label: "金额/份额" },
  { key: "dailyChange", label: "当日涨幅" },
  { key: "dailyGain", label: "当日收益" },
  { key: "sector", label: "关联板块" },
  { key: "cost", label: "成本/最新" },
];

// ==================== 计算属性 ====================

const isSyncing = computed(() => syncStore.isSyncing);

// ==================== 初始化 ====================

onMounted(async () => {
  // 初始化 computed 已通过 getter 自动读取，无需手动赋值
  // privacyMode, grayscaleMode, theme, refreshInterval 都是 computed

  jsonboxName.value = settingStore.jsonboxName;
  savedJsonboxName.value = settingStore.jsonboxName;
  visibleColumns.value = [...settingStore.visibleColumns];

  // 应用 DOM 属性
  document.documentElement.dataset.grayscale = String(
    settingStore.grayscaleMode,
  );
  document.documentElement.dataset.theme = settingStore.theme;

  buildColumnDraft();

  await nextTick();
  initColumnSortable();
});

onUnmounted(() => {
  columnSortable?.destroy();
});

// ==================== 列排序 Sortable ====================

function buildColumnDraft() {
  const order = settingStore.columnOrder;
  const vis = new Set(settingStore.visibleColumns);
  const seen = new Set<string>();
  const result: { key: string; label: string; visible: boolean }[] = [];

  for (const key of order) {
    const meta = allColumns.find((c) => c.key === key);
    if (meta) {
      result.push({
        key,
        label: meta.label,
        visible: key === "name" || vis.has(key),
      });
      seen.add(key);
    }
  }
  for (const col of allColumns) {
    if (!seen.has(col.key)) {
      result.push({
        key: col.key,
        label: col.label,
        visible: col.key === "name" || vis.has(col.key),
      });
    }
  }
  columnOrderDraft.value = result;
}

function initColumnSortable() {
  if (!columnSortRef.value) return;
  columnSortable = Sortable.create(columnSortRef.value, {
    handle: ".drag-handle:not(.disabled)",
    animation: 200,
    ghostClass: "sortable-ghost",
    filter: ".fixed",
    onEnd(evt) {
      const { oldIndex, newIndex } = evt;
      if (oldIndex == null || newIndex == null || oldIndex === newIndex) return;
      if (newIndex === 0) {
        // Revert: can't move to position 0 (name is fixed)
        const item = columnOrderDraft.value.splice(newIndex, 1)[0]!;
        columnOrderDraft.value.splice(oldIndex, 0, item);
        return;
      }
      const item = columnOrderDraft.value.splice(oldIndex, 1)[0]!;
      columnOrderDraft.value.splice(newIndex, 0, item);
    },
  });
}

function toggleColVisible(index: number, value: boolean) {
  const item = columnOrderDraft.value[index];
  if (item && item.key !== "name") {
    item.visible = value;
  }
}

function moveColUp(index: number) {
  if (index <= 1) return;
  const arr = columnOrderDraft.value;
  const item = arr.splice(index, 1)[0]!;
  arr.splice(index - 1, 0, item);
}

function moveColDown(index: number) {
  if (index >= columnOrderDraft.value.length - 1) return;
  const arr = columnOrderDraft.value;
  const item = arr.splice(index, 1)[0]!;
  arr.splice(index + 1, 0, item);
}

function resetColumnSettings() {
  const defaultVisible = [
    "name",
    "estimatedGain",
    "estimatedChange",
    "holdingGainRate",
    "holdingGain",
    "amountShares",
    "dailyChange",
    "dailyGain",
    "sector",
    "cost",
  ];
  columnOrderDraft.value = allColumns.map((col) => ({
    key: col.key,
    label: col.label,
    visible: defaultVisible.includes(col.key),
  }));
}

function saveColumnSettings() {
  const newOrder = columnOrderDraft.value.map((d) => d.key);
  const newVisible = columnOrderDraft.value
    .filter((d) => d.visible)
    .map((d) => d.key);
  settingStore.setColumnOrder(newOrder);
  settingStore.setVisibleColumns(newVisible);
  storageService.saveSettings(settingStore.getSettings());
  ElMessage.success("列配置已保存");
}

// ==================== 数据同步 ====================

async function handleJsonboxNameChange() {
  if (jsonboxName.value) {
    await settingStore.setJsonboxName(jsonboxName.value);
  }
}

function handleSaveBoxName() {
  const name = jsonboxName.value.trim();
  if (!name || !/^[a-zA-Z0-9_]{20,}$/.test(name)) {
    ElMessage.warning("Box Name 格式不正确（字母数字下划线，至少 20 字符）");
    return;
  }
  savedJsonboxName.value = name;
  settingStore.setJsonboxName(name);
  storageService.saveSettings(settingStore.getSettings());
  ElMessage.success("Box Name 已保存");
}

function handleCancelBoxName() {
  jsonboxName.value = savedJsonboxName.value;
}

function handleRegenerateBoxName() {
  const name = generateJsonboxName();
  jsonboxName.value = name;
  ElMessage.success("已重新生成 Box Name，请点击保存");
}

async function handleSyncToCloud() {
  try {
    await syncService.syncToCloud();
    ElMessage.success("已上传到云端");
  } catch (e: any) {
    ElMessage.error("上传失败: " + e.message);
  }
}

async function handleSyncFromCloud() {
  try {
    await syncService.syncFromCloud();
    ElMessage.success("已同步云端配置");
  } catch (e: any) {
    ElMessage.error("下载失败: " + e.message);
  }
}

function handleOpenJsonLink() {
  if (!jsonboxName.value) {
    ElMessage.warning("请先配置 Box Name");
    return;
  }
  const url = `https://jsonbox.cloud.exo-imaging.com/${jsonboxName.value}`;
  window.open(url, "_blank");
}

async function handleClearRemote() {
  if (!jsonboxName.value) return;
  try {
    await ElMessageBox.confirm("确定清空远程配置？此操作不可恢复。", "确认", {
      type: "warning",
    });
    await syncService.resetBox();
    ElMessage.success("远程配置已清空");
  } catch (e: any) {
    if (e !== "cancel") ElMessage.error(e?.message || "操作失败");
  }
}

function onSyncCompleted() {
  // Refresh local state after sync
  // privacyMode, grayscaleMode, theme, refreshInterval 已通过 computed 自动同步
  jsonboxName.value = settingStore.jsonboxName;
  savedJsonboxName.value = settingStore.jsonboxName;

  // 更新 DOM 属性以应用灰色模式和主题
  document.documentElement.dataset.grayscale = String(
    settingStore.grayscaleMode,
  );
  document.documentElement.dataset.theme = settingStore.theme;

  // 重建列配置
  buildColumnDraft();
}

// ==================== JSON 导入导出 ====================

function handleImportJson() {
  fileInputRef.value?.click();
}

async function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  input.value = ""; // reset

  try {
    const text = await file.text();
    const raw = JSON.parse(text);
    const payload = normalizeImportData(raw);

    const fundCount = payload.funds?.length ?? 0;
    const groupCount = payload.groups ? Object.keys(payload.groups).length : 0;

    const action = await ElMessageBox.confirm(
      `检测到 ${fundCount} 个基金，${groupCount} 个分组。\n选择「覆盖」将清空当前数据后导入，选择「合并」仅追加不存在的基金。`,
      "导入确认",
      {
        distinguishCancelAndClose: true,
        confirmButtonText: "覆盖导入",
        cancelButtonText: "合并导入",
      },
    )
      .then(() => "overwrite" as const)
      .catch((action) => {
        if (action === "cancel") return "merge" as const;
        return null;
      });

    if (!action) return;

    if (action === "overwrite") {
      fundStore.clearFunds();
      groupStore.clearGroups();
    }

    // 导入基金
    if (Array.isArray(payload.funds)) {
      for (const f of payload.funds) {
        if (!f.code) continue;
        const exists = fundStore.getFund(f.code);
        if (!exists) {
          fundStore.funds.push({
            code: f.code,
            num: f.num || 0,
            cost: f.cost || 0,
            groupKey: f.groupKey,
          });
        }
      }
    }

    // 导入分组
    if (
      payload.groups &&
      typeof payload.groups === "object" &&
      !Array.isArray(payload.groups)
    ) {
      groupStore.initGroupsFromObject(payload.groups, payload.groupOrder || []);
      // Map fund groupKey based on imported groups
      for (const [groupName, codes] of Object.entries(
        payload.groups as Record<string, string[]>,
      )) {
        const group = groupStore.getGroupList.find((g) => g.name === groupName);
        if (group) {
          for (const code of codes) {
            const fund = fundStore.getFund(code);
            if (fund) fund.groupKey = group.key;
          }
        }
      }
    }

    // 导入列设置（VSCode 格式）
    if (payload.columnSettings) {
      if (payload.columnSettings.columnOrder) {
        settingStore.setColumnOrder(payload.columnSettings.columnOrder);
      }
      if (payload.columnSettings.visibleColumns) {
        settingStore.setVisibleColumns(payload.columnSettings.visibleColumns);
      }
    }

    // 导入其他设置
    if (payload.privacyMode !== undefined) {
      await settingStore.setPrivacyMode(payload.privacyMode);
      // privacyMode computed 会自动读取新值
    }
    if (payload.grayscaleMode !== undefined) {
      await settingStore.setGrayscaleMode(payload.grayscaleMode);
      document.documentElement.dataset.grayscale = String(
        payload.grayscaleMode,
      );
      // grayscaleMode computed 会自动读取新值
    }
    if (payload.refreshInterval !== undefined) {
      await settingStore.setRefreshInterval(payload.refreshInterval);
      // refreshInterval computed 会自动读取新值
    }
    if (payload.sortMethod && typeof payload.sortMethod === "string") {
      // Map VSCode sortMethod format to web format
      const sortMethodMap: Record<string, string> = {
        default: "holdingGainRate_desc",
        changePercent_desc: "estimatedChange_desc",
        changePercent_asc: "estimatedChange_asc",
        dailyGain_desc: "dailyGain_desc",
        dailyGain_asc: "dailyGain_asc",
        holdingAmount_desc: "amountShares_desc",
        holdingAmount_asc: "amountShares_asc",
        holdingGain_desc: "holdingGain_desc",
        holdingGain_asc: "holdingGain_asc",
        holdingGainRate_desc: "holdingGainRate_desc",
        holdingGainRate_asc: "holdingGainRate_asc",
      };
      const mapped = sortMethodMap[payload.sortMethod] || payload.sortMethod;
      const parts = mapped.split("_");
      if (parts.length >= 2) {
        fundStore.setSortConfig(parts[0]!, parts[1] as "asc" | "desc");
      }
    }

    // 持久化
    storageService.saveFunds(fundStore.funds);
    const exported = groupStore.exportGroupsToObject();
    storageService.saveGroups(exported.groups, exported.groupOrder);

    ElMessage.success(
      `导入完成（${action === "overwrite" ? "覆盖" : "合并"}模式）`,
    );
  } catch (e: any) {
    if (e?.message) ElMessage.error("导入失败: " + e.message);
  }
}

function normalizeImportData(raw: any): any {
  // 兼容旧格式：直接是 funds 数组
  if (Array.isArray(raw)) {
    return { funds: raw, groups: {}, groupOrder: [], columnSettings: null };
  }

  // Normalize funds: VSCode version uses string num/cost
  if (Array.isArray(raw.funds)) {
    raw.funds = raw.funds.map((f: any) => ({
      code: f.code,
      num: parseFloat(f.num) || 0,
      cost: parseFloat(f.cost) || 0,
    }));
  }

  return raw;
}

function handleExportJson() {
  const payload = {
    funds: fundStore.funds.map((f) => ({
      code: f.code,
      num: String(f.num),
      cost: String(f.cost),
    })),
    groups: groupStore.exportGroupsToObject().groups,
    groupOrder: groupStore.getGroupList.map((g) => g.name),
    columnSettings: {
      columnOrder: settingStore.columnOrder,
      visibleColumns: settingStore.visibleColumns,
    },
    sortMethod: `${fundStore.sortConfig.field}_${fundStore.sortConfig.order}`,
    refreshInterval: settingStore.refreshInterval,
    hideStatusBar: false,
    defaultViewMode: "webview",
    privacyMode: settingStore.privacyMode,
    grayscaleMode: settingStore.grayscaleMode,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const d = new Date();
  a.download = `fund-helper-config-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.json`;
  a.click();
  URL.revokeObjectURL(url);
  ElMessage.success("已导出");
}

// ==================== 清空数据 ====================

async function handleClearAll() {
  try {
    await ElMessageBox.confirm(
      "此操作将清空本地所有基金和分组数据，不可恢复。",
      "确认清空",
      { type: "warning" },
    );
    fundStore.clearFunds();
    groupStore.clearGroups();
    storageService.saveFunds([]);
    storageService.saveGroups({}, []);
    ElMessage.success("已清空");
  } catch {
    /* cancel */
  }
}

function openRepository() {
  window.open(
    "https://github.com/crispyChicken999/fund-helper-vscode",
    "_blank",
  );
}

function openVscodeExtension() {
  window.open(
    "https://marketplace.visualstudio.com/items?itemName=CrispyChicken.fund-helper",
    "_blank",
  );
}
</script>

<style scoped>
.settings-page-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color);
}

.settings-page-header h2 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
  font-weight: 600;
}

.settings-main {
  padding: 16px;
  box-sizing: border-box;
}

.form-item-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  margin-left: 4px;
}

.column-settings-list {
  list-style: none;
  padding: 0;
  margin: 0;
  width: 100%;
}

.column-settings-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  margin-bottom: 6px;
  background: var(--el-bg-color);
  font-size: 13px;
  transition: background 0.15s;
  cursor: pointer;
  user-select: none;
  min-height: 44px;
}

.column-settings-item.fixed {
  background: var(--el-fill-color-light);
}

.column-settings-item .drag-handle {
  cursor: grab;
  color: var(--el-text-color-secondary);
  user-select: none;
  font-size: 16px;
  padding: 4px;
  touch-action: none;
}

.column-settings-item .drag-handle.disabled {
  cursor: default;
  opacity: 0.3;
}

.column-settings-item .drag-handle:not(.disabled):active {
  cursor: grabbing;
}

.column-settings-item .col-label {
  flex: 1;
}

.column-settings-item .col-fixed-tag {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background: var(--el-border-color-light);
  padding: 0 22px;
  border-radius: 4px;
}

:deep(.sortable-ghost) {
  opacity: 0.4;
  background: var(--el-color-primary-light-9);
}

.sync-status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sync-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* 移动端适配 */
@media (max-width: 600px) {
  .settings-main {
    padding: 12px;
  }

  :deep(.el-form-item) {
    margin-bottom: 16px;
  }

  :deep(.el-form-item__label) {
    font-size: 13px;
    font-weight: 500;
    padding-bottom: 4px;
  }

  :deep(.el-divider__text) {
    font-size: 13px;
  }

  :deep(.el-space) {
    flex-wrap: wrap;
  }

  :deep(.el-space .el-button) {
    margin: 0;
  }
}

/* 使用说明 */
.usage-guide {
  margin-bottom: 16px;
  border-radius: 8px;
}

.usage-guide-title {
  font-size: 14px;
  font-weight: 600;
}

.usage-guide-list {
  margin: 6px 0 0 0;
  padding-left: 4px;
  list-style: none;
  display: flex;
  flex-direction: column;
  text-align: left;
  gap: 6px;
}

.usage-guide-list li {
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.5;
}

/* Collapse 设置区 */
.settings-collapse {
  border: none;
}

.settings-collapse-item {
  margin-bottom: 8px;
  border: 1px solid var(--el-border-color) !important;
  border-radius: 8px !important;
  overflow: hidden;
}

:deep(.settings-collapse-item .el-collapse-item__header) {
  padding: 0 16px;
  font-size: 14px;
  font-weight: 600;
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color);
  height: 44px;
}

:deep(.settings-collapse-item .el-collapse-item__wrap) {
  border-bottom: none;
}

:deep(.settings-collapse-item .el-collapse-item__content) {
  padding: 12px 16px 4px;
}

.collapse-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
</style>
