import React, { useState } from 'react';
import { 
  Zap, 
  Radio, 
  Layers, 
  Sparkles, 
  TrendingUp, 
  Info, 
  HelpCircle,
  ShieldAlert,
  Gauge
} from 'lucide-react';
import { PowerConsumptionStats, CalculationInput, ProliferatorMode } from '../engine/calculator';
import { DSPPowerPoleIcon } from './DSPItemIcon';

interface PowerStatsCardProps {
  powerStats: PowerConsumptionStats;
  inputState?: CalculationInput;
  proliferatorMode?: ProliferatorMode;
  proliferatorTier?: number;
}

export const PowerStatsCard: React.FC<PowerStatsCardProps> = ({
  powerStats,
  inputState,
  proliferatorMode = 'extra_products',
  proliferatorTier = 0,
}) => {
  const [showDetailModal, setShowDetailModal] = useState(false);

  const {
    facilityPowerMW,
    sortersPowerMW,
    totalPowerMW,
    totalPowerKW,
    baselineFacilityPowerMW,
    powerIncreasePercent,
    sorterCountTotal,
    sorterBreakdown,
    powerPoles,
    gridStressEvaluation,
    generatorEquivalents,
  } = powerStats;

  const facility = inputState?.facility;
  const facilityCount = inputState?.customFacilityCount || 1;

  // Power Stress badge styling
  const stressMeta = {
    low: { label: '电网负荷平缓', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
    moderate: { label: '电网负荷正常', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' },
    high: { label: '重度电网负荷', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
    extreme: { label: '超高电力负荷 (需关注燃料补给)', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
  }[gridStressEvaluation];

  // Extra power added by proliferator
  const proliferatorDeltaMW = Number((facilityPowerMW - baselineFacilityPowerMW).toFixed(3));

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Zap className="w-4 h-4 fill-amber-400/20" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>阵列总电力消耗与配电拓扑</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${stressMeta.bg} ${stressMeta.color}`}>
                {stressMeta.label}
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetailModal(!showDetailModal)}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>用电明细</span>
          </button>
        </div>
      </div>

      {/* Primary Power Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Power */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>整线总耗电量</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="my-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-amber-400 tabular-nums">
              {totalPowerMW >= 1 ? totalPowerMW : (totalPowerMW * 1000).toFixed(0)}
            </span>
            <span className="text-xs text-slate-400 ml-1 font-mono">
              {totalPowerMW >= 1 ? 'MW' : 'kW'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            ≈ {totalPowerKW.toLocaleString()} kW
          </span>
        </div>

        {/* Facility Power */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>生产设备功耗</span>
            <span className="text-[10px] text-slate-500 font-mono">{facilityCount}台</span>
          </div>
          <div className="my-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-cyan-300 tabular-nums">
              {facilityPowerMW >= 1 ? facilityPowerMW.toFixed(2) : (facilityPowerMW * 1000).toFixed(0)}
            </span>
            <span className="text-xs text-slate-400 ml-1 font-mono">
              {facilityPowerMW >= 1 ? 'MW' : 'kW'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 truncate" title={facility?.name}>
            单台 {((facility?.powerMW || 0) * (1 + powerIncreasePercent / 100)).toFixed(2)} MW
          </span>
        </div>

        {/* Sorters Power */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>分拣爪运行功耗</span>
            <span className="text-[10px] text-slate-500 font-mono">{sorterCountTotal}支</span>
          </div>
          <div className="my-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-indigo-300 tabular-nums">
              {(sortersPowerMW * 1000).toFixed(0)}
            </span>
            <span className="text-xs text-slate-400 ml-1 font-mono">kW</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {sortersPowerMW.toFixed(3)} MW (全进出爪)
          </span>
        </div>

        {/* Proliferator Surge */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>增产剂能耗加成</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="my-1">
            <span className={`text-xl sm:text-2xl font-bold font-mono tabular-nums ${powerIncreasePercent > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              +{powerIncreasePercent}%
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {proliferatorTier > 0 
              ? `额外消耗 +${proliferatorDeltaMW.toFixed(2)} MW`
              : '未喷涂 (基准 100% 功耗)'}
          </span>
        </div>
      </div>

      {/* Proliferator Power Surge Notice */}
      {proliferatorTier > 0 && powerIncreasePercent > 0 && (
        <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-slate-300 text-[11px] leading-snug">
              增产剂不仅改变物料产速，也使单机耗电剧增至基准的 <strong className="text-amber-300 font-mono">{((1 + powerIncreasePercent / 100)).toFixed(2)}x</strong> 倍。基准未喷涂耗电为 <span className="font-mono text-slate-300">{baselineFacilityPowerMW} MW</span>。
            </span>
          </div>
          <span className="text-[11px] font-mono text-amber-400 shrink-0 font-bold">
            +{(facilityPowerMW - baselineFacilityPowerMW).toFixed(2)} MW 增幅
          </span>
        </div>
      )}

      {/* Suggested Power Transmission Towers (建议电力塔数量与拓扑) */}
      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            建议电力塔部署方案 (沿产线阵列)
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            覆盖 {facilityCount} 台设备及其配套分拣爪
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {powerPoles.recommendedPoles.map(pole => (
            <div 
              key={pole.poleId}
              className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DSPPowerPoleIcon category={pole.category} size={24} showTooltip />
                  <span className="text-xs font-semibold text-slate-200">{pole.poleName}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-cyan-400">{pole.recommendedCount}</span>
                  <span className="text-[11px] text-slate-400 ml-0.5">座</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                {pole.note}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Generation Capacity (发电机等效换算) */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 text-slate-400 text-[11px]">
          <span className="text-slate-300 font-medium">发电机装机需求等效:</span>
          <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono text-slate-300">
            风电: ~{generatorEquivalents.windTurbines} 座 (0.3MW)
          </span>
          <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono text-slate-300">
            火电: ~{generatorEquivalents.thermalPlants} 座 (2.16MW)
          </span>
          <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono text-amber-300">
            聚变: ~{generatorEquivalents.miniFusionPlants} 座 (15MW)
          </span>
          {totalPowerMW >= 30 && (
            <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono text-cyan-300">
              人造恒星: ~{generatorEquivalents.artificialStars} 座 (72MW)
            </span>
          )}
        </div>
      </div>

      {/* Sorter Breakdown Modal / Accordion */}
      {showDetailModal && (
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-2 animate-in fade-in duration-150">
          <div className="font-semibold text-slate-200 flex items-center justify-between pb-1 border-b border-slate-800">
            <span>分拣爪运行耗电拆解表</span>
            <span className="text-slate-400 font-mono">共 {sorterCountTotal} 支爪</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sorterBreakdown.map(sb => (
              <div key={sb.sorterName} className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800/80 font-mono text-[11px]">
                <span className="text-slate-300">{sb.sorterName}</span>
                <span className="text-slate-400">
                  {sb.count} 支 · <strong className="text-cyan-400">{sb.powerKW} kW</strong>
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed pt-1">
            * 注：DSP 游戏中制造台停机时会转为怠速待机（Idle Power ~12-15kW），此处按 100% 满负荷工作功率（Work Power）进行安全估算，避免电网出现黄网断粮波动。
          </p>
        </div>
      )}
    </div>
  );
};
