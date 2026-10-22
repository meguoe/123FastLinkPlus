(() => {
  const key = '__guangyaHomeTestButton';
  window[key]?.destroy();
  const prefix = '[光鸭自定义]';

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
  function update() {
    const active = document.querySelector('a[href="#/home"].active, a[href="#/home"][aria-current="page"]');
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
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'aria-current', 'href'] });
  const api = {
    destroy() {
      if (destroyed) return;
      destroyed = true; observer.disconnect(); dropdown?.destroy(); host.remove();
      if (window[key] === api) delete window[key];
    },
  };
  window[key] = api;
  try { update(); } catch (error) { api.destroy(); throw error; }
  return { installed: true, homeActive: !!dropdown?.element?.isConnected };
})();
