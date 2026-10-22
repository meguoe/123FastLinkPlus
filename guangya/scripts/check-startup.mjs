// Offline only: run the real startup branches with process/network/Electron boundaries replaced.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../open-guangya-devtools.mjs', import.meta.url), 'utf8');
const startup = source.slice(source.indexOf('function isAppRunning('), source.indexOf("console.log(attach ?"));
const foreground = source.slice(source.indexOf('function bringAppToFront('), source.indexOf('function isAppRunning('));
async function check({ running = true, inspector = false, args = [], magnet = false, stuck = false, failure, quitFailure } = {}) {
  const calls = [];
  const context = vm.createContext({
    executable: '/Applications/光鸭云盘.app/Contents/MacOS/光鸭云盘', port: 9237,
    process: { argv: ['node', 'launcher', ...args] }, magnetLinks: magnet ? ['magnet:?xt=x'] : [],
    console: { log() {} }, AbortSignal, setTimeout: callback => callback(),
    execFileSync(file, parameters) {
      if (file.endsWith('/pgrep')) {
        if (!running) throw Object.assign(Error('not running'), { status: 1 });
      } else {
        assert.equal(file, '/usr/bin/osascript');
        assert.ok(parameters.at(-1).includes('application.terminate'));
        assert.ok(!parameters.at(-1).includes('forceTerminate'));
        calls.push('quit');
        if (quitFailure) throw Error('quit failed');
        if (!stuck) running = false;
      }
    },
    fetch: async () => {
      calls.push('probe');
      if (failure) throw failure;
      if (!inspector) throw new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } });
      return { ok: true, json: async () => [{ type: 'node', webSocketDebuggerUrl: 'ws://127.0.0.1:9237/mock' }] };
    },
  });
  const result = new vm.Script(`(async () => { ${startup}; return attach; })()`).runInContext(context);
  return { result, calls };
}
let run = await check();
assert.equal(await run.result, false); assert.deepEqual(run.calls, ['probe', 'quit']);
run = await check({ inspector: true });
assert.equal(await run.result, true); assert.deepEqual(run.calls, ['probe']);
for (const options of [{ running: false }, { args: ['--attach'] }, { magnet: true }]) {
  run = await check(options); await run.result; assert.deepEqual(run.calls, []);
}
run = await check({ stuck: true }); await assert.rejects(run.result, /正常退出超时/);
assert.equal(run.calls.filter(call => call === 'quit').length, 1);
run = await check({ quitFailure: true }); await assert.rejects(run.result, /quit failed/);
run = await check({ failure: Error('occupied or timeout') });
await assert.rejects(run.result, /occupied or timeout/); assert.deepEqual(run.calls, ['probe']);

const calls = [];
const makeWindow = (name, minimized = false, destroyed = false) => ({
  isDestroyed: () => destroyed,
  webContents: { isDestroyed: () => false, getURL: () => `file:///app/${name}.html` },
  isMinimized: () => minimized, restore: () => calls.push('restore'),
  show: () => calls.push(name + ':show'), focus: () => calls.push(name + ':focus'),
});
let windows = [makeWindow('login'), makeWindow('main', true)];
const context = vm.createContext({ process: { mainModule: { require: () => ({
  BrowserWindow: { getAllWindows: () => windows }, app: { focus: () => calls.push('app:focus') },
}) } } });
vm.runInContext(foreground, context);
assert.equal(vm.runInContext('bringAppToFront()', context), true);
assert.deepEqual(calls.splice(0), ['restore', 'main:show', 'app:focus', 'main:focus']);
windows = [makeWindow('main', false, true), makeWindow('login')];
assert.equal(vm.runInContext('bringAppToFront()', context), true);
assert.deepEqual(calls.splice(0), ['login:show', 'app:focus', 'login:focus']);
windows = [makeWindow('tools')];
assert.equal(vm.runInContext('bringAppToFront()', context), false); assert.deepEqual(calls, []);
console.log('启动分流、退出失败/超时保护、前台窗口选择离线检查通过');
