/**
 * 基金 API 服务层
 * 使用 fundgz.1234567.com.cn JSONP 接口获取基金实时估值
 */
import { FundInfo, FundConfig, NetValueRecord } from "./fundModel";

/**
 * 解析 JSONP 响应
 */
function parseJsonp(text: string): any {
  const match = text.match(/jsonpgz\((.*)\)/s);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * 获取单个基金实时估值
 */
async function fetchSingleFund(code: string): Promise<any> {
  const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const text = await res.text();
    return parseJsonp(text);
  } catch (error) {
    console.error(`fetch fund ${code} failed`, error);
    return null;
  }
}

/**
 * 批量获取基金实时估值数据
 */
export async function getFundData(
  configs: FundConfig[],
  previousData: FundInfo[] = [],
): Promise<FundInfo[]> {
  if (configs.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    configs.map((cfg) => fetchSingleFund(cfg.code)),
  );

  const fundList: FundInfo[] = [];

  for (let i = 0; i < configs.length; i++) {
    const cfg = configs[i];
    const result = results[i];
    const val = result.status === "fulfilled" ? result.value : null;

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

    const jzrq = val.jzrq;
    const gztime = val.gztime;

    let isRealValue = false;
    let netValue = isNaN(parseFloat(val.dwjz)) ? 0 : parseFloat(val.dwjz);
    let estimatedValue: number | null = isNaN(parseFloat(val.gsz)) ? null : parseFloat(val.gsz);
    let changePercent = isNaN(parseFloat(val.gszzl)) ? 0 : parseFloat(val.gszzl);
    let navChgRt = changePercent; // 使用估值涨跌幅作为实际涨跌幅

    if (jzrq && gztime && typeof gztime === "string" && jzrq === gztime.substring(0, 10)) {
      isRealValue = true;
      estimatedValue = netValue;
    }

    fundList.push({
      code: val.fundcode || cfg.code,
      name: val.name || cfg.code,
      netValue,
      estimatedValue,
      changePercent,
      updateTime: val.gztime || "",
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

/** 单根大盘指数数据结构 */
export interface MarketIndex {
  code: string;
  name: string;
  price: number;
  changePct: number;
  changeAbs: number;
}

/** 两市统计（成交额 + 涨平跌家数） */
export interface MarketStat {
  totalAmount: number;
  upCount: number;
  flatCount: number;
  downCount: number;
}

/**
 * 获取四大指数实时数据（宿主进程调用，无 CORS 限制）
 * secids: 上证001、沪深300、深证成指、创业板指
 */
export async function fetchMarketIndices(): Promise<MarketIndex[]> {
  const secids = '1.000001,1.000300,0.399001,0.399006';
  const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f4,f12,f13,f14&secids=${secids}&_=${Date.now()}`;
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(tid);
    if (!res.ok) { return []; }
    const json: any = await res.json();
    const diff: any[] = json?.data?.diff ?? [];
    return diff.map((d: any) => ({
      code: String(d.f12),
      name: String(d.f14),
      price: d.f2 ?? 0,
      changePct: d.f3 ?? 0,
      changeAbs: d.f4 ?? 0,
    }));
  } catch {
    return [];
  }
}

/**
 * 获取两市成交额 + 涨平跌家数（宿主进程调用）
 * f6=成交额, f104=上涨, f105=下跌, f106=平盘 (上证+深证成指汇总)
 */
export async function fetchMarketStat(): Promise<MarketStat> {
  const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&secids=1.000001,0.399001&fields=f1,f2,f3,f4,f6,f12,f13,f104,f105,f106&_=${Date.now()}`;
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(tid);
    if (!res.ok) { return { totalAmount: 0, upCount: 0, flatCount: 0, downCount: 0 }; }
    const json: any = await res.json();
    const diff: any[] = json?.data?.diff ?? [];
    let totalAmount = 0, upCount = 0, flatCount = 0, downCount = 0;
    diff.forEach((d: any) => {
      totalAmount += d.f6 ?? 0;
      upCount += d.f104 ?? 0;
      flatCount += d.f106 ?? 0;
      downCount += d.f105 ?? 0;
    });
    return { totalAmount, upCount, flatCount, downCount };
  } catch {
    return { totalAmount: 0, upCount: 0, flatCount: 0, downCount: 0 };
  }
}

/**
 * 通用宿主侧 JSON 代理请求（供 Webview 消息中继使用，绕过 CORS）
 */
export async function fetchJsonProxy(url: string): Promise<any> {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(tid);
    if (!res.ok) { return null; }
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * 获取基金关联板块数据（天天基金接口）
 * @param fundCodes 基金代码数组（最多10个）
 */
export async function fetchFundRelateTheme(fundCodes: string[]): Promise<any> {
  if (fundCodes.length === 0 || fundCodes.length > 10) {
    return null;
  }

  const fcode = fundCodes.join(',');
  const url = 'https://dgs.tiantianfunds.com/merge/m/api/jjxqy1_2';
  
  const params = new URLSearchParams({
    deviceid: '1d747ff7-7201-443e-95bd-2d13e30b9ffe',
    version: '9.9.9',
    appVersion: '6.5.5',
    product: 'EFund',
    plat: 'Web',
    uid: '',
    fcode: fcode,
    ISRG: '0',
    indexfields: '_id,INDEXCODE,BKID,INDEXNAME',
    fields: 'INDEXNAME,INDEXCODE,FCODE,TTYPENAME',
    fundUniqueInfo_fIELDS: 'FCODE',
    fundUniqueInfo_fLFIELDS: 'FCODE',
    cfhFundFInfo_fields: 'INVESTMENTIDEAR,INVESTMENTIDEARIMG',
    relateThemeFields: 'FCODE,SEC_CODE,SEC_NAME,CORR_1Y,OL2TOP'
  });

  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://h5.1234567.com.cn',
      },
      body: params.toString(),
      signal: controller.signal
    });
    clearTimeout(tid);
    
    if (!res.ok) { return null; }
    return await res.json();
  } catch (error) {
    console.error('fetchFundRelateTheme error:', error);
    return null;
  }
}

/**
 * 获取基金详细信息（天天基金详情接口）
 * @param fundCode 基金代码
 */
export async function fetchFundDetailInfo(fundCode: string): Promise<any> {
  const url = 'https://dgs.tiantianfunds.com/merge/m/api/jjxqy1_2';
  
  const params = new URLSearchParams({
    deviceid: 'fd7dac76-c5e9-4723-8fe6-7b436b2b1443',
    version: '9.9.9',
    appVersion: '6.5.5',
    product: 'EFund',
    plat: 'Web',
    uid: '',
    fcode: fundCode,
    ISRG: '0',
    indexfields: '_id,INDEXCODE,BKID,INDEXNAME,INDEXVALUA,NEWINDEXTEXCH,PEP100',
    fields: 'BENCH,ESTDIFF,INDEXNAME,LINKZSB,INDEXCODE,NEWTEXCH,FTYPE,FCODE,BAGTYPE,RISKLEVEL,TTYPENAME,PTDT_FY,PTDT_TRY,PTDT_TWY,PTDT_Y,DWDT_FY,DWDT_TRY,DWDT_TWY,DWDT_Y,MBDT_FY,MBDT_TRY,MBDT_TWY,MBDT_Y,YDDT_FY,YDDT_TRY,YDDT_TWY,YDDT_Y,BFUNDTYPE,YMATCHCODEA,RLEVEL_SZ,RLEVEL_CX,ESTABDATE,JJGS,JJGSID,ENDNAV,FEGMRQ,SHORTNAME,TTYPE,TJDIN,FUNDEXCHG,LISTTEXCHMARK,FSRQ,ISSBDATE,ISSEDATE,FEATURE,DWJZ,LJJZ,MINRG,RZDF,PERIODNAME,SYL_1N,SYL_LN,SYL_Z,SOURCERATE,RATE,TSRQ,BTYPE,BUY,BENCHCODE,BENCH_CORR,TRKERROR,BENCHRATIO,NEWINDEXTEXCH,BESTDT_STRATEGY,BESTDT_Y,BESTDT_TWY,BESTDT_TRY,BESTDT_FY',
    fundUniqueInfo_fIELDS: 'FCODE,STDDEV1,STDDEV_1NRANK,STDDEV_1NFSC,STDDEV3,STDDEV_3NRANK,STDDEV_3NFSC,STDDEV5,STDDEV_5NRANK,STDDEV_5NFSC,SHARP1,SHARP_1NRANK,SHARP_1NFSC,SHARP3,SHARP_3NRANK,SHARP_3NFSC,SHARP5,SHARP_5NRANK,SHARP_5NFSC,MAXRETRA1,MAXRETRA_1NRANK,MAXRETRA_1NFSC,MAXRETRA3,MAXRETRA_3NRANK,MAXRETRA_3NFSC,MAXRETRA5,MAXRETRA_5NRANK,MAXRETRA_5NFSC,TRKERROR1,TRKERROR_1NRANK,TRKERROR_1NFSC,TRKERROR3,TRKERROR_3NRANK,TRKERROR_3NFSC,TRKERROR5,TRKERROR_5NRANK,TRKERROR_5NFSC',
    fundUniqueInfo_fLFIELDS: 'FCODE,BUSINESSTYPE,BUSINESSTEXT,BUSINESSCODE,BUSINESSSUBTYPE,MARK',
    cfhFundFInfo_fields: 'INVESTMENTIDEAR,INVESTMENTIDEARIMG',
    relateThemeFields: 'FCODE,SEC_CODE,SEC_NAME,CORR_1Y,OL2TOP'
  });

  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://h5.1234567.com.cn',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
        'Referer': 'https://servicewechat.com/',
      },
      body: params.toString(),
      signal: controller.signal
    });
    clearTimeout(tid);
    
    if (!res.ok) { return null; }
    return await res.json();
  } catch (error) {
    console.error('fetchFundDetailInfo error:', error);
    return null;
  }
}
