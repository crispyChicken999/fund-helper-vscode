import axios from "axios";
import * as vscode from "vscode";

const HOLIDAY_CACHE_KEY = "fund-helper.holidayData";

export interface HolidayData {
  holiday: boolean;
  name?: string;
  after?: boolean;
  target?: string;
  date?: string;
}

export interface HolidayJson {
  [year: string]: {
    [date: string]: HolidayData;
  };
}

let holidayMap: HolidayJson | null = null;

/**
 * 初始化节假日数据
 */
export async function initHolidayData(context: vscode.ExtensionContext) {
  // 先从本地缓存读取
  holidayMap = context.globalState.get<HolidayJson>(HOLIDAY_CACHE_KEY) || null;

  // 尝试联网更新
  try {
    const url = "https://funds.rabt.top/funds/holiday.json";
    const res = await axios.get(url, { timeout: 10000 });
    if (res.data && res.data.data) {
      holidayMap = res.data.data;
      await context.globalState.update(HOLIDAY_CACHE_KEY, holidayMap);
    }
  } catch (error) {
    console.error("fetch holiday data failed", error);
  }
}

/**
 * 判断指定日期（默认今天）是否休市
 */
export function isMarketClosed(date: Date = new Date()): boolean {
  // 周末默认休市
  const day = date.getDay();
  if (day === 0 || day === 6) {
    // 这里需要注意，有些周末是调休补班的，但股市周末一定不开盘
    return true;
  }

  // 检查节假日 API 里的数据
  if (!holidayMap) {
    return false; // 获取不到数据默认非休假
  }

  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const dayOfMonth = date.getDate().toString().padStart(2, "0");
  const dateStr = `${month}-${dayOfMonth}`;

  const yearData = holidayMap[year];
  if (yearData && yearData[dateStr]) {
    return yearData[dateStr].holiday === true;
  }

  return false;
}
