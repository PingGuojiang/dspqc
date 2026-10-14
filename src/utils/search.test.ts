import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesSearch } from './search';
test('search matches Chinese, full pinyin, initials and IDs',()=>{
 for(const query of ['电磁','diancijuzhen','DCJZ','dian ci ju zhen','ｄｃｊｚ']) assert.ok(matchesSearch('电磁矩阵',query));
 assert.ok(matchesSearch('电磁矩阵','6001',['6001']));
 assert.ok(matchesSearch('制造台 Mk.II','zhizaotai'));
 assert.ok(matchesSearch('重组式制造台','chongzushizhizaotai'));
 assert.ok(matchesSearch('自演化研究站','zyhyjz'));
 assert.ok(matchesSearch('电磁矩阵','  '));
 assert.equal(matchesSearch('电磁矩阵','not-a-match'),false);
});
