// Verify completion counts with and without source cleanup; no DOM or cloud writes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../guangya-tv.js', import.meta.url), 'utf8');
const assignment = source.match(/^\s*summary.textContent = `成功 \$\{result.success\}[^\n]+\n\s*summary.removeAttribute\('title'\);/m)?.[0];
assert.ok(assignment, 'completion counts missing');
for (const cleanup of [undefined, {deleted:2, failed:[]}, {deleted:1, failed:[{folder:'源目录',reason:'删除失败'}]}]) {
  const summary = {textContent:'', title:'旧提示', removeAttribute(name) { delete this[name]; }};
  vm.runInNewContext(assignment, {summary, cleanup, result:{success:23, failed:1, skipped:2, pending:3}});
  assert.equal(summary.textContent, `成功 23 · 失败 1 · 跳过 2 · 未处理 3 · 删除目录 ${cleanup?.deleted || 0} · 删除失败 ${cleanup?.failed.length || 0}`);
  assert.equal(summary.title, undefined);
}
console.log('ok completion: six plain counts, no cleanup, cleanup success/failure, stale title cleared');
