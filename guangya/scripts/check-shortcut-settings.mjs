// Offline selection/storage checks; no client or cloud access.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(process.argv[2] || new URL('../guangya-home-button.js', import.meta.url), 'utf8');
assert(source.includes("'guangya-assistant-shortcut-directories'"), 'directory multi-select configuration missing');
const block = source.slice(source.indexOf('  const shortcutStorageKey ='), source.indexOf('  async function openDirectory'));
const make = vm.runInNewContext(`({ storage, select }) => {
  const prefix = '', schedule = () => {}; let destroyed = false;
  const errors = [];
  const window = { localStorage: storage, __guangyaFolderBrowser: { select },
    __guangyaMessage: { error: text => errors.push(text) } };
  ${block}
  return { configure: configureShortcuts, errors, state: () => directoryItems,
    destroy() { destroyed = true; } };
}`, { console });
const plain = value => JSON.parse(JSON.stringify(value));
const storageKey = 'guangya-assistant-shortcut-directories';
const values = new Map([['guangya-assistant-shortcut-parent-id', '123']]);
let writes = 0;
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { writes++; values.set(key, value); } };
const dirs = Array.from({ length: 5 }, (_, index) => ({ id: String(100 + index), name: `目录${index}`, path: `全部文件/父目录/目录${index}` }));
let selected = [dirs[3], dirs[0]], received;
const select = async initial => { received = plain(initial); if (selected === null) throw 'cancel folder select'; return selected; };
const current = make({ storage, select });
assert.equal(current.state().length, 0, '旧父目录配置不得自动生成菜单');
await current.configure();
assert.deepEqual(received, []);
assert.deepEqual(plain(current.state()), selected, '保留勾选顺序');
assert.deepEqual(JSON.parse(values.get(storageKey)), selected);
const reloaded = make({ storage, select });
assert.deepEqual(plain(reloaded.state()), selected);
selected = null;
const beforeCancel = writes;
await reloaded.configure();
assert.deepEqual(received, [dirs[3], dirs[0]], '回显已选目录');
assert.equal(writes, beforeCancel);
assert.equal(reloaded.errors.length, 0);
selected = dirs;
await current.configure();
assert.equal(current.state().length, 5);
console.log('ok 旧配置停用、按勾选顺序保存、重载回显、取消、五项');

for (const invalid of [[...dirs, { id: '999', name: '第六项' }], [dirs[0], dirs[0]], [{ id: '', name: '无效' }], [{ id: '101', name: '' }], null, {}]) {
  const writesBefore = writes;
  const rejected = make({ storage, select: async () => invalid });
  await rejected.configure();
  assert.equal(writes, writesBefore, '非法选择不得保存');
  assert.equal(rejected.errors.length, 1);
}
for (const saved of ['not json', '{}', JSON.stringify([...dirs, dirs[0]])]) {
  assert.equal(make({ storage: { ...storage, getItem: () => saved }, select }).state().length, 0);
}
selected = [];
await current.configure();
assert.equal(current.state().length, 0);
assert.equal(values.get(storageKey), '[]');
console.log('ok 超限/重复/无效选择拒绝、损坏配置停用、清空保存');

values.set(storageKey, JSON.stringify([dirs[0]]));
const denied = make({ storage: { ...storage, setItem() { throw Error('denied'); } }, select: async () => [dirs[1]] });
await denied.configure();
assert.deepEqual(plain(denied.state()), [dirs[0]]);
assert.match(denied.errors[0], /保存失败/);
const mutatingCancel = make({ storage, select: async initial => { initial[0].name = '不应保存'; throw 'cancel folder select'; } });
await mutatingCancel.configure();
assert.equal(mutatingCancel.state()[0].name, dirs[0].name, '取消编辑不得改变原菜单');
console.log('ok 保存失败和取消编辑保留原菜单');

let resolveSelection, opening = 0;
const pending = make({ storage, select: () => { opening++; return new Promise(resolve => resolveSelection = resolve); } });
const picking = pending.configure();
await pending.configure();
assert.equal(opening, 1);
const writesBeforeDestroy = writes;
pending.destroy(); resolveSelection([dirs[2]]); await picking;
assert.equal(writes, writesBeforeDestroy);
console.log('ok 重复点击合并、销毁后不保存');

// Exercise the actual picker with the native paginated hook at its boundary.
const pickerSource = readFileSync(new URL('../guangya-folder-browser.js', import.meta.url), 'utf8');
let slots = [], cursor = 0, component, props, options, refreshes = 0, more = 0;
const effects = [];
const React = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
  },
  useEffect(callback, deps) {
    const index = cursor++, old = slots[index];
    if (!old || deps.some((value, i) => value !== old.deps[i])) {
      old?.cleanup?.(); const item = slots[index] = { deps };
      effects.push(() => { item.cleanup = callback(); });
    }
  },
};
const folders = Array.from({ length: 6 }, (_, i) => ({ fileId: String(200 + i), fileName: `目录${i}`, resType: 2 }));
let frame = { id: '', hydrated: true, isLoading: false, hasMore: true };
let items = [...folders, { fileId: 'safe', fileName: '保险箱', dirType: 20, resType: 2 }];
let resolved, cancelled = false, request;
const modal = { visible: true, resolve: value => { resolved = value; }, hide() {}, remove() {}, reject: value => { cancelled = value; } };
const NiceModal = { create: value => value, show: (next, initial) => { component = next; props = initial; } };
const originalShow = NiceModal.show;
const store = {};
const modules = {
  23219: { aF: 'modal', $n: 'button' }, 92061: { Ay: NiceModal, hS: () => modal },
  5036: { FU: value => { options = value; return { activeFrame: frame, items, isLoading: frame?.isLoading,
    refreshActive: () => { refreshes++; }, loadMoreActive: () => { more++; } }; } },
  30287: { Ay: () => store }, 4179: { Wr: (...args) => { request = args; } },
  65487: { oDp: { SAFEBOX: 20 } },
};
const requireModule = id => modules[id];
requireModule.m = {};
const pickerWindow = { __guangyaNativeUI: { getFolderBrowserRuntime: () => ({ React, Input: 'input', Breadcrumb: 'breadcrumb', ConfigProvider: 'provider', getThemeProviders: () => [] }) },
  webpackChunk_swangpan_pc: { push: chunk => chunk[2](requireModule) } };
const document = { createElement: () => ({ remove() {} }), head: { append() {} } };
assert.doesNotThrow(() => vm.runInNewContext(pickerSource, { window: pickerWindow, document }), '1.1.2 has no legacy tree or folder factory');
assert.equal(NiceModal.show, originalShow, '移动/复制及其他原生弹窗均不得拦截');
pickerWindow.__guangyaFolderBrowser.select([]);
function render() {
  cursor = 0; const result = component(props);
  for (const effect of effects.splice(0)) effect();
  return result;
}
function all(node, predicate) {
  if (!node || typeof node !== 'object') return [];
  return [...(predicate(node) ? [node] : []), ...(node.children || []).flat(Infinity).flatMap(child => all(child, predicate))];
}
const find = (node, predicate) => all(node, predicate)[0];
const button = text => find(render(), node => node.type === 'button' && node.children.includes(text));
const checks = () => all(render(), node => node.props['data-folder-check']);
render();
assert.equal(options.store, store);
assert.equal(options.mode, 'page');
assert.equal(options.rootFrameId, '');
assert.equal(options.params.resType, 2);
const signal = new AbortController().signal;
options.fetcher({ parentId: '123' }, signal);
assert.equal(request[1].signal, signal, '请求取消交给原生 Hook');
assert.equal(checks().length, 6, '保险箱不能勾选');
for (let i = 0; i < 6; i++) checks()[i].props.onChange();
assert.equal(checks()[5].props.disabled, true, '第六项禁用');
button('确定').props.onClick();
assert.deepEqual(plain(resolved).map(item => item.id), ['200', '201', '202', '203', '204']);
assert.equal(resolved[0].path, '全部文件/目录0');
checks()[1].props.onChange(); checks()[5].props.onChange();
button('确定').props.onClick();
assert.deepEqual(plain(resolved).map(item => item.id), ['200', '202', '203', '204', '205']);
button('清空').props.onClick();
button('确定').props.onClick(); assert.deepEqual(plain(resolved), []);
console.log('ok 原生弹窗未拦截、原生分页/取消接口、多选上限/顺序/清空');

const input = () => find(render(), node => node.type === 'input' && node.props.placeholder);
input().props.onChange({ target: { value: '目录1' } });
assert.equal(checks().length, 1);
assert.match(JSON.stringify(render()), /已加载/);
button('加载更多').props.onClick(); assert.equal(more, 1);
input().props.onChange({ target: { value: '' } });
find(render(), node => node.props['data-folder-id'] === '200').props.onClick();
render(); assert.deepEqual(plain(options.folderPath), [{ id: '200', name: '目录0' }]);
assert.equal(button('确定').props.disabled, true, '换层时旧 frame 不得提交');
assert.equal(checks().length, 0, '换层时不显示旧列表');
frame = { id: '200', hydrated: false, isLoading: false, error: '加载失败' };
assert.equal(button('确定').props.disabled, true);
button('重试').props.onClick(); assert.equal(refreshes, 1);
button('取消').props.onClick(); assert.equal(cancelled, 'cancel folder select');
frame = { id: '200', hydrated: true, isLoading: false, hasMore: false };
items = [{ fileId: 'nested', fileName: '子目录', resType: 2 }];
assert.equal(button('确定').props.disabled, false);
checks()[0].props.onChange(); button('确定').props.onClick();
assert.equal(resolved[0].path, '全部文件/目录0/子目录');
const breadcrumb = find(render(), node => node.type === 'breadcrumb');
breadcrumb.props.items[0].onClick(); render();
assert.deepEqual(plain(options.folderPath), []);
modal.visible = false; render(); assert.equal(options.enabled, false);
modal.visible = true; render();
assert.throws(() => pickerWindow.__guangyaFolderBrowser.destroy(), /目录弹窗正在使用/);
for (const slot of slots) slot?.cleanup?.();
pickerWindow.__guangyaFolderBrowser.destroy();
assert.equal(NiceModal.show, originalShow);
assert.equal(pickerWindow.__guangyaFolderBrowser, undefined);
console.log('ok 当前层筛选/分页提示、逐层路径/返回根、失败重试/取消、旧列表隔离、关闭/销毁');

// Shortcut activation must open the directory, not locate/select it in its parent.
const openBlock = source.slice(source.indexOf('  async function openDirectory'), source.indexOf('  function updateShortcuts'));
const makeOpener = vm.runInNewContext(`request => {
  let destroyed = false, shortcutOpening = false;
  const errors = [], schedule = () => {};
  const window = { api: { file: { locateCloudFileInMain: request } },
    __guangyaMessage: { error: message => errors.push(message) } };
  ${openBlock}
  return { openDirectory, errors, destroy() { destroyed = true; } };
}`);
let finishOpen, calls = [];
const opener = makeOpener((...args) => { calls.push(plain(args)); return new Promise(resolve => { finishOpen = resolve; }); });
const openingDirectory = opener.openDirectory('123');
await opener.openDirectory('456');
assert.deepEqual(calls, [['123', { intent: 'open-folder' }]], '必须使用进入目录语义，且合并重复点击');
finishOpen({ ok: true }); await openingDirectory;
assert.equal(opener.errors.length, 0);
const retryOpen = opener.openDirectory('456');
finishOpen({ ok: false, msg: '目录不存在' }); await retryOpen;
assert.deepEqual(plain(opener.errors), ['目录不存在']);
opener.destroy(); await opener.openDirectory('789');
assert.equal(calls.length, 2, '销毁后不能导航');
const rejectedOpen = makeOpener(async () => { throw Error('网络失败'); });
await rejectedOpen.openDirectory('123');
assert.deepEqual(plain(rejectedOpen.errors), ['网络失败']);
console.log('ok 快捷目录进入语义、重复点击、失败提示、销毁保护');
