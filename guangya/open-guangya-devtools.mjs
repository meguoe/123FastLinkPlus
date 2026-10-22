import { spawn, execFileSync } from 'node:child_process';
import net from 'node:net';
import os from 'node:os';
import { access, readFile } from 'node:fs/promises';
import { installTmdbBridge } from './guangya-tmdb-bridge.mjs';
import { installAppMenu } from './guangya-app-menu.mjs';
import { normalizeMagnetLinks, openMagnetLinks } from './guangya-magnet.mjs';
import { restrictMagnetClipboard, locateMagnetClipboard, installMagnetClipboard } from './guangya-clipboard.mjs';

const magnetArgument = process.argv.indexOf('--magnet');
const magnetLinks = magnetArgument < 0 ? [] : normalizeMagnetLinks(process.argv.slice(magnetArgument + 1));
const executable = '/Applications/光鸭云盘.app/Contents/MacOS/光鸭云盘';
const configPath = `${os.homedir()}/Library/Application Support/Guangyapan/bootstrap/env.json`;
const port = 9237;
try { await access(executable); }
catch { throw Error('未找到光鸭云盘，请先将官方应用安装到 /Applications/光鸭云盘.app'); }
// This one-shot hook changes only the bootstrap read, preserving other settings.
const injection = `(() => {
  const fs = process.getBuiltinModule('fs');
  const target = ${JSON.stringify(configPath)};
  const exists = fs.existsSync, read = fs.readFileSync;
  fs.existsSync = function(path, ...args) {
    return String(path) === target || exists.call(this, path, ...args);
  };
  fs.readFileSync = function(path, ...args) {
    if (String(path) !== target) return read.call(this, path, ...args);
    fs.existsSync = exists;
    fs.readFileSync = read;
    const settings = exists(target) ? JSON.parse(read(target, 'utf8')) : { env: 'production' };
    const data = JSON.stringify({ ...settings, debug: true });
    const encoding = typeof args[0] === 'string' ? args[0] : args[0]?.encoding;
    return encoding ? data : Buffer.from(data);
  };
  return 'bootstrap debug hook installed';
})()`;

// Segmented and Card are shipped in node_modules but omitted from the renderer's Webpack chunks.
// Read original CommonJS modules in Electron; share the renderer's React instance.
function buildSegmentedSource() {
  const { app } = process.mainModule.require('electron');
  const fs = process.mainModule.require('fs');
  const { createRequire } = process.mainModule.require('module');
  const path = process.mainModule.require('path');
  const resolve = createRequire(path.join(app.getAppPath(), 'package.json')).resolve;
  const external = new Set(['react', 'react-dom']);
  const modules = [], ids = new Map();
  function collect(file) {
    if (ids.has(file)) return ids.get(file);
    const id = modules.length;
    ids.set(file, id); modules.push(null);
    let source = fs.readFileSync(file, 'utf8');
    const dependencies = {};
    if (file.endsWith('.json')) source = 'module.exports = ' + source;
    else {
      const local = createRequire(file);
      for (const match of source.matchAll(/require\(["']([^"']+)["']\)/g)) {
        const name = match[1];
        dependencies[name] = external.has(name) ? name : collect(local.resolve(name));
      }
    }
    modules[id] = `[function(require,module,exports,process){\n${source}\n},${JSON.stringify(dependencies)}]`;
    return id;
  }
  const segmented = collect(resolve('antd/lib/segmented'));
  const card = collect(resolve('antd/lib/card'));
  const collapse = collect(resolve('antd/lib/collapse'));
  const tag = collect(resolve('antd/lib/tag'));
  const tooltip = collect(resolve('antd/lib/tooltip'));
  const breadcrumb = collect(resolve('antd/lib/breadcrumb'));
  const statusIcons = Object.fromEntries(Object.entries({ success: 'CheckCircleOutlined', processing: 'SyncOutlined', error: 'CloseCircleOutlined', default: 'ClockCircleOutlined' }).map(([status, name]) => [status, collect(resolve('@ant-design/icons/lib/icons/' + name))]));
  const provider = collect(resolve('antd/lib/config-provider'));
  return `window.__guangyaLoadSegmented = runtime => {
    const modules = [${modules.join(',')}], cache = {};
    const external = {react:runtime.React,'react-dom':runtime.dom};
    function load(id) {
      if (typeof id === 'string') return external[id];
      if (cache[id]) return cache[id].exports;
      const module = cache[id] = {exports:{}};
      const [factory, dependencies] = modules[id];
      factory(name => load(dependencies[name]), module, module.exports, {env:{NODE_ENV:'production'}});
      return module.exports;
    }
    return {Segmented:load(${segmented}).default, Card:load(${card}).default, Collapse:load(${collapse}).default, Tag:load(${tag}).default, Tooltip:load(${tooltip}).default, Breadcrumb:load(${breadcrumb}).default, StatusIcons:Object.fromEntries(Object.entries(${JSON.stringify(statusIcons)}).map(([status,id])=>[status,load(id).default])), ConfigProvider:load(${provider}).default};
  };`;
}

async function installScripts(source, installBridge) {
  const { app, webContents } = process.mainModule.require('electron');
  const key = '__guangyaAutoInject';
  globalThis[key]?.dispose();
  const watched = new Map();
  const initial = [];
  function watch(contents) {
    if (contents.isDestroyed() || contents.getType() !== 'window' || watched.has(contents)) return;
    async function inject() {
      if (contents.isDestroyed()) return;
      try {
        await installBridge(contents);
        if (contents.isDestroyed()) return { skipped: true, reason: '窗口已关闭' };
        const result = await contents.executeJavaScript(source);
        if (contents.isDestroyed()) return { skipped: true, reason: '窗口已关闭' };
        console.info('[光鸭自定义]', result?.skipped ? '已跳过重注入' : '自动注入完成', { webContentsId: contents.id, ...result });
        return { webContentsId: contents.id, ...result };
      } catch (error) {
        if (contents.isDestroyed()) return { skipped: true, reason: '窗口已关闭' };
        console.error('[光鸭自定义]', '自动注入失败', { webContentsId: contents.id, message: error.message });
        return { webContentsId: contents.id, error: error.message };
      }
    }
    function cleanup() {
      contents.removeListener('did-finish-load', inject);
      contents.removeListener('destroyed', cleanup);
      watched.delete(contents);
    }
    watched.set(contents, cleanup);
    contents.on('did-finish-load', inject);
    contents.once('destroyed', cleanup);
    if (!contents.isLoadingMainFrame()) initial.push(inject());
  }
  const created = (_event, contents) => watch(contents);
  app.on('web-contents-created', created);
  const api = {
    dispose() {
      app.removeListener('web-contents-created', created);
      for (const cleanup of [...watched.values()]) cleanup();
      if (globalThis[key] === api) delete globalThis[key];
    },
  };
  globalThis[key] = api;
  for (const contents of webContents.getAllWebContents()) watch(contents);
  return { autoInjectInstalled: true, watchedWindows: watched.size, initial: await Promise.all(initial) };
}

const rendererGuard = `(() => {
  if (document.querySelector('[data-guangya-folder-browser]')) return { skipped: true, reason: '目录弹窗正在使用，请先关闭弹窗' };
  if (document.getElementById('guangya-tmdb-config-dialog')) return { skipped: true, reason: 'TMDB 密钥配置弹窗正在使用' };
  if (document.getElementById('guangya-movie-tmdb-config-dialog')) return { skipped: true, reason: 'TMDB 密钥配置弹窗正在使用' };
  if (document.getElementById('guangya-movie-dialog')) return { skipped: true, reason: '整理电影弹窗正在使用' };
  if (document.getElementById('guangya-tv-dialog')) return { skipped: true, reason: '整理剧集弹窗正在使用' };
  if (document.getElementById('guangya-rename-dialog')) return { skipped: true, reason: '批量重命名弹窗正在使用，请先关闭弹窗' };
  const pending = document.getElementById('guangya-import-dialog');
  if (pending && (pending.querySelector('[aria-busy="true"]') || pending.querySelector('[data-import-editor] textarea')?.value || pending.querySelector('input[type="file"]')?.files.length)) {
    return { skipped: true, reason: '导入弹窗中有内容或操作正在进行，请先关闭弹窗' };
  }
})();\n`;
const rendererScripts = await Promise.all([
  './guangya-file-list.js', './guangya-file-sort.js', './guangya-message.js', './guangya-modal.js', './guangya-native-ui.js', './guangya-folder-browser.js', './guangya-json-editor.js', './guangya-export.js', './guangya-import.js', './guangya-tv.js',  './guangya-rename.js', './guangya-home-button.js'].map(path => readFile(new URL(path, import.meta.url), 'utf8')));
const rendererSource = `(() => {
  const protection = ${rendererGuard}
  if (protection) return protection;
  /* GUANGYA_NATIVE_SEGMENTED */
  ${rendererScripts.slice(0, -1).join('\n')}
  return ${rendererScripts.at(-1)}
})()`;

// Serialized into Electron's main process; prefer the main window over login/tools.
function bringAppToFront() {
  const { app, BrowserWindow } = process.mainModule.require('electron');
  const windows = BrowserWindow.getAllWindows().filter(window => !window.isDestroyed() && !window.webContents.isDestroyed());
  const main = windows.find(window => /\/main\.html(?:[?#]|$)/.test(window.webContents.getURL()))
    || windows.find(window => /\/login\.html(?:[?#]|$)/.test(window.webContents.getURL()));
  if (!main) return false;
  if (main.isMinimized()) main.restore();
  main.show();
  app.focus({ steal: true });
  main.focus();
  return true;
}

function isAppRunning(run = execFileSync) {
  try {
    run('/usr/bin/pgrep', ['-f', '^' + executable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([[:space:]]|$)'], { stdio: 'ignore' });
    return true;
  } catch (error) {
    if (error.status === 1) return false;
    throw error;
  }
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function findInspectorTarget() {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(500) });
    if (!response.ok) throw Error('Inspector 返回 HTTP ' + response.status);
    const targets = await response.json();
    if (!Array.isArray(targets)) throw Error('Inspector 返回格式异常');
    const target = targets.find(item => item.type === 'node');
    if (!target) throw Error('端口 9237 已被其他服务占用');
    return target;
  } catch (error) {
    if (error.cause?.code === 'ECONNREFUSED') return null;
    throw error;
  }
}

async function quitUnmanagedApp() {
  // NSRunningApplication.terminate requests normal quit; never force-terminate.
  execFileSync('/usr/bin/osascript', ['-l', 'JavaScript', '-e', `
    ObjC.import('AppKit');
    const applications = $.NSWorkspace.sharedWorkspace.runningApplications;
    for (let i = 0; i < applications.count; i++) {
      const application = applications.objectAtIndex(i);
      if (ObjC.unwrap(application.executableURL.path) === ${JSON.stringify(executable)} && !application.terminate) {
        throw Error('光鸭云盘拒绝退出');
      }
    }
  `], { encoding: 'utf8', timeout: 3000 });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (!isAppRunning()) return;
    await delay(200);
  }
  throw Error('等待光鸭云盘正常退出超时，请处理应用中的退出提示后重试；未强制结束进程');
}

// Explicit attach and system magnet events must never restart an existing client.
let attach = process.argv.includes('--attach') || isAppRunning();
if (attach && !process.argv.includes('--attach') && !magnetLinks.length && !await findInspectorTarget()) {
  console.log('光鸭云盘未通过助手启动，正在正常退出后重启…');
  await quitUnmanagedApp();
  attach = false;
}
console.log(attach ? '光鸭云盘已运行，正在 attach…' : '光鸭云盘未运行，正在启动…');
if (!attach) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
  const child = spawn(executable, [`--inspect-brk=127.0.0.1:${port}`], {
    detached: true, stdio: 'ignore',
  });
  await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
  child.unref();
}
let target;
for (let attempt = 0; attempt < 100; attempt++) {
  target = await findInspectorTarget();
  if (target) break;
  await delay(200);
}
if (!target) throw new Error(attach
  ? '应用已运行，但无法连接 Inspector（127.0.0.1:9237）。请正常退出应用，再运行本脚本启动。'
  : 'Inspector 启动失败；应用可能禁用了调试参数。');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
const pending = new Map();
let onPaused;
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === 'Debugger.paused') onPaused?.();
  if (!message.id) return;
  const callback = pending.get(message.id);
  if (callback) { pending.delete(message.id); callback(message); }
};
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`${method} 超时`)); }, 10000);
    pending.set(id, message => {
      clearTimeout(timeout);
      if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression, awaitPromise = false) {
  const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
  return response.result.value;
}
try {
  await send('Runtime.enable');
  let alreadyRunning = false;
  try {
    if (await evaluate('process.execPath') !== executable) throw new Error('Inspector 目标不是光鸭云盘');
    alreadyRunning = true;
  } catch (error) {
    if (!error.message.includes('process is not defined')) throw error;
  }
  if (!alreadyRunning) {
    await send('Debugger.enable');
    const paused = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('等待主进程入口暂停超时')), 10000);
      onPaused = () => { clearTimeout(timeout); resolve(); };
    });
    await send('Runtime.runIfWaitingForDebugger');
    await paused;
    if (await evaluate('process.execPath') !== executable) throw new Error('Inspector 目标不是光鸭云盘');
    console.log(await evaluate(injection));
    await send('Debugger.resume');
    await send('Debugger.disable');
  }
  let windows;
  for (let attempt = 0; attempt < 100; attempt++) {
    windows = await evaluate(`(() => {
      if (!process.mainModule) return [];
      const { BrowserWindow } = process.mainModule.require('electron');
      return BrowserWindow.getAllWindows().map(window => {
        const contents = window.webContents;
        return { id: window.id, devToolsEnabled: contents.getLastWebPreferences().devTools, opened: contents.isDevToolsOpened() };
      });
    })()`);
    if (windows?.length) break;
    await delay(200);
  }
  if (!windows?.length) throw new Error('等待光鸭云盘窗口超时');
  console.log(JSON.stringify(windows));
  if (!magnetLinks.length && !process.argv.includes('--attach')) {
    let foreground;
    for (let attempt = 0; attempt < 100; attempt++) {
      foreground = await evaluate(`(${bringAppToFront.toString()})()`);
      if (foreground) break;
      await delay(200);
    }
    if (!foreground) throw Error('未找到光鸭云盘主窗口或登录窗口，无法唤到前台');
  }
  const clipboard = await evaluate(`(() => {
    const restrictMagnetClipboard = ${restrictMagnetClipboard.toString()};
    const locateMagnetClipboard = ${locateMagnetClipboard.toString()};
    return (${installMagnetClipboard.toString()})();
  })()`, true);
  if (!clipboard?.clipboardMagnetOnly) throw Error('原生剪贴板磁力限制未安装');
  console.log(JSON.stringify(clipboard));
  // A link click in an already running app only opens the resolver; do not reinject active dialogs.
  if (!magnetLinks.length || !attach) {
    console.log(JSON.stringify(await evaluate(`(${installAppMenu.toString()})()`)));
    const installed = await evaluate(`(${installScripts.toString()})(${JSON.stringify(rendererSource)}.replace('/* GUANGYA_NATIVE_SEGMENTED */', () => (${buildSegmentedSource.toString()})()), ${installTmdbBridge.toString()})`, true);
    if (!installed.autoInjectInstalled || !(installed.watchedWindows > 0)) throw new Error('自动注入监听未安装');
    if (installed.initial.some(result => result?.error)) throw new Error('初次按钮注入失败：' + JSON.stringify(installed.initial));
    for (const result of installed.initial) if (result?.skipped) console.log('已跳过重注入：' + result.reason);
    if (installed.initial.some(result => result?.installed)) console.log(JSON.stringify(installed));
  }
  if (magnetLinks.length) {
    let result;
    for (let attempt = 0; attempt < 100; attempt++) {
      result = await evaluate(`(() => {
        const normalizeMagnetLinks = ${normalizeMagnetLinks.toString()};
        return (${openMagnetLinks.toString()})(${JSON.stringify(magnetLinks)});
      })()`, true);
      if (!result?.pending) break;
      await delay(200);
    }
    if (!result?.magnetOpened) throw Error('等待磁力云添加窗口超时，请确认光鸭云盘已登录');
    console.log(JSON.stringify(result));
  }
} finally {
  socket.close();
}
