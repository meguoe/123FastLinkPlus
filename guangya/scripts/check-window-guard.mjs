// Offline only: run the serialized guard against Electron window/event stubs.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { installMainWindowFullscreenGuard } from '../guangya-window-guard.mjs';

class Emitter {
  constructor() { this.listeners = new Map(); }
  on(name, listener) { this.listeners.set(name, [...this.listeners.get(name) ?? [], listener]); return this; }
  once(name, listener) { const wrapper = (...args) => { this.off(name, wrapper); listener(...args); }; return this.on(name, wrapper); }
  off(name, listener) { const list = this.listeners.get(name); if (!list) return; const index = list.indexOf(listener); if (index >= 0) list.splice(index, 1); }
  removeListener(name, listener) { this.off(name, listener); }
  emit(name, ...args) { for (const listener of [...this.listeners.get(name) ?? []]) listener(...args); }
  count(name) { return (this.listeners.get(name) ?? []).length; }
}

class FakeWindow extends Emitter {
  constructor({ url = '', loading = false, fullScreen = false, excluded = false } = {}) {
    super();
    this.url = url; this.loading = loading; this.fullScreen = fullScreen; this.destroyed = false;
    this.excludedFromShownWindowsMenu = excluded;
    this.hides = 0; this.fullScreenCalls = [];
    this.webContents = Object.assign(new Emitter(), {
      isDestroyed: () => this.destroyed,
      getURL: () => this.url,
      isLoadingMainFrame: () => this.loading,
    });
  }
  isDestroyed() { return this.destroyed; }
  isFullScreen() { return this.fullScreen; }
  setFullScreen(flag) { this.fullScreenCalls.push(flag); this.fullScreen = flag; }
  hide() { this.hides += 1; }
  destroy() { this.destroyed = true; this.emit('closed'); }
}

const app = new Emitter();
const windows = [];
const electron = { app, BrowserWindow: { getAllWindows: () => windows } };
const context = vm.createContext({ process: { mainModule: { require: () => electron } } });
const install = () => vm.runInContext(`(${installMainWindowFullscreenGuard.toString()})()`, context);

const mainUrl = 'file:///Applications/%E5%85%89%E9%B8%AD%E4%BA%91%E7%9B%98.app/Contents/Resources/app.asar/out/renderer/main.html#/home/all';
const main = new FakeWindow({ url: mainUrl, fullScreen: true, excluded: true });
const player = new FakeWindow({ url: 'file:///app/out/renderer/video-player.html', fullScreen: true });
windows.push(main, player);
const installed = install();
assert.equal(installed.windowGuardInstalled, true);
assert.equal(installed.guardedWindows, 1, '只接管主窗口');
assert.equal(app.count('browser-window-created'), 1);

// 全屏时 hide 只退出全屏，不隐藏窗口，并恢复“窗口”菜单可见性。
main.hide();
assert.deepEqual(main.fullScreenCalls, [false]);
assert.equal(main.hides, 0);
assert.equal(main.excludedFromShownWindowsMenu, false);
assert.equal(main.isFullScreen(), false);

// 退出全屏后再次 hide 按原生逻辑隐藏。
main.hide();
assert.equal(main.hides, 1);

// 非主窗口不受影响。
player.hide();
assert.equal(player.hides, 1);
assert.deepEqual(player.fullScreenCalls, []);

// 运行中新建主窗口：加载完成后再接管。
const later = new FakeWindow({ url: '', loading: true });
windows.push(later);
app.emit('browser-window-created', {}, later);
assert.equal(later.hides, 0);
later.url = mainUrl; later.loading = false; later.fullScreen = true;
later.webContents.emit('did-finish-load');
later.hide();
assert.deepEqual(later.fullScreenCalls, [false]);
assert.equal(later.hides, 0);

// 重复注入复用同一层保护，不重复挂监听。
assert.equal(install().guardedWindows, 2);
assert.equal(app.count('browser-window-created'), 1);
main.hide();
assert.equal(main.hides, 2);

// 销毁后不再保留记录；dispose 移除监听。
later.destroy();
assert.equal(install().guardedWindows, 1);
const api = vm.runInContext('globalThis.__guangyaFullscreenGuard', context);
assert.equal(api.status().guardedWindows, 1);
api.dispose();
assert.equal(app.count('browser-window-created'), 0);

console.log('主窗口全屏关闭保护、窗口复用与重复注入离线检查通过');
