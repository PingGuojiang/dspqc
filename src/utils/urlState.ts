/**
 * URL State Serialization & Compression Utilities
 * Inspired by FactorioLab's URL state encoding architecture.
 * Uses lz-string for high-ratio URL compression without backend storage.
 */

import LZString from 'lz-string';
import { CalculationInput, ProliferatorMode } from '../engine/calculator';
import { DSP_RECIPES, DSP_FACILITIES, DSP_BELTS, DSPRecipe, DSPFacility, DSPBelt } from '../data/dspData';

export interface CompactState {
  r: string;               // recipe ID
  f?: string;              // facility ID
  b?: number;              // belt tier: 1 | 2 | 3
  l?: number;              // belt stack layers: 1 | 2 | 3 | 4
  pt?: 0 | 1 | 2 | 3;      // proliferator tier
  pm?: ProliferatorMode;   // proliferator mode
  rd?: number;             // redundancy percent (e.g. 110)
  tl?: boolean;            // isTechLocked (true/false)
  sl?: number;             // sorter stack level (2, 4, 6, 8)
  sd?: number;             // preferred sorter distance (1, 2, 3)
  fc?: number;             // custom facility count
}

/**
 * Encodes a CalculationInput state into a compressed URL hash string.
 */
export function encodeStateToUrlHash(input: CalculationInput): string {
  try {
    const compact: CompactState = {
      r: input.recipe.id,
      f: input.facility.id,
      b: input.belt.tier,
      l: input.beltStackLayers,
      pt: input.proliferatorTier,
      pm: input.proliferatorMode,
      rd: input.redundancyPercent,
      tl: input.isTechLocked ? true : undefined,
      sl: input.sorterStackTechLevel !== 4 ? input.sorterStackTechLevel : undefined,
      sd: input.preferredSorterDistance !== 1 ? input.preferredSorterDistance : undefined,
      fc: input.customFacilityCount,
    };

    const jsonString = JSON.stringify(compact);
    const compressed = LZString.compressToEncodedURIComponent(jsonString);
    return compressed;
  } catch {
    return '';
  }
}

/**
 * Decodes a compressed URL hash string back into CalculationInput fields.
 */
export function decodeUrlHashToState(compressedHash: string): Partial<CalculationInput> | null {
  if (!compressedHash) return null;
  try {
    // Strip leading '#' or 's=' if present
    const cleanHash = compressedHash.replace(/^#/, '').replace(/^s=/, '');
    const jsonString = LZString.decompressFromEncodedURIComponent(cleanHash);
    if (!jsonString) return null;

    const compact: CompactState = JSON.parse(jsonString);

    // Resolve Recipe
    const resolvedRecipe = DSP_RECIPES.find(r => r.id === compact.r) || DSP_RECIPES[0];

    // Resolve Facility
    const resolvedFacility = compact.f 
      ? DSP_FACILITIES.find(f => f.id === compact.f) || DSP_FACILITIES[0]
      : DSP_FACILITIES.find(f => f.category === resolvedRecipe.facilityCategory) || DSP_FACILITIES[0];

    // Resolve Belt
    const resolvedBelt = compact.b 
      ? DSP_BELTS.find(b => b.tier === compact.b) || DSP_BELTS[2]
      : DSP_BELTS[2];

    const result: Partial<CalculationInput> = {
      recipe: resolvedRecipe,
      facility: resolvedFacility,
      belt: resolvedBelt,
      beltStackLayers: compact.l || 1,
      proliferatorTier: compact.pt !== undefined ? compact.pt : 0,
      proliferatorMode: compact.pm || 'output',
      redundancyPercent: compact.rd !== undefined ? compact.rd : 100,
      isTechLocked: !!compact.tl,
      sorterStackTechLevel: compact.sl || 4,
      preferredSorterDistance: compact.sd || 1,
      customFacilityCount: compact.fc,
    };

    return result;
  } catch {
    return null;
  }
}

/**
 * Generates the full shareable URL with compressed hash.
 */
export function generateShareUrl(input: CalculationInput): string {
  const hash = encodeStateToUrlHash(input);
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#s=${hash}`;
}
