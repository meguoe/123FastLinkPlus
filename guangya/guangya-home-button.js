(() => {
  const key = '__guangyaHomeTestButton';
  window[key]?.destroy();
  const prefix = '[光鸭自定义]';
  const hidden = new Set();
  const style = document.createElement('style');
  style.textContent = `
    main [data-guangya-home-recent-hidden] { display:none !important; }
    [data-guangya-shortcut-bar] { flex-wrap:wrap; }
    [data-guangya-shortcut-bar] > a[href="#/home/video"],
    [data-guangya-shortcut-bar] > a[href="#/home/img"],
    [data-guangya-shortcut-bar] > a[href="#/home/audio"],
    [data-guangya-shortcut-bar] > a[href="#/home/doc"],
    [data-guangya-shortcut-bar] > a[href="#/home/pkg"] { display:none !important; }
    #guangya-directory-shortcuts { display:contents; }
    #guangya-directory-shortcuts [aria-disabled="true"] { opacity:.45; cursor:not-allowed; }
  `;
  document.head.append(style);

  const button = document.createElement('button');
  button.id = 'guangya-home-test-button';
  button.type = 'button';
  button.dataset.ui = 'button';
  button.dataset.slot = 'root';
  button.dataset.disabled = 'false';
  button.dataset.loading = 'false';
  const content = document.createElement('span');
  content.className = 'swangpan-button__content';
  content.dataset.ui = 'button';
  content.dataset.slot = 'content';
  content.textContent = '云助手';
  const icon = document.createElement('span');
  icon.className = 'swangpan-button__icon';
  icon.dataset.ui = 'button';
  icon.dataset.slot = 'icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bot preview-icon"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>';
  button.append(icon, content);
  const mainActions = [
    { action: 'movie', name: '整理电影' },
    { action: 'tv', name: '整理剧集' },
    { action: 'rename', name: '批量重命名' },
    { action: 'import', name: '导入秒传文件' },
    { action: 'export', name: '导出秒传文件' },
  ];

  const host = document.createElement('span');
  host.id = 'guangya-cloud-assistant-host';
  host.style.display = 'contents';
  let dropdown, destroyed = false, scheduled = false, lastState;
  const directoryNames = ['电影', '剧集', '动漫', '动画', '更新中'];
  const categoryPaths = ['all', 'recent', 'video', 'img', 'audio', 'doc', 'pkg'].map(path => '#/home/' + path);
  const shortcuts = document.createElement('nav');
  shortcuts.id = 'guangya-directory-shortcuts';
  shortcuts.setAttribute('aria-label', '目录快捷入口');
  const shortcutController = new AbortController();
  let shortcutBar, shortcutRequire, shortcutLoading, shortcutLoaded = false, shortcutError = '', shortcutOpening = false;
  let directoryIds = new Map();

  function loadDirectories() {
    if (shortcutLoading) return shortcutLoading;
    shortcutError = '';
    shortcutLoading = Promise.resolve().then(async () => {
      try {
        if (destroyed) return false;
        if (!shortcutRequire) window.webpackChunk_swangpan_pc?.push([['guangya-shortcuts-' + Date.now()], {}, value => { shortcutRequire = value; }]);
        const request = shortcutRequire?.(34118)?.E;
        if (typeof request !== 'function') throw Error('当前应用版本的目录请求接口不兼容');
        const found = new Map(directoryNames.map(name => [name, []])), pages = new Set();
        let count = 0;
        for (let page = 0; ; page++) {
          const response = await request('/userres/v1/file/get_file_list', { method: 'POST',
            body: { parentId: '1952368933809659951', page, pageSize: 100, resType: 2 },
            signal: shortcutController.signal, extra: { skipSafeboxUnlock: true } });
          if (destroyed) return false;
          if (!response || response.code !== undefined && response.code !== 0) throw Error(response?.msg || '读取快捷目录失败');
          const data = response.data;
          const list = data && Object.keys(data).length === 0 ? [] : data?.list;
          if (!Array.isArray(list)) throw Error('快捷目录列表格式不兼容');
          if (!list.length) break;
          const fingerprint = JSON.stringify(list.map(file => file.fileId));
          if (pages.has(fingerprint)) throw Error('快捷目录分页重复，请重试');
          pages.add(fingerprint);
          for (const file of list) if (file.resType === 2 && found.has(file.fileName) && typeof file.fileId === 'string' && file.fileId) {
            found.get(file.fileName).push(file.fileId);
          }
          count += list.length;
          if (Number.isFinite(data.total) && count >= data.total) break;
        }
        directoryIds = found; shortcutLoaded = true;
        return true;
      } catch (error) {
        if (!destroyed) shortcutError = error.message || '读取快捷目录失败';
        return false;
      } finally { shortcutLoading = null; if (!destroyed) schedule(); }
    });
    schedule();
    return shortcutLoading;
  }
  async function openDirectory(name) {
    if (destroyed || shortcutLoading || shortcutOpening) return;
    if (!shortcutLoaded) await loadDirectories();
    if (destroyed) return;
    const ids = directoryIds.get(name) || [];
    if (!shortcutLoaded || ids.length !== 1) {
      window.__guangyaMessage.error(shortcutError || (ids.length ? `${name}存在同名目录，无法确定目标` : `未找到${name}目录`));
      return;
    }
    shortcutOpening = true; schedule();
    try {
      const response = await window.api.file.locateCloudFileInMain(ids[0], { includeSelf: true });
      if (!response?.ok) throw Error(response?.msg || '打开快捷目录失败');
    } catch (error) { if (!destroyed) window.__guangyaMessage.error(error.message || '打开快捷目录失败'); }
    finally { shortcutOpening = false; if (!destroyed) schedule(); }
  }
  function updateShortcuts() {
    const group = [...document.querySelectorAll('main a[href="#/home/all"]')].map(link => link.parentElement)
      .find(parent => categoryPaths.every(path => [...parent.children].some(node => node.tagName === 'A' && node.getAttribute('href') === path)));
    const links = group ? [...group.children].filter(node => node.tagName === 'A') : [];
    const bar = group;
    if (shortcutBar !== bar) { shortcutBar?.removeAttribute('data-guangya-shortcut-bar'); shortcutBar = bar; }
    if (!bar) { shortcuts.remove(); return; }
    bar.setAttribute('data-guangya-shortcut-bar', '');
    const sample = links.find(link => link.getAttribute('aria-current') !== 'page' && !link.classList.contains('active'));
    if (!sample) { shortcuts.remove(); return; }
    if (shortcuts.className !== group.className) shortcuts.className = group.className;
    if (!shortcuts.children.length) for (const name of directoryNames) {
      const link = sample.cloneNode(false);
      link.removeAttribute('href'); link.removeAttribute('data-discover'); link.removeAttribute('aria-current');
      link.setAttribute('role', 'button');
      const label = document.createElement('div'); label.textContent = name; link.append(label);
      link.addEventListener('click', () => openDirectory(name));
      link.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDirectory(name); }
      });
      shortcuts.append(link);
    }
    for (const [index, link] of [...shortcuts.children].entries()) {
      const name = directoryNames[index], ids = directoryIds.get(name) || [];
      const disabled = !!shortcutLoading || shortcutOpening || shortcutLoaded && ids.length !== 1;
      if (link.className !== sample.className) link.className = sample.className;
      link.setAttribute('aria-disabled', String(disabled)); link.tabIndex = disabled ? -1 : 0;
      link.title = shortcutLoading ? '正在读取目录' : shortcutError ? `${shortcutError}，点击重试` :
        shortcutLoaded && ids.length !== 1 ? ids.length ? `${name}存在同名目录` : `未找到${name}目录` : name;
    }
    if (group.lastElementChild !== shortcuts) group.append(shortcuts);
    if (!shortcutLoaded && !shortcutLoading && !shortcutError) loadDirectories();
  }

  async function perform(action) {
    const title = mainActions.find(item => item.action === action)?.name;
    if (action !== 'export' && action !== 'import' && action !== 'rename' && action !== 'tv' && action !== 'movie') {
      console.info(prefix, '菜单项点击，业务操作尚未接入', { action, title });
      return;
    }
    console.info(prefix, '开始执行菜单操作', { action, title });
    try {
      const component = { export: window.__guangyaExport, import: window.__guangyaImport, rename: window.__guangyaRename, tv: window.__guangyaTv, movie: window.__guangyaMovie }[action];
      if (!component?.run) throw Error(`${title}组件未加载，请通过启动器重新注入`);
      await component.run();
    } catch (error) {
      console.error(prefix, '菜单操作执行失败', { action, message: error.message });
      window.__guangyaMessage.error(error.message || '操作失败', { key: 'guangya-assistant-action-error' });
    }
  }

  function schedule() {
    if (destroyed || scheduled) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; if (!destroyed) update(); });
  }
  function hideRecent(active) {
    const targets = new Set();
    if (active) for (const control of document.querySelectorAll('main section button[aria-label="查看全部"]')) {
      const section = control.closest('section');
      const header = [...section.children].find(child => child.contains(control));
      const title = header && [...header.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"],div,span')]
        .some(node => !node.contains(control) && node.textContent.trim() === '最近文件');
      if (!title) continue;
      targets.add(section);
      const divider = section.nextElementSibling;
      if (divider?.nextElementSibling?.tagName === 'SECTION' &&
          (divider.matches('hr,[role="separator"]') || divider.tagName === 'DIV' && !divider.childElementCount && !divider.textContent.trim())) targets.add(divider);
    }
    for (const node of hidden) if (!targets.has(node)) { node.removeAttribute('data-guangya-home-recent-hidden'); hidden.delete(node); }
    for (const node of targets) if (!hidden.has(node)) { node.setAttribute('data-guangya-home-recent-hidden', ''); hidden.add(node); }
  }
  function update() {
    updateShortcuts();
    const active = document.querySelector('a[href="#/home"].active, a[href="#/home"][aria-current="page"]');
    hideRecent(active);
    const cloud = active ? document.querySelector('main > section button[data-ui="button"]:has([aria-label="addcloud"])') : null;
    const state = !active ? '首页未激活' : !cloud ? '首页已激活，等待云添加按钮' : '首页已激活，目标容器就绪';
    if (state !== lastState) { console.info(prefix, '状态变化', state); lastState = state; }
    if (!cloud) { dropdown?.close(); host.remove(); return; }
    const classes = [...cloud.classList].filter(name => name !== 'ant-dropdown-trigger').join(' ');
    if (cloud.nextElementSibling !== host) cloud.after(host);
    if (!dropdown) {
      button.className = classes;
      dropdown = window.__guangyaNativeUI.mountDropdown(host, {
        button, items: mainActions, menuId: 'guangya-cloud-assistant-menu', onAction: perform,
      });
    } else dropdown.setClassName(classes);
  }
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'aria-current', 'aria-label', 'href'] });
  const api = {
    destroy() {
      if (destroyed) return;
      destroyed = true; observer.disconnect(); dropdown?.destroy(); host.remove(); style.remove();
      shortcutController.abort(); shortcuts.remove(); shortcutBar?.removeAttribute('data-guangya-shortcut-bar');
      for (const node of hidden) node.removeAttribute('data-guangya-home-recent-hidden');
      hidden.clear();
      if (window[key] === api) delete window[key];
    },
  };
  window[key] = api;
  try { update(); } catch (error) { api.destroy(); throw error; }
  return { installed: true, homeActive: !!dropdown?.element?.isConnected };
})();
