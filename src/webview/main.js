/**
 * 基金 Webview 前端脚本 - 表格布局
 */

(function () {
  const vscode = acquireVsCodeApi();

  // DOM 元素
  let elements = {};

  // 排序状态
  let sortState = {
    field: null,  // 当前排序字段
    order: 'asc'  // 排序顺序：asc 或 desc
  };

  // 原始数据缓存
  let fundDataCache = [];

  // 搜索关键词
  let searchKeyword = '';

  // 隐私模式
  let privacyMode = false;

  // 市场状态
  let marketStatus = {
    isOpen: false,
    isClosed: false
  };

  // 列设置
  let columnSettings = {
    columnOrder: [
      "name",
      "estimatedChange",
      "estimatedGain",
      "dailyChange",
      "dailyGain",
      "holdingGain",
      "holdingGainRate",
      "sector",
      "amountShares",
      "cost"
    ],
    visibleColumns: [
      "name",
      "estimatedChange",
      "estimatedGain",
      "dailyChange",
      "dailyGain",
      "holdingGain",
      "holdingGainRate",
      "sector",
      "amountShares",
      "cost"
    ]
  };

  // 列定义
  const columnDefinitions = {
    name: { label: "基金名称", canHide: false },
    estimatedChange: { label: "估算涨幅", canHide: true },
    estimatedGain: { label: "估算收益", canHide: true },
    dailyChange: { label: "当日涨幅", canHide: true },
    dailyGain: { label: "当日收益", canHide: true },
    holdingGain: { label: "持有收益", canHide: true },
    holdingGainRate: { label: "总收益率", canHide: true },
    sector: { label: "关联板块", canHide: true },
    amountShares: { label: "金额/份额", canHide: true },
    cost: { label: "成本/最新", canHide: true }
  };

  /**
   * 显示自定义确认对话框
   */
  function showConfirmDialog(message, onConfirm) {
    // 移除已存在的确认对话框
    const existingDialog = document.querySelector('.confirm-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }

    // 创建确认对话框
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.innerHTML = `
      <div class="confirm-overlay"></div>
      <div class="confirm-content">
        <div class="confirm-message">${message}</div>
        <div class="confirm-buttons">
          <button class="confirm-btn confirm-btn-cancel">取消</button>
          <button class="confirm-btn confirm-btn-ok">确定</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // 绑定按钮事件
    const btnCancel = dialog.querySelector('.confirm-btn-cancel');
    const btnOk = dialog.querySelector('.confirm-btn-ok');
    const overlay = dialog.querySelector('.confirm-overlay');

    const closeDialog = () => {
      dialog.remove();
    };

    btnCancel?.addEventListener('click', closeDialog);
    overlay?.addEventListener('click', closeDialog);

    btnOk?.addEventListener('click', () => {
      closeDialog();
      if (onConfirm) {
        onConfirm();
      }
    });

    // 聚焦到确定按钮
    setTimeout(() => {
      btnOk?.focus();
    }, 100);
  }

  /**
   * 初始化
   */
  function init() {
    // 获取 DOM 元素
    elements = {
      searchInput: document.getElementById("searchInput"),
      btnClearSearch: document.getElementById("btnClearSearch"),
      btnTogglePrivacy: document.getElementById("btnTogglePrivacy"),
      totalAssets: document.getElementById("totalAssets"),
      holdingAmount: document.getElementById("holdingAmount"),
      holdingRate: document.getElementById("holdingRate"),
      dailyAmount: document.getElementById("dailyAmount"),
      dailyRate: document.getElementById("dailyRate"),
      fundListContent: document.getElementById("fundListContent"),
    };

    // 绑定事件
    bindEvents();

    console.log("Webview 初始化完成");
  }

  /**
   * 绑定事件
   */
  function bindEvents() {
    // 搜索输入
    elements.searchInput?.addEventListener("input", (e) => {
      searchKeyword = e.target.value.trim();
      updateFundList(fundDataCache);

      // 显示/隐藏清除按钮
      if (elements.btnClearSearch) {
        elements.btnClearSearch.style.display = searchKeyword ? 'flex' : 'none';
      }
    });

    // 清除搜索
    elements.btnClearSearch?.addEventListener("click", () => {
      searchKeyword = '';
      if (elements.searchInput) {
        elements.searchInput.value = '';
      }
      if (elements.btnClearSearch) {
        elements.btnClearSearch.style.display = 'none';
      }
      updateFundList(fundDataCache);
    });

    // 切换隐私模式
    elements.btnTogglePrivacy?.addEventListener("click", () => {
      privacyMode = !privacyMode;
      togglePrivacyMode();
    });

    // 打开行情中心
    const btnOpenMarket = document.getElementById("btnOpenMarket");
    btnOpenMarket?.addEventListener("click", () => {
      vscode.postMessage({ command: 'openMarket' });
    });

    // 打开列设置
    const btnSettings = document.getElementById("btnSettings");
    btnSettings?.addEventListener("click", () => {
      openColumnSettings();
    });

    // 关闭弹窗
    const btnCloseModal = document.getElementById("btnCloseModal");
    btnCloseModal?.addEventListener("click", () => {
      closeColumnSettings();
    });

    // 点击遮罩关闭
    const modalOverlay = document.querySelector(".modal-overlay");
    modalOverlay?.addEventListener("click", () => {
      closeColumnSettings();
    });

    // 保存列设置
    const btnSaveColumns = document.getElementById("btnSaveColumns");
    btnSaveColumns?.addEventListener("click", () => {
      saveColumnSettings();
    });

    // 恢复默认
    const btnResetColumns = document.getElementById("btnResetColumns");
    btnResetColumns?.addEventListener("click", () => {
      resetColumnSettings();
    });

    // 基金名称 hover 显示 tooltip
    document.addEventListener('mouseover', handleFundNameHover);
    document.addEventListener('mouseout', handleFundNameLeave);

    // 请求列设置
    vscode.postMessage({ command: 'getColumnSettings' });
  }

  /**
   * 更新市场状态
   */
  function updateMarketStatus(data) {
    if (!data) return;

    marketStatus = data;
    const statusEl = document.getElementById('marketStatus');
    if (!statusEl) return;

    const dot = statusEl.querySelector('.status-dot');
    const text = statusEl.querySelector('.status-text');

    if (data.isOpen) {
      // 开市
      if (dot) dot.className = 'status-dot status-open';
      if (text) text.textContent = '开市';
    } else if (data.isClosed) {
      // 休市
      if (dot) dot.className = 'status-dot status-closed';
      if (text) text.textContent = '休市';
    } else {
      // 非交易时间
      if (dot) dot.className = 'status-dot status-after-hours';
      if (text) text.textContent = '盘后';
    }
  }

  /**
   * 打开列设置弹窗
   */
  function openColumnSettings() {
    const modal = document.getElementById('columnSettingsModal');
    if (!modal) return;

    // 生成列顺序列表（包含复选框）
    const orderListContainer = document.getElementById('columnOrderList');
    if (orderListContainer) {
      orderListContainer.innerHTML = columnSettings.columnOrder.map((col, index) => {
        const def = columnDefinitions[col];
        if (!def) return '';
        const checked = columnSettings.visibleColumns.includes(col);
        const isName = col === 'name';
        const canMoveUp = !isName && index > 1; // 基金名称后面的才能上移
        const canMoveDown = !isName && index < columnSettings.columnOrder.length - 1;

        return `
          <div class="column-order-item ${isName ? 'fixed-column' : ''}" 
               data-column="${col}" 
               data-index="${index}"
               draggable="${!isName}">
            <span class="drag-handle" title="${isName ? '固定列，不可移动' : '拖动排序'}">☰</span>
            <label class="column-checkbox-inline">
              <input type="checkbox" 
                     value="${col}" 
                     ${checked ? 'checked' : ''} 
                     ${!def.canHide ? 'disabled' : ''}>
              <span class="column-label">${def.label}</span>
            </label>
            <div class="order-buttons">
              <button class="btn-order-up" data-index="${index}" ${!canMoveUp ? 'disabled' : ''} title="上移">↑</button>
              <button class="btn-order-down" data-index="${index}" ${!canMoveDown ? 'disabled' : ''} title="下移">↓</button>
            </div>
          </div>
        `;
      }).join('');

      // 绑定上下移动按钮
      orderListContainer.querySelectorAll('.btn-order-up').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.target.getAttribute('data-index'));
          // 基金名称固定在第一位，不能移动
          if (index > 1) {
            const temp = columnSettings.columnOrder[index];
            columnSettings.columnOrder[index] = columnSettings.columnOrder[index - 1];
            columnSettings.columnOrder[index - 1] = temp;
            openColumnSettings(); // 重新渲染
          }
        });
      });

      orderListContainer.querySelectorAll('.btn-order-down').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.target.getAttribute('data-index'));
          const col = columnSettings.columnOrder[index];
          // 基金名称固定在第一位，不能移动
          if (col !== 'name' && index < columnSettings.columnOrder.length - 1) {
            const temp = columnSettings.columnOrder[index];
            columnSettings.columnOrder[index] = columnSettings.columnOrder[index + 1];
            columnSettings.columnOrder[index + 1] = temp;
            openColumnSettings(); // 重新渲染
          }
        });
      });

      // 绑定拖拽事件
      setupDragAndDrop(orderListContainer);
    }

    modal.style.display = 'flex';
  }

  /**
   * 设置拖拽排序
   */
  function setupDragAndDrop(container) {
    let draggedItem = null;
    let draggedIndex = -1;
    let draggedColumn = null;

    const items = container.querySelectorAll('.column-order-item');

    items.forEach((item, index) => {
      // 基金名称不可拖拽
      if (item.classList.contains('fixed-column')) {
        return;
      }

      // 拖拽开始
      item.addEventListener('dragstart', (e) => {
        draggedItem = item;
        draggedIndex = parseInt(item.getAttribute('data-index'));
        draggedColumn = item.getAttribute('data-column');
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', item.innerHTML);
      });

      // 拖拽结束
      item.addEventListener('dragend', (e) => {
        item.classList.remove('dragging');
        // 移除所有 drag-over 类
        items.forEach(i => i.classList.remove('drag-over'));
        draggedItem = null;
        draggedIndex = -1;
        draggedColumn = null;
      });

      // 拖拽经过
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (draggedItem && item !== draggedItem) {
          // 不能拖到基金名称的位置
          if (item.classList.contains('fixed-column')) {
            return;
          }
          item.classList.add('drag-over');
        }
      });

      // 拖拽离开
      item.addEventListener('dragleave', (e) => {
        item.classList.remove('drag-over');
      });

      // 放置
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (draggedItem && item !== draggedItem && draggedColumn) {
          // 不能拖到基金名称的位置
          if (item.classList.contains('fixed-column')) {
            item.classList.remove('drag-over');
            return;
          }

          const targetIndex = parseInt(item.getAttribute('data-index'));

          // 不能拖到第0位（基金名称的位置）
          if (targetIndex === 0) {
            item.classList.remove('drag-over');
            return;
          }

          // 找到拖动列在数组中的当前位置
          const currentDraggedIndex = columnSettings.columnOrder.indexOf(draggedColumn);

          if (currentDraggedIndex === -1) {
            item.classList.remove('drag-over');
            return;
          }

          // 从原位置删除
          const [removed] = columnSettings.columnOrder.splice(currentDraggedIndex, 1);

          // 找到目标列在删除后数组中的位置
          const targetColumn = item.getAttribute('data-column');
          let newTargetIndex = columnSettings.columnOrder.indexOf(targetColumn);

          if (newTargetIndex === -1) {
            // 如果找不到目标列，恢复原状
            columnSettings.columnOrder.splice(currentDraggedIndex, 0, removed);
            item.classList.remove('drag-over');
            return;
          }

          // 如果是向下拖（原位置在目标位置前面），插入到目标位置后面
          // 如果是向上拖（原位置在目标位置后面），插入到目标位置前面
          if (currentDraggedIndex < targetIndex) {
            // 向下拖，插入到目标后面
            newTargetIndex = newTargetIndex + 1;
          }

          // 插入到新位置
          columnSettings.columnOrder.splice(newTargetIndex, 0, removed);

          // 重新渲染
          openColumnSettings();
        }

        item.classList.remove('drag-over');
      });
    });
  }

  /**
   * 关闭列设置弹窗
   */
  function closeColumnSettings() {
    const modal = document.getElementById('columnSettingsModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * 保存列设置
   */
  function saveColumnSettings() {
    // 获取选中的列（从列顺序列表中的复选框）
    const checkboxes = document.querySelectorAll('#columnOrderList input[type="checkbox"]');
    const visibleColumns = [];
    checkboxes.forEach(cb => {
      if (cb.checked) {
        visibleColumns.push(cb.value);
      }
    });

    // 确保至少有一列可见
    if (visibleColumns.length === 0) {
      alert('至少需要显示一列！');
      return;
    }

    // 更新设置
    columnSettings.visibleColumns = visibleColumns;

    // 发送到后端保存
    vscode.postMessage({
      command: 'saveColumnSettings',
      data: columnSettings
    });

    closeColumnSettings();
  }

  /**
   * 恢复默认列设置
   */
  function resetColumnSettings() {
    columnSettings = {
      columnOrder: [
        "name",
        "estimatedChange",
        "estimatedGain",
        "dailyChange",
        "dailyGain",
        "holdingGain",
        "holdingGainRate",
        "sector",
        "amountShares",
        "cost"
      ],
      visibleColumns: [
        "name",
        "estimatedChange",
        "estimatedGain",
        "dailyChange",
        "dailyGain",
        "holdingGain",
        "holdingGainRate",
        "sector",
        "amountShares",
        "cost"
      ]
    };
    openColumnSettings(); // 重新渲染
  }

  /**
   * 处理基金名称 hover 事件
   */
  function handleFundNameHover(e) {
    const fundName = e.target.closest('.fund-name[data-tooltip]');
    if (!fundName) return;

    // 移除已存在的 tooltip
    removeTooltip();

    const tooltipDataStr = fundName.getAttribute('data-tooltip');
    if (!tooltipDataStr) return;

    try {
      const data = JSON.parse(tooltipDataStr.replace(/&quot;/g, '"'));

      // 创建 tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'fund-tooltip';
      tooltip.innerHTML = `
        <div class="tooltip-header">
          <div class="tooltip-title">${data.name}</div>
          <div class="tooltip-actions">
            <button class="tooltip-copy-btn" title="复制详情">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 4l1-1h5.414L14 6.586V14l-1 1H5l-1-1V4zm9 3l-3-3H5v10h8V7z"/>
                <path d="M3 1L2 2v10l1 1V2h6.414l-1-1H3z"/>
              </svg>
            </button>
            <button class="tooltip-close-btn" title="关闭">×</button>
          </div>
        </div>
        <div class="tooltip-code">${data.code}</div>
        <div class="tooltip-divider"></div>
        <div class="tooltip-row">
          <span class="tooltip-label">估算净值：</span>
          <span class="tooltip-value">${data.gsz}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">估算涨幅：</span>
          <span class="tooltip-value ${getColorClass(parseFloat(data.gszzl))}">${data.gszzl}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">估算收益：</span>
          <span class="tooltip-value ${getColorClass(parseFloat(data.estimatedGain))}">${data.estimatedGain}</span>
        </div>
        <div class="tooltip-divider"></div>
        <div class="tooltip-row">
          <span class="tooltip-label">单位净值：</span>
          <span class="tooltip-value">${data.dwjz}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">当日涨幅：</span>
          <span class="tooltip-value ${getColorClass(parseFloat(data.navChgRt))}">${data.navChgRt}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">当日收益：</span>
          <span class="tooltip-value ${getColorClass(parseFloat(data.dailyGain))}">${data.dailyGain}</span>
        </div>
        <div class="tooltip-divider"></div>
        <div class="tooltip-row">
          <span class="tooltip-label">持有收益：</span>
          <span class="tooltip-value ${getColorClass(parseFloat(data.holdingGain))}">${data.holdingGain}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">总收益率：</span>
          <span class="tooltip-value ${getColorClass(parseFloat(data.holdingGainRate))}">${data.holdingGainRate}</span>
        </div>
        <div class="tooltip-divider"></div>
        <div class="tooltip-row">
          <span class="tooltip-label">持有金额：</span>
          <span class="tooltip-value">${data.holdingAmount}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">持有份额：</span>
          <span class="tooltip-value">${data.num}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">成本价：</span>
          <span class="tooltip-value">${data.cost}</span>
        </div>
        <div class="tooltip-divider"></div>
        <div class="tooltip-row">
          <span class="tooltip-label">关联板块：</span>
          <span class="tooltip-value">${data.relateTheme}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">更新时间：</span>
          <span class="tooltip-value">${data.updateTime || data.netValueDate}</span>
        </div>
        <div class="tooltip-actions-row">
          <button class="tooltip-action-btn btn-success" data-action="addPosition" data-code="${data.code}" data-name="${data.name}" title="加仓">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M14 7v1H8v6H7V8H1V7h6V1h1v6h6z"/>
            </svg>
            加仓
          </button>
          <button class="tooltip-action-btn btn-warning" data-action="reducePosition" data-code="${data.code}" data-name="${data.name}" title="减仓">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M14 8H1V7h13v1z"/>
            </svg>
            减仓
          </button>
          <button class="tooltip-action-btn" data-action="editPosition" data-code="${data.code}" data-name="${data.name}" title="编辑">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.23 1h-1.46L3.52 9.25l-.16.22L1 13.59 2.41 15l4.12-2.36.22-.16L15 4.23V2.77L13.23 1zM2.41 13.59l1.51-3 1.45 1.45-2.96 1.55zm3.83-2.06L4.47 9.76l8-8 1.77 1.77-8 8z"/>
            </svg>
            编辑
          </button>
          <button class="tooltip-action-btn" data-action="viewDetail" data-code="${data.code}" data-name="${data.name}" title="详情">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1.5 1h13l.5.5v13l-.5.5h-13l-.5-.5v-13l.5-.5zM2 2v12h12V2H2zm2 7h8v1H4V9zm0 2h8v1H4v-1zm0-4h8v1H4V7zm0-2h8v1H4V5z"/>
            </svg>
            详情
          </button>
          <button class="tooltip-action-btn btn-danger" data-action="deleteFund" data-code="${data.code}" data-name="${data.name}" title="删除">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M10 3h3v1h-1v9l-1 1H4l-1-1V4H2V3h3V2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1zM9 2H6v1h3V2zM4 13h7V4H4v9zm2-8H5v7h1V5zm1 0h1v7H7V5zm2 0h1v7H9V5z"/>
            </svg>
            删除
          </button>
        </div>
      `;

      document.body.appendChild(tooltip);

      // 定位 tooltip
      const rect = fundName.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();

      const padding = 10; // 边距
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = rect.right + padding;
      let top = rect.top;

      // 优先显示在右侧
      if (left + tooltipRect.width > viewportWidth) {
        // 右侧空间不够，尝试显示在左侧
        left = rect.left - tooltipRect.width - padding;

        // 如果左侧也不够（left < 0），则居中显示
        if (left < padding) {
          // 计算居中位置
          left = Math.max(padding, (viewportWidth - tooltipRect.width) / 2);

          // 如果 tooltip 太宽，限制最大宽度并居中
          if (tooltipRect.width > viewportWidth - padding * 2) {
            tooltip.style.maxWidth = (viewportWidth - padding * 2) + 'px';
            tooltip.style.width = (viewportWidth - padding * 2) + 'px';
            left = padding;

            // 重新获取调整后的高度
            const newTooltipRect = tooltip.getBoundingClientRect();

            // 调整垂直位置，显示在基金名称下方
            top = rect.bottom + padding;

            // 如果下方空间不够，显示在上方
            if (top + newTooltipRect.height > viewportHeight) {
              top = rect.top - newTooltipRect.height - padding;

              // 如果上方也不够，则从顶部开始显示
              if (top < padding) {
                top = padding;
              }
            }
          }
        }
      }

      // 确保不超出顶部和底部
      if (top < padding) {
        top = padding;
      } else if (top + tooltipRect.height > viewportHeight) {
        top = Math.max(padding, viewportHeight - tooltipRect.height - padding);
      }

      // 确保不超出左右边界
      if (left < padding) {
        left = padding;
      } else if (left + tooltipRect.width > viewportWidth) {
        left = Math.max(padding, viewportWidth - tooltipRect.width - padding);
      }

      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';

      // 绑定复制按钮事件
      const copyBtn = tooltip.querySelector('.tooltip-copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          copyFundDetail(data);
        });
      }

      // 绑定关闭按钮事件
      const closeBtn = tooltip.querySelector('.tooltip-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          removeTooltip();
        });
      }

      // 绑定操作按钮事件
      const actionBtns = tooltip.querySelectorAll('.tooltip-action-btn[data-action]');
      actionBtns.forEach(btn => {
        // 阻止按钮上的所有鼠标事件冒泡
        btn.addEventListener('mouseenter', (e) => {
          e.stopPropagation();
        });
        
        btn.addEventListener('mouseleave', (e) => {
          e.stopPropagation();
        });

        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          const action = btn.getAttribute('data-action');
          const code = btn.getAttribute('data-code');
          const name = btn.getAttribute('data-name');

          console.log('按钮点击:', action, code, name);

          // 立即执行操作
          switch (action) {
            case 'addPosition':
              vscode.postMessage({
                command: "addPosition",
                code: code,
                name: name,
              });
              break;

            case 'reducePosition':
              vscode.postMessage({
                command: "reducePosition",
                code: code,
                name: name,
              });
              break;

            case 'editPosition':
              vscode.postMessage({
                command: "editPosition",
                code: code,
                name: name,
              });
              break;

            case 'viewDetail':
              vscode.postMessage({
                command: "viewFundDetail",
                code: code,
                name: name,
              });
              break;

            case 'deleteFund':
              // 使用自定义确认对话框
              showConfirmDialog(
                `确定要删除基金 ${name} (${code}) 吗？`,
                () => {
                  vscode.postMessage({
                    command: "deleteFund",
                    code: code,
                  });
                }
              );
              break;
          }

          // 操作完成后再移除 tooltip
          removeTooltip();
        });
      });

      // 防止 tooltip 在鼠标悬停时被移除
      tooltip.addEventListener('mouseenter', () => {
        tooltip.setAttribute('data-hovering', 'true');
      });

      tooltip.addEventListener('mouseleave', () => {
        tooltip.removeAttribute('data-hovering');
        // 鼠标离开 tooltip 后延迟移除
        setTimeout(() => {
          const stillHovering = tooltip.getAttribute('data-hovering') === 'true';
          const fundName = document.querySelector('.fund-name[data-tooltip]:hover');
          if (!stillHovering && !fundName) {
            removeTooltip();
          }
        }, 200);
      });

      // 阻止 tooltip 内部的点击事件冒泡到 document，避免触发 handleFundNameLeave
      tooltip.addEventListener('click', (e) => {
        // 不阻止事件，让按钮的点击事件能正常处理
        // 只是标记 tooltip 正在被使用
        tooltip.setAttribute('data-interacting', 'true');
      });
    } catch (error) {
      console.error('解析 tooltip 数据失败:', error);
    }
  }

  /**
   * 处理基金名称 leave 事件
   */
  function handleFundNameLeave(e) {
    const fundName = e.target.closest('.fund-name[data-tooltip]');
    if (!fundName) return;

    // 检查鼠标是否移动到 tooltip 上
    const relatedTarget = e.relatedTarget;
    const tooltip = document.querySelector('.fund-tooltip');
    
    // 如果鼠标移动到 tooltip 上，不移除
    if (tooltip && relatedTarget && tooltip.contains(relatedTarget)) {
      return;
    }

    // 延迟移除，允许鼠标移到 tooltip 上
    setTimeout(() => {
      const currentTooltip = document.querySelector('.fund-tooltip');
      if (currentTooltip && !currentTooltip.matches(':hover') && !fundName.matches(':hover')) {
        removeTooltip();
      }
    }, 200);
  }

  /**
   * 移除 tooltip
   */
  function removeTooltip() {
    const existingTooltip = document.querySelector('.fund-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }
  }

  /**
   * 复制基金详情
   */
  function copyFundDetail(data) {
    const text = `
基金名称：${data.name}
基金代码：${data.code}
━━━━━━━━━━━━━━━━
估算净值：${data.gsz}
估算涨幅：${data.gszzl}
估算收益：${data.estimatedGain}
━━━━━━━━━━━━━━━━
单位净值：${data.dwjz}
当日涨幅：${data.navChgRt}
当日收益：${data.dailyGain}
━━━━━━━━━━━━━━━━
持有收益：${data.holdingGain}
总收益率：${data.holdingGainRate}
━━━━━━━━━━━━━━━━
持有金额：${data.holdingAmount}
持有份额：${data.num}
成本价：${data.cost}
━━━━━━━━━━━━━━━━
关联板块：${data.relateTheme}
更新时间：${data.updateTime || data.netValueDate}
    `.trim();

    // 使用 Clipboard API 复制
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showCopySuccess();
      }).catch(err => {
        console.error('复制失败:', err);
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  /**
   * 降级复制方法
   */
  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showCopySuccess();
    } catch (err) {
      console.error('降级复制失败:', err);
    }
    document.body.removeChild(textarea);
  }

  /**
   * 显示复制成功提示
   */
  function showCopySuccess() {
    const tooltip = document.querySelector('.fund-tooltip');
    if (tooltip) {
      const copyBtn = tooltip.querySelector('.tooltip-copy-btn');
      if (copyBtn) {
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z"/>
          </svg>
        `;
        copyBtn.style.color = '#73c991';
        setTimeout(() => {
          copyBtn.innerHTML = originalHTML;
          copyBtn.style.color = '';
        }, 1500);
      }
    }
  }

  /**
   * 切换隐私模式
   */
  function togglePrivacyMode() {
    const iconOpen = elements.btnTogglePrivacy?.querySelector('.icon-eye-open');
    const iconClosed = elements.btnTogglePrivacy?.querySelector('.icon-eye-closed');

    if (privacyMode) {
      // 隐藏模式
      if (iconOpen) iconOpen.style.display = 'none';
      if (iconClosed) iconClosed.style.display = 'block';
      document.body.classList.add('privacy-mode');
    } else {
      // 显示模式
      if (iconOpen) iconOpen.style.display = 'block';
      if (iconClosed) iconClosed.style.display = 'none';
      document.body.classList.remove('privacy-mode');
    }
  }

  /**
   * 更新账户汇总数据
   */
  function updateAccountSummary(data) {
    if (!data) return;

    // 资产总额
    if (elements.totalAssets) {
      elements.totalAssets.textContent = formatMoney(data.totalAssets, false);
    }

    // 持有收益
    const holdingGain = parseFloat(data.holdingGain);
    if (elements.holdingAmount) {
      elements.holdingAmount.textContent = formatMoney(data.holdingGain);
      elements.holdingAmount.className = "stat-value " + getColorClass(holdingGain);
    }

    const holdingRate = parseFloat(data.holdingGainRate);
    if (elements.holdingRate) {
      elements.holdingRate.textContent = formatPercent(data.holdingGainRate);
      elements.holdingRate.className = "stat-value " + getColorClass(holdingRate);
    }

    // 日收益
    const dailyGain = parseFloat(data.dailyGain);
    if (elements.dailyAmount) {
      elements.dailyAmount.textContent = formatMoney(data.dailyGain);
      elements.dailyAmount.className = "stat-value " + getColorClass(dailyGain);
    }

    const dailyRate = parseFloat(data.dailyGainRate);
    if (elements.dailyRate) {
      elements.dailyRate.textContent = formatPercent(data.dailyGainRate);
      elements.dailyRate.className = "stat-value " + getColorClass(dailyRate);
    }
  }

  /**
   * 获取今天的日期字符串 MM-DD
   */
  function getTodayDateStr() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  }

  /**
   * 从 gztime 提取日期 MM-DD
   */
  function extractDate(gztime) {
    if (!gztime || typeof gztime !== 'string') return getTodayDateStr();
    // gztime 格式: "2024-04-17 13:41"
    const match = gztime.match(/\d{4}-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}`;
    }
    return getTodayDateStr();
  }

  /**
   * 从 gztime 提取时间 HH:mm
   */
  function extractTime(gztime) {
    if (!gztime || typeof gztime !== 'string') return '';
    // gztime 格式: "2024-04-17 13:41"
    const match = gztime.match(/(\d{2}):(\d{2})/);
    if (match) {
      return `${match[1]}:${match[2]}`;
    }
    return '';
  }

  /**
   * 更新基金列表 - 新的9列布局
   */
  function updateFundList(data) {
    if (!elements.fundListContent) return;

    // 缓存原始数据
    fundDataCache = data;

    if (!data || data.length === 0) {
      elements.fundListContent.innerHTML = `
        <div class="empty-state">
          <p>暂无基金数据</p>
          <button class="btn-primary" data-action="addFund">添加基金</button>
        </div>
      `;
      return;
    }

    // 应用搜索筛选
    let filteredData = data;
    if (searchKeyword) {
      filteredData = data.filter(fund => {
        const name = (fund.name || '').toLowerCase();
        const code = (fund.code || '').toLowerCase();
        const keyword = searchKeyword.toLowerCase();
        return name.includes(keyword) || code.includes(keyword);
      });
    }

    // 应用排序
    const sortedData = sortData(filteredData);

    // 获取日期
    const todayStr = getTodayDateStr();
    const lastTradeDate = sortedData.length > 0 ? extractDate(sortedData[0].gztime) : todayStr;

    // 保存滚动位置
    const wrapper = elements.fundListContent.querySelector('.fund-table-wrapper');
    const scrollTop = wrapper ? wrapper.scrollTop : 0;
    const scrollLeft = wrapper ? wrapper.scrollLeft : 0;

    // 生成表格 HTML
    const tableHtml = `
      <div class="fund-table-wrapper">
        <table class="fund-table">
          <thead class="fund-table-header">
            <tr>
              ${generateTableHeaders()}
            </tr>
          </thead>
          <tbody class="fund-table-body">
            ${sortedData.map((fund) => generateFundRow(fund)).join("")}
          </tbody>
        </table>
      </div>
    `;

    elements.fundListContent.innerHTML = tableHtml;

    // 恢复滚动位置
    const newWrapper = elements.fundListContent.querySelector('.fund-table-wrapper');
    if (newWrapper) {
      // 使用 requestAnimationFrame 确保 DOM 已渲染
      requestAnimationFrame(() => {
        newWrapper.scrollTop = scrollTop;
        newWrapper.scrollLeft = scrollLeft;
      });
    }

    // 绑定表头排序事件
    bindTableHeaderEvents();
  }

  /**
   * 获取排序指示器（上下三角）
   */
  function getSortIndicator(field) {
    if (sortState.field !== field) {
      // 无排序：显示灰色的上下三角
      return '<span class="sort-arrows"><span class="arrow-up">▲</span><span class="arrow-down">▼</span></span>';
    }
    // 有排序：高亮对应的三角
    if (sortState.order === 'asc') {
      return '<span class="sort-arrows"><span class="arrow-up active">▲</span><span class="arrow-down">▼</span></span>';
    } else {
      return '<span class="sort-arrows"><span class="arrow-up">▲</span><span class="arrow-down active">▼</span></span>';
    }
  }

  /**
   * 生成表头
   */
  function generateTableHeaders() {
    const todayStr = getTodayDateStr();
    const lastTradeDate = fundDataCache.length > 0 ? extractDate(fundDataCache[0].gztime) : todayStr;

    const headerMap = {
      name: `<th class="th-name">基金名称</th>`,
      estimatedChange: `<th data-sort="estimatedChange" class="th-center">
        <div class="th-content">
          <div class="th-text">
            <div>估算涨幅</div>
            <div class="th-date">${todayStr}</div>
          </div>
          ${getSortIndicator('estimatedChange')}
        </div>
      </th>`,
      estimatedGain: `<th data-sort="estimatedGain" class="th-center">
        <div class="th-content">
          <div class="th-text">
            <div>估算收益</div>
            <div class="th-date">${todayStr}</div>
          </div>
          ${getSortIndicator('estimatedGain')}
        </div>
      </th>`,
      dailyChange: `<th data-sort="dailyChange" class="th-center">
        <div class="th-content">
          <div class="th-text">
            <div>当日涨幅</div>
            <div class="th-date">${todayStr}</div>
          </div>
          ${getSortIndicator('dailyChange')}
        </div>
      </th>`,
      dailyGain: `<th data-sort="dailyGain" class="th-center">
        <div class="th-content">
          <div class="th-text">
            <div>当日收益</div>
            <div class="th-date">${todayStr}</div>
          </div>
          ${getSortIndicator('dailyGain')}
        </div>
      </th>`,
      holdingGain: `<th data-sort="holdingGain" class="th-center">
        <div class="th-content">
          <div class="th-text">
            <div>持有收益</div>
            <div class="th-date">${lastTradeDate}</div>
          </div>
          ${getSortIndicator('holdingGain')}
        </div>
      </th>`,
      holdingGainRate: `<th data-sort="holdingGainRate" class="th-center">
        <div class="th-content">
          <div class="th-text">
            <div>总收益率</div>
            <div class="th-date">${lastTradeDate}</div>
          </div>
          ${getSortIndicator('holdingGainRate')}
        </div>
      </th>`,
      sector: `<th class="th-sector th-center">
        <div>关联板块</div>
      </th>`,
      amountShares: `<th data-sort="amountShares" class="th-center">
        <div class="th-content">
          <div class="th-text">
            <div>金额/份额</div>
            <div class="th-date">${lastTradeDate}</div>
          </div>
          ${getSortIndicator('amountShares')}
        </div>
      </th>`,
      cost: `<th data-sort="cost" class="th-center">
        <div class="th-content">
          <div class="th-text">
            <div>成本/最新</div>
            <div class="th-date">${lastTradeDate}</div>
          </div>
          ${getSortIndicator('cost')}
        </div>
      </th>`
    };

    return columnSettings.columnOrder
      .filter(col => columnSettings.visibleColumns.includes(col))
      .map(col => headerMap[col] || '')
      .join('');
  }

  /**
   * 排序数据
   */
  function sortData(data) {
    if (!sortState.field) {
      return data;
    }

    const sorted = [...data].sort((a, b) => {
      let aVal, bVal;

      switch (sortState.field) {
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          return sortState.order === 'asc'
            ? aVal.localeCompare(bVal, 'zh-CN')
            : bVal.localeCompare(aVal, 'zh-CN');

        case 'estimatedChange':
          aVal = parseFloat(a.gszzl || "0");
          bVal = parseFloat(b.gszzl || "0");
          break;

        case 'estimatedGain':
          aVal = calculateEstimatedGain(a);
          bVal = calculateEstimatedGain(b);
          break;

        case 'dailyChange':
          aVal = parseFloat(a.navChgRt || "0");
          bVal = parseFloat(b.navChgRt || "0");
          break;

        case 'dailyGain':
          aVal = calculateDailyGain(a);
          bVal = calculateDailyGain(b);
          break;

        case 'holdingGain':
          aVal = calculateHoldingGain(a);
          bVal = calculateHoldingGain(b);
          break;

        case 'holdingGainRate':
          aVal = calculateHoldingGainRate(a);
          bVal = calculateHoldingGainRate(b);
          break;

        case 'amountShares':
          aVal = calculateHoldingAmount(a);
          bVal = calculateHoldingAmount(b);
          break;

        case 'cost':
          aVal = parseFloat(a.cost || "0");
          bVal = parseFloat(b.cost || "0");
          break;

        default:
          return 0;
      }

      return sortState.order === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }

  /**
   * 计算估算收益
   */
  function calculateEstimatedGain(fund) {
    const num = parseFloat(fund.num || "0");
    const gsz = parseFloat(fund.gsz || "0");
    const gszzl = parseFloat(fund.gszzl || "0");
    const holdingAmount = num * gsz;
    return (holdingAmount * gszzl) / 100;
  }

  /**
   * 计算当日收益（使用实际净值和实际涨跌幅）
   */
  function calculateDailyGain(fund) {
    const num = parseFloat(fund.num || "0");
    if (num <= 0) return 0;

    const dwjz = parseFloat(fund.dwjz || "0"); // 实际净值
    const navChgRt = parseFloat(fund.navChgRt || "0"); // 实际涨跌幅

    // 使用实际净值计算持有金额，再乘以实际涨跌幅
    const holdingAmount = num * dwjz;
    return (holdingAmount * navChgRt) / 100;
  }

  /**
   * 计算持有收益（使用实际净值）
   */
  function calculateHoldingGain(fund) {
    const num = parseFloat(fund.num || "0");
    const cost = parseFloat(fund.cost || "0");
    const dwjz = parseFloat(fund.dwjz || "0"); // 使用实际净值
    const holdingAmount = num * dwjz;
    const costAmount = num * cost;
    return holdingAmount - costAmount;
  }

  /**
   * 计算持有收益率（使用实际净值）
   */
  function calculateHoldingGainRate(fund) {
    const num = parseFloat(fund.num || "0");
    const cost = parseFloat(fund.cost || "0");
    const dwjz = parseFloat(fund.dwjz || "0"); // 使用实际净值
    const holdingAmount = num * dwjz;
    const costAmount = num * cost;
    return costAmount > 0 ? ((holdingAmount - costAmount) / costAmount) * 100 : 0;
  }

  /**
   * 计算持有金额（使用实际净值）
   */
  function calculateHoldingAmount(fund) {
    const num = parseFloat(fund.num || "0");
    const dwjz = parseFloat(fund.dwjz || "0"); // 使用实际净值
    return num * dwjz;
  }

  /**
   * 排序：默认 → 降序 → 升序 → 默认
   */
  function sortBy(field) {
    if (sortState.field === field) {
      // 同一字段：降序 → 升序 → 默认
      if (sortState.order === 'desc') {
        sortState.order = 'asc';
      } else if (sortState.order === 'asc') {
        // 回到默认（无排序）
        sortState.field = null;
        sortState.order = 'asc';
      }
    } else {
      // 新字段，默认 → 降序
      sortState.field = field;
      sortState.order = 'desc';
    }

    // 重新渲染
    updateFundList(fundDataCache);
  }

  /**
   * 绑定表头排序事件
   */
  function bindTableHeaderEvents() {
    const headers = document.querySelectorAll('.fund-table-header th[data-sort]');
    headers.forEach(header => {
      header.addEventListener('click', () => {
        const field = header.getAttribute('data-sort');
        if (field) {
          sortBy(field);
        }
      });
    });
  }

  /**
   * 生成单个基金行 - 根据列设置动态生成
   */
  function generateFundRow(fund) {
    const num = parseFloat(fund.num || "0");
    const cost = parseFloat(fund.cost || "0");
    const gsz = parseFloat(fund.gsz || "0"); // 估算净值
    const dwjz = parseFloat(fund.dwjz || "0"); // 单位净值
    const gszzl = parseFloat(fund.gszzl || "0"); // 估算涨跌幅
    const navChgRt = parseFloat(fund.navChgRt || "0"); // 实际涨跌幅
    const isRealValue = fund.isRealValue || false;

    // 使用实际净值计算持有金额和收益
    const holdingAmount = num * dwjz; // 持有金额（使用实际净值）
    const costAmount = num * cost; // 成本金额
    const holdingGain = holdingAmount - costAmount; // 持有收益
    const holdingGainRate = costAmount > 0 ? (holdingGain / costAmount) * 100 : 0; // 持有收益率

    // 估算收益（当日）- 使用估算净值和估算涨跌幅
    const estimatedGain = (num * gsz * gszzl) / 100;

    // 当日收益 - 使用实际净值和实际涨跌幅
    const dailyGain = (holdingAmount * navChgRt) / 100;

    // 提取日期和时间
    const updateTime = extractTime(fund.gztime);
    const netValueDate = extractDate(fund.gztime);

    // 关联板块
    const relateTheme = fund.relateTheme || '--';

    // 颜色类
    const estimatedChangeColor = getColorClass(gszzl);
    const dailyChangeColor = getColorClass(navChgRt);
    const estimatedGainColor = getColorClass(estimatedGain);
    const dailyGainColor = getColorClass(dailyGain);
    const holdingGainColor = getColorClass(holdingGain);
    const holdingRateColor = getColorClass(holdingGainRate);

    // 生成 tooltip 数据（JSON 格式，用于 data 属性）
    const tooltipData = JSON.stringify({
      name: fund.name || "未知基金",
      code: fund.code,
      gsz: gsz.toFixed(4),
      gszzl: formatPercent(gszzl),
      dwjz: dwjz.toFixed(4),
      navChgRt: formatPercent(navChgRt),
      estimatedGain: formatMoney(estimatedGain),
      dailyGain: formatMoney(dailyGain),
      holdingGain: formatMoney(holdingGain),
      holdingGainRate: formatPercent(holdingGainRate),
      holdingAmount: holdingAmount.toFixed(2),
      num: num.toFixed(2),
      cost: cost.toFixed(4),
      relateTheme: relateTheme,
      updateTime: updateTime,
      netValueDate: netValueDate
    }).replace(/"/g, '&quot;');

    // 单元格映射
    const cellMap = {
      name: `<td class="td-name" data-column="name">
        <div class="fund-name-cell">
          <div class="fund-name" 
               title="${fund.name || "未知基金"}" 
               data-tooltip="${tooltipData}"
               data-code="${fund.code}">${fund.name || "未知基金"}</div>
          <div class="fund-code">${fund.code}</div>
        </div>
      </td>`,
      estimatedChange: `<td class="td-value" data-column="estimatedChange">
        <div class="${estimatedChangeColor}">${formatPercent(gszzl)}</div>
        <div class="td-sub">${gsz.toFixed(4)}</div>
      </td>`,
      estimatedGain: `<td class="td-value" data-column="estimatedGain">
        <div class="${estimatedGainColor} privacy-hide-amount">${formatMoney(estimatedGain)}</div>
        <div class="td-sub">${updateTime}</div>
      </td>`,
      dailyChange: `<td class="td-value" data-column="dailyChange">
        <div class="${dailyChangeColor}">${formatPercent(navChgRt)}</div>
        <div class="td-sub">${netValueDate}</div>
      </td>`,
      dailyGain: `<td class="td-value" data-column="dailyGain">
        <div class="${dailyGainColor} privacy-hide-amount">${formatMoney(dailyGain)}</div>
      </td>`,
      holdingGain: `<td class="td-value" data-column="holdingGain">
        <div class="${holdingGainColor} privacy-hide-amount">${formatMoney(holdingGain)}</div>
        <div class="${holdingRateColor}">${formatPercent(holdingGainRate)}</div>
      </td>`,
      holdingGainRate: `<td class="td-value" data-column="holdingGainRate">
        <div class="${holdingRateColor}">${formatPercent(holdingGainRate)}</div>
        <div class="${holdingGainColor} privacy-hide-amount">${formatMoney(holdingGain)}</div>
      </td>`,
      sector: `<td class="td-value" data-column="sector">
        <div>${relateTheme}</div>
      </td>`,
      amountShares: `<td class="td-value" data-column="amountShares">
        <div class="privacy-hide-amount">${holdingAmount.toFixed(2)}</div>
        <div class="td-sub privacy-hide-amount">${num.toFixed(2)}</div>
      </td>`,
      cost: `<td class="td-value" data-column="cost">
        <div>${cost.toFixed(4)}</div>
        <div class="td-sub">${dwjz.toFixed(4)}</div>
      </td>`
    };

    const cells = columnSettings.columnOrder
      .filter(col => columnSettings.visibleColumns.includes(col))
      .map(col => cellMap[col] || '')
      .join('');

    return `<tr>${cells}</tr>`;
  }

  /**
   * 格式化金额
   */
  function formatMoney(value, showSign = true) {
    const num = parseFloat(value);
    if (isNaN(num)) return "0.00";
    const sign = showSign && num >= 0 ? "+" : "";
    return sign + num.toFixed(2);
  }

  /**
   * 格式化百分比
   */
  function formatPercent(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return "0.00%";
    const sign = num >= 0 ? "+" : "";
    return sign + num.toFixed(2) + "%";
  }

  /**
   * 获取颜色类名
   */
  function getColorClass(value) {
    const num = parseFloat(value);
    if (isNaN(num) || num === 0) return "color-flat";
    return num > 0 ? "color-up" : "color-down";
  }

  /**
   * 处理按钮点击事件（事件委托）
   */
  function handleButtonClick(e) {
    const button = e.target.closest('[data-action]');
    if (!button) {
      return;
    }

    const action = button.getAttribute('data-action');
    const code = button.getAttribute('data-code');
    const name = button.getAttribute('data-name');

    switch (action) {
      case 'addFund':
        vscode.postMessage({ command: 'addFund' });
        break;

      case 'viewDetail':
        vscode.postMessage({
          command: "viewFundDetail",
          code: code,
          name: name,
        });
        break;

      case 'deleteFund':
        showConfirmDialog(
          `确定要删除基金 ${name} (${code}) 吗？`,
          () => {
            vscode.postMessage({
              command: "deleteFund",
              code: code,
            });
          }
        );
        break;

      case 'addPosition':
        vscode.postMessage({
          command: "addPosition",
          code: code,
          name: name,
        });
        break;

      case 'reducePosition':
        vscode.postMessage({
          command: "reducePosition",
          code: code,
          name: name,
        });
        break;

      case 'editPosition':
        vscode.postMessage({
          command: "editPosition",
          code: code,
          name: name,
        });
        break;
    }
  }

  // 使用事件委托监听所有按钮点击
  document.addEventListener('click', handleButtonClick);

  /**
   * 监听来自后端的消息
   */
  window.addEventListener("message", (event) => {
    const message = event.data;
    // console.log("收到消息:", message);

    switch (message.command) {
      case "updateAccountSummary":
        updateAccountSummary(message.data);
        break;

      case "updateFundData":
        updateFundList(message.data);
        break;

      case "updateMarketStatus":
        updateMarketStatus(message.data);
        break;

      case "updateColumnSettings":
        if (message.data) {
          columnSettings = message.data;
        }
        break;

      case "columnSettingsSaved":
        // 列设置已保存，刷新列表
        updateFundList(fundDataCache);
        break;

      case "refreshStatus":
        // 刷新状态消息（已移除 toolbar，可以忽略或用其他方式显示）
        console.log("刷新状态:", message.text);
        break;

      default:
        console.log("未知消息:", message);
    }
  });

  // 页面加载完成后初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
