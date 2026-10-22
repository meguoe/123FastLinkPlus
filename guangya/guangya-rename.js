(() => {
  const key = '__guangyaRename';
  window[key]?.destroy();
  const prefix = '[光鸭自定义]';
  let view, running = false, destroyed = false, stopping = false;
  const modes = [
    ['replace', '查找替换', ['输入要替换的文本', '输入要替换的文本（不填则直接删除）']],
    ['append', '追加文本', ['输入文件名前缀', '输入文件名后缀']],
    ['sequence', '序号命名', ['输入文件名前缀', '起始编号', '输入文件名后缀']],
  ];
  const icons = {
    success: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-badge-check preview-icon"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m16 9-5.5 5.5L8 12"/></svg>',
    failed: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-badge-info preview-icon"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/></svg>',
    case: '<svg width="1em" height="1em" fill="none" viewBox="0 0 18 18"><path fill="currentColor" fill-rule="evenodd" d="M13.719 5.84c1.024 0 1.817.248 2.363.76.562.496.842 1.24.842 2.199v5.147a.72.72 0 0 1-.718.719h-.091a.63.63 0 0 1-.628-.628 2.6 2.6 0 0 1-.71.48q-.596.248-1.438.248c-.926 0-1.637-.215-2.165-.662-.513-.462-.777-1.123-.777-1.966q0-1.19.793-1.884c.529-.446 1.256-.678 2.182-.678h2.098v-.793c0-.562-.149-.975-.446-1.256-.297-.28-.727-.413-1.289-.413-.529 0-.958.116-1.24.347-.167.13-.27.285-.333.456-.136.368-.414.701-.807.701-.392 0-.722-.322-.652-.708.096-.533.325-1.013.785-1.391.545-.446 1.289-.677 2.23-.677m-.182 4.892c-1.14 0-1.686.446-1.686 1.388 0 .959.529 1.405 1.67 1.405.693 0 1.189-.149 1.486-.463.315-.297.463-.76.463-1.405v-.925zM5.223 2.932c.372 0 .705.232.832.582l3.683 10.134a.758.758 0 1 1-1.428.51l-.781-2.236h-4.61l-.782 2.235a.758.758 0 1 1-1.427-.509L4.392 3.514a.885.885 0 0 1 .831-.582m-1.841 7.634h3.684l-1.85-5.288z" clip-rule="evenodd"></path></svg>',
    regex: '<svg width="1em" height="1em" fill="none" viewBox="0 0 18 18"><path fill="currentColor" d="M4.25 13a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5M10.895 2a.75.75 0 0 1 .75.75v2.34l1.65-1.65a.751.751 0 0 1 1.061 1.061l-1.65 1.65h2.331a.75.75 0 0 1 0 1.5h-2.329L14.356 9.3a.75.75 0 0 1-1.06 1.06L11.645 8.71v2.336a.75.75 0 0 1-1.5 0V8.713L8.496 10.36a.75.75 0 0 1-1.06-1.06l1.649-1.65H6.75a.75.75 0 0 1 0-1.5h2.337L7.43 4.495a.75.75 0 0 1 1.06-1.06l1.654 1.653V2.75a.75.75 0 0 1 .75-.75"></path></svg>',
    wholeWord: '<svg width="1em" height="1em" fill="none" viewBox="0 0 18 18"><path fill="currentColor" d="M15.795 13.745a.75.75 0 0 1 1.41.51 2.84 2.84 0 0 1-2.674 1.876H3.47a2.84 2.84 0 0 1-2.674-1.876.75.75 0 0 1 1.41-.51c.193.532.698.886 1.264.886H14.53c.566 0 1.071-.354 1.264-.886M5.689 4.878c.96 0 1.705.232 2.216.713.527.465.791 1.162.791 2.061v4.828a.675.675 0 0 1-.674.675h-.085a.59.59 0 0 1-.59-.589c-.2.186-.418.341-.666.45q-.558.232-1.349.232c-.868 0-1.534-.202-2.03-.62-.48-.434-.729-1.054-.729-1.845q0-1.116.744-1.766c.496-.419 1.178-.636 2.046-.636h1.97v-.744c0-.527-.14-.915-.42-1.178s-.682-.388-1.209-.388c-.496 0-.898.11-1.162.326a.94.94 0 0 0-.313.428c-.128.345-.388.657-.756.657s-.678-.301-.613-.664c.09-.5.305-.949.737-1.304.511-.419 1.208-.636 2.092-.636m4.61-2.728c.377 0 .682.306.682.683l-.006 3.95c1.075-.965 2.94-.829 3.968.259.542.543.805 1.395.805 2.542l.008.285c0 1.147-.264 2-.791 2.542-.527.558-1.193.837-2.015.837-.837 0-1.503-.263-1.968-.79v.015a.682.682 0 1 1-1.364 0V2.83a.68.68 0 0 1 .681-.68m-4.78 7.316c-1.07 0-1.581.418-1.581 1.302 0 .899.496 1.318 1.565 1.318.65 0 1.116-.14 1.395-.435.294-.279.434-.713.434-1.317v-.868zm7.207-1.99c-.59 0-1.008.201-1.302.588-.295.419-.45.978-.45 1.675l.008.053c0 .65.155 1.193.464 1.596q.465.604 1.349.604c1.07 0 1.597-.713 1.597-2.185l-.008-.161c0-1.473-.542-2.17-1.658-2.17"></path></svg>',
  };
  const video = /\.(mp4|mkv|avi|mov|wmv|flv|webm|m4v|ts|m2ts|mts|rmvb|rm|mpg|mpeg|vob|3gp|iso)$/i;
  const validName = name => !!name.trim() && name === name.trim() && !/[<>:"/\\|?*\x00-\x1f]/.test(name) && !/[. ]$/.test(name) && name !== '.' && name !== '..';

  function plan(resources, mode, values = [], { videoOnly = false, ignoreCase = true, useRegex = false, wholeWord = false } = {}) {
    const files = resources.filter(file => Number(file.resType) === 1 && (!videoOnly || file.fileType === 2 || video.test(file.fileName)))
      .map(file => ({ ...file })).sort((a, b) => String(a.fileName).localeCompare(String(b.fileName), 'zh-CN', { numeric: true, sensitivity: 'base' }));
    const [first = '', second = '', third = ''] = values;
    let pattern, singleMatch, start = 1;
    const fail = error => ({ error, items: [], changed: 0 });
    if (!modes.some(item => item[0] === mode)) return fail('未知重命名规则');
    if (mode === 'sequence') {
      if (second && !/^\d+$/.test(second)) return fail('起始编号必须为非负整数');
      start = second ? Number(second) : 1;
      if (!Number.isSafeInteger(start + files.length)) return fail('编号超出安全整数范围');
    }
    if (mode === 'replace' && first) {
      try {
        let expression = useRegex ? first : first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (wholeWord) expression = `(?<![\\p{L}\\p{N}_])(?:${expression})(?![\\p{L}\\p{N}_])`;
        pattern = new RegExp(expression, `g${ignoreCase ? 'i' : ''}${wholeWord ? 'u' : ''}`);
        if (useRegex) singleMatch = new RegExp(expression, `${ignoreCase ? 'i' : ''}${wholeWord ? 'u' : ''}y`);
      }
      catch { return fail('正则表达式格式不正确'); }
    }
    const ids = new Set();
    const items = files.map((file, index) => {
      const name = String(file.fileName ?? '');
      const dot = name.lastIndexOf('.');
      const base = dot > 0 ? name.slice(0, dot) : name;
      const extension = dot > 0 ? name.slice(dot) : '';
      let segments = [];
      const add = (type, text) => { if (text) segments.push({ type, text }); };
      let newName = name;
      if (mode === 'replace' && first) {
        let end = 0;
        newName = name.replace(pattern, (match, ...args) => {
          const offset = args.at(typeof args.at(-1) === 'object' ? -3 : -2);
          let replacement = second;
          if (useRegex) {
            // ponytail: O(n²) for filename length; native substitution preserves captures and context, optimize if long names matter.
            singleMatch.lastIndex = offset;
            const replaced = name.replace(singleMatch, second);
            replacement = replaced.slice(offset, replaced.length - (name.length - offset - match.length));
          }
          add('plain', name.slice(end, offset)); add('removed', match); add('added', replacement);
          end = offset + match.length;
          return replacement;
        });
        add('plain', name.slice(end));
      }
      if (mode === 'sequence') {
        const nextBase = `${first}${String(start + index).padStart(second.length, '0')}${third}`;
        newName = nextBase + extension;
        add('removed', base); add('added', nextBase); add('plain', extension);
      }
      if (mode === 'append') {
        newName = `${first}${base}${second}${extension}`;
        add('added', first); add('plain', base); add('added', second); add('plain', extension);
      }
      if (newName === name) segments = [{ type: 'plain', text: name }];
      const id = String(file.fileId ?? '');
      let error = !id || ids.has(id) ? '文件编号缺失或重复' : !validName(newName) ? '名称为空、含非法字符或首尾空白' : '';
      ids.add(id);
      return { ...file, fileId: id, name, newName, segments, error, status: newName === name ? '未变化' : '待改名' };
    });
    // ponytail: O(n²) collision check for selected files; index parent/name if selection sizes grow.
    // Reject occupied targets, including swaps: no temporary names or implicit overwrites.
    for (const item of items) {
      const sameParent = other => String(other.parentId ?? '') === String(item.parentId ?? '');
      if (items.some(other => other !== item && sameParent(other) && (other.newName === item.newName || (item.newName !== item.name && other.name === item.newName)))) item.error = '目标名称重复或被其他所选文件占用';
    }
    return { error: items.some(item => item.error) ? '存在无效名称或重名，请调整规则' : null, items, changed: items.filter(item => item.name !== item.newName).length };
  }

  let nativeRequire;
  function requestApi(path, options) {
    if (!nativeRequire) {
      const chunks = window.webpackChunk_swangpan_pc;
      if (!chunks) throw Error('当前应用版本不支持读取请求模块');
      chunks.push([['guangya-assistant-rename-' + Date.now()], {}, require => { nativeRequire = require; }]);
    }
    const request = nativeRequire?.(34118)?.E;
    if (typeof request !== 'function') throw Error('当前应用版本的请求接口不兼容');
    return request(path, { ...options, extra: { skipSafeboxUnlock: true } });
  }

  async function execute(current, { request = requestApi, signal, shouldStop = () => false, onProgress = () => {} } = {}) {
    if (current.error) throw Error(current.error);
    const result = { success: 0, failed: 0, skipped: 0, pending: 0 };
    for (let index = 0; index < current.items.length; index++) {
      if (signal?.aborted || shouldStop()) { result.pending = current.items.length - index; break; }
      const item = current.items[index];
      const update = (status, reason = '') => onProgress({ index, item, status, reason, ...result });
      if (item.name === item.newName) { result.skipped++; update('未变化'); continue; }
      update('processing');
      try {
        // Stopping only skips subsequent files. Do not abort an in-flight rename with unknown outcome.
        const response = await request('/userres/v1/file/rename', { method: 'POST', body: { fileId: item.fileId, newName: item.newName } });
        if (!response || (response.code !== 0 && !(response.code === undefined && response.msg === 'success'))) throw Error(response?.msg || '重命名结果未确认，请刷新后核对');
        result.success++; update('success');
      } catch (error) {
        result.failed++; update('failed', error.message || '重命名失败');
      }
    }
    return result;
  }

  function run({ resources, request } = {}) {
    if (destroyed) return;
    if (view) { view.element.focus(); return; }
    const selected = resources ?? window.__guangyaExport.getSelection();
    const files = selected.filter(file => Number(file.resType) === 1);
    if (!files.length) { window.__guangyaMessage.warning('请先选择文件'); return; }
    let inputs = [], ignoreCase = true, useRegex = false, wholeWord = false;
    let mode = 'replace', current, segmented, videoOnly, previewCard, list, executed = false, attempted = false;
    stopping = false;
    const modal = window.__guangyaModal.open({
      id: 'guangya-rename-dialog', title: '批量重命名', width: 900, icon: 'rename', closeOnMask: false,
      onClose(reason) {
        stopping = true;
        segmented?.destroy();
        videoOnly?.destroy();
        previewCard?.destroy();
        for (const input of inputs) input.destroy();
        inputs = [];
        if (view === modal) view = null;
        if (attempted && !running && !destroyed && reason !== 'destroy') document.querySelector('main button[aria-label="刷新"]')?.click();
      },
    });
    view = modal;
    modal.body.innerHTML = `<style>
      #guangya-rename-dialog .swangpan-modal__container { min-width:min(900px,calc(100vw - 32px)); }
      #guangya-rename-dialog [data-rename-modes] { margin-bottom:16px; }
      #guangya-rename-dialog [data-rename-fields] { display:flex; flex-wrap:wrap; gap:12px; margin-bottom:12px; }
      #guangya-rename-dialog [data-rename-fields] label { display:block; flex:1; min-width:150px; }
      #guangya-rename-dialog [data-rename-fields][data-mode="sequence"] label:nth-child(2) { flex:0 0 150px; }
      #guangya-rename-dialog [data-input-actions] { display:flex; gap:8px; }
      #guangya-rename-dialog [data-input-action] { display:inline-flex; align-items:center; justify-content:center; width:25px; height:25px; padding:0; border:1px solid transparent; border-radius:8px; color:var(--ant-color-text,#222); background:transparent; font:500 16px/1 system-ui; cursor:pointer; }
      #guangya-rename-dialog [data-input-action] svg { display:block; width:18px; height:18px; }
      #guangya-rename-dialog [data-input-action][aria-pressed="true"] { border-color:var(--ant-color-primary,#ff6800); }
      #guangya-rename-dialog [data-input-action]:focus-visible { outline:2px solid var(--ant-color-primary,#ff6800); outline-offset:2px; }
      #guangya-rename-dialog [data-input-action]:disabled { opacity:.45; cursor:not-allowed; }
      #guangya-rename-dialog [data-rename-options] { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:20px; margin-bottom:12px; font-size:13px; color: var(--swangpan-color-font-font4,#888); }
      #guangya-rename-dialog [data-video-option] { display:flex; align-items:center; justify-content:center; gap:8px; }
      #guangya-rename-dialog [data-video] { display:flex; align-items:center; }
      #guangya-rename-dialog [data-rename-preview] .ant-card-body { max-height:320px; overflow:auto; overscroll-behavior:contain; }
      #guangya-rename-dialog [data-rename-item] { display:grid; grid-template-columns:minmax(0,1fr) 24px; align-items:center; gap:12px; padding:8px 0; font-size:13px; }
      #guangya-rename-dialog [data-rename-name] { min-width:0; overflow-wrap:anywhere; }
      #guangya-rename-dialog [data-rename-status] { text-align:center; }
      #guangya-rename-dialog [data-rename-part="removed"],#guangya-rename-dialog [data-rename-part="added"] { color:var(--swangpan-color-brand-brand-def,var(--ant-color-primary,#ff6800)); }
      #guangya-rename-dialog [data-rename-part="removed"] { opacity:.4; text-decoration:line-through; }
      #guangya-rename-dialog [data-error="true"] { color:var(--ant-color-error,#f04438); }
      #guangya-rename-dialog [data-rename-state="success"] { color:var(--ant-color-success,#52c41a); }
      #guangya-rename-dialog [data-rename-state="failed"] { color:var(--ant-color-error,#ff4d4f); }
      #guangya-rename-dialog .preview-icon { display:block; width:1em; height:1em; margin:0 auto; }
      #guangya-rename-dialog .swangpan-modal__footer { align-items:center; }
      #guangya-rename-dialog [data-rename-summary] { min-width:0; margin:0; text-align:left; overflow-wrap:anywhere; }
    </style><div data-rename-modes role="group" aria-label="重命名方式"></div><div data-rename-fields></div>
    <div data-rename-options><p data-rename-summary role="status" aria-live="polite"></p><label data-video-option>仅视频<span data-video></span></label></div>
    <div data-rename-preview></div>`;
    const element = modal.element;
    const fields = element.querySelector('[data-rename-fields]');
    const summary = element.querySelector('[data-rename-summary]');
    const close = modal.addButton('取消', { onClick() { if (running) { stopping = true; close.disabled = true; close.textContent = '正在停止'; } else modal.close(); } });
    const start = modal.addButton('开始重命名', { primary: true, disabled: true, onClick: async () => {
      if (running || executed) return;
      preview();
      if (current.error || !current.changed) return;
      executed = true; running = true;
      segmented.disabled = true;
      modal.body.setAttribute('aria-busy', 'true');
      element.querySelector('[data-slot="close"]').disabled = true;
      for (const input of inputs) input.disabled = true;
      videoOnly.disabled = true;
      start.disabled = true; close.textContent = '停止';
      try {
        const result = await execute(current, { request, shouldStop: () => stopping || destroyed, onProgress(progress) {
          if (progress.status === 'processing') attempted = true;
          const row = list.children[progress.index];
          renderStatus(row.lastElementChild, progress.status, progress.reason);
          row.dataset.error = String(progress.status === 'failed');
          row.scrollIntoView({ block: 'nearest', inline: 'nearest', container: 'nearest', behavior: 'instant' });
        } });
        summary.textContent = `成功 ${result.success} · 失败 ${result.failed} · 未变化 ${result.skipped} · 未处理 ${result.pending}`;
        window.__guangyaMessage[result.failed ? 'warning' : 'success'](stopping ? '批量重命名已停止' : '批量重命名完成');
      } catch (error) { summary.textContent = error.message; }
      finally {
        running = false; modal.body.removeAttribute('aria-busy');
        element.querySelector('[data-slot="close"]').disabled = false;
        close.disabled = false; close.textContent = '关闭'; start.textContent = '已结束';
      }
    } });
    // Escape must not close while a request is in flight.
    element.addEventListener('cancel', event => { if (running) { event.preventDefault(); event.stopImmediatePropagation(); } }, { capture: true });
    function renderStatus(cell, status, reason = '') {
      const state = status === 'success' || status === '未变化' ? 'success' : status === 'failed' ? 'failed' : '';
      cell.replaceChildren();
      cell.dataset.renameState = state;
      cell.title = state ? reason || (state === 'success' ? '成功' : '失败') : '';
      if (!state) return;
      cell.innerHTML = icons[state];
      cell.firstElementChild.setAttribute('role', 'img');
      cell.firstElementChild.setAttribute('aria-label', state === 'success' ? '成功' : '失败');
    }
    function preview() {
      if (executed) return;
      current = plan(files, mode, inputs.map(input => input.value), { videoOnly: videoOnly.checked, ignoreCase, useRegex, wholeWord });
      list.replaceChildren();
      for (const item of current.items) {
        const row = document.createElement('div'); row.dataset.renameItem = ''; row.setAttribute('role', 'listitem'); row.dataset.error = String(!!item.error);
        const nameCell = document.createElement('span'); nameCell.dataset.renameName = ''; nameCell.title = item.newName;
        for (const part of item.segments) {
          const span = document.createElement('span'); span.dataset.renamePart = part.type; span.textContent = part.text;
          nameCell.append(span);
        }
        const statusCell = document.createElement('span');
        statusCell.dataset.renameStatus = '';
        statusCell.title = item.error;
        row.append(nameCell, statusCell);
        list.append(row);
      }
      summary.textContent = current.error || `已选中 ${current.items.length} 项，将重命名 ${current.changed} 项`;
      start.disabled = !!current.error || !current.changed;
    }
    function switchMode(next) {
      if (executed) return;
      mode = next; fields.dataset.mode = mode;
      for (const input of inputs) input.destroy();
      inputs = []; fields.replaceChildren();
      for (const label of modes.find(item => item[0] === mode)[2]) {
        const host = document.createElement('label');
        const control = document.createElement('span'); host.append(control); fields.append(host);
        inputs.push(window.__guangyaNativeUI.mountInput(control, {
          value: label === '起始编号' ? '01' : '', ariaLabel: label, placeholder: label, size: 'large', onChange: preview,
          variant: mode === 'replace' ? 'filled' : undefined,
          style: mode === 'replace' ? { borderRadius: 12 } : undefined,
          actions: mode === 'replace' && inputs.length === 0 ? [
            { key: 'case', label: 'Aa', icon: icons.case, title: '区分大小写', pressed: () => !ignoreCase, onClick() { ignoreCase = !ignoreCase; preview(); } },
            { key: 'whole-word', label: 'ab', icon: icons.wholeWord, title: '全词匹配', pressed: () => wholeWord, onClick() { wholeWord = !wholeWord; preview(); } },
            { key: 'regex', label: '.*', icon: icons.regex, title: '正则表达式', pressed: () => useRegex, onClick() { useRegex = !useRegex; preview(); } },
          ] : [],
        }));
      }
      preview();
    }
    try {
      previewCard = window.__guangyaNativeUI.mountCard(element.querySelector('[data-rename-preview]'), { size: 'small', variant: 'outlined' });
      list = previewCard.body; list.setAttribute('role', 'list'); list.setAttribute('aria-label', '重命名预览');
      videoOnly = window.__guangyaNativeUI.mountSwitch(element.querySelector('[data-video]'), {
        checked: true, size: 'small', ariaLabel: '仅视频', onChange: preview,
      });
      segmented = window.__guangyaNativeUI.mountSegmented(element.querySelector('[data-rename-modes]'), {
        options: modes.map(([value, label]) => ({ value, label })), value: mode, block: true, size: 'large',
        ariaLabel: '重命名方式', onChange: switchMode,
      });
      switchMode(mode);
    } catch (error) { modal.close('destroy'); throw error; }
    return modal;
  }
  const api = { run, plan, execute, destroy() { destroyed = true; stopping = true; view?.close('destroy'); if (window[key] === api) delete window[key]; } };
  window[key] = api;
  console.info(prefix, '批量重命名组件已安装');
})();
