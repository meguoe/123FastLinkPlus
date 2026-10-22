// Serialized into the main-process bundle's scope. Keep native dispatch and settings intact.
export function restrictMagnetClipboard(service, extractLinks) {
  const key = '__guangyaMagnetClipboard';
  const handlers = service?.handlers?.filter(handler => handler.id === 'cloud-add-link');
  if (!service?.initialized || handlers?.length !== 1 || typeof extractLinks !== 'function') throw Error('原生磁力剪贴板接口不兼容');
  const handler = handlers[0], previous = globalThis[key];
  if (previous?.handler === handler && handler.match === previous.match) return previous;
  previous?.dispose();
  const original = handler.match;
  const match = text => {
    const urls = extractLinks(text).filter(item => /^magnet:\?\S+$/i.test(item.url) && text.slice(item.start, item.end) === item.url).map(item => item.url);
    return urls.length ? { urls: [...new Set(urls)] } : null;
  };
  const state = { service, handler, match, ready: false, dispose() {
    if (handler.match === match) handler.match = original;
    if (globalThis[key] === state) delete globalThis[key];
  } };
  handler.match = match;
  globalThis[key] = state;
  return state;
}

// Derive private identifiers from the loaded bundle; never assume minified variable names.
export function locateMagnetClipboard(source) {
  const read = [...source.matchAll(/function [\w$]+\(\)\{return [\w$]+\.clipboard\.readText\(\)\}/g)];
  const service = [...source.matchAll(/([\w$]+)=new class\{init\([\w$]+\)\{this\.handlers=/g)];
  const handler = source.indexOf('return{id:"cloud-add-link"');
  const extract = handler < 0 ? null : source.slice(handler, handler + 700).match(/[\w$]+\(([\w$]+)\([\w$]+\)\.map\(/);
  const settings = [...source.matchAll(/isEnabled:\(\)=>([\w$]+)\.settings\.getGeneral\(\)\.clipboardAutoDetectEnabled/g)];
  if (read.length !== 1 || service.length !== 1 || settings.length !== 1 || !extract) throw Error('无法定位原生磁力剪贴板接口，请核对光鸭版本');
  const offset = read[0].index + read[0][0].indexOf('return');
  const prefix = source.slice(0, offset), lines = prefix.split('\n');
  return { service: service[0][1], extract: extract[1], settings: settings[0][1], lineNumber: lines.length - 1, columnNumber: lines.at(-1).length };
}

// Run in Electron's main process. A non-pausing breakpoint reaches the private native service.
export async function installMagnetClipboard() {
  const key = '__guangyaMagnetClipboard';
  const current = globalThis[key];
  if (current?.ready && current.service.handlers.includes(current.handler) && current.handler.match === current.match) return { clipboardMagnetOnly: true, alreadyInstalled: true };
  const { Session } = process.mainModule.require('node:inspector');
  const session = new Session(), scripts = [];
  const post = (method, params = {}) => new Promise((resolve, reject) => session.post(method, params, (error, result) => error ? reject(error) : resolve(result)));
  session.on('Debugger.scriptParsed', ({ params }) => { if (/\/out\/main\/index\.cjs$/.test(params.url)) scripts.push(params.scriptId); });
  let breakpoint;
  const resultKey = '__guangyaMagnetClipboardResult';
  try {
    session.connect();
    await post('Debugger.enable');
    if (scripts.length !== 1) throw Error('无法唯一定位光鸭主进程脚本');
    const scriptId = scripts[0];
    const { scriptSource } = await post('Debugger.getScriptSource', { scriptId });
    const target = locateMagnetClipboard(scriptSource);
    delete globalThis[resultKey];
    const condition = `(() => {
      if (globalThis[${JSON.stringify(resultKey)}]) return false;
      try {
        const state = (${restrictMagnetClipboard.toString()})(${target.service}, ${target.extract});
        globalThis[${JSON.stringify(resultKey)}] = { pending: true };
        ${target.settings}.settings.patchGeneral({ clipboardAutoDetectEnabled: true }).then(() => {
          state.ready = true;
          globalThis[${JSON.stringify(resultKey)}] = { clipboardMagnetOnly: true };
        }, () => { globalThis[${JSON.stringify(resultKey)}] = { error: '无法开启原生磁力识别开关' }; });
      } catch (error) { globalThis[${JSON.stringify(resultKey)}] = { error: '无法限制原生磁力剪贴板接口：' + error.message }; }
      return false;
    })()`;
    ({ breakpointId: breakpoint } = await post('Debugger.setBreakpoint', {
      location: { scriptId, lineNumber: target.lineNumber, columnNumber: target.columnNumber }, condition,
    }));
    // Wait for the existing one-second native watcher. Do not read or alter the clipboard here.
    for (let attempt = 0; attempt < 100; attempt++) {
      const result = globalThis[resultKey];
      if (result && !result.pending) {
        if (result.error) throw Error(result.error);
        return result;
      }
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    throw Error('等待原生剪贴板监听器超时，未确认磁力限制生效');
  } finally {
    if (breakpoint) await post('Debugger.removeBreakpoint', { breakpointId: breakpoint }).catch(() => {});
    session.disconnect();
    delete globalThis[resultKey];
  }
}

if (process.argv[2] === '--self-test' && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  const assert = (await import('node:assert/strict')).default;
  const vm = await import('node:vm');
  const { createRequire } = await import('node:module');
  const link = 'magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&dn=a%20b';
  // The fixture has a private service and the same public seams, with no real clipboard or HTTP.
  const fixture = `(() => {
    const A={clipboard:{readText:()=>''}};
    function read(){return A.clipboard.readText()}
    const parser=text=>Array.from(text.matchAll(/magnet:\\?[^\\s]+/gi),m=>({start:m.index,end:m.index+m[0].length,url:m[0]}));
    const extract=text=>{const links=parser(text);if(/^[0-9a-f]{40}$/.test(text))links.push({start:0,end:text.length,url:'magnet:?xt=urn:btih:'+text});return links};
    const oQ={settings:{enabled:false,writes:0,getGeneral(){return{clipboardAutoDetectEnabled:this.enabled}},async patchGeneral(p){if(this.fail)throw Error('unavailable');this.writes++;this.enabled=p.clipboardAutoDetectEnabled}}};
    const share={id:'share-link',match:()=>({share:true})};
    function factory(){return{id:"cloud-add-link",match:e=>Array.from(extract(e).map(x=>x.url))}};
    const service=new class{init(e){this.handlers=e.handlers;this.initialized=true}};
    service.init({handlers:[share,{...factory(),requiresSignedIn:true,isEnabled:()=>oQ.settings.getGeneral().clipboardAutoDetectEnabled,handle:()=>({handled:true})}]});
    const timer=setInterval(read,20);
    globalThis.fixture={service,extract,share,settings:oQ.settings,timer,keep:()=>[service,extract,oQ]};
  })()`;
  vm.runInThisContext(fixture, { filename: '/fixture/app.asar/out/main/index.cjs' });
  const fixtureState = globalThis.fixture, handler = fixtureState.service.handlers[1], original = handler.match;
  process.mainModule ??= { require: createRequire(import.meta.url) };
  // Exercise the serialized form, as the launcher does.
  const run = vm.runInThisContext(`(() => {const locateMagnetClipboard=${locateMagnetClipboard.toString()};const restrictMagnetClipboard=${restrictMagnetClipboard.toString()};return (${installMagnetClipboard.toString()});})()`);
  try {
    assert.deepEqual(original('https://a/a.webp'), []);
    assert.equal((await run()).clipboardMagnetOnly, true);
    assert.equal(fixtureState.settings.enabled, true);
    assert.equal(fixtureState.settings.writes, 1);
    for (const text of ['https://a/a.webp', 'ftp://a/file', 'ed2k://abc', 'thunder://abc', '0123456789abcdef0123456789abcdef01234567']) assert.equal(handler.match(text), null);
    assert.deepEqual(handler.match(link), { urls: [link] });
    assert.deepEqual(handler.match('文字 '+link+'\nhttps://a/a.webp'), { urls: [link] });
    assert.deepEqual(handler.match(link+'\n'+link), { urls: [link] });
    assert.equal(fixtureState.service.handlers[0], fixtureState.share);
    assert.equal(handler.requiresSignedIn, true);
    fixtureState.settings.enabled = false;
    assert.equal((await run()).alreadyInstalled, true);
    assert.equal(handler.isEnabled(), false);
    assert.equal(fixtureState.settings.writes, 1);
    assert.throws(() => locateMagnetClipboard('different version'), /无法定位/);
    globalThis.__guangyaMagnetClipboard.dispose();
    assert.equal(handler.match, original);
    fixtureState.settings.fail = true;
    await assert.rejects(run(), /无法开启/);
    assert.equal(handler.match('https://a/a.webp'), null);
    assert.equal(fixtureState.settings.enabled, false);
    assert.equal(globalThis.__guangyaMagnetClipboardResult, undefined);
    console.log('原生剪贴板仅磁力、开关、分享隔离、Inspector 安装与清理检查通过');
  } finally {
    clearInterval(fixtureState.timer);
    globalThis.__guangyaMagnetClipboard?.dispose();
    delete globalThis.fixture;
  }
}
