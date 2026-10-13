import React from 'react';
import { 
  X, 
  Settings2, 
  Layers, 
  Zap, 
  Upload, 
  RotateCcw, 
  ShieldCheck, 
  Sliders,
  CheckCircle2,
  Box,
  Compass
} from 'lucide-react';
import { 
  DSP_BELTS, 
  PROLIFERATOR_CONFIGS, 
  importCustomGameData 
} from '../data/dspData';
import { CalculationInput } from '../engine/calculator';
import { DSPBeltIcon, DSPSorterIcon } from './DSPItemIcon';

interface GlobalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  inputState: CalculationInput;
  onChangeInput: (updater: (prev: CalculationInput) => CalculationInput) => void;
  onResetDefaults: () => void;
}

export const GlobalDrawer: React.FC<GlobalDrawerProps> = ({
  isOpen,
  onClose,
  inputState,
  onChangeInput,
  onResetDefaults,
}) => {
  const [importNotice, setImportNotice] = React.useState<string | null>(null);

  const {
    belt,
    beltStackLayers,
    sorterStackTechLevel,
    isTechLocked,
    proliferatorTier,
    proliferatorMode,
    redundancyPercent,
    preferredSorterDistance = 1,
  } = inputState;

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const count = importCustomGameData(json);
        if (count > 0) {
          setImportNotice(`已成功载入 ${count} 个扩展/Mod 配方！`);
          setTimeout(() => setImportNotice(null), 3500);
        } else {
          setImportNotice('未识别到配方数据，请确认符合 game_data 格式');
          setTimeout(() => setImportNotice(null), 3500);
        }
      } catch (err) {
        setImportNotice('JSON 格式有误，导入失败');
        setTimeout(() => setImportNotice(null), 3500);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dark backdrop overlay */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-200"
      />

      {/* Drawer Panel */}
      <aside 
        className="relative w-full max-w-md h-full bg-[#0b0e17] border-l border-slate-800 shadow-2xl flex flex-col z-10 text-slate-200 overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#07090e]">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              全局设定 (FactorioLab 抽屉架构)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md transition"
            title="关闭侧边栏"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          {importNotice && (
            <div className="p-2.5 bg-cyan-950/80 border border-cyan-500/60 rounded-lg text-cyan-200 flex items-center gap-2 text-[11px]">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{importNotice}</span>
            </div>
          )}

          {/* Section 1: Conveyor Belt & Cargo Stacking */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold border-b border-slate-800 pb-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>1. 传送带规格与集装层数</span>
            </div>

            <div>
              <label className="text-slate-400 block mb-1.5 text-[11px]">传送带默认等级</label>
              <div className="grid grid-cols-3 gap-2">
                {DSP_BELTS.map(b => (
                  <button
                    key={b.tier}
                    type="button"
                    onClick={() => onChangeInput(prev => ({ ...prev, belt: b, customFacilityCount: undefined }))}
                    className={`p-2 rounded-lg border text-center transition flex flex-col items-center justify-between gap-1 ${
                      belt.tier === b.tier
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-semibold shadow-xs'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <DSPBeltIcon belt={b} size={22} />
                    <div className="text-xs truncate">{b.name.split(' ')[0]}</div>
                    <div className="font-mono text-[10px] text-cyan-400">{b.baseSpeed} items/s</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 text-[11px]">
                <span className="text-slate-400">物流集装堆叠层数 (科技)</span>
                <span className="font-mono text-cyan-300 font-bold">{beltStackLayers} 层 ({belt.baseSpeed * beltStackLayers} items/s)</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map(layer => (
                  <button
                    key={layer}
                    type="button"
                    onClick={() => onChangeInput(prev => ({ ...prev, beltStackLayers: layer, customFacilityCount: undefined }))}
                    className={`py-1.5 text-xs font-mono rounded-md border text-center transition ${
                      beltStackLayers === layer
                        ? 'bg-cyan-400 text-slate-950 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {layer} 层
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Tech Lock & Sorter Mechanics */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold border-b border-slate-800 pb-1.5">
              <Compass className="w-3.5 h-3.5" />
              <span>2. 科技解锁与分拣抓取设定</span>
            </div>

            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DSPSorterIcon tier={4} size={20} />
                  <span className="text-slate-300 font-medium">白爪集装科技判定 (is_tech_locked)</span>
                </div>
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
                <p className="text-[11px] text-amber-300/90 leading-tight">
                  已开启初期未解锁惩罚：未解锁科技且不用白爪手动堆叠，进料吞吐将除以 4。
                </p>
              ) : (
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>集装分拣器 (白爪) 单次抓取量:</span>
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

            <div>
              <div className="flex items-center justify-between mb-1.5 text-[11px]">
                <span className="text-slate-400">分拣器默认跨格间距</span>
                <span className="font-mono text-cyan-300">{preferredSorterDistance} 格</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 3].map(dist => (
                  <button
                    key={dist}
                    type="button"
                    onClick={() => onChangeInput(prev => ({ ...prev, preferredSorterDistance: dist }))}
                    className={`py-1.5 text-xs font-mono rounded-md border text-center transition ${
                      preferredSorterDistance === dist
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-semibold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    跨 {dist} 格
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Proliferator & Safety Margin */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold border-b border-slate-800 pb-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>3. 增产剂策略与安全冗余度</span>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 text-[11px]">增产剂喷涂类型</label>
              <div className="grid grid-cols-2 gap-2">
                {PROLIFERATOR_CONFIGS.map(p => (
                  <button
                    key={p.tier}
                    type="button"
                    onClick={() => onChangeInput(prev => ({ ...prev, proliferatorTier: p.tier, customFacilityCount: undefined }))}
                    className={`p-2 rounded-lg border text-left transition ${
                      proliferatorTier === p.tier
                        ? 'bg-cyan-950/40 border-cyan-400 text-cyan-200 shadow-xs'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-medium truncate">{p.name.split(' ')[0]}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {p.tier === 0 ? '无效果' : `+${(p.extraSpeedBonus * 100).toFixed(0)}% 速`}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {proliferatorTier > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChangeInput(prev => ({ ...prev, proliferatorMode: 'output', customFacilityCount: undefined }))}
                  className={`p-2 rounded-lg border text-left transition ${
                    proliferatorMode === 'output'
                      ? 'bg-emerald-950/40 border-emerald-400 text-emerald-300 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs text-emerald-400">额外产出 (推荐)</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">原料进料速率不变</div>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeInput(prev => ({ ...prev, proliferatorMode: 'speed', customFacilityCount: undefined }))}
                  className={`p-2 rounded-lg border text-left transition ${
                    proliferatorMode === 'speed'
                      ? 'bg-cyan-950/40 border-cyan-400 text-cyan-200 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs text-cyan-400">额外速度</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">原料进料需求等比翻倍</div>
                </button>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="text-slate-400">运力容错与安全冗余</span>
                <span className="font-mono text-cyan-300 font-bold">{redundancyPercent}%</span>
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
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                <span>100% 极限</span>
                <span>110% 推荐防卡带</span>
                <span>130% 宽容度</span>
              </div>
            </div>
          </div>

          {/* Section 4: Data Import / Reset */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-xs font-medium">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>导入 Mod 数据 (GenesisBook / 自制 JSON)</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={onResetDefaults}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition text-xs font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重置为默认出厂设置</span>
            </button>
          </div>
        </div>

        {/* Drawer Footer (Sticky bottom) */}
        <div className="sticky bottom-0 z-20 px-5 py-3.5 border-t border-slate-800 bg-[#07090e]/95 backdrop-blur-md flex items-center justify-between text-xs shadow-xl mt-auto">
          <span className="text-slate-400 font-mono text-[11px]">设置即时生效</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-cyan-400 text-slate-950 font-bold rounded-lg hover:bg-cyan-300 transition shadow-md shadow-cyan-500/20 text-xs"
          >
            完成并应用
          </button>
        </div>
      </aside>
    </div>
  );
};
