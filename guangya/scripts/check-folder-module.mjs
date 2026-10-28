// Exercise the actual module lookup without Electron, React, or cloud requests.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../guangya-folder-browser.js', import.meta.url), 'utf8');
const lookup = source.slice(source.indexOf('  let require;'), source.indexOf('  const { React,'));
function locate(modules) {
  const require = () => { throw Error('lookup must not execute factories'); };
  require.m = modules;
  return vm.runInNewContext(`(() => { ${lookup}\nreturn factory; })()`, {
    window: { webpackChunk_swangpan_pc: { push: chunk => chunk[2](require) } },
  });
}
function folder() { /* cancel folder select; onCreateFolder; loadRootData */ }
function unrelated() { /* cancel folder select */ }
for (const id of [11814, 33446, 98765]) {
  assert.equal(locate({ [id]: folder, 123: unrelated }), folder);
}
assert.throws(() => locate({ 11814: unrelated }), /目录弹窗不兼容/);
assert.throws(() => locate({ 33446: folder, 98765: folder }), /目录弹窗不兼容/);
assert.throws(() => locate(undefined), /目录弹窗不兼容/);
assert(!source.includes('require(11814)'), 'original and replacement must use the discovered module');
console.log('目录模块旧/新/未知编号、无匹配、多匹配、未加载及统一引用检查通过');
