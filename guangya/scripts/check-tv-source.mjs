// Offline regression: movie moves must recheck each source after earlier moves.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(process.argv[2] || new URL('../guangya-tv.js', import.meta.url), 'utf8');
for (const change of ['rename', 'move', 'delete', 'none']) {
  const window = {};
  vm.runInNewContext(source, { window, console });
  const files = ['a', 'b'].map(id => ({ fileId: id, fileName: `${id}.mkv`, parentId: 'src', resType: 1 }));
  const tree = {
    root: ['a', 'b', 'src'].map(id => ({ fileId: id === 'src' ? id : `target-${id}`, fileName: id, resType: 2 })),
    src: structuredClone(files), 'target-a': [], 'target-b': [], elsewhere: [],
  };
  const items = files.map(file => ({ file, newName: file.fileName, folderName: file.fileId,
    group: { folder: file, entries: [] } }));
  const moves = [], errors = [];
  let deletions = 0;
  const request = async (path, { body }) => {
    if (path.endsWith('/get_file_list')) {
      const list = tree[body.parentId] || [];
      return { code: 0, data: { list: body.page ? [] : structuredClone(list), total: list.length } };
    }
    if (path.endsWith('/move_file')) {
      for (const id of body.fileIds) {
        moves.push(id);
        const from = Object.values(tree).find(list => list.some(file => file.fileId === id));
        const file = from.splice(from.findIndex(file => file.fileId === id), 1)[0];
        file.parentId = body.parentId;
        tree[body.parentId].push(file);
        if (id === 'a' && change !== 'none') {
          if (change === 'rename') tree.src[0].fileName = '用户新名称.mkv';
          else {
            const removed = tree.src.pop();
            if (change === 'move') { removed.parentId = 'elsewhere'; tree.elsewhere.push(removed); }
          }
        }
      }
      return { code: 0, data: {} };
    }
    if (path.endsWith('/delete_file')) {
      deletions++;
      for (const list of Object.values(tree)) {
        const index = list.findIndex(file => body.fileIds.includes(file.fileId));
        if (index >= 0) list.splice(index, 1);
      }
      return { code: 0, data: {} };
    }
    throw Error(`Unexpected request: ${path}`);
  };
  const result = await window.__guangyaMovie.execute({ items }, { parentId: 'root', request,
    onProgress(progress) { if (progress.status === 'failed') errors.push(progress.reason); } });
  assert.deepEqual(moves, change === 'none' ? ['a', 'b'] : ['a'], `${change}: moved changed source`);
  assert.equal(result.success, change === 'none' ? 2 : 1);
  assert.equal(result.failed, change === 'none' ? 0 : 1);
  assert.deepEqual(errors, change === 'none' ? [] : ['源文件已变化，请重新扫描']);
  if (change !== 'none') { assert.equal(deletions, 0); assert.equal(result.cleanup, undefined); }
  else assert.equal(result.cleanup.failed.length, 0);
  console.log(`ok movie source: ${change}`);
}
