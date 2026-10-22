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

// Exercise the actual picker's selection callbacks with lightweight hook/element seams.
const pickerSource = readFileSync(new URL('../guangya-folder-browser.js', import.meta.url), 'utf8');
let hookStates = [], hookIndex = 0, component, props;
const buckets = new Map();
const React = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  useState(initial) {
    const states = hookStates, index = hookIndex++;
    if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
    return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }];
  },
  useRef: current => ({ current }), useEffect() {}, useCallback: callback => callback, useMemo: create => create(),
};
const nodes = Array.from({ length: 6 }, (_, index) => ({ key: String(200 + index), title: `目录${index}`, pathIds: ['', String(200 + index)], children: [], isLeaf: true }));
const root = { key: '', title: '全部文件', pathIds: [''], children: nodes };
const nodesMap = Object.fromEntries([root, ...nodes].map(node => [node.key, node]));
let resolved;
const modal = { visible: true, resolve: value => { resolved = value; }, hide() {}, remove() {}, reject() {} };
const NiceModal = { create: value => value, show: (next, initial) => { component = next; props = initial; } };
const modules = { 23219: { aF: 'modal', $n: 'button', hr: 'tree' }, 92061: { Ay: NiceModal, hS: () => modal },
  5036: { gW: () => ({ treeData: [root], nodesMap, loading: false, saveEditing: async () => ({ ok: true }) }) },
  25270: { jsx() {} }, 11814: { W: 'original' }, 65487: { oDp: { SAFEBOX: 20 } } };
const requireModule = id => modules[id];
requireModule.m = { 11814(module) { /* cancel folder select */ module.exports.W = 'replacement'; } };
const pickerWindow = { __guangyaNativeUI: { getFolderBrowserRuntime: () => ({ React, Input: 'input', Breadcrumb: 'breadcrumb', ConfigProvider: 'provider', getThemeProviders: () => [] }) },
  webpackChunk_swangpan_pc: { push: chunk => chunk[2](requireModule) } };
vm.runInNewContext(pickerSource, { window: pickerWindow, document: { createElement: () => ({ remove() {} }), head: { append() {} } } });
pickerWindow.__guangyaFolderBrowser.select([]);
function render(type = component, values = props) {
  if (!buckets.has(type)) buckets.set(type, []);
  hookStates = buckets.get(type); hookIndex = 0;
  return type(values);
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return;
  if (predicate(node)) return node;
  for (const child of (node.children || []).flat(Infinity)) { const match = find(child, predicate); if (match) return match; }
}
const browser = () => find(render(), node => node.type?.name === 'FolderBrowser');
for (const node of nodes) browser().props.onToggle(node);
assert.equal(browser().props.selection.length, 5, '第六次勾选必须拒绝');
const folder = browser();
folder.props.state.loaded.add('');
const sixth = find(render(folder.type, folder.props), node => node.props['data-folder-check'] === '205');
assert.equal(sixth.props.disabled, true);
browser().props.onToggle(nodes[1]);
browser().props.onToggle(nodes[5]);
assert.deepEqual(plain(browser().props.selection).map(item => item.id), ['200', '202', '203', '204', '205']);
const picker = render();
const confirm = find(picker, node => node.type === 'button' && node.children.includes('确定'));
confirm.props.onClick();
assert.equal(resolved.length, 5);
assert.equal(resolved[0].path, '全部文件/目录0');
const clear = find(render(), node => node.type === 'button' && node.children.includes('清空'));
clear.props.onClick();
assert.equal(browser().props.selection.length, 0);
console.log('ok 实际选择器第六项拒绝、禁用复选框、移除后追加、确认和清空');
