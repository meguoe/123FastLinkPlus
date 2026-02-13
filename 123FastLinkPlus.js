// ==UserScript==
// @name         123云盘文件批量转存助手
// @name:en      123FastLinkPlus
// @version      1.0.2
// @description  一键将夸克网盘、天翼云盘的个人文件和分享链接转存到123云盘
// @author       meguoe
// @license      Apache-2.0
// @match        https://pan.quark.cn/*
// @match        https://drive.quark.cn/*
// @match        https://pan.quark.cn/s/*
// @match        https://drive.quark.cn/s/*
// @match        https://cloud.189.cn/web/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=123pan.com
// @grant        GM_setClipboard
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @grant        GM_cookie
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// @connect      drive.quark.cn
// @connect      drive-pc.quark.cn
// @connect      pc-api.uc.cn
// @connect      cloud.189.cn
// @connect      www.123pan.com
// ==/UserScript==

(function () {
  "use strict";

  // 添加统一的CSS样式
  const addStyles = () => {
    if (document.getElementById("fastlink-styles")) return;

    const style = document.createElement("style");
    style.id = "fastlink-styles";
    style.textContent = `
        /* CSS变量定义 */
        :root {
            --fastlink-primary-color: #1890ff;
            --fastlink-primary-light: #40a9ff;
            --fastlink-primary-dark: #096dd9;
            --fastlink-success-color: #52c41a;
            --fastlink-success-light: #73d13d;
            --fastlink-success-dark: #389e0d;
            --fastlink-error-color: #ff4d4f;
            --fastlink-error-light: #ff7875;
            --fastlink-error-dark: #cf1322;
            --fastlink-warning-color: #faad14;
            --fastlink-warning-light: #ffc53d;
            --fastlink-warning-dark: #d48806;
            --fastlink-info-color: #13c2c2;
            --fastlink-info-light: #36cfc9;
            --fastlink-info-dark: #08979c;
            --fastlink-text-color: #262626;
            --fastlink-text-secondary: #595959;
            --fastlink-text-light: #8c8c8c;
            --fastlink-text-lighter: #bfbfbf;
            --fastlink-bg-color: #ffffff;
            --fastlink-bg-light: #fafafa;
            --fastlink-bg-lighter: #f5f5f5;
            --fastlink-border-color: #d9d9d9;
            --fastlink-border-light: #e8e8e8;
            --fastlink-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            --fastlink-shadow-light: 0 2px 8px rgba(0, 0, 0, 0.1);
            --fastlink-radius: 8px;
            --fastlink-radius-small: 4px;
            --fastlink-radius-large: 12px;
            --fastlink-font-size: 14px;
            --fastlink-font-size-small: 12px;
            --fastlink-font-size-large: 16px;
            --fastlink-font-size-xl: 18px;
            --fastlink-spacing: 16px;
            --fastlink-spacing-small: 8px;
            --fastlink-spacing-large: 24px;
            --fastlink-spacing-xl: 32px;
            --fastlink-transition: all 0.3s ease;
            --fastlink-transition-fast: all 0.15s ease;
        }

        /* 对话框基础样式 */
        .fastlink-dialog-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
        }

        .fastlink-dialog {
            background: var(--fastlink-bg-color);
            padding: var(--fastlink-spacing-large);
            border-radius: var(--fastlink-radius);
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: var(--fastlink-shadow);
            animation: fastlink-dialog-fade-in 0.3s ease;
        }

        @keyframes fastlink-dialog-fade-in {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .fastlink-breadcrumb-item {
          max-width: 60px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .fastlink-dialog-title {
            font-size: var(--fastlink-font-size-large);
            font-weight: 600;
            margin-bottom: var(--fastlink-spacing);
            color: var(--fastlink-text-color);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .fastlink-dialog-content {
            flex: 1;
            overflow-y: hidden;
            margin-bottom: var(--fastlink-spacing);
        }

        .fastlink-dialog-footer {
            display: flex;
            gap: var(--fastlink-spacing-small);
            justify-content: flex-end;
            margin-top: var(--fastlink-spacing);
        }

        /* 按钮样式 */
        .fastlink-btn {
            padding: 10px 24px;
            border: none;
            border-radius: var(--fastlink-radius-small);
            cursor: pointer;
            font-size: var(--fastlink-font-size);
            font-weight: 500;
            transition: var(--fastlink-transition);
            min-width: 80px;
            text-align: center;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .fastlink-btn:hover {
            box-shadow: var(--fastlink-shadow-light);
        }

        .fastlink-btn:active {
            transition: var(--fastlink-transition-fast);
        }

        .fastlink-btn-primary {
            background: var(--fastlink-primary-color) !important;
            color: white !important;
            box-shadow: 0 2px 0 rgba(0, 0, 0, 0.04);
        }

        .fastlink-btn-primary:hover {
            background: var(--fastlink-primary-light);
        }

        .fastlink-btn-success {
            background: var(--fastlink-success-color);
            color: white;
            box-shadow: 0 2px 0 rgba(0, 0, 0, 0.04);
        }

        .fastlink-btn-success:hover {
            background: var(--fastlink-success-light);
        }

        .fastlink-btn-default {
            background: var(--fastlink-bg-color);
            color: var(--fastlink-text-color);
            border: 1px solid var(--fastlink-border-color);
        }

        .fastlink-btn-default:hover {
            background: var(--fastlink-bg-light);
            border-color: var(--fastlink-primary-light);
        }

        /* 进度条样式 */
        .fastlink-progress-container {
            margin: var(--fastlink-spacing) 0;
        }

        .fastlink-progress-text {
            font-size: var(--fastlink-font-size-small);
            color: var(--fastlink-text-secondary);
            font-weight: 500;
            margin-bottom: var(--fastlink-spacing-small);
        }

        .fastlink-progress-bar-container {
            width: 100%;
            height: 10px;
            background: var(--fastlink-bg-lighter);
            border-radius: var(--fastlink-radius-small);
            overflow: hidden;
            box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
        }

        .fastlink-progress-bar {
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, var(--fastlink-primary-color), var(--fastlink-primary-light));
            transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border-radius: var(--fastlink-radius-small);
            position: relative;
            overflow: hidden;
        }

        .fastlink-progress-bar::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            animation: fastlink-progress-shine 1.5s infinite;
        }

        @keyframes fastlink-progress-shine {
            0% {
                left: -100%;
            }
            100% {
                left: 100%;
            }
        }

        /* 日志样式 */
        .fastlink-log-container {
            margin-top: var(--fastlink-spacing);
            text-align: left;
            display: none;
        }

        .fastlink-log {
            max-height: 200px;
            overflow-y: auto;
            font-size: var(--fastlink-font-size-small);
            font-family: monospace;
            background: var(--fastlink-bg-light);
            padding: 10px 16px;
            border-radius: 4px;
            border: 1px solid var(--fastlink-border-light);
        }

        .fastlink-log-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 4px;
            padding-bottom: 4px;
            border-bottom: 1px solid var(--fastlink-border-light);
        }

        .fastlink-log-time {
            color: var(--fastlink-text-light);
            margin-right: var(--fastlink-spacing-small);
            min-width: 60px;
        }

        .fastlink-log-file {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .fastlink-log-status {
            margin-left: var(--fastlink-spacing-small);
            font-weight: 500;
        }

        .fastlink-log-status.success {
            color: var(--fastlink-success-color);
        }

        .fastlink-log-status.error {
            color: var(--fastlink-error-color);
        }

        /* 表单样式 */
        .fastlink-form-item {
            margin-bottom: var(--fastlink-spacing);
        }

        .fastlink-form-label {
            display: block;
            margin-bottom: var(--fastlink-spacing-small);
            font-weight: 500;
            color: var(--fastlink-text-color);
        }

        .fastlink-form-input {
            width: 100%;
            padding: 8px;
            border: 1px solid var(--fastlink-border-color);
            border-radius: 4px;
            font-size: var(--fastlink-font-size);
            transition: var(--fastlink-transition);
        }

        .fastlink-form-input:focus {
            outline: none;
            border-color: var(--fastlink-primary-color);
            box-shadow: 0 0 0 2px rgba(13, 83, 255, 0.1);
        }

        .fastlink-form-textarea {
            width: 100%;
            min-height: 200px;
            padding: var(--fastlink-spacing-small);
            border: 1px solid var(--fastlink-border-color);
            border-radius: 4px;
            font-size: var(--fastlink-font-size-small);
            font-family: monospace;
            resize: vertical;
            transition: var(--fastlink-transition);
        }

        .fastlink-form-textarea:focus {
            outline: none;
            border-color: var(--fastlink-primary-color);
            box-shadow: 0 0 0 2px rgba(13, 83, 255, 0.1);
        }

        /* 错误对话框样式 */
        .fastlink-error-icon {
            color: var(--fastlink-error-color);
            margin-bottom: var(--fastlink-spacing);
            text-align: center;
        }

        .fastlink-error-title {
            font-size: var(--fastlink-font-size-large);
            font-weight: 600;
            margin-bottom: var(--fastlink-spacing-small);
            color: var(--fastlink-text-color);
            text-align: center;
        }

        .fastlink-error-message {
            font-size: var(--fastlink-font-size);
            color: var(--fastlink-text-secondary);
            margin-bottom: var(--fastlink-spacing-large);
            text-align: center;
            white-space: pre-line;
        }
    `;

    document.head.appendChild(style);
  };

  const utils = {
    // 对话框缓存
    _dialogCache: {
      loading: null,
      auth: null,
      cookie: null,
      error: null,
      currentId: 0,
    },

    // 初始化样式
    initStyles() {
      addStyles();
    },

    getCachedCookie() {
      return GM_getValue("quark_cookie", "");
    },

    saveCookie(cookie) {
      GM_setValue("quark_cookie", cookie);
    },

    getCookie(name) {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(";").shift();
      return null;
    },

    // 123云盘认证信息管理
    get123PanAuth() {
      return {
        authToken: GM_getValue("pan123_authToken", ""),
        loginUuid: GM_getValue("pan123_loginUuid", ""),
      };
    },

    save123PanAuth(authToken, loginUuid) {
      // 只使用GM_setValue存储认证信息，不使用localStorage，提高安全性
      GM_setValue("pan123_authToken", authToken);
      GM_setValue("pan123_loginUuid", loginUuid);
    },

    show123PanAuthDialog(onSave, currentAuth = null) {
      // 初始化样式
      this.initStyles();

      const auth = currentAuth || this.get123PanAuth();
      const dialog = document.createElement("div");
      dialog.id = "pan123-auth-input-dialog";
      dialog.className = "fastlink-dialog-overlay";
      dialog.innerHTML = `
				<div class="fastlink-dialog">
					<div class="fastlink-dialog-title">设置123云盘认证信息</div>
					<div class="fastlink-dialog-content">
						<div style="font-size: var(--fastlink-font-size-small); color: var(--fastlink-text-secondary); margin-bottom: var(--fastlink-spacing);">
							请输入123云盘的认证信息，用于转存秒链到123云盘<br/>
							<strong>获取方法：</strong>登录123云盘后，在浏览器开发者工具(F12) → Application → Local Storage中查找 authorToken 和 LoginUuid
						</div>
						<div class="fastlink-form-item">
							<label class="fastlink-form-label" for="pan123-auth-token">Author Token</label>
							<input type="text" id="pan123-auth-token" value="${auth.authToken}" class="fastlink-form-input" style="font-family: monospace; font-size: var(--fastlink-font-size-small);" placeholder="请输入authorToken">
						</div>
						<div class="fastlink-form-item">
							<label class="fastlink-form-label" for="pan123-login-uuid">Login UUID</label>
							<input type="text" id="pan123-login-uuid" value="${auth.loginUuid}" class="fastlink-form-input" style="font-family: monospace; font-size: var(--fastlink-font-size-small);" placeholder="请输入LoginUuid">
						</div>
					</div>
					<div class="fastlink-dialog-footer">
						<button id="pan123-auth-save-btn" class="ant-btn share-save fastlink-btn fastlink-btn-primary">保存</button>
						<button id="pan123-auth-cancel-btn" class="ant-btn share-save fastlink-btn fastlink-btn-default">取消</button>
					</div>
				</div>
			`;
      document.body.appendChild(dialog);

      document.getElementById("pan123-auth-save-btn").onclick = () => {
        const authToken = document
          .getElementById("pan123-auth-token")
          .value.trim();
        const loginUuid = document
          .getElementById("pan123-login-uuid")
          .value.trim();
        if (!authToken || !loginUuid) {
          alert("认证信息不能为空");
          return;
        }
        this.save123PanAuth(authToken, loginUuid);
        dialog.remove();
        GM_notification({
          text: "123云盘认证信息已保存",
          timeout: 2000,
        });
        if (onSave) {
          onSave({ authToken, loginUuid });
        }
      };

      document.getElementById("pan123-auth-cancel-btn").onclick = () => {
        dialog.remove();
      };
    },

    showCookieInputDialog(onSave, currentCookie = "") {
      // 初始化样式
      this.initStyles();

      const dialog = document.createElement("div");
      dialog.id = "quark-cookie-input-dialog";
      dialog.className = "fastlink-dialog-overlay";
      dialog.innerHTML = `
				<div class="fastlink-dialog" style="max-width: 800px;">
					<div class="fastlink-dialog-title">设置夸克网盘Cookie</div>
					<div class="fastlink-dialog-content">
						<div style="font-size: var(--fastlink-font-size-small); color: var(--fastlink-text-secondary); margin-bottom: var(--fastlink-spacing);">
							请打开浏览器开发者工具(F12) → Network → 找到任意请求 → 复制完整的Cookie值<br/>
							<strong>必须包含：__puus、__pus、ctoken 等关键Cookie</strong>
						</div>
						<textarea id="quark-cookie-input"
							class="fastlink-form-textarea"
							placeholder="粘贴完整的Cookie字符串，例如：ctoken=xxx; __puus=xxx; __pus=xxx; ...">${currentCookie}</textarea>
					</div>
					<div class="fastlink-dialog-footer">
						<button id="quark-cookie-save-btn" class="ant-btn share-save fastlink-btn fastlink-btn-primary">保存</button>
						<button id="quark-cookie-cancel-btn" class="ant-btn share-save fastlink-btn fastlink-btn-default">取消</button>
					</div>
				</div>
			`;
      document.body.appendChild(dialog);

      document.getElementById("quark-cookie-save-btn").onclick = () => {
        const cookie = document
          .getElementById("quark-cookie-input")
          .value.trim();
        if (!cookie) {
          alert("Cookie不能为空");
          return;
        }
        this.saveCookie(cookie);
        dialog.remove();
        GM_notification({
          text: "Cookie已保存",
          timeout: 2000,
        });
        if (onSave) {
          onSave(cookie);
        }
      };

      document.getElementById("quark-cookie-cancel-btn").onclick = () => {
        dialog.remove();
      };
    },

    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },

    findReact(dom, traverseUp = 0) {
      let key = Object.keys(dom).find((key) => {
        return (
          key.startsWith("__reactFiber$") ||
          key.startsWith("__reactInternalInstance$")
        );
      });

      let domFiber = dom[key];

      if (domFiber == null) {
        return null;
      }

      if (domFiber._currentElement) {
        let compFiber = domFiber._currentElement._owner;
        for (let i = 0; i < traverseUp; i++) {
          compFiber = compFiber._currentElement._owner;
        }
        return compFiber._instance;
      }

      const GetCompFiber = (fiber) => {
        let parentFiber = fiber.return;
        while (typeof parentFiber.type === "string") {
          parentFiber = parentFiber.return;
        }
        return parentFiber;
      };

      let compFiber = GetCompFiber(domFiber);
      for (let i = 0; i < traverseUp; i++) {
        compFiber = GetCompFiber(compFiber);
      }

      return compFiber.stateNode || compFiber;
    },

    getCurrentPath() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const dirFid = urlParams.get("dir_fid");

        if (!dirFid || dirFid === "0") {
          return "";
        }

        const breadcrumb = document.querySelector(".breadcrumb-list");
        if (breadcrumb) {
          const items = breadcrumb.querySelectorAll(".breadcrumb-item");
          const pathParts = [];

          for (let i = 1; i < items.length; i++) {
            const text = items[i].textContent.trim();
            if (text) {
              pathParts.push(text);
            }
          }

          return pathParts.join("/");
        }

        return "";
      } catch (e) {
        return "";
      }
    },

    getSelectedList() {
      try {
        const fileListDom = document.getElementsByClassName("file-list")[0];

        if (!fileListDom) {
          return [];
        }

        const reactObj = this.findReact(fileListDom);

        const props = reactObj?.props;

        if (props) {
          const fileList = props.list || [];
          const selectedKeys = props.selectedRowKeys || [];

          const selectedList = [];
          fileList.forEach(function (val) {
            if (selectedKeys.includes(val.fid)) {
              selectedList.push(val);
            }
          });

          return selectedList;
        }

        return [];
      } catch (e) {
        return [];
      }
    },

    post(url, data, headers = {}) {
      return new Promise((resolve, reject) => {
        try {
          // 验证URL
          if (!url || typeof url !== "string" || !url.startsWith("http")) {
            reject(new Error("无效的请求URL"));
            return;
          }

          // 验证数据
          if (data === undefined || data === null) {
            reject(new Error("请求数据不能为空"));
            return;
          }

          const requestData = JSON.stringify(data);
          const QUARK_UA =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) quark-cloud-drive/2.5.20 Chrome/100.0.4896.160 Electron/18.3.5.4-b478491100 Safari/537.36 Channel/pckk_other_ch";
          const defaultHeaders = {
            "Content-Type": "application/json;charset=utf-8",
            "User-Agent": QUARK_UA,
            Origin: location.origin,
            Referer: `${location.origin}/`,
            Dnt: "",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            Expires: "0",
          };

          GM_xmlhttpRequest({
            method: "POST",
            url: url,
            headers: { ...defaultHeaders, ...headers },
            data: requestData,
            onload: function (response) {
              try {
                // 检查响应状态
                if (response.status < 200 || response.status >= 300) {
                  reject(new Error(`请求失败，状态码：${response.status}`));
                  return;
                }

                // 尝试解析响应
                let result;
                try {
                  result = JSON.parse(response.responseText);
                } catch (e) {
                  reject(new Error("响应解析失败"));
                  return;
                }

                resolve(result);
              } catch (e) {
                reject(new Error("处理响应时出错"));
              }
            },
            onerror: function (error) {
              reject(new Error("网络请求失败"));
            },
            ontimeout: function () {
              reject(new Error("请求超时"));
            },
          });
        } catch (e) {
          reject(new Error(`请求准备失败：${e.message}`));
        }
      });
    },

    get(url, headers = {}) {
      return new Promise((resolve, reject) => {
        try {
          // 验证URL
          if (!url || typeof url !== "string" || !url.startsWith("http")) {
            reject(new Error("无效的请求URL"));
            return;
          }

          GM_xmlhttpRequest({
            method: "GET",
            url: url,
            headers: headers,
            onload: function (response) {
              try {
                if (response.status >= 200 && response.status < 300) {
                  resolve(response.responseText);
                } else {
                  reject(new Error(`请求失败: ${response.status}`));
                }
              } catch (e) {
                reject(new Error("处理响应时出错"));
              }
            },
            onerror: function (error) {
              reject(new Error("网络请求失败"));
            },
            ontimeout: function () {
              reject(new Error("请求超时"));
            },
          });
        } catch (e) {
          reject(new Error(`请求准备失败：${e.message}`));
        }
      });
    },

    async getFolderFiles(folderId, folderPath = "", onProgress) {
      const API_URL = "https://drive-pc.quark.cn/1/clouddrive/file/sort?pr=ucpro&fr=pc";
      const allFiles = [];
      let page = 1;
      const pageSize = 50;

      while (true) {
        const url = `${API_URL}&pdir_fid=${folderId}&_page=${page}&_size=${pageSize}&_fetch_total=1&_fetch_sub_dirs=0&_sort=file_type:asc,updated_at:desc`;

        const result = await new Promise((resolve, reject) => {
          GM_xmlhttpRequest({
            method: "GET",
            url: url,
            onload: function (response) {
              try {
                resolve(JSON.parse(response.responseText));
              } catch (e) {
                reject(new Error("响应解析失败"));
              }
            },
            onerror: () => reject(new Error("网络请求失败")),
          });
        });

        if (result?.code !== 0 || !result?.data?.list) {
          break;
        }

        const items = result.data.list;
        for (const item of items) {
          const itemPath = folderPath
            ? `${folderPath}/${item.file_name}`
            : item.file_name;

          if (item.dir) {
            const subFiles = await this.getFolderFiles(
              item.fid,
              itemPath,
              onProgress
            );
            allFiles.push(...subFiles);
          } else if (item.file) {
            allFiles.push({ ...item, path: itemPath });
            if (onProgress) {
              onProgress();
            }
          }
        }

        if (items.length < pageSize) {
          break;
        }
        page++;
      }

      return allFiles;
    },

    async getShareToken(shareId, passcode = "", cookie = "") {
      const API_URL = "https://pc-api.uc.cn/1/clouddrive/share/sharepage/token";

      try {
        const result = await new Promise((resolve, reject) => {
          GM_xmlhttpRequest({
            method: "POST",
            url: API_URL,
            headers: {
              "Content-Type": "application/json",
              Cookie: cookie,
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Referer: "https://pan.quark.cn/",
            },
            data: JSON.stringify({
              pwd_id: shareId,
              passcode: passcode,
            }),
            onload: function (response) {
              try {
                resolve(JSON.parse(response.responseText));
              } catch (e) {
                reject(new Error("响应解析失败"));
              }
            },
            onerror: () => reject(new Error("网络请求失败")),
          });
        });

        if (result?.code === 31001) {
          throw new Error("请先登录网盘");
        }
        if (result?.code !== 0) {
          throw new Error(
            `获取token失败，代码：${result.code}，消息：${result.message}`
          );
        }

        return {
          stoken: result.data.stoken,
          title: result.data.title || "",
        };
      } catch (error) {
        throw error;
      }
    },

    async getFilesWithMd5(fileList, onProgress) {
      const API_URL = "https://drive.quark.cn/1/clouddrive/file/download?pr=ucpro&fr=pc";
      const BATCH_SIZE = 15;
      const MAX_PARALLEL = 3;

      const validFiles = fileList.filter((item) => item.file === true);
      const pathMap = this._buildPathMap(validFiles);
      const data = [];
      let processed = 0;

      // 分批处理，每批并行发送多个请求
      const batches = [];
      for (let i = 0; i < validFiles.length; i += BATCH_SIZE) {
        batches.push(validFiles.slice(i, i + BATCH_SIZE));
      }

      // 并行处理批次
      for (let i = 0; i < batches.length; i += MAX_PARALLEL) {
        const parallelBatches = batches.slice(i, i + MAX_PARALLEL);
        const batchPromises = parallelBatches.map((batch, batchIndex) => {
          const batchProcessed = processed + batchIndex * BATCH_SIZE;
          return this._processFileBatch(
            batch,
            pathMap,
            API_URL,
            data,
            batchProcessed,
            validFiles.length,
            onProgress
          );
        });

        await Promise.all(batchPromises);
        processed += parallelBatches.reduce(
          (sum, batch) => sum + batch.length,
          0
        );

        // 批次之间添加较小的延迟，避免请求过于密集
        if (i + MAX_PARALLEL < batches.length) {
          await this.sleep(500);
        }
      }

      return data;
    },

    _buildPathMap(files) {
      const pathMap = {};
      files.forEach((file) => {
        pathMap[file.fid] = file.path;
      });
      return pathMap;
    },

    async _processFileBatch(
      batch,
      pathMap,
      apiUrl,
      data,
      processed,
      total,
      onProgress
    ) {
      const fids = batch.map((item) => item.fid);

      try {
        const result = await this.post(apiUrl, { fids });
        this._validateApiResponse(result);

        if (result?.data) {
          const filesWithPath = this._processFileData(result.data, pathMap);
          data.push(...filesWithPath);
        }

        if (onProgress) {
          onProgress(processed + batch.length, total);
        }
      } catch (error) {
        throw error;
      }
    },

    _validateApiResponse(result) {
      if (result?.code === 31001) {
        throw new Error("请先登录网盘");
      }
      if (result?.code !== 0) {
        throw new Error(
          `获取链接失败，代码：${result.code}，消息：${result.message}`
        );
      }
    },

    _processFileData(fileData, pathMap) {
      return fileData.map((file) => {
        const newFile = {
          ...file,
          path: pathMap[file.fid] || file.file_name,
        };

        let md5 = newFile.md5 || newFile.hash || newFile.etag || "";
        md5 = this.decodeMd5(md5);

        if (md5) {
          newFile.md5 = md5;
        }

        return newFile;
      });
    },

    async scanQuarkShareFiles(
      shareId,
      stoken,
      cookie,
      parentFileId = 0,
      path = "",
      recursive = true
    ) {
      const fileItems = [];
      let page = 1;

      while (true) {
        const url = this._buildShareDetailUrl(
          shareId,
          stoken,
          parentFileId,
          page
        );
        const result = await this._fetchShareDetail(url, cookie);

        if (!this._isValidShareResponse(result)) break;

        await this._processShareItems(
          result.data.list,
          shareId,
          stoken,
          cookie,
          path,
          recursive,
          fileItems
        );

        if (this._shouldStopPaging(result.data.list)) break;
        page++;
      }

      return fileItems;
    },

    _buildShareDetailUrl(shareId, stoken, parentFileId, page) {
      return `https://pc-api.uc.cn/1/clouddrive/share/sharepage/detail?pwd_id=${shareId}&stoken=${encodeURIComponent(
        stoken
      )}&pdir_fid=${parentFileId}&_page=${page}&_size=100&pr=ucpro&fr=pc`;
    },

    async _fetchShareDetail(url, cookie) {
      return await new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "GET",
          url: url,
          headers: {
            Cookie: cookie,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0",
            Referer: "https://pan.quark.cn/",
          },
          onload: function (response) {
            try {
              resolve(JSON.parse(response.responseText));
            } catch (e) {
              reject(new Error("响应解析失败"));
            }
          },
          onerror: () => reject(new Error("网络请求失败")),
        });
      });
    },

    _isValidShareResponse(result) {
      return result.code === 0 && result.data?.list;
    },

    _shouldStopPaging(items) {
      return items.length < 100;
    },

    async _processShareItems(
      items,
      shareId,
      stoken,
      cookie,
      path,
      recursive,
      fileItems
    ) {
      for (const item of items) {
        const itemPath = path ? `${path}/${item.file_name}` : item.file_name;

        if (item.dir) {
          if (recursive) {
            const subFiles = await this.scanQuarkShareFiles(
              shareId,
              stoken,
              cookie,
              item.fid,
              itemPath,
              true
            );
            fileItems.push(...subFiles);
          }
        } else {
          fileItems.push({
            fid: item.fid,
            token: item.share_fid_token,
            name: item.file_name,
            size: item.size,
            path: itemPath,
          });
        }
      }
    },

    async batchGetShareFilesMd5(
      shareId,
      stoken,
      cookie,
      fileItems,
      onProgress
    ) {
      const md5Map = {};
      const batchSize = 10;
      const MAX_PARALLEL = 3;
      let totalProcessed = 0;

      // 分批处理，每批并行发送多个请求
      const batches = [];
      for (let i = 0; i < fileItems.length; i += batchSize) {
        batches.push(fileItems.slice(i, i + batchSize));
      }

      // 并行处理批次
      for (let i = 0; i < batches.length; i += MAX_PARALLEL) {
        const parallelBatches = batches.slice(i, i + MAX_PARALLEL);
        const batchPromises = parallelBatches.map((batch) =>
          this._processMd5Batch(batch, shareId, stoken, cookie, md5Map)
        );

        await Promise.all(batchPromises);
        totalProcessed += parallelBatches.reduce(
          (sum, batch) => sum + batch.length,
          0
        );

        if (onProgress) {
          onProgress(totalProcessed, fileItems.length);
        }

        // 批次之间添加较小的延迟，避免请求过于密集
        if (i + MAX_PARALLEL < batches.length) {
          await this.sleep(500);
        }
      }

      return md5Map;
    },

    async _processMd5Batch(batch, shareId, stoken, cookie, md5Map) {
      const fids = batch.map((item) => item.fid);
      const tokens = batch.map((item) => item.token);

      try {
        const requestBody = this._buildMd5RequestBody(
          fids,
          tokens,
          shareId,
          stoken
        );
        const md5Result = await this._fetchMd5Data(requestBody, cookie);
        this._processMd5Result(md5Result, fids, md5Map);
      } catch (e) {
        fids.forEach((fid) => (md5Map[fid] = ""));
      }
    },

    _buildMd5RequestBody(fids, tokens, shareId, stoken) {
      return {
        fids,
        pwd_id: shareId,
        stoken,
        fids_token: tokens,
      };
    },

    async _fetchMd5Data(requestBody, cookie) {
      const url = `https://pc-api.uc.cn/1/clouddrive/file/download?pr=ucpro&fr=pc&uc_param_str=&__dt=${
        Math.floor(Math.random() * 4 + 1) * 60 * 1000
      }&__t=${Date.now()}`;

      return await new Promise((resolve) => {
        GM_xmlhttpRequest({
          method: "POST",
          url: url,
          headers: {
            "Content-Type": "application/json",
            Cookie: cookie,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) quark-cloud-drive/3.14.2 Chrome/112.0.5615.165 Electron/24.1.3.8 Safari/537.36 Channel/pckk_other_ch",
            Referer: "https://pan.quark.cn/",
            Accept: "application/json, text/plain, */*",
            Origin: "https://pan.quark.cn",
          },
          data: JSON.stringify(requestBody),
          onload: function (response) {
            try {
              const parsed = JSON.parse(response.responseText);
              resolve(parsed);
            } catch (e) {
              resolve({ code: -1, message: "解析失败" });
            }
          },
          onerror: (error) => {
            resolve({ code: -1, message: "网络错误" });
          },
        });
      });
    },

    _processMd5Result(md5Result, fids, md5Map) {
      if (md5Result.code === 0 && md5Result.data) {
        const dataList = Array.isArray(md5Result.data)
          ? md5Result.data
          : [md5Result.data];

        dataList.forEach((item, idx) => {
          const fid = fids[idx];
          if (!fid) return;

          let md5 = item.md5 || item.hash || "";
          md5 = utils.decodeMd5(md5);

          md5Map[fid] = md5;
        });
      } else {
        fids.forEach((fid) => (md5Map[fid] = ""));
      }
    },

    generateRapidTransferJson(filesData) {
      const files = filesData.map((file) => ({
        path: file.path || file.file_name,
        etag: (file.etag || file.md5 || "").toLowerCase(),
        size: file.size,
      }));

      const totalSize = files.reduce((sum, f) => sum + f.size, 0);

      return {
        scriptVersion: "3.0.3",
        exportVersion: "1.0",
        usesBase62EtagsInExport: false,
        commonPath: "",
        files: files,
        totalFilesCount: files.length,
        totalSize: totalSize,
      };
    },

    showLoadingDialog(title = "正在转存文件") {
      // 初始化样式
      this.initStyles();

      // 检查缓存中是否已有对话框
      if (this._dialogCache.loading) {
        // 更新标题
        const titleEl = this._dialogCache.loading.querySelector(
          ".fastlink-dialog-title"
        );
        if (titleEl) {
          titleEl.textContent = title;
        }
        // 更新进度为0
        this.updateProgress(0, 1);
        // 清空日志
        const logEl = this._dialogCache.loading.querySelector(
          "#fastlink-loading-log"
        );
        if (logEl) {
          logEl.innerHTML = "";
        }
        // 显示对话框
        this._dialogCache.loading.style.display = "flex";
        return this._dialogCache.loading;
      }

      const dialog = document.createElement("div");
      dialog.id = "fastlink-loading-dialog";
      dialog.className = "fastlink-dialog-overlay";
      dialog.innerHTML = `
				<div class="fastlink-dialog">
					<div class="fastlink-dialog-title">${title}</div>
					<div class="fastlink-dialog-content">
						<div id="fastlink-loading-progress-container" class="fastlink-progress-container">
							<div id="fastlink-loading-progress-text" class="fastlink-progress-text">正在扫描文件...</div>
							<div class="fastlink-progress-bar-container">
								<div id="fastlink-loading-progress-bar" class="fastlink-progress-bar"></div>
							</div>
						</div>
						<div id="fastlink-loading-log-container" class="fastlink-log-container">
							<div id="fastlink-loading-log" class="fastlink-log"></div>
						</div>
					</div>
					<div class="fastlink-dialog-footer">
            <button id="fastlink-loading-open-123pan-btn" class="ant-btn share-save fastlink-btn fastlink-btn-primary">打开123盘</button>
						<button id="fastlink-loading-close-btn" class="ant-btn share-save fastlink-btn fastlink-btn-default">关闭</button>
					</div>
				</div>
			`;
      document.body.appendChild(dialog);

      dialog.querySelector("#fastlink-loading-close-btn").onclick = () => {
        this.closeLoadingDialog();
      };
      
      dialog.querySelector("#fastlink-loading-open-123pan-btn").onclick = () => {
        window.open(`https://www.123pan.com/?homeFilePath=${utils._dialogCache.currentId}`, "_blank");
      };

      // 缓存对话框
      this._dialogCache.loading = dialog;

      return dialog;
    },

    updateProgress(processed, total, phase = "转存") {
      const titleEl = document.querySelector(
        "#fastlink-loading-dialog .fastlink-dialog-title"
      );
      const progressBar = document.getElementById(
        "fastlink-loading-progress-bar"
      );
      const progressText = document.getElementById(
        "fastlink-loading-progress-text"
      );

      // 更新标题
      if (titleEl) {
        if (phase.includes("转存") || phase.includes("保存")) {
          titleEl.textContent = "正在转存文件";
        } else if (phase.includes("完成")) {
          titleEl.textContent = "文件转存完成";
        }
      }

      // 更新进度条和进度文本
      if (progressBar && progressText) {
        const percent = total > 0 ? ((processed / total) * 100).toFixed(1) : 0;
        progressBar.style.width = `${percent}%`;
        progressText.style.display = "block";
        progressText.textContent = `正在转存 ${processed} / ${total} （${percent}%）`;
      }
    },

    addSaveLog(fileName, status, error = "") {
      const logContainer = document.getElementById(
        "fastlink-loading-log-container"
      );
      const logEl = document.getElementById("fastlink-loading-log");
      if (logEl) {
        // 显示日志容器
        if (logContainer) {
          logContainer.style.display = "block";
        }

        const logItem = document.createElement("div");
        logItem.className = "fastlink-log-item";

        const timestamp = new Date().toLocaleTimeString();
        let statusText = status === "success" ? "✅ 成功" : "❌ 失败";
        let statusClass = status === "success" ? "success" : "error";

        if (error) {
          statusText += `: ${error}`;
        }

        logItem.innerHTML = `
					<span class="fastlink-log-time">[${timestamp}]</span>
					<span class="fastlink-log-file">${fileName}</span>
					<span class="fastlink-log-status ${statusClass}">${statusText}</span>
				`;

        logEl.appendChild(logItem);
        logEl.scrollTop = logEl.scrollHeight;
      }
    },

    closeLoadingDialog() {
      if (this._dialogCache.loading) {
        // 隐藏对话框而不是删除，以便后续重用
        this._dialogCache.loading.style.display = "none";
      }
    },

    showError(message, showCookieButton = false) {
      // 初始化样式
      this.initStyles();

      // 检查缓存中是否已有对话框
      if (this._dialogCache.error) {
        // 更新消息
        const messageEl = this._dialogCache.error.querySelector(
          ".fastlink-error-message"
        );
        if (messageEl) {
          messageEl.textContent = message;
        }
        // 更新按钮状态
        const cookieBtn = this._dialogCache.error.querySelector(
          "#fastlink-error-cookie-btn"
        );
        if (cookieBtn) {
          cookieBtn.style.display = showCookieButton ? "block" : "none";
        }
        // 显示对话框
        this._dialogCache.error.style.display = "flex";
        return this._dialogCache.error;
      }

      const dialog = document.createElement("div");
      dialog.id = "fastlink-error-dialog";
      dialog.className = "fastlink-dialog-overlay";
      dialog.innerHTML = `
				<div class="fastlink-dialog" style="max-width: 420px;">
					<div class="fastlink-error-icon">
						<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
							<path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
						</svg>
					</div>
					<div class="fastlink-error-title">操作失败</div>
					<div class="fastlink-error-message">${message}</div>
					<div class="fastlink-dialog-footer" style="width: 100%; justify-content: center;">
						${
							showCookieButton
								? '<button id="fastlink-error-cookie-btn" class="ant-btn share-save fastlink-btn fastlink-btn-primary" style="flex: 1;">修改Cookie</button>'
								: ""
						}
						<button id="fastlink-error-close-btn" class="ant-btn share-save fastlink-btn fastlink-btn-default" style="flex: 1;">确定</button>
					</div>
				</div>
			`;
      document.body.appendChild(dialog);

      if (showCookieButton) {
        dialog.querySelector("#fastlink-error-cookie-btn").onclick = () => {
          dialog.style.display = "none";
          this.showCookieInputDialog(null, this.getCachedCookie());
        };
      }

      dialog.querySelector("#fastlink-error-close-btn").onclick = () => {
        dialog.style.display = "none";
      };

      // 缓存对话框
      this._dialogCache.error = dialog;

      return dialog;
    },
    
    showFolderSelectDialog(apiClient, onSelect) {
      // 初始化样式
      this.initStyles();

      const dialog = document.createElement("div");
      dialog.id = "fastlink-folder-select-dialog";
      dialog.className = "fastlink-dialog-overlay";
      dialog.innerHTML = `
			<div class="fastlink-dialog" style="max-width: 700px; max-height: 70vh;">
				<div class="fastlink-dialog-title">
          <span>请选择转存位置</span>
          <input type="text" id="fastlink-folder-search" placeholder="搜索文件夹..." class="fastlink-form-input" style="width: 200px; padding: 4px 8px;">
        </div>
				<div class="fastlink-dialog-content">
					<div id="fastlink-folder-breadcrumb" style="margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">
						<span class="fastlink-breadcrumb-item" data-fid="0">123云盘</span>
					</div>
					<div id="fastlink-folder-tree" style="height: 200px; overflow-y: auto; border: 1px solid var(--fastlink-border-light); border-radius: var(--fastlink-radius-small); padding: 8px;">
						<div id="fastlink-folder-loading" style="text-align: center; padding: 40px; color: var(--fastlink-text-light);">
							加载文件夹中...
						</div>
						<div id="fastlink-folder-content" style="display: none;"></div>
					</div>
				</div>
				<div class="fastlink-dialog-footer" style="justify-content: space-between;">
          <div style="display: flex; gap: 8px;">
						<input type="text" id="fastlink-new-folder-name" placeholder="新建文件夹名称" class="fastlink-form-input" style="flex: 1; padding: 4px 8px;">
						<button id="fastlink-create-folder-btn" class="ant-btn share-save fastlink-btn fastlink-btn-default" style="white-space: nowrap;">新建</button>
					</div>
          <div style="display: flex; gap: 8px;">
					  <button id="fastlink-folder-cancel-btn" class="ant-btn share-save fastlink-btn fastlink-btn-default">取消</button>
					  <button id="fastlink-folder-select-btn" class="ant-btn share-save fastlink-btn fastlink-btn-primary">选择</button>
          </div>
        </div>
			</div>
		`;
      document.body.appendChild(dialog);

      let currentFolderId = "0";
      let folderTree = [];

      // 加载文件夹结构
      async function loadFolders(folderId = "0", showLoading = true) {
        if (showLoading) {
          document.getElementById("fastlink-folder-loading").style.display = "block";
          document.getElementById("fastlink-folder-content").style.display = "none";
        }

        try {
          const folders = await apiClient.getFolderList(folderId);
          folderTree = folders;
          renderFolders(folders);
        } catch (error) {
          console.error("[123Link] [PanApiClient]", "加载文件夹失败:", error);
          utils.showError("加载文件夹失败");
        } finally {
          document.getElementById("fastlink-folder-loading").style.display = "none";
          document.getElementById("fastlink-folder-content").style.display = "block";
        }
      }

      // 渲染文件夹列表
      function renderFolders(folders) {
        const contentEl = document.getElementById("fastlink-folder-content");
        contentEl.innerHTML = "";

        if (folders.length === 0) {
          contentEl.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--fastlink-text-light);">当前目录无文件夹</div>';
          return;
        }

        folders.forEach(folder => {
          const folderEl = document.createElement("div");
          folderEl.className = "fastlink-folder-item";
          folderEl.style = `
							padding: 8px 12px;
							border-radius: var(--fastlink-radius-small);
							cursor: pointer;
							transition: var(--fastlink-transition);
							display: flex;
							align-items: center;
							gap: 8px;
						`;
          folderEl.dataset.fid = folder.fileId;
          folderEl.dataset.name = folder.fileName;

          folderEl.innerHTML = `
							<img width="16px" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFoAAABaCAMAAAAPdrEwAAAABGdBTUEAALGPC/xhBQAAAWVQTFRF/80A/swA/c0A/MwA/8sA/s0A/80A/s0A/8wA68QA/c0A/c4A/c0A/8YA/M8A/c0A/cwA/8wA/c4A/cwA/c0A/78A/8wA/M0A/cwA/8MA//8A/c4A/cwA/84A/NAA/c0A/9IA/cwA/c4A/MsA/c4A+MsA/c0A/c0A/M0A/84A/c0A/8kA/84A/c4A/80A/s0A/s0A/8sA//8A/c0A/c0A/98A/M0A/c4A/c0A/M0A/c0A/s4A/c4A/s0A/s0A/M4A/s0A/M0A/84A/cwA/9IA/c0A/9UA/c0A/c4A7swA/8gA/9UA/wAA/c8B/8QA//8A/M0A/8wA/cwA/swA/9UA/8kA/c0A/c0A/8wA/4AA//8A/cwA/s0A/c0A/cwA/8wA/c0AAAAA/ttD/tcz/c4C/99U/c4B/tc0/95R/9tE/M4B/9cz/tEc/M0A/c4D/95S/c4E/95P/9xL/95Q/c4F/c0A/99VL+HO8QAAAGJ0Uk5Tw8PSUE/nwvAeDera/AnF9IsF6dbvBChR9xEDp9VZVqQR0v5PoCeO/spY9ias/VfIrScFivMIxdn76uTRm8Pi5NHwTuct5yvR4w8ODAH+DQHDLejwEhOP+AoCApDv+ZsP8AApKnZAAAABfElEQVRYw+3ZVXPCQBSG4a27u7u7GxTXFg9WkhBKS9FAgOX3N3R6DdmZ3V50zvsDnptz9x2UYhYC+g/p13jsxZVsndt7c/lGTq/bRb+Tl1rEP9zdXp0ekdqI24o4LFHcsvvr4Nnx7tzsDBkdSIRKWEN782srYR8RLW5sYm0JU0sLiyS034a1Nr28ukNCP0c101jYNhPcEplK2ml8GLnQbiOJQMYn5wcTjGi8Pz7Cip4c9bKix4bcrOjhwf5k+1wDsbiPlMalPqltvLNXtHPEtKaiNkfEzDXpjFypU63ykQ9FAiqdKX5VlRrFlGqh6HkSVVpOv2cbVMvm0nJQr9KVarlBuXK1IjyqdF35pE03lDqWmnSNutyoAQ000EADDTTQQAMNNNBAAw000EADDTQylZjNWs9RZmNch0Uu5Cjb5VxBDiKk6/SwGT51zZdPnsVcmwigcHfC2CPQHZmFoDHRFUYpzir6DbxEMd6gF63h36dgknLen0EfHrD/gf4G10DO3tSmp5oAAAAASUVORK5CYII=" class="file-item-name-img">
							<span>${folder.fileName}</span>
						`;

          folderEl.onclick = () => {
            currentFolderId = folder.fileId;
            updateBreadcrumb(folder.fileId, folder.fileName);
            loadFolders(folder.fileId);
          };

          folderEl.onmouseenter = () => {
            folderEl.style.background = "var(--fastlink-bg-light)";
          };

          folderEl.onmouseleave = () => {
            folderEl.style.background = "transparent";
          };

          contentEl.appendChild(folderEl);
        });
      }

      // 更新面包屑导航
      const breadcrumbs = [{ fid: "0", name: "123云盘" }];
      function updateBreadcrumb(folderId, folderName) {
        utils._dialogCache.currentId = folderId;
        // 判断当前是否包含folderId
        const folderIndex = breadcrumbs.findIndex(item => item.fid === folderId);
        if (folderIndex !== -1) {
          breadcrumbs.splice(folderIndex + 1);
        } else {
          breadcrumbs.push({ fid: folderId, name: folderName });
        }

        // 清空并重新构建面包屑
        const breadcrumbEl = document.getElementById("fastlink-folder-breadcrumb");
        breadcrumbEl.innerHTML = "";
        breadcrumbs.forEach((item, index) => {
          const isLastItem = index === breadcrumbs.length - 1;
          const breadcrumbItem = document.createElement("span");
          breadcrumbItem.className = "fastlink-breadcrumb-item";
          breadcrumbItem.dataset.fid = item.fid;
          breadcrumbItem.textContent = item.name;
          breadcrumbItem.style = `
            transition: var(--fastlink-transition);
            border-radius: var(--fastlink-radius-small);
            cursor: ${isLastItem ? "default" : "pointer"};
            max-width: ${isLastItem ? "100px" : "60px"};
            color: ${isLastItem ? "var(--fastlink-text)" : "var(--fastlink-primary-color)"};
          `;

          if (!isLastItem) {
            breadcrumbItem.onclick = () => {
              loadFolders(item.fid);
              updateBreadcrumb(item.fid, item.name);
            };
          }
          
          breadcrumbEl.appendChild(breadcrumbItem);
          if (index < breadcrumbs.length - 1) {
            const separator = document.createElement("span");
            separator.textContent = "/";
            separator.style.color = "var(--fastlink-primary-color)";
            breadcrumbEl.appendChild(separator);
          }
        });
      }

      // 初始化加载根目录
      loadFolders();

      // 新建文件夹按钮
      document.getElementById("fastlink-create-folder-btn").onclick = async () => {
        const folderName = document.getElementById("fastlink-new-folder-name").value.trim();
        if (!folderName) {
          alert("请输入文件夹名称");
          return;
        }

        try {
          const result = await apiClient.mkdir(currentFolderId, folderName);
          if (result.success) {
            document.getElementById("fastlink-new-folder-name").value = "";
            loadFolders(currentFolderId);
            GM_notification({ text: "文件夹创建成功", timeout: 2000 });
          } else {
            throw new Error("创建文件夹失败");
          }
        } catch (error) {
          console.error("创建文件夹失败:", error);
          utils.showError("创建文件夹失败");
        }
      };

      // 取消按钮
      document.getElementById("fastlink-folder-cancel-btn").onclick = () => {
        dialog.remove();
      };

      // 选择按钮
      document.getElementById("fastlink-folder-select-btn").onclick = () => {
        if (onSelect) {
          onSelect(currentFolderId);
        }
        dialog.remove();
      };

      // 搜索功能
      const searchInput = document.getElementById("fastlink-folder-search");
      searchInput.oninput = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const folderItems = document.querySelectorAll(".fastlink-folder-item");
        folderItems.forEach(item => {
          const folderName = item.dataset.name.toLowerCase();
          if (folderName.includes(searchTerm)) {
            item.style.display = "flex";
          } else {
            item.style.display = "none";
          }
        });
      };

      return dialog;
    },

    decodeMd5(md5) {
      if (!md5 || !md5.includes("==")) {
        return md5 || "";
      }
      try {
        const binaryString = atob(md5);
        if (binaryString.length === 16) {
          return Array.from(binaryString, (char) =>
            char.charCodeAt(0).toString(16).padStart(2, "0")
          ).join("");
        }
        return "";
      } catch (e) {
        return "";
      }
    },

    // 123云盘相关功能
    pan123: {
      // 123云盘API客户端
      apiClient: null,

      // 初始化API客户端
      initApiClient() {
        const auth = utils.get123PanAuth();
        this.apiClient = {
          host: "https://www.123pan.com",
          authToken: auth.authToken,
          loginUuid: auth.loginUuid,
          appVersion: "3",
          referer: document.location.href,

          buildURL(path, queryParams) {
            const queryString = new URLSearchParams(
              queryParams || {}
            ).toString();
            return `${this.host}${path}?${queryString}`;
          },

          sendRequest(method, path, queryParams, body) {
            return new Promise((resolve, reject) => {
              const headers = {
                "Content-Type": "application/json;charset=UTF-8",
                Authorization: "Bearer " + this.authToken,
                platform: "web",
                "App-Version": this.appVersion,
                LoginUuid: this.loginUuid,
                Origin: this.host,
                Referer: this.referer,
              };

              try {
                GM_xmlhttpRequest({
                  method: method,
                  url: this.buildURL(path, queryParams),
                  headers: headers,
                  data: body,
                  withCredentials: true,
                  onload: (response) => {
                    try {
                      const data = JSON.parse(response.responseText);
                      if (data.code === 401) {
                        utils.show123PanAuthDialog(async (newAuth) => {
                          setTimeout(() => generateAndSaveTo123Pan(), 100);
                        })
                        return;
                      }

                      if (data.code !== 0) {
                        reject(new Error(data.message));
                        return;
                      }  

                      resolve(data);
                    } catch (e) {
                      reject(new Error("解析响应失败: " + e.message));
                    }
                  },
                  onerror: (error) => {
                    console.error(
                      "[123Link] [PanApiClient]",
                      "API请求失败:",
                      error
                    );
                    reject(new Error("网络请求失败: " + error.message));
                  },
                  ontimeout: () => {
                    reject(new Error("请求超时"));
                  },
                });
              } catch (e) {
                console.error("[123Link] [PanApiClient]", "API请求失败:", e);
                reject(e);
              }
            });
          },

          async getParentFileId() {
            return "0";
          },

          async getFolderList(parentFileId = "0", page = 1, pageSize = 50) {
            try {
              const response = await this.sendRequest(
                "GET",
                "/b/api/file/list/new",
                {
                  driveId: "0",
                  parentFileId: parentFileId.toString(),
                  Page: page.toString(),
                  pageSize: pageSize.toString(),
                  limit: pageSize.toString(),
                  next: "0",
                  orderBy: "file_name",
                  orderDirection: "asc",
                  trashed: "false",
                  SearchData: "",
                  OnlyLookAbnormalFile: "0",
                  event: "homeListFile",
                  operateType: "1",
                  inDirectSpace: "false"
                }
              );
              
              if (response.code === 0 && response.data) {
                const folders = response.data.InfoList || [];
                return folders.filter(item => item.Type === 1).map(item => ({
                  fileId: item.FileId,
                  fileName: item.FileName,
                  type: item.Type,
                  parentFileId: item.ParentFileId || parentFileId
                }));
              }
              return [];
            } catch (error) {
              console.error("[123Link] [PanApiClient]", "获取文件夹列表失败:", error);
              return [];
            }
          },

          async getFolderTree(parentFileId = "0", depth = 2) {
            const folderTree = [];
            const visited = new Set();

            async function traverse(currentId, currentDepth) {
              if (currentDepth > depth || visited.has(currentId)) {
                return;
              }
              
              visited.add(currentId);
              const folders = await this.getFolderList(currentId);
              
              for (const folder of folders) {
                const folderNode = {
                  ...folder,
                  children: []
                };
                folderTree.push(folderNode);
                
                if (currentDepth < depth) {
                  folderNode.children = await traverse.call(this, folder.fileId, currentDepth + 1);
                }
              }
              
              return folderTree;
            }

            return await traverse.call(this, parentFileId, 1);
          },

          async uploadRequest(fileInfo) {
            try {
              const response = await this.sendRequest(
                "POST",
                "/b/api/file/upload_request",
                {},
                JSON.stringify({
                  ...fileInfo,
                  RequestSource: null,
                })
              );
              const reuse = response["data"]["Reuse"];
              if (response["code"] !== 0) {
                return [false, response["message"]];
              }
              if (!reuse) {
                console.error(
                  "[123Link] [PanApiClient]",
                  "保存文件失败:",
                  fileInfo.fileName,
                  "response:",
                  response
                );
                return [false, null];
              } else {
                return [true, null];
              }
            } catch (error) {
              console.error("[123Link] [PanApiClient]", "上传请求失败:", error);
              return [false, "请求失败"];
            }
          },

          async getFile(fileInfo, parentFileId) {
            if (!parentFileId) {
              parentFileId = await this.getParentFileId();
            }
            return await this.uploadRequest({
              driveId: 0,
              etag: fileInfo.etag,
              fileName: fileInfo.fileName,
              parentFileId,
              size: fileInfo.size,
              type: 0,
              duplicate: 1,
            });
          },

          async mkdir(parentFileId, folderName = "New Folder") {
            let folderFileId = null;
            try {
              const response = await this.sendRequest(
                "POST",
                "/b/api/file/upload_request",
                {},
                JSON.stringify({
                  driveId: 0,
                  etag: "",
                  fileName: folderName,
                  parentFileId,
                  size: 0,
                  type: 1,
                  duplicate: 1,
                  NotReuse: true,
                  event: "newCreateFolder",
                  operateType: 1,
                  RequestSource: null,
                })
              );
              folderFileId = response["data"]["Info"]["FileId"];
            } catch (error) {
              console.error(
                "[123Link] [PanApiClient]",
                "创建文件夹失败:",
                error
              );
              return {
                folderFileId: null,
                folderName: folderName,
                success: false,
              };
            }
            return {
              folderFileId: folderFileId,
              folderName: folderName,
              success: true,
            };
          },
        };
        return this.apiClient;
      },

      // 保存JSON格式的秒链到123云盘
      async saveJsonShareLink(jsonData, onProgress, targetFolderId = "0") {
        try {
          // 初始化API客户端
          const apiClient = this.initApiClient();

          // 检查是否登录
          if (!apiClient.authToken) {
            throw new Error("请先登录123云盘");
          }

          // 解析JSON数据
          const shareFileList = this._parseJsonShareLink(jsonData);

          // 创建文件夹结构
          const filesWithParentId = await this._makeDirForFiles(
            shareFileList,
            apiClient,
            onProgress,
            targetFolderId
          );

          // 保存文件
          const saveResult = await this._saveFileList(
            filesWithParentId,
            apiClient,
            onProgress
          );

          return saveResult;
        } catch (error) {
          console.error("[123Link] [pan123]", "保存失败:", error);
          throw error;
        }
      },

      // 解析JSON格式的秒链
      _parseJsonShareLink(jsonData) {
        const commonPath = jsonData["commonPath"] || "";
        const shareFileList = jsonData["files"];
        if (jsonData["usesBase62EtagsInExport"]) {
          shareFileList.forEach((file) => {
            file.etag = this._base62ToHex(file.etag);
          });
        }
        shareFileList.forEach((file) => {
          file.fileName = file.path.split("/").pop();
        });
        return {
          files: shareFileList,
          commonPath: commonPath,
        };
      },

      // 创建文件夹结构
      async _makeDirForFiles(shareData, apiClient, onProgress, targetFolderId = "0") {
        const { files, commonPath } = shareData;
        const total = files.length;
        const folder = {};

        // 使用指定的目标文件夹ID或默认根文件夹ID
        const rootFolderId = targetFolderId;

        // 创建commonPath对应的文件夹结构
        if (commonPath) {
          const commonPathParts = commonPath
            .split("/")
            .filter((part) => part !== "");
          let currentParentId = rootFolderId;

          for (let i = 0; i < commonPathParts.length; i++) {
            const currentPath = commonPathParts.slice(0, i + 1).join("/");
            const folderName = commonPathParts[i];

            if (!folder[currentPath]) {
              const newFolder = await apiClient.mkdir(
                currentParentId,
                folderName
              );
              await new Promise((resolve) => setTimeout(resolve, 100));
              folder[currentPath] = newFolder.folderFileId;
            }

            currentParentId = folder[currentPath];
          }
        } else {
          folder[""] = rootFolderId;
        }

        // 为每个文件创建对应的文件夹结构并添加parentFolderId
        for (let i = 0; i < files.length; i++) {
          const item = files[i];
          const itemPath = item.path.split("/").slice(0, -1);

          // 从commonPath或根文件夹开始
          let nowParentFolderId =
            folder[commonPath.slice(0, -1)] || rootFolderId;

          // 创建文件路径对应的文件夹结构
          for (let j = 0; j < itemPath.length; j++) {
            const path = itemPath.slice(0, j + 1).join("/");
            if (!folder[path]) {
              const newFolderID = await apiClient.mkdir(
                nowParentFolderId,
                itemPath[j]
              );
              await new Promise((resolve) => setTimeout(resolve, 100));
              folder[path] = newFolderID.folderFileId;
              nowParentFolderId = newFolderID.folderFileId;
            } else {
              nowParentFolderId = folder[path];
            }
          }

          // 添加parentFolderId到文件信息
          files[i].parentFolderId = nowParentFolderId;

          // 调用进度回调
          if (onProgress) {
            onProgress(i + 1, total, item.fileName, 0, 0);
          }
        }

        return files;
      },

      // 保存文件列表
      async _saveFileList(shareFileList, apiClient, onProgress) {
        const total = shareFileList.length;
        const successList = [];
        const failedList = [];

        for (let i = 0; i < shareFileList.length; i++) {
          const fileInfo = shareFileList[i];
          if (i > 0) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          await this._saveSingleFile(
            fileInfo,
            apiClient,
            successList,
            failedList,
            i,
            total,
            onProgress
          );
        }

        utils.updateProgress(1, 1, "完成");
        return {
          success: successList,
          failed: failedList,
        };
      },

      async _saveSingleFile(
        fileInfo,
        apiClient,
        successList,
        failedList,
        index,
        total,
        onProgress
      ) {
        try {
          const reuse = await apiClient.getFile(
            {
              etag: fileInfo.etag,
              size: fileInfo.size,
              fileName: fileInfo.fileName,
            },
            fileInfo.parentFolderId
          );

          if (reuse[0]) {
            this._handleSaveSuccess(fileInfo, successList);
          } else {
            this._handleSaveFailure(fileInfo, failedList, reuse[1]);
          }

          // 调用进度回调
          if (onProgress) {
            const completed = index + 1;
            const success = successList.length;
            const failed = failedList.length;
            utils.updateProgress(completed, total);
            onProgress(completed, total, fileInfo.fileName, success, failed);
          }
        } catch (error) {
          this._handleSaveFailure(fileInfo, failedList, error.message);
          console.error(
            "[123Link] [pan123]",
            "保存文件异常:",
            fileInfo.fileName,
            error
          );
        }
      },

      _handleSaveSuccess(fileInfo, successList) {
        successList.push(fileInfo);
        utils.addSaveLog(fileInfo.fileName, "success");
      },

      _handleSaveFailure(fileInfo, failedList, error) {
        fileInfo.error = error;
        failedList.push(fileInfo);
        utils.addSaveLog(fileInfo.fileName, "failed", error);
      },

      // Base62转换相关方法
      _base62chars() {
        return "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
      },

      _base62ToHex(base62) {
        if (!base62) return "";
        const chars = this._base62chars();
        let num = 0n;
        for (let i = 0; i < base62.length; i++) {
          num = num * 62n + BigInt(chars.indexOf(base62[i]));
        }
        let hex = num.toString(16);
        if (hex.length % 2) hex = "0" + hex;
        while (hex.length < 32) hex = "0" + hex;
        return hex;
      },
    },
  };

  const tianyiService = {
    getSelectedFiles() {
      try {
        if (typeof unsafeWindow !== "undefined") {
          let list;
          if (/\/web\/share/.test(location.href)) {
            list = unsafeWindow.shareUser?.getSelectedFileList();
          } else {
            list = unsafeWindow.file?.getSelectedFileList();
          }
          if (list && list.length > 0) {
            return list;
          }
        }
      } catch (e) {
        // ignore
      }

      const selectedItems = [];
      let selectedElements = document.querySelectorAll("li.c-file-item-select");

      if (selectedElements.length === 0) {
        const checkedBoxes = document.querySelectorAll(".ant-checkbox-checked");
        if (checkedBoxes.length > 0) {
          selectedElements = Array.from(checkedBoxes)
            .map((box) => box.closest("li.c-file-item"))
            .filter((el) => el);
        }
      }

      if (selectedElements.length === 0) {
        return [];
      }

      selectedElements.forEach((itemEl) => {
        if (itemEl.__vue__) {
          const vueInstance = itemEl.__vue__;
          const fileData =
            vueInstance.fileItem ||
            vueInstance.fileInfo ||
            vueInstance.item ||
            vueInstance.file;
          if (fileData) {
            if (
              !selectedItems.some(
                (item) => item.fileId === (fileData.id || fileData.fileId)
              )
            ) {
              const normalizedItem = {
                fileId: fileData.id || fileData.fileId,
                fileName: fileData.name || fileData.fileName,
                isFolder: fileData.isFolder || fileData.fileCata === 2,
                md5: fileData.md5,
                size: fileData.size,
              };
              selectedItems.push(normalizedItem);
            }
          }
        }
      });
      return selectedItems;
    },

    async getPersonalFolderFiles(folderId, path = "", onProgress = null) {
      const files = [];
      let pageNum = 1;
      const pageSize = 100;

      while (true) {
        const appKey = "600100422";
        const timestamp = Date.now().toString();
        const urlParams = {
          folderId: folderId,
          pageNum: pageNum,
          pageSize: pageSize,
          orderBy: "lastOpTime",
          descending: "true",
        };

        const signParams = {
          ...urlParams,
          Timestamp: timestamp,
          AppKey: appKey,
        };
        const signature = this.get189Signature(signParams);

        const url = `https://cloud.189.cn/api/open/file/listFiles.action?${new URLSearchParams(
          urlParams
        )}`;

        const text = await utils.get(url, {
          Accept: "application/json;charset=UTF-8",
          "Sign-Type": "1",
          Signature: signature,
          Timestamp: timestamp,
          AppKey: appKey,
        });

        const data = JSON.parse(text);

        if (data.res_code !== 0) break;

        const fileList = data.fileListAO?.fileList || [];
        const folderList = data.fileListAO?.folderList || [];

        if (fileList.length === 0 && folderList.length === 0) break;

        for (const file of fileList) {
          const filePath = path ? `${path}/${file.name}` : file.name;
          files.push({
            path: filePath,
            etag: (file.md5 || "").toLowerCase(),
            size: file.size,
            fileId: file.id,
          });
          if (onProgress) onProgress();
        }

        for (const folder of folderList) {
          const folderPath = path ? `${path}/${folder.name}` : folder.name;
          const subFiles = await this.getPersonalFolderFiles(
            folder.id,
            folderPath,
            onProgress
          );
          files.push(...subFiles);
        }

        if (fileList.length + folderList.length < pageSize) break;
        pageNum++;
      }
      return files;
    },

    async getBaseShareInfo(shareUrl, sharePwd) {
      let match =
        shareUrl.match(/\/t\/([a-zA-Z0-9]+)/) ||
        shareUrl.match(/[?&]code=([a-zA-Z0-9]+)/);
      if (!match) throw new Error("无效的189网盘分享链接");

      const shareCode = match[1];
      let accessCode = sharePwd || "";

      if (!accessCode) {
        const cookieName = `share_${shareCode}`;
        const cookiePwd = utils.getCookie(cookieName);
        if (cookiePwd) {
          accessCode = cookiePwd;
        } else {
          try {
            const decodedUrl = decodeURIComponent(shareUrl);
            const pwdMatch = decodedUrl.match(
              /[（(]访问码[：:]\s*([a-zA-Z0-9]+)/
            );
            if (pwdMatch && pwdMatch[1]) {
              accessCode = pwdMatch[1];
            }
          } catch (e) {
            /* ignore decoding errors */
          }
        }
      }

      let shareId = shareCode;

      if (accessCode) {
        const checkUrl = `https://cloud.189.cn/api/open/share/checkAccessCode.action?shareCode=${shareCode}&accessCode=${accessCode}`;
        try {
          const checkText = await utils.get(checkUrl, {
            Accept: "application/json;charset=UTF-8",
            Referer: "https://cloud.189.cn/web/main/",
          });
          const checkData = JSON.parse(checkText);
          if (checkData.shareId) shareId = checkData.shareId;
        } catch (e) {
          /* ignore */
        }
      }

      const params = { shareCode, accessCode: accessCode };
      const timestamp = Date.now().toString();
      const appKey = "600100422";
      const signData = { ...params, Timestamp: timestamp, AppKey: appKey };
      const signature = this.get189Signature(signData);
      const apiUrl = `https://cloud.189.cn/api/open/share/getShareInfoByCodeV2.action?${new URLSearchParams(
        params
      )}`;

      const text = await utils.get(apiUrl, {
        Accept: "application/json;charset=UTF-8",
        "Sign-Type": "1",
        Signature: signature,
        Timestamp: timestamp,
        AppKey: appKey,
        Referer: "https://cloud.189.cn/web/main/",
      });

      let data;
      try {
        data = JSON.parse(
          text.replace(
            /"(id|fileId|parentId|shareId)":"?(\d{15,})"?/g,
            '"$1":"$2"'
          )
        );
      } catch (e) {
        throw new Error("解析分享信息失败");
      }

      if (data.res_code !== 0) {
        if (data.res_code === 40401 && !accessCode)
          throw new Error("该分享需要提取码，请输入提取码");
        throw new Error(`获取分享信息失败: ${data.res_message || "未知错误"}`);
      }

      return {
        shareId: data.shareId || shareId,
        shareMode: data.shareMode || "0",
        accessCode: accessCode,
        shareCode: shareCode,
        title: data.fileName || "",
      };
    },

    async get189ShareFiles(
      shareId,
      shareDirFileId,
      fileId,
      path = "",
      shareMode = "0",
      accessCode = "",
      shareCode = "",
      onProgress = null
    ) {
      const files = [];
      let page = 1;

      while (true) {
        const params = {
          pageNum: page.toString(),
          pageSize: "100",
          fileId: fileId.toString(),
          shareDirFileId: shareDirFileId.toString(),
          isFolder: "true",
          shareId: shareId.toString(),
          shareMode: shareMode,
          iconOption: "5",
          orderBy: "lastOpTime",
          descending: "true",
          accessCode: accessCode || "",
        };
        const queryString = new URLSearchParams(params).toString();
        const url = `https://cloud.189.cn/api/open/share/listShareDir.action?${queryString}`;

        const headers = {
          Accept: "application/json;charset=UTF-8",
          Referer: "https://cloud.189.cn/web/main/",
        };
        if (shareCode && accessCode) {
          headers["Cookie"] = `share_${shareCode}=${accessCode}`;
        }

        const text = await utils.get(url, headers);
        let data;
        try {
          const fixedText = text.replace(
            /"(id|fileId|parentId|shareId)":(\d{15,})/g,
            '"$1":"$2"'
          );
          data = JSON.parse(fixedText);
        } catch (e) {
          break;
        }

        if (data.res_code !== 0) {
          break;
        }

        const fileList = data.fileListAO?.fileList || [];
        const folderList = data.fileListAO?.folderList || [];

        for (const file of fileList) {
          const filePath = path ? `${path}/${file.name}` : file.name;
          files.push({
            path: filePath,
            etag: (file.md5 || "").toLowerCase(),
            size: file.size,
          });
          if (onProgress) onProgress();
        }

        for (const folder of folderList) {
          const folderPath = path ? `${path}/${folder.name}` : folder.name;
          const subFiles = await this.get189ShareFiles(
            shareId,
            folder.id,
            folder.id,
            folderPath,
            shareMode,
            accessCode,
            shareCode,
            onProgress
          );
          files.push(...subFiles);
        }

        if (fileList.length + folderList.length < 100) {
          break;
        }
        page++;
      }
      return files;
    },

    get189Signature(params) {
      const sortedKeys = Object.keys(params).sort();
      const sortedParams = sortedKeys
        .map((key) => `${key}=${params[key]}`)
        .join("&");
      return this.simpleMD5(sortedParams);
    },

    simpleMD5(str) {
      function rotateLeft(value, shift) {
        return (value << shift) | (value >>> (32 - shift));
      }

      function addUnsigned(x, y) {
        const lsw = (x & 0xffff) + (y & 0xffff);
        const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xffff);
      }

      function F(x, y, z) {
        return (x & y) | (~x & z);
      }

      function G(x, y, z) {
        return (x & z) | (y & ~z);
      }

      function H(x, y, z) {
        return x ^ y ^ z;
      }

      function I(x, y, z) {
        return y ^ (x | ~z);
      }

      function FF(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
      }

      function GG(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
      }

      function HH(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
      }

      function II(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
      }

      function convertToWordArray(str) {
        const lWordCount = ((str.length + 8) >>> 6) + 1;
        const lMessageLength = lWordCount * 16;
        const lWordArray = new Array(lMessageLength - 1);
        let lBytePosition = 0;
        let lByteCount = 0;
        while (lByteCount < str.length) {
          const lWordIndex = (lByteCount - (lByteCount % 4)) / 4;
          lBytePosition = (lByteCount % 4) * 8;
          lWordArray[lWordIndex] =
            lWordArray[lWordIndex] |
            (str.charCodeAt(lByteCount) << lBytePosition);
          lByteCount++;
        }
        const lWordIndex = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordIndex] =
          lWordArray[lWordIndex] | (0x80 << lBytePosition);
        lWordArray[lMessageLength - 2] = str.length << 3;
        lWordArray[lMessageLength - 1] = str.length >>> 29;
        return lWordArray;
      }

      function wordToHex(value) {
        let result = "";
        for (let i = 0; i <= 3; i++) {
          const byte = (value >>> (i * 8)) & 255;
          result += ("0" + byte.toString(16)).slice(-2);
        }
        return result;
      }

      const x = convertToWordArray(str);
      let a = 0x67452301,
        b = 0xefcdab89,
        c = 0x98badcfe,
        d = 0x10325476;
      const S11 = 7,
        S12 = 12,
        S13 = 17,
        S14 = 22;
      const S21 = 5,
        S22 = 9,
        S23 = 14,
        S24 = 20;
      const S31 = 4,
        S32 = 11,
        S33 = 16,
        S34 = 23;
      const S41 = 6,
        S42 = 10,
        S43 = 15,
        S44 = 21;
      for (let k = 0; k < x.length; k += 16) {
        const AA = a,
          BB = b,
          CC = c,
          DD = d;
        a = FF(a, b, c, d, x[k + 0], S11, 0xd76aa478);
        d = FF(d, a, b, c, x[k + 1], S12, 0xe8c7b756);
        c = FF(c, d, a, b, x[k + 2], S13, 0x242070db);
        b = FF(b, c, d, a, x[k + 3], S14, 0xc1bdceee);
        a = FF(a, b, c, d, x[k + 4], S11, 0xf57c0faf);
        d = FF(d, a, b, c, x[k + 5], S12, 0x4787c62a);
        c = FF(c, d, a, b, x[k + 6], S13, 0xa8304613);
        b = FF(b, c, d, a, x[k + 7], S14, 0xfd469501);
        a = FF(a, b, c, d, x[k + 8], S11, 0x698098d8);
        d = FF(d, a, b, c, x[k + 9], S12, 0x8b44f7af);
        c = FF(c, d, a, b, x[k + 10], S13, 0xffff5bb1);
        b = FF(b, c, d, a, x[k + 11], S14, 0x895cd7be);
        a = FF(a, b, c, d, x[k + 12], S11, 0x6b901122);
        d = FF(d, a, b, c, x[k + 13], S12, 0xfd987193);
        c = FF(c, d, a, b, x[k + 14], S13, 0xa679438e);
        b = FF(b, c, d, a, x[k + 15], S14, 0x49b40821);
        a = GG(a, b, c, d, x[k + 1], S21, 0xf61e2562);
        d = GG(d, a, b, c, x[k + 6], S22, 0xc040b340);
        c = GG(c, d, a, b, x[k + 11], S23, 0x265e5a51);
        b = GG(b, c, d, a, x[k + 0], S24, 0xe9b6c7aa);
        a = GG(a, b, c, d, x[k + 5], S21, 0xd62f105d);
        d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
        c = GG(c, d, a, b, x[k + 15], S23, 0xd8a1e681);
        b = GG(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8);
        a = GG(a, b, c, d, x[k + 9], S21, 0x21e1cde6);
        d = GG(d, a, b, c, x[k + 14], S22, 0xc33707d6);
        c = GG(c, d, a, b, x[k + 3], S23, 0xf4d50d87);
        b = GG(b, c, d, a, x[k + 8], S24, 0x455a14ed);
        a = GG(a, b, c, d, x[k + 13], S21, 0xa9e3e905);
        d = GG(d, a, b, c, x[k + 2], S22, 0xfcefa3f8);
        c = GG(c, d, a, b, x[k + 7], S23, 0x676f02d9);
        b = GG(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a);
        a = HH(a, b, c, d, x[k + 5], S31, 0xfffa3942);
        d = HH(d, a, b, c, x[k + 8], S32, 0x8771f681);
        c = HH(c, d, a, b, x[k + 11], S33, 0x6d9d6122);
        b = HH(b, c, d, a, x[k + 14], S34, 0xfde5380c);
        a = HH(a, b, c, d, x[k + 1], S31, 0xa4beea44);
        d = HH(d, a, b, c, x[k + 4], S32, 0x4bdecfa9);
        c = HH(c, d, a, b, x[k + 7], S33, 0xf6bb4b60);
        b = HH(b, c, d, a, x[k + 10], S34, 0xbebfbc70);
        a = HH(a, b, c, d, x[k + 13], S31, 0x289b7ec6);
        d = HH(d, a, b, c, x[k + 0], S32, 0xeaa127fa);
        c = HH(c, d, a, b, x[k + 3], S33, 0xd4ef3085);
        b = HH(b, c, d, a, x[k + 6], S34, 0x4881d05);
        a = HH(a, b, c, d, x[k + 9], S31, 0xd9d4d039);
        d = HH(d, a, b, c, x[k + 12], S32, 0xe6db99e5);
        c = HH(c, d, a, b, x[k + 15], S33, 0x1fa27cf8);
        b = HH(b, c, d, a, x[k + 2], S34, 0xc4ac5665);
        a = II(a, b, c, d, x[k + 0], S41, 0xf4292244);
        d = II(d, a, b, c, x[k + 7], S42, 0x432aff97);
        c = II(c, d, a, b, x[k + 14], S43, 0xab9423a7);
        b = II(b, c, d, a, x[k + 5], S44, 0xfc93a039);
        a = II(a, b, c, d, x[k + 12], S41, 0x655b59c3);
        d = II(d, a, b, c, x[k + 3], S42, 0x8f0ccc92);
        c = II(c, d, a, b, x[k + 10], S43, 0xffeff47d);
        b = II(b, c, d, a, x[k + 1], S44, 0x85845dd1);
        a = II(a, b, c, d, x[k + 8], S41, 0x6fa87e4f);
        d = II(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0);
        c = II(c, d, a, b, x[k + 6], S43, 0xa3014314);
        b = II(b, c, d, a, x[k + 13], S44, 0x4e0811a1);
        a = II(a, b, c, d, x[k + 4], S41, 0xf7537e82);
        d = II(d, a, b, c, x[k + 11], S42, 0xbd3af235);
        c = II(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb);
        b = II(b, c, d, a, x[k + 9], S44, 0xeb86d391);
        a = addUnsigned(a, AA);
        b = addUnsigned(b, BB);
        c = addUnsigned(c, CC);
        d = addUnsigned(d, DD);
      }
      return (
        wordToHex(a) +
        wordToHex(b) +
        wordToHex(c) +
        wordToHex(d)
      ).toLowerCase();
    },
  };

  async function generateAndSaveTo123Pan() {
    try {
      // 先检查123云盘认证信息
      const auth = utils.get123PanAuth();
      if (!auth.authToken || !auth.loginUuid) {
        utils.closeLoadingDialog();
        if (
          confirm(
            "未检测到123云盘认证信息，请先设置认证信息后再转存。\n\n点击确定进入设置，点击取消取消转存操作。"
          )
        ) {
          utils.show123PanAuthDialog(async (newAuth) => {
            setTimeout(() => generateAndSaveTo123Pan(), 100);
          });
        }
        return;
      }

      // 先检查是否有已选择的文件或文件夹
      const hostname = location.hostname;
      let hasSelectedFiles = false;
      
      if (hostname.includes("cloud.189.cn")) {
        const selectedFiles = tianyiService.getSelectedFiles();
        hasSelectedFiles = selectedFiles.length > 0;
      } else if (hostname.includes("quark.cn")) {
        const selectedItems = utils.getSelectedList();
        hasSelectedFiles = selectedItems.length > 0;
      }
      
      if (!hasSelectedFiles) {
        utils.showError("请选择要转存的文件或文件夹");
        return;
      }

      // 初始化API客户端以获取文件夹结构
      const apiClient = utils.pan123.initApiClient();

      // 先显示文件夹选择对话框
      utils.showFolderSelectDialog(apiClient, async (targetFolderId) => {
        try {
          const path = location.pathname;
          let json = null;
          let shareTitle = "";

          if (hostname.includes("cloud.189.cn")) {
            if (path.startsWith("/web/main")) {
              json = await generateTianyiHomeJsonInternal();
            } else {
              const result = await generateTianyiShareJsonInternal();
              json = result.json;
              shareTitle = result.title;
            }
          } else if (hostname.includes("quark.cn")) {
            const isSharePage = /^\/(s|share)\//.test(path);
            if (isSharePage) {
              const match = location.pathname.match(/\/(s|share)\/([a-zA-Z0-9]+)/);
              if (!match) {
                throw new Error("无法获取分享ID");
              }
              const shareId = match[2];
              let cookie = utils.getCachedCookie();
              if (!cookie || cookie.length < 10) {
                utils.showCookieInputDialog((newCookie) => {
                  setTimeout(() => generateAndSaveTo123Pan(), 100);
                });
                return;
              }
              const result = await generateShareJsonInternal(shareId, cookie);
              json = result.json;
              shareTitle = result.title;
            } else {
              json = await generateHomeJsonInternal();
            }
          }

          if (json) {
            // 修改saveTo123PanInternal，使其接受targetFolderId参数
            await saveTo123PanInternal(json, shareTitle, targetFolderId);
          }
        } catch (error) {
          utils.closeLoadingDialog();
          utils.showError(error.message || "转存到123云盘失败");
        }
      });
    } catch (error) {
      utils.closeLoadingDialog();
      utils.showError(error.message || "转存到123云盘失败");
    }
  }

  async function saveTo123PanInternal(json, shareTitle = "", targetFolderId = "0") {
    try {
      const auth = utils.get123PanAuth();
      if (!auth.authToken || !auth.loginUuid) {
        utils.closeLoadingDialog();
        if (
          confirm(
            "未检测到123云盘认证信息，请先设置认证信息后再转存。\n\n点击确定进入设置，点击取消取消转存操作。"
          )
        ) {
          utils.show123PanAuthDialog(async (newAuth) => {
            await saveTo123PanInternal(json, shareTitle, targetFolderId);
          });
        }
        return;
      }

      try {
        let percent = 0;
        const saveResult = await utils.pan123.saveJsonShareLink(
          json,
          (completed, total) => {
            percent = total > 0 ? Math.round((completed / total) * 100) : 100;
            utils.updateProgress(completed, total);
          },
          targetFolderId
        );

        const successCount = saveResult.success.length;
        const failedCount = saveResult.failed.length;

        if (percent === 100) {
          const progressText = document.getElementById(
            "fastlink-loading-progress-text"
          );
          progressText.textContent = `✅ 成功: ${successCount},   ❌ 失败: ${failedCount}`;
        }
      } catch (error) {
        console.error("转存到123云盘失败:", error);
        utils.showError(`转存失败: ${error.message}`);
      }
    } catch (error) {
      console.error("转存到123云盘失败:", error);
      utils.showError(`转存失败: ${error.message}`);
    }
  }

  async function generateTianyiShareJsonInternal() {
    utils.showLoadingDialog("正在转存文件", "准备中...");

    try {
      const selectedFiles = tianyiService.getSelectedFiles();

      if (selectedFiles.length === 0) {
        utils.closeLoadingDialog();
        throw new Error("请选择要转存的文件或文件夹");
      }

      const shareUrl = window.location.href;
      let sharePwd = "";

      const allFiles = [];
      let filesFound = 0;

      const onProgress = () => {
        filesFound++;
      };

      const { shareId, shareMode, accessCode, shareCode, title } =
        await tianyiService.getBaseShareInfo(shareUrl, sharePwd);

      for (const item of selectedFiles) {
        if (item.isFolder) {
          const folderPath = item.fileName;
          const subFiles = await tianyiService.get189ShareFiles(
            shareId,
            item.fileId,
            item.fileId,
            folderPath,
            shareMode,
            accessCode,
            shareCode,
            onProgress
          );
          allFiles.push(...subFiles);
        } else {
          allFiles.push({
            path: item.fileName,
            etag: (item.md5 || "").toLowerCase(),
            size: item.size,
          });
          onProgress();
        }
      }

      await utils.sleep(300);

      const finalJson = utils.generateRapidTransferJson(allFiles);
      return { json: finalJson, title };
    } catch (error) {
      utils.closeLoadingDialog();
      throw error;
    }
  }

  async function generateTianyiHomeJsonInternal() {
    utils.showLoadingDialog("正在转存文件", "准备中...");

    try {
      const selectedFiles = tianyiService.getSelectedFiles();
      if (selectedFiles.length === 0) {
        utils.closeLoadingDialog();
        throw new Error("请先勾选要生成JSON的文件或文件夹");
      }

      const allFiles = [];
      let filesFound = 0;
      const onProgress = () => {
        filesFound++;
      };

      for (const item of selectedFiles) {
        if (item.isFolder) {
          const subFiles = await tianyiService.getPersonalFolderFiles(
            item.fileId,
            item.fileName,
            onProgress
          );
          allFiles.push(...subFiles);
        } else {
          allFiles.push({
            path: item.fileName,
            size: item.size,
            fileId: item.fileId,
            etag: (item.md5 || "").toLowerCase(),
          });
          onProgress();
        }
      }

      await utils.sleep(300);

      const finalJson = utils.generateRapidTransferJson(allFiles);
      return finalJson;
    } catch (error) {
      utils.closeLoadingDialog();
      throw error;
    }
  }

  async function generateHomeJsonInternal() {
    utils.showLoadingDialog("正在转存文件", "准备中...");

    try {
      const selectedItems = utils.getSelectedList();

      if (selectedItems.length === 0) {
        throw new Error("请选择要转存的文件或文件夹");
      }

      const currentPath = utils.getCurrentPath();

      const allFiles = [];
      let totalFilesFound = 0;

      for (const item of selectedItems) {
        if (item.file) {
          const filePath = currentPath
            ? `${currentPath}/${item.file_name}`
            : item.file_name;
          allFiles.push({ ...item, path: filePath });
          totalFilesFound++;
        } else if (item.dir) {
          const folderPath = currentPath
            ? `${currentPath}/${item.file_name}`
            : item.file_name;
          const folderFiles = await utils.getFolderFiles(
            item.fid,
            folderPath,
            () => {
              totalFilesFound++;
            }
          );
          allFiles.push(...folderFiles);
        }
      }

      if (allFiles.length === 0) {
        throw new Error("没有找到任何文件");
      }

      const filesData = await utils.getFilesWithMd5(allFiles);

      const json = utils.generateRapidTransferJson(filesData);
      return json;
    } catch (error) {
      utils.closeLoadingDialog();
      throw error;
    }
  }

  async function generateShareJsonInternal(shareId, cookie) {
    utils.showLoadingDialog("正在转存文件", "准备中...");

    try {
      const { stoken, title } = await utils.getShareToken(shareId, "", cookie);

      const selectedItems = utils.getSelectedList();

      if (selectedItems.length === 0) {
        throw new Error("请选择要转存的文件或文件夹");
      }

      const allFileItems = [];
      let totalFilesFound = 0;

      for (const item of selectedItems) {
        if (item.file) {
          const parentFid = item.pdir_fid;
          const filesInParent = await utils.scanQuarkShareFiles(
            shareId,
            stoken,
            cookie,
            parentFid,
            "",
            false
          );
          const fileInfo = filesInParent.find((f) => f.fid === item.fid);

          if (fileInfo) {
            const fileItem = {
              fid: item.fid,
              token: fileInfo.token,
              name: item.file_name,
              size: item.size,
              path: item.file_name,
            };
            allFileItems.push(fileItem);
          } else {
            const fileItem = {
              fid: item.fid,
              token: item.share_fid_token,
              name: item.file_name,
              size: item.size,
              path: item.file_name,
            };
            allFileItems.push(fileItem);
          }
          totalFilesFound++;
        } else if (item.dir) {
          const folderFiles = await utils.scanQuarkShareFiles(
            shareId,
            stoken,
            cookie,
            item.fid,
            item.file_name
          );
          allFileItems.push(...folderFiles);
          totalFilesFound += folderFiles.length;
        }
      }

      if (allFileItems.length === 0) {
        throw new Error("没有找到任何文件");
      }

      await utils.sleep(300);

      const md5Map = await utils.batchGetShareFilesMd5(
        shareId,
        stoken,
        cookie,
        allFileItems
      );

      const files = allFileItems.map((item) => ({
        path: item.path,
        etag: (md5Map[item.fid] || "").toLowerCase(),
        size: item.size,
      }));

      const json = {
        scriptVersion: "3.0.3",
        exportVersion: "1.0",
        usesBase62EtagsInExport: false,
        commonPath: "",
        files,
        totalFilesCount: files.length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
      };

      return { json, title };
    } catch (error) {
      utils.closeLoadingDialog();
      throw error;
    }
  }

  function addButton() {
    const hostname = location.hostname;
    let container;

    if (document.getElementById("quark-json-generator-btn")) {
      return;
    }

    if (hostname.includes("cloud.189.cn")) {
      const isMainPage = location.pathname.startsWith("/web/main");

      if (isMainPage) {
        container = document.querySelector(
          '[class*="FileHead_file-head-left"]'
        );
      } else {
        container = document.querySelector(".file-operate");
      }

      if (!container) return;

      const button = document.createElement("a");
      button.id = "quark-json-generator-btn";
      button.className = "btn";
      button.href = "javascript:;";
      button.textContent = "转存到123云盘";
      if (isMainPage) {
        button.style.cssText =
          "width: 100px; height: 30px; padding: 0; border-radius: 4px; line-height: 30px; color: #fff; text-align: center; font-size: 12px; background: #52c41a; border: 1px solid #43a413; position: relative; display: block; margin-right: 12px;";
      } else {
        button.style.cssText =
          "width: 140px; height: 36px; padding: 0; border-radius: 4px; line-height: 36px; color: #fff; text-align: center; font-size: 14px; background: #52c41a; border: 1px solid #43a413; position: relative; display: block;margin-right:20px;";
      }

      container.insertBefore(button, container.firstChild);

      if (!isMainPage) {
        const styleId = "quark-json-flex-style";
        if (!document.getElementById(styleId)) {
          const style = document.createElement("style");
          style.id = styleId;
          style.textContent = `
						.outlink-box-b .file-operate {
							display: flex !important;
							flex-wrap: nowrap !important;
							justify-content: flex-end !important;
							align-items: center !important;
							/* Override conflicting styles */
							float: none !important;
							text-align: unset !important;
						}
						.btn-save-as{
							margin-left: 0 !important;
						}
					`;
          document.head.appendChild(style);
        }
      }

      button.onclick = generateAndSaveTo123Pan;
    } else if (hostname.includes("quark.cn")) {
      const path = location.pathname;
      const isSharePage = /^\/(s|share)\//.test(path);
      if (isSharePage) {
        container = document.querySelector(".share-btns");
        if (!container) {
          const alternatives = [
            ".ant-layout-content .operate-bar",
            ".share-detail-header .operate-bar",
            ".share-header-btns",
            ".share-operate-btns",
            "[class*='share'][class*='btn']",
            ".ant-btn-group",
          ];
          for (const selector of alternatives) {
            container = document.querySelector(selector);
            if (container) break;
          }
        }
      } else {
        container = document.querySelector(".btn-operate .btn-main");
      }
      if (!container) return;

      const buttonWrapper = document.createElement("div");
      buttonWrapper.id = "quark-json-generator-btn";
      buttonWrapper.className = "ant-dropdown-trigger pl-button-json";

      const isSharePageQuark = /^\/(s|share)\//.test(location.pathname);
      if (isSharePageQuark) {
        buttonWrapper.style.cssText = "display: inline-block; margin-left: 16px;";
        buttonWrapper.innerHTML = `
					<button type="button" class="ant-btn share-save ant-btn-primary" style="background: #52c41a; border-color: #52c41a;">
						<svg style="width: 16px; height: 16px; margin-right: 4px; vertical-align: -3px;" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/></svg>
						<span>转存到123云盘</span>
					</button>
				`;
        container.appendChild(buttonWrapper);
      } else {
        buttonWrapper.style.cssText = "display: inline-block; margin-right: 16px;";
        buttonWrapper.innerHTML = `
					<div class="ant-upload ant-upload-select ant-upload-select-text">
						<button type="button" class="ant-btn ant-btn-primary" style="background: #52c41a; border-color: #52c41a;">
							<svg style="width: 16px; height: 16px; margin-right: 4px; vertical-align: -3px;" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/></svg>
							<span>转存到123云盘</span>
						</button>
					</div>
				`;
        container.insertBefore(buttonWrapper, container.firstChild);
      }
      buttonWrapper.querySelector("button").onclick = generateAndSaveTo123Pan;
    }
  }

  // 全局变量
  let mutationObserver = null;

  function init() {
    const SCRIPT_VERSION = GM_info.script.version;
    const LAST_VERSION = GM_getValue("last_version", "0");

    if (SCRIPT_VERSION > LAST_VERSION) {
      GM_setValue("last_version", SCRIPT_VERSION);
    }

    // 检查123云盘认证信息
    const auth = utils.get123PanAuth();
    if (!auth.authToken || !auth.loginUuid) {
      // 首次使用或认证信息为空，提示用户设置
      const hasPrompted = GM_getValue("pan123_auth_prompted", false);
      if (!hasPrompted) {
        setTimeout(() => {
          if (
            confirm(
              "首次使用转存到123云盘功能，请先设置认证信息。\n\n点击确定进入设置，点击取消稍后在需要时设置。"
            )
          ) {
            utils.show123PanAuthDialog();
          }
          GM_setValue("pan123_auth_prompted", true);
        }, 1000);
      }
    }

    const hostname = location.hostname;
    if (hostname.includes("quark.cn") || hostname.includes("cloud.189.cn")) {
      // 创建MutationObserver并保存引用
      mutationObserver = new MutationObserver(() => {
        addButton();
      });

      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });

      addButton();
    }
  }

  // 清理函数，在脚本卸载时调用
  function cleanup() {
    // 断开MutationObserver
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }

    // 清理对话框缓存
    if (utils._dialogCache) {
      Object.values(utils._dialogCache).forEach((dialog) => {
        if (dialog && dialog.parentNode) {
          dialog.parentNode.removeChild(dialog);
        }
      });
      utils._dialogCache = {};
    }
  }

  // 监听页面卸载事件，清理资源
  window.addEventListener("unload", cleanup);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
