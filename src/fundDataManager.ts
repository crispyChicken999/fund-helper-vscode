/**
 * 基金数据管理器 - 统一数据源
 * 为 TreeView 和 WebviewView 提供共享的数据获取和计算服务
 */

import * as vscode from "vscode";
import { FundInfo, FundConfig } from "./fundModel";
import { getFundData, fetchFundRelateTheme } from "./fundService";
import { getFundGroups } from "./core";

/**
 * 账户汇总数据
 */
export interface AccountSummary {
  totalAssets: number;      // 总资产
  totalCost: number;         // 总成本
  holdingGain: number;       // 持有收益
  holdingGainRate: number;   // 持有收益率
  dailyGain: number;         // 日收益
  dailyGainRate: number;     // 日收益率
}

/**
 * 扩展的基金信息（包含关联板块）
 */
export interface ExtendedFundInfo extends FundInfo {
  relateTheme?: string;  // 关联板块
  group?: string; // 所属分组
}

/**
 * 基金数据管理器
 */
export class FundDataManager {
  private _fundDataCache: ExtendedFundInfo[] = [];
  private _previousFundData: FundInfo[] = [];
  private _relateThemeCache: Record<string, string> = {};
  
  /**
   * 获取基金配置
   */
  private _getFundConfigs(): FundConfig[] {
    return vscode.workspace
      .getConfiguration("fund-helper")
      .get<FundConfig[]>("funds", []);
  }

  /**
   * 分批获取关联板块数据
   */
  private async _fetchRelateThemeBatch(fundCodes: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    
    // 每批10个
    for (let i = 0; i < fundCodes.length; i += 10) {
      const batch = fundCodes.slice(i, i + 10);
      try {
        const data = await fetchFundRelateTheme(batch);
        if (data && data.data && data.data.fundRelateTheme) {
          const themes: any[] = data.data.fundRelateTheme;
          
          // 按基金代码分组，找出相关性最高的板块
          const themeByFund: Record<string, any[]> = {};
          themes.forEach((theme: any) => {
            const fcode = theme.FCODE;
            if (!themeByFund[fcode]) {
              themeByFund[fcode] = [];
            }
            themeByFund[fcode].push(theme);
          });
          
          // 为每个基金选择相关性最高的板块
          Object.keys(themeByFund).forEach(fcode => {
            const fundThemes = themeByFund[fcode];
            if (fundThemes.length > 0) {
              // 按相关性排序
              fundThemes.sort((a, b) => (b.CORR_1Y || 0) - (a.CORR_1Y || 0));
              result[fcode] = fundThemes[0].SEC_NAME || '';
            }
          });
        }
      } catch (error) {
        console.error(`获取关联板块失败 (batch ${i}-${i+batch.length}):`, error);
      }
    }
    
    return result;
  }

  /**
   * 刷新基金数据
   */
  async refreshFundData(): Promise<ExtendedFundInfo[]> {
    const configs = this._getFundConfigs();
    
    if (configs.length === 0) {
      this._fundDataCache = [];
      return [];
    }

    try {
      // 获取基金数据
      const fundDataList = await getFundData(configs, this._previousFundData);
      
      // 保存成功的数据作为备份
      this._previousFundData = fundDataList;

      // 获取关联板块数据（分批，每批10个）
      const fundCodes = configs.map(f => f.code);
      const relateThemeMap = await this._fetchRelateThemeBatch(fundCodes);
      
      // 更新缓存
      this._relateThemeCache = { ...this._relateThemeCache, ...relateThemeMap };

      // 构建code到config的映射，以便快速查找分组
      const configMap = new Map(configs.map(c => [c.code, c]));

      // 获取分组配置
      const fundGroups = getFundGroups();
      const codeToGroup = new Map<string, string>();
      for (const [gName, codes] of Object.entries(fundGroups)) {
        for (const code of codes) {
          if (!codeToGroup.has(code)) {
            codeToGroup.set(code, gName);
          }
        }
      }

      // 合并数据
      this._fundDataCache = fundDataList.map((fund) => {
        const groupName = codeToGroup.get(fund.code) || "全部";

        return {
          ...fund,
          relateTheme: this._relateThemeCache[fund.code] || '',
          group: groupName // 合并分组信息
        };
      });

      return this._fundDataCache;
    } catch (error) {
      console.error("刷新基金数据失败:", error);
      throw error;
    }
  }

  /**
   * 获取缓存的基金数据
   */
  getCachedFundData(): ExtendedFundInfo[] {
    return this._fundDataCache;
  }

  /**
   * 计算账户汇总数据
   * 注意：使用与旧视图相同的计算逻辑
   */
  calculateAccountSummary(fundDataList?: ExtendedFundInfo[]): AccountSummary {
    const data = fundDataList || this._fundDataCache;
    
    let totalAssets = 0;      // 账户资产（持有金额）= 份额 × 实际净值
    let totalCost = 0;        // 总成本
    let totalDailyGain = 0;   // 日收益

    data.forEach((fund) => {
      // 使用实际净值计算持有金额
      const actualNetValue = fund.netValue;
      const holdingAmount = fund.shares * actualNetValue;
      const costAmount = fund.shares * fund.cost;
      
      // 日收益计算（与旧视图保持一致）
      let dailyGain = 0;
      if (fund.shares > 0) {
        if (fund.isRealValue) {
          // 使用真实净值计算
          dailyGain = (fund.netValue - fund.netValue / (1 + fund.navChgRt * 0.01)) * fund.shares;
        } else if (fund.estimatedValue !== null) {
          // 使用估值计算
          dailyGain = (fund.estimatedValue - fund.netValue) * fund.shares;
        }
      }

      totalAssets += holdingAmount;
      totalCost += costAmount;
      totalDailyGain += dailyGain;
    });

    const holdingGain = totalAssets - totalCost;
    const holdingGainRate = totalCost > 0 ? (holdingGain / totalCost) * 100 : 0;
    const dailyGainRate = totalAssets > 0 ? (totalDailyGain / totalAssets) * 100 : 0;

    return {
      totalAssets,
      totalCost,
      holdingGain,
      holdingGainRate,
      dailyGain: totalDailyGain,
      dailyGainRate,
    };
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this._fundDataCache = [];
    this._previousFundData = [];
    this._relateThemeCache = {};
  }
}
