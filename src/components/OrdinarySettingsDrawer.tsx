import React from 'react';
import { X, Settings2, Layers, Link2, Info, RotateCcw, Package } from 'lucide-react';
import type { ProductionInput } from '../engine/production';
import { DSP_BELTS } from '../data/dspData';
import { DSPBeltIcon } from './DSPItemIcon';

interface Props {
  isOpen: boolean;
  input: ProductionInput;
  onChange: (input: ProductionInput) => void;
  onClose: () => void;
  onReset: () => void;
}
export function OrdinarySettingsDrawer({ isOpen, input, onChange, onClose, onReset }: Props) {
  if (!isOpen) return null;
  const belt = DSP_BELTS.find(b => b.tier === input.beltTier)!;
  const capacity = belt.baseSpeed * input.beltStackLayers;
  return <div className="fixed inset-0 z-50 flex justify-start">
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs" onClick={onClose} />
    <aside role="dialog" aria-label="普通量化模式设定" className="relative z-10 w-full max-w-md h-full bg-[#0b0e17] border-r border-slate-800 shadow-2xl text-slate-200 overflow-hidden flex flex-col">
      <header className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#07090e]">
        <div className="flex items-center gap-2"><Settings2 className="w-4 h-4 text-cyan-400" /><h2 className="text-sm font-bold text-white">普通量化模式设定</h2></div>
        <button type="button" onClick={onClose} aria-label="关闭设定" className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
      </header>
      <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
        <div className="flex items-start gap-2 p-3 bg-cyan-950/30 border border-cyan-800/60 rounded-lg text-cyan-200"><Link2 className="w-4 h-4 shrink-0" /><p>与页面“物流估算”使用同一份配置，修改后即时更新量化结果中的带容量与物料带数</p></div>
        <section className="space-y-3">
          <h3 className="flex items-center gap-1.5 text-cyan-400 font-semibold border-b border-slate-800 pb-1.5"><Layers className="w-3.5 h-3.5" />1. 物流容量估算</h3>
          <label className="text-slate-400 block">传送带等级 · 决定每秒通过的货物位置数</label>
          <div className="grid grid-cols-3 gap-2">{DSP_BELTS.map(b => <button key={b.tier} type="button" aria-label={`普通模式传送带 B${b.tier}`} aria-pressed={input.beltTier === b.tier} onClick={() => onChange({ ...input, beltTier: b.tier as 1 | 2 | 3 })} className={`p-2 rounded-lg border text-center flex flex-col items-center gap-1.5 transition ${input.beltTier === b.tier ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'}`}>
            <DSPBeltIcon belt={b} size={28} showTooltip /><span>{b.name.split(' ')[0]}</span><span className="font-mono text-cyan-400">{b.baseSpeed} 位置/s</span>
          </button>)}</div>
          <div className="flex items-center justify-between text-slate-400"><span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5" />实际堆叠层数</span><span className="text-cyan-300 font-mono">{input.beltStackLayers} 件/位置</span></div>
          <div className="grid grid-cols-4 gap-1.5">{[1, 2, 3, 4].map(n => <button key={n} type="button" aria-label={`普通模式堆叠 ${n} 层`} aria-pressed={input.beltStackLayers === n} onClick={() => onChange({ ...input, beltStackLayers: n })} className={`py-1.5 rounded-md border font-mono transition ${input.beltStackLayers === n ? 'bg-cyan-400 border-cyan-400 text-slate-950 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>{n} 层</button>)}</div>
          <p className="text-slate-400 leading-relaxed">表示每个货物位置实际装载的物品数量，选择 4 层需在游戏中实现四层堆叠</p>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 space-y-2"><div className="flex items-center gap-2"><DSPBeltIcon belt={belt} size={22} /><span className="text-cyan-300 font-semibold">当前单带容量</span></div><output aria-label="普通模式单带容量" className="block text-lg font-mono text-cyan-300">{capacity} 件/s · {capacity * 60} 件/min</output><p className="text-slate-400 font-mono">{belt.baseSpeed} 位置/s × {input.beltStackLayers} 件/位置</p></div>
        </section>
        <section className="space-y-3">
          <h3 className="flex items-center gap-1.5 text-cyan-400 font-semibold border-b border-slate-800 pb-1.5"><Info className="w-3.5 h-3.5" />2. 关联结果与计算范围</h3>
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 space-y-2 leading-relaxed"><p>物料带数 = 物料需求（件/min）÷ 当前单带容量（件/min）</p><p>带速和堆叠用于物流估算，不改变目标产量、配方耗料、设备数量或生产建筑功耗，也不重新排列 2D 节点</p><p>建筑与增产剂在页面“配方与建筑”逐配方调整；原料供应与上限在“外部供应”设置</p></div>
        </section>
      </div>
      <footer className="px-5 py-3.5 border-t border-slate-800 bg-[#07090e]/95 space-y-3 text-xs"><p className="text-slate-500">恢复默认会重置普通模式的目标、配方与物流配置，可在页面撤销</p><div className="flex items-center justify-between gap-2"><span className="text-slate-400">设置即时生效</span><div className="flex gap-2"><button type="button" onClick={onReset} className="px-3 py-2 border border-slate-700 rounded text-slate-400 flex items-center gap-1"><RotateCcw className="w-3 h-3" />恢复默认</button><button type="button" onClick={onClose} className="px-4 py-2 bg-cyan-400 text-slate-950 font-bold rounded">完成并应用</button></div></div></footer>
    </aside>
  </div>;
}
