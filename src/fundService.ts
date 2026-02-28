/**
 * 基金 API 服务层
 * 使用 fundgz.1234567.com.cn JSONP 接口获取基金实时估值
 */

import { FundInfo, FundConfig, NetValueRecord } from "./fundModel";

import { isMarketClosed } from "./holidayService";

/**
 * 批量获取基金实时和估值数据 (新接口替换旧接口)
 */
export async function getFundData(
  configs: FundConfig[],
  previousData: FundInfo[] = [],
): Promise<FundInfo[]> {
  if (configs.length === 0) {
    return [];
  }

  const codesMap = new Map<string, FundConfig>();
  configs.forEach((c) => codesMap.set(c.code, c));

  const fundCodes = configs.map((c) => c.code).join(",");
  // Fake deviceid as in the demo
  const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo?pageIndex=1&pageSize=200&plat=Android&appType=ttjj&product=EFund&Version=1&deviceid=12345678-1234-1234-1234-123456789012&Fcodes=${fundCodes}`;

  let datas: any[] = [];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data: any = await res.json();
      if (data && Array.isArray(data.Datas)) {
        datas = data.Datas;
      }
    }
  } catch (error) {
    console.error("fetch fund list failed", error);
  }

  const fundList: FundInfo[] = [];

  // Initialize with previous data if fetch failed for some funds
  for (const cfg of configs) {
    const val = datas.find((d) => d.FCODE === cfg.code);
    const shares = parseFloat(cfg.num) || 0;
    const cost = parseFloat(cfg.cost) || 0;

    if (!val) {
      const oldData = previousData.find((f) => f.code === cfg.code);
      if (oldData) {
        fundList.push(oldData);
      } else {
        fundList.push({
          code: cfg.code,
          name: cfg.code, // fallback
          netValue: 0,
          estimatedValue: null,
          changePercent: 0,
          updateTime: "获取失败",
          isRealValue: false,
          shares,
          cost,
          navChgRt: 0, // Real gain %
        });
      }
      continue;
    }

    // Determine if we have real update for today
    const pDate = val.PDATE; // e.g. "2024-05-31" or "--"
    const gzTime = val.GZTIME; // e.g. "2024-05-31 15:00"

    let isRealValue = false;
    let netValue = isNaN(parseFloat(val.NAV)) ? 0 : parseFloat(val.NAV);
    let estimatedValue: number | null = isNaN(parseFloat(val.GSZ)) ? null : parseFloat(val.GSZ);
    let changePercent = isNaN(parseFloat(val.GSZZL)) ? 0 : parseFloat(val.GSZZL);
    let navChgRt = isNaN(parseFloat(val.NAVCHGRT)) ? 0 : parseFloat(val.NAVCHGRT); // 实际涨跌幅

    if (pDate !== "--" && gzTime && typeof gzTime === "string" && pDate === gzTime.substring(0, 10)) {
      isRealValue = true;
      estimatedValue = netValue;
      changePercent = navChgRt; // Use real change percent when the day settles
    }

    fundList.push({
      code: val.FCODE,
      name: val.SHORTNAME || cfg.code,
      netValue,
      estimatedValue,
      changePercent,
      updateTime: val.GZTIME || "",
      isRealValue,
      shares,
      cost,
      navChgRt,
    });
  }

  return fundList;
}

/**
 * 搜索基金（模糊搜索）
 */
export async function searchFund(
  keyword: string,
): Promise<{ code: string; name: string }[]> {
  if (!keyword.trim()) {
    return [];
  }

  const url =
    `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx` +
    `?m=9&key=${encodeURIComponent(keyword)}&_=${Date.now()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  const res = await fetch(url, { signal: controller.signal }).catch(() => null);
  clearTimeout(timeoutId);

  let datas: any[] = [];
  if (res && res.ok) {
    const data: any = await res.json().catch(() => ({}));
    datas = data.Datas ?? [];
  }

  return datas.map((val: any) => ({
    code: val.CODE as string,
    name: val.NAME as string,
  }));
}

/**
 * 获取基金历史净值（最近 N 条）
 */
export async function getNetValueHistory(
  fundCode: string,
  pageSize: number = 10,
): Promise<NetValueRecord[]> {
  const url =
    `https://api.fund.eastmoney.com/f10/lsjz` +
    `?fundCode=${fundCode}&pageIndex=1&pageSize=${pageSize}` +
    `&startDate=&endDate=&_=${Date.now()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  const res = await fetch(url, {
    signal: controller.signal,
    headers: { Referer: "https://fundf10.eastmoney.com/" },
  }).catch(() => null);
  clearTimeout(timeoutId);

  let list: any[] = [];
  if (res && res.ok) {
    const data: any = await res.json().catch(() => ({}));
    list = data.Data?.LSJZList ?? [];
  }

  return list.map((item: any) => ({
    date: item.FSRQ as string,
    netValue: parseFloat(item.DWJZ) || 0,
    changePercent: parseFloat(item.JZZZL) || 0,
  }));
}
