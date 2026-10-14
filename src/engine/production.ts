// The package exposes CommonJS Solve but ships no TypeScript declarations.
// @ts-ignore -- external solver is narrowed at the call boundary below.
import solver from 'javascript-lp-solver';
import { DSP_RECIPES, DSP_ITEMS, DSP_FACILITIES, isFacilityCompatible, getRecipeMultipliers } from '../data/dspData';
import type { DSPRecipe, DSPFacility } from '../data/dspData';

export interface ProductionInput {
  targets: { itemId: string; ratePerMinute: number }[];
  externalSupplies: { itemId: string; limitPerMinute?: number }[];
  recipeSelection: Record<string, string>;
  recipeSettings: Record<string, { facilityId?: string; proliferatorTier?: 0 | 1 | 2 | 3; proliferatorMode?: 'none' | 'speed' | 'output' }>;
  beltTier: 1 | 2 | 3;
  beltStackLayers: number;
}
export interface ProductionStep {
  recipe: DSPRecipe; facility: DSPFacility; cyclesPerSecond: number; machines: number; machinesRounded: number; powerMW: number;
  inputs: { itemId: string; ratePerMinute: number }[]; outputs: { itemId: string; ratePerMinute: number }[];
}
export interface ProductionResult {
  status: 'ok' | 'infeasible' | 'invalid'; error?: string; steps: ProductionStep[];
  supplies: { itemId: string; ratePerMinute: number }[]; surplus: { itemId: string; ratePerMinute: number }[];
  totalPowerMW: number; totalMachines: number;
}
export function createDefaultProductionInput(): ProductionInput {
  return { targets: [{ itemId: '6001', ratePerMinute: 60 }], externalSupplies: [], recipeSelection: {}, recipeSettings: {}, beltTier: 3, beltStackLayers: 4 };
}
const EPS = 1e-7;
const failure = (status: 'invalid' | 'infeasible', error: string): ProductionResult => ({ status, error, steps: [], supplies: [], surplus: [], totalPowerMW: 0, totalMachines: 0 });

/** Stable ordinary-mode policy, independent of mixed-mode display ordering.
 * Standard low-ID recipes precede recycling/self-consuming variants and special logistics recipes.
 * A chosen recipe is returned verbatim so unsupported explicit choices fail visibly in calculation.
 */
export function chooseProductionRecipe(itemId: string, recipes: DSPRecipe[] = DSP_RECIPES, selection: Record<string,string> = {}): DSPRecipe | undefined {
  if (selection[itemId]) return recipes.find(r=>r.id===selection[itemId] && r.outputs.some(o=>o.itemId===itemId));
  if (DSP_ITEMS[itemId]?.category === 'raw') return undefined;
  return recipes.filter(r=>r.outputs.some(o=>o.itemId===itemId) && DSP_FACILITIES.some(f=>isFacilityCompatible(r,f)))
    .sort((a,b)=> {
      const recycling = (r:DSPRecipe) => Number(r.inputs.some(i=>r.outputs.some(o=>o.itemId===i.itemId)));
      return recycling(a)-recycling(b) || (a.numericId ?? Number.MAX_SAFE_INTEGER)-(b.numericId ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id);
    })[0];
}

/** Steady-state balances. External caps and recipe cycles are solved together, never recursively approximated. */
export function calculateProduction(input: ProductionInput, recipes: DSPRecipe[] = DSP_RECIPES): ProductionResult {
  try {
    if (!input || !Array.isArray(input.targets) || !Array.isArray(input.externalSupplies) || !input.recipeSelection || !input.recipeSettings) throw Error('Invalid production configuration');
    if (![1,2,3].includes(input.beltTier) || !Number.isInteger(input.beltStackLayers) || input.beltStackLayers < 1 || input.beltStackLayers > 4) throw Error('Invalid belt configuration');
    const demand = new Map<string, number>();
    for (const t of input.targets) {
      if (!t.itemId || !Number.isFinite(t.ratePerMinute) || t.ratePerMinute < 0) throw Error('Target rates must be finite and nonnegative');
      demand.set(t.itemId, (demand.get(t.itemId) ?? 0) + t.ratePerMinute / 60);
    }
    const external = new Map<string, number | undefined>();
    for (const s of input.externalSupplies) {
      if (!s.itemId || external.has(s.itemId) || (s.limitPerMinute !== undefined && (!Number.isFinite(s.limitPerMinute) || s.limitPerMinute < 0))) throw Error('Supply limits must be finite and nonnegative; supply items must be unique');
      external.set(s.itemId, s.limitPerMinute === undefined ? undefined : s.limitPerMinute / 60);
    }
    const byId = new Map(recipes.map(r => [r.id, r]));
    for (const [itemId, id] of Object.entries(input.recipeSelection)) if (!byId.get(id)?.outputs.some(o => o.itemId === itemId)) throw Error(`Invalid recipe selection for ${itemId}`);
    const needed = new Set<string>();
    const visited = new Set<string>();
    const selected = new Map<string, DSPRecipe>();
    const implicit = new Set<string>();
    const visit = (itemId: string) => {
      if (visited.has(itemId)) return;
      visited.add(itemId);
      needed.add(itemId);
      // Explicit supply is a pathway boundary, including capped supply. A cap failure is reported.
      if (external.has(itemId)) return;
      const producer = chooseProductionRecipe(itemId, recipes, input.recipeSelection);
      if (!producer) { implicit.add(itemId); return; }
      selected.set(producer.id, producer);
      for (const material of producer.inputs) visit(material.itemId);
      for (const material of producer.outputs) needed.add(material.itemId);
    };
    for (const [id, rate] of demand) if (rate > 0) visit(id);
    const constraints: Record<string, { min?: number; max?: number }> = {};
    const variables: Record<string, Record<string, number>> = {};
    const itemKeys = new Map([...needed].map((id, index) => [id, `m${index}`]));
    for (const [id, key] of itemKeys) constraints[key] = { min: demand.get(id) ?? 0 };
    const details = new Map<string, { recipe: DSPRecipe; facility: DSPFacility; speed: number; output: number; power: number }>();
    let index = 0;
    for (const recipe of selected.values()) {
      if (!(recipe.craftTime > 0) || !Number.isFinite(recipe.craftTime) || !recipe.outputs.length || [...recipe.inputs,...recipe.outputs].some(m => !m.itemId || !Number.isFinite(m.count) || m.count <= 0)) throw Error(`Invalid recipe ${recipe.id}`);
      const setting = input.recipeSettings[recipe.id] ?? {};
      const tier = setting.proliferatorTier ?? 0, mode = setting.proliferatorMode ?? 'none';
      if (![0,1,2,3].includes(tier) || !['none','speed','output'].includes(mode)) throw Error(`Invalid spray setting for ${recipe.id}`);
      const facility = setting.facilityId ? DSP_FACILITIES.find(f => f.id === setting.facilityId) : DSP_FACILITIES.find(f => isFacilityCompatible(recipe,f));
      if (!facility || !isFacilityCompatible(recipe,facility)) throw Error(`Incompatible facility for ${recipe.id}`);
      const mult = getRecipeMultipliers(recipe,tier,mode);
      const key = `r${index++}`;
      const coefficients: Record<string,number> = { cost: recipe.craftTime / (facility.speedMultiplier * mult.speed) + 1e-6 };
      for (const m of recipe.inputs) coefficients[itemKeys.get(m.itemId)!] = (coefficients[itemKeys.get(m.itemId)!] ?? 0) - m.count;
      for (const m of recipe.outputs) coefficients[itemKeys.get(m.itemId)!] = (coefficients[itemKeys.get(m.itemId)!] ?? 0) + m.count * mult.output;
      variables[key] = coefficients; details.set(key,{recipe,facility,...mult});
    }
    const supplyKeys = new Map<string,string>();
    for (const id of new Set([...implicit,...external.keys()].filter(id => needed.has(id)))) {
      const key = `s${index++}`; supplyKeys.set(key,id);
      variables[key] = { cost: 1e-5, [itemKeys.get(id)!]: 1 };
      const cap = external.get(id);
      if (cap !== undefined) { constraints[`cap${key}`] = {max:cap}; variables[key][`cap${key}`] = 1; }
    }
    if (!Object.keys(variables).length) return {status:'ok',steps:[],supplies:[],surplus:[],totalPowerMW:0,totalMachines:0};
    const solution = solver.Solve({ optimize:'cost',opType:'min',constraints,variables }) as Record<string,number> & {feasible:boolean;bounded:boolean};
    if (!solution.feasible || !solution.bounded) return failure('infeasible','Selected production pathways and supply limits cannot meet these targets');
    for (const [key, constraint] of Object.entries(constraints)) {
      const value = Object.entries(variables).reduce((sum,[v,c])=>sum+(solution[v] ?? 0)*(c[key] ?? 0),0);
      const tolerance = EPS * Math.max(1,Math.abs(value),Math.abs(constraint.min ?? constraint.max ?? 0));
      if ((constraint.min !== undefined && value < constraint.min-tolerance) || (constraint.max !== undefined && value > constraint.max+tolerance)) return failure('infeasible','Solver could not satisfy material balances within tolerance');
    }
    const steps: ProductionStep[] = [];
    for (const [key,d] of details) {
      const cyclesPerSecond = solution[key] ?? 0;
      if (cyclesPerSecond <= EPS) continue;
      const machines = cyclesPerSecond * d.recipe.craftTime / (d.facility.speedMultiplier*d.speed);
      steps.push({recipe:d.recipe,facility:d.facility,cyclesPerSecond,machines,machinesRounded:Math.ceil(machines-EPS),powerMW:machines*d.facility.powerMW*d.power,inputs:d.recipe.inputs.map(m=>({itemId:m.itemId,ratePerMinute:m.count*cyclesPerSecond*60})),outputs:d.recipe.outputs.map(m=>({itemId:m.itemId,ratePerMinute:m.count*d.output*cyclesPerSecond*60}))});
    }
    const supplies = [...supplyKeys].filter(([key])=>(solution[key] ?? 0)>EPS).map(([key,itemId])=>({itemId,ratePerMinute:solution[key]*60}));
    const surplus = [...itemKeys].map(([itemId,key])=>({itemId,ratePerMinute:(Object.entries(variables).reduce((sum,[v,c])=>sum+(solution[v] ?? 0)*(c[key] ?? 0),0)-(demand.get(itemId) ?? 0))*60})).filter(m=>m.ratePerMinute>EPS);
    return {status:'ok',steps,supplies,surplus,totalMachines:steps.reduce((s,r)=>s+r.machinesRounded,0),totalPowerMW:steps.reduce((s,r)=>s+r.powerMW,0)};
  } catch (error) { return failure('invalid',error instanceof Error ? error.message : 'Invalid production configuration'); }
}
