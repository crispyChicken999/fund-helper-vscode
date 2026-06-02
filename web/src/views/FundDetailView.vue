<template>
  <DetailLayout>
    <template #header>
      <div class="detail-header">
        <div class="header-left">
          <el-button plain :icon="ArrowLeft" @click="goBack" round size="small"
            >返回</el-button
          >
          <div class="header-info">
            <span class="fund-name">{{ displayName }}</span>
            <div class="fund-code-row">
              <div class="fund-code-row-wrap">
                <span class="fund-code">{{ code }}</span>
                <div class="fund-nav-btns">
                  <el-button
                    size="small"
                    text
                    :disabled="prevCode === null"
                    :title="prevCode ? `上一个：${prevCode}` : '已是第一个'"
                    @click="navigateTo(prevCode)"
                    >‹</el-button
                  >
                  <span class="fund-nav-pos"
                    >{{ currentIndex + 1 }} / {{ allFundCodes.length }}</span
                  >
                  <el-button
                    size="small"
                    text
                    :disabled="nextCode === null"
                    :title="nextCode ? `下一个：${nextCode}` : '已是最后一个'"
                    @click="navigateTo(nextCode)"
                    >›</el-button
                  >
                </div>
              </div>
              <el-popover
                placement="bottom"
                title="提示"
                :width="200"
                trigger="hover"
                content="左右滑动切换 Tab"
                class="swipe-hint-popover"
              >
                <template #reference>
                  <el-icon class="swipe-hint-icon">
                    <QuestionFilled />
                  </el-icon>
                </template>
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
      <!-- Tab 栏 -->
      <div class="detail-tabs">
        <el-scrollbar ref="tabScrollbarRef">
          <div ref="tabsInnerRef" class="detail-tabs-inner">
            <span
              v-for="tab in tabs"
              :key="tab.key"
              :data-tab-key="tab.key"
              class="tab-item"
              :class="{ active: activeTab === tab.key }"
              @click="switchTab(tab.key)"
            >
              {{ tab.label }}
            </span>
          </div>
        </el-scrollbar>
      </div>
    </template>

    <div
      class="detail-main"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <!-- 持仓信息 -->
      <div v-show="activeTab === 'holding'" class="tab-panel">
        <div v-if="detailRow" class="holding-sections">
          <div class="holding-section">
            <div class="section-title">估算数据</div>
            <div class="info-grid-2col">
              <div class="grid-item">
                <span class="g-label"
                  >估算涨幅 ({{ detailRow.estimatedDateLabel }})</span
                >
                <span
                  class="g-value"
                  :class="
                    estClass(detailRow.gszzl, detailRow.shouldShowEstimated)
                  "
                >
                  {{
                    fmtEstPct(detailRow.gszzl, detailRow.shouldShowEstimated)
                  }}
                </span>
              </div>
              <div class="grid-item">
                <span class="g-label"
                  >估算收益 ({{ detailRow.estimatedDateLabel }})</span
                >
                <span
                  class="g-value"
                  :class="
                    estClass(
                      detailRow.estimatedGain,
                      detailRow.shouldShowEstimated,
                    )
                  "
                >
                  {{
                    fmtEstMoney(
                      detailRow.estimatedGain,
                      detailRow.shouldShowEstimated,
                    )
                  }}
                </span>
              </div>
            </div>
          </div>

          <div class="holding-section">
            <div class="section-title">当日数据</div>
            <div class="info-grid-2col">
              <div class="grid-item">
                <span class="g-label"
                  >当日涨幅 ({{ detailRow.navDateLabel }})</span
                >
                <span class="g-value" :class="pctClass(detailRow.navChgRt)">
                  {{ fmtPct(detailRow.navChgRt) }}
                </span>
              </div>
              <div class="grid-item">
                <span class="g-label"
                  >当日收益 ({{ detailRow.navDateLabel }})</span
                >
                <span class="g-value" :class="pctClass(detailRow.dailyGain)">
                  {{ fmtMoney(detailRow.dailyGain) }}
                </span>
              </div>
            </div>
          </div>

          <div class="holding-section">
            <div class="section-title">持有收益</div>
            <div class="info-grid-2col">
              <div class="grid-item">
                <span class="g-label">持有收益</span>
                <span class="g-value" :class="pctClass(detailRow.holdingGain)">
                  {{ fmtMoney(detailRow.holdingGain) }}
                </span>
              </div>
              <div class="grid-item">
                <span class="g-label">总收益率</span>
                <span
                  class="g-value"
                  :class="pctClass(detailRow.holdingGainRate)"
                >
                  {{ fmtPct(detailRow.holdingGainRate) }}
                </span>
              </div>
            </div>
          </div>

          <div class="holding-section">
            <div class="section-title">持仓信息</div>
            <div class="info-grid-2col">
              <div class="grid-item">
                <span class="g-label">持有成本</span>
                <span class="g-value">{{
                  fmtMoney(detailRow.costAmount)
                }}</span>
              </div>
              <div class="grid-item">
                <span class="g-label">持有市值</span>
                <span class="g-value">{{
                  fmtMoney(detailRow.holdingAmount)
                }}</span>
              </div>
              <div class="grid-item">
                <span class="g-label">持有份额</span>
                <span class="g-value">{{ fmtNum(detailRow.fund.num) }}</span>
              </div>
              <div class="grid-item">
                <span class="g-label">成本价</span>
                <span class="g-value">{{ fmtPrice(detailRow.fund.cost) }}</span>
              </div>
              <div class="grid-item">
                <span class="g-label">估算净值</span>
                <span class="g-value">{{
                  fmtPrice(detailRow.displayGsz)
                }}</span>
              </div>
              <div class="grid-item">
                <span class="g-label">单位净值</span>
                <span class="g-value">{{ fmtPrice(detailRow.dwjz) }}</span>
              </div>
            </div>
          </div>

          <div class="holding-section">
            <div class="section-title">其他信息</div>
            <div class="info-grid-2col">
              <div class="grid-item">
                <span class="g-label">关联板块</span>
                <span class="g-value">{{ detailRow.relateTheme || "--" }}</span>
              </div>
              <div class="grid-item">
                <span class="g-label">更新时间</span>
                <span class="g-value">
                  {{ detailRow.fullUpdateTime || detailRow.updateTime || "--" }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-row" v-if="fundView">
          <el-button type="primary" @click="handleOpenEditDialog" plain
            >编辑持仓</el-button
          >
          <el-button type="danger" plain @click="confirmDelete"
            >删除基金</el-button
          >
        </div>
      </div>

      <!-- 持仓明细 -->
      <div v-show="activeTab === 'position'" class="tab-panel">
        <div v-if="tabLoading && !positionData" class="loading-hint">
          <div class="loading-box">
            <div class="spinner" role="status" aria-label="加载中"></div>
            <div class="loading-text">加载中...</div>
          </div>
        </div>
        <template v-else-if="positionData">
          <div
            class="position-header"
            v-if="positionData.stocks.length || positionData.bonds.length"
          >
            <span class="position-date"
              >截止日期：{{ positionData.expansion }}</span
            >
          </div>

          <!-- 股票持仓 -->
          <div v-if="positionData.stocks.length" class="position-section">
            <div class="position-section-title">股票持仓</div>
            <el-table
              :data="positionData.stocks"
              stripe
              size="small"
              border
              :cell-style="{ textAlign: 'center' }"
              :header-cell-style="{ fontWeight: 'bold', textAlign: 'center' }"
            >
              <el-table-column
                prop="name"
                label="股票名称（代码）"
                min-width="100"
              >
                <template #default="{ row: s }">
                  <div class="stock-name">{{ s.name }}</div>
                  <div class="stock-code">{{ s.code }}</div>
                </template>
              </el-table-column>
              <el-table-column
                prop="price"
                label="价格"
                min-width="60"
                align="right"
              >
                <template #default="{ row: s }">
                  {{ s.price != null ? safeNum(s.price).toFixed(2) : "--" }}
                </template>
              </el-table-column>
              <el-table-column
                prop="changePercent"
                label="涨跌幅"
                min-width="60"
                align="right"
              >
                <template #default="{ row: s }">
                  <span :class="stockChangeClass(s.changePercent)">
                    {{
                      s.changePercent != null
                        ? (safeNum(s.changePercent) > 0 ? "+" : "") +
                          safeNum(s.changePercent).toFixed(2) +
                          "%"
                        : "--"
                    }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column
                prop="ratio"
                label="持仓占比"
                min-width="60"
                align="right"
              >
                <template #default="{ row: s }">
                  {{ safeNum(s.ratio).toFixed(2) }}%
                </template>
              </el-table-column>
              <el-table-column
                prop="compared"
                label="较上期"
                min-width="60"
                align="right"
              >
                <template #default="{ row: s }">
                  <span :class="comparedClass(s)">{{ comparedText(s) }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 债券持仓 -->
          <div v-if="positionData.bonds.length" class="position-section">
            <div class="position-section-title">债券持仓</div>
            <el-table
              :data="positionData.bonds"
              stripe
              size="small"
              border
              :cell-style="{ textAlign: 'center' }"
              :header-cell-style="{ fontWeight: 'bold', textAlign: 'center' }"
            >
              <el-table-column
                prop="name"
                label="债券名称（代码）"
                min-width="100"
              >
                <template #default="{ row: b }">
                  <div class="stock-name">{{ b.name }}</div>
                  <div class="stock-code">{{ b.code }}</div>
                </template>
              </el-table-column>
              <el-table-column
                prop="ratio"
                label="占净值比"
                min-width="60"
                align="right"
              >
                <template #default="{ row: b }">
                  {{ safeNum(b.ratio).toFixed(2) }}%
                </template>
              </el-table-column>
            </el-table>
          </div>

          <el-empty
            v-if="!positionData.stocks.length && !positionData.bonds.length"
            description="暂无持仓数据"
          />
        </template>
        <el-empty v-else-if="!tabLoading" description="暂无持仓数据" />
      </div>

      <!-- 基金概况 -->
      <div v-show="activeTab === 'overview'" class="tab-panel">
        <div v-if="overview" class="info-list">
          <div class="info-row">
            <span>基金类型</span><span>{{ overview.ftype || "--" }}</span>
          </div>
          <div class="info-row">
            <span>风险等级</span
            ><span>{{ riskLabel(overview.riskLevel || "") }}</span>
          </div>
          <div class="info-row">
            <span>成立日期</span><span>{{ overview.estabDate || "--" }}</span>
          </div>
          <div class="info-row">
            <span>基金规模</span
            ><span>{{
              overview.endNav ? overview.endNav + " 亿元" : "--"
            }}</span>
          </div>
          <div class="info-row">
            <span>基金公司</span><span>{{ overview.company || "--" }}</span>
          </div>
          <div class="info-row">
            <span>基金经理</span
            ><span>{{
              overview.managerName || managers[0]?.name || "--"
            }}</span>
          </div>
          <div class="info-row">
            <span>单位净值</span
            ><span>{{
              overview.nav ? overview.nav + " (" + overview.navDate + ")" : "--"
            }}</span>
          </div>
          <div class="info-row">
            <span>累计净值</span><span>{{ overview.accNav || "--" }}</span>
          </div>
          <div class="info-row" v-if="overview.indexName">
            <span>跟踪指数</span><span>{{ overview.indexName }}</span>
          </div>
          <div class="info-row" v-if="overview.bench">
            <span>基准指数</span
            ><span class="bench-text">{{ overview.bench }}</span>
          </div>
        </div>

        <!-- 阶段收益率 -->
        <div v-if="periodIncrease" class="info-list" style="margin-top: 12px">
          <div class="info-row section-title">
            <span>阶段收益率</span><span></span>
          </div>
          <div class="info-row">
            <span>近1周</span
            ><span :class="pctClass(calcWeekRate)">{{
              calcWeekRate !== null
                ? (safeNum(calcWeekRate) > 0 ? "+" : "") +
                  safeNum(calcWeekRate).toFixed(2) +
                  "%"
                : "--"
            }}</span>
          </div>
          <div class="info-row">
            <span>近1月</span
            ><span :class="pctClass(parseFloat(periodIncrease.monthRate))"
              >{{
                periodIncrease.monthRate
                  ? periodIncrease.monthRate + "%"
                  : "--"
              }}{{
                periodIncrease.monthRank
                  ? " (第" + periodIncrease.monthRank + "名)"
                  : ""
              }}</span
            >
          </div>
          <div class="info-row">
            <span>近3月</span
            ><span :class="pctClass(parseFloat(periodIncrease.threeMonthRate))"
              >{{
                periodIncrease.threeMonthRate
                  ? periodIncrease.threeMonthRate + "%"
                  : "--"
              }}{{
                periodIncrease.threeMonthRank
                  ? " (第" + periodIncrease.threeMonthRank + "名)"
                  : ""
              }}</span
            >
          </div>
          <div class="info-row">
            <span>近6月</span
            ><span :class="pctClass(parseFloat(periodIncrease.sixMonthRate))"
              >{{
                periodIncrease.sixMonthRate
                  ? periodIncrease.sixMonthRate + "%"
                  : "--"
              }}{{
                periodIncrease.sixMonthRank
                  ? " (第" + periodIncrease.sixMonthRank + "名)"
                  : ""
              }}</span
            >
          </div>
          <div class="info-row">
            <span>近1年</span
            ><span :class="pctClass(parseFloat(periodIncrease.yearRate))"
              >{{
                periodIncrease.yearRate ? periodIncrease.yearRate + "%" : "--"
              }}{{
                periodIncrease.yearRank
                  ? " (第" + periodIncrease.yearRank + "名)"
                  : ""
              }}</span
            >
          </div>
          <div class="info-row">
            <span>近3年</span
            ><span :class="pctClass(parseFloat(periodIncrease.threeYearRate))"
              >{{
                periodIncrease.threeYearRate
                  ? periodIncrease.threeYearRate + "%"
                  : "--"
              }}{{
                periodIncrease.threeYearRank
                  ? " (第" + periodIncrease.threeYearRank + "名)"
                  : ""
              }}</span
            >
          </div>
          <div class="info-row">
            <span>近5年</span
            ><span :class="pctClass(parseFloat(periodIncrease.fiveYearRate))"
              >{{
                periodIncrease.fiveYearRate
                  ? periodIncrease.fiveYearRate + "%"
                  : "--"
              }}{{
                periodIncrease.fiveYearRank
                  ? " (第" + periodIncrease.fiveYearRank + "名)"
                  : ""
              }}</span
            >
          </div>
          <div class="info-row">
            <span>成立以来</span
            ><span
              :class="pctClass(parseFloat(periodIncrease.sinceEstablishRate))"
              >{{
                periodIncrease.sinceEstablishRate
                  ? periodIncrease.sinceEstablishRate + "%"
                  : "--"
              }}</span
            >
          </div>
        </div>

        <!-- 交易与费率信息 -->
        <div v-if="featureRaw" class="info-list" style="margin-top: 12px">
          <div class="info-row section-title">
            <span>交易与费率信息</span><span></span>
          </div>
          <div class="info-row">
            <span>首次认购最低额</span
            ><span>{{
              featureRaw.MINRG ? featureRaw.MINRG + " 元" : "--"
            }}</span>
          </div>
          <div class="info-row">
            <span>首次申购最低额</span
            ><span>{{
              featureRaw.MINSG ? featureRaw.MINSG + " 元" : "--"
            }}</span>
          </div>
          <div class="info-row">
            <span>最小定投金额</span
            ><span>{{
              featureRaw.MINDT ? featureRaw.MINDT + " 元" : "--"
            }}</span>
          </div>
          <div class="info-row">
            <span>当前申购费率</span><span>{{ featureRaw.RATE || "--" }}</span>
          </div>
          <div class="info-row">
            <span>原始申购费率</span
            ><span>{{ featureRaw.SOURCERATE || "--" }}</span>
          </div>
          <div class="info-row">
            <span>认购起始日期</span
            ><span>{{
              featureRaw.ISSBDATE ? featureRaw.ISSBDATE.split(" ")[0] : "--"
            }}</span>
          </div>
          <div class="info-row">
            <span>认购截止日期</span
            ><span>{{
              featureRaw.ISSEDATE ? featureRaw.ISSEDATE.split(" ")[0] : "--"
            }}</span>
          </div>
          <div class="info-row">
            <span>基金封闭运作期</span
            ><span>{{ featureRaw.CYCLE || "无封闭期(即开即赎)" }}</span>
          </div>
          <div class="info-row" style="margin-bottom: 30px">
            <span>申购/赎回状态</span
            ><span
              >{{ featureRaw.SGZT || "--" }} /
              {{ featureRaw.SHZT || "--" }}</span
            >
          </div>
        </div>

        <el-empty v-if="!overview && !tabLoading" description="暂无概况数据" />
        <div v-if="tabLoading && !overview" class="loading-hint">
          <div class="loading-box">
            <div class="spinner" role="status" aria-label="加载中"></div>
            <div class="loading-text">加载中...</div>
          </div>
        </div>
      </div>

      <!-- 特色数据 -->
      <div v-show="activeTab === 'feature'" class="tab-panel">
        <div v-if="featureData && !tabLoading" class="feature-container">
          <!-- 期限选择器 -->
          <div class="range-tabs">
            <span
              class="range-item"
              :class="{ active: activeFeatureRange === '1n' }"
              @click="activeFeatureRange = '1n'"
            >
              近1年
            </span>
            <span
              class="range-item"
              :class="{ active: activeFeatureRange === '3n' }"
              @click="activeFeatureRange = '3n'"
            >
              近3年
            </span>
            <span
              class="range-item"
              :class="{ active: activeFeatureRange === '5n' }"
              @click="activeFeatureRange = '5n'"
            >
              近5年
            </span>
          </div>

          <!-- 指标卡片列表 -->
          <div v-if="currentFeatureMetrics" class="feature-card-list">
            <!-- 波动率 / 移动率 -->
            <div class="feature-card">
              <div class="feature-card-header">
                <div class="feature-metric-info">
                  <span class="feature-value">
                    {{
                      currentFeatureMetrics.stddev != null
                        ? currentFeatureMetrics.stddev.toFixed(2) + "%"
                        : "--"
                    }}
                  </span>
                  <span class="feature-label">移动率（波动率）</span>
                </div>
                <div class="feature-rank-info">
                  <span
                    v-if="currentFeatureMetrics.stddevRatio != null"
                    class="feature-rank-desc"
                  >
                    领先
                    <span class="highlight-text"
                      >{{ currentFeatureMetrics.stddevRatio.toFixed(2) }}%</span
                    >
                    同类
                  </span>
                  <span v-else class="feature-rank-desc">暂无排名</span>
                </div>
              </div>
              <!-- 进度条轨道 -->
              <div class="feature-progress-track stddev-track">
                <div
                  v-if="currentFeatureMetrics.stddevRatio != null"
                  class="feature-progress-fill stddev-fill"
                  :style="{ width: currentFeatureMetrics.stddevRatio + '%' }"
                ></div>
                <div
                  v-if="currentFeatureMetrics.stddevRatio != null"
                  class="progress-indicator stddev-indicator"
                  :style="{ left: currentFeatureMetrics.stddevRatio + '%' }"
                >
                  <div class="indicator-arrow"></div>
                </div>
              </div>
            </div>

            <!-- 夏普比率 -->
            <div class="feature-card">
              <div class="feature-card-header">
                <div class="feature-metric-info">
                  <span class="feature-value">
                    {{
                      currentFeatureMetrics.sharp != null
                        ? currentFeatureMetrics.sharp.toFixed(4)
                        : "--"
                    }}
                  </span>
                  <span class="feature-label">夏普比率</span>
                </div>
                <div class="feature-rank-info">
                  <span
                    v-if="currentFeatureMetrics.sharpRatio != null"
                    class="feature-rank-desc"
                  >
                    领先
                    <span class="highlight-text"
                      >{{ currentFeatureMetrics.sharpRatio.toFixed(2) }}%</span
                    >
                    同类
                  </span>
                  <span v-else class="feature-rank-desc">暂无排名</span>
                </div>
              </div>
              <!-- 进度条轨道 -->
              <div class="feature-progress-track sharp-track">
                <div
                  v-if="currentFeatureMetrics.sharpRatio != null"
                  class="feature-progress-fill sharp-fill"
                  :style="{ width: currentFeatureMetrics.sharpRatio + '%' }"
                ></div>
                <div
                  v-if="currentFeatureMetrics.sharpRatio != null"
                  class="progress-indicator sharp-indicator"
                  :style="{ left: currentFeatureMetrics.sharpRatio + '%' }"
                >
                  <div class="indicator-arrow"></div>
                </div>
              </div>
            </div>

            <!-- 最大回撤 -->
            <div class="feature-card">
              <div class="feature-card-header">
                <div class="feature-metric-info">
                  <span class="feature-value">
                    {{
                      currentFeatureMetrics.maxRetra != null
                        ? currentFeatureMetrics.maxRetra.toFixed(2) + "%"
                        : "--"
                    }}
                  </span>
                  <span class="feature-label">最大回撤</span>
                </div>
                <div class="feature-rank-info">
                  <span
                    v-if="currentFeatureMetrics.maxRetraRatio != null"
                    class="feature-rank-desc"
                  >
                    领先
                    <span class="highlight-text"
                      >{{
                        currentFeatureMetrics.maxRetraRatio.toFixed(2)
                      }}%</span
                    >
                    同类
                  </span>
                  <span v-else class="feature-rank-desc">暂无排名</span>
                </div>
              </div>
              <!-- 进度条轨道 -->
              <div class="feature-progress-track maxretra-track">
                <div
                  v-if="currentFeatureMetrics.maxRetraRatio != null"
                  class="feature-progress-fill maxretra-fill"
                  :style="{ width: currentFeatureMetrics.maxRetraRatio + '%' }"
                ></div>
                <div
                  v-if="currentFeatureMetrics.maxRetraRatio != null"
                  class="progress-indicator maxretra-indicator"
                  :style="{ left: currentFeatureMetrics.maxRetraRatio + '%' }"
                >
                  <div class="indicator-arrow"></div>
                </div>
              </div>
            </div>
          </div>
          <el-empty v-else description="该期限下暂无特色指标数据" />
        </div>
        <el-empty
          v-if="!featureData && !tabLoading"
          description="暂无特色数据"
        />
        <div v-if="tabLoading" class="loading-hint">
          <div class="loading-box">
            <div class="spinner" role="status" aria-label="加载中"></div>
            <div class="loading-text">加载中...</div>
          </div>
        </div>
      </div>

      <!-- 基金经理 -->
      <div v-show="activeTab === 'manager'" class="tab-panel">
        <div v-if="managers.length" class="manager-list">
          <div v-for="m in managers" :key="m.name" class="manager-card">
            <div class="manager-header">
              <img
                v-if="m.avatar"
                class="manager-avatar"
                :src="m.avatar"
                :alt="m.name"
                referrerpolicy="no-referrer"
              />
              <div class="manager-info">
                <div class="manager-name">{{ m.name }}</div>
                <div class="manager-tags">
                  <span class="manager-tag">任职 {{ m.years }}</span>
                  <span
                    class="manager-tag"
                    :class="pctClass(parseFloat(m.returnRate))"
                    >任职回报 {{ parseFloat(m.returnRate) > 0 ? "+" : ""
                    }}{{ m.returnRate }}%</span
                  >
                </div>
              </div>
            </div>
            <div class="manager-stats-row">
              <div class="manager-stat">
                <div class="stat-label">任职天数</div>
                <div class="stat-value">{{ m.totalDays }}天</div>
              </div>
              <div class="manager-stat">
                <div class="stat-label">年化收益</div>
                <div
                  class="stat-value"
                  :class="pctClass(parseFloat(m.yieldSe))"
                >
                  {{ parseFloat(m.yieldSe) > 0 ? "+" : "" }}{{ m.yieldSe }}%
                </div>
              </div>
            </div>
            <div v-if="m.investmentIdea" class="manager-desc">
              <strong>投资理念：</strong>{{ m.investmentIdea }}
            </div>
            <el-scrollbar>
              <div v-if="m.resume" class="manager-resume">
                <strong>个人简历：</strong>
                <div class="resume-content" v-html="m.resume"></div>
              </div>
            </el-scrollbar>
          </div>
        </div>
        <el-empty v-else-if="!tabLoading" description="暂无经理信息" />
        <div v-else class="loading-hint">
          <div class="loading-box">
            <div class="spinner" role="status" aria-label="加载中"></div>
            <div class="loading-text">加载中...</div>
          </div>
        </div>
      </div>

      <!-- 关联板块 -->
      <div v-show="activeTab === 'theme'" class="tab-panel">
        <div v-if="themes.length" class="theme-list">
          <div v-for="t in themes" :key="t.secName" class="theme-item">
            <span class="theme-name">{{ t.secName }}</span>
            <span class="theme-corr"
              >相关性：{{ safeNum(t.corr1y).toFixed(2) }}</span
            >
          </div>
        </div>
        <el-empty v-else-if="!tabLoading" description="暂无关联板块数据" />
        <div v-else class="loading-hint">
          <div class="loading-box">
            <div class="spinner" role="status" aria-label="加载中"></div>
            <div class="loading-text">加载中...</div>
          </div>
        </div>
      </div>

      <!-- 深度数据 -->
      <div v-show="activeTab === 'deep'" class="tab-panel">
        <div v-if="pingzhongDetail" class="deep-sections">
          <!-- 阶段收益率 -->
          <div class="deep-summary-card">
            <div class="deep-section-header">
              <span class="deep-section-title">阶段收益率</span>
            </div>
            <div class="deep-return-grid">
              <div class="deep-return-item">
                <span class="deep-return-label">近1月</span>
                <span
                  class="deep-return-value"
                  :class="
                    pctClass(parseFloat(pingzhongDetail.returnRates.oneMonth))
                  "
                >
                  {{ formatPercentValue(pingzhongDetail.returnRates.oneMonth) }}
                </span>
              </div>
              <div class="deep-return-item">
                <span class="deep-return-label">近3月</span>
                <span
                  class="deep-return-value"
                  :class="
                    pctClass(parseFloat(pingzhongDetail.returnRates.threeMonth))
                  "
                >
                  {{
                    formatPercentValue(pingzhongDetail.returnRates.threeMonth)
                  }}
                </span>
              </div>
              <div class="deep-return-item">
                <span class="deep-return-label">近6月</span>
                <span
                  class="deep-return-value"
                  :class="
                    pctClass(parseFloat(pingzhongDetail.returnRates.sixMonth))
                  "
                >
                  {{ formatPercentValue(pingzhongDetail.returnRates.sixMonth) }}
                </span>
              </div>
              <div class="deep-return-item">
                <span class="deep-return-label">近1年</span>
                <span
                  class="deep-return-value"
                  :class="
                    pctClass(parseFloat(pingzhongDetail.returnRates.year1))
                  "
                >
                  {{ formatPercentValue(pingzhongDetail.returnRates.year1) }}
                </span>
              </div>
            </div>
          </div>

          <!-- 图表区域 - 单列布局 -->
          <div class="deep-charts-section">
            <!-- 累计收益走势 -->
            <div class="deep-chart-card">
              <div class="deep-section-header">
                <span class="deep-section-title">累计收益走势</span>
              </div>
              <div ref="grandTotalChartRef" class="deep-chart-container"></div>
            </div>

            <!-- 同类排行 -->
            <div class="deep-chart-card">
              <div class="deep-section-header">
                <span class="deep-section-title">同类排行走势</span>
              </div>
              <div ref="rankChartRef" class="deep-chart-container"></div>
            </div>

            <!-- 规模变动 -->
            <div class="deep-chart-card">
              <div class="deep-section-header">
                <span class="deep-section-title">规模变动</span>
              </div>
              <div ref="fluctuationChartRef" class="deep-chart-container"></div>
            </div>

            <!-- 持有人结构 -->
            <div class="deep-chart-card">
              <div class="deep-section-header">
                <span class="deep-section-title">持有人结构</span>
              </div>
              <div ref="holderChartRef" class="deep-chart-container"></div>
            </div>

            <!-- 资产配置 -->
            <div class="deep-chart-card">
              <div class="deep-section-header">
                <span class="deep-section-title">资产配置</span>
              </div>
              <div ref="assetChartRef" class="deep-chart-container"></div>
            </div>

            <!-- 业绩评价 -->
            <div class="deep-chart-card">
              <div class="deep-section-header">
                <span class="deep-section-title">业绩评价</span>
              </div>
              <div
                ref="performanceChartRef"
                class="deep-chart-container deep-chart-container--radar"
              ></div>
            </div>

            <!-- 申购赎回 -->
            <div class="deep-chart-card">
              <div class="deep-section-header">
                <span class="deep-section-title">申购赎回</span>
              </div>
              <div ref="buySellChartRef" class="deep-chart-container"></div>
            </div>

            <!-- 股票仓位测算 -->
            <div class="deep-chart-card">
              <div class="deep-section-header">
                <span class="deep-section-title">股票仓位测算</span>
              </div>
              <div
                ref="sharePositionChartRef"
                class="deep-chart-container"
              ></div>
            </div>

            <!-- 单位净值走势 -->
            <div class="deep-chart-card">
              <div class="deep-section-header">
                <span class="deep-section-title">单位净值走势</span>
              </div>
              <div
                ref="netWorthTrendChartRef"
                class="deep-chart-container"
              ></div>
            </div>

            <!-- 累计净值走势 -->
            <div class="deep-chart-card">
              <div class="deep-section-header">
                <span class="deep-section-title">累计净值走势</span>
              </div>
              <div
                ref="acWorthTrendChartRef"
                class="deep-chart-container"
              ></div>
            </div>
          </div>

          <!-- 基金经理概览 -->
          <div
            class="deep-section-card"
            v-if="pingzhongDetail.currentFundManagers?.length"
          >
            <div class="deep-section-header">
              <span class="deep-section-title">基金经理</span>
            </div>
            <div class="deep-manager-list">
              <div
                v-for="m in pingzhongDetail.currentFundManagers"
                :key="m.id"
                class="deep-manager-card"
              >
                <div class="deep-manager-header">
                  <img
                    v-if="m.pic"
                    class="deep-manager-avatar"
                    :src="m.pic"
                    :alt="m.name"
                    referrerpolicy="no-referrer"
                  />
                  <div class="deep-manager-info">
                    <div class="deep-manager-name">{{ m.name }}</div>
                    <div class="deep-manager-meta">
                      <span>{{ m.workTime }}</span>
                      <span>{{ m.fundSize }}</span>
                      <span>星级 {{ m.star }}</span>
                    </div>
                  </div>
                </div>
                <div class="deep-manager-stats">
                  <div class="deep-manager-stat">
                    <span class="stat-label">能力评分</span>
                    <span class="stat-value">{{ m.power.avr }}</span>
                  </div>
                  <div class="deep-manager-stat">
                    <span class="stat-label">任期收益</span>
                    <span class="stat-value">
                      {{ m.profit.series[0]?.data[0]?.y?.toFixed(2) ?? "--" }}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 同类涨幅榜 -->
          <div class="deep-section-card" v-if="sameTypeGroups.length">
            <div class="deep-section-header">
              <span class="deep-section-title">同类涨幅榜</span>
            </div>
            <div class="deep-same-type-grid">
              <div
                v-for="(group, groupIndex) in sameTypeGroups"
                :key="groupIndex"
                class="deep-same-type-group"
              >
                <div class="deep-same-type-header">
                  第 {{ groupIndex + 1 }} 组
                </div>
                <div class="deep-same-type-items">
                  <div
                    v-for="item in group"
                    :key="item.code + item.name"
                    class="deep-same-type-item"
                  >
                    <div class="deep-same-type-name">
                      <span>{{ item.code }}</span>
                      <span>{{ item.name }}</span>
                    </div>
                    <span
                      class="deep-same-type-rate"
                      :class="pctClass(parseFloat(item.rate))"
                      >{{ item.rate }}%</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 持仓代码详情 -->
          <div class="deep-codes-section">
            <div
              class="deep-codes-group"
              v-if="pingzhongDetail.stockCodes.length"
            >
              <div class="deep-codes-label">持仓股票代码</div>
              <div class="deep-codes-list">
                <span
                  v-for="code in pingzhongDetail.stockCodes"
                  :key="code"
                  class="deep-code-chip"
                  >{{ code }}</span
                >
              </div>
            </div>
            <div
              class="deep-codes-group"
              v-if="pingzhongDetail.stockCodesNew.length"
            >
              <div class="deep-codes-label">持仓股票代码（新市场号）</div>
              <div class="deep-codes-list">
                <span
                  v-for="code in pingzhongDetail.stockCodesNew"
                  :key="code"
                  class="deep-code-chip"
                  >{{ code }}</span
                >
              </div>
            </div>
            <div
              class="deep-codes-group"
              v-if="pingzhongDetail.bondCodes.length"
            >
              <div class="deep-codes-label">债券代码</div>
              <div class="deep-codes-list">
                <span
                  v-for="code in pingzhongDetail.bondCodes"
                  :key="code"
                  class="deep-code-chip"
                  >{{ code }}</span
                >
              </div>
            </div>
            <div
              class="deep-codes-group"
              v-if="pingzhongDetail.bondCodesNew.length"
            >
              <div class="deep-codes-label">债券代码（新市场号）</div>
              <div class="deep-codes-list">
                <span
                  v-for="code in pingzhongDetail.bondCodesNew"
                  :key="code"
                  class="deep-code-chip"
                  >{{ code }}</span
                >
              </div>
            </div>
          </div>

          <!-- 基本信息摘要 -->
          <div class="deep-summary-card">
            <div class="deep-section-header">
              <span class="deep-section-title">基本信息</span>
            </div>
            <div class="deep-info-grid">
              <div class="deep-info-item">
                <span class="deep-info-label">原费率</span>
                <span class="deep-info-value">{{
                  pingzhongDetail.sourceRate || "--"
                }}</span>
              </div>
              <div class="deep-info-item">
                <span class="deep-info-label">现费率</span>
                <span class="deep-info-value">{{
                  pingzhongDetail.currentRate || "--"
                }}</span>
              </div>
              <div class="deep-info-item">
                <span class="deep-info-label">最小申购</span>
                <span class="deep-info-value">{{
                  pingzhongDetail.minPurchase || "--"
                }}</span>
              </div>
              <div class="deep-info-item">
                <span class="deep-info-label">股票持仓数</span>
                <span class="deep-info-value">{{
                  pingzhongDetail.stockCodes.length
                }}</span>
              </div>
              <div class="deep-info-item">
                <span class="deep-info-label">债券持仓数</span>
                <span class="deep-info-value">{{
                  pingzhongDetail.bondCodes.length
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <el-empty v-else-if="!tabLoading" description="暂无深度数据" />
        <div v-else class="loading-hint">
          <div class="loading-box">
            <div class="spinner" role="status" aria-label="加载中"></div>
            <div class="loading-text">加载中...</div>
          </div>
        </div>
      </div>

      <!-- 历史净值 -->
      <div v-show="activeTab === 'netValue'" class="tab-panel">
        <div class="range-tabs">
          <span
            v-for="r in rangeOptions"
            :key="r.key"
            class="range-item"
            :class="{ active: netValueRange === r.key }"
            @click="switchNetValueRange(r.key)"
          >
            {{ r.label }}
          </span>
        </div>
        <div ref="netValueChartRef" class="chart-container"></div>
      </div>

      <!-- 累计收益 -->
      <div v-show="activeTab === 'profit'" class="tab-panel">
        <div class="range-tabs">
          <span
            v-for="r in rangeOptions"
            :key="r.key"
            class="range-item"
            :class="{ active: profitRange === r.key }"
            @click="switchProfitRange(r.key)"
          >
            {{ r.label }}
          </span>
        </div>
        <div ref="profitChartRef" class="chart-container"></div>
      </div>
    </div>

    <!-- 编辑基金对话框 -->
    <el-dialog
      v-model="showEditDialog"
      title="编辑基金"
      width="90%"
      :close-on-click-modal="true"
      destroy-on-close
      @close="isEditingTotalAmount = false"
    >
      <el-form
        :model="editForm"
        :rules="editFormRules"
        ref="editFormRef"
        label-width="100px"
      >
        <el-form-item label="基金代码">
          <el-input :model-value="code" disabled />
        </el-form-item>
        <el-form-item label="基金名称">
          <el-input :model-value="displayName" disabled />
        </el-form-item>
        <el-form-item label="持有份额" prop="num">
          <el-input
            v-model.number="editForm.num"
            type="number"
            placeholder="持有份额"
          />
        </el-form-item>
        <el-form-item label="成本价" prop="cost">
          <el-input
            v-model.number="editForm.cost"
            type="number"
            placeholder="成本价"
          />
        </el-form-item>
        <el-form-item label="总金额">
          <el-alert
            v-if="!isEditingTotalAmount"
            title="提示：修改总金额会影响成本价的计算方式，修改后会根据新的总金额和持有份额倒推新的成本价"
            type="warning"
            :closable="false"
          />
          <div
            style="display: flex; gap: 8px; align-items: center; width: 100%"
          >
            <div v-if="!isEditingTotalAmount" style="flex: 1">
              <span>{{ (editForm.num * editForm.cost).toFixed(2) }} 元</span>
            </div>
            <el-input
              v-else
              v-model.number="editTotalAmount"
              type="number"
              placeholder="输入新的总金额"
              style="flex: 1"
            />
            <el-button
              v-if="!isEditingTotalAmount"
              link
              type="primary"
              @click="startEditTotalAmount"
            >
              修改
            </el-button>
            <div v-else style="display: flex; gap: 4px">
              <el-button
                type="primary"
                size="small"
                @click="confirmEditTotalAmount"
              >
                确定
              </el-button>
              <el-button size="small" @click="cancelEditTotalAmount">
                取消
              </el-button>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleCancelEdit">取消</el-button>
        <el-button type="primary" @click="handleEdit" :loading="submitting"
          >保存</el-button
        >
      </template>
    </el-dialog>

    <!-- 主题切换悬浮按钮 -->
    <ThemeToggleFloat />
  </DetailLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useRouter } from "vue-router";
import {
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules,
} from "element-plus";
import { ArrowLeft, Refresh, QuestionFilled } from "@element-plus/icons-vue";
import DetailLayout from "@/layouts/DetailLayout.vue";
import ThemeToggleFloat from "@/components/ThemeToggleFloat.vue";
import { useFundStore, useSettingStore } from "@/stores";
import { fundService } from "@/services";
import { formatCurrency, formatNumber } from "@/utils/format";
import { loadEcharts } from "@/utils/echarts";
import { buildFundRowDisplay, type FundRowDisplay } from "@/utils/fundDisplay";
import { normalizeFundInfo } from "@/utils/fundInfoNormalize";
import { getChinaMarketStatus } from "@/utils/marketChina";
import type { FundInfo } from "@/types";
import {
  fetchPingzhongDetailData,
  type PingzhongDetailData,
} from "@/api/fundPingzhong";
import {
  fetchFundOverview,
  fetchManagerAndThemes,
  fetchNetValueHistory,
  fetchHistoryYield,
  fetchInvestmentPosition,
  fetchFundFeatureData,
  type FundOverview,
  type PeriodIncreaseData,
  type FundManager,
  type RelateThemeItem,
  type NetValueRecord,
  type YieldRecord,
  type PositionData,
} from "@/api/fundDetail";

// ==================== Props ====================

interface Props {
  code: string;
}
const props = defineProps<Props>();

// ==================== 常量 ====================

const tabs = [
  { key: "holding", label: "持仓概况" },
  { key: "overview", label: "基金信息" },
  { key: "position", label: "基金持仓" },
  { key: "manager", label: "基金经理" },
  { key: "theme", label: "关联板块" },
  { key: "feature", label: "特色数据" },
  { key: "deep", label: "深度数据" },
  { key: "netValue", label: "历史净值" },
  { key: "profit", label: "累计收益" },
];

const rangeOptions = [
  { key: "1w", label: "近1周" },
  { key: "1m", label: "近1月" },
  { key: "3m", label: "近3月" },
  { key: "6m", label: "近6月" },
  { key: "n", label: "近1年" },
  { key: "3n", label: "近3年" },
  { key: "5n", label: "近5年" },
  { key: "ln", label: "成立以来" },
];

const ACTIVE_TAB_STORAGE_KEY = "fund_helper_detail_active_tab";

// ==================== 状态 ====================

const router = useRouter();
const fundStore = useFundStore();
const settingStore = useSettingStore();

const activeTab = ref(
  localStorage.getItem(ACTIVE_TAB_STORAGE_KEY) || "holding",
);
const refreshing = ref(false);
const tabLoading = ref(false);
const submitting = ref(false);
const showEditDialog = ref(false);

const overview = ref<FundOverview | null>(null);
const managers = ref<FundManager[]>([]);
const themes = ref<RelateThemeItem[]>([]);
const pingzhongDetail = ref<PingzhongDetailData | null>(null);
const periodIncrease = ref<PeriodIncreaseData | null>(null);
const weekNavRecords = ref<NetValueRecord[]>([]);
const positionData = ref<PositionData | null>(null);

// 高级特色数据状态
const featureData = ref<any>(null);
const periodIncreaseList = ref<any[]>([]);
const activeFeatureRange = ref<"1n" | "3n" | "5n">("1n");
const featureRaw = ref<any>(null);

const netValueRange = ref("1m");
const profitRange = ref("1m");

const netValueChartRef = ref<HTMLElement | null>(null);
const profitChartRef = ref<HTMLElement | null>(null);
const grandTotalChartRef = ref<HTMLElement | null>(null);
const fluctuationChartRef = ref<HTMLElement | null>(null);
const holderChartRef = ref<HTMLElement | null>(null);
const assetChartRef = ref<HTMLElement | null>(null);
const performanceChartRef = ref<HTMLElement | null>(null);
const buySellChartRef = ref<HTMLElement | null>(null);
const sharePositionChartRef = ref<HTMLElement | null>(null);
const netWorthTrendChartRef = ref<HTMLElement | null>(null);
const acWorthTrendChartRef = ref<HTMLElement | null>(null);
const rankChartRef = ref<HTMLElement | null>(null);
let netValueChart: any = null;
let profitChart: any = null;
let grandTotalChart: any = null;
let fluctuationChart: any = null;
let holderChart: any = null;
let assetChart: any = null;
let performanceChart: any = null;
let buySellChart: any = null;
let sharePositionChart: any = null;
let netWorthTrendChart: any = null;
let acWorthTrendChart: any = null;
let rankChart: any = null;

const isDarkMode = computed(() => settingStore.theme === "dark");

watch(isDarkMode, async () => {
  loadedTabs.clear();
  await loadTabOnce(activeTab.value);
});

// Tab 滚动
const tabScrollbarRef = ref<InstanceType<
  (typeof import("element-plus"))["ElScrollbar"]
> | null>(null);
const tabsInnerRef = ref<HTMLElement | null>(null);

const loadedTabs = new Set<string>();

const editForm = ref({ num: 0, cost: 0 });
const editFormRef = ref<FormInstance>();
const editFormRules: FormRules = {
  num: [
    { required: true, message: "请输入份额", trigger: "blur" },
    { type: "number", min: 0.01, message: "份额>0", trigger: "blur" },
  ],
  cost: [
    { required: true, message: "请输入成本价", trigger: "blur" },
    { type: "number", min: 0.0001, message: "成本价>0", trigger: "blur" },
  ],
};

// 编辑基金总金额相关状态
const isEditingTotalAmount = ref(false);
const editTotalAmount = ref(0);

// ==================== 基金列表导航 ====================

// 按 store 中的顺序取所有基金代码
const allFundCodes = computed(() => fundStore.funds.map((f) => f.code));

const currentIndex = computed(() => allFundCodes.value.indexOf(props.code));

const prevCode = computed(() => {
  const i = currentIndex.value;
  return i > 0 ? allFundCodes.value[i - 1]! : null;
});

const nextCode = computed(() => {
  const i = currentIndex.value;
  return i >= 0 && i < allFundCodes.value.length - 1
    ? allFundCodes.value[i + 1]!
    : null;
});

async function navigateTo(targetCode: string | null) {
  if (!targetCode) return;
  await router.push(`/detail/${targetCode}`);
}

// ==================== 计算属性 ====================

const fundView = computed(() => fundStore.getFundView(props.code));
const displayName = computed(() => fundView.value?.name || props.code);
const detailRow = computed<FundRowDisplay | null>(() => {
  const fund = fundStore.getFund(props.code);
  if (!fund) return null;
  const raw = fundStore.fundDetails.get(props.code);
  const info =
    normalizeFundInfo(raw, fund.code) ||
    ({
      code: fund.code,
      name: fund.code,
      netValue: 0,
      estimatedValue: null,
      changePercent: 0,
      updateTime: "",
      netValueDate: "",
      isRealValue: false,
      navChgRt: 0,
      shares: fund.num,
      cost: fund.cost,
    } as FundInfo);
  return buildFundRowDisplay(fund, info, getChinaMarketStatus());
});

type SameTypeItem = {
  code: string;
  name: string;
  rate: string;
};

const sameTypeGroups = computed<SameTypeItem[][]>(() => {
  const groups = pingzhongDetail.value?.sameType ?? [];
  return groups
    .map((group) =>
      group
        .map((entry) => parseSameTypeEntry(entry))
        .filter((item) => item.code || item.name || item.rate),
    )
    .filter((group) => group.length > 0);
});
// 近一周收益率 = (最新净值 - 5个交易日前净值) / 5个交易日前净值 * 100
const calcWeekRate = computed((): number | null => {
  const records = weekNavRecords.value;
  if (records.length < 2) return null;
  const latest = records[records.length - 1]!;
  // 取倒数第6个（即5个交易日前），如果不够就取第一个
  const idx = Math.max(0, records.length - 6);
  const older = records[idx]!;
  if (!older.netValue || older.netValue === 0) return null;
  return ((latest.netValue - older.netValue) / older.netValue) * 100;
});

const currentSc = computed(() => {
  if (!periodIncreaseList.value || periodIncreaseList.value.length === 0)
    return 0;
  // 映射 activeFeatureRange 的值：1n -> 1N, 3n -> 3N, 5n -> 5N
  const targetTitle = activeFeatureRange.value.toUpperCase();
  const found = periodIncreaseList.value.find(
    (item) => item.title === targetTitle,
  );
  return found ? parseInt(found.sc) || 0 : 0;
});

const currentFeatureMetrics = computed(() => {
  const fd = featureData.value;
  if (!fd) return null;

  const range = activeFeatureRange.value; // '1n' | '3n' | '5n'
  const sc = currentSc.value;

  // 根据不同期限提取对应的值和排名
  let stddev: any = "--";
  let stddevRank = 0;
  let sharp: any = "--";
  let sharpRank = 0;
  let maxRetra: any = "--";
  let maxRetraRank = 0;

  if (range === "1n") {
    stddev = fd.STDDEV1;
    stddevRank = parseInt(fd.STDDEV_1NRANK) || 0;
    sharp = fd.SHARP1;
    sharpRank = parseInt(fd.SHARP_1NRANK) || 0;
    maxRetra = fd.MAXRETRA1;
    maxRetraRank = parseInt(fd.MAXRETRA_1NRANK) || 0;
  } else if (range === "3n") {
    stddev = fd.STDDEV3;
    stddevRank = parseInt(fd.STDDEV_3NRANK) || 0;
    sharp = fd.SHARP3;
    sharpRank = parseInt(fd.SHARP_3NRANK) || 0;
    maxRetra = fd.MAXRETRA3;
    maxRetraRank = parseInt(fd.MAXRETRA_3NRANK) || 0;
  } else if (range === "5n") {
    stddev = fd.STDDEV5;
    stddevRank = parseInt(fd.STDDEV_5NRANK) || 0;
    sharp = fd.SHARP5;
    sharpRank = parseInt(fd.SHARP_5NRANK) || 0;
    maxRetra = fd.MAXRETRA5;
    maxRetraRank = parseInt(fd.MAXRETRA_5NRANK) || 0;
  }

  // 辅助计算领先同类百分比
  const calcRatio = (rank: number, total: number) => {
    if (!rank || !total) return null;
    // 领先百分比 = (total - rank) / total * 100
    const ratio = ((total - rank) / total) * 100;
    return Math.max(0, Math.min(100, ratio)); // 限制在 0-100% 之间
  };

  const stddevRatio = calcRatio(stddevRank, sc);
  const sharpRatio = calcRatio(sharpRank, sc);
  const maxRetraRatio = calcRatio(maxRetraRank, sc);

  return {
    stddev:
      typeof stddev === "number"
        ? stddev
        : typeof stddev === "string" && stddev !== "" && stddev !== "--"
          ? parseFloat(stddev)
          : null,
    stddevRank,
    stddevRatio,
    sharp:
      typeof sharp === "number"
        ? sharp
        : typeof sharp === "string" && sharp !== "" && sharp !== "--"
          ? parseFloat(sharp)
          : null,
    sharpRank,
    sharpRatio,
    maxRetra:
      typeof maxRetra === "number"
        ? maxRetra
        : typeof maxRetra === "string" && maxRetra !== "" && maxRetra !== "--"
          ? parseFloat(maxRetra)
          : null,
    maxRetraRank,
    maxRetraRatio,
    sc,
  };
});

// ==================== 格式化 ====================

function safeNum(v: unknown): number {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}
function fmtNum(v: unknown) {
  return formatNumber(safeNum(v), 2);
}
function fmtPrice(v: unknown) {
  return v != null && v !== "" ? safeNum(v).toFixed(4) : "--";
}
function fmtMoney(v: unknown) {
  return v != null ? formatCurrency(safeNum(v)) : "--";
}
function fmtPct(v: unknown) {
  if (v == null) return "--";
  const n = safeNum(v);
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}
function pctClass(v: unknown) {
  const n = safeNum(v);
  if (!n || settingStore.grayscaleMode) return "";
  if (n > 0) return "positive";
  if (n < 0) return "negative";
  return "";
}

function fmtEstMoney(v: number, show: boolean) {
  if (!show) return "--";
  return fmtMoney(v);
}

function fmtEstPct(v: number, show: boolean) {
  if (!show) return "--";
  return fmtPct(v);
}

function estClass(v: number, show: boolean) {
  if (!show || settingStore.grayscaleMode) return "muted";
  return pctClass(v) || "muted";
}
function riskLabel(level: string) {
  const map: Record<string, string> = {
    "1": "低风险",
    "2": "中低风险",
    "3": "中风险",
    "4": "中高风险",
    "5": "高风险",
  };
  return map[level] || level || "--";
}

function formatPercentValue(value: unknown) {
  if (value == null || value === "") return "--";
  const n = safeNum(value);
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function parseSameTypeEntry(entry: string): SameTypeItem {
  const parts = String(entry).split("_");
  const code = parts[0] ?? "";
  const rate = parts.length > 1 ? (parts[parts.length - 1] ?? "") : "";
  const name =
    parts.length > 2 ? parts.slice(1, -1).join("_") : (parts[1] ?? "");
  return { code, name, rate };
}

function formatTsDate(ts: number) {
  const date = new Date(ts);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function renderDeepCharts() {
  const detail = pingzhongDetail.value;
  if (!detail) return;

  const echarts = await loadEcharts();
  await nextTick();

  const textColor = isDarkMode.value ? "#e5e7eb" : "#666";
  const axisColor = isDarkMode.value
    ? "rgba(255,255,255,0.1)"
    : "rgba(0,0,0,0.06)";

  const baseTooltip = {
    trigger: "axis",
    backgroundColor: isDarkMode.value
      ? "rgba(30, 30, 30, 0.95)"
      : "rgba(255, 255, 255, 0.98)",
    borderColor: isDarkMode.value ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)",
    borderWidth: 1,
    textStyle: { color: textColor, fontSize: 12 },
    padding: [8, 12],
    extraCssText: "box-shadow: 0 2px 8px rgba(0,0,0,0.15);",
  };

  const baseLegend = {
    textStyle: { color: textColor, fontSize: 12 },
    type: "scroll",
    top: 0,
    itemWidth: 20,
    itemHeight: 12,
  };

  const baseCategoryAxis = {
    type: "category",
    axisLine: { lineStyle: { color: axisColor } },
    axisLabel: { color: textColor, fontSize: 11 },
    axisTick: { show: false },
  };

  const baseValueAxis = {
    type: "value",
    scale: true,
    axisLine: { show: false },
    splitLine: { lineStyle: { color: axisColor, type: "dashed" } },
    axisLabel: { color: textColor, fontSize: 11 },
  };

  const baseGrid = {
    left: 35,
    right: 35,
    top: 48,
    bottom: 60,
    containLabel: false,
  };

  const baseDataZoom = [
    { type: "inside", start: 0, end: 100 },
    {
      type: "slider",
      height: 20,
      bottom: 8,
      borderColor: axisColor,
      fillerColor: isDarkMode.value
        ? "rgba(255,255,255,0.1)"
        : "rgba(0,0,0,0.05)",
      handleStyle: { color: isDarkMode.value ? "#555" : "#ddd" },
      textStyle: { color: textColor, fontSize: 10 },
    },
  ];

  const initChart = (refEl: HTMLElement | null, chart: any) => {
    if (!refEl) return null;
    if (!chart) return echarts.init(refEl);
    return chart;
  };

  const setNoData = (chart: any, text: string) => {
    chart?.clear?.();
    chart?.setOption?.({
      title: {
        text,
        left: "center",
        top: "center",
        textStyle: { fontSize: 13, fontWeight: "normal", color: textColor },
      },
    });
  };

  const deepTooltipFormatter = (params: any[]) => {
    const title = params[0]?.axisValueLabel || params[0]?.axisValue || "";
    let html = `<div style="font-weight:600;margin-bottom:6px;font-size:13px">${title}</div>`;
    params.forEach((item) => {
      const value = Array.isArray(item.value) ? item.value[1] : item.value;
      html += `<div style="display:flex;align-items:center;gap:8px;margin:3px 0">
        <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${item.color}"></span>
        <span style="flex:1;text-align:left;">${item.seriesName}</span>
        <span style="font-weight:600">${value}</span>
      </div>`;
    });
    return html;
  };

  grandTotalChart = initChart(grandTotalChartRef.value, grandTotalChart);
  fluctuationChart = initChart(fluctuationChartRef.value, fluctuationChart);
  holderChart = initChart(holderChartRef.value, holderChart);
  assetChart = initChart(assetChartRef.value, assetChart);
  performanceChart = initChart(performanceChartRef.value, performanceChart);
  buySellChart = initChart(buySellChartRef.value, buySellChart);
  sharePositionChart = initChart(
    sharePositionChartRef.value,
    sharePositionChart,
  );
  netWorthTrendChart = initChart(
    netWorthTrendChartRef.value,
    netWorthTrendChart,
  );
  acWorthTrendChart = initChart(acWorthTrendChartRef.value, acWorthTrendChart);
  rankChart = initChart(rankChartRef.value, rankChart);

  if (detail.grandTotal.length && grandTotalChart) {
    const categories =
      detail.grandTotal[0]?.data?.map(([ts]) => formatTsDate(ts)) ?? [];
    const colors = ["#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de"];
    grandTotalChart.setOption({
      backgroundColor: "transparent",
      color: colors,
      textStyle: { color: textColor, fontFamily: "inherit" },
      tooltip: { ...baseTooltip, formatter: deepTooltipFormatter },
      legend: baseLegend,
      grid: baseGrid,
      dataZoom: baseDataZoom,
      xAxis: { ...baseCategoryAxis, data: categories },
      yAxis: {
        ...baseValueAxis,
        axisLabel: { formatter: "{value}%", color: textColor, fontSize: 11 },
      },
      series: detail.grandTotal.map((series, _index) => ({
        name: series.name,
        type: "line",
        smooth: true,
        showSymbol: false,
        data: series.data.map(([, value]) => value),
        lineStyle: { width: 2 },
        emphasis: { focus: "series" },
      })),
    });
  } else {
    setNoData(grandTotalChart, "暂无累计收益数据");
  }

  if (detail.fluctuationScale.categories.length && fluctuationChart) {
    fluctuationChart.setOption({
      backgroundColor: "transparent",
      textStyle: { color: textColor, fontFamily: "inherit" },
      tooltip: {
        ...baseTooltip,
        trigger: "axis",
        formatter(params: any) {
          const title = params[0]?.axisValueLabel || "";
          let html = `<div style="font-weight:600;margin-bottom:6px;font-size:13px">${title}</div>`;
          params.forEach((item: any) => {
            const value =
              item.seriesName === "环比"
                ? safeNum(Number(item.value)).toFixed(2) + "%"
                : safeNum(Number(item.value)).toFixed(2) + " 亿";
            html += `<div style="display:flex;align-items:center;gap:8px;margin:3px 0">
              <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${item.color}"></span>
              <span style="flex:1;text-align:left;">${item.seriesName}</span>
              <span style="font-weight:600">${value}</span>
            </div>`;
          });
          return html;
        },
      },
      legend: { data: ["规模", "环比"], ...baseLegend },
      grid: baseGrid,
      dataZoom: baseDataZoom,
      xAxis: { ...baseCategoryAxis, data: detail.fluctuationScale.categories },
      yAxis: [
        {
          type: "value",
          name: "规模(亿)",
          nameTextStyle: { color: textColor, fontSize: 11 },
          axisLabel: { color: textColor, fontSize: 11 },
          splitLine: { lineStyle: { color: axisColor, type: "dashed" } },
        },
        {
          type: "value",
          name: "环比(%)",
          nameTextStyle: { color: textColor, fontSize: 11 },
          axisLabel: { color: textColor, fontSize: 11, formatter: "{value}%" },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: "规模",
          type: "bar",
          data: detail.fluctuationScale.series.map((item) => item.y),
          itemStyle: {
            color: "#5470c6",
          },
          barMaxWidth: 40,
        },
        {
          name: "环比",
          type: "line",
          yAxisIndex: 1,
          data: detail.fluctuationScale.series.map((item) =>
            safeNum(Number(item.mom.replace("%", ""))),
          ),
          itemStyle: { color: "#ee6666" },
          lineStyle: { width: 2 },
          showSymbol: false,
          smooth: true,
        },
      ],
    });
  } else {
    setNoData(fluctuationChart, "暂无规模变动数据");
  }

  if (detail.holderStructure.categories.length && holderChart) {
    holderChart.setOption({
      backgroundColor: "transparent",
      textStyle: { color: textColor, fontFamily: "inherit" },
      tooltip: {
        ...baseTooltip,
        trigger: "axis",
        formatter: deepTooltipFormatter,
      },
      legend: {
        data: detail.holderStructure.series.map((item) => item.name),
        ...baseLegend,
      },
      grid: baseGrid,
      dataZoom: baseDataZoom,
      xAxis: { ...baseCategoryAxis, data: detail.holderStructure.categories },
      yAxis: {
        type: "value",
        axisLabel: { formatter: "{value}%", color: textColor, fontSize: 11 },
        splitLine: { lineStyle: { color: axisColor, type: "dashed" } },
      },
      series: detail.holderStructure.series.map((item, index) => ({
        name: item.name,
        type: "bar",
        stack: "holder",
        data: item.data,
        itemStyle: { color: ["#5470c6", "#91cc75", "#fac858"][index] },
        barMaxWidth: 40,
        emphasis: { focus: "series" },
      })),
    });
  } else {
    setNoData(holderChart, "暂无持有人结构数据");
  }

  if (detail.assetAllocation.categories.length && assetChart) {
    assetChart.setOption({
      backgroundColor: "transparent",
      textStyle: { color: textColor, fontFamily: "inherit" },
      tooltip: {
        ...baseTooltip,
        trigger: "axis",
        formatter: deepTooltipFormatter,
      },
      legend: {
        data: detail.assetAllocation.series.map((item) => item.name),
        ...baseLegend,
      },
      grid: baseGrid,
      dataZoom: baseDataZoom,
      xAxis: { ...baseCategoryAxis, data: detail.assetAllocation.categories },
      yAxis: [
        {
          type: "value",
          axisLabel: { formatter: "{value}%", color: textColor, fontSize: 11 },
          splitLine: { lineStyle: { color: axisColor, type: "dashed" } },
        },
        {
          type: "value",
          axisLabel: { color: textColor, fontSize: 11 },
          splitLine: { show: false },
        },
      ],
      series: detail.assetAllocation.series.map((item, _index) => ({
        name: item.name,
        type: item.type === "line" ? "line" : "bar",
        yAxisIndex: item.yAxis,
        smooth: item.type === "line",
        showSymbol: item.type === "line" ? false : true,
        data: item.data,
        lineStyle: item.type === "line" ? { width: 2 } : undefined,
        barMaxWidth: 40,
        emphasis: { focus: "series" },
      })),
    });
  } else {
    setNoData(assetChart, "暂无资产配置数据");
  }

  if (detail.performanceEvaluation.categories.length && performanceChart) {
    performanceChart.setOption({
      backgroundColor: "transparent",
      textStyle: { color: textColor, fontFamily: "inherit" },
      tooltip: {
        ...baseTooltip,
        trigger: "item",
        formatter: (params: any) => {
          let html = `<div style="font-weight:600;margin-bottom:6px;font-size:13px">${params.name}</div>`;
          params.value.forEach((val: number, idx: number) => {
            html += `<div style="display:flex;gap:8px;margin:3px 0">
              <span style="flex:1;text-align:left;">${detail.performanceEvaluation.categories[idx]}</span>
              <span style="font-weight:600">${val}</span>
            </div>`;
          });
          return html;
        },
      },
      radar: {
        indicator: detail.performanceEvaluation.categories.map((name) => ({
          name,
          max: 100,
        })),
        splitArea: {
          areaStyle: {
            color: isDarkMode.value
              ? ["rgba(255,255,255,0.02)", "rgba(255,255,255,0.04)"]
              : ["rgba(0,0,0,0.02)", "rgba(0,0,0,0.04)"],
          },
        },
        axisName: { color: textColor, fontSize: 11 },
        splitLine: { lineStyle: { color: axisColor } },
        axisLine: { lineStyle: { color: axisColor } },
        center: ["50%", "55%"],
        radius: "65%",
      },
      series: [
        {
          name: "业绩评价",
          type: "radar",
          data: [
            {
              value: detail.performanceEvaluation.data,
              name: `平均 ${detail.performanceEvaluation.avr}`,
              areaStyle: {
                color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
                  { offset: 0, color: "rgba(84, 112, 198, 0.3)" },
                  { offset: 1, color: "rgba(84, 112, 198, 0.1)" },
                ]),
              },
              lineStyle: { color: "#5470c6", width: 2 },
              itemStyle: { color: "#5470c6" },
            },
          ],
          emphasis: {
            lineStyle: { width: 3 },
            areaStyle: { opacity: 0.5 },
          },
        },
      ],
    });
  } else {
    setNoData(performanceChart, "暂无业绩评价数据");
  }

  if (detail.buySedemption.categories.length && buySellChart) {
    buySellChart.setOption({
      backgroundColor: "transparent",
      textStyle: { color: textColor, fontFamily: "inherit" },
      tooltip: {
        ...baseTooltip,
        trigger: "axis",
        formatter: deepTooltipFormatter,
      },
      legend: {
        data: detail.buySedemption.series.map((item) => item.name),
        ...baseLegend,
      },
      grid: baseGrid,
      dataZoom: baseDataZoom,
      xAxis: { ...baseCategoryAxis, data: detail.buySedemption.categories },
      yAxis: {
        type: "value",
        axisLabel: { color: textColor, fontSize: 11 },
        splitLine: { lineStyle: { color: axisColor, type: "dashed" } },
      },
      series: detail.buySedemption.series.map((item, index) => ({
        name: item.name,
        type: index === 2 ? "line" : "bar",
        smooth: index === 2,
        data: item.data,
        itemStyle: { color: ["#5470c6", "#ee6666", "#91cc75"][index] },
        lineStyle: index === 2 ? { width: 2 } : undefined,
        showSymbol: index === 2 ? false : true,
        barMaxWidth: 40,
        emphasis: { focus: "series" },
      })),
    });
  } else {
    setNoData(buySellChart, "暂无申购赎回数据");
  }

  if (detail.sharePositionTrend.length && sharePositionChart) {
    sharePositionChart.setOption({
      backgroundColor: "transparent",
      textStyle: { color: textColor, fontFamily: "inherit" },
      tooltip: { ...baseTooltip, trigger: "axis" },
      grid: baseGrid,
      dataZoom: baseDataZoom,
      xAxis: {
        ...baseCategoryAxis,
        data: detail.sharePositionTrend.map((item) => formatTsDate(item.date)),
      },
      yAxis: {
        type: "value",
        axisLabel: { formatter: "{value}%", color: textColor, fontSize: 11 },
        splitLine: { lineStyle: { color: axisColor, type: "dashed" } },
      },
      series: [
        {
          name: "股票仓位",
          type: "line",
          data: detail.sharePositionTrend.map((item) => item.value),
          showSymbol: false,
          smooth: true,
          lineStyle: { width: 2, color: "#5470c6" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(84, 112, 198, 0.3)" },
              { offset: 1, color: "rgba(84, 112, 198, 0.05)" },
            ]),
          },
        },
      ],
    });
  } else {
    setNoData(sharePositionChart, "暂无股票仓位测算数据");
  }

  if (detail.netWorthTrend.length && netWorthTrendChart) {
    netWorthTrendChart.setOption({
      backgroundColor: "transparent",
      textStyle: { color: textColor, fontFamily: "inherit" },
      tooltip: {
        ...baseTooltip,
        trigger: "axis",
        formatter(params: any[]) {
          const title = params[0]?.axisValueLabel || "";
          const point = detail.netWorthTrend[params[0]?.dataIndex ?? 0];
          let html = `<div style="font-weight:600;margin-bottom:6px;font-size:13px">${title}</div>`;
          html += `<div style="display:flex;align-items:center;gap:8px;margin:3px 0">
            <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${params[0]?.color}"></span>
            <span style="flex:1;text-align:left;">单位净值</span>
            <span style="font-weight:600">${safeNum(point?.value).toFixed(4)}</span>
          </div>`;
          if (point) {
            const returnColor =
              point.equityReturn > 0
                ? "#ee6666"
                : point.equityReturn < 0
                  ? "#91cc75"
                  : textColor;
            html += `<div style="display:flex;align-items:center;gap:8px;margin:3px 0">
              <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${returnColor}"></span>
              <span style="flex:1;text-align:left;">净值回报</span>
              <span style="font-weight:600;color:${returnColor}">${point.equityReturn > 0 ? "+" : ""}${point.equityReturn.toFixed(2)}%</span>
            </div>`;
            if (point.unitMoney) {
              html += `<div style="display:flex;gap:8px;margin:3px 0">
                <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${params[0]?.color}"></span>
                <span style="flex:1;text-align:left;">每份派送金</span>
                <span style="font-weight:600">${point.unitMoney}</span>
              </div>`;
            }
          }
          return html;
        },
      },
      grid: baseGrid,
      dataZoom: baseDataZoom,
      xAxis: {
        ...baseCategoryAxis,
        data: detail.netWorthTrend.map((item) => formatTsDate(item.date)),
      },
      yAxis: {
        type: "value",
        axisLabel: { formatter: "{value}", color: textColor, fontSize: 11 },
        splitLine: { lineStyle: { color: axisColor, type: "dashed" } },
      },
      series: [
        {
          name: "单位净值",
          type: "line",
          data: detail.netWorthTrend.map((item) => item.value),
          showSymbol: false,
          smooth: true,
          lineStyle: { width: 2, color: "#91cc75" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(145, 204, 117, 0.3)" },
              { offset: 1, color: "rgba(145, 204, 117, 0.05)" },
            ]),
          },
        },
      ],
    });
  } else {
    setNoData(netWorthTrendChart, "暂无单位净值走势数据");
  }

  if (detail.acWorthTrend.length && acWorthTrendChart) {
    acWorthTrendChart.setOption({
      backgroundColor: "transparent",
      textStyle: { color: textColor, fontFamily: "inherit" },
      tooltip: { ...baseTooltip, trigger: "axis" },
      grid: baseGrid,
      dataZoom: baseDataZoom,
      xAxis: {
        ...baseCategoryAxis,
        data: detail.acWorthTrend.map((item) => formatTsDate(item.date)),
      },
      yAxis: {
        type: "value",
        axisLabel: { formatter: "{value}", color: textColor, fontSize: 11 },
        splitLine: { lineStyle: { color: axisColor, type: "dashed" } },
      },
      series: [
        {
          name: "累计净值",
          type: "line",
          data: detail.acWorthTrend.map((item) => item.value),
          showSymbol: false,
          smooth: true,
          lineStyle: { width: 2, color: "#fac858" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(250, 200, 88, 0.3)" },
              { offset: 1, color: "rgba(250, 200, 88, 0.05)" },
            ]),
          },
        },
      ],
    });
  } else {
    setNoData(acWorthTrendChart, "暂无累计净值走势数据");
  }

  if (detail.rateInSimilarType.length && rankChart) {
    const rankDates = detail.rateInSimilarType.map((item) =>
      formatTsDate(item.x),
    );
    rankChart.setOption({
      backgroundColor: "transparent",
      textStyle: { color: textColor, fontFamily: "inherit" },
      tooltip: { ...baseTooltip, formatter: deepTooltipFormatter },
      legend: { data: ["排名", "百分位"], ...baseLegend },
      grid: baseGrid,
      dataZoom: baseDataZoom,
      xAxis: { ...baseCategoryAxis, data: rankDates },
      yAxis: [
        {
          type: "value",
          inverse: true,
          min: 1,
          name: "排名",
          nameTextStyle: { color: textColor, fontSize: 11 },
          axisLabel: { color: textColor, fontSize: 11 },
          splitLine: { lineStyle: { color: axisColor, type: "dashed" } },
        },
        {
          type: "value",
          name: "百分位(%)",
          nameTextStyle: { color: textColor, fontSize: 11 },
          axisLabel: { formatter: "{value}%", color: textColor, fontSize: 11 },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: "排名",
          type: "line",
          data: detail.rateInSimilarType.map((item) => item.y),
          showSymbol: false,
          lineStyle: { width: 2, color: "#5470c6" },
          smooth: true,
        },
        {
          name: "百分位",
          type: "line",
          yAxisIndex: 1,
          data: detail.rateInSimilarPersent.map((item) => item[1]),
          showSymbol: false,
          lineStyle: { width: 2, color: "#ee6666" },
          smooth: true,
        },
      ],
    });
  } else {
    setNoData(rankChart, "暂无同类排行数据");
  }
}

function disposeDeepCharts() {
  grandTotalChart?.dispose();
  fluctuationChart?.dispose();
  holderChart?.dispose();
  assetChart?.dispose();
  performanceChart?.dispose();
  buySellChart?.dispose();
  sharePositionChart?.dispose();
  netWorthTrendChart?.dispose();
  acWorthTrendChart?.dispose();
  rankChart?.dispose();
  grandTotalChart = null;
  fluctuationChart = null;
  holderChart = null;
  assetChart = null;
  performanceChart = null;
  buySellChart = null;
  sharePositionChart = null;
  netWorthTrendChart = null;
  acWorthTrendChart = null;
  rankChart = null;
}

// ==================== 持仓明细辅助 ====================

function stockChangeClass(changePercent: number | null) {
  if (changePercent == null || settingStore.grayscaleMode) return "";
  if (changePercent > 0) return "positive";
  if (changePercent < 0) return "negative";
  return "";
}

function comparedText(s: { changeType: string; changeRatio: number }) {
  if (s.changeType === "新增") return "新增";
  if (isNaN(s.changeRatio)) return "--";
  const icon = s.changeRatio > 0 ? "↑" : "↓";
  return `${icon} ${Math.abs(s.changeRatio).toFixed(2)}%`;
}

function comparedClass(s: { changeType: string; changeRatio: number }) {
  if (settingStore.grayscaleMode) return "";
  if (s.changeType === "新增") return "positive";
  if (s.changeRatio > 0) return "positive";
  if (s.changeRatio < 0) return "negative";
  return "";
}

// ==================== Tab 切换 & 数据加载 ====================

async function switchTab(tab: string) {
  localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tab);
  activeTab.value = tab;
  scrollTabIntoCenter(tab);
  await loadTabOnce(tab);
}

// ==================== 移动端滑动切换Tab ====================

let touchStartY = 0;
let touchStartX = 0;
let touchStartTime = 0;
const SWIPE_THRESHOLD = 50; // 滑动距离阈值（像素）
const SWIPE_VELOCITY_THRESHOLD = 0.3; // 滑动速度阈值（像素/毫秒）
const MAX_VERTICAL_DEVIATION = 80; // 最大垂直偏移（像素），允许一定的垂直移动

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
  if (target?.closest(".chart-container")) {
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
  const currentIndex = tabs.findIndex((t) => t.key === activeTab.value);
  if (currentIndex === -1) return;

  // 向左滑动（deltaX < 0）切换到下一个tab
  // 向右滑动（deltaX > 0）切换到上一个tab
  let targetIndex = currentIndex;

  if (deltaX < 0 && currentIndex < tabs.length - 1) {
    // 向左滑动，切换到下一个tab
    targetIndex = currentIndex + 1;
  } else if (deltaX > 0 && currentIndex > 0) {
    // 向右滑动，切换到上一个tab
    targetIndex = currentIndex - 1;
  }

  if (targetIndex !== currentIndex) {
    const targetTab = tabs[targetIndex];
    if (targetTab) {
      switchTab(targetTab.key);
    }
  }
}

function scrollTabIntoCenter(tabKey: string) {
  nextTick(() => {
    const inner = tabsInnerRef.value;
    if (!inner) return;
    const tabEl = inner.querySelector(
      `[data-tab-key="${tabKey}"]`,
    ) as HTMLElement | null;
    if (!tabEl) return;
    // 计算让 tab 居中所需的 scrollLeft
    const containerWidth =
      inner.parentElement?.clientWidth ?? inner.scrollWidth;
    const tabLeft = tabEl.offsetLeft;
    const tabWidth = tabEl.offsetWidth;
    const targetScroll = tabLeft - containerWidth / 2 + tabWidth / 2;
    // 使用 el-scrollbar 的 setScrollLeft
    tabScrollbarRef.value?.setScrollLeft(Math.max(0, targetScroll));
  });
}

async function loadTabOnce(tab: string) {
  if (loadedTabs.has(tab)) return;
  loadedTabs.add(tab);
  tabLoading.value = true;
  try {
    await loadTabData(tab);
  } finally {
    tabLoading.value = false;
  }
}

async function loadTabData(tab: string) {
  switch (tab) {
    case "holding":
      // 本地数据，无需请求
      break;
    case "position": {
      const result = await fetchInvestmentPosition(props.code);
      positionData.value = result;
      break;
    }
    case "feature":
    case "overview":
    case "manager": {
      const [overviewResult, managerResult, weekNav, featureRawData] =
        await Promise.all([
          fetchFundOverview(props.code),
          fetchManagerAndThemes(props.code),
          fetchNetValueHistory(props.code, "1w"),
          fetchFundFeatureData(props.code),
        ]);
      overview.value = overviewResult.overview;
      periodIncrease.value = overviewResult.periodIncrease;
      managers.value = managerResult.managers;
      themes.value = managerResult.themes;
      weekNavRecords.value = weekNav;

      // 存储高级特色数据
      featureData.value = managerResult.uniqueInfo || null;
      periodIncreaseList.value = managerResult.periodIncreaseList || [];
      featureRaw.value = featureRawData || null;

      loadedTabs.add("overview");
      loadedTabs.add("manager");
      loadedTabs.add("theme");
      loadedTabs.add("feature");
      break;
    }
    case "theme": {
      if (!themes.value.length) {
        const result = await fetchManagerAndThemes(props.code);
        themes.value = result.themes;
        featureData.value = result.uniqueInfo || null;
        periodIncreaseList.value = result.periodIncreaseList || [];
      }
      break;
    }
    case "deep": {
      if (!pingzhongDetail.value) {
        pingzhongDetail.value = await fetchPingzhongDetailData(props.code);
      }
      await renderDeepCharts();
      break;
    }
    case "netValue": {
      await loadNetValueChart();
      break;
    }
    case "profit": {
      await loadProfitChart();
      break;
    }
  }
}

async function handleRefresh() {
  refreshing.value = true;
  try {
    loadedTabs.clear();
    pingzhongDetail.value = null;
    disposeDeepCharts();
    await fundService.fetchFundDetail(props.code);
    await loadTabOnce(activeTab.value);
  } finally {
    refreshing.value = false;
  }
}

// ==================== 历史净值图表 ====================

async function loadNetValueChart() {
  const records = await fetchNetValueHistory(props.code, netValueRange.value);
  await renderNetValueChart(records);
}

async function switchNetValueRange(range: string) {
  netValueRange.value = range;
  await loadNetValueChart();
}

async function renderNetValueChart(records: NetValueRecord[]) {
  const echarts = await loadEcharts();
  await nextTick();
  if (!netValueChartRef.value) return;
  if (!netValueChart) netValueChart = echarts.init(netValueChartRef.value);

  if (!records.length) {
    netValueChart.clear();
    netValueChart.setOption({
      title: {
        text: "暂无净值数据",
        left: "center",
        top: "center",
        textStyle: { fontSize: 13, fontWeight: "normal" },
      },
    });
    return;
  }

  const dates = records.map((r) => r.date);
  const dwjz = records.map((r) => r.netValue);
  const ljjz = records.map((r) => r.accNetValue);
  const jzzzl = records.map((r) => r.changePercent);

  netValueChart.setOption(
    {
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
          let html = `<div style="font-weight: 600; margin-bottom: 8px; color: ${
            isDarkMode.value ? "#fff" : "#333"
          }">${time}</div>`;
          params.forEach((p: any) => {
            html += `<div style="display: flex; align-items: center; margin: 4px 0; gap: 8px">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${
                p.color
              }; flex-shrink: 0;"></span>
              <span style="flex: 1;;text-align:left;">${p.seriesName}:</span>
              <span style="color: ${p.color}; font-weight: 600;">${Number(
                p.value,
              ).toFixed(4)}</span>
            </div>`;
          });
          const idx = params[0]?.dataIndex;
          const rate = jzzzl[idx];
          if (rate != null && rate !== 0) {
            const color =
              rate > 0 ? "#f56c6c" : rate < 0 ? "#4eb61b" : "inherit";
            html += `<div style="display: flex; align-items: center; margin-top: 6px; gap: 8px">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #909399; flex-shrink: 0;"></span>
              <span style="flex: 1;;text-align:left;">日增长率:</span>
              <span style="color: ${color}; font-weight: 600;">${rate}%</span>
            </div>`;
          }
          return html;
        },
      },
      legend: {
        data: ["单位净值", "累计净值"],
        textStyle: { fontSize: 11, color: isDarkMode.value ? "#fff" : "#000" },
      },
      grid: { left: 50, right: 16, bottom: 60, containLabel: false },
      xAxis: { type: "category", data: dates, axisLabel: { fontSize: 10 } },
      yAxis: {
        type: "value",
        scale: true,
        axisLabel: { fontSize: 10, formatter: (v: number) => v.toFixed(4) },
      },
      dataZoom: [
        { type: "inside" },
        { type: "slider", bottom: 20, height: 18 },
      ],
      series: [
        {
          name: "单位净值",
          type: "line",
          data: dwjz,
          smooth: false,
          showSymbol: false,
          lineStyle: { width: 2, color: "#409EFF" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(64, 158, 255, 0.4)" },
              { offset: 1, color: "rgba(64, 158, 255, 0)" },
            ]),
          },
        },
        {
          name: "累计净值",
          type: "line",
          data: ljjz,
          smooth: false,
          showSymbol: false,
          lineStyle: { width: 2, color: "#d84f00" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(216, 79, 0, 0.6)" },
              { offset: 1, color: "rgba(216, 79, 0, 0)" },
            ]),
          },
        },
      ],
    },
    true,
  );
}

// ==================== 累计收益图表 ====================

async function loadProfitChart() {
  const records = await fetchHistoryYield(props.code, profitRange.value);
  await renderProfitChart(records);
}

async function switchProfitRange(range: string) {
  profitRange.value = range;
  await loadProfitChart();
}

async function renderProfitChart(records: YieldRecord[]) {
  const echarts = await loadEcharts();
  await nextTick();
  if (!profitChartRef.value) return;
  if (!profitChart) profitChart = echarts.init(profitChartRef.value);

  if (!records.length) {
    profitChart.clear();
    profitChart.setOption({
      title: {
        text: "暂无累计收益数据",
        left: "center",
        top: "center",
        textStyle: { fontSize: 13, fontWeight: "normal" },
      },
    });
    return;
  }

  const dates = records.map((r) => r.date);
  const yieldData = records.map((r) => r.yield);
  const indexYieldData = records.map((r) => r.indexYield);
  const fundTypeYieldData = records.map((r) => r.fundTypeYield);

  profitChart.setOption(
    {
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
          let html = `<div style="font-weight: 600; margin-bottom: 8px; color: ${
            isDarkMode.value ? "#fff" : "#333"
          }">${time}</div>`;
          params.forEach((p: any) => {
            html += `<div style="display: flex; align-items: center; margin: 4px 0; gap: 8px">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${
                p.color
              }; flex-shrink: 0;"></span>
              <span style="flex: 1;text-align:left;">${p.seriesName}:</span>
              <span style="color: ${p.color}; font-weight: 600;">${Number(
                p.value,
              ).toFixed(2)}%</span>
            </div>`;
          });
          return html;
        },
      },
      legend: {
        data: ["涨幅", "沪深300", "同类平均"],
        top: 0,
        textStyle: { fontSize: 11, color: isDarkMode.value ? "#fff" : "#000" },
      },
      grid: { left: 50, right: 16, bottom: 60, containLabel: false },
      xAxis: { type: "category", data: dates, axisLabel: { fontSize: 10 } },
      yAxis: {
        type: "value",
        scale: true,
        axisLabel: { fontSize: 10, formatter: "{value}%" },
      },
      dataZoom: [
        { type: "inside" },
        { type: "slider", bottom: 20, height: 18 },
      ],
      series: [
        {
          name: "涨幅",
          type: "line",
          data: yieldData,
          smooth: false,
          showSymbol: false,
          lineStyle: { width: 2, color: "#F56C6C" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(245, 108, 108, 0.4)" },
              { offset: 1, color: "rgba(245, 108, 108, 0)" },
            ]),
          },
        },
        {
          name: "沪深300",
          type: "line",
          data: indexYieldData,
          smooth: false,
          showSymbol: false,
          lineStyle: { width: 2, color: "#67C23A" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(103, 194, 58, 0.4)" },
              { offset: 1, color: "rgba(103, 194, 58, 0)" },
            ]),
          },
        },
        {
          name: "同类平均",
          type: "line",
          data: fundTypeYieldData,
          smooth: false,
          showSymbol: false,
          lineStyle: { width: 2, color: "#E6A23C" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(230, 162, 60, 0.4)" },
              { offset: 1, color: "rgba(230, 162, 60, 0)" },
            ]),
          },
        },
      ],
    },
    true,
  );
}

// ==================== 编辑 & 删除 ====================

async function handleEdit() {
  if (!editFormRef.value) return;
  await editFormRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      await fundService.updateFund(
        props.code,
        editForm.value.num,
        editForm.value.cost,
        fundView.value?.groupKey,
      );
      await fundService.fetchFundDetail(props.code);
      ElMessage.success("已保存");
      showEditDialog.value = false;
    } catch (e: any) {
      ElMessage.error(e?.message || "保存失败");
    } finally {
      submitting.value = false;
    }
  });
}

// 开始编辑总金额
function startEditTotalAmount() {
  editTotalAmount.value = Number(
    (editForm.value.num * editForm.value.cost).toFixed(2),
  );
  isEditingTotalAmount.value = true;
}

// 确认修改总金额并倒推成本价
function confirmEditTotalAmount() {
  const newTotalAmount = editTotalAmount.value;
  const num = editForm.value.num;

  if (num <= 0) {
    ElMessage.error("份额必须大于0才能计算成本价");
    return;
  }

  if (newTotalAmount < 0) {
    ElMessage.error("总金额不能为负");
    return;
  }

  // 倒推计算新的成本价
  const newCost = newTotalAmount / num;
  editForm.value.cost = parseFloat(newCost.toFixed(4));

  isEditingTotalAmount.value = false;
  ElMessage.success(
    `已根据总金额 ${newTotalAmount.toFixed(2)} 元重新计算成本价`,
  );
}

// 取消编辑总金额
function cancelEditTotalAmount() {
  isEditingTotalAmount.value = false;
  // 重置编辑的总金额值
  editTotalAmount.value = editForm.value.num * editForm.value.cost;
}

// 取消编辑基金对话框
function handleCancelEdit() {
  isEditingTotalAmount.value = false;
  editFormRef.value?.resetFields();
  showEditDialog.value = false;
}

// 打开编辑基金对话框
function handleOpenEditDialog() {
  isEditingTotalAmount.value = false;
  nextTick(() => {
    editFormRef.value?.clearValidate();
  });
  showEditDialog.value = true;
}

async function confirmDelete() {
  try {
    await ElMessageBox.confirm(`确定删除基金 ${displayName.value}？`, "确认", {
      type: "warning",
    });
    await fundService.deleteFund(props.code);
    ElMessage.success("已删除");
    router.push("/");
  } catch (e: any) {
    if (e !== "cancel") ElMessage.error(e?.message || "删除失败");
  }
}

function goBack() {
  router.push("/");
}

// ==================== ResizeObserver ====================

let resizeObs: ResizeObserver | null = null;

function resizeAllCharts() {
  netValueChart?.resize();
  profitChart?.resize();
  grandTotalChart?.resize();
  fluctuationChart?.resize();
  holderChart?.resize();
  assetChart?.resize();
  performanceChart?.resize();
  buySellChart?.resize();
  sharePositionChart?.resize();
  netWorthTrendChart?.resize();
  acWorthTrendChart?.resize();
  rankChart?.resize();
}

function observeChartContainers(observer: ResizeObserver) {
  const chartRefs = [
    netValueChartRef,
    profitChartRef,
    grandTotalChartRef,
    fluctuationChartRef,
    holderChartRef,
    assetChartRef,
    performanceChartRef,
    buySellChartRef,
    sharePositionChartRef,
    netWorthTrendChartRef,
    acWorthTrendChartRef,
    rankChartRef,
  ];

  for (const chartRef of chartRefs) {
    if (chartRef.value) observer.observe(chartRef.value);
  }
}

// ==================== 路由参数变化时重置 ====================

watch(
  () => props.code,
  async (newCode) => {
    if (!newCode) return;
    // 重置所有状态，但保留当前 tab
    overview.value = null;
    managers.value = [];
    themes.value = [];
    pingzhongDetail.value = null;
    periodIncrease.value = null;
    weekNavRecords.value = [];
    positionData.value = null;
    netValueRange.value = "1m";
    profitRange.value = "1m";
    loadedTabs.clear();
    loadedTabs.add("holding");

    // 销毁旧图表，等 DOM 更新后重建
    netValueChart?.dispose();
    netValueChart = null;
    profitChart?.dispose();
    profitChart = null;
    disposeDeepCharts();

    // 加载新基金数据
    if (!fundStore.fundDetails.has(newCode)) {
      await fundService.fetchFundDetail(newCode);
    }
    if (fundView.value) {
      editForm.value = { num: fundView.value.num, cost: fundView.value.cost };
      // 重置总金额编辑状态
      isEditingTotalAmount.value = false;
      editTotalAmount.value = fundView.value.num * fundView.value.cost;
    }
    // 加载当前 tab 的数据（loadedTabs 已清空）并滚动居中
    await loadTabOnce(activeTab.value);
    scrollTabIntoCenter(activeTab.value);
  },
);

// --- 滚动阴影效果 ---

function updateTabScrollShadows(scrollable: HTMLElement) {
  const scrollLeft = scrollable.scrollLeft;
  const scrollWidth = scrollable.scrollWidth;
  const clientWidth = scrollable.clientWidth;

  // 判断滚动位置状态
  const isAtStart = scrollLeft < 1;
  const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 1;

  // 更新 CSS 变量
  scrollable.style.setProperty(
    "--tab-scroll-shadow-left",
    isAtStart ? "0" : "1",
  );
  scrollable.style.setProperty(
    "--tab-scroll-shadow-right",
    isAtEnd ? "0" : "1",
  );
}

function setupTabScrollShadows() {
  const scrollbar = tabScrollbarRef.value as any;
  if (!scrollbar) return;

  // 获取滚动容器
  const wrap = scrollbar?.$el?.querySelector(".el-scrollbar__wrap");
  if (!wrap) return;

  // 初始化
  updateTabScrollShadows(wrap);

  // 监听滚动事件
  const handleScroll = () => updateTabScrollShadows(wrap);
  wrap.addEventListener("scroll", handleScroll);

  // 保存清理函数
  (globalThis as any).__fundDetailViewScrollCleanup = () => {
    wrap.removeEventListener("scroll", handleScroll);
  };
}

function cleanupTabScrollShadows() {
  const cleanup = (globalThis as any).__fundDetailViewScrollCleanup;
  if (cleanup) cleanup();
}

// ==================== 生命周期 ====================

onMounted(async () => {
  // 确保基金数据已加载
  if (!fundStore.fundDetails.has(props.code)) {
    await fundService.fetchFundDetail(props.code);
  }
  // 初始化编辑表单
  if (fundView.value) {
    editForm.value = { num: fundView.value.num, cost: fundView.value.cost };
    // 初始化总金额编辑状态
    isEditingTotalAmount.value = false;
    editTotalAmount.value = fundView.value.num * fundView.value.cost;
  }
  // 初始 tab 滚动居中
  scrollTabIntoCenter(activeTab.value);
  // 持仓 Tab 无需网络请求
  loadedTabs.add("holding");

  // 图表 resize
  resizeObs = new ResizeObserver(() => {
    resizeAllCharts();
  });
  observeChartContainers(resizeObs);

  window.addEventListener("resize", resizeAllCharts);

  // 延迟一帧以确保 DOM 已完全挂载
  await nextTick();
  setupTabScrollShadows();

  await loadTabOnce(activeTab.value);
});

onUnmounted(() => {
  cleanupTabScrollShadows();
  resizeObs?.disconnect();
  window.removeEventListener("resize", resizeAllCharts);
  netValueChart?.dispose();
  profitChart?.dispose();
  disposeDeepCharts();
});
</script>

<style scoped>
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
}

.header-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.fund-name {
  font-size: 15px;
  font-weight: 600;
  text-align: left;
  padding-right: 10px;
  color: var(--text-primary);
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

.detail-tabs {
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
  padding: 0;
  --tab-scroll-shadow-left: 0;
  --tab-scroll-shadow-right: 1;
}

:deep(.detail-tabs .el-scrollbar__wrap) {
  overflow-x: auto !important;
  overflow-y: hidden !important;
  /* 动态阴影效果：左右两侧的 inset 阴影 */
  box-shadow:
    inset calc(var(--tab-scroll-shadow-left) * 12px) 0 6px -4px
      rgba(0, 0, 0, 0.08),
    inset calc(var(--tab-scroll-shadow-right) * -12px) 0 6px -4px
      rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

html.dark :deep(.detail-tabs .el-scrollbar__wrap) {
  box-shadow:
    inset calc(var(--tab-scroll-shadow-left) * 12px) 0 6px -4px
      rgba(255, 255, 255, 0.06),
    inset calc(var(--tab-scroll-shadow-right) * -12px) 0 6px -4px
      rgba(255, 255, 255, 0.06);
}

:deep(.detail-tabs .el-scrollbar__bar) {
  display: none !important;
}

.detail-tabs-inner {
  display: flex;
  gap: 4px;
}

.tab-item {
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  color: var(--el-text-color-regular);
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.tab-item.active {
  color: var(--el-color-primary);
  border-bottom-color: var(--el-color-primary);
  font-weight: 500;
}

.detail-main {
  padding: 16px;
  touch-action: pan-y; /* 允许垂直滚动，水平滑动用于切换tab */
  position: relative;
  min-height: calc(100vh - 140px);
}

.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.holding-sections {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

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
}

/* 持仓信息网格 */
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
}

.g-value {
  font-size: 14px;
  font-weight: 700;
}

/* 概况列表 */
.info-list {
  display: flex;
  flex-direction: column;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--el-border-color-light);
  font-size: 13px;
}

.info-row:last-child {
  border-bottom: none;
}

.info-row.section-title span:first-child {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
}

.info-row span:first-child {
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.info-row span:last-child {
  text-align: right;
  max-width: 60%;
  word-break: break-all;
}

.bench-text {
  font-size: 11px;
}

/* 经理卡片 */
.manager-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.manager-card {
  padding: 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.manager-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  justify-content: center;
}

.manager-avatar {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--el-border-color);
}

.manager-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.manager-name {
  font-size: 15px;
  font-weight: 600;
}

.manager-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.manager-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-secondary);
}

.manager-stats-row {
  display: flex;
  gap: 16px;
  padding: 10px 14px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}

.manager-stat {
  flex: 1;
  text-align: center;
}

.manager-stat .stat-label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.manager-stat .stat-value {
  font-size: 14px;
  font-weight: 600;
}

.manager-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.manager-resume {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.8;
  max-height: 50vh;
  padding-right: 10px;
}

.resume-content {
  text-align: left;
}

/* 关联板块 */
.theme-list {
  display: flex;
  flex-direction: column;
}

.theme-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--el-border-color-light);
  font-size: 13px;
}

.theme-item:last-child {
  border-bottom: none;
}

.theme-name {
  font-weight: 500;
}

.theme-corr {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

/* 时间范围选择 */
.range-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.range-item {
  padding: 2px 10px;
  font-size: 12px;
  border-radius: 12px;
  cursor: pointer;
  user-select: none;
  background: var(--el-fill-color);
  color: var(--el-text-color-secondary);
  transition: all 0.2s;
}

.range-item.active {
  background: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
  font-weight: 500;
}

/* 图表 */
.chart-container {
  width: 100%;
  height: 300px;
  padding-bottom: 16px;
}

/* 操作按钮 */
.action-row {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.action-row .el-button {
  flex: 1;
  margin: 0;
}

/* 颜色 */
.positive {
  color: var(--color-up);
}
.negative {
  color: var(--color-down);
}

.muted {
  color: var(--el-text-color-placeholder);
}

.loading-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.loading-box {
  display: flex;
  align-items: center;
  gap: 12px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(0, 0, 0, 0.08);
  border-top-color: var(--el-color-primary);
  border-radius: 50%;
  animation: loading-spin 0.9s linear infinite;
  box-sizing: border-box;
}

.loading-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

@keyframes loading-spin {
  to {
    transform: rotate(360deg);
  }
}

/* 持仓明细 */
.position-header {
  padding: 4px 0 8px;
}

.position-date {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.position-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.position-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  padding: 4px 0;
  border-bottom: 1px solid var(--el-border-color-light);
  margin-bottom: 8px;
}

.stock-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.stock-code {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-top: 1px;
}

.deep-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.deep-summary-card,
.deep-section-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px 16px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-bg-color);
  min-width: 0;
}

.deep-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--el-border-color);
}

.deep-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.deep-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.deep-info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: 6px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color);
}

.deep-info-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.deep-info-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.deep-return-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
}

.deep-return-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px;
  border-radius: 6px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color);
}

.deep-return-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.deep-return-value {
  font-size: 16px;
  font-weight: 700;
}

.deep-charts-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.deep-chart-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px 16px 16px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-bg-color);
}

.deep-chart-container {
  width: 100%;
  height: 320px;
}

.deep-chart-container--radar {
  height: 360px;
}

.deep-manager-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.deep-manager-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 6px;
  background: var(--el-fill-color-lighter);
}

.deep-manager-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-direction: column;
}

.deep-manager-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--el-border-color);
  flex-shrink: 0;
}

.deep-manager-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.deep-manager-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.deep-manager-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.deep-manager-meta span {
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--el-fill-color);
}

.deep-manager-meta span:last-of-type::after {
  content: "★";
  margin: 0 4px;
  color: var(--el-text-color-secondary);
}

.deep-manager-stats {
  display: flex;
  gap: 12px;
}

.deep-manager-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px;
  border-radius: 6px;
  background: var(--el-fill-color);
}

.deep-manager-stat .stat-label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.deep-manager-stat .stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.deep-same-type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.deep-same-type-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 6px;
  background: var(--el-fill-color);
}

.deep-same-type-header {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--el-border-color);
}

.deep-same-type-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.deep-same-type-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  padding: 4px 0;
}

.deep-same-type-name {
  flex: 1 1 0;
  min-width: 0;
  color: var(--el-text-color-regular);
  display: flex;
  gap: 4px;
}

.deep-same-type-name span {
  min-width: 50px;
}

.deep-same-type-name span:last-of-type {
  flex: 1 1 auto;
  min-width: 0;
  width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.deep-same-type-rate {
  flex-shrink: 0;
  font-weight: 600;
}

.deep-collapse {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
}

.deep-codes-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 16px;
}

.deep-codes-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.deep-codes-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-align: left;
}

.deep-codes-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.deep-code-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-size: 12px;
  font-family: "Consolas", "Monaco", monospace;
  border: 1px solid var(--el-border-color-light);
}

@media (max-width: 768px) {
  .g-value {
    font-size: 14px;
  }

  .chart-grid-2col {
    grid-template-columns: 1fr;
  }

  .deep-chart-container,
  .deep-chart-container--radar {
    height: 280px;
  }

  .deep-info-grid,
  .deep-return-grid {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }

  .deep-manager-list,
  .deep-same-type-grid {
    grid-template-columns: 1fr;
  }
}

/* ==================== 特色数据 Tab 精美样式 ==================== */
.feature-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feature-card-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feature-card {
  padding: 18px;
  border-radius: 12px;
  border: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color-overlay);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.feature-card:hover {
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.05);
  transform: translateY(-2px);
}

.feature-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  transition: all 0.3s;
}

.feature-metric-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}

.feature-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  line-height: 1.1;
  transition: all 0.3s;
  font-family:
    "Inter",
    "Outfit",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    sans-serif;
}

.feature-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

@media screen and (max-width: 768px) {
  .feature-value {
    font-size: 18px;
  }

  .feature-card {
    padding: 14px;
  }

  .feature-card-header {
    gap: 6px;
  }
}

.feature-rank-info {
  text-align: right;
  padding-bottom: 2px;
}

.feature-rank-desc {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.highlight-text {
  font-weight: 600;
  color: var(--el-color-primary);
}

/* 进度条轨道 */
.feature-progress-track {
  position: relative;
  height: 6px;
  border-radius: 3px;
  margin-top: 20px;
  margin-bottom: 6px;
  overflow: visible; /* 允许小三角溢出 */
}

/* 填充条 */
.feature-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
}

/* 波动率（浅蓝背景，深蓝填充） */
.stddev-track {
  background: var(--el-fill-color-dark);
}
.stddev-fill {
  background: linear-gradient(90deg, #c2e9fb 0%, #3b82f6 100%);
}

/* 夏普比率（浅红背景，深红填充） */
.sharp-track {
  background: var(--el-fill-color-dark);
}
.sharp-fill {
  background: linear-gradient(90deg, #ff9a9e 0%, #ef4444 100%);
}

/* 最大回撤（浅绿背景，深绿填充） */
.maxretra-track {
  background: var(--el-fill-color-dark);
}
.maxretra-fill {
  background: linear-gradient(90deg, #d4fc79 0%, #10b981 100%);
}

/* 指示小圆形 */
.progress-indicator {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: left 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
  z-index: 2;
}

.stddev-indicator {
  background: #3b82f6;
}
.sharp-indicator {
  background: #ef4444;
}
.maxretra-indicator {
  background: #10b981;
}

/* 倒三角指示器 */
.indicator-arrow {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  transition: border-top-color 0.3s;
}

.stddev-indicator .indicator-arrow {
  border-top: 6px solid #3b82f6;
}
.sharp-indicator .indicator-arrow {
  border-top: 6px solid #ef4444;
}
.maxretra-indicator .indicator-arrow {
  border-top: 6px solid #10b981;
}

/* 暗黑模式自适应阴影和背景适配 */
.dark .feature-range-selector {
  background: rgba(255, 255, 255, 0.05);
}
.dark .feature-card {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.08);
}
.dark .progress-indicator {
  border-color: #1e1e1e;
}

/* ==================== 移动端滑动优化 ==================== */
@media (max-width: 768px) {
  .detail-main {
    /* 优化移动端触摸体验 */
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
  }

  .tab-panel {
    /* 添加轻微的过渡效果 */
    animation: fadeIn 0.2s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* 移动端tab项优化 */
  .tab-item {
    padding: 10px 14px;
    font-size: 14px;
  }

  /* 移动端detail-tabs优化 */
  .detail-tabs {
    position: sticky;
    top: 0;
    z-index: 10;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
}
</style>
