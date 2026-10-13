import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Activity, 
  Cpu, 
  Layers, 
  Sparkles, 
  TrendingUp, 
  Gauge, 
  Sliders, 
  ArrowRight, 
  Check, 
  RotateCcw,
  ShieldAlert,
  Flame,
  Wind,
  Sun,
  Atom,
  HelpCircle
} from 'lucide-react';
import { CalculationInput, CalculationResult } from '../engine/calculator';
import { DSP_ITEMS, DSPRecipe } from '../data/dspData';
import { DSPItemIcon, DSPFacilityIcon } from './DSPItemIcon';

interface PowerYieldCalculatorModuleProps {
  result: CalculationResult;
  inputState?: CalculationInput;
  onChangeInput?: (updater: (prev: CalculationInput) => CalculationInput) => void;
}

export const PowerYieldCalculatorModule: React.FC<PowerYieldCalculatorModuleProps> = ({
  result,
  inputState,
  onChangeInput,
}) => {
  const { powerStats, proliferatorComparison, actualFacilitiesCount, maxFacilitiesLimit, beltCapacity } = result;
  const facility = inputState?.facility;
  const recipe = inputState?.recipe;
  const proliferatorTier = inputState?.proliferatorTier ?? 0;
  const proliferatorMode = inputState?.proliferatorMode ?? 'output';

  // Primary product information
  const primaryOutputItem = recipe?.outputs[0] ? DSP_ITEMS[recipe.outputs[0].itemId] : null;
  const outputCountPerCraft = recipe?.outputs[0]?.count || 1;

  // Actual output rates
  const currentOutputPerMin = proliferatorComparison.currentOutputPerMin;
  const currentOutputPerSec = Number((currentOutputPerMin / 60).toFixed(2));
  const singleFacilityOutputPerMin = actualFacilitiesCount > 0 
    ? Number((currentOutputPerMin / actualFacilitiesCount).toFixed(2)) 
    : 0;
  const singleFacilityOutputPerSec = actualFacilitiesCount > 0 
    ? Number((currentOutputPerSec / actualFacilitiesCount).toFixed(3)) 
    : 0;

  // Power breakdown metrics
  const totalPowerMW = powerStats.totalPowerMW;
  const facilityPowerMW = powerStats.facilityPowerMW;
  const sortersPowerMW = powerStats.sortersPowerMW;
  const powerIncreasePercent = powerStats.powerIncreasePercent;
  const proliferatorDeltaMW = Number((facilityPowerMW - powerStats.baselineFacilityPowerMW).toFixed(3));

  // Power percentages
  const facilityPowerPercent = totalPowerMW > 0 ? Math.round((facilityPowerMW / totalPowerMW) * 100) : 0;
  const sortersPowerPercent = totalPowerMW > 0 ? 100 - facilityPowerPercent : 0;

  // Energy intensity per unit
  const energyPerItemMJ = currentOutputPerSec > 0 ? Number((totalPowerMW / currentOutputPerSec).toFixed(3)) : 0;
  const energyPer10kKwh = Number(((energyPerItemMJ * 10000) / 3.6).toFixed(1));

  // Interactive Target Output Simulator
  const [targetYieldPerMin, setTargetYieldPerMin] = useState<number>(currentOutputPerMin);
  const [isSimulatingCustom, setIsSimulatingCustom] = useState<boolean>(false);

  // Sync default target yield when recipe/count changes if user hasn't explicitly customized
  useEffect(() => {
    if (!isSimulatingCustom) {
      setTargetYieldPerMin(currentOutputPerMin);
    }
  }, [currentOutputPerMin, isSimulatingCustom]);

  // Calculations for simulated target yield
  const singleFacBasePowerMW = (facility?.powerMW || 0.5) * (1 + powerIncreasePercent / 100);
  const sorterPowerPerFacilityMW = actualFacilitiesCount > 0 
    ? sortersPowerMW / actualFacilitiesCount 
    : 0.054;

  const simulatedRequiredFacilities = singleFacilityOutputPerMin > 0 
    ? Math.max(1, Math.ceil(targetYieldPerMin / singleFacilityOutputPerMin)) 
    : 1;

  const simulatedFacilityPowerMW = Number((simulatedRequiredFacilities * singleFacBasePowerMW).toFixed(3));
  const simulatedSorterPowerMW = Number((simulatedRequiredFacilities * sorterPowerPerFacilityMW).toFixed(3));
  const simulatedTotalPowerMW = Number((simulatedFacilityPowerMW + simulatedSorterPowerMW).toFixed(2));
  const simulatedOutputPerSec = Number((targetYieldPerMin / 60).toFixed(2));

  // Generator equivalents for the simulated power
  const simWindCount = Math.ceil(simulatedTotalPowerMW / 0.3);
  const simThermalCount = Math.ceil(simulatedTotalPowerMW / 2.16);
  const simFusionCount = Math.ceil(simulatedTotalPowerMW / 15.0);
  const simStarCount = Math.max(1, Math.ceil(simulatedTotalPowerMW / 72.0));

  // Handle applying simulated facility count
  const handleApplySimulatedCount = () => {
    if (onChangeInput) {
      onChangeInput(prev => ({
        ...prev,
        customFacilityCount: simulatedRequiredFacilities,
      }));
      setIsSimulatingCustom(false);
    }
  };

  return (
    <div className="bg-[#131722] border-2 border-[#2d3748] rounded-xl p-4 sm:p-5 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] space-y-4">
      {/* ============================================================== */}
      {/* 1. HEADER: TITLE & CORE POWER STRESS EVALUATION BADGE */}
      {/* ============================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b-2 border-[#2d3748]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border-2 border-amber-400/80 flex items-center justify-center text-amber-400 shadow-[2px_2px_0px_rgba(251,191,36,0.25)]">
            <Zap className="w-4 h-4 fill-amber-400/30" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                产线产量与总电力消耗测算
              </h3>
              <span className="pixel-label hidden sm:inline-flex" style={{ color: '#fbbf24', borderColor: '#fbbf24', background: 'rgba(251,191,36,0.1)' }}>
                POWER_YIELD_MW
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              根据当前选择的生产机器、增产倍率及产出速度，精确推演全线设备与分拣抓取总电耗
            </p>
          </div>
        </div>

        {/* Selected Machine Pill */}
        <div className="flex items-center gap-2 bg-[#0c0f17] px-3 py-1.5 rounded-lg border border-[#2d3748] text-xs font-mono">
          <span className="text-slate-400 text-[11px]">当前机器:</span>
          <span className="font-bold text-cyan-300">
            {facility?.name || '生产机器'}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-amber-400 font-bold">
            {actualFacilitiesCount} 台
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. REAL-TIME YIELD & TOTAL POWER CONSUMPTION CARDS */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Power Consumption (Highlighted MW) */}
        <div className="bg-[#0b0e17] p-3.5 rounded-xl border-2 border-amber-500/60 shadow-[3px_3px_0px_rgba(251,191,36,0.2)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-300 font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              整线总电力消耗
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/80">
              {totalPowerMW >= 50 ? '超高负荷' : totalPowerMW >= 20 ? '高负荷' : '正常负荷'}
            </span>
          </div>

          <div className="my-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold font-mono text-amber-400 tabular-nums tracking-tight">
              {totalPowerMW}
            </span>
            <span className="text-xs font-mono text-amber-200 font-bold uppercase">
              MW
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5">
            <span>换算千瓦:</span>
            <span className="text-slate-200 font-bold">
              {powerStats.totalPowerKW.toLocaleString()} kW
            </span>
          </div>
        </div>

        {/* Card 2: Actual Line Output / Production Rate */}
        <div className="bg-[#0b0e17] p-3.5 rounded-xl border-2 border-cyan-500/60 shadow-[3px_3px_0px_rgba(6,182,212,0.2)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-300 font-bold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              产线实际总产量
            </span>
            <div className="flex items-center gap-1">
              <DSPItemIcon item={primaryOutputItem} size={18} />
              <span className="text-[11px] text-slate-300 font-medium truncate max-w-20">
                {recipe?.name}
              </span>
            </div>
          </div>

          <div className="my-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold font-mono text-cyan-300 tabular-nums tracking-tight">
              {currentOutputPerMin}
            </span>
            <span className="text-xs font-mono text-cyan-200 font-bold uppercase">
              件/分
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5">
            <span>秒级输出:</span>
            <span className="text-cyan-300 font-bold">
              {currentOutputPerSec} 件/秒
            </span>
          </div>
        </div>

        {/* Card 3: Single Machine Performance & Power */}
        <div className="bg-[#0b0e17] p-3.5 rounded-xl border-2 border-[#2d3748] shadow-[3px_3px_0px_rgba(0,0,0,0.5)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              单台机器性能与能耗
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">
              {facility?.speedMultiplier}x 速
            </span>
          </div>

          <div className="my-2 space-y-1">
            <div className="flex items-baseline justify-between font-mono">
              <span className="text-[11px] text-slate-400">单机产速:</span>
              <span className="text-sm font-bold text-emerald-300 tabular-nums">
                {singleFacilityOutputPerMin} 件/分 <span className="text-[10px] text-slate-500">({singleFacilityOutputPerSec}/s)</span>
              </span>
            </div>
            <div className="flex items-baseline justify-between font-mono">
              <span className="text-[11px] text-slate-400">单机功耗:</span>
              <span className="text-sm font-bold text-amber-300 tabular-nums">
                {((facility?.powerMW || 0) * (1 + powerIncreasePercent / 100)).toFixed(2)} MW
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5">
            <span>基准功耗:</span>
            <span className="text-slate-300">
              {facility?.powerMW} MW {powerIncreasePercent > 0 && <span className="text-rose-400">(+{powerIncreasePercent}%)</span>}
            </span>
          </div>
        </div>

        {/* Card 4: Energy Intensity / Efficiency Metric */}
        <div className="bg-[#0b0e17] p-3.5 rounded-xl border-2 border-[#2d3748] shadow-[3px_3px_0px_rgba(0,0,0,0.5)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-indigo-400" />
              单件能耗成本
            </span>
            <span className="pixel-label text-[9px]">EFFICIENCY</span>
          </div>

          <div className="my-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold font-mono text-indigo-300 tabular-nums tracking-tight">
              {energyPerItemMJ}
            </span>
            <span className="text-xs font-mono text-indigo-200 font-bold uppercase">
              MJ / 件
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5">
            <span>每万件电量:</span>
            <span className="text-indigo-300 font-bold">
              ~{energyPer10kKwh} 度电
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. DETAILED POWER BREAKDOWN BAR & STRUCTURAL DISTRIBUTION */}
      {/* ============================================================== */}
      <div className="p-3.5 bg-[#0e121c] border-2 border-[#2d3748] rounded-xl space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-300 font-bold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            整线能耗结构细分占比 (总计 {totalPowerMW} MW)
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            生产主机 ({actualFacilitiesCount}台) + 进出分拣爪 ({powerStats.sorterCountTotal}支)
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex p-0.5 border border-slate-800">
          <div 
            className="h-full bg-amber-400 rounded-l-full transition-all duration-300"
            style={{ width: `${facilityPowerPercent}%` }}
            title={`生产设备耗电: ${facilityPowerMW} MW (${facilityPowerPercent}%)`}
          />
          <div 
            className="h-full bg-indigo-500 rounded-r-full transition-all duration-300"
            style={{ width: `${sortersPowerPercent}%` }}
            title={`分拣爪运行耗电: ${sortersPowerMW} MW (${sortersPowerPercent}%)`}
          />
        </div>

        {/* Metric Badges Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
          <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
              <span className="text-slate-300 text-[11px]">生产设备主体耗电:</span>
            </div>
            <span className="font-bold text-amber-300">
              {facilityPowerMW} MW <span className="text-[10px] text-slate-500 font-normal">({facilityPowerPercent}%)</span>
            </span>
          </div>

          <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
              <span className="text-slate-300 text-[11px]">分拣爪抓取耗电:</span>
            </div>
            <span className="font-bold text-indigo-300">
              {sortersPowerMW} MW <span className="text-[10px] text-slate-500 font-normal">({sortersPowerPercent}%)</span>
            </span>
          </div>

          <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-slate-300 text-[11px]">增产剂额外激增:</span>
            </div>
            <span className={`font-bold ${powerIncreasePercent > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {powerIncreasePercent > 0 ? `+${proliferatorDeltaMW} MW` : '无额外增耗'}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. INTERACTIVE TARGET YIELD TO TOTAL POWER SIMULATOR */}
      {/* ============================================================== */}
      <div className="p-3.5 bg-gradient-to-r from-[#0d1322] via-[#0f172a] to-[#0d1322] border-2 border-cyan-800/70 rounded-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs sm:text-sm font-bold text-white">
              🎯 目标产量反推总电力模拟器 (Target Output ➔ Power Simulator)
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            设定目标产量，实时推导需部署机器数与对应总电力消耗
          </span>
        </div>

        {/* Input & Quick Presets */}
        <div className="flex flex-wrap items-center gap-2 bg-[#090d16] p-2 rounded-lg border border-slate-800 text-xs">
          <span className="text-slate-300 text-[11px] font-medium shrink-0">
            设定目标产量:
          </span>

          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-700">
            <input
              type="number"
              min="1"
              max="100000"
              value={targetYieldPerMin}
              onChange={e => {
                const val = Math.max(1, Number(e.target.value) || 1);
                setTargetYieldPerMin(val);
                setIsSimulatingCustom(true);
              }}
              className="w-20 bg-transparent text-cyan-300 font-mono font-bold text-sm focus:outline-none tabular-nums"
            />
            <span className="text-[11px] text-slate-400 font-mono">件/分</span>
          </div>

          <span className="text-slate-600 hidden sm:inline">|</span>

          {/* Quick preset buttons */}
          <div className="flex flex-wrap items-center gap-1 text-[11px] font-mono">
            <span className="text-slate-500 text-[10px] hidden md:inline">快捷基准:</span>
            {[
              { label: '60/分', val: 60 },
              { label: '180/分', val: 180 },
              { label: '360/分 (1黄带)', val: 360 },
              { label: '720/分 (1绿带)', val: 720 },
              { label: '1800/分 (1蓝带)', val: 1800 },
            ].map(p => (
              <button
                key={p.val}
                type="button"
                onClick={() => {
                  setTargetYieldPerMin(p.val);
                  setIsSimulatingCustom(true);
                }}
                className={`px-2 py-0.5 rounded transition ${
                  targetYieldPerMin === p.val
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/80 font-bold'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}

            {isSimulatingCustom && (
              <button
                type="button"
                onClick={() => {
                  setTargetYieldPerMin(currentOutputPerMin);
                  setIsSimulatingCustom(false);
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1"
                title="重置为当前产线实际产量"
              >
                <RotateCcw className="w-3 h-3 text-cyan-400" />
                <span>重置为当前</span>
              </button>
            )}
          </div>
        </div>

        {/* Simulation Output Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="bg-[#090d16] p-2.5 rounded-lg border border-slate-800 flex items-center justify-between font-mono">
            <div>
              <div className="text-[11px] text-slate-400">所需机器台数</div>
              <div className="text-lg font-bold text-cyan-300 mt-0.5">
                {simulatedRequiredFacilities} 台
              </div>
            </div>
            <span className="text-[10px] text-slate-500">
              单台 {singleFacilityOutputPerMin} 件/分
            </span>
          </div>

          <div className="bg-[#090d16] p-2.5 rounded-lg border-2 border-amber-500/50 flex items-center justify-between font-mono shadow-xs">
            <div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                推演总电力消耗
              </div>
              <div className="text-lg font-bold text-amber-400 mt-0.5">
                {simulatedTotalPowerMW} MW
              </div>
            </div>
            <div className="text-right text-[10px] text-slate-500">
              主机 {simulatedFacilityPowerMW} MW<br />
              爪耗 {simulatedSorterPowerMW} MW
            </div>
          </div>

          <div className="bg-[#090d16] p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400 font-mono">发电机装机需求</div>
              <div className="text-xs font-mono text-slate-200 mt-0.5 space-x-1.5">
                <span title="风电机 0.3MW">风电: <strong className="text-cyan-400">{simWindCount}</strong></span>
                <span title="火电厂 2.16MW">火电: <strong className="text-amber-400">{simThermalCount}</strong></span>
                <span title="聚变站 15MW">聚变: <strong className="text-purple-400">{simFusionCount}</strong></span>
              </div>
            </div>

            {/* Apply Button */}
            {onChangeInput && simulatedRequiredFacilities !== actualFacilitiesCount && (
              <button
                type="button"
                onClick={handleApplySimulatedCount}
                className="px-2.5 py-1 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded border border-cyan-300 transition whitespace-nowrap active:translate-y-0.5 shadow-sm"
                title={`一键将实际生产线设备台数设为 ${simulatedRequiredFacilities} 台`}
              >
                应用此台数
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. POWER GENERATION EQUIVALENTS SUMMARY FOOTER */}
      {/* ============================================================== */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <span className="text-slate-300 font-bold flex items-center gap-1">
            <Atom className="w-3.5 h-3.5 text-purple-400" />
            当前产线电力供电参考:
          </span>
          <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono text-slate-300">
            风电: ~{powerStats.generatorEquivalents.windTurbines} 座 (0.3MW)
          </span>
          <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono text-slate-300">
            火电: ~{powerStats.generatorEquivalents.thermalPlants} 座 (2.16MW)
          </span>
          <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono text-amber-300">
            微型聚变: ~{powerStats.generatorEquivalents.miniFusionPlants} 座 (15MW)
          </span>
          {totalPowerMW >= 30 && (
            <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono text-cyan-300">
              人造恒星: ~{powerStats.generatorEquivalents.artificialStars} 座 (72MW)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
