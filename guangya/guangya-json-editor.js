(() => {
  const key = '__guangyaJsonEditor';
  window[key]?.destroy();
  const instances = new Set();
  let destroyed = false;
  const style = document.createElement('style');
  style.textContent = `
    .guangya-json-editor { box-sizing:border-box; position:relative; width:100%; height:320px; max-height:45vh; border:1px solid var(--ant-color-border-secondary,#eee); border-radius:8px; overflow:hidden; background:var(--ant-color-bg-container,#fff); }
    .guangya-json-editor:focus-within { border-color:var(--ant-color-primary,#ff6800); }
    .guangya-json-editor:before { content:''; position:absolute; inset:0 auto 0 0; width:45px; background:var(--ant-color-fill-alter,#fafafa); }
    .guangya-json-editor [data-json-highlight], .guangya-json-editor [data-json-input] { box-sizing:border-box; position:absolute; inset:0; width:100%; height:100%; margin:0; padding:10px 12px 10px 50px; border:0; font:12px/20px ui-monospace,monospace; white-space:pre-wrap; overflow-wrap:anywhere; tab-size:2; }
    .guangya-json-editor [data-json-highlight] { pointer-events:none; overflow:hidden; counter-reset:json-line; color:var(--ant-color-text,#222); }
    .guangya-json-editor [data-json-input] { resize:none; outline:none; overflow:auto; overscroll-behavior:contain; background:transparent; color:transparent; -webkit-text-fill-color:transparent; caret-color:var(--ant-color-text,#222); }
    .guangya-json-editor [data-json-input]::placeholder { color:var(--ant-color-text-tertiary,#888); -webkit-text-fill-color:var(--ant-color-text-tertiary,#888); }
    .guangya-json-editor [data-json-input]::selection { background:var(--ant-color-primary-bg,#d6e8ff); }
    .guangya-json-editor [data-json-line] { display:block; position:relative; min-height:20px; counter-increment:json-line; }
    .guangya-json-editor [data-json-line]:before { content:counter(json-line); position:absolute; left:-50px; width:35px; text-align:right; color:var(--ant-color-text-tertiary,#888); }
    .guangya-json-editor [data-json-token="key"] { color:var(--ant-color-warning-text,#916000); }
    .guangya-json-editor [data-json-token="str"] { color:var(--ant-color-success-text,#267b37); }
    .guangya-json-editor [data-json-token="num"] { color:var(--ant-color-primary-text,#b04300); }
    .guangya-json-editor [data-json-token="lit"] { color:var(--ant-color-info-text,#315fba); }
    .guangya-json-editor [data-json-token="punc"] { color:var(--ant-color-text-secondary,#666); }
  `;
  document.head.append(style);

  const escape = text => text.replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char]);
  // Based on vendor/code.html; preserve unmatched text while the JSON is being edited.
  function highlight(source) {
    const tokens = /("(?:\\.|[^"\\\r\n])*")(?=\s*:)|("(?:\\.|[^"\\\r\n])*"?)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],:])/g;
    let html = '', end = 0;
    for (const match of source.matchAll(tokens)) {
      const type = match[1] ? 'key' : match[2] ? 'str' : match[3] ? 'num' : match[4] ? 'lit' : 'punc';
      html += escape(source.slice(end, match.index)) + `<span data-json-token="${type}">${escape(match[0])}</span>`;
      end = match.index + match[0].length;
    }
    return html + escape(source.slice(end));
  }

  function mount(host, { value = '', readOnly = false, ariaLabel = '秒传 JSON', placeholder = '' } = {}) {
    if (destroyed) throw Error('JSON 编辑器已卸载，请重新打开弹窗');
    host.classList.add('guangya-json-editor');
    host.innerHTML = '<pre data-json-highlight aria-hidden="true"></pre><textarea data-json-input spellcheck="false" wrap="soft" autocorrect="off" autocapitalize="off" autocomplete="off"></textarea>';
    const textarea = host.querySelector('textarea'), layer = host.querySelector('pre');
    const events = new AbortController();
    let disabled = false, disposed = false;
    const sync = () => { layer.scrollTop = textarea.scrollTop; layer.scrollLeft = textarea.scrollLeft; };
    const resize = () => { if (textarea.clientWidth) layer.style.width = `${textarea.clientWidth}px`; sync(); };
    const observer = new ResizeObserver(resize);
    // ponytail: full-document highlighting; use a virtual editor for multi-megabyte JSON.
    function render() {
      if (disposed) return;
      const lines = document.createDocumentFragment();
      for (const line of textarea.value.split('\n')) {
        const node = document.createElement('span');
        node.dataset.jsonLine = '';
        node.innerHTML = highlight(line);
        lines.append(node);
      }
      layer.replaceChildren(lines);
      resize();
    }
    textarea.setAttribute('aria-label', ariaLabel);
    textarea.placeholder = placeholder;
    textarea.addEventListener('input', render, { signal: events.signal });
    textarea.addEventListener('scroll', sync, { signal: events.signal, passive: true });
    textarea.addEventListener('keydown', event => {
      if (textarea.readOnly || event.isComposing || event.key !== 'Tab' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      textarea.setRangeText('  ', textarea.selectionStart, textarea.selectionEnd, 'end');
      render();
    }, { signal: events.signal });
    observer.observe(textarea);
    const handle = {
      element: host,
      get value() { return textarea.value; },
      set value(next) { textarea.value = String(next ?? ''); textarea.setSelectionRange(0, 0); textarea.scrollTop = textarea.scrollLeft = 0; render(); },
      get hidden() { return host.hidden; },
      set hidden(next) { host.hidden = Boolean(next); if (!host.hidden) resize(); },
      get disabled() { return disabled; },
      set disabled(next) { disabled = Boolean(next); textarea.readOnly = readOnly || disabled; },
      focus() { textarea.focus({ preventScroll: true }); },
      destroy() {
        if (disposed) return;
        disposed = true;
        observer.disconnect();
        events.abort();
        host.replaceChildren();
        instances.delete(handle);
      },
    };
    instances.add(handle);
    handle.disabled = false;
    handle.value = value;
    return handle;
  }

  window[key] = { mount, destroy() {
    destroyed = true;
    for (const instance of [...instances]) instance.destroy();
    style.remove();
    if (window[key] === this) delete window[key];
  } };
})();
