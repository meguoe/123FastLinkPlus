// ==UserScript==
// @name         云盘批量重命名助手 | 支持123云盘、夸克网盘、光鸭云盘
// @name:en      CloudDriveFastRename
// @namespace    meguoe
// @version      1.0.5
// @description  云盘批量重命名助手，支持123云盘、夸克网盘、光鸭云盘，支持按序号、追加、查找替换、正则替换、格式替换等多种重命名模式，提供拖拽排序、实时预览、过滤视频/图片等功能
// @author       meguoe@163.com
// @license      Apache-2.0
// @match        *://*.123pan.com/*
// @match        *://*.123pan.cn/*
// @match        *://*.123684.com/*
// @match        *://*.123865.com/*
// @match        https://pan.quark.cn/*
// @match        https://drive.quark.cn/*
// @match        https://guangyapan.com/*
// @match        https://*.guangyapan.com/*
// @icon         https://img.remit.ee/api/file/BQACAgUAAyEGAASHRsPbAAETtahp8FnWo7fqBhJAv2tAUhxcgDrc2QACQSEAAgYIiVcf7ydSVVOwYDsE.png
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      *
// @run-at       document-idle
// @tag          123 夸克 光鸭 云盘 网盘 123云盘 夸克网盘 光鸭云盘 批量重命名助手 CloudDriveFastRename
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  // ========================
  //  日志工具
  // ========================
  const DEBUG = false;
  const LOG_TAG = '%c[CloudDriveFastRename]%c';
  const LOG_STYLE = 'color:#e74c3c;font-weight:bold';
  const LOG_SUB_STYLE = 'color:#3498db';

  function log(...args) {
    if (DEBUG) console.log(LOG_TAG, LOG_STYLE, '', LOG_SUB_STYLE, ...args);
  }

  // ========================
  //  工具函数
  // ========================
  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function waitForElement(selector, timeout = 10000) {
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
  }

  // ========================
  //  平台检测
  // ========================
  function detectPlatform() {
    const host = window.location.hostname;
    if (/123pan\.com|123pan\.cn|123684\.com|123865\.com/.test(host)) {
      return '123';
    }
    if (/pan\.quark\.cn|drive\.quark\.cn/.test(host)) {
      return 'quark';
    }
    if (/guangyapan\.com/.test(host)) {
      return 'guangya';
    }
    return null;
  }

  // ========================
  //  CSS 样式（统一 cfr- 前缀）
  // ========================
  const CSS_STYLES = `
    .cfr-button-container {
      position: relative;
      display: none;
    }
    .cfr-modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 9999;
    }
    .cfr-modal-content {
      background: #fff; border-radius: 20px;
      width: 70vw; height: 80vh;
      display: flex; font-size: 14px; flex-direction: column;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .cfr-modal-header {
      padding: 16px 20px; border-bottom: 1px solid #e8e8e8;
      display: flex; justify-content: space-between; align-items: center;
    }
    .cfr-modal-title-container {
      display: flex; flex-direction: row; align-items: baseline; gap: 12px;
    }
    .cfr-modal-title { margin: 0; font-size: 16px; font-weight: 500; color: #333; }
    .cfr-modal-subtitle { margin: 0; font-size: 12px; color: #999; }
    .cfr-modal-body { padding: 20px; overflow-y: auto; flex: 1; }
    .cfr-modal-footer {
      padding: 16px 20px; border-top: 1px solid #e8e8e8;
      display: flex; justify-content: flex-end; gap: 12px;
    }
    .cfr-modal-header-right { margin-left: auto; display: flex; align-items: center; }
    .cfr-button-container-inner { display: flex; gap: 12px; align-items: center; }
    .cfr-file-list { display: flex; flex-direction: column; gap: 8px; max-width: 100%; width: 100%; overflow-x: hidden; }
    .cfr-file-item {
      display: flex; align-items: center; padding: 12px;
      background: #f5f5f5; border-radius: 8px;
      transition: background 0.2s, transform 0.2s;
      cursor: move; gap: 12px; border: 1px solid #d7d7d7;
    }
    .cfr-file-item:hover { background: #e8e8e8; }
    .cfr-file-item.dragging { opacity: 0.5; transform: scale(0.98); }
    .cfr-file-index { color: rgb(51, 51, 51); min-width: 30px; font-size: 14px; }
    .cfr-file-name { flex: 1; color: #333; word-break: break-all; }
    .cfr-file-extra { color: #999; font-size: 12px; min-width: 50px; text-align: center; }
    .cfr-file-delete-btn {
      padding: 2px; width: 16px; height: 16px; border: none; border-radius: 2px;
      background: #ff4d4f; color: #fff; cursor: pointer; font-size: 16px;
      display: flex; align-items: center; justify-content: center; transition: background 0.2s;
    }
    .cfr-file-delete-btn:hover { background: #f44336; }
    .cfr-drag-handle { color: #999; cursor: move; font-size: 16px; user-select: none; }
    .cfr-file-item-rename {
      display: flex; align-items: center; justify-content: center;
      gap: 12px; max-width: 100%; width: 100%;
    }
    .cfr-file-item-rename .cfr-file-name-original {
      flex: 1; color: #999; font-size: 14px; display: flex;
      align-items: center; gap: 8px; padding: 12px;
      background: #f5f5f5; border-radius: 8px; overflow: hidden; border: 1px solid #d7d7d7;
    }
    .cfr-file-item-rename .cfr-file-name-original span:last-child {
      flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .cfr-file-item-rename .cfr-file-index { color: #666; min-width: 30px; font-size: 14px; flex-shrink: 0; }
    .cfr-file-item-rename .cfr-arrow-icon {
      flex-shrink: 0; display: flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; color: #f44336; font-size: 18px; font-weight: 500;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .cfr-file-item-rename .cfr-file-name-new {
      flex: 1; color: #333; font-size: 14px; padding: 12px;
      background: #f5f5f5; border-radius: 8px; overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap; border: 1px solid #d7d7d7;
    }
    .cfr-stats-container { display: flex; align-items: center; gap: 16px; padding: 0; font-size: 13px; color: #666; }
    .cfr-stats-item { display: flex; align-items: center; }
    .cfr-stats-item strong { color: #2961D9; margin: 0 2px; }
    .cfr-modal-footer-content {
      display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 16px;
    }
    .cfr-footer-buttons-container { display: flex; align-items: center; gap: 8px; }
    .cfr-btn {
      padding: 4px 15px; height: 32px; font-size: 14px; border-radius: 6px;
      cursor: pointer; border: 1px solid #d9d9d9; background: #fff;
      color: rgba(0, 0, 0, 0.88); transition: all 0.2s;
    }
    .cfr-btn:hover { color: #2961D9; border-color: #2961D9; }
    .cfr-btn-primary {
      padding: 4px 15px; height: 32px; font-size: 14px; border-radius: 6px;
      cursor: pointer; border: 1px solid #2961D9; background: #2961D9;
      color: #fff; transition: all 0.2s;
    }
    .cfr-btn-primary:hover { background: #1d4bbf; border-color: #1d4bbf; }
    .cfr-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .cfr-toggle-button {
      padding: 6px 12px; background: #fff; border: 1px solid #d9d9d9;
      border-radius: 6px; cursor: pointer; font-size: 13px; color: #666;
      transition: all 0.2s; white-space: nowrap;
    }
    .cfr-toggle-button:hover { color: #2961D9; border-color: #2961D9; }
    .cfr-toggle-button.cfr-toggle-button-active {
      background: #2961D9; border-color: #2961D9; color: #fff;
    }
    .cfr-toggle-button.cfr-toggle-button-active:hover {
      background: #1d4bbf; border-color: #1d4bbf;
    }
    .cfr-checkbox-button {
      padding: 6px 10px; background: #fff; border: 1px solid #d9d9d9;
      border-radius: 8px; cursor: pointer; font-size: 12px; color: #666;
      transition: all 0.2s; display: flex; align-items: center; gap: 8px;
    }
    .cfr-checkbox-button:hover,
    .cfr-checkbox-button[data-checked="true"] {
      border-color: #2961D9; color: #2961D9;
    }
    .cfr-checkbox-input {
      cursor: pointer; pointer-events: none;
    }
    .cfr-checkbox-text {
      padding: 0; font-size: 13px; font-weight: 500; margin-left: 6px; color: #919191;
    }
    .cfr-checkbox-button[data-checked="true"] .cfr-checkbox-text {
      color: #2961D9;
    }
    .cfr-tab-container {
      display: flex; gap: 4px; background: #f5f5f5; padding: 4px; border-radius: 8px;
    }
    .cfr-tab-item {
      padding: 6px 12px; font-size: 12px; color: #666; cursor: pointer;
      border-radius: 6px; transition: all 0.2s; user-select: none;
    }
    .cfr-tab-item:hover { color: #2961D9; }
    .cfr-tab-item.active { background: #fff; color: #2961D9; font-weight: 500; }
    .cfr-rename-config {
      padding: 16px; background: #f5f5f5; border-radius: 8px;
      margin-bottom: 12px; border: 1px solid #d7d7d7;
    }
    .cfr-rename-inputs-container { display: flex; gap: 12px; align-items: center; }
    .cfr-rename-config-input {
      flex: 1; padding: 8px 12px; border: 1px solid #d9d9d9;
      border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.2s;
    }
    .cfr-rename-config-input:focus { border-color: #2961D9; }
  `;

  // 注入样式
  if (typeof GM_addStyle === 'function') {
    GM_addStyle(CSS_STYLES);
  } else {
    const styleElement = document.createElement('style');
    styleElement.textContent = CSS_STYLES;
    document.head.appendChild(styleElement);
  }

  // Toast 样式
  const TOAST_CSS = `
    .cfr-toast-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.15); z-index: 99998;
      animation: cfr-fade-in 0.2s ease;
    }
    .cfr-toast-overlay.cfr-toast-out { animation: cfr-fade-out 0.2s ease forwards; }
    @keyframes cfr-fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes cfr-fade-out { from { opacity: 1; } to { opacity: 0; } }
    .cfr-toast-container {
      position: fixed; top: 20px; right: 20px; z-index: 99999;
      display: flex; flex-direction: column; gap: 8px; pointer-events: none;
    }
    .cfr-toast-container.cfr-toast-center {
      top: 0; left: 0; right: 0; bottom: 0;
      justify-content: center; align-items: center;
    }
    .cfr-toast {
      padding: 10px 16px; border-radius: 8px; font-size: 13px; color: #fff;
      background: rgba(0, 0, 0, 0.75); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: cfr-toast-in 0.3s ease; pointer-events: auto; max-width: 320px;
      display: flex; align-items: center; gap: 8px;
    }
    .cfr-toast.cfr-toast-out { animation: cfr-toast-out 0.3s ease forwards; }
    .cfr-toast-icon { font-size: 16px; flex-shrink: 0; }
    .cfr-toast-icon-loading { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: cfr-spin 0.6s linear infinite; }
    @keyframes cfr-spin { to { transform: rotate(360deg); } }
    .cfr-toast-body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .cfr-toast-title { font-size: 13px; font-weight: 500; line-height: 1.4; }
    .cfr-toast-desc { font-size: 12px; color: rgba(255,255,255,0.7); line-height: 1.3; }
    .cfr-toast.cfr-toast-center-mode {
      flex-direction: column; align-items: center; gap: 14px;
      padding: 24px 32px; max-width: 220px; text-align: center;
      animation: cfr-toast-in-center 0.3s ease;
    }
    .cfr-toast.cfr-toast-center-mode.cfr-toast-out { animation: cfr-toast-out-center 0.3s ease forwards; }
    .cfr-toast-center-mode .cfr-toast-icon { font-size: 28px; }
    .cfr-toast-center-mode .cfr-toast-icon-loading { width: 28px; height: 28px; border-width: 3px; }
    .cfr-toast-center-mode .cfr-toast-desc { font-size: 14px; color: rgba(255,255,255,0.9); }
    @keyframes cfr-toast-in-center { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
    @keyframes cfr-toast-out-center { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.9); } }
    @keyframes cfr-toast-in { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes cfr-toast-out { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(40px); } }
  `;
  if (typeof GM_addStyle === 'function') {
    GM_addStyle(TOAST_CSS);
  } else {
    const toastStyle = document.createElement('style');
    toastStyle.textContent = TOAST_CSS;
    document.head.appendChild(toastStyle);
  }

  // Toast 提示函数
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  function showToast(title, description = '', duration = 3000, options = {}) {
    const isCenter = options.center || false;
    const container = document.createElement('div');
    container.className = 'cfr-toast-container' + (isCenter ? ' cfr-toast-center' : '');
    document.body.appendChild(container);

    let overlay = null;
    if (isCenter) {
      overlay = document.createElement('div');
      overlay.className = 'cfr-toast-overlay';
      document.body.appendChild(overlay);
    }

    const toast = document.createElement('div');
    toast.className = 'cfr-toast' + (isCenter ? ' cfr-toast-center-mode' : '');
    const icon = options.icon || 'ℹ️';
    const minDuration = options.minDuration || 0;
    const descHtml = description ? `<span class="cfr-toast-desc">${escapeHtml(description)}</span>` : '';
    toast.innerHTML = `<span class="cfr-toast-icon">${icon}</span><div class="cfr-toast-body"><span class="cfr-toast-title">${escapeHtml(title)}</span>${descHtml}</div>`;
    container.appendChild(toast);

    const startTime = Date.now();
    let timer = null;
    const dismiss = () => {
      if (timer) { clearTimeout(timer); timer = null; }
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDuration - elapsed);
      const doDismiss = () => {
        toast.classList.add('cfr-toast-out');
        toast.addEventListener('animationend', () => {
          toast.remove();
          container.remove();
        });
        if (overlay) {
          overlay.classList.add('cfr-toast-out');
          overlay.addEventListener('animationend', () => overlay.remove());
        }
      };
      if (remaining > 0) {
        timer = setTimeout(doDismiss, remaining);
      } else {
        doDismiss();
      }
    };

    if (duration > 0) {
      timer = setTimeout(dismiss, duration);
    }

    return dismiss;
  }

  // ========================
  //  Modal 弹窗类（共享）
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
      modal.className = 'cfr-modal-overlay';

      const modalContent = document.createElement('div');
      modalContent.className = 'cfr-modal-content';

      const modalHeader = document.createElement('div');
      modalHeader.className = 'cfr-modal-header';

      const titleContainer = document.createElement('div');
      titleContainer.className = 'cfr-modal-title-container';

      const modalTitle = document.createElement('h3');
      modalTitle.textContent = this.title;
      modalTitle.className = 'cfr-modal-title';
      titleContainer.appendChild(modalTitle);

      if (this.subtitle) {
        const modalSubtitle = document.createElement('p');
        modalSubtitle.textContent = this.subtitle;
        modalSubtitle.className = 'cfr-modal-subtitle';
        titleContainer.appendChild(modalSubtitle);
      }

      modalHeader.appendChild(titleContainer);
      if (this.headerButtons) modalHeader.appendChild(this.headerButtons);
      if (this.headerRight) modalHeader.appendChild(this.headerRight);

      const modalBody = document.createElement('div');
      modalBody.className = 'cfr-modal-body';
      if (this.bodyContent) modalBody.appendChild(this.bodyContent);

      const modalFooter = document.createElement('div');
      modalFooter.className = 'cfr-modal-footer';
      if (this.footerContent) {
        modalFooter.appendChild(this.footerContent);
      } else {
        this.footerButtons.forEach(btn => modalFooter.appendChild(btn));
      }

      modalContent.appendChild(modalHeader);
      modalContent.appendChild(modalBody);
      modalContent.appendChild(modalFooter);
      modal.appendChild(modalContent);

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
  //  共享 UI 辅助函数
  // ========================

  // 持久化存储键名
  const STORAGE_KEY_SORT_DESC = 'cfr_sort_desc';
  const STORAGE_KEY_FILTER_VIDEO = 'cfr_filter_video';
  const STORAGE_KEY_FILTER_IMAGE = 'cfr_filter_image';
  const STORAGE_KEY_FILTER_AUDIO = 'cfr_filter_audio';

  function createToggleButton(text, defaultActive = false, onChange = null, storageKey = null) {
    // 如果指定了存储键，从 GM_getValue 读取初始状态
    let initialActive = defaultActive;
    if (storageKey) {
      try {
        const saved = GM_getValue(storageKey, null);
        if (saved !== null) initialActive = saved === 'true';
      } catch (e) { /* 忽略存储错误 */ }
    }

    const button = document.createElement('button');
    button.className = 'cfr-toggle-button';
    button.dataset.active = String(initialActive);
    button.textContent = text;
    if (initialActive) button.classList.add('cfr-toggle-button-active');

    button.onclick = () => {
      const isActive = button.dataset.active === 'true';
      const newState = !isActive;
      button.dataset.active = String(newState);
      button.classList.toggle('cfr-toggle-button-active', newState);
      // 持久化到 GM_setValue
      if (storageKey) {
        try { GM_setValue(storageKey, String(newState)); } catch (e) { /* 忽略存储错误 */ }
      }
      if (onChange) onChange(newState);
    };
    return button;
  }

  function updateFileIndices(fileList) {
    const items = fileList.querySelectorAll('.cfr-file-item');
    let visibleIndex = 1;
    items.forEach(item => {
      if (item.style.display !== 'none') {
        const indexEl = item.querySelector('.cfr-file-index');
        if (indexEl) indexEl.textContent = `${visibleIndex}.`;
        visibleIndex++;
      }
    });
  }

  function updateStats(fileList, statsContainer) {
    const visibleItems = fileList.querySelectorAll('.cfr-file-item:not([style*="display: none"])');
    statsContainer.innerHTML = `<span class="cfr-stats-item">共 <strong>${visibleItems.length}</strong> 个文件</span>`;
  }

  function updateRenameStats(statsContainer, totalFiles, successCount, failCount) {
    const skippedCount = Math.max(0, totalFiles - successCount - failCount);
    const totalCountSpan = document.createElement('span');
    totalCountSpan.className = 'cfr-stats-item';
    totalCountSpan.innerHTML = `共 <strong>${totalFiles}</strong> 个文件`;

    const successSpan = document.createElement('span');
    successSpan.className = 'cfr-stats-item';
    successSpan.innerHTML = `成功 <strong style="color: #52c41a;">${successCount}</strong>`;

    const failSpan = document.createElement('span');
    failSpan.className = 'cfr-stats-item';
    failSpan.innerHTML = `失败 <strong style="color: #ff4d4f;">${failCount}</strong>`;

    statsContainer.innerHTML = '';
    statsContainer.appendChild(totalCountSpan);
    statsContainer.appendChild(successSpan);
    statsContainer.appendChild(failSpan);

    if (skippedCount > 0) {
      const skippedSpan = document.createElement('span');
      skippedSpan.className = 'cfr-stats-item';
      skippedSpan.innerHTML = `跳过 <strong>${skippedCount}</strong>`;
      statsContainer.appendChild(skippedSpan);
    }
  }

  function getOrderedFiles(fileList, originalFiles) {
    const fileItems = fileList.querySelectorAll('.cfr-file-item');
    const ordered = [];
    const fileMap = new Map(originalFiles.map(f => [f.id, f]));
    fileItems.forEach(item => {
      const fileId = item.dataset.fileId;
      const isVisible = item.style.display !== 'none';
      if (isVisible) {
        const file = fileMap.get(fileId);
        if (file) ordered.push(file);
      }
    });
    return ordered;
  }

  // ========================
  //  123云盘适配器
  // ========================
  class Platform123 {
    constructor() {
      this.name = '123';
      this.CATEGORY_AUDIO = '1';
      this.CATEGORY_VIDEO = '2';
      this.CATEGORY_IMAGE = '3';
      this.FILE_TYPE_FOLDER = 1;
      this.categoryMap = { 1: '音频', 2: '视频', 3: '图片' };
      this.apiClient = null;
      this.selector = null;
      this.selectedFilesManager = null;
      // 文件缓存相关
      this.fileCache = new Map(); // fid -> fileInfo
      this.cachedParentFileId = null;
      this._cachePromise = null;
    }

    /** 获取当前目录的父级文件 ID（根目录返回 '0'） */
    async _getParentFileId() {
      try {
        const homeFilePath = JSON.parse(sessionStorage['filePath'])['homeFilePath'];
        const parentFileId = (homeFilePath[homeFilePath.length - 1] || 0);
        return parentFileId.toString();
      } catch (e) {
        log('[Platform123] 获取父级文件ID失败:', e);
        return '0';
      }
    }

    /** 确保文件缓存可用（Promise 锁机制，避免竞态，支持自动重试）
     *  @param {object} [options] - 配置项
     *  @param {boolean} [options.silent=false] - 静默模式，不显示 toast 提示
     *  @param {number} [options.maxRetries=2] - 最大重试次数（默认 2 次，共 3 次尝试）
     */
    async _ensureFileCache({ silent = false, maxRetries = 2 } = {}) {
      const parentFileId = await this._getParentFileId();

      if (this.cachedParentFileId === parentFileId && this.fileCache.size > 0) {
        log(`[123Cache] 缓存命中，目录: ${parentFileId}，共 ${this.fileCache.size} 个文件`);
        return;
      }

      if (this.cachedParentFileId !== parentFileId) {
        log(`[123Cache] 目录变更 ${this.cachedParentFileId} -> ${parentFileId}，清空旧缓存`);
        this.fileCache = new Map();
        this.cachedParentFileId = parentFileId;
      }

      if (this._cachePromise) return this._cachePromise;

      this._cachePromise = (async () => {
        const fetchParentId = parentFileId;
        const dismissToast = silent ? () => {} : showToast('', '正在获取文件信息..', 0, { icon: '<span class="cfr-toast-icon-loading"></span>', minDuration: 500, center: true });
        let lastError = null;

        try {
          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            if (attempt > 0) {
              const delay = attempt * 1000; // 1s, 2s 递增延迟
              log(`[123Cache] 第 ${attempt} 次重试，等待 ${delay}ms...`);
              await new Promise(r => setTimeout(r, delay));
            }

            try {
              log(`[123Cache] 开始获取全量文件列表，目录: ${fetchParentId}${silent ? '（静默预获取）' : ''}${attempt > 0 ? `，第 ${attempt + 1} 次尝试` : ''}`);
              const fileList = await this.apiClient.getFileList(fetchParentId);
              const files = fileList.data.InfoList;
              if (this.cachedParentFileId === fetchParentId) {
                this.fileCache = new Map(files.map(f => [String(f.FileId), f]));
                log(`[123Cache] 全量缓存完成，共 ${this.fileCache.size} 个文件`);
              } else {
                log(`[123Cache] 目录已变更为 ${this.cachedParentFileId}，丢弃旧目录 ${fetchParentId} 的缓存数据`);
              }
              return; // 成功，退出重试循环
            } catch (err) {
              lastError = err;
              log(`[123Cache] 获取文件列表失败${attempt < maxRetries ? '，准备重试' : ''}:`, err);
            }
          }

          // 所有重试都失败
          log(`[123Cache] 获取文件列表失败，已重试 ${maxRetries} 次:`, lastError);
        } finally {
          dismissToast();
        }
      })();

      return this._cachePromise.finally(() => {
        this._cachePromise = null;
      });
    }

    /** 获取额外列信息（文件类型） */
    getExtraColumnInfo(file) {
      return this.categoryMap[file.category] || '其他';
    }

    /** 初始化 API 客户端 */
    initAPI() {
      this.apiClient = new class PanApiClient {
        constructor() {
          this.host = 'https://' + window.location.host;
          this.authToken = localStorage['authorToken'] || '';
          this.loginUuid = localStorage['LoginUuid'] || '';
          this.appVersion = '3';
          this.referer = document.location.href;
          if (!this.authToken || !this.loginUuid) {
            log('[123API] 缺少认证信息，请先登录');
          }
        }

        buildURL(path, queryParams) {
          const queryString = new URLSearchParams(queryParams || {}).toString();
          return `${this.host}${path}?${queryString}`;
        }

        async sendRequest(method, path, queryParams, body) {
          const headers = {
            'Content-Type': 'application/json;charset=UTF-8',
            'Authorization': 'Bearer ' + this.authToken,
            'platform': 'web',
            'App-Version': this.appVersion,
            'LoginUuid': this.loginUuid,
            'Origin': this.host,
            'Referer': this.referer,
          };
          try {
            log(`[123API] ${method} ${path}`, queryParams || '');
            const response = await fetch(this.buildURL(path, queryParams), {
              method, headers, body, credentials: 'include'
            });
            const data = await response.json();
            if (data.code !== 0) {
              log(`[123API] 请求失败，code: ${data.code}, message: ${data.message}`);
              throw new Error(data.message || 'API请求失败');
            }
            await new Promise(resolve => setTimeout(resolve, 50));
            return data;
          } catch (e) {
            log(`[123API] 请求异常:`, e);
            throw e;
          }
        }

        async getOnePageFileList(parentFileId, page) {
          const urlParams = {
            driveId: '0', limit: '100', next: '0',
            orderBy: 'file_name', orderDirection: 'asc',
            parentFileId: parentFileId.toString(),
            trashed: 'false', SearchData: '',
            Page: page.toString(),
            OnlyLookAbnormalFile: '0',
            event: 'homeListFile', operateType: '1', inDirectSpace: 'false'
          };
          const data = await this.sendRequest('GET', '/b/api/file/list/new', urlParams);
          return { data: { InfoList: data.data.InfoList }, total: data.data.Total };
        }

        async getFileList(parentFileId) {
          let InfoList = [];
          log(`[123API] 开始获取文件列表，parentFileId: ${parentFileId}`);
          const info = await this.getOnePageFileList(parentFileId, 1);
          InfoList.push(...info.data.InfoList);
          const total = info.total;
          log(`[123API] 第1页返回: ${info.data.InfoList.length} 条，总计: ${total} 条`);
          if (total > 100) {
            const times = Math.ceil(total / 100);
            for (let i = 2; i < times + 1; i++) {
              const info = await this.getOnePageFileList(parentFileId, i);
              InfoList.push(...info.data.InfoList);
              log(`[123API] 第${i}页返回: ${info.data.InfoList.length} 条，累计: ${InfoList.length}/${total} 条`);
            }
          }
          log(`[123API] 文件列表获取完成，共 ${InfoList.length} 条`);
          return { data: { InfoList }, total };
        }

        async getFileInfo(idList) {
          const fileIdList = idList.map(fileId => ({ fileId }));
          const data = await this.sendRequest('POST', '/b/api/file/info', {}, JSON.stringify({ fileIdList }));
          return { data: { InfoList: data.data.infoList } };
        }

        async fileRename(fileId, newFileName) {
          log(`[123API] POST rename - fileId: ${fileId}, newFileName: ${newFileName}`);
          const data = await this.sendRequest('POST', '/b/api/file/rename', {}, JSON.stringify({
            driveId: '0', duplicate: '1',
            fileId: Number(fileId), fileName: newFileName,
          }));
          log(`[123API] 重命名结果: ${data.code === 0 ? '成功' : '失败'}`);
          return data.code === 0;
        }
      }();
    }

    /** 初始化文件选择机制 */
    initFileSelection(onSelectionChange) {
      this.selector = new class TableRowSelector {
        constructor() {
          this.selectedRowKeys = new Set();
          this.unselectedRowKeys = new Set();
          this.isSelectAll = false;
          this._inited = false;
          this._callbacks = [];
          this._observers = [];
          this._breadcrumbObserver = null;
        }

        init() {
          if (this._inited) return;
          this._inited = true;
          this._observeBreadcrumb();
          this._observeRowSelection();
        }

        _observeRowSelection() {
          const self = this;

          const selectAllClickHandler = (e) => {
            const checkbox = e.target.closest('.ant-checkbox-input[aria-label="Select all"]');
            if (!checkbox) return;
            setTimeout(() => {
              if (checkbox.checked) {
                self.isSelectAll = true;
                self.unselectedRowKeys = new Set();
                self.selectedRowKeys = new Set();
              } else {
                self.isSelectAll = false;
                self.selectedRowKeys = new Set();
                self.unselectedRowKeys = new Set();
              }
              self._notifyCallbacks();
            }, 0);
          };
          this._selectAllClickHandler = selectAllClickHandler;
          document.addEventListener('click', selectAllClickHandler);

          let rowDebounceTimer = null;
          const pendingRowChanges = new Map();

          const processRowChanges = () => {
            for (const [rowKey, isSelected] of pendingRowChanges) {
              if (self.isSelectAll) {
                if (isSelected) self.unselectedRowKeys.delete(rowKey);
                else self.unselectedRowKeys.add(rowKey);
              } else {
                if (isSelected) self.selectedRowKeys.add(rowKey);
                else self.selectedRowKeys.delete(rowKey);
              }
            }
            pendingRowChanges.clear();
            self._notifyCallbacks();
          };

          const rowObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
              if (mutation.type !== 'attributes' || mutation.attributeName !== 'class') continue;
              const target = mutation.target;
              if (!target.classList || !target.classList.contains('ant-table-row')) continue;
              const rowKey = target.getAttribute('data-row-key');
              if (!rowKey) continue;
              const isSelected = target.classList.contains('ant-table-row-selected');
              pendingRowChanges.set(rowKey, isSelected);
            }
            if (pendingRowChanges.size > 0) {
              if (rowDebounceTimer) clearTimeout(rowDebounceTimer);
              rowDebounceTimer = setTimeout(processRowChanges, 50);
            }
          });

          const observeTarget = () => {
            const container = document.querySelector('.home-content');
            if (container) {
              rowObserver.observe(container, { subtree: true, attributes: true, attributeFilter: ['class'] });
              self._observers.push(rowObserver);
              log('[123Selector] 行选中监听已启动，目标: .home-content');
            } else {
              setTimeout(observeTarget, 200);
            }
          };
          observeTarget();
        }

        _notifyCallbacks() { this._callbacks.forEach(cb => cb()); }
        onSelectionChange(cb) { this._callbacks.push(cb); }
        getSelection() {
          return {
            isSelectAll: this.isSelectAll,
            selectedRowKeys: [...this.selectedRowKeys],
            unselectedRowKeys: [...this.unselectedRowKeys]
          };
        }

        _observeBreadcrumb(retryCount = 0) {
          const MAX_RETRIES = 50;
          const breadcrumb = document.querySelector('.home-breadcrumb');
          if (!breadcrumb) {
            if (retryCount >= MAX_RETRIES) { log('[123Selector] 面包屑元素不存在，已达到最大重试次数'); return; }
            setTimeout(() => this._observeBreadcrumb(retryCount + 1), 200);
            return;
          }
          this._breadcrumbObserver = new MutationObserver(() => {
            log('[123Selector] 检测到面包屑变化，清空所有选择');
            this.selectedRowKeys.clear();
            this.unselectedRowKeys.clear();
            this.isSelectAll = false;
            this._notifyCallbacks();
          });
          this._breadcrumbObserver.observe(breadcrumb, {
            childList: true, subtree: true, attributes: true, characterData: true
          });
          log('[123Selector] 面包屑监听已启动');
        }
      }();

      this.selectedFilesManager = new class SelectedFilesManager {
        constructor(apiClient, selector, platform) {
          this.apiClient = apiClient;
          this.selector = selector;
          this.platform = platform; // Platform123 实例，用于访问缓存
          this.selectedFiles = [];
          this._callbacks = [];
          this._debounceTimer = null;
          this._isUpdating = false;
        }

        init() {
          this.selector.onSelectionChange(() => { this._debounceUpdate(); });
        }

        _debounceUpdate() {
          if (this._debounceTimer) clearTimeout(this._debounceTimer);
          this._debounceTimer = setTimeout(() => { this._updateSelectedFiles(); }, 300);
        }

        async _updateSelectedFiles() {
          this._isUpdating = true;
          const selection = this.selector.getSelection();
          log(`[123Files] 选择状态变化:`, selection);
          this.selectedFiles = [];

          // 确保缓存已就绪（预获取后通常直接命中）
          await this.platform._ensureFileCache({ silent: true });
          const parentFileId = await this.platform._getParentFileId();
          log(`[123Files] 父级目录ID: ${parentFileId}`);

          if (selection.isSelectAll) {
            log('[123Files] 全选模式');
            // 使用 Platform123 的缓存
            const allFiles = [...this.platform.fileCache.values()];
            log(`[123Files] 从缓存获取 ${allFiles.length} 个文件`);

            if (selection.unselectedRowKeys.length === 0) {
              this.selectedFiles = allFiles
                .filter(file => file.Type !== 1)
                .map(file => ({
                  id: String(file.FileId),
                  name: file.FileName,
                  category: file.Category || '0',
                }));
            } else {
              log(`[123Files] 全选但有取消，取消数量: ${selection.unselectedRowKeys.length}`);
              this.selectedFiles = allFiles
                .filter(file => {
                  const isUnselected = selection.unselectedRowKeys.includes(String(file.FileId));
                  const isFile = file.Type !== 1;
                  return !isUnselected && isFile;
                })
                .map(file => ({
                  id: String(file.FileId),
                  name: file.FileName,
                  category: file.Category || '0',
                }));
            }
          } else {
            log('[123Files] 非全选模式');
            const fileIds = selection.selectedRowKeys;
            log(`[123Files] 选中文件ID:`, fileIds);
            // 从 Platform123 缓存中获取文件信息
            const allFiles = [...this.platform.fileCache.values()];
            this.selectedFiles = allFiles
              .filter(file => fileIds.includes(String(file.FileId)) && file.Type !== 1)
              .map(file => ({
                id: String(file.FileId),
                name: file.FileName,
                category: file.Category || '0',
              }));
          }

          log(`[123Files] 最终选中文件数: ${this.selectedFiles.length}`);
          this._notifyCallbacks();
          this._isUpdating = false;
          return this.selectedFiles;
        }

        _notifyCallbacks() { this._callbacks.forEach(cb => cb()); }
        onFilesChange(cb) { this._callbacks.push(cb); }
        isUpdating() { return this._isUpdating; }
        refresh() { return this._updateSelectedFiles(); }
        getSelectedFiles() { return [...this.selectedFiles]; }
        hasSelectedFiles() { return this.selectedFiles.length > 0; }
      }(this.apiClient, this.selector, this);

      this.selector.init();
      this.selectedFilesManager.init();
      this.selectedFilesManager.onFilesChange(() => {
        if (onSelectionChange) onSelectionChange();
      });
    }

    /** 获取当前选中的文件列表（统一格式） */
    async getSelectedFiles() {
      if (this.selectedFilesManager.isUpdating()) {
        // 等待更新完成后再获取
        await new Promise(resolve => {
          this.selectedFilesManager.onFilesChange(resolve);
        });
      }
      return this.selectedFilesManager.getSelectedFiles();
    }

    /** 是否正在更新选中文件 */
    isUpdating() {
      return this.selectedFilesManager.isUpdating();
    }

    /** 是否有选中文件 */
    hasSelectedFiles() {
      return this.selectedFilesManager.hasSelectedFiles();
    }

    /** 重命名文件 */
    async renameFile(fileId, newFileName) {
      return await this.apiClient.fileRename(fileId, newFileName);
    }

    /** 注入按钮到页面 */
    injectButton(onClick) {
      const container = document.querySelector('.home-operator-button-group');
      if (!container) return;

      const buttonExist = document.querySelector('.cfr-button-container');
      if (buttonExist) return buttonExist;

      const firstButton = container.querySelector('button');
      const buttonClass = firstButton ? firstButton.className : 'cfr-btn-primary';

      const btnContainer = document.createElement('div');
      btnContainer.className = 'cfr-button-container';

      const btn = document.createElement('button');
      btn.className = buttonClass;
      btn.innerHTML = '<span>批量重命名</span>';
      btn.addEventListener('click', onClick);
      btnContainer.appendChild(btn);

      container.insertBefore(btnContainer, container.firstChild);
      return btnContainer;
    }

    /** 更新按钮可见性 */
    updateButtonVisibility(buttonContainer) {
      if (!buttonContainer) return;
      buttonContainer.style.display = this.hasSelectedFiles() ? 'inline-block' : 'none';
    }

    /** 获取按钮容器选择器（用于等待元素出现） */
    getButtonContainerSelector() {
      return '.home-operator-button-group';
    }

    /** 初始化完成后的额外设置（MutationObserver 等） */
    setupObserver(onChange) {
      // 初始化时立即预获取当前目录的文件缓存
      this._ensureFileCache({ silent: true });

      // 监听目录变化，预获取新目录缓存
      let lastParentFileId = null;
      const checkDirChange = async () => {
        const currentParentId = await this._getParentFileId();
        if (lastParentFileId === null) {
          lastParentFileId = currentParentId;
          return;
        }
        if (currentParentId !== lastParentFileId) {
          log(`[123Init] 目录变更 ${lastParentFileId} -> ${currentParentId}，预获取新缓存`);
          lastParentFileId = currentParentId;
          // 清空旧缓存，触发新目录的预获取
          this.fileCache = new Map();
          this.cachedParentFileId = null;
          this._ensureFileCache({ silent: true });
        }
      };

      // 使用 MutationObserver 检测目录变化（通过面包屑或文件列表变化）
      const observer = new MutationObserver(debounce(() => {
        checkDirChange();
        if (onChange) onChange();
      }, 200));
      observer.observe(document.body, { childList: true, subtree: true });
      log('[123Init] MutationObserver 已启动，支持目录变化预获取');
    }

    /** 清除文件缓存（重命名后调用） */
    clearCache() {
      this.fileCache = new Map();
      this.cachedParentFileId = null;
      log('[123Cache] 缓存已清空');
    }
  }

  // ========================
  //  夸克网盘适配器
  // ========================
  class PlatformQuark {
    constructor() {
      this.name = 'quark';
      this.CATEGORY_VIDEO = '1';
      this.CATEGORY_IMAGE = '3';
      this.CATEGORY_AUDIO = '2';
      this.categoryMap = { 1: '视频', 2: '音频', 3: '图片' };
      this.fileCache = new Map();
      this.cachedDirId = null;
      this.selectedFiles = new Map();
      this.buttonId = 'cfr-quark-fast-rename-btn';
    }

    /** 从 URL hash 解析当前目录 ID（根目录返回 '0'） */
    _getCurrentDirId() {
      const hash = window.location.hash;
      const segments = hash.replace(/^#\/list\/all\/?/, '').split('/').filter(Boolean);
      if (segments.length === 0) return '0';
      const last = segments[segments.length - 1];
      const dirId = last.split('-')[0];
      return dirId;
    }

    /** 将夸克原始文件对象转为内部统一格式 */
    _normalizeFile(file) {
      return {
        id: file.fid,
        name: file.file_name,
        category: String(file.category || 0),
        _raw: file,
      };
    }

    /** 获取额外列信息（分类名） */
    getExtraColumnInfo(file) {
      return this.categoryMap[file.category] || '其他';
    }

    /** 获取文件列表（自动翻页） */
    async _getAllFiles(pdirFid, size = 1000) {
      let allList = [];
      let page = 1;
      log(`[QuarkAPI] 开始获取文件列表，pdir_fid: ${pdirFid}`);

      while (true) {
        log(`[QuarkAPI] 请求第 ${page} 页...`);
        const data = await this._getFileList(pdirFid, page, size);
        const list = (data?.data?.list ?? [])
          .map(({ fid, file_name, file_type, category }) =>
            ({ fid, file_name, file_type, category })
          );
        const metadata = data?.metadata ?? {};
        const { _count, _total } = metadata;
        log(`[QuarkAPI] 第 ${page} 页返回: 本页 ${_count} 条，累计 ${allList.length + list.length}/${_total} 条`);
        allList = allList.concat(list);
        if (_count === 0 || allList.length >= _total) {
          log(`[QuarkAPI] 翻页完成，共 ${allList.length} 条`);
          break;
        }
        page++;
      }
      return allList;
    }

    /** 获取单页文件列表 */
    _getFileList(pdirFid, page = 1, size = 1000) {
      return new Promise((resolve, reject) => {
        const params = new URLSearchParams({
          pr: 'ucpro', fr: 'pc',
          pdir_fid: pdirFid,
          _page: String(page), _size: String(size),
          _fetch_total: '1', _sort: 'file_name:asc',
        });
        const url = `https://drive-pc.quark.cn/1/clouddrive/file/sort?${params}`;
        log(`[QuarkAPI] GET ${url}`);

        GM_xmlhttpRequest({
          method: 'GET', url, responseType: 'json',
          onload(res) {
            if (res.status === 200) { resolve(res.response); }
            else { reject(new Error(`请求失败: ${res.status}`)); }
          },
          onerror(err) { reject(err); },
        });
      });
    }

    /** 重命名文件 */
    _renameFile(fid, newFileName) {
      return new Promise((resolve, reject) => {
        const url = 'https://drive-pc.quark.cn/1/clouddrive/file/rename?pr=ucpro&fr=pc';
        log(`[QuarkAPI] POST rename - fid: ${fid}, newFileName: ${newFileName}`);
        GM_xmlhttpRequest({
          method: 'POST', url,
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify({ fid, file_name: newFileName }),
          responseType: 'json',
          onload(res) {
            if (res.status === 200) { resolve(res.response); }
            else { reject(new Error(`重命名失败: ${res.status}`)); }
          },
          onerror(err) { reject(err); },
        });
      });
    }

    /** 确保文件缓存可用（Promise 锁机制，避免竞态，支持自动重试）
     *  @param {object} [options] - 配置项
     *  @param {boolean} [options.silent=false] - 静默模式，不显示 toast 提示
     *  @param {number} [options.maxRetries=2] - 最大重试次数（默认 2 次，共 3 次尝试）
     */
    async _ensureFileCache({ silent = false, maxRetries = 2 } = {}) {
      const dirId = this._getCurrentDirId();

      if (this.cachedDirId === dirId && this.fileCache.size > 0) {
        log(`[QuarkCache] 缓存命中，目录: ${dirId}，共 ${this.fileCache.size} 个文件`);
        return;
      }

      if (this.cachedDirId !== dirId) {
        log(`[QuarkCache] 目录变更 ${this.cachedDirId} -> ${dirId}，清空旧缓存`);
        this.fileCache = new Map();
        this.selectedFiles = new Map();
        this.cachedDirId = dirId;
      }

      // 如果已有正在进行的缓存请求，直接复用
      if (this._cachePromise) return this._cachePromise;

      this._cachePromise = (async () => {
        const fetchDirId = dirId;
        const dismissToast = silent ? () => {} : showToast('', '正在获取文件信息..', 0, { icon: '<span class="cfr-toast-icon-loading"></span>', minDuration: 500, center: true });
        let lastError = null;

        try {
          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            if (attempt > 0) {
              const delay = attempt * 1000; // 1s, 2s 递增延迟
              log(`[QuarkCache] 第 ${attempt} 次重试，等待 ${delay}ms...`);
              await new Promise(r => setTimeout(r, delay));
            }

            try {
              log(`[QuarkCache] 开始获取全量文件列表，目录: ${fetchDirId}${silent ? '（静默预获取）' : ''}${attempt > 0 ? `，第 ${attempt + 1} 次尝试` : ''}`);
              const files = await this._getAllFiles(fetchDirId);
              // 写入前检查目录是否已变更，避免竞态污染
              if (this.cachedDirId === fetchDirId) {
                this.fileCache = new Map(files.map(f => [f.fid, f]));
                log(`[QuarkCache] 全量缓存完成，共 ${this.fileCache.size} 个文件`);
              } else {
                log(`[QuarkCache] 目录已变更为 ${this.cachedDirId}，丢弃旧目录 ${fetchDirId} 的缓存数据`);
              }
              return; // 成功，退出重试循环
            } catch (err) {
              lastError = err;
              log(`[QuarkCache] 获取文件列表失败${attempt < maxRetries ? '，准备重试' : ''}:`, err);
            }
          }

          // 所有重试都失败
          log(`[QuarkCache] 获取文件列表失败，已重试 ${maxRetries} 次:`, lastError);
        } finally {
          dismissToast();
        }
      })();

      return this._cachePromise.finally(() => {
        this._cachePromise = null;
      });
    }

    /** 初始化文件选择机制 */
    initFileSelection(onSelectionChange) {
      this._onSelectionChange = onSelectionChange;
      this._bindCheckboxEvents();
    }

    /** 绑定 checkbox 事件 */
    _bindCheckboxEvents() {
      // 全选 checkbox
      const headerCheckbox = document.querySelector('.ant-table-thead .ant-checkbox-input');
      if (headerCheckbox && !headerCheckbox.dataset.cfrBound) {
        headerCheckbox.dataset.cfrBound = '1';
        headerCheckbox.addEventListener('change', async (e) => {
          if (this._isProcessingSelection) return;
          this._isProcessingSelection = true;
          try {
            if (e.target.checked) {
              log(`[QuarkCheckbox] 全选触发`);
              await this._ensureFileCache();
              this.selectedFiles = new Map(
                [...this.fileCache].filter(([_, v]) => v.file_type === 1).map(([k, v]) => [k, this._normalizeFile(v)])
              );
              log(`[QuarkCheckbox] 全选完成，共 ${this.selectedFiles.size} 个文件`);
            } else {
              log(`[QuarkCheckbox] 取消全选，清空选中列表`);
              this.selectedFiles = new Map();
            }
            if (this._onSelectionChange) this._onSelectionChange();
          } finally {
            this._isProcessingSelection = false;
          }
        });
      }

      // 每个文件的 checkbox
      const rowCheckboxes = document.querySelectorAll('.ant-table-tbody .ant-checkbox-input');
      rowCheckboxes.forEach(cb => {
        if (cb.dataset.cfrBound) return;
        cb.dataset.cfrBound = '1';
        cb.addEventListener('change', async (e) => {
          if (this._isProcessingSelection) return;
          this._isProcessingSelection = true;
          try {
            const row = e.target.closest('tr');
            const rowKey = row?.dataset.rowKey ?? '未知';
            const fileName = row?.querySelector('.filename-text')?.textContent?.trim() ?? '未知';
            if (e.target.checked) {
              const cached = this.fileCache.get(rowKey);
              if (cached) {
                if (cached.file_type === 1) {
                  this.selectedFiles.set(rowKey, this._normalizeFile(cached));
                  log(`[QuarkCheckbox] 文件选中 - fid: ${rowKey}, 文件名: ${cached.file_name}，当前共 ${this.selectedFiles.size} 个`);
                } else {
                  log(`[QuarkCheckbox] 跳过文件夹 - fid: ${rowKey}, 文件名: ${cached.file_name}`);
                }
              } else {
                log(`[QuarkCheckbox] 缓存未命中 - fid: ${rowKey}，触发全量获取`);
                await this._ensureFileCache();
                const info = this.fileCache.get(rowKey);
                if (info && info.file_type === 1) {
                  this.selectedFiles.set(rowKey, this._normalizeFile(info));
                  log(`[QuarkCheckbox] 文件选中 - fid: ${rowKey}, 文件名: ${info.file_name}，当前共 ${this.selectedFiles.size} 个`);
                } else {
                  log(`[QuarkCheckbox] 跳过非文件项 - fid: ${rowKey}, 文件名: ${fileName}`);
                }
              }
            } else {
              this.selectedFiles.delete(rowKey);
              log(`[QuarkCheckbox] 文件取消 - fid: ${rowKey}，当前共 ${this.selectedFiles.size} 个`);
            }
            if (this._onSelectionChange) this._onSelectionChange();
          } finally {
            this._isProcessingSelection = false;
          }
        });
      });
    }

    /** 获取当前选中的文件列表（统一格式，过滤掉目录） */
    async getSelectedFiles() {
      return [...this.selectedFiles.values()].filter(f => f._raw?.file_type === 1);
    }

    /** 是否正在更新选中文件 */
    isUpdating() {
      return this._isProcessingSelection;
    }

    /** 是否有选中文件（排除目录） */
    hasSelectedFiles() {
      return [...this.selectedFiles.values()].some(f => f._raw?.file_type === 1);
    }

    /** 重命名文件 */
    async renameFile(fileId, newFileName) {
      const res = await this._renameFile(fileId, newFileName);
      if (res.code !== undefined && res.code !== 0) {
        throw new Error(res.message || '重命名失败');
      }
      return true;
    }

    /** 注入按钮到页面 */
    injectButton(onClick) {
      const dirId = this._getCurrentDirId();
      if (!dirId) return null;

      const container = document.querySelector('.btn-operate .btn-main');
      if (!container || document.getElementById(this.buttonId)) return document.getElementById(this.buttonId);

      log(`[QuarkButton] 注入按钮，当前目录ID: ${dirId}`);

      const btn = document.createElement('button');
      btn.id = this.buttonId;
      btn.className = 'ant-btn btn-file btn-file-primary upload-btn ant-btn-primary';
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: -2px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>批量重命名';
      btn.style.display = 'none';
      btn.addEventListener('click', onClick);

      const dropdownTrigger = container.querySelector('.btn-create-folder');
      if (dropdownTrigger) {
        dropdownTrigger.before(btn);
      } else {
        container.prepend(btn);
      }
      return btn;
    }

    /** 更新按钮可见性 */
    updateButtonVisibility(buttonEl) {
      if (!buttonEl) return;
      buttonEl.style.display = this.hasSelectedFiles() ? '' : 'none';
    }

    /** 获取按钮容器选择器（用于等待元素出现） */
    getButtonContainerSelector() {
      return '.btn-operate .btn-main';
    }

    /** 初始化完成后的额外设置（MutationObserver 等） */
    setupObserver(onChange) {
      // 初始化时立即预获取当前目录的文件缓存
      this._ensureFileCache({ silent: true });

      // 监听目录变化，预获取新目录缓存
      let lastDirId = this._getCurrentDirId();
      const debouncedBind = debounce(() => {
        // 检测目录变化
        const currentDirId = this._getCurrentDirId();
        if (currentDirId !== lastDirId) {
          log(`[QuarkInit] 目录变更 ${lastDirId} -> ${currentDirId}，清空选中并预获取新缓存`);
          this.selectedFiles = new Map();
          lastDirId = currentDirId;
          // 静默预获取新目录的文件缓存
          this._ensureFileCache({ silent: true });
        }
        this._bindCheckboxEvents();
        if (onChange) onChange();
      }, 300);

      this._observer = new MutationObserver(() => {
        debouncedBind();
      });
      this._observer.observe(document.body, { childList: true, subtree: true });
      log('[QuarkInit] MutationObserver 已启动，支持目录变化预获取');
    }

    /** 清除文件缓存（重命名后调用） */
    clearCache() {
      this.fileCache = new Map();
      this.cachedDirId = null;
    }
  }

  // ========================
  //  光鸭网盘适配器
  // ========================
  class PlatformGuangya {
    constructor() {
      this.name = '光鸭网盘';
      this.buttonId = 'cfr-guangya-rename-btn';
      this.FILE_TYPE_IMAGE = 1;
      this.FILE_TYPE_VIDEO = 2;
      this.FILE_TYPE_AUDIO = 3;
      this.CATEGORY_IMAGE = String(this.FILE_TYPE_IMAGE);
      this.CATEGORY_VIDEO = String(this.FILE_TYPE_VIDEO);
      this.CATEGORY_AUDIO = String(this.FILE_TYPE_AUDIO);
      this.categoryMap = { 1: '图片', 2: '视频', 3: '音频' };
      this.selectedFiles = new Map();
      this.fileCache = new Map();
      this._fileNameToFidMap = new Map(); // 文件名 -> fid 索引
      this.cachedDirId = null;
      this._cachePromise = null;
      this._isProcessingSelection = false;
      this._onSelectionChange = null;
    }

    /** 通过文件名查找 fid */
    _findFidByFileName(fileName) {
      return this._fileNameToFidMap.get(fileName);
    }

    /** 更新文件名索引 */
    _updateFileNameIndex() {
      this._fileNameToFidMap.clear();
      for (const [fid, info] of this.fileCache) {
        this._fileNameToFidMap.set(info.file_name, fid);
      }
    }

    /** 从 URL hash 解析当前目录 ID */
    _getCurrentDirId() {
      const hash = window.location.hash;
      const segments = hash.replace(/^#\/home\/all\/?/, '').split('/').filter(Boolean);
      if (segments.length === 0) return '';
      const last = segments[segments.length - 1];
      const dirId = last.split('-')[0];
      return dirId;
    }

    /** 将光鸭原始文件对象转为内部统一格式 */
    _normalizeFile(file) {
      return {
        id: file.fid,
        name: file.file_name,
        category: String(file.file_type || 0),
        _raw: file,
      };
    }

    /** 获取按钮容器选择器（用于等待元素出现） */
    getButtonContainerSelector() {
      return '[aria-label="upload"]';
    }

    /** 注入按钮到页面（上传和新建文件夹之间） */
    injectButton(onClick) {
      const existingBtn = document.getElementById(this.buttonId);
      if (existingBtn && document.contains(existingBtn)) return existingBtn;

      const uploadBtn = document.querySelector('[aria-label="upload"]');
      if (!uploadBtn) return null;

      const uploadButton = uploadBtn.closest('button');
      if (!uploadButton) return null;

      const folderBtn = document.querySelector('[aria-label="addfolder"]');
      const folderButton = folderBtn ? folderBtn.closest('button') : null;

      log('[GuangyaButton] 注入按钮');
      const btn = uploadButton.cloneNode(false);
      btn.id = this.buttonId;
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: -2px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>批量重命名';
      btn.style.display = 'none';
      btn.addEventListener('click', onClick);

      if (folderButton) {
        folderButton.before(btn);
      } else {
        uploadButton.after(btn);
      }
      return btn;
    }

    /** 更新按钮可见性 */
    updateButtonVisibility(buttonEl) {
      if (!buttonEl) return;
      buttonEl.style.display = this.hasSelectedFiles() ? '' : 'none';
    }

    /** 是否有选中文件（排除目录） */
    hasSelectedFiles() {
      return [...this.selectedFiles.values()].some(f => f._raw?.resType === 1);
    }

    /** 获取额外列信息 */
    getExtraColumnInfo(file) {
      return this.categoryMap[file.category] || '其他';
    }

    /** 获取认证 Token */
    _getAuthToken() {
      try {
        const key = Object.keys(localStorage).find(k => k.startsWith('credentials_'));
        if (!key) return null;
        const credentials = JSON.parse(localStorage.getItem(key));
        return `${credentials.token_type} ${credentials.access_token}`;
      } catch (e) {
        log('[GuangyaAPI] 获取 Token 失败:', e);
        return null;
      }
    }

    /** 获取单页文件列表 */
    _getFileList(parentId, pageSize = 1000, page = 0) {
      return new Promise((resolve, reject) => {
        const token = this._getAuthToken();
        if (!token) {
          reject(new Error('未登录，请先登录光鸭网盘'));
          return;
        }

        const url = 'https://api.guangyapan.com/nd.bizuserres.s/v1/file/get_file_list';
        const body = JSON.stringify({
          page,
          parentId,
          pageSize,
          orderBy: 1,
          sortType: 1,
        });
        log(`[GuangyaAPI] POST ${url}, parentId: ${parentId}, page: ${page}`);

        GM_xmlhttpRequest({
          method: 'POST', url,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
          },
          data: body,
          responseType: 'json',
          onload(res) {
            if (res.status === 200) {
              resolve(res.response);
            } else {
              reject(new Error(`请求失败: ${res.status}`));
            }
          },
          onerror(err) { reject(err); },
        });
      });
    }

    /** 获取文件列表（自动翻页） */
    async _getAllFiles(parentId, size = 1000) {
      let page = 0;
      let allList = [];
      let rawFetched = 0;
      log(`[GuangyaAPI] 开始获取文件列表，parentId: ${parentId}`);

      while (true) {
        const data = await this._getFileList(parentId, size, page);
        const rawList = data?.data?.list ?? [];
        const list = rawList
          .map(({ fileId, fileName, fileType, resType }) =>
            ({ fid: fileId, file_name: fileName, file_type: fileType, resType })
          );
        const total = data?.data?.total ?? 0;
        rawFetched += rawList.length;
        log(`[GuangyaAPI] 第 ${page} 页返回: 本页 ${rawList.length} 条，累计 ${rawFetched}/${total} 条`);
        allList = allList.concat(list);
        if (rawList.length === 0 || rawFetched >= total) {
          log(`[GuangyaAPI] 翻页完成，共 ${allList.length} 个文件`);
          break;
        }
        page++;
      }
      return allList;
    }

    /** 确保文件缓存可用（Promise 锁机制，避免竞态，支持自动重试）
     *  @param {object} [options] - 配置项
     *  @param {boolean} [options.silent=false] - 静默模式，不显示 toast 提示
     *  @param {number} [options.maxRetries=2] - 最大重试次数（默认 2 次，共 3 次尝试）
     */
    async _ensureFileCache({ silent = false, maxRetries = 2 } = {}) {
      const dirId = this._getCurrentDirId();

      if (this.cachedDirId === dirId && this.fileCache.size > 0) {
        log(`[GuangyaCache] 缓存命中，目录: ${dirId}，共 ${this.fileCache.size} 个文件`);
        return;
      }

      if (this.cachedDirId !== dirId) {
        log(`[GuangyaCache] 目录变更 ${this.cachedDirId} -> ${dirId}，清空旧缓存`);
        this.fileCache = new Map();
        this.selectedFiles = new Map();
        this.cachedDirId = dirId;
      }

      if (this._cachePromise) return this._cachePromise;

      this._cachePromise = (async () => {
        const fetchDirId = dirId;
        const dismissToast = silent ? () => {} : showToast('', '正在获取文件信息..', 0, { icon: '<span class="cfr-toast-icon-loading"></span>', minDuration: 500, center: true });
        let lastError = null;

        try {
          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            if (attempt > 0) {
              const delay = attempt * 1000; // 1s, 2s 递增延迟
              log(`[GuangyaCache] 第 ${attempt} 次重试，等待 ${delay}ms...`);
              await new Promise(r => setTimeout(r, delay));
            }

            try {
              log(`[GuangyaCache] 开始获取全量文件列表，目录: ${fetchDirId}${silent ? '（静默预获取）' : ''}${attempt > 0 ? `，第 ${attempt + 1} 次尝试` : ''}`);
              const files = await this._getAllFiles(fetchDirId);
              if (this.cachedDirId === fetchDirId) {
                this.fileCache = new Map(files.map(f => [f.fid, f]));
                this._updateFileNameIndex();
                log(`[GuangyaCache] 全量缓存完成，共 ${this.fileCache.size} 个文件`);
              } else {
                log(`[GuangyaCache] 目录已变更为 ${this.cachedDirId}，丢弃旧目录 ${fetchDirId} 的缓存数据`);
              }
              return; // 成功，退出重试循环
            } catch (err) {
              lastError = err;
              log(`[GuangyaCache] 获取文件列表失败${attempt < maxRetries ? '，准备重试' : ''}:`, err);
            }
          }

          // 所有重试都失败
          log(`[GuangyaCache] 获取文件列表失败，已重试 ${maxRetries} 次:`, lastError);
        } finally {
          dismissToast();
        }
      })();

      return this._cachePromise.finally(() => {
        this._cachePromise = null;
      });
    }

    /** 初始化文件选择监听 */
    initFileSelection(onSelectionChange) {
      this._onSelectionChange = onSelectionChange;
      this._bindCheckboxEvents();
    }

    /** 绑定 checkbox 事件 */
    _bindCheckboxEvents() {
      // 全选 checkbox
      const headerCheckbox = document.querySelector('.swangpan-file-list-table__header .swangpan-checkbox__input');
      if (headerCheckbox && !headerCheckbox.dataset.cfrBound) {
        headerCheckbox.dataset.cfrBound = '1';
        headerCheckbox.addEventListener('change', async (e) => {
          if (this._isProcessingSelection) return;
          this._isProcessingSelection = true;
          try {
            if (e.target.checked) {
              log(`[GuangyaCheckbox] 全选触发`);
              await this._ensureFileCache();
              this.selectedFiles = new Map(
                [...this.fileCache].filter(([_, v]) => v.resType === 1).map(([k, v]) => [k, this._normalizeFile(v)])
              );
              log(`[GuangyaCheckbox] 全选完成，共 ${this.selectedFiles.size} 个文件`);
            } else {
              log(`[GuangyaCheckbox] 取消全选，清空选中列表`);
              this.selectedFiles = new Map();
            }
            if (this._onSelectionChange) this._onSelectionChange();
          } finally {
            this._isProcessingSelection = false;
          }
        });
      }

      // 单个文件的选中检测：通过 click 事件 + data-state 属性（光鸭更新后 change 事件不再可靠）
      const listBody = document.querySelector('.swangpan-file-list-table__body');
      if (listBody && !listBody.dataset.cfrBound) {
        listBody.dataset.cfrBound = '1';
        listBody.addEventListener('click', async (e) => {
          if (this._isProcessingSelection) return;
          // 使用 setTimeout 等待 React 更新 DOM 属性
          setTimeout(async () => {
            const row = e.target.closest('.swangpan-file-list-table__row');
            if (!row) return;

            const fileName = row.querySelector('[title]')?.getAttribute('title') ?? '未知';
            const isSelected = row.getAttribute('data-state') === 'selected';

            this._isProcessingSelection = true;
            try {
              if (isSelected) {
                await this._resolveAndSelectFile(fileName);
              } else {
                this._removeSelectedFile(fileName);
              }
              if (this._onSelectionChange) this._onSelectionChange();
            } finally {
              this._isProcessingSelection = false;
            }
          }, 0);
        });
      }
    }

    /** 根据文件名解析 fid 并添加到选中列表（缓存预获取后通常直接命中） */
    async _resolveAndSelectFile(fileName) {
      let fid = this._findFidByFileName(fileName);

      // 缓存未命中时回退：重新获取文件列表后再查找（防御性路径）
      if (!fid || !this.fileCache.get(fid)) {
        log(`[GuangyaCheckbox] 缓存未命中 - 文件名: ${fileName}，触发全量获取`);
        await this._ensureFileCache();
        fid = fid || this._findFidByFileName(fileName);
      }

      if (!fid) {
        log(`[GuangyaCheckbox] 文件名索引中未找到 - 文件名: ${fileName}`);
        return;
      }

      const cached = this.fileCache.get(fid);
      if (!cached) {
        log(`[GuangyaCheckbox] 缓存中无此文件 - fid: ${fid}，文件名: ${fileName}`);
        return;
      }

      if (cached.resType === 1) {
        this.selectedFiles.set(fid, this._normalizeFile(cached));
        log(`[GuangyaCheckbox] 文件选中 - fid: ${fid}, 文件名: ${cached.file_name}，当前共 ${this.selectedFiles.size} 个`);
      } else {
        log(`[GuangyaCheckbox] 跳过文件夹 - fid: ${fid}, 文件名: ${cached.file_name}`);
      }
    }

    /** 根据文件名从选中列表中移除 */
    _removeSelectedFile(fileName) {
      const fid = this._findFidByFileName(fileName);
      if (fid) {
        this.selectedFiles.delete(fid);
      } else {
        // fid 未知时，遍历 selectedFiles 按文件名匹配删除
        for (const [key, val] of this.selectedFiles) {
          if (val.name === fileName) {
            this.selectedFiles.delete(key);
            break;
          }
        }
      }
      log(`[GuangyaCheckbox] 文件取消 - 文件名: ${fileName}，当前共 ${this.selectedFiles.size} 个`);
    }

    /** 获取选中的文件列表（过滤掉目录） */
    async getSelectedFiles() {
      return [...this.selectedFiles.values()].filter(f => f._raw?.resType === 1);
    }

    /** 是否正在更新选中文件 */
    isUpdating() {
      return this._isProcessingSelection;
    }

    /** 重命名文件 */
    async renameFile(fileId, newFileName) {
      const token = this._getAuthToken();
      if (!token) throw new Error('未登录，请先登录光鸭网盘');

      return new Promise((resolve, reject) => {
        const url = 'https://api.guangyapan.com/nd.bizuserres.s/v1/file/rename';
        const body = JSON.stringify({ fileId, newName: newFileName });
        log(`[GuangyaAPI] POST rename - fileId: ${fileId}, newName: ${newFileName}`);

        GM_xmlhttpRequest({
          method: 'POST', url,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
          },
          data: body,
          responseType: 'json',
          onload(res) {
            if (res.status === 200) {
              const data = res.response;
              if (data?.msg === 'success') {
                resolve(true);
              } else {
                reject(new Error(data?.msg || '重命名失败'));
              }
            } else {
              reject(new Error(`重命名失败: ${res.status}`));
            }
          },
          onerror(err) { reject(err); },
        });
      });
    }

    /** 设置 DOM 变化观察器 */
    setupObserver(onChange) {
      let lastDirId = this._getCurrentDirId();
      // 初始化时立即预获取当前目录的文件缓存
      this._ensureFileCache({ silent: true });

      const debouncedBind = debounce(() => {
        // 检测目录变化，清空选中状态并预获取新目录缓存
        const currentDirId = this._getCurrentDirId();
        if (currentDirId !== lastDirId) {
          log(`[GuangyaInit] 目录变更 ${lastDirId} -> ${currentDirId}，清空选中`);
          this.selectedFiles = new Map();
          lastDirId = currentDirId;
          // 静默预获取新目录的文件缓存
          this._ensureFileCache({ silent: true });
        }
        this._bindCheckboxEvents();
        if (onChange) onChange();
      }, 300);
      this._observer = new MutationObserver(() => {
        debouncedBind();
      });
      this._observer.observe(document.body, { childList: true, subtree: true });
      log('[GuangyaInit] MutationObserver 已启动');
    }

    /** 清除缓存 */
    clearCache() {
      this.fileCache = new Map();
      this.cachedDirId = null;
    }
  }

  // ========================
  //  共享 UI 组件：排序弹窗
  // ========================
  let sortModal = null;
  let renameModal = null;

  function showSortModal(files, platform) {
    const fileList = document.createElement('div');
    fileList.className = 'cfr-file-list';

    // 默认按文件名升序
    const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

    let draggedItem = null;
    const fragment = document.createDocumentFragment();

    sortedFiles.forEach((file, index) => {
      const fileItem = document.createElement('div');
      fileItem.className = 'cfr-file-item';
      fileItem.dataset.fileId = file.id;
      fileItem.dataset.category = String(file.category || 0);
      fileItem.draggable = true;

      fileItem.addEventListener('dragstart', (e) => {
        draggedItem = fileItem;
        fileItem.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', file.id);
      });
      fileItem.addEventListener('dragend', () => {
        draggedItem = null;
        fileItem.classList.remove('dragging');
        fileList.querySelectorAll('.cfr-file-item').forEach(item => { item.style.transform = ''; });
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
      dragHandle.className = 'cfr-drag-handle';

      const fileIndex = document.createElement('span');
      fileIndex.textContent = `${index + 1}.`;
      fileIndex.className = 'cfr-file-index';

      const fileName = document.createElement('span');
      fileName.textContent = file.name;
      fileName.className = 'cfr-file-name';

      const extraInfo = document.createElement('span');
      extraInfo.textContent = platform.getExtraColumnInfo(file);
      extraInfo.className = 'cfr-file-extra';

      const deleteBtn = document.createElement('button');
      deleteBtn.innerHTML = '×';
      deleteBtn.className = 'cfr-file-delete-btn';
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
      fileItem.appendChild(extraInfo);
      fileItem.appendChild(deleteBtn);
      fragment.appendChild(fileItem);
    });

    fileList.appendChild(fragment);

    // 排序按钮（支持持久化）
    const sortButton = createToggleButton('文件名降序', false, (isChecked) => {
      const fileItems = Array.from(fileList.querySelectorAll('.cfr-file-item'));
      fileItems.sort((a, b) => {
        const nameA = a.querySelector('.cfr-file-name').textContent;
        const nameB = b.querySelector('.cfr-file-name').textContent;
        return isChecked ? nameB.localeCompare(nameA, 'zh-CN') : nameA.localeCompare(nameB, 'zh-CN');
      });
      fileItems.forEach(item => fileList.appendChild(item));
      updateFileIndices(fileList);
    }, STORAGE_KEY_SORT_DESC);

    // 过滤按钮（互斥，支持持久化）
    const filterButtons = [];

    const videoCategory = String(platform.CATEGORY_VIDEO);
    const filterVideoButton = createToggleButton('仅视频', false, (isChecked) => {
      if (isChecked) filterButtons.forEach(b => { if (b !== filterVideoButton) { b.classList.remove('cfr-toggle-button-active'); b.dataset.active = 'false'; GM_setValue(b.dataset.storageKey, 'false'); } });
      const fileItems = fileList.querySelectorAll('.cfr-file-item');
      fileItems.forEach(item => {
        const cat = item.dataset.category;
        item.style.display = (isChecked && cat !== videoCategory) ? 'none' : 'flex';
      });
      updateFileIndices(fileList);
      updateStats(fileList, statsContainer);
    }, STORAGE_KEY_FILTER_VIDEO);
    filterVideoButton.dataset.storageKey = STORAGE_KEY_FILTER_VIDEO;
    filterButtons.push(filterVideoButton);

    const imageCategory = String(platform.CATEGORY_IMAGE);
    const filterImageButton = createToggleButton('仅图片', false, (isChecked) => {
      if (isChecked) filterButtons.forEach(b => { if (b !== filterImageButton) { b.classList.remove('cfr-toggle-button-active'); b.dataset.active = 'false'; GM_setValue(b.dataset.storageKey, 'false'); } });
      const fileItems = fileList.querySelectorAll('.cfr-file-item');
      fileItems.forEach(item => {
        const cat = item.dataset.category;
        item.style.display = (isChecked && cat !== imageCategory) ? 'none' : 'flex';
      });
      updateFileIndices(fileList);
      updateStats(fileList, statsContainer);
    }, STORAGE_KEY_FILTER_IMAGE);
    filterImageButton.dataset.storageKey = STORAGE_KEY_FILTER_IMAGE;
    filterButtons.push(filterImageButton);

    const audioCategory = String(platform.CATEGORY_AUDIO);
    const filterAudioButton = createToggleButton('仅音频', false, (isChecked) => {
      if (isChecked) filterButtons.forEach(b => { if (b !== filterAudioButton) { b.classList.remove('cfr-toggle-button-active'); b.dataset.active = 'false'; GM_setValue(b.dataset.storageKey, 'false'); } });
      const fileItems = fileList.querySelectorAll('.cfr-file-item');
      fileItems.forEach(item => {
        const cat = item.dataset.category;
        item.style.display = (isChecked && cat !== audioCategory) ? 'none' : 'flex';
      });
      updateFileIndices(fileList);
      updateStats(fileList, statsContainer);
    }, STORAGE_KEY_FILTER_AUDIO);
    filterAudioButton.dataset.storageKey = STORAGE_KEY_FILTER_AUDIO;
    filterButtons.push(filterAudioButton);

    // 应用持久化的初始状态
    // 如果排序按钮初始为激活状态，执行降序排序
    if (sortButton.dataset.active === 'true') {
      const fileItems = Array.from(fileList.querySelectorAll('.cfr-file-item'));
      fileItems.sort((a, b) => {
        const nameB = b.querySelector('.cfr-file-name').textContent;
        const nameA = a.querySelector('.cfr-file-name').textContent;
        return nameB.localeCompare(nameA, 'zh-CN');
      });
      fileItems.forEach(item => fileList.appendChild(item));
      updateFileIndices(fileList);
    }

    const headerButtonsContainer = document.createElement('div');
    headerButtonsContainer.className = 'cfr-button-container-inner';
    headerButtonsContainer.appendChild(sortButton);
    filterButtons.forEach(b => headerButtonsContainer.appendChild(b));

    const statsContainer = document.createElement('div');
    statsContainer.className = 'cfr-stats-container';

    // 应用过滤按钮的初始状态（互斥，只应用第一个激活的）
    const activeFilter = filterButtons.find(b => b.dataset.active === 'true');
    if (activeFilter) {
      const categoryMap = {
        [STORAGE_KEY_FILTER_VIDEO]: videoCategory,
        [STORAGE_KEY_FILTER_IMAGE]: imageCategory,
        [STORAGE_KEY_FILTER_AUDIO]: audioCategory
      };
      const targetCategory = categoryMap[activeFilter.dataset.storageKey];
      const fileItems = fileList.querySelectorAll('.cfr-file-item');
      fileItems.forEach(item => {
        const cat = item.dataset.category;
        item.style.display = (cat !== targetCategory) ? 'none' : 'flex';
      });
      updateFileIndices(fileList);
    }

    updateStats(fileList, statsContainer);

    const nextBtn = document.createElement('button');
    nextBtn.textContent = '下一步';
    nextBtn.className = 'cfr-btn-primary';
    nextBtn.onclick = () => {
      const orderedFiles = getOrderedFiles(fileList, files);
      log(`[Modal] 排序后文件列表:`, orderedFiles);
      sortModal.close();
      showRenameModal(orderedFiles, platform);
    };

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '取消';
    closeBtn.className = 'cfr-btn';
    closeBtn.onclick = () => sortModal.close();

    const footerButtonsContainer = document.createElement('div');
    footerButtonsContainer.className = 'cfr-footer-buttons-container';
    footerButtonsContainer.appendChild(closeBtn);
    footerButtonsContainer.appendChild(nextBtn);

    const footerContent = document.createElement('div');
    footerContent.className = 'cfr-modal-footer-content';
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

  // ========================
  //  共享 UI 组件：重命名预览弹窗
  // ========================
  const RENAME_TYPES = [
    { key: 'sequence', label: '按序号重命名' },
    { key: 'append', label: '追加重命名' },
    { key: 'replace', label: '查找替换' },
    { key: 'regex', label: '正则替换' },
    { key: 'format', label: '格式替换' },
  ];

  function showRenameModal(files, platform) {
    const bodyContainer = document.createElement('div');

    const configArea = document.createElement('div');
    configArea.className = 'cfr-rename-config';

    const separator = document.createElement('div');
    separator.className = 'separator';

    const fileList = document.createElement('div');
    fileList.className = 'cfr-file-list';

    const fragment = document.createDocumentFragment();

    files.forEach((file, index) => {
      const fileItem = document.createElement('div');
      fileItem.className = 'cfr-file-item-rename';
      fileItem.dataset.fileId = file.id;
      fileItem.dataset.originalFileName = file.name;
      fileItem.dataset.index = String(index);

      const originalName = document.createElement('div');
      originalName.className = 'cfr-file-name-original';

      const fileIndex = document.createElement('span');
      fileIndex.textContent = `${index + 1}.`;
      fileIndex.className = 'cfr-file-index';

      const fileName = document.createElement('span');
      fileName.textContent = file.name;

      originalName.appendChild(fileIndex);
      originalName.appendChild(fileName);

      const arrowIcon = document.createElement('div');
      arrowIcon.className = 'cfr-arrow-icon';
      arrowIcon.innerHTML = '→';

      const newName = document.createElement('div');
      newName.className = 'cfr-file-name-new';
      newName.textContent = file.name;

      fileItem.appendChild(originalName);
      fileItem.appendChild(arrowIcon);
      fileItem.appendChild(newName);
      fragment.appendChild(fileItem);
    });

    fileList.appendChild(fragment);

    bodyContainer.appendChild(configArea);
    bodyContainer.appendChild(separator);
    bodyContainer.appendChild(fileList);

    // Tab 容器
    const tabContainer = document.createElement('div');
    tabContainer.className = 'cfr-tab-container';

    let activeType = 'sequence';
    const tabItems = [];

    RENAME_TYPES.forEach(({ key, label }, index) => {
      const tabItem = document.createElement('div');
      tabItem.className = 'cfr-tab-item' + (index === 0 ? ' active' : '');
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
    headerRight.className = 'cfr-modal-header-right';
    headerRight.appendChild(tabContainer);

    // 根据类型更新配置区域
    function updateConfigArea(type) {
      configArea.innerHTML = '';
      const inputsContainer = document.createElement('div');
      inputsContainer.className = 'cfr-rename-inputs-container';

      switch (type) {
        case 'sequence': {
          const prefixInput = document.createElement('input');
          prefixInput.type = 'text';
          prefixInput.className = 'cfr-rename-config-input';
          prefixInput.placeholder = '追加前缀';

          const numberInput = document.createElement('input');
          numberInput.type = 'number';
          numberInput.className = 'cfr-rename-config-input';
          numberInput.placeholder = '默认序号';

          const suffixInput = document.createElement('input');
          suffixInput.type = 'text';
          suffixInput.className = 'cfr-rename-config-input';
          suffixInput.placeholder = '追加后缀';

          inputsContainer.appendChild(prefixInput);
          inputsContainer.appendChild(numberInput);
          inputsContainer.appendChild(suffixInput);
          break;
        }
        case 'append': {
          const prefixInput = document.createElement('input');
          prefixInput.type = 'text';
          prefixInput.className = 'cfr-rename-config-input';
          prefixInput.placeholder = '追加前缀';

          const suffixInput = document.createElement('input');
          suffixInput.type = 'text';
          suffixInput.className = 'cfr-rename-config-input';
          suffixInput.placeholder = '追加后缀';

          inputsContainer.appendChild(prefixInput);
          inputsContainer.appendChild(suffixInput);
          break;
        }
        case 'replace': {
          const findInput = document.createElement('input');
          findInput.type = 'text';
          findInput.className = 'cfr-rename-config-input';
          findInput.placeholder = '查找内容';

          const replaceInput = document.createElement('input');
          replaceInput.type = 'text';
          replaceInput.className = 'cfr-rename-config-input';
          replaceInput.placeholder = '替换内容';

          inputsContainer.appendChild(findInput);
          inputsContainer.appendChild(replaceInput);

          // 忽略大小写选项（来自 123 云盘）
          const ignoreCaseLabel = document.createElement('label');
          ignoreCaseLabel.className = 'cfr-checkbox-button';

          const ignoreCaseCheckbox = document.createElement('input');
          ignoreCaseCheckbox.type = 'checkbox';
          ignoreCaseCheckbox.className = 'cfr-checkbox-input';

          const ignoreCaseText = document.createElement('span');
          ignoreCaseText.textContent = '忽略大小写';
          ignoreCaseText.className = 'cfr-checkbox-text';

          ignoreCaseLabel.appendChild(ignoreCaseCheckbox);
          ignoreCaseLabel.appendChild(ignoreCaseText);
          inputsContainer.appendChild(ignoreCaseLabel);
          break;
        }
        case 'regex': {
          const regexInput = document.createElement('input');
          regexInput.type = 'text';
          regexInput.className = 'cfr-rename-config-input';
          regexInput.placeholder = '正则表达式';

          const replaceInput = document.createElement('input');
          replaceInput.type = 'text';
          replaceInput.className = 'cfr-rename-config-input';
          replaceInput.placeholder = '替换内容';

          inputsContainer.appendChild(regexInput);
          inputsContainer.appendChild(replaceInput);

          const regexErrorHint = document.createElement('span');
          regexErrorHint.style.cssText = 'color: #ff4d4f; font-size: 12px; display: none; margin-top: 4px;';
          regexErrorHint.className = 'cfr-regex-error-hint';
          inputsContainer.appendChild(regexErrorHint);
          break;
        }
        case 'format': {
          const suffixInput = document.createElement('input');
          suffixInput.type = 'text';
          suffixInput.className = 'cfr-rename-config-input';
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
      // checkbox 也需要监听
      inputsContainer.querySelectorAll('input[type="checkbox"]').forEach(input => {
        input.addEventListener('change', updateRenamePreview);
      });
    }

    // 更新重命名预览
    function updateRenamePreview() {
      const fileItems = fileList.querySelectorAll('.cfr-file-item-rename');
      const inputs = configArea.querySelectorAll('.cfr-rename-config-input');

      fileItems.forEach(item => {
        const original = item.dataset.originalFileName;
        const idx = Number(item.dataset.index);
        const newNameEl = item.querySelector('.cfr-file-name-new');
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
            const ignoreCaseCheckbox = configArea.querySelector('input[type="checkbox"]');
            const ignoreCase = ignoreCaseCheckbox ? ignoreCaseCheckbox.checked : false;
            if (search) {
              if (ignoreCase) {
                const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                result = original.replace(regex, replace);
              } else {
                result = original.split(search).join(replace);
              }
            }
            break;
          }
          case 'regex': {
            const pattern = inputs[0]?.value || '';
            const replacement = inputs[1]?.value || '';
            const regexErrorHint = configArea.querySelector('.cfr-regex-error-hint');
            if (pattern) {
              try {
                result = original.replace(new RegExp(pattern, 'g'), () => replacement);
                if (regexErrorHint) { regexErrorHint.style.display = 'none'; regexErrorHint.textContent = ''; }
                inputs[0].style.borderColor = '';
              } catch (e) {
                if (regexErrorHint) {
                  regexErrorHint.textContent = '正则表达式语法错误';
                  regexErrorHint.style.display = 'inline';
                }
                inputs[0].style.borderColor = '#ff4d4f';
              }
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

    // 初始化配置区域
    updateConfigArea('sequence');

    const statsContainer = document.createElement('div');
    statsContainer.className = 'cfr-stats-container';
    statsContainer.innerHTML = `<span class="cfr-stats-item">共 <strong>${files.length}</strong> 个文件</span>`;

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '上一步';
    prevBtn.className = 'cfr-btn';
    prevBtn.onclick = () => {
      renameModal.close();
      showSortModal(files, platform);
    };

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '确定';
    confirmBtn.className = 'cfr-btn-primary';
    let hasExecuted = false;
    confirmBtn.onclick = async () => {
      if (hasExecuted) {
        log('[Modal] 重命名已完成，关闭弹窗并刷新页面');
        renameModal.close();
        window.location.reload();
        return;
      }

      log(`[Modal] 开始执行重命名，类型: ${activeType}`);
      prevBtn.style.display = 'none';

      const inputs = configArea.querySelectorAll('input');
      inputs.forEach(input => { input.disabled = true; });

      // 收集重命名列表
      const renamedFiles = [];
      const fileItems = fileList.querySelectorAll('.cfr-file-item-rename');
      fileItems.forEach(item => {
        const fileId = item.dataset.fileId;
        const originalFileName = item.dataset.originalFileName;
        const newNameEl = item.querySelector('.cfr-file-name-new');
        const newFileName = newNameEl ? newNameEl.textContent : originalFileName;
        renamedFiles.push({ id: fileId, originalFileName, newFileName });
      });
      log(`[Modal] 待重命名文件数量: ${renamedFiles.length}`);

      try {
        confirmBtn.disabled = true;
        confirmBtn.textContent = '重命名中...';

        let successCount = 0;
        let failCount = 0;

        for (const fileInfo of renamedFiles) {
          log(`[Modal] 正在重命名: ${fileInfo.originalFileName} -> ${fileInfo.newFileName}`);

          const fileItem = fileList.querySelector(`.cfr-file-item-rename[data-file-id="${fileInfo.id}"]`);
          const newNameElement = fileItem?.querySelector('.cfr-file-name-new');

          // 文件名未变，视为成功
          if (fileInfo.originalFileName === fileInfo.newFileName) {
            if (newNameElement) {
              newNameElement.style.backgroundColor = '#dfffcc';
              newNameElement.style.border = '1px solid #84d75b';
            }
            successCount++;
            if (fileItem) fileItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            continue;
          }

          // 调用重命名接口
          try {
            await platform.renameFile(fileInfo.id, fileInfo.newFileName);
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

          if (fileItem) fileItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        log(`[Modal] 重命名完成，成功: ${successCount}，失败: ${failCount}`);
        updateRenameStats(statsContainer, renamedFiles.length, successCount, failCount);

        // 重命名完成后清除缓存，避免下次操作使用过时数据
        if (platform.clearCache) platform.clearCache();

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
    footerButtonsContainer.className = 'cfr-footer-buttons-container';
    footerButtonsContainer.appendChild(prevBtn);
    footerButtonsContainer.appendChild(confirmBtn);

    const footerContent = document.createElement('div');
    footerContent.className = 'cfr-modal-footer-content';
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
  //  初始化入口
  // ========================
  let currentPlatform = null;

  async function handleButtonClick() {
    if (!currentPlatform) return;
    if (currentPlatform.isUpdating()) return;

    const selectedFiles = await currentPlatform.getSelectedFiles();
    if (selectedFiles.length === 0) return;

    showSortModal(selectedFiles, currentPlatform);
  }

  // 启动
  (async () => {
    const platformType = detectPlatform();
    if (!platformType) {
      log('[Init] 无法识别当前平台，脚本退出');
      return;
    }

    log(`[Init] 检测到平台: ${platformType}`);

    if (platformType === '123') {
      currentPlatform = new Platform123();
    } else if (platformType === 'quark') {
      currentPlatform = new PlatformQuark();
    } else if (platformType === 'guangya') {
      currentPlatform = new PlatformGuangya();
    }

    // 初始化 API
    if (currentPlatform.initAPI) currentPlatform.initAPI();

    // 等待按钮容器出现
    await waitForElement(currentPlatform.getButtonContainerSelector());

    let buttonEl = null;

    const ensureButton = () => {
      if (!buttonEl || !document.contains(buttonEl)) {
        buttonEl = currentPlatform.injectButton(() => handleButtonClick());
      }
      return buttonEl;
    };

    const onSelectionChange = () => {
      const btn = ensureButton();
      currentPlatform.updateButtonVisibility(btn);
    };

    currentPlatform.initFileSelection(onSelectionChange);

    buttonEl = currentPlatform.injectButton(() => handleButtonClick());
    currentPlatform.updateButtonVisibility(buttonEl);

    currentPlatform.setupObserver(() => {
      const btn = ensureButton();
      currentPlatform.updateButtonVisibility(btn);
    });

    log(`[Init] 初始化完成，平台: ${platformType}`);
  })();

})();
