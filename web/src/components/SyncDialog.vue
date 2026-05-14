<template>
  <el-dialog
    :model-value="visible"
    title="数据同步"
    width="min(92%, 480px)"
    :close-on-click-modal="true"
    @update:model-value="$emit('update:visible', $event)"
    @closed="onDialogClosed"
  >
    <div class="sync-dialog-body">
      <!-- Box Name 编辑区 -->
      <div class="sync-section">
        <div class="sync-label">Box Name</div>
        <div class="boxname-edit-row">
          <el-input
            v-model="editingBoxName"
            placeholder="fundhelper_xxxxxxxx"
            clearable
            :class="{ 'is-changed': isBoxNameChanged }"
          />
        </div>
        <div class="boxname-actions">
          <el-button-group>
            <el-button
              type="primary"
              size="small"
              :disabled="!isBoxNameChanged"
              :loading="savingBoxName"
              @click="saveBoxName"
            >保存</el-button>
            <el-button
              size="small"
              :disabled="!isBoxNameChanged || savingBoxName"
              @click="cancelBoxName"
            >取消</el-button>
            <el-button
              size="small"
              @click="regenerateBoxName"
            >重新生成</el-button>
          </el-button-group>
        </div>
        <div class="form-tip">字母数字下划线，至少 20 字符</div>
      </div>

      <!-- 扫码同步 -->
      <div class="sync-section">
        <el-button
          type="primary"
          size="large"
          class="scan-btn"
          @click="toggleScanner"
        >
          {{ scannerActive ? '关闭扫码' : '📷 扫码同步' }}
        </el-button>
        <div v-show="scannerActive" id="qr-reader" class="qr-scanner-container"></div>
        <div v-if="scanResult" class="scan-result">
          扫码结果：<strong>{{ scanResult }}</strong>
        </div>
      </div>

      <!-- 二维码 -->
      <div class="sync-section" v-if="qrDataUrl">
        <div class="sync-label">我的二维码（供其他设备扫描）</div>
        <div class="qr-container">
          <img :src="qrDataUrl" alt="QR Code" class="qr-image" />
        </div>
        <div class="qr-hint">其他设备扫描此二维码可获取 Box Name 并同步配置</div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import QRCode from 'qrcode'
import { useSettingStore } from '@/stores'
import { syncService } from '@/services'
import { generateJsonboxName } from '@/utils/validate'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'synced': []
}>()

const settingStore = useSettingStore()

const editingBoxName = ref('')
const savedBoxName = ref('')   // 上次保存的值，用于取消时恢复
const qrDataUrl = ref('')
const scannerActive = ref(false)
const scanResult = ref('')

let scannerInstance: any = null

const isBoxNameChanged = computed(() =>
  editingBoxName.value !== savedBoxName.value
)

async function generateQR(boxName: string) {
  if (!boxName) { qrDataUrl.value = ''; return }
  try {
    qrDataUrl.value = await QRCode.toDataURL(boxName, {
      width: 200, margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    })
  } catch { qrDataUrl.value = '' }
}

const savingBoxName = ref(false)

async function saveBoxName() {
  const name = editingBoxName.value.trim()
  if (!name || !/^[a-zA-Z0-9_]{20,}$/.test(name)) {
    ElMessage.warning('Box Name 格式不正确（字母数字下划线，至少 20 字符）')
    return
  }
  savingBoxName.value = true
  try {
    // 用新 boxId 试读一次，检测 jsonbox 是否接受该 id
    const { jsonboxApi } = await import('@/api/jsonbox')
    jsonboxApi.setBoxId(name)
    await jsonboxApi.read() // 正常返回 [] 或 null；无效 id 会抛错
    savedBoxName.value = name
    settingStore.setJsonboxName(name)
    generateQR(name)
    ElMessage.success('Box Name 已保存')
  } catch (e: any) {
    // 恢复 boxId 为上次有效值
    const { jsonboxApi } = await import('@/api/jsonbox')
    jsonboxApi.setBoxId(savedBoxName.value)
    ElMessage.error(`Box Name 无效：${e.message || '请检查格式'}`)
  } finally {
    savingBoxName.value = false
  }
}

function cancelBoxName() {
  editingBoxName.value = savedBoxName.value
}

function regenerateBoxName() {
  const name = generateJsonboxName()
  editingBoxName.value = name
  savedBoxName.value = name
  settingStore.setJsonboxName(name)
  generateQR(name)
  ElMessage.success('已重新生成 Box Name')
}

async function toggleScanner() {
  if (scannerActive.value) {
    stopScanner()
  } else {
    scannerActive.value = true
    await nextTick()
    startScanner()
  }
}

async function startScanner() {
  try {
    const { Html5QrcodeScanner } = await import('html5-qrcode')
    scannerInstance = new Html5QrcodeScanner('qr-reader', {
      fps: 10,
      qrbox: { width: 220, height: 220 },
      rememberLastUsedCamera: true
    }, false)

    scannerInstance.render(
      async (decodedText: string) => {
        scanResult.value = decodedText
        if (/^[a-zA-Z0-9_]{20,}$/.test(decodedText)) {
          editingBoxName.value = decodedText
          savedBoxName.value = decodedText
          settingStore.setJsonboxName(decodedText)
          generateQR(decodedText)
          stopScanner()
          ElMessage.success(`已同步 Box Name: ${decodedText}`)
          try {
            await syncService.syncFromCloud()
            ElMessage.success('配置已从云端下载')
            emit('synced')
          } catch (e: any) {
            ElMessage.error('下载失败: ' + (e.message || ''))
          }
        } else {
          ElMessage.warning('无效的二维码内容')
        }
      },
      (_error: string) => { /* 持续扫描，忽略单次失败 */ }
    )
  } catch (e: any) {
    ElMessage.error('无法启动摄像头: ' + (e.message || '请检查权限'))
    scannerActive.value = false
  }
}

function stopScanner() {
  if (scannerInstance) {
    try { scannerInstance.clear() } catch { /* ignore */ }
    scannerInstance = null
  }
  scannerActive.value = false
}

function onDialogClosed() {
  stopScanner()
  scanResult.value = ''
}

watch(() => props.visible, async (val) => {
  if (val) {
    const name = settingStore.jsonboxName
    editingBoxName.value = name
    savedBoxName.value = name
    await generateQR(name)
  }
})
</script>

<style scoped>
.sync-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sync-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sync-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.boxname-edit-row {
  display: flex;
  gap: 8px;
}

.boxname-actions {
  display: flex;
  gap: 0;
}

.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.scan-btn {
  width: 100%;
  font-size: 16px;
  height: 48px;
}

.qr-container {
  display: flex;
  justify-content: center;
  padding: 12px;
}

.qr-image {
  width: 200px;
  height: 200px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
}

.qr-hint {
  text-align: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.qr-scanner-container {
  margin-top: 8px;
  border-radius: 8px;
  overflow: hidden;
}

.scan-result {
  font-size: 13px;
  padding: 8px;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
  margin-top: 8px;
}
</style>
