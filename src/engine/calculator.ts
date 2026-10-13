/**
 * DSP Mixed Belt Physics & Calculation Engine
 * Strict implementation of DSP game formulas, Wiki decay tables, and PRD specifications.
 */

import { DSPRecipe, DSPFacility, DSPBelt, DSPSorter, DSP_SORTERS, DSP_BELTS, PROLIFERATOR_CONFIGS, DSP_ITEMS } from '../data/dspData';

export type ProliferatorMode = 'output' | 'speed' | 'none';

export interface CalculationInput {
  recipe: DSPRecipe;
  facility: DSPFacility;
  belt: DSPBelt;
  beltStackLayers: number; // 1 to 4
  sorterStackTechLevel: number; // 1 to 8 (capacity per grab for White Sorter)
  isTechLocked: boolean; // if true & no white sorter manual stack, throughput / 4
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
  beltCapacity: number; // items / sec
  totalRawPerCraft: number; // sum of raw materials in 1 craft cycle
  feedRatePerFacilityTotal: number; // total raw items / sec per facility
  maxFacilitiesLimit: number; // Theoretical max facilities on full belt
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
    residualReturnRate: number; // items/sec returning to inlet
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
    if (isTechLocked) {
      // Tech locked condition: without stack technology, instant throughput drops / 4
      stack = Math.max(1, stack * 0.25);
    }
  }

  return (sorter.baseTripsPerSec * stack) / distance;
}

/**
 * Bresenham-style even interleaving algorithm for mixed-belt items.
 * Guarantees smooth distribution so facilities receive all ingredients without clustering.
 */
export function generateInterleavedPattern(inputs: { itemId: string; count: number }[]): string[] {
  if (!inputs.length) return [];
  const totalItems = inputs.reduce((sum, item) => sum + item.count, 0);
  if (totalItems === 0) return [];
  if (totalItems > 64) {
    // For very high counts, normalize by GCD
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = inputs.reduce((acc, curr) => gcd(acc, curr.count), inputs[0].count);
    if (divisor > 1) {
      inputs = inputs.map(i => ({ ...i, count: i.count / divisor }));
    }
  }

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
export function calculateDSPMixedBelt(input: CalculationInput): CalculationResult {
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

  const proliferator = PROLIFERATOR_CONFIGS[proliferatorTier] || PROLIFERATOR_CONFIGS[0];
  const warnings: string[] = [];

  // 1. Proliferator Multipliers
  let speedBonus = 0;
  let outputBonus = 0;

  if (proliferatorTier > 0) {
    if (proliferatorMode === 'speed') {
      speedBonus = proliferator.extraSpeedBonus;
    } else if (proliferatorMode === 'output') {
      outputBonus = proliferator.extraOutputBonus;
    }
  }

  // Effective facility speed factor
  // In speed mode, facility speed increases by (1 + speedBonus)
  const effectiveFacilitySpeed = facility.speedMultiplier * (1 + speedBonus);

  // 2. Belt Capacity
  // belt_capacity = baseSpeed * stack_layers (e.g. 30 * 4 = 120 items/s)
  const beltCapacity = belt.baseSpeed * beltStackLayers;

  // 3. Raw Materials Sum per Craft Cycle
  const totalRawPerCraft = recipe.inputs.reduce((sum, item) => sum + item.count, 0);

  // 4. Feed Rate per Facility (PRD formula)
  // feed_rate = (total_raw_materials * facility_speed) / (production_time * stack_layers)
  // Special condition: if isTechLocked, throughput has 0.25 multiplier (divide by 4)
  const techDivisor = isTechLocked ? 4 : 1;
  const feedRatePerFacilityTotal = (totalRawPerCraft * effectiveFacilitySpeed) / (recipe.craftTime * techDivisor);

  // 5. Max Facilities Calculation (PRD formula)
  // max_facilities = (belt_capacity * production_time) / (effectiveFacilitySpeed * total_raw_materials)
  // Incorporate redundancy margin: (redundancyPercent / 100)
  const safetyMultiplier = Math.max(1, redundancyPercent / 100);
  const effectiveBeltForLength = beltCapacity / safetyMultiplier;

  let maxFacilitiesLimit = Math.floor(
    (effectiveBeltForLength * recipe.craftTime * techDivisor) / (effectiveFacilitySpeed * totalRawPerCraft)
  );
  if (maxFacilitiesLimit < 1) maxFacilitiesLimit = 1;

  // Determine actual facilities count
  const actualFacilitiesCount = customFacilityCount !== undefined && customFacilityCount > 0
    ? customFacilityCount
    : maxFacilitiesLimit;

  // Total Demand
  const totalFeedRateDemand = feedRatePerFacilityTotal * actualFacilitiesCount;
  const beltLoadPercentage = Number(((totalFeedRateDemand / beltCapacity) * 100).toFixed(1));
  const isBeltOverloaded = totalFeedRateDemand > beltCapacity;

  if (isBeltOverloaded) {
    warnings.push(`整线进料需求 (${totalFeedRateDemand.toFixed(1)} /s) 超过传送带最大运力 (${beltCapacity} /s)，将发生原料卡带与产线停滞！`);
  }

  // 6. Material Breakdown & Sorter Recommender
  const sortersList = DSP_SORTERS;
  const materials: MaterialFeedSpec[] = recipe.inputs.map(inputItem => {
    const itemData = DSP_ITEMS[inputItem.itemId] || {
      id: inputItem.itemId,
      name: inputItem.itemId,
      category: 'component',
      color: '#94a3b8',
      iconSymbol: 'Item',
    };

    // Consumption rate per facility for this material
    const ratePerFacility = (inputItem.count * effectiveFacilitySpeed) / (recipe.craftTime * techDivisor);
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
      feedRatePerFacility: Number(ratePerFacility.toFixed(2)),
      totalFeedRateAllFacilities: Number(totalRateAll.toFixed(2)),
      recommendedSorter,
      recommendedDistance: recommendedDist,
      sorterThroughput: Number(chosenThroughput.toFixed(2)),
      isBottleneck,
      bottleneckReason,
    };
  });

  // 7. Interleaved Material Sequence & Breakdown
  const interleavedPattern = generateInterleavedPattern(recipe.inputs);
  
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const gcdDivisor = recipe.inputs.length > 0 
    ? recipe.inputs.reduce((acc, curr) => gcd(acc, curr.count), recipe.inputs[0].count)
    : 1;

  const beltSequenceSteps: BeltSequenceStep[] = interleavedPattern.map((itemId, idx) => {
    const itemData = DSP_ITEMS[itemId] || { name: itemId, color: '#38bdf8', iconSymbol: itemId.slice(0, 2) };
    return {
      itemId,
      itemName: itemData.name,
      itemColor: itemData.color,
      itemSymbol: itemData.iconSymbol,
      stepIndex: idx + 1,
    };
  });

  const itemBreakdown = recipe.inputs.map(inp => {
    const itemData = DSP_ITEMS[inp.itemId] || { name: inp.itemId, color: '#38bdf8', iconSymbol: inp.itemId.slice(0, 2) };
    const countInCycle = Math.round(inp.count / (gcdDivisor > 0 ? gcdDivisor : 1));
    const ratioPercent = totalRawPerCraft > 0 ? Number(((inp.count / totalRawPerCraft) * 100).toFixed(1)) : 0;
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
  const proliferatorPowerIncrease = proliferatorTier > 0 ? proliferator.powerConsumptionIncrease : 0;
  const singleFacilityPowerMW = singleFacilityBasePowerMW * (1 + proliferatorPowerIncrease);
  const facilityPowerMW = Number((singleFacilityPowerMW * actualFacilitiesCount).toFixed(3));
  const baselineFacilityPowerMW = Number((singleFacilityBasePowerMW * actualFacilitiesCount).toFixed(3));

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

  // Plus 1 output sorter per facility (defaulting to Mk.II or Mk.III based on facility speed)
  const outputSorterName = facility.speedMultiplier >= 2 ? '分拣器 Mk.III' : '分拣器 Mk.II';
  const outputSorterKW = facility.speedMultiplier >= 2 ? 72 : 36;
  const outputSorterTotalKW = actualFacilitiesCount * outputSorterKW;
  totalSorterPowerKW += outputSorterTotalKW;
  totalSorterCount += actualFacilitiesCount;

  if (!sorterBreakdownMap[outputSorterName]) {
    sorterBreakdownMap[outputSorterName] = { sorterName: outputSorterName, count: 0, powerKW: 0 };
  }
  sorterBreakdownMap[outputSorterName].count += actualFacilitiesCount;
  sorterBreakdownMap[outputSorterName].powerKW += outputSorterTotalKW;

  const sortersPowerMW = Number((totalSorterPowerKW / 1000).toFixed(3));
  const totalPowerMW = Number((facilityPowerMW + sortersPowerMW).toFixed(2));
  const totalPowerKW = Math.round(totalPowerMW * 1000);

  // Power Poles Estimation:
  // Typical DSP factory footprint:
  // An assembler is ~3x3 grids (approx 3m spacing). A line of N assemblers is ~3N meters long.
  // Tesla tower: supply radius ~10m (diameter ~20m, covers ~6 assemblers linear).
  // Wireless tower: supply radius ~16m (diameter ~32m, covers ~10 assemblers linear).
  // Satellite substation: supply radius ~26.5m (covers ~18 assemblers or dual-sided 36 assemblers).
  const teslaPoles = Math.max(1, Math.ceil(actualFacilitiesCount / 6));
  const wirelessPoles = Math.max(1, Math.ceil(actualFacilitiesCount / 10));
  const satellitePoles = Math.max(1, Math.ceil(actualFacilitiesCount / 24));

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
      artificialStars: Math.max(1, Math.ceil(totalPowerMW / 72.0)),
    },
  };

  // 9. Buffer Storage & Loopback Sizing
  const residualReturnRate = Math.max(0, beltCapacity - totalFeedRateDemand);
  const loopTransitSeconds = Math.max(6, actualFacilitiesCount * 0.8);
  const recommendedBufferItems = Math.ceil(beltCapacity * loopTransitSeconds * (safetyMultiplier - 1) + 60);
  const recommendedChests = Math.max(1, Math.ceil(recommendedBufferItems / 600));

  // 10. Proliferator Baseline Comparison
  const baselineFeedRatePerFacility = (totalRawPerCraft / recipe.craftTime) * facility.speedMultiplier;
  const baselineTotalFeedDemand = Number((baselineFeedRatePerFacility * actualFacilitiesCount).toFixed(2));
  const baseOutputPerCraft = recipe.outputs[0]?.count || 1;
  const baselineOutputPerMin = Number(((baseOutputPerCraft * (facility.speedMultiplier / recipe.craftTime) * 60) * actualFacilitiesCount).toFixed(1));
  const currentOutputPerMin = Number((baselineOutputPerMin * (1 + (proliferatorMode === 'speed' ? speedBonus : proliferatorMode === 'output' ? outputBonus : 0))).toFixed(1));
  const demandDeltaPercent = baselineTotalFeedDemand > 0 
    ? Number((((totalFeedRateDemand - baselineTotalFeedDemand) / baselineTotalFeedDemand) * 100).toFixed(1))
    : 0;
  const outputDeltaPercent = baselineOutputPerMin > 0
    ? Number((((currentOutputPerMin - baselineOutputPerMin) / baselineOutputPerMin) * 100).toFixed(1))
    : 0;
  
  let savingsNote = '未喷涂增产剂：标准基准进料与产出。';
  if (proliferatorTier > 0) {
    if (proliferatorMode === 'output') {
      const savedPercent = Math.round((outputBonus / (1 + outputBonus)) * 100);
      savingsNote = `额外产出模式：单位产品原料消耗直降 ~${savedPercent}%，大幅减轻混带运力压力！`;
    } else if (proliferatorMode === 'speed') {
      savingsNote = `额外速度模式：单台产速激增 +${Math.round(speedBonus * 100)}%，混带输入压力翻倍（${totalFeedRateDemand.toFixed(1)}/s）！`;
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
        message: `当前单台进料速度已达 ${mat.feedRatePerFacility}/s，${mat.recommendedSorter.colorName}跨${mat.recommendedDistance}格（理论最高仅 ${mat.sorterThroughput}/s）无法满足需求，必定发生卡带断供！`,
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
      message: `当前白爪设定为单次抓取 ${sorterStackTechLevel} 个。在科技树解锁【集装分拣】后可提升至 6 或 8 连抓。`,
      suggestion: `抓取量提升至 8 后，跨2格仍有 24/s 瞬时通量，可大幅优化布线空间。`,
    });
  }

  // Check belt load & deadlock safety margin
  if (beltLoadPercentage > 90) {
    advisorAlerts.push({
      id: 'belt-near-saturation',
      level: 'critical',
      category: 'deadlock_risk',
      title: '混带总载荷极限（防死锁容错极低）',
      message: `当前混带负载率已达 ${beltLoadPercentage.toFixed(1)}%，闭环回流裕量低于 10%！一旦下游某台机器抓取延迟，未被消耗的原料将反涌塞满回流口，导致整线卡死。`,
      suggestion: `强烈建议将负载率控制在 80%~85% 以内，或通过自动集装机升级为高层堆叠带。`,
    });
  } else if (beltLoadPercentage > 80) {
    advisorAlerts.push({
      id: 'belt-high-load',
      level: 'warning',
      category: 'deadlock_risk',
      title: '闭环混带高负荷运行预警',
      message: `负载率为 ${beltLoadPercentage.toFixed(1)}%，处于高位运行区间。残料回流线必须配备 4~6 格暂存箱和防回涌优先级分流器。`,
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
        suggestion: `请参考下方的【入带序列可视化图】，按 ${interleavedPattern.length} 格周期严格交错入料，消除局部断料风险。`,
      });
    }
  }

  // Proliferator impact advisor
  if (proliferatorMode === 'speed' && (beltLoadPercentage > 75 || materials.some(m => m.feedRatePerFacility > 10))) {
    advisorAlerts.push({
      id: 'proliferator-speed-stress',
      level: 'warning',
      category: 'proliferator_impact',
      title: '增产剂【额外速度】加剧混带运力瓶颈',
      message: `当前涂覆增产剂加速 (+${Math.round(speedBonus * 100)}%)，单台原料吞吐需求成倍增加（总需求达 ${totalFeedRateDemand.toFixed(1)}/s）。`,
      suggestion: `若运力紧张或分拣器抓取吃力，切换为【额外产出】可节省原料达 20%~25%，大幅释放混带带宽压力。`,
    });
  }

  // 12. Closed-Loop Payload & Anti-Deadlock Capacity Verification Logic
  const isOverLimit = actualFacilitiesCount > maxFacilitiesLimit || isBeltOverloaded;
  const excessCount = Math.max(0, actualFacilitiesCount - maxFacilitiesLimit);
  const requiredBeltCapacity = Number((totalFeedRateDemand * safetyMultiplier).toFixed(1));

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
      recommendations.push(`拆分并联产线：当前整线需求 (${totalFeedRateDemand.toFixed(1)}/s) 已突破极速蓝带 4 层堆叠极限 (120/s)，建议拆分为 ${loopsNeeded} 条独立的并联混带回路。`);
    }
    recommendations.push(`回缩安全台数：将单回路串联设施数量控制在防死锁上限 ${maxFacilitiesLimit} 台以内，保证至少 ${redundancyPercent}% 闭环回流残料裕量。`);

    capacityAlert = {
      isOverLimit: true,
      actualCount: actualFacilitiesCount,
      maxLimit: maxFacilitiesLimit,
      excessCount,
      totalFeedDemand: Number(totalFeedRateDemand.toFixed(2)),
      beltCapacity,
      requiredBeltCapacity,
      currentLayers: beltStackLayers,
      currentBelt: belt,
      suggestedBelt: suggestedBelt || comboBelt,
      suggestedLayers: suggestedLayers || comboLayers,
      canSolveWithLayers: Boolean(suggestedLayers),
      canSolveWithBeltUpgrade: Boolean(suggestedBelt),
      canSolveWithBoth: Boolean(comboBelt && comboLayers),
      message: `所需设施数 (${actualFacilitiesCount} 台) 超过当前混带回路在闭环回流防死锁机制下的负载极限 (${maxFacilitiesLimit} 台)，超出 ${excessCount} 台！`,
      recommendations,
    };
  }

  return {
    beltCapacity,
    totalRawPerCraft,
    feedRatePerFacilityTotal: Number(feedRatePerFacilityTotal.toFixed(2)),
    maxFacilitiesLimit,
    actualFacilitiesCount,
    totalFeedRateDemand: Number(totalFeedRateDemand.toFixed(2)),
    beltLoadPercentage,
    isBeltOverloaded,
    interleavedPattern,
    beltSequenceInfo,
    materials,
    proliferatorEffectiveBonus: {
      mode: proliferatorMode,
      speedBonus,
      outputBonus,
      powerIncrease: proliferator.powerConsumptionIncrease,
      totalPowerMW,
    },
    proliferatorComparison: {
      baselineTotalFeedDemand,
      currentTotalFeedDemand: Number(totalFeedRateDemand.toFixed(2)),
      demandDeltaPercent,
      baselineOutputPerMin,
      currentOutputPerMin,
      outputDeltaPercent,
      savingsNote,
    },
    bufferStorage: {
      recommendedItems: recommendedBufferItems,
      recommendedChests,
      residualReturnRate: Number(residualReturnRate.toFixed(2)),
    },
    warnings,
    capacityAlert,
    advisorAlerts,
    powerStats,
  };
}
