(() => {
  const key = '__guangyaFileListPageSize';
  window[key]?.destroy();
  const prefix = '[光鸭自定义]';
  const endpoint = 'https://api.guangyapan.com/userres/v1/file/get_file_list';
  const prototype = XMLHttpRequest.prototype;
  const originalOpen = prototype.open;
  const originalSend = prototype.send;
  const requests = new WeakMap();
  const stats = { matched: 0, changed: 0 };
  function open(method, url, ...args) {
    const result = originalOpen.call(this, method, url, ...args);
    requests.delete(this);
    try {
      const parsed = new URL(url, document.baseURI);
      if (String(method).toUpperCase() === 'POST' && parsed.origin + parsed.pathname === endpoint) {
        requests.set(this, true);
      }
    } catch { }
    return result;
  }
  function send(body) {
    if (requests.has(this)) {
      stats.matched++;
      if (typeof body === 'string') {
        let data;
        try { data = JSON.parse(body); } catch { }
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          if (data.pageSize !== 500) {
            const previous = data.pageSize;
            data.pageSize = 500;
            body = JSON.stringify(data);
            stats.changed++;
          }
        } else console.warn(prefix, '文件列表请求体不是 JSON 对象，保留原请求');
      } else console.warn(prefix, '文件列表请求体不是字符串，保留原请求');
    }
    return originalSend.call(this, body);
  }
  prototype.open = open;
  prototype.send = send;
  const api = {
    stats,
    destroy() {
      if (prototype.open === open) prototype.open = originalOpen;
      if (prototype.send === send) prototype.send = originalSend;
      if (window[key] === api) delete window[key];
    },
  };
  window[key] = api;
  console.info(prefix, '列表请求拦截已安装');
  return { installed: true, pageSize: 500 };
})();
