(() => {
  const key = '__guangyaFileListSort';
  window[key]?.destroy();
  const prefix = '[光鸭自定义]';
  const sortFields = { fileName: '文件名称', fileSize: '文件大小', ctime: '创建时间', utime: '修改时间', ext: '文件类型' };
  const headerFields = { 文件名: '文件名称', 大小: '文件大小', 类型: '文件类型', 创建时间: '创建时间', 修改时间: '修改时间' };
  const headerSelector = '[data-ui="file-list-table"][data-slot="header"]';
  const sortStorageKey = '__guangyaFileListSort';
  // Keeps a native sort that refuses the cached value from looping with the still-connected observer.
  const maxRestoreAttempts = 3;
  let destroyed = false, restoreTimer, restoreObserver, restoreAttempts = 0;
  function validSort(value) {
    return value && Object.values(sortFields).includes(value.field) && ['升序', '降序'].includes(value.direction);
  }
  let savedSort;
  try {
    const value = JSON.parse(window.localStorage.getItem(sortStorageKey));
    if (validSort(value)) savedSort = { field: value.field, direction: value.direction };
  } catch { console.warn(prefix, '无法读取排序缓存，保留原生排序'); }
  function saveSort(state) {
    const value = { field: state.currentField, direction: state.currentDirection };
    if (!validSort(value)) return;
    savedSort = value;
    try { window.localStorage.setItem(sortStorageKey, JSON.stringify(value)); }
    catch { console.warn(prefix, '无法保存排序缓存'); }
  }
  function tableProps(fiber) {
    const props = fiber?.memoizedProps;
    return props?.titleColumnKey === 'fileName' && Array.isArray(props.columns) && typeof props.onSortChange === 'function' ? props : null;
  }
  function tableOwner(element) {
    const fiberKey = Object.keys(element ?? {}).find(name => name.startsWith('__reactFiber$'));
    let owner = element?.[fiberKey];
    while (owner && !tableProps(owner)) owner = owner.return;
    return owner;
  }
  function committedOwner(owner) {
    let root = owner;
    while (root?.return) root = root.return;
    const pending = root?.stateNode?.current ? [root.stateNode.current] : [];
    while (pending.length) {
      const fiber = pending.pop();
      if (fiber === owner || fiber === owner.alternate) return fiber;
      if (fiber.sibling) pending.push(fiber.sibling);
      if (fiber.child) pending.push(fiber.child);
    }
  }
  function nativeSort(owner) {
    // Sorting can remount the table and detach the captured Fiber.
    const current = committedOwner(owner) ?? committedOwner(tableOwner(document.querySelector(headerSelector)));
    const state = tableProps(current)?.sortState;
    const currentField = Object.hasOwn(sortFields, state?.columnKey) ? sortFields[state.columnKey] : null;
    const currentDirection = state?.order === 'ascend' ? '升序' : state?.order === 'descend' ? '降序' : null;
    return { currentField, currentDirection };
  }
  function cancelRestore() {
    clearTimeout(restoreTimer);
    restoreAttempts = 0;
  }
  function restoreSort() {
    if (destroyed) return;
    const owner = tableOwner(document.querySelector(headerSelector));
    if (!owner || !tableProps(committedOwner(owner))) return;
    const state = nativeSort(owner);
    if (!state.currentField || !state.currentDirection) return;
    if (!savedSort) { saveSort(state); return; }
    const matches = () => {
      const current = nativeSort(owner);
      return current.currentField === savedSort.field && current.currentDirection === savedSort.direction;
    };
    if (matches()) { restoreAttempts = 0; return; }
    if (restoreAttempts >= maxRestoreAttempts) return;
    restoreAttempts += 1;
    try {
      let require, flushSync;
      window.webpackChunk_swangpan_pc?.push([['guangya-sort-' + Date.now()], {}, value => { require = value; }]);
      for (const [id, factory] of Object.entries(require?.m ?? {})) {
        const source = String(factory);
        if (!source.includes('flushSync') || !source.includes('createPortal')) continue;
        const exports = require(id);
        flushSync = [exports, ...Object.values(exports ?? {})].find(value => typeof value?.flushSync === 'function')?.flushSync;
        if (flushSync) break;
      }
      if (!flushSync) throw Error('无法定位原生同步更新入口');
      const props = tableProps(committedOwner(owner));
      const columnKey = Object.keys(sortFields).find(key => sortFields[key] === savedSort.field);
      flushSync(() => props.onSortChange({ columnKey, order: savedSort.direction === '升序' ? 'ascend' : 'descend' }));
      if (!matches()) throw Error('原生排序状态未还原');
      restoreAttempts = 0;
      console.info(prefix, '排序缓存已还原', { ...savedSort });
    } catch (error) { console.warn(prefix, '排序缓存还原失败', { reason: error.message }); }
  }
  function scheduleRestore() {
    clearTimeout(restoreTimer);
    restoreTimer = setTimeout(restoreSort, 0);
  }
  function onSortClick(event) {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const cell = target?.closest('button[data-ui="file-list-table"][data-slot="headerCell"][data-sortable="true"]');
    const header = cell?.closest(headerSelector);
    if (!header || cell.disabled || cell.getAttribute('aria-disabled') === 'true') return;
    const label = cell.textContent.trim();
    const field = Object.hasOwn(headerFields, label) ? headerFields[label] : null;
    const owner = tableOwner(header);
    if (!field || !owner) return;
    cancelRestore();
    // Read the table's committed sortState after its native click handler.
    queueMicrotask(() => {
      if (destroyed) return;
      const { currentField, currentDirection } = nativeSort(owner);
      saveSort({ currentField, currentDirection });
      console.info(prefix, '排序表头点击', {
        field,
        currentField,
        currentDirection,
        ...(!currentField || !currentDirection ? { reason: '无法读取原生表头当前排序状态' } : {}),
      });
    });
  }
  document.addEventListener('click', onSortClick);
  // Stays connected: leaving the file list (menu switch, route change) and coming back remounts the table.
  restoreObserver = new MutationObserver(scheduleRestore);
  restoreObserver.observe(document, { subtree: true, childList: true });
  scheduleRestore();
  const api = {
    destroy() {
      destroyed = true;
      cancelRestore();
      restoreObserver.disconnect();
      document.removeEventListener('click', onSortClick);
      if (window[key] === api) delete window[key];
    },
  };
  window[key] = api;
  console.info(prefix, '排序表头监听已安装');
  return { installed: true };
})();
