// Serialized into Electron's main process; keep this function self-contained.
// 光鸭云盘全屏时关闭主窗口只调用 hide()。全屏窗口独占一个 Space，隐藏后该 Space 会留成黑屏。
// 这里只接管主窗口的 hide()：全屏时改为退出全屏并保留窗口，非全屏仍按原生逻辑隐藏。
export function installMainWindowFullscreenGuard() {
  const { app, BrowserWindow } = process.mainModule.require('electron');
  const key = '__guangyaFullscreenGuard';
  if (globalThis[key]) return globalThis[key].ensure();
  const guarded = new Set();
  const watched = new Set();
  const mainWindowUrl = /\/main\.html(?:[?#]|$)/;
  function isMainWindow(window) {
    try {
      if (!window || window.isDestroyed() || window.webContents.isDestroyed()) return false;
      return mainWindowUrl.test(window.webContents.getURL());
    } catch {
      return false;
    }
  }
  function guard(window) {
    if (guarded.has(window) || !isMainWindow(window)) return false;
    guarded.add(window);
    const hide = window.hide.bind(window);
    window.hide = function () {
      if (window.isDestroyed()) return hide();
      if (window.isFullScreen()) {
        // 应用在 close 处理里会先把窗口从“窗口”菜单排除，窗口保留时恢复。
        window.excludedFromShownWindowsMenu = false;
        window.setFullScreen(false);
        return;
      }
      return hide();
    };
    return true;
  }
  function watch(window) {
    if (!window || window.isDestroyed() || watched.has(window)) return;
    watched.add(window);
    const attempt = () => { guard(window); };
    if (window.webContents.isLoadingMainFrame()) window.webContents.once('did-finish-load', attempt);
    else attempt();
    window.once('closed', () => {
      watched.delete(window);
      guarded.delete(window);
    });
  }
  const created = (_event, window) => watch(window);
  app.on('browser-window-created', created);
  for (const window of BrowserWindow.getAllWindows()) watch(window);
  const api = {
    ensure() {
      for (const window of BrowserWindow.getAllWindows()) watch(window);
      return { windowGuardInstalled: true, guardedWindows: guarded.size };
    },
    dispose() {
      app.removeListener('browser-window-created', created);
      if (globalThis[key] === api) delete globalThis[key];
    },
    status: () => ({ guardedWindows: guarded.size }),
  };
  globalThis[key] = api;
  return api.ensure();
}
