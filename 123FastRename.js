// ==UserScript==
// @name         123云盘文件批量重命名助手
// @name:en      123FastRename
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  123云盘文件批量重命名助手
// @author       meguoe
// @license      Apache-2.0
// @match        *://*.123pan.com/*
// @match        *://*.123pan.cn/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=123pan.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const CONSTANTS = {
        API_DELAY: 100,
        PAGE_SIZE: 100,
        PRIMARY_COLOR: '#2961D9',
        BORDER_COLOR: '#d9d9d9',
        TEXT_COLOR: '#919191',
        TEXT_COLOR_DARK: '#333',
        TEXT_COLOR_LIGHT: '#999',
        DELETE_BTN_COLOR: '#ff4d4f',
        DELETE_BTN_HOVER: '#f44336',
        MODAL_Z_INDEX: 9999,
        FILE_TYPE_FILE: 0,
        FILE_TYPE_FOLDER: 1,
        CATEGORY_VIDEO: '2',
        DEBUG_MODE: false
    };

    const logger = {
        log: (...args) => {
            if (CONSTANTS.DEBUG_MODE) {
                console.log('[123FASTRENAME]', ...args);
            }
        },
        error: (...args) => {
            if (CONSTANTS.DEBUG_MODE) {
                console.error('[123FASTRENAME]', ...args);
            }
        },
        warn: (...args) => {
            if (CONSTANTS.DEBUG_MODE) {
                console.warn('[123FASTRENAME]', ...args);
            }
        }
    };

    const CSS_STYLES = `
        .separator {
            height: 1px;
            margin: 12px 0;
            border-bottom: 1px dashed #d9d9d9;
        }
        .sfr-button-container {
            position: relative;
            display: none;
        }

        .sfr-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        }

        .sfr-modal-content {
            background: #fff;
            border-radius: 20px;
            width: 70vw;
            height: 80vh;
            display: flex;
            font-size: 14px;
            flex-direction: column;
            box-shadow: 0px 4px 60px 0px rgba(0, 0, 0, 0.1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .sfr-modal-header {
            padding: 16px 20px;
            border-bottom: 1px solid #e8e8e8;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .sfr-modal-title-container {
            display: flex;
            flex-direction: row;
            align-items: baseline;
            gap: 12px;
        }

        .sfr-modal-title {
            margin: 0;
            font-size: 16px;
            font-weight: 500;
            color: #333;
        }

        .sfr-modal-subtitle {
            margin: 0;
            font-size: 12px;
            color: #999;
        }

        .sfr-button-container-inner {
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .sfr-modal-body {
            padding: 20px;
            overflow-y: auto;
            flex: 1;
        }

        .sfr-file-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-width: 100%;
            width: 100%;
            overflow-x: hidden;
        }

        .sfr-file-item {
            display: flex;
            align-items: center;
            padding: 12px;
            background: #f5f5f5;
            border-radius: 8px;
            transition: background 0.2s, transform 0.2s;
            cursor: move;
            gap: 12px;
            border: 1px solid #d7d7d7;
        }

        .sfr-file-item:hover {
            background: #e8e8e8;
        }

        .sfr-file-item.dragging {
            opacity: 0.5;
            transform: scale(0.98);
        }

        .sfr-file-index {
            color: rgb(51, 51, 51);
            min-width: 30px;
            font-size: 14px;
        }

        .sfr-file-name {
            flex: 1;
            color: #333;
            word-break: break-all;
        }

        .sfr-file-size {
            color: #999;
            font-size: 12px;
        }

        .sfr-file-delete-btn {
            padding: 2px !important;
            width: 16px !important;
            height: 16px !important;
            border: none;
            background: #ff4d4f;
            color: #fff;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }

        .sfr-file-delete-btn:hover {
            background: #f44336;
        }

        .sfr-file-item-rename {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            max-width: 100%;
            width: 100%;
        }

        .sfr-file-item-rename .sfr-file-name-original {
            flex: 1;
            color: #999;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px;
            background: #f5f5f5;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #d7d7d7;
        }

        .sfr-file-item-rename .sfr-file-name-original span:last-child {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .sfr-file-item-rename .sfr-file-index {
            color: #666;
            min-width: 30px;
            font-size: 14px;
            flex-shrink: 0;
        }

        .sfr-file-item-rename .sfr-arrow-icon {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            color: #f44336;
            font-size: 18px;
            font-weight: 500;
        }

        .sfr-file-item-rename .sfr-file-name-new {
            flex: 1;
            color: #333;
            font-size: 14px;
            padding: 12px;
            background: #f5f5f5;
            border-radius: 8px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            border: 1px solid #d7d7d7;
        }

        .sfr-modal-header-right {
            margin-left: auto;
            display: flex;
            align-items: center;
        }

        .sfr-tab-container {
            display: flex;
            gap: 4px;
            background: #f5f5f5;
            padding: 4px;
            border-radius: 8px;
        }

        .sfr-tab-item {
            padding: 6px 12px;
            font-size: 12px;
            color: #666;
            cursor: pointer;
            border-radius: 6px;
            transition: all 0.2s;
            user-select: none;
        }

        .sfr-tab-item:hover {
            color: #2961D9;
        }

        .sfr-tab-item.active {
            background: #fff;
            color: #2961D9;
            font-weight: 500;
        }

        .sfr-modal-footer {
            padding: 16px 20px;
            border-top: 1px solid #e8e8e8;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
        }

        .sfr-rename-config {
            padding: 16px;
            background: #f5f5f5;
            border-radius: 8px;
            margin-bottom: 12px;
            border: 1px solid #d7d7d7;
        }

        .sfr-rename-inputs-container {
            display: flex;
            gap: 12px;
        }

        .sfr-rename-config-input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #d9d9d9;
            border-radius: 8px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
        }

        .sfr-rename-config-input:focus {
            border-color: #2961D9;
        }

        .sfr-checkbox-button {
            padding: 6px 10px;
            background: #fff;
            border: 1px solid #d9d9d9;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
            color: #666;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .sfr-checkbox-button:hover {
            border-color: #2961D9;
            color: #2961D9;
        }

        .sfr-checkbox-button[data-checked="true"] {
            border-color: #2961D9;
            color: #2961D9;
        }

        .sfr-checkbox-label {
            display: flex;
            align-items: center;
            cursor: pointer;
            pointer-events: none;
        }

        .sfr-checkbox-span {
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .sfr-checkbox-input {
            cursor: pointer;
            pointer-events: none;
        }

        .sfr-checkbox-text {
            padding: 0;
            font-size: 13px;
            font-weight: 500;
            margin-left: 6px;
            color: #919191;
        }

        .sfr-checkbox-button[data-checked="true"] .sfr-checkbox-text {
            color: #2961D9;
        }

        .sfr-drag-handle {
            color: #999;
            cursor: move;
            font-size: 16px;
            user-select: none;
        }

        .sfr-stats-container {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 0;
            font-size: 13px;
            color: #666;
        }

        .sfr-stats-item {
            display: flex;
            align-items: center;
        }

        .sfr-stats-item strong {
            color: #2961D9;
            margin: 0 2px;
        }

        .sfr-modal-footer-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            gap: 16px;
        }

        .sfr-footer-buttons-container {
            display: flex;
            align-items: center;
            gap: 8px;
        }
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = CSS_STYLES;
    document.head.appendChild(styleElement);

    // 1. 123云盘API通信类
    class PanApiClient {
        constructor() {
            this.host = 'https://' + window.location.host;
            this.authToken = localStorage['authorToken'] || '';
            this.loginUuid = localStorage['LoginUuid'] || '';
            this.appVersion = '3';
            this.referer = document.location.href;
            this._validateCredentials();
        }

        _validateCredentials() {
            if (!this.authToken || !this.loginUuid) {
                logger.warn('[PanApiClient]', '缺少认证信息，请先登录');
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
                const response = await fetch(this.buildURL(path, queryParams), {
                    method, headers, body, credentials: 'include'
                });
                const data = await response.json();
                if (data.code !== 0) {
                    throw new Error(data.message || 'API请求失败');
                }
                await new Promise(resolve => setTimeout(resolve, CONSTANTS.API_DELAY));
                return data;
            } catch (e) {
                logger.error('[PanApiClient]', 'API请求失败:', e);
                throw e;
            }
        }

        async getOnePageFileList(parentFileId, page) {
            const urlParams = {
                driveId: '0',
                limit: '100',
                next: '0',
                orderBy: 'file_name',
                orderDirection: 'asc',
                parentFileId: parentFileId.toString(),
                trashed: 'false',
                SearchData: '',
                Page: page.toString(),
                OnlyLookAbnormalFile: '0',
                event: 'homeListFile',
                operateType: '1',
                inDirectSpace: 'false'
            };
            const data = await this.sendRequest("GET", "/b/api/file/list/new", urlParams);
            return { data: { InfoList: data.data.InfoList }, total: data.data.Total };
        }

        async getFileList(parentFileId) {
            let InfoList = [];
            const info = await this.getOnePageFileList(parentFileId, 1);
            InfoList.push(...info.data.InfoList);
            const total = info.total;
            if (total > 100) {
                const times = Math.ceil(total / 100);
                for (let i = 2; i < times + 1; i++) {
                    const info = await this.getOnePageFileList(parentFileId, i);
                    InfoList.push(...info.data.InfoList);
                }
            }
            return { data: { InfoList }, total: total };
        }

        async getFileInfo(idList) {
            const fileIdList = idList.map(fileId => ({ fileId }));
            const data = await this.sendRequest("POST", "/b/api/file/info", {}, JSON.stringify({ fileIdList }));
            return { data: { InfoList: data.data.infoList } };
        }

        async fileRename(fileInfo) {
            if (fileInfo.OriginalFileName === fileInfo.NewFileName) {
                return true;
            }

            const data = await this.sendRequest("POST", "/b/api/file/rename", {}, JSON.stringify({ 
                driveId: '0',
                duplicate: '1',
                fileId: Number(fileInfo.FileId), 
                fileName: fileInfo.NewFileName,
            }));

            return data.code === 0;
        }
    }

    // 2. 选中文件管理类
    class TableRowSelector {
        constructor() {
            this.selectedRowKeys = [];
            this.unselectedRowKeys = [];
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

            const originalCreateElement = document.createElement;
            const self = this;
            document.createElement = function (tagName, options) {
                const element = originalCreateElement.call(document, tagName, options);
                if (!(tagName.toLowerCase() === 'input')) {
                    return element;
                }
                const observer = new MutationObserver(() => {
                    if (element.classList.contains('ant-checkbox-input')) {
                        const isSelectAll = element.getAttribute('aria-label') === 'Select all';
                        const tableRow = element.closest('.ant-table-row');
                        
                        if (!isSelectAll && !tableRow) {
                            observer.disconnect();
                            return;
                        }
                        
                        if (isSelectAll) {
                            self.unselectedRowKeys = [];
                            self.selectedRowKeys = [];
                            self.isSelectAll = false;
                            self._bindSelectAllEvent(element);
                        } else {
                            const input = element;
                            input.addEventListener('click', function () {
                                const rowKey = tableRow.getAttribute('data-row-key');
                                if (self.isSelectAll) {
                                    if (!this.checked) {
                                        if (!self.unselectedRowKeys.includes(rowKey)) {
                                            self.unselectedRowKeys.push(rowKey);
                                        }
                                    } else {
                                        const idx = self.unselectedRowKeys.indexOf(rowKey);
                                        if (idx > -1) {
                                            self.unselectedRowKeys.splice(idx, 1);
                                        }
                                    }
                                } else {
                                    if (this.checked) {
                                        if (!self.selectedRowKeys.includes(rowKey)) {
                                            self.selectedRowKeys.push(rowKey);
                                        }
                                    } else {
                                        const idx = self.selectedRowKeys.indexOf(rowKey);
                                        if (idx > -1) {
                                            self.selectedRowKeys.splice(idx, 1);
                                        }
                                    }
                                }
                                self._outputSelection();
                                self._notifyCallbacks();
                            });
                        }
                    }
                    observer.disconnect();
                });
                observer.observe(element, {
                    attributes: true,
                    attributeFilter: ['class', 'aria-label']
                });
                self._observers.push(observer);
                return element;
            };
        }

        _bindSelectAllEvent(checkbox) {
            if (checkbox.dataset.selectAllBound) return;
            checkbox.dataset.selectAllBound = 'true';
            checkbox.addEventListener('click', () => {
                if (checkbox.checked) {
                    this.isSelectAll = true;
                    this.unselectedRowKeys = [];
                    this.selectedRowKeys = [];
                } else {
                    this.isSelectAll = false;
                    this.selectedRowKeys = [];
                    this.unselectedRowKeys = [];
                }
                this._outputSelection();
                this._notifyCallbacks();
            });
        }

        _outputSelection() {
            if (this.isSelectAll) {
                if (this.unselectedRowKeys.length === 0) {
                } else {
                }
            }
        }

        _notifyCallbacks() {
            this._callbacks.forEach(callback => callback());
        }

        onSelectionChange(callback) {
            this._callbacks.push(callback);
        }

        getSelection() {
            return {
                isSelectAll: this.isSelectAll,
                selectedRowKeys: [...this.selectedRowKeys],
                unselectedRowKeys: [...this.unselectedRowKeys]
            };
        }

        destroy() {
            this._observers.forEach(observer => {
                observer.disconnect();
            });
            this._observers = [];
            if (this._breadcrumbObserver) {
                this._breadcrumbObserver.disconnect();
                this._breadcrumbObserver = null;
            }
        }

        _observeBreadcrumb() {
            const breadcrumb = document.querySelector('.home-breadcrumb');
            if (!breadcrumb) {
                logger.log('面包屑元素不存在，延迟重试');
                setTimeout(() => this._observeBreadcrumb(), 100);
                return;
            }

            this._breadcrumbObserver = new MutationObserver(() => {
                logger.log('检测到面包屑变化，清空所有选择');
                this.selectedRowKeys = [];
                this.unselectedRowKeys = [];
                this.isSelectAll = false;
                this._notifyCallbacks();
            });

            this._breadcrumbObserver.observe(breadcrumb, {
                childList: true,
                subtree: true,
                attributes: true,
                characterData: true
            });
            logger.log('面包屑监听已启动');
        }
    }

    // 3. 选中文件管理类
    class SelectedFilesManager {
        constructor(apiClient, selector) {
            this.apiClient = apiClient;
            this.selector = selector;
            this.selectedFiles = [];
            this._callbacks = [];
            this._debounceTimer = null;
            this._cachedFileList = null;
            this._cachedParentFileId = null;
            this._isUpdating = false;
        }

        init() {
            this.selector.onSelectionChange(() => {
                logger.log('文件选择变化，开始防抖更新');
                this._debounceUpdate();
            });
        }

        _debounceUpdate() {
            if (this._debounceTimer) {
                clearTimeout(this._debounceTimer);
            }
            this._debounceTimer = setTimeout(() => {
                logger.log('防抖结束，开始更新选中文件');
                this._updateSelectedFiles();
            }, 300);
        }

        async _updateSelectedFiles() {
            logger.log('_updateSelectedFiles 开始执行，_isUpdating:', this._isUpdating);
            this._isUpdating = true;
            
            const selection = this.selector.getSelection();
            logger.log('当前选择状态:', selection);
            this.selectedFiles = [];

            const extractFileFields = (file) => ({
                FileId: file.FileId,
                FileName: file.FileName,
                Size: file.Size,
                Trashed: file.Trashed,
                Category: file.Category,
                Type: file.Type
            });

            if (selection.isSelectAll) {
                logger.log('全选模式');
                const parentFileId = await this._getParentFileId();
                logger.log('父级文件ID:', parentFileId);
                
                let allFiles;
                if (this._cachedFileList && this._cachedParentFileId === parentFileId) {
                    allFiles = this._cachedFileList;
                    logger.log('_updateSelectedFiles using cached file list');
                } else {
                    const fileList = await this.apiClient.getFileList(parentFileId);
                    allFiles = fileList.data.InfoList;
                    this._cachedFileList = allFiles;
                    this._cachedParentFileId = parentFileId;
                    logger.log('_updateSelectedFiles allFiles:', allFiles.length);
                }
                
                if (selection.unselectedRowKeys.length === 0) {
                    // 全选且没有取消的文件，直接使用所有文件
                    logger.log('全选且没有取消的文件');
                    this.selectedFiles = allFiles
                        .filter(file => file.Type !== CONSTANTS.FILE_TYPE_FOLDER)
                        .map(extractFileFields);
                    logger.log('_updateSelectedFiles selectedFiles:', this.selectedFiles.length);
                } else {
                    // 全选但有取消的文件，过滤掉取消的文件
                    logger.log('全选但有取消的文件，取消数量:', selection.unselectedRowKeys.length);
                    this.selectedFiles = allFiles
                        .filter(file => {
                            const fileIdStr = String(file.FileId);
                            const isUnselected = selection.unselectedRowKeys.some(key => String(key) === fileIdStr);
                            const isFile = file.Type !== CONSTANTS.FILE_TYPE_FOLDER;
                            return !isUnselected && isFile;
                        })
                        .map(extractFileFields);
                    logger.log('_updateSelectedFiles selectedFiles:', this.selectedFiles.length);
                }
            } else {
                // 非全选模式，清除缓存
                logger.log('非全选模式');
                this._cachedFileList = null;
                this._cachedParentFileId = null;
                
                // 非全选模式，使用 getFileInfo 获取选中的文件
                const fileIds = selection.selectedRowKeys;
                logger.log('_updateSelectedFiles fileIds:', fileIds.length, fileIds);
                
                if (fileIds.length > 0) {
                    try {
                        const fileInfoList = await this.apiClient.getFileInfo(fileIds);
                        this.selectedFiles = fileInfoList.data.InfoList
                            .filter(file => file.Type !== CONSTANTS.FILE_TYPE_FOLDER)
                            .map(extractFileFields);
                        logger.log('_updateSelectedFiles selectedFiles:', this.selectedFiles.length);
                    } catch (e) {
                        logger.error('[SelectedFilesManager]', '获取文件信息失败:', e);
                    }
                }
            }

            this._notifyCallbacks();
            
            this._isUpdating = false;
            logger.log('_updateSelectedFiles 执行完成，最终选中文件数:', this.selectedFiles.length);
            
            return this.selectedFiles;
        }

        async _getParentFileId() {
            try {
                const homeFilePath = JSON.parse(sessionStorage['filePath'])['homeFilePath'];
                const parentFileId = (homeFilePath[homeFilePath.length - 1] || 0);
                return parentFileId.toString();
            } catch (e) {
                logger.error('[SelectedFilesManager]', '获取父级文件ID失败:', e);
                return '0';
            }
        }

        _notifyCallbacks() {
            this._callbacks.forEach(callback => callback());
        }

        onFilesChange(callback) {
            this._callbacks.push(callback);
        }

        isUpdating() {
            return this._isUpdating;
        }

        getSelectedFiles() {
            return [...this.selectedFiles];
        }

        hasSelectedFiles() {
            return this.selectedFiles.length > 0;
        }
    }

    // 4. 模态框组件类
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
            modal.className = 'sfr-modal-overlay';

            const modalContent = document.createElement('div');
            modalContent.className = 'sfr-modal-content';

            const modalHeader = document.createElement('div');
            modalHeader.className = 'sfr-modal-header';

            const titleContainer = document.createElement('div');
            titleContainer.className = 'sfr-modal-title-container';

            const modalTitle = document.createElement('h3');
            modalTitle.textContent = this.title;
            modalTitle.className = 'sfr-modal-title';

            titleContainer.appendChild(modalTitle);

            if (this.subtitle) {
                const modalSubtitle = document.createElement('p');
                modalSubtitle.textContent = this.subtitle;
                modalSubtitle.className = 'sfr-modal-subtitle';
                titleContainer.appendChild(modalSubtitle);
            }

            modalHeader.appendChild(titleContainer);

            if (this.headerButtons) {
                modalHeader.appendChild(this.headerButtons);
            }

            if (this.headerRight) {
                modalHeader.appendChild(this.headerRight);
            }

            const modalBody = document.createElement('div');
            modalBody.className = 'sfr-modal-body';

            if (this.bodyContent) {
                modalBody.appendChild(this.bodyContent);
            }

            const modalFooter = document.createElement('div');
            modalFooter.className = 'sfr-modal-footer';

            if (this.footerContent) {
                modalFooter.appendChild(this.footerContent);
            } else {
                this.footerButtons.forEach(btn => {
                    modalFooter.appendChild(btn);
                });
            }

            modalContent.appendChild(modalHeader);
            modalContent.appendChild(modalBody);
            modalContent.appendChild(modalFooter);
            modal.appendChild(modalContent);

            modal.onclick = (e) => {
                if (e.target === modal) {
                    this.close();
                }
            };

            this.modal = modal;
            return modal;
        }

        show() {
            if (!this.modal) {
                this.create();
            }
            document.body.appendChild(this.modal);
        }

        close() {
            if (this.modal) {
                this.modal.remove();
                this.modal = null;
            }
            if (this.onClose) {
                this.onClose();
            }
        }
    }

    // 5. UI管理类
    class UiManager {
        constructor(selectedFilesManager, selector, apiClient) {
            this.selectedFilesManager = selectedFilesManager;
            this.selector = selector;
            this.apiClient = apiClient;
            this.actionButton = null;
            this._observer = null;
            this._sortModal = null;
            this._renameModal = null;
            this._statsContainer = null;
        }

        init() {
            this.selector.init();
            this.selectedFilesManager.init();
            this.selectedFilesManager.onFilesChange(() => {
                this._updateActionButton();
            });
            this._waitForContainerAndCreateButton();
        }

        _waitForContainerAndCreateButton() {
            const checkAndCreate = () => {
                const container = document.querySelector('.home-operator-button-group');
                if (container) {
                    this._createActionButton();
                    if (this._observer) {
                        this._observer.disconnect();
                        this._observer = null;
                    }
                }
            };

            checkAndCreate();

            if (!this.actionButton) {
                this._observer = new MutationObserver((mutations) => {
                    checkAndCreate();
                });
                this._observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }
        }

        _createActionButton() {
            logger.log('开始创建批量重命名按钮');
            const buttonExist = document.querySelector('.sfr-button-container');
            if (buttonExist) {
                logger.log('按钮已存在，复用现有按钮');
                this.actionButton = buttonExist;
                return;
            }

            const container = document.querySelector('.home-operator-button-group');
            if (!container) {
                logger.log('未找到按钮容器，延迟重试');
                return;
            }

            const btnContainer = document.createElement('div');
            btnContainer.className = 'sfr-button-container';

            const btn = document.createElement('button');
            btn.className = 'ant-btn css-1doczi2 css-var-_r_0_ ant-btn-primary ant-btn-color-primary ant-btn-variant-solid ant-dropdown-trigger mfy-button upload-button mfy-button';
            btn.innerHTML = `<span>批量重命名</span>`;

            btn.addEventListener('click', () => {
                this._handleButtonClick();
            });

            btnContainer.appendChild(btn);

            container.insertBefore(btnContainer, container.firstChild);

            this.actionButton = btnContainer;
            logger.log('批量重命名按钮创建完成');
        }

        _updateActionButton() {
            if (!this.actionButton) {
                return;
            }

            const hasFiles = this.selectedFilesManager.hasSelectedFiles();
            if (hasFiles) {
                this.actionButton.style.display = 'inline-block';
            } else {
                this.actionButton.style.display = 'none';
            }
        }

        _handleButtonClick() {
            if (this.selectedFilesManager.isUpdating()) {
                return;
            }
            
            this.selectedFilesManager._updateSelectedFiles().then(() => {
                const selectedFiles = this.selectedFilesManager.getSelectedFiles();
                this._showFileListModal(selectedFiles);
            });
        }

        _createCheckboxButton(text, defaultChecked = false, onChange = null) {
            const button = document.createElement('button');
            button.className = 'sfr-checkbox-button';
            button.dataset.checked = defaultChecked.toString();

            const checkboxLabel = document.createElement('label');
            checkboxLabel.className = 'ant-checkbox-wrapper css-var-_r_0_ ant-checkbox-css-var css-1doczi2 sfr-checkbox-label';

            const checkboxSpan = document.createElement('span');
            checkboxSpan.className = 'ant-checkbox ant-wave-target css-1doczi2 sfr-checkbox-span';

            const checkboxInput = document.createElement('input');
            checkboxInput.type = 'checkbox';
            checkboxInput.className = 'ant-checkbox-input sfr-checkbox-input';
            checkboxInput.checked = defaultChecked;

            const checkboxLabelText = document.createElement('span');
            checkboxLabelText.textContent = text;
            checkboxLabelText.className = 'sfr-checkbox-text';

            checkboxSpan.appendChild(checkboxInput);
            checkboxLabel.appendChild(checkboxSpan);
            checkboxLabel.appendChild(checkboxLabelText);
            button.appendChild(checkboxLabel);

            if (defaultChecked) {
                checkboxLabel.classList.add('ant-checkbox-wrapper-checked');
                checkboxSpan.classList.add('ant-checkbox-checked');
            }

            button.onmouseover = () => {
                if (button.dataset.checked === 'false') {
                    button.style.borderColor = CONSTANTS.PRIMARY_COLOR;
                    button.style.color = CONSTANTS.PRIMARY_COLOR;
                }
            };
            button.onmouseout = () => {
                if (button.dataset.checked === 'false') {
                    button.style.borderColor = CONSTANTS.BORDER_COLOR;
                    button.style.color = CONSTANTS.TEXT_COLOR;
                }
            };

            button.onclick = () => {
                const isChecked = button.dataset.checked === 'true';
                const newState = !isChecked;
                button.dataset.checked = newState.toString();
                checkboxInput.checked = newState;
                
                if (newState) {
                    checkboxLabel.classList.add('ant-checkbox-wrapper-checked');
                    checkboxSpan.classList.add('ant-checkbox-checked');
                } else {
                    checkboxLabel.classList.remove('ant-checkbox-wrapper-checked');
                    checkboxSpan.classList.remove('ant-checkbox-checked');
                }

                if (onChange && typeof onChange === 'function') {
                    onChange(newState);
                }
            };

            return {
                button,
                checkboxLabel,
                checkboxSpan,
                checkboxInput,
                checkboxLabelText,
                setChecked: (checked) => {
                    button.dataset.checked = checked.toString();
                    checkboxInput.checked = checked;
                    if (checked) {
                        checkboxLabel.classList.add('ant-checkbox-wrapper-checked');
                        checkboxSpan.classList.add('ant-checkbox-checked');
                    } else {
                        checkboxLabel.classList.remove('ant-checkbox-wrapper-checked');
                        checkboxSpan.classList.remove('ant-checkbox-checked');
                    }
                },
                isChecked: () => button.dataset.checked === 'true'
            };
        }

        _showFileListModal(files) {
            const fileList = document.createElement('div');
            fileList.className = 'sfr-file-list';

            let draggedItem = null;
            const fragment = document.createDocumentFragment();

            files.forEach((file, index) => {
                const fileItem = document.createElement('div');
                fileItem.className = 'sfr-file-item';
                fileItem.dataset.fileId = file.FileId;
                fileItem.dataset.category = file.Category || '0';
                fileItem.draggable = true;

                fileItem.addEventListener('dragstart', (e) => {
                    draggedItem = fileItem;
                    fileItem.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', file.FileId);
                });

                fileItem.addEventListener('dragend', () => {
                    draggedItem = null;
                    fileItem.classList.remove('dragging');
                    
                    const allItems = fileList.querySelectorAll('.sfr-file-item');
                    allItems.forEach(item => {
                        item.style.transform = '';
                    });
                    
                    this._updateFileIndices(fileList);
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
                    if (draggedItem && draggedItem !== fileItem) {
                        fileItem.style.transform = 'translateY(4px)';
                    }
                });

                fileItem.addEventListener('dragleave', (e) => {
                    if (draggedItem && draggedItem !== fileItem) {
                        fileItem.style.transform = '';
                    }
                });

                fileItem.addEventListener('drop', (e) => {
                    e.preventDefault();
                    fileItem.style.transform = '';
                });

                const dragHandle = document.createElement('span');
                dragHandle.innerHTML = '⋮⋮';
                dragHandle.className = 'sfr-drag-handle';

                const fileIndex = document.createElement('span');
                fileIndex.textContent = `${index + 1}.`;
                fileIndex.className = 'sfr-file-index';

                const fileName = document.createElement('span');
                fileName.textContent = file.FileName;
                fileName.className = 'sfr-file-name';

                const fileSize = document.createElement('span');
                fileSize.textContent = this._formatFileSize(file.Size);
                fileSize.className = 'sfr-file-size';

                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '×';
                deleteBtn.className = 'sfr-file-delete-btn ant-btn css-dev-only-do-not-override-168k93g ant-btn-default ant-btn-color-default ant-btn-variant-outlined';

                deleteBtn.onmousedown = (e) => {
                    e.stopPropagation();
                };
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    fileItem.remove();
                    this._updateFileIndices(fileList);
                    if (this._statsContainer) {
                        this._updateStats(fileList, files, this._statsContainer);
                    }
                };

                fileItem.appendChild(dragHandle);
                fileItem.appendChild(fileIndex);
                fileItem.appendChild(fileName);
                fileItem.appendChild(fileSize);
                fileItem.appendChild(deleteBtn);
                fragment.appendChild(fileItem);
            });

            fileList.appendChild(fragment);

            const sortButtonObj = this._createCheckboxButton('文件名降序', false, (isChecked) => {
                const fileItems = Array.from(fileList.querySelectorAll('.sfr-file-item'));
                fileItems.sort((a, b) => {
                    const nameA = a.querySelector('span:nth-child(3)').textContent;
                    const nameB = b.querySelector('span:nth-child(3)').textContent;
                    if (isChecked) {
                        return nameB.localeCompare(nameA, 'zh-CN');
                    } else {
                        return nameA.localeCompare(nameB, 'zh-CN');
                    }
                });
                
                fileItems.forEach(item => {
                    fileList.appendChild(item);
                });
                
                this._updateFileIndices(fileList);
            });

            const filterButtonObj = this._createCheckboxButton('过滤视频文件', true, (isChecked) => {
                const fileItems = fileList.querySelectorAll('.sfr-file-item');
                fileItems.forEach(item => {
                    const category = item.dataset.category;
                    if (isChecked && category !== CONSTANTS.CATEGORY_VIDEO) {
                        item.style.display = 'none';
                    } else {
                        item.style.display = 'flex';
                    }
                });
                this._updateFileIndices(fileList);
                this._updateStats(fileList, files, statsContainer);
            });

            const headerButtonsContainer = document.createElement('div');
            headerButtonsContainer.className = 'sfr-button-container-inner';
            headerButtonsContainer.appendChild(sortButtonObj.button);
            headerButtonsContainer.appendChild(filterButtonObj.button);

            const fileItems = fileList.querySelectorAll('.sfr-file-item');
            fileItems.forEach(item => {
                const category = item.dataset.category;
                if (category !== CONSTANTS.CATEGORY_VIDEO) {
                    item.style.display = 'none';
                }
            });
            this._updateFileIndices(fileList);

            const statsContainer = document.createElement('div');
            statsContainer.className = 'sfr-stats-container';
            this._statsContainer = statsContainer;

            this._updateStats(fileList, files, statsContainer);

            const nextBtn = document.createElement('button');
            nextBtn.textContent = '下一步';
            nextBtn.className = 'ant-btn css-1doczi2 css-var-_r_0_ ant-btn-primary ant-btn-color-primary ant-btn-variant-solid';
            nextBtn.onclick = () => {
                const orderedFiles = this._getOrderedFiles(fileList, files);
                logger.log('排序后的文件列表:', orderedFiles);
                this._sortModal.close();
                this._showRenameModal(orderedFiles);
            };

            const closeBtn = document.createElement('button');
            closeBtn.textContent = '取消';
            closeBtn.className = 'ant-btn css-1doczi2 css-var-_r_0_ ant-btn-default ant-btn-color-default ant-btn-variant-outlined';
            closeBtn.onclick = () => this._sortModal.close();

            const footerButtonsContainer = document.createElement('div');
            footerButtonsContainer.className = 'sfr-footer-buttons-container';
            footerButtonsContainer.appendChild(closeBtn);
            footerButtonsContainer.appendChild(nextBtn);

            const footerContent = document.createElement('div');
            footerContent.className = 'sfr-modal-footer-content';
            footerContent.appendChild(statsContainer);
            footerContent.appendChild(footerButtonsContainer);

            this._sortModal = new Modal({
                title: '文件排序',
                subtitle: '文件已自动排序，如顺序不对，请手动拖动排序，然后点击下一步',
                bodyContent: fileList,
                headerButtons: headerButtonsContainer,
                footerContent: footerContent
            });

            this._sortModal.show();
        }

        _showRenameModal(files) {
            const bodyContainer = document.createElement('div');
            bodyContainer.className = 'sfr-modal-body-container';

            const configArea = document.createElement('div');
            configArea.className = 'sfr-rename-config';

            const separator = document.createElement('div');
            separator.className = 'separator';

            const fileList = document.createElement('div');
            fileList.className = 'sfr-file-list';

            const fragment = document.createDocumentFragment();

            files.forEach((file, index) => {
                const fileItem = document.createElement('div');
                fileItem.className = 'sfr-file-item-rename';
                fileItem.dataset.fileId = file.FileId;
                fileItem.dataset.originalIndex = index;
                fileItem.dataset.originalFileName = file.FileName;

                const originalName = document.createElement('div');
                originalName.className = 'sfr-file-name-original';

                const fileIndex = document.createElement('span');
                fileIndex.textContent = `${index + 1}.`;
                fileIndex.className = 'sfr-file-index';

                const fileName = document.createElement('span');
                fileName.textContent = file.FileName;

                originalName.appendChild(fileIndex);
                originalName.appendChild(fileName);

                const arrowIcon = document.createElement('div');
                arrowIcon.className = 'sfr-arrow-icon';
                arrowIcon.innerHTML = '→';

                const newName = document.createElement('div');
                newName.className = 'sfr-file-name-new';
                newName.textContent = file.FileName;

                fileItem.appendChild(originalName);
                fileItem.appendChild(arrowIcon);
                fileItem.appendChild(newName);
                fragment.appendChild(fileItem);
            });

            fileList.appendChild(fragment);

            bodyContainer.appendChild(configArea);
            bodyContainer.appendChild(separator);
            bodyContainer.appendChild(fileList);

            const tabContainer = document.createElement('div');
            tabContainer.className = 'sfr-tab-container';

            const tabs = [
                { id: 'sequence', name: '按序号重命名' },
                { id: 'append', name: '追加重命名' },
                { id: 'findReplace', name: '查找替换' },
                { id: 'regex', name: '正则替换' },
                { id: 'format', name: '格式替换' }
            ];

            tabs.forEach((tab, index) => {
                const tabItem = document.createElement('div');
                tabItem.className = 'sfr-tab-item' + (index === 0 ? ' active' : '');
                tabItem.dataset.tabId = tab.id;
                tabItem.textContent = tab.name;

                tabItem.onclick = () => {
                    tabContainer.querySelectorAll('.sfr-tab-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    tabItem.classList.add('active');
                    logger.log('切换到模式:', tab.id);
                    this._updateConfigArea(tab.id, configArea, fileList);
                };

                tabContainer.appendChild(tabItem);
            });

            const headerRight = document.createElement('div');
            headerRight.className = 'sfr-modal-header-right';
            headerRight.appendChild(tabContainer);

            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = '确定';
            confirmBtn.className = 'ant-btn css-1doczi2 css-var-_r_0_ ant-btn-primary ant-btn-color-primary ant-btn-variant-solid';
            let hasExecuted = false;
            confirmBtn.onclick = async () => {
                if (hasExecuted) {
                    logger.log('重命名已完成，关闭弹窗并刷新页面');
                    this._renameModal.close();
                    window.location.reload();
                    return;
                }
                
                logger.log('开始执行重命名');
                prevBtn.style.display = 'none';
                
                const inputs = configArea.querySelectorAll('input');
                inputs.forEach(input => {
                    input.disabled = true;
                });
                
                const renamedFiles = [];
                const fileItems = fileList.querySelectorAll('.sfr-file-item-rename');
                logger.log('待重命名文件数量:', fileItems.length);
                fileItems.forEach(item => {
                    const fileId = item.dataset.fileId;
                    const originalFileName = item.dataset.originalFileName;
                    const newNameElement = item.querySelector('.sfr-file-name-new');
                    const newFileName = newNameElement ? newNameElement.textContent : originalFileName;
                    renamedFiles.push({
                        FileId: fileId,
                        OriginalFileName: originalFileName,
                        NewFileName: newFileName
                    });
                });
                logger.log('待重命名文件列表:', renamedFiles);
                
                try {
                    confirmBtn.disabled = true;
                    confirmBtn.textContent = '重命名中...';
                    
                    let successCount = 0;
                    let failCount = 0;
                    
                    for (const fileInfo of renamedFiles) {
                        logger.log('正在重命名文件:', fileInfo.FileId, fileInfo.OriginalFileName, '->', fileInfo.NewFileName);
                        const result = await this.apiClient.fileRename(fileInfo);
                        logger.log('重命名结果:', fileInfo.FileId, result);
                        
                        const fileItem = fileList.querySelector(`.sfr-file-item-rename[data-file-id="${fileInfo.FileId}"]`);
                        if (fileItem) {
                            const newNameElement = fileItem.querySelector('.sfr-file-name-new');
                            if (newNameElement) {
                                if (result === true) {
                                    newNameElement.style.backgroundColor = '#dfffcc';
                                    newNameElement.style.border = '1px solid #84d75b';
                                    if (fileInfo.OriginalFileName !== fileInfo.NewFileName) {
                                        successCount++;
                                    }
                                } else {
                                    newNameElement.style.backgroundColor = '#ffc4c4';
                                    newNameElement.style.border = '1px solid #d75b5b';
                                    failCount++;
                                }
                            }
                        }
                    }
                    
                    logger.log('重命名完成，成功:', successCount, '失败:', failCount);
                    this._updateRenameStats(statsContainer, renamedFiles.length, successCount, failCount);
                    
                    hasExecuted = true;
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = '关闭';
                } catch (error) {
                    logger.error('重命名失败:', error);
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = '确定';
                    
                    const inputs = configArea.querySelectorAll('input');
                    inputs.forEach(input => {
                        input.disabled = false;
                    });
                }
            };

            const prevBtn = document.createElement('button');
            prevBtn.textContent = '上一步';
            prevBtn.className = 'ant-btn css-1doczi2 css-var-_r_0_ ant-btn-default ant-btn-color-default ant-btn-variant-outlined';
            prevBtn.onclick = () => {
                this._renameModal.close();
                this._sortModal.show();
            };

            const statsContainer = document.createElement('div');
            statsContainer.className = 'sfr-stats-container';
            this._updateStats(fileList, files, statsContainer);

            const footerButtonsContainer = document.createElement('div');
            footerButtonsContainer.className = 'sfr-footer-buttons-container';
            footerButtonsContainer.appendChild(prevBtn);
            footerButtonsContainer.appendChild(confirmBtn);

            const footerContent = document.createElement('div');
            footerContent.className = 'sfr-modal-footer-content';
            footerContent.appendChild(statsContainer);
            footerContent.appendChild(footerButtonsContainer);

            this._renameModal = new Modal({
                title: '批量重命名',
                bodyContent: bodyContainer,
                headerRight: headerRight,
                footerContent: footerContent
            });

            this._renameModal.show();

            this._updateConfigArea('sequence', configArea, fileList);
        }

        _updateConfigArea(tabId, configArea, fileList) {
            configArea.innerHTML = '';

            if (tabId === 'sequence') {
                const inputsContainer = document.createElement('div');
                inputsContainer.className = 'sfr-rename-inputs-container';

                const prefixInput = document.createElement('input');
                prefixInput.type = 'text';
                prefixInput.className = 'sfr-rename-config-input';
                prefixInput.placeholder = '追加前缀';
                prefixInput.id = 'sfr-sequence-prefix';

                const numberInput = document.createElement('input');
                numberInput.type = 'number';
                numberInput.className = 'sfr-rename-config-input';
                numberInput.placeholder = '默认序号';
                numberInput.id = 'sfr-sequence-number';

                const suffixInput = document.createElement('input');
                suffixInput.type = 'text';
                suffixInput.className = 'sfr-rename-config-input';
                suffixInput.placeholder = '追加后缀';
                suffixInput.id = 'sfr-sequence-suffix';

                inputsContainer.appendChild(prefixInput);
                inputsContainer.appendChild(numberInput);
                inputsContainer.appendChild(suffixInput);

                configArea.appendChild(inputsContainer);

                const updateFileNames = () => {
                    const prefix = prefixInput.value || '';
                    const startNumberStr = numberInput.value;
                    const suffix = suffixInput.value || '';

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

                    const fileItems = fileList.querySelectorAll('.sfr-file-item-rename');
                    fileItems.forEach(item => {
                        const originalIndex = parseInt(item.dataset.originalIndex);
                        const originalFileName = item.dataset.originalFileName;
                        const ext = originalFileName.includes('.') ? '.' + originalFileName.split('.').pop() : '';
                        const sequenceNumber = startNumber + originalIndex;
                        let numberPart;
                        if (paddingLength > 0) {
                            numberPart = sequenceNumber.toString().padStart(paddingLength, '0');
                        } else {
                            numberPart = sequenceNumber.toString();
                        }
                        const newName = prefix + numberPart + suffix + ext;
                        const newNameElement = item.querySelector('.sfr-file-name-new');
                        if (newNameElement) {
                            newNameElement.textContent = newName;
                        }
                    });
                };

                prefixInput.addEventListener('input', updateFileNames);
                numberInput.addEventListener('input', updateFileNames);
                suffixInput.addEventListener('input', updateFileNames);

                setTimeout(updateFileNames, 0);
            } else if (tabId === 'append') {
                const inputsContainer = document.createElement('div');
                inputsContainer.className = 'sfr-rename-inputs-container';

                const prefixInput = document.createElement('input');
                prefixInput.type = 'text';
                prefixInput.className = 'sfr-rename-config-input';
                prefixInput.placeholder = '追加前缀';
                prefixInput.id = 'sfr-append-prefix';

                const suffixInput = document.createElement('input');
                suffixInput.type = 'text';
                suffixInput.className = 'sfr-rename-config-input';
                suffixInput.placeholder = '追加后缀';
                suffixInput.id = 'sfr-append-suffix';

                inputsContainer.appendChild(prefixInput);
                inputsContainer.appendChild(suffixInput);

                configArea.appendChild(inputsContainer);

                const updateFileNames = () => {
                    const prefix = prefixInput.value || '';
                    const suffix = suffixInput.value || '';

                    const fileItems = fileList.querySelectorAll('.sfr-file-item-rename');
                    fileItems.forEach(item => {
                        const originalFileName = item.dataset.originalFileName;
                        const ext = originalFileName.includes('.') ? '.' + originalFileName.split('.').pop() : '';
                        const nameWithoutExt = originalFileName.includes('.') ? originalFileName.substring(0, originalFileName.lastIndexOf('.')) : originalFileName;
                        const newName = prefix + nameWithoutExt + suffix + ext;
                        const newNameElement = item.querySelector('.sfr-file-name-new');
                        if (newNameElement) {
                            newNameElement.textContent = newName;
                        }
                    });
                };

                prefixInput.addEventListener('input', updateFileNames);
                suffixInput.addEventListener('input', updateFileNames);

                setTimeout(updateFileNames, 0);
            } else if (tabId === 'findReplace') {
                const inputsContainer = document.createElement('div');
                inputsContainer.className = 'sfr-rename-inputs-container';

                const findInput = document.createElement('input');
                findInput.type = 'text';
                findInput.className = 'sfr-rename-config-input';
                findInput.placeholder = '查找内容';
                findInput.id = 'sfr-find-content';

                const replaceInput = document.createElement('input');
                replaceInput.type = 'text';
                replaceInput.className = 'sfr-rename-config-input';
                replaceInput.placeholder = '替换内容';
                replaceInput.id = 'sfr-replace-content';

                const ignoreCaseLabel = document.createElement('label');
                ignoreCaseLabel.className = 'sfr-checkbox-button';

                const ignoreCaseCheckbox = document.createElement('input');
                ignoreCaseCheckbox.type = 'checkbox';
                ignoreCaseCheckbox.id = 'sfr-ignore-case';

                const ignoreCaseText = document.createElement('span');
                ignoreCaseText.textContent = '忽略大小写';

                ignoreCaseLabel.appendChild(ignoreCaseCheckbox);
                ignoreCaseLabel.appendChild(ignoreCaseText);

                inputsContainer.appendChild(findInput);
                inputsContainer.appendChild(replaceInput);
                inputsContainer.appendChild(ignoreCaseLabel);

                configArea.appendChild(inputsContainer);

                const updateFileNames = () => {
                    const findText = findInput.value || '';
                    const replaceText = replaceInput.value || '';
                    const ignoreCase = ignoreCaseCheckbox.checked;

                    const fileItems = fileList.querySelectorAll('.sfr-file-item-rename');
                    fileItems.forEach(item => {
                        const originalFileName = item.dataset.originalFileName;
                        let newName = originalFileName;

                        if (findText) {
                            if (ignoreCase) {
                                const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                                newName = originalFileName.replace(regex, replaceText);
                            } else {
                                newName = originalFileName.replace(new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replaceText);
                            }
                        }

                        const newNameElement = item.querySelector('.sfr-file-name-new');
                        if (newNameElement) {
                            newNameElement.textContent = newName;
                        }
                    });
                };

                findInput.addEventListener('input', updateFileNames);
                replaceInput.addEventListener('input', updateFileNames);
                ignoreCaseCheckbox.addEventListener('change', updateFileNames);

                setTimeout(updateFileNames, 0);
            } else if (tabId === 'regex') {
                const inputsContainer = document.createElement('div');
                inputsContainer.className = 'sfr-rename-inputs-container';

                const regexInput = document.createElement('input');
                regexInput.type = 'text';
                regexInput.className = 'sfr-rename-config-input';
                regexInput.placeholder = '正则表达式';
                regexInput.id = 'sfr-regex-pattern';

                const replaceInput = document.createElement('input');
                replaceInput.type = 'text';
                replaceInput.className = 'sfr-rename-config-input';
                replaceInput.placeholder = '替换内容';
                replaceInput.id = 'sfr-regex-replace';

                inputsContainer.appendChild(regexInput);
                inputsContainer.appendChild(replaceInput);

                configArea.appendChild(inputsContainer);

                const updateFileNames = () => {
                    const regexPattern = regexInput.value || '';
                    const replaceText = replaceInput.value || '';

                    const fileItems = fileList.querySelectorAll('.sfr-file-item-rename');
                    fileItems.forEach(item => {
                        const originalFileName = item.dataset.originalFileName;
                        let newName = originalFileName;

                        if (regexPattern && replaceText) {
                            try {
                                const regex = new RegExp(regexPattern, 'g');
                                newName = originalFileName.replace(regex, replaceText);
                            } catch (e) {
                                newName = originalFileName;
                            }
                        }

                        const newNameElement = item.querySelector('.sfr-file-name-new');
                        if (newNameElement) {
                            newNameElement.textContent = newName;
                        }
                    });
                };

                regexInput.addEventListener('input', updateFileNames);
                replaceInput.addEventListener('input', updateFileNames);

                setTimeout(updateFileNames, 0);
            } else if (tabId === 'format') {
                const inputsContainer = document.createElement('div');
                inputsContainer.className = 'sfr-rename-inputs-container';

                const formatInput = document.createElement('input');
                formatInput.type = 'text';
                formatInput.className = 'sfr-rename-config-input';
                formatInput.placeholder = '新格式名';
                formatInput.id = 'sfr-format-ext';

                inputsContainer.appendChild(formatInput);

                configArea.appendChild(inputsContainer);

                const updateFileNames = () => {
                    const newExt = formatInput.value || '';

                    const fileItems = fileList.querySelectorAll('.sfr-file-item-rename');
                    fileItems.forEach(item => {
                        const originalFileName = item.dataset.originalFileName;
                        let newName = originalFileName;

                        if (newExt) {
                            const ext = originalFileName.includes('.') ? '.' + originalFileName.split('.').pop() : '';
                            const nameWithoutExt = originalFileName.includes('.') ? originalFileName.substring(0, originalFileName.lastIndexOf('.')) : originalFileName;
                            let finalExt = newExt;
                            if (!finalExt.startsWith('.')) {
                                finalExt = '.' + finalExt;
                            }
                            newName = nameWithoutExt + finalExt;
                        }

                        const newNameElement = item.querySelector('.sfr-file-name-new');
                        if (newNameElement) {
                            newNameElement.textContent = newName;
                        }
                    });
                };

                formatInput.addEventListener('input', updateFileNames);

                setTimeout(updateFileNames, 0);
            }
        }

        _updateFileIndices(fileList) {
            const fileItems = fileList.querySelectorAll('.sfr-file-item');
            let visibleIndex = 1;
            fileItems.forEach(item => {
                if (item.style.display !== 'none') {
                    const indexSpan = item.querySelector('.sfr-file-index');
                    if (indexSpan) {
                        indexSpan.textContent = `${visibleIndex}.`;
                    }
                    visibleIndex++;
                }
            });
        }

        _updateStats(fileList, files, statsContainer) {
            const fileItems = fileList.querySelectorAll('.sfr-file-item');
            const renameFileItems = fileList.querySelectorAll('.sfr-file-item-rename');
            const visibleFileItems = fileItems.length > 0 
                ? Array.from(fileItems).filter(item => item.style.display !== 'none')
                : Array.from(renameFileItems);
            const totalFiles = visibleFileItems.length;

            const fileCountSpan = document.createElement('span');
            fileCountSpan.className = 'sfr-stats-item';
            fileCountSpan.innerHTML = `共 <strong>${totalFiles}</strong> 个文件`;

            statsContainer.innerHTML = '';
            statsContainer.appendChild(fileCountSpan);
        }

        _updateRenameStats(statsContainer, totalFiles, successCount, failCount) {
            const skippedCount = totalFiles - successCount - failCount;
            
            const totalCountSpan = document.createElement('span');
            totalCountSpan.className = 'sfr-stats-item';
            totalCountSpan.innerHTML = `共 <strong>${totalFiles}</strong> 个文件`;

            const successSpan = document.createElement('span');
            successSpan.className = 'sfr-stats-item';
            successSpan.innerHTML = `成功 <strong style="color: #52c41a;">${successCount}</strong>`;

            const failSpan = document.createElement('span');
            failSpan.className = 'sfr-stats-item';
            failSpan.innerHTML = `失败 <strong style="color: #ff4d4f;">${failCount}</strong>`;

            if (skippedCount > 0) {
                const skippedSpan = document.createElement('span');
                skippedSpan.className = 'sfr-stats-item';
                skippedSpan.innerHTML = `跳过 <strong>${skippedCount}</strong>`;
                statsContainer.innerHTML = '';
                statsContainer.appendChild(totalCountSpan);
                statsContainer.appendChild(successSpan);
                statsContainer.appendChild(failSpan);
                statsContainer.appendChild(skippedSpan);
            } else {
                statsContainer.innerHTML = '';
                statsContainer.appendChild(totalCountSpan);
                statsContainer.appendChild(successSpan);
                statsContainer.appendChild(failSpan);
            }
        }

        _getOrderedFiles(fileList, originalFiles) {
            const fileItems = fileList.querySelectorAll('.sfr-file-item');
            const orderedFiles = [];
            const fileMap = new Map(originalFiles.map(f => [String(f.FileId), f]));

            fileItems.forEach((item, index) => {
                const fileId = item.dataset.fileId;
                const isVisible = item.style.display !== 'none';
                if (isVisible) {
                    const file = fileMap.get(String(fileId));
                    if (file) {
                        orderedFiles.push(file);
                    } else {
                        logger.warn('未找到文件信息:', fileId);
                    }
                }
            });

            return orderedFiles;
        }

        _formatFileSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        }
    }

    const apiClient = new PanApiClient();
    const selector = new TableRowSelector();
    const selectedFilesManager = new SelectedFilesManager(apiClient, selector);
    const uiManager = new UiManager(selectedFilesManager, selector, apiClient);

    uiManager.init();

})();
