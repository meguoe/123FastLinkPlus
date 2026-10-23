// Offline scan boundaries and source cleanup protection; no real cloud requests.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const window = {};
vm.runInNewContext(readFileSync(new URL('../guangya-tv.js', import.meta.url), 'utf8'), { window, console });
const MiB = 1024 ** 2;
const video = (id, fileSize) => ({ fileId: id, fileName: `节目.S01E${id}.mp4`, resType: 1, fileType: 2, fileSize });
const folder = { fileId: 'src', parentId: 'root', fileName: '节目', resType: 2 };
const directory = (id, name) => ({ fileId: id, fileName: name, resType: 2 });
for (const [api, limit] of [[window.__guangyaTv, MiB], [window.__guangyaMovie, 10 * MiB]]) {
  const files = [video('01', limit - 1), video('02', limit), video('03', limit + 1), video('04', undefined)];
  const groups = await api.scan([folder], {
    request: async (path, { body }) => {
      assert.ok(path.endsWith('/get_file_list'));
      return { code: 0, data: { list: body.page ? [] : files, total: files.length } };
    },
    tmdb: async () => ({ results: [], total_pages: 1 }),
  });
  assert.deepEqual(Array.from(groups.flatMap(group => group.entries), entry => entry.file.fileId), ['03']);
  if (api === window.__guangyaTv) {
    const empty = await api.scan([folder], {
      request: async () => ({ code: 0, data: { list: [], total: 0 } }),
    });
    assert.equal(empty[0].error, '没有大于 1MiB 的视频');
  }
  for (const size of [limit, limit + 1, undefined]) {
    const file = { ...video('01', limit + 1), parentId: api === window.__guangyaTv ? 'season' : 'show' };
    const group = { folder, folderName: '目标', entries: [] };
    // Movie cleanup starts at the file's source directory; TV starts at group.folder.
    const item = { file, group, newName: file.fileName, folderName: '目标', seasonName: 'Season 1',
      sourceAncestors: [{ id: 'src', name: '节目' }] };
    group.entries.push(item);
    const tree = { root: [folder, directory('show', '目标')], show: api === window.__guangyaTv ? [directory('season', 'Season 1')] : [file],
      season: [file], src: [video('02', size)] };
    const deleted = [];
    const result = await api.execute({ items: [item] }, { parentId: 'root', request: async (path, { body }) => {
      if (path.endsWith('/get_file_list')) return { code: 0, data: { list: body.page ? [] : tree[body.parentId], total: tree[body.parentId].length } };
      assert.ok(path.endsWith('/delete_file'), `Unexpected write: ${path}`);
      deleted.push(...body.fileIds);
      tree.root = tree.root.filter(file => !body.fileIds.includes(file.fileId));
      return { code: 0, data: {} };
    } });
    assert.deepEqual(deleted, size === limit ? ['src'] : [], `cleanup size ${size}, limit ${limit}`);
    assert.equal(result.failed, 0);
    assert.equal(result.cleanup.failed.length, 0);
  }
}
console.log('ok TV 1MiB / movie 10MiB scan and cleanup boundaries');
