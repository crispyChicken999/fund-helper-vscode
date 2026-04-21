/**
 * Webview 分组管理脚本
 */

export function getGroupScripts(): string[] {
  const script = `
(function () {
  function uniqueList(items) {
    var set = new Set();
    var result = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item || set.has(item)) {
        continue;
      }
      set.add(item);
      result.push(item);
    }
    return result;
  }

  function showMessageDialog(message) {
    var existingDialog = document.querySelector('.gm-message-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }

    var dialog = document.createElement('div');
    dialog.className = 'gm-message-dialog';
    dialog.innerHTML = '' +
      '<div class="gm-message-overlay"></div>' +
      '<div class="gm-message-content">' +
        '<div class="gm-message-text">' + message + '</div>' +
        '<div class="gm-message-buttons">' +
          '<button class="gm-message-btn gm-message-btn-ok">确定</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(dialog);

    var btnOk = dialog.querySelector('.gm-message-btn-ok');
    var overlay = dialog.querySelector('.gm-message-overlay');

    var closeDialog = function() {
      dialog.remove();
    };

    btnOk.addEventListener('click', closeDialog);
    overlay.addEventListener('click', closeDialog);

    setTimeout(function() {
      btnOk.focus();
    }, 100);
  }

  function showPromptDialog(message, defaultValue, onConfirm) {
    var existingDialog = document.querySelector('.gm-prompt-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }

    var dialog = document.createElement('div');
    dialog.className = 'gm-prompt-dialog';
    dialog.innerHTML = '' +
      '<div class="gm-prompt-overlay"></div>' +
      '<div class="gm-prompt-content">' +
        '<div class="gm-prompt-message">' + message + '</div>' +
        '<input type="text" class="gm-prompt-input" value="' + (defaultValue || '') + '" />' +
        '<div class="gm-prompt-buttons">' +
          '<button class="gm-prompt-btn gm-prompt-btn-cancel">取消</button>' +
          '<button class="gm-prompt-btn gm-prompt-btn-ok">确定</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(dialog);

    var input = dialog.querySelector('.gm-prompt-input');
    var btnCancel = dialog.querySelector('.gm-prompt-btn-cancel');
    var btnOk = dialog.querySelector('.gm-prompt-btn-ok');
    var overlay = dialog.querySelector('.gm-prompt-overlay');

    var closeDialog = function() {
      dialog.remove();
    };

    btnCancel.addEventListener('click', closeDialog);
    overlay.addEventListener('click', closeDialog);

    btnOk.addEventListener('click', function() {
      var value = input.value.trim();
      closeDialog();
      if (onConfirm && value) {
        onConfirm(value);
      }
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        var value = input.value.trim();
        closeDialog();
        if (onConfirm && value) {
          onConfirm(value);
        }
      } else if (e.key === 'Escape') {
        closeDialog();
      }
    });

    setTimeout(function() {
      input.focus();
      input.select();
    }, 100);
  }

  function showConfirmDialog(message, onConfirm) {
    var existingDialog = document.querySelector('.gm-confirm-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }

    var dialog = document.createElement('div');
    dialog.className = 'gm-confirm-dialog';
    dialog.innerHTML = '' +
      '<div class="gm-confirm-overlay"></div>' +
      '<div class="gm-confirm-content">' +
        '<div class="gm-confirm-message">' + message + '</div>' +
        '<div class="gm-confirm-buttons">' +
          '<button class="gm-confirm-btn gm-confirm-btn-cancel">取消</button>' +
          '<button class="gm-confirm-btn gm-confirm-btn-ok">确定</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(dialog);

    var btnCancel = dialog.querySelector('.gm-confirm-btn-cancel');
    var btnOk = dialog.querySelector('.gm-confirm-btn-ok');
    var overlay = dialog.querySelector('.gm-confirm-overlay');

    var closeDialog = function() {
      dialog.remove();
    };

    btnCancel.addEventListener('click', closeDialog);
    overlay.addEventListener('click', closeDialog);

    btnOk.addEventListener('click', function() {
      closeDialog();
      if (onConfirm) {
        onConfirm();
      }
    });

    setTimeout(function() {
      btnOk.focus();
    }, 100);
  }

  function createFundGroupManager(options) {
    var state = {
      funds: [],
      allCodes: [],
      groupOrder: ["未分类"],
      groups: {},
      selectedGroup: "未分类",
      focusedCode: "",
      draggingGroup: "",
      draggingCode: "",
      initialized: false,
    };

    var dom = {
      root: null,
      topList: null,
      fundList: null,
      groupTitle: null,
    };

    function resetState() {
      state.funds = [];
      state.allCodes = [];
      state.groupOrder = ["未分类"];
      state.groups = {};
      state.selectedGroup = "未分类";
      state.focusedCode = "";
      state.draggingGroup = "";
      state.draggingCode = "";
      state.initialized = false;
    }

    function syncFromHost() {
      var rawFunds = options.getFundData ? options.getFundData() : [];
      var rawGroups = options.getAvailableGroups ? options.getAvailableGroups() : [];
      var rawFundGroups = options.getFundGroups ? options.getFundGroups() : {};
      
      state.funds = Array.isArray(rawFunds) ? rawFunds.slice() : [];
      
      // 构建 allCodes - 保持原有顺序
      var newAllCodes = state.funds.map(function (f) { return f.code; });
      
      // 如果已经初始化过，保持用户调整的顺序
      if (state.initialized && state.allCodes.length > 0) {
        var codeSet = new Set(newAllCodes);
        var orderedCodes = [];
        // 保留原有顺序中仍存在的基金
        for (var i = 0; i < state.allCodes.length; i++) {
          if (codeSet.has(state.allCodes[i])) {
            orderedCodes.push(state.allCodes[i]);
            codeSet.delete(state.allCodes[i]);
          }
        }
        // 添加新增的基金
        codeSet.forEach(function(code) {
          orderedCodes.push(code);
        });
        state.allCodes = orderedCodes;
      } else {
        state.allCodes = newAllCodes;
      }

      // 如果已经初始化，不要覆盖用户的分组修改
      if (state.initialized) {
        // 只更新基金数据，不更新分组数据
        return;
      }

      // 首次初始化：构建分组列表
      var order = ["未分类"];
      
      // 添加从 host 获取的分组（转换"全部"为"未分类"）
      var hostGroups = Array.isArray(rawGroups) ? rawGroups : [];
      for (var k = 0; k < hostGroups.length; k++) {
        var g = hostGroups[k];
        if (g === "全部") {
          continue; // 跳过"全部"
        }
        if (g && !order.includes(g)) {
          order.push(g);
        }
      }


      // 初始化分组数据
      var newGroups = {};
      
      // 首次初始化：直接使用配置文件中的分组数据
      
      // 直接使用 rawFundGroups 中的数据
      for (var k = 0; k < hostGroups.length; k++) {
        var g = hostGroups[k];
        if (g && g !== "全部" && g !== "未分类") {
          // 从 rawFundGroups 获取这个分组的基金列表
          var codes = rawFundGroups[g] || [];
          newGroups[g] = Array.isArray(codes) ? codes.slice() : [];
        }
      }
      

      state.groups = newGroups;
      state.groupOrder = uniqueList(order);
      
      if (!state.groupOrder.includes(state.selectedGroup)) {
        state.selectedGroup = "未分类";
      }
      
      state.initialized = true;
    }

    function ensureDom() {
      if (dom.root) {
        return;
      }

      var root = document.createElement("div");
      root.className = "group-manager-modal";
      root.innerHTML = '' +
        '<div class="group-manager-overlay" data-action="close"></div>' +
        '<div class="group-manager-content">' +
          '<div class="group-manager-header">' +
            '<h3 title="分组管理（基金从底部拖拽到上方分组）">分组管理（基金从底部拖拽到上方分组）</h3>' +
            '<button class="group-manager-close" data-action="close">×</button>' +
          '</div>' +
          '<div class="group-manager-body">' +
            '<div class="group-manager-panel top">' +
              '<div class="group-manager-panel-header">' +
                '<div class="group-manager-panel-title" title="分组管理器（拖拽排序 / 编辑 / 删除）">分组管理器（拖拽排序 / 编辑 / 删除）</div>' +
                '<button class="group-manager-add" id="btnAddGroup">+<span> 新建分组</span></button>' +
              '</div>' +
              '<div class="group-manager-top-list"></div>' +
            '</div>' +
            '<div class="group-manager-panel bottom">' +
              '<div class="group-manager-panel-header">' +
                '<div class="group-manager-panel-title" id="groupManagerFundTitle" title="基金列表">基金列表</div>' +
              '</div>' +
              '<div class="group-manager-fund-list"></div>' +
            '</div>' +
          '</div>' +
          '<div class="group-manager-footer">' +
            '<button class="btn-secondary" data-action="cancel">取消</button>' +
            '<button class="btn-primary" data-action="save">保存</button>' +
          '</div>' +
        '</div>';

      root.addEventListener("click", function (e) {
        var target = e.target;
        if (!target) {
          return;
        }
        var action = target.getAttribute("data-action");
        if (!action) {
          return;
        }
        if (action === "close" || action === "cancel") {
          resetState();
          close();
          return;
        }
        if (action === "save") {
          save();
        }
      });

      document.body.appendChild(root);
      dom.root = root;
      dom.topList = root.querySelector(".group-manager-top-list");
      dom.fundList = root.querySelector(".group-manager-fund-list");
      dom.groupTitle = root.querySelector("#groupManagerFundTitle");

      var addBtn = root.querySelector("#btnAddGroup");
      if (addBtn) {
        addBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          showPromptDialog("请输入分组名称", "", function(name) {
            if (state.groupOrder.includes(name)) {
              showMessageDialog("分组名称已存在，请使用其他名称");
              return;
            }
            if (name === "未分类" || name === "全部") {
              showMessageDialog("不能使用 '未分类' 或 '全部' 作为分组名称");
              return;
            }
            state.groupOrder.push(name);
            state.groups[name] = [];
            // 保持在"未分类"分组
            state.selectedGroup = "未分类";
            renderOnly();
          });
        });
      }
    }

    function close() {
      if (dom.root) {
        dom.root.style.display = "none";
      }
    }

    function getFundByCode(code) {
      for (var i = 0; i < state.funds.length; i++) {
        if (state.funds[i].code === code) {
          return state.funds[i];
        }
      }
      return null;
    }

    function getGroupOfCode(code) {
      for (var i = 1; i < state.groupOrder.length; i++) {
        var group = state.groupOrder[i];
        var codes = state.groups[group] || [];
        if (codes.includes(code)) {
          return group;
        }
      }
      return "未分类";
    }

    function removeFromAllGroups(code) {
      for (var i = 1; i < state.groupOrder.length; i++) {
        var group = state.groupOrder[i];
        state.groups[group] = (state.groups[group] || []).filter(function (c) {
          return c !== code;
        });
      }
    }

    function moveFundToGroup(code, targetGroup) {
      removeFromAllGroups(code);
      if (targetGroup !== "未分类") {
        if (!state.groups[targetGroup]) {
          state.groups[targetGroup] = [];
        }
        if (!state.groups[targetGroup].includes(code)) {
          state.groups[targetGroup].push(code);
        }
      }
      renderOnly();
    }

    function reorderList(list, draggedCode, targetCode) {
      var from = list.indexOf(draggedCode);
      var to = list.indexOf(targetCode);
      if (from === -1 || to === -1 || from === to) {
        return;
      }
      
      // 移除被拖拽的元素
      list.splice(from, 1);
      
      // 重新查找目标元素的位置（因为移除后索引可能变化）
      var nextTo = list.indexOf(targetCode);
      
      // 如果是向下拖（原位置在目标位置前面），插入到目标位置后面
      // 如果是向上拖（原位置在目标位置后面），插入到目标位置
      if (from < to) {
        // 向下拖，插入到目标后面
        list.splice(nextTo + 1, 0, draggedCode);
      } else {
        // 向上拖，插入到目标位置
        list.splice(nextTo, 0, draggedCode);
      }
    }

    function renderTopGroups() {
      if (!dom.topList) {
        return;
      }
      dom.topList.innerHTML = "";

      
      state.groupOrder.forEach(function (group, index) {
        var item = document.createElement("div");
        item.className = "group-manager-item" + (state.selectedGroup === group ? " active" : "");
        item.setAttribute("data-group", group);

        var left = document.createElement("div");
        left.className = "group-manager-item-left";

        var dragIcon = document.createElement("span");
        dragIcon.className = "gm-icon drag";
        dragIcon.textContent = "☰";

        var name = document.createElement("span");
        name.className = "group-manager-item-name";
        name.textContent = group;
        name.title = group;  // 添加 title 属性

        left.appendChild(dragIcon);
        left.appendChild(name);
        item.appendChild(left);
        
        var actions = document.createElement("div");
        actions.className = "group-manager-item-actions";

        var editBtn = document.createElement("button");
        editBtn.className = "gm-icon-btn";
        editBtn.title = "重命名";
        editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M5 19h1.425L16.2 9.225L14.775 7.8L5 17.575zm-2 2v-4.25L16.2 3.575q.3-.275.663-.425t.762-.15t.775.15t.65.45L20.425 5q.3.275.438.65T21 6.4q0 .4-.137.763t-.438.662L7.25 21zM19 6.4L17.6 5zm-3.525 2.125l-.7-.725L16.2 9.225z"/></svg>';

        var delBtn = document.createElement("button");
        delBtn.className = "gm-icon-btn danger";
        delBtn.title = "删除";
        delBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M7 21q-.825 0-1.412-.587T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.587 1.413T17 21zM17 6H7v13h10zM9 17h2V8H9zm4 0h2V8h-2zM7 6v13z"/></svg>';

        if (index === 0) {
          dragIcon.classList.add("disabled");
          // "未分类"不添加编辑删除按钮
        } else {
          item.draggable = true;
          
          item.addEventListener("dragstart", function (e) {
            state.draggingGroup = group;
            item.classList.add("dragging");
            if (e.dataTransfer) {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", group);
            }
          });
          
          item.addEventListener("dragend", function () {
            state.draggingGroup = "";
            item.classList.remove("dragging");
            var allItems = dom.topList.querySelectorAll(".group-manager-item");
            allItems.forEach(function(el) {
              el.classList.remove("drag-over");
            });
          });

          editBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            showPromptDialog("修改分组名称", group, function(newName) {
              if (newName === group) {
                return;
              }
              if (newName === "未分类" || newName === "全部") {
                showMessageDialog("不能使用 '未分类' 或 '全部' 作为分组名称");
                return;
              }
              if (state.groupOrder.includes(newName)) {
                showMessageDialog("分组名称已存在，请使用其他名称");
                return;
              }
              
              // 关键：先从 groupOrder 中移除旧名称，再添加新名称
              var idx = state.groupOrder.indexOf(group);
              if (idx !== -1) {
                state.groupOrder.splice(idx, 1);
                state.groupOrder.splice(idx, 0, newName);
              }
              
              // 更新 groups 数据
              state.groups[newName] = state.groups[group] || [];
              delete state.groups[group];
              
              // 更新选中状态
              if (state.selectedGroup === group) {
                state.selectedGroup = newName;
              }
              
              renderOnly();
            });
          });

          delBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            showConfirmDialog('确定删除分组 "' + group + '" ? 该分组基金将回到未分类。', function() {
              delete state.groups[group];
              state.groupOrder = state.groupOrder.filter(function (g) {
                return g !== group;
              });
              if (state.selectedGroup === group) {
                state.selectedGroup = "未分类";
              }
              renderOnly();
            });
          });

          actions.appendChild(editBtn);
          actions.appendChild(delBtn);
          item.appendChild(actions);
        }

        item.addEventListener("click", function () {
          state.selectedGroup = group;
          renderOnly();
        });

        item.addEventListener("dragover", function (e) {
          e.preventDefault();
          if (state.draggingCode) {
            item.classList.add("drag-over");
          } else if (state.draggingGroup && state.draggingGroup !== group && index > 0) {
            item.classList.add("drag-over");
          }
        });

        item.addEventListener("dragleave", function () {
          item.classList.remove("drag-over");
        });

        item.addEventListener("drop", function (e) {
          e.preventDefault();
          e.stopPropagation();
          item.classList.remove("drag-over");

          if (state.draggingCode) {
            moveFundToGroup(state.draggingCode, group);
            return;
          }

          if (state.draggingGroup && state.draggingGroup !== group && group !== "未分类" && index > 0) {
            var from = state.groupOrder.indexOf(state.draggingGroup);
            var to = state.groupOrder.indexOf(group);
            if (from > 0 && to > 0 && from !== to) {
              // 移除被拖拽的分组
              state.groupOrder.splice(from, 1);
              // 重新查找目标分组的位置
              var nextTo = state.groupOrder.indexOf(group);
              // 如果是向下拖，插入到目标后面；向上拖，插入到目标位置
              if (from < to) {
                state.groupOrder.splice(nextTo + 1, 0, state.draggingGroup);
              } else {
                state.groupOrder.splice(nextTo, 0, state.draggingGroup);
              }
              renderOnly();
            }
          }
        });

        dom.topList.appendChild(item);
      });
    }

    function renderFundList() {
      if (!dom.fundList || !dom.groupTitle) {
        return;
      }

      var codes = [];
      if (state.selectedGroup === "未分类") {
        // "未分类"分组显示所有不在其他分组的基金
        var codesInGroups = new Set();
        for (var i = 1; i < state.groupOrder.length; i++) {
          var groupCodes = state.groups[state.groupOrder[i]] || [];
          for (var j = 0; j < groupCodes.length; j++) {
            codesInGroups.add(groupCodes[j]);
          }
        }
        for (var k = 0; k < state.allCodes.length; k++) {
          if (!codesInGroups.has(state.allCodes[k])) {
            codes.push(state.allCodes[k]);
          }
        }
      } else {
        codes = (state.groups[state.selectedGroup] || []).slice();
      }

      var titleText = "基金列表（" + state.selectedGroup + "）- 共 " + codes.length + " 只";
      dom.groupTitle.textContent = titleText;
      dom.groupTitle.title = titleText;  // 添加 title 属性
      dom.fundList.innerHTML = "";

      if (codes.length === 0) {
        dom.fundList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--vscode-descriptionForeground);">暂无基金</div>';
        return;
      }

      codes.forEach(function (code) {
        var fund = getFundByCode(code);
        if (!fund) {
          return;
        }

        var row = document.createElement("div");
        row.className = "group-manager-fund-item" + (state.focusedCode === code ? " focused" : "");
        row.draggable = true;
        row.setAttribute("data-code", code);

        var left = document.createElement("div");
        left.className = "group-manager-fund-main";
        left.innerHTML =
          '<span class="gm-icon drag">☰</span>' +
          '<span class="group-manager-fund-name" title="' + (fund.name || code) + '">' + (fund.name || code) + '</span>' +
          '<span class="group-manager-fund-code">' + code + '</span>';

        row.appendChild(left);

        row.addEventListener("dragstart", function (e) {
          state.draggingCode = code;
          row.classList.add("dragging");
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("application/x-fund-code", code);
          }
        });

        row.addEventListener("dragend", function () {
          state.draggingCode = "";
          row.classList.remove("dragging");
          var allRows = dom.fundList.querySelectorAll(".group-manager-fund-item");
          allRows.forEach(function(el) {
            el.classList.remove("drag-over");
          });
        });

        row.addEventListener("dragover", function (e) {
          e.preventDefault();
          if (state.draggingCode && state.draggingCode !== code) {
            row.classList.add("drag-over");
          }
        });

        row.addEventListener("dragleave", function () {
          row.classList.remove("drag-over");
        });

        row.addEventListener("drop", function (e) {
          e.preventDefault();
          e.stopPropagation();
          row.classList.remove("drag-over");
          
          if (!state.draggingCode || state.draggingCode === code) {
            return;
          }

          if (state.selectedGroup === "未分类") {
            reorderList(state.allCodes, state.draggingCode, code);
          } else {
            var list = state.groups[state.selectedGroup] || [];
            reorderList(list, state.draggingCode, code);
            state.groups[state.selectedGroup] = list;
          }
          renderOnly();
        });

        dom.fundList.appendChild(row);
      });
    }

    function renderOnly() {
      renderTopGroups();
      renderFundList();
      if (dom.root) {
        dom.root.style.display = "flex";
      }
    }

    function render() {
      syncFromHost();
      renderOnly();
    }

    function buildPayload() {
      var groups = {};
      for (var i = 1; i < state.groupOrder.length; i++) {
        var name = state.groupOrder[i];
        groups[name] = (state.groups[name] || []).slice();
      }
      return {
        groupOrder: state.groupOrder.slice(1), // 不包含"未分类"
        groups: groups,
        orderedCodes: state.allCodes.slice(),
      };
    }

    function save() {
      var payload = buildPayload();
      if (options.onSave) {
        options.onSave(payload);
      }
      close();
    }

    return {
      open: function (context) {
        syncFromHost();
        ensureDom();
        state.focusedCode = context && context.code ? context.code : "";
        if (state.focusedCode) {
          state.selectedGroup = getGroupOfCode(state.focusedCode);
        }
        render();
      },
      syncData: function () {
        syncFromHost();
      },
    };
  }

  window.createFundGroupManager = createFundGroupManager;
})();
`;

  return script.split("\n");
}
