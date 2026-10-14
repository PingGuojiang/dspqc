import React, { useMemo } from 'react';
import { DSP_BELTS, DSP_FACILITIES, DSP_RECIPES, getRecipeMultipliers, isFacilityCompatible } from '../data/dspData';
import type { DSPRecipe } from '../data/dspData';
import { useDSPItems } from '../data/GameDataContext';
import { calculateProduction, chooseProductionRecipe } from '../engine/production';
import type { ProductionInput, ProductionStep } from '../engine/production';
import { ProductionFlowView } from './ProductionFlowView';
import { ProductionItemPicker } from './ProductionItemPicker';
import { DSPBeltIcon, DSPFacilityIcon, DSPFramedItemIcon as DSPItemIcon } from './DSPItemIcon';

export interface ProductionWorkspaceProps {
  input: ProductionInput;
  onChange: (next: ProductionInput) => void;
  view: 'schematic' | 'metrics';
  onViewChange: (view: 'schematic' | 'metrics') => void;
  onCopyToMixed: (step: ProductionStep) => void;
  recipes?: DSPRecipe[];
}
const panel = 'bg-[#0e121c] border-2 border-[#2d3748] rounded-xl px-4 py-2.5 shadow-[5px_5px_0px_rgba(0,0,0,0.5)] space-y-3';
const field = 'bg-slate-900/90 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 min-w-0 focus:border-cyan-400 focus:outline-none';
const button = 'bg-cyan-950/40 border border-cyan-800/60 rounded px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-900/40 hover:border-cyan-400 transition-colors';
const format = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 3 });

export function ProductionWorkspace({ input, onChange, view, onViewChange, onCopyToMixed, recipes = DSP_RECIPES }: ProductionWorkspaceProps) {
  const items = useDSPItems();
  const result = useMemo(() => calculateProduction(input, recipes), [input, recipes]);
  const options = useMemo(() => Array.from(new Set([...Object.entries(items).filter(([id, item]) => item.id === id).map(([id]) => id), ...recipes.flatMap(r => [...r.inputs, ...r.outputs].map(i => i.itemId))])).sort((a, b) => (items[a]?.name || a).localeCompare(items[b]?.name || b)), [items, recipes]);
  const itemName = (id: string) => items[id]?.name || id;
  const itemLabel = (id: string) => <div className="inline-flex min-w-0 items-center gap-2"><DSPItemIcon item={items[id]} size={24} /><span className="truncate">{itemName(id)}</span></div>;
  const update = (patch: Partial<ProductionInput>) => onChange({ ...input, ...patch });
  const setRecipeSettings = (id: string, patch: Partial<ProductionInput['recipeSettings'][string]>) => update({ recipeSettings: { ...input.recipeSettings, [id]: { ...input.recipeSettings[id], ...patch } } });
  const relevantItems = useMemo(() => {
    const reached = new Set<string>();
    const visit = (id: string) => {
      if (reached.has(id)) return;
      reached.add(id);
      if (input.externalSupplies.some(s => s.itemId === id)) return;
      const recipe = chooseProductionRecipe(id, recipes, input.recipeSelection);
      recipe?.inputs.forEach(i => visit(i.itemId));
    };
    input.targets.forEach(t => visit(t.itemId));
    return [...reached];
  }, [input.targets, input.externalSupplies, input.recipeSelection, recipes]);
  const beltCapacity = (DSP_BELTS.find(b => b.tier === input.beltTier)?.baseSpeed || 0) * input.beltStackLayers * 60;
  return <div className="space-y-4 text-slate-200">
    <div className="grid lg:grid-cols-2 gap-4">
      <section className={panel} aria-label="生产目标">
        <div className="flex justify-between items-center"><span className="pixel-label">TARGETS / MIN</span><button type="button" className={button} onClick={() => update({ targets: [...input.targets, { itemId: options.find(id => !input.targets.some(t => t.itemId === id)) || options[0], ratePerMinute: 60 }] })}>添加目标</button></div>
        {input.targets.map((target, index) => <div key={index} className="flex gap-2 items-center">
          <ProductionItemPicker label={`目标物品 ${index + 1}`} value={target.itemId} options={options} onChange={value => update({ targets: input.targets.map((t, i) => i === index ? { ...t, itemId: value } : t) })} />
          <input aria-label={`目标产量 ${index + 1}`} className={`${field} w-20 sm:w-28`} type="number" min="0" step="any" value={target.ratePerMinute} onChange={e => update({ targets: input.targets.map((t, i) => i === index ? { ...t, ratePerMinute: Number(e.target.value) } : t) })} />
          <button type="button" aria-label={`删除目标 ${index + 1}`} className={button} onClick={() => update({ targets: input.targets.filter((_, i) => i !== index) })}>×</button>
        </div>)}
      </section>
      <section className={panel} aria-label="外部供应">
        <div className="flex justify-between items-center"><span className="pixel-label">EXTERNAL_SUPPLY</span><button type="button" className={button} onClick={() => update({ externalSupplies: [...input.externalSupplies, { itemId: options.find(id => !input.externalSupplies.some(s => s.itemId === id)) || options[0] }] })}>添加外供</button></div>
        <p className="text-xs text-slate-400">原矿及尚未建模的采集/特殊产物默认外供；指定中间产物后截断其生产链，上限不足将计算失败。上限留空为不限，单位 /min。</p>
        {input.externalSupplies.map((supply, index) => <div key={index} className="flex gap-2 items-center">
          <ProductionItemPicker label={`外供物品 ${index + 1}`} value={supply.itemId} options={options} onChange={value => update({ externalSupplies: input.externalSupplies.map((s, i) => i === index ? { ...s, itemId: value } : s) })} />
          <input aria-label={`外供上限 ${index + 1}`} className={`${field} w-20 sm:w-28`} placeholder="不限" type="number" min="0" step="any" value={supply.limitPerMinute ?? ''} onChange={e => update({ externalSupplies: input.externalSupplies.map((s, i) => i === index ? { ...s, limitPerMinute: e.target.value === '' ? undefined : Number(e.target.value) } : s) })} />
          <button type="button" aria-label={`删除外供 ${index + 1}`} className={button} onClick={() => update({ externalSupplies: input.externalSupplies.filter((_, i) => i !== index) })}>×</button>
        </div>)}
      </section>
    </div>
    <section className={panel} aria-label="配方与建筑">
      <span className="pixel-label">RECIPES / FACILITIES</span>
      {relevantItems.map(id => {
        const alternatives = recipes.filter(r => r.outputs.some(o => o.itemId === id) && (DSP_FACILITIES.some(f => isFacilityCompatible(r, f)) || r.id === input.recipeSelection[id]));
        const recipe = input.externalSupplies.some(s => s.itemId === id) ? undefined : chooseProductionRecipe(id, recipes, input.recipeSelection);
        const defaultRecipe = chooseProductionRecipe(id, recipes);
        const selectRecipe = (value: string) => {
          const selection = { ...input.recipeSelection };
          if (value) selection[id] = value;
          else delete selection[id];
          update({ recipeSelection: selection });
        };
        const selector = alternatives.length ? <select aria-label={`配方 ${id}`} className={field} value={input.recipeSelection[id] || recipe?.id || ''} onChange={e => selectRecipe(e.target.value)}><option value="">{defaultRecipe ? `默认：${defaultRecipe.name}` : '外部供应（默认）'}</option>{alternatives.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select> : null;
        if (!recipe) return <div key={id} data-boundary-item={id} className="grid sm:grid-cols-5 gap-2 items-center border-t border-[#2d3748] pt-3"><div className="text-sm text-cyan-300 min-w-0">{itemLabel(id)}</div>{selector}<span className="text-xs text-slate-400 sm:col-span-3">{input.externalSupplies.some(s => s.itemId === id) ? '指定外部供应（生产链截断）' : '外部供应（默认）'}</span></div>;
        const settings = input.recipeSettings[recipe.id] || {};
        const facilities = DSP_FACILITIES.filter(f => isFacilityCompatible(recipe, f));
        const selectedFacility = facilities.find(f => f.id === settings.facilityId) || facilities[0];
        const tier = settings.proliferatorTier || 0;
        const speedAllowed = getRecipeMultipliers(recipe, 3, 'speed').speed > 1;
        const outputAllowed = getRecipeMultipliers(recipe, 3, 'output').output > 1;
        return <div key={id} className="grid sm:grid-cols-5 gap-2 items-center border-t border-[#2d3748] pt-3">
          <div className="text-sm text-cyan-300 min-w-0">{itemLabel(id)}</div>
          {selector}
          <div className="flex items-center gap-2 min-w-0">{selectedFacility && <DSPFacilityIcon facility={selectedFacility} size={24} />}<select aria-label={`建筑 ${recipe.id}`} className={`${field} flex-1 w-full`} value={settings.facilityId || facilities[0]?.id || ''} onChange={e => setRecipeSettings(recipe.id, { facilityId: e.target.value })}>{facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
          <select aria-label={`增产等级 ${recipe.id}`} className={field} value={tier} onChange={e => setRecipeSettings(recipe.id, { proliferatorTier: Number(e.target.value) as 0 | 1 | 2 | 3 })}>{[0, 1, 2, 3].map(t => <option key={t} value={t}>{t ? `增产剂 Mk.${t}` : '无喷涂'}</option>)}</select>
          <select aria-label={`增产模式 ${recipe.id}`} className={field} value={settings.proliferatorMode || 'none'} onChange={e => setRecipeSettings(recipe.id, { proliferatorMode: e.target.value as 'none' | 'speed' | 'output' })}><option value="none">不启用</option><option value="speed" disabled={!speedAllowed}>加速{!speedAllowed ? '（不支持）' : ''}</option><option value="output" disabled={!outputAllowed}>额外产物{!outputAllowed ? '（不支持）' : ''}</option></select>
        </div>;
      })}
      <div className="flex flex-wrap gap-3 items-center text-xs"><span>物流估算：</span><DSPBeltIcon tier={input.beltTier} size={24} /><select aria-label="生产传送带" className={field} value={input.beltTier} onChange={e => update({ beltTier: Number(e.target.value) as 1 | 2 | 3 })}>{DSP_BELTS.map(b => <option key={b.tier} value={b.tier}>{b.name}</option>)}</select><label>堆叠 <select aria-label="生产堆叠层数" className={field} value={input.beltStackLayers} onChange={e => update({ beltStackLayers: Number(e.target.value) })}>{[1, 2, 3, 4].map(n => <option key={n}>{n}</option>)}</select></label></div>
    </section>
    {result.status !== 'ok' && <div role="alert" className="bg-[#220d18] border-2 border-[#ff0055] rounded-xl p-4 text-rose-300">生产链计算失败：{result.error || result.status}</div>}
    <div className="flex gap-2"><button type="button" className={button} aria-pressed={view === 'schematic'} onClick={() => onViewChange('schematic')}>生产链 2D</button><button type="button" className={button} aria-pressed={view === 'metrics'} onClick={() => onViewChange('metrics')}>量化结果</button></div>
    <div data-testid="production-schematic" hidden={view !== 'schematic'}><ProductionFlowView result={result} onCopyToMixed={onCopyToMixed} /></div>
    <div data-testid="production-metrics" hidden={view !== 'metrics'} className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">{[['MACHINES', `${format(result.totalMachines)} 台`], ['POWER', `${format(result.totalPowerMW)} MW`], ['BELT_CAP', `${format(beltCapacity)} /min`]].map(([label, value]) => <div key={label} className={panel}><span className="pixel-label">{label}</span><div className="font-mono text-2xl text-cyan-300">{value}</div></div>)}</div>
      <section className={panel}><span className="pixel-label">PRODUCTION_STEPS</span><p className="text-xs text-slate-400">带数按每种物料独立满带估算；功耗仅生产建筑，不含采矿、物流与增产剂制造。</p>
        {result.steps.map(step => <article key={step.recipe.id} className="border-t border-[#2d3748] pt-3 space-y-2 text-sm"><div className="flex flex-wrap justify-between gap-2"><div className="text-cyan-300 font-bold flex items-center gap-2"><DSPItemIcon item={items[step.outputs[0]?.itemId]} size={28} />{step.recipe.name}</div><button type="button" className={button} onClick={() => onCopyToMixed(step)}>复制此步骤到混带</button></div><div className="flex flex-wrap items-center gap-2"><DSPFacilityIcon facility={step.facility} size={24} />{step.facility.name} · 理论 {format(step.machines)} 台 / 部署 {step.machinesRounded} 台 · {format(step.powerMW)} MW</div><div className="grid sm:grid-cols-2 gap-2">{[['输入', step.inputs], ['输出', step.outputs]].map(([label, rates]) => <div key={label as string} className="text-xs"><span className="text-slate-400">{label as string}</span>{(rates as ProductionStep['inputs']).map(rate => <div key={rate.itemId} className="flex items-center justify-between gap-2 py-1">{itemLabel(rate.itemId)}<span className="font-mono">{format(rate.ratePerMinute)} /min · {format(rate.ratePerMinute / beltCapacity)} 带</span></div>)}</div>)}</div></article>)}
      </section>
      <div className="grid sm:grid-cols-2 gap-4">{[['外部供应', result.supplies], ['副产物 / 余量', result.surplus]].map(([title, rates]) => <section key={title as string} className={panel}><h3 className="text-cyan-300 text-sm">{title as string}</h3>{!(rates as ProductionStep['inputs']).length && <p className="text-slate-500 text-xs">无</p>}{(rates as ProductionStep['inputs']).map(rate => <div key={rate.itemId} className="flex items-center justify-between gap-2 text-sm">{itemLabel(rate.itemId)}<span className="font-mono">{format(rate.ratePerMinute)} /min</span></div>)}</section>)}</div>
    </div>
  </div>;
}
