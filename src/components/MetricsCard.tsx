import { useDSPItems } from '../data/GameDataContext';
import React from 'react';
import { 
  Activity, 
  AlertOctagon, 
  CheckCircle2, 
  Box, 
  Repeat, 
  ArrowRight, 
  ShieldAlert,
  AlertTriangle,
  Zap,
  Layers,
  RotateCcw,
  Sparkles,
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { CalculationInput, CalculationResult } from '../engine/calculator';
import { DSP_ITEMS, DSP_BELTS, DSP_SORTERS, PROLIFERATOR_CONFIGS, getRecipeMultipliers } from '../data/dspData';
import { DSPItemIcon, DSPBeltIcon, DSPSorterIcon } from './DSPItemIcon';
import { BeltSequencePattern } from './BeltSequencePattern';
import { SmartAdvisorAlert } from './SmartAdvisorAlert';
import { PowerStatsCard } from './PowerStatsCard';
import { PowerYieldCalculatorModule } from './PowerYieldCalculatorModule';

interface MetricsCardProps {
  result: CalculationResult;
  inputState?: CalculationInput;
  onChangeInput?: (updater: (prev: CalculationInput) => CalculationInput) => void;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({ 
  result, 
  inputState,
  onChangeInput 
}) => {
  const DSP_ITEMS = useDSPItems();
  const {
    beltCapacity,
    maxFacilitiesLimit,
    actualFacilitiesCount,
    feedRatePerFacilityTotal,
    totalFeedRateDemand,
    beltLoadPercentage,
    isBeltOverloaded,
    interleavedPattern,
    materials,
    proliferatorEffectiveBonus,
    bufferStorage,
    warnings,
    capacityAlert,
  } = result;

  const currentBelt = inputState?.belt || DSP_BELTS[0];
  const currentLayers = inputState?.beltStackLayers || 1;

  return (
    <div className="space-y-4">
      {/* ============================================================== */}
      {/* 1. CRITICAL CAPACITY OVERLOAD & CLOSED-LOOP DEADLOCK WARNING BADGE */}
      {/* ============================================================== */}
      {capacityAlert?.isOverLimit && (
        <div className="p-4 bg-gradient-to-r from-rose-950/80 via-slate-900/90 to-rose-950/70 border-2 border-rose-500/80 rounded-xl shadow-xl shadow-rose-950/40 space-y-3 backdrop-blur-md">
          {/* Header row with eye-catching pulsing warning badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-800/60 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center p-1 rounded-md bg-rose-500/20 text-rose-400">
                <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono tracking-wide bg-rose-500 text-slate-950 uppercase shadow-md shadow-rose-500/40">
                  ⚠️ 产线运力超载警示
                </span>
                <span className="text-sm font-bold text-rose-200">
                  所需设施超出配置的入口运力上限
                </span>
              </div>
            </div>

            <span className="font-mono text-xs px-2 py-0.5 rounded bg-rose-950 border border-rose-700/80 text-rose-300 font-semibold">
              超出极限 +{capacityAlert.excessCount} 台设施
            </span>
          </div>

          {/* Diagnosis details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-rose-900/40 flex flex-col justify-between">
              <span className="text-slate-400 text-[11px]">当前部署 / 需求设施</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-mono font-bold text-rose-400">
                  {capacityAlert.actualCount}
                </span>
                <span className="text-slate-400 text-xs">台</span>
              </div>
              <span className="text-[10px] text-rose-300/80 mt-1">
                总进料需: {capacityAlert.totalFeedDemand} /s
              </span>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
              <span className="text-slate-400 text-[11px]">闭环防死锁单带承载极限</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-mono font-bold text-emerald-400">
                  {capacityAlert.maxLimit}
                </span>
                <span className="text-slate-400 text-xs">台 (额定极限)</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                当前单带运力: {capacityAlert.beltCapacity} /s
              </span>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-amber-900/40 flex flex-col justify-between">
              <span className="text-slate-400 text-[11px]">闭环防死锁安全运力需求</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-mono font-bold text-amber-300">
                  {capacityAlert.requiredBeltCapacity}
                </span>
                <span className="text-slate-400 text-xs">items/s</span>
              </div>
              <span className="text-[10px] text-amber-400/80 mt-1">
                缺口运力: {(capacityAlert.requiredBeltCapacity - capacityAlert.beltCapacity).toFixed(1)} /s
              </span>
            </div>
          </div>

          {/* Physics & Mechanism Warning Callout */}
          <p className="text-xs text-rose-200/90 leading-relaxed bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/60 font-sans">
            <strong>【混带稳态容量检查】</strong>
            ：入口运力不足时无法维持所有设施满速生产。回流优先级、输入配比、补料控制和输出背压也会影响实际运行，剩余入口带宽不能代表实际回流速率。
          </p>

          {/* Actionable Upgrade Recommendations & One-Click Fix Buttons */}
          <div className="space-y-2 pt-1 border-t border-rose-900/60">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>系统智能优化整改建议与一键应用：</span>
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {/* Option A: Upgrade Belt Speed */}
              {capacityAlert.suggestedBelt && (
                <div className="p-2.5 bg-slate-900/90 border border-cyan-800/80 rounded-lg flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex items-center gap-1 shrink-0">
                      <DSPBeltIcon belt={capacityAlert.currentBelt} size={22} showTooltip />
                      <ArrowRight className="w-3 h-3 text-cyan-400" />
                      <DSPBeltIcon belt={capacityAlert.suggestedBelt} size={22} showTooltip />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-cyan-300 truncate">
                        升级传送带等级
                      </span>
                      <span className="text-[10px] text-slate-400">
                        升级至【{capacityAlert.suggestedBelt.name}】(运力 {capacityAlert.suggestedBelt.baseSpeed * capacityAlert.currentLayers}/s)
                      </span>
                    </div>
                  </div>

                  {onChangeInput && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetBelt = capacityAlert.suggestedBelt!;
                        onChangeInput(prev => ({ ...prev, belt: targetBelt }));
                      }}
                      className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-xs transition shadow-md shadow-cyan-500/20 shrink-0 whitespace-nowrap"
                    >
                      一键升级带速
                    </button>
                  )}
                </div>
              )}

              {/* Option B: Increase Stack Layers */}
              {capacityAlert.suggestedLayers && (
                <div className="p-2.5 bg-slate-900/90 border border-emerald-800/80 rounded-lg flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded bg-emerald-950/60 border border-emerald-700/60 text-emerald-400 shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-emerald-300 truncate">
                        增加带上堆叠层数
                      </span>
                      <span className="text-[10px] text-slate-400">
                        集装机堆叠由 {capacityAlert.currentLayers} 层提升至 {capacityAlert.suggestedLayers} 层 (运力 {capacityAlert.currentBelt.baseSpeed * capacityAlert.suggestedLayers}/s)
                      </span>
                    </div>
                  </div>

                  {onChangeInput && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetLayers = capacityAlert.suggestedLayers!;
                        onChangeInput(prev => ({ ...prev, beltStackLayers: targetLayers }));
                      }}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-xs transition shadow-md shadow-emerald-500/20 shrink-0 whitespace-nowrap"
                    >
                      一键提升层数
                    </button>
                  )}
                </div>
              )}

              {/* Option C: Reset to Safe Max Capacity */}
              <div className="p-2.5 bg-slate-900/90 border border-slate-700/80 rounded-lg flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded bg-slate-800 text-slate-300 shrink-0">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-slate-200 truncate">
                      缩减至安全上限台数
                    </span>
                    <span className="text-[10px] text-slate-400">
                      将生产线调回单带额定极限 {capacityAlert.maxLimit} 台
                    </span>
                  </div>
                </div>

                {onChangeInput && (
                  <button
                    type="button"
                    onClick={() => {
                      onChangeInput(prev => ({ ...prev, customFacilityCount: undefined }));
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded text-xs transition border border-slate-700 shrink-0 whitespace-nowrap"
                  >
                    恢复额定台数
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1.5 DSP EXPERT HARDCORE SMART ADVISOR SYSTEM */}
      {/* ============================================================== */}
      <SmartAdvisorAlert alerts={result.advisorAlerts} />

      {/* ============================================================== */}
      {/* 2. KPI OVERVIEW GRID (PLAYFUL INDUSTRIAL CARDS) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1: Belt Capacity with In-Game Belt Icon */}
        <div className="bg-[#161b26] border-2 border-[#2d3748] rounded-xl p-3 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="pixel-label">BELT_CAP</span>
            <div className="flex items-center gap-1 bg-[#0a0d14] px-1.5 py-0.5 rounded border border-[#2d3748] text-[10px]">
              <DSPBeltIcon belt={currentBelt} size={15} showTooltip />
              <span className="text-slate-300 font-mono hidden md:inline">{currentBelt.name.split(' ')[0]}</span>
              <span className="text-cyan-400 font-mono font-bold">{currentLayers}层</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1 mt-1.5">
            <span className="text-2xl font-mono font-bold text-[#00f0ff] tabular-nums">
              {beltCapacity}
            </span>
            <span className="text-[10px] font-mono text-slate-400 uppercase">/s</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
            {(beltCapacity * 60).toLocaleString()} /min
          </span>
        </div>

        {/* Metric 2: Max Facilities with Overload Alert Badge */}
        <div className={`rounded-xl p-3 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] border-2 flex flex-col justify-between ${
          isBeltOverloaded || (capacityAlert?.isOverLimit) 
            ? 'border-[#ff0055] bg-[#220d18]' 
            : 'border-[#2d3748] bg-[#161b26]'
        }`}>
          <div className="flex items-center justify-between gap-1">
            <span className="pixel-label" style={isBeltOverloaded || capacityAlert?.isOverLimit ? { color: '#ff0055', borderColor: '#ff0055' } : {}}>
              MAX_FAC
            </span>
            {capacityAlert?.isOverLimit ? (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#ff0055] text-white font-mono animate-pulse shadow-sm shadow-[#ff0055]/50">
                +{capacityAlert.excessCount} OVER
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                NOMINAL
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1 mt-1.5">
            <span className={`text-2xl font-mono font-bold tabular-nums ${
              isBeltOverloaded || (capacityAlert?.isOverLimit) ? 'text-[#ff0055]' : 'text-emerald-400'
            }`}>
              {maxFacilitiesLimit}
            </span>
            <span className="text-[10px] font-mono text-slate-400">台</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
            当前部署: <strong className={capacityAlert?.isOverLimit ? 'text-[#ff0055]' : 'text-slate-200'}>{actualFacilitiesCount}</strong> 台
          </span>
        </div>

        {/* Metric 3: Total Feed Rate Demand */}
        <div className="bg-[#161b26] border-2 border-[#2d3748] rounded-xl p-3 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="pixel-label">FEED_RATE</span>
            <span className={`text-[10px] font-mono font-bold ${
              isBeltOverloaded ? 'text-[#ff0055]' : beltLoadPercentage > 95 ? 'text-amber-400' : 'text-cyan-400'
            }`}>
              {beltLoadPercentage}%
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1.5">
            <span className="text-2xl font-mono font-bold text-white tabular-nums">
              {totalFeedRateDemand}
            </span>
            <span className="text-[10px] font-mono text-slate-400 uppercase">/s</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] text-slate-400 font-mono">额定负荷:</span>
            <div className="flex-1 bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-700/80">
              <div 
                className={`h-full rounded-full ${isBeltOverloaded ? 'bg-[#ff0055]' : beltLoadPercentage > 95 ? 'bg-amber-400' : 'bg-cyan-400'}`}
                style={{ width: `${Math.min(100, beltLoadPercentage)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 4: Total Power */}
        <div className="bg-[#161b26] border-2 border-[#2d3748] rounded-xl p-3 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] flex flex-col justify-between">
          <span className="pixel-label" style={{ color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.4)' }}>
            POWER_GRID
          </span>
          <div className="flex items-baseline gap-1 mt-1.5">
            <span className="text-2xl font-mono font-bold text-[#fbbf24] tabular-nums">
              {proliferatorEffectiveBonus.totalPowerMW}
            </span>
            <span className="text-[10px] font-mono text-slate-400 uppercase">MW</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
            单台: {(actualFacilitiesCount > 0 ? proliferatorEffectiveBonus.totalPowerMW / actualFacilitiesCount : 0).toFixed(2)} MW
          </span>
        </div>
      </div>

      {/* Warnings Banner if any other warnings exist */}
      {warnings.length > 0 && !capacityAlert?.isOverLimit && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-xl space-y-1 text-xs">
          <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
            <ShieldAlert className="w-4 h-4" />
            <span>瓶颈与过载预警 (Bottleneck Warning)</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2.5 PROLIFERATOR IMPACT & DYNAMIC DELTA COMPARISON */}
      {/* ============================================================== */}
      {(() => {
        const comp = result.proliferatorComparison;
        const currentTier = inputState?.proliferatorTier ?? 0;
        const currentMode = inputState?.proliferatorMode ?? 'output';
        const isSpeed = result.proliferatorEffectiveBonus.speedBonus > 0;
        const isOutput = result.proliferatorEffectiveBonus.outputBonus > 0;
        const outputAllowed = !!inputState && getRecipeMultipliers(inputState.recipe,3,'output').output > 1;
        const speedAllowed = !!inputState && getRecipeMultipliers(inputState.recipe,3,'speed').speed > 1;

        return (
          <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">增产剂进料压力与产出直观对比</h3>
                {currentTier > 0 && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold animate-pulse ${
                    isOutput 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {isOutput ? '额外产出 +'+Math.round(result.proliferatorEffectiveBonus.outputBonus*100)+'%' : isSpeed ? '额外速度 +'+Math.round(result.proliferatorEffectiveBonus.speedBonus*100)+'%' : '该配方/模式未产生增产效果'}
                  </span>
                )}
              </div>

              {/* Quick toggle pills if onChangeInput is provided */}
              {onChangeInput && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[11px] text-slate-400 mr-1">喷涂切换:</span>
                  <button
                    type="button"
                    onClick={() => onChangeInput(prev => ({ ...prev, proliferatorTier: 0, customFacilityCount: undefined }))}
                    className={`px-2 py-1 rounded text-xs transition font-mono ${
                      currentTier === 0 
                        ? 'bg-slate-700 text-white font-bold' 
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    未喷涂
                  </button>
                  <button
                    type="button"
                    disabled={!outputAllowed}
                    onClick={() => onChangeInput(prev => ({ 
                      ...prev, 
                      proliferatorTier: prev.proliferatorTier === 0 ? 3 : prev.proliferatorTier, 
                      proliferatorMode: 'output', 
                      customFacilityCount: undefined 
                    }))}
                    className={`px-2.5 py-1 rounded text-xs transition flex items-center gap-1 font-mono ${
                      isOutput 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400 font-bold shadow-xs' 
                        : 'bg-slate-800 text-slate-400 hover:text-emerald-400'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>额外产出</span>
                  </button>
                  <button
                    type="button"
                    disabled={!speedAllowed}
                    onClick={() => onChangeInput(prev => ({ 
                      ...prev, 
                      proliferatorTier: prev.proliferatorTier === 0 ? 3 : prev.proliferatorTier, 
                      proliferatorMode: 'speed', 
                      customFacilityCount: undefined 
                    }))}
                    className={`px-2.5 py-1 rounded text-xs transition flex items-center gap-1 font-mono ${
                      isSpeed 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400 font-bold shadow-xs' 
                        : 'bg-slate-800 text-slate-400 hover:text-amber-400'
                    }`}
                  >
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>额外速度</span>
                  </button>
                </div>
              )}
            </div>

            {/* Visual delta metrics grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Box 1: Material Feed Demand Delta */}
              <div className={`p-3 rounded-lg border transition-all ${
                isOutput 
                  ? 'bg-emerald-950/20 border-emerald-500/40 shadow-xs shadow-emerald-950/30' 
                  : isSpeed 
                    ? 'bg-rose-950/20 border-rose-500/40 shadow-xs shadow-rose-950/30' 
                    : 'bg-slate-950 border-slate-800'
              }`}>
                <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                  <span>整线进料通量需求 (Feed Demand)</span>
                  {comp.demandDeltaPercent !== 0 && (
                    <span className={`flex items-center gap-0.5 font-bold font-mono text-xs px-1.5 py-0.2 rounded ${
                      comp.demandDeltaPercent > 0 
                        ? 'text-rose-400 bg-rose-500/20 animate-pulse' 
                        : 'text-emerald-400 bg-emerald-500/20'
                    }`}>
                      {comp.demandDeltaPercent > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {comp.demandDeltaPercent > 0 ? `+${comp.demandDeltaPercent}%` : `${comp.demandDeltaPercent}%`}
                    </span>
                  )}
                </div>
                
                <div className="flex items-baseline gap-3">
                  <div className="font-mono">
                    <span className="text-[10px] text-slate-500 block">基准原需</span>
                    <span className="text-sm font-semibold text-slate-400 line-through tabular-nums">
                      {comp.baselineTotalFeedDemand} /s
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 mt-2" />
                  <div className="font-mono">
                    <span className="text-[10px] text-slate-400 block">增产现需</span>
                    <span className={`text-lg font-bold tabular-nums ${
                      isSpeed ? 'text-rose-400' : isOutput ? 'text-emerald-400' : 'text-slate-100'
                    }`}>
                      {comp.currentTotalFeedDemand} /s
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  {comp.savingsNote}
                </p>
              </div>

              {/* Box 2: Total Output Production Delta */}
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-950">
                <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                  <span>理论成品出率 (Production Rate)</span>
                  {comp.outputDeltaPercent > 0 && (
                    <span className="flex items-center gap-0.5 font-bold font-mono text-xs text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded">
                      <TrendingUp className="w-3 h-3" />
                      +{comp.outputDeltaPercent}%
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-3">
                  <div className="font-mono">
                    <span className="text-[10px] text-slate-500 block">原成品率</span>
                    <span className="text-sm font-semibold text-slate-400 tabular-nums">
                      {comp.baselineOutputPerMin} /min
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 mt-2" />
                  <div className="font-mono">
                    <span className="text-[10px] text-slate-400 block">现成品率</span>
                    <span className="text-lg font-bold text-emerald-400 tabular-nums">
                      {comp.currentOutputPerMin} /min
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  {!isOutput && !isSpeed ? '未启用有效增产模式。' : `涂覆后成品产量提升，制造台产出效率为 ${(comp.currentOutputPerMin / Math.max(1, comp.baselineOutputPerMin)).toFixed(2)}x 倍速。`}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================================== */}
      {/* 2.8 DEDICATED MACHINE OUTPUT & POWER CONSUMPTION (MW) MODULE */}
      {/* ============================================================== */}
      {result.powerStats && (
        <PowerYieldCalculatorModule
          result={result}
          inputState={inputState}
          onChangeInput={onChangeInput}
        />
      )}

      {/* ============================================================== */}
      {/* 3. MATERIAL CONSUMPTION & SORTER RECOMMENDER (WITH REAL IN-GAME ICONS) */}
      {/* ============================================================== */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-xs">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">原料消耗与分拣器 (爪带) 智能推荐</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">单设施总进料: {feedRatePerFacilityTotal} /s</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 text-slate-400 text-[11px]">
                <th className="py-2 px-1">原料项目</th>
                <th className="py-2 px-1">配方单耗</th>
                <th className="py-2 px-1">单台速率</th>
                <th className="py-2 px-1">整线需求</th>
                <th className="py-2 px-1">推荐分拣器 (含游戏图标)</th>
                <th className="py-2 px-1">跨距与通量</th>
                <th className="py-2 px-1 text-right">抓取状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {materials.map(mat => {
                const itemData = DSP_ITEMS[mat.itemId];
                return (
                  <tr key={mat.itemId} className="hover:bg-slate-800/30 transition-colors">
                    {/* Material Icon & Name */}
                    <td className="py-2.5 px-1">
                      <div className="flex items-center gap-2">
                        <DSPItemIcon item={itemData} size={24} showTooltip />
                        <span className="font-medium text-slate-200">{mat.itemName}</span>
                      </div>
                    </td>

                    {/* Count per craft */}
                    <td className="py-2.5 px-1 font-mono text-slate-400 tabular-nums">
                      {mat.countPerCraft} 个/次
                    </td>

                    {/* Single facility rate */}
                    <td className="py-2.5 px-1 font-mono text-cyan-400 font-semibold tabular-nums">
                      {mat.feedRatePerFacility} /s
                    </td>

                    {/* Total line demand */}
                    <td className="py-2.5 px-1 font-mono text-slate-300 tabular-nums">
                      {mat.totalFeedRateAllFacilities} /s
                    </td>

                    {/* Recommended Sorter with IN-GAME ITEM ICON */}
                    <td className="py-2.5 px-1">
                      <div className="flex items-center gap-2">
                        <DSPSorterIcon sorter={mat.recommendedSorter} size={24} showTooltip />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span 
                              className="w-2 h-2 rounded-full inline-block shrink-0" 
                              style={{ backgroundColor: mat.recommendedSorter.hexColor }} 
                            />
                            <span className="font-semibold text-slate-100 text-xs leading-none">
                              {mat.recommendedSorter.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {mat.recommendedSorter.colorName} · 运能 {mat.sorterThroughput}/s
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Distance & Throughput */}
                    <td className="py-2.5 px-1 font-mono text-[11px] text-slate-400">
                      跨 {mat.recommendedDistance} 格 ({mat.sorterThroughput} /s)
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-1 text-right">
                      {mat.isBottleneck ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-medium bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/60">
                          <AlertOctagon className="w-3.5 h-3.5" />
                          抓取失速
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          适配
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Sorters Icon Legend Bar */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-slate-400 text-[11px] font-medium">游戏内分拣爪系列规格:</span>
            {DSP_SORTERS.map(s => (
              <div 
                key={s.tier} 
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-950 border border-slate-800/80 text-[11px]"
                title={`${s.name} · 基础 ${s.baseTripsPerSec * s.baseStack}/s`}
              >
                <DSPSorterIcon sorter={s} size={16} />
                <span className="text-slate-300 font-mono">{s.name}</span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.hexColor }} />
              </div>
            ))}
          </div>

          <span className="text-[10px] text-slate-500 font-mono">
            Wiki: 分拣爪随跨距衰减 (1格/2格/3格 = 100%/50%/33.3%)
          </span>
        </div>

        {materials.some(m => m.isBottleneck) && (
          <div className="mt-2 text-[11px] text-rose-300/90 bg-rose-950/30 p-2 rounded-lg border border-rose-900/40">
            提示：原料抓取失速时，游戏内可在该建筑侧面并联安装第 2 条分拣爪，或者升级为白爪 (集装分拣器)。
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 4. HIGH-FIDELITY BELT SEQUENCE PATTERN & INTERLEAVED VISUALIZER */}
      {/* ============================================================== */}
      <BeltSequencePattern
        sequenceInfo={result.beltSequenceInfo}
        belt={currentBelt}
        beltStackLayers={currentLayers}
        materials={materials}
        feedRateTotal={totalFeedRateDemand}
      />

      {/* Buffer Storage & Anti-Deadlock Return Line Stats */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-xs">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-2">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">始端缓冲与回流规划（估算）</h3>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[11px]">约 10 秒消耗量的缓冲参考</span>
            <div className="font-mono text-base font-bold text-cyan-300 mt-0.5">
              {bufferStorage.recommendedItems} <span className="text-xs font-normal text-slate-400">items</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              建议配备 {bufferStorage.recommendedChests} 个小型储物仓作为进料缓冲
            </span>
          </div>

          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[11px]">入口未占用运力</span>
            <div className={`font-mono text-base font-bold mt-0.5 ${
              capacityAlert?.isOverLimit ? 'text-rose-400' : 'text-amber-300'
            }`}>
              {bufferStorage.residualReturnRate} <span className="text-xs font-normal text-slate-400">items/s</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {capacityAlert?.isOverLimit ? '⚠️ 入口需求超过配置容量' : '不代表实际回流流量，需检查回流与补料控制'}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. MATERIAL BELT OCCUPANCY & BOTTLENECK ANALYSIS (RECHARTS PIE) */}
      {/* ============================================================== */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">混带运力物料占比与阻塞瓶颈诊断</h3>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="text-slate-400">总负荷率:</span>
            <span className={`font-bold ${isBeltOverloaded ? 'text-rose-400' : 'text-cyan-400'}`}>
              {beltLoadPercentage}%
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">满带运力:</span>
            <span className="text-slate-200">{beltCapacity} /s</span>
          </div>
        </div>

        {/* Dynamic Recharts Pie Chart & Bottleneck Legend Grid */}
        {(() => {
          // Predefined visually distinct futuristic neon palette for materials
          const PALETTE = ['#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6'];

          // Calculate unused belt capacity margin
          const unallocatedRate = Math.max(0, beltCapacity - totalFeedRateDemand);
          const unallocatedPercent = Number(Math.max(0, 100 - beltLoadPercentage).toFixed(1));

          // Prepare chart data items
          const chartData = materials.map((m, idx) => {
            const pct = Number(((m.totalFeedRateAllFacilities / beltCapacity) * 100).toFixed(1));
            return {
              name: m.itemName,
              itemId: m.itemId,
              value: Number(m.totalFeedRateAllFacilities.toFixed(2)),
              percentage: pct,
              color: PALETTE[idx % PALETTE.length],
              isBottleneck: m.isBottleneck,
              isMaxShare: false,
              rate: m.totalFeedRateAllFacilities,
            };
          });

          // Identify the material that occupies the largest fraction of the belt
          let maxShareIdx = -1;
          let maxVal = -1;
          chartData.forEach((d, i) => {
            if (d.value > maxVal) {
              maxVal = d.value;
              maxShareIdx = i;
            }
          });
          if (maxShareIdx >= 0) {
            chartData[maxShareIdx].isMaxShare = true;
          }

          // If belt is not 100% loaded, add the safety return / idle margin slice
          const fullPieData = [...chartData];
          if (unallocatedRate > 0.05) {
            fullPieData.push({
              name: '未占用入口运力',
              itemId: 'margin',
              value: Number(unallocatedRate.toFixed(2)),
              percentage: unallocatedPercent,
              color: '#334155', // slate-700
              isBottleneck: false,
              isMaxShare: false,
              rate: unallocatedRate,
            });
          }

          const primaryBottleneck = chartData[maxShareIdx];

          return (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Pie Chart Canvas (Responsive) */}
              <div className="md:col-span-5 h-56 flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const item = DSP_ITEMS[data.itemId];
                          return (
                            <div className="bg-slate-950/95 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                              <div className="flex items-center gap-1.5 font-bold text-white">
                                {item ? <DSPItemIcon item={item} size={16} /> : null}
                                <span>{data.name}</span>
                              </div>
                              <div className="font-mono text-slate-300">
                                带宽占用: <span className="text-cyan-400 font-bold">{data.percentage}%</span>
                              </div>
                              <div className="font-mono text-slate-400 text-[11px]">
                                需求通量: {data.value} items/s
                              </div>
                              {data.isMaxShare && (
                                <div className="text-[10px] text-amber-400 font-semibold pt-1 border-t border-slate-800">
                                  ⚠️ 占用传送带带宽最多的主要负荷
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Pie
                      data={fullPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      stroke="#0f172a"
                      strokeWidth={2}
                    >
                      {fullPieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          opacity={entry.itemId === 'margin' ? 0.45 : 1}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Donut Center Summary */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-slate-400 font-medium">总占用</span>
                  <span className={`text-base font-bold font-mono ${isBeltOverloaded ? 'text-rose-400' : 'text-cyan-400'}`}>
                    {beltLoadPercentage}%
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    {totalFeedRateDemand} / {beltCapacity}
                  </span>
                </div>
              </div>

              {/* Material Breakdown & Bottleneck Diagnostic Insights */}
              <div className="md:col-span-7 space-y-3">
                {/* Bottleneck Diagnostic Banner */}
                {primaryBottleneck && (
                  <div className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                    isBeltOverloaded 
                      ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300'
                  }`}>
                    <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                      isBeltOverloaded ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                    }`} />
                    <div className="space-y-0.5 leading-snug">
                      <div className="font-semibold text-white flex items-center gap-1.5 flex-wrap">
                        <span>带宽主要负荷：</span>
                        <span className="text-amber-300 font-mono">【{primaryBottleneck.name}】</span>
                        <span className="text-[10px] bg-amber-950/80 border border-amber-800 text-amber-300 px-1.5 py-0.2 rounded font-mono">
                          占满带运力 {primaryBottleneck.percentage}%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {isBeltOverloaded 
                          ? `当前混带已超载！主要原因是【${primaryBottleneck.name}】需求达 ${primaryBottleneck.value}/s。若混带发生堵塞，该物料将最先引发饥饿或闭环反涌。`
                          : `若需继续扩建设施，【${primaryBottleneck.name}】将是最早触顶导致运力耗尽的物料，请优先关注其供料充足度与分拣抓取层级。`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Material Shares List */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between pb-1 border-b border-slate-800/60">
                    <span>物料配比占比明细</span>
                    <span className="font-mono text-[10px]">带宽占比 · 供给需求</span>
                  </div>

                  {chartData.map(item => {
                    const dspItem = DSP_ITEMS[item.itemId];
                    return (
                      <div 
                        key={item.itemId} 
                        className="flex items-center justify-between text-xs p-1.5 bg-slate-950/50 rounded-lg border border-slate-800/60 hover:bg-slate-950/80 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span 
                            className="w-2.5 h-2.5 rounded-xs shrink-0 shadow-xs" 
                            style={{ backgroundColor: item.color }} 
                          />
                          <DSPItemIcon item={dspItem} size={16} />
                          <span className="font-medium text-slate-200 truncate">
                            {item.name}
                          </span>
                          {item.isMaxShare && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded font-mono shrink-0">
                              主要负荷
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 font-mono shrink-0">
                          <span className="text-slate-400 text-[11px]">
                            {item.value} /s
                          </span>
                          <span className="font-bold text-cyan-300 min-w-12 text-right">
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Safety Return Margin Indicator */}
                  {unallocatedRate > 0.05 && (
                    <div className="flex items-center justify-between text-xs p-1.5 bg-slate-950/30 rounded-lg border border-slate-800/40 opacity-75">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-xs shrink-0 bg-slate-600" />
                        <span className="text-slate-400 text-[11px] truncate">
                          入口空余带宽（非实际回流）
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono shrink-0 text-slate-500">
                        <span className="text-[11px]">{unallocatedRate.toFixed(1)} /s</span>
                        <span className="min-w-12 text-right text-slate-400">{unallocatedPercent}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ============================================================== */}
      {/* 6. ARRAY POWER CONSUMPTION & POWER POLE TOPOLOGY MODULE */}
      {/* ============================================================== */}
      {result.powerStats && (
        <PowerStatsCard
          powerStats={result.powerStats}
          inputState={inputState}
          proliferatorMode={inputState?.proliferatorMode}
          proliferatorTier={inputState?.proliferatorTier}
        />
      )}
    </div>
  );
};
