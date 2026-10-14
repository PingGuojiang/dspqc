import { test } from 'node:test';
import assert from 'node:assert/strict';
import LZString from 'lz-string';
import { DSP_RECIPES, DSP_FACILITIES, DSP_BELTS } from '../data/dspData';
import { encodeStateToUrlHash, decodeUrlHashToState } from './urlState';
import type { CalculationInput } from '../engine/calculator';

const recipe = DSP_RECIPES.find(r => r.name === '电磁矩阵')!;
const input: CalculationInput = {recipe,facility:DSP_FACILITIES.find(f=>f.category===recipe.facilityCategory)!,belt:DSP_BELTS[0],beltStackLayers:1,sorterStackTechLevel:1,isTechLocked:false,proliferatorTier:0,proliferatorMode:'none',redundancyPercent:100};

test('a custom recipe survives a shared mixed-belt URL without global mutation', () => {
  const custom = {...recipe,id:'custom_saved',name:'自定义蓝糖',isCustom:true,craftTime:2.125};
  const restored=decodeUrlHashToState(encodeStateToUrlHash({...input,recipe:custom}));
  assert.deepEqual(restored?.recipe,JSON.parse(JSON.stringify(custom)));
  assert.equal(DSP_RECIPES.some(r=>r.id===custom.id),false);
});

test('invalid legacy URL values are rejected rather than evaluated', () => {
  const invalid=LZString.compressToEncodedURIComponent(JSON.stringify({r:recipe.id,l:99,rd:-10}));
  assert.equal(decodeUrlHashToState(invalid),null);
});

test('an unknown shared recipe must not silently select the first recipe', () => {
  const invalid=LZString.compressToEncodedURIComponent(JSON.stringify({r:'missing'}));
  assert.equal(decodeUrlHashToState(invalid),null);
});

test('legacy #s links still resolve valid game data', () => {
  const old=LZString.compressToEncodedURIComponent(JSON.stringify({r:recipe.id,b:2,l:4}));
  const restored=decodeUrlHashToState('#s='+old);
  assert.equal(restored?.recipe?.id,recipe.id);
  assert.equal(restored?.belt?.tier,2);
  assert.equal(restored?.beltStackLayers,4);
});
