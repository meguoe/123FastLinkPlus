// Verify the real shortcut adapter fails closed when native interfaces change.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../guangya-folder-browser.js', import.meta.url), 'utf8');
function check(missing) {
  const show = () => {};
  const modules = {
    23219: { aF: {}, $n: {} }, 5036: { FU() {} }, 30287: { Ay() {} }, 4179: { Wr() {} },
    92061: { Ay: { create: value => value, show }, hS() {} }, 65487: { oDp: { SAFEBOX: 20 } },
  };
  if (missing) delete modules[missing[0]][missing[1]];
  const require = id => modules[id];
  const window = {
    webpackChunk_swangpan_pc: { push: chunk => chunk[2](require) },
    __guangyaNativeUI: { getFolderBrowserRuntime: () => ({ React: {}, getThemeProviders() {} }) },
  };
  vm.runInNewContext(source, { window, document: { createElement: () => ({ remove() {} }), head: { append() {} } } });
  assert.equal(modules[92061].Ay.show, show, '原生弹窗入口不得修改');
  window.__guangyaFolderBrowser.destroy();
  assert.equal(window.__guangyaFolderBrowser, undefined);
}
check();
for (const missing of [[5036, 'FU'], [30287, 'Ay'], [4179, 'Wr'], [92061, 'hS'], [23219, 'aF'], [65487, 'oDp']]) {
  assert.throws(() => check(missing), /快捷目录接口不兼容/);
}
console.log('快捷目录原生接口验证、缺失保护、原生弹窗不变及销毁检查通过');
