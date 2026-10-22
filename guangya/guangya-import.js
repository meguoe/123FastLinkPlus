(() => {
  const key = '__guangyaImport';
  window[key]?.destroy();
  let nativeRequire, modal, controller;
  let destroyed = false;
  const prefix = '[光鸭自定义]';

  function requestApi(path, options) {
    if (!nativeRequire) {
      window.webpackChunk_swangpan_pc?.push([['guangya-assistant-import-' + Date.now()], {}, require => { nativeRequire = require; }]);
    }
    const request = nativeRequire?.(34118)?.E;
    if (typeof request !== 'function') throw Error('当前应用版本的请求接口不兼容');
    return request(path, { ...options, extra: { skipSafeboxUnlock: true } });
  }

  function getDestination() {
    const route = window.location.hash.split('?')[0];
    if (/^#\/home(?:\/all)?\/?$/.test(route)) return { id: '', label: '全部文件', route };
    if (!route.startsWith('#/home/all/')) throw Error('请进入全部文件或目标文件夹后再导入');
    const parts = route.slice('#/home/all/'.length).split('/').filter(Boolean);
    if (!parts.length || parts.some(part => !/^\d+(?:-|$)/.test(part))) throw Error('当前目录编号无效');
    const last = parts.at(-1);
    return { id: last.split('-')[0], label: parts.map(part => decodeURIComponent(part.slice(part.indexOf('-') + 1))).join(' / '), route };
  }

  function parse(raw) {
    let value;
    try { value = JSON.parse(String(raw).replace(/^\uFEFF/, '')); } catch { throw Error('JSON 解析失败，请检查内容格式'); }
    if (!value || !Array.isArray(value.files)) throw Error('JSON 顶层需包含 files 数组');
    if (!value.files.length) throw Error('files 数组为空，没有可导入的文件');
    const files = [], invalid = [], seen = new Set();
    const hash = (value, length) => typeof value === 'string' && new RegExp(`^[a-f0-9]{${length}}$`, 'i').test(value.trim()) ? value.trim() : '';
    value.files.forEach((entry, index) => {
      try {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw Error('不是文件对象');
        const path = String(entry.path ?? entry.name ?? '').replace(/\\/g, '/').replace(/^\/+/, '');
        const parts = path.split('/');
        if (!path || parts.some(part => !part.trim() || part === '.' || part === '..' || /[\0\r\n]/.test(part))) throw Error('文件路径无效');
        const size = entry.size ?? entry.fileSize ?? entry.file_size;
        if (!['number', 'string'].includes(typeof size) || String(size).trim() === '' || !Number.isSafeInteger(Number(size)) || Number(size) < 0) throw Error('文件大小无效');
        const md5 = hash(entry.md5 || entry.etag, 32).toLowerCase(), gcid = hash(entry.gcid, 40).toUpperCase();
        if (!md5 && !gcid) throw Error('缺少有效的 MD5 或 GCID');
        if (seen.has(path)) throw Error('文件路径重复');
        seen.add(path);
        const cid = [entry.cid, entry.wholeCid, entry.tripleCid].map(value => hash(value, 40).toUpperCase()).find(value => value && value !== gcid) || '';
        files.push({ path, name: parts.at(-1), directories: parts.slice(0, -1), size: Number(size), md5, gcid, cid, sourceIndex: index });
      } catch (error) { invalid.push({ path: typeof entry?.path === 'string' ? entry.path : `第 ${index + 1} 项`, reason: error.message }); }
    });
    if (!files.length) throw Error(invalid[0]?.reason || '没有可导入的有效文件');
    return { files, invalid };
  }

  function findId(value, names) {
    if (!value || typeof value !== 'object') return '';
    for (const name of names) if (typeof value[name] === 'string' || Number.isSafeInteger(value[name])) return String(value[name]);
    for (const child of Object.values(value)) { const id = findId(child, names); if (id) return id; }
    return '';
  }

  function pause(ms, signal) {
    return new Promise((resolve, reject) => {
      signal?.throwIfAborted();
      const abort = () => { clearTimeout(timer); reject(signal.reason); };
      const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
      signal?.addEventListener('abort', abort, { once: true });
    });
  }

  async function execute(raw, { parentId, request = requestApi, signal, onProgress = () => {} } = {}) {
    if (typeof parentId !== 'string') throw Error('导入目标目录无效');
    const parsed = parse(raw);
    const summary = { total: parsed.files.length, success: 0, failed: 0, invalid: parsed.invalid, failures: [] };
    const directories = new Map([['', parentId]]), listings = new Map();
    const check = () => signal?.throwIfAborted();
    async function post(path, body, allowCode = []) {
      check();
      const response = await request(path, { method: 'POST', body, signal, allowCode });
      check();
      if (!response || typeof response !== 'object') throw Error('接口返回的数据格式不兼容');
      if (response.code !== undefined && response.code !== 0 && !allowCode.includes(response.code)) throw Object.assign(Error(response.msg || '请求失败'), { code: response.code });
      return response;
    }
    async function list(id, refresh = false) {
      if (!refresh && listings.has(id)) return listings.get(id);
      const files = [], pages = new Set();
      for (let page = 0; ; page++) {
        const { data } = await post('/userres/v1/file/get_file_list', { parentId: id, page, pageSize: 100, orderBy: 1, sortType: 1 });
        if (data && !Array.isArray(data) && typeof data === 'object' && !Object.keys(data).length) break;
        if (!Array.isArray(data?.list)) throw Error('目录接口返回的数据格式不兼容');
        if (!data.list.length) break;
        const fingerprint = JSON.stringify(data.list.map(file => file.fileId ?? file.id));
        if (pages.has(fingerprint)) throw Error('目录分页未前进，已停止导入');
        pages.add(fingerprint);
        files.push(...data.list);
        if (typeof data.total === 'number' && files.length >= data.total) break;
      }
      listings.set(id, files);
      return files;
    }
    async function waitTask(taskId, directory = false) {
      for (let attempt = 0; attempt < 60; attempt++) {
        const response = await post(directory ? '/userres/v1/get_task_status' : '/userres/v1/file/get_info_by_task_id', { taskId });
        const data = response.data ?? {};
        const status = String(data.taskStatus ?? data.task_status ?? data.status ?? data.state ?? '').toUpperCase();
        if ([3, 4].includes(Number(status)) || /FAIL|ERROR|CANCEL/.test(status)) throw Error('秒传任务失败');
        if (findId(data, ['fileId', 'file_id', 'dirId', 'id'])) return;
        if (directory && (Number(status) === 2 || /^(SUCCESS|SUCCEED|DONE|FINISH|COMPLETED)$/.test(status))) return;
        if (attempt < 59) await pause(500, signal);
      }
      throw Error('等待任务超时，结果尚未确认，请先检查云盘后再重试');
    }
    async function ensurePath(parts) {
      let id = parentId, path = '';
      for (const name of parts) {
        path = path ? `${path}/${name}` : name;
        if (directories.has(path)) { id = directories.get(path); continue; }
        const find = files => files.find(file => Number(file.resType) === 2 && (file.fileName ?? file.name) === name);
        let entry = find(await list(id));
        if (!entry) {
          try {
            const response = await post('/userres/v1/file/create_dir', { dirName: name, parentId: id, failIfNameExist: true });
            const task = findId(response.data, ['taskId', 'task_id']);
            if (task) await waitTask(task, true);
            const createdId = findId(response.data, ['fileId', 'dirId', 'id']);
            entry = createdId ? { fileId: createdId, fileName: name, resType: 2 } : find(await list(id, true));
          } catch (error) {
            check();
            // A concurrent create or a lost response may already have created the directory.
            entry = find(await list(id, true));
            if (!entry) throw error;
          }
          if (!entry) throw Error(`创建目录失败：${name}`);
          if (!listings.get(id)?.includes(entry)) listings.get(id)?.push(entry);
        }
        id = findId(entry, ['fileId', 'dirId', 'id']);
        if (!id) throw Error(`目录编号缺失：${name}`);
        directories.set(path, id);
      }
      return id;
    }
    async function importFile(file, id) {
      const { gcid, md5, cid, size: fileSize } = file;
      const candidates = [];
      if (gcid) {
        if (cid) candidates.push({ gcid, cid, ...(md5 ? { md5 } : {}), fileSize });
        if (md5) candidates.push({ gcid, md5, fileSize });
        candidates.push({ gcid, fileSize });
      } else candidates.push({ md5, fileSize });
      let taskId = '', lastError;
      for (const res of candidates) {
        try {
          const response = await post('/userres/v1/get_res_center_token', { capacity: gcid ? 2 : 1, res, name: file.name, parentId: id }, [156]);
          if (response.code === 156 || findId(response.data, ['fileId', 'file_id'])) return;
          taskId = findId(response.data, ['taskId', 'task_id']);
          if (taskId) break;
        } catch (error) {
          check();
          // A transport failure can have an unknown server outcome; do not submit it again.
          if (!Number.isFinite(error.code)) throw error;
          lastError = error;
        }
      }
      if (!taskId) throw lastError || Error('资源未命中，无法创建秒传任务');
      if (!gcid) { await waitTask(taskId); return; }
      let pollId = '';
      for (const res of candidates) {
        try {
          const response = await post('/userres/v1/check_can_flash_upload', { taskId, ...res });
          pollId = findId(response.data, ['taskId', 'task_id']);
          if (!pollId && (response.data?.canFlashUpload === true || findId(response.data, ['fileId', 'file_id']))) pollId = taskId;
          if (pollId) break;
        } catch (error) {
          check();
          if (!Number.isFinite(error.code)) throw error;
          lastError = error;
        }
      }
      if (!pollId) throw lastError || Error('资源未命中，无法秒传');
      await waitTask(pollId);
    }
    for (const file of parsed.files) {
      check();
      onProgress({ ...summary, file, phase: 'preparing' });
      try {
        const id = await ensurePath(file.directories);
        onProgress({ ...summary, file, phase: 'processing' });
        await importFile(file, id);
        summary.success++;
        onProgress({ ...summary, file, phase: 'success' });
      } catch (error) {
        check();
        summary.failed++;
        summary.failures.push({ path: file.path, reason: error.message || '导入失败' });
        onProgress({ ...summary, file, phase: 'failed', error: error.message });
      }
    }
    return summary;
  }

  function run() {
    if (destroyed) return;
    if (modal?.element.isConnected) { modal.element.focus(); return; }
    let destination;
    try { destination = getDestination(); } catch (error) { window.__guangyaMessage.warning(error.message, { key: 'guangya-import-destination' }); return; }
    let refreshOnClose = false;
    let editor;
    const view = window.__guangyaModal.open({
      id: 'guangya-import-dialog', title: '导入秒传文件', width: 800, icon: 'upload', closeOnMask: false,
      onClose(reason) {
        if (modal !== view) return;
        controller?.abort(); controller = null; modal = null;
        editor?.destroy();
        if (refreshOnClose && !destroyed && reason !== 'destroy') {
          const refresh = document.querySelector('main button[aria-label="刷新"]');
          if (refresh) refresh.click();
          else console.warn(prefix, '导入完成，但未找到原生刷新按钮');
        }
      },
    });
    modal = view;
    view.body.innerHTML = `
      <style>
        #guangya-import-dialog [data-import-choose] { margin-right:auto; }
        #guangya-import-dialog [data-import-note]:empty, #guangya-import-dialog [data-import-file-name]:empty { display:none; }
        #guangya-import-dialog [data-import-note] { color:var(--ant-color-text-secondary,#666); font-size:13px; line-height:22px; overflow-wrap:anywhere; }
        #guangya-import-dialog [data-import-file-name] { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ant-color-text-secondary,#666); font-size:12px; }
        #guangya-import-dialog [data-import-results] { max-height:260px; overflow:auto; margin-top:12px; border:1px solid var(--ant-color-border-secondary,#eee); border-radius:8px; }
        #guangya-import-dialog [data-import-results]:empty { display:none; }
        #guangya-import-dialog [data-import-results] > div { display:flex; gap:12px; padding:8px 12px; border-bottom:1px solid var(--ant-color-border-secondary,#eee); font-size:12px; line-height:20px; }
        #guangya-import-dialog [data-import-results] > div:last-child { border-bottom:0; }
        #guangya-import-dialog [data-import-path] { flex:1; min-width:0; overflow-wrap:anywhere; }
        #guangya-import-dialog [data-state="failed"] { color:var(--ant-color-error,#f04438); }
        #guangya-import-dialog [data-state="success"] { color:var(--ant-color-success,#389e0d); }
      </style>
      <input type="file" accept=".json,application/json,text/json" hidden><span data-import-file-name></span>
      <div data-import-editor></div>
      <p data-import-note role="status" aria-live="polite"></p>
      <div data-import-results></div>`;
    const element = view.element;
    try { editor = window.__guangyaJsonEditor.mount(element.querySelector('[data-import-editor]'), { placeholder: '可以选择导入秒传文件，也可以直接填写秒传格式的内容', ariaLabel: '秒传内容' }); }
    catch (error) { view.close(); window.__guangyaMessage.error(error.message || 'JSON 编辑器初始化失败', { key: 'guangya-import-editor' }); return; }
    const input = element.querySelector('input[type="file"]');
    const filename = element.querySelector('[data-import-file-name]'), note = element.querySelector('[data-import-note]');
    const results = element.querySelector('[data-import-results]');
    const choose = view.addButton('选择文件', { onClick: () => input.click() });
    choose.dataset.importChoose = '';
    const stop = view.addButton('取消', { onClick: () => view.close() });
    const start = view.addButton('开始导入', { primary: true, onClick: begin });
    stop.dataset.importClose = '';
    start.dataset.importStart = '';
    let completed = false, reading = 0;
    const buttonState = (button, disabled) => { button.disabled = disabled; button.dataset.disabled = String(disabled); };
    const label = (button, text) => { button.querySelector('[data-slot="content"]').textContent = text; };
    const rows = new Map();
    function addRow(path, state, message) {
      const row = document.createElement('div'), name = document.createElement('span'), status = document.createElement('span');
      name.dataset.importPath = ''; name.textContent = path; status.textContent = message;
      row.dataset.state = state; row.append(name, status); results.append(row);
      return { row, status };
    }
    function reset() {
      completed = false; buttonState(start, false); rows.clear(); results.replaceChildren(); editor.hidden = false;
      editor.value = ''; input.value = ''; filename.textContent = ''; label(start, '开始导入');
      note.textContent = '';
    }
    input.addEventListener('change', async () => {
      const file = input.files?.[0]; if (!file) return;
      const version = ++reading;
      buttonState(start, true);
      try {
        const text = await file.text();
        if (version !== reading || modal !== view) return;
        reset(); editor.value = text; filename.textContent = file.name;
      } catch (error) { window.__guangyaMessage.error(error.message || '读取 JSON 文件失败', { key: 'guangya-import-file' }); }
      finally { if (version === reading && modal === view) buttonState(start, false); }
    });
    async function begin() {
      if (controller) return;
      if (completed) { view.close(); return; }
      let parsed;
      const raw = editor.value;
      try { parsed = parse(raw); } catch (error) { window.__guangyaMessage.error(error.message, { key: 'guangya-import-json' }); return; }
      rows.clear(); results.replaceChildren();
      for (const file of parsed.files) rows.set(file.sourceIndex, addRow(file.path, 'waiting', '待导入'));
      for (const invalid of parsed.invalid) addRow(invalid.path, 'failed', `跳过：${invalid.reason}`);
      const operation = new AbortController(); controller = operation;
      editor.hidden = true; editor.disabled = input.disabled = true;
      buttonState(start, true); buttonState(choose, true);
      label(start, '导入中'); label(stop, '停止');
      view.body.setAttribute('aria-busy', 'true');
      console.info(prefix, '开始秒传导入', { files: parsed.files.length, skipped: parsed.invalid.length });
      refreshOnClose = true;
      try {
        const summary = await execute(raw, { parentId: destination.id, signal: operation.signal, onProgress(progress) {
          if (modal !== view) return;
          const item = rows.get(progress.file.sourceIndex);
          item.row.dataset.state = progress.phase;
          item.status.textContent = progress.phase === 'success' ? '已导入' : progress.phase === 'failed' ? progress.error : progress.phase === 'preparing' ? '准备目录' : '导入中';
          note.textContent = `已导入 ${progress.success} 个 · 失败 ${progress.failed} 个 · 跳过 ${progress.invalid.length} 个 · 共 ${progress.total} 个`;
        } });
        if (modal !== view || operation.signal.aborted) return;
        completed = true;
        note.textContent = `导入完成：成功 ${summary.success} 个 · 失败 ${summary.failed} 个 · 跳过 ${summary.invalid.length} 个。关闭弹窗后将刷新文件列表。`;
        window.__guangyaMessage[summary.failed ? 'warning' : 'success'](`导入完成，成功 ${summary.success} 个，失败 ${summary.failed} 个`, { key: 'guangya-import-completed' });
        console.info(prefix, '秒传导入完成', { success: summary.success, failed: summary.failed, skipped: summary.invalid.length });
      } catch (error) {
        if (!operation.signal.aborted && modal === view) window.__guangyaMessage.error(error.message || '导入失败', { key: 'guangya-import-error' });
      } finally {
        if (controller === operation) controller = null;
        if (modal === view) {
          editor.disabled = input.disabled = false;
          view.body.setAttribute('aria-busy', 'false');
          buttonState(start, false); buttonState(choose, false);
          label(start, completed ? '关闭' : '开始导入'); label(stop, '关闭');
        }
      }
    }
    editor.focus();
  }

  const api = { run, parse, execute, getDestination, destroy() { destroyed = true; controller?.abort(); modal?.close(); if (window[key] === api) delete window[key]; } };
  window[key] = api;
  console.info(prefix, '秒传导入组件已安装');
})();
