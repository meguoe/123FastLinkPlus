(() => {
  window.__guangyaMessage?.dispose?.();
  let nativeRequire;
  const roots = new Map();
  const style = document.createElement('style');
  style.textContent = `
    .swangpan-message__root.guangya-message-layer[popover] { right:auto; bottom:auto; width:max-content; max-width:calc(100vw - 32px); margin:0; padding:0; border:0; background:transparent; color:inherit; overflow:visible; }
    .swangpan-message__root.guangya-message-layer::backdrop { background:transparent; pointer-events:none; }
  `;
  document.head.append(style);
  function raise() {
    for (const root of document.querySelectorAll('.swangpan-message__root')) {
      if (!roots.has(root)) roots.set(root, root.getAttribute('popover'));
      root.classList.add('guangya-message-layer');
      root.setAttribute('popover', 'manual');
      if (root.matches(':popover-open')) root.hidePopover();
      root.showPopover();
    }
  }
  const api = { raise, dispose() {
    for (const [root, original] of roots) {
      if (root.matches(':popover-open')) root.hidePopover();
      if (original === null) root.removeAttribute('popover'); else root.setAttribute('popover', original);
      root.classList.remove('guangya-message-layer');
    }
    roots.clear();
    style.remove();
  } };
  for (const method of ['success', 'error', 'warning', 'info', 'loading', 'destroy']) {
    api[method] = (...args) => {
      if (!nativeRequire) {
        const chunks = window.webpackChunk_swangpan_pc;
        if (!chunks) throw Error('当前应用版本不支持读取 Message 接口');
        chunks.push([['guangya-assistant-message-' + Date.now()], {}, require => { nativeRequire = require; }]);
      }
      const message = nativeRequire?.(23219)?.iU;
      if (typeof message?.[method] !== 'function') throw Error('当前应用版本的原生 Message 接口不兼容');
      if (method !== 'destroy') raise();
      return message[method](...args);
    };
  }
  window.__guangyaMessage = api;
  raise();
})();
