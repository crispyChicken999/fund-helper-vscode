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
        <div class="sync-label">Box Name</div>
        <div class="sync-box-name">
          <code class="box-name-text">{{ localBoxName || '未设置' }}</code>
        </div>
      </div>

      <!-- 扫码同步按钮（优先显示） -->
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

      <!-- 二维码显示 -->
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
import { ref, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import QRCode from 'qrcode'
import { useSettingStore } from '@/stores'
import { syncService } from '@/services'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'synced': []
}>()

const settingStore = useSettingStore()

const localBoxName = ref('')
const qrDataUrl = ref('')
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
        // Accept any valid box name (alphanumeric + underscore, 20+ chars)
        if (/^[a-zA-Z0-9_]{20,}$/.test(decodedText)) {
          localBoxName.value = decodedText
          settingStore.setJsonboxName(decodedText)
          generateQR(decodedText)
          stopScanner()
          ElMessage.success(`已同步 Box Name: ${decodedText}`)
          // Auto download
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

.sync-box-name {
  display: flex;
  align-items: center;
}

.box-name-text {
  font-size: 13px;
  padding: 6px 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
  word-break: break-all;
  color: var(--el-text-color-regular);
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
