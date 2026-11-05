import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../guangya-folder-browser.js', import.meta.url), 'utf8');
const start = source.indexOf('  function destinationPath(');
const end = source.indexOf('  // Use the same frame cache', start);
assert(start >= 0 && end > start, '缺少原生移动/复制导航适配');
let chosen;
const path = { memoizedState: [], queue: { dispatch: value => { chosen = value; } } };
const store = { memoizedState: Object.assign(() => {}, { getState() {} }), queue: {}, next: path };
function Picker() { return ['加载上次文件夹失败', '返回文件夹列表', { folderPath: [] }]; }
const props = { title: '移动到', rootValue: '', excludeDirTypes: [20] };
const anchor = { memoizedProps: {}, stateNode: {} };
const picker = { type: Picker, memoizedProps: props, memoizedState: store, child: anchor };
const root = { child: picker };
anchor.return = { stateNode: { current: root } };
const body = { '__reactFiber$test': anchor, isConnected: true, querySelector: () => null };
let fileInfo = { fileId: '20', fullParentIds: '10', resType: 2, dirType: 0 };
let wait;
const jump = vm.runInNewContext(`(() => {
  ${source.slice(start, end)}
  return openDestinationShortcut;
})()`, {
  hasSource: (fn, markers) => markers.every(marker => String(fn).includes(marker)),
  findNative: () => async () => { await wait; return { data: { fileInfo, location: '父目录/子目录' } }; },
  safebox: 20,
});
for (const title of ['移动到', '复制到']) {
  props.title = title;
  await jump(body, '20');
  assert.deepEqual(JSON.parse(JSON.stringify(chosen)), [{ id: '10', name: '父目录' }, { id: '20', name: '子目录' }]);
}
chosen = undefined;
fileInfo.dirType = 20;
await assert.rejects(jump(body, '20'), /当前范围/);
fileInfo.dirType = 0;
let release;
wait = new Promise(resolve => { release = resolve; });
const pending = jump(body, '20');
body.isConnected = false;
release();
await pending;
assert.equal(chosen, undefined, '关闭弹窗后不得应用迟到结果');
console.log('ok 移动/复制深层跳转、保险箱隔离、关闭后忽略迟到响应');
