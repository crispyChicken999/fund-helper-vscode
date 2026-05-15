<template>
  <MainLayout>
    <template #header>
      <!-- 顶部资产展示区 -->
      <div class="account-summary">
        <div class="account-stats">
          <!-- 第一栏：账户资产 -->
          <div class="stat-item stat-item-main">
            <div class="stat-label">
              <span>账户资产({{ fundStore.fundCount }})</span>
              <button
                class="btn-icon"
                @click="togglePrivacy"
                :title="settingStore.privacyMode ? '显示金额' : '隐藏金额'"
              >
                <svg
                  v-if="settingStore.privacyMode"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="M11.83 9L15 12.16V12a3 3 0 0 0-3-3zm-4.3.8l1.55 1.55c-.05.21-.08.42-.08.65a3 3 0 0 0 3 3c.22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53a5 5 0 0 1-5-5c0-.79.2-1.53.53-2.2M2 4.27l2.28 2.28l.45.45C3.08 8.3 1.78 10 1 12c1.73 4.39 6 7.5 11 7.5c1.55 0 3.03-.3 4.38-.84l.43.42L19.73 22L21 20.73L3.27 3M12 7a5 5 0 0 1 5 5c0 .64-.13 1.26-.36 1.82l2.93 2.93c1.5-1.25 2.7-2.89 3.43-4.75c-1.73-4.39-6-7.5-11-7.5c-1.4 0-2.74.25-4 .7l2.17 2.15C10.74 7.13 11.35 7 12 7"
                  />
                </svg>
                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                >
                  <!-- Icon from Material Design Icons by Pictogrammers - https://github.com/Templarian/MaterialDesign/blob/master/LICENSE -->
                  <path
                    fill="currentColor"
                    d="M12 9a3 3 0 0 1 3 3a3 3 0 0 1-3 3a3 3 0 0 1-3-3a3 3 0 0 1 3-3m0-4.5c5 0 9.27 3.11 11 7.5c-1.73 4.39-6 7.5-11 7.5S2.73 16.39 1 12c1.73-4.39 6-7.5 11-7.5M3.18 12a9.821 9.821 0 0 0 17.64 0a9.821 9.821 0 0 0-17.64 0"
                  />
                </svg>
              </button>
              <button
                class="btn-icon"
                :class="{ active: settingStore.grayscaleMode }"
                @click="toggleGrayscale"
                title="灰色模式"
              >
                <svg
                  v-if="!settingStore.grayscaleMode"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="M12 4.81V19c-3.31 0-6-2.63-6-5.87c0-1.56.62-3.03 1.75-4.14zM6.35 7.56C4.9 8.99 4 10.96 4 13.13C4 17.48 7.58 21 12 21s8-3.52 8-7.87c0-2.17-.9-4.14-2.35-5.57L12.7 2.69c-.39-.38-1.01-.38-1.4 0z"
                  />
                </svg>
                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="M20.49 20.49L3.51 3.51A.996.996 0 1 0 2.1 4.92l3.5 3.5a7.73 7.73 0 0 0-1.6 4.7C4 17.48 7.58 21 12 21c1.75 0 3.36-.56 4.67-1.5l2.4 2.4c.39.39 1.02.39 1.41 0c.4-.39.4-1.02.01-1.41M12 19c-3.31 0-6-2.63-6-5.87c0-1.19.36-2.32 1.02-3.28L12 14.83zM8.38 5.56l2.91-2.87c.39-.38 1.01-.38 1.4 0l4.95 4.87C19.1 8.99 20 10.96 20 13.13c0 1.18-.27 2.29-.74 3.3L12 9.17V4.81L9.8 6.97z"
                  />
                </svg>
              </button>
              <button
                class="btn-icon"
                :class="{ active: settingStore.theme === 'dark' }"
                @click="toggleDarkMode($event)"
                title="主题切换"
              >
                <el-icon v-if="settingStore.theme === 'light'"><Sunny /></el-icon>
                <el-icon v-else><Moon /></el-icon>
              </button>
              <span class="stat-label-spacer"></span>
              <el-button
                type="primary"
                size="small"
                round
                :plain="isDarkMode ? false : true"
                @click="showAddFundDialog = true"
                title="添加基金"
              >
                <el-icon><Plus /></el-icon>
              </el-button>
              <el-button
                size="small"
                round
                @click="handleRefresh"
                :loading="refreshing"
                title="刷新"
              >
                <el-icon><Refresh /></el-icon>
              </el-button>
              <el-button
                size="small"
                round
                @click="showColumnSettings = true"
                title="列设置"
              >
                <el-icon><Operation /></el-icon>
              </el-button>
            </div>
          </div>
          <div class="stat-content">
            <div class="stat-value-large">{{ formatAsset(totalAsset) }}</div>
            <div class="stat-item-wrapper">
              <div class="stat-item">
                <div class="stat-label">持有收益</div>
                <div
                  class="stat-value"
                  :class="getValueClass(totalHoldingGain)"
                >
                  {{ formatAsset(totalHoldingGain) }}
                </div>
                <div class="stat-rate" :class="getValueClass(holdingGainRate)">
                  {{ formatPercent(holdingGainRate) }}
                </div>
              </div>
              <div class="stat-item">
                <div class="stat-label">日收益</div>
                <div class="stat-value" :class="getValueClass(totalDailyGain)">
                  {{ formatAsset(totalDailyGain) }}
                </div>
                <div class="stat-rate" :class="getValueClass(dailyGainRate)">
                  {{ formatPercent(dailyGainRate) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 分组管理区 -->
      <div class="group-tags-wrapper">
        <div class="group-tags-container" ref="groupTagsContainerRef">
          <div
            class="group-tag-item"
            :class="{ active: selectedGroupKey === 'all' }"
            @click="selectGroup('all')"
            @pointerdown="onAllGroupPointerDown($event)"
            @pointerup="onAllGroupPointerUp"
            @pointerleave="onAllGroupPointerUp"
            @mouseenter="onAllGroupMouseEnter($event)"
            @mouseleave="onGroupMouseLeave"
            @contextmenu.prevent
          >
            全部
          </div>
          <div
            v-for="group in groupList"
            :key="group.key"
            :data-group-key="group.key"
            class="group-tag-item"
            :class="{ active: selectedGroupKey === group.key }"
            @click="selectGroup(group.key)"
            @pointerdown="onGroupPointerDown(group, $event)"
            @pointerup="onGroupPointerUp"
            @pointerleave="onGroupPointerUp"
            @mouseenter="onGroupMouseEnter(group, $event)"
            @mouseleave="onGroupMouseLeave"
            @contextmenu.prevent
          >
            {{ group.name }}
          </div>
        </div>
        <button
          class="group-tag-settings"
          @click="showGroupManageDialog = true"
          title="分组管理"
        >
          <el-icon><Setting /></el-icon>
        </button>
      </div>

      <!-- 搜索工具栏 -->
      <div class="fund-toolbar">
        <div class="search-box">
          <el-input
            v-model="searchQuery"
            placeholder="搜索基金代码或名称"
            clearable
            size="small"
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
            <template #append v-if="showQuickAddBtn">
              <el-button type="primary" size="small" @click="handleQuickAdd"
                >添加</el-button
              >
            </template>
          </el-input>
        </div>
        <div class="market-status">
          <span
            class="status-dot"
            :class="marketOpen ? 'status-open' : 'status-closed'"
          ></span>
          <span class="status-text">{{ marketOpen ? "开市" : "休市" }}</span>
        </div>
      </div>
    </template>

    <!-- 基金列表区 -->
    <div class="fund-list-main" v-loading="loading">
      <div
        v-if="sortedRows.length > 0"
        class="fund-table-wrap"
        @touchend.passive="onTableTouchEnd"
      >
        <el-table
          class="fund-el-table"
          :data="sortedRows"
          row-key="code"
          border
          stripe
          height="100%"
          :default-sort="defaultTableSort"
          @sort-change="handleTableSort"
        >
          <el-table-column
            v-if="isColumnVisible('name')"
            fixed="left"
            width="136"
            label="基金名称"
          >
            <template #default="{ row }">
              <div
                class="fund-name-cell"
                @click="openTooltip(row)"
                @mouseenter="onFundMouseEnter(row, $event)"
                @mouseleave="onFundMouseLeave"
              >
                <div class="fund-name-row">
                  <span
                    v-if="row.showRealValueIcon"
                    class="real-value-icon"
                    title="已更新实际净值"
                    >✓</span
                  >
                  <span class="fund-name">{{ row.name }}</span>
                </div>
                <div class="fund-code-row">
                  <div>
                    <span
                      v-if="canDragFundRows"
                      class="drag-icon"
                      title="拖拽排序"
                      >⠿</span
                    >
                    <span class="fund-code">{{ row.code }}</span>
                  </div>
                  <span
                    v-if="showGroupTag && row.groupName"
                    class="group-label"
                    @click.stop="jumpToGroup(row)"
                    >{{ row.groupName }}</span
                  >
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column
            v-for="col in tableBodyColumns"
            :key="col.key"
            :prop="col.sortProp"
            :sortable="col.sortProp ? 'custom' : false"
            :align="col.align || 'right'"
            :min-width="col.minWidth"
          >
            <template #header>
              <div class="col-head">
                <span>{{ col.title }}</span>
                <span class="col-head-sub">{{ headerSubLabel(col.key) }}</span>
              </div>
            </template>
            <template #default="{ row }">
              <template v-if="col.key === 'estimatedChange'">
                <div class="cell-stack">
                  <div :class="estGainClass(row, row.gszzl)">
                    {{ fmtPctRow(row.gszzl, row.shouldShowEstimated) }}
                  </div>
                  <div class="td-sub">
                    {{ row.fullUpdateTime || row.updateTime || "—" }}
                  </div>
                </div>
              </template>
              <template v-else-if="col.key === 'estimatedGain'">
                <div class="cell-stack">
                  <div :class="estGainClass(row, row.estimatedGain)">
                    {{ fmtVal(row.estimatedGain, row.shouldShowEstimated) }}
                  </div>
                  <div class="td-sub" :class="pctClass(row.gszzl)">
                    {{ fmtPctRow(row.gszzl, row.shouldShowEstimated) }}
                  </div>
                </div>
              </template>
              <template v-else-if="col.key === 'dailyChange'">
                <div class="cell-stack">
                  <div :class="pctClass(row.navChgRt)">
                    {{ fmtPctRow(row.navChgRt, true) }}
                  </div>
                  <div class="td-sub muted">{{ row.navDateLabel }}</div>
                </div>
              </template>
              <template v-else-if="col.key === 'dailyGain'">
                <div class="cell-stack">
                  <div :class="moneyClass(row.dailyGain)">
                    {{ formatValue(row.dailyGain) }}
                  </div>
                  <div class="td-sub muted">{{ row.navDateLabel }}</div>
                </div>
              </template>
              <template v-else-if="col.key === 'holdingGain'">
                <div class="cell-stack">
                  <div :class="moneyClass(row.holdingGain)">
                    {{ formatValue(row.holdingGain) }}
                  </div>
                  <div class="td-sub" :class="pctClass(row.holdingGainRate)">
                    {{ formatPercent(row.holdingGainRate) }}
                  </div>
                </div>
              </template>
              <template v-else-if="col.key === 'holdingGainRate'">
                <div class="cell-stack">
                  <div :class="pctClass(row.holdingGainRate)">
                    {{ formatPercent(row.holdingGainRate) }}
                  </div>
                  <div class="td-sub" :class="moneyClass(row.holdingGain)">
                    {{ formatValue(row.holdingGain) }}
                  </div>
                </div>
              </template>
              <template v-else-if="col.key === 'sector'">
                <span style="text-align: center">{{ row.relateTheme }}</span>
              </template>
              <template v-else-if="col.key === 'amountShares'">
                <div class="cell-stack">
                  <div>{{ formatValue(row.holdingAmount) }}</div>
                  <div class="td-sub muted">
                    {{ formatShares(row.fund.num) }} 份
                  </div>
                </div>
              </template>
              <template v-else-if="col.key === 'cost'">
                <div class="cell-stack">
                  <div>{{ formatNumber(row.fund.cost, 4) }}</div>
                  <div class="td-sub muted">
                    {{ formatNumber(row.dwjz, 4) }}
                  </div>
                </div>
              </template>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-empty v-else description="暂无基金数据，点击上方按钮添加基金" />

      <FundTooltip
        :visible="tooltipVisible"
        :row="tooltipRow"
        :privacy-mode="settingStore.privacyMode"
        @close="tooltipVisible = false"
        @detail="onTooltipDetail"
        @add-shares="onTooltipAdjust(true)"
        @reduce-shares="onTooltipAdjust(false)"
        @edit="onTooltipEdit"
        @set-group="onTooltipSetGroup"
        @delete="onTooltipDelete"
      />

      <!-- 分组统计弹窗 -->
      <GroupTooltip
        :visible="groupTooltipVisible"
        :stats="groupTooltipStats"
        @close="groupTooltipVisible = false"
      />

      <!-- PC 端 hover tooltip -->
      <FundHoverTooltip
        :visible="fundHoverVisible"
        :row="fundHoverRow"
        :privacy-mode="settingStore.privacyMode"
        :x="fundHoverX"
        :y="fundHoverY"
        @mouseenter="onFundTooltipMouseEnter"
        @mouseleave="onFundTooltipMouseLeave"
        @close="closeFundHover"
        @detail="onHoverTooltipDetail"
        @add-shares="onHoverTooltipAdjust(true)"
        @reduce-shares="onHoverTooltipAdjust(false)"
        @edit="onHoverTooltipEdit"
        @set-group="onHoverTooltipSetGroup"
        @delete="onHoverTooltipDelete"
      />
      <GroupHoverTooltip
        :visible="groupHoverVisible"
        :stats="groupHoverStats"
        :x="groupHoverX"
        :y="groupHoverY"
        @mouseenter="onGroupTooltipMouseEnter"
        @mouseleave="onGroupTooltipMouseLeave"
        @close="closeGroupHover"
      />

      <!-- 分组管理弹窗 -->
      <GroupManageDialog
        v-model:visible="showGroupManageDialog"
        :fund-rows="enrichedRows"
        @saved="onGroupManageSaved"
      />
    </div>

    <!-- 添加基金对话框 -->
    <el-dialog
      v-model="showAddFundDialog"
      title="添加基金"
      width="90%"
      :close-on-click-modal="true"
    >
      <el-form
        :model="fundForm"
        :rules="fundFormRules"
        ref="fundFormRef"
        label-width="100px"
      >
        <el-form-item label="搜索基金" prop="code">
          <div class="fund-search-field">
            <el-input
              v-model="fundForm.code"
              placeholder="输入代码或名称"
              maxlength="32"
              clearable
              @input="onFundSearchInput"
            />
            <div v-if="fundSearchResults.length" class="fund-search-dropdown">
              <div
                v-for="item in fundSearchResults"
                :key="item.code"
                class="fund-search-item"
                @click="pickSearchFund(item)"
              >
                <span class="code">{{ item.code }}</span>
                <span class="nm">{{ item.name }}</span>
              </div>
            </div>
          </div>
        </el-form-item>
        <el-form-item v-if="fundPickName" label="已选基金">
          <span>{{ fundPickName }}</span>
        </el-form-item>
        <el-form-item label="持有份额" prop="num">
          <el-input
            v-model.number="fundForm.num"
            type="number"
            placeholder="请输入持有份额"
          />
        </el-form-item>
        <el-form-item label="成本价" prop="cost">
          <el-input
            v-model.number="fundForm.cost"
            type="number"
            placeholder="请输入成本价"
          />
        </el-form-item>
        <el-form-item label="所属分组" prop="groupKey">
          <el-select
            v-model="fundForm.groupKey"
            placeholder="请选择分组（可选）"
            clearable
          >
            <el-option
              v-for="group in groupList"
              :key="group.key"
              :label="group.name"
              :value="group.key"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddFundDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddFund" :loading="submitting"
          >确定</el-button
        >
      </template>
    </el-dialog>

    <!-- 编辑基金对话框 -->
    <el-dialog
      v-model="showEditFundDialog"
      title="编辑基金"
      width="90%"
      :close-on-click-modal="true"
      destroy-on-close
    >
      <el-form
        :model="editFundForm"
        :rules="fundFormRules"
        ref="editFundFormRef"
        label-width="100px"
      >
        <el-form-item label="基金代码">
          <el-input v-model="editFundForm.code" disabled />
        </el-form-item>
        <el-form-item label="基金名称">
          <el-input v-model="editFundForm.name" disabled />
        </el-form-item>
        <el-form-item label="持有份额" prop="num">
          <el-input
            v-model.number="editFundForm.num"
            type="number"
            placeholder="请输入持有份额"
          />
        </el-form-item>
        <el-form-item label="成本价" prop="cost">
          <el-input
            v-model.number="editFundForm.cost"
            type="number"
            placeholder="请输入成本价"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditFundDialog = false">取消</el-button>
        <el-button type="primary" @click="handleEditFund" :loading="submitting"
          >保存</el-button
        >
      </template>
    </el-dialog>

    <!-- 添加分组对话框 -->
    <el-dialog
      v-model="showAddGroupDialog"
      title="添加分组"
      width="90%"
      :close-on-click-modal="true"
    >
      <el-form
        :model="groupForm"
        :rules="groupFormRules"
        ref="groupFormRef"
        label-width="100px"
      >
        <el-form-item label="分组名称" prop="name">
          <el-input
            v-model="groupForm.name"
            placeholder="请输入分组名称"
            maxlength="50"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddGroupDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddGroup" :loading="submitting"
          >确定</el-button
        >
      </template>
    </el-dialog>

    <!-- 编辑分组对话框 -->
    <el-dialog
      v-model="showEditGroupDialog"
      title="编辑分组"
      width="90%"
      :close-on-click-modal="true"
    >
      <el-form
        :model="editGroupForm"
        :rules="groupFormRules"
        ref="editGroupFormRef"
        label-width="100px"
      >
        <el-form-item label="分组名称" prop="name">
          <el-input
            v-model="editGroupForm.name"
            placeholder="请输入分组名称"
            maxlength="50"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditGroupDialog = false">取消</el-button>
        <el-button type="danger" @click="confirmDeleteGroup"
          >删除分组</el-button
        >
        <el-button type="primary" @click="handleEditGroup" :loading="submitting"
          >保存</el-button
        >
      </template>
    </el-dialog>

    <!-- 列设置对话框 -->
    <ColumnSettingsDialog v-model:visible="showColumnSettings" />

    <!-- 加仓/减仓对话框 -->
    <el-dialog
      v-model="showPositionDialog"
      :title="positionIsAdd ? '加仓' : '减仓'"
      width="90%"
      :close-on-click-modal="true"
    >
      <div v-if="positionRow" class="position-dialog-content">
        <div class="position-fund-info">
          <span class="fund-name">{{ positionRow.name }}</span>
          <span class="fund-code">{{ positionRow.code }}</span>
          <span class="fund-shares"
            >当前份额：{{ positionRow.fund.num.toFixed(2) }}</span
          >
        </div>

        <!-- 历史净值选择 -->
        <div class="nav-history-section">
          <div class="section-label">
            选择{{ positionIsAdd ? "买入" : "卖出" }}日期净值：
          </div>
          <div v-if="navHistoryLoading" class="nav-loading">
            加载历史净值中...
          </div>
          <div v-else-if="navHistoryList.length" class="nav-list">
            <div
              v-for="item in navHistoryList"
              :key="item.date"
              class="nav-item"
              :class="{ selected: selectedNavDate === item.date }"
              @click="selectNavItem(item)"
            >
              <span class="nav-date">{{ item.date }}</span>
              <span class="nav-value"
                >净值: {{ item.netValue.toFixed(4) }}</span
              >
              <span
                class="nav-change"
                :class="item.changePercent >= 0 ? 'positive' : 'negative'"
              >
                {{ item.changePercent >= 0 ? "+" : ""
                }}{{ item.changePercent.toFixed(2) }}%
              </span>
            </div>
          </div>
          <div v-else class="nav-empty">未获取到历史净值</div>
        </div>

        <!-- 输入金额/份额 -->
        <el-form label-width="100px" style="margin-top: 12px">
          <el-form-item v-if="positionIsAdd" label="买入金额">
            <el-input
              v-model.number="positionAmount"
              type="number"
              placeholder="输入买入金额（元）"
            >
              <template #append>元</template>
            </el-input>
          </el-form-item>
          <el-form-item v-else label="卖出份额">
            <el-input
              v-model.number="positionShares"
              type="number"
              :placeholder="`最多 ${positionRow.fund.num.toFixed(2)} 份`"
            >
              <template #append>份</template>
            </el-input>
          </el-form-item>

          <!-- 计算结果预览 -->
          <div
            v-if="positionIsAdd && positionAmount > 0 && selectedNavValue > 0"
            class="calc-preview"
          >
            <div>买入净值：{{ selectedNavValue.toFixed(4) }}</div>
            <div>
              新增份额：{{ (positionAmount / selectedNavValue).toFixed(2) }}
            </div>
            <div>
              新总份额：{{
                (
                  positionRow.fund.num +
                  positionAmount / selectedNavValue
                ).toFixed(2)
              }}
            </div>
            <div>新成本价：{{ calcNewCost.toFixed(4) }}</div>
          </div>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="showPositionDialog = false">取消</el-button>
        <el-button
          type="primary"
          @click="handlePositionConfirm"
          :loading="submitting"
          :disabled="!canConfirmPosition"
          >确定</el-button
        >
      </template>
    </el-dialog>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import {
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules,
} from "element-plus";
import {
  Plus,
  Search,
  Refresh,
  Operation,
  Setting,
  Moon,
  Sunny,
} from "@element-plus/icons-vue";
import { useDebounceFn, useMediaQuery } from "@vueuse/core";
import Sortable from "sortablejs";
import MainLayout from "@/layouts/MainLayout.vue";
import FundTooltip from "@/components/FundTooltip.vue";
import ColumnSettingsDialog from "@/components/ColumnSettingsDialog.vue";
import GroupTooltip from "@/components/GroupTooltip.vue";
import GroupManageDialog from "@/components/GroupManageDialog.vue";
import FundHoverTooltip from "@/components/FundHoverTooltip.vue";
import GroupHoverTooltip from "@/components/GroupHoverTooltip.vue";
import type { GroupStats } from "@/components/GroupTooltip.vue";
import { useFundStore, useGroupStore, useSettingStore } from "@/stores";
import { fundService, groupService } from "@/services";
import { storageService } from "@/services/storageService";
import { searchFund } from "@/api/fundEastmoney";
import { fetchNetValueHistory } from "@/api/fundDetail";
import { formatCurrency, formatNumber, formatPrivacy } from "@/utils/format";
import { validateFundCode, validateGroupName } from "@/utils/validate";
import { getChinaMarketStatus } from "@/utils/marketChina";
import type { Group, FundView } from "@/types";
import type { FundRowDisplay } from "@/utils/fundDisplay";

type TableColMeta = {
  title: string;
  sortProp?: string;
  minWidth: number;
  align?: "left" | "right" | "center";
};

const TABLE_COL_META: Record<string, TableColMeta> = {
  estimatedGain: {
    title: "估算收益",
    sortProp: "estimatedGain",
    minWidth: 90,
    align: "right",
  },
  estimatedChange: {
    title: "估算涨幅",
    sortProp: "estimatedChange",
    minWidth: 90,
    align: "right",
  },
  holdingGainRate: {
    title: "总收益率",
    sortProp: "holdingGainRate",
    minWidth: 90,
    align: "right",
  },
  holdingGain: {
    title: "持有收益",
    sortProp: "holdingGain",
    minWidth: 95,
    align: "right",
  },
  amountShares: {
    title: "金额/份额",
    sortProp: "amountShares",
    minWidth: 100,
    align: "right",
  },
  dailyChange: {
    title: "当日涨幅",
    sortProp: "dailyChange",
    minWidth: 95,
    align: "right",
  },
  dailyGain: {
    title: "当日收益",
    sortProp: "dailyGain",
    minWidth: 100,
    align: "right",
  },
  sector: { title: "关联板块", minWidth: 104, align: "center" },
  cost: {
    title: "成本/最新",
    sortProp: "cost",
    minWidth: 100,
    align: "center",
  },
};

const router = useRouter();
const fundStore = useFundStore();
const groupStore = useGroupStore();
const settingStore = useSettingStore();
const isDarkMode = computed(() => settingStore.theme === "dark");

const loading = ref(false);
const refreshing = ref(false);
const submitting = ref(false);
const searchQuery = ref("");
const selectedGroupKey = ref<"all" | string>("all");

const showAddFundDialog = ref(false);
const showEditFundDialog = ref(false);
const showAddGroupDialog = ref(false);
const showEditGroupDialog = ref(false);
const showGroupManageDialog = ref(false);
const showColumnSettings = ref(false);
const groupTooltipVisible = ref(false);
const groupTooltipStats = ref<GroupStats>({
  groupName: "",
  fundCount: 0,
  estimatedGain: 0,
  estimatedChangePercent: 0,
  estimatedUpCount: 0,
  estimatedDownCount: 0,
  estimatedDate: "",
  dailyGain: 0,
  dailyChangePercent: 0,
  dailyUpCount: 0,
  dailyDownCount: 0,
  dailyDate: "",
  holdingGain: 0,
  holdingGainRate: 0,
  holdingProfitCount: 0,
  holdingLossCount: 0,
  holdingDate: "",
  totalAsset: 0,
  totalCost: 0,
});

const fundForm = ref({ code: "", num: 0, cost: 0, groupKey: "" });
const editFundForm = ref({ code: "", name: "", num: 0, cost: 0, groupKey: "" });
const groupForm = ref({ name: "" });
const editGroupForm = ref({ key: "", name: "" });

const fundFormRef = ref<FormInstance>();
const editFundFormRef = ref<FormInstance>();
const groupFormRef = ref<FormInstance>();
const editGroupFormRef = ref<FormInstance>();

const fundSearchResults = ref<{ code: string; name: string }[]>([]);
const fundPickName = ref("");

const tooltipVisible = ref(false);
const tooltipRow = ref<FundRowDisplay | null>(null);

// PC 端 hover tooltip 状态
const hasFinePointer = useMediaQuery("(pointer: fine)");
const fundHoverVisible = ref(false);
const fundHoverRow = ref<FundRowDisplay | null>(null);
const fundHoverX = ref(0);
const fundHoverY = ref(0);
let fundHoverTimer: ReturnType<typeof setTimeout> | null = null;
let fundHoverHideTimer: ReturnType<typeof setTimeout> | null = null;
const HOVER_SHOW_DELAY = 350;
const HOVER_HIDE_DELAY = 200;

const groupHoverVisible = ref(false);
const groupHoverStats = ref<GroupStats>({
  groupName: "",
  fundCount: 0,
  estimatedGain: 0,
  estimatedChangePercent: 0,
  estimatedUpCount: 0,
  estimatedDownCount: 0,
  estimatedDate: "",
  dailyGain: 0,
  dailyChangePercent: 0,
  dailyUpCount: 0,
  dailyDownCount: 0,
  dailyDate: "",
  holdingGain: 0,
  holdingGainRate: 0,
  holdingProfitCount: 0,
  holdingLossCount: 0,
  holdingDate: "",
  totalAsset: 0,
  totalCost: 0,
});
const groupHoverX = ref(0);
const groupHoverY = ref(0);
let groupHoverTimer: ReturnType<typeof setTimeout> | null = null;
let groupHoverHideTimer: ReturnType<typeof setTimeout> | null = null;

// 分组 tag 容器 ref，用于滚动到对应 tag
const groupTagsContainerRef = ref<HTMLElement | null>(null);

// Position adjustment dialog
const showPositionDialog = ref(false);
const positionRow = ref<FundRowDisplay | null>(null);
const positionIsAdd = ref(true);
const positionAmount = ref(0);
const positionShares = ref(0);
const navHistoryLoading = ref(false);
const navHistoryList = ref<
  { date: string; netValue: number; changePercent: number }[]
>([]);
const selectedNavDate = ref("");
const selectedNavValue = ref(0);

let groupPressTimer: ReturnType<typeof setTimeout> | null = null;
const LONG_PRESS_MS = 520;

const fundFormRules: FormRules = {
  code: [
    { required: true, message: "请选择或输入6位基金代码", trigger: "blur" },
    {
      validator: (_rule, value, callback) => {
        if (!validateFundCode(String(value).trim())) {
          callback(new Error("基金代码必须是6位数字"));
        } else callback();
      },
      trigger: "blur",
    },
  ],
  num: [
    { required: true, message: "请输入持有份额", trigger: "blur" },
    {
      type: "number",
      min: 0.01,
      message: "持有份额必须大于0",
      trigger: "blur",
    },
  ],
  cost: [
    { required: true, message: "请输入成本价", trigger: "blur" },
    {
      type: "number",
      min: 0.0001,
      message: "成本价必须大于0",
      trigger: "blur",
    },
  ],
};

const groupFormRules: FormRules = {
  name: [
    { required: true, message: "请输入分组名称", trigger: "blur" },
    {
      validator: (_rule, value, callback) => {
        if (!validateGroupName(value))
          callback(new Error("分组名称长度为1-50个字符"));
        else callback();
      },
      trigger: "blur",
    },
  ],
};

const totalAsset = computed(() => fundStore.getTotalAsset);
const totalHoldingGain = computed(() => fundStore.getTotalHoldingGain);
const totalDailyGain = computed(() => fundStore.getTotalDailyGain);
const groupList = computed(() => groupStore.getGroupList);

const holdingGainRate = computed(() => {
  const asset = totalAsset.value;
  const gain = totalHoldingGain.value;
  const costTotal = asset - gain;
  return costTotal === 0 ? 0 : (gain / costTotal) * 100;
});

const dailyGainRate = computed(() => {
  const asset = totalAsset.value;
  const daily = totalDailyGain.value;
  const prevAsset = asset - daily;
  return prevAsset === 0 ? 0 : (daily / prevAsset) * 100;
});

const marketOpen = computed(() => getChinaMarketStatus().isOpen);

const orderedVisibleColumns = computed(() => {
  const vis = new Set(settingStore.visibleColumns);
  const tail = settingStore.columnOrder.filter(
    (k) => k !== "name" && vis.has(k),
  );
  return ["name", ...tail];
});

const tableBodyColumns = computed(() =>
  orderedVisibleColumns.value
    .filter((k) => k !== "name")
    .map((key) => {
      const meta = TABLE_COL_META[key];
      if (!meta) return null;
      return { key, ...meta };
    })
    .filter((x): x is { key: string } & TableColMeta => x !== null),
);

const defaultTableSort = computed(() => ({
  prop: fundStore.sortConfig.field,
  order:
    fundStore.sortConfig.order === "asc"
      ? ("ascending" as const)
      : ("descending" as const),
}));

const enrichedRows = computed(() => {
  // Build a code -> groupName map from all groups
  const codeToGroupName = new Map<string, string>();
  for (const group of groupStore.getGroupList) {
    for (const code of group.fundCodes) {
      codeToGroupName.set(code, group.name);
    }
  }

  return fundService.buildRowsForHome().map((row) => ({
    ...row,
    groupName: codeToGroupName.get(row.code) || undefined,
  }));
});

const filteredRows = computed(() => {
  let rows = enrichedRows.value;
  if (selectedGroupKey.value !== "all") {
    // Filter by group's fundCodes array and preserve group order
    const group = groupStore.getGroup(selectedGroupKey.value);
    if (group) {
      const rowByCode = new Map(rows.map((r) => [r.code, r]));
      // Return rows in the order defined by group.fundCodes
      rows = group.fundCodes
        .map((code) => rowByCode.get(code))
        .filter((r): r is NonNullable<typeof r> => r != null);
    } else {
      rows = [];
    }
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    rows = rows.filter(
      (r) => r.code.includes(q) || r.name.toLowerCase().includes(q),
    );
  }
  return rows;
});

const sortedRows = computed(() => {
  const isDefaultSort =
    fundStore.sortConfig.field === "holdingGainRate" &&
    fundStore.sortConfig.order === "desc";

  // When a specific group is selected and sort is default, preserve group.fundCodes order
  if (
    selectedGroupKey.value !== "all" &&
    isDefaultSort &&
    !searchQuery.value.trim()
  ) {
    return filteredRows.value;
  }

  return fundService.sortFundRows(
    filteredRows.value,
    fundStore.sortConfig.field,
    fundStore.sortConfig.order,
  );
});

const showGroupTag = computed(() => selectedGroupKey.value === "all");

function headerSubLabel(col: string): string {
  const sample = sortedRows.value[0];
  if (!sample) return "—";
  switch (col) {
    case "estimatedChange":
    case "estimatedGain":
      return sample.estimatedDateLabel;
    case "dailyChange":
    case "dailyGain":
    case "holdingGain":
    case "holdingGainRate":
    case "amountShares":
    case "cost":
      return sample.navDateLabel;
    case "sector":
      return "";
    default:
      return "—";
  }
}

function handleTableSort(payload: {
  prop: string | null;
  order: string | null;
}) {
  const { prop, order } = payload;
  if (!prop || order === null) {
    // 恢复默认排序，持久化为 'default' 而不是具体字段
    fundStore.resetSortConfig();
    return;
  }
  fundStore.setSortConfig(prop, order === "ascending" ? "asc" : "desc");
}

function formatAsset(value: number) {
  return formatPrivacy(formatCurrency(value), settingStore.privacyMode);
}

function formatValue(value: number | undefined) {
  if (value === undefined) return "-";
  return formatPrivacy(formatCurrency(value), settingStore.privacyMode);
}

function formatPercent(value: number | undefined) {
  if (value === undefined) return "-";
  const formatted = `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
  return formatPrivacy(formatted, settingStore.privacyMode);
}

function formatShares(n: number) {
  return formatPrivacy(formatNumber(n, 2), settingStore.privacyMode);
}

function getValueClass(value: number | undefined) {
  if (value === undefined || settingStore.grayscaleMode) return "";
  return value > 0 ? "positive" : value < 0 ? "negative" : "";
}

function pctClass(v: number) {
  if (settingStore.grayscaleMode) return "";
  if (v > 0) return "positive";
  if (v < 0) return "negative";
  return "muted";
}

function moneyClass(v: number) {
  return pctClass(v);
}

function estGainClass(row: FundRowDisplay, v: number) {
  if (!row.shouldShowEstimated || settingStore.grayscaleMode) return "muted";
  return pctClass(v);
}

function fmtVal(v: number, show: boolean) {
  if (!show) return "—";
  return formatValue(v);
}

function fmtPctRow(v: number, show: boolean) {
  if (!show) return "—";
  return formatPercent(v);
}

const isColumnVisible = (column: string) =>
  column === "name" || settingStore.visibleColumns.includes(column);

function togglePrivacy() {
  settingStore.setPrivacyMode(!settingStore.privacyMode);
}

function toggleGrayscale() {
  settingStore.setGrayscaleMode(!settingStore.grayscaleMode);
  document.documentElement.dataset.grayscale = String(
    settingStore.grayscaleMode,
  );
}

function computeMaxRadius(x: number, y: number): number {
  const maxX = Math.max(x, window.innerWidth - x);
  const maxY = Math.max(y, window.innerHeight - y);
  return Math.hypot(maxX, maxY);
}

async function toggleDarkMode(event: MouseEvent) {
  const isSupported =
    (document.startViewTransition as any) &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!isSupported) {
    const newTheme = settingStore.theme === 'light' ? 'dark' : 'light';
    settingStore.setTheme(newTheme);
    return;
  }

  const x = event.clientX;
  const y = event.clientY;
  const endRadius = computeMaxRadius(x, y);

  const transition = (document.startViewTransition as any)(
    async () => {
      const newTheme = settingStore.theme === 'light' ? 'dark' : 'light';
      settingStore.setTheme(newTheme);
      await nextTick();
    }
  );

  transition.ready.then(() => {
    const isDark = settingStore.theme === 'dark';
    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${endRadius}px at ${x}px ${y}px)`,
    ];

    (document.documentElement as any).animate(
      {
        clipPath: isDark ? [...clipPath].reverse() : clipPath,
      },
      {
        duration: 450,
        easing: 'ease-in',
        pseudoElement: isDark
          ? '::view-transition-old(root)'
          : '::view-transition-new(root)',
      } as any
    );
  });
}

function selectGroup(key: string) {
  // 再次点击已选中的分组 → 回到全部
  const newKey = selectedGroupKey.value === key && key !== "all" ? "all" : key;
  selectedGroupKey.value = newKey;
  fundStore.setSelectedGroupKey(newKey);
  // 滚动 group-tags-container 到对应 tag
  nextTick(() => {
    scrollGroupTagIntoView(newKey);
    if (canDragFundRows.value) initFundTableSortable();
  });
}

// 滚动分组 tag 容器，让目标 tag 可见
function scrollGroupTagIntoView(key: string) {
  const container = groupTagsContainerRef.value;
  if (!container) return;
  if (key === "all") {
    container.scrollTo({ left: 0, behavior: "smooth" });
    return;
  }
  const tagEl = container.querySelector(
    `[data-group-key="${key}"]`,
  ) as HTMLElement | null;
  if (!tagEl) return;
  // 计算 tag 相对于容器的偏移，居中显示
  const containerRect = container.getBoundingClientRect();
  const tagRect = tagEl.getBoundingClientRect();
  const offset =
    tagRect.left -
    containerRect.left +
    container.scrollLeft -
    (containerRect.width - tagRect.width) / 2;
  container.scrollTo({ left: offset, behavior: "smooth" });
}

// group-label 点击：跳转到对应分组筛选
function jumpToGroup(row: { groupName?: string }) {
  const group = groupList.value.find((g) => g.name === row.groupName);
  if (!group) return;
  selectGroup(group.key);
}

function handleSearch() {
  fundStore.setSearchQuery(searchQuery.value);
}

// Show quick-add button when: search is pure 6-digit number, no results, fund not already added
const showQuickAddBtn = computed(() => {
  const q = searchQuery.value.trim();
  if (!/^\d{6}$/.test(q)) return false;
  if (sortedRows.value.length > 0) return false;
  // Don't show if fund already exists
  if (fundStore.funds.some((f) => f.code === q)) return false;
  return true;
});

function handleQuickAdd() {
  const code = searchQuery.value.trim();
  if (!/^\d{6}$/.test(code)) return;
  // Pre-fill the add fund dialog with this code and immediately search
  fundForm.value = { code, num: 0, cost: 0, groupKey: "" };
  fundPickName.value = "";
  fundSearchResults.value = [];
  showAddFundDialog.value = true;
  // Immediately trigger search so dropdown shows results right away
  searchFund(code)
    .then((results) => {
      fundSearchResults.value = results;
      // If only one result, auto-select it
      if (results.length === 1) {
        pickSearchFund(results[0]!);
      }
    })
    .catch(() => {});
}

async function handleRefresh() {
  refreshing.value = true;
  try {
    await fundService.refreshAllFunds();
    ElMessage.success("刷新成功");
  } catch (error: any) {
    ElMessage.error("刷新失败: " + error.message);
  } finally {
    refreshing.value = false;
  }
}

function editFund(fund: FundView) {
  editFundForm.value = {
    code: fund.code,
    name: fund.name || "",
    num: fund.num,
    cost: fund.cost,
    groupKey: fund.groupKey || "",
  };
  showEditFundDialog.value = true;
}

function editFundByRow(row: FundRowDisplay) {
  editFund({ ...row.fund, name: row.name } as FundView);
}

async function confirmDeleteFund(fund: FundView) {
  try {
    await ElMessageBox.confirm(
      `确定要删除基金 ${fund.name || fund.code} 吗？`,
      "确认删除",
      {
        type: "warning",
      },
    );
    await fundService.deleteFund(fund.code);
    ElMessage.success("删除成功");
    tooltipVisible.value = false;
  } catch (error: any) {
    if (error !== "cancel") ElMessage.error("删除失败: " + error.message);
  }
}

function confirmDeleteByRow(row: FundRowDisplay) {
  confirmDeleteFund({ ...row.fund, name: row.name } as FundView);
}

function openTooltip(row: FundRowDisplay) {
  // 关闭 hover tooltip
  closeFundHover();
  tooltipRow.value = row;
  tooltipVisible.value = true;
}

// ===== PC 端 hover tooltip 逻辑 =====
function onFundMouseEnter(row: FundRowDisplay, e: MouseEvent) {
  if (!hasFinePointer.value) return;
  // 清除隐藏定时器
  if (fundHoverHideTimer) {
    clearTimeout(fundHoverHideTimer);
    fundHoverHideTimer = null;
  }
  // 延迟显示
  fundHoverTimer = setTimeout(() => {
    fundHoverRow.value = row;
    // 基于基金名称元素位置，显示在名称右上角
    const fundNameEl = (e.target as HTMLElement).querySelector('.fund-name') || (e.target as HTMLElement).closest('.fund-name-cell')?.querySelector('.fund-name');
    if (fundNameEl) {
      const rect = fundNameEl.getBoundingClientRect();
      fundHoverX.value = rect.right + 8; // 名称右侧，留小边距
      fundHoverY.value = rect.top; // 对齐名称顶部
    } else {
      // 备用方案：使用鼠标位置
      fundHoverX.value = e.clientX;
      fundHoverY.value = e.clientY;
    }
    fundHoverVisible.value = true;
  }, HOVER_SHOW_DELAY);
}

function onFundMouseLeave() {
  if (!hasFinePointer.value) return;
  if (fundHoverTimer) {
    clearTimeout(fundHoverTimer);
    fundHoverTimer = null;
  }
  // 延迟隐藏，允许鼠标移入 tooltip
  fundHoverHideTimer = setTimeout(() => {
    fundHoverVisible.value = false;
  }, HOVER_HIDE_DELAY);
}

function onFundTooltipMouseEnter() {
  // 鼠标移入 tooltip 面板，取消隐藏
  if (fundHoverHideTimer) {
    clearTimeout(fundHoverHideTimer);
    fundHoverHideTimer = null;
  }
}

function onFundTooltipMouseLeave() {
  // 鼠标离开 tooltip 面板，延迟隐藏
  fundHoverHideTimer = setTimeout(() => {
    fundHoverVisible.value = false;
  }, HOVER_HIDE_DELAY);
}

function onGroupMouseEnter(group: Group, e: MouseEvent) {
  if (!hasFinePointer.value) return;
  if (groupHoverHideTimer) {
    clearTimeout(groupHoverHideTimer);
    groupHoverHideTimer = null;
  }
  groupHoverTimer = setTimeout(() => {
    // 计算分组统计数据（复用 showGroupStats 的逻辑）
    const codesInGroup = new Set(group.fundCodes);
    const rows = enrichedRows.value.filter((r) => codesInGroup.has(r.code));
    let estimatedGain = 0,
      dailyGain = 0,
      holdingGain = 0;
    let totalAsset = 0,
      totalCost = 0;
    let estUp = 0,
      estDown = 0,
      dailyUp = 0,
      dailyDown = 0;
    let holdProfit = 0,
      holdLoss = 0;

    for (const row of rows) {
      estimatedGain += row.estimatedGain;
      if (row.gszzl > 0) estUp++;
      else if (row.gszzl < 0) estDown++;
      dailyGain += row.dailyGain;
      if (row.navChgRt > 0) dailyUp++;
      else if (row.navChgRt < 0) dailyDown++;
      holdingGain += row.holdingGain;
      if (row.holdingGain > 0) holdProfit++;
      else if (row.holdingGain < 0) holdLoss++;
      totalAsset += row.holdingAmount;
      totalCost += row.costAmount;
    }

    const sample = rows[0];
    const estimatedDate = sample?.estimatedDateLabel || "";
    const dailyDate = sample?.navDateLabel || "";

    groupHoverStats.value = {
      groupName: group.name,
      fundCount: rows.length,
      estimatedGain,
      estimatedChangePercent:
        totalAsset > 0 ? (estimatedGain / totalAsset) * 100 : 0,
      estimatedUpCount: estUp,
      estimatedDownCount: estDown,
      estimatedDate,
      dailyGain,
      dailyChangePercent: totalAsset > 0 ? (dailyGain / totalAsset) * 100 : 0,
      dailyUpCount: dailyUp,
      dailyDownCount: dailyDown,
      dailyDate,
      holdingGain,
      holdingGainRate: totalCost > 0 ? (holdingGain / totalCost) * 100 : 0,
      holdingProfitCount: holdProfit,
      holdingLossCount: holdLoss,
      holdingDate: dailyDate,
      totalAsset,
      totalCost,
    };
    // 基于分组元素位置，智能显示在左下角或右下角
    const groupTagEl = (e.target as HTMLElement).closest('.group-tag-item');
    if (groupTagEl) {
      const rect = groupTagEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      // 判断分组item是否在右侧（中心点在视口右半部分）
      const isRightSide = rect.left + rect.width / 2 > viewportWidth / 2;
      
      if (isRightSide) {
        // 右侧item：显示在right bottom
        groupHoverX.value = rect.right;
        groupHoverY.value = rect.bottom + 8;
      } else {
        // 左侧item：显示在left bottom
        groupHoverX.value = rect.left;
        groupHoverY.value = rect.bottom + 8;
      }
    } else {
      // 备用方案：使用鼠标位置
      groupHoverX.value = e.clientX;
      groupHoverY.value = e.clientY;
    }
    groupHoverVisible.value = true;
  }, HOVER_SHOW_DELAY);
}

function onGroupMouseLeave() {
  if (!hasFinePointer.value) return;
  if (groupHoverTimer) {
    clearTimeout(groupHoverTimer);
    groupHoverTimer = null;
  }
  groupHoverHideTimer = setTimeout(() => {
    groupHoverVisible.value = false;
  }, HOVER_HIDE_DELAY);
}

function onGroupTooltipMouseEnter() {
  if (groupHoverHideTimer) {
    clearTimeout(groupHoverHideTimer);
    groupHoverHideTimer = null;
  }
}

function onGroupTooltipMouseLeave() {
  groupHoverHideTimer = setTimeout(() => {
    groupHoverVisible.value = false;
  }, HOVER_HIDE_DELAY);
}

// "全部"分组事件处理
let allGroupPressTimer: ReturnType<typeof setTimeout> | null = null;

function onAllGroupPointerDown(e: PointerEvent) {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  if (e.pointerType !== "mouse") {
    e.preventDefault();
  }
  onAllGroupPointerUp();
  allGroupPressTimer = setTimeout(() => {
    allGroupPressTimer = null;
    showAllGroupStats();
  }, LONG_PRESS_MS);
}

function onAllGroupPointerUp() {
  if (allGroupPressTimer) {
    clearTimeout(allGroupPressTimer);
    allGroupPressTimer = null;
  }
}

function onAllGroupMouseEnter(e: MouseEvent) {
  if (!hasFinePointer.value) return;
  if (groupHoverHideTimer) {
    clearTimeout(groupHoverHideTimer);
    groupHoverHideTimer = null;
  }
  groupHoverTimer = setTimeout(() => {
    // 计算所有基金的统计
    let estimatedGain = 0,
      dailyGain = 0,
      holdingGain = 0;
    let totalAsset = 0,
      totalCost = 0;
    let estUp = 0,
      estDown = 0,
      dailyUp = 0,
      dailyDown = 0;
    let holdProfit = 0,
      holdLoss = 0;

    for (const row of enrichedRows.value) {
      estimatedGain += row.estimatedGain;
      if (row.gszzl > 0) estUp++;
      else if (row.gszzl < 0) estDown++;
      dailyGain += row.dailyGain;
      if (row.navChgRt > 0) dailyUp++;
      else if (row.navChgRt < 0) dailyDown++;
      holdingGain += row.holdingGain;
      if (row.holdingGain > 0) holdProfit++;
      else if (row.holdingGain < 0) holdLoss++;
      totalAsset += row.holdingAmount;
      totalCost += row.costAmount;
    }

    const sample = enrichedRows.value[0];
    const estimatedDate = sample?.estimatedDateLabel || "";
    const dailyDate = sample?.navDateLabel || "";

    groupHoverStats.value = {
      groupName: "全部基金",
      fundCount: enrichedRows.value.length,
      estimatedGain,
      estimatedChangePercent:
        totalAsset > 0 ? (estimatedGain / totalAsset) * 100 : 0,
      estimatedUpCount: estUp,
      estimatedDownCount: estDown,
      estimatedDate,
      dailyGain,
      dailyChangePercent: totalAsset > 0 ? (dailyGain / totalAsset) * 100 : 0,
      dailyUpCount: dailyUp,
      dailyDownCount: dailyDown,
      dailyDate,
      holdingGain,
      holdingGainRate: totalCost > 0 ? (holdingGain / totalCost) * 100 : 0,
      holdingProfitCount: holdProfit,
      holdingLossCount: holdLoss,
      holdingDate: dailyDate,
      totalAsset,
      totalCost,
    };
    
    // "全部"项在左侧，显示在right bottom
    const allGroupEl = (e.target as HTMLElement);
    const rect = allGroupEl.getBoundingClientRect();
    groupHoverX.value = rect.right;
    groupHoverY.value = rect.bottom + 8;
    
    groupHoverVisible.value = true;
  }, HOVER_SHOW_DELAY);
}

function showAllGroupStats() {
  // 计算所有基金的统计
  let estimatedGain = 0,
    dailyGain = 0,
    holdingGain = 0;
  let totalAsset = 0,
    totalCost = 0;
  let estUp = 0,
    estDown = 0,
    dailyUp = 0,
    dailyDown = 0;
  let holdProfit = 0,
    holdLoss = 0;

  for (const row of enrichedRows.value) {
    estimatedGain += row.estimatedGain;
    if (row.gszzl > 0) estUp++;
    else if (row.gszzl < 0) estDown++;
    dailyGain += row.dailyGain;
    if (row.navChgRt > 0) dailyUp++;
    else if (row.navChgRt < 0) dailyDown++;
    holdingGain += row.holdingGain;
    if (row.holdingGain > 0) holdProfit++;
    else if (row.holdingGain < 0) holdLoss++;
    totalAsset += row.holdingAmount;
    totalCost += row.costAmount;
  }

  const sample = enrichedRows.value[0];
  const estimatedDate = sample?.estimatedDateLabel || "";
  const dailyDate = sample?.navDateLabel || "";

  groupTooltipStats.value = {
    groupName: "全部基金",
    fundCount: enrichedRows.value.length,
    estimatedGain,
    estimatedChangePercent:
      totalAsset > 0 ? (estimatedGain / totalAsset) * 100 : 0,
    estimatedUpCount: estUp,
    estimatedDownCount: estDown,
    estimatedDate,
    dailyGain,
    dailyChangePercent: totalAsset > 0 ? (dailyGain / totalAsset) * 100 : 0,
    dailyUpCount: dailyUp,
    dailyDownCount: dailyDown,
    dailyDate,
    holdingGain,
    holdingGainRate: totalCost > 0 ? (holdingGain / totalCost) * 100 : 0,
    holdingProfitCount: holdProfit,
    holdingLossCount: holdLoss,
    holdingDate: dailyDate,
    totalAsset,
    totalCost,
  };

  groupTooltipVisible.value = true;
}

// FundHoverTooltip 操作事件处理
function onHoverTooltipDetail() {
  if (!fundHoverRow.value) return;
  closeFundHover();
  openTooltip(fundHoverRow.value);
}

function onHoverTooltipAdjust(isAdd: boolean) {
  if (!fundHoverRow.value) return;
  closeFundHover();
  const row = fundHoverRow.value;
  positionRow.value = row;
  positionIsAdd.value = isAdd;
  positionAmount.value = 0;
  positionShares.value = 0;
  selectedNavDate.value = "";
  selectedNavValue.value = 0;
  showPositionDialog.value = true;
  loadNavHistory(row.code);
}

function onHoverTooltipEdit() {
  if (!fundHoverRow.value) return;
  closeFundHover();
  openTooltip(fundHoverRow.value);
}

function onHoverTooltipSetGroup() {
  if (!fundHoverRow.value) return;
  closeFundHover();
  openTooltip(fundHoverRow.value);
}

function onHoverTooltipDelete() {
  if (!fundHoverRow.value) return;
  closeFundHover();
  confirmDeleteByRow(fundHoverRow.value);
}

function closeFundHover() {
  if (fundHoverTimer) {
    clearTimeout(fundHoverTimer);
    fundHoverTimer = null;
  }
  if (fundHoverHideTimer) {
    clearTimeout(fundHoverHideTimer);
    fundHoverHideTimer = null;
  }
  fundHoverVisible.value = false;
}

function closeGroupHover() {
  if (groupHoverTimer) {
    clearTimeout(groupHoverTimer);
    groupHoverTimer = null;
  }
  if (groupHoverHideTimer) {
    clearTimeout(groupHoverHideTimer);
    groupHoverHideTimer = null;
  }
  groupHoverVisible.value = false;
}

// 移动端 fixed 列 clone DOM 不触发 Vue @click，在 wrapper 上监听 touchend
// el-table 会给每个 tr 加 data-row-key 属性（对应 row-key="code"）
function onTableTouchEnd(e: TouchEvent) {
  const target = e.target as HTMLElement | null;
  if (!target) return;
  // 向上找到 tr
  let el: HTMLElement | null = target;
  while (el && el.tagName !== "TR") {
    el = el.parentElement;
  }
  if (!el || el.closest("thead")) return;
  // 用 data-row-key 找对应数据行（el-table 自动加的属性）
  const rowKey = el.dataset["rowKey"] ?? el.getAttribute("data-row-key");
  if (!rowKey) return;
  const row = sortedRows.value.find((r) => r.code === rowKey);
  if (row) openTooltip(row);
}

function onTooltipDetail() {
  if (!tooltipRow.value) return;
  tooltipVisible.value = false;
  router.push(`/fund/${tooltipRow.value.code}`);
}

async function onTooltipAdjust(isAdd: boolean) {
  const row = tooltipRow.value;
  if (!row) return;
  tooltipVisible.value = false;
  positionRow.value = row;
  positionIsAdd.value = isAdd;
  positionAmount.value = 0;
  positionShares.value = 0;
  selectedNavDate.value = "";
  selectedNavValue.value = 0;
  showPositionDialog.value = true;
  loadNavHistory(row.code);
}

async function loadNavHistory(code: string) {
  navHistoryLoading.value = true;
  navHistoryList.value = [];
  try {
    const records = await fetchNetValueHistory(code, "1m");
    // Take last 15 records
    navHistoryList.value = records.slice(-15).reverse();
    // Auto-select the first (most recent)
    if (navHistoryList.value.length > 0) {
      selectNavItem(navHistoryList.value[0]!);
    }
  } catch {
    navHistoryList.value = [];
  } finally {
    navHistoryLoading.value = false;
  }
}

function selectNavItem(item: {
  date: string;
  netValue: number;
  changePercent: number;
}) {
  selectedNavDate.value = item.date;
  selectedNavValue.value = item.netValue;
}

const calcNewCost = computed(() => {
  const row = positionRow.value;
  if (
    !row ||
    !positionIsAdd.value ||
    positionAmount.value <= 0 ||
    selectedNavValue.value <= 0
  )
    return 0;
  const oldNum = row.fund.num;
  const oldCost = row.fund.cost;
  const addNum = positionAmount.value / selectedNavValue.value;
  const totalCost = oldCost * oldNum + selectedNavValue.value * addNum;
  const newNum = oldNum + addNum;
  return newNum > 0 ? totalCost / newNum : 0;
});

const canConfirmPosition = computed(() => {
  if (!positionRow.value) return false;
  if (positionIsAdd.value) {
    return positionAmount.value > 0 && selectedNavValue.value > 0;
  } else {
    return (
      positionShares.value > 0 &&
      positionShares.value <= positionRow.value.fund.num
    );
  }
});

async function handlePositionConfirm() {
  const row = positionRow.value;
  if (!row) return;
  submitting.value = true;
  try {
    if (positionIsAdd.value) {
      // 加仓：计算新份额和加权平均成本
      const addNum = positionAmount.value / selectedNavValue.value;
      const oldNum = row.fund.num;
      const oldCost = row.fund.cost;
      const totalCost = oldCost * oldNum + selectedNavValue.value * addNum;
      const newNum = oldNum + addNum;
      const newCost = newNum > 0 ? totalCost / newNum : 0;
      await fundService.updateFund(
        row.code,
        newNum,
        newCost,
        row.fund.groupKey,
      );
      ElMessage.success(
        `加仓成功！份额: ${newNum.toFixed(2)}，成本: ${newCost.toFixed(4)}`,
      );
    } else {
      // 减仓
      const newNum = row.fund.num - positionShares.value;
      if (newNum <= 0) {
        ElMessage.warning("减仓后份额必须大于0");
        return;
      }
      await fundService.updateFund(
        row.code,
        newNum,
        row.fund.cost,
        row.fund.groupKey,
      );
      ElMessage.success(`减仓成功！剩余份额: ${newNum.toFixed(2)}`);
    }
    await fundService.refreshAllFunds();
    showPositionDialog.value = false;
  } catch (e: any) {
    ElMessage.error(e?.message || "操作失败");
  } finally {
    submitting.value = false;
  }
}

function onTooltipEdit() {
  if (!tooltipRow.value) return;
  editFundByRow(tooltipRow.value);
  tooltipVisible.value = false;
}

async function onTooltipSetGroup() {
  tooltipVisible.value = false;
  showGroupManageDialog.value = true;
}

function onTooltipDelete() {
  if (!tooltipRow.value) return;
  confirmDeleteByRow(tooltipRow.value);
}

const debouncedSearchSuggest = useDebounceFn(async (q: string) => {
  if (!q.trim()) {
    fundSearchResults.value = [];
    return;
  }
  fundSearchResults.value = await searchFund(q.trim());
}, 300);

function onFundSearchInput() {
  fundPickName.value = "";
  debouncedSearchSuggest(fundForm.value.code);
}

function pickSearchFund(item: { code: string; name: string }) {
  fundForm.value.code = item.code;
  fundPickName.value = `${item.code} ${item.name}`;
  fundSearchResults.value = [];
}

async function handleAddFund() {
  if (!fundFormRef.value) return;
  fundForm.value.code = String(fundForm.value.code).trim();
  await fundFormRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      await fundService.addFund(
        fundForm.value.code,
        fundForm.value.num,
        fundForm.value.cost,
        fundForm.value.groupKey || undefined,
      );
      ElMessage.success("添加成功");
      showAddFundDialog.value = false;
      fundForm.value = { code: "", num: 0, cost: 0, groupKey: "" };
      fundPickName.value = "";
      fundSearchResults.value = [];
      fundFormRef.value?.resetFields();
    } catch (error: any) {
      // 检查是否是重复基金错误
      if (error.message === "基金已存在") {
        try {
          await ElMessageBox.confirm(
            `基金 ${fundForm.value.code} 已在列表中，是否覆盖现有设置？`,
            "基金已存在",
            {
              confirmButtonText: "覆盖",
              cancelButtonText: "取消",
              type: "warning",
            },
          );
          // 用户确认覆盖，调用更新方法
          submitting.value = true;
          await fundService.updateFund(
            fundForm.value.code,
            fundForm.value.num,
            fundForm.value.cost,
            fundForm.value.groupKey || undefined,
          );
          ElMessage.success("更新成功");
          showAddFundDialog.value = false;
          fundForm.value = { code: "", num: 0, cost: 0, groupKey: "" };
          fundPickName.value = "";
          fundSearchResults.value = [];
          fundFormRef.value?.resetFields();
        } catch (e: any) {
          if (e !== "cancel") {
            ElMessage.error("更新失败: " + (e.message || ""));
          }
        } finally {
          submitting.value = false;
        }
      } else {
        ElMessage.error("添加失败: " + error.message);
      }
    } finally {
      if (!showAddFundDialog.value) {
        submitting.value = false;
      }
    }
  });
}

async function handleEditFund() {
  if (!editFundFormRef.value) return;
  await editFundFormRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      await fundService.updateFund(
        editFundForm.value.code,
        editFundForm.value.num,
        editFundForm.value.cost,
        editFundForm.value.groupKey || undefined,
      );
      ElMessage.success("保存成功");
      showEditFundDialog.value = false;
    } catch (error: any) {
      ElMessage.error("保存失败: " + error.message);
    } finally {
      submitting.value = false;
    }
  });
}

async function handleAddGroup() {
  if (!groupFormRef.value) return;
  await groupFormRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      await groupService.addGroup(groupForm.value.name);
      ElMessage.success("添加成功");
      showAddGroupDialog.value = false;
      groupForm.value = { name: "" };
      groupFormRef.value?.resetFields();
    } catch (error: any) {
      ElMessage.error("添加失败: " + error.message);
    } finally {
      submitting.value = false;
    }
  });
}

async function handleEditGroup() {
  if (!editGroupFormRef.value) return;
  await editGroupFormRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      await groupService.updateGroup(
        editGroupForm.value.key,
        editGroupForm.value.name,
      );
      ElMessage.success("保存成功");
      showEditGroupDialog.value = false;
    } catch (error: any) {
      ElMessage.error("保存失败: " + error.message);
    } finally {
      submitting.value = false;
    }
  });
}

async function confirmDeleteGroup() {
  try {
    await ElMessageBox.confirm(
      `确定要删除分组 ${editGroupForm.value.name} 吗？`,
      "确认删除",
      {
        type: "warning",
      },
    );
    await groupService.deleteGroup(editGroupForm.value.key);
    ElMessage.success("删除成功");
    showEditGroupDialog.value = false;
  } catch (error: any) {
    if (error !== "cancel") ElMessage.error("删除失败: " + error.message);
  }
}

function onGroupPointerDown(group: Group, e: PointerEvent) {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  // 阻止长按默认行为（防止右键菜单和文本选中）
  if (e.pointerType !== "mouse") {
    e.preventDefault();
  }
  onGroupPointerUp();
  groupPressTimer = setTimeout(() => {
    groupPressTimer = null;
    showGroupStats(group);
  }, LONG_PRESS_MS);
}

function onGroupPointerUp() {
  if (groupPressTimer) {
    clearTimeout(groupPressTimer);
    groupPressTimer = null;
  }
}

function showGroupStats(group: Group) {
  // 关闭 hover tooltip
  closeGroupHover();
  // Filter by group's fundCodes array (not fund.groupKey which is unreliable)
  const codesInGroup = new Set(group.fundCodes);
  const rows = enrichedRows.value.filter((r) => codesInGroup.has(r.code));
  let estimatedGain = 0,
    dailyGain = 0,
    holdingGain = 0;
  let totalAsset = 0,
    totalCost = 0;
  let estUp = 0,
    estDown = 0,
    dailyUp = 0,
    dailyDown = 0;
  let holdProfit = 0,
    holdLoss = 0;

  for (const row of rows) {
    estimatedGain += row.estimatedGain;
    if (row.gszzl > 0) estUp++;
    else if (row.gszzl < 0) estDown++;

    dailyGain += row.dailyGain;
    if (row.navChgRt > 0) dailyUp++;
    else if (row.navChgRt < 0) dailyDown++;

    holdingGain += row.holdingGain;
    if (row.holdingGain > 0) holdProfit++;
    else if (row.holdingGain < 0) holdLoss++;

    totalAsset += row.holdingAmount;
    totalCost += row.costAmount;
  }

  const sample = rows[0];
  const estimatedDate = sample?.estimatedDateLabel || "";
  const dailyDate = sample?.navDateLabel || "";

  groupTooltipStats.value = {
    groupName: group.name,
    fundCount: rows.length,
    estimatedGain,
    estimatedChangePercent:
      totalAsset > 0 ? (estimatedGain / totalAsset) * 100 : 0,
    estimatedUpCount: estUp,
    estimatedDownCount: estDown,
    estimatedDate,
    dailyGain,
    dailyChangePercent: totalAsset > 0 ? (dailyGain / totalAsset) * 100 : 0,
    dailyUpCount: dailyUp,
    dailyDownCount: dailyDown,
    dailyDate,
    holdingGain,
    holdingGainRate: totalCost > 0 ? (holdingGain / totalCost) * 100 : 0,
    holdingProfitCount: holdProfit,
    holdingLossCount: holdLoss,
    holdingDate: dailyDate,
    totalAsset,
    totalCost,
  };
  groupTooltipVisible.value = true;
}

function onGroupManageSaved() {
  // Refresh data after group management changes
  fundService.refreshAllFunds().catch(() => {});
}

// --- Sortable: fund table row drag-and-drop ---
// Enabled when: default sort + no search + (all group OR specific group selected)
const canDragFundRows = computed(
  () =>
    !searchQuery.value.trim() &&
    fundStore.sortConfig.field === "holdingGainRate" &&
    fundStore.sortConfig.order === "desc",
);

let fundTableSortable: Sortable | null = null;

watch(canDragFundRows, async (can) => {
  await nextTick();
  if (can) {
    initFundTableSortable();
  } else {
    destroyFundTableSortable();
  }
});

function initFundTableSortable() {
  destroyFundTableSortable();
  const tableEl = document.querySelector(
    ".fund-el-table .el-table__body tbody",
  );
  if (!tableEl) return;
  fundTableSortable = Sortable.create(tableEl as HTMLElement, {
    animation: 200,
    ghostClass: "sortable-ghost",
    handle: ".drag-icon",
    onEnd(evt) {
      const { oldIndex, newIndex } = evt;
      if (oldIndex == null || newIndex == null || oldIndex === newIndex) return;
      const codes = sortedRows.value.map((r) => r.code);
      const [moved] = codes.splice(oldIndex, 1);
      codes.splice(newIndex, 0, moved!);

      if (selectedGroupKey.value === "all") {
        // Reorder global fund list
        fundService.reorderFundsGlobally(codes);
      } else {
        // Reorder within the selected group's fundCodes array
        const group = groupStore.getGroup(selectedGroupKey.value);
        if (group) {
          // Rebuild the group's fundCodes in the new order
          // Only reorder codes that belong to this group
          const groupCodeSet = new Set(group.fundCodes);
          const newGroupOrder = codes.filter((c) => groupCodeSet.has(c));
          // Preserve any codes in the group that aren't in the current view
          const notInView = group.fundCodes.filter((c) => !codes.includes(c));
          group.fundCodes = [...newGroupOrder, ...notInView];
          group.updatedAt = Date.now();
          // Persist
          const { groups, groupOrder } = groupStore.exportGroupsToObject();
          storageService.saveGroups(groups, groupOrder);
        }
      }
    },
  });
}

function destroyFundTableSortable() {
  if (fundTableSortable) {
    fundTableSortable.destroy();
    fundTableSortable = null;
  }
}

onMounted(async () => {
  selectedGroupKey.value = fundStore.selectedGroupKey;
  await nextTick();
  if (canDragFundRows.value) {
    initFundTableSortable();
  }
});

onUnmounted(() => {
  onGroupPointerUp();
  destroyFundTableSortable();
});
</script>

<style scoped>
/* Override layout-content to not scroll — el-table manages its own scroll */
:deep(.layout-content) {
  overflow: hidden !important;
}

.account-summary {
  padding: 12px 16px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
}

.account-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item-main .stat-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  flex-wrap: wrap;
}

.stat-label .el-button {
  margin: 0;
}

.stat-label-spacer {
  flex: 1;
}

.stat-value-large {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  justify-content: center;
  align-items: center;
}

.stat-item-wrapper {
  display: flex;
  gap: 16px;
}

.stat-content {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.stat-content .stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-item-wrapper .stat-item {
  flex: 1;
  min-width: 80px;
}

.stat-item .stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-item .stat-value {
  font-size: 16px;
  font-weight: 600;
  margin-top: 2px;
}

.stat-item .stat-rate {
  font-size: 12px;
  margin-top: 2px;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 0px;
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
  transition:
    background 0.2s,
    color 0.2s;
  font-size: 14px;
}

.btn-icon:hover {
  background: var(--bg-secondary);
}

.btn-icon.active {
  color: var(--color-primary);
}

.group-tags-wrapper {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-card);
}

.group-tags-container {
  flex: 1;
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  padding: 6px 12px;
}

.group-tags-container::-webkit-scrollbar {
  display: none;
}

.group-tag-item {
  flex-shrink: 0;
  padding: 0px 10px;
  font-size: 12px;
  border-radius: 12px;
  cursor: pointer;
  color: var(--text-secondary);
  white-space: nowrap;
  transition: all 0.2s;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  touch-action: manipulation;
  background: var(--bg-secondary);
  -webkit-tap-highlight-color: transparent;
}

.group-tag-item:hover {
  color: var(--text-primary);
  background: var(--border-color);
}

.group-tag-item.active {
  background: var(--color-primary);
  color: #fff;
  font-weight: 500;
}

.group-tag-settings {
  flex-shrink: 0;
  width: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-left: 1px solid var(--border-color);
  background: var(--bg-card);
  cursor: pointer;
  font-size: 16px;
  color: var(--text-secondary);
  transition: background 0.2s;
}

.group-tag-settings:hover {
  background: var(--bg-secondary);
}

.fund-list-main {
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  height: 100%;
}

.fund-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--bg-card);
}

.fund-toolbar .search-box {
  flex: 1;
}

.market-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-dot.status-open {
  background: #22c55e;
  box-shadow: 0 0 4px #22c55e;
}

.status-dot.status-closed {
  background: #9ca3af;
}

.fund-name-cell {
  cursor: pointer;
}

.fund-name-cell:hover {
  color: var(--el-color-primary);
}

.fund-code {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.fund-name {
  font-size: 14px;
  font-weight: 500;
}

.positive {
  color: var(--color-up);
}

.negative {
  color: var(--color-down);
}

.fund-table-wrap {
  width: 100%;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.fund-el-table {
  width: 100%;
  font-size: 13px;
}

.fund-el-table :deep(.el-table__cell) {
  padding: 4px;
}

.col-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  line-height: 1.25;
}

.fund-el-table :deep(th.is-right .col-head) {
  align-items: flex-end;
  text-align: right;
}

.col-head-sub {
  font-size: 10px;
  font-weight: normal;
  color: var(--el-text-color-secondary);
}

.cell-stack {
  display: flex;
  flex-direction: column;
  gap: 3px;
  line-height: 1;
}

.cell-stack > div {
  white-space: nowrap;
}

.cell-stack > div:first-child {
  font-size: 14px;
}

.fund-name-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
  overflow: hidden;
  cursor: pointer;
  color: var(--text-primary);
}

.fund-name-row .fund-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fund-name-row:hover {
  color: var(--color-primary);
}

.fund-code-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin-top: 2px;
  height: 18px;
  line-height: 18px;
}

.drag-icon {
  cursor: grab;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  flex-shrink: 0;
  user-select: none;
  touch-action: none;
  padding: 0 2px;
}

.drag-icon:active {
  cursor: grabbing;
}

.group-label {
  font-size: 10px;
  padding: 0px 4px;
  background: var(--el-color-primary);
  color: #fff;
  border-radius: 3px;
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  transition: opacity 0.15s;
}

html.dark .group-label {
  background: var(--el-color-primary-light-8);
  color: var(--el-text-color-primary);
}

.group-label:hover {
  opacity: 0.75;
}

.real-value-icon {
  color: var(--color-primary);
  flex-shrink: 0;
  font-size: 11px;
}

.td-sub {
  font-size: 11px;
  font-weight: 100;
}

.td-sub.muted {
  color: var(--el-text-color-secondary);
}

.muted {
  color: var(--el-text-color-secondary);
}

.hint-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin: 0 0 12px;
  line-height: 1.5;
}

.fund-search-field {
  position: relative;
  width: 100%;
}

.fund-search-dropdown {
  position: absolute;
  z-index: 20;
  left: 0;
  right: 0;
  top: 100%;
  margin-top: 4px;
  max-height: 220px;
  overflow: auto;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  box-shadow: var(--el-box-shadow-light);
}

.fund-search-item {
  padding: 8px 10px;
  cursor: pointer;
  display: flex;
  gap: 10px;
  font-size: 13px;
}

.fund-search-item:hover {
  background: var(--el-fill-color-light);
}

.fund-search-item .code {
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .stat-value-large {
    font-size: 20px;
  }

  .fund-toolbar .search-box {
    flex: 1 1 100%;
  }

  .fund-el-table {
    font-size: 12px;
  }
}

/* Position dialog */
.position-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.position-fund-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
}

.position-fund-info .fund-name {
  font-weight: 600;
  font-size: 15px;
}

.position-fund-info .fund-code {
  color: var(--el-text-color-secondary);
}

.position-fund-info .fund-shares {
  color: var(--el-text-color-secondary);
  margin-left: auto;
}

.nav-history-section .section-label {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
}

.nav-loading,
.nav-empty {
  text-align: center;
  padding: 16px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.nav-list {
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  transition: background 0.15s;
}

.nav-item:last-child {
  border-bottom: none;
}

.nav-item:hover {
  background: var(--el-fill-color-light);
}

.nav-item.selected {
  background: var(--el-color-primary-light-9);
  border-left: 3px solid var(--el-color-primary);
}

.nav-date {
  flex-shrink: 0;
  font-weight: 500;
}

.nav-value {
  color: var(--el-text-color-secondary);
}

.nav-change {
  margin-left: auto;
  font-weight: 500;
}

.calc-preview {
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
}
</style>
