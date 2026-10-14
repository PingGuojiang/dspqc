import {test} from 'node:test';
import assert from 'node:assert/strict';
import LZString from 'lz-string';
import {createWorkspaces,workspaceReducer,encodeWorkspaceHash,decodeWorkspaceHash,serializeWorkspaces,restoreWorkspaces} from './workspaces';

test('switch, edit, undo and reset preserve the other workspace',()=>{
  const initial=createWorkspaces();
  let state=workspaceReducer(initial,{type:'switch',mode:'ordinary'});
  state=workspaceReducer(state,{type:'ordinaryInput',input:{...state.ordinary.input,targets:[{itemId:'6001',ratePerMinute:180}]}});
  state=workspaceReducer(state,{type:'view',mode:'ordinary',view:'metrics'});
  const ordinary=state.ordinary;
  state=workspaceReducer(state,{type:'switch',mode:'mixed'});
  state=workspaceReducer(state,{type:'mixedInput',input:{...state.mixed.input,beltStackLayers:4}});
  assert.deepEqual(state.ordinary,ordinary);
  state=workspaceReducer(state,{type:'undo',mode:'mixed'});
  assert.equal(state.mixed.input.beltStackLayers,1);
  assert.deepEqual(state.ordinary,ordinary);
  state=workspaceReducer(state,{type:'reset',mode:'mixed'});
  assert.deepEqual(state.ordinary,ordinary);
  assert.equal(state.ordinary.view,'metrics');
});

test('share imports one mode without destroying a saved configuration in the other',()=>{
  const original=createWorkspaces();
  const source=workspaceReducer(original,{type:'ordinaryInput',input:{...original.ordinary.input,targets:[{itemId:'6001',ratePerMinute:120}]}});
  const share=decodeWorkspaceHash(encodeWorkspaceHash(source,'ordinary'))!;
  const recipient=workspaceReducer(original,{type:'mixedInput',input:{...original.mixed.input,beltStackLayers:3}});
  const restored=workspaceReducer(recipient,{type:'loadShare',share});
  assert.equal(restored.activeMode,'ordinary');
  assert.deepEqual(restored.mixed,recipient.mixed);
  assert.equal(restored.ordinary.input.targets[0].ratePerMinute,120);
});

test('local save restores both independent inputs and selected views',()=>{
  let state=createWorkspaces();
  state=workspaceReducer(state,{type:'view',mode:'mixed',view:'metrics'});
  state=workspaceReducer(state,{type:'ordinaryInput',input:{...state.ordinary.input,beltTier:1}});
  state=workspaceReducer(state,{type:'switch',mode:'ordinary'});
  const restored=restoreWorkspaces(serializeWorkspaces(state))!;
  assert.equal(restored.activeMode,'ordinary');
  assert.equal(restored.mixed.view,'metrics');
  assert.equal(restored.ordinary.input.beltTier,1);
  assert.equal(restored.mixed.input.belt.tier,1);
});

test('custom recipes and imported items belong to one mode and survive sharing',()=>{
  const state=createWorkspaces();
  const custom={...state.mixed.input.recipe,id:'custom_local',name:'我的配方',isCustom:true};
  const modified=workspaceReducer(state,{type:'mixedRecipe',recipe:custom});
  assert.equal(modified.mixed.customRecipes.length,1);
  assert.equal(modified.ordinary.customRecipes.length,0);
  const restored=decodeWorkspaceHash(encodeWorkspaceHash(modified,'mixed'))!;
  assert.equal(restored.workspace.customRecipes[0].id,custom.id);
  assert.equal((restored.workspace.input as any).recipe.id,custom.id);
  assert.equal(decodeWorkspaceHash('#w=invalid'),null);
  assert.equal(restoreWorkspaces('{broken'),null);
});

test('an empty ordinary target list still saves the other mode and can be shared',()=>{
  const state=createWorkspaces();
  const empty=workspaceReducer(state,{type:'ordinaryInput',input:{...state.ordinary.input,targets:[]}});
  assert.ok(restoreWorkspaces(serializeWorkspaces(empty)));
  assert.ok(decodeWorkspaceHash(encodeWorkspaceHash(empty,'ordinary')));
});

test('saved recipes are snapshots independent of the editor object',()=>{
  const state=createWorkspaces();
  const recipe=structuredClone({...state.mixed.input.recipe,id:'custom_snapshot',isCustom:true});
  const saved=workspaceReducer(state,{type:'mixedRecipe',recipe});
  recipe.inputs[0].count=999;
  assert.notEqual(saved.mixed.input.recipe.inputs[0].count,999);
});

test('invalid icon metadata is rejected before an imported item can render',()=>{
  const state=createWorkspaces();
  const invalid=workspaceReducer(state,{type:'import',mode:'mixed',recipes:[],items:{1001:{id:'1001',name:'Iron',category:'raw',color:'#fff',iconSymbol:'Fe',iconUrl:42 as any}}});
  assert.equal(invalid,state);
});

test('oversized mixed ratios cannot be selected or restored from an otherwise valid link',()=>{
  const state=createWorkspaces();
  const recipe=structuredClone({...state.mixed.input.recipe,id:'custom_oversized',isCustom:true});
  recipe.inputs[0].count=10001;
  const saved=workspaceReducer(state,{type:'mixedRecipe',recipe});
  assert.equal(saved,state);
  const workspace={...state.mixed,customRecipes:[recipe],input:{...state.mixed.input,recipe}};
  const hash='#w='+LZString.compressToEncodedURIComponent(JSON.stringify({v:2,mode:'mixed',workspace}));
  assert.equal(decodeWorkspaceHash(hash),null);
});

test('reimporting a selected recipe updates calculation input and undo restores the previous definition',()=>{
  const state=createWorkspaces();
  const recipe=structuredClone({...state.mixed.input.recipe,id:'imported_replaced',isCustom:true});
  let edited=workspaceReducer(state,{type:'mixedRecipe',recipe});
  const replacement={...recipe,craftTime:9};
  edited=workspaceReducer(edited,{type:'import',mode:'mixed',recipes:[replacement],items:{}});
  assert.equal(edited.mixed.input.recipe.craftTime,9);
  assert.equal(edited.ordinary.customRecipes.length,0);
  const restored=workspaceReducer(edited,{type:'undo',mode:'mixed'});
  assert.equal(restored.mixed.input.recipe.craftTime,3);
});
