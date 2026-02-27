/**
 * 基金 API 服务层
 * 使用 fundgz.1234567.com.cn JSONP 接口获取基金实时估值
 */

import axios from "axios";
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
  const res = await axios.get(url, { timeout: 10000, responseType: "text" });
  return parseJsonp(res.data);
}

/**
 * 批量获取基金实时估值数据
 */
export async function getFundData(configs: FundConfig[]): Promise<FundInfo[]> {
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

    if (result.status === "rejected" || !result.value) {
      continue;
    }

    const val = result.value;
    const shares = parseFloat(cfg.num) || 0;
    const cost = parseFloat(cfg.cost) || 0;

    fundList.push({
      code: val.fundcode || cfg.code,
      name: val.name || cfg.code,
      netValue: parseFloat(val.dwjz) || 0,
      estimatedValue: parseFloat(val.gsz) || null,
      changePercent: parseFloat(val.gszzl) || 0,
      updateTime: val.gztime || "",
      isRealValue: false,
      shares,
      cost,
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

  const res = await axios.get(url, { timeout: 10000 });
  const datas: any[] = res.data?.Datas ?? [];

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

  const res = await axios.get(url, {
    timeout: 10000,
    headers: { Referer: "https://fundf10.eastmoney.com/" },
  });

  const list: any[] = res.data?.Data?.LSJZList ?? [];

  return list.map((item: any) => ({
    date: item.FSRQ as string,
    netValue: parseFloat(item.DWJZ) || 0,
    changePercent: parseFloat(item.JZZZL) || 0,
  }));
}
