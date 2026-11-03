// No clipboard, settings, network, or live app access.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import * as clipboard from '../guangya-clipboard.mjs';
assert.equal(typeof clipboard.extendShareClipboard, 'function', '缺少原生 shareId 匹配扩展');
const install = vm.runInNewContext('(' + clipboard.extendShareClipboard.toString() + ')');
const ids = [
  '1964415167858270271_asD2V1s5LMjtBU5k',
  '1964528763581829147_aelxWVWH_aYevl3z',
  '1964528825279991874_aelxWVWH_aYevl3z',
  '1964528921476411450_aelxWVWH_aYevl3z',
];
const calls = [];
const original = function(text) {
  assert.equal(this, handler, '保留原生 matcher 的 this');
  calls.push(text);
  const match = String(text).match(/https:\/\/www\.guangyapan\.com\/s\/([^\s?]+)(?:\?code=(\w+))?/);
  return match ? { shareId: match[1], sourceUrl: match[0], code: match[2] } : null;
};
const handler = { id: 'share-link', match: original, handle() {}, requiresSignedIn: true, isEnabled: () => false };
const magnet = { id: 'cloud-add-link', match() {} }, code = { id: 'share-code', match() {} };
const service = { initialized: true, handlers: [handler, magnet, code] };
const state = install(service), match = handler.match;
for (const id of ids) {
  const result = handler.match(' \n' + id + '\t');
  assert.equal(result.shareId, id);
  assert.equal(result.sourceUrl, 'https://www.guangyapan.com/s/' + id);
}
const url = 'https://www.guangyapan.com/s/' + ids[0] + '?code=Ab12';
assert.deepEqual(handler.match('分享 ' + url), original.call(handler, '分享 ' + url));
for (const text of ['', '普通文本', ids[0].slice(1), ids[0] + 'x', '文字 ' + ids[0], ids[0] + '\n' + ids[1],
  'https://example.com/' + ids[0], ids[0].replace('_', '-'), ids[0].replace('asD2', '中文! '), 'magnet:?xt=urn:btih:abc']) {
  assert.equal(handler.match(text), null, text);
}
assert.equal(install(service), state);
assert.equal(handler.match, match, '重复注入不得叠加');
assert.equal(handler.requiresSignedIn, true);
assert.equal(handler.isEnabled(), false, '不自动开启原生分享开关');
assert.equal(service.handlers[1], magnet); assert.equal(service.handlers[2], code);
state.dispose(); assert.equal(handler.match, original);
const next = install(service);
const other = () => null;
handler.match = other; next.dispose(); assert.equal(handler.match, other, '销毁不得覆盖其他补丁');
for (const invalid of [null, { initialized: false, handlers: [handler] }, { initialized: true, handlers: [] },
  { initialized: true, handlers: [handler, handler] }, { initialized: true, handlers: [{ id: 'share-link' }] }]) {
  assert.throws(() => install(invalid), /分享剪贴板接口不兼容/);
}
console.log('shareId 四样本、完整链接/提取码、误匹配、幂等/销毁、开关/登录/其他 handler 隔离检查通过');
