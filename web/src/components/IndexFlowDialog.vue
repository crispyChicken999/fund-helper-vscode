<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="90%"
    top="10vh"
    :style="{ maxWidth: '1000px' }"
    @close="handleClose"
  >
    <div v-loading="loading" class="index-flow-container">
      <!-- 分时图表 -->
      <div ref="chartRef" class="chart-main"></div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { loadEcharts } from "@/utils/echarts";
import { fetchJSON } from "@/utils/jsonp";
import { useSettingStore } from "@/stores";

const props = defineProps<{
  modelValue: boolean;
  indexCode: string;
  indexName: string;
}>();

const isDarkMode = computed(() => useSettingStore().theme === "dark");

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const dialogTitle = computed(() => `${props.indexName}(${props.indexCode})`);

const chartRef = ref<HTMLElement | null>(null);
const loading = ref(false);
let chartInstance: any = null;
let DWJZ = 0; // 昨收价
let dataList: number[][] = [];
let timeData: string[] = [];

// 加载数据
async function loadData() {
  if (!props.indexCode) return;

  loading.value = true;
  try {
    await getData();
  } catch (error) {
    console.error("加载指数走势数据失败:", error);
  } finally {
    loading.value = false;
  }
}

// 获取数据（完全参考 indDetail.vue）
async function getData() {
  const url = `https://push2.eastmoney.com/api/qt/stock/trends2/get?secid=${props.indexCode}&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f53,f56,f58&iscr=0&iscca=0&ndays=1&forcect=1&_=${Date.now()}`;

  try {
    const res = await fetchJSON<any>(url);
    if (!res || !res.data) return;

    DWJZ = res.data.prePrice;
    dataList = res.data.trends.map((item: string) => {
      const parts = item.split(",");
      return [
        parts[0], // 时间
        parseFloat(parts[1]), // 价格
        parseFloat(parts[2]), // 成交量
        parseFloat(parts[3]), // 均价
      ];
    });

    // 生成时间轴（沪深市场 09:30-15:00）
    timeData = time_arr("hs");

    await nextTick();
    renderChart();
  } catch (error) {
    console.error("获取指数数据失败:", error);
  }
}

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

// 格式化数字
function formatNum(val: number): string {
  return (val / 10000).toFixed(3) + "万";
}

// 成交量颜色
function CJcolor(dataIndex: number): string {
  if (dataIndex === 0 || dataList[dataIndex][1] > dataList[dataIndex - 1][1]) {
    return "#f56c6c";
  } else {
    return "#4eb61b";
  }
}

// Y轴标签颜色
function yAxisLabelColor(val: number): string {
  return Number(val).toFixed(2) > DWJZ.toFixed(2)
    ? "#f56c6c"
    : Number(val).toFixed(2) === DWJZ.toFixed(2)
      ? "#666"
      : "#4eb61b";
}

// 计算Y轴范围
function handle_num(data: number[]): number {
  const _aa = Math.abs((Math.max(...data) - DWJZ) / DWJZ);
  const _bb = Math.abs((Math.min(...data) - DWJZ) / DWJZ);
  return _aa > _bb ? _aa : _bb;
}

// 格式化X轴标签
function fmtAxis(val: string): string {
  if (val === "11:30") {
    return "11:30/13:00";
  } else {
    return val;
  }
}

// X轴标签显示间隔
function fmtVal(val: string): boolean {
  const arr = ["09:30", "10:30", "11:30", "14:00", "15:00"];
  return arr.indexOf(val) !== -1;
}

// 渲染图表（完全参考 indDetail.vue）
async function renderChart() {
  if (!chartRef.value) return;

  const echarts = await loadEcharts();
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
  }

  const seriesData = dataList.map((item) => item[1]);
  const volumeData = dataList.map((item, index) => ({
    value: item[2],
    itemStyle: { color: CJcolor(index) },
  }));

  const aa = handle_num(seriesData);
  const minVal = DWJZ - DWJZ * aa;
  const maxVal = DWJZ + DWJZ * aa;
  const interval = Math.abs((DWJZ - minVal) / 4);
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
      axisPointer: {
        type: "cross",
        label: {
          show: true,
          color: "#ccc",
          backgroundColor: "rgba(0,0,0,0.6)",
        },
      },
      formatter: (p: any) => {
        if (!p || p.length === 0) return "";
        const dataIndex = p[0].dataIndex;
        const color =
          dataIndex === 0 || dataList[dataIndex][1] > dataList[dataIndex - 1][1]
            ? "#f56c6c"
            : "#4eb61b";
        const changePercent = (
          ((dataList[dataIndex][1] - DWJZ) * 100) /
          DWJZ
        ).toFixed(2);
        return `<div style="font-weight: 600; margin-bottom: 8px; color: ${isDarkMode.value ? "#fff" : "#333"}"">${p[0].name}</div>
          <div style="display: flex; align-items: center; margin: 4px 0; gap: 8px">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #3b82f6; flex-shrink: 0;"></span>
            <span style="flex: 1;">价格:</span>
            <span style="font-weight: 600;">${dataList[dataIndex][1]}</span>
          </div>
          <div style="display: flex; align-items: center; margin: 4px 0; gap: 8px">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${color}; flex-shrink: 0;"></span>
            <span style="flex: 1;">涨幅:</span>
            <span style="color: ${color}; font-weight: 600;">${changePercent}%</span>
          </div>
          <div style="display: flex; align-items: center; margin: 4px 0; gap: 8px">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #999; flex-shrink: 0;"></span>
            <span style="flex: 1;">成交量:</span>
            <span style="font-weight: 600;">${formatNum(dataList[dataIndex][2])}</span>
          </div>`;
      },
    },
    axisPointer: {
      link: { xAxisIndex: "all" },
    },
    grid: [
      {
        top: 20,
        left: 60,
        right: 60,
        height: "50%",
      },
      {
        show: true,
        left: 60,
        right: 60,
        top: "65%",
        height: "28%",
      },
    ],
    xAxis: [
      {
        data: timeData,
        position: "bottom",
        axisLine: {
          onZero: false,
        },
        axisLabel: {
          formatter: fmtAxis,
          interval: (_index: number, value: string) => fmtVal(value),
        },
      },
      {
        splitNumber: 2,
        type: "category",
        gridIndex: 1,
        boundaryGap: false,
        data: timeData,
        axisTick: {
          show: false,
        },
        splitLine: {
          show: true,
          lineStyle: {
            type: "dashed",
            color: "#ccc",
          },
        },
        axisLine: {
          lineStyle: {},
        },
        axisLabel: {
          formatter: fmtAxis,
          interval: (_index: number, value: string) => fmtVal(value),
        },
        axisPointer: {
          show: true,
          label: {
            formatter: (p: any) => {
              if (p.seriesData[0] && dataList[p.seriesData[0].dataIndex]) {
                return formatNum(dataList[p.seriesData[0].dataIndex][2]);
              }
              return "";
            },
          },
        },
      },
    ],
    yAxis: [
      {
        type: "value",
        min: minVal,
        max: maxVal,
        interval: interval,
        axisLine: {
          show: true,
        },
        axisLabel: {
          color: (val: number) => yAxisLabelColor(val),
          formatter: (val: number) => val.toFixed(2),
        },
        splitLine: {
          show: true,
          lineStyle: {
            type: "dashed",
            color: "#ccc",
          },
        },
        axisPointer: {
          show: true,
          label: {
            formatter: (params: any) => params.value.toFixed(2),
          },
        },
      },
      {
        type: "value",
        min: minVal,
        max: maxVal,
        interval: interval,
        axisLabel: {
          color: (val: number) => yAxisLabelColor(val),
          formatter: (val: number) => {
            let num = (((val - DWJZ) * 100) / DWJZ).toFixed(2);
            if (num === "-0.00") {
              num = "0.00";
            }
            return num + "%";
          },
        },
        splitLine: {
          show: true,
          lineStyle: {
            type: "dashed",
            color: "#ccc",
          },
        },
        axisPointer: {
          show: true,
          label: {
            formatter: (p: any) => {
              return (((p.value - DWJZ) * 100) / DWJZ).toFixed(2) + "%";
            },
          },
        },
      },
      {
        gridIndex: 1,
        z: 4,
        splitNumber: 3,
        axisLine: {
          onZero: false,
          show: false,
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisPointer: {
          show: true,
          label: {
            formatter: (params: any) => formatNum(params.value),
          },
        },
        axisLabel: {
          inside: false,
          fontSize: 10,
          onZero: false,
          formatter: (params: number) => {
            const _p = (params / 10000).toFixed(2);
            if (params === 0) {
              return "(万)";
            }
            return _p;
          },
        },
      },
    ],
    series: [
      {
        name: "涨幅",
        type: "line",
        data: seriesData,
        symbol: "none",
        lineStyle: {
          width: 1.5,
          color: "#3b82f6",
        },
        markLine: {
          silent: true,
          symbol: "none",
          animation: false,
          label: {
            show: false,
          },
          lineStyle: {
            type: "solid",
          },
          data: [
            {
              yAxis: DWJZ,
            },
          ],
        },
      },
      {
        name: "价格",
        type: "line",
        yAxisIndex: 1,
        symbol: "none",
        data: seriesData,
        lineStyle: {
          width: 0,
        },
      },
      {
        name: "成交量",
        type: "bar",
        gridIndex: 1,
        xAxisIndex: 1,
        yAxisIndex: 2,
        data: volumeData,
      },
    ],
  };

  chartInstance.setOption(option, true);
}

function handleClose() {
  visible.value = false;
}

// 监听弹窗打开，加载数据
watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      loadData();
    }
  },
);

// 监听窗口大小变化
watch(visible, (val) => {
  if (val) {
    nextTick(() => {
      chartInstance?.resize();
    });
  }
});
</script>

<style scoped>
.index-flow-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-main {
  width: 100%;
  height: 500px;
  min-height: 500px;
}

.action-row {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}
</style>
