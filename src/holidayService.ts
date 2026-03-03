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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data: any = await res.json();
    if (data && data.data) {
      holidayMap = data.data;
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

/**
 * 判断当前是否处于开市状态（节假日 + 交易时间段联合判定）
 * 交易时间：09:30-11:30 / 13:00-15:00（北京时间）
 */
export function isMarketOpen(now: Date = new Date()): boolean {
  if (isMarketClosed(now)) {
    return false;
  }

  // 转成北京时间
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const cn = new Date(utc + 8 * 3600000);
  const t = cn.getHours() * 100 + cn.getMinutes();

  return (t >= 930 && t <= 1130) || (t >= 1300 && t < 1500);
}
