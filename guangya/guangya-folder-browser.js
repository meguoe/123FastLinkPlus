(() => {
  if (window.location?.protocol === 'file:' && !window.location.pathname.endsWith('/main.html')) return { folderBrowserInstalled: false, reason: '非主窗口' };
  const key = '__guangyaFolderBrowser';
  window[key]?.destroy();
  let require;
  window.webpackChunk_swangpan_pc?.push([['guangya-folder-browser-' + Date.now()], {}, value => { require = value; }]);
  const factory = require?.m?.[11814];
  if (!factory || !String(factory).includes('cancel folder select')) throw Error('当前应用目录弹窗不兼容，请核对光鸭版本');
  const { React, Input, Breadcrumb, ConfigProvider, getThemeProviders } = window.__guangyaNativeUI.getFolderBrowserRuntime();
  const { createElement: h, useState, useRef, useEffect, useCallback } = React;
  const nativeUI = require(23219), hooks = require(5036), jsx = require(25270);
  const { Ay: NiceModal } = require(92061), originalFolder = require(11814).W;
  if (typeof hooks.gW !== 'function' || typeof NiceModal.show !== 'function' || !nativeUI.hr || !Breadcrumb) throw Error('无法定位原生目录组件');
  const originalShow = NiceModal.show;
  let active = 0, treeState;

  // The native modal keeps editing and HTTP. Ant Tree previously owned this cache.
  function useTree(options) {
    const tree = hooks.gW(options);
    const [status, setStatus] = useState({ loaded: new Set(), error: null });
    const [navigationBusy, setNavigationBusy] = useState(false);
    const running = useRef(new Map()), loaded = useRef(new Set()), alive = useRef(true);
    useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
    const load = useCallback((id, request) => {
      if (running.current.has(id)) return running.current.get(id);
      setStatus(value => ({ ...value, error: null }));
      if (loaded.current.has(id)) return Promise.resolve(true);
      const promise = (async () => {
        try {
          await request();
          loaded.current.add(id);
          if (alive.current) setStatus({ loaded: new Set(loaded.current), error: null });
          return true;
        } catch (error) {
          if (alive.current) setStatus(value => ({ ...value, error: error?.message || '目录加载失败，请重试' }));
          return false;
        } finally { running.current.delete(id); }
      })();
      running.current.set(id, promise);
      return promise;
    }, []);
    const rootId = String(options.root.id);
    const clearError = useCallback(() => setStatus(value => value.error ? { ...value, error: null } : value), []);
    const loadRootData = useCallback(() => load(rootId, tree.loadRootData), [load, rootId, tree.loadRootData]);
    const onLoadData = useCallback(node => load(String(node.key), () => tree.onLoadData(node)), [load, tree.onLoadData]);
    treeState = { ...tree, ...status, rootId, clearError, loadRootData, onLoadData, navigationBusy, setNavigationBusy };
    return treeState;
  }

  function FolderBrowser({ treeData, selectedKey, onSelect, state }) {
    const [query, setQuery] = useState('');
    const retry = useRef(null), navigating = useRef(false), alive = useRef(true);
    useEffect(() => { active++; alive.current = true; return () => { active--; alive.current = false; }; }, []);
    useEffect(() => { setQuery(''); retry.current = null; state.clearError(); }, [selectedKey, state.clearError]);
    const nodes = new Map();
    function collect(items) { for (const node of items) { nodes.set(String(node.key), node); collect(node.children || []); } }
    collect(treeData);
    const current = nodes.get(String(selectedKey)), ready = state.loaded.has(state.rootId);
    const path = current?.pathIds || [state.rootId];
    const needle = query.trim().toLocaleLowerCase();
    const children = (current?.children || []).filter(node => {
      const title = state.nodesMap[node.key]?.title ?? node.title;
      return typeof node.title !== 'string' || String(title).toLocaleLowerCase().includes(needle);
    });
    async function enter(node) {
      if (!node || navigating.current) return;
      navigating.current = true; state.setNavigationBusy(true);
      retry.current = () => enter(node);
      try {
        if (!(await state.saveEditing()).ok || !alive.current) return;
        if (!node.isLeaf && !await state.onLoadData(node)) return;
        if (alive.current) { onSelect(node.key); setQuery(''); retry.current = null; }
      } finally {
        navigating.current = false;
        if (alive.current) state.setNavigationBusy(false);
      }
    }
    const disabled = state.navigationBusy || state.loading;
    const items = path.map((id, index) => {
      const node = nodes.get(String(id));
      const title = node?.title ?? state.nodesMap[id]?.title ?? '';
      if (index === path.length - 1) return { key: id, title: h('span', { 'aria-current': 'page' }, title) };
      return { key: id, title, href: disabled ? undefined : '#', 'aria-disabled': disabled || undefined,
        onClick: event => { event.preventDefault(); if (!disabled) return enter(node); } };
    });
    let content;
    if (disabled || !ready && !state.error) content = h('div', { role: 'status', className: 'guangya-folder-empty' }, '加载中...');
    else if (!ready) content = null;
    else if (!current) content = h('div', { role: 'alert' }, '当前目录不存在，请关闭后重试');
    else if (!children.length) content = h('div', { role: 'status', className: 'guangya-folder-empty' }, needle ? '无匹配目录' : '空目录');
    else content = children.map(node => h('button', {
      key: node.key, type: 'button', className: 'guangya-folder-row', 'data-folder-id': node.key,
      onClick: () => enter(node),
    }, node.icon, h('span', { className: 'guangya-folder-name' }, node.title), h('span', { 'aria-hidden': true }, '›')));
    const providers = getThemeProviders();
    const config = providers.find(provider => typeof provider.value.getPrefixCls === 'function')?.value;
    const theme = providers.find(provider => provider.value.token)?.value;
    return h('div', { className: 'guangya-folder-browser', 'data-guangya-folder-browser': '', 'aria-busy': disabled },
      h(ConfigProvider, { prefixCls: config?.getPrefixCls(), theme: theme ? { token: theme.token } : undefined }, h(Breadcrumb, { items })),
      h(Input, { value: query, allowClear: true, disabled: !ready || disabled, placeholder: '筛选当前层目录',
        'aria-label': '筛选当前层目录', onChange: event => setQuery(event.target.value) }),
      h('div', { className: 'guangya-folder-list', 'aria-label': '当前层目录' },
        !disabled && state.error ? h('div', { role: 'alert', className: 'guangya-folder-error' },
          h('span', null, state.error), h('button', { type: 'button', onClick: () => retry.current ? retry.current() : state.loadRootData() }, '重试')) : null,
        content));
  }

  // Run the shipped factory with local dependencies, without eval or altering
  // cached exports. Other users of the original directory picker stay intact.
  function localRequire(id) {
    if (id === 5036) return { ...hooks, gW: useTree };
    if (id === 25270) return { ...jsx, jsx(type, props, ...args) {
      if (type === nativeUI.hr) return jsx.jsx(FolderBrowser, { ...props, state: treeState }, ...args);
      if (type === nativeUI.$n && ['确定', '新建文件夹'].includes(props.children)) props = { ...props, disabled: props.disabled || treeState.navigationBusy };
      return jsx.jsx(type, props, ...args);
    } };
    return require(id);
  }
  Object.assign(localRequire, require);
  const module = { exports: {} };
  factory(module, module.exports, localRequire);
  const replacement = module.exports.W;
  function show(component, options, ...args) {
    return originalShow.call(this, component === originalFolder && ['移动到', '复制到'].includes(options?.title) ? replacement : component, options, ...args);
  }
  const style = document.createElement('style');
  style.textContent = `
    .guangya-folder-browser { display:flex; flex-direction:column; gap:12px; height:100%; min-height:0; }
    .guangya-folder-browser nav ol { flex-wrap:wrap; overflow-wrap:anywhere; }
    .guangya-folder-browser nav li { min-width:0; max-width:100%; }
    .guangya-folder-browser nav input { min-width:160px; max-width:100%; }
    .guangya-folder-list { flex:1; min-height:120px; overflow:auto; }
    .guangya-folder-row { display:flex; align-items:center; gap:10px; width:100%; padding:10px 8px; border:0; border-radius:6px; background:transparent; color:inherit; font:inherit; text-align:left; cursor:pointer; }
    .guangya-folder-row:hover { background:color-mix(in srgb,currentColor 6%,transparent); }
    .guangya-folder-name { flex:1; min-width:0; overflow-wrap:anywhere; }
    .guangya-folder-empty { display:flex; align-items:center; justify-content:center; flex-direction:column; gap:12px; min-height:120px; }
    .guangya-folder-error { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 8px; }
  `;
  document.head.append(style);
  NiceModal.show = show;
  const api = { destroy() {
    if (active) throw Error('目录弹窗正在使用，请先关闭后再注入');
    if (NiceModal.show === show) NiceModal.show = originalShow;
    style.remove();
    if (window[key] === api) delete window[key];
  } };
  window[key] = api;
  return { folderBrowserInstalled: true };
})();
