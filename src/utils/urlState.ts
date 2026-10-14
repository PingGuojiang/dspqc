import LZString from 'lz-string';
import type { CalculationInput, ProliferatorMode } from '../engine/calculator';
import { DSP_RECIPES, DSP_FACILITIES, DSP_BELTS, isFacilityCompatible } from '../data/dspData';
import { isRecord, validRecipe, validateMixed } from './stateValidation';

export interface CompactState { r:string; f?:string; b?:number; l?:number; pt?:0|1|2|3; pm?:ProliferatorMode; rd?:number; tl?:boolean; sl?:number; sd?:number; fc?:number }

export function encodeStateToUrlHash(input:CalculationInput):string {
  return LZString.compressToEncodedURIComponent(JSON.stringify({v:2,input,customRecipes:input.recipe.isCustom?[input.recipe]:[]}));
}
export function decodeUrlHashToState(hash:string):CalculationInput|null {
  try {
    if (!hash || hash.length>1000000) return null;
    const decoded=LZString.decompressFromEncodedURIComponent(hash.replace(/^#/,'').replace(/^s=/,''));
    if (!decoded || decoded.length>4000000) return null;
    const value=JSON.parse(decoded);
    if (!isRecord(value)) return null;
    if (value.v===2) {
      if (!Array.isArray(value.customRecipes) || !value.customRecipes.every(validRecipe)) return null;
      return validateMixed(value.input,value.customRecipes);
    }
    if (value.v!==undefined) return null;
    const recipe=DSP_RECIPES.find(r=>r.id===value.r);
    if (!recipe) return null;
    const selected=DSP_FACILITIES.find(f=>f.id===value.f);
    const facility=selected && isFacilityCompatible(recipe,selected)?selected:DSP_FACILITIES.find(f=>isFacilityCompatible(recipe,f));
    return validateMixed({recipe,facility,belt:DSP_BELTS.find(b=>b.tier===(value.b??3)),beltStackLayers:value.l??1,sorterStackTechLevel:value.sl??4,isTechLocked:value.tl??false,proliferatorTier:value.pt??0,proliferatorMode:value.pm??'output',redundancyPercent:value.rd??100,preferredSorterDistance:value.sd??1,customFacilityCount:value.fc});
  } catch { return null; }
}
export function generateShareUrl(input:CalculationInput):string {
  return `${window.location.origin}${window.location.pathname}#s=${encodeStateToUrlHash(input)}`;
}
