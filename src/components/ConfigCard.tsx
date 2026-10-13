import React, { useState } from 'react';
import { 
  Settings2, 
  Layers, 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  RotateCcw, 
  Info,
  Search,
  Upload,
  CheckCircle2
} from 'lucide-react';
import { 
  DSP_RECIPES, 
  DSP_FACILITIES, 
  DSP_BELTS, 
  DSP_ITEMS,
  PROLIFERATOR_CONFIGS, 
  DSPRecipe, 
  DSPFacility, 
  importCustomGameData,
  isMachineRecipe
} from '../data/dspData';
import { CalculationInput } from '../engine/calculator';
import { DSPItemIcon } from './DSPItemIcon';

interface ConfigCardProps {
  inputState: CalculationInput;
  onChangeInput: (updater: (prev: CalculationInput) => CalculationInput) => void;
  onOpenCustomRecipe: () => void;
  maxFacilitiesCalculated: number;
}

export const ConfigCard: React.FC<ConfigCardProps> = ({
  inputState,
  onChangeInput,
  onOpenCustomRecipe,
  maxFacilitiesCalculated,
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<'all' | 'mixed' | 'machine' | 'component' | 'matrix' | 'smelter' | 'chemical'>('all');
  const [importNotice, setImportNotice] = useState<string | null>(null);

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
  } = inputState;

  // Filter facilities by category
  const matchingFacilities = DSP_FACILITIES.filter(f => f.category === recipe.facilityCategory);
  const currentFacilityList = matchingFacilities.length > 0 ? matchingFacilities : DSP_FACILITIES;

  // Filter recipes based on tab and search
  const filteredRecipes = DSP_RECIPES.filter(r => {
    const matchText = r.name.toLowerCase().includes(recipeSearch.toLowerCase());
    if (!matchText) return false;
    if (selectedCategoryTab === 'all') return true;
    if (selectedCategoryTab === 'mixed') return r.inputs.length >= 2;
    if (selectedCategoryTab === 'machine') return isMachineRecipe(r);
    if (selectedCategoryTab === 'component') return r.facilityCategory === 'assembler' && !isMachineRecipe(r);
    if (selectedCategoryTab === 'matrix') return r.facilityCategory === 'lab';
    if (selectedCategoryTab === 'smelter') return r.facilityCategory === 'smelter';
    if (selectedCategoryTab === 'chemical') return (r.facilityCategory === 'chemical' || r.facilityCategory === 'refinery' || r.facilityCategory === 'collider') && !isMachineRecipe(r);
    return true;
  });

  // Top high-frequency preset recipes
  const presetRecipeNames = [
    '电磁矩阵',
    '处理器',
    '电动机',
    '超级磁场环',
    '小型运载火箭',
    '量子芯片',
  ];

  // Quick Preset finding
  const presetRecipes = presetRecipeNames.map(name => DSP_RECIPES.find(r => r.name.includes(name))).filter(Boolean) as DSPRecipe[];

  // Handle Mod data import
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const importedCount = importCustomGameData(json);
        if (importedCount > 0) {
          setImportNotice(`成功导入 ${importedCount} 个 Mod/扩展配方！已加入配方库。`);
          setTimeout(() => setImportNotice(null), 3000);
        } else {
          setImportNotice('未识别到有效的配方数据，请确认符合 game_data 格式');
          setTimeout(() => setImportNotice(null), 3000);
        }
      } catch (err) {
        setImportNotice('JSON 解析失败，文件格式有误');
        setTimeout(() => setImportNotice(null), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const primaryOutputItem = recipe.outputs[0] ? DSP_ITEMS[recipe.outputs[0].itemId] : null;

  return (
    <div className="space-y-4">
      {/* Card 1: Target Recipe & Facility */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white tracking-wide">目标配方与制造设施</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition cursor-pointer">
              <Upload className="w-3 h-3 text-cyan-400" />
              <span>导入Mod数据</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={onOpenCustomRecipe}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 border border-cyan-800/80 rounded transition"
            >
              <Plus className="w-3 h-3" />
              <span>自定义配方</span>
            </button>
          </div>
        </div>

        {importNotice && (
          <div className="mb-3 p-2 text-xs bg-cyan-950/80 border border-cyan-500/50 rounded-lg text-cyan-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{importNotice}</span>
          </div>
        )}

        {/* Quick Presets */}
        <div className="mb-3">
          <span className="text-[11px] text-slate-400 block mb-1.5">高频混带精选 (官方原版):</span>
          <div className="flex flex-wrap gap-1.5">
            {presetRecipes.map(r => {
              const isActive = recipe.id === r.id;
              const outItem = r.outputs[0] ? DSP_ITEMS[r.outputs[0].itemId] : null;

              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    const bestFac = DSP_FACILITIES.find(f => f.category === r.facilityCategory) || DSP_FACILITIES[0];
                    onChangeInput(prev => ({
                      ...prev,
                      recipe: r,
                      facility: bestFac,
                      customFacilityCount: undefined,
                    }));
                  }}
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 font-semibold shadow-xs'
                      : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                  }`}
                >
                  <DSPItemIcon item={outItem} size={16} />
                  <span>{r.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recipe Categories Tabs & Search */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-medium border-b border-slate-800/60">
            {[
              { id: 'all', label: `全部 (${DSP_RECIPES.length})` },
              { id: 'mixed', label: '多原料混带' },
              { id: 'machine', label: '机器设施 (制造台/熔炉)' },
              { id: 'component', label: '工业材料组件' },
              { id: 'smelter', label: '冶炼加工' },
              { id: 'chemical', label: '化工/精炼' },
              { id: 'matrix', label: '科研矩阵' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategoryTab(tab.id as any)}
                className={`px-2 py-1 rounded-md transition whitespace-nowrap ${
                  selectedCategoryTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={recipeSearch}
              onChange={e => setRecipeSearch(e.target.value)}
              placeholder="搜索配方名称 (如: 处理器, 蓝糖, 火箭, 磁场环...)"
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Current Active Recipe Selector */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>当前选中配方 ({filteredRecipes.length} 个结果)</span>
              <span className="font-mono text-cyan-400">基础周期: {recipe.craftTime}s</span>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
              <DSPItemIcon item={primaryOutputItem} size={32} />
              <div className="flex-1 min-w-0">
                <select
                  value={recipe.id}
                  onChange={e => {
                    const found = DSP_RECIPES.find(r => r.id === e.target.value);
                    if (found) {
                      const bestFac = DSP_FACILITIES.find(f => f.category === found.facilityCategory) || DSP_FACILITIES[0];
                      onChangeInput(prev => ({
                        ...prev,
                        recipe: found,
                        facility: bestFac,
                        customFacilityCount: undefined,
                      }));
                    }
                  }}
                  className="w-full bg-transparent border-0 text-slate-100 text-xs font-semibold focus:outline-none cursor-pointer truncate"
                >
                  {filteredRecipes.map(r => (
                    <option key={r.id} value={r.id} className="bg-slate-900 text-slate-200">
                      {r.name} ({r.inputs.length}原料 · {r.craftTime}s)
                    </option>
                  ))}
                </select>
                
                {/* Inputs Chips */}
                <div className="flex items-center gap-1.5 mt-1 overflow-x-auto">
                  <span className="text-[10px] text-slate-500 shrink-0">原料:</span>
                  {recipe.inputs.map(inp => {
                    const it = DSP_ITEMS[inp.itemId];
                    return (
                      <div key={inp.itemId} className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-[10px] text-slate-300 shrink-0">
                        <DSPItemIcon item={it} size={14} />
                        <span>{it ? it.name : inp.itemId} ×{inp.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Facility Selection */}
          <div>
            <label className="block text-slate-400 text-xs mb-1">推荐制造建筑类型与倍率</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {currentFacilityList.map(f => {
                const isSelected = facility.id === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onChangeInput(prev => ({ ...prev, facility: f, customFacilityCount: undefined }))}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500 text-cyan-200 shadow-xs'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-medium truncate">{f.name}</div>
                    <div className="flex items-center justify-between text-[11px] font-mono mt-0.5">
                      <span className="text-cyan-400 font-semibold">{f.speedMultiplier}x 速度</span>
                      <span className="text-slate-500">{f.powerMW} MW</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Conveyor Belt & Cargo Stacking Tech */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white tracking-wide">传送带运力与集装堆叠</h2>
          </div>
        </div>

        <div className="space-y-3.5 text-xs">
          {/* Belt Tier */}
          <div>
            <label className="block text-slate-400 mb-1.5">传送带规格</label>
            <div className="grid grid-cols-3 gap-2">
              {DSP_BELTS.map(b => {
                const isSelected = belt.tier === b.tier;
                return (
                  <button
                    key={b.tier}
                    type="button"
                    onClick={() => onChangeInput(prev => ({ ...prev, belt: b, customFacilityCount: undefined }))}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      isSelected
                        ? 'bg-slate-950 border-cyan-400 text-white shadow-sm shadow-cyan-500/20'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-medium text-xs truncate">{b.name.split(' ')[0]}</div>
                    <div className="font-mono text-cyan-400 text-[11px] mt-0.5">
                      {b.baseSpeed} items/s
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Belt Cargo Stack Layers */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-400">传送带堆叠层数 (科技等级联动)</label>
              <span className="font-mono text-cyan-400 font-bold">{beltStackLayers} 层堆叠 ({belt.baseSpeed * beltStackLayers} items/s)</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(layer => {
                const isSelected = beltStackLayers === layer;
                return (
                  <button
                    key={layer}
                    type="button"
                    onClick={() => onChangeInput(prev => ({ ...prev, beltStackLayers: layer, customFacilityCount: undefined }))}
                    className={`py-1.5 text-xs font-mono rounded-lg border text-center transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-semibold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {layer} 层
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sorter Tech & White Sorter Stacking Lock */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-300 font-medium">科技解锁与白爪手动堆叠状态</span>
              <button
                type="button"
                onClick={() => onChangeInput(prev => ({ ...prev, isTechLocked: !prev.isTechLocked }))}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  !isTechLocked ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    !isTechLocked ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            
            {isTechLocked ? (
              <div className="p-2 bg-amber-950/30 border border-amber-900/60 rounded text-amber-300 text-[11px] leading-relaxed">
                <span className="font-semibold block">已开启未解锁科技惩罚 (÷ 4)：</span>
                初期未解锁集装箱与分拣货物叠加科技且不手动堆叠，吞吐量将自动除以 4。
              </div>
            ) : (
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>集装分拣器 (白爪) 单次抓取叠加量:</span>
                <div className="flex items-center gap-1 font-mono">
                  {[2, 4, 6, 8].map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => onChangeInput(prev => ({ ...prev, sorterStackTechLevel: lvl }))}
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        sorterStackTechLevel === lvl
                          ? 'bg-cyan-400 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lvl}个
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sorter Preferred Distance */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-400">分拣器默认跨越格数</label>
              <span className="font-mono text-cyan-400">{preferredSorterDistance} 格间距</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map(dist => (
                <button
                  key={dist}
                  type="button"
                  onClick={() => onChangeInput(prev => ({ ...prev, preferredSorterDistance: dist }))}
                  className={`py-1.5 text-xs font-mono rounded-lg border text-center transition-all ${
                    preferredSorterDistance === dist
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-semibold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  跨 {dist} 格
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Advanced Proliferator & Redundancy (Collapsible) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-xs">
        <button
          type="button"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="w-full flex items-center justify-between text-left focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white tracking-wide">增产剂与容错冗余 (高阶工况)</h2>
          </div>
          {isAdvancedOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {isAdvancedOpen && (
          <div className="mt-4 pt-3 border-t border-slate-800 space-y-4 text-xs">
            {/* Proliferator Tier */}
            <div>
              <label className="block text-slate-400 mb-1.5">增产剂喷涂等级</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PROLIFERATOR_CONFIGS.map(p => {
                  const isSelected = proliferatorTier === p.tier;
                  return (
                    <button
                      key={p.tier}
                      type="button"
                      onClick={() => onChangeInput(prev => ({ ...prev, proliferatorTier: p.tier, customFacilityCount: undefined }))}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'bg-slate-950 border-cyan-400 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-medium truncate text-xs">{p.name.split(' ')[0]}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {p.tier === 0 ? '无效果' : `+${(p.extraSpeedBonus * 100).toFixed(0)}% 速`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Proliferator Strategy */}
            {proliferatorTier > 0 && (
              <div>
                <label className="block text-slate-400 mb-1.5">增产策略双分支</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onChangeInput(prev => ({ ...prev, proliferatorMode: 'output', customFacilityCount: undefined }))}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      proliferatorMode === 'output'
                        ? 'bg-emerald-950/30 border-emerald-400 text-emerald-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-semibold text-xs text-emerald-400">额外产出 (推荐)</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      进料消耗速率不变，产出提高 +{(PROLIFERATOR_CONFIGS[proliferatorTier].extraOutputBonus * 100).toFixed(1)}%
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangeInput(prev => ({ ...prev, proliferatorMode: 'speed', customFacilityCount: undefined }))}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      proliferatorMode === 'speed'
                        ? 'bg-cyan-950/40 border-cyan-400 text-cyan-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-semibold text-xs text-cyan-400">额外速度</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      工作速度倍增，进料需求等比成倍提升
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Redundancy Percent Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-400">运力容错与安全冗余</label>
                <span className="font-mono text-cyan-400 font-bold">{redundancyPercent}%</span>
              </div>
              <input
                type="range"
                min="100"
                max="130"
                step="5"
                value={redundancyPercent}
                onChange={e => onChangeInput(prev => ({ ...prev, redundancyPercent: Number(e.target.value), customFacilityCount: undefined }))}
                className="w-full accent-cyan-400 bg-slate-950 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span>100% (极限压榨)</span>
                <span>110% (标准防卡带)</span>
                <span>130% (宽容度缓存)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card 4: Facility Count Manual Stepper */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-xs">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">实际安装设施数量</span>
            <span className="text-lg font-mono font-bold text-white tabular-nums">
              {customFacilityCount !== undefined ? customFacilityCount : maxFacilitiesCalculated} 台
            </span>
            {customFacilityCount !== undefined && customFacilityCount !== maxFacilitiesCalculated && (
              <span className="text-[11px] text-amber-400 ml-2 font-mono">
                (理论极限: {maxFacilitiesCalculated} 台)
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const current = customFacilityCount !== undefined ? customFacilityCount : maxFacilitiesCalculated;
                onChangeInput(prev => ({ ...prev, customFacilityCount: Math.max(1, current - 1) }));
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold text-sm"
            >
              -
            </button>
            <button
              type="button"
              onClick={() => {
                const current = customFacilityCount !== undefined ? customFacilityCount : maxFacilitiesCalculated;
                onChangeInput(prev => ({ ...prev, customFacilityCount: current + 1 }));
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold text-sm"
            >
              +
            </button>
            {customFacilityCount !== undefined && (
              <button
                type="button"
                onClick={() => onChangeInput(prev => ({ ...prev, customFacilityCount: undefined }))}
                className="p-2 rounded-lg bg-slate-800/80 text-cyan-400 hover:bg-slate-700 transition"
                title="重置为理论满载台数"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
