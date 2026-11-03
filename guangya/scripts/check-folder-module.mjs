// Exercise the real locator with renumbered modules and renamed exports.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../guangya-folder-browser.js', import.meta.url), 'utf8');
const start = source.indexOf('  const modules = Object.entries(');
assert(start >= 0, '快捷目录必须按源码特征定位，不能写死模块编号');
const end = source.indexOf('  const { React,');
const lookup = source.slice(start, end);
const fixture = () => ({
  modal: { render() { /* swangpan-modal__container; closeOnPressEscape; maskClosable */ } },
  button: { render() { /* swangpan-button__root; iconPosition; loading */ } },
  frames: function() { /* Failed to load file list frame:; rootFrameTitle; loadMoreActive */ },
  store: function() { /* firstPageParam; activeFramePathKey; replaceFramePage; syncPath */ },
  request: function() { /* /userres/v1/file/get_file_list; parentId; signal; extra */ },
  manager: { create() {}, show() {}, hide() {}, register() {} },
  useModal: function() { /* No modal id found in NiceModal.useModal. */ },
  types: { SAFEBOX: 20, NORMAL: 0, TRASH: 4 },
});
function locate(values, { duplicate = false, unrelated = false } = {}) {
  const loaded = [];
  const exports = Object.fromEntries(Object.values(values).map((value, i) => [80000 + i * 17, { ['renamed_' + i]: value }]));
  const modules = Object.fromEntries(Object.entries(exports).map(([id, value]) => [id, { toString: () => Object.values(value).map(v => String(v.render ?? v)).join('\n') }]));
  // Object exports carry factory-level features; the export still needs validation.
  const managerId = Object.keys(exports).find(id => Object.values(exports[id]).includes(values.manager));
  const typesId = Object.keys(exports).find(id => Object.values(exports[id]).includes(values.types));
  if (managerId) modules[managerId] = { toString: () => 'NiceModalId nice-modal/show' };
  if (typesId) modules[typesId] = { toString: () => 'SAFEBOX NORMAL TRASH' };
  if (duplicate) { exports[99999] = { other: fixture().frames }; modules[99999] = { toString: () => String(exports[99999].other) }; }
  if (unrelated) modules[123] = { toString: () => 'unrelated module must not execute' };
  const require = id => { loaded.push(String(id)); assert.notEqual(String(id), '123'); return exports[id]; };
  require.m = modules;
  const found = vm.runInNewContext(`(() => { ${lookup};return {Modal,Button,useFolderFrames,createFolderStore,getFolders,NiceModal,useModal,safebox}; })()`, { require });
  assert.equal(found.Modal, values.modal); assert.equal(found.Button, values.button);
  assert.equal(found.useFolderFrames, values.frames); assert.equal(found.createFolderStore, values.store);
  assert.equal(found.getFolders, values.request); assert.equal(found.NiceModal, values.manager);
  assert.equal(found.useModal, values.useModal); assert.equal(found.safebox, 20);
  return loaded;
}
locate(fixture(), { unrelated: true });
assert.throws(() => locate(fixture(), { duplicate: true }), /分页.*2/);
for (const name of Object.keys(fixture())) {
  const values = fixture(); delete values[name];
  assert.throws(() => locate(values), /无法唯一定位/);
}
const invalid = fixture(); invalid.manager = { create() {}, show() {} };
assert.throws(() => locate(invalid), /无法唯一定位/);
assert(!/require(?:\?\.)?\(\d+\)/.test(source), '快捷目录不应保留模块编号');
console.log('源码特征定位：编号/导出名变化、零/多匹配、接口校验、无关工厂不执行检查通过');
