(() => {
  const key = '__guangyaHomeTestButton';
  window[key]?.destroy();
  const prefix = '[光鸭自定义]';
  const hidden = new Set();
  const style = document.createElement('style');
  style.textContent = `
    main [data-guangya-home-recent-hidden] { display:none !important; }
    [data-guangya-shortcut-bar] { flex-wrap:wrap; flex:1; min-width:0; }
    [data-guangya-shortcut-bar="configured"] > a[href="#/home/video"],
    [data-guangya-shortcut-bar="configured"] > a[href="#/home/img"],
    [data-guangya-shortcut-bar="configured"] > a[href="#/home/audio"],
    [data-guangya-shortcut-bar="configured"] > a[href="#/home/doc"],
    [data-guangya-shortcut-bar="configured"] > a[href="#/home/pkg"] { display:none !important; }
    #guangya-directory-shortcuts { display:contents; }
    #guangya-directory-shortcuts [aria-disabled="true"] { opacity:.45; cursor:not-allowed; }
    #guangya-shortcut-settings { margin-inline-start:auto; display:flex; align-items:center; justify-content:center; flex:none; min-width:36px; padding:8px; border:0; border-radius:6px; background:transparent; color:inherit; font:inherit; cursor:pointer; }
    #guangya-shortcut-settings:disabled { opacity:.45; cursor:not-allowed; }
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
  const categoryPaths = ['all', 'recent', 'video', 'img', 'audio', 'doc', 'pkg'].map(path => '#/home/' + path);
  const shortcuts = document.createElement('nav');
  shortcuts.id = 'guangya-directory-shortcuts';
  shortcuts.setAttribute('aria-label', '目录快捷入口');
  const settings = document.createElement('button');
  settings.id = 'guangya-shortcut-settings'; settings.type = 'button';
  settings.title = '配置快捷目录'; settings.setAttribute('aria-label', settings.title);
  settings.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9.5 3-.6 2.2-2 .9-2.1-.6-2 3.5 1.6 1.6v2.8L2.8 15l2 3.5 2.1-.6 2 .9.6 2.2h4.9l.6-2.2 2-.9 2.1.6 2-3.5-1.6-1.6v-2.8L21.2 9l-2-3.5-2.1.6-2-.9-.6-2.2z"/><circle cx="12" cy="12" r="3"/></svg>';
  settings.addEventListener('click', configureShortcuts);
  const shortcutStorageKey = 'guangya-assistant-shortcut-directories';
  let directoryItems = [], shortcutKey = '';
  let shortcutBar, shortcutOpening = false, shortcutConfiguring = false;
  function validateDirectories(value) {
    if (!Array.isArray(value) || value.length > 5) throw Error('快捷目录最多选择 5 项');
    const ids = new Set();
    return value.map(item => {
      if (!item || typeof item.id !== 'string' || !/^\d+$/.test(item.id) ||
          typeof item.name !== 'string' || !item.name.trim() || ids.has(item.id) ||
          item.path !== undefined && typeof item.path !== 'string') throw Error('快捷目录配置无效，请重新选择');
      ids.add(item.id);
      return { id: item.id, name: item.name, path: item.path || item.name };
    });
  }
  try {
    const saved = window.localStorage.getItem(shortcutStorageKey);
    if (saved !== null) directoryItems = validateDirectories(JSON.parse(saved));
  } catch (error) { console.warn(prefix, '读取快捷目录配置失败', error.message); }

  async function configureShortcuts() {
    if (destroyed || shortcutConfiguring) return;
    shortcutConfiguring = true; schedule();
    try {
      if (!window.__guangyaFolderBrowser?.select) throw Error('目录选择组件未加载，请通过启动器重新注入');
      const selection = await window.__guangyaFolderBrowser.select(directoryItems.map(item => ({ ...item })));
      if (destroyed) return;
      const next = validateDirectories(selection);
      try { window.localStorage.setItem(shortcutStorageKey, JSON.stringify(next)); }
      catch { throw Error('快捷目录配置保存失败，请重试'); }
      directoryItems = next;
    } catch (error) {
      if (!destroyed && error !== 'cancel folder select') window.__guangyaMessage.error(error?.message || '配置快捷目录失败');
    } finally { shortcutConfiguring = false; if (!destroyed) schedule(); }
  }
  async function openDirectory(id) {
    if (destroyed || shortcutOpening) return;
    shortcutOpening = true; schedule();
    try {
      const response = await window.api.file.locateCloudFileInMain(id, { includeSelf: true });
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
    if (!bar) { shortcuts.remove(); settings.remove(); shortcutKey = ''; return; }
    bar.setAttribute('data-guangya-shortcut-bar', directoryItems.length ? 'configured' : '');
    const sample = links.find(link => link.getAttribute('aria-current') !== 'page' && !link.classList.contains('active'));
    if (!sample) { shortcuts.remove(); settings.remove(); shortcutKey = ''; return; }
    if (shortcuts.className !== group.className) shortcuts.className = group.className;
    const entries = directoryItems;
    const signature = JSON.stringify(entries);
    if (signature !== shortcutKey) {
      shortcutKey = signature;
      shortcuts.replaceChildren();
      for (const entry of entries) {
        const link = sample.cloneNode(false);
        link.removeAttribute('href'); link.removeAttribute('data-discover'); link.removeAttribute('aria-current');
        link.setAttribute('role', 'button');
        link.dataset.guangyaShortcutKind = 'dir';
        if (entry.id) link.dataset.guangyaShortcutId = entry.id;
        const label = document.createElement('div'); label.textContent = entry.name; link.append(label);
        const activate = () => openDirectory(entry.id);
        link.addEventListener('click', activate);
        link.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); }
        });
        shortcuts.append(link);
      }
    }
    for (const [index, link] of [...shortcuts.children].entries()) {
      const entry = entries[index];
      const disabled = !!shortcutOpening;
      if (link.className !== sample.className) link.className = sample.className;
      link.setAttribute('aria-disabled', String(disabled)); link.tabIndex = disabled ? -1 : 0;
      link.title = entry.path;
    }
    if (settings.className !== sample.className) settings.className = sample.className;
    settings.disabled = shortcutConfiguring;
    if (shortcuts.parentElement !== group || group.lastElementChild !== settings) group.append(shortcuts, settings);
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
      shortcuts.remove(); settings.remove(); shortcutBar?.removeAttribute('data-guangya-shortcut-bar');
      for (const node of hidden) node.removeAttribute('data-guangya-home-recent-hidden');
      hidden.clear();
      if (window[key] === api) delete window[key];
    },
  };
  window[key] = api;
  try { update(); } catch (error) { api.destroy(); throw error; }
  return { installed: true, homeActive: !!dropdown?.element?.isConnected };
})();
