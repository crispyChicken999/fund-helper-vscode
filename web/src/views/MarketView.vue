<template>
  <MainLayout>
    <template #header>
      <div class="market-header">
        <div class="header-top">
          <h2>行情中心</h2>
          <div class="header-actions">
            <span class="update-hint">{{ updateHint }}</span>
            <el-button
              size="small"
              :loading="refreshing"
              @click="handleRefresh"
            >
              <el-icon><Refresh /></el-icon>
            </el-button>
          </div>
        </div>
        <!-- 主 Tab 栏 -->
        <div class="main-tabs">
          <el-scrollbar ref="mainTabsScrollbar">
            <div class="main-tabs-inner">
              <span
                v-for="tab in mainTabs"
                :key="tab.key"
                class="main-tab-item"
                :class="{ active: activeMainTab === tab.key }"
                @click="switchMainTab(tab.key, $event)"
              >
                {{ tab.label }}
              </span>
            </div>
          </el-scrollbar>
        </div>
      </div>
    </template>

    <!-- Tab 内容区 -->
    <div class="market-content" ref="contentRef">
      <!-- 大盘资金 Tab -->
      <div v-show="activeMainTab === 'market'" class="tab-panel">
        <!-- 两市统计条 -->
        <div class="market-stat-bar">
          <span
            >两市合计成交额：<strong>{{
              marketStat?.totalVolume.toFixed(2) || 0
            }}</strong>
            亿元</span
          >
          <span class="stat-up"
            >上涨：<strong>{{ marketStat?.rising || 0 }}</strong></span
          >
          <span class="stat-flat"
            >平盘：<strong>{{ marketStat?.flat || 0 }}</strong></span
          >
          <span class="stat-down"
            >下跌：<strong>{{ marketStat?.falling || 0 }}</strong></span
          >
        </div>

        <!-- 大盘指数卡片 -->
        <div class="index-section">
          <div class="section-header">
            <h4>大盘指数（点击查看详情）</h4>
            <el-button size="small" text @click="handleEditIndexCards">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
          </div>
          <div class="index-cards">
            <div
              v-for="card in indexCards"
              :key="card.code"
              class="index-card"
              :class="cardBorderClass(card.changePercent)"
              @click="handleIndexCardClick(card)"
            >
              <div class="card-name">{{ card.name }}</div>
              <div
                class="card-price"
                :class="changeColorClass(card.changePercent)"
              >
                {{ card.price.toFixed(2) }}
              </div>
              <div class="card-stats">
                <div
                  class="card-amount"
                  :class="changeColorClass(card.changeAmount)"
                >
                  {{ fmtChange(card.changeAmount) }}
                </div>
                <div
                  class="card-change"
                  :class="changeColorClass(card.changePercent)"
                >
                  {{ fmtPct(card.changePercent) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 全球指数子 Tab -->
        <div class="sub-section">
          <div class="sub-tabs">
            <span
              v-for="g in globalIndexGroups"
              :key="g"
              class="sub-tab-item"
              :class="{ active: activeGlobalTab === g }"
              @click="activeGlobalTab = g"
            >
              {{ g }}指数
            </span>
          </div>
          <div class="index-images">
            <div
              v-for="item in currentGlobalIndexItems"
              :key="item.nid"
              class="index-img-wrap"
            >
              <img
                :src="getStableImageUrl(item.nid)"
                :alt="item.name"
                loading="lazy"
              />
              <span class="img-label">{{ item.name }}</span>
            </div>
          </div>
        </div>

        <!-- 资金流向折线图 -->
        <div class="sub-section">
          <h4>沪深资金流向</h4>
          <div ref="flowChartRef" class="chart-container"></div>
        </div>
      </div>

      <!-- 板块 Tab（行业/风格/概念/地域） -->
      <div
        v-for="pt in plateTabs"
        :key="pt.key"
        v-show="activeMainTab === pt.key"
        class="tab-panel"
      >
        <div class="sub-tabs">
          <span
            v-for="rf in plateRankFields"
            :key="rf.field"
            class="sub-tab-item"
            :class="{ active: activePlateRank[pt.key] === rf.field }"
            @click="switchPlateRank(pt.key, rf.field)"
          >
            {{ rf.label }}
          </span>
        </div>
        <div
          :ref="(el) => setPlateChartRef(pt.key, el as HTMLElement)"
          class="chart-container chart-plate"
        ></div>
      </div>
    </div>

    <!-- 指数走势图弹窗 -->
    <IndexFlowDialog
      v-model="showIndexFlowDialog"
      :index-code="selectedIndexCode"
      :index-name="selectedIndexName"
    />

    <!-- 指数编辑弹窗 -->
    <IndexEditDialog
      v-model="showIndexEditDialog"
      :index-cards="indexCardsConfig"
      @save="handleSaveIndexCards"
    />
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, nextTick } from "vue";
import { Refresh, Edit } from "@element-plus/icons-vue";
import MainLayout from "@/layouts/MainLayout.vue";
import IndexFlowDialog from "@/components/IndexFlowDialog.vue";
import IndexEditDialog from "@/components/IndexEditDialog.vue";
import {
  fetchIndexCards,
  fetchMarketStat,
  fetchFlowLine,
  fetchPlateData,
  GLOBAL_INDEX_GROUPS,
  type IndexCardData,
  type MarketStatData,
  type PlateRankField,
} from "@/api/market";
import { loadEcharts } from "@/utils/echarts";
import { useSettingStore } from "@/stores";

// ==================== 常量 ====================

const mainTabs = [
  { key: "market", label: "大盘资金" },
  { key: "industry", label: "行业板块" },
  { key: "style", label: "风格板块" },
  { key: "concept", label: "概念板块" },
  { key: "region", label: "地域板块" },
];

const plateTabs = mainTabs.filter((t) => t.key !== "market");

const plateRankFields: { field: PlateRankField; label: string }[] = [
  { field: "f62", label: "今日排行" },
  { field: "f164", label: "5日排行" },
  { field: "f174", label: "10日排行" },
];

const globalIndexGroups = Object.keys(GLOBAL_INDEX_GROUPS);

// 默认指数卡片配置
const DEFAULT_INDEX_CARDS = [
  { code: "1.000001", name: "上证指数" },
  { code: "1.000300", name: "沪深300" },
  { code: "0.399001", name: "深证成指" },
  { code: "0.399006", name: "创业板指" },
];

// ==================== 状态 ====================

const activeMainTab = ref("market");
const activeGlobalTab = ref("A股");
const refreshing = ref(false);
const contentRef = ref<HTMLElement | null>(null);
const mainTabsScrollbar = ref<any>(null);

const indexCards = ref<IndexCardData[]>([]);
const marketStat = ref<MarketStatData | null>(null);

// 指数卡片配置（用户可自定义）
const indexCardsConfig = ref<{ code: string; name: string }[]>([
  ...DEFAULT_INDEX_CARDS,
]);

// 指数走势图弹窗
const showIndexFlowDialog = ref(false);
const selectedIndexCode = ref("");
const selectedIndexName = ref("");

// 指数编辑弹窗
const showIndexEditDialog = ref(false);

// Stable timestamp for image URLs — only changes on manual refresh
const imageTimestamp = ref(Date.now());

const loadedTabs = new Set<string>();
const activePlateRank = reactive<Record<string, PlateRankField>>({
  industry: "f62",
  style: "f62",
  concept: "f62",
  region: "f62",
});

// ECharts
const flowChartRef = ref<HTMLElement | null>(null);
let flowChartInstance: any = null;
const plateChartRefs: Record<string, HTMLElement | null> = {};
const plateChartInstances: Record<string, any> = {};

// Auto-refresh
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
const countdown = ref(0);
let countdownInterval: ReturnType<typeof setInterval> | null = null;

const isDarkMode = computed(() => useSettingStore().theme === "dark");

// ==================== 计算属性 ====================

const currentGlobalIndexItems = computed(
  () => GLOBAL_INDEX_GROUPS[activeGlobalTab.value] ?? [],
);

const updateHint = computed(() => {
  if (countdown.value > 0) return `${countdown.value}s 后刷新`;
  return "";
});

// ==================== 方法 ====================

function setPlateChartRef(key: string, el: HTMLElement | null) {
  plateChartRefs[key] = el;
}

function cardBorderClass(pct: number) {
  if (pct > 0) return "border-up";
  if (pct < 0) return "border-down";
  return "border-flat";
}

function changeColorClass(v: number) {
  if (v > 0) return "color-up";
  if (v < 0) return "color-down";
  return "color-flat";
}

function fmtPct(v: number) {
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function fmtChange(v: number) {
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}`;
}

function getStableImageUrl(nid: string) {
  return `https://webquotepic.eastmoney.com/GetPic.aspx?imageType=WAPINDEX2&nid=${nid}&rnd=${imageTimestamp.value}`;
}

// --- 数据加载 ---

async function loadMarketTab() {
  // 构建用户配置的指数代码列表
  const secids = indexCardsConfig.value.map((c) => c.code).join(",");

  const [cards, stat, flowData] = await Promise.all([
    fetchIndexCards(secids),
    fetchMarketStat(),
    fetchFlowLine(),
  ]);

  // 根据用户配置的指数卡片顺序和选择来显示
  const cardsMap = new Map<string, IndexCardData>();
  (cards || []).forEach((card) => {
    cardsMap.set(card.code, card);
  });

  // 按照用户配置的顺序构建显示列表
  const displayCards: IndexCardData[] = [];
  for (const config of indexCardsConfig.value) {
    const card = cardsMap.get(config.code);
    if (card) {
      displayCards.push(card);
    } else {
      // 如果没有获取到数据，使用默认值
      displayCards.push({
        code: config.code,
        name: config.name,
        price: 0,
        changePercent: 0,
        changeAmount: 0,
      });
    }
  }

  indexCards.value = displayCards;
  marketStat.value = stat;
  await renderFlowChart(flowData);
}

async function loadPlateTab(tab: string) {
  const field = activePlateRank[tab] ?? "f62";
  const data = await fetchPlateData(tab, field);
  await renderPlateChart(tab, data);
}

async function loadTabOnce(tab: string) {
  if (loadedTabs.has(tab)) return;
  loadedTabs.add(tab);
  if (tab === "market") {
    await loadMarketTab();
  } else {
    await loadPlateTab(tab);
  }
}

function switchMainTab(tab: string, event?: MouseEvent) {
  activeMainTab.value = tab;
  loadTabOnce(tab);
  // Resize charts after tab switch (DOM visibility change)
  nextTick(() => {
    flowChartInstance?.resize();
    Object.values(plateChartInstances).forEach((c: any) => c?.resize());
  });

  nextTick(() => {
    const target = event?.currentTarget as HTMLElement | null;
    if (!target) return;

    const scrollbar = mainTabsScrollbar.value as any;
    const wrap: HTMLElement | null =
      scrollbar?.wrapRef ??
      scrollbar?.$el?.querySelector(".el-scrollbar__wrap") ??
      null;
    if (!wrap) return;

    const targetCenter = target.offsetLeft + target.offsetWidth / 2;
    const maxScroll = wrap.scrollWidth - wrap.clientWidth;
    const nextScrollLeft = Math.min(
      Math.max(0, targetCenter - wrap.clientWidth / 2),
      Math.max(0, maxScroll),
    );

    if (typeof scrollbar?.setScrollLeft === "function") {
      scrollbar.setScrollLeft(nextScrollLeft);
    } else {
      wrap.scrollTo({ left: nextScrollLeft, behavior: "smooth" });
    }
  });
}

async function switchPlateRank(tab: string, field: PlateRankField) {
  activePlateRank[tab] = field;
  const data = await fetchPlateData(tab, field);
  await renderPlateChart(tab, data);
}

async function handleRefresh() {
  refreshing.value = true;
  try {
    loadedTabs.clear();
    imageTimestamp.value = Date.now();
    await loadTabOnce(activeMainTab.value);
  } finally {
    refreshing.value = false;
  }
}

// --- 指数卡片点击 ---

function handleIndexCardClick(card: IndexCardData) {
  selectedIndexCode.value = card.code;
  selectedIndexName.value = card.name;
  showIndexFlowDialog.value = true;
}

// --- 指数编辑 ---

function handleEditIndexCards() {
  showIndexEditDialog.value = true;
}

async function handleSaveIndexCards(cards: { code: string; name: string }[]) {
  indexCardsConfig.value = cards;

  // 保存到 localStorage
  localStorage.setItem("fund_helper_index_cards_config", JSON.stringify(cards));

  // 不再主动保存到云端，因为暂时存在localStorage就好啦，用户想要同步的时候自动会同步
  // 保存到云端配置
  // try {
  //   const { syncService } = await import("@/services/syncService");
  //   await syncService.syncToCloud();
  //   console.log("指数卡片配置已同步到云端");
  // } catch (error) {
  //   console.error("同步指数卡片配置到云端失败:", error);
  // }

  // 重新加载数据
  await loadMarketTab();
}

// --- ECharts 渲染 ---

// 生成时间数组（完全参考 indDetail.vue）
function time_arr(type: string): string[] {
  if (type === "hs") {
    // 生成沪深时间段 09:30-11:30, 13:00-15:00
    const timeArr: string[] = [];
    timeArr.push("09:30");
    getNextTime("09:30", "11:30", 1, timeArr);
    getNextTime("13:00", "15:00", 1, timeArr);
    return timeArr;
  }
  return [];
}

function getNextTime(
  startTime: string,
  endTime: string,
  offset: number,
  resultArr: string[],
): string[] {
  const result = addTimeStr(startTime, offset);
  resultArr.push(result);
  if (result === endTime) {
    return resultArr;
  } else {
    return getNextTime(result, endTime, offset, resultArr);
  }
}

function addTimeStr(time: string, num: number): string {
  let hour = time.split(":")[0];
  let mins = Number(time.split(":")[1]);
  const mins_un = parseInt(String((mins + num) / 60));
  const hour_un = parseInt(String((Number(hour) + mins_un) / 24));

  if (mins_un > 0) {
    if (hour_un > 0) {
      const tmpVal = String((Number(hour) + mins_un) % 24);
      hour = tmpVal.length > 1 ? tmpVal : "0" + tmpVal;
    } else {
      const tmpVal = String(Number(hour) + mins_un);
      hour = tmpVal.length > 1 ? tmpVal : "0" + tmpVal;
    }
    const tmpMinsVal = String((mins + num) % 60);
    mins = Number(tmpMinsVal.length > 1 ? tmpMinsVal : "0" + tmpMinsVal);
  } else {
    const tmpMinsVal = String(mins + num);
    mins = Number(tmpMinsVal.length > 1 ? tmpMinsVal : "0" + tmpMinsVal);
  }
  return hour + ":" + (mins < 10 ? "0" + mins : mins);
}

async function renderFlowChart(
  data: {
    time: string;
    main: number;
    superLarge: number;
    large: number;
    medium: number;
    small: number;
  }[],
) {
  const echarts = await loadEcharts();
  if (!flowChartRef.value) return;

  if (!flowChartInstance) {
    flowChartInstance = echarts.init(flowChartRef.value);
  }

  // data.map((d) => d.time.split(" ").pop() ?? d.time);
  const times = time_arr("hs");
  // data-grayscale 属性控制是否启用灰度模式，配合 CSS filter 实现全图灰度
  const isGrayScale = document.documentElement.dataset.grayscale === "true";
  const option = {
    tooltip: {
      trigger: "axis",
      backgroundColor: isDarkMode.value
        ? "rgba(30, 30, 30, 0.9)"
        : "rgba(255, 255, 255, 0.95)",
      borderColor: isDarkMode.value
        ? "rgba(255, 255, 255, 0.2)"
        : "rgba(0, 0, 0, 0.1)",
      borderWidth: 1,
      textStyle: {
        color: isDarkMode.value ? "#fff" : "#000",
        fontSize: 12,
        fontFamily: "inherit",
      },
      padding: [10, 12],
      borderRadius: 6,
      boxShadow: isDarkMode.value
        ? "0 4px 12px rgba(0, 0, 0, 0.6)"
        : "0 4px 12px rgba(0, 0, 0, 0.15)",
      formatter(params: any[]) {
        const time = params[0]?.axisValue || "";
        let html = `<div style="font-weight: 600; margin-bottom: 8px; color: ${isDarkMode.value ? "#fff" : "#333"}">${time}</div>`;
        params.forEach((p: any) => {
          const color = isGrayScale
            ? "var(--el-text-color)"
            : p.value >= 0
              ? "var(--color-up)"
              : "var(--color-down)";
          html += `<div style="display: flex; align-items: center; margin: 4px 0; gap: 8px">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${p.color}; flex-shrink: 0;"></span>
            <span style="flex: 1;">${p.seriesName}:</span>
            <span style="color: ${color}; font-weight: 600;">${p.value.toFixed(2)} 亿</span>
          </div>`;
        });
        return html;
      },
    },
    legend: {
      data: [
        "主力净流入",
        "超大单净流入",
        "大单净流入",
        "中单净流入",
        "小单净流入",
      ],
      top: 0,
      textStyle: { fontSize: 11, color: isDarkMode.value ? "#fff" : "#000" },
    },
    grid: { left: 50, right: 16, top: 50, bottom: 40 },
    xAxis: {
      type: "category",
      data: times,
      axisLabel: { fontSize: 10 },
    },
    yAxis: {
      type: "value",
      axisLabel: { fontSize: 10, formatter: "{value}亿" },
      axisLine: {
        show: true,
        lineStyle: {
          color: isGrayScale ? "#fff" : isDarkMode.value ? "#888" : "#333",
        },
      },
      splitLine: {
        lineStyle: {
          type: "dashed",
          color: isGrayScale
            ? "#fff"
            : isDarkMode.value
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.3)",
        },
      },
    },
    series: [
      {
        name: "主力净流入",
        type: "line",
        data: data.map((d) => parseFloat(d.main.toFixed(2))),
        smooth: false,
        lineStyle: { width: 2 },
        symbol: "none",
        color: "#3b82f6",
      },
      {
        name: "超大单净流入",
        type: "line",
        data: data.map((d) => parseFloat(d.superLarge.toFixed(2))),
        smooth: false,
        lineStyle: { width: 1.5 },
        symbol: "none",
        color: "#ef4444",
      },
      {
        name: "大单净流入",
        type: "line",
        data: data.map((d) => parseFloat(d.large.toFixed(2))),
        smooth: false,
        lineStyle: { width: 1.5 },
        symbol: "none",
        color: "#06b6d4",
      },
      {
        name: "中单净流入",
        type: "line",
        data: data.map((d) => parseFloat(d.medium.toFixed(2))),
        smooth: false,
        lineStyle: { width: 1.5 },
        symbol: "none",
        color: "#22c55e",
      },
      {
        name: "小单净流入",
        type: "line",
        data: data.map((d) => parseFloat(d.small.toFixed(2))),
        smooth: false,
        lineStyle: { width: 1.5 },
        symbol: "none",
        color: "#f97316",
      },
    ],
  };
  flowChartInstance.setOption(option, true);
}

async function renderPlateChart(
  tab: string,
  data: { name: string; value: number }[],
) {
  const echarts = await loadEcharts();
  await nextTick();
  const el = plateChartRefs[tab];
  if (!el || !data.length) return;

  // Ensure the container is visible and has dimensions
  if (el.offsetWidth === 0 || el.offsetHeight === 0) {
    // Retry after a short delay (tab might still be transitioning)
    setTimeout(() => renderPlateChart(tab, data), 100);
    return;
  }

  if (!plateChartInstances[tab]) {
    plateChartInstances[tab] = echarts.init(el);
  }

  const names = data.map((d) => d.name.split("").join("\n"));
  const values = data.map((d) => parseFloat(d.value.toFixed(2)));
  const colors = values.map((v) => (v >= 0 ? "#ef4444" : "#22c55e"));

  const option = {
    tooltip: {
      trigger: "axis",
      backgroundColor: isDarkMode.value
        ? "rgba(30, 30, 30, 0.9)"
        : "rgba(255, 255, 255, 0.95)",
      borderColor: isDarkMode.value
        ? "rgba(255, 255, 255, 0.2)"
        : "rgba(0, 0, 0, 0.1)",
      borderWidth: 1,
      textStyle: {
        color: isDarkMode.value ? "#fff" : "#000",
        fontSize: 12,
        fontFamily: "inherit",
      },
      padding: [10, 12],
      borderRadius: 6,
      boxShadow: isDarkMode.value
        ? "0 4px 12px rgba(0, 0, 0, 0.6)"
        : "0 4px 12px rgba(0, 0, 0, 0.15)",
      formatter(params: any[]) {
        const p = params[0];
        if (!p) return "";
        const name = data[p.dataIndex]?.name ?? "";
        const color = p.value >= 0 ? "#ef4444" : "#22c55e";
        const sign = p.value >= 0 ? "+" : "";
        return `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="font-weight: 600; font-size: 13px; color: ${isDarkMode.value ? "#fff" : "#333"};">${name}</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${color}; flex-shrink: 0;"></span>
              <span>净流入:</span>
              <span style="color: ${color}; font-weight: 600;">${sign}${p.value.toFixed(2)}</span>
              <span>亿</span>
            </div>
          </div>
        `;
      },
    },
    grid: { left: 50, right: 20, top: 20, bottom: 130 },
    xAxis: {
      type: "category",
      data: names,
      axisLabel: { fontSize: 11 },
      axisLine: { lineStyle: {} },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        fontSize: 11,
        formatter: "{value}亿",
      },
      splitLine: {
        lineStyle: { type: "dashed" },
      },
    },
    dataZoom: [
      {
        type: "slider",
        start: 0,
        end: Math.min(100, (30 / Math.max(data.length, 1)) * 100),
        bottom: 16,
        height: 18,
      },
      { type: "inside", xAxisIndex: 0 },
    ],
    series: [
      {
        type: "bar",
        data: values.map((v, i) => ({
          value: v,
          itemStyle: { color: colors[i] },
        })),
        barMaxWidth: 30,
      },
    ],
  };
  plateChartInstances[tab].setOption(option, true);
}

// --- 自动刷新 ---

function setupAutoRefresh() {
  clearAutoRefresh();
  scheduleNext();
}

function scheduleNext() {
  const now = new Date();
  const delay = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
  countdown.value = Math.ceil(delay / 1000);

  // 倒计时
  countdownInterval = setInterval(() => {
    countdown.value = Math.max(0, countdown.value - 1);
  }, 1000);

  refreshTimer = setTimeout(async () => {
    if (countdownInterval) clearInterval(countdownInterval);
    const h = new Date().getHours();
    const d = new Date().getDay();
    if (d >= 1 && d <= 5 && h >= 9 && h < 15) {
      loadedTabs.clear();
      imageTimestamp.value = Date.now();
      await loadTabOnce(activeMainTab.value);
    }
    scheduleNext();
  }, delay);
}

function clearAutoRefresh() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

// --- ResizeObserver ---

let resizeObserver: ResizeObserver | null = null;

function setupResize() {
  resizeObserver = new ResizeObserver(() => {
    flowChartInstance?.resize();
    Object.values(plateChartInstances).forEach((c: any) => c?.resize());
  });
  if (contentRef.value) resizeObserver.observe(contentRef.value);
}

// ==================== 生命周期 ====================

onMounted(async () => {
  // 从 localStorage 加载用户配置的指数卡片
  const savedConfig = localStorage.getItem("fund_helper_index_cards_config");
  if (savedConfig) {
    try {
      indexCardsConfig.value = JSON.parse(savedConfig);
    } catch {
      indexCardsConfig.value = [...DEFAULT_INDEX_CARDS];
    }
  }

  await loadTabOnce("market");
  setupAutoRefresh();
  setupResize();
});

onUnmounted(() => {
  clearAutoRefresh();
  resizeObserver?.disconnect();
  flowChartInstance?.dispose();
  Object.values(plateChartInstances).forEach((c: any) => c?.dispose());
});
</script>

<style scoped>
.market-header {
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 0;
}

.header-top h2 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.update-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.main-tabs {
  padding: 10px 16px 0;
}

.main-tabs-inner {
  display: flex;
  gap: 4px;
}

.main-tab-item {
  padding: 6px 14px;
  font-size: 13px;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  color: var(--el-text-color-regular);
  transition: all 0.2s;
}

.main-tab-item:hover {
  background: var(--el-fill-color-light);
}

.main-tab-item.active {
  background: var(--el-color-primary);
  color: #fff;
}

/* Tab 内容 */
.market-content {
  padding: 12px 16px;
}

.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 两市统计条 */
.market-stat-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  padding: 10px 12px;
  background: var(--el-fill-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color);
}

.stat-up {
  color: var(--color-up);
}
.stat-down {
  color: var(--color-down);
}
.stat-flat {
  color: var(--color-flat);
}

/* 指数卡片 */
.index-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

.index-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.index-card {
  padding: 10px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
  border-left: 3px solid var(--el-border-color);
  background: var(--el-bg-color);
  transition: all 0.2s ease;
  cursor: pointer;
}

.index-card:hover {
  background: var(--el-fill-color);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.index-card.border-up {
  border-left-color: var(--color-up);
}
.index-card.border-down {
  border-left-color: var(--color-down);
}
.index-card.border-flat {
  border-left-color: var(--color-flat);
}

.card-name {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: left;
}

.card-price {
  font-size: 20px;
  font-weight: 900;
  margin-bottom: 8px;
  line-height: 1.2;
  text-align: left;
}

.card-stats {
  display: flex;
  gap: 6px;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.card-change,
.card-amount {
  font-size: 12px;
  font-weight: 600;
}

.color-up {
  color: var(--color-up);
}
.color-down {
  color: var(--color-down);
}
.color-flat {
  color: var(--color-flat);
}

/* 子 Tab */
.sub-section {
  margin-top: 4px;
}

.sub-section h4 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 500;
}

.sub-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
}

.sub-tab-item {
  padding: 2px 12px;
  font-size: 12px;
  border-radius: 12px;
  cursor: pointer;
  user-select: none;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.sub-tab-item.active {
  background: var(--el-color-primary-light-7);
  color: var(--el-color-primary);
  font-weight: 500;
}

/* 全球指数图片 */
.index-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.index-img-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

html.dark .index-img-wrap img {
  filter: invert(1) hue-rotate(173deg) brightness(0.9);
  border: 1px solid #c0c0c0;
}

.index-img-wrap img {
  width: 90px;
  height: 106px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
  transition: box-shadow 0.2s;
}

.index-img-wrap img:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.img-label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

/* 图表容器 */
.chart-container {
  width: 100%;
  height: 280px;
  min-height: 280px;
}

.chart-plate {
  height: 320px;
  min-height: 320px;
}

@media (max-width: 768px) {
  .market-stat-bar {
    font-size: 12px;
    gap: 8px;
  }
}
</style>
