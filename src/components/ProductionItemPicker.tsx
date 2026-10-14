import { matchesSearch } from '../utils/search';
import React, { useEffect, useId, useRef, useState } from 'react';
import { useDSPItems } from '../data/GameDataContext';
import { DSPFramedItemIcon } from './DSPItemIcon';

interface Props {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}
/** Image options require an HTML listbox: native option elements cannot render game icons. */
export function ProductionItemPicker({ label, value, options, onChange }: Props) {
  const items = useDSPItems();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const name = (itemId: string) => items[itemId]?.name || itemId;
  const filtered = options.filter(itemId => matchesSearch(name(itemId), query, [itemId]));
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const choose = (itemId: string) => { onChange(itemId); close(); };
  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useEffect(() => { root.current?.querySelector(`[data-option-index="${active}"]`)?.scrollIntoView?.({ block: 'nearest' }); }, [active]);
  return <div ref={root} className="relative min-w-0 flex-1">
    <select aria-hidden="true" aria-label={label} className="sr-only" tabIndex={-1} value={value} onChange={event => onChange(event.target.value)}>{options.map(itemId => <option key={itemId} value={itemId}>{name(itemId)}</option>)}</select>
    <button ref={trigger} type="button" role="combobox" aria-label={`${label} 图标选择`} aria-expanded={open} aria-controls={`${id}-list`} aria-haspopup="listbox" onClick={() => { setOpen(!open); setQuery(''); setActive(0); }} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setQuery(''); setActive(0); } }} className="w-full flex items-center gap-2 bg-slate-900/90 border border-slate-700 rounded px-2 py-1 text-sm text-white hover:border-cyan-400 focus:border-cyan-400 focus:outline-none">
      <DSPFramedItemIcon item={items[value]} size={20} /><span className="truncate flex-1 text-left">{name(value)}</span><span className="text-cyan-300">⌄</span>
    </button>
    {open && <div className="absolute top-full left-0 right-0 mt-1 z-40 bg-[#0e121c] border-2 border-cyan-700 rounded-lg shadow-xl p-2" onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(0, Math.min(filtered.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))); }
      if (event.key === 'Enter' && filtered[active]) { event.preventDefault(); choose(filtered[active]); }
      if (event.key === 'Tab') setOpen(false);
    }}>
      <input ref={search} aria-label={`搜索${label}`} value={query} onChange={event => { setQuery(event.target.value); setActive(0); }} aria-controls={`${id}-list`} aria-activedescendant={filtered[active] ? `${id}-option-${active}` : undefined} placeholder="中文 / 拼音 / 首字母 / ID" className="w-full min-w-0 bg-slate-900 border border-slate-700 rounded px-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400" />
      <div id={`${id}-list`} role="listbox" aria-label={`${label} 列表`} className="max-h-64 overflow-y-auto mt-2 space-y-1">
        {filtered.map((itemId, index) => <button key={itemId} id={`${id}-option-${index}`} data-option-index={index} type="button" role="option" aria-label={name(itemId)} aria-selected={itemId === value} tabIndex={-1} onPointerMove={() => setActive(index)} onClick={() => choose(itemId)} className={`flex items-center gap-2 w-full p-1.5 rounded text-left text-xs ${index === active ? 'bg-cyan-950/60 text-cyan-200' : 'text-slate-300 hover:bg-slate-800'}`}><DSPFramedItemIcon item={items[itemId]} size={20} /><span className="truncate flex-1">{name(itemId)}</span>{itemId === value && <span className="text-cyan-300">✓</span>}</button>)}
        {!filtered.length && <p className="text-xs text-slate-500 p-2">没有匹配的物品</p>}
      </div>
    </div>}
  </div>;
}
