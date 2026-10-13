/**
 * 戴森球计划：混带蓝图计算器 (DSP Mixed Belt Planner)
 * 深度借鉴 FactorioLab 极简高密度架构与抽屉式侧边栏
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Menu,
  Sliders,
  BookOpen, 
  Check, 
  Link as LinkIcon,
  Undo2
} from 'lucide-react';

import { 
  DSP_RECIPES, 
  DSP_FACILITIES, 
  DSP_BELTS, 
  DSPRecipe 
} from './data/dspData';
import { 
  CalculationInput, 
  calculateDSPMixedBelt 
} from './engine/calculator';
import { 
  encodeStateToUrlHash, 
  decodeUrlHashToState, 
  generateShareUrl 
} from './utils/urlState';

import { CompactHeaderPanel } from './components/CompactHeaderPanel';
import { GlobalDrawer } from './components/GlobalDrawer';
import { MetricsCard } from './components/MetricsCard';
import { SchematicView } from './components/SchematicView';
import { CustomRecipeModal } from './components/CustomRecipeModal';
import { FormulaRefModal } from './components/FormulaRefModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  // Clean production initial state: 电磁矩阵 (蓝糖) / 矩阵研究站 Mk.I / 黄带 Mk.I
  const defaultRecipe = DSP_RECIPES.find(r => r.name === '电磁矩阵') || DSP_RECIPES[0];
  const defaultFacility = DSP_FACILITIES.find(f => f.category === defaultRecipe.facilityCategory) || DSP_FACILITIES[0];
  const defaultBelt = DSP_BELTS[0]; // Yellow belt (Mk.I, 6 items/s)

  const defaultState: CalculationInput = {
    recipe: defaultRecipe,
    facility: defaultFacility,
    belt: defaultBelt,
    beltStackLayers: 1, // Clean 1-layer baseline
    sorterStackTechLevel: 1, // Clean 1-grab baseline
    isTechLocked: false,
    proliferatorTier: 0, // Clean unproliferated base state
    proliferatorMode: 'output',
    redundancyPercent: 100, // Clean 100% exact ratio baseline (no exaggerated redundancy)
    preferredSorterDistance: 1,
  };

  // State initialized optionally from URL hash (FactorioLab style)
  const [inputState, setInputState] = useState<CalculationInput>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const decoded = decodeUrlHashToState(window.location.hash);
      if (decoded && decoded.recipe && decoded.facility && decoded.belt) {
        return { ...defaultState, ...decoded } as CalculationInput;
      }
    }
    return defaultState;
  });

  const [activeTab, setActiveTab] = useState<'schematic' | 'metrics'>('schematic');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  // Undo history stack (stores previous input states)
  const [history, setHistory] = useState<CalculationInput[]>([]);

  // Update input state while recording undo step
  const updateInputWithHistory = (updater: CalculationInput | ((prev: CalculationInput) => CalculationInput)) => {
    setInputState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next !== prev) {
        setHistory(h => [...h.slice(-25), prev]);
      }
      return next;
    });
  };

  // Perform undo
  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory(h => h.slice(0, h.length - 1));
    setInputState(previous);
  };

  // Synchronize state changes to URL Hash for instant bookmarking & sharing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = encodeStateToUrlHash(inputState);
      if (hash) {
        window.history.replaceState(null, '', `#s=${hash}`);
      }
    }
  }, [inputState]);

  // Listen to popstate / hashchange if user navigates history
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash) {
        const decoded = decodeUrlHashToState(window.location.hash);
        if (decoded && decoded.recipe) {
          setInputState(prev => ({ ...prev, ...decoded }));
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Compute results through physics engine
  const result = useMemo(() => {
    return calculateDSPMixedBelt(inputState);
  }, [inputState]);

  // Handle adding custom recipe
  const handleSaveCustomRecipe = (newRecipe: DSPRecipe) => {
    DSP_RECIPES.unshift(newRecipe);
    const bestFac = DSP_FACILITIES.find(f => f.category === newRecipe.facilityCategory) || DSP_FACILITIES[0];
    updateInputWithHistory(prev => ({
      ...prev,
      recipe: newRecipe,
      facility: bestFac,
      customFacilityCount: undefined,
    }));
  };

  // Reset to factory defaults
  const handleResetDefaults = () => {
    updateInputWithHistory(defaultState);
    setIsDrawerOpen(false);
  };

  // Copy shareable short URL
  const handleShareUrl = () => {
    const shareUrl = generateShareUrl(inputState);
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    });
  };

  return (
    <div className="min-h-screen bg-[#11141d] text-slate-100 flex flex-col font-sans select-none">
      {/* ============================================================== */}
      {/* TOP NAVIGATION BAR: Zone 1 (Wordmark) - Zone 2 (Nav) - Zone 3 (CTA) */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-40 bg-[#11141d] border-b-2 border-[#2d3748] px-3 sm:px-6 py-2.5 flex items-center justify-between gap-4 shadow-md">
        {/* Zone 1: Sidebar Toggle + Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border-2 border-[#2d3748] rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,0.5)] transition active:translate-x-0.5 active:translate-y-0.5"
            title="打开全局设置抽屉 (科技/带速/增产)"
          >
            <Menu className="w-4 h-4 text-cyan-400" />
          </button>

          <a href="/" className="flex items-baseline gap-2.5 select-none">
            <span 
              className="font-logo text-2xl sm:text-3xl text-white -rotate-1 tracking-wide leading-none inline-block hover:rotate-0 transition-transform" 
              style={{ textShadow: '2.5px 2.5px 0px #ff0055' }}
            >
              DSP MIX-MAX!
            </span>
            <span className="pixel-label hidden sm:inline-flex text-[9px]">
              CALC_2024
            </span>
          </a>
        </div>

        {/* Zone 2: Navigation Links & Telemetry */}
        <nav className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-400 font-mono">
          <span className="pixel-label hidden xl:inline-flex">CPU_OPTIMIZED</span>
          <span className="pixel-label hidden xl:inline-flex" style={{ color: '#ff0055', borderColor: 'rgba(255,0,85,0.4)', background: 'rgba(255,0,85,0.08)' }}>
            AUTO_SAVE_ON
          </span>

          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 text-slate-300 px-2 py-1 rounded-md bg-slate-900/80 border border-slate-800 hover:border-slate-700"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>全局设置</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schematic')}
            className={`hover:text-cyan-400 transition-colors px-2.5 py-1 rounded-md ${
              activeTab === 'schematic' 
                ? 'text-cyan-300 font-bold bg-cyan-950/60 border border-cyan-500/50 shadow-xs' 
                : 'text-slate-400'
            }`}
          >
            2D排布图
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('metrics')}
            className={`hover:text-cyan-400 transition-colors px-2.5 py-1 rounded-md ${
              activeTab === 'metrics' 
                ? 'text-cyan-300 font-bold bg-cyan-950/60 border border-cyan-500/50 shadow-xs' 
                : 'text-slate-400'
            }`}
          >
            量化面板
          </button>

          <button
            type="button"
            onClick={() => setIsFormulaModalOpen(true)}
            className="hover:text-cyan-400 transition-colors flex items-center gap-1 text-slate-400"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>物理Wiki</span>
          </button>
        </nav>

        {/* Zone 3: Undo Button + Share URL + PWA Install */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Undo Action Button */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border-2 transition-all whitespace-nowrap ${
              history.length > 0
                ? 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-[#2d3748] shadow-[2px_2px_0px_rgba(0,0,0,0.5)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer'
                : 'bg-slate-950/60 text-slate-600 border-slate-900 cursor-not-allowed opacity-50'
            }`}
            title={history.length > 0 ? `撤销上一步操作 (还有 ${history.length} 步可撤销)` : '无最近操作可撤销'}
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">UNDO</span>
            {history.length > 0 && (
              <span className="text-[10px] font-mono bg-cyan-950 text-cyan-400 px-1 rounded border border-cyan-800 leading-none py-0.5">
                {history.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleShareUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold text-white bg-[#ff0055] hover:bg-[#ff1a6b] border-2 border-[#80002b] rounded-lg transition-all whitespace-nowrap shadow-[3px_3px_0px_#80002b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#80002b]"
            title="复制包含完整面板状态的压缩分享链接"
          >
            {shareToast ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>COPIED!</span>
              </>
            ) : (
              <>
                <LinkIcon className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">SHARE_STATE</span>
                <span className="sm:hidden">SHARE</span>
              </>
            )}
          </button>

          <PWAInstallButton />
        </div>
      </header>

      {/* ============================================================== */}
      {/* MAIN VIEWPORT: HIGH-DENSITY FACTORIOLAB ARCHITECTURE */}
      {/* ============================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 space-y-4">
        {/* 1. Collapsible High-Density Header Panel */}
        <section>
          <CompactHeaderPanel
            inputState={inputState}
            result={result}
            onChangeInput={updateInputWithHistory}
            onOpenCustomRecipe={() => setIsCustomModalOpen(true)}
            onOpenGlobalDrawer={() => setIsDrawerOpen(true)}
          />
        </section>

        {/* 2. Mobile & Desktop Tab Navigation Strip */}
        <div className="flex items-center justify-between gap-3 border-b-2 border-[#2d3748] pb-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border-2 border-[#2d3748] rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.5)]">
            <button
              type="button"
              onClick={() => setActiveTab('schematic')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'schematic'
                  ? 'bg-cyan-500/20 text-cyan-300 border-2 border-cyan-400/80 shadow-[2px_2px_0px_rgba(0,240,255,0.25)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🗺️ 2D 布局简图</span>
              <span className="pixel-label" style={{ fontSize: '0.55rem', padding: '1px 4px' }}>LIVE_MAP</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('metrics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === 'metrics'
                  ? 'bg-cyan-500/20 text-cyan-300 border-2 border-cyan-400/80 shadow-[2px_2px_0px_rgba(0,240,255,0.25)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>📝 量化数据面板</span>
              {result.capacityAlert?.isOverLimit && (
                <span className="w-2 h-2 rounded-full bg-[#ff0055] animate-pulse shadow-sm shadow-[#ff0055]/80" />
              )}
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-300 hidden sm:flex items-center gap-2 bg-slate-900/80 border-2 border-[#2d3748] px-3 py-1.5 rounded-lg shadow-[3px_3px_0px_rgba(0,0,0,0.4)]">
            <span>满带运力: <strong className="text-[#00f0ff] font-bold">{result.beltCapacity}</strong> /s</span>
            <span className="text-slate-600">·</span>
            <span>理论极限: <strong className={result.capacityAlert?.isOverLimit ? 'text-[#ff0055]' : 'text-emerald-400'}>{result.maxFacilitiesLimit}</strong> 台</span>
            {result.capacityAlert?.isOverLimit && (
              <span className="pixel-label" style={{ color: '#ff0055', borderColor: '#ff0055', background: 'rgba(255,0,85,0.15)' }}>
                OVERLOAD_ALERT
              </span>
            )}
          </div>
        </div>

        {/* 3. Tab Content 1: 2D Blueprint Schematic View (Default) */}
        {activeTab === 'schematic' && (
          <section id="schematic-section">
            <SchematicView inputState={inputState} result={result} />
          </section>
        )}

        {/* 4. Tab Content 2: Quantitative Metrics & Sorter Recommender View */}
        {activeTab === 'metrics' && (
          <section id="metrics-section">
            <MetricsCard 
              result={result} 
              inputState={inputState} 
              onChangeInput={updateInputWithHistory} 
            />
          </section>
        )}
      </main>

      {/* Footer from Variation 6 */}
      <footer className="mt-auto border-t-2 border-[#2d3748] bg-[#0c0e15] px-4 py-3 text-xs text-slate-400 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">DESIGNED BY: FACTORIOLAB // DSP_CALC_2024</span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-500 hidden sm:inline">戴森球计划：混带蓝图计算器</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              STATUS: 100% NOMINAL
            </span>
            <span className="text-cyan-400 font-bold hidden sm:inline">
              DATA_ARCHIVE: URL_READY
            </span>
            <button
              type="button"
              onClick={() => setIsFormulaModalOpen(true)}
              className="hover:text-cyan-300 underline underline-offset-2 transition"
            >
              物理Wiki
            </button>
            <button
              type="button"
              onClick={() => setIsCustomModalOpen(true)}
              className="hover:text-cyan-300 underline underline-offset-2 transition"
            >
              新建配方
            </button>
          </div>
        </div>
      </footer>

      {/* Side Drawer for Global Settings */}
      <GlobalDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        inputState={inputState}
        onChangeInput={updateInputWithHistory}
        onResetDefaults={handleResetDefaults}
      />

      {/* Modals & Offline Indicator */}
      <CustomRecipeModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onSaveRecipe={handleSaveCustomRecipe}
      />

      <FormulaRefModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
      />

      <OfflineIndicator />
    </div>
  );
}
