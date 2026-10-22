(() => {
  const key = '__guangyaExport';
  window[key]?.destroy();
  const prefix = '[光鸭自定义]';
  let nativeRequire;
  let dialog;
  let modal;
  let controller;
  let destroyed = false;

  function requestApi(path, options) {
    if (!nativeRequire) {
      const chunks = window.webpackChunk_swangpan_pc;
      if (!chunks) throw Error('当前应用版本不支持读取请求模块');
      chunks.push([['guangya-assistant-export-' + Date.now()], {}, require => { nativeRequire = require; }]);
    }
    const request = nativeRequire?.(34118)?.E;
    if (typeof request !== 'function') throw Error('当前应用版本的请求接口不兼容');
    return request(path, { ...options, extra: { skipSafeboxUnlock: true } });
  }

  function getSelection() {
    const roots = document.querySelectorAll('main > section [class*="swangpan-file-list"]');
    for (const element of roots) {
      const key = Object.keys(element).find(name => name.startsWith('__reactFiber$'));
      const anchor = element[key];
      let root = anchor;
      while (root?.return) root = root.return;
      const pending = root?.stateNode?.current ? [{ fiber: root.stateNode.current, parentProps: null }] : [];
      let currentProps;
      // DOM Fibers and reused children's return links can point at the old tree.
      // Carry ancestors along the committed tree's child/sibling links instead.
      while (pending.length) {
        const { fiber, parentProps } = pending.pop();
        const own = fiber.memoizedProps;
        const props = own?.rowKey === 'fileId' && Array.isArray(own.dataSource) && Array.isArray(own.selectedItems) ? own : parentProps;
        if (fiber === anchor || fiber === anchor.alternate) { currentProps = props; break; }
        if (fiber.sibling) pending.push({ fiber: fiber.sibling, parentProps });
        if (fiber.child) pending.push({ fiber: fiber.child, parentProps: props });
      }
      if (!currentProps) continue;
      const ids = new Set(currentProps.selectedItems.map(String));
      const files = currentProps.dataSource.filter(file => ids.has(String(file.fileId)));
      if (files.length !== ids.size) throw Error('部分选中文件信息尚未加载，请刷新列表后重新选择');
      return files.map(file => ({ ...file }));
    }
    throw Error('未找到当前文件列表，请回到首页文件列表后重试');
  }

  function hashes(file) {
    const match = (values, length) => values.map(value => String(value ?? '').trim()).find(value => new RegExp(`^[a-f0-9]{${length}}$`, 'i').test(value)) ?? '';
    const md5 = match([file.md5, file.fileMd5, file.etag, file.hash, file.fileHash], 32).toLowerCase();
    const gcid = match([file.gcid, file.GCID], 40).toUpperCase();
    const cid = match([file.cid, file.tripleCid, file.triple_cid, file.sampleCid], 40).toUpperCase();
    const wholeCid = match([file.wholeCid, file.whole_cid, file.wholeSha1, file.sha1, file.fileSha1], 40).toUpperCase();
    return { md5, gcid, cid, wholeCid };
  }

  function formatSize(size) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let value = size, index = 0;
    while (value >= 1024 && index < units.length - 1) { value /= 1024; index++; }
    return `${value.toFixed(index === 0 ? 0 : value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[index]}`;
  }

  async function build(resources, { request = requestApi, signal, onProgress = () => {} } = {}) {
    const files = [], skipped = [], visited = new Set();
    let scanned = 0, compatibilityMd5Count = 0;
    const check = () => signal?.throwIfAborted();
    async function post(path, body) {
      check();
      const response = await request(path, { method: 'POST', body, signal });
      check();
      if (!response || (response.code !== undefined && response.code !== 0)) throw Error(response?.msg || '读取文件信息失败');
      return response.data;
    }
    async function walk(resource, path = []) {
      check();
      const id = String(resource.fileId ?? resource.id ?? '');
      const name = String(resource.fileName ?? resource.name ?? '');
      if (!id || !name || /[\\/\0\r\n]/.test(name) || name === '.' || name === '..') throw Error('文件名称或编号无效，无法生成可导入的路径');
      if (visited.has(id)) return;
      visited.add(id);
      const parts = [...path, name];
      if (Number(resource.resType) !== 1) {
        if (resource.resType === undefined || resource.resType === null) throw Error('文件类型缺失，已停止导出');
        const pages = new Set();
        let count = 0;
        for (let page = 0; ; page++) {
          const data = await post('/userres/v1/file/get_file_list', { parentId: id, page, pageSize: 100, orderBy: 1, sortType: 1 });
          // Empty directories can return success with data: {}.
          if (data && !Array.isArray(data) && typeof data === 'object' && Object.keys(data).length === 0) break;
          if (!Array.isArray(data?.list)) throw Error('目录接口返回的数据格式不兼容');
          if (!data.list.length) break;
          const fingerprint = JSON.stringify(data.list.map(file => file.fileId ?? file.id));
          if (pages.has(fingerprint)) throw Error('目录分页未前进，已停止导出，避免遗漏文件');
          pages.add(fingerprint);
          for (const child of data.list) await walk(child, parts);
          count += data.list.length;
          if (typeof data.total === 'number' && count >= data.total) break;
        }
        return;
      }
      scanned++;
      onProgress({ scanned, exported: files.length, skipped: skipped.length });
      let file = resource;
      let hash = hashes(file);
      let size = file.fileSize ?? file.size ?? file.fileSizeByte ?? file.file_size;
      if ((!hash.md5 && !hash.gcid) || size === undefined || size === null) {
        try {
          const detail = await post('/userres/v1/file/get_file_detail', { fileId: id });
          file = { ...file, ...detail };
          hash = hashes(file);
          size = file.fileSize ?? file.size ?? file.fileSizeByte ?? file.file_size;
        } catch (error) {
          check();
          skipped.push({ path: parts.join('/'), reason: error.message || '读取详情失败' });
          return;
        }
      }
      if ((!hash.md5 && !hash.gcid) || size === undefined || size === null || size === '' || !Number.isSafeInteger(Number(size)) || Number(size) < 0) {
        skipped.push({ path: parts.join('/'), reason: !hash.md5 && !hash.gcid ? '缺少真实 MD5 或 GCID' : '文件大小无效' });
        return;
      }
      const entry = { path: parts.join('/'), size: Number(size) };
      // Match GuangyaHelper.js: this GCID prefix is a compatibility value, not a verified file MD5.
      entry.md5 = hash.md5 || hash.gcid.slice(0, 32).toLowerCase();
      if (!hash.md5) compatibilityMd5Count++;
      if (hash.gcid) entry.gcid = hash.gcid;
      if (hash.cid && hash.cid !== hash.gcid) entry.cid = hash.cid;
      if (hash.wholeCid && hash.wholeCid !== hash.gcid && hash.wholeCid !== hash.cid) entry.wholeCid = hash.wholeCid;
      files.push(entry);
    }
    for (const resource of resources) await walk(resource);
    check();
    if (!files.length) {
      const error = Error('选中的文件缺少秒传信息，暂无法导出');
      error.code = 'NO_RAPID_INFO';
      error.skipped = skipped;
      throw error;
    }
    const totalSize = files.reduce((total, file) => total + file.size, 0);
    if (!Number.isSafeInteger(totalSize)) throw Error('文件总大小超出安全整数范围');
    return {
      data: { version: '1.0', source: 'guangya', totalFilesCount: files.length, totalSize, formattedTotalSize: formatSize(totalSize), createdAt: new Date().toISOString(), files },
      total: scanned, skipped, compatibilityMd5Count,
    };
  }

  function close() {
    modal?.close();
  }

  async function run() {
    if (destroyed) return;
    if (dialog?.isConnected) { dialog.focus(); return; }
    if (controller) return;
    let resources;
    try {
      resources = getSelection();
    } catch (error) {
      window.__guangyaMessage.error(error.message || '读取选中文件失败', { key: 'guangya-export-selection-error' });
      return;
    }
    if (!resources.length) {
      window.__guangyaMessage.warning('请先选择文件或文件夹', { key: 'guangya-export-no-selection' });
      return;
    }
    let editor;
    const view = window.__guangyaModal.open({
      id: 'guangya-export-dialog', title: '正在读取所选文件', width: 220, icon: 'search',
      onClose() {
        if (dialog !== view.element) return;
        controller?.abort();
        editor?.destroy();
        controller = null;
        dialog = null;
        modal = null;
      },
    });
    modal = view;
    const element = view.element;
    dialog = element;
    element.dataset.phase = 'scanning';
    view.body.setAttribute('aria-busy', 'true');
    view.body.innerHTML = `
      <style>
        #guangya-export-dialog [data-export-scan] { display:none; }
        #guangya-export-dialog[data-phase="scanning"] .swangpan-modal__container { height:160px; padding:0; display:flex; flex-direction:column; border-radius:16px; overflow:hidden; }
        #guangya-export-dialog[data-phase="scanning"] .swangpan-modal__header, #guangya-export-dialog[data-phase="scanning"] .swangpan-modal__footer { display:none; }
        #guangya-export-dialog[data-phase="scanning"] .swangpan-modal__close { display:none; }
        #guangya-export-dialog[data-phase="scanning"] .swangpan-modal__body { flex:1; margin:0; padding:0; display:flex; align-items:center; justify-content:center; }
        #guangya-export-dialog[data-phase="scanning"] .swangpan-modal__body > :not(style):not([data-export-scan]) { display:none; }
        #guangya-export-dialog[data-phase="scanning"] [data-export-scan] { display:flex; flex-direction:column; align-items:center; text-align:center; }
        #guangya-export-dialog [data-export-spinner] { width:42px; height:42px; box-sizing:border-box; margin-bottom:16px; border:3px solid #eee1f3; border-bottom-color:#ff6800; border-radius:50%; animation:guangya-export-spin .9s linear infinite; }
        #guangya-export-dialog [data-export-scan] strong { font-size:14px; line-height:22px; color:var(--ant-color-text,#263d63); }
        #guangya-export-dialog [data-export-scan] p { margin:6px 0 2px; color:#6a91cb; font-size:12px; line-height:18px; }
        #guangya-export-dialog [data-export-count] { color:var(--ant-color-text-tertiary,#444); font-size:12px; line-height:18px; }
        @keyframes guangya-export-spin { to { transform:rotate(360deg); } }
        @media (prefers-reduced-motion:reduce) { #guangya-export-dialog [data-export-spinner] { animation:none; } }
        #guangya-export-dialog [data-export-stats]:not([hidden]) { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-bottom:16px; }
        #guangya-export-dialog [data-export-stats] > div { padding:16px 8px; text-align:center; font-size:14px; line-height:22px; color:var(--ant-color-text-secondary,#666); background:var(--ant-color-fill-alter,#fafafa); border:1px solid var(--ant-color-border-secondary,#eee); border-radius:8px; }
        #guangya-export-dialog [data-export-stats] strong { color:var(--ant-color-text,#222); font-weight:600; }
        #guangya-export-dialog [data-export-compat] { margin:0 0 12px; color:var(--ant-color-text-secondary,#888); font-size:12px; line-height:20px; }
        #guangya-export-dialog details { margin-top:12px; font-size:12px; }
        #guangya-export-dialog details pre { white-space:pre-wrap; overflow-wrap:anywhere; max-height:120px; overflow:auto; }
      </style>
      <div data-export-scan role="status" aria-live="polite"><span data-export-spinner aria-hidden="true"></span><strong>正在递归读取文件夹</strong><span data-export-count>已发现 0 个文件</span></div>
      <div data-export-stats hidden role="group" aria-label="导出统计"><div>导出 <strong data-export-total></strong> 个</div><div>跳过 <strong data-export-skipped></strong> 个</div><div>共 <strong data-export-size></strong> <span data-export-size-unit></span></div></div>
      <p data-export-compat hidden></p>
      <div data-export-preview hidden></div>
      <details hidden><summary>未导出清单</summary><pre></pre></details>`;
    view.addButton('取消', { onClick: close }).dataset.exportClose = '';
    view.addButton('复制', { disabled: true }).dataset.exportCopy = '';
    view.addButton('下载', { primary: true, disabled: true }).dataset.exportDownload = '';
    const preview = element.querySelector('[data-export-preview]');
    const copy = element.querySelector('[data-export-copy]');
    const download = element.querySelector('[data-export-download]');
    const cancel = element.querySelector('[data-export-close]');
    const failures = element.querySelector('details');
    const showSkipped = skipped => {
      failures.hidden = !skipped?.length;
      failures.querySelector('pre').textContent = (skipped ?? []).map(file => `${file.path}：${file.reason}`).join('\n');
    };
    const operation = new AbortController();
    controller = operation;
    try {
      console.info(prefix, '开始导出秒传文件', { selected: resources.length });
      const result = await build(resources, {
        signal: operation.signal,
        onProgress: progress => {
          if (dialog === element) element.querySelector('[data-export-count]').textContent = `已发现 ${progress.scanned} 个文件`;
        },
      });
      if (dialog !== element || operation.signal.aborted) return;
      element.dataset.phase = 'result';
      element.style.setProperty('--guangya-modal-width', '800px');
      element.querySelector('[data-slot="title"]').textContent = '导出秒传信息';
      const resultIcon = element.querySelector('[data-slot="icon"]');
      resultIcon.dataset.icon = 'download';
      resultIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download preview-icon"><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg>';
      const json = JSON.stringify(result.data, null, 2);
      preview.hidden = false;
      editor = window.__guangyaJsonEditor.mount(preview, { value: json, readOnly: true, ariaLabel: '秒传 JSON' });
      showSkipped(result.skipped);
      element.querySelector('[data-export-total]').textContent = String(result.data.totalFilesCount);
      element.querySelector('[data-export-skipped]').textContent = String(result.skipped.length);
      const [sizeValue, sizeUnit] = result.data.formattedTotalSize.split(' ');
      element.querySelector('[data-export-size]').textContent = sizeValue;
      element.querySelector('[data-export-size-unit]').textContent = sizeUnit;
      element.querySelector('[data-export-stats]').hidden = false;
      copy.disabled = download.disabled = false;
      copy.dataset.disabled = download.dataset.disabled = 'false';
      element.querySelector('.swangpan-modal__body').setAttribute('aria-busy', 'false');
      cancel.querySelector('[data-slot="content"]').textContent = '关闭';
      copy.addEventListener('click', async () => {
        try {
          if (window.api?.clipboard?.copyToClipboard) {
            const response = await window.api.clipboard.copyToClipboard(json);
            if (response?.ok === false) throw Error(response.msg || '复制失败');
          } else await navigator.clipboard.writeText(json);
          window.__guangyaMessage.success('秒传信息已复制', { key: 'guangya-export-copy-success' });
        } catch (error) { window.__guangyaMessage.error(`复制失败，可手动选择秒传信息：${error.message}`, { key: 'guangya-export-copy-error' }); }
      });
      download.addEventListener('click', () => {
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        const now = new Date();
        const stamp = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds()].map(value => String(value).padStart(2, '0')).join('');
        link.download = `秒传导出_${stamp}.json`;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        close();
      });
      console.info(prefix, '秒传文件导出完成', { exported: result.data.totalFilesCount, skipped: result.skipped.length, compatibilityMd5Count: result.compatibilityMd5Count });
    } catch (error) {
      if (dialog !== element || operation.signal.aborted) return;
      if (error.code === 'NO_RAPID_INFO') {
        await new Promise(resolve => setTimeout(resolve, 200));
        if (dialog !== element || operation.signal.aborted) return;
        close();
        window.__guangyaMessage.warning(error.message, { key: 'guangya-export-no-rapid-info' });
        return;
      }
      close();
      window.__guangyaMessage.error(error.message || '导出失败', { key: 'guangya-export-error' });
      console.warn(prefix, '秒传导出未完成', { message: error.message });
    } finally {
      if (controller === operation) controller = null;
    }
  }

  const api = { run, build, getSelection, destroy() { destroyed = true; controller?.abort(); close(); if (window[key] === api) delete window[key]; } };
  window[key] = api;
  console.info(prefix, '秒传导出组件已安装');
})();
