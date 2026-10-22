// Serialized into Electron's main process; never expose a general-purpose network proxy.
export async function installTmdbBridge(contents) {
  const { net } = process.mainModule.require('electron');
  const registry = globalThis.__guangyaTmdbBridges ??= new WeakMap();
  const binding = '__guangyaTmdbSend';
  if (contents.isDestroyed()) return { skipped: true, reason: '窗口已关闭' };
  // WebContents.debugger throws after destruction; retain the EventEmitter while alive.
  const debuggerApi = contents.debugger;
  let state = registry.get(contents);
  const upgrading = state && state.version !== 3;
  if (upgrading) {
    if (state.active.size) throw Error('TMDB 请求正在进行，请稍后重新加载');
    // Upgrade the owned bridge without touching other debugger listeners.
    const legacy = debuggerApi.listeners('message').filter(listener => {
      const source = listener.toString();
      return source.includes("params.name !== binding") && source.includes('TMDB 请求地址或参数无效');
    });
    if (legacy.length !== 1) throw Error('TMDB 旧通道无法安全升级，请重启应用');
    debuggerApi.removeListener('message', legacy[0]);
    registry.delete(contents); state = null;
  }
  if (!state) {
    if (debuggerApi.isAttached() && !upgrading) throw Error('TMDB 请求通道无法安装：调试器已被占用');
    const active = new Map();
    const message = async (_event, method, params) => {
      if (method !== 'Runtime.bindingCalled' || params.name !== binding) return;
      let payload;
      try { payload = JSON.parse(params.payload); } catch { return; }
      const id = payload?.id;
      if (typeof id !== 'string' || id.length > 100) return;
      if (payload.type === 'cancel') { active.get(id)?.abort(); return; }
      const settle = value => {
        if (contents.isDestroyed()) return;
        return contents.executeJavaScript(`window.__guangyaTmdbSettle?.(${JSON.stringify({ id, ...value })})`).catch(() => {});
      };
      if (active.has(id)) return;
      let url;
      try {
        if (typeof payload.url !== 'string' || payload.url.length > 8192) throw Error();
        url = new URL(payload.url);
        if (url.origin !== 'https://api.themoviedb.org' || url.username || url.password || url.hash || !/^\/3\/(?:configuration|search\/(?:tv|movie)|(?:tv|movie)\/[1-9]\d*)$/.test(url.pathname)) throw Error();
        const allowed = new Set(['api_key', 'language', 'query', 'append_to_response', 'first_air_date_year', 'year', 'page']);
        for (const name of url.searchParams.keys()) if (!allowed.has(name)) throw Error();
        if (url.searchParams.has('page') && (!/^\/3\/search\/(?:tv|movie)$/.test(url.pathname) || url.searchParams.getAll('page').length !== 1 || !/^[1-9]\d{0,2}$/.test(url.searchParams.get('page')) || Number(url.searchParams.get('page')) > 500)) throw Error();
        if (payload.authorization && !/^Bearer [A-Za-z0-9._-]{1,4096}$/.test(payload.authorization)) throw Error();
        if (active.size >= 4) throw Error();
      } catch { await settle({ error: 'TMDB 请求地址或参数无效' }); return; }
      const controller = new AbortController();
      active.set(id, controller);
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await net.fetch(url.toString(), {
          method: 'GET', credentials: 'omit', redirect: 'error', signal: controller.signal,
          headers: payload.authorization ? { Authorization: payload.authorization } : {},
        });
        const data = await response.json();
        await settle({ ok: response.ok, status: response.status, data });
      } catch {
        // Native errors may contain the request URL and API key. Never forward or log them.
        await settle({ error: 'TMDB 网络请求失败或超时，请检查网络和密钥' });
      } finally { clearTimeout(timer); active.delete(id); }
    };
    debuggerApi.on('message', message);
    contents.once('destroyed', () => {
      for (const controller of active.values()) controller.abort();
      debuggerApi.removeListener('message', message);
      registry.delete(contents);
    });
    state = { active, version: 3 };
    registry.set(contents, state);
  }
  if (!debuggerApi.isAttached()) debuggerApi.attach('1.3');
  await debuggerApi.sendCommand('Runtime.enable');
  if (contents.isDestroyed()) return { skipped: true, reason: '窗口已关闭' };
  await debuggerApi.sendCommand('Runtime.addBinding', { name: binding });
  if (contents.isDestroyed()) return { skipped: true, reason: '窗口已关闭' };
  return contents.executeJavaScript(`(${installClient.toString()})()`);

  function installClient() {
    if (window.__guangyaTmdbFetch) return { tmdbBridge: true };
    const pending = new Map();
    const prefix = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    let sequence = 0;
    window.__guangyaTmdbSettle = result => pending.get(result.id)?.(result);
    window.__guangyaTmdbFetch = (url, { signal, headers = {} } = {}) => new Promise((resolve, reject) => {
      signal?.throwIfAborted();
      const id = prefix + '-' + (++sequence);
      const send = payload => window.__guangyaTmdbSend(JSON.stringify({ id, ...payload }));
      let timer;
      const complete = result => {
        if (!pending.delete(id)) return;
        clearTimeout(timer); signal?.removeEventListener('abort', abort);
        if (result.error) reject(Error(result.error));
        else resolve({ ok: result.ok, status: result.status, json: async () => result.data });
      };
      const abort = () => { try { send({ type: 'cancel' }); } catch {} complete({ error: 'TMDB 请求已取消' }); };
      pending.set(id, complete);
      signal?.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => { try { send({ type: 'cancel' }); } catch {} complete({ error: 'TMDB 网络请求超时' }); }, 17000);
      try { send({ url: String(url), authorization: headers.Authorization || '' }); }
      catch { complete({ error: 'TMDB 请求通道不可用，请重新运行启动器' }); }
    });
    // Existing open dialogs retain their closures. Route only their TMDB fetches through the new channel.
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      if (typeof url === 'string' && url.startsWith('https://api.themoviedb.org/3/')) return window.__guangyaTmdbFetch(url, options);
      return originalFetch.call(this, url, options);
    };
    return { tmdbBridge: true };
  }
}
