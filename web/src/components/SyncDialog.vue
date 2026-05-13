<template>
  <el-dialog
    :model-value="visible"
    title="数据同步"
    width="92%"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
    @closed="onDialogClosed"
  >
    <div class="sync-dialog-body">
      <!-- Box Name 显示 -->
      <div class="sync-section">
        <div class="sync-label">当前 Box Name</div>
        <div class="sync-box-name">
          <el-input v-model="localBoxName" placeholder="box_xxxxxxxx" size="small" />
          <el-button size="small" @click="applyBoxName">应用</el-button>
          <el-button size="small" @click="regenerateBoxName">重新生成</el-button>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="sync-section">
        <div class="sync-actions">
          <el-button type="primary" size="small" :loading="uploading" @click="handleUpload">
            上传配置
          </el-button>
          <el-button size="small" :loading="downloading" @click="handleDownload">
            下载配置
          </el-button>
          <el-button size="small" type="danger" plain @click="handleClear">
            清空远程
          </el-button>
        </div>
      </div>

      <!-- 二维码显示 -->
      <div class="sync-section" v-if="qrDataUrl">
        <div class="sync-label">扫码同步（内容为 Box Name）</div>
        <div class="qr-container">
          <img :src="qrDataUrl" alt="QR Code" class="qr-image" />
        </div>
        <div class="qr-hint">使用其他设备扫描此二维码可同步配置</div>
      </div>

      <!-- 扫码区域 -->
      <div class="sync-section">
        <el-button size="small" @click="toggleScanner">
          {{ scannerActive ? '关闭扫码' : '📷 扫码同步' }}
        </el-button>
        <div v-show="scannerActive" id="qr-reader" class="qr-scanner-container"></div>
        <div v-if="scanResult" class="scan-result">
          扫码结果：<strong>{{ scanResult }}</strong>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import QRCode from 'qrcode'
import { useSettingStore, useSyncStore } from '@/stores'
import { syncService } from '@/services'
import { storageService } from '@/services/storageService'
import { generateJsonboxName } from '@/utils/validate'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'synced': []
}>()

const settingStore = useSettingStore()
const syncStore = useSyncStore()

const localBoxName = ref('')
const qrDataUrl = ref('')
const uploading = ref(false)
const downloading = ref(false)
const scannerActive = ref(false)
const scanResult = ref('')

let scannerInstance: any = null

// Generate QR code from boxName
async function generateQR(boxName: string) {
  if (!boxName) {
    qrDataUrl.value = ''
    return
  }
  try {
    qrDataUrl.value = await QRCode.toDataURL(boxName, {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    })
  } catch {
    qrDataUrl.value = ''
  }
}

function applyBoxName() {
  const name = localBoxName.value.trim()
  if (!name) {
    ElMessage.warning('请输入 Box Name')
    return
  }
  settingStore.setJsonboxName(name)
  generateQR(name)
  ElMessage.success('Box Name 已更新')
}

function regenerateBoxName() {
  const name = generateJsonboxName()
  localBoxName.value = name
  settingStore.setJsonboxName(name)
  generateQR(name)
  ElMessage.success('已重新生成 Box Name')
}

async function handleUpload() {
  if (!settingStore.jsonboxName) {
    ElMessage.warning('请先设置 Box Name')
    return
  }
  uploading.value = true
  try {
    await syncService.syncToCloud()
    ElMessage.success('配置已上传到云端')
  } catch (e: any) {
    ElMessage.error('上传失败: ' + (e.message || '未知错误'))
  } finally {
    uploading.value = false
  }
}

async function handleDownload() {
  if (!settingStore.jsonboxName) {
    ElMessage.warning('请先设置 Box Name')
    return
  }
  downloading.value = true
  try {
    await syncService.syncFromCloud()
    ElMessage.success('配置已从云端下载')
    emit('synced')
  } catch (e: any) {
    ElMessage.error('下载失败: ' + (e.message || '未知错误'))
  } finally {
    downloading.value = false
  }
}

async function handleClear() {
  try {
    await ElMessageBox.confirm('确定清空远程配置？此操作不可恢复。', '确认', { type: 'warning' })
    await syncService.resetBox()
    ElMessage.success('远程配置已清空')
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '操作失败')
  }
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
      (decodedText: string) => {
        scanResult.value = decodedText
        if (decodedText.startsWith('box_')) {
          localBoxName.value = decodedText
          settingStore.setJsonboxName(decodedText)
          generateQR(decodedText)
          stopScanner()
          ElMessage.success(`已同步 Box Name: ${decodedText}`)
          // Auto download
          handleDownload()
        } else {
          ElMessage.warning('无效的二维码内容，需要以 box_ 开头')
        }
      },
      (_error: string) => {
        // Scan error, ignore (continuous scanning)
      }
    )
  } catch (e: any) {
    ElMessage.error('无法启动摄像头: ' + (e.message || '请检查权限'))
    scannerActive.value = false
  }
}

function stopScanner() {
  if (scannerInstance) {
    try {
      scannerInstance.clear()
    } catch { /* ignore */ }
    scannerInstance = null
  }
  scannerActive.value = false
}

function onDialogClosed() {
  stopScanner()
  scanResult.value = ''
}

// Initialize when dialog opens
watch(() => props.visible, async (val) => {
  if (val) {
    localBoxName.value = settingStore.jsonboxName
    await generateQR(settingStore.jsonboxName)
  }
})
</script>

<style scoped>
.sync-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.sync-box-name {
  display: flex;
  gap: 8px;
  align-items: center;
}

.sync-box-name .el-input {
  flex: 1;
}

.sync-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
