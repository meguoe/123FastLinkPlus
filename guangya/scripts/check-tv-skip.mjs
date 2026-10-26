// TV skips only when name and parent both match; same-name batch moves avoid per-file reads.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const window = {};
vm.runInNewContext(readFileSync(new URL('../guangya-tv.js', import.meta.url), 'utf8'), { window, console });
for (const scenario of ['same-path', 'move', 'mixed', 'mixed-reversed', 'conflict', 'unknown', 'stopped']) {
  const folder = {fileId:'src',fileName:'源目录',parentId:'root',resType:2};
  const group = {folder,entries:[]};
  const items = Array.from({length:3},(_,i)=>{
    const name=`节目.S01E0${i+1}.mkv`;
    return {file:{fileId:String(i),fileName:scenario.startsWith('mixed')&&i===1?'旧名称.mkv':name,parentId:scenario==='same-path'?'season':'src',resType:1},newName:name,group,folderName:'目标剧集',seasonName:'Season 1'};
  });
  if(scenario==='mixed-reversed')items.reverse();
  group.entries=items;
  const tree={root:[folder,{fileId:'show',fileName:'目标剧集',resType:2}],show:[{fileId:'season',fileName:'Season 1',resType:2}],src:[],season:[]};
  for(const item of items)tree[item.file.parentId].push(structuredClone(item.file));
  if(scenario==='conflict')tree.season.push({fileId:'other',fileName:items[0].newName,resType:1});
  const reads=[],moves=[],renames=[],deletes=[];
  const result=await window.__guangyaTv.execute({items},{parentId:'root',shouldStop:()=>scenario==='stopped',request:async(path,{body})=>{
    if(path.endsWith('/get_file_list')){reads.push(body.parentId);return{code:0,data:{list:body.page?[]:structuredClone(tree[body.parentId]),total:tree[body.parentId].length}};}
    if(path.endsWith('/move_file')){
      moves.push([...body.fileIds]);
      for(const id of body.fileIds){const index=tree.src.findIndex(f=>f.fileId===id);assert.ok(index>=0);const f=tree.src.splice(index,1)[0];f.parentId=body.parentId;tree[body.parentId].push(f);}
      if(scenario==='unknown')throw Error('请求结果未知');
      return{code:0,data:{}};
    }
    if(path.endsWith('/rename')){renames.push(body.fileId);tree.season.find(f=>f.fileId===body.fileId).fileName=body.newName;return{code:0,data:{}};}
    assert.ok(path.endsWith('/delete_file'),`Unexpected write: ${path}`);
    deletes.push(...body.fileIds);tree.root=tree.root.filter(f=>!body.fileIds.includes(f.fileId));return{code:0,data:{}};
  }});
  if(scenario==='stopped'){assert.equal(result.pending,3);assert.equal(reads.length,0);assert.equal(moves.length,0);}
  else if(scenario==='same-path'){
    assert.equal(result.skipped,3);assert.equal(result.failed,0);assert.equal(moves.length,0);assert.equal(renames.length,0);
    assert.equal(reads.filter(id=>id==='season').length,1,'only final cleanup verification reads target');
  }else if(scenario==='unknown'){
    assert.equal(moves.length,1,'unknown batch must not be retried');assert.equal(result.failed,3);assert.equal(deletes.length,0);
  }else if(scenario==='conflict'){
    assert.equal(result.failed,1);assert.equal(result.success,2);assert.ok(!moves.flat().includes('0'));assert.equal(deletes.length,0);
  }else{
    assert.equal(result.success,3);assert.equal(result.skipped,0);assert.equal(result.failed,0);
    assert.equal(moves.length,1);assert.deepEqual([...moves[0]].sort(),['0','1','2']);
    assert.deepEqual(renames,scenario.startsWith('mixed')?['1']:[]);
    assert.equal(reads.filter(id=>id==='season').length,scenario.startsWith('mixed')?4:3,'batch checks plus cleanup; only rename needs per-file refresh');
    assert.deepEqual(deletes,['src']);
  }
  console.log(`ok TV skip/move: ${scenario}`);
}
