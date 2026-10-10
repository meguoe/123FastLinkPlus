// ==UserScript==
// @name        光鸭助手
// @namespace   guangyaHelper
// @version     0.3.0
// @tag         光鸭云盘
// @tag         迅雷云盘
// @tag         云盘秒传
// @tag         影片整理
// @tag         资源搜索
// @description 光鸭云盘辅助插件，支持批量整理电影、剧集、批量重命名、导入导出秒传文件、资源搜索（迅雷/光鸭/磁力等），支持云雷云盘导出秒传文件。
// @author      萬龍
// @match       https://guangyapan.com/*
// @match       https://*.guangyapan.com/*
// @match       https://pan.xunlei.com/*
// @icon        https://www.guangyapan.com/icon.png
// @grant       GM_addStyle
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_info
// @grant       GM_registerMenuCommand
// @grant       GM_unregisterMenuCommand
// @connect     *
// @connect     api.tmdb.org
// @run-at      document-start
// @noframes
// @license     Apache-2.0
// ==/UserScript==

(function () {
  'use strict';
  const ROOT_ID = 'guangya-helper-root';
  const STYLE_ID = 'guangya-helper-styles';
  const isXunleiPan = /^pan\.xunlei\.com$/i.test(window.location.hostname);
  const TMDB_KEY_STORAGE = 'gyh-tmdb-key';
  const DEBUG_STORAGE = 'gyh-debug-enabled';
  const TMDB_API_BASE = 'https://api.tmdb.org/3';
  const MOVIE_NAMING_RULE_STORAGE = 'gyh-movie-naming-rule';
  const TV_NAMING_RULE_STORAGE = 'gyh-tv-naming-rule';
  const PENDING_MAGNET_STORAGE = 'guangya_pending_magnet';
  const RESOURCE_SEARCH_API = 'https://so.252035.xyz/api/search';
  const RESOURCE_SEARCH_TYPES = ['xunlei', 'guangya', 'magnet'];
  const ACE_CORE_URL = 'https://s4.zstatic.net/ajax/libs/ace/1.43.2/ace.min.js';
  const ACE_TOOLS_URL = 'https://s4.zstatic.net/ajax/libs/ace/1.43.2/ext-language_tools.min.js';
  const ACE_MODE_JSON_URL = 'https://s4.zstatic.net/ajax/libs/ace/1.43.2/mode-json.js';
  const ACE_THEME_TOMORROW_URL = 'https://s4.zstatic.net/ajax/libs/ace/1.43.2/theme-tomorrow.js';
  const ACE_BASE_URL = 'https://s4.zstatic.net/ajax/libs/ace/1.43.2/';
  const XUNLEI_API_BASE = 'https://api-pan.xunlei.com';
  const XUNLEI_CLIENT_ID = 'Xqp0kJBXWhwaTpB6';
  const API = Object.freeze({
    tmdb: TMDB_API_BASE,
    guangya: 'https://api.guangyapan.com',
    xunlei: XUNLEI_API_BASE,
  });
  const VIDEO_EXTENSION_RE = /\.(mp4|mkv|avi|mov|wmv|flv|webm|m4v|ts|m2ts|mpg|mpeg)$/i;
  const MIN_MEDIA_SIZE = 10 * 1024 * 1024;
  let DEBUG = getStoredValue(DEBUG_STORAGE, false) === true;
  let debugMenuCommandId = null;
  const strokeIcon = (content, width = '1.8') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`;
  const ICONS = Object.freeze({
    close: strokeIcon('<path d="m6 6 12 12M18 6 6 18"></path>'),
    back: strokeIcon('<path d="m14 6-6 6 6 6"></path><path d="M8 12h11"></path>'),
    import: strokeIcon('<path d="M12 3v11"></path><path d="m8 10 4 4 4-4"></path><path d="M5 18v2h14v-2"></path>'),
    uploadFile: strokeIcon('<path d="M12 16V4"></path><path d="m8 8 4-4 4 4"></path><path d="M5 14v5h14v-5"></path>'),
    export: strokeIcon('<path d="M12 14V3"></path><path d="m8 7 4-4 4 4"></path><path d="M5 16v4h14v-4"></path><path d="M9 12h6"></path>'),
    movie: strokeIcon('<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M7 5v14M17 5v14M3 9h4M17 9h4M3 15h4M17 15h4"></path>'),
    tv: strokeIcon('<rect x="3" y="7" width="18" height="11" rx="2"></rect><path d="m8 3 4 4 4-4M9 21h6M12 18v3"></path>'),
    rename: strokeIcon('<path d="M4 7.5h8.5"></path><path d="M4 12h16"></path><path d="M4 16.5h8.5"></path><path d="m16 5 4 3.5-4 3.5"></path><path d="m8 13 4 3.5-4 3.5"></path>'),
    renameAction: strokeIcon('<path d="M4 6h9"></path><path d="M4 11h7"></path><path d="M4 16h9"></path><path d="m14 17 5-5a1.7 1.7 0 0 0-2.4-2.4l-5 5L11 18z"></path><path d="m15.5 10.5 2.4 2.4"></path>'),
    transfer: strokeIcon('<path d="M5 8h13"></path><path d="m15 5 3 3-3 3"></path><path d="M19 16H6"></path><path d="m9 13-3 3 3 3"></path>'),
    assistant: strokeIcon('<path d="M12 3v3"></path><rect x="4" y="7" width="16" height="12" rx="5"></rect><circle cx="9" cy="13" r="1"></circle><circle cx="15" cy="13" r="1"></circle><path d="M9 16h6"></path>'),
    search: strokeIcon('<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.6-3.6"></path>'),
    correct: strokeIcon('<path d="M4 12h16"></path><path d="m13 7 5 5-5 5"></path><path d="M6 7h4"></path><path d="M6 17h4"></path>'),
    details: strokeIcon('<path d="M4 5h16v14H4z"></path><path d="M8 9h8M8 13h5"></path>'),
    tmdb: strokeIcon('<path d="M4 7h16M4 12h16M4 17h10"></path><circle cx="18" cy="17" r="2"></circle>'),
    grip: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="8" cy="7" r="1.4"></circle><circle cx="16" cy="7" r="1.4"></circle><circle cx="8" cy="12" r="1.4"></circle><circle cx="16" cy="12" r="1.4"></circle><circle cx="8" cy="17" r="1.4"></circle><circle cx="16" cy="17" r="1.4"></circle></svg>',
    remove: strokeIcon('<path d="m7 7 10 10M17 7 7 17"></path>', '2'),
    info: strokeIcon('<circle cx="12" cy="12" r="9"></circle><path d="M12 11v5M12 8h.01"></path>', '2'),
    success: strokeIcon('<path d="m5 12 4 4L19 6"></path>', '2'),
    error: strokeIcon('<path d="M12 8v4M12 16h.01"></path><circle cx="12" cy="12" r="9"></circle>', '2'),
  });
  let aceLoadPromise = null;
  const xunleiContext = { token: '', deviceId: '', captchaToken: '', clientId: '', shareToken: '' };
  let xunleiRetryNotifier = null;
  if (isXunleiPan) installXunleiRequestCapture();
  const SCRIPT_VERSION = typeof GM_info !== 'undefined' && GM_info?.script?.version ? GM_info.script.version : '0.2.1';
  const styles = ` #${ROOT_ID}{position:fixed;top:50%;right:22px;z-index:2147483000;transform:translateY(-50%);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;}#${ROOT_ID} *,#${ROOT_ID} *::before,#${ROOT_ID} *::after{box-sizing:border-box;}.gyh-trigger{width:52px;height:52px;padding:0;color:#ffffff;background:linear-gradient(145deg,#2e82f5,#245fd2);border:1px solid rgba(255,255,255,0.35);border-radius:16px;box-shadow:0 10px 28px rgba(36,95,210,0.3),0 2px 7px rgba(18,51,106,0.18);cursor:pointer;display:grid;place-items:center;align-content:center;gap:1px;transition:transform 180ms ease,box-shadow 180ms ease,background 180ms ease;}.gyh-trigger:hover{background:linear-gradient(145deg,#4296ff,#2869e6);box-shadow:0 13px 32px rgba(36,95,210,0.36),0 3px 9px rgba(18,51,106,0.2);transform:translateY(-2px);}.gyh-trigger:focus-visible,.gyh-action:focus-visible{outline:3px solid rgba(45,130,245,0.35);outline-offset:3px;}.gyh-trigger svg{width:21px;height:21px;transition:transform 200ms ease;}.gyh-trigger-label{font-size:10px;font-weight:650;line-height:13px;letter-spacing:0;}.gyh-trigger[aria-expanded="true"] svg{transform:rotate(-10deg) scale(0.93);}.gyh-panel{position:absolute;top:50%;right:64px;width:264px;padding:14px;color:#17233a;background:rgba(255,255,255,0.96);border:1px solid rgba(213,225,241,0.92);border-radius:14px;box-shadow:0 18px 48px rgba(36,66,112,0.18),0 2px 8px rgba(36,66,112,0.08);opacity:0;pointer-events:none;transform:translateY(-50%) translateX(10px) scale(0.98);transform-origin:right center;transition:opacity 160ms ease,transform 160ms ease;}.gyh-panel::after{position:absolute;top:50%;right:-7px;width:12px;height:12px;content:"";background:#ffffff;border-top:1px solid rgba(213,225,241,0.92);border-right:1px solid rgba(213,225,241,0.92);transform:translateY(-50%) rotate(45deg);}.gyh-panel.is-open{opacity:1;pointer-events:auto;transform:translateY(-50%) translateX(0) scale(1);}.gyh-panel-header{display:flex;align-items:flex-start;justify-content:space-between;padding:3px 2px 12px;}.gyh-title{margin:0;font-size:15px;font-weight:700;line-height:21px;letter-spacing:0;}.gyh-subtitle{margin:2px 0 0;color:#8290a7;font-size:12px;line-height:17px;letter-spacing:0;}.gyh-status{padding:3px 7px;color:#2a78dd;background:#edf5ff;border-radius:5px;font-size:11px;font-weight:600;line-height:16px;white-space:nowrap;}.gyh-actions{display:grid;gap:7px;}.gyh-action{width:100%;height:48px;padding:5px 10px;text-align:left;color:#20304a;background:#f7faff;border:1px solid #e5edf8;border-radius:8px;cursor:pointer;display:grid;grid-template-columns:34px minmax(0,1fr) 17px;align-items:center;gap:9px;transition:background 160ms ease,border-color 160ms ease;}.gyh-action:hover{background:#f1f7ff;border-color:#c8def8;}.gyh-action-icon{width:34px;height:34px;color:#2877de;background:#e8f2ff;border-radius:8px;display:grid;place-items:center;}.gyh-action-icon svg{width:18px;height:18px;}.gyh-action:nth-child(2) .gyh-action-icon{color:#8a63cc;background:#f2ecff;}.gyh-action:nth-child(3) .gyh-action-icon{color:#de7a34;background:#fff1e8;}.gyh-action-name{display:block;font-size:13px;font-weight:650;line-height:18px;letter-spacing:0;}.gyh-action-note{display:block;margin-top:1px;color:#8491a5;font-size:11px;line-height:15px;letter-spacing:0;}.gyh-action-arrow{color:#a6b4c8;font-size:18px;font-weight:400;line-height:18px;text-align:center;}.gyh-rename-overlay{position:fixed;inset:0;z-index:2147483001;padding:16px;background:rgba(19,32,53,0.42);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;animation:gyh-rename-fade-in 160ms ease;}.gyh-rename-modal{width:min(960px,calc(100vw - 32px));max-height:min(640px,calc(100vh - 32px));overflow:hidden;color:#17233a;background:#ffffff;border:1px solid rgba(213,225,241,0.96);border-radius:16px;box-shadow:0 24px 70px rgba(19,44,82,0.28),0 4px 14px rgba(19,44,82,0.12);display:flex;flex-direction:column;animation:gyh-rename-rise-in 180ms ease;}.gyh-rename-header{padding:10px;border-bottom:1px solid #edf1f7;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;}.gyh-rename-heading{display:flex;align-items:center;gap:11px;min-width:0;}.gyh-rename-heading-icon{width:36px;height:36px;flex:0 0 auto;color:#2877de;background:#e8f2ff;border-radius:10px;display:grid;place-items:center;}.gyh-rename-heading-icon svg{width:19px;height:19px;}.gyh-rename-title{margin:0;font-size:16px;font-weight:700;line-height:22px;}.gyh-rename-subtitle{margin:2px 0 0;color:#8491a5;font-size:12px;line-height:17px;}.gyh-rename-close{width:30px;height:30px;flex:0 0 auto;padding:0;color:#8491a5;background:transparent;border:0;border-radius:7px;cursor:pointer;display:grid;place-items:center;transition:background 160ms ease,color 160ms ease;}.gyh-rename-close:hover{color:#263b5d;background:#f3f6fa;}.gyh-rename-close svg{width:17px;height:17px;}.gyh-rename-body{min-height:0;padding:10px;overflow-y:auto;}.gyh-rename-section{margin-top:12px;padding:10px;border:1px solid #e7edf6;border-radius:10px;}.gyh-rename-section:first-of-type{margin-top:0;}.gyh-rename-section-head{min-height:22px;margin-bottom:5px;display:flex;align-items:center;justify-content:space-between;gap:12px;}.gyh-rename-section-title{margin:0;color:#263b5d;font-size:13px;font-weight:700;line-height:20px;}.gyh-rename-section-hint{color:#8491a5;font-size:11px;line-height:17px;}.gyh-rename-modes{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px;}.gyh-rename-mode{min-height:34px;padding:5px 7px;color:#5e6f87;background:#f7f9fc;border:1px solid transparent;border-radius:6px;cursor:pointer;font-size:12px;line-height:16px;white-space:nowrap;transition:background 160ms ease,border-color 160ms ease,color 160ms ease;}.gyh-rename-mode:hover{color:#2961d9;background:#f1f6ff;}.gyh-rename-mode.is-active{color:#2961d9;background:#edf5ff;border-color:#c9defa;font-weight:650;}.gyh-rename-mode:disabled{color:#a6b1c1;background:#f4f6f9;border-color:transparent;cursor:not-allowed;opacity:0.72;}.gyh-rename-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}.gyh-rename-field{min-width:0;position:relative;}.gyh-rename-field-label{position:absolute;top:-7px;left:9px;padding:0 4px;color:#8491a5;background:#ffffff;font-size:10px;line-height:14px;}.gyh-rename-input{width:100%;height:36px;padding:8px 10px;color:#263b5d;background:#ffffff;border:1px solid #dfe7f1;border-radius:7px;outline:0;font:inherit;font-size:12px;transition:border-color 160ms ease,box-shadow 160ms ease;}.gyh-rename-input:focus{border-color:#77a9ed;box-shadow:0 0 0 3px rgba(45,130,245,0.12);}.gyh-rename-input:disabled{color:#9aa6b7;background:#f5f7fa;border-color:#e4eaf2;cursor:not-allowed;}.gyh-rename-preview{overflow:hidden;border:1px solid #e7edf6;border-radius:9px;}.gyh-rename-preview-body{max-height:180px;overflow-x:hidden;}.gyh-rename-preview-head,.gyh-rename-row{display:grid;grid-template-columns:minmax(0,1fr) 24px minmax(0,1fr) 44px;align-items:center;gap:8px;}.gyh-rename-preview-head{padding:6px 10px;color:#8491a5;background:#f8faff;font-size:10px;line-height:14px;}.gyh-rename-preview-head span:nth-child(3){color:#6f8fbd;}.gyh-rename-row{min-height:36px;padding:4px 10px;border-top:1px solid #eef2f7;font-size:11px;line-height:16px;}.gyh-rename-row-index{color:#8491a5;font-variant-numeric:tabular-nums;}.gyh-rename-row-name{min-width:0;overflow:hidden;color:#5e6f87;text-overflow:ellipsis;white-space:nowrap;}.gyh-rename-row-name.is-new{color:#2961d9;font-weight:600;}.gyh-rename-row-arrow{color:#a7b5c8;font-size:15px;text-align:center;}.gyh-rename-row-status{padding:2px 5px;color:#8491a5;background:#f4f6f9;border-radius:4px;font-size:10px;line-height:14px;text-align:center;white-space:nowrap;}.gyh-rename-row.is-processing .gyh-rename-row-status{color:#2961d9;background:#edf5ff;}.gyh-rename-row.is-success .gyh-rename-row-status{color:#27895f;background:#eaf8f1;}.gyh-rename-row.is-failed .gyh-rename-row-status{color:#d64545;background:#fff0f0;}.gyh-rename-row.is-processing{background:#f8faff;}.gyh-rename-row.is-success .gyh-rename-row-name.is-new{color:#27895f;}.gyh-rename-row.is-failed .gyh-rename-row-name.is-new{color:#d64545;}.gyh-rename-footer{padding:12px 20px;border-top:1px solid #edf1f7;display:flex;align-items:center;justify-content:space-between;gap:12px;}.gyh-rename-footer-note{color:#8491a5;font-size:11px;line-height:17px;}.gyh-rename-footer-actions{display:flex;align-items:center;gap:7px;}.gyh-rename-btn{min-width:70px;height:32px;padding:5px 12px;color:#66758c;background:#ffffff;border:1px solid #dce5f0;border-radius:7px;cursor:pointer;font:inherit;font-size:12px;line-height:20px;}.gyh-rename-btn-primary{color:#ffffff;background:#2961d9;border-color:#2961d9;cursor:not-allowed;opacity:0.58;}.gyh-rename-btn-primary:not(:disabled){cursor:pointer;opacity:1;}.gyh-rename-btn:hover:not(:disabled){color:#2961d9;border-color:#a9c9f4;background:#f6f9ff;}.gyh-rename-video-filter{color:#60718b;cursor:pointer;font-size:11px;line-height:17px;display:inline-flex;align-items:center;gap:5px;user-select:none;}.gyh-rename-video-filter input{width:13px;height:13px;margin:0;accent-color:#2961d9;cursor:pointer;}.gyh-toast{position:fixed;top:50%;left:50%;z-index:2147483003;width:max-content;max-width:calc(100vw - 32px);padding:9px 14px;color:#31445f;background:rgba(244,247,252,0.96);border:1px solid #dbe4f0;border-radius:8px;box-shadow:none;display:flex;align-items:center;gap:9px;font-size:13px;line-height:20px;pointer-events:none;backdrop-filter:blur(10px);transform:translate(-50%,-46%) scale(0.98);opacity:0;animation:gyh-toast-in 160ms ease forwards;}.gyh-toast-icon{width:20px;height:20px;flex:0 0 auto;color:#3f6ea8;background:transparent;border-radius:0;display:grid;place-items:center;}.gyh-toast-icon svg{width:18px;height:18px;}.gyh-toast-message{overflow:hidden;color:#31445f;font-size:13px;font-weight:500;line-height:20px;text-overflow:ellipsis;white-space:nowrap;}.gyh-toast.is-error{background:#fff3ee;border-color:#ffccbc;box-shadow:none;}.gyh-toast.is-error .gyh-toast-icon{color:#ff8a65;background:transparent;}.gyh-toast.is-error .gyh-toast-message{color:#b85c40;}.gyh-toast.is-success{background:rgba(239,249,243,0.97);border-color:#ccebd9;box-shadow:none;}.gyh-toast.is-success .gyh-toast-icon{color:#2f9c72;background:transparent;}.gyh-toast.is-success .gyh-toast-message{color:#276747;}@keyframes gyh-toast-in{to{opacity:1;transform:translate(-50%,-50%) scale(1);}}@keyframes gyh-toast-out{to{opacity:0;transform:translate(-50%,-55%) scale(0.96);}}@keyframes gyh-rename-fade-in{from{opacity:0;}to{opacity:1;}}@keyframes gyh-rename-rise-in{from{opacity:0;transform:translateY(8px) scale(0.985);}to{opacity:1;transform:translateY(0) scale(1);}}@media (max-width:640px){#${ROOT_ID}{right:14px;}.gyh-trigger{width:48px;height:48px;border-radius:14px;}.gyh-panel{right:58px;width:min(264px,calc(100vw - 86px));}.gyh-rename-overlay{padding:8px;}.gyh-rename-modal{width:calc(100vw - 16px);max-height:calc(100vh - 16px);}.gyh-rename-header,.gyh-rename-body,.gyh-rename-footer{padding-left:10px;padding-right:10px;}.gyh-rename-modes{grid-template-columns:repeat(2,minmax(0,1fr));}.gyh-rename-fields{grid-template-columns:1fr;}.gyh-rename-footer{align-items:stretch;flex-direction:column;}.gyh-rename-footer-actions{justify-content:flex-end;}}#${ROOT_ID} .gyh-trigger-label{font-size:11px;}#${ROOT_ID} .gyh-panel-header{display:block;}#${ROOT_ID} .gyh-panel-title-row{display:flex;align-items:center;justify-content:space-between;gap:12px;}#${ROOT_ID} .gyh-subtitle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;}#${ROOT_ID} .gyh-author{color:#9aa8ba;font-size:10px;white-space:nowrap;}#${ROOT_ID} .gyh-action:nth-child(4) .gyh-action-icon{color:#168476;background:#e7f7f3;}#${ROOT_ID} .gyh-submenu-heading{display:flex;align-items:center;gap:7px;min-width:0;}#${ROOT_ID} .gyh-submenu-back{width:24px;height:24px;flex:0 0 auto;padding:0;color:#5b86c6;background:#f1f6ff;border:1px solid #dce7f6;border-radius:6px;cursor:pointer;display:grid;place-items:center;}#${ROOT_ID} .gyh-submenu-back:hover{color:#2961d9;background:#e7f1ff;border-color:#c9defa;}#${ROOT_ID} .gyh-submenu-back svg{width:15px;height:15px;}#${ROOT_ID} .gyh-transfer-panel .gyh-action:nth-child(1) .gyh-action-icon{color:#168476;background:#e7f7f3;}#${ROOT_ID} .gyh-transfer-panel .gyh-action:nth-child(2) .gyh-action-icon{color:#9c5cab;background:#f6ebf8;}.gyh-movie-organizer-modal .gyh-rename-heading-icon{color:#2877de;background:#e8f2ff;}.gyh-tv-organizer-modal .gyh-rename-heading-icon{color:#8a63cc;background:#f2ecff;}.gyh-batch-rename-modal .gyh-rename-heading-icon{color:#de7a34;background:#fff1e8;}`;
  const movieStyles = `.gyh-movie-modal{width:min(960px,calc(100vw - 32px));max-height:min(680px,calc(100vh - 32px))}.gyh-movie-key-modal{width:min(500px,calc(100vw - 32px));max-height:min(440px,calc(100vh - 32px))}.gyh-movie-key-note{padding:10px 12px;color:#536985;background:#f5f8fd;border:1px solid #e2eaf4;border-radius:8px;font-size:12px;line-height:18px}.gyh-movie-key-note strong{color:#263b5d}.gyh-movie-key-input{letter-spacing:.3px}.gyh-movie-key-status{min-height:15px;margin-top:5px;color:#8491a5;font-size:11px;line-height:15px}.gyh-movie-key-status.is-error{color:#b85c40}.gyh-movie-key-status.is-success{color:#8491a5}.gyh-movie-correct-count{color:#27895f}.gyh-movie-scope{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.gyh-movie-scope-item{min-width:0;padding:6px 9px;background:#f8faff;border:1px solid #e5edf8;border-radius:8px;display:flex;align-items:center;gap:7px}.gyh-movie-scope-label{display:inline;color:#8491a5;font-size:10px;line-height:16px;white-space:nowrap}.gyh-movie-scope-value{display:block;margin-top:0;min-width:0;color:#263b5d;font-size:12px;font-weight:650;line-height:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gyh-movie-rule-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.gyh-movie-rule-list{display:flex;flex-wrap:wrap;gap:5px}.gyh-movie-rule-options{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}.gyh-movie-rule-token{height:26px;padding:0 6px;color:#2961d9;background:#edf5ff;border:1px solid #c9defa;border-radius:6px;display:inline-flex;align-items:center;gap:4px;font-size:11px;line-height:16px;cursor:grab;user-select:none;transition:background .15s,border-color .15s,opacity .15s,transform .15s}.gyh-movie-rule-token:active{cursor:grabbing}.gyh-movie-rule-token.is-dragging{opacity:.45;transform:scale(.98)}.gyh-movie-rule-token.is-drag-over{background:#dcecff;border-color:#8db8ee}.gyh-movie-rule-grip{width:12px;height:16px;color:#78a0d1;display:grid;place-items:center;pointer-events:none}.gyh-movie-rule-grip svg{width:11px;height:15px}.gyh-movie-rule-tool{width:18px;height:18px;margin-right:-3px;padding:0;color:#5b86c6;background:transparent;border:0;border-radius:4px;cursor:pointer;display:grid;place-items:center}.gyh-movie-rule-tool:hover{color:#2961d9;background:#dcecff}.gyh-movie-rule-tool:disabled{color:#aac2e0;background:transparent;cursor:not-allowed}.gyh-movie-rule-tool svg{width:12px;height:12px}.gyh-movie-rule-option{height:24px;padding:3px 8px;color:#60718b;background:#f7f9fc;border:1px solid #e3eaf3;border-radius:6px;cursor:pointer;font:inherit;font-size:11px;line-height:16px}.gyh-movie-rule-option:hover{color:#2961d9;background:#f1f6ff;border-color:#c9defa}.gyh-movie-rule-option.is-selected{color:#a5b0bf;background:#f4f6f9;border-color:#edf0f4;cursor:not-allowed}.gyh-movie-rule-preview{display:block;min-height:17px;margin-top:8px;overflow:hidden;color:#6f8fbd;font-size:11px;line-height:17px;text-overflow:ellipsis;white-space:nowrap}.gyh-movie-preview-head,.gyh-movie-preview-row{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) 76px;align-items:center;gap:8px}.gyh-movie-preview{overflow:hidden;border:1px solid #e7edf6;border-radius:9px}.gyh-movie-preview-head{padding:6px 10px;color:#8491a5;background:#f8faff;font-size:10px;line-height:14px}.gyh-movie-preview-body{max-height:220px}.gyh-movie-preview-row{min-height:38px;padding:5px 10px;border-top:1px solid #eef2f7;font-size:11px;line-height:16px}.gyh-movie-preview-name{min-width:0;overflow:hidden;color:#5e6f87;text-overflow:ellipsis;white-space:nowrap}.gyh-movie-preview-match{min-width:0;overflow:hidden;color:#8491a5;text-overflow:ellipsis;white-space:nowrap}.gyh-movie-preview-status{padding:2px 5px;color:#8491a5;background:#f4f6f9;border-radius:4px;font-size:10px;line-height:14px;text-align:center;white-space:nowrap}.gyh-movie-footer-note{flex:1;min-width:0;overflow:hidden;color:#8491a5;font-size:11px;line-height:17px;text-overflow:ellipsis;white-space:nowrap}.gyh-count-success{color:#27895f;font-weight:400}.gyh-count-failed{color:#d64545;font-weight:400}.gyh-movie-modal [data-tmdb-settings]{height:28px;padding:5px 10px}@media (max-width:640px){.gyh-movie-modal{width:calc(100vw - 16px);max-height:calc(100vh - 16px)}.gyh-movie-key-modal{width:calc(100vw - 16px);max-height:calc(100vh - 16px)}.gyh-movie-scope{grid-template-columns:1fr}.gyh-movie-preview-head,.gyh-movie-preview-row{grid-template-columns:minmax(0,1fr) 80px}}`;
  const movieFolderModeStyles = `.gyh-movie-folder-mode{height:28px;margin-top:8px;width:100%;display:flex;align-items:center}.gyh-movie-folder-mode-options{width:100%;min-width:0;margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.gyh-movie-folder-option{height:28px;min-width:0;padding:4px 9px;color:#60718b;background:#f8faff;border:1px solid #dce6f1;border-radius:5px;cursor:pointer;display:grid;grid-template-columns:12px minmax(0,1fr) auto;align-items:center;gap:5px;font-size:11px;line-height:16px;white-space:nowrap;transition:background .15s,border-color .15s,color .15s}.gyh-movie-folder-option:hover{color:#2961d9;background:#f1f6ff;border-color:#bdd8f7}.gyh-movie-folder-option.is-selected{color:#2961d9;background:#edf5ff;border-color:#8db8ee}.gyh-movie-folder-option input{width:12px;height:12px;margin:0;accent-color:#2961d9}.gyh-movie-folder-option-text{min-width:0;overflow:hidden;font-size:11px;font-weight:600;line-height:16px;text-overflow:ellipsis}.gyh-movie-folder-option-note{min-width:0;overflow:hidden;color:#8a98ab;font-size:10px;font-weight:400;line-height:14px;text-align:right;text-overflow:ellipsis}.gyh-movie-folder-option.is-selected .gyh-movie-folder-option-note{color:#6f8fbd}@media(max-width:640px){.gyh-movie-folder-mode{height:auto}.gyh-movie-folder-mode-options{grid-template-columns:1fr;gap:4px}.gyh-movie-folder-option{height:28px}}`;
  const movieCorrectionStyles = `.gyh-movie-preview-correct{width:35px;height:22px;padding:0;color:#5b86c6;background:#f7faff;border:1px solid #dce7f6;border-radius:5px;cursor:pointer;font:inherit;font-size:10px;line-height:14px;white-space:nowrap}.gyh-movie-preview-correct:hover{color:#2961d9;background:#edf5ff;border-color:#c9defa}.gyh-movie-preview-body.is-organizing .gyh-movie-preview-correct{display:none}.gyh-movie-preview-body.is-organizing .gyh-movie-preview-match{grid-column:span 2}.gyh-movie-correct-modal{width:min(430px,calc(100vw - 32px))}.gyh-movie-correct-modal .gyh-rename-body{overflow:hidden}.gyh-movie-correct-results{max-height:138px;margin-top:8px;padding-right:12px;overflow-y:scroll;scrollbar-gutter:stable;display:grid;gap:5px}.gyh-movie-correct-results::-webkit-scrollbar{width:8px}.gyh-movie-correct-results::-webkit-scrollbar-track{background:#f1f5fa;border-radius:8px}.gyh-movie-correct-results::-webkit-scrollbar-thumb{background:#c3d2e4;border:2px solid #f1f5fa;border-radius:8px;background-clip:padding-box}.gyh-movie-correct-option{width:100%;min-height:42px;padding:5px 8px;color:#536985;background:#f8faff;border:1px solid #e2eaf4;border-radius:7px;cursor:pointer;font:inherit;text-align:left;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px}.gyh-movie-correct-option:hover{background:#f1f6ff;border-color:#c9defa}.gyh-movie-correct-option.is-selected{color:#2961d9;background:#edf5ff;border-color:#8db8ee}.gyh-movie-correct-option-main{min-width:0;display:grid;gap:1px}.gyh-movie-correct-option-title{display:block;overflow:hidden;color:inherit;font-size:12px;font-weight:650;line-height:15px;text-overflow:ellipsis;white-space:nowrap}.gyh-movie-correct-option-original{display:block;overflow:hidden;color:#8491a5;font-size:10px;line-height:13px;text-overflow:ellipsis;white-space:nowrap}.gyh-movie-correct-option-year{padding:2px 5px;color:#6f8fbd;background:#ffffff;border:1px solid #dce7f6;border-radius:4px;font-size:10px;line-height:14px;white-space:nowrap}.gyh-movie-correct-option.is-selected .gyh-movie-correct-option-year{color:#2961d9;border-color:#b8d3f5}`;
  const tvStyles = `.gyh-tv-preview-target{width:100%;padding:0;color:#2961d9;background:transparent;border:0;cursor:pointer;font:inherit;text-align:left}.gyh-tv-preview-target:hover{color:#1f55c5;text-decoration:underline}.gyh-tv-preview-target:disabled{color:#8491a5;cursor:default;text-decoration:none}.gyh-movie-preview-body.is-organizing .gyh-tv-preview-target{grid-column:span 2}`;
  const rapidTransferStyles = `.gyh-rapid-import-modal,.gyh-rapid-export-modal{width:min(720px,calc(100vw - 32px));max-height:min(660px,calc(100vh - 32px))}.gyh-rapid-import-modal .gyh-rename-heading-icon{color:#168476;background:#e7f7f3}.gyh-rapid-export-modal .gyh-rename-heading-icon,.gyh-rapid-export-progress-modal .gyh-rename-heading-icon{color:#9c5cab;background:#f6ebf8}.gyh-rapid-import-file-row{height:15px;min-height:15px;margin-bottom:5px;display:flex;align-items:center;gap:8px}.gyh-rapid-import-tools{display:flex;align-items:center;gap:6px}.gyh-rapid-import-file-button{height:28px;min-width:0;padding:4px 10px;line-height:18px;display:inline-flex;align-items:center;gap:5px}.gyh-rapid-import-file-button svg{width:14px;height:14px}.gyh-rapid-import-file-button.is-disabled,.gyh-rapid-import-clear:disabled{color:#a6b1c1;background:#f4f6f9;border-color:#e4eaf2;cursor:not-allowed;pointer-events:none}.gyh-rapid-import-file-input{display:none}.gyh-rapid-import-file-name{min-width:0;overflow:hidden;color:#8491a5;font-size:11px;line-height:15px;text-overflow:ellipsis;white-space:nowrap}.gyh-rapid-import-editor,.gyh-rapid-export-code{height:300px;overflow:hidden;border:1px solid #dfe7f1;border-radius:8px}.gyh-rapid-import-editor:focus-within{border-color:#77a9ed;box-shadow:0 0 0 3px rgba(45,130,245,.12)}.gyh-rapid-import-editor .ace_scrollbar::-webkit-scrollbar,.gyh-rapid-export-code .ace_scrollbar::-webkit-scrollbar{width:8px;height:8px}.gyh-rapid-import-editor .ace_scrollbar::-webkit-scrollbar-track,.gyh-rapid-export-code .ace_scrollbar::-webkit-scrollbar-track{background:transparent}.gyh-rapid-import-editor .ace_scrollbar::-webkit-scrollbar-thumb,.gyh-rapid-export-code .ace_scrollbar::-webkit-scrollbar-thumb{background:#c3d2e4;border:2px solid transparent;border-radius:8px;background-clip:padding-box}.gyh-rapid-import-editor .ace_scrollbar::-webkit-scrollbar-thumb:hover,.gyh-rapid-export-code .ace_scrollbar::-webkit-scrollbar-thumb:hover{background:#9fb8d5;border:2px solid transparent;background-clip:padding-box}.gyh-rapid-import-fallback,.gyh-rapid-export-fallback{width:100%;height:100%;padding:10px;color:#263b5d;background:#fafcff;border:0;outline:0;resize:none;font:12px/18px ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}.gyh-rapid-import-modal .ace_editor,.gyh-rapid-export-modal .ace_editor{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace!important;font-size:12px!important;line-height:18px!important}.gyh-rapid-import-progress{overflow:hidden;border:1px solid #e7edf6;border-radius:9px}.gyh-rapid-import-progress-head,.gyh-rapid-import-progress-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr) 44px;align-items:center;gap:8px}.gyh-rapid-import-progress-head{padding:6px 10px;color:#8491a5;background:#f8faff;font-size:10px;line-height:14px}.gyh-rapid-import-progress-head span:nth-child(2){color:#6f8fbd}.gyh-rapid-import-progress-body{max-height:300px;overflow-x:hidden}.gyh-rapid-import-progress-row{grid-template-columns:minmax(0,1fr) minmax(0,1.3fr) 44px}.gyh-rapid-import-progress-directory,.gyh-rapid-import-progress-file{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gyh-rapid-import-progress-directory{color:#5e6f87}.gyh-rapid-import-progress-file{color:#2961d9;font-weight:600}.gyh-rapid-import-progress-row.is-success .gyh-rapid-import-progress-file{color:#27895f}.gyh-rapid-import-progress-row.is-failed .gyh-rapid-import-progress-file{color:#d64545}.gyh-rapid-export-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.gyh-rapid-export-summary-item{min-width:0;padding:7px 9px;background:#f8faff;border:1px solid #e5edf8;border-radius:8px}.gyh-rapid-export-summary-label{display:block;color:#8491a5;font-size:10px;line-height:15px}.gyh-rapid-export-summary-value{display:block;overflow:hidden;color:#263b5d;font-size:12px;font-weight:650;line-height:17px;text-overflow:ellipsis;white-space:nowrap}.gyh-rapid-export-note{color:#8491a5;font-size:11px;line-height:17px}.gyh-rapid-export-progress-modal{width:min(390px,calc(100vw - 32px));max-height:min(340px,calc(100vh - 32px))}.gyh-rapid-export-progress-main{padding:26px 14px 24px;text-align:center}.gyh-rapid-export-spinner{width:42px;height:42px;margin:0 auto 15px;border:3px solid #eee2f2;border-top-color:#9c5cab;border-radius:50%;display:block;animation:gyh-rapid-export-spin .8s linear infinite}.gyh-rapid-export-progress-title{margin:0;color:#263b5d;font-size:14px;font-weight:700;line-height:21px}.gyh-rapid-export-progress-text{min-height:18px;margin:5px 0 0;color:#6f8fbd;font-size:12px;line-height:18px}.gyh-rapid-export-progress-count{min-height:16px;margin:3px 0 0;color:#8491a5;font-size:11px;line-height:16px}.gyh-rapid-export-progress-modal .gyh-rename-footer{justify-content:center;padding:9px 14px}.gyh-rapid-export-progress-note{color:#8491a5;font-size:11px;line-height:17px}@keyframes gyh-rapid-export-spin{to{transform:rotate(360deg)}}@media(max-width:640px){.gyh-rapid-import-progress-head,.gyh-rapid-import-progress-row{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 44px}.gyh-rapid-export-summary{grid-template-columns:1fr}}`;
  const searchStyles = `.gyh-search-modal{width:min(960px,calc(100vw - 32px));max-height:min(680px,calc(100vh - 32px))}#${ROOT_ID} .gyh-action[data-action="search"] .gyh-action-icon{color:#16a34a;background:#e8f7ee}.gyh-search-bar{display:flex;align-items:center;gap:7px}.gyh-search-input{height:36px}.gyh-search-btn{height:36px;min-width:78px;color:#ffffff;background:#2961d9;border-color:#2961d9}.gyh-search-btn:hover:not(:disabled){color:#ffffff;background:#1f55c5;border-color:#1f55c5}.gyh-search-btn:disabled{color:#a6b1c1;background:#f4f6f9;border-color:#e4eaf2;cursor:not-allowed}.gyh-search-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.gyh-search-tabs[hidden]{display:none}.gyh-search-tab{height:26px;padding:3px 11px;color:#60718b;background:#f7f9fc;border:1px solid #e3eaf3;border-radius:13px;cursor:pointer;font:inherit;font-size:11px;line-height:18px;white-space:nowrap;transition:background .15s,border-color .15s,color .15s}.gyh-search-tab:hover{color:#2961d9;background:#f1f6ff;border-color:#c9defa}.gyh-search-tab.is-active{color:#ffffff;font-weight:650}.gyh-search-results{margin-top:10px;min-height:190px;max-height:52vh;display:grid;gap:7px;align-content:start;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#b7c8de transparent}.gyh-search-results::-webkit-scrollbar{width:8px}.gyh-search-results::-webkit-scrollbar-track{background:transparent}.gyh-search-results::-webkit-scrollbar-thumb{background:#c3d2e4;border:2px solid transparent;border-radius:8px;background-clip:padding-box}.gyh-search-empty{padding:48px 20px;color:#8491a5;text-align:center;font-size:12px;line-height:20px}.gyh-search-empty span{font-size:11px}.gyh-search-card{padding:10px 12px;border:1px solid #e7edf6;border-radius:9px;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;cursor:pointer;transition:border-color .15s,box-shadow .15s}.gyh-search-card:hover{border-color:#9dc0f2;box-shadow:0 2px 8px rgba(45,130,245,.12)}.gyh-search-card-main{min-width:0;flex:1}.gyh-search-card-title{margin-bottom:5px;color:#263b5d;font-size:13px;font-weight:650;line-height:18px;word-break: break-word;}.gyh-search-card-meta{display:flex;flex-wrap:wrap;align-items:center;gap:7px;color:#8491a5;font-size:11px;line-height:16px}.gyh-search-source{padding:1px 7px;color:#2961d9;background:#edf5ff;border-radius:4px}.gyh-search-password{color:#d64545}.gyh-search-card-actions{display:flex;flex:0 0 auto;gap:6px}.gyh-search-card-btn{height:26px;padding:3px 11px;color:#60718b;background:#ffffff;border:1px solid #dce5f0;border-radius:6px;cursor:pointer;font:inherit;font-size:11px;line-height:18px;white-space:nowrap;transition:color .15s,border-color .15s,background .15s}.gyh-search-card-btn:hover{color:#2961d9;border-color:#a9c9f4;background:#f6f9ff}.gyh-search-card-btn.is-copied{color:#27895f;border-color:#a8ddc2;background:#eaf8f1}.gyh-search-card-btn.is-cloud{color:#2961d9;border-color:#c9defa;background:#edf5ff}@media(max-width:640px){.gyh-search-card{flex-direction:column}.gyh-search-card-actions{width:100%;justify-content:flex-end}}`;
  const componentStyles = `.gyh-organizer-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 35px 44px}.gyh-organizer-grid-head span:nth-child(2){grid-column:span 2}.gyh-movie-scope-item{height:34px}.gyh-movie-scope-value{margin-left:auto;text-align:right}.gyh-movie-modal [data-tmdb-settings]{line-height:16px}.gyh-preview-two-column{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.gyh-preview-single-column{grid-template-columns:1fr}.gyh-preview-compact{max-height:160px}.gyh-movie-key-field{display:block;margin-top:12px}.gyh-rule-section-head{justify-content:flex-start;gap:10px}.gyh-rule-section-head .gyh-movie-rule-head{flex:1;min-width:0;justify-content:flex-start}.gyh-rule-section-head .gyh-movie-rule-preview{min-width:0;margin-top:0;flex:1;text-align:left}.gyh-rename-body,.gyh-rename-preview-body,.gyh-movie-preview-body,.gyh-rapid-import-progress-body{overflow-y:auto;scrollbar-width:thin;scrollbar-color:#b7c8de transparent}.gyh-rename-body::-webkit-scrollbar,.gyh-rename-preview-body::-webkit-scrollbar,.gyh-movie-preview-body::-webkit-scrollbar,.gyh-rapid-import-progress-body::-webkit-scrollbar{width:8px}.gyh-rename-body::-webkit-scrollbar-track,.gyh-rename-preview-body::-webkit-scrollbar-track,.gyh-movie-preview-body::-webkit-scrollbar-track,.gyh-rapid-import-progress-body::-webkit-scrollbar-track{background:transparent}.gyh-rename-body::-webkit-scrollbar-thumb,.gyh-rename-preview-body::-webkit-scrollbar-thumb,.gyh-movie-preview-body::-webkit-scrollbar-thumb,.gyh-rapid-import-progress-body::-webkit-scrollbar-thumb{background:#c3d2e4;border:2px solid transparent;border-radius:8px;background-clip:padding-box}.gyh-rename-body::-webkit-scrollbar-thumb:hover,.gyh-rename-preview-body::-webkit-scrollbar-thumb:hover,.gyh-movie-preview-body::-webkit-scrollbar-thumb:hover,.gyh-rapid-import-progress-body::-webkit-scrollbar-thumb:hover{background:#9fb8d5;border:2px solid transparent;background-clip:padding-box}.gyh-toast.is-leaving{animation:gyh-toast-out 180ms ease forwards}.gyh-overlay-elevated{z-index:2147483002}.gyh-fields-two-column{grid-template-columns:repeat(2,minmax(0,1fr))}.gyh-is-hidden{display:none!important}.gyh-copy-buffer{position:fixed;opacity:0;pointer-events:none}.gyh-editor-readonly .ace_cursor{opacity:0!important}`;

  // 注入组件样式
  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const allStyles = styles + movieStyles + movieFolderModeStyles + movieCorrectionStyles + tvStyles + rapidTransferStyles + searchStyles + componentStyles;
    if (typeof GM_addStyle === 'function') {
      const style = GM_addStyle(allStyles);
      if (style) style.id = STYLE_ID;
      return;
    }
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = allStyles;
    document.head.appendChild(style);
  }
  const renameModes = [
    { key: 'replace', label: '查找替换', fields: [['查找内容', '输入要替换的文字'], ['替换为', '输入新的文字'], ['匹配选项', '忽略大小写']], prepare: values => values[0] && values[2].includes('忽略') ? new RegExp(escapeRegExp(values[0]), 'gi') : null, apply: ({ file, values, prepared }) => !values[0] ? file.name : prepared ? file.name.replace(prepared, values[1]) : file.name.split(values[0]).join(values[1]) },
    { key: 'sequence', label: '按序号', fields: [['前缀', '例如：第'], ['起始编号', '例如：01'], ['后缀', '例如：集']], prepare: values => ({ start: Number.parseInt(values[1], 10) || 1, width: values[1].length }), apply: ({ index, values, extension, prepared }) => `${values[0]}${String(prepared.start + index).padStart(prepared.width, '0')}${values[2]}${extension}` },
    { key: 'append', label: '追加', fields: [['前缀', '追加到文件名前'], ['后缀', '追加到文件名后'], ['扩展名', '保留原扩展名']], apply: ({ values, baseName, extension }) => `${values[0]}${baseName}${values[1]}${extension}` },
    { key: 'regex', label: '正则替换', fields: [['正则表达式', '例如：\\s+'], ['替换为', '输入替换内容'], ['匹配选项', '全局匹配']], prepare: values => values[0] ? new RegExp(values[0], 'g') : null, apply: ({ file, values, prepared }) => prepared ? file.name.replace(prepared, values[1]) : file.name },
    { key: 'format', label: '格式替换', fields: [['新格式名', '例如：mp4'], ['命名规则', '保留原文件名'], ['预览方式', '仅修改扩展名']], apply: ({ file, values, baseName }) => values[0] ? `${baseName}.${values[0].replace(/^\./, '')}` : file.name },
    { key: 'swap', label: '前后置换', fields: [['分隔符', '例如：-'], ['无需设置', '', true], ['无需设置', '', true]], apply: ({ values, baseName, extension }) => { const separator = values[0]; const boundary = separator ? baseName.indexOf(separator) : -1; return boundary < 0 ? `${baseName}${extension}` : `${baseName.slice(boundary + separator.length)}${separator}${baseName.slice(0, boundary)}${extension}`; } },
  ];
  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  // 显示居中的状态提示
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `gyh-toast${type === 'error' ? ' is-error' : type === 'success' ? ' is-success' : ''}`;
    const icon = ICONS[type] || ICONS.info;
    toast.innerHTML = `<span class="gyh-toast-icon" aria-hidden="true">${icon}</span><span class="gyh-toast-message">${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    window.setTimeout(() => {
      toast.classList.add('is-leaving');
      window.setTimeout(() => toast.remove(), 180);
    }, 2200);
  }
  // 按需加载 Ace 编辑器
  function loadAceEditor() {
    if (typeof ace !== 'undefined' && typeof ace.edit === 'function') return Promise.resolve(true);
    if (aceLoadPromise) return aceLoadPromise;
    const loadScript = url => new Promise(resolve => {
      GM_xmlhttpRequest({ method: 'GET', url, onload(response) { try { if (response.status < 200 || response.status >= 300) return resolve(false); (0, eval)(response.responseText); resolve(true); } catch (error) { resolve(false); } }, onerror() { resolve(false); }, ontimeout() { resolve(false); } });
    });
    aceLoadPromise = (async () => {
      if (!await loadScript(ACE_CORE_URL)) return false;
      ace.config.set('basePath', ACE_BASE_URL);
      ace.config.set('modePath', ACE_BASE_URL);
      ace.config.set('themePath', ACE_BASE_URL);
      ace.config.set('workerPath', ACE_BASE_URL);
      await loadScript(ACE_TOOLS_URL);
      await loadScript(ACE_MODE_JSON_URL);
      await loadScript(ACE_THEME_TOMORROW_URL);
      return typeof ace !== 'undefined' && typeof ace.edit === 'function';
    })();
    return aceLoadPromise;
  }
  // 创建 JSON 编辑器或降级输入框
  function createJsonEditor(host, options = {}) {
    if (typeof ace !== 'undefined' && typeof ace.edit === 'function') {
      const editor = ace.edit(host);
      editor.setTheme('ace/theme/tomorrow');
      editor.session.setMode('ace/mode/json');
      editor.setOptions({ fontSize: '12px', showPrintMargin: false, highlightActiveLine: false, showGutter: true, enableBasicAutocompletion: options.autocomplete === true, enableLiveAutocompletion: false });
      editor.session.setUseWrapMode(true);
      editor.session.setUseWorker(false);
      if (options.value !== undefined) editor.setValue(options.value, -1);
      if (options.readOnly) { editor.setReadOnly(true); host.classList.add('gyh-editor-readonly'); }
      return { getValue: () => editor.getValue(), setValue: value => editor.setValue(value, -1), focus: () => editor.focus(), resize: () => editor.resize() };
    }
    const input = document.createElement('textarea');
    input.className = options.fallbackClass || 'gyh-rapid-import-fallback';
    input.placeholder = options.placeholder || '';
    input.value = options.value || '';
    input.readOnly = options.readOnly === true;
    host.appendChild(input);
    return { getValue: () => input.value, setValue: value => { input.value = value; }, focus: () => input.focus(), resize: () => {} };
  }
  // 等待指定时长
  function delay(milliseconds) {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
  }
  function getStoredValue(key, fallback) {
    try {
      if (typeof GM_getValue === 'function') return GM_getValue(key, fallback);
      const value = localStorage.getItem(key);
      if (value == null) return fallback;
      return typeof fallback === 'string' ? value : JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }
  function setStoredValue(key, value) {
    if (typeof GM_setValue === 'function') return GM_setValue(key, value);
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  }
  // 输出受调试开关控制的日志
  function debugLog(...args) {
    if (DEBUG) console.log('[GuangyaHelper]', ...args);
  }
  // 注册可即时切换的油猴调试菜单
  function registerDebugMenu() {
    if (typeof GM_registerMenuCommand !== 'function') return;
    if (debugMenuCommandId !== null) {
      if (debugMenuCommandId == null || typeof GM_unregisterMenuCommand !== 'function') return;
      try {
        GM_unregisterMenuCommand(debugMenuCommandId);
        debugMenuCommandId = null;
      } catch (error) {
        return;
      }
    }
    const label = DEBUG ? '关闭调试' : '开启调试';
    debugMenuCommandId = GM_registerMenuCommand(label, () => {
      DEBUG = !DEBUG;
      setStoredValue(DEBUG_STORAGE, DEBUG);
      registerDebugMenu();
      debugLog(`调试已切换为 ${DEBUG}`);
    });
  }
  function readJsonResponse(response) {
    if (response.response) return response.response;
    try { return JSON.parse(response.responseText); } catch (error) { return null; }
  }
  function requestJson({ method = 'GET', url, headers = {}, body, timeout = 0, emptyObject = false, errorMessage = '请求失败', networkMessage = '网络请求失败，请稍后重试', timeoutMessage = '请求超时，请稍后重试', abortMessage = '', getError }) {
    return new Promise((resolve, reject) => {
      const options = {
        method,
        url,
        headers,
        responseType: 'json',
        onload(response) {
          const data = readJsonResponse(response);
          if (response.status >= 200 && response.status < 300) {
            resolve(emptyObject ? (data || {}) : data);
            return;
          }
          const error = new Error(getError?.(data, response.status) || `${errorMessage}：${response.status}`);
          error.status = response.status;
          reject(error);
        },
        onerror() { reject(new Error(networkMessage)); },
      };
      if (body !== undefined) options.data = typeof body === 'string' ? body : JSON.stringify(body);
      if (timeout) {
        options.timeout = timeout;
        options.ontimeout = () => reject(new Error(timeoutMessage));
      }
      if (abortMessage) options.onabort = () => reject(new Error(abortMessage));
      GM_xmlhttpRequest(options);
    });
  }
  async function pollTask({ request, inspect, attempts, interval = 500, timeoutMessage }) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const response = await request(attempt);
      const result = inspect(response);
      if (result?.error) throw new Error(result.error);
      if (result?.done) return result.value;
      await delay(interval);
    }
    throw new Error(timeoutMessage);
  }
  async function walkResources(resources, { getId = resource => String(resource?.id || ''), isFile, getChildren, acceptFile = () => true, mapFile = (resource, path) => ({ ...resource, path }), nextPath = (path, resource) => [...path, resource.name], onFile, onFolder }) {
    const result = [];
    const visited = new Set();
    const walk = async (resource, path = []) => {
      const id = getId(resource);
      if (!id || visited.has(id)) return;
      visited.add(id);
      if (isFile(resource)) {
        if (!acceptFile(resource, path)) return;
        const entry = mapFile(resource, path);
        result.push(entry);
        onFile?.(entry, result.length);
        return;
      }
      const children = await getChildren(resource, path);
      for (const child of children) await walk(child, nextPath(path, resource));
      onFolder?.(resource, result.length);
    };
    for (const resource of resources) await walk(resource);
    return result;
  }
  function bindOverlay(overlay, close, { modal = '.gyh-rename-modal', focus } = {}) {
    const onKeydown = event => { if (event.key === 'Escape') close(); };
    overlay._gyhOnKeydown = onKeydown;
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    overlay.querySelector(modal)?.addEventListener('click', event => event.stopPropagation());
    document.body.appendChild(overlay);
    document.addEventListener('keydown', onKeydown);
    focus?.focus();
    return overlay;
  }
  function modalHeader({ id, icon, title, subtitle, closeLabel }) {
    return `<header class="gyh-rename-header"><div class="gyh-rename-heading"><span class="gyh-rename-heading-icon" aria-hidden="true">${icon}</span><div><h2 class="gyh-rename-title" id="${id}">${title}</h2><p class="gyh-rename-subtitle">${subtitle}</p></div></div><button class="gyh-rename-close" type="button" aria-label="${closeLabel}">${ICONS.close}</button></header>`;
  }
  function modalFooter(note, actions) {
    return `<footer class="gyh-rename-footer"><span class="gyh-rename-footer-note">${note}</span><div class="gyh-rename-footer-actions">${actions}</div></footer>`;
  }
  function assistantAction({ action, attribute = 'data-action', icon, name, note, label = name }) {
    const actionAttribute = action == null ? attribute : `${attribute}="${action}"`;
    return `<button class="gyh-action" type="button" aria-label="${label}" ${actionAttribute}><span class="gyh-action-icon" aria-hidden="true">${icon}</span><span><span class="gyh-action-name">${name}</span><span class="gyh-action-note">${note}</span></span><span class="gyh-action-arrow" aria-hidden="true">›</span></button>`;
  }
  // 读取 TMDB 密钥
  async function getTmdbKey() {
    return String(await getStoredValue(TMDB_KEY_STORAGE, '') || '').trim();
  }
  // 保存 TMDB 密钥
  async function saveTmdbKey(value) {
    const key = String(value || '').trim();
    await setStoredValue(TMDB_KEY_STORAGE, key);
    return key;
  }
  // 规范 TMDB 密钥格式
  function normalizeTmdbKey(value) {
    return String(value || '').trim().replace(/^Bearer\s+/i, '').trim();
  }
  // 从现有完整地址提取 TMDB API 路径
  function getTmdbApiPath(url) {
    const value = String(url || '');
    if (value.startsWith(TMDB_API_BASE)) return value.slice(TMDB_API_BASE.length);
    const parsed = new URL(value);
    return parsed.pathname + parsed.search;
  }
  // 请求 TMDB 接口
  function requestTmdb(url, key) {
    const isBearer = /^eyJ/i.test(key);
    const path = getTmdbApiPath(url);
    const requestUrlBase = `${TMDB_API_BASE}${path}`;
    const requestUrl = isBearer ? requestUrlBase : `${requestUrlBase}${requestUrlBase.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(key)}`;
    debugLog('TMDB 请求开始', { path, auth: isBearer ? 'Bearer' : 'API Key' });
    return requestJson({
      url: requestUrl,
      headers: isBearer ? { Authorization: `Bearer ${key}` } : {},
      timeout: 15000,
      errorMessage: 'TMDB 验证失败',
      networkMessage: 'TMDB 网络请求失败',
      timeoutMessage: 'TMDB 请求超时，请尝试使用代理',
      abortMessage: 'TMDB 请求已取消',
      getError: (data, status) => data?.status_message || `TMDB 验证失败（${status}）`,
    }).then(data => {
      debugLog('TMDB 请求成功', { path });
      return data;
    }).catch(error => {
      debugLog('TMDB 请求失败', { path, status: error?.status || null, message: error?.message || String(error) });
      throw error;
    });
  }
  // 验证 TMDB 密钥
  async function validateTmdbKey(key) {
    const data = await requestTmdb(`${API.tmdb}/configuration`, key);
    if (!data || data.images === undefined) throw new Error('TMDB 密钥无效');
    return true;
  }
  const movieNamingFields = ['影片名', '上映时间', '来源', '分辨率', '视频编码', '音频编码', 'TMDB'];
  const defaultMovieNamingFields = ['影片名', '上映时间', '分辨率', '来源', '视频编码', 'TMDB'];
  const tvNamingFields = ['剧集名', '季集信息', '上映时间', '来源', '分辨率', '视频编码', '音频编码', 'TMDB'];
  const defaultTvNamingFields = ['剧集名', '季集信息', '上映时间', '分辨率', '来源', '视频编码'];
  const movieReleaseYearCache = new Map();
  const tmdbAlternativeTitleCache = new Map();
  const tmdbTvDetailsCache = new Map();
  // 移除站点推广标签
  function stripMovieSiteTags(value) {
    return String(value || '').replace(/(?:【[^】]*(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+(?:com|net|org|cn|edu|gov|info|biz|io|co|me|tv|cc|vip|top|xyz|site|online|club|live|app|pro|mobi|ai|cloud|fun|link|wiki|name|work|store|shop|tech|dev|icu|one|video|movie))[^】]*】|\[[^\]]*(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+(?:com|net|org|cn|edu|gov|info|biz|io|co|me|tv|cc|vip|top|xyz|site|online|club|live|app|pro|mobi|ai|cloud|fun|link|wiki|name|work|store|shop|tech|dev|icu|one|video|movie))[^\]]*\]|『[^』]*(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+(?:com|net|org|cn|edu|gov|info|biz|io|co|me|tv|cc|vip|top|xyz|site|online|club|live|app|pro|mobi|ai|cloud|fun|link|wiki|name|work|store|shop|tech|dev|icu|one|video|movie))[^』]*』)/ig, ' ');
  }
  // 提取文件夹中的中文片名
  function extractMovieTitleHint(value) {
    const source = stripMovieSiteTags(value).replace(/【[^】]*】/g, ' ');
    const text = source.replace(/\[[^\]]*\]|（[^）]*）|\([^)]*\)|『[^』]*』|「[^」]*」/g, ' ');
    const chinese = text.match(/(?:\d{1,3}\s*(?:[：:]\s*)?)?[\u4e00-\u9fff][\u4e00-\u9fff·\d：:]*/g)?.map(item => item.trim()).filter(item => item.length > 1 && !/(?:高清|剧集|发布|国语|配音|字幕|音轨|全集|更新|视频|帧率|版本|杜比|视界|高码|蓝光|原盘|码率|内嵌|简繁|中字|特效)/.test(item)) || [];
    if (chinese.length) return chinese.sort((a, b) => b.length - a.length)[0];
    const bracketTitles = [...source.matchAll(/\[([^\]]+)\]|（([^）]+)）|\(([^)]+)\)/g)].map(match => (match[1] || match[2] || match[3] || '').trim()).filter(title => title && !/(?:国语|国粤|配音|字幕|音轨|多音|中字|杜比|HDR|画质|高码|码率|版本|蓝光|原盘|UHD|4K|HQ|DV|Audio)/i.test(title) && !/^(?:全?\d+集|(?:19|20)\d{2}|\d{3,4}p|s\d{1,2}e?\d{0,3})$/i.test(title));
    return bracketTitles[0] || '';
  }
  // 判断文件夹是否明显表示包含多部影片
  function isMovieCollectionFolder(value) {
    const text = stripMovieSiteTags(value).replace(/\s+/g, ' ');
    return /共\s*\d+\s*部|合集|(?:二|三|四|五|六)部曲|trilogy|quadrilogy|duology|collection|anthology/i.test(text)
      || /(?:19|20)\d{2}\s*[-~至]\s*(?:19|20)\d{2}/.test(text);
  }
  // 提取文件或文件夹中的英文片名
  function extractMovieEnglishTitle(value) {
    const source = stripMovieSiteTags(value);
    const extensionMatch = source.match(/\.(?:3g2|3gp|asf|avi|flv|m2ts|m4v|mkv|mov|mp4|mpeg|mpg|ts|webm|wmv)\s*$/i);
    const base = extensionMatch ? source.slice(0, -extensionMatch[0].length) : source;
    const yearMatch = [...base.matchAll(/(?:19|20)\d{2}/g)].filter(match => Number(match[0]) <= new Date().getFullYear() + 1).at(-1);
    const beforeYear = yearMatch ? base.slice(0, yearMatch.index) : base;
    const clean = beforeYear.replace(/【[^】]*】|\[[^\]]*\]|『[^』]*』|（[^）]*）|\([^)]*\)/g, ' ');
    const tokens = clean.replace(/[._-]+/g, ' ').split(/\s+/).map(token => token.trim()).filter(token => /^[A-Za-z][A-Za-z0-9']*$/.test(token) && !/^(?:2160p?|1080p?|720p?|540p?|4k|8k|web|dl|rip|webrip|bluray|bdrip|bdremux|remux|hdr(?:10\+?)?|dovi|dv|hevc|x265|h265|x264|h264|aac|dts(?:[ ._-]?hd)?(?:[ ._-]?ma)?|truehd|atmos|ddp?|eac3|proper|repack|extended|uncut|limited|complete|multi|subbed|dubbed)$/i.test(token));
    return tokens.join(' ').trim();
  }
  // 规范片源标记
  function extractMovieSource(value) {
    const text = String(value || '').replace(/[\[\](){}【】]/g, '.');
    if (/(?:^|[.\s_-])web[.\s_-]?dl(?:$|[.\s_-])/i.test(text)) return 'WEB-DL';
    if (/(?:^|[.\s_-])(?:blu[.\s_-]?ray|bdrip|bdremux)(?:$|[.\s_-])/i.test(text)) return 'BluRay';
    return '';
  }
  // 规范分辨率标记
  function extractMovieResolution(value) {
    const text = String(value || '').replace(/[\[\](){}【】]/g, '.');
    const match = text.match(/(?:^|[.\s_-])(2160|1080|720|540)p(?:$|[.\s_-])/i);
    if (match) return match[1] + 'p';
    return /(?:^|[.\s_-])4k(?:$|[.\s_-])/i.test(text) ? '2160p' : '';
  }
  // 规范视频编码标记
  function extractMovieVideoCodec(value) {
    const text = String(value || '').replace(/[\[\](){}【】]/g, '.');
    if (/(?:^|[.\s_-])(?:hevc|hecv|x[.\s_-]?265|h[.\s_-]?265)(?:$|[.\s_-])/i.test(text)) return 'H265';
    if (/(?:^|[.\s_-])(?:avc|x[.\s_-]?264|h[.\s_-]?264)(?:$|[.\s_-])/i.test(text)) return 'H264';
    return '';
  }
  // 提取动态范围标记
  function extractMovieDynamicRange(value) {
    const text = String(value || '').replace(/[\[\](){}【】]/g, '.');
    const hasDv = /(?:dolby[.\s_-]?vision|(?:^|[.\s_-])(?:dv|dovi)(?:$|[.\s_-]))/i.test(text);
    const hasHdr = /(?:^|[.\s_-])hdr(?:10\+?)?(?:$|[.\s_-])/i.test(text);
    if (hasDv && hasHdr) return 'DV.HDR';
    if (hasDv) return 'DV';
    return hasHdr ? 'HDR' : 'SDR';
  }
  // 提取视频帧率标记
  function extractMovieFrameRate(value) {
    const text = String(value || '').replace(/[\[\](){}【】]/g, '.');
    const match = text.match(/(?:^|[.\s_-])(\d{2,3})[.\s_-]?fps(?:$|[.\s_-])/i);
    return match ? match[1] + 'fps' : '';
  }
  // 提取音频编码标记
  function extractMovieAudioCodec(value) {
    const text = String(value || '').replace(/[\[\](){}【】]/g, '.').replace(/([a-z])(?=\d)/ig, '$1.');
    let codec = '';
    if (/(?:^|[.\s_-])true[.\s_-]?hd(?:$|[.\s_-])/i.test(text)) codec = 'TrueHD';
    else if (/(?:^|[.\s_-])dts[.\s_-]?hd[.\s_-]?ma(?:$|[.\s_-])/i.test(text)) codec = 'DTS-HD.MA';
    else if (/(?:^|[.\s_-])dts[.\s_-]?x(?:$|[.\s_-])/i.test(text)) codec = 'DTS-X';
    else if (/(?:^|[.\s_-])dts(?:$|[.\s_-])/i.test(text)) codec = 'DTS';
    else if (/(?:^|[.\s_-])(?:ddp|e[.\s_-]?ac[.\s_-]?3|dd\+)(?:$|[.\s_-])/i.test(text)) codec = 'DDP';
    else if (/(?:^|[.\s_-])(?:dd|ac[.\s_-]?3)(?:$|[.\s_-])/i.test(text)) codec = 'DD';
    else if (/(?:^|[.\s_-])aac(?:$|[.\s_-])/i.test(text)) codec = 'AAC';
    else if (/(?:^|[.\s_-])flac(?:$|[.\s_-])/i.test(text)) codec = 'FLAC';
    else if (/(?:^|[.\s_-])(?:l?pcm)(?:$|[.\s_-])/i.test(text)) codec = 'PCM';
    if (!codec) return '';
    const channels = text.match(/(?:^|[.\s_-])(\d[.]\d)(?:$|[.\s_-])/);
    const atmos = /(?:^|[.\s_-])atmos(?:$|[.\s_-])/i.test(text);
    return codec + (channels ? channels[1] : '') + (atmos ? '.Atmos' : '');
  }
  function parseMediaTags(value) {
    return {
      source: extractMovieSource(value),
      resolution: extractMovieResolution(value),
      videoCodec: extractMovieVideoCodec(value),
      dynamicRange: extractMovieDynamicRange(value),
      frameRate: extractMovieFrameRate(value),
      audioCodec: extractMovieAudioCodec(value),
      hq: /高码版|(?:^|[.\s_-])hq(?:$|[.\s_-])/i.test(value) ? 'HQ' : '',
    };
  }
  // 解析电影文件名
  function parseMovieName(fileName, path = [], options = {}) {
    const cleanName = stripMovieSiteTags(fileName);
    const extensionMatch = cleanName.match(/(\.[^.]+)$/);
    const extension = extensionMatch ? extensionMatch[1] : '';
    const base = extension ? cleanName.slice(0, -extension.length) : cleanName;
    const yearMatch = [...base.matchAll(/(?<!\d)(?:19|20)\d{2}(?!\d)/g)].filter(match => Number(match[0]) <= new Date().getFullYear() + 1).at(-1);
    const year = yearMatch ? yearMatch[0] : '';
    const beforeYear = yearMatch ? base.slice(0, yearMatch.index).replace(/[\s\(\[\{（【]+$/, '') : base;
    const parentName = path.length ? path[path.length - 1] : '';
    const parentHint = extractMovieTitleHint(parentName);
    const collectionFolder = options.preferFileTitle === true || path.some(isMovieCollectionFolder);
    const normalizedParentHint = parentHint.replace(/[\s:：._-]+/g, '');
    const pathHint = collectionFolder || /^(?:来自云添加|来自|云添加|下载|电影|影视|视频|资源|文件|新建文件夹|整理完成)$/.test(normalizedParentHint) ? '' : parentHint;
    const folderChineseTitle = pathHint;
    const folderEnglishTitle = extractMovieEnglishTitle(parentName);
    const bracketHint = extractMovieTitleHint(beforeYear);
    const withoutBrackets = beforeYear.replace(/【[^】]*】|\[[^\]]*\]|『[^』]*』|（[^）]*）|\([^)]*\)/g, ' ');
    const chinese = withoutBrackets.match(/(?:\d{1,3}\s*(?:[：:]\s*)?)?[\u4e00-\u9fff][\u4e00-\u9fff·\d：:\s]*/g)?.map(value => value.trim()).filter(value => value.length > 1) || [];
    const englishBase = withoutBrackets.replace(/[._]+/g, ' ').replace(/\s+/g, ' ').trim();
    const fallbackTitle = englishBase.split(' ').filter((value, index, values) => index === 0 || value !== values[index - 1]).join(' ');
    const fileChineseTitle = bracketHint || chinese[chinese.length - 1] || '';
    const fileEnglishTitle = extractMovieEnglishTitle(fileName) || (/[A-Za-z]/.test(fallbackTitle) ? fallbackTitle : '');
    const title = (pathHint || bracketHint || chinese[chinese.length - 1] || fallbackTitle || base).replace(/^[\s._-]+|[\s._-]+$/g, '').trim();
    const metadata = [base, ...path.map(stripMovieSiteTags)].join('.');
    return { title, year, folderChineseTitle, fileChineseTitle, fileEnglishTitle, folderEnglishTitle, titleCandidates: [...new Set([folderChineseTitle, fileChineseTitle, fileEnglishTitle, folderEnglishTitle, title].filter(Boolean))], ...parseMediaTags(metadata), extension: extension.toLowerCase(), rawName: fileName };
  }
  // 规范电影检索文本
  function normalizeMovieText(value) {
    return String(value || '').toLowerCase().replace(/[._·:：/\\()[\]{}【】「」"'’‘-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // 整理 TMDB 候选并评分
  function buildTmdbCandidates(data, info, type) {
    const isMovie = type === 'movie';
    const queryText = normalizeMovieText(info.title);
    const results = data?.results || [];
    const candidates = results.map(item => {
      const title = item[isMovie ? 'title' : 'name'] || item[isMovie ? 'original_title' : 'original_name'] || '';
      const originalTitle = item[isMovie ? 'original_title' : 'original_name'] || '';
      const year = String(item[isMovie ? 'release_date' : 'first_air_date'] || '').slice(0, 4);
      const normalizedTitle = normalizeMovieText(title);
      const normalizedOriginal = normalizeMovieText(originalTitle);
      const exactTitle = normalizedTitle === queryText || normalizedOriginal === queryText;
      let score = exactTitle ? 1000 : (normalizedTitle.includes(queryText) || normalizedOriginal.includes(queryText) || queryText.includes(normalizedTitle) || queryText.includes(normalizedOriginal) ? 300 : 0);
      if (info.year && year) { const gap = Math.abs(Number(info.year) - Number(year)); score += gap === 0 ? 120 : gap === 1 ? 96 : Math.max(-80, 40 - gap * 8); }
      score += Math.min(12, Number(item.vote_count || 0) > 0 ? Math.log(Number(item.vote_count) + 1) * 2 : 0);
      return { id: item.id, title, originalTitle, year, score, exactTitle };
    }).sort((a, b) => b.score - a.score).filter(item => item.exactTitle || item.score >= 300).slice(0, 10);
    debugLog('TMDB 候选评分完成', {
      type,
      query: info.title,
      resultCount: results.length,
      candidateCount: candidates.length,
      candidates: candidates.map(item => ({ id: item.id, title: item.title, originalTitle: item.originalTitle, year: item.year, score: item.score, exactTitle: item.exactTitle })),
    });
    return candidates;
  }
  // 获取并缓存包含别名的 TMDB 剧集详情
  function getTmdbTvDetails(tvId, key) {
    if (!tvId) return Promise.resolve(null);
    const cacheKey = String(tvId);
    if (tmdbTvDetailsCache.has(cacheKey)) {
      debugLog('TMDB 剧集详情缓存命中', { tvId });
      return tmdbTvDetailsCache.get(cacheKey);
    }
    debugLog('TMDB 剧集详情缓存未命中', { tvId });
    const request = requestTmdb(`${API.tmdb}/tv/${encodeURIComponent(tvId)}?language=zh-CN&append_to_response=alternative_titles`, key).catch(() => null);
    tmdbTvDetailsCache.set(cacheKey, request);
    return request;
  }
  // 获取并缓存 TMDB 电影或剧集别名
  function getTmdbAlternativeTitles(type, id, key) {
    if (!id) return Promise.resolve([]);
    if (type !== 'movie') {
      return getTmdbTvDetails(id, key)
        .then(data => data?.alternative_titles?.results || [])
        .then(items => items.map(item => ({ title: String(item?.title || '').trim(), region: item?.iso_3166_1 || '', type: item?.type || '' })).filter(item => item.title));
    }
    const cacheKey = `${type}:${id}`;
    if (tmdbAlternativeTitleCache.has(cacheKey)) {
      debugLog('TMDB 电影别名缓存命中', { movieId: id });
      return tmdbAlternativeTitleCache.get(cacheKey);
    }
    debugLog('TMDB 电影别名缓存未命中', { movieId: id });
    const request = requestTmdb(`${API.tmdb}/movie/${encodeURIComponent(id)}/alternative_titles`, key)
      .then(data => data?.titles || [])
      .then(items => items.map(item => ({ title: String(item?.title || '').trim(), region: item?.iso_3166_1 || '', type: item?.type || '' })).filter(item => item.title))
      .catch(() => []);
    tmdbAlternativeTitleCache.set(cacheKey, request);
    return request;
  }
  // 标题无法直接匹配时，使用 TMDB 别名精确匹配前五个搜索结果
  async function findTmdbAliasCandidate(data, info, type, key) {
    const queryText = normalizeMovieText(info.title);
    if (!queryText) return null;
    const isMovie = type === 'movie';
    const results = (data?.results || []).slice(0, 5);
    debugLog('TMDB 开始别名匹配', { type, query: info.title, resultCount: results.length });
    for (const item of results) {
      const aliases = await getTmdbAlternativeTitles(type, item.id, key);
      const alias = aliases.find(candidate => normalizeMovieText(candidate.title) === queryText);
      debugLog('TMDB 检查候选别名', { type, id: item.id, aliasCount: aliases.length, matched: Boolean(alias) });
      if (!alias) continue;
      const titleKey = isMovie ? 'title' : 'name';
      const candidate = buildTmdbCandidates({ results: [{ ...item, [titleKey]: alias.title }] }, info, type)[0] || null;
      debugLog('TMDB 别名匹配成功', { type, id: item.id, alias: alias.title });
      return candidate;
    }
    debugLog('TMDB 别名匹配失败', { type, query: info.title });
    return null;
  }
  // 获取 TMDB 电影候选
  async function searchTmdbMovieCandidates(info, { preferTitle = false } = {}) {
    const key = await getTmdbKey();
    if (!key || !info.title) return null;
    const queryValues = preferTitle
      ? [info.title, info.folderChineseTitle, info.fileEnglishTitle, info.folderEnglishTitle]
      : [info.folderChineseTitle, info.fileEnglishTitle, info.folderEnglishTitle, info.title];
    const queries = [...new Set(queryValues.map(value => String(value || '').trim()).filter(Boolean))];
    for (const queryText of queries) {
      const query = encodeURIComponent(queryText);
      const data = await requestTmdb(`${API.tmdb}/search/movie?language=zh-CN&region=CN&query=${query}`, key);
      const queryInfo = { ...info, title: queryText };
      const candidates = buildTmdbCandidates(data, queryInfo, 'movie');
      if (candidates.length) {
        debugLog('TMDB 电影名称直接匹配成功', { query: queryText, id: candidates[0].id });
        return candidates;
      }
      debugLog('TMDB 电影名称未匹配，尝试别名', { query: queryText });
      const aliasCandidate = await findTmdbAliasCandidate(data, queryInfo, 'movie', key);
      if (aliasCandidate) {
        debugLog('TMDB 电影最终使用别名候选', { query: queryText, id: aliasCandidate.id });
        return [aliasCandidate];
      }
    }
    return [];
  }
  // 获取最佳 TMDB 电影候选
  async function searchTmdbMovie(info, options = {}) {
    const candidates = await searchTmdbMovieCandidates(info, options);
    debugLog('TMDB 电影最终候选', candidates || []);
    return candidates?.[0] || null;
  }
  // 获取 TMDB 电影的全部上映年份
  async function getTmdbMovieReleaseYears(movieId) {
    const key = await getTmdbKey();
    if (!key || !movieId) return [];
    const cacheKey = String(movieId);
    if (movieReleaseYearCache.has(cacheKey)) return movieReleaseYearCache.get(cacheKey);
    const request = requestTmdb(`${API.tmdb}/movie/${encodeURIComponent(movieId)}/release_dates`, key)
      .then(data => [...new Set((data?.results || []).flatMap(country => country?.release_dates || []).map(item => String(item?.release_date || '').slice(0, 4)).filter(year => /^(?:19|20)\d{2}$/.test(year)))].sort((a, b) => Number(a) - Number(b)))
      .catch(() => []);
    movieReleaseYearCache.set(cacheKey, request);
    return request;
  }
  // 按文件名年份修正电影上映年份，失败时回退搜索结果
  async function resolveMovieMatchYear(info, match) {
    if (!match || !info?.year || !match.year || String(info.year) === String(match.year)) return match;
    const years = await getTmdbMovieReleaseYears(match.id);
    if (!years.length) return match;
    return { ...match, resolvedYear: years.includes(String(info.year)) ? String(info.year) : years[0] };
  }
  // 提取剧集的季集编号和分段标记
  function extractTvSeasonEpisode(value) {
    const text = String(value || '').replace(/[【】[\](){}]/g, '.');
    const match = text.match(/(?:^|[.\s_-])s(\d{1,2})[.\s_-]?e(\d{1,3})(?:[.\s_-]+part[.\s_-]?(\d+))?(?:$|[.\s_-])/i);
    if (!match) return { season: '', episode: '', label: '' };
    const season = String(Number(match[1])).padStart(2, '0');
    const episode = String(Number(match[2])).padStart(2, '0');
    const part = match[3] ? 'Part' + Number(match[3]) : '';
    return { season, episode, part, label: 'S' + season + 'E' + episode + (part ? '.' + part : '') };
  }
  // 提取剧集剧名
  function extractTvTitle(value) {
    const source = stripMovieSiteTags(value).replace(/【[^】]*】/g, ' ');
    const text = source.replace(/\[[^\]]*\]|（[^）]*）|\([^)]*\)|『[^』]*』|「[^」]*」/g, ' ').replace(/(?:^|[.\s_-])s\d{1,2}(?:[.\s_-]?e\d{1,3})?(?:$|[.\s_-]).*$/i, ' ');
    const chinese = text.match(/[\u4e00-\u9fff][\u4e00-\u9fff\u2160-\u217f·\d：]*/g)?.map(item => item.trim()).filter(item => item.length > 1 && !/(?:高清|剧集|发布|国语|配音|字幕|音轨|全集|更新|视频|帧率|版本|杜比|视界|高码|蓝光|原盘|码率|内嵌|简繁|中字|特效)/.test(item)) || [];
    if (chinese.length) return chinese.sort((a, b) => b.length - a.length)[0];
    return extractMovieTitleHint(source) || parseMovieName(source).title;
  }
  // 解析剧集剧集信息
  function parseTvEpisode(file, sourceFolder) {
    const fileInfo = parseMovieName(file.name);
    const folderTitle = extractTvTitle(sourceFolder?.name || '');
    const fileTitle = extractTvTitle(file.name);
    const fileSeasonEpisode = extractTvSeasonEpisode(file.name);
    const seasonEpisode = fileSeasonEpisode.label ? fileSeasonEpisode : extractTvSeasonEpisode(sourceFolder?.name);
    return { ...fileInfo, title: folderTitle || fileTitle || fileInfo.title, season: seasonEpisode.season, episode: seasonEpisode.episode, seasonEpisode: seasonEpisode.label };
  }
  // 获取 TMDB 剧集候选
  async function searchTmdbTvCandidates(info) {
    const key = await getTmdbKey();
    if (!key || !info.title) return [];
    const query = encodeURIComponent(info.title);
    const data = await requestTmdb(`${API.tmdb}/search/tv?language=zh-CN&region=CN&query=${query}`, key);
    const candidates = buildTmdbCandidates(data, info, 'tv');
    if (candidates.length) {
      debugLog('TMDB 剧集名称直接匹配成功', { query: info.title, id: candidates[0].id });
      return candidates;
    }
    debugLog('TMDB 剧集名称未匹配，尝试别名', { query: info.title });
    const aliasCandidate = await findTmdbAliasCandidate(data, info, 'tv', key);
    if (aliasCandidate) debugLog('TMDB 剧集最终使用别名候选', { query: info.title, id: aliasCandidate.id });
    return aliasCandidate ? [aliasCandidate] : [];
  }
  // 获取最佳 TMDB 剧集候选
  async function searchTmdbTv(info) {
    const candidates = await searchTmdbTvCandidates(info);
    return candidates[0] || null;
  }
  // 获取剧集各季总集数
  async function getTmdbTvSeasons(tvId) {
    const key = await getTmdbKey();
    if (!key || !tvId) return [];
    const data = await getTmdbTvDetails(tvId, key);
    const seasons = (data?.seasons || []).map(season => ({ season: Number(season.season_number), total: Number(season.episode_count) || 0, name: season.name || '', year: String(season.air_date || '').slice(0, 4) })).filter(season => Number.isFinite(season.season) && season.season >= 0);
    debugLog('TMDB 剧集季度读取完成', { tvId, seasonCount: seasons.length });
    return seasons;
  }
  // 判断视频文件大小
  function getMovieFileSize(file) {
    const value = file.size ?? file.fileSize ?? file.file_size ?? file.fileSizeByte ?? 0;
    if (typeof value === 'number') return value;
    const match = String(value).match(/([\d.]+)\s*(KB|MB|GB|TB)?/i);
    if (!match) return 0;
    const units = { KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
    return Number(match[1]) * (units[String(match[2] || '').toUpperCase()] || 1);
  }
  // 递归收集大视频文件
  async function collectMovieVideos(resources, onProgress) {
    return walkResources(resources, {
      isFile: resource => resource.resType === 1,
      getChildren: resource => getGuangyaFiles(resource.id),
      acceptFile: resource => isVideoFile(resource) && getMovieFileSize(resource) > MIN_MEDIA_SIZE,
      onFolder: (resource, count) => onProgress?.(count),
    });
  }
  // 查找或创建电影目录
  async function ensureMovieDirectory(parentId, directoryName) {
    const files = await getGuangyaFiles(parentId);
    const existing = files.find(file => file.resType !== 1 && file.name === directoryName);
    if (existing) return existing.id;
    let response;
    try {
      response = await requestGuangyaApi(`${API.guangya}/nd.bizuserres.s/v1/file/create_dir`, { dirName: directoryName, parentId, failIfNameExist: true });
      await waitGuangyaTask(response, '创建' + directoryName + '文件夹');
    } catch (error) {
      const refreshed = await getGuangyaFiles(parentId);
      const created = refreshed.find(file => file.resType !== 1 && file.name === directoryName);
      if (created) return created.id;
      throw error;
    }
    const findId = value => {
      if (!value || typeof value !== 'object') return '';
      if (value.fileId || value.dirId || value.id) return String(value.fileId || value.dirId || value.id);
      for (const child of Object.values(value)) { const id = findId(child); if (id) return id; }
      return '';
    };
    const createdId = findId(response);
    if (createdId) return createdId;
    const refreshed = await getGuangyaFiles(parentId);
    const created = refreshed.find(file => file.resType !== 1 && file.name === directoryName);
    if (created) return created.id;
    throw new Error(response?.msg || '创建' + directoryName + '文件夹失败');
  }
  // 批量移动光鸭资源
  async function moveGuangyaFiles(fileIds, parentId) {
    const ids = [...new Set(fileIds.map(id => String(id || '')).filter(Boolean))];
    if (!ids.length) return;
    const response = await requestGuangyaApi(`${API.guangya}/nd.bizuserres.s/v1/file/move_file`, { fileIds: ids, parentId: String(parentId) });
    const message = response?.msg || response?.data?.msg;
    if (message && message !== 'success') throw new Error(message);
    await waitGuangyaTask(response, '移动文件');
    return response;
  }
  // 移动单个光鸭资源
  async function moveGuangyaFile(fileId, parentId) {
    return moveGuangyaFiles([fileId], parentId);
  }
  // 删除光鸭文件/文件夹（移至回收站）
  async function deleteGuangyaFiles(fileIds) {
    const ids = [...new Set(fileIds.map(id => String(id || '')).filter(Boolean))];
    if (!ids.length) return;
    const response = await requestGuangyaApi(`${API.guangya}/userres/v1/file/delete_file`, { fileIds: ids });
    const message = response?.msg || response?.data?.msg;
    if (message && message !== 'success') throw new Error(message);
    await waitGuangyaTask(response, '删除文件');
    return response;
  }
  // 读取光鸭登录令牌
  function getGuangyaAuthToken() {
    try {
      const key = Object.keys(localStorage).find(item => item.startsWith('credentials_'));
      const credentials = key ? JSON.parse(localStorage.getItem(key)) : null;
      return credentials?.token_type && credentials?.access_token
        ? `${credentials.token_type} ${credentials.access_token}`
        : null;
    } catch (error) {
      return null;
    }
  }
  // 记录迅雷页面请求中的鉴权信息
  function installXunleiRequestCapture() {
    const root = document.documentElement;
    if (!isXunleiPan || root?.dataset.gyhXunleiCapture) return;
    if (!root) {
      document.addEventListener('DOMContentLoaded', installXunleiRequestCapture, { once: true });
      return;
    }
    root.dataset.gyhXunleiCapture = '1';
    const eventName = 'gyh:xunlei-context';
    document.addEventListener(eventName, event => {
      const detail = event.detail || {};
      if (detail.token) xunleiContext.token = String(detail.token);
      if (detail.deviceId) xunleiContext.deviceId = String(detail.deviceId);
      if (detail.captchaToken) xunleiContext.captchaToken = String(detail.captchaToken);
      if (detail.clientId) xunleiContext.clientId = String(detail.clientId);
      if (detail.shareToken) xunleiContext.shareToken = String(detail.shareToken);
    });
    const script = document.createElement('script');
    script.textContent = `(() => { const eventName = ${JSON.stringify(eventName)}; const read = (headers, name) => { if (!headers) return ''; if (typeof headers.get === 'function') return headers.get(name) || ''; for (const key of Object.keys(headers)) if (key.toLowerCase() === name.toLowerCase()) return headers[key] || ''; return ''; }; const capture = (url, headers) => { const value = String(url || ''); if (!value.includes('api-pan.xunlei.com')) return; const authorization = String(read(headers, 'authorization') || ''); let shareToken = ''; try { shareToken = new URL(value, location.href).searchParams.get('pass_code_token') || ''; } catch (error) {} const detail = { token: authorization.replace(/^Bearer\\s+/i, ''), deviceId: read(headers, 'x-device-id') || read(headers, 'x-guid'), captchaToken: read(headers, 'x-captcha-token'), clientId: read(headers, 'x-client-id'), shareToken }; if (detail.token || detail.deviceId || detail.captchaToken || detail.clientId || detail.shareToken) document.dispatchEvent(new CustomEvent(eventName, { detail })); }; const originalFetch = window.fetch; window.fetch = function(input, init) { capture(typeof input === 'string' ? input : input?.url, init?.headers || input?.headers); return originalFetch.apply(this, arguments); }; const open = XMLHttpRequest.prototype.open; const setHeader = XMLHttpRequest.prototype.setRequestHeader; const send = XMLHttpRequest.prototype.send; XMLHttpRequest.prototype.open = function(method, url) { this.__gyhUrl = url; this.__gyhHeaders = {}; return open.apply(this, arguments); }; XMLHttpRequest.prototype.setRequestHeader = function(name, value) { if (this.__gyhHeaders) this.__gyhHeaders[name] = value; return setHeader.apply(this, arguments); }; XMLHttpRequest.prototype.send = function() { capture(this.__gyhUrl, this.__gyhHeaders); return send.apply(this, arguments); }; })();`;
    document.documentElement.appendChild(script);
    script.remove();
  }
  // 从迅雷站点存储中读取上下文值
  function getXunleiStoredValue(pattern) {
    let result = '';
    const inspect = (value, key = '', depth = 0) => {
      if (depth > 3 || value == null) return;
      if (typeof value === 'string') {
        if (pattern.test(key) && value.length > result.length) result = value.replace(/^Bearer\s+/i, '').trim();
        return;
      }
      if (typeof value !== 'object') return;
      Object.entries(value).forEach(([childKey, childValue]) => inspect(childValue, childKey, depth + 1));
    };
    [localStorage, sessionStorage].forEach(storage => {
      try {
        for (let index = 0; index < storage.length; index += 1) {
          const key = storage.key(index) || '';
          const raw = storage.getItem(key) || '';
          inspect(raw, key);
          if (/^[{\[]/.test(raw)) { try { inspect(JSON.parse(raw), key); } catch (error) {} }
        }
      } catch (error) {}
    });
    return result;
  }
  // 提取接口返回的验证码
  function findXunleiCaptchaToken(value, depth = 0) {
    if (depth > 4 || value == null) return '';
    if (typeof value !== 'object') return '';
    for (const [key, child] of Object.entries(value)) {
      if (/captcha[_-]?token/i.test(key) && typeof child === 'string' && child) return child;
      const token = findXunleiCaptchaToken(child, depth + 1);
      if (token) return token;
    }
    return '';
  }
  // 发送迅雷 GET 请求
  function requestXunleiGet(url, headers, label) {
    return requestJson({
      url,
      headers,
      timeout: 30000,
      emptyObject: true,
      errorMessage: `${label}请求失败`,
      networkMessage: `${label}网络请求失败，请稍后重试`,
      timeoutMessage: `${label}请求超时，请稍后重试`,
      getError: (data, status) => data?.message || data?.msg || data?.error_description || data?.error || data?.error_details?.map(item => item?.detail || item?.message).filter(Boolean).join(' ') || `${label}请求失败：${status}`,
    });
  }
  // 尝试刷新迅雷页面凭证
  async function refreshXunleiCredentials() {
    const deviceId = xunleiContext.deviceId || getXunleiStoredValue(/device|guid|(^|_)did$/i);
    const token = xunleiContext.token || getXunleiStoredValue(/bearer|access[_-]?token|auth[_-]?token|user[_-]?token/i);
    const clientId = xunleiContext.clientId || getXunleiStoredValue(/client[_-]?id/i) || XUNLEI_CLIENT_ID;
    if (!deviceId) return false;
    xunleiContext.deviceId = deviceId;
    if (token) xunleiContext.token = token;
    xunleiContext.clientId = clientId;
    const headers = { 'x-client-id': clientId, Referer: 'https://pan.xunlei.com/', 'x-device-id': deviceId, 'x-guid': deviceId };
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      const response = await requestXunleiGet(`${XUNLEI_API_BASE}/drive/v1/captcha/init?client_id=${encodeURIComponent(clientId)}&device_id=${encodeURIComponent(deviceId)}&action=share`, headers, '迅雷云盘');
      const captchaToken = findXunleiCaptchaToken(response);
      if (captchaToken) xunleiContext.captchaToken = captchaToken;
    } catch (error) {}
    return Boolean(xunleiContext.deviceId && xunleiContext.captchaToken);
  }
  // 判断是否需要刷新迅雷凭证
  function isXunleiCredentialError(error) {
    return /captcha|device.?id|凭证|登录态|authorization|token|unauth|401|403/i.test(String(error?.message || error || ''));
  }
  // 判断是否可以重试迅雷请求
  function isXunleiRetryableError(error) {
    return isXunleiCredentialError(error) || /网络|超时|429|5\d\d/i.test(String(error?.message || error || ''));
  }
  // 执行带凭证刷新的迅雷请求
  async function requestXunleiWithRetry(request) {
    let lastError = null;
    let refreshed = false;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await request();
      } catch (error) {
        lastError = error;
        const credentialError = isXunleiCredentialError(error);
        if (credentialError && !refreshed) {
          refreshed = true;
          if (xunleiRetryNotifier) xunleiRetryNotifier({ phase: 'refreshing' });
          await refreshXunleiCredentials();
          continue;
        }
        if (attempt < 3 && isXunleiRetryableError(error)) {
          if (xunleiRetryNotifier) xunleiRetryNotifier({ phase: 'retrying', attempt: attempt + 1 });
          await delay(400 * attempt);
          continue;
        }
        break;
      }
    }
    if (isXunleiCredentialError(lastError)) throw new Error('迅雷云盘凭证刷新失败，请刷新页面后重试');
    throw lastError || new Error('迅雷云盘请求失败');
  }
  // 获取迅雷接口请求头
  function getXunleiHeaders() {
    const token = xunleiContext.token || getXunleiStoredValue(/bearer|access[_-]?token|auth[_-]?token|user[_-]?token/i);
    const deviceId = xunleiContext.deviceId || getXunleiStoredValue(/device|guid|(^|_)did$/i);
    const captchaToken = xunleiContext.captchaToken;
    const clientId = xunleiContext.clientId || getXunleiStoredValue(/client[_-]?id/i) || XUNLEI_CLIENT_ID;
    if (!token) throw new Error('未检测到迅雷云盘登录态，请登录后重试');
    if (!deviceId || !captchaToken) throw new Error('正在获取迅雷云盘凭证，请刷新页面后重试');
    xunleiContext.token = token;
    xunleiContext.deviceId = deviceId;
    xunleiContext.clientId = clientId;
    const headers = { 'Content-Type': 'application/json', 'x-client-id': clientId, Referer: 'https://pan.xunlei.com/', Authorization: `Bearer ${token}` };
    if (deviceId) {
      headers['x-device-id'] = deviceId;
      headers['x-guid'] = deviceId;
    }
    if (captchaToken) headers['x-captcha-token'] = captchaToken;
    return { headers, deviceId };
  }
  // 请求迅雷云盘接口
  function requestXunleiApi(url) {
    return requestXunleiWithRetry(() => {
      const context = getXunleiHeaders();
      const requestUrl = new URL(url);
      requestUrl.searchParams.set('device_id', context.deviceId);
      requestUrl.searchParams.set('did', context.deviceId);
      return requestXunleiGet(requestUrl.toString(), context.headers, '迅雷云盘');
    });
  }
  // 判断是否处于迅雷分享页面
  function isXunleiSharePage() {
    return isXunleiPan && /^\/s\//.test(window.location.pathname);
  }
  // 获取当前迅雷分享上下文
  function getXunleiShareContext() {
    const shareId = window.location.pathname.match(/^\/s\/([^/?#]+)/)?.[1] || '';
    const passCodeToken = xunleiContext.shareToken || new URLSearchParams(window.location.search).get('pwd') || '';
    if (!shareId || !passCodeToken) throw new Error('无法读取迅雷分享凭证，请刷新分享页面后重试');
    return { shareId, passCodeToken };
  }
  // 请求迅雷分享接口
  function requestXunleiShareApi(url) {
    return requestXunleiWithRetry(() => {
      const deviceId = xunleiContext.deviceId || getXunleiStoredValue(/device|guid|(^|_)did$/i);
      const captchaToken = xunleiContext.captchaToken;
      if (!deviceId || !captchaToken) throw new Error('正在获取迅雷分享凭证，请刷新页面后重试');
      xunleiContext.deviceId = deviceId;
      const requestUrl = new URL(url);
      requestUrl.searchParams.set('device_id', deviceId);
      requestUrl.searchParams.set('did', deviceId);
      const headers = { 'Content-Type': 'application/json', 'x-client-id': xunleiContext.clientId || XUNLEI_CLIENT_ID, Referer: 'https://pan.xunlei.com/', 'x-device-id': deviceId, 'x-guid': deviceId, 'x-captcha-token': captchaToken };
      return requestXunleiGet(requestUrl.toString(), headers, '迅雷分享');
    });
  }
  // 标准化迅雷文件对象
  function normalizeXunleiFile(file, path = '') {
    const name = String(file?.name ?? file?.fileName ?? '');
    return { ...file, id: String(file?.id ?? file?.fileId ?? ''), name, parentId: String(file?.parent_id ?? file?.parentId ?? ''), kind: String(file?.kind ?? ''), size: Number(file?.size ?? file?.fileSize ?? 0) || 0, path, hash: String(file?.hash ?? file?.gcid ?? ''), md5: String(file?.md5_checksum ?? file?.md5 ?? file?.etag ?? '') };
  }
  // 获取迅雷目录内容
  async function getXunleiFiles(parentId) {
    const files = [];
    let pageToken = '';
    const filters = encodeURIComponent(JSON.stringify({ phase: { eq: 'PHASE_TYPE_COMPLETE' }, trashed: { eq: false } }));
    do {
      const response = await requestXunleiApi(`${XUNLEI_API_BASE}/drive/v1/files?parent_id=${encodeURIComponent(parentId)}&usage=DISPLAY&filters=${filters}&with_audit=true&limit=100&page_token=${encodeURIComponent(pageToken)}`);
      files.push(...(response?.files || []).map(file => normalizeXunleiFile(file)));
      pageToken = String(response?.next_page_token || '');
    } while (pageToken);
    return files;
  }
  // 获取迅雷分享目录内容
  async function getXunleiShareFiles(parentId, context) {
    const files = [];
    let pageToken = '';
    do {
      const response = await requestXunleiShareApi(`${XUNLEI_API_BASE}/drive/v1/share/detail?share_id=${encodeURIComponent(context.shareId)}&parent_id=${encodeURIComponent(parentId)}&pass_code_token=${encodeURIComponent(context.passCodeToken)}&limit=100&page_token=${encodeURIComponent(pageToken)}&with_audit=true&thumbnail_size=SIZE_LARGE&usage=CONSUME`);
      files.push(...(response?.files || response?.data?.files || []).map(file => normalizeXunleiFile(file)));
      pageToken = String(response?.next_page_token || response?.data?.next_page_token || '');
    } while (pageToken);
    return files;
  }
  // 获取迅雷文件详情补充哈希
  async function getXunleiFileDetail(file) {
    const response = await requestXunleiApi(`${XUNLEI_API_BASE}/drive/v1/files/${encodeURIComponent(file.id)}?space=&usage=CONSUME`);
    return normalizeXunleiFile(response?.file || response?.data || response, file.path);
  }
  // 获取迅雷分享文件详情
  async function getXunleiShareFileDetail(file, context) {
    const response = await requestXunleiShareApi(`${XUNLEI_API_BASE}/drive/v1/share/file_info?share_id=${encodeURIComponent(context.shareId)}&file_id=${encodeURIComponent(file.id)}&pass_code_token=${encodeURIComponent(context.passCodeToken)}&usage=CONSUME`);
    return normalizeXunleiFile(response?.file_info || response?.file || response?.data || response, file.path);
  }
  // 读取迅雷页面选择的资源
  async function getSelectedXunleiResources() {
    if (isXunleiSharePage()) {
      const context = getXunleiShareContext();
      const files = await getXunleiShareFiles('', context);
      const selectedRows = [...document.querySelectorAll("li[class*='SourceListItem__item']")].filter(row => row.querySelector("input[type='checkbox']:checked"));
      if (!selectedRows.length) return [];
      return files.filter(file => selectedRows.some(row => row.textContent.includes(file.name)));
    }
    const items = [...document.querySelectorAll("[class*='SourceListItem__item']")];
    const store = items.map(item => item.__vue__?.$store).find(Boolean);
    const selected = items.map(item => item.__vue__?.$props?.selected).find(value => Array.isArray(value) && value.length) || [];
    const all = store?.state?.drive?.all || {};
    return selected.map(item => typeof item === 'object' ? item : all[item]).filter(Boolean).map(file => normalizeXunleiFile(file));
  }
  // 递归收集导出文件
  async function collectXunleiFiles(resources, getChildren, onProgress) {
    return walkResources(resources, {
      isFile: resource => resource.kind !== 'drive#folder',
      getChildren: resource => getChildren(resource.id),
      onFile: (file, count) => onProgress?.({ phase: 'scanning', count }),
    });
  }
  // 递归收集迅雷所选资源
  async function collectXunleiExportFiles(resources, onProgress) {
    return collectXunleiFiles(resources, getXunleiFiles, onProgress);
  }
  // 递归收集迅雷分享所选资源
  async function collectXunleiShareExportFiles(resources, context, onProgress) {
    return collectXunleiFiles(resources, id => getXunleiShareFiles(id, context), onProgress);
  }
  function formatFileSize(size) {
    const value = Math.max(0, Number(size) || 0);
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let formatted = value;
    while (formatted >= 1024 && unitIndex < units.length - 1) {
      formatted /= 1024;
      unitIndex += 1;
    }
    return `${formatted.toFixed(unitIndex === 0 ? 0 : formatted >= 100 ? 0 : formatted >= 10 ? 1 : 2)} ${units[unitIndex]}`;
  }
  async function buildRapidExportData(sourceFiles, { source, phase, onProgress, resolveFile, extraFields }) {
    const files = [];
    const skipped = [];
    for (let index = 0; index < sourceFiles.length; index += 1) {
      let file = sourceFiles[index];
      let hash = getGuangyaRapidHash(file);
      onProgress?.({ phase, index: index + 1, total: sourceFiles.length });
      if (!hash.gcid && !hash.md5 && resolveFile) {
        try {
          file = { ...file, ...await resolveFile(file) };
          hash = getGuangyaRapidHash(file);
        } catch (error) {}
      }
      if (!hash.gcid && !hash.md5) {
        skipped.push(file.name);
        continue;
      }
      const entry = { path: [...file.path, file.name].filter(Boolean).join('/'), size: Math.max(0, Number(file.size) || 0), ...extraFields?.(file) };
      entry.md5 = hash.md5 || hash.gcid.slice(0, 32).toLowerCase();
      if (hash.gcid) entry.gcid = hash.gcid;
      if (hash.cid) entry.cid = hash.cid;
      if (hash.wholeCid) entry.wholeCid = hash.wholeCid;
      files.push(entry);
    }
    if (!files.length) throw new Error('选中的文件缺少秒传信息，暂无法导出');
    const totalFilesCount = files.length;
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    return { data: { version: '1.0', source, totalFilesCount, totalSize, formattedTotalSize: formatFileSize(totalSize), createdAt: new Date().toISOString(), files }, total: sourceFiles.length, skipped };
  }
  // 构建迅雷秒传导出数据
  async function buildXunleiRapidExportData(resources, onProgress) {
    const shareContext = isXunleiSharePage() ? getXunleiShareContext() : null;
    const sourceFiles = shareContext ? await collectXunleiShareExportFiles(resources, shareContext, onProgress) : await collectXunleiExportFiles(resources, onProgress);
    return buildRapidExportData(sourceFiles, {
      source: 'xunlei',
      phase: 'checking',
      onProgress,
      resolveFile: file => shareContext ? getXunleiShareFileDetail(file, shareContext) : getXunleiFileDetail(file),
      extraFields: file => ({ sourceXunlei: true, fileId: file.id, parentId: file.parentId }),
    });
  }
  // 获取当前目录 ID
  function getCurrentGuangyaDirectoryId() {
    const segments = window.location.hash.replace(/^#\/home\/all\/?/, '').split('/').filter(Boolean);
    return segments.length ? segments[segments.length - 1].split('-')[0] : '';
  }
  // 发送光鸭 POST 请求
  function requestGuangyaPost(url, body, options = {}) {
    const token = getGuangyaAuthToken();
    if (!token) return Promise.reject(new Error('未登录，请先登录光鸭云盘'));
    return requestJson({
      method: 'POST',
      url,
      headers: { 'Content-Type': options.contentType || 'application/json', Authorization: token, ...options.headers },
      body,
      timeout: options.timeout,
      emptyObject: options.emptyObject,
      getError: (data, status) => data?.msg || `请求失败：${status}`,
    });
  }
  // 请求光鸭开放接口
  function requestGuangyaApi(url, body) {
    return requestGuangyaPost(url, body);
  }
  // 请求秒传接口
  function requestGuangyaRapidApi(url, body) {
    return requestGuangyaPost(url, body, { contentType: 'application/json;charset=utf-8', headers: { dt: '4' }, timeout: 20000, emptyObject: true });
  }
  // 读取异步任务编号
  function findTaskId(value) {
    if (!value || typeof value !== 'object') return '';
    if (value.taskId || value.task_id) return String(value.taskId || value.task_id);
    for (const child of Object.values(value)) { const id = findTaskId(child); if (id) return id; }
    return '';
  }
  // 提取标准 MD5
  function getRapidMd5(value) {
    const match = String(value || '').match(/[a-f\d]{32}/i);
    return match ? match[0].toLowerCase() : '';
  }
  // 提取标准 GCID
  function getRapidGcid(value) {
    const match = String(value || '').match(/[a-f\d]{40}/i);
    return match ? match[0].toUpperCase() : '';
  }
  // 规范导入文件路径
  function normalizeRapidImportEntry(entry, index) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`第 ${index + 1} 项不是文件对象`);
    const rawPath = String(entry.path || entry.name || '').trim().replace(/\\/g, '/');
    if (!rawPath) throw new Error(`第 ${index + 1} 项缺少 path`);
    if (/\/$/.test(rawPath)) throw new Error(`第 ${index + 1} 项的 path 不能是目录`);
    const parts = rawPath.replace(/^\/+/, '').split('/').map(part => part.trim()).filter(Boolean);
    if (!parts.length || parts.some(part => part === '.' || part === '..' || /[\0\r\n]/.test(part))) throw new Error(`第 ${index + 1} 项的 path 无效`);
    const size = Number(entry.size ?? entry.fileSize ?? entry.file_size ?? 0);
    if (!Number.isFinite(size) || size < 0) throw new Error(`第 ${index + 1} 项的 size 无效`);
    const md5 = getRapidMd5(entry.md5 || entry.etag);
    const gcid = getRapidGcid(entry.gcid);
    if (!md5 && !gcid) throw new Error(`第 ${index + 1} 项缺少有效的 MD5 或 GCID`);
    return { path: parts.join('/'), name: parts.at(-1), directories: parts.slice(0, -1), size, md5, gcid, cid: getRapidGcid(entry.cid || entry.wholeCid || entry.tripleCid) };
  }
  // 解析秒传 JSON
  function parseRapidImportJson(rawJson) {
    let value;
    try { value = JSON.parse(String(rawJson || '')); } catch (error) { throw new Error('JSON 解析失败，请检查内容格式'); }
    if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.files)) throw new Error('JSON 顶层需包含 files 数组');
    if (!value.files.length) throw new Error('files 数组为空，没有可导入的文件');
    const files = [];
    const invalid = [];
    value.files.forEach((entry, index) => {
      try { files.push({ ...normalizeRapidImportEntry(entry, index), sourceIndex: index }); } catch (error) { invalid.push(error.message); }
    });
    if (!files.length) throw new Error(invalid[0] || '没有可导入的有效文件');
    return { files, invalid };
  }
  // 创建并缓存导入目录
  async function ensureRapidDirectoryPath(rootId, directories, cache) {
    let parentId = String(rootId || '');
    let fullPath = '';
    for (const directory of directories) {
      fullPath = fullPath ? `${fullPath}/${directory}` : directory;
      if (cache.has(fullPath)) {
        parentId = cache.get(fullPath);
        continue;
      }
      parentId = String(await ensureMovieDirectory(parentId, directory));
      cache.set(fullPath, parentId);
    }
    return parentId;
  }
  // 等待秒传任务完成
  async function waitRapidImportTask(taskId) {
    return pollTask({
      attempts: 60,
      request: () => requestGuangyaRapidApi(`${API.guangya}/userres/v1/file/get_info_by_task_id`, { taskId: String(taskId) }),
      inspect(response) {
        const data = response?.data || {};
        if (data.fileId || data.file_id || data.id) return { done: true };
        const status = String(data.taskStatus ?? data.task_status ?? data.status ?? data.state ?? '').toUpperCase();
        return [3, 4].includes(Number(status)) || /FAIL|ERROR|CANCEL|失败|错误|取消/.test(status) ? { error: response?.msg || '秒传任务失败' } : null;
      },
      timeoutMessage: '秒传任务超时',
    });
  }
  // 执行单个秒传文件导入
  async function importRapidFile(file, parentId) {
    const tokenUrl = `${API.guangya}/userres/v1/get_res_center_token`;
    const checkUrl = `${API.guangya}/userres/v1/check_can_flash_upload`;
    const fileSize = Number(file.size);
    const gcid = file.gcid;
    const validCid = file.cid && file.cid !== gcid ? file.cid : '';
    const candidates = [];
    const addCandidate = (capacity, res) => {
      const key = `${capacity}:${JSON.stringify(res)}`;
      if (!candidates.some(candidate => candidate.key === key)) candidates.push({ key, capacity, res });
    };
    if (gcid) {
      if (validCid) addCandidate(2, { gcid, cid: validCid, ...(file.md5 ? { md5: file.md5 } : {}), fileSize });
      if (file.md5) addCandidate(2, { gcid, md5: file.md5, fileSize });
      addCandidate(2, { gcid, fileSize });
    } else {
      addCandidate(1, { md5: file.md5, fileSize });
    }
    let tokenResponse = null;
    let taskId = '';
    let tokenError = null;
    for (const candidate of candidates) {
      try {
        const response = await requestGuangyaRapidApi(tokenUrl, { capacity: candidate.capacity, res: candidate.res, name: file.name, parentId: String(parentId || '') });
        if (Number(response?.code) === 156) return;
        const currentTaskId = findTaskId(response?.data || response);
        if (currentTaskId) {
          tokenResponse = response;
          taskId = currentTaskId;
          break;
        }
        tokenResponse = response;
      } catch (error) {
        tokenError = error;
      }
    }
    if (!gcid) throw new Error(tokenResponse?.msg || tokenError?.message || '资源未命中，无法秒传');
    if (!taskId) throw new Error(tokenResponse?.msg || tokenError?.message || '未能创建秒传任务');
    const checkCandidates = [];
    if (validCid) checkCandidates.push({ taskId, gcid, cid: validCid, ...(file.md5 ? { md5: file.md5 } : {}), fileSize });
    if (file.md5) checkCandidates.push({ taskId, gcid, md5: file.md5, fileSize });
    checkCandidates.push({ taskId, gcid, fileSize });
    let checkResponse = null;
    let pollTaskId = '';
    let checkError = null;
    for (const body of checkCandidates) {
      try {
        const response = await requestGuangyaRapidApi(checkUrl, body);
        checkResponse = response;
        const data = response?.data || {};
        if (data.canFlashUpload === true || data.fileId || data.file_id) {
          pollTaskId = findTaskId(data) || taskId;
          break;
        }
        const nextTaskId = findTaskId(data);
        if (nextTaskId) {
          pollTaskId = nextTaskId;
          break;
        }
      } catch (error) {
        checkError = error;
      }
    }
    if (!pollTaskId) throw new Error(checkResponse?.msg || checkError?.message || '资源未命中，无法秒传');
    await waitRapidImportTask(pollTaskId);
  }
  // 并发导入秒传文件
  async function runRapidImport(rawJson, onProgress) {
    const parsed = parseRapidImportJson(rawJson);
    const rootId = getCurrentGuangyaDirectoryId();
    const directoryCache = new Map([['', String(rootId || '')]]);
    const summary = { total: parsed.files.length, success: 0, failed: 0, invalid: parsed.invalid, failures: [] };
    for (let index = 0; index < parsed.files.length; index += 1) {
      const file = parsed.files[index];
      try {
        if (onProgress) onProgress({ phase: 'preparing', index: index + 1, ...summary, file });
        file.parentId = await ensureRapidDirectoryPath(rootId, file.directories, directoryCache);
        if (onProgress) onProgress({ phase: 'prepared', index: index + 1, ...summary, file });
      } catch (error) {
        summary.failed += 1;
        summary.failures.push({ path: file.path, reason: error?.message || '导入失败' });
        if (onProgress) onProgress({ phase: 'failed', index: index + 1, ...summary, file, error });
      }
    }
    const queue = parsed.files.filter(file => file.parentId !== undefined);
    let nextIndex = 0;
    const worker = async () => {
      while (true) {
        const file = queue[nextIndex++];
        if (!file) return;
        const index = file.sourceIndex + 1;
        try {
          if (onProgress) onProgress({ phase: 'processing', index, ...summary, file });
          await importRapidFile(file, file.parentId);
          summary.success += 1;
          if (onProgress) onProgress({ phase: 'success', index, ...summary, file });
        } catch (error) {
          summary.failed += 1;
          summary.failures.push({ path: file.path, reason: error?.message || '导入失败' });
          if (onProgress) onProgress({ phase: 'failed', index, ...summary, file, error });
        }
        if (nextIndex < queue.length) await delay(100);
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, queue.length) }, worker));
    return summary;
  }
  // 等待光鸭异步任务完成
  async function waitGuangyaTask(response, label) {
    const taskId = findTaskId(response);
    if (!taskId) return;
    return pollTask({
      attempts: 40,
      request: () => requestGuangyaApi(`${API.guangya}/nd.bizuserres.s/v1/get_task_status`, { taskId }),
      inspect(taskResponse) {
        const task = taskResponse?.data || taskResponse;
        const status = String(task?.taskStatus ?? task?.task_status ?? task?.status ?? task?.state ?? '').toUpperCase();
        if (Number(status) === 2 || /SUCCESS|SUCCEED|DONE|FINISH|COMPLET|成功|完成/.test(status)) return { done: true };
        return [3, 4].includes(Number(status)) || /FAIL|ERROR|CANCEL|失败|错误|取消/.test(status) ? { error: label + '失败' } : null;
      },
      timeoutMessage: label + '超时',
    });
  }
  // 获取目录下的全部文件
  async function getGuangyaFiles(parentId) {
    const files = [];
    let page = 0;
    while (true) {
      const response = await requestGuangyaApi(
        `${API.guangya}/nd.bizuserres.s/v1/file/get_file_list`,
        { page, parentId, pageSize: 1000, orderBy: 1, sortType: 1 }
      );
      const list = response?.data?.list || [];
      files.push(...list.map(file => ({ ...file, id: String(file.fileId ?? file.id ?? ''), name: String(file.fileName ?? file.name ?? ''), resType: Number(file.resType), fileType: file.fileType, size: Number(file.fileSize ?? file.size ?? file.fileSizeByte ?? file.file_size ?? 0), parentId: String(file.parentId ?? parentId ?? '') })));
      if (list.length === 0 || files.length >= (response?.data?.total || 0)) break;
      page += 1;
    }
    return files;
  }
  // 提取可用于秒传的文件哈希
  function getGuangyaRapidHash(file) {
    const values = [file?.gcid, file?.md5, file?.etag, file?.hash, file?.fileHash, file?.fileMd5, file?.cid, file?.tripleCid, file?.wholeCid, file?.whole_cid, file?.sha1, file?.fileSha1].map(value => String(value || '').trim());
    const gcid = values.find(value => /^[a-f\d]{40}$/i.test(value)) || '';
    const md5 = values.find(value => /^[a-f\d]{32}$/i.test(value)) || '';
    const cid = [file?.cid, file?.tripleCid, file?.triple_cid, file?.sampleCid, file?.sampleFileCid, file?.chunkCid, file?.chunkHash].map(value => String(value || '').trim()).find(value => /^[a-f\d]{40}$/i.test(value) && value.toLowerCase() !== gcid.toLowerCase()) || '';
    const wholeCid = [file?.wholeCid, file?.whole_cid, file?.wholeSha1, file?.whole_sha1, file?.fileSha1, file?.file_sha1, file?.sha1].map(value => String(value || '').trim()).find(value => /^[a-f\d]{40}$/i.test(value) && value.toLowerCase() !== gcid.toLowerCase() && value.toLowerCase() !== cid.toLowerCase()) || '';
    return { md5: md5.toLowerCase(), gcid: gcid.toUpperCase(), cid: cid.toUpperCase(), wholeCid: wholeCid.toUpperCase() };
  }
  // 递归收集所选资源中的全部文件
  async function collectGuangyaExportFiles(resources, onProgress) {
    return walkResources(resources, {
      isFile: resource => resource.resType === 1,
      getChildren: resource => getGuangyaFiles(resource.id),
      onFile: (file, count) => onProgress?.({ phase: 'scanning', count }),
    });
  }
  // 构建光鸭秒传导出数据
  async function buildGuangyaRapidExportData(resources, onProgress) {
    const sourceFiles = await collectGuangyaExportFiles(resources, onProgress);
    return buildRapidExportData(sourceFiles, { source: 'guangya', phase: 'building', onProgress });
  }
  const guangyaSelection = {
    selectedFiles: new Map(),
    fileCache: new Map(),
    filesByName: new Map(),
    directoryId: null,
    cachePromise: null,
    isUpdating: false,
  };
  // 合并短时间内的重复调用
  function debounce(callback, wait = 250) {
    let timer = null;
    return (...args) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => callback(...args), wait);
    };
  }
  // 确保当前目录文件已缓存
  async function ensureGuangyaFileCache() {
    const directoryId = getCurrentGuangyaDirectoryId();
    if (guangyaSelection.directoryId === directoryId && guangyaSelection.fileCache.size > 0) return;
    if (guangyaSelection.directoryId !== directoryId) {
      guangyaSelection.directoryId = directoryId;
      guangyaSelection.selectedFiles.clear();
      guangyaSelection.fileCache.clear();
      guangyaSelection.filesByName.clear();
    }
    if (guangyaSelection.cachePromise) return guangyaSelection.cachePromise;
    guangyaSelection.cachePromise = getGuangyaFiles(directoryId)
      .then((files) => {
        guangyaSelection.fileCache = new Map(files.map(file => [file.id, file]));
        guangyaSelection.filesByName.clear();
        files.forEach((file) => {
          const entries = guangyaSelection.filesByName.get(file.name) || [];
          entries.push(file.id);
          guangyaSelection.filesByName.set(file.name, entries);
        });
      })
      .finally(() => {
        guangyaSelection.cachePromise = null;
      });
    return guangyaSelection.cachePromise;
  }
  // 从缓存中按名称查找文件
  function getCachedFileByName(fileName, preferUnselected = true) {
    const ids = guangyaSelection.filesByName.get(fileName) || [];
    const matchedId = preferUnselected
      ? ids.find(id => !guangyaSelection.selectedFiles.has(id)) || ids[0]
      : ids[0];
    return matchedId ? guangyaSelection.fileCache.get(matchedId) : null;
  }
  // 将文件加入选择集合
  async function selectGuangyaFile(fileName) {
    await ensureGuangyaFileCache();
    const file = getCachedFileByName(fileName);
    if (file) guangyaSelection.selectedFiles.set(file.id, file);
  }
  // 将文件移出选择集合
  function unselectGuangyaFile(fileName) {
    const ids = guangyaSelection.filesByName.get(fileName) || [];
    const selectedId = ids.find(id => guangyaSelection.selectedFiles.has(id));
    if (selectedId) guangyaSelection.selectedFiles.delete(selectedId);
  }
  // 同步页面可见的选中项
  async function syncVisibleGuangyaSelection() {
    const selectedNames = Array.from(document.querySelectorAll('.swangpan-file-list-table__row[data-state="selected"]'))
      .map(row => row.querySelector('[title]')?.getAttribute('title'))
      .filter(Boolean);
    if (!selectedNames.length) return;
    await ensureGuangyaFileCache();
    selectedNames.forEach((fileName) => {
      const file = getCachedFileByName(fileName);
      if (file) guangyaSelection.selectedFiles.set(file.id, file);
    });
  }
  // 绑定文件选择事件
  function bindGuangyaSelectionEvents() {
    const headerCheckbox = document.querySelector('.swangpan-file-list-table__header .swangpan-checkbox__input');
    if (headerCheckbox && !headerCheckbox.dataset.gyhBound) {
      headerCheckbox.dataset.gyhBound = '1';
      headerCheckbox.addEventListener('change', async (event) => {
        if (guangyaSelection.isUpdating) return;
        guangyaSelection.isUpdating = true;
        try {
          if (event.target.checked) {
            await ensureGuangyaFileCache();
            guangyaSelection.selectedFiles = new Map(guangyaSelection.fileCache);
          } else {
            guangyaSelection.selectedFiles.clear();
          }
        } finally {
          guangyaSelection.isUpdating = false;
        }
      });
    }
    const fileListBody = document.querySelector('.swangpan-file-list-table__body');
    if (fileListBody && !fileListBody.dataset.gyhBound) {
      fileListBody.dataset.gyhBound = '1';
      fileListBody.addEventListener('click', (event) => {
        if (guangyaSelection.isUpdating) return;
        window.setTimeout(async () => {
          const row = event.target.closest('.swangpan-file-list-table__row');
          if (!row) return;
          const fileName = row.querySelector('[title]')?.getAttribute('title');
          if (!fileName) return;
          guangyaSelection.isUpdating = true;
          try {
            if (row.getAttribute('data-state') === 'selected') {
              await selectGuangyaFile(fileName);
            } else {
              unselectGuangyaFile(fileName);
            }
          } finally {
            guangyaSelection.isUpdating = false;
          }
        }, 0);
      });
    }
  }
  // 初始化选择状态监听
  function initializeGuangyaSelection() {
    let lastDirectoryId = getCurrentGuangyaDirectoryId();
    const rebind = debounce(() => {
      const currentDirectoryId = getCurrentGuangyaDirectoryId();
      if (currentDirectoryId !== lastDirectoryId) {
        guangyaSelection.directoryId = null;
        guangyaSelection.selectedFiles.clear();
        lastDirectoryId = currentDirectoryId;
      }
      bindGuangyaSelectionEvents();
      syncVisibleGuangyaSelection().catch(() => {});
      ensureGuangyaFileCache().catch(() => {});
    });
    bindGuangyaSelectionEvents();
    syncVisibleGuangyaSelection().catch(() => {});
    ensureGuangyaFileCache().catch(() => {});
    new MutationObserver(rebind).observe(document.body, { childList: true, subtree: true });
  }
  // 返回当前已选文件
  async function getSelectedGuangyaFiles() {
    await syncVisibleGuangyaSelection();
    return [...guangyaSelection.selectedFiles.values()].filter(file => file.resType === 1);
  }
  // 返回当前已选资源
  async function getSelectedGuangyaResources() {
    await syncVisibleGuangyaSelection();
    return [...guangyaSelection.selectedFiles.values()];
  }
  // 重命名单个光鸭文件
  async function renameGuangyaFile(fileId, newName) {
    const response = await requestGuangyaApi(
      `${API.guangya}/nd.bizuserres.s/v1/file/rename`,
      { fileId, newName }
    );
    if (response?.msg !== 'success') throw new Error(response?.msg || '重命名失败');
    await waitGuangyaTask(response, '重命名');
  }
  // 转义预览中的文本内容
  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
    })[character]);
  }
  // 判断文件是否为视频
  function isVideoFile(file) {
    return file.fileType === 2 || VIDEO_EXTENSION_RE.test(file.name);
  }
  const overlays = { rename: null, movie: null, tv: null, rapidImport: null, rapidExport: null, rapidExportProgress: null, search: null };
  function removeOverlay(overlay) {
    if (!overlay) return;
    if (overlay._gyhOnKeydown) document.removeEventListener('keydown', overlay._gyhOnKeydown);
    overlay.remove();
  }
  // 关闭弹窗并清理事件
  function closeOverlay(overlay, clear, shouldRefresh = false) {
    if (!overlay) return;
    const refresh = shouldRefresh && overlay._gyhShouldRefresh === true;
    removeOverlay(overlay);
    clear();
    if (refresh) window.location.reload();
  }
  function closeDesigner(name, shouldRefresh = false) {
    closeOverlay(overlays[name], () => { overlays[name] = null; }, shouldRefresh);
  }
  // 渲染当前方式的规则输入项
  function renderRenameFields(container, mode) {
    const config = renameModes.find(item => item.key === mode);
    container.innerHTML = config.fields.map(([label, placeholder, disabled]) => `
      <label class="gyh-rename-field">
        <span class="gyh-rename-field-label">${label}</span>
        <input class="gyh-rename-input" type="text" placeholder="${placeholder}" aria-label="${label}"${disabled ? ' disabled' : ''}>
      </label>
    `).join('');
  }
  // 根据规则生成重命名预览
  function buildRenamePlan(files, mode, inputs) {
    const values = Array.from(inputs).map(input => input.value || '');
    const config = renameModes.find(item => item.key === mode);
    let prepared;
    try { prepared = config.prepare?.(values); } catch (error) { return { error: '正则表达式格式不正确', items: [] }; }
    const items = files.map((file, index) => {
      const lastDot = file.name.lastIndexOf('.');
      const baseName = lastDot > 0 ? file.name.slice(0, lastDot) : file.name;
      const extension = lastDot > 0 ? file.name.slice(lastDot) : '';
      return { ...file, newName: config.apply({ file, index, values, baseName, extension, prepared }) };
    });
    return { error: null, items };
  }
  // 渲染文件名称预览行
  function renderRenamePreview(container, items) {
    container.innerHTML = `
      ${items.map((file, index) => `
        <div class="gyh-rename-row" data-rename-file-id="${escapeHtml(file.id)}">
          <span class="gyh-rename-row-name"><span class="gyh-rename-row-index">${String(index + 1).padStart(2, '0')} </span>${escapeHtml(file.name)}</span>
          <span class="gyh-rename-row-arrow" aria-hidden="true">→</span>
          <span class="gyh-rename-row-name is-new">${escapeHtml(file.newName)}</span>
          <span class="gyh-rename-row-status">待改名</span>
        </div>
      `).join('')}
    `;
  }
  // 平滑展示正在处理的行
  function revealRenameRow(previewBody, row) {
    const rowRect = row.getBoundingClientRect();
    const bodyRect = previewBody.getBoundingClientRect();
    let offset = 0;
    if (rowRect.top < bodyRect.top) {
      offset = rowRect.top - bodyRect.top;
    } else if (rowRect.bottom > bodyRect.bottom) {
      offset = rowRect.bottom - bodyRect.bottom;
    }
    if (offset !== 0) {
      previewBody.scrollTo({ top: previewBody.scrollTop + offset, behavior: 'smooth' });
    }
  }
  // 更新预览行的状态样式
  function setPreviewRowState(row, state, text) {
    if (!row) return;
    row.classList.remove('is-processing', 'is-success', 'is-failed');
    if (state) row.classList.add('is-' + state);
    const status = row.querySelector('.gyh-rename-row-status, .gyh-movie-preview-status');
    if (status) status.textContent = text;
  }
  // 打开秒传提取进度弹窗
  function showRapidExportProgress() {
    closeDesigner('rapidExportProgress');
    const overlay = document.createElement('div');
    overlay.className = 'gyh-rename-overlay';
    overlay.innerHTML = `<section class="gyh-rename-modal gyh-rapid-export-progress-modal" role="status" aria-live="polite" aria-busy="true"><header class="gyh-rename-header"><div class="gyh-rename-heading"><span class="gyh-rename-heading-icon" aria-hidden="true">${ICONS.export}</span><div><h2 class="gyh-rename-title">提取秒传信息</h2><p class="gyh-rename-subtitle">正在准备导出内容</p></div></div></header><div class="gyh-rename-body"><div class="gyh-rapid-export-progress-main"><span class="gyh-rapid-export-spinner" aria-hidden="true"></span><p class="gyh-rapid-export-progress-title">正在读取所选文件</p><p class="gyh-rapid-export-progress-text" data-rapid-export-progress-text>正在递归读取文件夹</p><p class="gyh-rapid-export-progress-count" data-rapid-export-progress-count></p></div></div><footer class="gyh-rename-footer"><span class="gyh-rapid-export-progress-note">完成后将自动打开导出面板</span></footer></section>`;
    overlays.rapidExportProgress = overlay;
    document.body.appendChild(overlay);
    const text = overlay.querySelector('[data-rapid-export-progress-text]');
    const count = overlay.querySelector('[data-rapid-export-progress-count]');
    return {
      update(progress) {
        const phase = progress?.phase || '';
        if (phase === 'scanning') {
          text.textContent = '正在递归读取文件夹';
          count.textContent = progress.count ? `已发现 ${progress.count} 个文件` : '';
        } else if (phase === 'checking') {
          text.textContent = '正在补全文件哈希';
          count.textContent = progress.total ? `${progress.index}/${progress.total}` : '';
        } else if (phase === 'building') {
          text.textContent = '正在整理秒传信息';
          count.textContent = progress.total ? `${progress.index}/${progress.total}` : '';
        } else if (phase === 'refreshing') {
          text.textContent = '正在刷新迅雷凭证';
          count.textContent = '正在重新验证请求信息';
        } else if (phase === 'retrying') {
          text.textContent = '正在重新请求迅雷接口';
          count.textContent = `第 ${progress.attempt} 次尝试`;
        }
      },
      close: () => closeDesigner('rapidExportProgress'),
    };
  }
  // 复制文本到剪贴板
  async function copyPlainText(value) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch (error) {}
    const textarea = document.createElement('textarea');
    textarea.className = 'gyh-copy-buffer';
    textarea.value = value;
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    return copied;
  }
  // 下载秒传 JSON
  function downloadRapidExportJson(value) {
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const fileName = `秒传导出_${timestamp}.json`;
    const url = URL.createObjectURL(new Blob([value], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  // 打开秒传文件导出弹窗
  function showRapidExportDesigner(exportResult) {
    if (overlays.rapidExport) return;
    const exportData = exportResult.data;
    const sourceName = exportData.source === 'xunlei' ? '迅雷云盘' : '光鸭云盘';
    const exportJson = JSON.stringify(exportData, null, 2);
    const fileCount = exportData.files.length;
    const skipped = exportResult?.skipped?.length || 0;
    const overlay = document.createElement('div');
    overlay.className = 'gyh-rename-overlay';
    overlay.innerHTML = `<section class="gyh-rename-modal gyh-rapid-export-modal" role="dialog" aria-modal="true" aria-labelledby="gyh-rapid-export-title">${modalHeader({ id: 'gyh-rapid-export-title', icon: ICONS.export, title: '导出秒传文件', subtitle: '生成可用于秒传导入的 JSON 文件', closeLabel: '关闭导出秒传文件' })}<div class="gyh-rename-body"><section class="gyh-rename-section"><div class="gyh-rename-section-head"><h3 class="gyh-rename-section-title">导出信息</h3><span class="gyh-rename-section-hint" data-rapid-export-hint></span></div><div class="gyh-rapid-export-summary"><div class="gyh-rapid-export-summary-item"><span class="gyh-rapid-export-summary-label">来源</span><span class="gyh-rapid-export-summary-value" data-rapid-export-source></span></div><div class="gyh-rapid-export-summary-item"><span class="gyh-rapid-export-summary-label">文件数量</span><span class="gyh-rapid-export-summary-value" data-rapid-export-count></span></div><div class="gyh-rapid-export-summary-item"><span class="gyh-rapid-export-summary-label">导出格式</span><span class="gyh-rapid-export-summary-value">JSON</span></div></div></section><section class="gyh-rename-section"><div class="gyh-rename-section-head"><h3 class="gyh-rename-section-title">秒传 JSON</h3><span class="gyh-rename-section-hint">可复制或下载</span></div><div class="gyh-rapid-export-code" data-rapid-export-editor></div></section></div><footer class="gyh-rename-footer"><span class="gyh-rapid-export-note" data-rapid-export-note></span><div class="gyh-rename-footer-actions"><button class="gyh-rename-btn" type="button" data-rapid-export-copy>复制</button><button class="gyh-rename-btn gyh-rename-btn-primary" type="button" data-rapid-export-download>下载</button><button class="gyh-rename-btn" type="button" data-rapid-export-close>关闭</button></div></footer></section>`;
    overlays.rapidExport = overlay;
    overlay.querySelector('[data-rapid-export-source]').textContent = sourceName;
    overlay.querySelector('[data-rapid-export-count]').textContent = `${fileCount} 个`;
    overlay.querySelector('[data-rapid-export-hint]').textContent = '已生成';
    overlay.querySelector('[data-rapid-export-note]').textContent = skipped ? `已导出 ${fileCount} 个文件，跳过 ${skipped} 个缺少秒传信息的文件` : `已导出 ${fileCount} 个文件`;
    const editorHost = overlay.querySelector('[data-rapid-export-editor]');
    createJsonEditor(editorHost, { value: exportJson, readOnly: true, fallbackClass: 'gyh-rapid-export-fallback' });
    const close = () => closeDesigner('rapidExport');
    overlay.querySelector('.gyh-rename-close').addEventListener('click', close);
    overlay.querySelector('[data-rapid-export-close]').addEventListener('click', close);
    overlay.querySelector('[data-rapid-export-copy]').addEventListener('click', async () => {
      const copied = await copyPlainText(exportJson);
      showToast(copied ? '秒传 JSON 已复制' : '复制失败，请手动复制', copied ? 'success' : 'error');
    });
    overlay.querySelector('[data-rapid-export-download]').addEventListener('click', () => {
      downloadRapidExportJson(exportJson);
      showToast('秒传 JSON 已下载', 'success');
    });
    bindOverlay(overlay, close, { modal: '.gyh-rapid-export-modal' });
  }
  // 打开秒传文件导入弹窗
  function showRapidImportDesigner() {
    if (overlays.rapidImport) return;
    const overlay = document.createElement('div');
    overlay.className = 'gyh-rename-overlay';
    overlay.innerHTML = `<section class="gyh-rename-modal gyh-rapid-import-modal" role="dialog" aria-modal="true" aria-labelledby="gyh-rapid-import-title">${modalHeader({ id: 'gyh-rapid-import-title', icon: ICONS.import, title: '导入秒传文件', subtitle: '选择文件或直接填写秒传内容', closeLabel: '关闭导入秒传文件' })}<div class="gyh-rename-body"><section class="gyh-rename-section" data-rapid-import-editor-section><div class="gyh-rename-section-head"><h3 class="gyh-rename-section-title">导入内容</h3><div class="gyh-rapid-import-tools"><label class="gyh-rename-btn gyh-rapid-import-file-button" title="选择 JSON 文件">${ICONS.uploadFile}选择 JSON<input class="gyh-rapid-import-file-input" type="file" accept=".json,application/json,text/json"></label><button class="gyh-rename-btn gyh-rapid-import-clear" type="button" data-rapid-import-clear>清空</button></div></div><div class="gyh-rapid-import-file-row"><span class="gyh-rapid-import-file-name">可以选择导入秒传JSON文件，也可以直接填写JSON格式的内容</span></div><div class="gyh-rapid-import-editor" data-rapid-import-editor></div></section></div>${modalFooter('<span data-rapid-import-note>支持 JSON 文件或直接填写内容</span>', '<button class="gyh-rename-btn" type="button" data-rapid-import-cancel>取消</button><button class="gyh-rename-btn gyh-rename-btn-primary" type="button" data-rapid-import-start>开始导入</button>')}</section>`;
    overlays.rapidImport = overlay;
    const editorHost = overlay.querySelector('[data-rapid-import-editor]');
    const modalBody = overlay.querySelector('.gyh-rename-body');
    const editorSection = overlay.querySelector('[data-rapid-import-editor-section]');
    const fileInput = overlay.querySelector('.gyh-rapid-import-file-input');
    const fileName = overlay.querySelector('.gyh-rapid-import-file-name');
    const footerNote = overlay.querySelector('[data-rapid-import-note]');
    const fileButton = overlay.querySelector('.gyh-rapid-import-file-button');
    const clearButton = overlay.querySelector('[data-rapid-import-clear]');
    const cancelButton = overlay.querySelector('[data-rapid-import-cancel]');
    const startButton = overlay.querySelector('[data-rapid-import-start]');
    const closeButton = overlay.querySelector('.gyh-rename-close');
    let importing = false;
    let completed = false;
    let progressBody = null;
    let progressSection = null;
    const progressRows = new Map();
    const jsonEditor = createJsonEditor(editorHost, { autocomplete: true, fallbackClass: 'gyh-rapid-import-fallback', placeholder: '粘贴秒传 JSON 内容' });
    const setEditorValue = value => jsonEditor.setValue(value);
    const getEditorValue = () => jsonEditor.getValue();
    const updateRapidFooter = progress => {
      const finished = progress.success + progress.failed;
      const prefix = ['preparing', 'prepared'].includes(progress.phase) ? `准备导入目录 ${progress.index}/${progress.total} 个` : `导入文件 ${finished}/${progress.total} 个`;
      const skipped = progress.invalid?.length ? ` · 跳过 ${progress.invalid.length} 个` : '';
      footerNote.innerHTML = `${prefix} · 已导入 <span class="gyh-count-success">${progress.success}</span> 个 · 失败 <span class="gyh-count-failed">${progress.failed}</span> 个${skipped}`;
    };
    const updateRapidRow = (file, state) => {
      const row = progressRows.get(file.sourceIndex);
      if (!row) return;
      const labels = { waiting: '待导入', processing: '导入中', success: '已导入', failed: '已失败' };
      setPreviewRowState(row, state === 'waiting' ? '' : state, labels[state] || labels.waiting);
      if (state !== 'waiting' && progressBody) revealRenameRow(progressBody, row);
    };
    const showRapidProgress = files => {
      editorHost.hidden = true;
      const section = document.createElement('section');
      section.className = 'gyh-rename-section';
      section.innerHTML = `<div class="gyh-rename-section-head"><h3 class="gyh-rename-section-title">导入进度</h3><span class="gyh-rename-section-hint">${files.length} 个文件</span></div><div class="gyh-rapid-import-progress"><div class="gyh-rapid-import-progress-head"><span>导入目录</span><span>导入文件名</span><span>状态</span></div><div class="gyh-rapid-import-progress-body"></div></div>`;
      progressBody = section.querySelector('.gyh-rapid-import-progress-body');
      files.forEach(file => {
        const row = document.createElement('div');
        const directory = file.directories.length ? file.directories.join('/') : '当前目录';
        row.className = 'gyh-rapid-import-progress-row gyh-rename-row';
        row.innerHTML = `<span class="gyh-rapid-import-progress-directory" title="${escapeHtml(directory)}">${escapeHtml(directory)}</span><span class="gyh-rapid-import-progress-file" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span><span class="gyh-rename-row-status">待导入</span>`;
        progressRows.set(file.sourceIndex, row);
        progressBody.appendChild(row);
      });
      modalBody.appendChild(section);
      progressSection = section;
    };
    const setImporting = value => {
      importing = value;
      const lockEditor = value || completed;
      fileInput.disabled = lockEditor;
      fileButton.classList.toggle('is-disabled', lockEditor);
      clearButton.disabled = value;
      cancelButton.disabled = value;
      closeButton.disabled = value;
      startButton.disabled = value;
      clearButton.textContent = completed ? '重置' : '清空';
      cancelButton.textContent = '取消';
      startButton.textContent = value ? '导入中' : completed ? '关闭' : '开始导入';
    };
    const resetRapidImportState = () => {
      completed = false;
      overlay._gyhShouldRefresh = false;
      if (progressSection) progressSection.remove();
      progressSection = null;
      progressBody = null;
      progressRows.clear();
      editorSection.hidden = false;
      editorHost.hidden = false;
      setImporting(false);
      window.requestAnimationFrame(() => jsonEditor.resize());
    };
    clearButton.addEventListener('click', () => {
      resetRapidImportState();
      setEditorValue('');
      fileInput.value = '';
      fileName.textContent = '可以选择导入秒传JSON文件，也可以直接填写JSON格式的内容';
      footerNote.textContent = '支持 JSON 文件或直接填写内容';
      jsonEditor.focus();
    });
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setEditorValue(String(reader.result || ''));
        fileName.textContent = file.name + ' · ' + (file.size / 1024).toFixed(1) + ' KB';
        footerNote.textContent = '已读取 JSON 文件，可继续编辑内容';
      };
      reader.onerror = () => {
        fileName.textContent = '文件读取失败，请重新选择';
        footerNote.textContent = '请选择有效的 JSON 文件';
      };
      reader.readAsText(file, 'UTF-8');
    });
    const close = () => { if (!importing) closeDesigner('rapidImport', true); };
    closeButton.addEventListener('click', close);
    cancelButton.addEventListener('click', close);
    startButton.addEventListener('click', async () => {
      if (importing) return;
      if (completed) {
        closeDesigner('rapidImport', true);
        return;
      }
      const rawJson = getEditorValue();
      try {
        const preview = parseRapidImportJson(rawJson);
        showRapidProgress(preview.files);
        setImporting(true);
        updateRapidFooter({ phase: 'preparing', index: 0, total: preview.files.length, success: 0, failed: 0, invalid: preview.invalid });
        const result = await runRapidImport(rawJson, progress => {
          if (progress.phase === 'processing') updateRapidRow(progress.file, 'processing');
          if (progress.phase === 'success') updateRapidRow(progress.file, 'success');
          if (progress.phase === 'failed') updateRapidRow(progress.file, 'failed');
          updateRapidFooter(progress);
        });
        completed = true;
        overlay._gyhShouldRefresh = result.success > 0;
        updateRapidFooter({ phase: 'completed', ...result });
        showToast(result.failed ? `导入完成，成功 ${result.success} 个，失败 ${result.failed} 个` : `已成功导入 ${result.success} 个文件`, result.failed ? 'info' : 'success');
      } catch (error) {
        footerNote.textContent = error?.message || '导入失败，请检查秒传 JSON';
        showToast(error?.message || '导入失败，请检查秒传 JSON', 'error');
      } finally {
        setImporting(false);
      }
    });
    bindOverlay(overlay, close, { modal: '.gyh-rapid-import-modal', focus: jsonEditor });
  }
  // 打开 TMDB 配置弹窗
  async function showTmdbConfig(onSaved, onClosed) {
    if (overlays.movie) return;
    const currentKey = await getTmdbKey();
    const overlay = document.createElement('div');
    overlay.className = 'gyh-rename-overlay';
    overlay.innerHTML = `<section class="gyh-rename-modal gyh-movie-modal gyh-movie-key-modal" role="dialog" aria-modal="true" aria-labelledby="gyh-tmdb-title">${modalHeader({ id: 'gyh-tmdb-title', icon: ICONS.tmdb, title: 'TMDB 配置', subtitle: '配置后才能开始影视识别', closeLabel: '关闭 TMDB 配置' })}<div class="gyh-rename-body"><section class="gyh-rename-section"><div class="gyh-rename-section-head"><h3 class="gyh-rename-section-title">密钥设置</h3><span class="gyh-rename-section-hint">仅保存在本机</span></div><div class="gyh-movie-key-note">请输入 TMDB 的 <strong>API Key</strong> 或 <strong>Read Access Token</strong>，验证通过后才会保存</div><label class="gyh-rename-field gyh-movie-key-field"><span class="gyh-rename-field-label">TMDB 密钥</span><input class="gyh-rename-input gyh-movie-key-input" type="password" placeholder="输入 API Key 或 Read Access Token" aria-label="TMDB 密钥" value="${escapeHtml(currentKey)}"></label><div class="gyh-movie-key-status" data-tmdb-key-status></div></section></div>${modalFooter('不会在未验证前保存密钥', '<button class="gyh-rename-btn" type="button" data-tmdb-clear>清除</button><button class="gyh-rename-btn" type="button" data-tmdb-cancel>取消</button><button class="gyh-rename-btn gyh-rename-btn-primary" type="button" data-tmdb-save>验证并保存</button>')}</section>`;
    overlays.movie = overlay;
    const input = overlay.querySelector('.gyh-movie-key-input');
    const status = overlay.querySelector('[data-tmdb-key-status]');
    const saveButton = overlay.querySelector('[data-tmdb-save]');
    const closeButton = overlay.querySelector('.gyh-rename-close');
    const cancelButton = overlay.querySelector('[data-tmdb-cancel]');
    const clearButton = overlay.querySelector('[data-tmdb-clear]');
    let closed = false;
    const close = () => { if (closed) return; closed = true; closeDesigner('movie', true); if (onClosed) onClosed(); };
    closeButton.addEventListener('click', close);
    cancelButton.addEventListener('click', close);
    clearButton.addEventListener('click', async () => { await saveTmdbKey(''); input.value = ''; status.className = 'gyh-movie-key-status is-success'; status.textContent = '密钥已清除'; });
    saveButton.addEventListener('click', async () => {
      const key = normalizeTmdbKey(input.value);
      if (!key) { status.className = 'gyh-movie-key-status is-error'; status.textContent = '请输入 TMDB 密钥'; return; }
      saveButton.disabled = true;
      saveButton.textContent = '验证中...';
      status.className = 'gyh-movie-key-status';
      status.textContent = '正在验证密钥';
      try {
        await validateTmdbKey(key);
        await saveTmdbKey(key);
        status.className = 'gyh-movie-key-status is-success';
        status.textContent = '验证成功，密钥已保存';
        await delay(260);
        close();
        if (onSaved) onSaved();
      } catch (error) {
        status.className = 'gyh-movie-key-status is-error';
        status.textContent = error.message || '密钥验证失败';
      } finally {
        saveButton.disabled = false;
        saveButton.textContent = '验证并保存';
      }
    });
    bindOverlay(overlay, close, { modal: '.gyh-movie-modal', focus: input });
  }
  function showTmdbCorrection({ type, info: initialInfo, searchCandidates, onApply }) {
    const isMovie = type === 'movie';
    const mediaName = isMovie ? '影片' : '剧集';
    const overlay = document.createElement('div');
    overlay.className = 'gyh-rename-overlay gyh-overlay-elevated';
    overlay.innerHTML = `<section class="gyh-rename-modal gyh-movie-key-modal gyh-movie-correct-modal" role="dialog" aria-modal="true" aria-labelledby="gyh-media-correct-title">${modalHeader({ id: 'gyh-media-correct-title', icon: ICONS.correct, title: '纠错识别', subtitle: `查找后选择正确的${mediaName}再确认`, closeLabel: '关闭纠错识别' })}<div class="gyh-rename-body"><section class="gyh-rename-section"><div class="gyh-rename-fields gyh-fields-two-column"><label class="gyh-rename-field"><span class="gyh-rename-field-label">${mediaName}名称</span><input class="gyh-rename-input" type="text" data-media-correct-title value="${escapeHtml(initialInfo.title)}" aria-label="${mediaName}名称"></label><label class="gyh-rename-field"><span class="gyh-rename-field-label">上映时间</span><input class="gyh-rename-input" type="text" inputmode="numeric" maxlength="4" data-media-correct-year value="${escapeHtml(initialInfo.year)}" placeholder="可不填" aria-label="上映时间"></label></div><div class="gyh-movie-correct-results" data-media-correct-results></div><div class="gyh-movie-key-status" data-media-correct-status></div></section></div>${modalFooter('只更新匹配预览，不会修改文件', `<button class="gyh-rename-btn" type="button" data-media-correct-cancel>取消</button><button class="gyh-rename-btn gyh-rename-btn-primary" type="button" data-media-correct-save>查找${mediaName}</button>`)}</section>`;
    const titleInput = overlay.querySelector('[data-media-correct-title]');
    const yearInput = overlay.querySelector('[data-media-correct-year]');
    const results = overlay.querySelector('[data-media-correct-results]');
    const status = overlay.querySelector('[data-media-correct-status]');
    const saveButton = overlay.querySelector('[data-media-correct-save]');
    let candidates = [];
    let selectedIndex = -1;
    const renderCandidates = () => {
      results.innerHTML = candidates.map((candidate, index) => `<button class="gyh-movie-correct-option${index === selectedIndex ? ' is-selected' : ''}" type="button" data-media-candidate="${index}"><span class="gyh-movie-correct-option-main"><span class="gyh-movie-correct-option-title">${escapeHtml(candidate.title || candidate.originalTitle || `未命名${mediaName}`)}</span><span class="gyh-movie-correct-option-original">${escapeHtml(candidate.originalTitle || '暂无原名')}</span></span><span class="gyh-movie-correct-option-year">${escapeHtml(candidate.year || '未标注')}</span></button>`).join('');
    };
    const resetCandidates = () => {
      candidates = [];
      selectedIndex = -1;
      results.innerHTML = '';
      status.className = 'gyh-movie-key-status';
      status.textContent = '';
      if (!saveButton.disabled) saveButton.textContent = `查找${mediaName}`;
    };
    const close = () => removeOverlay(overlay);
    overlay.querySelector('.gyh-rename-close').addEventListener('click', close);
    overlay.querySelector('[data-media-correct-cancel]').addEventListener('click', close);
    titleInput.addEventListener('input', resetCandidates);
    yearInput.addEventListener('input', resetCandidates);
    results.addEventListener('click', event => {
      const option = event.target.closest('[data-media-candidate]');
      if (!option) return;
      selectedIndex = Number(option.dataset.mediaCandidate);
      renderCandidates();
    });
    saveButton.addEventListener('click', async () => {
      const title = String(titleInput.value || '').trim();
      const year = String(yearInput.value || '').trim();
      if (!title) {
        status.className = 'gyh-movie-key-status is-error';
        status.textContent = `请输入${mediaName}名称`;
        return;
      }
      if (year && !/^(?:19|20)\d{2}$/.test(year)) {
        status.className = 'gyh-movie-key-status is-error';
        status.textContent = '上映时间应为四位年份';
        return;
      }
      const info = { ...initialInfo, title, year };
      if (candidates.length) {
        const match = candidates[selectedIndex];
        if (!match) {
          status.className = 'gyh-movie-key-status is-error';
          status.textContent = `请选择一个${mediaName}结果`;
          return;
        }
        saveButton.disabled = true;
        try {
          await onApply(info, match);
          close();
        } catch (error) {
          status.className = 'gyh-movie-key-status is-error';
          status.textContent = error?.message || `${mediaName}匹配失败`;
          saveButton.disabled = false;
        }
        return;
      }
      saveButton.disabled = true;
      titleInput.disabled = true;
      yearInput.disabled = true;
      saveButton.textContent = '匹配中...';
      status.className = 'gyh-movie-key-status';
      status.textContent = `正在匹配${mediaName}信息`;
      try {
        candidates = await searchCandidates(info) || [];
        selectedIndex = candidates.length ? 0 : -1;
        if (!candidates.length) {
          status.className = 'gyh-movie-key-status is-error';
          status.textContent = `没有找到匹配的${mediaName}`;
          return;
        }
        renderCandidates();
        status.className = 'gyh-movie-key-status is-success';
        status.innerHTML = `找到 <span class="gyh-movie-correct-count">${candidates.length}</span> 个结果，请选择后确认`;
        saveButton.textContent = '确认匹配';
      } catch (error) {
        status.className = 'gyh-movie-key-status is-error';
        status.textContent = error?.message || `${mediaName}匹配失败`;
      } finally {
        saveButton.disabled = false;
        titleInput.disabled = false;
        yearInput.disabled = false;
        if (!candidates.length) saveButton.textContent = `查找${mediaName}`;
      }
    });
    bindOverlay(overlay, close, { modal: '.gyh-movie-correct-modal', focus: titleInput });
  }
  // 创建命名规则设置
  function createMovieNamingRuleSection({ fields = movieNamingFields, defaultFields = defaultMovieNamingFields, examples: customExamples = {}, storageKey = '', requiredFields = [], showFolderMode = false } = {}) {
    const section = document.createElement('section');
    const savedFields = storageKey ? getStoredValue(storageKey, []) : [];
    const restoredFields = Array.isArray(savedFields) ? savedFields.filter(field => fields.includes(field)) : [];
    const state = { fields: restoredFields.length ? restoredFields : [...defaultFields] };
    requiredFields.slice().reverse().forEach(field => { if (!state.fields.includes(field)) state.fields.unshift(field); });
    const persist = () => { if (storageKey) setStoredValue(storageKey, [...state.fields]); };
    section.className = 'gyh-rename-section';
    section.innerHTML = '<div class="gyh-rename-section-head gyh-rule-section-head"><h3 class="gyh-rename-section-title">命名规则</h3><div class="gyh-movie-rule-head"><span class="gyh-movie-rule-preview" data-movie-rule-preview></span></div></div><div class="gyh-movie-rule-list" data-movie-rule-list></div><div class="gyh-movie-rule-options" data-movie-rule-options></div>' + (showFolderMode ? '<div class="gyh-movie-folder-mode" data-movie-folder-mode><div class="gyh-movie-folder-mode-options"><label class="gyh-movie-folder-option"><input type="radio" name="gyh-movie-folder-mode" value="shared"><span class="gyh-movie-folder-option-text">所有影片整理到一个文件夹</span><small class="gyh-movie-folder-option-note">统一归入“整理完成”目录</small></label><label class="gyh-movie-folder-option is-selected"><input type="radio" name="gyh-movie-folder-mode" value="separate" checked><span class="gyh-movie-folder-option-text">每部影片都使用独立文件夹</span><small class="gyh-movie-folder-option-note">按影片名称分别创建目录</small></label></div></div>' : '');
    const list = section.querySelector('[data-movie-rule-list]');
    const options = section.querySelector('[data-movie-rule-options]');
    const preview = section.querySelector('[data-movie-rule-preview]');
    const examples = { '影片名': '肖申克的救赎', '上映时间': '1994', '来源': 'BluRay', '分辨率': '2160p', '视频编码': 'H265.SDR', '音频编码': 'AAC', 'TMDB': '{tmdb-278}', ...customExamples };
    const render = () => {
      list.innerHTML = state.fields.map((field, index) => '<span class="gyh-movie-rule-token" draggable="true" data-movie-rule-index="' + index + '"><span class="gyh-movie-rule-grip" title="拖动排序">' + ICONS.grip + '</span><span>' + field + '</span>' + (requiredFields.includes(field) ? '' : '<button class="gyh-movie-rule-tool" type="button" title="移除" aria-label="移除 ' + field + '" data-movie-rule-action="remove" data-movie-rule-field="' + field + '">' + ICONS.remove + '</button>') + '</span>').join('');
      options.innerHTML = fields.map(field => '<button class="gyh-movie-rule-option' + (state.fields.includes(field) ? ' is-selected' : '') + '" type="button" data-movie-rule-action="add" data-movie-rule-field="' + field + '"' + (state.fields.includes(field) ? ' disabled' : '') + '>' + field + '</button>').join('');
      preview.textContent = '示例：' + state.fields.map(field => examples[field] || field).join('.') + '.mkv';
    };
    section.addEventListener('click', event => {
      const button = event.target.closest('[data-movie-rule-action]');
      if (!button || button.disabled) return;
      const field = button.dataset.movieRuleField;
      const index = state.fields.indexOf(field);
      if (button.dataset.movieRuleAction === 'add' && !state.fields.includes(field)) state.fields.push(field);
      if (button.dataset.movieRuleAction === 'remove' && requiredFields.includes(field)) return;
      if (button.dataset.movieRuleAction === 'remove' && index >= 0) state.fields.splice(index, 1);
      render();
      persist();
    });
    section.addEventListener('dragstart', event => { const token = event.target.closest('[data-movie-rule-index]'); if (!token) return; state.dragIndex = Number(token.dataset.movieRuleIndex); token.classList.add('is-dragging'); event.dataTransfer.effectAllowed = 'move'; });
    section.addEventListener('dragover', event => { const token = event.target.closest('[data-movie-rule-index]'); if (!token) return; event.preventDefault(); list.querySelectorAll('.is-drag-over').forEach(item => item.classList.remove('is-drag-over')); token.classList.add('is-drag-over'); });
    section.addEventListener('drop', event => { const token = event.target.closest('[data-movie-rule-index]'); if (!token || state.dragIndex === undefined) return; event.preventDefault(); const targetIndex = Number(token.dataset.movieRuleIndex); if (state.dragIndex !== targetIndex) { const [field] = state.fields.splice(state.dragIndex, 1); state.fields.splice(targetIndex, 0, field); } state.dragIndex = undefined; render(); persist(); });
    section.addEventListener('dragend', event => { const token = event.target.closest('[data-movie-rule-index]'); if (token) token.classList.remove('is-dragging'); state.dragIndex = undefined; list.querySelectorAll('.is-drag-over').forEach(item => item.classList.remove('is-drag-over')); });
    if (showFolderMode) {
      const folderOptions = [...section.querySelectorAll('.gyh-movie-folder-option')];
      section.addEventListener('change', event => {
        if (!event.target.matches('input[name="gyh-movie-folder-mode"]')) return;
        folderOptions.forEach(option => option.classList.toggle('is-selected', option.querySelector('input').checked));
      });
    }
    section.getMovieNamingRule = () => ({
      fields: [...state.fields],
      folderMode: showFolderMode ? section.querySelector('input[name="gyh-movie-folder-mode"]:checked')?.value || 'separate' : 'separate',
    });
    render();
    return section;
  }
  function buildMediaName(type, info, match, rule) {
    const isMovie = type === 'movie';
    const title = String(match?.title || info.title || '').replace(/[\\/:*?"<>|]/g, '').trim();
    const fields = rule?.fields?.length ? rule.fields : isMovie ? defaultMovieNamingFields : defaultTvNamingFields;
    const videoFormat = info.videoCodec ? [info.videoCodec, info.hq, info.dynamicRange, info.frameRate].filter(Boolean).join('.') : '';
    const releaseYear = isMovie ? (match?.resolvedYear || match?.year || info.year || '') : (info.seasonYear || match?.year || info.year || '');
    const values = { [isMovie ? '影片名' : '剧集名']: title, '季集信息': info.seasonEpisode || '', '上映时间': releaseYear, '来源': info.source || '', '分辨率': info.resolution || '', '视频编码': videoFormat, '音频编码': info.audioCodec || '', 'TMDB': match?.id ? '{tmdb-' + match.id + '}' : '' };
    return fields.map(field => values[field] || '').filter(Boolean).join('.') + info.extension;
  }
  function buildMovieName(info, match, rule) {
    return buildMediaName('movie', info, match, rule);
  }
  // 生成整理目标文件夹名（剧名 (年份) {tmdb-id}）
  function buildMediaFolderName(info, match, type = 'movie') {
    const title = String(match?.title || info.title || '').replace(/[\\/:*?"<>|]/g, '').trim();
    const tmdb = match?.id ? '{tmdb-' + match.id + '}' : '';
    const year = match?.resolvedYear || match?.year || info.year || '';
    return [title, year ? `(${year})` : '', tmdb].filter(Boolean).join(' ');
  }
  // 获取当前季的首播年份
  function getTvSeasonYear(seasons, season, fallback = '') {
    return seasons.find(item => Number(item.season) === Number(season))?.year || fallback;
  }
  // 生成剧集季目录名
  function getTvSeasonDirectoryName(season) {
    const text = String(season || '').trim();
    const value = Number(text);
    return 'Season ' + (text && Number.isFinite(value) && value >= 0 ? value : 1);
  }
  // 标记扫描计划内重复的完整目标路径
  function markDuplicateTvTargetPaths(plan) {
    const targets = new Map();
    plan.forEach(item => {
      item.targetPathConflict = false;
      if (!item.group?.match || !item.group.folderName || !item.newName) return;
      const path = [item.group.folderName, getTvSeasonDirectoryName(item.info?.season), item.newName].join('/');
      const items = targets.get(path) || [];
      items.push(item);
      targets.set(path, items);
    });
    const duplicates = new Set();
    targets.forEach((items, path) => {
      if (items.length < 2) return;
      duplicates.add(path);
      items.forEach(item => { item.targetPathConflict = true; });
    });
    return duplicates;
  }
  // 生成剧集单集目标名称
  function buildTvEpisodeName(info, match, rule) {
    return buildMediaName('tv', info, match, rule);
  }
  // 递归收集剧集视频文件
  async function collectTvEpisodes(folder, onProgress) {
    return walkResources([folder], {
      isFile: resource => resource.resType === 1,
      getChildren: resource => getGuangyaFiles(resource.id),
      acceptFile: resource => isVideoFile(resource) && getMovieFileSize(resource) > MIN_MEDIA_SIZE,
      nextPath: (path, resource) => [...path, resource],
      mapFile: (resource, path) => {
        const parentFolder = path.length > 0 ? path[path.length - 1] : folder;
        return { file: { ...resource, path: path.map(item => item.name) }, sourceFolder: folder, parentFolder };
      },
      onFolder: (resource, count) => onProgress?.(count),
    });
  }
  // 汇总剧集各季集数
  function getTvSeasonSummary(group) {
    const local = new Map();
    (group.entries || []).forEach(item => {
      const season = Number(item.info.season || 1);
      const value = local.get(season) || { season, entries: [], ready: 0 };
      value.entries.push(item);
      if (item.newName) value.ready += 1;
      local.set(season, value);
    });
    const totals = new Map((group.seasons || []).map(item => [Number(item.season), Number(item.total) || 0]));
    return [...local.keys()].sort((a, b) => a - b).map(season => {
      const value = local.get(season) || { season, entries: [], ready: 0 };
      return { ...value, total: totals.get(season) || value.entries.length };
    });
  }
  // 生成剧集季集概览文字
  function formatTvSeasonSummary(group) {
    return getTvSeasonSummary(group).map(item => (item.season === 0 ? '特别篇' : item.season + '季') + ' ' + item.ready + '/' + item.total + '集').join('｜');
  }
  // 渲染剧集整理预览
  function renderTvPlan(previewBody, groups) {
    previewBody.innerHTML = groups.map(group => {
      const ready = (group.entries || []).filter(item => item.newName).length;
      const hasConflict = (group.entries || []).some(item => item.targetPathConflict);
      const summary = formatTvSeasonSummary(group);
      const target = group.match ? group.folderName + (summary ? '｜' + summary : '') : '未匹配';
      const status = hasConflict ? '路径重复' : group.match && ready ? (group.status || '待整理') : '已跳过';
      return '<div class="gyh-movie-preview-row gyh-rename-row gyh-organizer-grid' + (hasConflict ? ' is-failed' : '') + '" data-tv-row="' + group.id + '"><span class="gyh-movie-preview-name" title="' + escapeHtml(group.folder.name) + '">' + escapeHtml(group.folder.name) + '</span><button class="gyh-tv-preview-target gyh-movie-preview-match gyh-rename-row-name is-new" type="button" data-tv-details="' + group.id + '" title="' + escapeHtml(target) + '">' + escapeHtml(target) + '</button><button class="gyh-movie-preview-correct" type="button" data-tv-correct="' + group.id + '">纠错</button><span class="gyh-movie-preview-status gyh-rename-row-status">' + escapeHtml(status) + '</span></div>';
    }).join('');
  }
  // 刷新剧集文件夹处理状态
  function refreshTvGroupRow(previewBody, group) {
    const row = previewBody.querySelector('[data-tv-row="' + group.id + '"]');
    const runnable = (group.entries || []).filter(item => item.newName);
    const pending = runnable.some(item => item.status === '待整理' || item.status === '整理中');
    const failed = runnable.some(item => item.status === '已失败');
    group.status = !runnable.length ? '已跳过' : pending ? '整理中' : failed ? '已失败' : '已整理';
    if (!row) return;
    setPreviewRowState(row, { '整理中': 'processing', '已整理': 'success', '已失败': 'failed' }[group.status] || '', group.status);
  }
  // 渲染电影匹配预览
  function renderMoviePlan(previewBody, plan) {
    previewBody.innerHTML = plan.map((item, index) => {
      const sourcePath = [...(item.file.path || []), item.file.name].join('/');
      const targetDir = item.match ? buildMediaFolderName(item.info, item.match) : '';
      const target = item.newName ? (targetDir ? targetDir + '/' : '') + item.newName : (item.match ? item.match.title : '未匹配');
      const matchCell = '<span class="gyh-movie-preview-match gyh-rename-row-name is-new" title="' + escapeHtml(target) + '">' + escapeHtml(target) + '</span>';
      const correctButton = '<button class="gyh-movie-preview-correct" type="button" data-movie-correct="' + index + '">纠错</button>';
      const statusCell = '<span class="gyh-movie-preview-status gyh-rename-row-status">' + escapeHtml(item.status) + '</span>';
      return '<div class="gyh-movie-preview-row gyh-rename-row gyh-organizer-grid" data-movie-row="' + index + '"><span class="gyh-movie-preview-name" title="' + escapeHtml(sourcePath) + '">' + escapeHtml(sourcePath) + '</span>' + matchCell + correctButton + statusCell + '</div>';
    }).join('');
  }
  // 执行电影整理任务
  async function executeMoviePlan(overlay, previewBody, footerNote, startButton, plan, resources) {
    const runnable = plan.filter(item => item.match && item.newName && item.status !== '已完成');
    if (!runnable.length) {
      showToast('没有可整理的匹配结果', 'error');
      return false;
    }
    startButton.disabled = true;
    startButton.textContent = '整理中...';
    previewBody.classList.add('is-organizing');
    overlay.querySelector('[data-tmdb-settings]').disabled = true;
    overlay.querySelector('.gyh-rename-close').disabled = true;
    overlay.querySelector('[data-movie-cancel]').disabled = true;
    const parentId = getCurrentGuangyaDirectoryId();
    const movieDirectoryIds = new Map();
    let success = 0;
    let failed = 0;
    for (let index = 0; index < runnable.length; index += 1) {
      const item = runnable[index];
      const row = previewBody.querySelector('[data-movie-row="' + plan.indexOf(item) + '"]');
      if (row) revealRenameRow(previewBody, row);
      setPreviewRowState(row, 'processing', '整理中');
      try {
        const directoryName = buildMediaFolderName(item.info, item.match);
        if (!directoryName) throw new Error('无法生成影片目录名称');
        let itemTargetId = movieDirectoryIds.get(directoryName);
        if (!itemTargetId) {
          itemTargetId = await ensureMovieDirectory(parentId, directoryName);
          movieDirectoryIds.set(directoryName, itemTargetId);
        }
        if (item.file.name !== item.newName) await renameGuangyaFile(item.file.id, item.newName);
        try {
          await moveGuangyaFile(item.file.id, itemTargetId);
        } catch (moveError) {
          let targetChildren = [];
          try { targetChildren = await getGuangyaFiles(itemTargetId); } catch (listError) {}
          const alreadyThere = targetChildren.some(child => String(child.id) === String(item.file.id) || child.name === item.newName);
          if (!alreadyThere) throw moveError;
        }
        item.status = '已整理';
        setPreviewRowState(row, 'success', '已整理');
        success += 1;
      } catch (error) {
        item.status = '已失败';
        setPreviewRowState(row, 'failed', '已失败');
        failed += 1;
      }
      if (index < runnable.length - 1) await delay(0);
    }
    const targetDirIds = new Set([...movieDirectoryIds.values()].map(id => String(id)));
    const sourceFolders = resources.filter(resource => resource.resType !== 1 && resource.name !== '整理完成' && resource.name !== '残留文件' && !targetDirIds.has(String(resource.id)));
    let residualFailed = 0;
    if (sourceFolders.length && !failed) {
      footerNote.textContent = '正在清理源文件夹';
      try {
        await deleteGuangyaFiles(sourceFolders.map(folder => folder.id));
      } catch (error) {
        residualFailed = sourceFolders.length;
      }
    }
    startButton.disabled = false;
    startButton.textContent = '关闭';
    overlay.querySelector('.gyh-rename-close').disabled = false;
    overlay.querySelector('[data-movie-cancel]').disabled = false;
    overlay._gyhShouldRefresh = true;
    footerNote.textContent = '整理完成 ' + success + '/' + runnable.length + ' · 失败 ' + failed;
    showToast(failed || residualFailed ? '电影整理完成，失败 ' + (failed + residualFailed) + ' 项' : '电影整理完成', failed || residualFailed ? 'error' : 'success');
    return true;
  }
  // 打开电影整理预览
  function showMovieDesigner(resources) {
    if (overlays.movie) return;
    const folderCount = resources.filter(resource => resource.resType !== 1).length;
    const fileCount = resources.length - folderCount;
    const rows = resources.map(resource => `<div class="gyh-movie-preview-row gyh-organizer-grid"><span class="gyh-movie-preview-name" title="${escapeHtml(resource.name)}">${escapeHtml(resource.name)}</span><span class="gyh-movie-preview-match">${resource.resType === 1 ? '待匹配 TMDB' : '递归读取视频'}</span><span></span><span class="gyh-movie-preview-status gyh-rename-row-status">待整理</span></div>`).join('');
    const overlay = document.createElement('div');
    overlay.className = 'gyh-rename-overlay';
    overlay.innerHTML = `<section class="gyh-rename-modal gyh-movie-modal gyh-movie-organizer-modal" role="dialog" aria-modal="true" aria-labelledby="gyh-movie-title">${modalHeader({ id: 'gyh-movie-title', icon: ICONS.movie, title: '整理电影', subtitle: '匹配 TMDB 后预览，确认后再整理', closeLabel: '关闭整理电影' })}<div class="gyh-rename-body"><section class="gyh-rename-section"><div class="gyh-rename-section-head"><h3 class="gyh-rename-section-title">扫描范围</h3><button class="gyh-rename-btn" type="button" data-tmdb-settings>TMDB 设置</button></div><div class="gyh-movie-scope"><div class="gyh-movie-scope-item"><span class="gyh-movie-scope-label">已选资源</span><span class="gyh-movie-scope-value">${resources.length} 项</span></div><div class="gyh-movie-scope-item"><span class="gyh-movie-scope-label">文件与文件夹</span><span class="gyh-movie-scope-value">${fileCount} 文件 · ${folderCount} 文件夹</span></div><div class="gyh-movie-scope-item"><span class="gyh-movie-scope-label">视频筛选</span><span class="gyh-movie-scope-value">大于 10MB</span></div></div></section><section class="gyh-rename-section"><div class="gyh-rename-section-head"><h3 class="gyh-rename-section-title">名称预览</h3><span class="gyh-rename-section-hint">确认前不会修改文件</span></div><div class="gyh-movie-preview"><div class="gyh-movie-preview-head gyh-organizer-grid gyh-organizer-grid-head"><span>原文件或文件夹</span><span>TMDB 匹配</span><span>状态</span></div><div class="gyh-movie-preview-body">${rows}</div></div></section></div><footer class="gyh-rename-footer"><span class="gyh-movie-footer-note">当前为预览准备阶段，真实整理功能即将接入</span><div class="gyh-rename-footer-actions"><button class="gyh-rename-btn" type="button" data-movie-cancel>关闭</button><button class="gyh-rename-btn gyh-rename-btn-primary" type="button" disabled>开始匹配</button></div></footer></section>`;
    overlays.movie = overlay;
    const movieBody = overlay.querySelector('.gyh-rename-body');
    overlay.querySelector('[data-movie-cancel]').textContent = '取消';
    const previewSection = movieBody.querySelectorAll('.gyh-rename-section')[1];
    const namingRuleSection = createMovieNamingRuleSection({ storageKey: MOVIE_NAMING_RULE_STORAGE, requiredFields: ['影片名'] });
    movieBody.insertBefore(namingRuleSection, previewSection);
    const previewBody = overlay.querySelector('.gyh-movie-preview-body');
    const previewHead = overlay.querySelector('.gyh-movie-preview-head span:nth-child(2)');
    const footerNote = overlay.querySelector('.gyh-movie-footer-note');
    const startButton = overlay.querySelector('.gyh-rename-btn-primary');
    footerNote.textContent = '扫描后预览，确认才会修改文件';
    let moviePlan = [];
    let activeNamingRule = { fields: [...defaultMovieNamingFields] };
    let hasScanned = false;
    let hasCompleted = false;
    startButton.disabled = false;
    startButton.textContent = '扫描并匹配';
    const close = () => closeDesigner('movie', true);
    overlay.querySelector('.gyh-rename-close').addEventListener('click', close);
    overlay.querySelector('[data-movie-cancel]').addEventListener('click', close);
    overlay.querySelector('[data-tmdb-settings]').addEventListener('click', () => {
      const parentOverlay = overlays.movie;
      parentOverlay.classList.add('gyh-is-hidden');
      overlays.movie = null;
      const restore = () => { if (!document.body.contains(parentOverlay)) return; parentOverlay.classList.remove('gyh-is-hidden'); overlays.movie = parentOverlay; };
      showTmdbConfig(() => restore(), restore);
    });
    // 打开纠错匹配弹窗
    const showMovieCorrection = index => {
      const item = moviePlan[index];
      if (!item) return;
      showTmdbCorrection({
        type: 'movie',
        info: item.info,
        searchCandidates: info => searchTmdbMovieCandidates(info, { preferTitle: true }),
        async onApply(info, match) {
          item.info = info;
          item.match = await resolveMovieMatchYear(info, match);
          item.newName = buildMovieName(info, item.match, activeNamingRule);
          const targetDir = buildMediaFolderName(info, item.match);
          const currentDir = (item.file.path || []).length ? item.file.path[item.file.path.length - 1] : '';
          item.status = item.match && item.newName === item.file.name && currentDir === targetDir ? '已完成' : '待确认';
          renderMoviePlan(previewBody, moviePlan);
          const matched = moviePlan.filter(entry => entry.match).length;
          const done = moviePlan.filter(entry => entry.status === '已完成').length;
          const pending = matched - done;
          footerNote.textContent = '匹配完成 ' + matched + ' 个 · 已完成 ' + done + ' 个 · 跳过 ' + (moviePlan.length - matched) + ' 个' + (pending ? ' · 确认后才会修改文件' : '');
          startButton.disabled = pending === 0;
        },
      });
    };
    previewBody.addEventListener('click', event => {
      const button = event.target.closest('[data-movie-correct]');
      if (!button || !hasScanned || hasCompleted || overlay.querySelector('.gyh-rename-close').disabled) return;
      showMovieCorrection(Number(button.dataset.movieCorrect));
    });
    startButton.addEventListener('click', async () => {
      if (hasCompleted) { close(); return; }
      if (hasScanned) {
        try { hasCompleted = await executeMoviePlan(overlay, previewBody, footerNote, startButton, moviePlan, resources); } catch (error) { previewBody.classList.remove('is-organizing'); startButton.disabled = false; startButton.textContent = '确认整理'; overlay.querySelector('[data-tmdb-settings]').disabled = false; overlay.querySelector('.gyh-rename-close').disabled = false; overlay.querySelector('[data-movie-cancel]').disabled = false; showToast(error.message || '电影整理失败', 'error'); }
        return;
      }
      startButton.disabled = true;
      startButton.textContent = '扫描中...';
      footerNote.textContent = '正在递归读取视频文件';
      try {
        activeNamingRule = namingRuleSection.getMovieNamingRule();
        const videos = await collectMovieVideos(resources, count => { footerNote.textContent = '已发现 ' + count + ' 个视频'; });
        const videosPerDirectory = new Map();
        videos.forEach(file => {
          const directoryKey = (file.path || []).join('\u0000');
          videosPerDirectory.set(directoryKey, (videosPerDirectory.get(directoryKey) || 0) + 1);
        });
        moviePlan = [];
        for (const file of videos) {
          const directoryKey = (file.path || []).join('\u0000');
          const preferFileTitle = videosPerDirectory.get(directoryKey) > 1 || (file.path || []).some(isMovieCollectionFolder);
          const info = parseMovieName(file.name, file.path, { preferFileTitle });
          footerNote.textContent = '正在匹配：' + info.title;
          const match = await searchTmdbMovie(info, { preferTitle: preferFileTitle });
          const resolvedMatch = match ? await resolveMovieMatchYear(info, match) : null;
          const newName = resolvedMatch ? buildMovieName(info, resolvedMatch, activeNamingRule) : '';
          const targetDir = resolvedMatch ? buildMediaFolderName(info, resolvedMatch) : '';
          const currentDir = (file.path || []).length ? file.path[file.path.length - 1] : '';
          const alreadyDone = resolvedMatch && newName === file.name && currentDir === targetDir;
          moviePlan.push({ file, info, match: resolvedMatch, newName, status: alreadyDone ? '已完成' : (resolvedMatch ? '待确认' : '已跳过') });
        }
        hasScanned = true;
        previewHead.textContent = '目标名称';
        renderMoviePlan(previewBody, moviePlan);
        const matched = moviePlan.filter(item => item.match).length;
        const done = moviePlan.filter(item => item.status === '已完成').length;
        const skipped = moviePlan.length - matched;
        const pending = matched - done;
        startButton.disabled = pending === 0;
        startButton.textContent = '确认整理';
        footerNote.textContent = '匹配完成 ' + matched + ' 个 · 已完成 ' + done + ' 个 · 跳过 ' + skipped + ' 个' + (pending ? ' · 确认后才会修改文件' : '');
      } catch (error) {
        startButton.disabled = false;
        startButton.textContent = '重新扫描';
        footerNote.textContent = error.message || '扫描失败';
        showToast(error.message || '电影扫描失败', 'error');
      }
    });
    bindOverlay(overlay, close, { modal: '.gyh-movie-modal' });
  }
  // 打开剧集整理预览
  function showTvDesigner(folders) {
    if (overlays.tv) return;
    const rows = folders.map(folder => '<div class="gyh-movie-preview-row gyh-organizer-grid"><span class="gyh-movie-preview-name" title="' + escapeHtml(folder.name) + '">' + escapeHtml(folder.name) + '</span><span class="gyh-movie-preview-match">待扫描剧集</span><span></span><span class="gyh-movie-preview-status gyh-rename-row-status">待整理</span></div>').join('');
    const overlay = document.createElement('div');
    overlay.className = 'gyh-rename-overlay';
    overlay.innerHTML = `<section class="gyh-rename-modal gyh-movie-modal gyh-tv-organizer-modal" role="dialog" aria-modal="true" aria-labelledby="gyh-tv-title">${modalHeader({ id: 'gyh-tv-title', icon: ICONS.tv, title: '整理剧集', subtitle: '匹配 TMDB 后预览，确认后再整理', closeLabel: '关闭整理剧集' })}<div class="gyh-rename-body"><section class="gyh-rename-section"><div class="gyh-rename-section-head"><h3 class="gyh-rename-section-title">扫描范围</h3><button class="gyh-rename-btn" type="button" data-tmdb-settings>TMDB 设置</button></div><div class="gyh-movie-scope"><div class="gyh-movie-scope-item"><span class="gyh-movie-scope-label">已选文件夹</span><span class="gyh-movie-scope-value">${folders.length} 个</span></div><div class="gyh-movie-scope-item"><span class="gyh-movie-scope-label">识别方式</span><span class="gyh-movie-scope-value">文件夹优先</span></div><div class="gyh-movie-scope-item"><span class="gyh-movie-scope-label">视频筛选</span><span class="gyh-movie-scope-value">大于 10MB</span></div></div></section><section class="gyh-rename-section"><div class="gyh-rename-section-head"><h3 class="gyh-rename-section-title">名称预览</h3><span class="gyh-rename-section-hint">确认前不会修改文件</span></div><div class="gyh-movie-preview"><div class="gyh-movie-preview-head gyh-organizer-grid gyh-organizer-grid-head"><span>原文件夹</span><span>目标路径</span><span>状态</span></div><div class="gyh-movie-preview-body">${rows}</div></div></section></div><footer class="gyh-rename-footer"><span class="gyh-movie-footer-note">扫描后预览，确认才会修改文件</span><div class="gyh-rename-footer-actions"><button class="gyh-rename-btn" type="button" data-tv-cancel>取消</button><button class="gyh-rename-btn gyh-rename-btn-primary" type="button">扫描并匹配</button></div></footer></section>`;
    overlays.tv = overlay;
    const body = overlay.querySelector('.gyh-rename-body');
    const previewSection = body.querySelectorAll('.gyh-rename-section')[1];
    const namingRuleSection = createMovieNamingRuleSection({ fields: tvNamingFields, defaultFields: defaultTvNamingFields, examples: { '剧集名': '赦罪', '季集信息': 'S01E01', '上映时间': '2026', '来源': 'WEB-DL', '分辨率': '2160p', '视频编码': 'H265.HDR', '音频编码': 'AAC', 'TMDB': '{tmdb-111}' }, storageKey: TV_NAMING_RULE_STORAGE, requiredFields: ['剧集名', '季集信息'] });
    body.insertBefore(namingRuleSection, previewSection);
    const previewBody = overlay.querySelector('.gyh-movie-preview-body');
    const footerNote = overlay.querySelector('.gyh-movie-footer-note');
    const startButton = overlay.querySelector('.gyh-rename-btn-primary');
    let tvPlan = [];
    let tvGroups = [];
    let activeNamingRule = { fields: [...defaultTvNamingFields] };
    let hasScanned = false;
    let hasCompleted = false;
    const close = () => closeDesigner('tv', true);
    const updateSummary = () => {
      const duplicateTargets = markDuplicateTvTargetPaths(tvPlan);
      const matched = tvGroups.filter(group => group.match).length;
      const ready = tvPlan.filter(item => item.newName).length;
      footerNote.textContent = duplicateTargets.size
        ? '发现 ' + duplicateTargets.size + ' 个重复目标路径，请修正后重新扫描'
        : '匹配剧集 ' + matched + '/' + tvGroups.length + ' 部 · 可整理 ' + ready + ' 集 · 确认后才会修改文件';
      startButton.disabled = ready === 0 || duplicateTargets.size > 0;
      return duplicateTargets;
    };
    overlay.querySelector('.gyh-rename-close').addEventListener('click', close);
    overlay.querySelector('[data-tv-cancel]').addEventListener('click', close);
    overlay.querySelector('[data-tmdb-settings]').addEventListener('click', () => {
      const parentOverlay = overlays.tv;
      parentOverlay.classList.add('gyh-is-hidden');
      overlays.tv = null;
      const restore = () => { if (!document.body.contains(parentOverlay)) return; parentOverlay.classList.remove('gyh-is-hidden'); overlays.tv = parentOverlay; };
      showTmdbConfig(restore, restore);
    });
    // 打开剧集纠错弹窗
    const showTvCorrection = groupId => {
      const group = tvGroups.find(item => item.id === groupId);
      if (!group) return;
      showTmdbCorrection({
        type: 'tv',
        info: group.info,
        searchCandidates: searchTmdbTvCandidates,
        async onApply(info, match) {
          group.info = info;
          group.match = match;
          group.seasons = await getTmdbTvSeasons(match.id).catch(() => []);
          group.folderName = buildMediaFolderName(info, match, 'tv');
          tvPlan.filter(item => item.group.id === group.id).forEach(item => {
            item.info = { ...item.info, title: info.title, year: info.year, seasonYear: getTvSeasonYear(group.seasons, item.info.season, match?.year || info.year) };
            item.newName = item.info.seasonEpisode ? buildTvEpisodeName(item.info, match, activeNamingRule) : '';
            item.status = item.newName ? '待整理' : '已跳过';
          });
          const duplicateTargets = updateSummary();
          renderTvPlan(previewBody, tvGroups);
          if (duplicateTargets.size) showToast('发现 ' + duplicateTargets.size + ' 个重复目标路径，请修正后重新扫描', 'error');
        },
      });
    };
    // 打开剧集整理详情
    const showTvDetails = groupId => {
      const group = tvGroups.find(item => item.id === groupId);
      if (!group) return;
      const detailsOverlay = document.createElement('div');
      const seasonSections = getTvSeasonSummary(group).map(season => {
        const rows = season.entries.sort((a, b) => Number(a.info.episode || 0) - Number(b.info.episode || 0)).map(item => '<div class="gyh-movie-preview-row gyh-rename-row gyh-preview-two-column"><span class="gyh-movie-preview-name" title="' + escapeHtml(item.file.name) + '">' + escapeHtml(item.file.name) + '</span><span class="gyh-movie-preview-match gyh-rename-row-name is-new" title="' + escapeHtml(item.newName || '缺少季集信息') + '">' + escapeHtml(item.newName || '缺少季集信息') + '</span></div>').join('');
        const seasonName = season.season === 0 ? '特别篇' : '第 ' + season.season + ' 季';
        return '<section class="gyh-rename-section"><div class="gyh-rename-section-head"><h3 class="gyh-rename-section-title">' + seasonName + '</h3><span class="gyh-rename-section-hint">' + season.ready + '/' + season.total + ' 集可整理</span></div><div class="gyh-movie-preview"><div class="gyh-movie-preview-head gyh-preview-two-column"><span>原文件</span><span>目标名称</span></div><div class="gyh-movie-preview-body gyh-preview-compact">' + (rows || '<div class="gyh-rename-row gyh-preview-single-column"><span class="gyh-rename-row-name">暂无本季文件</span></div>') + '</div></div></section>';
      }).join('') || '<section class="gyh-rename-section"><span class="gyh-rename-section-hint">暂无可整理的剧集文件</span></section>';
      detailsOverlay.className = 'gyh-rename-overlay gyh-overlay-elevated';
      detailsOverlay.innerHTML = `<section class="gyh-rename-modal gyh-movie-modal" role="dialog" aria-modal="true" aria-labelledby="gyh-tv-details-title">${modalHeader({ id: 'gyh-tv-details-title', icon: ICONS.details, title: '剧集整理详情', subtitle: escapeHtml(group.folderName || group.folder.name), closeLabel: '关闭剧集整理详情' })}<div class="gyh-rename-body">${seasonSections}</div>${modalFooter('仅展示预览，不会修改文件', '<button class="gyh-rename-btn" type="button" data-tv-details-close>关闭</button>')}</section>`;
      const closeDetails = () => removeOverlay(detailsOverlay);
      detailsOverlay.querySelector('.gyh-rename-close').addEventListener('click', closeDetails);
      detailsOverlay.querySelector('[data-tv-details-close]').addEventListener('click', closeDetails);
      bindOverlay(detailsOverlay, closeDetails, { modal: '.gyh-movie-modal' });
    };
    previewBody.addEventListener('click', event => {
      const target = event.target.closest('[data-tv-details]');
      if (target && hasScanned && !overlay.querySelector('.gyh-rename-close').disabled) {
        showTvDetails(target.dataset.tvDetails);
        return;
      }
      const button = event.target.closest('[data-tv-correct]');
      if (!button || !hasScanned || hasCompleted || overlay.querySelector('.gyh-rename-close').disabled) return;
      showTvCorrection(button.dataset.tvCorrect);
    });
    startButton.addEventListener('click', async () => {
      if (hasCompleted) { close(); return; }
      if (hasScanned) {
        try { hasCompleted = await executeTvPlan(overlay, previewBody, footerNote, startButton, tvPlan, folders); } catch (error) { previewBody.classList.remove('is-organizing'); startButton.disabled = false; startButton.textContent = '确认整理'; overlay.querySelector('[data-tmdb-settings]').disabled = false; overlay.querySelector('.gyh-rename-close').disabled = false; overlay.querySelector('[data-tv-cancel]').disabled = false; showToast(error.message || '剧集整理失败', 'error'); }
        return;
      }
      startButton.disabled = true;
      startButton.textContent = '扫描中...';
      footerNote.textContent = '正在读取剧集文件夹';
      try {
        activeNamingRule = namingRuleSection.getMovieNamingRule();
        tvPlan = [];
        tvGroups = [];
        for (const folder of folders) {
          footerNote.textContent = '正在读取：' + folder.name;
          const episodes = await collectTvEpisodes(folder, count => { footerNote.textContent = folder.name + ' · 已发现 ' + count + ' 集'; });
          if (!episodes.length) continue;
          const folderInfo = parseMovieName(folder.name);
          const first = episodes[0];
          const firstInfo = parseTvEpisode(first.file, folder);
          const info = { ...firstInfo, title: extractTvTitle(folder.name) || firstInfo.title, year: folderInfo.year || firstInfo.year };
          footerNote.textContent = '正在匹配：' + info.title;
          const match = await searchTmdbTv(info);
          const seasons = match ? await getTmdbTvSeasons(match.id).catch(() => []) : [];
          const group = { id: String(folder.id), folder, info, match, seasons, folderName: match ? buildMediaFolderName(info, match, 'tv') : '', entries: [] };
          tvGroups.push(group);
          episodes.forEach((episode, index) => {
            const parsedInfo = parseTvEpisode(episode.file, folder);
            const episodeInfo = { ...parsedInfo, title: info.title, year: info.year, seasonYear: getTvSeasonYear(seasons, parsedInfo.season, match?.year || info.year) };
            const newName = match && episodeInfo.seasonEpisode ? buildTvEpisodeName(episodeInfo, match, activeNamingRule) : '';
            const item = { file: episode.file, sourceFolder: folder, group, info: episodeInfo, newName, status: newName ? '待整理' : '已跳过' };
            group.entries.push(item);
            tvPlan.push(item);
          });
        }
        hasScanned = true;
        startButton.textContent = '确认整理';
        const duplicateTargets = updateSummary();
        renderTvPlan(previewBody, tvGroups);
        if (duplicateTargets.size) showToast('发现 ' + duplicateTargets.size + ' 个重复目标路径，请修正后重新扫描', 'error');
      } catch (error) {
        startButton.disabled = false;
        startButton.textContent = '重新扫描';
        footerNote.textContent = error.message || '扫描失败';
        showToast(error.message || '剧集扫描失败', 'error');
      }
    });
    bindOverlay(overlay, close, { modal: '.gyh-movie-modal' });
  }
  // 执行剧集整理任务
  async function executeTvPlan(overlay, previewBody, footerNote, startButton, plan, folders) {
    const duplicateTargets = markDuplicateTvTargetPaths(plan);
    if (duplicateTargets.size) {
      footerNote.textContent = '发现 ' + duplicateTargets.size + ' 个重复目标路径，请修正后重新扫描';
      startButton.disabled = true;
      showToast('存在重复目标路径，已停止整理', 'error');
      return false;
    }
    const runnable = plan.filter(item => item.group.match && item.newName);
    if (!runnable.length) {
      showToast('没有可整理的剧集', 'error');
      return false;
    }
    startButton.disabled = true;
    startButton.textContent = '整理中...';
    previewBody.classList.add('is-organizing');
    overlay.querySelector('[data-tmdb-settings]').disabled = true;
    overlay.querySelector('.gyh-rename-close').disabled = true;
    overlay.querySelector('[data-tv-cancel]').disabled = true;
    const parentId = getCurrentGuangyaDirectoryId();
    let success = 0;
    let failed = 0;
    const groups = [...new Map(plan.map(item => [item.group.id, item.group])).values()];
    const matched = groups.filter(group => group.match).length;
    const selectedFolderIds = new Set(folders.map(folder => String(folder.id)));
    const updateFooterProgress = () => { footerNote.innerHTML = '匹配剧集 ' + matched + '/' + groups.length + ' 部 · 可整理 ' + runnable.length + ' 集 · 已整理 <span class="gyh-count-success">' + success + '</span> 集 · 失败 <span class="gyh-count-failed">' + failed + '</span> 集'; };
    updateFooterProgress();
    let residualFailed = 0;
    for (const group of groups) {
      const groupItems = runnable.filter(item => item.group.id === group.id);
      if (!groupItems.length) continue;
      const row = previewBody.querySelector('[data-tv-row="' + group.id + '"]');
      groupItems.forEach(item => { item.status = '整理中'; });
      refreshTvGroupRow(previewBody, group);
      if (row) revealRenameRow(previewBody, row);
      updateFooterProgress();
      let showId = '';
      try {
        showId = await ensureMovieDirectory(parentId, group.folderName);
      } catch (error) {
        groupItems.forEach(item => { item.status = '已失败'; });
        failed += groupItems.length;
        refreshTvGroupRow(previewBody, group);
        updateFooterProgress();
        continue;
      }
      let shouldMoveResidual = true;
      const seasonBuckets = new Map();
      groupItems.forEach(item => {
        const seasonName = getTvSeasonDirectoryName(item.info.season);
        const bucket = seasonBuckets.get(seasonName) || { seasonName, items: [] };
        bucket.items.push(item);
        seasonBuckets.set(seasonName, bucket);
      });
      for (const bucket of seasonBuckets.values()) {
        try {
          bucket.targetId = await ensureMovieDirectory(showId, bucket.seasonName);
        } catch (error) {
          bucket.items.forEach(item => { item.status = '已失败'; });
          failed += bucket.items.length;
          shouldMoveResidual = false;
          refreshTvGroupRow(previewBody, group);
        }
        updateFooterProgress();
      }
      for (const bucket of seasonBuckets.values()) {
        if (!bucket.targetId) continue;
        try {
          await moveGuangyaFiles(bucket.items.map(item => item.file.id), bucket.targetId);
          bucket.items.forEach(item => { item._gyhMoved = true; });
        } catch (error) {
          let movedIds = new Set();
          try { movedIds = new Set((await getGuangyaFiles(bucket.targetId)).map(file => file.id)); } catch (listError) {}
          for (const item of bucket.items) {
            try {
              if (!movedIds.has(item.file.id)) await moveGuangyaFile(item.file.id, bucket.targetId);
              item._gyhMoved = true;
            } catch (moveError) {
              item.status = '已失败';
              failed += 1;
            }
          }
        }
        refreshTvGroupRow(previewBody, group);
        updateFooterProgress();
      }
      const movedItems = groupItems.filter(item => item._gyhMoved);
      for (let index = 0; index < movedItems.length; index += 1) {
        const item = movedItems[index];
        item.status = '整理中';
        refreshTvGroupRow(previewBody, group);
        if (row) revealRenameRow(previewBody, row);
        try {
          if (item.file.name !== item.newName) await renameGuangyaFile(item.file.id, item.newName);
          item.status = '已整理';
          success += 1;
        } catch (error) {
          item.status = '已失败';
          failed += 1;
        }
        refreshTvGroupRow(previewBody, group);
        updateFooterProgress();
        if (index < movedItems.length - 1) await delay(0);
      }
      if (shouldMoveResidual && selectedFolderIds.has(String(group.folder.id))) {
        const groupHasFailure = groupItems.some(item => item.status === '已失败');
        if (!groupHasFailure) {
          try {
            if (String(group.folder.id) !== String(showId)) {
              await deleteGuangyaFiles([group.folder.id]);
            } else {
              const targetSeasonDirIds = new Set([...seasonBuckets.values()].filter(b => b.targetId).map(b => String(b.targetId)));
              let rootChildren = [];
              try { rootChildren = await getGuangyaFiles(showId); } catch (error) {}
              const sourceFolderIds = rootChildren.filter(child => child.resType !== 1 && !targetSeasonDirIds.has(String(child.id))).map(child => String(child.id));
              if (sourceFolderIds.length) await deleteGuangyaFiles(sourceFolderIds);
            }
          } catch (error) {
            residualFailed += 1;
          }
        }
      }
      refreshTvGroupRow(previewBody, group);
      updateFooterProgress();
    }
    startButton.disabled = false;
    startButton.textContent = '关闭';
    overlay.querySelector('.gyh-rename-close').disabled = false;
    overlay.querySelector('[data-tv-cancel]').disabled = false;
    overlay._gyhShouldRefresh = true;
    updateFooterProgress();
    showToast(failed || residualFailed ? '剧集整理完成，失败 ' + failed + ' 集' : '剧集整理完成', failed || residualFailed ? 'error' : 'success');
    return true;
  }
  // 打开批量重命名弹窗
  function showRenameDesigner(inputFiles) {
    if (overlays.rename) return;
    // 文件列表默认按文件名升序（自然排序，数字敏感），序号与预览顺序保持一致
    const files = [...inputFiles].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'zh-CN', { numeric: true, sensitivity: 'base' }));
    const overlay = document.createElement('div');
    overlay.className = 'gyh-rename-overlay';
    overlay.innerHTML = `
      <section class="gyh-rename-modal gyh-batch-rename-modal" role="dialog" aria-modal="true" aria-labelledby="gyh-rename-title">
        ${modalHeader({ id: 'gyh-rename-title', icon: ICONS.rename, title: '批量重命名', subtitle: '设置规则并预览文件的新名称', closeLabel: '关闭批量重命名' })}
        <div class="gyh-rename-body">
          <section class="gyh-rename-section">
            <div class="gyh-rename-section-head">
              <h3 class="gyh-rename-section-title">重命名方式</h3>
              <span class="gyh-rename-section-hint">选择一种处理规则</span>
            </div>
            <div class="gyh-rename-modes" role="tablist" aria-label="重命名方式">
              ${renameModes.map((mode, index) => `<button class="gyh-rename-mode${index === 0 ? ' is-active' : ''}" type="button" role="tab" aria-selected="${index === 0}" data-rename-mode="${mode.key}">${mode.label}</button>`).join('')}
            </div>
          </section>
          <section class="gyh-rename-section">
            <div class="gyh-rename-section-head">
              <h3 class="gyh-rename-section-title">规则设置</h3>
              <span class="gyh-rename-section-hint" data-rename-mode-label>查找替换重命名</span>
            </div>
            <div class="gyh-rename-fields" data-rename-fields></div>
          </section>
          <section class="gyh-rename-section">
            <div class="gyh-rename-section-head">
              <h3 class="gyh-rename-section-title">名称预览</h3>
              <label class="gyh-rename-video-filter"><input type="checkbox" data-rename-video-filter>仅视频</label>
            </div>
            <div class="gyh-rename-preview">
              <div class="gyh-rename-preview-head"><span>原文件名</span><span></span><span>新文件名</span><span>状态</span></div>
              <div class="gyh-rename-preview-body" data-rename-preview-content></div>
            </div>
          </section>
        </div>
        <footer class="gyh-rename-footer">
          <span class="gyh-rename-footer-note" data-rename-footer-note>当前选择 ${files.length} 个文件</span>
          <div class="gyh-rename-footer-actions">
            <button class="gyh-rename-btn" type="button" data-rename-cancel>取消</button>
            <button class="gyh-rename-btn gyh-rename-btn-primary" type="button">开始重命名</button>
          </div>
        </footer>
      </section>
    `;
    overlays.rename = overlay;
    const closeButton = overlay.querySelector('.gyh-rename-close');
    const cancelButton = overlay.querySelector('[data-rename-cancel]');
    const fields = overlay.querySelector('[data-rename-fields]');
    const modeLabel = overlay.querySelector('[data-rename-mode-label]');
    const preview = overlay.querySelector('[data-rename-preview-content]');
    const footerNote = overlay.querySelector('[data-rename-footer-note]');
    const startButton = overlay.querySelector('.gyh-rename-btn-primary');
    const videoFilter = overlay.querySelector('[data-rename-video-filter]');
    const modeLabels = Object.fromEntries(renameModes.map(mode => [mode.key, `${mode.label}重命名`]));
    let activeMode = 'replace';
    let hasExecuted = false;
    // 返回当前筛选后的文件
    const getActiveFiles = () => videoFilter.checked ? files.filter(isVideoFile) : files;
    // 获取当前规则的处理计划
    const getPlan = () => buildRenamePlan(getActiveFiles(), activeMode, fields.querySelectorAll('.gyh-rename-input'));
    // 刷新名称预览与底部提示
    const refreshPreview = () => {
      const plan = getPlan();
      if (plan.error) {
        footerNote.textContent = `${plan.error} · 请检查规则设置`;
        startButton.disabled = true;
        return plan;
      }
      renderRenamePreview(preview, plan.items);
      if (plan.items.length === 0) {
        footerNote.textContent = '仅视频已开启，但当前选择中没有视频文件';
        startButton.disabled = true;
        return plan;
      }
      footerNote.textContent = `当前处理 ${plan.items.length} 个文件${videoFilter.checked ? ' · 仅视频' : ''} · 已生成预览`;
      startButton.disabled = false;
      return plan;
    };
    // 锁定或恢复可编辑控件
    const setRunning = (running) => {
      overlay.querySelectorAll('[data-rename-mode]').forEach((modeButton) => {
        modeButton.disabled = running && !modeButton.classList.contains('is-active');
      });
      overlay.querySelectorAll('.gyh-rename-input, [data-rename-video-filter]')
        .forEach(element => { element.disabled = running; });
    };
    // 按顺序执行重命名任务
    const executeRename = async () => {
      if (hasExecuted) {
        closeDesigner('rename', true);
        return;
      }
      const plan = refreshPreview();
      if (plan.error || plan.items.length === 0) {
        showToast(plan.error || '没有可处理的视频文件', 'error');
        return;
      }
      hasExecuted = true;
      setRunning(true);
      startButton.disabled = true;
      startButton.textContent = '重命名中...';
      let successCount = 0;
      let failCount = 0;
      const rows = preview.querySelectorAll('.gyh-rename-row');
      for (let index = 0; index < plan.items.length; index += 1) {
        const item = plan.items[index];
        const row = rows[index];
        revealRenameRow(preview, row);
        setPreviewRowState(row, 'processing', '处理中');
        try {
          if (item.name !== item.newName) await renameGuangyaFile(item.id, item.newName);
          setPreviewRowState(row, 'success', '已改名');
          successCount += 1;
        } catch (error) {
          setPreviewRowState(row, 'failed', '已失败');
          failCount += 1;
        }
        if (index < plan.items.length - 1) await delay(0);
      }
      startButton.disabled = false;
      startButton.textContent = '关闭';
      overlay._gyhShouldRefresh = true;
      footerNote.textContent = `处理完成 ${successCount + failCount}/${plan.items.length} · 成功 ${successCount} · 失败 ${failCount}`;
      showToast(failCount ? `重命名完成，${failCount} 个失败` : '重命名完成', failCount ? 'error' : 'success');
    };
    // 切换重命名方式
    const updateMode = (modeKey) => {
      activeMode = modeKey;
      overlay.querySelectorAll('[data-rename-mode]').forEach((button) => {
        const isActive = button.dataset.renameMode === modeKey;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-selected', String(isActive));
      });
      modeLabel.textContent = modeLabels[modeKey];
      renderRenameFields(fields, modeKey);
      fields.querySelectorAll('.gyh-rename-input').forEach(input => input.addEventListener('input', refreshPreview));
      refreshPreview();
    };
    overlay.querySelectorAll('[data-rename-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!hasExecuted) updateMode(button.dataset.renameMode);
      });
    });
    videoFilter.addEventListener('change', refreshPreview);
    closeButton.addEventListener('click', () => closeDesigner('rename', true));
    cancelButton.addEventListener('click', () => closeDesigner('rename', true));
    startButton.addEventListener('click', executeRename);
    bindOverlay(overlay, () => closeDesigner('rename', true), { focus: closeButton });
    updateMode('replace');
  }
  // ============================================================
  // 搜索资源：聚合搜索（迅雷/阿里/百度/夸克/磁力等）
  // ============================================================
  const resourceSearchTabs = [
    { id: 'all', name: '全部', color: '#60718b', count: 0 },
    { id: 'xunlei', name: '迅雷云盘', color: '#ff9800', count: 0 },
    { id: 'guangya', name: '光鸭云盘', color: '#00bcd4', count: 0 },
    { id: 'magnet', name: '磁力链接', color: '#607d8b', count: 0 },
  ];
  // 资源类型 → 标签 ID 映射（仅保留启用的搜索源）
  function mapResourceTypeToTab(type) {
    if (type === 'ed2k' || type === 'magnet') return 'magnet';
    return RESOURCE_SEARCH_TYPES.includes(type) ? type : '';
  }
  // 本地兑底过滤：标题需包含所有搜索关键词（AND 关系）
  function isResourceTitleRelevant(title, keyword) {
    // 忽略空格差异，避免“飞驰人生 2”匹配不上“飞驰人生2”这类误杀
    const normalizedTitle = String(title || '').toLowerCase().replace(/\s+/g, '');
    const keywords = String(keyword || '').toLowerCase().trim().split(/\s+/).filter(Boolean).map(part => part.replace(/\s+/g, ''));
    return keywords.every(part => normalizedTitle.includes(part));
  }
  // 日期展示（兼容 ISO 时间，0001-01-01 视为无日期）
  function formatSearchDate(value) {
    const date = String(value || '').trim();
    if (!date || /^0001-01-01/.test(date)) return '';
    return date.substring(0, 10);
  }
  // 本地排除垃圾结果（服务端 exclude 受 URL 长度限制，此处补齐）
  function isResourceTitleExcluded(title) {
    const value = String(title || '').toLowerCase();
    if (/(^|[^a-z])(cam|ts)([^a-z]|$)/.test(value)) return true;
    return ['试看', '删减', '枪版', '抢先版'].some(word => value.includes(word));
  }
  // 请求搜索接口（POST JSON，优先 GM_xmlhttpRequest 跨域，回退 fetch）
  function requestResourceSearch(body) {
    return new Promise((resolve, reject) => {
      const handleText = (status, rawText) => {
        const text = String(rawText || '');
        if (status < 200 || status >= 300) {
          reject(new Error(`HTTP ${status} 错误<br>${escapeHtml(text.slice(0, 200))}`));
          return;
        }
        try {
          resolve(JSON.parse(text));
        } catch (error) {
          const isHtml = /^\s*<(!DOCTYPE|html|head|body)/i.test(text);
          const reason = isHtml ? '服务器返回了 HTML 页面（可能是反爬验证、接口变更或被拦截）' : '响应内容不是合法 JSON';
          reject(new Error(`${reason}<br><span style="font-size:11px;color:#8491a5">状态码: ${status} | ${escapeHtml(text.slice(0, 300))}</span>`));
        }
      };
      if (typeof GM_xmlhttpRequest === 'function') {
        GM_xmlhttpRequest({
          method: 'POST',
          url: RESOURCE_SEARCH_API,
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          data: JSON.stringify(body),
          onload: response => handleText(response.status, response.responseText),
          onerror: () => reject(new Error('网络错误（无法连接到搜索服务器）')),
          ontimeout: () => reject(new Error('请求超时（服务器响应过慢，请稍后重试）')),
          timeout: 60000,
        });
        return;
      }
      const controller = new AbortController();
      const timer = window.setTimeout(() => { controller.abort(); reject(new Error('请求超时（服务器响应过慢，请稍后重试）')); }, 60000);
      fetch(RESOURCE_SEARCH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
        .then(async response => handleText(response.status, await response.text()))
        .catch(error => reject(error))
        .finally(() => window.clearTimeout(timer));
    });
  }
  // 执行资源搜索（仅搜索启用的网盘源）
  async function searchResources(keyword) {
    const results = [];
    // POST JSON 契约：kw + cloud_types + filter.exclude
    const body = {
      kw: String(keyword || '').trim(),
      cloud_types: [...RESOURCE_SEARCH_TYPES],
      filter: { exclude: ['预告', '花絮', '枪版', '抢先', '片段'] },
    };
    const response = await requestResourceSearch(body);
    const merged = response?.code === 0 ? response?.data?.merged_by_type : null;
    if (merged) {
      for (const [type, items] of Object.entries(merged)) {
        if (!Array.isArray(items)) continue;
        const tabId = mapResourceTypeToTab(type);
        if (!tabId) continue;
        for (const item of items) {
          const title = String(item.note || '').replace(/^资源名称[：:]\s*/, '').trim() || '(无标题)';
          if (!isResourceTitleRelevant(title, keyword)) continue;
          if (isResourceTitleExcluded(title)) continue;
          results.push({
            type: tabId,
            source: type,
            title,
            url: String(item.url || ''),
            password: String(item.password || ''),
            date: formatSearchDate(item.datetime),
          });
        }
      }
    }
    for (const tab of resourceSearchTabs) {
      tab.count = tab.id === 'all' ? results.length : results.filter(result => result.type === tab.id).length;
    }
    return results;
  }
  // 打开搜索资源弹窗
  function showResourceSearch() {
    if (overlays.search) return;
    const overlay = document.createElement('div');
    overlay.className = 'gyh-rename-overlay';
    overlay.innerHTML = `
      <section class="gyh-rename-modal gyh-search-modal" role="dialog" aria-modal="true" aria-labelledby="gyh-search-title">
        ${modalHeader({ id: 'gyh-search-title', icon: ICONS.search, title: '搜索资源', subtitle: '聚合搜索迅雷/光鸭/磁力等资源', closeLabel: '关闭搜索资源' })}
        <div class="gyh-rename-body">
          <div class="gyh-search-bar">
            <input class="gyh-rename-input gyh-search-input" type="text" placeholder="输入关键词搜索资源（支持迅雷/光鸭/磁力等）" aria-label="搜索关键词">
            <button class="gyh-rename-btn gyh-search-btn" type="button" data-search-start>搜索</button>
          </div>
          <div class="gyh-search-tabs" data-search-tabs hidden></div>
          <div class="gyh-search-results" data-search-results><div class="gyh-search-empty">输入关键词开始搜索<br><span>首次搜索需聚合多个来源，可能需 10-30 秒</span></div></div>
        </div>
      </section>
    `;
    const close = () => closeDesigner('search');
    overlay.querySelector('.gyh-rename-close').addEventListener('click', close);
    const searchInput = overlay.querySelector('.gyh-search-input');
    const searchButton = overlay.querySelector('[data-search-start]');
    const tabsBar = overlay.querySelector('[data-search-tabs]');
    const resultsList = overlay.querySelector('[data-search-results]');
    let currentTab = 'all';
    let allResults = [];
    const renderEmpty = message => { resultsList.innerHTML = `<div class="gyh-search-empty">${message}</div>`; };
    const renderResults = () => {
      const list = currentTab === 'all' ? allResults : allResults.filter(result => result.type === currentTab);
      if (!list.length) {
        renderEmpty('暂无匹配结果');
        return;
      }
      // 按日期递减排序（最新的在前）
      const sorted = [...list].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      resultsList.innerHTML = sorted.map((item, index) => {
        const isMagnet = item.type === 'magnet' || item.url.startsWith('magnet:');
        return `
          <article class="gyh-search-card" data-search-open="${index}">
            <div class="gyh-search-card-main">
              <div class="gyh-search-card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
              <div class="gyh-search-card-meta">
                ${item.source ? `<span class="gyh-search-source">${escapeHtml(item.source)}</span>` : ''}
                ${item.date ? `<span>${escapeHtml(item.date)}</span>` : ''}
                ${item.password ? `<span class="gyh-search-password">提取码:${escapeHtml(item.password)}</span>` : ''}
              </div>
            </div>
            <div class="gyh-search-card-actions">
              ${isMagnet ? `<button class="gyh-search-card-btn is-cloud" type="button" data-search-cloud="${index}">云添加</button>` : ''}
              <button class="gyh-search-card-btn" type="button" data-search-copy="${index}">复制</button>
            </div>
          </article>
        `;
      }).join('');
      resultsList.querySelectorAll('[data-search-open]').forEach(card => card.addEventListener('click', () => {
        const item = sorted[Number(card.dataset.searchOpen)];
        if (item?.url) window.open(item.url, '_blank', 'noopener');
      }));
      resultsList.querySelectorAll('[data-search-copy]').forEach(button => button.addEventListener('click', async event => {
        event.stopPropagation();
        const item = sorted[Number(button.dataset.searchCopy)];
        if (!item?.url) return;
        const copied = await copyPlainText(item.password ? `${item.url} 提取码:${item.password}` : item.url);
        if (!copied) return;
        button.textContent = '已复制';
        button.classList.add('is-copied');
        window.setTimeout(() => { button.textContent = '复制'; button.classList.remove('is-copied'); }, 1000);
      }));
      resultsList.querySelectorAll('[data-search-cloud]').forEach(button => button.addEventListener('click', event => {
        event.stopPropagation();
        const item = sorted[Number(button.dataset.searchCloud)];
        if (!item?.url) return;
        // 存入待添加的磁力链接，新标签页打开光鸭云盘自动云添加
        setStoredValue(PENDING_MAGNET_STORAGE, item.url);
        button.textContent = '跳转中';
        window.setTimeout(() => { button.textContent = '云添加'; }, 1200);
        window.setTimeout(() => window.open('https://guangyapan.com/', '_blank', 'noopener'), 300);
      }));
    };
    const renderTabs = () => {
      // 只显示有结果的标签（“全部”始终显示）
      const visibleTabs = resourceSearchTabs.filter(tab => tab.id === 'all' || tab.count > 0);
      tabsBar.innerHTML = visibleTabs.map(tab => {
        const active = tab.id === currentTab;
        return `<button class="gyh-search-tab${active ? ' is-active' : ''}" type="button" data-search-tab="${tab.id}"${active ? ` style="background:${tab.color};border-color:${tab.color}"` : ''}>${tab.name}${tab.count ? ` (${tab.count})` : ''}</button>`;
      }).join('');
      tabsBar.querySelectorAll('[data-search-tab]').forEach(button => button.addEventListener('click', () => {
        currentTab = button.dataset.searchTab;
        renderTabs();
        renderResults();
      }));
    };
    const doSearch = async () => {
      const keyword = searchInput.value.trim();
      if (!keyword) {
        searchInput.focus();
        return;
      }
      searchButton.disabled = true;
      searchButton.textContent = '搜索中...';
      renderEmpty('搜索中，首次搜索需聚合多个来源，可能需 10-30 秒...');
      try {
        allResults = await searchResources(keyword);
        currentTab = 'all';
        if (allResults.length) {
          tabsBar.hidden = false;
          renderTabs();
        } else {
          tabsBar.hidden = true;
        }
        renderResults();
      } catch (error) {
        renderEmpty(`搜索失败<br><span>${error?.message || '请稍后重试'}</span>`);
      } finally {
        searchButton.disabled = false;
        searchButton.textContent = '搜索';
      }
    };
    searchButton.addEventListener('click', doSearch);
    searchInput.addEventListener('keydown', event => { if (event.key === 'Enter') doSearch(); });
    overlays.search = overlay;
    bindOverlay(overlay, close, { focus: searchInput });
  }
  // 自动云添加：读取待处理的磁力链接，自动点击云添加 → 填入链接 → 点击确定
  function runPendingMagnetCloudAdd() {
    const magnet = String(getStoredValue(PENDING_MAGNET_STORAGE, '') || '').trim();
    if (!magnet) return;
    // 立即清空，避免重复触发
    setStoredValue(PENDING_MAGNET_STORAGE, '');
    // 等待元素出现（带超时）
    const waitFor = (find, timeout = 15000, interval = 300) => new Promise((resolve, reject) => {
      const start = Date.now();
      const timer = window.setInterval(() => {
        const element = find();
        if (element) {
          window.clearInterval(timer);
          resolve(element);
          return;
        }
        if (Date.now() - start > timeout) {
          window.clearInterval(timer);
          reject(new Error('等待元素超时'));
        }
      }, interval);
    });
    // 模拟原生输入（兼容受控组件）
    const setNativeValue = (element, value) => {
      const proto = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(element, value);
      else element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    };
    (async () => {
      try {
        // 1. 点击“云添加”按钮
        const cloudAddButton = await waitFor(() => [...document.querySelectorAll('button')].find(button => button.textContent.trim().includes('云添加') && !button.closest('[class*="dropdown"], [class*="menu"]')), 20000);
        cloudAddButton.click();
        // 2. 填入磁力链接
        const textarea = await waitFor(() => [...document.querySelectorAll('textarea')].find(element => element.placeholder?.includes('下载链接')), 15000);
        setNativeValue(textarea, magnet);
        // 3. 点击“确定”按钮
        const confirmButton = await waitFor(() => {
          for (const span of document.querySelectorAll('span.swangpan-button__content')) {
            if (span.textContent.trim() !== '确定') continue;
            let node = span;
            for (let depth = 0; depth < 6; depth += 1) {
              node = node.parentElement;
              if (!node) break;
              if (node.tagName === 'BUTTON' || node.getAttribute('role') === 'button') return node;
            }
            return span;
          }
          return null;
        }, 15000);
        confirmButton.click();
      } catch (error) {
        showToast('磁力自动云添加失败，请手动粘贴链接', 'error');
        // 失败时回填磁力链接，方便手动粘贴
        setStoredValue(PENDING_MAGNET_STORAGE, magnet);
      }
    })();
  }
  // 创建悬浮助手入口
  function createAssistant() {
    if (document.getElementById(ROOT_ID)) return;
    const root = document.createElement('section');
    root.id = ROOT_ID;
    root.setAttribute('aria-label', '光鸭助手');
    const mainActions = [
      { action: 'search', icon: ICONS.search, name: '搜索资源', note: '聚合搜索云盘与资源' },
      { action: 'movie', icon: ICONS.movie, name: '整理电影', note: '识别电影信息与整理' },
      { action: 'tv', icon: ICONS.tv, name: '整理剧集', note: '识别剧集信息与整理' },
      { action: 'rename', icon: ICONS.renameAction, name: '批量重命名', note: '预览后统一修改名称' },
      { action: 'import', attribute: 'data-transfer-action', icon: ICONS.import, name: '导入秒传文件', note: '读取文件并创建秒传任务' },
      { action: 'export', attribute: 'data-transfer-action', icon: ICONS.export, name: '导出秒传文件', note: '将文件/夹生成秒传文件' },
    ].map(assistantAction).join('');
    root.innerHTML = `
      <button class="gyh-trigger" type="button" aria-label="打开光鸭助手" aria-expanded="false" aria-controls="gyh-panel" title="光鸭助手">
        ${ICONS.assistant}
        <span class="gyh-trigger-label">助手</span>
      </button>
      <div class="gyh-panel" id="gyh-panel" role="dialog" aria-label="光鸭助手功能" aria-hidden="true">
        <div class="gyh-panel-header">
          <div class="gyh-panel-title-row"><h2 class="gyh-title">光鸭助手</h2><span class="gyh-status">v${SCRIPT_VERSION}</span></div>
          <p class="gyh-subtitle"><span>好用、全能的光鸭云盘助手</span><span class="gyh-author">By：唐生</span></p>
        </div>
        <div class="gyh-actions">${mainActions}</div>
      </div>
    `;
    if (isXunleiPan) {
      root.querySelector('.gyh-trigger').setAttribute('aria-label', '打开迅雷助手');
      root.querySelector('.gyh-trigger').setAttribute('title', '迅雷助手');
      root.querySelector('.gyh-title').textContent = '迅雷助手';
      root.querySelector('.gyh-subtitle span').textContent = '好用、全能的迅雷云盘助手';
      root.querySelector('.gyh-actions').innerHTML = [
        assistantAction({ action: null, attribute: 'data-xunlei-export', icon: ICONS.export, name: '导出秒传文件', note: '将文件/夹生成秒传文件' }),
        assistantAction({ action: 'search', icon: ICONS.search, name: '搜索资源', note: '聚合搜索迅雷/阿里/夸克/磁力等' }),
      ].join('');
    }
    const trigger = root.querySelector('.gyh-trigger');
    const panel = root.querySelector('.gyh-panel');
    const transferPanel = root.querySelector('.gyh-transfer-panel');
    const movieAction = root.querySelector('[data-action="movie"]');
    const renameAction = root.querySelector('[data-action="rename"]');
    const tvAction = root.querySelector('[data-action="tv"]');
    const transferAction = root.querySelector('[data-action="transfer"]');
    const searchAction = root.querySelector('[data-action="search"]');
    const transferBack = root.querySelector('.gyh-submenu-back');
    // 切换助手菜单状态
    const setOpen = (isOpen) => {
      trigger.setAttribute('aria-expanded', String(isOpen));
      panel.setAttribute('aria-hidden', String(!isOpen));
      panel.classList.toggle('is-open', isOpen);
      if (!isOpen && transferPanel) {
        transferPanel.setAttribute('aria-hidden', 'true');
        transferPanel.classList.remove('is-open');
      }
    };
    // 切换秒传二级面板
    const setTransferOpen = (isOpen) => {
      if (!transferPanel) return;
      trigger.setAttribute('aria-expanded', 'true');
      panel.setAttribute('aria-hidden', String(isOpen));
      panel.classList.toggle('is-open', !isOpen);
      transferPanel.setAttribute('aria-hidden', String(!isOpen));
      transferPanel.classList.toggle('is-open', isOpen);
    };
    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      setOpen(trigger.getAttribute('aria-expanded') !== 'true');
    });
    if (renameAction) renameAction.addEventListener('click', async () => {
      setOpen(false);
      renameAction.disabled = true;
      try {
        const selectedFiles = await getSelectedGuangyaFiles();
        if (selectedFiles.length === 0) {
          showToast('请先选择文件', 'error');
          return;
        }
        showRenameDesigner(selectedFiles);
      } catch (error) {
        showToast(error.message || '读取选中文件失败', 'error');
      } finally {
        renameAction.disabled = false;
      }
    });
    const openMovieOrganizer = async () => {
      const key = await getTmdbKey();
      if (!key) {
        showTmdbConfig(openMovieOrganizer);
        return;
      }
      try {
        const resources = await getSelectedGuangyaResources();
        if (resources.length === 0) {
          showToast('请先选择文件或文件夹', 'error');
          return;
        }
        showMovieDesigner(resources);
      } catch (error) {
        showToast(error.message || '读取选中资源失败', 'error');
      }
    };
    if (movieAction) movieAction.addEventListener('click', async () => {
      setOpen(false);
      movieAction.disabled = true;
      try {
        await openMovieOrganizer();
      } finally {
        movieAction.disabled = false;
      }
    });
    const openTvOrganizer = async () => {
      const key = await getTmdbKey();
      if (!key) {
        showTmdbConfig(openTvOrganizer);
        return;
      }
      const resources = await getSelectedGuangyaResources();
      if (!resources.length) {
        showToast('请先选择剧集文件夹', 'error');
        return;
      }
      if (resources.some(resource => resource.resType === 1)) {
        showToast('剧集整理仅支持选择文件夹', 'error');
        return;
      }
      showTvDesigner(resources);
    };
    if (tvAction) tvAction.addEventListener('click', async () => {
      setOpen(false);
      tvAction.disabled = true;
      try {
        await openTvOrganizer();
      } catch (error) {
        showToast(error.message || '读取选中文件夹失败', 'error');
      } finally {
        tvAction.disabled = false;
      }
    });
    if (transferAction) transferAction.addEventListener('click', () => {
      setTransferOpen(true);
    });
    if (searchAction) searchAction.addEventListener('click', () => {
      setOpen(false);
      showResourceSearch();
    });
    if (transferBack) transferBack.addEventListener('click', () => setTransferOpen(false));
    const rapidImportAction = root.querySelector('[data-transfer-action="import"]');
    if (rapidImportAction) rapidImportAction.addEventListener('click', async () => {
      setOpen(false);
      await loadAceEditor();
      showRapidImportDesigner();
    });
    const rapidExportAction = root.querySelector('[data-transfer-action="export"], [data-xunlei-export]');
    if (rapidExportAction) rapidExportAction.addEventListener('click', async () => {
      setOpen(false);
      rapidExportAction.disabled = true;
      let progress = null;
      try {
        await loadAceEditor();
        progress = showRapidExportProgress();
        if (isXunleiPan) xunleiRetryNotifier = detail => progress.update(detail);
        const resources = isXunleiPan ? await getSelectedXunleiResources() : await getSelectedGuangyaResources();
        if (!resources.length) {
          progress.close();
          showToast('请先选择文件或文件夹', 'error');
          return;
        }
        const onProgress = detail => progress.update(detail);
        const exportResult = isXunleiPan ? await buildXunleiRapidExportData(resources, onProgress) : await buildGuangyaRapidExportData(resources, onProgress);
        progress.close();
        showRapidExportDesigner(exportResult);
      } catch (error) {
        if (progress) progress.close();
        showToast(error?.message || '生成秒传文件失败', 'error');
      } finally {
        xunleiRetryNotifier = null;
        rapidExportAction.disabled = false;
      }
    });
    document.addEventListener('click', (event) => {
      if (!root.contains(event.target)) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setOpen(false);
    });
    document.body.appendChild(root);
  }
  // 启动助手组件
  function init() {
    addStyles();
    createAssistant();
    if (isXunleiPan) installXunleiRequestCapture();
    else {
      initializeGuangyaSelection();
      runPendingMagnetCloudAdd();
    }
  }
  registerDebugMenu();
  if (document.body) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  }
})();
