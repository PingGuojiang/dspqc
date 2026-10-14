import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useDSPItems } from '../data/GameDataContext';
import type { ProductionResult, ProductionStep } from '../engine/production';
import { DSPFacilityIcon, DSPFramedItemIcon as DSPItemIcon } from './DSPItemIcon';

export interface ProductionFlowViewProps {
  result: ProductionResult;
  onCopyToMixed: (step: ProductionStep) => void;
}
const control = 'bg-[#0a0d14] border border-[#2d3748] rounded px-2 py-1.5 text-xs text-slate-300 hover:text-cyan-300 hover:border-cyan-500';
const rate = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });

/** Each mounted workspace owns its viewport and selection. Links express dependencies, not a belt simulation. */
export function ProductionFlowView({ result, onCopyToMixed }: ProductionFlowViewProps) {
  const items = useDSPItems();
  const prefix = `production-${useId().replace(/:/g, '')}`;
  const markerId = `${prefix}-arrow`;
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 20, y: 20 });
  const [selected, setSelected] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; originX: number; originY: number; nodeId?: string } | null>(null);
  const canvas = useRef<SVGSVGElement>(null);
  const [positions, setPositions] = useState<Record<string, {x:number;y:number}>>({});
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const bounds = element.getBoundingClientRect();
      const scale = Math.max(bounds.width / 920, bounds.height / 560) || 1;
      const pointer = { x: (event.clientX - bounds.left) / scale, y: (event.clientY - bounds.top) / scale };
      const next = Math.max(0.1, Math.min(3, zoom * Math.exp(-event.deltaY * 0.0015)));
      setOffset({ x: pointer.x - (pointer.x - offset.x) * next / zoom, y: pointer.y - (pointer.y - offset.y) * next / zoom });
      setZoom(next);
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [zoom, offset]);
  const nodeHeight = Math.max(174, ...result.steps.map(step => 104 + Math.max(step.inputs.length, step.outputs.length) * 30));
  const automaticNodes = useMemo(() => {
    const levels = new Map<string, number>();
    const visiting = new Set<string>();
    const level = (step: ProductionStep): number => {
      const id = step.recipe.id;
      if (levels.has(id)) return levels.get(id)!;
      // Recycling chains can contain cycles: keep the link, stop expanding the layout.
      if (visiting.has(id)) return 0;
      visiting.add(id);
      const upstream = result.steps.filter(source => source !== step && source.outputs.some(output => step.inputs.some(input => input.itemId === output.itemId)));
      const depth = upstream.length ? Math.max(...upstream.map(source => level(source) + 1)) : 0;
      visiting.delete(id);
      levels.set(id, depth);
      return depth;
    };
    const rows = new Map<number, number>();
    return result.steps.map(step => {
      const column = level(step);
      const row = rows.get(column) || 0;
      rows.set(column, row + 1);
      return { step, x: column * 330, y: row * (nodeHeight + 76) };
    });
  }, [result.steps, nodeHeight]);
  const nodes = automaticNodes.map(node => ({...node, ...positions[node.step.recipe.id]}));
  const selectedStep = result.steps.find(step => step.recipe.id === selected);
  const name = (id: string) => items[id]?.name || id;
  const fitView = () => {
    const minX = Math.min(0, ...nodes.map(node => node.x));
    const minY = Math.min(0, ...nodes.map(node => node.y));
    const width = Math.max(280, ...nodes.map(node => node.x + 280)) - minX;
    const height = Math.max(nodeHeight, ...nodes.map(node => node.y + nodeHeight)) - minY;
    const bounds = canvas.current?.getBoundingClientRect();
    const scale = bounds ? Math.max(bounds.width / 920, bounds.height / 560) || 1 : 1;
    const visibleWidth = bounds?.width ? bounds.width / scale : 920;
    const visibleHeight = bounds?.height ? bounds.height / scale : 560;
    const fitted = Math.min(1, (visibleWidth - 40) / width, (visibleHeight - 40) / height);
    setZoom(fitted);
    setOffset({ x: (visibleWidth - width * fitted) / 2 - minX * fitted, y: (visibleHeight - height * fitted) / 2 - minY * fitted });
  };
  return <div className="space-y-3">
    <div className="bg-[#161b26] border-2 border-[#2d3748] rounded-xl overflow-hidden shadow-[6px_6px_0px_rgba(0,0,0,0.5)]">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#0e121c] border-b-2 border-[#2d3748]">
        <div className="flex items-center gap-2"><span className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_8px_#00f0ff]" /><span className="pixel-label text-rose-400">PRODUCTION_2D</span><span className="text-[10px] font-mono text-slate-500">{nodes.length} STEPS</span></div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={control} onClick={fitView}>适应画布</button>
          <button type="button" className={control} onClick={() => setPositions({})}>重置布局</button>
          <button type="button" className={control} aria-label="缩小生产图" onClick={() => setZoom(z => Math.max(0.1, z - 0.15))}>−</button>
          <output className="text-xs font-mono text-cyan-300 w-12 text-center" aria-label="生产图缩放">{Math.round(zoom * 100)}%</output>
          <button type="button" className={control} aria-label="放大生产图" onClick={() => setZoom(z => Math.min(3, z + 0.15))}>＋</button>
          <button type="button" className={control} onClick={() => { setZoom(1); setOffset({ x: 20, y: 20 }); }}>重置视野</button>
        </div>
      </div>
      <svg ref={canvas} role="img" aria-label="完整生产链图" viewBox="0 0 920 560" preserveAspectRatio="xMinYMin slice" className="w-full h-[440px] md:h-[520px] bg-[#07090e] touch-none select-none cursor-grab active:cursor-grabbing"
        onPointerDown={event => { if (event.button !== 0) return; const id = (event.target as Element).closest('[data-production-node]')?.getAttribute('data-production-node'); const node = nodes.find(node => node.step.recipe.id === id); if (node) setSelected(node.step.recipe.id); drag.current = { x: event.clientX, y: event.clientY, originX: node?.x ?? offset.x, originY: node?.y ?? offset.y, nodeId: node?.step.recipe.id }; event.currentTarget.setPointerCapture?.(event.pointerId); event.preventDefault(); }}
        onPointerMove={event => { if (!drag.current) return; const bounds = event.currentTarget.getBoundingClientRect(); const scale = Math.max(bounds.width / 920, bounds.height / 560) || 1; const gesture = drag.current; const divisor = scale * (gesture.nodeId ? zoom : 1); const next = { x: gesture.originX + (event.clientX - gesture.x) / divisor, y: gesture.originY + (event.clientY - gesture.y) / divisor }; if (gesture.nodeId) setPositions(previous => ({...previous, [gesture.nodeId!]: next})); else setOffset(next); }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }} onDragStart={event => event.preventDefault()}>
        <defs>
          <marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#00f0ff" /></marker>
          <pattern id={`${prefix}-grid`} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#1e293b" strokeWidth="0.6" /><circle cx="0" cy="0" r="1" fill="#334155" /></pattern>
        </defs>
        <rect width="920" height="560" fill={`url(#${prefix}-grid)`} />
        <g transform={`translate(${offset.x} ${offset.y}) scale(${zoom})`}>
          {nodes.flatMap(source => nodes.flatMap(target => source.step.recipe.id === target.step.recipe.id ? [] : source.step.outputs.filter(output => target.step.inputs.some(input => input.itemId === output.itemId)).map((output, index) => {
            const startY = source.y + 70 + index * 12;
            const endY = target.y + 70 + index * 12;
            const path = `M${source.x + 280},${startY} C${source.x + 315},${startY} ${target.x - 35},${endY} ${target.x},${endY}`;
            const active = selected === source.step.recipe.id || selected === target.step.recipe.id;
            return <g key={`${source.step.recipe.id}-${target.step.recipe.id}-${output.itemId}`}><title>{`${name(output.itemId)} · ${source.step.recipe.name} → ${target.step.recipe.name}（物料依赖）`}</title>
              <path d={path} fill="none" stroke="#172b36" strokeWidth="8" />
              <path d={path} fill="none" stroke={active ? '#00f0ff' : '#337587'} strokeWidth="2" strokeDasharray="6 4" markerEnd={`url(#${markerId})`} />
            </g>;
          })))}
          {nodes.map(({ step, x, y }, index) => <g key={step.recipe.id} data-production-node={step.recipe.id} role="button" tabIndex={0} aria-label={`选择步骤 ${step.recipe.name}`} aria-pressed={selected === step.recipe.id} transform={`translate(${x} ${y})`} onClick={() => setSelected(step.recipe.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(step.recipe.id); } }} style={{ cursor: 'grab' }}>
            <rect x="4" y="5" width="280" height={nodeHeight} rx="8" fill="#000" opacity="0.6" />
            <rect width="280" height={nodeHeight} rx="8" fill="#161b26" stroke={selected === step.recipe.id ? '#ff0055' : '#2d3748'} strokeWidth="2" />
            <rect x="-3" y="64" width="6" height="14" rx="2" fill="#fbbf24" />
            <rect x="277" y="64" width="6" height="14" rx="2" fill="#00f0ff" />
            <foreignObject x="10" y="10" width="260" height={nodeHeight - 20}>
              <div className="text-slate-200 text-xs">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-700/70">
                  <DSPFacilityIcon facility={step.facility} size={36} />
                  <div className="min-w-0 flex-1"><div className="text-cyan-300 font-bold truncate" title={step.recipe.name}>{step.recipe.name}</div><div className="text-[10px] text-slate-400 truncate mt-1">{step.facility.name}</div></div>
                  <span className="font-mono text-[10px] text-slate-500">#{String(index + 1).padStart(2, '0')}</span>
                </div>
                <div className="flex justify-between items-center py-2 font-mono"><span className="text-cyan-300">× {step.machinesRounded} <span className="text-slate-500 text-[10px]">台</span></span><span className="text-amber-300 text-[10px]">{step.powerMW.toFixed(3)} MW</span></div>
                <div className="grid grid-cols-2 gap-2">
                  {([['输入', step.inputs], ['输出', step.outputs]] as const).map(([label, rates]) => <div key={label}><div className={`text-[9px] font-mono mb-1 ${label === '输入' ? 'text-amber-400' : 'text-cyan-400'}`}>{label === '输入' ? 'INPUT' : 'OUTPUT'} / MIN</div>{rates.map(material => <div key={material.itemId} className="flex gap-1.5 items-center h-[30px]" title={`${name(material.itemId)} ${rate(material.ratePerMinute)} /min`}><DSPItemIcon item={items[material.itemId]} size={20} /><div className="min-w-0"><div className="truncate text-[10px] leading-3">{name(material.itemId)}</div><div className="font-mono text-[10px] text-slate-400">{rate(material.ratePerMinute)}</div></div></div>)}</div>)}
                </div>
              </div>
            </foreignObject>
          </g>)}
        </g>
        {!nodes.length && <text x="30" y="50" fill="#94a3b8">暂无生产步骤</text>}
      </svg>
      <div className="flex flex-wrap justify-between gap-2 px-3 py-2 border-t border-[#2d3748] bg-[#0e121c] text-[10px] text-slate-400"><span>滚轮缩放 · 拖动卡片调整布局 · 拖动空白平移</span><span><span className="text-amber-400">● 输入</span> / <span className="text-cyan-400">● 输出</span> · 连线表示物料依赖</span></div>
    </div>
    {selectedStep && <div className="bg-[#161b26] border-2 border-[#ff0055] rounded-xl p-3 text-sm flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><DSPFacilityIcon facility={selectedStep.facility} size={36} /><div><div className="text-cyan-300">{selectedStep.recipe.name}</div><div className="text-xs text-slate-400 mt-1">理论 {selectedStep.machines.toFixed(3)} 台 / 部署 {selectedStep.machinesRounded} 台</div></div></div>
      <button type="button" className={control} onClick={() => onCopyToMixed(selectedStep)}>复制此步骤到混带</button>
    </div>}
  </div>;
}
