<template>
  <MainLayout>
    <template #header>
      <div class="market-header">
        <div class="header-top">
          <div class="header-title-row">
            <h2>行情中心</h2>
            <el-popover
              placement="bottom"
              title="提示"
              :width="200"
              trigger="hover"
              content="左右滑动切换不同板块"
              class="swipe-hint-popover"
            >
              <template #reference>
                <el-icon class="swipe-hint-icon">
                  <QuestionFilled />
                </el-icon>
              </template>
            </el-popover>
          </div>
          <div class="header-actions">
            <span class="update-hint">{{ updateHint }}</span>
            <el-button
              size="small"
              round
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
                :data-tab-key="tab.key"
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
    <div
      class="market-content"
      ref="contentRef"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <!-- 大盘资金 Tab -->
      <div v-show="activeMainTab === 'market'" class="tab-panel">
        <!-- 两市统计条 -->
        <div class="market-stat-bar">
          <div class="market-stat-heading">股市概况</div>
          <div class="market-stat-meta">
            <span class="market-stat-title">两市合计成交额：</span>
            <strong class="market-stat-volume">{{
              marketStat?.totalVolume.toFixed(2) || 0
            }}</strong>
            <span class="market-stat-unit">亿元</span>
          </div>
          <div
            class="market-stat-progress"
            :class="{ empty: !marketStatTotalCount }"
          >
            <div
              v-for="segment in marketStatSegments"
              :key="segment.key"
              class="market-stat-segment"
              :class="segment.className"
              :style="{ width: `${segment.percent}%` }"
            ></div>
            <div v-if="!marketStatTotalCount" class="market-stat-empty">
              暂无数据
            </div>
          </div>
          <div class="market-stat-legend">
            <div class="market-stat-legend-item is-up">
              <span class="market-stat-legend-label">上涨</span>
              <strong>{{ marketStat?.rising || 0 }}</strong>
            </div>
            <div class="market-stat-legend-item is-flat">
              <span class="market-stat-legend-label">平盘</span>
              <strong>{{ marketStat?.flat || 0 }}</strong>
            </div>
            <div class="market-stat-legend-item is-down">
              <span class="market-stat-legend-label">下跌</span>
              <strong>{{ marketStat?.falling || 0 }}</strong>
            </div>
          </div>
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
                <div class="card-stat-item">
                  <span
                    class="card-change card-stat-value"
                    :class="changeColorClass(card.changePercent)"
                  >
                    {{ fmtPct(card.changePercent) }}
                  </span>
                </div>
                <div class="card-stat-item card-stat-item--secondary">
                  <span
                    class="card-amount card-stat-value card-stat-value--muted"
                    :class="changeColorClass(card.changeAmount)"
                  >
                    {{ fmtChange(card.changeAmount) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 全球指数子 Tab -->
        <div class="sub-section">
          <div class="sub-tabs" style="margin-bottom: 10px">
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
          v-loading="plateLoading[pt.key]"
          :element-loading-text="'加载中...'"
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

    <!-- 主题切换悬浮按钮 -->
    <ThemeToggleFloat />
  </MainLayout>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  reactive,
  onMounted,
  onUnmounted,
  nextTick,
  watch,
} from "vue";
import { Refresh, Edit, QuestionFilled } from "@element-plus/icons-vue";
import MainLayout from "@/layouts/MainLayout.vue";
import IndexFlowDialog from "@/components/IndexFlowDialog.vue";
import IndexEditDialog from "@/components/IndexEditDialog.vue";
import ThemeToggleFloat from "@/components/ThemeToggleFloat.vue";
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

// 移动端滑动切换Tab常量
let touchStartY = 0;
let touchStartX = 0;
let touchStartTime = 0;
const SWIPE_THRESHOLD = 50; // 滑动距离阈值（像素）
const SWIPE_VELOCITY_THRESHOLD = 0.3; // 滑动速度阈值（像素/毫秒）
const MAX_VERTICAL_DEVIATION = 80; // 最大垂直偏移（像素），允许一定的垂直移动

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
const plateLoading = reactive<Record<string, boolean>>({
  industry: false,
  style: false,
  concept: false,
  region: false,
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
// data-grayscale 属性控制是否启用灰度模式，配合 CSS filter 实现全图灰度
const isGrayScale = computed(() => useSettingStore().grayscaleMode);

watch([isDarkMode, isGrayScale], () => {
  // 切换主题时刷新图表以适配新主题
  nextTick(() => {
    handleRefresh();
  });
});

// ==================== 计算属性 ====================

const currentGlobalIndexItems = computed(
  () => GLOBAL_INDEX_GROUPS[activeGlobalTab.value] ?? [],
);

const updateHint = computed(() => {
  if (countdown.value > 0) return `${countdown.value}s 后刷新`;
  return "";
});

const marketStatTotalCount = computed(() => {
  const stat = marketStat.value;
  if (!stat) return 0;
  return (stat.rising || 0) + (stat.flat || 0) + (stat.falling || 0);
});

const marketStatSegments = computed(() => {
  const stat = marketStat.value;
  const total = marketStatTotalCount.value;
  const items = [
    {
      key: "rising",
      label: "上涨",
      value: stat?.rising || 0,
      className: "is-up",
    },
    {
      key: "flat",
      label: "平盘",
      value: stat?.flat || 0,
      className: "is-flat",
    },
    {
      key: "falling",
      label: "下跌",
      value: stat?.falling || 0,
      className: "is-down",
    },
  ];

  return items.map((item) => {
    const percent = total > 0 ? (item.value / total) * 100 : 0;
    return {
      ...item,
      percent: total > 0 ? percent : 0,
    };
  });
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
  plateLoading[tab] = true;
  try {
    const field = activePlateRank[tab] ?? "f62";
    const data = await fetchPlateData(tab, field);
    await renderPlateChart(tab, data);
  } finally {
    plateLoading[tab] = false;
  }
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

function scrollTabIntoView(tabKey: string) {
  nextTick(() => {
    const tabElement = document.querySelector(
      `.main-tab-item[data-tab-key="${tabKey}"]`,
    ) as HTMLElement | null;
    if (!tabElement) return;

    const scrollbar = mainTabsScrollbar.value as any;
    const wrap: HTMLElement | null =
      scrollbar?.wrapRef ??
      scrollbar?.$el?.querySelector(".el-scrollbar__wrap") ??
      null;
    if (!wrap) return;

    const targetCenter = tabElement.offsetLeft + tabElement.offsetWidth / 2;
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

function switchMainTab(tab: string, _event?: MouseEvent) {
  activeMainTab.value = tab;
  loadTabOnce(tab);
  // Resize charts after tab switch (DOM visibility change)
  nextTick(() => {
    flowChartInstance?.resize();
    Object.values(plateChartInstances).forEach((c: any) => c?.resize());
  });

  scrollTabIntoView(tab);
}

async function switchPlateRank(tab: string, field: PlateRankField) {
  activePlateRank[tab] = field;
  plateLoading[tab] = true;
  try {
    const data = await fetchPlateData(tab, field);
    await renderPlateChart(tab, data);
  } finally {
    plateLoading[tab] = false;
  }
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

// ==================== 移动端滑动切换Tab ====================

function handleTouchStart(e: TouchEvent) {
  const touch = e.touches[0];
  if (!touch) return;

  touchStartY = touch.clientY;
  touchStartX = touch.clientX;
  touchStartTime = Date.now();
}

function handleTouchMove(_e: TouchEvent) {
  // 不阻止默认行为，允许页面正常滚动
}

function handleTouchEnd(e: TouchEvent) {
  const touch = e.changedTouches[0];
  if (!touch) return;

  // 检查是否在chart容器内滑动，如果是则不处理
  const target = e.target as HTMLElement;
  if (target?.closest(".chart-container") || target?.closest(".chart-plate")) {
    return;
  }

  const touchEndY = touch.clientY;
  const touchEndX = touch.clientX;
  const touchEndTime = Date.now();

  const deltaY = touchEndY - touchStartY;
  const deltaX = touchEndX - touchStartX;
  const deltaTime = touchEndTime - touchStartTime;

  // 检查是否为有效的水平滑动
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  const velocity = absX / (deltaTime || 1);

  // 如果垂直滑动距离大于水平滑动，说明是在滚动页面，不处理
  if (absY > absX) return;

  // 如果垂直偏移太大，可能是斜向滑动，不处理
  if (absY > MAX_VERTICAL_DEVIATION) return;

  // 如果时间太长（超过600ms），可能是在浏览内容，不处理
  if (deltaTime > 600 && velocity < SWIPE_VELOCITY_THRESHOLD) return;

  // 检查是否满足滑动条件（距离或速度）
  const isValidSwipe =
    absX > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD;

  if (!isValidSwipe) return;

  // 获取当前tab索引
  const currentIndex = mainTabs.findIndex((t) => t.key === activeMainTab.value);
  if (currentIndex === -1) return;

  // 向左滑动（deltaX < 0）切换到下一个tab
  // 向右滑动（deltaX > 0）切换到上一个tab
  let targetIndex = currentIndex;

  if (deltaX < 0 && currentIndex < mainTabs.length - 1) {
    // 向左滑动，切换到下一个tab
    targetIndex = currentIndex + 1;
  } else if (deltaX > 0 && currentIndex > 0) {
    // 向右滑动，切换到上一个tab
    targetIndex = currentIndex - 1;
  }

  if (targetIndex !== currentIndex) {
    const targetTab = mainTabs[targetIndex];
    if (targetTab) {
      activeMainTab.value = targetTab.key;
      loadTabOnce(targetTab.key);
      nextTick(() => {
        flowChartInstance?.resize();
        Object.values(plateChartInstances).forEach((c: any) => c?.resize());
      });
      scrollTabIntoView(targetTab.key);
    }
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

  // 根据不同模式调整series颜色
  const getSeriesColors = () => {
    if (isGrayScale.value) {
      return ["#6b7280", "#808080", "#6b7280", "#707070", "#787878"];
    }
    return ["#3b82f6", "#ef4444", "#06b6d4", "#22c55e", "#f97316"];
  };

  const seriesColors = getSeriesColors();

  const option = {
    tooltip: {
      trigger: "axis",
      backgroundColor: isDarkMode.value
        ? "rgba(30, 30, 30, 0.95)"
        : "rgba(255, 255, 255, 0.95)",
      borderColor: isDarkMode.value
        ? "rgba(255, 255, 255, 0.2)"
        : "rgba(0, 0, 0, 0.1)",
      borderWidth: 1,
      textStyle: {
        color: isDarkMode.value ? "#f0f0f0" : "#1f2937",
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
        let html = `<div style="font-weight: 600; margin-bottom: 8px; color: ${isDarkMode.value ? "#f0f0f0" : "#1f2937"}">${time}</div>`;
        params.forEach((p: any) => {
          const color = isGrayScale.value
            ? isDarkMode.value
              ? "#9ca3af"
              : "#6b7280"
            : p.color;
          html += `<div style="display: flex; align-items: center; margin: 4px 0; gap: 8px">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${p.color}; flex-shrink: 0;"></span>
            <span style="flex: 1; color: ${isDarkMode.value ? "#d1d5db" : "#4b5563"}">${p.seriesName}:</span>
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
      textStyle: {
        fontSize: 11,
        color: isDarkMode.value ? "#d1d5db" : "#4b5563",
      },
    },
    grid: { left: 50, right: 16, top: 50, bottom: 40 },
    xAxis: {
      type: "category",
      data: times,
      axisLabel: {
        fontSize: 10,
        color: isDarkMode.value ? "#9ca3af" : "#6b7280",
      },
      axisLine: {
        lineStyle: {
          color: isDarkMode.value
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)",
        },
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        fontSize: 10,
        formatter: "{value}亿",
        color: isDarkMode.value ? "#9ca3af" : "#6b7280",
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: isDarkMode.value
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)",
        },
      },
      splitLine: {
        lineStyle: {
          type: "dashed",
          color: isDarkMode.value
            ? "rgba(255, 255, 255, 0.08)"
            : "rgba(0, 0, 0, 0.1)",
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
        color: seriesColors[0],
      },
      {
        name: "超大单净流入",
        type: "line",
        data: data.map((d) => parseFloat(d.superLarge.toFixed(2))),
        smooth: false,
        lineStyle: { width: 1.5 },
        symbol: "none",
        color: seriesColors[1],
      },
      {
        name: "大单净流入",
        type: "line",
        data: data.map((d) => parseFloat(d.large.toFixed(2))),
        smooth: false,
        lineStyle: { width: 1.5 },
        symbol: "none",
        color: seriesColors[2],
      },
      {
        name: "中单净流入",
        type: "line",
        data: data.map((d) => parseFloat(d.medium.toFixed(2))),
        smooth: false,
        lineStyle: { width: 1.5 },
        symbol: "none",
        color: seriesColors[3],
      },
      {
        name: "小单净流入",
        type: "line",
        data: data.map((d) => parseFloat(d.small.toFixed(2))),
        smooth: false,
        lineStyle: { width: 1.5 },
        symbol: "none",
        color: seriesColors[4],
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

// --- 滚动阴影效果 ---

function updateScrollShadows(scrollable: HTMLElement) {
  const scrollLeft = scrollable.scrollLeft;
  const scrollWidth = scrollable.scrollWidth;
  const clientWidth = scrollable.clientWidth;

  // 判断滚动位置状态
  const isAtStart = scrollLeft < 1;
  const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 1;

  // 更新 CSS 变量
  scrollable.style.setProperty("--scroll-shadow-left", isAtStart ? "0" : "1");
  scrollable.style.setProperty("--scroll-shadow-right", isAtEnd ? "0" : "1");
}

function setupScrollShadows() {
  const scrollbar = mainTabsScrollbar.value as any;
  if (!scrollbar) return;

  // 获取滚动容器
  const wrap = scrollbar?.$el?.querySelector(".el-scrollbar__wrap");
  if (!wrap) return;

  // 初始化
  updateScrollShadows(wrap);

  // 监听滚动事件
  const handleScroll = () => updateScrollShadows(wrap);
  wrap.addEventListener("scroll", handleScroll);

  // 保存清理函数
  (globalThis as any).__marketViewScrollCleanup = () => {
    wrap.removeEventListener("scroll", handleScroll);
  };
}

function cleanupScrollShadows() {
  const cleanup = (globalThis as any).__marketViewScrollCleanup;
  if (cleanup) cleanup();
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

  // 延迟一帧以确保 DOM 已完全挂载
  nextTick(() => {
    setupScrollShadows();
  });
});

onUnmounted(() => {
  clearAutoRefresh();
  cleanupScrollShadows();
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
  padding: 12px 12px 0;
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-top h2 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
  font-weight: 600;
}

.swipe-hint-icon {
  display: none;
  cursor: help;
  color: var(--el-color-info);
  font-size: 16px;
}

@media (max-width: 768px) {
  .swipe-hint-icon {
    display: inline-block;
  }
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
  padding: 10px 0px 0;
  --scroll-shadow-left: 0;
  --scroll-shadow-right: 1;
}

:deep(.main-tabs .el-scrollbar__wrap) {
  overflow-x: auto !important;
  overflow-y: hidden !important;
  /* 动态阴影效果：左右两侧的 inset 阴影 */
  box-shadow:
    inset calc(var(--scroll-shadow-left) * 12px) 0 6px -4px rgba(0, 0, 0, 0.08),
    inset calc(var(--scroll-shadow-right) * -12px) 0 6px -4px
      rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

html.dark :deep(.main-tabs .el-scrollbar__wrap) {
  box-shadow:
    inset calc(var(--scroll-shadow-left) * 12px) 0 6px -4px
      rgba(255, 255, 255, 0.06),
    inset calc(var(--scroll-shadow-right) * -12px) 0 6px -4px
      rgba(255, 255, 255, 0.06);
}

:deep(.main-tabs .el-scrollbar__bar) {
  display: none !important;
}

.main-tabs-inner {
  display: flex;
  gap: 6px;
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
  -webkit-tap-highlight-color: transparent;
}

.main-tab-item:first-of-type {
  margin-left: 12px;
}

.main-tab-item:last-of-type {
  margin-right: 12px;
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
  min-height: calc(100vh - 200px);
}

.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 两市统计条 */
.market-stat-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 14px 12px;
  background: var(--el-bg-color);
  border-radius: 12px;
  border: 1px solid var(--el-border-color);
}

.market-stat-heading {
  font-size: 18px;
  line-height: 1.2;
  font-weight: 700;
  color: var(--el-text-color-primary);
  text-align: center;
}

.market-stat-meta {
  display: flex;
  align-items: baseline;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 14px;
}

.market-stat-title {
  color: var(--el-text-color-secondary);
}

.market-stat-volume {
  font-size: 18px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.market-stat-unit {
  color: var(--el-text-color-secondary);
}

.market-stat-progress {
  position: relative;
  display: flex;
  align-items: stretch;
  width: 100%;
  min-height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-light);
}

.market-stat-progress.empty {
  justify-content: center;
  align-items: center;
  min-height: 28px;
}

.market-stat-segment {
  min-width: 0;
  transition: width 0.2s ease;
}

.market-stat-segment.is-up {
  background: linear-gradient(90deg, #ef4444, #f97316);
}

.market-stat-segment.is-flat {
  background: #9ca3af;
}

.market-stat-segment.is-down {
  background: linear-gradient(90deg, #22c55e, #16a34a);
}

.market-stat-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.market-stat-legend {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.market-stat-legend-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.2;
}

.market-stat-legend-item.is-up {
  color: var(--color-up);
}

.market-stat-legend-item.is-flat {
  color: var(--color-flat);
}

.market-stat-legend-item.is-down {
  color: var(--color-down);
}

.market-stat-legend-label {
  font-weight: 500;
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
  grid-template-columns: repeat(auto-fill, minmax(115px, 1fr));
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
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.2px;
  text-align: left;
}

.card-price {
  font-size: 24px;
  font-weight: 900;
  margin-bottom: 7px;
  line-height: 1;
  text-align: left;
}

.card-stats {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-stat-item {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
}

.card-stat-item--secondary {
  opacity: 0.72;
}

.card-stat-value {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.1;
}

.card-stat-value--muted {
  font-size: 11px;
  font-weight: 400;
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
  gap: 6px;
  flex-wrap: wrap;
}

.sub-tab-item {
  padding: 2px 12px;
  font-size: 12px;
  border-radius: 20px;
  cursor: pointer;
  user-select: none;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.sub-tab-item.active {
  background: var(--el-color-primary-light-7);
  color: var(--el-color-primary);
  border-color: var(--el-color-primary-light-5);
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

@media (max-width: 768px) {
  .index-images {
    gap: 8px;
  }

  .index-img-wrap img {
    width: 75px;
    height: 88px;
  }

  .img-label {
    font-size: 10px;
  }
}

@media (max-width: 480px) {
  .index-images {
    gap: 6px;
  }

  .index-img-wrap img {
    width: 65px;
    height: 77px;
  }

  .img-label {
    font-size: 9px;
  }
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
    gap: 8px;
    padding: 12px 10px 10px;
  }

  .market-stat-heading {
    font-size: 16px;
  }

  .market-stat-meta {
    font-size: 12px;
  }

  .market-stat-volume {
    font-size: 16px;
  }

  .market-stat-progress {
    min-height: 10px;
  }

  .market-stat-legend {
    gap: 8px;
  }

  .market-stat-legend-item {
    font-size: 12px;
  }

  .index-cards {
    grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
    gap: 8px;
  }

  .index-card {
    padding: 8px;
    border-left-width: 2px;
  }

  .card-name {
    font-size: 11px;
    margin-bottom: 4px;
    letter-spacing: 0;
  }

  .card-price {
    font-size: 18px;
    margin-bottom: 5px;
  }

  .card-stats {
    gap: 4px;
  }

  .card-stat-value--muted {
    font-size: 10px;
  }

  .index-images {
    gap: 8px;
  }

  .index-img-wrap img {
    width: 75px;
    height: 88px;
  }

  .img-label {
    font-size: 10px;
  }
}

@media (max-width: 480px) {
  .market-stat-bar {
    gap: 6px;
    padding: 10px 8px 9px;
    border-radius: 10px;
  }

  .market-stat-heading {
    font-size: 15px;
  }

  .market-stat-meta {
    gap: 4px;
    line-height: 1.2;
  }

  .market-stat-volume {
    font-size: 15px;
  }

  .market-stat-progress {
    min-height: 10px;
    border-radius: 12px;
  }

  .market-stat-legend {
    gap: 6px;
  }

  .market-stat-legend-item {
    font-size: 11px;
    gap: 4px;
  }

  .index-cards {
    grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
    gap: 6px;
  }

  .index-card {
    padding: 7px 6px;
  }

  .card-name {
    font-size: 11px;
  }

  .card-price {
    font-size: 17px;
  }

  .card-stats {
    gap: 2px;
  }

  .card-stat-value--muted {
    font-size: 9px;
  }

  .index-images {
    gap: 6px;
  }

  .index-img-wrap img {
    width: 65px;
    height: 77px;
  }

  .img-label {
    font-size: 9px;
  }
}
</style>
