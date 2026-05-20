<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="visible"
        class="pending-overlay"
        @click.self="$emit('dismiss')"
      >
        <div class="pending-panel">
          <div class="pending-panel-header">
            <span class="pending-panel-title">净值已更新，确认加仓？</span>
          </div>

          <div class="pending-panel-body">
            <p class="pending-hint">
              以下基金的买入日净值已更新，请确认是否加仓：
            </p>

            <div class="pending-confirm-list">
              <div
                v-for="item in enrichedItems"
                :key="item.record.id"
                class="pending-confirm-card"
              >
                <div class="confirm-card-header">
                  <span class="confirm-fund-name">{{ item.record.name }}</span>
                  <span class="confirm-fund-code">{{ item.record.code }}</span>
                </div>
                <div class="confirm-row">
                  <span class="confirm-label">买入日期</span>
                  <span>{{ item.record.buyDate }}</span>
                </div>
                <div class="confirm-row">
                  <span class="confirm-label">买入净值</span>
                  <span>{{ item.record.navOnBuyDate?.toFixed(4) }}</span>
                </div>
                <div class="confirm-row">
                  <span class="confirm-label">买入金额</span>
                  <span>{{ item.record.amount.toFixed(2) }} 元</span>
                </div>
                <div class="confirm-row">
                  <span class="confirm-label">新增份额</span>
                  <span class="positive"
                    >+{{ item.addShares.toFixed(2) }} 份</span
                  >
                </div>
                <div class="confirm-divider"></div>
                <div class="confirm-row">
                  <span class="confirm-label">新总份额</span>
                  <span
                    >{{ item.oldShares.toFixed(2) }} →
                    <strong>{{ item.newShares.toFixed(2) }}</strong> 份</span
                  >
                </div>
                <div class="confirm-row">
                  <span class="confirm-label">新成本价</span>
                  <span
                    >{{ item.oldCost.toFixed(4) }} →
                    <strong>{{ item.newCost.toFixed(4) }}</strong></span
                  >
                </div>
                <div class="confirm-row">
                  <span class="confirm-label">持仓总额</span>
                  <span
                    >{{ item.oldAmount.toFixed(2) }} →
                    <strong>{{ item.newAmount.toFixed(2) }}</strong> 元</span
                  >
                </div>
              </div>
            </div>
          </div>

          <div class="pending-panel-footer">
            <button class="pending-btn-dismiss" @click="$emit('dismiss')">
              稍后再说
            </button>
            <button
              class="pending-btn-confirm"
              :disabled="confirming"
              @click="handleConfirm"
            >
              <span v-if="confirming">确认中...</span>
              <span v-else>全部确认加仓</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { ElMessage } from "element-plus";
import { useFundStore } from "@/stores";
import {
  confirmPendingBuys,
  type BuyRecord,
} from "@/services/pendingBuyService";
import { fundService } from "@/services";

const props = defineProps<{
  visible: boolean;
  readyList: BuyRecord[];
}>();

const emit = defineEmits<{
  (e: "dismiss"): void;
  (e: "confirmed"): void;
}>();

const confirming = ref(false);
const fundStore = useFundStore();

const enrichedItems = computed(() => {
  return props.readyList.map((record) => {
    const fund = fundStore.getFund(record.code);
    const oldShares = fund?.num ?? 0;
    const oldCost = fund?.cost ?? 0;
    const nav = record.navOnBuyDate ?? 0;
    const addShares = nav > 0 ? record.amount / nav : 0;
    const newShares = oldShares + addShares;
    const newCost =
      newShares > 0 ? (oldCost * oldShares + nav * addShares) / newShares : nav;
    const oldAmount = oldShares * oldCost;
    const newAmount = newShares * newCost;
    return {
      record,
      oldShares,
      oldCost,
      addShares,
      newShares,
      newCost,
      oldAmount,
      newAmount,
    };
  });
});

async function handleConfirm() {
  confirming.value = true;
  try {
    await confirmPendingBuys(props.readyList);
    await fundService.refreshAllFunds();
    ElMessage.success(`已确认 ${props.readyList.length} 笔加仓`);
    emit("confirmed");
  } catch (e: any) {
    ElMessage.error(e?.message || "操作失败");
  } finally {
    confirming.value = false;
  }
}
</script>

<style scoped>
.pending-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.pending-panel {
  background: var(--el-bg-color);
  width: 100%;
  max-width: 540px;
  max-height: 80vh;
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

@media (min-width: 600px) {
  .pending-overlay {
    align-items: center;
  }
  .pending-panel {
    border-radius: 12px;
    max-height: 75vh;
  }
}

.pending-panel-header {
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.pending-panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.pending-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.pending-hint {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin: 0 0 4px;
}

.pending-confirm-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pending-confirm-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
  padding: 12px;
  background: var(--el-fill-color-blank);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.confirm-card-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 2px;
}

.confirm-fund-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.confirm-fund-code {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.confirm-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.confirm-label {
  color: var(--el-text-color-secondary);
  min-width: 60px;
}

.confirm-divider {
  height: 1px;
  background: var(--el-border-color-lighter);
  margin: 2px 0;
}

.positive {
  color: var(--el-color-danger);
}

.pending-panel-footer {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.pending-btn-dismiss {
  flex: 1;
  padding: 9px 0;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-regular);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.pending-btn-dismiss:hover {
  background: var(--el-fill-color-light);
}

.pending-btn-confirm {
  flex: 2;
  padding: 9px 0;
  border: none;
  border-radius: 8px;
  background: var(--el-color-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.pending-btn-confirm:hover:not(:disabled) {
  background: var(--el-color-primary-dark-2);
}
.pending-btn-confirm:disabled {
  background: var(--el-color-primary-light-5);
  cursor: not-allowed;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-active .pending-panel,
.modal-fade-leave-active .pending-panel {
  transition: transform 0.25s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-from .pending-panel {
  transform: translateY(40px);
}
</style>
