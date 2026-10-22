export function normalizeMagnetLinks(links) {
  if (!Array.isArray(links) || !links.length) throw Error('没有收到磁力链接');
  return [...new Set(links.map(link => {
    if (typeof link !== 'string' || !/^magnet:\?\S+$/i.test(link.trim())) throw Error('只支持 magnet:? 磁力链接');
    return link.trim();
  }))];
}

// Serialized into Electron's main process together with normalizeMagnetLinks.
export async function openMagnetLinks(links) {
  links = normalizeMagnetLinks(links);
  const { BrowserWindow } = process.mainModule.require('electron');
  const windows = BrowserWindow.getAllWindows().filter(window => !window.isDestroyed() && !window.webContents.isDestroyed());
  const main = windows.find(window => /\/main\.html(?:[?#]|$)/.test(window.webContents.getURL()));
  if (!main) {
    const login = windows.find(window => /\/login\.html(?:[?#]|$)/.test(window.webContents.getURL()));
    if (!login || login.webContents.isLoadingMainFrame()) return { pending: true };
    if (login.isMinimized()) login.restore();
    login.show(); login.focus();
    throw Error('请先登录光鸭云盘，再点击磁力链接');
  }
  if (main.webContents.isLoadingMainFrame()) return { pending: true };
  return main.webContents.executeJavaScript(`(async () => {
    if (!window.api?.xbase?.login?.getStatus || !window.api?.cloudAdd?.openResolver) return { pending: true };
    const status = await window.api.xbase.login.getStatus();
    if (!status.ok) throw Error(status.msg || '无法读取登录状态');
    if (!status.data?.signedIn) throw Error('请先登录光鸭云盘，再点击磁力链接');
    const result = await window.api.cloudAdd.openResolver({ source: 'assistant', urls: ${JSON.stringify(links)} });
    if (!result.ok || !result.data?.opened) throw Error(result.msg || '未能打开云添加窗口');
    return { magnetOpened: true, count: ${links.length} };
  })()`);
}

// Offline check: no Electron, clipboard or network access.
if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href && process.argv[2] === '--self-test') {
  const assert = (await import('node:assert/strict')).default;
  const vm = await import('node:vm');
  const link = 'magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&dn=a%20b';
  assert.deepEqual(normalizeMagnetLinks([link, ` ${link} `]), [link]);
  assert.deepEqual(normalizeMagnetLinks([link.toUpperCase()]), [link.toUpperCase()]);
  for (const invalid of [[], ['https://a/a.webp'], ['ftp://a/file'], ['ed2k://abc'], ['thunder://abc'], ['0123456789abcdef0123456789abcdef01234567'], ['magnet:?'], [link, 'https://a/file'], ['magnet:?xt=x\nextra']]) {
    assert.throws(() => normalizeMagnetLinks(invalid));
  }
  const calls = [];
  let signedIn = true, result = { ok: true, data: { opened: true } }, main = true, login = false, loading = false;
  const contents = { isDestroyed: () => false, getURL: () => `file:///app/${main ? 'main' : 'login'}.html`, isLoadingMainFrame: () => loading,
    executeJavaScript: source => vm.runInNewContext(source, { window: { api: {
      xbase: { login: { getStatus: async () => ({ ok: true, data: { signedIn } }) } },
      cloudAdd: { openResolver: async input => { calls.push(input); return result; } },
    } } }) };
  const window = { isDestroyed: () => false, webContents: contents, isMinimized: () => false, show() {}, focus() {} };
  const context = { process: { mainModule: { require: () => ({ BrowserWindow: { getAllWindows: () => main || login ? [window] : [] } }) } } };
  vm.createContext(context);
  vm.runInContext(`const normalizeMagnetLinks = ${normalizeMagnetLinks.toString()}; globalThis.open = ${openMagnetLinks.toString()};`, context);
  const open = context.open([link]);
  assert.equal((await open).magnetOpened, true);
  assert.equal(calls[0].urls[0], link);
  assert.equal(calls[0].source, 'assistant');
  loading = true; assert.equal((await context.open([link])).pending, true); loading = false;
  signedIn = false; await assert.rejects(context.open([link]), /请先登录/); assert.equal(calls.length, 1); signedIn = true;
  result = { ok: false, msg: 'native error' }; await assert.rejects(context.open([link]), /native error/);
  result = { ok: true, data: { opened: false } }; await assert.rejects(context.open([link]), /未能打开/);
  main = false; assert.equal((await context.open([link])).pending, true);
  login = true; await assert.rejects(context.open([link]), /请先登录/);
  await assert.rejects(context.open(['https://a/a.webp']), /只支持/);
  main = true; result = { ok: true, data: { opened: true } };
  const quoted = 'magnet:?xt=x&dn=\'"`\\${globalThis.pwned=1}';
  await context.open([quoted]);
  assert.equal(calls.at(-1).urls[0], quoted);
  assert.equal(context.pwned, undefined);
  console.log('磁力直达弹窗离线检查通过');
}
