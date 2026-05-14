<template>
  <el-dialog
    :model-value="visible"
    title="分组管理"
    width="92%"
    :close-on-click-modal="true"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div class="group-manage-hint">基金从底部拖拽到上方分组即可移动</div>

    <!-- 上半部分：分组管理器 -->
    <div class="section-header">
      <span>分组管理器</span>
      <el-button type="primary" size="small" @click="addNewGroup">+ 新建分组</el-button>
    </div>
    <ul ref="groupListRef" class="gm-group-list">
      <!-- 未分类（固定） -->
      <li class="gm-group-item gm-group-fixed"
        :class="{ 'gm-group-active': selectedGroup === '__uncategorized__' }"
        @click="selectGroupItem('__uncategorized__')"
        @dragover.prevent="onGroupDragOver('__uncategorized__', $event)"
        @dragleave="onGroupDragLeave"
        @drop="onFundDropToGroup('__uncategorized__', $event)"
      >
        <span class="gm-drag-handle disabled">☰</span>
        <span class="gm-group-name">未分类</span>
        <span class="gm-group-count">{{ uncategorizedFunds.length }} 只</span>
      </li>
      <!-- 自定义分组 -->
      <li
        v-for="g in draftGroupOrder"
        :key="g.key"
        class="gm-group-item"
        :class="{ 'gm-group-active': selectedGroup === g.key, 'gm-drag-over': dragOverGroup === g.key }"
        draggable="true"
        @click="selectGroupItem(g.key)"
        @dragstart="onGroupDragStart(g.key, $event)"
        @dragend="onGroupDragEnd"
        @dragover.prevent="onGroupDragOver(g.key, $event)"
        @dragleave="onGroupDragLeave"
        @drop="onDrop(g.key, $event)"
      >
        <span class="gm-drag-handle">☰</span>
        <span class="gm-group-name">{{ g.name }}</span>
        <span class="gm-group-count">{{ getGroupFundCount(g.key) }} 只</span>
        <el-button size="small" link type="primary" @click.stop="renameGroup(g)"><el-icon><Edit /></el-icon></el-button>
        <el-button size="small" link type="danger" @click.stop="deleteGroup(g)"><el-icon><Delete /></el-icon></el-button>
      </li>
    </ul>

    <!-- 下半部分：基金列表 -->
    <div class="section-header" style="margin-top: 16px;">
      <span>基金列表（{{ selectedGroupLabel }}）- 共 {{ currentFundList.length }} 只</span>
    </div>
    <ul ref="fundListRef" class="gm-fund-list">
      <li v-if="currentFundList.length === 0" class="gm-fund-empty">暂无基金</li>
      <li
        v-for="fund in currentFundList"
        :key="fund.code"
        class="gm-fund-item"
        draggable="true"
        @dragstart="onFundDragStart(fund.code, $event)"
        @dragend="onFundDragEnd"
        @dragover.prevent="onFundDragOver(fund.code, $event)"
        @dragleave="onFundDragLeave"
        @drop.prevent="onFundDrop(fund.code, $event)"
      >
        <span class="gm-drag-handle">☰</span>
        <span class="gm-fund-name">{{ fund.name }}</span>
        <span class="gm-fund-code">{{ fund.code }}</span>
      </li>
    </ul>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete } from '@element-plus/icons-vue'
import { useGroupStore, useFundStore } from '@/stores'
import { validateGroupName } from '@/utils/validate'
import type { FundRowDisplay } from '@/utils/fundDisplay'

const props = defineProps<{
  visible: boolean
  fundRows: FundRowDisplay[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'saved': []
}>()

const groupStore = useGroupStore()
const fundStore = useFundStore()

// Draft state
const draftGroupOrder = ref<{ key: string; name: string }[]>([])
const draftFundGroups = ref<Map<string, string[]>>(new Map()) // groupKey -> fundCodes
const selectedGroup = ref<string>('__uncategorized__')

// Drag state
const draggingGroup = ref<string | null>(null)
const draggingFund = ref<string | null>(null)
const dragOverGroup = ref<string | null>(null)
const dragType = ref<'group' | 'fund' | null>(null)

// Initialize draft from store
function initDraft() {
  const groups = groupStore.getGroupList
  draftGroupOrder.value = groups.map(g => ({ key: g.key, name: g.name }))

  // Build fund-to-group mapping
  const map = new Map<string, string[]>()
  for (const g of groups) {
    map.set(g.key, [...g.fundCodes])
  }
  draftFundGroups.value = map
  selectedGroup.value = '__uncategorized__'
}

// Computed: uncategorized funds (not in any group)
const uncategorizedFunds = computed(() => {
  const allGrouped = new Set<string>()
  for (const codes of draftFundGroups.value.values()) {
    for (const c of codes) allGrouped.add(c)
  }
  return fundStore.funds.filter(f => !allGrouped.has(f.code))
})

// Computed: current fund list for selected group
const currentFundList = computed(() => {
  if (selectedGroup.value === '__uncategorized__') {
    return uncategorizedFunds.value.map(f => {
      const row = props.fundRows.find(r => r.code === f.code)
      return { code: f.code, name: row?.name || f.code }
    })
  }
  const codes = draftFundGroups.value.get(selectedGroup.value) || []
  return codes.map(code => {
    const row = props.fundRows.find(r => r.code === code)
    return { code, name: row?.name || code }
  })
})

const selectedGroupLabel = computed(() => {
  if (selectedGroup.value === '__uncategorized__') return '未分类'
  const g = draftGroupOrder.value.find(x => x.key === selectedGroup.value)
  return g?.name || ''
})

function getGroupFundCount(key: string): number {
  return (draftFundGroups.value.get(key) || []).length
}

function selectGroupItem(key: string) {
  selectedGroup.value = key
}

// --- Group operations ---
async function addNewGroup() {
  try {
    const { value } = await ElMessageBox.prompt('请输入分组名称', '新建分组', {
      inputPattern: /^.{1,50}$/,
      inputErrorMessage: '分组名称长度为 1-50 个字符'
    })
    const name = String(value).trim()
    if (!validateGroupName(name)) {
      ElMessage.warning('分组名称无效')
      return
    }
    // Check duplicate
    if (draftGroupOrder.value.some(g => g.name === name)) {
      ElMessage.warning('分组名称已存在')
      return
    }
    const key = `group_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    draftGroupOrder.value.push({ key, name })
    draftFundGroups.value.set(key, [])
  } catch { /* cancel */ }
}

async function renameGroup(g: { key: string; name: string }) {
  try {
    const { value } = await ElMessageBox.prompt('新名称', '重命名分组', {
      inputValue: g.name
    })
    const name = String(value).trim()
    if (!validateGroupName(name)) {
      ElMessage.warning('分组名称无效')
      return
    }
    if (draftGroupOrder.value.some(x => x.name === name && x.key !== g.key)) {
      ElMessage.warning('分组名称已存在')
      return
    }
    const item = draftGroupOrder.value.find(x => x.key === g.key)
    if (item) item.name = name
  } catch { /* cancel */ }
}

async function deleteGroup(g: { key: string; name: string }) {
  try {
    await ElMessageBox.confirm(`删除分组「${g.name}」？分组内基金将变为未分类。`, '确认', { type: 'warning' })
    draftGroupOrder.value = draftGroupOrder.value.filter(x => x.key !== g.key)
    draftFundGroups.value.delete(g.key)
    if (selectedGroup.value === g.key) {
      selectedGroup.value = '__uncategorized__'
    }
  } catch { /* cancel */ }
}

// --- Group drag & drop ---
function onGroupDragStart(key: string, e: DragEvent) {
  draggingGroup.value = key
  dragType.value = 'group'
  e.dataTransfer!.effectAllowed = 'move'
  e.dataTransfer!.setData('text/plain', `group:${key}`)
}

function onGroupDragEnd() {
  draggingGroup.value = null
  dragOverGroup.value = null
  dragType.value = null
}

function onGroupDragOver(key: string, e: DragEvent) {
  e.preventDefault()
  dragOverGroup.value = key
}

function onGroupDragLeave() {
  dragOverGroup.value = null
}

function onDrop(targetKey: string, e: DragEvent) {
  e.preventDefault()
  dragOverGroup.value = null

  const data = e.dataTransfer?.getData('text/plain') || ''

  if (data.startsWith('fund:')) {
    // Fund dropped onto group
    const fundCode = data.replace('fund:', '')
    moveFundToGroup(fundCode, targetKey)
  } else if (data.startsWith('group:')) {
    // Group reorder
    const sourceKey = data.replace('group:', '')
    if (sourceKey === targetKey) return
    const arr = draftGroupOrder.value
    const fromIdx = arr.findIndex(g => g.key === sourceKey)
    const toIdx = arr.findIndex(g => g.key === targetKey)
    if (fromIdx < 0 || toIdx < 0) return
    const [item] = arr.splice(fromIdx, 1)
    arr.splice(toIdx, 0, item!)
  }
}

function onFundDropToGroup(targetKey: string, e: DragEvent) {
  e.preventDefault()
  dragOverGroup.value = null
  const data = e.dataTransfer?.getData('text/plain') || ''
  if (data.startsWith('fund:')) {
    const fundCode = data.replace('fund:', '')
    moveFundToGroup(fundCode, targetKey)
  }
}

function moveFundToGroup(fundCode: string, targetKey: string) {
  // Remove from all groups
  for (const [key, codes] of draftFundGroups.value.entries()) {
    const idx = codes.indexOf(fundCode)
    if (idx >= 0) codes.splice(idx, 1)
  }
  // Add to target (unless uncategorized)
  if (targetKey !== '__uncategorized__') {
    const codes = draftFundGroups.value.get(targetKey)
    if (codes) {
      codes.push(fundCode)
    } else {
      draftFundGroups.value.set(targetKey, [fundCode])
    }
  }
}

// --- Fund drag & drop (reorder within group) ---
function onFundDragStart(code: string, e: DragEvent) {
  draggingFund.value = code
  dragType.value = 'fund'
  e.dataTransfer!.effectAllowed = 'move'
  e.dataTransfer!.setData('text/plain', `fund:${code}`)
}

function onFundDragEnd() {
  draggingFund.value = null
  dragType.value = null
}

function onFundDragOver(code: string, e: DragEvent) {
  e.preventDefault()
  if (!draggingFund.value || draggingFund.value === code) return
}

function onFundDragLeave() {
  // no-op
}

function onFundDrop(targetCode: string, e: DragEvent) {
  e.preventDefault()
  const data = e.dataTransfer?.getData('text/plain') || ''
  if (!data.startsWith('fund:')) return
  const sourceCode = data.replace('fund:', '')
  if (sourceCode === targetCode) return

  // Reorder within current group
  if (selectedGroup.value === '__uncategorized__') {
    // Reorder in global fund list
    const codes = fundStore.funds.map(f => f.code)
    const fromIdx = codes.indexOf(sourceCode)
    const toIdx = codes.indexOf(targetCode)
    if (fromIdx >= 0 && toIdx >= 0) {
      codes.splice(fromIdx, 1)
      codes.splice(toIdx, 0, sourceCode)
      fundStore.reorderFunds(codes)
    }
  } else {
    const codes = draftFundGroups.value.get(selectedGroup.value)
    if (!codes) return
    const fromIdx = codes.indexOf(sourceCode)
    const toIdx = codes.indexOf(targetCode)
    if (fromIdx >= 0 && toIdx >= 0) {
      codes.splice(fromIdx, 1)
      codes.splice(toIdx, 0, sourceCode)
    }
  }
}

// --- Save ---
async function handleSave() {
  try {
    // 1. Save group order and names
    const newOrder = draftGroupOrder.value.map(g => g.key)

    // Delete removed groups
    const existingKeys = new Set(groupStore.getGroupList.map(g => g.key))
    const draftKeys = new Set(newOrder)
    for (const key of existingKeys) {
      if (!draftKeys.has(key)) {
        await groupStore.deleteGroup(key)
      }
    }

    // Add new groups
    for (const g of draftGroupOrder.value) {
      if (!existingKeys.has(g.key)) {
        // Create new group
        const group = {
          key: g.key,
          name: g.name,
          fundCodes: draftFundGroups.value.get(g.key) || [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        groupStore.groups.set(g.key, group)
        if (!groupStore.groupOrder.includes(g.key)) {
          groupStore.groupOrder.push(g.key)
        }
      }
    }

    // Update names and fund codes
    for (const g of draftGroupOrder.value) {
      const existing = groupStore.getGroup(g.key)
      if (existing) {
        existing.name = g.name
        existing.fundCodes = draftFundGroups.value.get(g.key) || []
        existing.updatedAt = Date.now()
      }
    }

    // Reorder
    groupStore.groupOrder = newOrder

    // Update fund groupKey in fundStore
    for (const fund of fundStore.funds) {
      let foundGroup: string | undefined
      for (const [key, codes] of draftFundGroups.value.entries()) {
        if (codes.includes(fund.code)) {
          foundGroup = key
          break
        }
      }
      fund.groupKey = foundGroup
    }

    emit('saved')
    emit('update:visible', false)
    ElMessage.success('分组已保存')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
}

watch(() => props.visible, (val) => {
  if (val) initDraft()
})
</script>

<style scoped>
.group-manage-hint {
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

.gm-group-list,
.gm-fund-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
}

.gm-group-item,
.gm-fund-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  transition: background 0.15s;
  font-size: 13px;
}

.gm-group-item:last-child,
.gm-fund-item:last-child {
  border-bottom: none;
}

.gm-group-item:hover,
.gm-fund-item:hover {
  background: var(--el-fill-color-light);
}

.gm-group-item.gm-group-active {
  background: var(--el-color-primary-light-9);
}

.gm-group-item.gm-drag-over {
  background: var(--el-color-primary-light-8);
  outline: 2px dashed var(--el-color-primary);
  outline-offset: -2px;
}

.gm-group-fixed {
  opacity: 0.8;
}

.gm-drag-handle {
  cursor: grab;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  user-select: none;
  flex-shrink: 0;
}

.gm-drag-handle.disabled {
  cursor: default;
  opacity: 0.3;
}

.gm-drag-handle:not(.disabled):active {
  cursor: grabbing;
}

.gm-group-name,
.gm-fund-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gm-group-count {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.gm-fund-code {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.gm-fund-empty {
  padding: 16px;
  text-align: center;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
