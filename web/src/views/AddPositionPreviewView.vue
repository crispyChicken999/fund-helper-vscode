<template>
  <DetailLayout>
    <template #header>
      <div class="detail-header">
        <div class="header-left">
          <el-button plain :icon="ArrowLeft" @click="goBack" round
            >返回</el-button
          >
          <div class="header-info">
            <span class="fund-name">{{ displayName }}</span>
            <div class="fund-code-row">
              <div class="fund-code-row-wrap">
                <span class="fund-code">{{ props.code }}</span>
                <span
                  v-if="rowBefore"
                  class="header-rate"
                  :class="toneClass(rowBefore.holdingGainRate)"
                >
                  {{ fmtPct(rowBefore.holdingGainRate) }}
                </span>
                <div class="fund-nav-btns">
                  <el-button
                    size="small"
                    text
                    :title="
                      prevCode ? `上一个：${prevCode}` : '第一个，触底回到最后一个'
                    "
                    @click="navigateTo(prevCode ?? lastCode)"
                    >‹</el-button
                  >
                  <span class="fund-nav-pos">{{ positionText }}</span>
                  <el-button
                    size="small"
                    text
                    :title="
                      nextCode ? `下一个：${nextCode}` : '最后一个，触底回到第一个'
                    "
                    @click="navigateTo(nextCode ?? firstCode)"
                    >›</el-button
                  >
                </div>
              </div>
              <el-popover placement="bottom" title="快捷操作" :width="230">
                <template #reference>
                  <el-icon class="swipe-hint-icon"><QuestionFilled /></el-icon>
                </template>
                <div class="shortcut-hint">
                  <p>
                    <kbd>←</kbd> <kbd>→</kbd> / <kbd>W</kbd> <kbd>S</kbd>：切换基金
                  </p>
                  <p><kbd>1</kbd> ~ <kbd>8</kbd>：选择第 N 档快捷金额</p>
                  <p><kbd>Enter</kbd>：确认加仓</p>
                  <p><kbd>Esc</kbd>：返回列表</p>
                  <p>移动端：左右滑动切换基金</p>
                </div>
              </el-popover>
            </div>
          </div>
        </div>
        <el-button
          size="small"
          :loading="refreshing"
          @click="handleRefresh"
          round
        >
          <el-icon><Refresh /></el-icon>
        </el-button>
      </div>

      <!-- 金额条：常驻，点档位即时重算 -->
      <div class="amount-bar">
        <div class="amount-row">
          <span class="amount-label">加仓金额</span>
          <el-input-number
            v-model="amountInput"
            class="amount-input"
            :min="0"
            :max="99999999"
            :step="100"
            :controls="true"
            aria-label="加仓金额"
            @change="rememberAmount"
          />
          <span class="amount-unit">元</span>
          <span class="buy-nav" v-if="buyNav > 0">
            买入净值 <strong>{{ buyNav.toFixed(4) }}</strong>
            <em v-if="buyDate">（{{ buyDate }}）</em>
          </span>
        </div>
        <el-scrollbar ref="chipScrollRef" class="chips-wrap">
          <div class="chips-inner">
            <span
              v-for="(item, idx) in quickAmounts"
              :key="item"
              class="amount-chip"
              :class="{ active: isActiveChip(item) }"
              :title="`快捷加仓 ${formatThousands(item, 0)} 元（快捷键 ${idx + 1}）`"
              @click="pickQuickAmount(item)"
            >
              {{ chipLabel(item) }}
            </span>
            <span v-if="ratioAmounts.length" class="amount-chip-ratio">
              <span
                v-for="r in ratioAmounts"
                :key="r.key"
                class="amount-chip ratio"
                :class="{ active: isActiveChip(r.amount) }"
                :title="`加仓 ${formatThousands(r.amount, 0)} 元`"
                @click="pickQuickAmount(r.amount)"
                >{{ r.label }}</span
              >
            </span>
          </div>
        </el-scrollbar>
      </div>
    </template>

    <div
      class="preview-main"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <div v-if="!fund" class="empty-state">
        <div class="empty-title">该基金不在持仓列表中</div>
        <el-button round @click="goBack">返回列表</el-button>
      </div>

      <div v-else-if="!rowBefore" class="empty-state">
        <div class="empty-title">正在获取基金数据…</div>
      </div>

      <div v-else-if="buyNav <= 0" class="empty-state">
        <div class="empty-title">未获取到该基金的有效净值</div>
        <div class="empty-sub">请刷新后重试，或回到列表确认净值后再预览</div>
        <el-button round :loading="refreshing" @click="handleRefresh"
          >刷新数据</el-button
        >
      </div>

      <template v-else-if="preview">
        <!-- 结论卡 -->
        <section class="conclusion-card" :class="{ bump: bumping }">
          <div class="conclusion-head">
            <span class="conclusion-title">加仓 {{ moneyText(amount) }} 后</span>
            <span class="conclusion-fund">{{ displayName }}</span>
          </div>
          <div class="conclusion-grid">
            <div class="concl-item">
              <span class="concl-label">总收益率</span>
              <span class="concl-before">{{
                fmtPct(preview.before.gainRate)
              }}</span>
              <span class="concl-after" :class="toneClass(preview.after.gainRate)">{{
                fmtPct(preview.after.gainRate, true)
              }}</span>
              <el-tooltip
                placement="top"
                :show-after="120"
                :disabled="!conclusionTips.rate.length"
              >
                <span
                  class="concl-delta"
                  :class="[
                    toneClass(preview.gainRateDelta),
                    { 'is-pp': isPp(conclusionDeltas.rate) },
                  ]"
                  >{{ conclusionDeltas.rate }}</span
                >
                <template #content>
                  <div class="pp-tip">
                    <div
                      v-for="(line, idx) in conclusionTips.rate"
                      :key="idx"
                      >{{ line }}</div
                    >
                  </div>
                </template>
              </el-tooltip>
            </div>
            <div class="concl-item">
              <span class="concl-label">持有收益</span>
              <span class="concl-before">{{ signedMoney(preview.before.gain) }}</span>
              <span
                class="concl-after"
                :class="toneClass(preview.after.gain)"
                >{{ signedMoney(preview.after.gain) }}</span
              >
              <span class="concl-delta" :class="toneClass(preview.gainDelta)">{{
                conclusionDeltas.gain
              }}</span>
            </div>
            <div class="concl-item">
              <span class="concl-label">回本还需涨</span>
              <span class="concl-before">{{
                breakEvenText(preview.before.breakEvenRisePct)
              }}</span>
              <span class="concl-after">{{
                breakEvenText(preview.after.breakEvenRisePct)
              }}</span>
              <el-tooltip
                placement="top"
                :show-after="120"
                :disabled="!conclusionTips.be.length"
              >
                <span
                  class="concl-delta"
                  :class="{ 'is-pp': isPp(conclusionDeltas.be) }"
                  >{{ conclusionDeltas.be }}</span
                >
                <template #content>
                  <div class="pp-tip">
                    <div
                      v-for="(line, idx) in conclusionTips.be"
                      :key="idx"
                      >{{ line }}</div
                    >
                  </div>
                </template>
              </el-tooltip>
            </div>
          </div>
          <div class="conclusion-tip">{{ conclusionTip }}</div>
        </section>

        <!-- 加仓明细 -->
        <section class="holding-section">
          <div class="section-title">加仓明细</div>
          <div class="info-grid-2col">
            <div class="grid-item">
              <span class="g-label">加仓金额</span>
              <span class="g-value">{{ moneyText(amount) }}</span>
            </div>
            <div class="grid-item">
              <span class="g-label">买入净值</span>
              <span class="g-value">{{ buyNav.toFixed(4) }}</span>
              <span class="g-sub">{{ buyDate ? `净值日 ${buyDate}` : "最新净值" }}</span>
            </div>
            <div class="grid-item">
              <span class="g-label">新增份额</span>
              <span class="g-value positive"
                >+{{ fmtNum(preview.addShares) }} 份</span
              >
            </div>
            <div class="grid-item">
              <span class="g-label">加仓前持有市值</span>
              <span class="g-value">{{ moneyText(preview.before.marketValue) }}</span>
            </div>
            <div class="grid-item">
              <span class="g-label">加仓金额 / 现持仓</span>
              <span class="g-value">{{
                preview.amountToHoldingPct > 0
                  ? `${preview.amountToHoldingPct.toFixed(1)}%`
                  : "—"
              }}</span>
            </div>
            <div class="grid-item">
              <span class="g-label">最新单位净值</span>
              <span class="g-value">{{ rowBefore.dwjz.toFixed(4) }}</span>
            </div>
          </div>
        </section>

        <!-- 持仓变化 -->
        <section class="holding-section">
          <div class="section-title">
            持仓变化（加仓前 → 加仓后）
            <el-tooltip placement="top" :show-after="120">
              <el-icon class="section-hint"><QuestionFilled /></el-icon>
              <template #content>
                <div class="pp-tip">
                  <div v-for="(line, idx) in CHANGE_TIP" :key="idx">{{ line }}</div>
                </div>
              </template>
            </el-tooltip>
          </div>
          <div class="change-list">
            <div v-for="item in changeRows" :key="item.key" class="change-row">
              <span class="change-label">{{ item.label }}</span>
              <span class="change-values">
                <span class="change-before">{{ item.before }}</span>
                <span class="change-arrow">→</span>
                <span
                  class="change-after"
                  :class="item.tone ? toneClass(item.tone) : ''"
                  >{{ item.after }}</span
                >
              </span>
              <el-tooltip
                placement="top"
                :show-after="120"
                :disabled="!item.deltaTip?.length"
              >
                <span
                  class="change-delta"
                  :class="[
                    item.deltaTone ? toneClass(item.deltaTone) : '',
                    { 'is-pp': isPp(item.delta) },
                  ]"
                  >{{ item.delta }}</span
                >
                <template #content>
                  <div class="pp-tip">
                    <div v-for="(line, idx) in item.deltaTip || []" :key="idx">{{
                      line
                    }}</div>
                  </div>
                </template>
              </el-tooltip>
            </div>
          </div>
        </section>

        <!-- 组合影响 -->
        <section class="holding-section">
          <div class="section-title">组合影响</div>
          <div class="change-list compact">
            <div
              v-for="item in portfolioRows"
              :key="item.key"
              class="change-row"
            >
              <span class="change-label">{{ item.label }}</span>
              <span class="change-values">
                <span class="change-before">{{ item.before }}</span>
                <span class="change-arrow">→</span>
                <span
                  class="change-after"
                  :class="item.tone ? toneClass(item.tone) : ''"
                  >{{ item.after }}</span
                >
              </span>
              <el-tooltip
                placement="top"
                :show-after="120"
                :disabled="!item.deltaTip?.length"
              >
                <span
                  class="change-delta"
                  :class="[
                    item.deltaTone ? toneClass(item.deltaTone) : '',
                    { 'is-pp': isPp(item.delta) },
                  ]"
                  >{{ item.delta }}</span
                >
                <template #content>
                  <div class="pp-tip">
                    <div v-for="(line, idx) in item.deltaTip || []" :key="idx">{{
                      line
                    }}</div>
                  </div>
                </template>
              </el-tooltip>
            </div>
          </div>
        </section>

        <!-- 不变字段 -->
        <section class="holding-section">
          <div class="section-title">加仓后不变的字段</div>
          <div class="info-grid-2col muted-grid">
            <div class="grid-item">
              <span class="g-label">当日涨幅</span>
              <span class="g-value">{{ fmtPct(rowBefore.navChgRt) }}</span>
            </div>
            <div class="grid-item">
              <span class="g-label">估算涨幅</span>
              <span class="g-value">{{
                rowBefore.shouldShowEstimated ? fmtPct(rowBefore.gszzl) : "—"
              }}</span>
            </div>
            <div class="grid-item">
              <span class="g-label">单位净值</span>
              <span class="g-value">{{ rowBefore.dwjz.toFixed(4) }}</span>
            </div>
            <div class="grid-item">
              <span class="g-label">估算净值</span>
              <span class="g-value">{{
                rowBefore.displayGsz > 0 ? rowBefore.displayGsz.toFixed(4) : "—"
              }}</span>
            </div>
            <div class="grid-item">
              <span class="g-label">净值日期</span>
              <span class="g-value">{{ rowBefore.navDateLabel || "—" }}</span>
            </div>
            <div class="grid-item">
              <span class="g-label">关联板块</span>
              <span class="g-value">{{ rowBefore.relateTheme || "—" }}</span>
            </div>
            <div class="grid-item">
              <span class="g-label">更新时间</span>
              <span class="g-value">{{
                rowBefore.fullUpdateTime || rowBefore.updateTime || "—"
              }}</span>
            </div>
          </div>
        </section>

        <div class="page-tip">
          加仓按所选净值直接写入持仓（仅本地保存，不自动云同步）。
        </div>
      </template>
    </div>

    <template #footer>
      <div class="confirm-bar">
        <div class="confirm-info">
          <div class="confirm-title">
            加仓 <span>{{ moneyText(amount) }}</span>
            <span class="confirm-name">· {{ displayName }}</span>
          </div>
          <div class="confirm-sub" v-if="preview">
            总收益率 {{ fmtPct(preview.before.gainRate) }} →
            <strong :class="toneClass(preview.after.gainRate)">{{
              fmtPct(preview.after.gainRate)
            }}</strong>
          </div>
        </div>
        <div class="confirm-actions">
          <el-button round @click="goBack">取消</el-button>
          <el-button
            type="primary"
            round
            :loading="submitting"
            :disabled="!canConfirm"
            @click="handleConfirm"
          >
            确认加仓
          </el-button>
        </div>
      </div>
    </template>
  </DetailLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { ArrowLeft, Refresh, QuestionFilled } from "@element-plus/icons-vue";
import DetailLayout from "@/layouts/DetailLayout.vue";
import { useFundStore } from "@/stores";
import { fundService } from "@/services";
import { normalizeFundInfo } from "@/utils/fundInfoNormalize";
import {
  buildFundRowDisplay,
  calculateSmartDailyGain,
  formatNetValueDate,
} from "@/utils/fundDisplay";
import {
  calculateAddPositionPreview,
  calculateAverageGainRate,
  calculateTotalAsset,
  calculateTotalHoldingGain,
} from "@/utils/calc";
import { getChinaMarketStatus } from "@/utils/marketChina";
import type { Fund } from "@/types";

interface Props {
  code: string;
}

const props = defineProps<Props>();

const router = useRouter();
const route = useRoute();
const fundStore = useFundStore();

// ==================== 常量 ====================

/** 快捷加仓金额档位 */
const QUICK_AMOUNTS = [500, 1000, 2000, 3000, 5000, 10000, 20000, 50000];
/** 上次加仓金额记忆 key */
const LAST_AMOUNT_KEY = "fund_helper_last_add_amount";
/** 滑动阈值（与基金详情页保持一致） */
const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY_THRESHOLD = 0.3;
const MAX_VERTICAL_DEVIATION = 80;
/** 变化表说明（多行，挂在「持仓变化」标题的 ⓘ 上） */
const CHANGE_TIP = [
  "每行左侧是加仓前，右侧是加仓后",
  "最右列是变化量：金额类为差值，百分比类为 pp（百分点）",
  "带虚线的 pp 数值可悬停查看具体算法",
];

// ==================== 状态 ====================

const amountInput = ref<number | undefined>(1000);
const refreshing = ref(false);
const submitting = ref(false);
const bumping = ref(false);
const marketStatus = ref(getChinaMarketStatus());
/** 快捷金额横向滚动容器（用于把当前档位滚到可视区） */
const chipScrollRef = ref<{ setScrollLeft: (v: number) => void } | null>(null);

/** 从加仓弹窗带入的买入净值（仅对来源基金生效，切换基金后改用该基金最新净值） */
const inheritedNav = ref<{ code: string; nav: number; date: string } | null>(
  null,
);

// ==================== 基金导航 ====================

const allFundCodes = computed(() => fundStore.funds.map((f) => f.code));
const currentIndex = computed(() => allFundCodes.value.indexOf(props.code));
const firstCode = computed<string | null>(() => allFundCodes.value[0] ?? null);
const lastCode = computed<string | null>(
  () => allFundCodes.value[allFundCodes.value.length - 1] ?? null,
);
const prevCode = computed<string | null>(() => {
  const i = currentIndex.value;
  return i > 0 ? (allFundCodes.value[i - 1] ?? null) : null;
});
const nextCode = computed<string | null>(() => {
  const i = currentIndex.value;
  return i >= 0 && i < allFundCodes.value.length - 1
    ? (allFundCodes.value[i + 1] ?? null)
    : null;
});
const positionText = computed(() =>
  allFundCodes.value.length
    ? `${currentIndex.value + 1} / ${allFundCodes.value.length}`
    : "—",
);

// ==================== 基金数据 ====================

const fund = computed<Fund | undefined>(() => fundStore.getFund(props.code));
const fundInfo = computed(() =>
  normalizeFundInfo(fundStore.fundDetails.get(props.code), props.code),
);
const rowBefore = computed(() => {
  const f = fund.value;
  const info = fundInfo.value;
  if (!f || !info) return null;
  return buildFundRowDisplay(f, info, marketStatus.value);
});
const displayName = computed(() => rowBefore.value?.name || props.code);

/** 买入净值：来源基金沿用弹窗所选净值，其它基金用最新单位净值 */
const buyNav = computed(() => {
  const inherited = inheritedNav.value;
  if (inherited && inherited.code === props.code && inherited.nav > 0)
    return inherited.nav;
  return fundInfo.value?.netValue ?? 0;
});
const buyDate = computed(() => {
  const inherited = inheritedNav.value;
  if (inherited && inherited.code === props.code && inherited.nav > 0)
    return formatNetValueDate(inherited.date);
  return formatNetValueDate(fundInfo.value?.netValueDate ?? "");
});

// ==================== 组合汇总 ====================

interface PortfolioTotals {
  asset: number;
  cost: number;
  gain: number;
  daily: number;
  avgRate: number;
  totalRate: number;
}

function computeTotals(funds: Fund[]): PortfolioTotals {
  const details = fundStore.fundDetails;
  const market = marketStatus.value;
  let cost = 0;
  let daily = 0;
  for (const f of funds) {
    const info = normalizeFundInfo(details.get(f.code), f.code);
    if (!info) continue;
    cost += (Number(f.cost) || 0) * (Number(f.num) || 0);
    daily += calculateSmartDailyGain(f, info, market);
  }
  const asset = calculateTotalAsset(funds, details);
  const gain = calculateTotalHoldingGain(funds, details);
  return {
    asset,
    cost,
    gain,
    daily,
    avgRate: calculateAverageGainRate(funds, details),
    totalRate: cost > 0 ? (gain / cost) * 100 : 0,
  };
}

const portfolioBefore = computed(() => computeTotals(fundStore.funds));
const portfolioAfter = computed(() => {
  const p = preview.value;
  if (!p) return portfolioBefore.value;
  const nextFunds = fundStore.funds.map((f) =>
    f.code === props.code ? { ...f, num: p.after.num, cost: p.after.cost } : f,
  );
  return computeTotals(nextFunds);
});

// ==================== 预览计算 ====================

const amount = computed(() => {
  const n = Number(amountInput.value);
  return Number.isFinite(n) && n > 0 ? n : 0;
});

const preview = computed(() => {
  const f = fund.value;
  const info = fundInfo.value;
  if (!f || !info) return null;
  return calculateAddPositionPreview(
    f,
    info,
    marketStatus.value,
    amount.value,
    buyNav.value,
    portfolioBefore.value.asset,
  );
});

const canConfirm = computed(
  () =>
    !!preview.value &&
    amount.value > 0 &&
    buyNav.value > 0 &&
    preview.value.addShares > 0 &&
    Number.isFinite(preview.value.after.num) &&
    Number.isFinite(preview.value.after.cost) &&
    !submitting.value,
);

const conclusionTip = computed(() => {
  const p = preview.value;
  if (!p) return "";
  const costPart =
    p.before.cost > 0 &&
    p.after.cost > 0 &&
    Math.abs(p.after.cost - p.before.cost) > 1e-9
      ? `成本价 ${p.before.cost.toFixed(4)} → ${p.after.cost.toFixed(4)}`
      : "成本价保持不变";
  return `${costPart}，份额 ${formatThousands(p.before.num)} → ${formatThousands(p.after.num)} 份`;
});

/** 结论卡的变化量文本（避免在模板里重复计算） */
const conclusionDeltas = computed(() => {
  const p = preview.value;
  if (!p) return { rate: "", gain: "", be: "" };
  return {
    rate: signedPct(pctDelta(p.before.gainRate, p.after.gainRate), "pp"),
    gain: deltaMoneyText(p.gainDelta),
    be: breakEvenDelta(p.before.breakEvenRisePct, p.after.breakEvenRisePct),
  };
});

/** 结论卡的 pp 说明（按当前数据生成，多行） */
const conclusionTips = computed<{ rate: string[]; be: string[] }>(() => {
  const p = preview.value;
  if (!p) return { rate: [], be: [] };

  const rateTip = ppTip(
    "总收益率",
    fmtPct(p.before.gainRate),
    fmtPct(p.after.gainRate),
    pctDelta(p.before.gainRate, p.after.gainRate),
  );

  const beBefore = p.before.breakEvenRisePct;
  const beAfter = p.after.breakEvenRisePct;
  const beTip =
    beBefore > 0.005 && beAfter > 0.005
      ? ppTip(
          "回本还需涨",
          fmtPct(beBefore, true),
          fmtPct(beAfter, true),
          pctDelta(beBefore, beAfter),
        )
      : [];

  return { rate: rateTip, be: beTip };
});

// ==================== 变化明细 ====================

interface ChangeRow {
  key: string;
  label: string;
  before: string;
  after: string;
  delta: string;
  /** 变化量的说明（多行，挂 el-tooltip；仅 pp 类变化量有） */
  deltaTip?: string[];
  tone?: number;
  deltaTone?: number;
}

const changeRows = computed<ChangeRow[]>(() => {
  const p = preview.value;
  if (!p) return [];

  const gainRateBefore = fmtPct(p.before.gainRate);
  const gainRateAfter = fmtPct(p.after.gainRate);
  const gainRateDelta = pctDelta(p.before.gainRate, p.after.gainRate);

  const posBefore = `${p.before.positionPct.toFixed(2)}%`;
  const posAfter = `${p.after.positionPct.toFixed(2)}%`;
  const posDelta = pctDelta(p.before.positionPct, p.after.positionPct);

  const beBefore = p.before.breakEvenRisePct;
  const beAfter = p.after.breakEvenRisePct;
  const beBothAbove = beBefore > 0.005 && beAfter > 0.005;
  const beDelta = beBothAbove ? pctDelta(beBefore, beAfter) : NaN;

  return [
    {
      key: "num",
      label: "持有份额",
      before: `${fmtNum(p.before.num)} 份`,
      after: `${fmtNum(p.after.num)} 份`,
      delta: `+${fmtNum(p.numDelta)}`,
    },
    {
      key: "cost",
      label: "成本价",
      before: p.before.cost.toFixed(4),
      after: p.after.cost.toFixed(4),
      delta: signedNumber(p.after.cost - p.before.cost, 4),
    },
    {
      key: "costAmount",
      label: "持有成本",
      before: moneyText(p.before.costAmount),
      after: moneyText(p.after.costAmount),
      delta: deltaMoneyText(amount.value),
    },
    {
      key: "marketValue",
      label: "持有市值",
      before: moneyText(p.before.marketValue),
      after: moneyText(p.after.marketValue),
      delta: deltaMoneyText(p.after.marketValue - p.before.marketValue),
    },
    {
      key: "gain",
      label: "持有收益",
      before: signedMoney(p.before.gain),
      after: signedMoney(p.after.gain),
      delta: deltaMoneyText(p.gainDelta),
      tone: p.after.gain,
      deltaTone: p.gainDelta,
    },
    {
      key: "gainRate",
      label: "总收益率",
      before: gainRateBefore,
      after: gainRateAfter,
      delta: signedPct(gainRateDelta, "pp"),
      deltaTip: ppTip("总收益率", gainRateBefore, gainRateAfter, gainRateDelta),
      tone: p.after.gainRate,
      deltaTone: gainRateDelta,
    },
    {
      key: "estimatedGain",
      label: "估算收益",
      before: signedMoney(p.before.estimatedGain),
      after: signedMoney(p.after.estimatedGain),
      delta: deltaMoneyText(p.after.estimatedGain - p.before.estimatedGain),
      tone: p.after.estimatedGain,
      deltaTone: p.after.estimatedGain - p.before.estimatedGain,
    },
    {
      key: "dailyGain",
      label: "当日收益",
      before: signedMoney(p.before.dailyGain),
      after: signedMoney(p.after.dailyGain),
      delta: deltaMoneyText(p.after.dailyGain - p.before.dailyGain),
      tone: p.after.dailyGain,
      deltaTone: p.after.dailyGain - p.before.dailyGain,
    },
    {
      key: "positionPct",
      label: "持有仓位",
      before: posBefore,
      after: posAfter,
      delta: signedPct(posDelta, "pp"),
      deltaTip: ppTip("持有仓位", posBefore, posAfter, posDelta),
    },
    {
      key: "breakEven",
      label: "回本还需涨",
      before: breakEvenText(beBefore),
      after: breakEvenText(beAfter),
      delta: breakEvenDelta(beBefore, beAfter),
      deltaTip: beBothAbove
        ? ppTip(
            "回本还需涨",
            fmtPct(beBefore, true),
            fmtPct(beAfter, true),
            beDelta,
          )
        : undefined,
    },
  ];
});

const portfolioRows = computed<ChangeRow[]>(() => {
  const before = portfolioBefore.value;
  const after = portfolioAfter.value;

  const totalRateBefore = fmtPct(before.totalRate);
  const totalRateAfter = fmtPct(after.totalRate);
  const totalRateDelta = pctDelta(before.totalRate, after.totalRate);

  const avgRateBefore = fmtPct(before.avgRate);
  const avgRateAfter = fmtPct(after.avgRate);
  const avgRateDelta = pctDelta(before.avgRate, after.avgRate);

  return [
    {
      key: "asset",
      label: "总资产",
      before: moneyText(before.asset),
      after: moneyText(after.asset),
      delta: deltaMoneyText(after.asset - before.asset),
    },
    {
      key: "gain",
      label: "总持有收益",
      before: signedMoney(before.gain),
      after: signedMoney(after.gain),
      delta: deltaMoneyText(after.gain - before.gain),
      tone: after.gain,
      deltaTone: after.gain - before.gain,
    },
    {
      key: "totalRate",
      label: "组合收益率",
      before: totalRateBefore,
      after: totalRateAfter,
      delta: signedPct(totalRateDelta, "pp"),
      deltaTip: ppTip(
        "组合收益率",
        totalRateBefore,
        totalRateAfter,
        totalRateDelta,
      ),
      tone: after.totalRate,
      deltaTone: totalRateDelta,
    },
    {
      key: "avgRate",
      label: "平均收益率",
      before: avgRateBefore,
      after: avgRateAfter,
      delta: signedPct(avgRateDelta, "pp"),
      deltaTip: ppTip("平均收益率", avgRateBefore, avgRateAfter, avgRateDelta),
      tone: after.avgRate,
      deltaTone: avgRateDelta,
    },
    {
      key: "daily",
      label: "总当日收益",
      before: signedMoney(before.daily),
      after: signedMoney(after.daily),
      delta: deltaMoneyText(after.daily - before.daily),
      tone: after.daily,
      deltaTone: after.daily - before.daily,
    },
  ];
});

// ==================== 快捷金额 ====================

const quickAmounts = QUICK_AMOUNTS;

const ratioAmounts = computed<{ key: string; label: string; amount: number }[]>(
  () => {
    const base = preview.value?.before.marketValue ?? 0;
    if (base <= 0) return [];
    return [
      { key: "r05", label: "半仓", amount: roundAmount(base * 0.5) },
      { key: "r1", label: "等额", amount: roundAmount(base) },
      { key: "r2", label: "双倍", amount: roundAmount(base * 2) },
    ];
  },
);

function roundAmount(v: number): number {
  if (!Number.isFinite(v) || v <= 0) return 0;
  if (v >= 10000) return Math.round(v / 1000) * 1000;
  if (v >= 1000) return Math.round(v / 100) * 100;
  return Math.round(v);
}

function pickQuickAmount(v: number) {
  if (!v || v <= 0) return;
  amountInput.value = v;
  rememberAmount();
  flashBump();
}

function isActiveChip(v: number): boolean {
  return amount.value > 0 && Math.abs(amount.value - v) < 0.5;
}

/** 把当前选中的金额档位滚到可视区中间（移动端档位多时必要） */
function centerActiveChip() {
  nextTick(() => {
    const inner = document.querySelector(
      ".chips-inner",
    ) as HTMLElement | null;
    if (!inner) return;
    const active = inner.querySelector(
      ".amount-chip.active",
    ) as HTMLElement | null;
    if (!active) return;
    const containerWidth = inner.parentElement?.clientWidth ?? inner.scrollWidth;
    const target = active.offsetLeft - containerWidth / 2 + active.offsetWidth / 2;
    chipScrollRef.value?.setScrollLeft(Math.max(0, target));
  });
}

// ==================== 格式化 ====================

function formatThousands(v: number, decimals = 2): string {
  if (!Number.isFinite(v)) return (0).toFixed(decimals);
  return v.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** 金额文本（无符号，负数带前导 -） */
function moneyText(v: number, decimals = 2): string {
  if (!Number.isFinite(v)) return "¥0.00";
  const sign = v < 0 ? "-" : "";
  return `${sign}¥${formatThousands(Math.abs(v), decimals)}`;
}

/** 带符号金额：+¥1,200.00 / -¥428.60 */
function signedMoney(v: number, decimals = 2): string {
  const n = Number.isFinite(v) ? v : 0;
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}¥${formatThousands(Math.abs(n), decimals)}`;
}

function deltaMoneyText(v: number, decimals = 2): string {
  if (!Number.isFinite(v)) return "—";
  if (Math.abs(v) < 0.005) return "持平";
  return signedMoney(v, decimals);
}

function fmtNum(v: number): string {
  return formatThousands(v);
}

function signedNumber(v: number, decimals = 2): string {
  if (!Number.isFinite(v)) return "—";
  if (Math.abs(v) < 1e-9) return "0";
  const sign = v > 0 ? "+" : "-";
  return `${sign}${Math.abs(v).toFixed(decimals)}`;
}

function fmtPct(v: number, withSign = false): string {
  if (!Number.isFinite(v)) return "—";
  const sign = v > 0 && withSign ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function signedPct(v: number, suffix = ""): string {
  if (!Number.isFinite(v)) return "—";
  if (Math.abs(v) < 0.005) return "持平";
  const sign = v > 0 ? "+" : "-";
  return `${sign}${Math.abs(v).toFixed(2)}${suffix}`;
}

/** 保留两位小数（用于让"显示值之差"与展示的百分比严格对得上） */
function round2(v: number): number {
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
}

/** 百分点差值：用页面上展示的两个百分比相减，避免出现 0.01 的对不上 */
function pctDelta(before: number, after: number): number {
  return round2(round2(after) - round2(before));
}

/** 变化量是否带 pp 单位（用于挂 tooltip / 虚线下划线） */
function isPp(text: string): boolean {
  return typeof text === "string" && text.endsWith("pp");
}

/**
 * 生成 pp 说明 tooltip（按当前行的真实数据，多行展示）
 * 数字差值统一来自 pctDelta，保证「等号两边」与页面上显示的数字一致。
 */
function ppTip(
  label: string,
  beforeText: string,
  afterText: string,
  delta: number,
): string[] {
  if (!Number.isFinite(delta) || Math.abs(delta) < 0.005) return [];
  const abs = Math.abs(delta).toFixed(2);
  const sign = delta > 0 ? "+" : "-";
  const verb = delta > 0 ? "提升" : "下降";
  const wrong = delta > 0 ? "上涨" : "下跌";
  return [
    "pp = 百分点（percentage point），两个百分比相减的单位",
    `${label}：${beforeText} → ${afterText}`,
    `变化量 = ${afterText} − (${beforeText}) = ${sign}${abs}pp`,
    `即${verb}了 ${abs} 个百分点，不是${wrong} ${abs}%`,
  ];
}

/** 回本距离：> 0 显示还需涨幅，<= 0 表示净值已高于成本价 */
function breakEvenText(v: number): string {
  if (!Number.isFinite(v)) return "—";
  return v > 0.005 ? fmtPct(v, true) : "已回本";
}

function breakEvenDelta(before: number, after: number): string {
  if (!(before > 0.005) || !(after > 0.005)) return "—";
  return signedPct(pctDelta(before, after), "pp");
}

function chipLabel(v: number): string {
  if (v >= 10000) return `${v / 10000}w`;
  if (v >= 1000) return `${v / 1000}k`;
  return String(v);
}

function toneClass(v: number | undefined): string {
  if (v === undefined || !Number.isFinite(v) || v === 0) return "flat";
  return v > 0 ? "positive" : "negative";
}

// ==================== 金额记忆 / 动效 ====================

function rememberAmount() {
  try {
    if (amount.value > 0)
      localStorage.setItem(LAST_AMOUNT_KEY, String(amount.value));
  } catch {
    /* ignore */
  }
}

let bumpTimer: number | undefined;

function flashBump() {
  if (bumpTimer) window.clearTimeout(bumpTimer);
  bumping.value = false;
  window.requestAnimationFrame(() => {
    bumping.value = true;
    bumpTimer = window.setTimeout(() => {
      bumping.value = false;
    }, 380);
  });
}

// ==================== 导航 ====================

function goBack() {
  router.push("/");
}

async function navigateTo(target: string | null) {
  if (!target || target === props.code) return;
  await router.replace({
    name: "addPositionPreview",
    params: { code: target },
    query: amount.value > 0 ? { amount: String(amount.value) } : {},
  });
}

// ==================== 数据刷新 ====================

async function handleRefresh() {
  refreshing.value = true;
  try {
    await fundService.refreshAllFunds();
    marketStatus.value = getChinaMarketStatus();
  } catch (e: any) {
    ElMessage.error(e?.message || "刷新失败");
  } finally {
    refreshing.value = false;
  }
}

// ==================== 确认加仓 ====================

function escapeHtml(s: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return s.replace(/[&<>"']/g, (c) => map[c] ?? c);
}

async function handleConfirm() {
  const p = preview.value;
  const f = fund.value;
  if (!p || !f || !canConfirm.value) return;

  const name = escapeHtml(displayName.value);
  const html =
    `确认以净值 <b>${p.buyNav.toFixed(4)}</b> 加仓 <b>${moneyText(p.amount)}</b> 至「${name}」？` +
    `<br/><br/>` +
    `新增份额：${formatThousands(p.addShares)} 份<br/>` +
    `加仓后份额：${formatThousands(p.after.num)} 份<br/>` +
    `加仓后成本价：${p.after.cost.toFixed(4)}<br/>` +
    `加仓后总收益率：${fmtPct(p.after.gainRate)}` +
    `<br/><br/><span style="font-size:12px;opacity:.7">仅本地保存，不会自动云同步</span>`;

  // 让触发本次确认的按键（Enter 快捷键）默认行为先结束，
  // 否则弹窗按钮刚挂载就会被同一次按键命中，等于「一键直接加仓」
  await new Promise<void>((resolve) => window.setTimeout(resolve, 30));

  try {
    await ElMessageBox.confirm(html, "确认加仓", {
      confirmButtonText: "确认加仓",
      cancelButtonText: "再想想",
      type: "warning",
      dangerouslyUseHTMLString: true,
      autofocus: false,
      customClass: "add-preview-confirm-box",
    });
  } catch {
    return;
  }

  submitting.value = true;
  try {
    if (!Number.isFinite(p.after.num) || !Number.isFinite(p.after.cost)) {
      throw new Error("计算结果异常，已取消加仓");
    }
    await fundService.updateFund(
      props.code,
      p.after.num,
      p.after.cost,
      f.groupKey,
    );
    rememberAmount();
    ElMessage.success(
      `加仓成功！份额 ${formatThousands(p.after.num)}，成本 ${p.after.cost.toFixed(4)}`,
    );
    router.push("/");
  } catch (e: any) {
    ElMessage.error(e?.message || "加仓失败");
  } finally {
    submitting.value = false;
  }
}

// ==================== 移动端滑动切换基金 ====================

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

function handleTouchStart(e: TouchEvent) {
  const touch = e.touches[0];
  if (!touch) return;
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchStartTime = Date.now();
}

function handleTouchMove(_e: TouchEvent) {
  // 不阻止默认行为，允许页面正常滚动
}

function handleTouchEnd(e: TouchEvent) {
  const touch = e.changedTouches[0];
  if (!touch) return;

  const target = e.target as HTMLElement | null;
  // 快捷金额条自身需要横向滚动、输入框需要拖选，不参与切基金
  if (target?.closest(".chips-wrap") || target?.closest(".el-input")) return;

  const deltaX = touch.clientX - touchStartX;
  const deltaY = touch.clientY - touchStartY;
  const deltaTime = Date.now() - touchStartTime;

  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  const velocity = absX / (deltaTime || 1);

  if (absY > absX) return;
  if (absY > MAX_VERTICAL_DEVIATION) return;
  if (deltaTime > 600 && velocity < SWIPE_VELOCITY_THRESHOLD) return;
  if (!(absX > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD)) return;

  if (deltaX < 0) {
    navigateTo(nextCode.value ?? firstCode.value);
  } else {
    navigateTo(prevCode.value ?? lastCode.value);
  }
}

// ==================== 键盘快捷键 ====================

function handleKeydown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

  const key = e.key.toLowerCase();

  if (key === "escape") {
    goBack();
    return;
  }

  // 数字键：切换快捷金额
  if (/^[1-9]$/.test(key)) {
    const target = quickAmounts[Number(key) - 1];
    if (target !== undefined) pickQuickAmount(target);
    return;
  }

  // W/S、↑/↓、A/D、←/→：切换基金（触底回首）
  if (
    key === "w" ||
    key === "arrowup" ||
    key === "s" ||
    key === "arrowdown" ||
    key === "a" ||
    key === "arrowleft" ||
    key === "d" ||
    key === "arrowright"
  ) {
    if (allFundCodes.value.length <= 1) return;
    const backward =
      key === "w" || key === "arrowup" || key === "a" || key === "arrowleft";
    const target = backward
      ? (prevCode.value ?? lastCode.value)
      : (nextCode.value ?? firstCode.value);
    navigateTo(target);
    return;
  }

  // Enter：确认加仓（按钮聚焦时交给按钮自身，避免重复触发）
  if (key === "enter" && tag !== "BUTTON") {
    if (canConfirm.value) handleConfirm();
  }
}

// ==================== URL 金额同步（防抖） ====================

let urlSyncTimer: number | undefined;

function syncAmountToUrl() {
  const raw = Array.isArray(route.query.amount)
    ? route.query.amount[0]
    : route.query.amount;
  const current = Number(raw);
  if (!amount.value || current === amount.value) return;
  router
    .replace({
      name: "addPositionPreview",
      params: { code: props.code },
      query: { ...route.query, amount: String(amount.value) },
    })
    .catch(() => {
      /* ignore redundant navigation */
    });
}

watch(amount, (next) => {
  if (next <= 0) return;
  flashBump();
  centerActiveChip();
  if (urlSyncTimer) window.clearTimeout(urlSyncTimer);
  urlSyncTimer = window.setTimeout(syncAmountToUrl, 500);
});

let refreshKeydownAttached = false;

function attachKeydown() {
  if (refreshKeydownAttached) return;
  window.addEventListener("keydown", handleKeydown);
  refreshKeydownAttached = true;
}

// ==================== 生命周期 ====================

onMounted(() => {
  attachKeydown();

  // 初始金额：URL > 上次记忆 > 1000
  const queryAmount = Number(
    Array.isArray(route.query.amount)
      ? route.query.amount[0]
      : route.query.amount,
  );
  if (Number.isFinite(queryAmount) && queryAmount > 0) {
    amountInput.value = queryAmount;
  } else {
    try {
      const last = Number(localStorage.getItem(LAST_AMOUNT_KEY));
      if (Number.isFinite(last) && last > 0) amountInput.value = last;
    } catch {
      /* ignore */
    }
  }

  // 继承加仓弹窗里选择的买入净值
  const queryNav = Number(
    Array.isArray(route.query.nav) ? route.query.nav[0] : route.query.nav,
  );
  if (Number.isFinite(queryNav) && queryNav > 0) {
    const dateRaw = Array.isArray(route.query.date)
      ? route.query.date[0]
      : route.query.date;
    inheritedNav.value = {
      code: props.code,
      nav: queryNav,
      date: typeof dateRaw === "string" ? dateRaw : "",
    };
  }

  if (!fundInfo.value && fund.value) {
    fundService.fetchFundDetail(props.code).catch(() => {
      /* 空态兜底 */
    });
  }

  centerActiveChip();
});

// 切换基金后缺详情时补拉
watch(
  () => props.code,
  (code) => {
    if (!fundStore.fundDetails.get(code) && fundStore.getFund(code)) {
      fundService.fetchFundDetail(code).catch(() => {
        /* 空态兜底 */
      });
    }
  },
);

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
  refreshKeydownAttached = false;
  if (bumpTimer) window.clearTimeout(bumpTimer);
  if (urlSyncTimer) window.clearTimeout(urlSyncTimer);
});
</script>

<style scoped>
.preview-main {
  padding: 12px 16px 24px;
  touch-action: pan-y;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: calc(100vh - 180px);
}

/* ============ Header（对齐基金详情页） ============ */
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.header-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
}

.fund-name {
  font-size: 15px;
  font-weight: 600;
  text-align: left;
  padding-right: 10px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 42vw;
}

.fund-code {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.fund-code-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.fund-code-row-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.header-rate {
  font-size: 11px;
  font-weight: 600;
  padding: 0 4px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
}

.swipe-hint-icon {
  display: none;
  cursor: help;
  color: var(--el-color-info);
  font-size: 14px;
  margin-left: 4px;
}

@media (max-width: 768px) {
  .swipe-hint-icon {
    display: inline-block;
  }
}

.fund-nav-btns {
  display: flex;
  align-items: center;
  gap: 0;
}

.fund-nav-btns .el-button {
  padding: 0 4px;
  font-size: 16px;
  height: 20px;
  min-height: unset;
  line-height: 1;
  color: var(--el-text-color-secondary);
}

.fund-nav-btns .el-button:not(:disabled):hover {
  color: var(--el-color-primary);
}

.fund-nav-pos {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  white-space: nowrap;
  padding: 0 2px;
}

.shortcut-hint {
  font-size: 12px;
  line-height: 1.7;
  color: var(--el-text-color-regular);
}

.shortcut-hint p {
  margin: 0;
}

.shortcut-hint kbd {
  display: inline-block;
  padding: 0 4px;
  border: 1px solid var(--el-border-color);
  border-radius: 3px;
  background: var(--el-fill-color-light);
  font-size: 11px;
  line-height: 1.5;
}

/* ============ 金额条 ============ */
.amount-bar {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px 10px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
}

.amount-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.amount-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.amount-input {
  width: 172px;
}

.amount-input :deep(.el-input__inner) {
  font-weight: 600;
  font-size: 14px;
}

.amount-unit {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-left: -2px;
}

.buy-nav {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.buy-nav strong {
  color: var(--text-primary);
}

.buy-nav em {
  font-style: normal;
  color: var(--el-text-color-placeholder);
}

.chips-wrap {
  width: 100%;
}

.chips-wrap :deep(.el-scrollbar__wrap) {
  overflow-y: hidden;
}

.chips-inner {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 1px 0;
  white-space: nowrap;
}

.amount-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: 24px;
  min-width: 40px;
  padding: 0 9px;
  font-size: 12px;
  line-height: 1;
  border-radius: 12px;
  border: 1px solid var(--el-border-color);
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-regular);
  cursor: pointer;
  user-select: none;
  transition: all 0.18s;
  -webkit-tap-highlight-color: transparent;
}

.amount-chip:hover {
  border-color: var(--el-color-primary-light-5);
  color: var(--el-color-primary);
}

.amount-chip.active {
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
  color: #fff;
  font-weight: 600;
}

.amount-chip-ratio {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 4px;
  padding-left: 8px;
  border-left: 1px dashed var(--el-border-color);
}

.amount-chip.ratio {
  min-width: unset;
}

/* ============ 结论卡 ============ */
.conclusion-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--el-color-primary-light-7);
  background: linear-gradient(
    135deg,
    var(--el-color-primary-light-9),
    var(--el-bg-color)
  );
  transition: box-shadow 0.3s;
}

.conclusion-card.bump {
  animation: bump-flash 0.38s ease-out;
}

@keyframes bump-flash {
  0% {
    box-shadow: 0 0 0 0 var(--el-color-primary-light-5);
  }
  40% {
    box-shadow: 0 0 0 4px var(--el-color-primary-light-8);
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

.conclusion-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.conclusion-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.conclusion-fund {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60%;
}

.conclusion-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.concl-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px;
  border-radius: 8px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
}

.concl-label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.concl-before {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-decoration: line-through;
  text-decoration-color: var(--el-text-color-placeholder);
}

.concl-after {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}

.concl-delta {
  font-size: 11px;
  font-weight: 600;
}

.conclusion-tip {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

/* ============ 通用区块（对齐详情页） ============ */
.holding-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: left;
  display: flex;
  align-items: center;
  gap: 4px;
}

.section-hint {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
  cursor: help;
  transition: color 0.15s;
}

.section-hint:hover {
  color: var(--el-color-primary);
}

/* 百分点变化量：虚线下划线提示可 hover 查看说明 */
.is-pp {
  text-decoration: underline dotted;
  text-decoration-color: var(--el-text-color-placeholder);
  text-underline-offset: 3px;
  cursor: help;
}

/* tooltip 内容：逐行展示（元素由本组件渲染，scoped 样式对 teleport 到 body 的 popper 依然生效） */
.pp-tip {
  max-width: 280px;
  font-size: 12px;
  line-height: 1.7;
  white-space: normal;
  word-break: break-word;
}

.pp-tip > div + div {
  margin-top: 2px;
}

.info-grid-2col {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.grid-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.g-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.g-value {
  font-size: 14px;
  font-weight: 700;
}

.g-sub {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.muted-grid .g-value {
  font-weight: 500;
  color: var(--el-text-color-regular);
}

/* ============ 变化对照表 ============ */
.change-list {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--el-fill-color-lighter);
}

.change-row {
  display: grid;
  grid-template-columns: 84px 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  font-size: 13px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.change-row:last-child {
  border-bottom: none;
}

.change-list.compact .change-row {
  padding: 7px 12px;
  font-size: 12.5px;
}

.change-label {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.change-values {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}

.change-before {
  color: var(--el-text-color-secondary);
}

.change-arrow {
  color: var(--el-color-primary);
  opacity: 0.7;
  font-weight: 600;
}

.change-after {
  font-weight: 700;
  color: var(--text-primary);
}

.change-delta {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  text-align: right;
}

/* ============ 涨跌色（A股：涨红跌绿，灰阶模式自动降级） ============ */
.positive {
  color: var(--color-up) !important;
}

.negative {
  color: var(--color-down) !important;
}

.flat {
  color: var(--el-text-color-regular);
}

/* ============ 空态 ============ */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 60px 16px;
  color: var(--el-text-color-secondary);
}

.empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.empty-sub {
  font-size: 12px;
}

.page-tip {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  text-align: center;
  padding: 4px 0 8px;
}

/* ============ 吸底确认栏 ============ */
.confirm-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  flex-wrap: wrap;
}

.confirm-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.confirm-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.confirm-name {
  font-size: 12px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

.confirm-sub {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.confirm-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

/* 本页是"决策页"，始终展示真实金额，不受全局隐私模式影响 */

@media (max-width: 480px) {
  .preview-main {
    padding: 10px 12px 20px;
  }
  .change-row {
    grid-template-columns: 72px 1fr;
    grid-template-areas:
      "label after"
      "label delta";
    row-gap: 2px;
  }
  .change-label {
    grid-area: label;
  }
  .change-values {
    grid-area: after;
  }
  .change-delta {
    grid-area: delta;
    text-align: left;
  }
  .fund-name {
    max-width: 38vw;
  }
  .confirm-bar {
    padding: 8px 10px;
  }
  .confirm-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
