// Serialized into Electron's main process; keep this function self-contained.
export function installAppMenu() {
  const { Menu, MenuItem, BrowserWindow, dialog } = process.mainModule.require('electron');
  const key = '__guangyaAppMenu';
  if (globalThis[key]) return globalThis[key].ensure();
  const id = 'guangya-assistant-menu';
  const originalSetMenu = Menu.setApplicationMenu;
  function withAssistant(menu) {
    menu ??= Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }]);
    if (!menu.getMenuItemById(id)) menu.append(new MenuItem({
      id, label: '云助手', submenu: [{
        label: '开发者工具', accelerator: 'CommandOrControl+Alt+I',
        click() {
          const window = [BrowserWindow.getFocusedWindow(), ...BrowserWindow.getAllWindows()].find(window =>
            window && !window.isDestroyed() && !window.webContents.isDestroyed() && window.webContents.getType() === 'window');
          if (!window) return;
          if (window.webContents.getLastWebPreferences().devTools === false) {
            dialog.showErrorBox('无法打开开发者工具', '请正常退出光鸭云盘，再通过光鸭云助手启动。');
            return;
          }
          window.webContents.openDevTools({ mode: 'detach' });
        },
      }],
    }));
    return menu;
  }
  // The app rebuilds its menu; keep the entry without rebuilding native items.
  Menu.setApplicationMenu = function(menu) { return originalSetMenu.call(this, withAssistant(menu)); };
  const api = { ensure() {
    Menu.setApplicationMenu(Menu.getApplicationMenu());
    return { menuInstalled: true };
  } };
  globalThis[key] = api;
  return api.ensure();
}
