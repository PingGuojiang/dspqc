import { DSP_BELTS, DSP_FACILITIES, DSP_RECIPES, isFacilityCompatible, type DSPRecipe, type DSPItem } from '../data/dspData';
import type { CalculationInput } from '../engine/calculator';
import { supportsMixedRecipe } from '../engine/calculator';
import type { ProductionInput } from '../engine/production';

export const isRecord = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
export const inRange = (n: unknown, min: number, max: number) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
const integer = (n: unknown, min: number, max: number) => inRange(n,min,max) && Number.isInteger(n);
const modeValid = (m: unknown) => ['none','speed','output'].includes(m as string);
const validIcons = (v: Record<string, any>) => (v.iconUrl === undefined || typeof v.iconUrl === 'string') && (v.iconName === undefined || typeof v.iconName === 'string');
export function validRecipe(value: unknown): value is DSPRecipe {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id || typeof value.name !== 'string' || !inRange(value.craftTime, 1e-8, 1e8)) return false;
  if (value.facilityCategory!=='special' && !DSP_FACILITIES.some(f=>f.category===value.facilityCategory)) return false;
  const validEntries = (entries: any) => Array.isArray(entries) && entries.length>0 && entries.length<=64 && entries.every(e=>isRecord(e) && typeof e.itemId==='string' && e.itemId.length>0 && inRange(e.count,1e-8,1e8));
  if (!validEntries(value.inputs) || !validEntries(value.outputs)) return false;
  if (!validIcons(value)) return false;
  if (value.supportsSpeed !== undefined && typeof value.supportsSpeed !== 'boolean') return false;
  if (value.supportsOutput !== undefined && typeof value.supportsOutput !== 'boolean') return false;
  if (value.proliferator !== undefined && !integer(value.proliferator,0,7)) return false;
  if (value.allowedFacilityIds !== undefined && (!Array.isArray(value.allowedFacilityIds) || !value.allowedFacilityIds.every((id:any)=>typeof id==='string'))) return false;
  return true;
}
export function validItems(value: unknown): value is Record<string,DSPItem> {
  return isRecord(value) && Object.keys(value).length<=4000 && Object.entries(value).every(([id,item])=>isRecord(item) && item.id===id && typeof item.name==='string' && typeof item.color==='string' && /^#[0-9a-f]{3,8}$/i.test(item.color) && typeof item.iconSymbol==='string' && validIcons(item));
}
export function validateMixed(value: unknown, customRecipes: DSPRecipe[] = []): CalculationInput | null {
  if (!isRecord(value) || !isRecord(value.recipe) || !isRecord(value.facility) || !isRecord(value.belt)) return null;
  const recipe=[...customRecipes,...DSP_RECIPES].find(r=>r.id===value.recipe.id);
  const facility=DSP_FACILITIES.find(f=>f.id===value.facility.id);
  const belt=DSP_BELTS.find(b=>b.tier===value.belt.tier);
  if (!recipe || !facility || !belt || !supportsMixedRecipe(recipe) || !isFacilityCompatible(recipe,facility)) return null;
  if (!integer(value.beltStackLayers,1,4) || !integer(value.sorterStackTechLevel,1,8) || typeof value.isTechLocked!=='boolean' || !integer(value.proliferatorTier,0,3) || !modeValid(value.proliferatorMode) || !inRange(value.redundancyPercent,100,300)) return null;
  if (value.customFacilityCount!==undefined && !integer(value.customFacilityCount,0,1000000)) return null;
  if (value.preferredSorterDistance!==undefined && !integer(value.preferredSorterDistance,1,3)) return null;
  return {recipe,facility,belt,beltStackLayers:value.beltStackLayers,sorterStackTechLevel:value.sorterStackTechLevel,isTechLocked:value.isTechLocked,proliferatorTier:value.proliferatorTier,proliferatorMode:value.proliferatorMode,redundancyPercent:value.redundancyPercent,customFacilityCount:value.customFacilityCount,preferredSorterDistance:value.preferredSorterDistance??1};
}
export function validProduction(value: unknown): value is ProductionInput {
  if (!isRecord(value) || !Array.isArray(value.targets) || value.targets.length>100 || !Array.isArray(value.externalSupplies) || value.externalSupplies.length>4000 || !isRecord(value.recipeSelection) || !isRecord(value.recipeSettings)) return false;
  if (!value.targets.every((t:any)=>isRecord(t) && typeof t.itemId==='string' && t.itemId && inRange(t.ratePerMinute,0,1e12))) return false;
  if (!value.externalSupplies.every((s:any)=>isRecord(s) && typeof s.itemId==='string' && s.itemId && (s.limitPerMinute===undefined || inRange(s.limitPerMinute,0,1e12)))) return false;
  if (!Object.entries(value.recipeSelection).every(([id,r])=>id && typeof r==='string')) return false;
  if (!Object.values(value.recipeSettings).every(s=>isRecord(s) && (s.facilityId===undefined || typeof s.facilityId==='string') && (s.proliferatorTier===undefined || integer(s.proliferatorTier,0,3)) && (s.proliferatorMode===undefined || modeValid(s.proliferatorMode)))) return false;
  return integer(value.beltTier,1,3) && integer(value.beltStackLayers,1,4);
}
