// ==UserScript==
// @name         Quark Fast Rename
// @namespace    meguoe
// @version      0.5.0
// @description  夸克云盘批量重命名文件
// @author       meguoe@163.com
// @match        https://pan.quark.cn/*
// @match        https://drive.quark.cn/*
// @icon         https://img.remit.ee/api/file/BQACAgUAAyEGAASHRsPbAAETtahp8FnWo7fqBhJAv2tAUhxcgDrc2QACQSEAAgYIiVcf7ydSVVOwYDsE.png
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_registerMenuCommand
// @connect      *
// @run-at       document-idle
// @license      Apache-2.0
// @tag          123 夸克 123云盘 夸克网盘 批量重命名助手
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  const LOG_TAG = '%c[QuarkFastRename]%c';
  const LOG_STYLE = 'color:#e74c3c;font-weight:bold';
  const LOG_SUB_STYLE = 'color:#3498db';

  function log(...args) {
    console.log(LOG_TAG, LOG_STYLE, '', LOG_SUB_STYLE, ...args);
  }

  // ========================
  //  全局配置
  // ========================
  const CONFIG = {
    pageSize: 1000,
    buttonId: 'quark-fast-rename-btn',
    debounceDelay: 300,
    modalZIndex: 9999,
    categoryMap: { 0: '其他', 1: '视频', 2: '音频', 3: '图片', 4: '文档', 5: '其他', 6: '种子', 7: '压缩包', 8: '应用' },
  };

  // ========================
  //  弹窗样式
  // ========================
  const MODAL_CSS = `
    .qfr-modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: ${CONFIG.modalZIndex};
    }
    .qfr-modal-content {
      background: #fff; border-radius: 20px;
      width: 70vw; height: 80vh;
      display: flex; font-size: 14px; flex-direction: column;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .qfr-modal-header {
      padding: 16px 20px; border-bottom: 1px solid #e8e8e8;
      display: flex; justify-content: space-between; align-items: center;
    }
    .qfr-modal-title-container {
      display: flex; flex-direction: row; align-items: baseline; gap: 12px;
    }
    .qfr-modal-title { margin: 0; font-size: 16px; font-weight: 500; color: #333; }
    .qfr-modal-subtitle { margin: 0; font-size: 12px; color: #999; }
    .qfr-modal-body { padding: 20px; overflow-y: auto; flex: 1; }
    .qfr-modal-footer {
      padding: 16px 20px; border-top: 1px solid #e8e8e8;
      display: flex; justify-content: flex-end; gap: 12px;
    }
    .qfr-modal-header-right { margin-left: auto; display: flex; align-items: center; }
    .qfr-button-container-inner { display: flex; gap: 12px; align-items: center; }
    .qfr-file-list { display: flex; flex-direction: column; gap: 8px; max-width: 100%; width: 100%; overflow-x: hidden; }
    .qfr-file-item {
      display: flex; align-items: center; padding: 12px;
      background: #f5f5f5; border-radius: 8px;
      transition: background 0.2s, transform 0.2s;
      cursor: move; gap: 12px; border: 1px solid #d7d7d7;
    }
    .qfr-file-item:hover { background: #e8e8e8; }
    .qfr-file-item.dragging { opacity: 0.5; transform: scale(0.98); }
    .qfr-file-index { color: rgb(51, 51, 51); min-width: 30px; font-size: 14px; }
    .qfr-file-name { flex: 1; color: #333; word-break: break-all; }
    .qfr-file-category { color: #999; font-size: 12px; min-width: 50px; text-align: center; }
    .qfr-file-delete-btn {
      padding: 2px; width: 16px; height: 16px; border: none; border-radius: 2px;
      background: #ff4d4f; color: #fff; cursor: pointer; font-size: 16px;
      display: flex; align-items: center; justify-content: center; transition: background 0.2s;
    }
    .qfr-file-delete-btn:hover { background: #f44336; }
    .qfr-drag-handle { color: #999; cursor: move; font-size: 16px; user-select: none; }
    .qfr-file-item-rename {
      display: flex; align-items: center; justify-content: center;
      gap: 12px; max-width: 100%; width: 100%;
    }
    .qfr-file-item-rename .qfr-file-name-original {
      flex: 1; color: #999; font-size: 14px; display: flex;
      align-items: center; gap: 8px; padding: 12px;
      background: #f5f5f5; border-radius: 8px; overflow: hidden; border: 1px solid #d7d7d7;
    }
    .qfr-file-item-rename .qfr-file-name-original span:last-child {
      flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .qfr-file-item-rename .qfr-file-index { color: #666; min-width: 30px; font-size: 14px; flex-shrink: 0; }
    .qfr-file-item-rename .qfr-arrow-icon {
      flex-shrink: 0; display: flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; color: #f44336; font-size: 18px; font-weight: 500;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .qfr-file-item-rename .qfr-file-name-new {
      flex: 1; color: #333; font-size: 14px; padding: 12px;
      background: #f5f5f5; border-radius: 8px; overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap; border: 1px solid #d7d7d7;
    }
    .qfr-stats-container { display: flex; align-items: center; gap: 16px; padding: 0; font-size: 13px; color: #666; }
    .qfr-stats-item { display: flex; align-items: center; }
    .qfr-stats-item strong { color: #2961D9; margin: 0 2px; }
    .qfr-modal-footer-content {
      display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 16px;
    }
    .qfr-footer-buttons-container { display: flex; align-items: center; gap: 8px; }
    .qfr-btn {
      padding: 4px 15px; height: 32px; font-size: 14px; border-radius: 6px;
      cursor: pointer; border: 1px solid #d9d9d9; background: #fff;
      color: rgba(0, 0, 0, 0.88); transition: all 0.2s;
    }
    .qfr-btn:hover { color: #2961D9; border-color: #2961D9; }
    .qfr-btn-primary {
      padding: 4px 15px; height: 32px; font-size: 14px; border-radius: 6px;
      cursor: pointer; border: 1px solid #2961D9; background: #2961D9;
      color: #fff; transition: all 0.2s;
    }
    .qfr-btn-primary:hover { background: #1d4bbf; border-color: #1d4bbf; }
    .qfr-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .qfr-toggle-button {
      padding: 6px 12px; background: #fff; border: 1px solid #d9d9d9;
      border-radius: 6px; cursor: pointer; font-size: 13px; color: #666;
      transition: all 0.2s; white-space: nowrap;
    }
    .qfr-toggle-button:hover { color: #2961D9; border-color: #2961D9; }
    .qfr-toggle-button.qfr-toggle-button-active {
      background: #2961D9; border-color: #2961D9; color: #fff;
    }
    .qfr-toggle-button.qfr-toggle-button-active:hover {
      background: #1d4bbf; border-color: #1d4bbf;
    }
    .separator { height: 1px; margin: 12px 0; border-bottom: 1px dashed #d9d9d9; }
    .qfr-modal-header-right { margin-left: auto; display: flex; align-items: center; }
    .qfr-tab-container {
      display: flex; gap: 4px; background: #f5f5f5; padding: 4px; border-radius: 8px;
    }
    .qfr-tab-item {
      padding: 6px 12px; font-size: 12px; color: #666; cursor: pointer;
      border-radius: 6px; transition: all 0.2s; user-select: none;
    }
    .qfr-tab-item:hover { color: #2961D9; }
    .qfr-tab-item.active { background: #fff; color: #2961D9; font-weight: 500; }
    .qfr-rename-config {
      padding: 16px; background: #f5f5f5; border-radius: 8px;
      margin-bottom: 12px; border: 1px solid #d7d7d7;
    }
    .qfr-rename-inputs-container { display: flex; gap: 12px; align-items: center; }
    .qfr-rename-config-input {
      flex: 1; padding: 8px 12px; border: 1px solid #d9d9d9;
      border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.2s;
    }
    .qfr-rename-config-input:focus { border-color: #2961D9; }
  `;

  // 注入样式
  GM_addStyle(MODAL_CSS);

  // ========================
  //  工具函数
  // ========================
  const Utils = {
    /** 等待元素出现 */
    waitForElement(selector, timeout = 10000) {
      return new Promise((resolve, reject) => {
        const el = document.querySelector(selector);
        if (el) {
          log(`[Utils] 元素已存在: ${selector}`);
          return resolve(el);
        }

        log(`[Utils] 等待元素出现: ${selector}`);
        const observer = new MutationObserver((_, obs) => {
          const el = document.querySelector(selector);
          if (el) {
            obs.disconnect();
            log(`[Utils] 元素已出现: ${selector}`);
            resolve(el);
          }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
          observer.disconnect();
          reject(new Error(`Element "${selector}" not found within ${timeout}ms`));
        }, timeout);
      });
    },

    /** 防抖 */
    debounce(fn, delay = 300) {
      let timer;
      return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
      };
    },
  };

  // ========================
  //  URL 解析
  // ========================
  function getCurrentDirId() {
    const hash = window.location.hash;
    const segments = hash.replace(/^#\/list\/all\/?/, '').split('/').filter(Boolean);
    if (segments.length === 0) {
      log('[URL] 无法解析目录ID，当前不在目录页面');
      return null;
    }
    const last = segments[segments.length - 1];
    const dirId = last.split('-')[0];
    log(`[URL] 解析目录ID: ${dirId}，完整hash: ${hash}`);
    return dirId;
  }

  // ========================
  //  API 请求
  // ========================
  const API = {
    /** 获取目录下的文件列表（自动翻页） */
    async getAllFiles(pdirFid, size = CONFIG.pageSize) {
      let allList = [];
      let page = 1;

      log(`[API] 开始获取文件列表，pdir_fid: ${pdirFid}`);

      while (true) {
        log(`[API] 请求第 ${page} 页...`);
        const data = await this.getFileList(pdirFid, page, size);

        const list = (data?.data?.list ?? [])
          .filter(item => item.file_type === 1)
          .map(({ fid, file_name, file_type, category, obj_category, format_type }) =>
            ({ fid, file_name, file_type, category, obj_category, format_type })
          );
        const metadata = data?.metadata ?? {};
        const { _count, _total } = metadata;

        log(`[API] 第 ${page} 页返回: 本页 ${_count} 条，累计 ${allList.length + list.length}/${_total} 条`);

        allList = allList.concat(list);

        // 当前页无数据或已获取全部，结束翻页
        if (_count === 0 || allList.length >= _total) {
          log(`[API] 翻页完成，共 ${allList.length} 条`);
          break;
        }

        page++;
      }

      return allList;
    },

    /** 获取单页文件列表 */
    getFileList(pdirFid, page = 1, size = CONFIG.pageSize) {
      return new Promise((resolve, reject) => {
        const params = new URLSearchParams({
          pr: 'ucpro',
          fr: 'pc',
          pdir_fid: pdirFid,
          _page: String(page),
          _size: String(size),
          _fetch_total: '1',
          _sort: 'file_name:asc',
        });
        const url = `https://drive-pc.quark.cn/1/clouddrive/file/sort?${params}`;
        log(`[API] GET ${url}`);

        GM_xmlhttpRequest({
          method: 'GET',
          url,
          responseType: 'json',
          onload(res) {
            if (res.status === 200) {
              log(`[API] 响应状态: ${res.status}`);
              resolve(res.response);
            } else {
              log(`[API] 请求失败，状态码: ${res.status}`);
              reject(new Error(`请求失败: ${res.status}`));
            }
          },
          onerror(err) {
            log(`[API] 请求出错:`, err);
            reject(err);
          },
        });
      });
    },

    /** 重命名文件 */
    renameFile(fid, newFileName) {
      return new Promise((resolve, reject) => {
        const url = 'https://drive-pc.quark.cn/1/clouddrive/file/rename?pr=ucpro&fr=pc';
        log(`[API] POST rename - fid: ${fid}, newFileName: ${newFileName}`);

        GM_xmlhttpRequest({
          method: 'POST',
          url,
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify({ fid, file_name: newFileName }),
          responseType: 'json',
          onload(res) {
            if (res.status === 200) {
              log(`[API] 重命名成功: ${newFileName}`);
              resolve(res.response);
            } else {
              log(`[API] 重命名失败，状态码: ${res.status}`);
              reject(new Error(`重命名失败: ${res.status}`));
            }
          },
          onerror(err) {
            log(`[API] 重命名请求出错:`, err);
            reject(err);
          },
        });
      });
    },
  };

  // ========================
  //  Modal 弹窗类
  // ========================
  class Modal {
    constructor(options = {}) {
      this.title = options.title || '';
      this.subtitle = options.subtitle || '';
      this.bodyContent = options.bodyContent || null;
      this.headerButtons = options.headerButtons || null;
      this.headerRight = options.headerRight || null;
      this.footerButtons = options.footerButtons || [];
      this.footerContent = options.footerContent || null;
      this.onClose = options.onClose || null;
      this.modal = null;
    }

    create() {
      const modal = document.createElement('div');
      modal.className = 'qfr-modal-overlay';

      const modalContent = document.createElement('div');
      modalContent.className = 'qfr-modal-content';

      const modalHeader = document.createElement('div');
      modalHeader.className = 'qfr-modal-header';

      const titleContainer = document.createElement('div');
      titleContainer.className = 'qfr-modal-title-container';

      const modalTitle = document.createElement('h3');
      modalTitle.textContent = this.title;
      modalTitle.className = 'qfr-modal-title';
      titleContainer.appendChild(modalTitle);

      if (this.subtitle) {
        const modalSubtitle = document.createElement('p');
        modalSubtitle.textContent = this.subtitle;
        modalSubtitle.className = 'qfr-modal-subtitle';
        titleContainer.appendChild(modalSubtitle);
      }

      modalHeader.appendChild(titleContainer);
      if (this.headerButtons) modalHeader.appendChild(this.headerButtons);
      if (this.headerRight) modalHeader.appendChild(this.headerRight);

      const modalBody = document.createElement('div');
      modalBody.className = 'qfr-modal-body';
      if (this.bodyContent) modalBody.appendChild(this.bodyContent);

      const modalFooter = document.createElement('div');
      modalFooter.className = 'qfr-modal-footer';
      if (this.footerContent) {
        modalFooter.appendChild(this.footerContent);
      } else {
        this.footerButtons.forEach(btn => modalFooter.appendChild(btn));
      }

      modalContent.appendChild(modalHeader);
      modalContent.appendChild(modalBody);
      modalContent.appendChild(modalFooter);
      modal.appendChild(modalContent);

      // 点击弹窗外部不关闭
      modal.onclick = (e) => { e.stopPropagation(); };

      this.modal = modal;
      return modal;
    }

    show() {
      if (!this.modal) this.create();
      document.body.appendChild(this.modal);
      this._escHandler = (e) => { if (e.key === 'Escape') this.close(); };
      document.addEventListener('keydown', this._escHandler);
    }

    close() {
      if (this.modal) { this.modal.remove(); this.modal = null; }
      if (this._escHandler) { document.removeEventListener('keydown', this._escHandler); this._escHandler = null; }
      if (this.onClose) this.onClose();
    }
  }

  // ========================
  //  按钮注入
  // ========================
  function updateButtonVisibility() {
    const btn = document.getElementById(CONFIG.buttonId);
    if (!btn) return;
    btn.style.display = selectedFiles.size > 0 ? '' : 'none';
  }

  function injectButton() {
    const dirId = getCurrentDirId();
    if (!dirId) return;

    const container = document.querySelector('.btn-operate .btn-main');
    if (!container || document.getElementById(CONFIG.buttonId)) return;

    log(`[Button] 注入按钮，当前目录ID: ${dirId}`);

    const btn = document.createElement('button');
    btn.id = CONFIG.buttonId;
    btn.className = 'ant-btn btn-file btn-file-primary upload-btn ant-btn-primary';
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: -2px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>批量重命名';
    btn.style.display = 'none'; // 默认隐藏，有选中时才显示
    btn.addEventListener('click', () => {
      if (selectedFiles.size === 0) return;
      showSortModal([...selectedFiles.values()]);
    });
    const dropdownTrigger = container.querySelector('.btn-create-folder');
    if (dropdownTrigger) {
      dropdownTrigger.before(btn);
    } else {
      container.prepend(btn);
    }
  }

  const debouncedInject = Utils.debounce(injectButton, CONFIG.debounceDelay);
  const debouncedBindCheckbox = Utils.debounce(bindCheckboxEvents, CONFIG.debounceDelay);

  // ========================
  //  文件缓存 & 选中状态管理
  // ========================
  let fileCache = new Map();       // fid -> 完整文件信息（全量缓存）
  let cachedDirId = null;           // 缓存对应的目录 ID
  let selectedFiles = new Map();    // fid -> { fid, file_name, category }
  let isUpdatingCache = false;      // 缓存更新锁

  /** 从缓存文件中提取所需字段 */
  function pickFileFields(file) {
    return {
      fid: file.fid,
      file_name: file.file_name,
      category: file.category,
    };
  }

  /** 确保文件缓存可用，缓存命中则跳过请求 */
  async function ensureFileCache() {
    const dirId = getCurrentDirId();
    if (!dirId) return;

    // 缓存命中（同目录）
    if (cachedDirId === dirId && fileCache.size > 0) {
      log(`[Cache] 缓存命中，目录: ${dirId}，共 ${fileCache.size} 个文件`);
      return;
    }

    // 切换目录，清空旧缓存
    if (cachedDirId !== dirId) {
      log(`[Cache] 目录变更 ${cachedDirId} → ${dirId}，清空旧缓存`);
      fileCache = new Map();
      selectedFiles = new Map();
      cachedDirId = dirId;
      updateButtonVisibility();
    }

    // 正在更新中，跳过
    if (isUpdatingCache) {
      log(`[Cache] 缓存更新中，跳过`);
      return;
    }

    isUpdatingCache = true;
    try {
      log(`[Cache] 开始获取全量文件列表，目录: ${dirId}`);
      const files = await API.getAllFiles(dirId);
      fileCache = new Map(files.map(f => [f.fid, f]));
      log(`[Cache] 全量缓存完成，共 ${fileCache.size} 个文件`);
    } catch (err) {
      log(`[Cache] 获取文件列表失败:`, err);
    } finally {
      isUpdatingCache = false;
    }
  }

  // ========================
  //  Checkbox 事件监听
  // ========================
  function bindCheckboxEvents() {
    // 全选 checkbox
    const headerCheckbox = document.querySelector('.ant-table-thead .ant-checkbox-input');
    if (headerCheckbox && !headerCheckbox.dataset.qfrBound) {
      headerCheckbox.dataset.qfrBound = '1';
      headerCheckbox.addEventListener('change', async (e) => {
        if (e.target.checked) {
          log(`[Checkbox] 全选触发`);
          await ensureFileCache();
          // 全选 = 缓存中所有文件，只保留所需字段
          selectedFiles = new Map([...fileCache].map(([k, v]) => [k, pickFileFields(v)]));
          log(`[Checkbox] 全选完成，共 ${selectedFiles.size} 个文件`);
          log([...selectedFiles.values()]);
        } else {
          log(`[Checkbox] 取消全选，清空选中列表`);
          selectedFiles = new Map();
        }
        updateButtonVisibility();
      });
    }

    // 每个文件的 checkbox
    const rowCheckboxes = document.querySelectorAll('.ant-table-tbody .ant-checkbox-input');
    rowCheckboxes.forEach(cb => {
      if (cb.dataset.qfrBound) return;
      cb.dataset.qfrBound = '1';
      cb.addEventListener('change', async (e) => {
        const row = e.target.closest('tr');
        const rowKey = row?.dataset.rowKey ?? '未知';
        const fileName = row?.querySelector('.filename-text')?.textContent?.trim() ?? '未知';
        if (e.target.checked) {
          // 优先从缓存获取完整信息，缓存未命中则用 DOM 信息
          const cached = fileCache.get(rowKey);
          if (cached) {
            selectedFiles.set(rowKey, pickFileFields(cached));
            log(`[Checkbox] 文件选中（缓存）- fid: ${rowKey}, 文件名: ${cached.file_name}，当前共 ${selectedFiles.size} 个`);
          } else {
            // 缓存未命中，先触发一次全量获取
            log(`[Checkbox] 文件选中（缓存未命中）- fid: ${rowKey}，触发全量获取`);
            await ensureFileCache();
            const info = fileCache.get(rowKey) || { fid: rowKey, file_name: fileName };
            selectedFiles.set(rowKey, pickFileFields(info));
            log(`[Checkbox] 文件选中 - fid: ${rowKey}, 文件名: ${info.file_name}，当前共 ${selectedFiles.size} 个`);
          }
        } else {
          selectedFiles.delete(rowKey);
          log(`[Checkbox] 文件取消 - fid: ${rowKey}, 文件名: ${fileName}，当前共 ${selectedFiles.size} 个`);
        }
        log([...selectedFiles.values()]);
        updateButtonVisibility();
      });
    });
  }

  // ========================
  //  弹窗 UI
  // ========================
  
  /** 创建切换按钮 */
  function createToggleButton(text, defaultActive = false, onChange = null) {
    const button = document.createElement('button');
    button.className = 'qfr-toggle-button';
    button.dataset.active = String(defaultActive);
    button.textContent = text;

    if (defaultActive) button.classList.add('qfr-toggle-button-active');

    button.onclick = () => {
      const isActive = button.dataset.active === 'true';
      const newState = !isActive;
      button.dataset.active = String(newState);
      button.classList.toggle('qfr-toggle-button-active', newState);
      if (onChange) onChange(newState);
    };

    return button;
  }

  /** 更新文件序号 */
  function updateFileIndices(fileList) {
    const items = fileList.querySelectorAll('.qfr-file-item');
    items.forEach((item, i) => {
      const indexEl = item.querySelector('.qfr-file-index');
      if (indexEl) indexEl.textContent = `${i + 1}.`;
    });
  }

  /** 更新统计信息 */
  function updateStats(fileList, statsContainer) {
    const visibleItems = fileList.querySelectorAll('.qfr-file-item:not([style*="display: none"])');
    statsContainer.innerHTML = `<span class="qfr-stats-item">共 <strong>${visibleItems.length}</strong> 个文件</span>`;
  }

  /** 获取排序后的文件列表 */
  function getOrderedFiles(fileList, originalFiles) {
    const items = fileList.querySelectorAll('.qfr-file-item');
    const ordered = [];
    items.forEach(item => {
      const fid = item.dataset.fid;
      const file = originalFiles.find(f => f.fid === fid);
      if (file) ordered.push(file);
    });
    return ordered;
  }

  // ---- 文件排序弹窗 ----
  let sortModal = null;
  let renameModal = null;

  function showSortModal(files) {
    const fileList = document.createElement('div');
    fileList.className = 'qfr-file-list';

    // 默认按文件名升序
    const sortedFiles = [...files].sort((a, b) => a.file_name.localeCompare(b.file_name, 'zh-CN'));

    let draggedItem = null;
    const fragment = document.createDocumentFragment();

    sortedFiles.forEach((file, index) => {
      const fileItem = document.createElement('div');
      fileItem.className = 'qfr-file-item';
      fileItem.dataset.fid = file.fid;
      fileItem.dataset.category = String(file.category || 0);
      fileItem.draggable = true;

      fileItem.addEventListener('dragstart', (e) => {
        draggedItem = fileItem;
        fileItem.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', file.fid);
      });
      fileItem.addEventListener('dragend', () => {
        draggedItem = null;
        fileItem.classList.remove('dragging');
        fileList.querySelectorAll('.qfr-file-item').forEach(item => { item.style.transform = ''; });
        updateFileIndices(fileList);
      });
      fileItem.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (draggedItem && draggedItem !== fileItem) {
          const rect = fileItem.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (e.clientY < midY) {
            fileList.insertBefore(draggedItem, fileItem);
          } else {
            fileList.insertBefore(draggedItem, fileItem.nextSibling);
          }
        }
      });
      fileItem.addEventListener('dragenter', (e) => {
        e.preventDefault();
        if (draggedItem && draggedItem !== fileItem) fileItem.style.transform = 'translateY(4px)';
      });
      fileItem.addEventListener('dragleave', () => {
        if (draggedItem && draggedItem !== fileItem) fileItem.style.transform = '';
      });
      fileItem.addEventListener('drop', (e) => { e.preventDefault(); fileItem.style.transform = ''; });

      const dragHandle = document.createElement('span');
      dragHandle.innerHTML = '⋮⋮';
      dragHandle.className = 'qfr-drag-handle';

      const fileIndex = document.createElement('span');
      fileIndex.textContent = `${index + 1}.`;
      fileIndex.className = 'qfr-file-index';

      const fileName = document.createElement('span');
      fileName.textContent = file.file_name;
      fileName.className = 'qfr-file-name';

      const category = document.createElement('span');
      category.textContent = CONFIG.categoryMap[file.category] || '未知';
      category.className = 'qfr-file-category';

      const deleteBtn = document.createElement('button');
      deleteBtn.innerHTML = '×';
      deleteBtn.className = 'qfr-file-delete-btn';
      deleteBtn.onmousedown = (e) => e.stopPropagation();
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        fileItem.remove();
        updateFileIndices(fileList);
        updateStats(fileList, statsContainer);
      };

      fileItem.appendChild(dragHandle);
      fileItem.appendChild(fileIndex);
      fileItem.appendChild(fileName);
      fileItem.appendChild(category);
      fileItem.appendChild(deleteBtn);
      fragment.appendChild(fileItem);
    });

    fileList.appendChild(fragment);

    // 排序按钮
    const sortButton = createToggleButton('文件名降序', false, (isChecked) => {
      const fileItems = Array.from(fileList.querySelectorAll('.qfr-file-item'));
      fileItems.sort((a, b) => {
        const nameA = a.querySelector('.qfr-file-name').textContent;
        const nameB = b.querySelector('.qfr-file-name').textContent;
        return isChecked ? nameB.localeCompare(nameA, 'zh-CN') : nameA.localeCompare(nameB, 'zh-CN');
      });
      fileItems.forEach(item => fileList.appendChild(item));
      updateFileIndices(fileList);
    });

    // 过滤视频按钮
    const filterVideoButton = createToggleButton('仅视频', false, (isChecked) => {
      if (isChecked) filterImageButton.classList.remove('qfr-toggle-button-active');
      filterImageButton.dataset.active = 'false';
      const fileItems = fileList.querySelectorAll('.qfr-file-item');
      fileItems.forEach(item => {
        const cat = item.dataset.category;
        item.style.display = (isChecked && cat !== '1') ? 'none' : 'flex';
      });
      updateFileIndices(fileList);
      updateStats(fileList, statsContainer);
    });

    // 过滤图片按钮
    const filterImageButton = createToggleButton('仅图片', false, (isChecked) => {
      if (isChecked) filterVideoButton.classList.remove('qfr-toggle-button-active');
      filterVideoButton.dataset.active = 'false';
      const fileItems = fileList.querySelectorAll('.qfr-file-item');
      fileItems.forEach(item => {
        const cat = item.dataset.category;
        item.style.display = (isChecked && cat !== '3') ? 'none' : 'flex';
      });
      updateFileIndices(fileList);
      updateStats(fileList, statsContainer);
    });

    const headerButtonsContainer = document.createElement('div');
    headerButtonsContainer.className = 'qfr-button-container-inner';
    headerButtonsContainer.appendChild(sortButton);
    headerButtonsContainer.appendChild(filterVideoButton);
    headerButtonsContainer.appendChild(filterImageButton);

    const statsContainer = document.createElement('div');
    statsContainer.className = 'qfr-stats-container';
    updateStats(fileList, statsContainer);

    const nextBtn = document.createElement('button');
    nextBtn.textContent = '下一步';
    nextBtn.className = 'qfr-btn-primary';
    nextBtn.onclick = () => {
      const orderedFiles = getOrderedFiles(fileList, files);
      log(`[Modal] 排序后文件列表:`, orderedFiles);
      sortModal.close();
      showRenameModal(orderedFiles);
    };

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '取消';
    closeBtn.className = 'qfr-btn';
    closeBtn.onclick = () => sortModal.close();

    const footerButtonsContainer = document.createElement('div');
    footerButtonsContainer.className = 'qfr-footer-buttons-container';
    footerButtonsContainer.appendChild(closeBtn);
    footerButtonsContainer.appendChild(nextBtn);

    const footerContent = document.createElement('div');
    footerContent.className = 'qfr-modal-footer-content';
    footerContent.appendChild(statsContainer);
    footerContent.appendChild(footerButtonsContainer);

    sortModal = new Modal({
      title: '文件排序',
      subtitle: '拖动调整顺序，然后点击下一步',
      bodyContent: fileList,
      headerButtons: headerButtonsContainer,
      footerContent: footerContent,
    });

    sortModal.show();
  }

  // ---- 重命名预览弹窗 ----
  const RENAME_TYPES = [
    { key: 'sequence', label: '按序号重命名' },
    { key: 'append', label: '追加重命名' },
    { key: 'replace', label: '查找替换' },
    { key: 'regex', label: '正则替换' },
    { key: 'format', label: '格式替换' },
  ];

  function showRenameModal(files) {
    const bodyContainer = document.createElement('div');
    bodyContainer.className = 'qfr-modal-body-container';

    // 配置区域（灰色背景容器）
    const configArea = document.createElement('div');
    configArea.className = 'qfr-rename-config';

    // 分隔线
    const separator = document.createElement('div');
    separator.className = 'separator';

    // 文件列表
    const fileList = document.createElement('div');
    fileList.className = 'qfr-file-list';

    const fragment = document.createDocumentFragment();

    files.forEach((file, index) => {
      const fileItem = document.createElement('div');
      fileItem.className = 'qfr-file-item-rename';
      fileItem.dataset.fid = file.fid;
      fileItem.dataset.originalFileName = file.file_name;
      fileItem.dataset.index = String(index);

      const originalName = document.createElement('div');
      originalName.className = 'qfr-file-name-original';

      const fileIndex = document.createElement('span');
      fileIndex.textContent = `${index + 1}.`;
      fileIndex.className = 'qfr-file-index';

      const fileName = document.createElement('span');
      fileName.textContent = file.file_name;

      originalName.appendChild(fileIndex);
      originalName.appendChild(fileName);

      const arrowIcon = document.createElement('div');
      arrowIcon.className = 'qfr-arrow-icon';
      arrowIcon.innerHTML = '→';

      const newName = document.createElement('div');
      newName.className = 'qfr-file-name-new';
      newName.textContent = file.file_name;

      fileItem.appendChild(originalName);
      fileItem.appendChild(arrowIcon);
      fileItem.appendChild(newName);
      fragment.appendChild(fileItem);
    });

    fileList.appendChild(fragment);

    // 组装 body: configArea + separator + fileList
    bodyContainer.appendChild(configArea);
    bodyContainer.appendChild(separator);
    bodyContainer.appendChild(fileList);

    // Tab 容器（放在 header 右侧）
    const tabContainer = document.createElement('div');
    tabContainer.className = 'qfr-tab-container';

    let activeType = 'sequence'; // 默认选中第一个
    const tabItems = [];

    RENAME_TYPES.forEach(({ key, label }, index) => {
      const tabItem = document.createElement('div');
      tabItem.className = 'qfr-tab-item' + (index === 0 ? ' active' : '');
      tabItem.dataset.type = key;
      tabItem.textContent = label;

      tabItem.onclick = () => {
        tabItems.forEach(t => t.classList.remove('active'));
        tabItem.classList.add('active');
        activeType = key;
        updateConfigArea(key);
        updateRenamePreview();
        log(`[Modal] 切换重命名类型: ${label}`);
      };

      tabItems.push(tabItem);
      tabContainer.appendChild(tabItem);
    });

    const headerRight = document.createElement('div');
    headerRight.className = 'qfr-modal-header-right';
    headerRight.appendChild(tabContainer);

    // 根据类型更新配置区域
    function updateConfigArea(type) {
      configArea.innerHTML = '';
      const inputsContainer = document.createElement('div');
      inputsContainer.className = 'qfr-rename-inputs-container';

      switch (type) {
        case 'sequence': {
          const prefixInput = document.createElement('input');
          prefixInput.type = 'text';
          prefixInput.className = 'qfr-rename-config-input';
          prefixInput.placeholder = '追加前缀';

          const numberInput = document.createElement('input');
          numberInput.type = 'number';
          numberInput.className = 'qfr-rename-config-input';
          numberInput.placeholder = '默认序号';

          const suffixInput = document.createElement('input');
          suffixInput.type = 'text';
          suffixInput.className = 'qfr-rename-config-input';
          suffixInput.placeholder = '追加后缀';

          inputsContainer.appendChild(prefixInput);
          inputsContainer.appendChild(numberInput);
          inputsContainer.appendChild(suffixInput);
          break;
        }
        case 'append': {
          const prefixInput = document.createElement('input');
          prefixInput.type = 'text';
          prefixInput.className = 'qfr-rename-config-input';
          prefixInput.placeholder = '追加前缀';

          const suffixInput = document.createElement('input');
          suffixInput.type = 'text';
          suffixInput.className = 'qfr-rename-config-input';
          suffixInput.placeholder = '追加后缀';

          inputsContainer.appendChild(prefixInput);
          inputsContainer.appendChild(suffixInput);
          break;
        }
        case 'replace': {
          const findInput = document.createElement('input');
          findInput.type = 'text';
          findInput.className = 'qfr-rename-config-input';
          findInput.placeholder = '查找内容';

          const replaceInput = document.createElement('input');
          replaceInput.type = 'text';
          replaceInput.className = 'qfr-rename-config-input';
          replaceInput.placeholder = '替换内容';

          inputsContainer.appendChild(findInput);
          inputsContainer.appendChild(replaceInput);
          break;
        }
        case 'regex': {
          const regexInput = document.createElement('input');
          regexInput.type = 'text';
          regexInput.className = 'qfr-rename-config-input';
          regexInput.placeholder = '正则表达式';

          const replaceInput = document.createElement('input');
          replaceInput.type = 'text';
          replaceInput.className = 'qfr-rename-config-input';
          replaceInput.placeholder = '替换内容';

          inputsContainer.appendChild(regexInput);
          inputsContainer.appendChild(replaceInput);
          break;
        }
        case 'format': {
          const suffixInput = document.createElement('input');
          suffixInput.type = 'text';
          suffixInput.className = 'qfr-rename-config-input';
          suffixInput.placeholder = '新格式名';

          inputsContainer.appendChild(suffixInput);
          break;
        }
      }

      configArea.appendChild(inputsContainer);

      // 绑定实时预览
      inputsContainer.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', updateRenamePreview);
      });
    }

    // 更新重命名预览
    function updateRenamePreview() {
      const fileItems = fileList.querySelectorAll('.qfr-file-item-rename');
      const inputs = configArea.querySelectorAll('.qfr-rename-config-input');

      fileItems.forEach(item => {
        const original = item.dataset.originalFileName;
        const idx = Number(item.dataset.index);
        const newNameEl = item.querySelector('.qfr-file-name-new');
        if (!newNameEl) return;

        if (!activeType) {
          newNameEl.textContent = original;
          return;
        }

        let result = original;
        const ext = original.includes('.') ? '.' + original.split('.').pop() : '';
        const nameWithoutExt = ext ? original.slice(0, -ext.length) : original;

        switch (activeType) {
          case 'sequence': {
            const prefix = inputs[0]?.value || '';
            const startNumberStr = inputs[1]?.value || '';
            const suffix = inputs[2]?.value || '';

            let startNumber = 1;
            let paddingLength = 0;

            if (startNumberStr) {
              const parsedNumber = parseInt(startNumberStr);
              if (parsedNumber === 0) {
                paddingLength = startNumberStr.length;
                startNumber = 1;
              } else {
                startNumber = parsedNumber;
                paddingLength = startNumberStr.length;
              }
            }

            const sequenceNumber = startNumber + idx;
            const numberPart = paddingLength > 0
              ? sequenceNumber.toString().padStart(paddingLength, '0')
              : sequenceNumber.toString();
            result = prefix + numberPart + suffix + ext;
            break;
          }
          case 'append': {
            const prefix = inputs[0]?.value || '';
            const suffix = inputs[1]?.value || '';
            result = prefix + nameWithoutExt + suffix + ext;
            break;
          }
          case 'replace': {
            const search = inputs[0]?.value || '';
            const replace = inputs[1]?.value || '';
            if (search) result = original.split(search).join(replace);
            break;
          }
          case 'regex': {
            const pattern = inputs[0]?.value || '';
            const replacement = inputs[1]?.value || '';
            if (pattern) {
              try { result = original.replace(new RegExp(pattern, 'g'), replacement); }
              catch (e) { /* 无效正则 */ }
            }
            break;
          }
          case 'format': {
          const newExt = inputs[0]?.value || '';
          if (newExt) {
            result = nameWithoutExt + '.' + newExt.replace(/^\./, '');
          }
          break;
        }
        }

        newNameEl.textContent = result;
      });
    }

    // 初始化配置区域（默认选中按序号重命名）
    updateConfigArea('sequence');

    const statsContainer = document.createElement('div');
    statsContainer.className = 'qfr-stats-container';
    statsContainer.innerHTML = `<span class="qfr-stats-item">共 <strong>${files.length}</strong> 个文件</span>`;

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '上一步';
    prevBtn.className = 'qfr-btn';
    prevBtn.onclick = () => {
      renameModal.close();
      showSortModal(files);
    };

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '确定';
    confirmBtn.className = 'qfr-btn-primary';
    let hasExecuted = false;
    confirmBtn.onclick = async () => {
      // 已执行过，关闭弹窗并刷新页面
      if (hasExecuted) {
        log('[Modal] 重命名已完成，关闭弹窗并刷新页面');
        renameModal.close();
        window.location.reload();
        return;
      }

      log(`[Modal] 开始执行重命名，类型: ${activeType}`);
      prevBtn.style.display = 'none';

      // 禁用输入框
      const inputs = configArea.querySelectorAll('input');
      inputs.forEach(input => { input.disabled = true; });

      // 收集重命名列表
      const renamedFiles = [];
      const fileItems = fileList.querySelectorAll('.qfr-file-item-rename');
      fileItems.forEach(item => {
        const fid = item.dataset.fid;
        const originalFileName = item.dataset.originalFileName;
        const newNameEl = item.querySelector('.qfr-file-name-new');
        const newFileName = newNameEl ? newNameEl.textContent : originalFileName;
        renamedFiles.push({ fid, originalFileName, newFileName });
      });
      log(`[Modal] 待重命名文件数量: ${renamedFiles.length}`);

      try {
        confirmBtn.disabled = true;
        confirmBtn.textContent = '重命名中...';

        let successCount = 0;
        let failCount = 0;

        for (const fileInfo of renamedFiles) {
          log(`[Modal] 正在重命名: ${fileInfo.originalFileName} -> ${fileInfo.newFileName}`);

          const fileItem = fileList.querySelector(`.qfr-file-item-rename[data-fid="${fileInfo.fid}"]`);
          const newNameElement = fileItem?.querySelector('.qfr-file-name-new');

          // 文件名未变，视为成功
          if (fileInfo.originalFileName === fileInfo.newFileName) {
            if (newNameElement) {
              newNameElement.style.backgroundColor = '#dfffcc';
              newNameElement.style.border = '1px solid #84d75b';
            }
            successCount++;
            if (fileItem) fileItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            continue;
          }

          // 调用重命名接口
          try {
            await API.renameFile(fileInfo.fid, fileInfo.newFileName);
            await new Promise(r => setTimeout(r, 100));
            if (newNameElement) {
              newNameElement.style.backgroundColor = '#dfffcc';
              newNameElement.style.border = '1px solid #84d75b';
            }
            successCount++;
          } catch (err) {
            log(`[Modal] 重命名失败: ${fileInfo.originalFileName}`, err);
            if (newNameElement) {
              newNameElement.style.backgroundColor = '#ffc4c4';
              newNameElement.style.border = '1px solid #d75b5b';
            }
            failCount++;
          }

          if (fileItem) fileItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        log(`[Modal] 重命名完成，成功: ${successCount}，失败: ${failCount}`);
        statsContainer.innerHTML = `<span class="qfr-stats-item">共 <strong>${renamedFiles.length}</strong> 个文件，成功 <strong>${successCount}</strong>，失败 <strong>${failCount}</strong></span>`;

        hasExecuted = true;
        confirmBtn.disabled = false;
        confirmBtn.textContent = '关闭';
      } catch (error) {
        log(`[Modal] 重命名异常:`, error);
        confirmBtn.disabled = false;
        confirmBtn.textContent = '确定';

        inputs.forEach(input => { input.disabled = false; });
      }
    };

    const footerButtonsContainer = document.createElement('div');
    footerButtonsContainer.className = 'qfr-footer-buttons-container';
    footerButtonsContainer.appendChild(prevBtn);
    footerButtonsContainer.appendChild(confirmBtn);

    const footerContent = document.createElement('div');
    footerContent.className = 'qfr-modal-footer-content';
    footerContent.appendChild(statsContainer);
    footerContent.appendChild(footerButtonsContainer);

    renameModal = new Modal({
      title: '批量重命名',
      bodyContent: bodyContainer,
      headerRight: headerRight,
      footerContent: footerContent,
    });

    renameModal.show();
  }

  // ========================
  //  核心逻辑
  // ========================
  async function init() {
    log('[Init] 脚本启动');

    // 首次注入
    await Utils.waitForElement('.btn-operate .btn-main');
    injectButton();
    bindCheckboxEvents();

    // 监听 DOM 变化，SPA 切换目录后自动重新注入（防抖 300ms）
    const observer = new MutationObserver(() => {
      debouncedInject();
      debouncedBindCheckbox();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    log('[Init] MutationObserver 已启动');
  }

  init();
})();
