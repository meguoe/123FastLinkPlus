(() => {
  const key = '__guangyaModal';
  window[key]?.destroy();
  const instances = new Set();
  let sequence = 0, destroyed = false;
  const svg = paths => `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  const icons = {
    correction: svg('<path d="M4 7h5M4 12h13M4 17h5m4-10 5 5-5 5"/>'),
    details: svg('<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/>'),
    tv: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clapperboard preview-icon"><path d="m12.296 3.464 3.02 3.956"/><path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="m6.18 5.276 3.1 3.899"/></svg>',
    rename: '<svg width="1em" height="1em" fill="none" viewBox="0 0 18 18"><path fill="currentColor" d="M1.5 6.25a.75.75 0 0 1 .75.75v4.5a4.25 4.25 0 0 0 4.25 4.25H12a.75.75 0 0 1 0 1.5H6.5A5.75 5.75 0 0 1 .75 11.5V7a.75.75 0 0 1 .75-.75"></path><path fill="currentColor" d="M8.866 1.25a.75.75 0 0 1 0 1.5H7A2.25 2.25 0 0 0 4.75 5v6A2.25 2.25 0 0 0 7 13.25h6A2.25 2.25 0 0 0 15.25 11v-1a.75.75 0 0 1 1.5 0v1A3.75 3.75 0 0 1 13 14.75H7A3.75 3.75 0 0 1 3.25 11V5A3.75 3.75 0 0 1 7 1.25z"></path><path fill="currentColor" d="M14.97 1.97a.75.75 0 1 1 1.06 1.06l-6.5 6.5a.75.75 0 1 1-1.06-1.06z"></path></svg>',
    import: svg('<path d="M12 3v12m-5-5 5 5 5-5M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/>'),
    upload: svg('<path d="M12 3v12"/><path d="m17 8-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>'),
    search: svg('<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>'),
    export: svg('<path d="M12 14V3m-4 4 4-4 4 4M5 16v4h14v-4M9 12h6"/>'),
    error: svg('<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>'),
    warning: svg('<path d="m10.3 3.8-8.1 14a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3l-8.1-14a2 2 0 0 0-3.4 0"/><path d="M12 9v4m0 4h.01"/>'),
  };
  const style = document.createElement('style');
  style.textContent = `
    dialog.guangya-shared-modal { inset:0; margin:0; padding:0; width:100%; height:100%; max-width:none; max-height:none; border:0; background:transparent; overflow:hidden; font:inherit; color:inherit; }
    dialog.guangya-shared-modal::backdrop { background:transparent; }
    .guangya-shared-modal .swangpan-modal__container { top:50%; margin:0 auto; transform:translateY(-50%); width:var(--guangya-modal-width); max-width:calc(100% - 32px); max-height:calc(100vh - 48px); box-sizing:border-box; }
    .guangya-shared-modal .swangpan-modal__body { min-height:0; overflow:auto; }
    .guangya-shared-modal .swangpan-modal__footer { flex-wrap:wrap; }
    .guangya-shared-modal [data-icon="error"] { color:var(--ant-color-error,#f04438); }
    .guangya-shared-modal [data-icon="warning"] { color:var(--ant-color-warning,#faad14); }
    .guangya-shared-modal .ant-tooltip { --ant-tooltip-max-width:500px; }
    .guangya-shared-modal .guangya-modal-message { margin:0; white-space:pre-wrap; overflow-wrap:anywhere; font-size:14px; line-height:22px; }
  `;
  document.head.append(style);

  function open({ id, title = '', width = 480, icon, onClose, closeOnMask = true, restoreFocus = true } = {}) {
    if (destroyed) throw Error('弹窗组件已卸载，请使用最新实例');
    if (!Number.isFinite(width) || width <= 0) throw Error('弹窗宽度必须为正数');
    if (icon !== undefined && !Object.hasOwn(icons, icon)) throw Error('不支持的弹窗图标');
    const element = document.createElement('dialog');
    element.id = id ?? `guangya-modal-${++sequence}`;
    if (document.getElementById(element.id)) throw Error('弹窗 ID 已存在');
    element.className = 'swangpan-modal__root guangya-shared-modal';
    Object.assign(element.dataset, { ui: 'modal', slot: 'root', state: 'open', mode: 'default' });
    element.style.setProperty('--guangya-modal-width', `${width}px`);
    element.setAttribute('aria-modal', 'true');
    element.setAttribute('aria-labelledby', `${element.id}-title`);
    element.innerHTML = `
      <div class="swangpan-modal__mask" data-ui="modal" data-slot="mask" aria-hidden="true"></div>
      <div tabindex="-1" class="swangpan-modal__wrapper" data-ui="modal" data-slot="wrapper">
        <div class="swangpan-modal__container" data-ui="modal" data-slot="container">
          <button type="button" class="swangpan-modal__close" data-ui="modal" data-slot="close" aria-label="关闭弹窗">
            <span class="swangpan-icon swangpan-icon-close" aria-hidden="true" style="display:inline-flex;line-height:0;font-size:18px"><svg width="1em" height="1em" viewBox="0 0 18 18" fill="none"><path d="m3 3 12 12M15 3 3 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span>
          </button>
          <div class="swangpan-modal__header" data-ui="modal" data-slot="header"><div><span class="swangpan-modal__icon" data-ui="modal" data-slot="icon" aria-hidden="true"></span><span class="swangpan-modal__title" data-ui="modal" data-slot="title"></span></div></div>
          <div class="swangpan-modal__body" data-ui="modal" data-slot="body"></div>
          <div class="swangpan-modal__footer" data-ui="modal" data-slot="footer"></div>
        </div>
      </div>`;
    const heading = element.querySelector('[data-slot="title"]');
    heading.id = `${element.id}-title`;
    heading.textContent = title;
    const image = element.querySelector('[data-slot="icon"]');
    if (icon) { image.dataset.icon = icon; image.innerHTML = icons[icon]; } else image.remove();
    const body = element.querySelector('[data-slot="body"]');
    const footer = element.querySelector('[data-slot="footer"]');
    const previousFocus = document.activeElement;
    let settled = false, resolveClosed;
    const closed = new Promise(resolve => { resolveClosed = resolve; });
    function close(reason = 'close') {
      if (settled) return;
      settled = true;
      element.close();
      element.remove();
      instances.delete(handle);
      const focus = previousFocus?.isConnected ? previousFocus : document.getElementById('guangya-home-test-button');
      if (restoreFocus) focus?.focus({ preventScroll: true });
      else if (document.activeElement === previousFocus) previousFocus?.blur();
      try { onClose?.(reason); } catch (error) { console.error('[光鸭自定义]', '弹窗关闭回调失败', error); }
      resolveClosed(reason);
    }
    function addButton(text, { primary = false, disabled = false, onClick } = {}) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `swangpan-button__root swangpan-button--size-lg swangpan-button--variant-${primary ? 'primary' : 'outline'}`;
      button.disabled = disabled;
      Object.assign(button.dataset, { ui: 'button', slot: 'root', disabled: String(disabled), loading: 'false' });
      const label = document.createElement('span');
      label.className = 'swangpan-button__content';
      Object.assign(label.dataset, { ui: 'button', slot: 'content' });
      label.textContent = text;
      button.append(label);
      if (onClick) button.addEventListener('click', onClick);
      footer.append(button);
      return button;
    }
    const handle = { element, body, footer, addButton, close, closed };
    element.querySelector('.swangpan-modal__close').addEventListener('click', () => close());
    // Native main handles bubbled wheel events to switch the file-list view.
    element.addEventListener('wheel', event => event.stopPropagation(), { passive: true });
    element.addEventListener('cancel', event => { event.preventDefault(); close('cancel'); });
    element.addEventListener('close', () => close());
    for (const target of element.querySelectorAll('.swangpan-modal__mask, .swangpan-modal__wrapper')) {
      target.addEventListener('click', event => { if (closeOnMask && event.target === target) close('cancel'); });
    }
    const parent = document.getElementById('guangya-home-test-button')?.parentElement ?? document.querySelector('main')?.parentElement ?? document.body;
    parent.append(element);
    instances.add(handle);
    element.showModal();
    window.__guangyaMessage?.raise?.();
    return handle;
  }

  function error({ title = '操作失败', message = '', confirmText = '确定' } = {}) {
    const modal = open({ title, icon: 'error' });
    modal.element.setAttribute('role', 'alertdialog');
    modal.body.id = `${modal.element.id}-message`;
    modal.element.setAttribute('aria-describedby', modal.body.id);
    modal.body.classList.add('guangya-modal-message');
    modal.body.textContent = message;
    modal.addButton(confirmText, { primary: true, onClick: () => modal.close('confirm') });
    return modal.closed;
  }

  function confirm({ title = '请确认', message = '', confirmText = '确定', cancelText = '取消' } = {}) {
    const modal = open({ title, icon: 'warning' });
    modal.element.setAttribute('role', 'alertdialog');
    modal.body.id = `${modal.element.id}-message`;
    modal.element.setAttribute('aria-describedby', modal.body.id);
    modal.body.classList.add('guangya-modal-message');
    modal.body.textContent = message;
    modal.addButton(cancelText, { onClick: () => modal.close('cancel') });
    modal.addButton(confirmText, { primary: true, onClick: () => modal.close('confirm') });
    return modal.closed.then(reason => reason === 'confirm');
  }

  const api = { open, error, confirm, destroy() {
    destroyed = true;
    for (const modal of [...instances].reverse()) modal.close('destroy');
    style.remove();
    if (window[key] === api) delete window[key];
  } };
  window[key] = api;
})();
