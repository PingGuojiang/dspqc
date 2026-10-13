import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Sparkles, 
  Layers, 
  Sliders, 
  Plus, 
  Check, 
  Cpu,
  RotateCcw,
  Zap,
  ArrowRight,
  Factory,
  Wrench
} from 'lucide-react';
import { 
  DSP_RECIPES, 
  DSP_FACILITIES, 
  DSP_ITEMS, 
  DSPRecipe, 
  DSPFacility,
  isMachineRecipe,
  getMachineSubcategory,
  MachineSubcategory
} from '../data/dspData';
import { CalculationInput, CalculationResult } from '../engine/calculator';
import { DSPItemIcon, DSPBeltIcon } from './DSPItemIcon';

export type RecipeCategoryTab = 
  | 'mixed' 
  | 'machine' 
  | 'component' 
  | 'smelter' 
  | 'chemical' 
  | 'matrix' 
  | 'all';

export type MachineSubFilter = 'all' | 'craft' | 'logistics' | 'power' | 'production' | 'defense';

interface CompactHeaderPanelProps {
  inputState: CalculationInput;
  result: CalculationResult;
  onChangeInput: (updater: (prev: CalculationInput) => CalculationInput) => void;
  onOpenCustomRecipe: () => void;
  onOpenGlobalDrawer: () => void;
}

export const CompactHeaderPanel: React.FC<CompactHeaderPanelProps> = ({
  inputState,
  result,
  onChangeInput,
  onOpenCustomRecipe,
  onOpenGlobalDrawer,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<RecipeCategoryTab>('mixed');
  const [machineSubFilter, setMachineSubFilter] = useState<MachineSubFilter>('all');

  const { recipe, facility, belt, beltStackLayers, customFacilityCount } = inputState;
  const primaryOutputItem = recipe.outputs[0] ? DSP_ITEMS[recipe.outputs[0].itemId] : null;

  // Memoized counts for each category tab
  const categoryCounts = React.useMemo(() => {
    let mixed = 0;
    let machine = 0;
    let component = 0;
    let smelter = 0;
    let chemical = 0;
    let matrix = 0;

    for (const r of DSP_RECIPES) {
      if (r.inputs.length >= 2) mixed++;
      if (isMachineRecipe(r)) {
        machine++;
      } else if (r.facilityCategory === 'assembler') {
        component++;
      } else if (r.facilityCategory === 'smelter') {
        smelter++;
      } else if (r.facilityCategory === 'chemical' || r.facilityCategory === 'refinery' || r.facilityCategory === 'collider') {
        chemical++;
      } else if (r.facilityCategory === 'lab') {
        matrix++;
      }
    }

    return {
      mixed,
      machine,
      component,
      smelter,
      chemical,
      matrix,
      total: DSP_RECIPES.length,
    };
  }, []);

  // Memoized counts for machine sub-categories
  const machineSubCounts = React.useMemo(() => {
    const counts = { all: 0, craft: 0, logistics: 0, power: 0, production: 0, defense: 0 };
    for (const r of DSP_RECIPES) {
      if (isMachineRecipe(r)) {
        counts.all++;
        const sub = r.machineSubcategory || getMachineSubcategory(r);
        if (counts[sub] !== undefined) counts[sub]++;
      }
    }
    return counts;
  }, []);

  // Filter recipes for the expanded matrix
  const filteredRecipes = DSP_RECIPES.filter(r => {
    const matchText = r.name.toLowerCase().includes(search.toLowerCase());
    if (!matchText) return false;

    if (selectedCategoryTab === 'all') return true;
    if (selectedCategoryTab === 'mixed') return r.inputs.length >= 2;
    if (selectedCategoryTab === 'machine') {
      if (!isMachineRecipe(r)) return false;
      if (machineSubFilter === 'all') return true;
      const sub = r.machineSubcategory || getMachineSubcategory(r);
      return sub === machineSubFilter;
    }
    if (selectedCategoryTab === 'component') {
      return r.facilityCategory === 'assembler' && !isMachineRecipe(r);
    }
    if (selectedCategoryTab === 'smelter') {
      return r.facilityCategory === 'smelter';
    }
    if (selectedCategoryTab === 'chemical') {
      return (r.facilityCategory === 'chemical' || r.facilityCategory === 'refinery' || r.facilityCategory === 'collider') && !isMachineRecipe(r);
    }
    if (selectedCategoryTab === 'matrix') {
      return r.facilityCategory === 'lab' || r.outputs.some(o => ['6001', '6002', '6003', '6004', '6005', '6006'].includes(o.itemId));
    }
    return true;
  });

  // Current category facilities
  const matchingFacilities = DSP_FACILITIES.filter(f => f.category === recipe.facilityCategory);
  const facilityList = matchingFacilities.length > 0 ? matchingFacilities : DSP_FACILITIES;

  const handleSelectRecipe = (selected: DSPRecipe) => {
    const bestFac = DSP_FACILITIES.find(f => f.category === selected.facilityCategory) || DSP_FACILITIES[0];
    onChangeInput(prev => ({
      ...prev,
      recipe: selected,
      facility: bestFac,
      customFacilityCount: undefined,
    }));
    // Auto collapse on selection for optimal viewport presence
    setIsExpanded(false);
  };

  return (
    <div className="bg-[#161b26] border-2 border-[#2d3748] rounded-xl shadow-[5px_5px_0px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300">
      {/* ============================================================== */}
      {/* 1. COMPACT ONE-LINE SUMMARY BAR (ALWAYS VISIBLE & CLICKABLE) */}
      {/* ============================================================== */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-slate-900/60 transition select-none bg-[#0e121c]"
      >
        {/* Left: Active Product & Recipe Summary */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-black border-2 border-[#00f0ff] p-0.5 flex items-center justify-center shadow-[2px_2px_0px_#00f0ff]">
            <DSPItemIcon item={primaryOutputItem} size={24} />
          </div>
          
          <div className="flex flex-wrap items-baseline gap-2 min-w-0">
            <span className="text-sm font-bold text-white tracking-wide truncate">
              {recipe.name}
            </span>
            <span className="pixel-label">
              CYCLE: {recipe.craftTime}s
            </span>
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              ({recipe.inputs.length}原料)
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-800/60 px-1.5 py-0.5 rounded">
              {facility.name} ({facility.speedMultiplier}x)
            </span>
            <span className="text-slate-600 hidden md:inline">|</span>
            <span className="text-[11px] font-mono text-slate-300 hidden md:flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-1.5 py-0.5 rounded">
              <DSPBeltIcon belt={belt} size={14} />
              <span>{belt.name.split(' ')[0]} ({beltStackLayers}层 · {result.beltCapacity}/s)</span>
            </span>

            {/* Proliferator Pill in Collapsed Bar */}
            <span className="text-slate-600 hidden lg:inline">|</span>
            <div
              onClick={e => {
                e.stopPropagation();
                onChangeInput(prev => {
                  if (prev.proliferatorTier === 0) {
                    return { ...prev, proliferatorTier: 3, proliferatorMode: 'output', customFacilityCount: undefined };
                  }
                  if (prev.proliferatorMode === 'output') {
                    return { ...prev, proliferatorMode: 'speed', customFacilityCount: undefined };
                  }
                  return { ...prev, proliferatorTier: 0, proliferatorMode: 'none', customFacilityCount: undefined };
                });
              }}
              className={`hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition select-none border ${
                inputState.proliferatorTier === 0
                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  : inputState.proliferatorMode === 'output'
                    ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 shadow-xs hover:border-emerald-400'
                    : 'bg-amber-950/60 border-amber-500/60 text-amber-300 shadow-xs hover:border-amber-400'
              }`}
              title="点击在 [未喷涂 / 额外产出 / 额外速度] 之间快速切换"
            >
              <Zap className={`w-3 h-3 ${inputState.proliferatorTier > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
              {inputState.proliferatorTier === 0 ? (
                <span>未喷涂增产剂</span>
              ) : inputState.proliferatorMode === 'output' ? (
                <span>额外产出 (-25%原料)</span>
              ) : (
                <span>额外速度 (进料{result.proliferatorComparison.baselineTotalFeedDemand}→{result.proliferatorComparison.currentTotalFeedDemand}/s)</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Facility Counter + Expand Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div 
            onClick={e => e.stopPropagation()} 
            className="flex items-center gap-1.5 bg-[#0e121c] px-2.5 py-1 rounded-lg border-2 border-[#2d3748] shadow-[2px_2px_0px_rgba(0,0,0,0.5)]"
          >
            <span className="text-[10px] text-slate-400 font-mono">极限:</span>
            <span className="font-mono text-xs font-bold text-emerald-400 tabular-nums">
              {result.maxFacilitiesLimit}台
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-[10px] text-slate-400 font-mono">实际:</span>
            <button
              type="button"
              onClick={() => {
                const cur = customFacilityCount !== undefined ? customFacilityCount : result.maxFacilitiesLimit;
                onChangeInput(prev => ({ ...prev, customFacilityCount: Math.max(1, cur - 1) }));
              }}
              className="w-4 h-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded text-[10px] font-bold active:translate-x-0.5 active:translate-y-0.5"
            >
              -
            </button>
            <span className="font-mono text-xs font-bold text-[#fbbf24] tabular-nums px-0.5">
              {customFacilityCount !== undefined ? customFacilityCount : result.maxFacilitiesLimit}
            </span>
            <button
              type="button"
              onClick={() => {
                const cur = customFacilityCount !== undefined ? customFacilityCount : result.maxFacilitiesLimit;
                onChangeInput(prev => ({ ...prev, customFacilityCount: cur + 1 }));
              }}
              className="w-4 h-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded text-[10px] font-bold active:translate-x-0.5 active:translate-y-0.5"
            >
              +
            </button>
            {customFacilityCount !== undefined && (
              <button
                type="button"
                onClick={() => onChangeInput(prev => ({ ...prev, customFacilityCount: undefined }))}
                className="text-cyan-400 hover:text-cyan-300 ml-0.5"
                title="重置为满载台数"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            type="button"
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 border border-cyan-800/80 rounded transition"
          >
            <span>{isExpanded ? '收起' : '换配方'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. EXPANDED FACTORIOLAB-STYLE HIGH-DENSITY GRID MATRIX */}
      {/* ============================================================== */}
      {isExpanded && (
        <div className="p-4 border-t border-slate-800/90 space-y-3 bg-[#0b0e17]">
          {/* Quick Facility Pills Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/60">
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <span className="text-slate-400 text-[11px] shrink-0 font-medium">制造设施倍率:</span>
              {facilityList.map(f => {
                const isSelected = facility.id === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onChangeInput(prev => ({ ...prev, facility: f, customFacilityCount: undefined }))}
                    className={`px-2.5 py-1 rounded text-xs transition whitespace-nowrap font-mono ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 font-semibold shadow-xs'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f.name.split(' ')[0]} ({f.speedMultiplier}x)
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenCustomRecipe}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 border border-cyan-800/80 rounded transition"
              >
                <Plus className="w-3 h-3" />
                <span>新建自定义配方</span>
              </button>

              <button
                type="button"
                onClick={onOpenGlobalDrawer}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition"
              >
                <Sliders className="w-3 h-3 text-cyan-400" />
                <span>全局设置</span>
              </button>
            </div>
          </div>

          {/* Quick Proliferator Mode Comparison Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px] shrink-0 font-medium flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                增产剂模式:
              </span>
              <div className="flex items-center gap-1 font-mono">
                <button
                  type="button"
                  onClick={() => onChangeInput(prev => ({ ...prev, proliferatorTier: 0, customFacilityCount: undefined }))}
                  className={`px-2 py-1 rounded text-xs transition ${
                    inputState.proliferatorTier === 0
                      ? 'bg-slate-700 text-white font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  未喷涂
                </button>
                <button
                  type="button"
                  onClick={() => onChangeInput(prev => ({
                    ...prev,
                    proliferatorTier: prev.proliferatorTier === 0 ? 3 : prev.proliferatorTier,
                    proliferatorMode: 'output',
                    customFacilityCount: undefined
                  }))}
                  className={`px-2 py-1 rounded text-xs transition flex items-center gap-1 ${
                    inputState.proliferatorTier > 0 && inputState.proliferatorMode === 'output'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400 font-bold shadow-xs'
                      : 'bg-slate-900 text-slate-400 hover:text-emerald-400 border border-slate-800'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>额外产出 (推荐)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeInput(prev => ({
                    ...prev,
                    proliferatorTier: prev.proliferatorTier === 0 ? 3 : prev.proliferatorTier,
                    proliferatorMode: 'speed',
                    customFacilityCount: undefined
                  }))}
                  className={`px-2 py-1 rounded text-xs transition flex items-center gap-1 ${
                    inputState.proliferatorTier > 0 && inputState.proliferatorMode === 'speed'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400 font-bold shadow-xs'
                      : 'bg-slate-900 text-slate-400 hover:text-amber-400 border border-slate-800'
                  }`}
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>额外速度</span>
                </button>
              </div>
            </div>

            {/* Differential Jump Badges */}
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-slate-400">进料压力变化:</span>
              <span className="text-slate-400 line-through">
                {result.proliferatorComparison.baselineTotalFeedDemand}/s
              </span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
              <span className={`font-bold px-1.5 py-0.5 rounded transition-all duration-300 ${
                inputState.proliferatorTier > 0 && inputState.proliferatorMode === 'speed'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                  : inputState.proliferatorTier > 0 && inputState.proliferatorMode === 'output'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-300'
              }`}>
                {result.proliferatorComparison.currentTotalFeedDemand}/s
                {result.proliferatorComparison.demandDeltaPercent !== 0 && (
                  <span className="ml-1 text-[10px]">
                    ({result.proliferatorComparison.demandDeltaPercent > 0 ? '+' : ''}
                    {result.proliferatorComparison.demandDeltaPercent}%)
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Search Bar & Category Tabs */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 overflow-x-auto text-[11px] pb-1 sm:pb-0">
                {[
                  { id: 'mixed', label: '混带推荐', count: categoryCounts.mixed, tag: '2+原料' },
                  { id: 'machine', label: '机器设施', count: categoryCounts.machine, isSpecial: true, tag: '制造台等' },
                  { id: 'component', label: '材料组件', count: categoryCounts.component },
                  { id: 'smelter', label: '冶炼加工', count: categoryCounts.smelter },
                  { id: 'chemical', label: '化工精炼', count: categoryCounts.chemical },
                  { id: 'matrix', label: '科研矩阵', count: categoryCounts.matrix },
                  { id: 'all', label: '全部', count: categoryCounts.total },
                ].map(tab => {
                  const isActive = selectedCategoryTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategoryTab(tab.id as RecipeCategoryTab);
                        if (tab.id === 'machine') {
                          setMachineSubFilter('all');
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs transition whitespace-nowrap flex items-center gap-1.5 border ${
                        isActive
                          ? tab.id === 'machine'
                            ? 'bg-amber-400 text-slate-950 font-bold border-amber-300 shadow-[1px_1px_0px_rgba(0,0,0,0.5)]'
                            : 'bg-cyan-400 text-slate-950 font-bold border-cyan-300 shadow-[1px_1px_0px_rgba(0,0,0,0.5)]'
                          : tab.id === 'machine'
                            ? 'bg-amber-950/30 border-amber-800/60 text-amber-300 hover:bg-amber-900/40 hover:text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                      }`}
                    >
                      {tab.id === 'machine' && <Factory className="w-3.5 h-3.5 shrink-0" />}
                      <span>{tab.label}</span>
                      <span className={`text-[10px] font-mono px-1 rounded-full ${
                        isActive 
                          ? 'bg-slate-950/20 text-slate-950 font-bold' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {tab.count}
                      </span>
                      {tab.tag && !isActive && (
                        <span className="hidden xl:inline text-[9px] text-slate-500 font-mono">
                          {tab.tag}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:w-52">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="搜索配方 (如: 制造台 / 熔炉)..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-cyan-500 font-sans shadow-inner placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Machine Subcategory Filter Bar (Visible when 'machine' tab is selected) */}
            {selectedCategoryTab === 'machine' && (
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#0f141f] border border-amber-900/40 rounded-lg text-xs animate-in fade-in duration-150">
                <span className="text-[11px] font-medium text-amber-400/90 flex items-center gap-1 pl-1 pr-1.5 shrink-0">
                  <Wrench className="w-3 h-3 text-amber-400" />
                  机器分类:
                </span>
                {[
                  { id: 'all', label: '全部机器', count: machineSubCounts.all },
                  { id: 'craft', label: '制造与采矿', desc: '制造台/熔炉/采矿机/抽水', count: machineSubCounts.craft },
                  { id: 'logistics', label: '物流与仓储', desc: '传送带/分拣器/物流站/机/船', count: machineSubCounts.logistics },
                  { id: 'production', label: '生产设施', desc: '化工厂/精炼厂/对撞机/分馏/研究站', count: machineSubCounts.production },
                  { id: 'power', label: '电力与能源', desc: '风/火/光/核/恒星/枢纽/电塔', count: machineSubCounts.power },
                  { id: 'defense', label: '太空与防卫', desc: '弹射器/发射井/炮台/防御塔', count: machineSubCounts.defense },
                ].map(sub => {
                  const isSubActive = machineSubFilter === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setMachineSubFilter(sub.id as MachineSubFilter)}
                      className={`px-2 py-0.5 rounded text-[11px] transition whitespace-nowrap font-sans flex items-center gap-1 border ${
                        isSubActive
                          ? 'bg-amber-500/25 text-amber-200 border-amber-400 font-semibold shadow-xs'
                          : 'bg-slate-900/80 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                      title={sub.desc}
                    >
                      <span>{sub.label}</span>
                      <span className={`text-[10px] font-mono px-1 rounded ${
                        isSubActive ? 'bg-amber-950/80 text-amber-300' : 'bg-slate-950 text-slate-500'
                      }`}>
                        {sub.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* High-Density FactorioLab Style Icon Grid */}
          <div className="max-h-56 overflow-y-auto p-1.5 bg-slate-950/70 border border-slate-800/80 rounded-lg">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
              {filteredRecipes.map(r => {
                const isSelected = recipe.id === r.id;
                const outItem = r.outputs[0] ? DSP_ITEMS[r.outputs[0].itemId] : null;
                const isMach = isMachineRecipe(r);

                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectRecipe(r)}
                    className={`flex items-center gap-2 p-1.5 rounded-lg text-left transition group ${
                      isSelected
                        ? 'bg-cyan-950/70 border-2 border-cyan-400 text-white shadow-sm ring-1 ring-cyan-400/50'
                        : isMach
                          ? 'bg-slate-900/70 border border-slate-800/90 text-slate-300 hover:bg-slate-800 hover:border-amber-500/40 hover:text-white'
                          : 'bg-slate-900/60 border border-slate-800/80 text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                    title={`${r.name} · 周期: ${r.craftTime}s · ${r.inputs.length} 项原料 · ${isMach ? '机器设施' : '工业材料'}`}
                  >
                    <div className="shrink-0 relative">
                      <DSPItemIcon item={outItem} size={26} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-medium truncate leading-tight group-hover:text-cyan-300 transition-colors">
                        {r.name}
                      </div>
                      <div className="text-[9px] font-mono text-slate-500 truncate flex items-center gap-1 mt-0.5">
                        <span>{r.inputs.length}料 · {r.craftTime}s</span>
                        {isMach && (
                          <span className="text-[8px] px-1 py-0.2 bg-amber-950/60 text-amber-400 border border-amber-800/50 rounded font-sans">
                            机器
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {filteredRecipes.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">
                无匹配配方，尝试切换分类或搜索其他关键词
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
