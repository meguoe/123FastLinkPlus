// Run the actual directory view against a lazy native-tree seam; no cloud writes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(process.argv[2] || new URL('../guangya-folder-browser.js', import.meta.url), 'utf8');
const block = source.slice(source.indexOf('  function FolderBrowser('), source.indexOf('  const ShortcutPicker'));
const find = (node, text) => {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'button' && node.children.includes(text)) return node;
  for (const child of (node.children || []).flat(Infinity)) { const match = find(child, text); if (match) return match; }
};
function make({ missing = false, failLoad = false, deferred = false } = {}) {
  const slots = [], effects = []; let cursor = 0, selected = '30', infoCalls = 0, resolveInfo;
  const root = { key: '', title: '文件', pathIds: [''], isLeaf: false, children: [] };
  const state = { rootId: '', nodesMap: { '': root }, loaded: new Set(['']), error: null, loading: false,
    clearError() { state.error = null; }, saveEditing: async () => ({ ok: true }),
    setNavigationBusy(value) { state.navigationBusy = value; },
    async loadRootData() {},
    async onLoadData(node) {
      if (failLoad) { state.error = '列表失败'; return false; }
      const nextId = { '10': '20', '20': '30', '30': '40' }[node.key];
      if (nextId) {
        const next = { key: nextId, title: '目录' + nextId, pathIds: [...node.pathIds, nextId], isLeaf: nextId === '40', children: [] };
        state.nodesMap[nextId] = next; node.children = [next];
      }
      state.loaded = new Set([...state.loaded, node.key]); return true;
    },
  };
  const parent = { key: '10', title: '父目录', pathIds: ['', '10'], isLeaf: false, children: [] };
  root.children = [parent]; state.nodesMap['10'] = parent;
  const request = async () => {
    infoCalls++;
    if (deferred) return new Promise(resolve => { resolveInfo = resolve; });
    if (missing) throw Error('详情失败');
    return { msg: 'success', data: { fileId: '30', resType: 2, fullParentIds: '10/20' } };
  };
  const React = {
    useState(initial) { const id = cursor++; if (!slots[id]) slots[id] = { value: typeof initial === 'function' ? initial() : initial }; return [slots[id].value, next => { slots[id].value = typeof next === 'function' ? next(slots[id].value) : next; }]; },
    useRef(value) { const id = cursor++; return (slots[id] ??= { current: value }); },
    useEffect(callback, deps) {
      const id = cursor++, old = slots[id];
      if (!old || deps.some((dep, index) => dep !== old.deps[index])) {
        old?.cleanup?.(); const item = slots[id] = { deps }; effects.push(() => { item.cleanup = callback(); });
      }
    },
  };
  const view = vm.runInNewContext(`(() => { let active=0; const {useState,useRef,useEffect}=React;
    const h=(type,props,...children)=>({type,props:props||{},children});
    const Input='input',Breadcrumb='breadcrumb',ConfigProvider='provider',getThemeProviders=()=>[];
    ${block} return FolderBrowser; })()`, { React, require: () => ({ E: request }), AbortController });
  let output;
  function render() {
    cursor = 0; output = view({ treeData: [root], selectedKey: selected, onSelect: value => { selected = value; }, state });
    for (const effect of effects.splice(0)) effect(); return output;
  }
  async function settle() { for (let i = 0; i < 12; i++) { render(); await new Promise(resolve => setImmediate(resolve)); } return output; }
  return { state, render, settle, get calls() { return infoCalls; }, select(value) { selected = value; },
    get selected() { return selected; }, fail(value) { failLoad = value; }, missing(value) { missing = value; },
    close() { for (const item of slots) item?.cleanup?.(); },
    resolve() { resolveInfo({ msg: 'success', data: { fileId: '30', resType: 2, fullParentIds: '10/20' } }); },
  };
}
const current = make();
let output = await current.settle();
assert(current.state.loaded.has('30'), '上次深层目录必须加载祖先及自身内容');
assert.equal(current.calls, 1, '详情仅查询一次');
assert(JSON.stringify(output).includes('目录40'), '恢复后展示目标目录的子目录');
current.select('10'); await current.settle(); assert.equal(current.calls, 1);
current.close();
const failed = make({ missing: true });
output = await failed.settle(); assert(find(output, '重试')); assert(find(output, '返回根目录'));
failed.missing(false); find(output, '重试').props.onClick(); await failed.settle(); assert(failed.state.loaded.has('30')); failed.close();
const listFailed = make({ failLoad: true });
output = await listFailed.settle(); assert.equal(listFailed.calls, 1); assert(find(output, '重试'));
listFailed.fail(false); await find(output, '重试').props.onClick(); await listFailed.settle(); assert(listFailed.state.loaded.has('30')); listFailed.close();
const late = make({ deferred: true }); await late.settle(); late.close(); late.resolve(); await new Promise(resolve => setImmediate(resolve));
assert(!late.state.loaded.has('10'), '关闭后迟到详情不得触发加载');
const fallback = make({ missing: true }); output = await fallback.settle(); find(output, '返回根目录').props.onClick(); output = await fallback.settle(); assert.equal(fallback.selected, ''); fallback.close();
console.log('深层上次目录逐层恢复、内容加载、详情/列表失败重试、返回根目录及关闭清理通过');

// Verify the actual native JSX interception prevents unresolved destinations.
const intercept = source.slice(source.indexOf('  function localRequire('), source.indexOf('  Object.assign(localRequire'));
const treeState = { nodesMap: {}, loaded: new Set(), navigationBusy: false, loading: false };
const jsx = vm.runInNewContext(`(() => {
  const hooks={},useTree=()=>{},jsx={jsx:(type,props)=>({type,props})},nativeUI={hr:'tree',$n:'button'},FolderBrowser='browser';
  const require=()=>{};${intercept}return localRequire(25270).jsx;
})()`, { treeState });
jsx('tree', { selectedKey: '30' });
assert.equal(jsx('button', { children: '确定' }).props.disabled, true);
assert.equal(jsx('button', { children: '新建文件夹' }).props.disabled, true);
treeState.nodesMap['30'] = { key: '30', isLeaf: false };
assert.equal(jsx('button', { children: '确定' }).props.disabled, true);
treeState.loaded.add('30');
assert.equal(jsx('button', { children: '确定' }).props.disabled, false);
treeState.loading = true;
assert.equal(jsx('button', { children: '确定' }).props.disabled, true);
assert.equal(jsx('button', { children: '取消' }).props.disabled, undefined);
console.log('移动/复制未知目标、加载期间禁用提交与新建，加载后恢复，取消不受影响，通过');
