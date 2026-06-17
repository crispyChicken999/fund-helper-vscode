<template>
  <!-- 只有在 Netlify 站点才显示 -->
  <Teleport to="body">
    <Transition name="migration-fade">
      <div v-if="visible" class="migration-overlay" @click.self="handleOverlayClick">
        <div class="migration-dialog">
          <!-- 头部 -->
          <div class="migration-header">
            <div class="migration-warning-icon">⚠️</div>
            <h2 class="migration-title">站点迁移通知</h2>
            <button class="migration-close" @click="handleClose" title="关闭">&times;</button>
          </div>

          <!-- 内容 -->
          <div class="migration-body">
            <p class="migration-intro">
              基金助手已迁移至新的主站点，当前 Netlify 站点即将停止更新和维护。
            </p>
            <p class="migration-reason">
              Netlify 免费额度有限（每月 300 积分，每次部署消耗约 15 积分），不适合频繁更新。新站点使用 Cloudflare Pages 托管，速度更快且无限制。
            </p>

            <!-- 当前站点信息 -->
            <div class="hostname-box">
              <span class="hostname-label">当前站点：</span>
              <span class="hostname-value">{{ currentHostname }}</span>
              <button class="copy-btn" @click="copyHostname" :title="copySuccess ? '已复制' : '点击复制'">
                {{ copySuccess ? '✓' : '📋' }}
              </button>
            </div>

            <!-- Box Name 信息（如果有） -->
            <div v-if="boxName" class="hostname-box">
              <span class="hostname-label">Box Name：</span>
              <span class="hostname-value hostname-value--box">{{ boxName }}</span>
              <button class="copy-btn" @click="copyBoxName" :title="boxCopySuccess ? '已复制' : '点击复制'">
                {{ boxCopySuccess ? '✓' : '📋' }}
              </button>
            </div>
            <p v-if="boxName" class="migration-hint">
              请前往新站点设置页，粘贴上方 Box Name 即可同步数据。
            </p>

            <!-- 站点跳转按钮 -->
            <div class="migration-actions">
              <a
                :href="mainSiteUrl"
                class="migration-btn migration-btn--primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span class="btn-icon">🚀</span>
                <span class="btn-text">
                  前往主站点
                  <small>fund-helper.ccwu.cc</small>
                </span>
              </a>
              <a
                :href="secondarySiteUrl"
                class="migration-btn migration-btn--secondary"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span class="btn-icon">🔗</span>
                <span class="btn-text">
                  前往备用站点
                  <small>GitHub Pages</small>
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSettingStore } from '@/stores'

const settingStore = useSettingStore()

const visible = ref(false)
const copySuccess = ref(false)
const boxCopySuccess = ref(false)

const currentHostname = computed(() => window.location.hostname)

const boxName = computed(() => settingStore.jsonboxName)

const mainSiteUrl = computed(() => `https://fund-helper.ccwu.cc/settings`)
const secondarySiteUrl = computed(
  () => `https://crispychicken999.github.io/fund-helper-vscode/settings`
)

function isNetlifySite(): boolean {
  return window.location.hostname === 'fund-helper.netlify.app'
}

function handleClose() {
  visible.value = false
}

function handleOverlayClick() {
  // 不关闭，防止误触 - 必须点 X 关闭
}

async function copyHostname() {
  try {
    await navigator.clipboard.writeText(currentHostname.value)
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 2000)
  } catch {
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = currentHostname.value
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 2000)
  }
}

async function copyBoxName() {
  if (!boxName.value) return
  try {
    await navigator.clipboard.writeText(boxName.value)
    boxCopySuccess.value = true
    setTimeout(() => { boxCopySuccess.value = false }, 2000)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = boxName.value
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    boxCopySuccess.value = true
    setTimeout(() => { boxCopySuccess.value = false }, 2000)
  }
}

onMounted(() => {
  if (isNetlifySite()) {
    visible.value = true
  }
})
</script>

<style scoped>
.migration-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  padding: 16px;
}

.migration-dialog {
  background: var(--el-bg-color);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 480px;
  width: 100%;
  overflow: hidden;
  animation: dialog-in 0.3s ease-out;
}

@keyframes dialog-in {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.migration-header {
  display: flex;
  align-items: center;
  padding: 20px 20px 12px;
  gap: 12px;
}

.migration-warning-icon {
  font-size: 28px;
  line-height: 1;
}

.migration-title {
  flex: 1;
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.migration-close {
  background: var(--el-fill-color);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  font-size: 18px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.migration-close:hover {
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}

.migration-body {
  padding: 0 20px 20px;
}

.migration-intro {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--el-text-color-primary);
  font-weight: 500;
  line-height: 1.6;
}

.migration-reason {
  margin: 0 0 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.hostname-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
  margin-bottom: 8px;
}

.hostname-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  font-weight: 500;
  white-space: nowrap;
}

.hostname-value {
  flex: 1;
  font-size: 13px;
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
  color: var(--el-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hostname-value--box {
  color: var(--el-color-success);
}

.copy-btn {
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-5);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  color: var(--el-color-primary);
}

.copy-btn:hover {
  background: var(--el-color-primary-light-5);
}

.migration-hint {
  margin: 0 0 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.migration-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.migration-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 10px;
  text-decoration: none;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.migration-btn--primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
}

.migration-btn--primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.migration-btn--secondary {
  background: var(--el-fill-color);
  color: var(--el-text-color-primary);
  border: 1px solid var(--el-border-color);
}

.migration-btn--secondary:hover {
  background: var(--el-fill-color-light);
  transform: translateY(-1px);
}

.btn-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.btn-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.btn-text small {
  font-size: 11px;
  font-weight: 400;
  opacity: 0.8;
}

/* 过渡动画 */
.migration-fade-enter-active,
.migration-fade-leave-active {
  transition: opacity 0.3s ease;
}

.migration-fade-enter-from,
.migration-fade-leave-to {
  opacity: 0;
}

/* 移动端适配 */
@media (max-width: 480px) {
  .migration-dialog {
    max-width: 100%;
    border-radius: 12px;
  }

  .migration-header {
    padding: 16px 16px 8px;
  }

  .migration-body {
    padding: 0 16px 16px;
  }

  .migration-actions {
    flex-direction: column;
  }

  .migration-title {
    font-size: 16px;
  }
}
</style>
