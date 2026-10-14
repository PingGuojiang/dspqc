import LZString from 'lz-string';
import { DSP_RECIPES, DSP_FACILITIES, DSP_BELTS, isFacilityCompatible, type DSPRecipe, type DSPItem } from '../data/dspData';
import type { CalculationInput } from '../engine/calculator';
import { supportsMixedRecipe } from '../engine/calculator';
import { createDefaultProductionInput, type ProductionInput } from '../engine/production';
import { decodeUrlHashToState } from './urlState';
import { isRecord, validItems, validRecipe, validProduction, validateMixed } from './stateValidation';

export type PlannerMode = 'mixed' | 'ordinary';
export type PlannerView = 'schematic' | 'metrics';
export const STORAGE_KEY = 'dsp-planner.workspaces.v2';
interface Snapshot<T> { input:T; view:PlannerView; customRecipes:DSPRecipe[]; items:Record<string,DSPItem> }
export interface Workspace<T> extends Snapshot<T> { history:Snapshot<T>[] }
export interface Workspaces { activeMode:PlannerMode; mixed:Workspace<CalculationInput>; ordinary:Workspace<ProductionInput> }
export type WorkspaceShare = { mode:'mixed'; workspace:Snapshot<CalculationInput> } | { mode:'ordinary'; workspace:Snapshot<ProductionInput> };
export type WorkspaceAction =
  | { type:'switch'; mode:PlannerMode }
  | { type:'view'; mode:PlannerMode; view:PlannerView }
  | { type:'mixedInput'; input:CalculationInput }
  | { type:'ordinaryInput'; input:ProductionInput }
  | { type:'mixedRecipe'; recipe:DSPRecipe }
  | { type:'ordinaryRecipe'; recipe:DSPRecipe }
  | { type:'import'; mode:PlannerMode; recipes:DSPRecipe[]; items:Record<string,DSPItem> }
  | { type:'undo'|'reset'; mode:PlannerMode }
  | { type:'loadShare'; share:WorkspaceShare };

export function createDefaultMixedInput():CalculationInput {
  const recipe=DSP_RECIPES.find(r=>r.name==='电磁矩阵')!;
  return {recipe,facility:DSP_FACILITIES.find(f=>isFacilityCompatible(recipe,f))!,belt:DSP_BELTS[0],beltStackLayers:1,sorterStackTechLevel:1,isTechLocked:false,proliferatorTier:0,proliferatorMode:'output',redundancyPercent:100,preferredSorterDistance:1};
}
function workspace<T>(input:T):Workspace<T> { return {input,view:'schematic',customRecipes:[],items:{},history:[]}; }
export function createWorkspaces():Workspaces {
  return {activeMode:'mixed',mixed:workspace(createDefaultMixedInput()),ordinary:workspace(createDefaultProductionInput())};
}
function snapshot<T>({history,...rest}:Workspace<T>):Snapshot<T> { return rest; }
function edit<T>(before:Workspace<T>,changes:Partial<Snapshot<T>>):Workspace<T> {
  return {...before,...changes,history:[...before.history.slice(-24),snapshot(before)]};
}
function mergeRecipes(before:DSPRecipe[],added:DSPRecipe[]) {
  return [...added,...before.filter(r=>!added.some(a=>a.id===r.id))];
}
export function validateImportBundle(data:{recipes:DSPRecipe[];items:Record<string,DSPItem>}):void {
  if (!Array.isArray(data.recipes) || data.recipes.length>2000 || !data.recipes.every(validRecipe) || !validItems(data.items)) throw new Error('导入定义包含无效元数据或超出支持范围');
  if (new Set(data.recipes.map(r=>r.id)).size!==data.recipes.length) throw new Error('导入配方 ID 重复');
}
export function workspaceReducer(state:Workspaces,action:WorkspaceAction):Workspaces {
  switch(action.type) {
    case 'switch':return {...state,activeMode:action.mode};
    case 'view':return action.mode==='mixed'?{...state,mixed:{...state.mixed,view:action.view}}:{...state,ordinary:{...state.ordinary,view:action.view}};
    case 'mixedInput':return {...state,mixed:edit(state.mixed,{input:action.input})};
    case 'ordinaryInput':return {...state,ordinary:edit(state.ordinary,{input:action.input})};
    case 'mixedRecipe': {
      const facility=DSP_FACILITIES.find(f=>isFacilityCompatible(action.recipe,f));
      if (!validRecipe(action.recipe) || !supportsMixedRecipe(action.recipe) || !facility) return state;
      const recipe=structuredClone(action.recipe);
      return {...state,mixed:edit(state.mixed,{customRecipes:mergeRecipes(state.mixed.customRecipes,[recipe]),input:{...state.mixed.input,recipe,facility,customFacilityCount:undefined}})};
    }
    case 'ordinaryRecipe':return validRecipe(action.recipe)?{...state,ordinary:edit(state.ordinary,{customRecipes:mergeRecipes(state.ordinary.customRecipes,[structuredClone(action.recipe)])})}:state;
    case 'import': {
      try {validateImportBundle(action);} catch {return state;}
      const recipes=structuredClone(action.recipes);
      const items=structuredClone(action.items);
      if (action.mode==='mixed') {
        const replacement=recipes.find(r=>r.id===state.mixed.input.recipe.id);
        const current=state.mixed.input;
        const facility=replacement?(isFacilityCompatible(replacement,current.facility)?current.facility:DSP_FACILITIES.find(f=>isFacilityCompatible(replacement,f))):current.facility;
        const input=replacement?(supportsMixedRecipe(replacement)&&facility?{...current,recipe:replacement,facility}:createDefaultMixedInput()):current;
        return {...state,mixed:edit(state.mixed,{input,customRecipes:mergeRecipes(state.mixed.customRecipes,recipes),items:{...state.mixed.items,...items}})};
      }
      return {...state,ordinary:edit(state.ordinary,{customRecipes:mergeRecipes(state.ordinary.customRecipes,recipes),items:{...state.ordinary.items,...items}})};
    }
    case 'undo': {
      const before=state[action.mode];
      const previous=before.history.at(-1);
      if (!previous) return state;
      return {...state,[action.mode]:{...previous,history:before.history.slice(0,-1)}} as Workspaces;
    }
    case 'reset': {
      if (action.mode==='mixed') return {...state,mixed:edit(state.mixed,snapshot(workspace(createDefaultMixedInput())))};
      return {...state,ordinary:edit(state.ordinary,snapshot(workspace(createDefaultProductionInput())))};
    }
    case 'loadShare': {
      const share=action.share;
      return share.mode==='mixed'?{...state,activeMode:'mixed',mixed:edit(state.mixed,share.workspace)}:{...state,activeMode:'ordinary',ordinary:edit(state.ordinary,share.workspace)};
    }
  }
}

function parseSnapshot(mode:PlannerMode,value:unknown):Snapshot<CalculationInput>|Snapshot<ProductionInput>|null {
  if (!isRecord(value) || !['schematic','metrics'].includes(value.view) || !Array.isArray(value.customRecipes) || value.customRecipes.length>2000 || !value.customRecipes.every(validRecipe) || !validItems(value.items)) return null;
  if (new Set(value.customRecipes.map((r:DSPRecipe)=>r.id)).size!==value.customRecipes.length) return null;
  if (mode==='mixed') {
    const input=validateMixed(value.input,value.customRecipes);
    return input?{input,view:value.view,customRecipes:value.customRecipes,items:value.items}:null;
  }
  return validProduction(value.input)?{input:value.input,view:value.view,customRecipes:value.customRecipes,items:value.items}:null;
}
export function serializeWorkspaces(state:Workspaces):string {
  return JSON.stringify({v:2,activeMode:state.activeMode,mixed:snapshot(state.mixed),ordinary:snapshot(state.ordinary)});
}
export function restoreWorkspaces(json:string):Workspaces|null {
  try {
    if (json.length>8000000) return null;
    const value=JSON.parse(json);
    if (!isRecord(value) || value.v!==2 || !['mixed','ordinary'].includes(value.activeMode)) return null;
    const mixed=parseSnapshot('mixed',value.mixed) as Snapshot<CalculationInput>|null;
    const ordinary=parseSnapshot('ordinary',value.ordinary) as Snapshot<ProductionInput>|null;
    return mixed && ordinary?{activeMode:value.activeMode,mixed:{...mixed,history:[]},ordinary:{...ordinary,history:[]}}:null;
  } catch { return null; }
}
export function encodeWorkspaceHash(state:Workspaces,mode:PlannerMode):string {
  const saved=mode==='mixed'?snapshot(state.mixed):snapshot(state.ordinary);
  return '#w='+LZString.compressToEncodedURIComponent(JSON.stringify({v:2,mode,workspace:saved}));
}
export function decodeWorkspaceHash(hash:string):WorkspaceShare|null {
  try {
    if (!hash || hash.length>1000000) return null;
    if (!hash.startsWith('#w=')) {
      const input=decodeUrlHashToState(hash);
      return input?{mode:'mixed',workspace:{input,view:'schematic',customRecipes:input.recipe.isCustom?[input.recipe]:[],items:{}}}:null;
    }
    const json=LZString.decompressFromEncodedURIComponent(hash.slice(3));
    if (!json || json.length>8000000) return null;
    const value=JSON.parse(json);
    if (!isRecord(value) || value.v!==2 || !['mixed','ordinary'].includes(value.mode)) return null;
    const parsed=parseSnapshot(value.mode,value.workspace);
    return parsed?{mode:value.mode,workspace:parsed} as WorkspaceShare:null;
  } catch { return null; }
}
