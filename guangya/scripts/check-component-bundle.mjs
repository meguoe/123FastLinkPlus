// Offline regression: React externals must use the renderer's existing instances.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const source = readFileSync(new URL('../open-guangya-devtools.mjs', import.meta.url), 'utf8');
const build = source.slice(source.indexOf('function buildSegmentedSource()'), source.indexOf('async function installScripts('));
for (const withClient of [false, true]) {
  const resolved = [];
  const require = () => {};
  require.resolve = name => {
    resolved.push(name);
    assert.ok(!name.startsWith('react'), 'React must never be resolved from the app package: ' + name);
    return '/fake/' + name + '.js';
  };
  const modules = {
    electron: { app: { getAppPath: () => '/fake' } }, path,
    module: { createRequire: () => require },
    fs: { readFileSync: () => `module.exports = {default: {React:require('react'),dom:require('react-dom')${withClient ? ",client:require('react-dom/client')" : ''}}};` },
  };
  const context = vm.createContext({ process: { mainModule: { require: name => modules[name] } }, window: {} });
  vm.runInContext(build + '\n' + 'globalThis.bundle = buildSegmentedSource();', context);
  vm.runInContext(context.bundle, context);
  const runtime = { React: {}, dom: {}, client: { createRoot() {} } };
  const components = context.window.__guangyaLoadSegmented(runtime);
  for (const component of [components.Segmented, components.Card, components.Collapse, components.Tag, components.Tooltip, components.Breadcrumb, components.ConfigProvider, ...Object.values(components.StatusIcons)]) {
    assert.equal(component.React, runtime.React);
    assert.equal(component.dom, runtime.dom);
    if (withClient) assert.equal(component.client, runtime.client);
  }
  assert.ok(resolved.length > 0);
}
console.log('组件打包：旧依赖与 react-dom/client 共用原生运行时检查通过');
