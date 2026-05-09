<template>
  <div class="fund-detail-view">
    <el-container v-loading="loading">
      <!-- 顶部导航栏 -->
      <el-header class="detail-header">
        <el-page-header @back="goBack">
          <template #icon>
            <el-icon><ArrowLeft /></el-icon>
          </template>
          <template #content>
            <div class="header-content">
              <span class="fund-name">{{ fundInfo?.name || '加载中...' }}</span>
              <span class="fund-code">{{ code }}</span>
            </div>
          </template>
          <template #extra>
            <el-button
              type="primary"
              size="small"
              :icon="CopyDocument"
              @click="copyCode"
            >
              复制代码
            </el-button>
          </template>
        </el-page-header>
      </el-header>

      <!-- 主体内容 -->
      <el-main class="detail-main">
        <div v-if="fundView" class="detail-content">
          <!-- 基金信息卡片 -->
          <el-card class="info-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <el-icon><TrendCharts /></el-icon>
                <span>基金信息</span>
              </div>
            </template>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">当前净值</span>
                <span class="value">{{ formatPrice(fundView.currentPrice) }}</span>
              </div>
              <div class="info-item">
                <span class="label">日涨跌幅</span>
                <span class="value" :class="getChangeClass(fundView.changePercent)">
                  {{ formatPercent(fundView.changePercent) }}
                </span>
              </div>
              <div class="info-item">
                <span class="label">日涨跌额</span>
                <span class="value" :class="getChangeClass(fundView.changeAmount)">
                  {{ formatChange(fundView.changeAmount) }}
                </span>
              </div>
              <div class="info-item">
                <span class="label">所属分类</span>
                <span class="value">{{ fundView.sector || '-' }}</span>
              </div>
            </div>
          </el-card>

          <!-- 持仓信息卡片 -->
          <el-card class="info-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <el-icon><Wallet /></el-icon>
                <span>持仓信息</span>
              </div>
            </template>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">持有份额</span>
                <span class="value">{{ formatNumber(fundView.num, 2) }}</span>
              </div>
              <div class="info-item">
                <span class="label">成本价</span>
                <span class="value">{{ formatPrice(fundView.cost) }}</span>
              </div>
              <div class="info-item">
                <span class="label">持有收益</span>
                <span class="value" :class="getChangeClass(fundView.holdingGain)">
                  {{ formatValue(fundView.holdingGain) }}
                </span>
              </div>
              <div class="info-item">
                <span class="label">持有收益率</span>
                <span class="value" :class="getChangeClass(fundView.holdingGainRate)">
                  {{ formatPercent(fundView.holdingGainRate) }}
                </span>
              </div>
            </div>
          </el-card>

          <!-- 预计收益卡片 -->
          <el-card class="info-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <el-icon><Money /></el-icon>
                <span>预计收益</span>
              </div>
            </template>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">预计收益</span>
                <span class="value" :class="getChangeClass(fundView.estimatedGain)">
                  {{ formatValue(fundView.estimatedGain) }}
                </span>
              </div>
              <div class="info-item">
                <span class="label">预计涨幅</span>
                <span class="value" :class="getChangeClass(fundView.estimatedChange)">
                  {{ formatPercent(fundView.estimatedChange) }}
                </span>
              </div>
              <div class="info-item">
                <span class="label">日收益</span>
                <span class="value" :class="getChangeClass(fundView.dailyGain)">
                  {{ formatValue(fundView.dailyGain) }}
                </span>
              </div>
              <div class="info-item">
                <span class="label">所属分组</span>
                <span class="value">{{ getGroupName(fundView.groupKey) }}</span>
              </div>
            </div>
          </el-card>

          <!-- 基金概况卡片 -->
          <el-card class="info-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <el-icon><Document /></el-icon>
                <span>基金概况</span>
              </div>
            </template>
            <div class="info-list">
              <div class="info-row">
                <span class="label">基金代码</span>
                <span class="value">{{ code }}</span>
              </div>
              <div class="info-row">
                <span class="label">基金名称</span>
                <span class="value">{{ fundView.name || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="label">基金类型</span>
                <span class="value">{{ fundView.type || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="label">基金公司</span>
                <span class="value">{{ fundView.company || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="label">成立日期</span>
                <span class="value">{{ fundView.establishDate || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="label">基金经理</span>
                <span class="value">{{ fundView.manager || '-' }}</span>
              </div>
            </div>
          </el-card>

          <!-- 操作按钮 -->
          <div class="action-buttons">
            <el-button
              type="primary"
              size="large"
              :icon="Edit"
              @click="showEditDialog = true"
            >
              编辑基金
            </el-button>
            <el-button
              type="danger"
              size="large"
              :icon="Delete"
              @click="confirmDelete"
            >
              删除基金
            </el-button>
          </div>
        </div>

        <el-empty v-else description="基金数据加载失败" />
      </el-main>
    </el-container>

    <!-- 编辑基金对话框 -->
    <el-dialog
      v-model="showEditDialog"
      title="编辑基金"
      width="90%"
      :close-on-click-modal="false"
    >
      <el-form
        :model="editForm"
        :rules="editFormRules"
        ref="editFormRef"
        label-width="100px"
      >
        <el-form-item label="基金代码">
          <el-input v-model="editForm.code" disabled />
        </el-form-item>
        <el-form-item label="基金名称">
          <el-input v-model="editForm.name" disabled />
        </el-form-item>
        <el-form-item label="持有份额" prop="num">
          <el-input
            v-model.number="editForm.num"
            type="number"
            placeholder="请输入持有份额"
          />
        </el-form-item>
        <el-form-item label="成本价" prop="cost">
          <el-input
            v-model.number="editForm.cost"
            type="number"
            placeholder="请输入成本价"
          />
        </el-form-item>
        <el-form-item label="所属分组" prop="groupKey">
          <el-select
            v-model="editForm.groupKey"
            placeholder="请选择分组（可选）"
            clearable
          >
            <el-option
              v-for="group in groupList"
              :key="group.key"
              :label="group.name"
              :value="group.key"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button
          type="primary"
          @click="handleEdit"
          :loading="submitting"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  ArrowLeft,
  CopyDocument,
  TrendCharts,
  Wallet,
  Money,
  Document,
  Edit,
  Delete
} from '@element-plus/icons-vue'
import { useFundStore, useGroupStore, useSettingStore } from '@/stores'
import { fundService } from '@/services'
import { formatCurrency, formatNumber, formatPrivacy } from '@/utils/format'

interface Props {
  code: string
}

const props = defineProps<Props>()
const router = useRouter()

const fundStore = useFundStore()
const groupStore = useGroupStore()
const settingStore = useSettingStore()

// 状态
const loading = ref(false)
const submitting = ref(false)
const showEditDialog = ref(false)

// 表单
const editForm = ref({
  code: '',
  name: '',
  num: 0,
  cost: 0,
  groupKey: ''
})

const editFormRef = ref<FormInstance>()

const editFormRules: FormRules = {
  num: [
    { required: true, message: '请输入持有份额', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '持有份额必须大于0', trigger: 'blur' }
  ],
  cost: [
    { required: true, message: '请输入成本价', trigger: 'blur' },
    { type: 'number', min: 0.0001, message: '成本价必须大于0', trigger: 'blur' }
  ]
}

// 计算属性
const fundView = computed(() => fundStore.getFundView(props.code))
const fundInfo = computed(() => fundStore.fundDetails.get(props.code))
const groupList = computed(() => groupStore.getGroupList)

// 方法
const goBack = () => {
  router.back()
}

const copyCode = () => {
  navigator.clipboard.writeText(props.code).then(() => {
    ElMessage.success('基金代码已复制')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

const formatPrice = (price: number | undefined): string => {
  if (price === undefined) return '-'
  return formatPrivacy(formatCurrency(price, 4), settingStore.privacyMode)
}

const formatValue = (value: number | undefined): string => {
  if (value === undefined) return '-'
  return formatPrivacy(formatCurrency(value), settingStore.privacyMode)
}

const formatChange = (value: number | undefined): string => {
  if (value === undefined) return '-'
  const sign = value > 0 ? '+' : ''
  return formatPrivacy(`${sign}${formatCurrency(value)}`, settingStore.privacyMode)
}

const formatPercent = (value: number | undefined): string => {
  if (value === undefined) return '-'
  const sign = value > 0 ? '+' : ''
  const formatted = `${sign}${value.toFixed(2)}%`
  return formatPrivacy(formatted, settingStore.privacyMode)
}

const getChangeClass = (value: number | undefined): string => {
  if (value === undefined || settingStore.grayscaleMode) return ''
  return value > 0 ? 'positive' : value < 0 ? 'negative' : ''
}

const getGroupName = (groupKey: string | undefined): string => {
  if (!groupKey) return '未分组'
  const group = groupStore.getGroup(groupKey)
  return group ? group.name : '未分组'
}

const handleEdit = async () => {
  if (!editFormRef.value) return

  await editFormRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      await fundService.updateFund(
        editForm.value.code,
        editForm.value.num,
        editForm.value.cost,
        editForm.value.groupKey || undefined
      )
      ElMessage.success('保存成功')
      showEditDialog.value = false
      
      // 刷新基金数据
      await fundService.fetchFundDetail(props.code)
    } catch (error: any) {
      ElMessage.error('保存失败: ' + error.message)
    } finally {
      submitting.value = false
    }
  })
}

const confirmDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除基金 ${fundView.value?.name || props.code} 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    loading.value = true
    await fundService.deleteFund(props.code)
    ElMessage.success('删除成功')
    router.push('/')
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  } finally {
    loading.value = false
  }
}

// 生命周期
onMounted(async () => {
  loading.value = true
  try {
    // 如果没有基金详情，则获取
    if (!fundInfo.value) {
      await fundService.fetchFundDetail(props.code)
    }

    // 初始化编辑表单
    if (fundView.value) {
      editForm.value = {
        code: fundView.value.code,
        name: fundView.value.name || '',
        num: fundView.value.num,
        cost: fundView.value.cost,
        groupKey: fundView.value.groupKey || ''
      }
    }
  } catch (error) {
    console.error('加载基金详情失败:', error)
    ElMessage.error('加载基金详情失败')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.fund-detail-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color-page);
}

.detail-header {
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
  padding: 16px 20px;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fund-name {
  font-size: 16px;
  font-weight: 500;
}

.fund-code {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.detail-main {
  flex: 1;
  overflow: auto;
  padding: 20px;
}

.detail-content {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item .label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.info-item .value {
  font-size: 18px;
  font-weight: 500;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.info-row:last-child {
  border-bottom: none;
}

.info-row .label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.info-row .value {
  font-size: 14px;
  font-weight: 500;
}

.positive {
  color: #67c23a;
}

.negative {
  color: #f56c6c;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.action-buttons .el-button {
  flex: 1;
}

@media (max-width: 768px) {
  .detail-main {
    padding: 12px;
  }

  .info-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .info-item .value {
    font-size: 16px;
  }

  .action-buttons {
    flex-direction: column;
  }
}
</style>
