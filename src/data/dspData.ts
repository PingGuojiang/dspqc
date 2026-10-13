/**
 * DSP Data Dictionary & Specifications
 * Full underlying game data sourced from DSPCalculator/dsp-calc (Vanilla.json: 174 items, 238 recipes)
 * Supports official item IDs, names, icons (/dsp_icons/*.png), and mod extensibility.
 */

import vanillaData from './dsp_vanilla.json';

export type FacilityCategory = 'assembler' | 'smelter' | 'chemical' | 'refinery' | 'lab' | 'collider';

export interface DSPItem {
  id: string; // Numeric ID (e.g. "1001") or legacy slug
  numericId?: number;
  name: string;
  category: 'raw' | 'component' | 'matrix' | 'fuel' | 'building' | 'other';
  color: string;
  iconName?: string;
  iconUrl?: string;
  iconSymbol: string;
  gridIndex?: number;
}

export type MachineSubcategory = 'craft' | 'logistics' | 'power' | 'production' | 'defense';

export interface DSPRecipe {
  id: string; // Numeric recipe ID or custom ID
  numericId?: number;
  name: string;
  craftTime: number; // in seconds (TimeSpend / 60)
  facilityCategory: FacilityCategory;
  inputs: { itemId: string; count: number }[];
  outputs: { itemId: string; count: number }[];
  iconName?: string;
  iconUrl?: string;
  description?: string;
  isCustom?: boolean;
  isPreset?: boolean;
  isMachine?: boolean;
  machineSubcategory?: MachineSubcategory;
}

export interface DSPFacility {
  id: string;
  numericId?: number;
  name: string;
  category: FacilityCategory;
  speedMultiplier: number;
  powerMW: number;
  color: string;
  iconName?: string;
}

export interface DSPBelt {
  tier: 1 | 2 | 3;
  name: string;
  baseSpeed: number; // items / sec
  color: string;
  iconName?: string;
}


export interface ProliferatorConfig {
  tier: 0 | 1 | 2 | 3;
  name: string;
  color: string;
  extraOutputBonus: number;
  extraSpeedBonus: number;
  powerConsumptionIncrease: number;
  iconName?: string;
}

export const DSP_FACILITIES: DSPFacility[] = [
  // Assemblers
  { id: 'assembler_1', numericId: 2301, name: '制造台 Mk.I', category: 'assembler', speedMultiplier: 0.75, powerMW: 0.27, color: '#38bdf8', iconName: 'assembler-1' },
  { id: 'assembler_2', numericId: 2303, name: '制造台 Mk.II', category: 'assembler', speedMultiplier: 1.0, powerMW: 0.54, color: '#22c55e', iconName: 'assembler-2' },
  { id: 'assembler_3', numericId: 2304, name: '制造台 Mk.III', category: 'assembler', speedMultiplier: 1.5, powerMW: 1.08, color: '#6366f1', iconName: 'assembler-3' },
  { id: 'assembler_recompose', numericId: 2318, name: '重组式制造台', category: 'assembler', speedMultiplier: 3.0, powerMW: 2.7, color: '#ec4899', iconName: 'reassembler' },

  // Smelters
  { id: 'smelter_1', numericId: 2302, name: '电弧熔炉 (Mk.I)', category: 'smelter', speedMultiplier: 1.0, powerMW: 0.36, color: '#f59e0b', iconName: 'smelter' },
  { id: 'smelter_plane', numericId: 2315, name: '位面熔炉 (Mk.II)', category: 'smelter', speedMultiplier: 2.0, powerMW: 1.44, color: '#06b6d4', iconName: 'smelter-2' },
  { id: 'smelter_negentropy', numericId: 2319, name: '负熵熔炉 (Mk.III)', category: 'smelter', speedMultiplier: 3.0, powerMW: 2.88, color: '#a855f7', iconName: 'negentropy' },

  // Labs
  { id: 'lab_1', numericId: 2314, name: '矩阵研究站 (Mk.I)', category: 'lab', speedMultiplier: 1.0, powerMW: 0.48, color: '#3b82f6', iconName: 'lab' },
  { id: 'lab_self_evolution', numericId: 2317, name: '自化矩阵研究站', category: 'lab', speedMultiplier: 3.0, powerMW: 1.92, color: '#ec4899', iconName: 'lab-2' },

  // Chemical & Refinery
  { id: 'chemical_1', numericId: 2305, name: '化工厂', category: 'chemical', speedMultiplier: 1.0, powerMW: 0.72, color: '#10b981', iconName: 'chemical-plant' },
  { id: 'chemical_quantum', numericId: 2316, name: '量子化工厂', category: 'chemical', speedMultiplier: 2.0, powerMW: 2.16, color: '#8b5cf6', iconName: 'chemical-plant-2' },
  { id: 'refinery_1', numericId: 2308, name: '原油精炼厂', category: 'refinery', speedMultiplier: 1.0, powerMW: 0.96, color: '#64748b', iconName: 'oil-refinery' },

  // Collider
  { id: 'collider_1', numericId: 2310, name: '微型粒子对撞机', category: 'collider', speedMultiplier: 1.0, powerMW: 12.0, color: '#f43f5e', iconName: 'hadron-collider' },
];

export interface DSPSorter {
  tier: 1 | 2 | 3 | 4;
  name: string;
  colorName: string;
  hexColor: string;
  baseTripsPerSec: number;
  baseStack: number;
  idlePowerKW?: number;
  workPowerKW?: number;
  iconName?: string;
}

export interface DSPPowerPole {
  id: string;
  name: string;
  supplyRadiusM: number; // e.g. 10m, 16m, 24m
  connectDistanceM: number; // e.g. 24m, 44m, 60m
  category: 'tesla' | 'wireless' | 'satellite';
  color: string;
  iconName?: string;
}

export const DSP_POWER_POLES: DSPPowerPole[] = [
  { id: 'pole_tesla', name: '电力感应塔 (小电线杆)', supplyRadiusM: 10, connectDistanceM: 24, category: 'tesla', color: '#38bdf8', iconName: 'tesla-coil' },
  { id: 'pole_wireless', name: '无线输电塔', supplyRadiusM: 16, connectDistanceM: 44, category: 'wireless', color: '#22c55e', iconName: 'charging-pole' },
  { id: 'pole_satellite', name: '卫星配电站', supplyRadiusM: 26.5, connectDistanceM: 60, category: 'satellite', color: '#a855f7', iconName: 'orbital-substation' },
];

export const DSP_BELTS: DSPBelt[] = [
  { tier: 1, name: '传送带 Mk.I (黄带)', baseSpeed: 6.0, color: '#eab308', iconName: 'belt-1' },
  { tier: 2, name: '高速传送带 Mk.II (绿带)', baseSpeed: 12.0, color: '#22c55e', iconName: 'belt-2' },
  { tier: 3, name: '极速传送带 Mk.III (蓝带)', baseSpeed: 30.0, color: '#0ea5e9', iconName: 'belt-3' },
];

export const DSP_SORTERS: DSPSorter[] = [
  { tier: 1, name: '分拣器 Mk.I', colorName: '黄爪', hexColor: '#eab308', baseTripsPerSec: 1.5, baseStack: 1, idlePowerKW: 2, workPowerKW: 18, iconName: 'inserter-1' },
  { tier: 2, name: '分拣器 Mk.II', colorName: '绿爪', hexColor: '#22c55e', baseTripsPerSec: 3.0, baseStack: 1, idlePowerKW: 2, workPowerKW: 36, iconName: 'inserter-2' },
  { tier: 3, name: '分拣器 Mk.III', colorName: '蓝爪', hexColor: '#3b82f6', baseTripsPerSec: 6.0, baseStack: 1, idlePowerKW: 2, workPowerKW: 72, iconName: 'inserter-3' },
  { tier: 4, name: '集装分拣器 Mk.IV', colorName: '白爪', hexColor: '#f8fafc', baseTripsPerSec: 6.0, baseStack: 4, idlePowerKW: 2, workPowerKW: 90, iconName: 'inserter-4' },
];

export const PROLIFERATOR_CONFIGS: ProliferatorConfig[] = [
  { tier: 0, name: '未喷涂 (无增产)', color: '#64748b', extraOutputBonus: 0, extraSpeedBonus: 0, powerConsumptionIncrease: 0 },
  { tier: 1, name: '增产剂 Mk.I (蓝喷)', color: '#38bdf8', extraOutputBonus: 0.125, extraSpeedBonus: 0.25, powerConsumptionIncrease: 0.30, iconName: 'accelerator-1' },
  { tier: 2, name: '增产剂 Mk.II (绿喷)', color: '#22c55e', extraOutputBonus: 0.20, extraSpeedBonus: 0.50, powerConsumptionIncrease: 0.70, iconName: 'accelerator-2' },
  { tier: 3, name: '增产剂 Mk.III (青喷)', color: '#00f0ff', extraOutputBonus: 0.25, extraSpeedBonus: 1.00, powerConsumptionIncrease: 1.50, iconName: 'accelerator-3' },
];

// Helper to determine item color and category
function determineItemVisuals(id: number, name: string): { color: string; category: DSPItem['category']; symbol: string } {
  // Matrices
  if (id === 6001) return { color: '#38bdf8', category: 'matrix', symbol: '蓝糖' };
  if (id === 6002) return { color: '#ef4444', category: 'matrix', symbol: '红糖' };
  if (id === 6003) return { color: '#eab308', category: 'matrix', symbol: '黄糖' };
  if (id === 6004) return { color: '#a855f7', category: 'matrix', symbol: '紫糖' };
  if (id === 6005) return { color: '#22c55e', category: 'matrix', symbol: '绿糖' };
  if (id === 6006) return { color: '#f8fafc', category: 'matrix', symbol: '白糖' };

  // Raw ores
  if (id === 1001) return { color: '#94a3b8', category: 'raw', symbol: '铁矿' };
  if (id === 1002) return { color: '#f97316', category: 'raw', symbol: '铜矿' };
  if (id === 1003) return { color: '#e2e8f0', category: 'raw', symbol: '硅石' };
  if (id === 1004) return { color: '#cbd5e1', category: 'raw', symbol: '钛矿' };
  if (id === 1005) return { color: '#a8a29e', category: 'raw', symbol: '石矿' };
  if (id === 1006) return { color: '#334155', category: 'raw', symbol: '煤矿' };
  if (id === 1007) return { color: '#1e293b', category: 'raw', symbol: '原油' };

  // Fuels / Fluids
  if (id === 1120 || id === 1401) return { color: '#ec4899', category: 'fuel', symbol: '氢' };
  if (id === 1121 || id === 1402) return { color: '#06b6d4', category: 'fuel', symbol: '重氢' };
  if (id === 1122 || id === 1403) return { color: '#f43f5e', category: 'fuel', symbol: '反物质' };
  if (id >= 1801 && id <= 1803) return { color: '#38bdf8', category: 'fuel', symbol: '燃料棒' };

  // High-frequency components
  if (id === 1101) return { color: '#64748b', category: 'component', symbol: '铁块' };
  if (id === 1104) return { color: '#ea580c', category: 'component', symbol: '铜块' };
  if (id === 1111) return { color: '#22c55e', category: 'component', symbol: '电路板' };
  if (id === 1112) return { color: '#94a3b8', category: 'component', symbol: '齿轮' };
  if (id === 1113) return { color: '#38bdf8', category: 'component', symbol: '磁线圈' };
  if (id === 1114) return { color: '#14b8a6', category: 'component', symbol: '电动机' };
  if (id === 1115) return { color: '#06b6d4', category: 'component', symbol: '微轮' };
  if (id === 1116) return { color: '#6366f1', category: 'component', symbol: '磁场环' };
  if (id === 1118) return { color: '#10b981', category: 'component', symbol: '芯片' };
  if (id === 1119) return { color: '#8b5cf6', category: 'component', symbol: '量子' };
  if (id === 1126) return { color: '#ef4444', category: 'component', symbol: '火箭' };
  if (id === 1125) return { color: '#f97316', category: 'component', symbol: '构件' };

  // Buildings & Facilities (2000-3999 building IDs, 5001-5003 logistics vehicles)
  if ((id >= 2000 && id < 4000) || (id >= 5001 && id <= 5003)) {
    return { color: '#475569', category: 'building', symbol: name.slice(0, 2) };
  }

  return { color: '#38bdf8', category: 'component', symbol: name.slice(0, 2) };
}

// Convert Factories to category
function determineFacilityCategory(factories?: number[]): FacilityCategory {
  if (!factories || factories.length === 0) return 'assembler';
  const f = factories[0];
  if (f === 2302 || f === 2315 || f === 2319) return 'smelter';
  if (f === 2305 || f === 2309 || f === 2316) return 'chemical';
  if (f === 2308) return 'refinery';
  if (f === 2314 || f === 2317) return 'lab';
  if (f === 2310) return 'collider';
  return 'assembler';
}

// Build items dictionary from Vanilla.json
export const DSP_ITEMS: Record<string, DSPItem> = {};

const rawItems = (vanillaData as any).items || {};
for (const key of Object.keys(rawItems)) {
  const item = rawItems[key];
  const idStr = String(item.ID);
  const visuals = determineItemVisuals(item.ID, item.Name);
  
  const dspItem: DSPItem = {
    id: idStr,
    numericId: item.ID,
    name: item.Name,
    category: visuals.category,
    color: visuals.color,
    iconName: item.IconName,
    iconUrl: item.IconName ? `/dsp_icons/${item.IconName}.png` : undefined,
    iconSymbol: visuals.symbol,
    gridIndex: item.GridIndex,
  };

  DSP_ITEMS[idStr] = dspItem;
  // Also register by item name for flexible lookup
  DSP_ITEMS[item.Name] = dspItem;
}

// Build recipes from Vanilla.json
const rawRecipes = (vanillaData as any).recipes || {};
export const DSP_RECIPES: DSPRecipe[] = [];

// Check if a recipe produces a machine / facility / building
export function isMachineRecipe(recipe: {
  name: string;
  outputs?: { itemId: string; count: number }[];
  isMachine?: boolean;
}): boolean {
  if (recipe.name.startsWith('[充电]')) return false;
  if (recipe.isMachine !== undefined) return recipe.isMachine;
  const primaryOut = recipe.outputs?.[0];
  if (primaryOut) {
    const item = DSP_ITEMS[primaryOut.itemId];
    if (item && item.category === 'building') return true;
    const numId = Number(primaryOut.itemId);
    if (!isNaN(numId)) {
      if ((numId >= 2000 && numId < 4000) || (numId >= 5001 && numId <= 5003)) return true;
    }
  }
  return /制造台|制造器|熔炉|采矿|抽水|化工|精炼|对撞|分拣|传送带|储物|仓|储液|发电|输电|电塔|电线杆|枢纽|接收站|弹射|发射井|分流|集装|喷涂|分馏|运输站|运输机|运输船|机枪塔|激光塔|加农炮|电浆|导弹|护盾|基站|研究站|恒星/.test(recipe.name);
}

// Get sub-classification for machine recipes to facilitate user selection
export function getMachineSubcategory(recipe: { name: string }): MachineSubcategory {
  const name = recipe.name;
  if (/制造台|制造器|熔炉|采矿机|抽水站|原油萃取/.test(name)) return 'craft';
  if (/传送带|分拣器|分流器|集装机|物流|配送|运输|储物|仓|储液|监测器/.test(name)) return 'logistics';
  if (/发电|涡轮机|太阳能|蓄电|枢纽|恒星|电线杆|感应塔|输电塔|配电站|射线接收/.test(name)) return 'power';
  if (/化工厂|精炼厂|对撞机|分馏塔|喷涂机|研究站/.test(name)) return 'production';
  if (/炮|塔|防御|护盾|基站|弹射器|发射井|采集器/.test(name)) return 'defense';
  return 'craft';
}

// Priority presets list for quick access (including high-frequency machines & items)
const priorityRecipeNames = [
  '制造台',
  '电弧熔炉',
  '采矿机',
  '分拣器',
  '传送带',
  '电磁矩阵',
  '电路板',
  '电动机',
  '处理器',
  '电磁微轮',
  '超级磁场环',
  '量子芯片',
  '小型运载火箭',
  '微型聚变燃料棒',
  '戴森球构件',
  '引力透镜',
  '宇宙矩阵',
  '微晶元件',
  '钛合金',
  '粒子宽带',
  '能量矩阵',
  '结构矩阵',
  '信息矩阵',
  '引力矩阵',
];

for (const key of Object.keys(rawRecipes)) {
  const r = rawRecipes[key];
  // Filter only craftable recipes that have inputs and outputs
  if (!r.Items || r.Items.length === 0 || !r.Results || r.Results.length === 0) {
    continue;
  }

  const inputs = r.Items.map((itemId: number, idx: number) => ({
    itemId: String(itemId),
    count: r.ItemCounts[idx] || 1,
  }));

  const outputs = r.Results.map((resultId: number, idx: number) => ({
    itemId: String(resultId),
    count: r.ResultCounts[idx] || 1,
  }));

  const craftTime = Number(((r.TimeSpend || 60) / 60).toFixed(2));
  const facilityCategory = determineFacilityCategory(r.Factories);
  const isPreset = priorityRecipeNames.some(pName => r.Name.includes(pName));

  const isMachine = isMachineRecipe({
    name: r.Name,
    outputs,
  });
  const machineSubcategory = isMachine ? getMachineSubcategory({ name: r.Name }) : undefined;

  DSP_RECIPES.push({
    id: `recipe_${r.ID}`,
    numericId: r.ID,
    name: r.Name,
    craftTime,
    facilityCategory,
    inputs,
    outputs,
    iconName: r.IconName,
    iconUrl: r.IconName ? `/dsp_icons/${r.IconName}.png` : undefined,
    description: `官方配方 ID: ${r.ID} · 周期: ${craftTime}s · 产物: ${outputs.map((o: { itemId: string; count: number }) => DSP_ITEMS[o.itemId]?.name || o.itemId).join(', ')}`,
    isPreset,
    isMachine,
    machineSubcategory,
  });
}

// Sort recipes: preset recipes first, then by number of inputs (descending, for mixed belt priority), then by name
DSP_RECIPES.sort((a, b) => {
  if (a.isPreset && !b.isPreset) return -1;
  if (!a.isPreset && b.isPreset) return 1;
  if (b.inputs.length !== a.inputs.length) return b.inputs.length - a.inputs.length;
  return a.name.localeCompare(b.name, 'zh-Hans-CN');
});

/**
 * Extensible Game Data Importer (PRD 2.1)
 * Imports custom or mod data matching DSPCalculator/dsp-calc format (e.g. GenesisBook).
 */
export function importCustomGameData(gameDataJson: any): number {
  if (!gameDataJson || !gameDataJson.recipes) return 0;
  let count = 0;

  if (gameDataJson.items) {
    for (const key of Object.keys(gameDataJson.items)) {
      const it = gameDataJson.items[key];
      const idStr = String(it.ID);
      const visuals = determineItemVisuals(it.ID, it.Name);
      DSP_ITEMS[idStr] = {
        id: idStr,
        numericId: it.ID,
        name: it.Name,
        category: visuals.category,
        color: visuals.color,
        iconName: it.IconName,
        iconUrl: it.IconName ? `/dsp_icons/${it.IconName}.png` : undefined,
        iconSymbol: visuals.symbol,
      };
    }
  }

  for (const key of Object.keys(gameDataJson.recipes)) {
    const r = gameDataJson.recipes[key];
    if (!r.Items || !r.Results) continue;
    const inputs = r.Items.map((itemId: number, idx: number) => ({
      itemId: String(itemId),
      count: r.ItemCounts[idx] || 1,
    }));
    const outputs = r.Results.map((resultId: number, idx: number) => ({
      itemId: String(resultId),
      count: r.ResultCounts[idx] || 1,
    }));
    const craftTime = Number(((r.TimeSpend || 60) / 60).toFixed(2));
    const facilityCat = determineFacilityCategory(r.Factories);

    DSP_RECIPES.unshift({
      id: `imported_${r.ID}_${Date.now()}`,
      numericId: r.ID,
      name: `[MOD] ${r.Name}`,
      craftTime,
      facilityCategory: facilityCat,
      inputs,
      outputs,
      iconName: r.IconName,
      iconUrl: r.IconName ? `/dsp_icons/${r.IconName}.png` : undefined,
      description: `导入扩展配方 · 周期 ${craftTime}s`,
      isCustom: true,
      isPreset: true,
    });
    count++;
  }

  return count;
}
