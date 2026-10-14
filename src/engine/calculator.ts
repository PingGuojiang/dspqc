/**
 * DSP Mixed Belt Physics & Calculation Engine
 * Steady-state material calculation with explicit, simplified logistics assumptions.
 */

import { DSPRecipe, DSPFacility, DSPBelt, DSPSorter, DSP_SORTERS, DSP_BELTS, DSP_ITEMS, DSP_FACILITIES, DSPItem, isFacilityCompatible, getRecipeMultipliers } from '../data/dspData';

export type ProliferatorMode = 'output' | 'speed' | 'none';

export interface CalculationInput {
  recipe: DSPRecipe;
  facility: DSPFacility;
  belt: DSPBelt;
  beltStackLayers: number; // 1 to 4
  sorterStackTechLevel: number; // 1 to 8 (capacity per grab for White Sorter)
  isTechLocked: boolean; // legacy flag: white sorter simplified grab capacity limited to one
  proliferatorTier: 0 | 1 | 2 | 3;
  proliferatorMode: ProliferatorMode;
  redundancyPercent: number; // e.g. 110 for 110%
  customFacilityCount?: number; // User override of facility count
  preferredSorterDistance?: number; // 1, 2, or 3 grids
}

export interface MaterialFeedSpec {
  itemId: string;
  itemName: string;
  itemColor: string;
  itemSymbol: string;
  countPerCraft: number;
  feedRatePerFacility: number; // items / sec per facility
  totalFeedRateAllFacilities: number; // items / sec for entire line
  recommendedSorter: DSPSorter;
  recommendedDistance: number; // 1, 2, or 3
  sorterThroughput: number; // items / sec capacity of that sorter
  isBottleneck: boolean;
  bottleneckReason?: string;
}

export interface CapacityCheckAlert {
  isOverLimit: boolean;
  actualCount: number;
  maxLimit: number;
  excessCount: number;
  totalFeedDemand: number;
  beltCapacity: number;
  requiredBeltCapacity: number;
  currentLayers: number;
  currentBelt: DSPBelt;
  suggestedBelt?: DSPBelt;
  suggestedLayers?: number;
  canSolveWithLayers: boolean;
  canSolveWithBeltUpgrade: boolean;
  canSolveWithBoth: boolean;
  message: string;
  recommendations: string[];
}

export interface CalculationResult {
  theoreticalMaxFacilities: number;
  cargoRatePerFacilityTotal: number;
  outputs: {itemId:string;ratePerFacility:number;ratePerMinute:number;sorterThroughput:number;isBottleneck:boolean;isBeltOverloaded:boolean}[];
  beltCapacity: number; // items / sec
  totalRawPerCraft: number; // sum of raw materials in 1 craft cycle
  feedRatePerFacilityTotal: number; // total raw items / sec per facility
  maxFacilitiesLimit: number; // recommended input bandwidth limit with reserve
  actualFacilitiesCount: number; // Configured or recommended facility count
  totalFeedRateDemand: number; // actual total items / sec required
  beltLoadPercentage: number; // e.g. 85.5%
  isBeltOverloaded: boolean;
  interleavedPattern: string[]; // sequence of item IDs for mixed belt cycle
  materials: MaterialFeedSpec[];
  proliferatorEffectiveBonus: {
    mode: ProliferatorMode;
    speedBonus: number;
    outputBonus: number;
    powerIncrease: number;
    totalPowerMW: number;
  };
  bufferStorage: {
    recommendedItems: number;
    recommendedChests: number;
    residualReturnRate: number; // available input bandwidth; not measured return flow
  };
  warnings: string[];
  capacityAlert?: CapacityCheckAlert;
  advisorAlerts: SmartAdvisorItem[];
  beltSequenceInfo: BeltSequenceInfo;
  powerStats: PowerConsumptionStats;
  proliferatorComparison: {
    baselineTotalFeedDemand: number;
    currentTotalFeedDemand: number;
    demandDeltaPercent: number;
    baselineOutputPerMin: number;
    currentOutputPerMin: number;
    outputDeltaPercent: number;
    savingsNote: string;
  };
}

export interface PowerPoleRecommendation {
  poleId: string;
  poleName: string;
  category: 'tesla' | 'wireless' | 'satellite';
  recommendedCount: number;
  coverageRadiusM: number;
  note: string;
}

export interface PowerConsumptionStats {
  facilityPowerMW: number;
  sortersPowerMW: number;
  totalPowerMW: number;
  totalPowerKW: number;
  baselineFacilityPowerMW: number;
  proliferatorPowerMultiplier: number;
  powerIncreasePercent: number;
  sorterCountTotal: number;
  sorterBreakdown: {
    sorterName: string;
    count: number;
    powerKW: number;
  }[];
  powerPoles: {
    teslaPoles: number;
    wirelessPoles: number;
    satellitePoles: number;
    recommendedPoles: PowerPoleRecommendation[];
  };
  gridStressEvaluation: 'low' | 'moderate' | 'high' | 'extreme';
  generatorEquivalents: {
    windTurbines: number; // 0.3 MW each
    thermalPlants: number; // 2.16 MW each
    miniFusionPlants: number; // 15.0 MW each
    artificialStars: number; // 72.0 MW each
  };
}

export interface SmartAdvisorItem {
  id: string;
  level: 'critical' | 'warning' | 'info';
  category: 'sorter_bottleneck' | 'belt_overload' | 'pattern_clustering' | 'proliferator_impact' | 'deadlock_risk';
  title: string;
  message: string;
  suggestion: string;
  relatedItemId?: string;
}

export interface BeltSequenceStep {
  itemId: string;
  itemName: string;
  itemColor: string;
  itemSymbol: string;
  stepIndex: number;
}

export interface BeltSequenceInfo {
  steps: BeltSequenceStep[];
  cycleLength: number;
  itemBreakdown: {
    itemId: string;
    itemName: string;
    itemColor: string;
    itemSymbol: string;
    count: number;
    ratioPercent: number;
  }[];
  gcdDivisor: number;
}

/**
 * Calculates sorter throughput with distance decay and stack technology.
 * 黄爪 Mk.I: 1.5 trips/s
 * 绿爪 Mk.II: 3.0 trips/s
 * 蓝爪 Mk.III: 6.0 trips/s
 * 白爪 Mk.IV: 6.0 trips/s * stack
 * Distance decay: throughput = (baseTripsPerSec * stack) / distanceGrids
 */
export function getSorterThroughput(
  sorter: DSPSorter,
  distanceGrids: number,
  sorterStackCapacity: number,
  isTechLocked: boolean
): number {
  const distance = Math.max(1, Math.min(3, distanceGrids));
  let stack = 1;

  if (sorter.tier === 4) {
    stack = sorterStackCapacity;
    stack = isTechLocked ? 1 : Math.max(1, Math.min(8, sorterStackCapacity));
  }

  return (sorter.baseTripsPerSec * stack) / distance;
}

/**
 * Bresenham-style even interleaving algorithm for mixed-belt items.
 * Produces an illustrative ratio, without guaranteeing local availability.
 */
export function normalizeRecipeInputs(inputs: {itemId:string;count:number}[]): {inputs:{itemId:string;count:number}[];divisor:number} {
  if (!Array.isArray(inputs) || !inputs.length) throw new Error('序列需要物料');
  const scale = 1_000_000;
  const merged = new Map<string,number>();
  for (const item of inputs) {
    if (!item || typeof item.itemId !== 'string' || !item.itemId.trim() || !Number.isFinite(item.count) || item.count <= 0) throw new Error('无效序列物料');
    const scaled = item.count * scale;
    const integer = Math.round(scaled);
    if (!Number.isSafeInteger(integer) || integer <= 0 || Math.abs(scaled - integer) > Math.max(1e-8,Math.abs(scaled)*Number.EPSILON*4)) throw new Error('物料数量精度最多六位小数');
    const sum = (merged.get(item.itemId) || 0) + integer;
    if (!Number.isSafeInteger(sum)) throw new Error('物料数量超出精度范围');
    merged.set(item.itemId,sum);
  }
  const gcd = (a:number,b:number):number => b === 0 ? a : gcd(b,a % b);
  const values = [...merged.values()];
  const divisor = values.reduce((a,b)=>gcd(a,b));
  const normalized = [...merged].map(([itemId,count])=>({itemId,count:count/divisor}));
  if (normalized.reduce((sum,i)=>sum+i.count,0) > 10000) throw new Error('混带比例周期过长');
  return {inputs:normalized,divisor:divisor/scale};
}

export function supportsMixedRecipe(recipe: DSPRecipe): boolean {
  try {
    if (!recipe || recipe.facilityCategory === 'special' || !Number.isFinite(recipe.craftTime) || recipe.craftTime <= 0 || !Array.isArray(recipe.outputs) || !recipe.outputs.length || recipe.outputs.some(i=>!i || typeof i.itemId !== 'string' || !i.itemId.trim() || !Number.isFinite(i.count) || i.count <= 0) || !DSP_FACILITIES.some(f=>isFacilityCompatible(recipe,f))) return false;
    normalizeRecipeInputs(recipe.inputs);
    return true;
  } catch { return false; }
}

export function generateInterleavedPattern(inputs: { itemId: string; count: number }[]): string[] {
  if (!inputs.length) return [];
  inputs = normalizeRecipeInputs(inputs).inputs;
  const normalizedTotal = inputs.reduce((sum, item) => sum + item.count, 0);
  const pattern: string[] = [];
  const accumulators = inputs.map(() => 0);

  for (let step = 0; step < normalizedTotal; step++) {
    let bestIndex = 0;
    let maxVal = -1;

    for (let i = 0; i < inputs.length; i++) {
      accumulators[i] += inputs[i].count;
      if (accumulators[i] > maxVal) {
        maxVal = accumulators[i];
        bestIndex = i;
      }
    }

    pattern.push(inputs[bestIndex].itemId);
    accumulators[bestIndex] -= normalizedTotal;
  }

  return pattern;
}

/**
 * Main Calculator Engine implementing PRD 2.2 and the reviewed DSP formulas.
 */
export function calculateDSPMixedBelt(input: CalculationInput, items: Record<string,DSPItem> = DSP_ITEMS): CalculationResult {
  const {
    recipe,
    facility,
    belt,
    beltStackLayers,
    sorterStackTechLevel,
    isTechLocked,
    proliferatorTier,
    proliferatorMode,
    redundancyPercent,
    customFacilityCount,
    preferredSorterDistance = 1,
  } = input;

  const warnings: string[] = [];

  if (!isFacilityCompatible(recipe,facility)) throw new Error('配方与建筑不兼容');
  if (!supportsMixedRecipe(recipe)) throw new Error('无效生产配方');
  if (!Number.isInteger(beltStackLayers) || beltStackLayers < 1 || beltStackLayers > 4 || !Number.isFinite(belt.baseSpeed) || belt.baseSpeed <= 0 || !Number.isFinite(facility.speedMultiplier) || facility.speedMultiplier <= 0 || !Number.isFinite(redundancyPercent) || redundancyPercent < 100 || (customFacilityCount !== undefined && (!Number.isSafeInteger(customFacilityCount) || customFacilityCount < 0))) throw new Error('无效生产参数');
  const multipliers = getRecipeMultipliers(recipe,proliferatorTier,proliferatorMode);
  const speedBonus = multipliers.speed - 1;
  const outputBonus = multipliers.output - 1;
  warnings.push('物流为统一实际堆叠高度下的稳态估算；白爪吞吐、缓冲与回流需按版本和布局实测。');
  // Effective facility speed factor
  // In speed mode, facility speed increases by (1 + speedBonus)
  const effectiveFacilitySpeed = facility.speedMultiplier * (1 + speedBonus);

  // 2. Belt Capacity
  // belt_capacity = baseSpeed * stack_layers (e.g. 30 * 4 = 120 items/s)
  const beltCapacity = belt.baseSpeed * beltStackLayers;

  // 3. Raw Materials Sum per Craft Cycle
  const totalRawPerCraft = recipe.inputs.reduce((sum, item) => sum + item.count, 0);

  // 4. Feed Rate per Facility (PRD formula)
  // Item consumption is independent of cargo stacking and technology.
  const feedRatePerFacilityTotal = (totalRawPerCraft * effectiveFacilitySpeed) / (recipe.craftTime);

  // 5. Max Facilities Calculation (PRD formula)
  // max_facilities = (belt_capacity * production_time) / (effectiveFacilitySpeed * total_raw_materials)
  // Incorporate redundancy margin: (redundancyPercent / 100)
  const safetyMultiplier = Math.max(1, redundancyPercent / 100);
  const effectiveBeltForLength = beltCapacity / safetyMultiplier;

  let maxFacilitiesLimit = Math.floor(
    (effectiveBeltForLength * recipe.craftTime) / (effectiveFacilitySpeed * totalRawPerCraft)
  );
  const theoreticalMaxFacilities = Math.floor(beltCapacity / feedRatePerFacilityTotal);

  // Determine actual facilities count
  const actualFacilitiesCount = customFacilityCount !== undefined
    ? customFacilityCount
    : maxFacilitiesLimit;

  // Total Demand
  const totalFeedRateDemand = feedRatePerFacilityTotal * actualFacilitiesCount;
  const beltLoadPercentage = ((totalFeedRateDemand / beltCapacity) * 100);
  const isBeltOverloaded = totalFeedRateDemand > beltCapacity;

  if (isBeltOverloaded) {
    warnings.push(`整线进料需求 (${totalFeedRateDemand.toFixed(1)} /s) 超过传送带最大运力 (${beltCapacity} /s)，无法维持所有设备满速运行。`);
  }

  // 6. Material Breakdown & Sorter Recommender
  const sortersList = DSP_SORTERS;
  const normalizedInputs = normalizeRecipeInputs(recipe.inputs);
  const mergedInputs = [...new Set(recipe.inputs.map(i=>i.itemId))].map(itemId=>({itemId,count:recipe.inputs.filter(i=>i.itemId===itemId).reduce((sum,i)=>sum+i.count,0)}));
  const materials: MaterialFeedSpec[] = mergedInputs.map(inputItem => {
    const itemData = items[inputItem.itemId] || {
      id: inputItem.itemId,
      name: inputItem.itemId,
      category: 'component',
      color: '#94a3b8',
      iconSymbol: 'Item',
    };

    // Consumption rate per facility for this material
    const ratePerFacility = (inputItem.count * effectiveFacilitySpeed) / (recipe.craftTime);
    const totalRateAll = ratePerFacility * actualFacilitiesCount;

    // Sorter recommendation: find most suitable tier
    // Test from lowest to highest tier at preferred distance
    let recommendedSorter = sortersList[0];
    let recommendedDist = preferredSorterDistance;
    let chosenThroughput = getSorterThroughput(recommendedSorter, recommendedDist, sorterStackTechLevel, isTechLocked);
    let isBottleneck = false;
    let bottleneckReason: string | undefined = undefined;

    let satisfied = false;
    for (const s of sortersList) {
      const throughput = getSorterThroughput(s, recommendedDist, sorterStackTechLevel, isTechLocked);
      if (throughput >= ratePerFacility) {
        recommendedSorter = s;
        chosenThroughput = throughput;
        satisfied = true;
        break;
      }
    }

    if (!satisfied) {
      // If preferred distance cannot satisfy, try closer distance (distance 1)
      if (recommendedDist > 1) {
        for (const s of sortersList) {
          const throughput = getSorterThroughput(s, 1, sorterStackTechLevel, isTechLocked);
          if (throughput >= ratePerFacility) {
            recommendedSorter = s;
            recommendedDist = 1;
            chosenThroughput = throughput;
            satisfied = true;
            break;
          }
        }
      }
    }

    if (!satisfied) {
      // Even white sorter at distance 1 cannot satisfy single sorter feed!
      recommendedSorter = sortersList[3]; // White sorter
      recommendedDist = 1;
      chosenThroughput = getSorterThroughput(recommendedSorter, 1, sorterStackTechLevel, isTechLocked);
      isBottleneck = true;
      bottleneckReason = `单爪抓取速率最高 ${chosenThroughput.toFixed(1)}/s，无法满足 ${ratePerFacility.toFixed(1)}/s 消耗！需并联 2~3 爪或降级倍速。`;
      warnings.push(`原料【${itemData.name}】抓取严重不足：单台设施需 ${ratePerFacility.toFixed(1)}/s，建议采用双爪并联进料。`);
    }

    return {
      itemId: inputItem.itemId,
      itemName: itemData.name,
      itemColor: itemData.color,
      itemSymbol: itemData.iconSymbol,
      countPerCraft: inputItem.count,
      feedRatePerFacility: ratePerFacility,
      totalFeedRateAllFacilities: totalRateAll,
      recommendedSorter,
      recommendedDistance: recommendedDist,
      sorterThroughput: chosenThroughput,
      isBottleneck,
      bottleneckReason,
    };
  });

  // 7. Interleaved Material Sequence & Breakdown
  const interleavedPattern = generateInterleavedPattern(recipe.inputs);
  
  const gcdDivisor = normalizedInputs.divisor;

  const beltSequenceSteps: BeltSequenceStep[] = interleavedPattern.map((itemId, idx) => {
    const itemData = items[itemId] || { name: itemId, color: '#38bdf8', iconSymbol: itemId.slice(0, 2) };
    return {
      itemId,
      itemName: itemData.name,
      itemColor: itemData.color,
      itemSymbol: itemData.iconSymbol,
      stepIndex: idx + 1,
    };
  });

  const itemBreakdown = normalizedInputs.inputs.map(inp => {
    const itemData = items[inp.itemId] || { name: inp.itemId, color: '#38bdf8', iconSymbol: inp.itemId.slice(0, 2) };
    const countInCycle = inp.count;
    const ratioPercent = (inp.count / interleavedPattern.length) * 100;
    return {
      itemId: inp.itemId,
      itemName: itemData.name,
      itemColor: itemData.color,
      itemSymbol: itemData.iconSymbol,
      count: countInCycle,
      ratioPercent,
    };
  });

  const beltSequenceInfo: BeltSequenceInfo = {
    steps: beltSequenceSteps,
    cycleLength: interleavedPattern.length,
    itemBreakdown,
    gcdDivisor,
  };

  // 8. Power Consumption & Grid Analysis
  const singleFacilityBasePowerMW = facility.powerMW;
  const proliferatorPowerIncrease = multipliers.power - 1;
  const singleFacilityPowerMW = singleFacilityBasePowerMW * (1 + proliferatorPowerIncrease);
  const facilityPowerMW = (singleFacilityPowerMW * actualFacilitiesCount);
  const baselineFacilityPowerMW = (singleFacilityBasePowerMW * actualFacilitiesCount);

  // Sorters power calculation: each facility has 1 sorter per material input + 1 output sorter
  // Sorter work power and idle power
  let totalSorterPowerKW = 0;
  let totalSorterCount = 0;
  const sorterBreakdownMap: Record<string, { sorterName: string; count: number; powerKW: number }> = {};

  for (const mat of materials) {
    const s = mat.recommendedSorter;
    const sorterCountForMat = actualFacilitiesCount;
    const kwPerSorter = s.workPowerKW || 36;
    const kwTotal = sorterCountForMat * kwPerSorter;
    totalSorterPowerKW += kwTotal;
    totalSorterCount += sorterCountForMat;

    if (!sorterBreakdownMap[s.name]) {
      sorterBreakdownMap[s.name] = { sorterName: s.name, count: 0, powerKW: 0 };
    }
    sorterBreakdownMap[s.name].count += sorterCountForMat;
    sorterBreakdownMap[s.name].powerKW += kwTotal;
  }

  const outputs = recipe.outputs.map(output => {
    const ratePerFacility = output.count * effectiveFacilitySpeed / recipe.craftTime * multipliers.output;
    const sorter = DSP_SORTERS.find(s=>getSorterThroughput(s,1,sorterStackTechLevel,isTechLocked) >= ratePerFacility) || DSP_SORTERS[3];
    const throughput = getSorterThroughput(sorter,1,sorterStackTechLevel,isTechLocked);
    const totalRate = ratePerFacility * actualFacilitiesCount;
    const isBottleneck = throughput < ratePerFacility;
    const isOutputBeltOverloaded = totalRate > beltCapacity;
    if (isBottleneck || isOutputBeltOverloaded) warnings.push(`产物【${items[output.itemId]?.name || output.itemId}】输出能力不足；请检查独立输出爪与输出带。`);
    const count = actualFacilitiesCount;
    const powerKW = count * (sorter.workPowerKW || 36);
    totalSorterCount += count;
    totalSorterPowerKW += powerKW;
    if (!sorterBreakdownMap[sorter.name]) sorterBreakdownMap[sorter.name] = {sorterName:sorter.name,count:0,powerKW:0};
    sorterBreakdownMap[sorter.name].count += count;
    sorterBreakdownMap[sorter.name].powerKW += powerKW;
    return {itemId:output.itemId,ratePerFacility,ratePerMinute:totalRate*60,sorterThroughput:throughput,isBottleneck,isBeltOverloaded:isOutputBeltOverloaded};
  });

  const sortersPowerMW = (totalSorterPowerKW / 1000);
  const totalPowerMW = (facilityPowerMW + sortersPowerMW);
  const totalPowerKW = Math.round(totalPowerMW * 1000);

  // Power Poles Estimation:
  // Typical DSP factory footprint:
  // An assembler is ~3x3 grids (approx 3m spacing). A line of N assemblers is ~3N meters long.
  // Tesla tower: supply radius ~10m (diameter ~20m, covers ~6 assemblers linear).
  // Wireless tower: supply radius ~16m (diameter ~32m, covers ~10 assemblers linear).
  // Satellite substation: supply radius ~26.5m (covers ~18 assemblers or dual-sided 36 assemblers).
  const teslaPoles = Math.ceil(actualFacilitiesCount / 6);
  const wirelessPoles = Math.ceil(actualFacilitiesCount / 10);
  const satellitePoles = Math.ceil(actualFacilitiesCount / 24);

  const recommendedPoles: PowerPoleRecommendation[] = [
    {
      poleId: 'pole_tesla',
      poleName: '电力感应塔 (小电线杆)',
      category: 'tesla',
      recommendedCount: teslaPoles,
      coverageRadiusM: 10,
      note: `供电半宽10m，建议每隔 5~6 台制造台沿带侧插置 1 根（共需约 ${teslaPoles} 根）。`,
    },
    {
      poleId: 'pole_wireless',
      poleName: '无线输电塔',
      category: 'wireless',
      recommendedCount: wirelessPoles,
      coverageRadiusM: 16,
      note: `供电半宽16m并支持机甲无线充电，整列建议布局 ${wirelessPoles} 根。`,
    },
    {
      poleId: 'pole_satellite',
      poleName: '卫星配电站',
      category: 'satellite',
      recommendedCount: satellitePoles,
      coverageRadiusM: 26.5,
      note: `超大范围26.5m，单站即可覆盖 ${Math.min(actualFacilitiesCount, 24)} 台设备，推荐 ${satellitePoles} 座。`,
    },
  ];

  // Grid Stress Evaluation
  let gridStressEvaluation: 'low' | 'moderate' | 'high' | 'extreme' = 'low';
  if (totalPowerMW > 50) gridStressEvaluation = 'extreme';
  else if (totalPowerMW > 20) gridStressEvaluation = 'high';
  else if (totalPowerMW > 5) gridStressEvaluation = 'moderate';

  const powerStats: PowerConsumptionStats = {
    facilityPowerMW,
    sortersPowerMW,
    totalPowerMW,
    totalPowerKW,
    baselineFacilityPowerMW,
    proliferatorPowerMultiplier: 1 + proliferatorPowerIncrease,
    powerIncreasePercent: Math.round(proliferatorPowerIncrease * 100),
    sorterCountTotal: totalSorterCount,
    sorterBreakdown: Object.values(sorterBreakdownMap),
    powerPoles: {
      teslaPoles,
      wirelessPoles,
      satellitePoles,
      recommendedPoles,
    },
    gridStressEvaluation,
    generatorEquivalents: {
      windTurbines: Math.ceil(totalPowerMW / 0.3),
      thermalPlants: Math.ceil(totalPowerMW / 2.16),
      miniFusionPlants: Math.ceil(totalPowerMW / 15.0),
      artificialStars: Math.ceil(totalPowerMW / 72.0),
    },
  };

  // 9. Buffer Storage & Loopback Sizing
  const residualReturnRate = Math.max(0, beltCapacity - totalFeedRateDemand);
  const loopTransitSeconds = Math.max(6, actualFacilitiesCount * 0.8);
  const recommendedBufferItems = Math.ceil(beltCapacity * loopTransitSeconds * (safetyMultiplier - 1) + 60);
  const recommendedChests = Math.max(1, Math.ceil(recommendedBufferItems / 600));

  // 10. Proliferator Baseline Comparison
  const baselineFeedRatePerFacility = (totalRawPerCraft / recipe.craftTime) * facility.speedMultiplier;
  const baselineTotalFeedDemand = (baselineFeedRatePerFacility * actualFacilitiesCount);
  const baseOutputPerCraft = recipe.outputs[0]?.count || 1;
  const baselineOutputPerMin = ((baseOutputPerCraft * (facility.speedMultiplier / recipe.craftTime) * 60) * actualFacilitiesCount);
  const currentOutputPerMin = (baselineOutputPerMin * (1 + (proliferatorMode === 'speed' ? speedBonus : proliferatorMode === 'output' ? outputBonus : 0)));
  const demandDeltaPercent = baselineTotalFeedDemand > 0 
    ? (((totalFeedRateDemand - baselineTotalFeedDemand) / baselineTotalFeedDemand) * 100)
    : 0;
  const outputDeltaPercent = baselineOutputPerMin > 0
    ? (((currentOutputPerMin - baselineOutputPerMin) / baselineOutputPerMin) * 100)
    : 0;
  
  let savingsNote = '未喷涂增产剂：标准基准进料与产出。';
  if (proliferatorTier > 0) {
    if (proliferatorMode === 'output') {
      const savedPercent = Math.round((outputBonus / (1 + outputBonus)) * 100);
      savingsNote = `额外产出模式：固定目标产量时单位产品原料消耗降低 ~${savedPercent}%，；固定设备数的进料不变。`;
    } else if (proliferatorMode === 'speed') {
      savingsNote = `额外速度模式：单台产速激增 +${Math.round(speedBonus * 100)}%，混带输入需求提高（${totalFeedRateDemand.toFixed(1)}/s）！`;
    }
  }

  // 11. Smart Advisor & Expert Strategy Warnings
  const advisorAlerts: SmartAdvisorItem[] = [];

  // Check sorter distance & throughput bottlenecks
  for (const mat of materials) {
    if (mat.isBottleneck) {
      advisorAlerts.push({
        id: `sorter-bottleneck-${mat.itemId}`,
        level: 'critical',
        category: 'sorter_bottleneck',
        title: `原料【${mat.itemName}】抓取严重不足`,
        message: `当前单台进料速度已达 ${mat.feedRatePerFacility}/s，${mat.recommendedSorter.colorName}跨${mat.recommendedDistance}格（理论最高仅 ${mat.sorterThroughput}/s）无法满足需求，可能无法持续满速！`,
        suggestion: `强烈建议将分拣器间距缩短为跨1格，或升级为集装分拣器（白爪），或采用双爪并联进料。`,
        relatedItemId: mat.itemId,
      });
    } else if (mat.recommendedDistance >= 2 && mat.feedRatePerFacility > 4.5 && mat.recommendedSorter.tier < 4) {
      advisorAlerts.push({
        id: `sorter-decay-${mat.itemId}`,
        level: 'warning',
        category: 'sorter_bottleneck',
        title: `【${mat.itemName}】分拣器跨距衰减预警`,
        message: `当前进料速度已达 ${mat.feedRatePerFacility}/s，${mat.recommendedSorter.colorName}跨${mat.recommendedDistance}格（${mat.sorterThroughput}/s）裕量不足 20%，制造台加速或局部小卡将导致断续停机。`,
        suggestion: `建议改为紧凑贴带（跨1格）或升级为集装白爪，避免长臂分拣器行程摆动延迟。`,
        relatedItemId: mat.itemId,
      });
    }
  }

  // Check White Sorter stack tech potential
  const usesWhiteSorter = materials.some(m => m.recommendedSorter.tier === 4);
  if (usesWhiteSorter && sorterStackTechLevel < 6) {
    advisorAlerts.push({
      id: 'white-sorter-stack-tech',
      level: 'info',
      category: 'sorter_bottleneck',
      title: '集装分拣器（白爪）抓取阶梯可进一步释放',
      message: `当前白爪设定为单次抓取 ${sorterStackTechLevel} 个。此参数是简化装载假设，实际能力还取决于装卸升级与货物状态。`,
      suggestion: `请在对应游戏版本验证装卸、跨距和堆叠条件，不能视作无限吞吐。`,
    });
  }

  // Check belt load & deadlock safety margin
  if (beltLoadPercentage > 90) {
    advisorAlerts.push({
      id: 'belt-near-saturation',
      level: 'critical',
      category: 'deadlock_risk',
      title: '混带总载荷极限（防死锁容错极低）',
      message: `当前混带负载率已达 ${beltLoadPercentage.toFixed(1)}%，闭环回流裕量低于 10%！一旦下游某台机器抓取延迟，未被消耗的原料可能占满回流口，可能造成阻塞。`,
      suggestion: `强烈建议将负载率控制在 80%~85% 以内，或通过自动集装机升级为高层堆叠带。`,
    });
  } else if (beltLoadPercentage > 80) {
    advisorAlerts.push({
      id: 'belt-high-load',
      level: 'warning',
      category: 'deadlock_risk',
      title: '闭环混带高负荷运行预警',
      message: `负载率为 ${beltLoadPercentage.toFixed(1)}%，处于高位运行区间。建议检查回流优先级、补料控制和暂存容量。`,
      suggestion: `在入料口使用四向分流器（回流线设为优先输入），防止新原料堵死旧物料回流通道。`,
    });
  }

  // Check material ratio skew and pattern clustering
  if (recipe.inputs.length >= 2) {
    const counts = recipe.inputs.map(i => i.count);
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    if (maxCount / minCount >= 3) {
      advisorAlerts.push({
        id: 'pattern-skew',
        level: 'info',
        category: 'pattern_clustering',
        title: '原料消耗比例悬殊（防局部饥饿提醒）',
        message: `配方中最大物料与最小物料比例达 ${maxCount}:${minCount}。若原料成团入带，末端制造台可能长时间抓不到稀有原料而停工。`,
        suggestion: `请参考下方的【入带序列可视化图】，按 ${interleavedPattern.length} 格周期严格交错入料，减少局部断料风险，仍需实测。`,
      });
    }
  }

  // Proliferator impact advisor
  if (speedBonus > 0 && (beltLoadPercentage > 75 || materials.some(m => m.feedRatePerFacility > 10))) {
    advisorAlerts.push({
      id: 'proliferator-speed-stress',
      level: 'warning',
      category: 'proliferator_impact',
      title: '增产剂【额外速度】加剧混带运力瓶颈',
      message: `当前有效增产剂加速 (+${Math.round(speedBonus * 100)}%)，单台原料吞吐需求成倍增加（总需求达 ${totalFeedRateDemand.toFixed(1)}/s）。`,
      suggestion: `若运力紧张或分拣器抓取吃力，切换为【额外产出】在固定目标产量时可降低原料需求；固定设备数进料不变。`,
    });
  }

  // 12. Closed-Loop Payload & Anti-Deadlock Capacity Verification Logic
  const isOverLimit = actualFacilitiesCount > maxFacilitiesLimit || isBeltOverloaded;
  const excessCount = Math.max(0, actualFacilitiesCount - maxFacilitiesLimit);
  const requiredBeltCapacity = (totalFeedRateDemand * safetyMultiplier);

  let capacityAlert: CapacityCheckAlert | undefined = undefined;

  if (isOverLimit) {
    const higherBelts = DSP_BELTS.filter(b => b.tier > belt.tier);
    const suggestedBelt = higherBelts.find(b => b.baseSpeed * beltStackLayers >= requiredBeltCapacity);
    const neededLayers = Math.ceil(requiredBeltCapacity / belt.baseSpeed);
    const suggestedLayers = neededLayers > beltStackLayers && neededLayers <= 4 ? neededLayers : undefined;

    let comboBelt: DSPBelt | undefined = undefined;
    let comboLayers: number | undefined = undefined;
    if (!suggestedBelt && !suggestedLayers) {
      for (const b of higherBelts) {
        const lyr = Math.ceil(requiredBeltCapacity / b.baseSpeed);
        if (lyr <= 4) {
          comboBelt = b;
          comboLayers = lyr;
          break;
        }
      }
    }

    const recommendations: string[] = [];
    if (suggestedLayers) {
      recommendations.push(`提升堆叠层数：通过自动集装机将带上堆叠由 ${beltStackLayers} 层提升至 ${suggestedLayers} 层（单带运力提升至 ${belt.baseSpeed * suggestedLayers} items/s）。`);
    }
    if (suggestedBelt) {
      recommendations.push(`升级传送带等级：由【${belt.name.split(' ')[0]}】升级为【${suggestedBelt.name}】（单带运力提升至 ${suggestedBelt.baseSpeed * beltStackLayers} items/s）。`);
    } else if (comboBelt && comboLayers) {
      recommendations.push(`复合扩容升级：将传送带升级为【${comboBelt.name}】并将堆叠层数提升至 ${comboLayers} 层（单带运力达 ${comboBelt.baseSpeed * comboLayers} items/s）。`);
    } else if (!suggestedBelt && !suggestedLayers) {
      const loopsNeeded = Math.ceil(requiredBeltCapacity / (30 * 4));
      recommendations.push(`拆分并联产线：计入需求容量倍率后 (${requiredBeltCapacity.toFixed(1)}/s) 超过极速蓝带 4 层堆叠运力 (120/s)，建议拆分为 ${loopsNeeded} 条独立的并联混带回路。`);
    }
    recommendations.push(`按 ${redundancyPercent}% 需求容量倍率规划：建议不超过 ${maxFacilitiesLimit} 台；未取整时对应约 ${((1 - 1 / safetyMultiplier) * 100).toFixed(1)}% 入口带宽余量，当前可用入口带宽为 ${Math.max(0, beltCapacity - totalFeedRateDemand).toFixed(1)} 件/秒；这不保证回流容量。`);

    capacityAlert = {
      isOverLimit: true,
      actualCount: actualFacilitiesCount,
      maxLimit: maxFacilitiesLimit,
      excessCount,
      totalFeedDemand: totalFeedRateDemand,
      beltCapacity,
      requiredBeltCapacity,
      currentLayers: beltStackLayers,
      currentBelt: belt,
      suggestedBelt: suggestedBelt || comboBelt,
      suggestedLayers: suggestedLayers || comboLayers,
      canSolveWithLayers: Boolean(suggestedLayers),
      canSolveWithBeltUpgrade: Boolean(suggestedBelt),
      canSolveWithBoth: Boolean(comboBelt && comboLayers),
      message: `所需设施数 (${actualFacilitiesCount} 台) 超过当前混带回路在入口带宽建议上限 (${maxFacilitiesLimit} 台)，超出 ${excessCount} 台！`,
      recommendations,
    };
  }

  return {
    theoreticalMaxFacilities,
    cargoRatePerFacilityTotal: feedRatePerFacilityTotal / beltStackLayers,
    outputs,
    beltCapacity,
    totalRawPerCraft,
    feedRatePerFacilityTotal: feedRatePerFacilityTotal,
    maxFacilitiesLimit,
    actualFacilitiesCount,
    totalFeedRateDemand: totalFeedRateDemand,
    beltLoadPercentage,
    isBeltOverloaded,
    interleavedPattern,
    beltSequenceInfo,
    materials,
    proliferatorEffectiveBonus: {
      mode: proliferatorMode,
      speedBonus,
      outputBonus,
      powerIncrease: proliferatorPowerIncrease,
      totalPowerMW,
    },
    proliferatorComparison: {
      baselineTotalFeedDemand,
      currentTotalFeedDemand: totalFeedRateDemand,
      demandDeltaPercent,
      baselineOutputPerMin,
      currentOutputPerMin,
      outputDeltaPercent,
      savingsNote,
    },
    bufferStorage: {
      recommendedItems: recommendedBufferItems,
      recommendedChests,
      residualReturnRate: residualReturnRate,
    },
    warnings,
    capacityAlert,
    advisorAlerts,
    powerStats,
  };
}
