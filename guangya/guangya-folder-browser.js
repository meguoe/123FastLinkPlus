(() => {
  if (window.location?.protocol === 'file:' && !window.location.pathname.endsWith('/main.html')) return { folderBrowserInstalled: false, reason: '非主窗口' };
  const key = '__guangyaFolderBrowser';
  window[key]?.destroy();
  let require;
  window.webpackChunk_swangpan_pc?.push([['guangya-folder-browser-' + Date.now()], {}, value => { require = value; }]);
  const modules = Object.entries(require?.m ?? {}).map(([id, factory]) => ({ id, source: String(factory) }));
  function findNative(label, markers, matches) {
    const candidates = new Set();
    for (const { id, source } of modules) {
      if (!markers.every(marker => source.includes(marker))) continue;
      const exports = require(id);
      for (const value of [exports, ...Object.values(exports ?? {})]) {
        if (value && matches(value)) candidates.add(value);
      }
    }
    if (candidates.size !== 1) throw Error(`无法唯一定位快捷目录${label}（匹配 ${candidates.size}），请核对光鸭版本`);
    return [...candidates][0];
  }
  const hasSource = (value, markers) => typeof value === 'function' && markers.every(marker => String(value).includes(marker));
  const Modal = findNative('弹窗组件', ['swangpan-modal__container', 'closeOnPressEscape'],
    value => hasSource(value.render, ['swangpan-modal__container', 'closeOnPressEscape', 'maskClosable']));
  const Button = findNative('按钮组件', ['swangpan-button__root', 'iconPosition'],
    value => hasSource(value.render, ['swangpan-button__root', 'iconPosition', 'loading']));
  const useFolderFrames = findNative('分页接口', ['Failed to load file list frame:', 'rootFrameTitle', 'loadMoreActive'],
    value => hasSource(value, ['Failed to load file list frame:', 'rootFrameTitle', 'loadMoreActive']));
  const createFolderStore = findNative('状态仓库', ['firstPageParam', 'activeFramePathKey', 'replaceFramePage'],
    value => hasSource(value, ['firstPageParam', 'activeFramePathKey', 'replaceFramePage', 'syncPath']));
  const getFolders = findNative('列表请求', ['/userres/v1/file/get_file_list'],
    value => hasSource(value, ['/userres/v1/file/get_file_list', 'parentId', 'signal', 'extra']));
  const NiceModal = findNative('弹窗管理', ['NiceModalId', 'nice-modal/show'],
    value => ['create', 'show', 'hide', 'register'].every(name => typeof value[name] === 'function'));
  const useModal = findNative('弹窗 Hook', ['No modal id found in NiceModal.useModal.'],
    value => hasSource(value, ['No modal id found in NiceModal.useModal.']));
  const safebox = findNative('类型常量', ['SAFEBOX', 'NORMAL', 'TRASH'],
    value => typeof value.SAFEBOX === 'number' && value.NORMAL === 0 && typeof value.TRASH === 'number').SAFEBOX;
  const { React, Input, Breadcrumb, ConfigProvider, getThemeProviders } = window.__guangyaNativeUI.getFolderBrowserRuntime();
  const { createElement: h, useState, useEffect } = React;
  const params = { pageSize: 100, resType: 2 };
  const fetcher = (body, signal) => getFolders(body, { signal });
  let active = 0;

  // Use the same frame cache, pagination and cancellation as the native 1.1.2 picker.
  // Moving/copying keeps the native modal and its request flow entirely intact.
  const ShortcutPicker = NiceModal.create(({ initialItems }) => {
    const modal = useModal();
    const [store] = useState(() => createFolderStore());
    const [folderPath, setFolderPath] = useState([]);
    const [query, setQuery] = useState('');
    const [selection, setSelection] = useState(() => initialItems.map(item => ({ ...item })));
    const tree = useFolderFrames({ store, mode: 'page', folderPath, params, fetcher,
      rootFrameId: '', rootFrameTitle: '全部文件', enabled: modal.visible });
    useEffect(() => { active++; return () => { active--; }; }, []);
    const currentId = folderPath.at(-1)?.id ?? '';
    const frame = tree.activeFrame?.id === currentId ? tree.activeFrame : null;
    const busy = !frame || frame.isLoading || !frame.hydrated && !frame.error;
    const error = frame?.error;
    const currentPath = ['全部文件', ...folderPath.map(item => item.name)];
    const needle = query.trim().toLocaleLowerCase();
    const folders = frame && !busy && !error ? tree.items.filter(item => item.resType === 2 && item.dirType !== safebox &&
      String(item.fileName).toLocaleLowerCase().includes(needle)) : [];
    function navigate(next) { setFolderPath(next); setQuery(''); }
    function toggle(folder) {
      const item = { id: String(folder.fileId), name: folder.fileName, path: [...currentPath, folder.fileName].join('/') };
      setSelection(items => items.some(value => value.id === item.id)
        ? items.filter(value => value.id !== item.id) : items.length < 5 ? [...items, item] : items);
    }
    const cancel = () => { modal.reject('cancel folder select'); modal.hide(); };
    const providers = getThemeProviders();
    const config = providers.find(provider => typeof provider.value.getPrefixCls === 'function')?.value;
    const theme = providers.find(provider => provider.value.token)?.value;
    const breadcrumbs = [{ title: '全部文件', onClick: () => navigate([]) },
      ...folderPath.map((item, index) => ({ title: item.name, onClick: () => navigate(folderPath.slice(0, index + 1)) }))];
    return h(Modal, { open: modal.visible, title: '选择快捷目录', width: 680, footer: null,
      onCancel: cancel, afterClose: modal.remove, classNames: { body: 'guangya-shortcut-picker-body' } },
      h('div', { className: 'guangya-shortcut-picker', 'data-guangya-folder-browser': '' },
        h(ConfigProvider, { prefixCls: config?.getPrefixCls(), theme: theme ? { token: theme.token } : undefined }, h(Breadcrumb, { items: breadcrumbs })),
        h(Input, { value: query, allowClear: true, disabled: busy || !!error, placeholder: '筛选当前层目录',
          'aria-label': '筛选当前层目录', onChange: event => setQuery(event.target.value) }),
        h('div', { className: 'guangya-folder-list', 'aria-label': '当前层目录', 'aria-busy': busy },
          busy ? h('div', { role: 'status' }, '加载中...') : error
            ? h('div', { role: 'alert' }, error, h('button', { type: 'button', onClick: () => tree.refreshActive() }, '重试'))
            : folders.length ? folders.map(folder => {
              const checked = selection.some(item => item.id === String(folder.fileId));
              return h('div', { key: folder.fileId, className: 'guangya-folder-choice' },
                h('input', { type: 'checkbox', checked, 'data-folder-check': folder.fileId, 'aria-label': `选择 ${folder.fileName}`,
                  disabled: !checked && selection.length >= 5, onChange: () => toggle(folder) }),
                h('button', { type: 'button', className: 'guangya-folder-row', 'data-folder-id': folder.fileId,
                  onClick: () => navigate([...folderPath, { id: String(folder.fileId), name: folder.fileName }]) },
                  h('span', { className: 'guangya-folder-name' }, folder.fileName), h('span', { 'aria-hidden': true }, '›')));
            }) : h('div', { role: 'status' }, needle ? '无匹配目录' : '空目录'),
          !busy && !error && frame?.hasMore ? h('div', { className: 'guangya-folder-more' },
            h('span', { role: 'status' }, '仅筛选已加载目录，还有更多目录未加载'),
            h('button', { type: 'button', onClick: () => tree.loadMoreActive() }, '加载更多')) : null),
        h('div', { className: 'guangya-shortcut-picker-actions' },
          h('span', { role: 'status', 'aria-live': 'polite' }, `已选 ${selection.length}/5`),
          h(Button, { className: 'guangya-shortcut-clear', variant: 'outline', disabled: !selection.length, onClick: () => setSelection([]) }, '清空'),
          h(Button, { variant: 'outline', onClick: cancel }, '取消'),
          h(Button, { variant: 'primary', disabled: busy || !!error,
            onClick: () => { if (!busy && !error) { modal.resolve(selection); modal.hide(); } } }, '确定'))));
  });
  const style = document.createElement('style');
  style.textContent = `
    .guangya-shortcut-picker { display:flex; flex-direction:column; gap:12px; height:min(420px,calc(100vh - 180px)); min-height:0; }
    .guangya-shortcut-picker nav ol { flex-wrap:wrap; overflow-wrap:anywhere; }
    .guangya-folder-list { flex:1; min-height:120px; overflow:auto; }
    .guangya-folder-row { display:flex; align-items:center; gap:10px; flex:1; min-width:0; padding:10px 8px; border:0; border-radius:6px; background:transparent; color:inherit; font:inherit; text-align:left; cursor:pointer; }
    .guangya-folder-row:hover { background:color-mix(in srgb,currentColor 6%,transparent); }
    .guangya-folder-name { flex:1; min-width:0; overflow-wrap:anywhere; }
    .guangya-folder-choice { display:flex; align-items:center; gap:8px; }
    .guangya-folder-choice > input { flex:none; width:16px; height:16px; margin:8px; accent-color:var(--ant-color-primary,#1677ff); }
    .guangya-folder-more { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 8px; }
    .guangya-shortcut-picker-actions { display:flex; flex:none; align-items:center; justify-content:flex-end; gap:8px; }
    .guangya-shortcut-picker-actions > [role="status"] { color:#888; font-size:13px; white-space:nowrap; }
    .guangya-shortcut-clear { margin-right:auto; }
  `;
  document.head.append(style);
  const api = { select(initialItems = []) {
    if (window[key] !== api) throw Error('目录选择组件已卸载，请重新注入');
    if (active) throw Error('目录弹窗正在使用，请先关闭');
    return NiceModal.show(ShortcutPicker, { initialItems });
  }, destroy() {
    if (active) throw Error('目录弹窗正在使用，请先关闭后再注入');
    style.remove();
    if (window[key] === api) delete window[key];
  } };
  window[key] = api;
  return { folderBrowserInstalled: true };
})();
