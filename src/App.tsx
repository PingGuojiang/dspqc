import React, { useState, useMemo, useEffect, useReducer, useRef } from 'react';
import { Sun, Moon, Menu, Sliders, BookOpen, Check, Link as LinkIcon, Undo2 } from 'lucide-react';
import { DSP_RECIPES, DSP_BELTS, DSP_ITEMS, importCustomGameData, type DSPRecipe } from './data/dspData';
import { GameDataProvider } from './data/GameDataContext';
import { calculateDSPMixedBelt, supportsMixedRecipe, type CalculationInput } from './engine/calculator';
import type { ProductionStep } from './engine/production';
import { createWorkspaces, createDefaultMixedInput, workspaceReducer, validateImportBundle, STORAGE_KEY, restoreWorkspaces, serializeWorkspaces, encodeWorkspaceHash, decodeWorkspaceHash, type PlannerMode, type PlannerView } from './utils/workspaces';
import { CompactHeaderPanel } from './components/CompactHeaderPanel';
import { GlobalDrawer } from './components/GlobalDrawer';
import { MetricsCard } from './components/MetricsCard';
import { SchematicView } from './components/SchematicView';
import { ProductionWorkspace } from './components/ProductionWorkspace';
import { CustomRecipeModal } from './components/CustomRecipeModal';
import { FormulaRefModal } from './components/FormulaRefModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OrdinarySettingsDrawer } from './components/OrdinarySettingsDrawer';

import { AppearanceSettings, readAppearance } from './components/AppearanceSettings';
export default function App() {
  const [appearance,setAppearance]=useState(readAppearance);
  const [appearanceOpen,setAppearanceOpen]=useState(false);
  useEffect(()=>{document.documentElement.dataset.theme=appearance.theme;document.documentElement.style.fontSize=appearance.size+'px';document.documentElement.style.setProperty('--ui-font',appearance.font==='custom'?JSON.stringify(appearance.customFont||'system-ui')+', system-ui, sans-serif':appearance.font==='mono'?"'Space Mono', 'Microsoft YaHei', monospace":appearance.font==='system'?"system-ui, sans-serif":"'Inter', 'Microsoft YaHei', sans-serif");try{localStorage.setItem('dsp-appearance',JSON.stringify(appearance));}catch{}},[appearance]);
  const [state, dispatch] = useReducer(workspaceReducer, undefined, () => {
    let initial=createWorkspaces();
    if (typeof window==='undefined') return initial;
    try { const saved=window.localStorage.getItem(STORAGE_KEY); if(saved) initial=restoreWorkspaces(saved)??initial; } catch { /* storage can be unavailable */ }
    const share=decodeWorkspaceHash(window.location.hash);
    return share?workspaceReducer(initial,{type:'loadShare',share}):initial;
  });
  const {activeMode}=state;
  const inputState=state.mixed.input;
  const activeTab=state[activeMode].view;
  const history=state[activeMode].history;
  const setActiveTab=(view:PlannerView)=>dispatch({type:'view',mode:activeMode,view});
  const [isDrawerOpen,setIsDrawerOpen]=useState(false);
  const [isCustomModalOpen,setIsCustomModalOpen]=useState(false);
  const [isFormulaModalOpen,setIsFormulaModalOpen]=useState(false);
  const [shareToast,setShareToast]=useState(false);
  const [notice,setNotice]=useState(()=>typeof window!=='undefined' && window.location.hash && !decodeWorkspaceHash(window.location.hash)?'链接配置无效，已保留本地配置':'');
  const fileInput=useRef<HTMLInputElement>(null);
  const lastHash=useRef(typeof window!=='undefined'?window.location.hash:'');
  const toastTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const mixedRecipes=useMemo(()=>[...state.mixed.customRecipes,...DSP_RECIPES].filter(supportsMixedRecipe),[state.mixed.customRecipes]);
  const ordinaryRecipes=useMemo(()=>[...state.ordinary.customRecipes,...DSP_RECIPES],[state.ordinary.customRecipes]);
  const mixedCalculation=useMemo(()=> {
    try { return {result:calculateDSPMixedBelt(inputState,{...DSP_ITEMS,...state.mixed.items}),error:null}; }
    catch(error) { return {result:calculateDSPMixedBelt({...createDefaultMixedInput(),customFacilityCount:0}),error:error instanceof Error?error.message:'无效混带配置'}; }
  },[inputState,state.mixed.items]);
  const {result}=mixedCalculation;
  const updateInputWithHistory=(updater:CalculationInput|((previous:CalculationInput)=>CalculationInput))=> {
    const input=typeof updater==='function'?updater(inputState):updater;
    if(input!==inputState) dispatch({type:'mixedInput',input});
  };
  const switchMode=(mode:PlannerMode)=> {setIsDrawerOpen(false);setIsCustomModalOpen(false);dispatch({type:'switch',mode});};
  const openSettings=()=>setIsDrawerOpen(true);
  const handleUndo=()=>dispatch({type:'undo',mode:activeMode});
  const handleResetDefaults=()=> {dispatch({type:'reset',mode:activeMode});setIsDrawerOpen(false);};
  const handleSaveCustomRecipe=(recipe:DSPRecipe)=> {
    if(activeMode==='mixed' && !supportsMixedRecipe(recipe)){setNotice('混带配方不支持该建筑或比例周期过长，请在普通模式使用或缩小比例');return;}
    dispatch({type:activeMode==='mixed'?'mixedRecipe':'ordinaryRecipe',recipe});
  };
  const handleImport=(data:ReturnType<typeof importCustomGameData>)=> {validateImportBundle(data);dispatch({type:'import',mode:activeMode,...data});setNotice('已向当前模式导入 '+data.recipes.length+' 个配方（特殊生产过程仅供普通模式外供参考）');};
  const handleImportFile=async(event:React.ChangeEvent<HTMLInputElement>)=> {
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    const mode=activeMode;
    try { const data=importCustomGameData(JSON.parse(await file.text()));validateImportBundle(data);dispatch({type:'import',mode,...data});setNotice('已向'+(mode==='mixed'?'混带':'普通量化')+'模式导入 '+data.recipes.length+' 个配方（特殊生产过程仅供普通模式外供参考）'); }
    catch(error) {setNotice(error instanceof Error?'导入失败：'+error.message:'导入失败');}
  };
  const handleCopyToMixed=(step:ProductionStep)=> {
    if(!supportsMixedRecipe(step.recipe)){setNotice('该步骤不适用于混带模式，请继续使用普通量化');return;}
    const setting=state.ordinary.input.recipeSettings[step.recipe.id];
    if(step.recipe.isCustom) dispatch({type:'import',mode:'mixed',recipes:[step.recipe],items:state.ordinary.items});
    dispatch({type:'mixedInput',input:{...state.mixed.input,recipe:structuredClone(step.recipe),facility:step.facility,belt:DSP_BELTS.find(b=>b.tier===state.ordinary.input.beltTier)!,beltStackLayers:state.ordinary.input.beltStackLayers,customFacilityCount:step.machinesRounded,proliferatorTier:setting?.proliferatorTier??0,proliferatorMode:setting?.proliferatorMode??'none'}});
    switchMode('mixed');setNotice('生产步骤已复制为独立混带配置');
  };
  useEffect(()=> {
    try {window.localStorage.setItem(STORAGE_KEY,serializeWorkspaces(state));} catch {setNotice('浏览器未能保存配置，可用分享链接备份');}
    const hash=encodeWorkspaceHash(state,activeMode);
    lastHash.current=hash;
    window.history.replaceState(null,'',hash);
  },[state,activeMode]);
  useEffect(()=> {
    const receiveHash=()=> {
      if(!window.location.hash||window.location.hash===lastHash.current)return;
      const share=decodeWorkspaceHash(window.location.hash);
      if(share){lastHash.current=window.location.hash;dispatch({type:'loadShare',share});setIsDrawerOpen(false);setIsCustomModalOpen(false);}
      else setNotice('链接配置无效，已保留当前配置');
    };
    window.addEventListener('hashchange',receiveHash);window.addEventListener('popstate',receiveHash);
    return()=>{window.removeEventListener('hashchange',receiveHash);window.removeEventListener('popstate',receiveHash);};
  },[]);
  useEffect(()=>()=>{if(toastTimer.current)clearTimeout(toastTimer.current);},[]);
  const handleShareUrl=async()=> {
    const url=window.location.origin+window.location.pathname+encodeWorkspaceHash(state,activeMode);
    try {await navigator.clipboard.writeText(url);setShareToast(true);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setShareToast(false),2500);}
    catch {setNotice('复制失败，可直接复制地址栏中的分享链接');}
  };


  return (
    <div className="min-h-screen bg-[#11141d] text-slate-100 flex flex-col font-sans select-none">
      {/* ============================================================== */}
      {/* TOP NAVIGATION BAR: Zone 1 (Wordmark) - Zone 2 (Nav) - Zone 3 (CTA) */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-40 bg-[#11141d] border-b-2 border-[#2d3748] px-3 sm:px-6 py-2.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-4 shadow-md">
        {/* Zone 1: Sidebar Toggle + Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={()=>setAppearanceOpen(true)}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border-2 border-[#2d3748] rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,0.5)] transition active:translate-x-0.5 active:translate-y-0.5"
            aria-label="打开全局设置" title="字体、字号与显示主题"
          >
            <Menu className="w-4 h-4 text-cyan-400" />
          </button>

          <a href={import.meta.env?.BASE_URL ?? "/"} className="flex items-center gap-2.5 select-none">
            <span 
              className="font-logo text-2xl sm:text-3xl text-white -rotate-1 tracking-wide leading-none inline-block hover:rotate-0 transition-transform" 
              style={{ textShadow: '2.5px 2.5px 0px #ff0055' }}
            >
              DSP MIX-MAX!
            </span>
            <span className="pixel-label hidden sm:inline-flex text-[9px]">
              DUAL_MODE
            </span>
          </a>
        </div>

        {/* Zone 2: Navigation Links & Telemetry */}
        <nav className="header-tools hidden md:flex items-center gap-4 text-xs font-medium text-slate-400 font-mono">
          <span className="pixel-label hidden xl:inline-flex">LOCAL_ENGINE</span>
          <span className="pixel-label hidden xl:inline-flex" style={{ color: '#ff0055', borderColor: 'rgba(255,0,85,0.4)', background: 'rgba(255,0,85,0.08)' }}>
            自动保存
          </span>

          <button
            type="button"
            onClick={()=>setAppearanceOpen(true)}
            className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 text-slate-300 px-2 py-1 rounded-md bg-slate-900/80 border border-slate-800 hover:border-slate-700"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>全局设置</span>
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
          <button type="button" aria-label={appearance.theme==='dark'?'切换亮色主题':'切换暗色主题'} onClick={()=>setAppearance({...appearance,theme:appearance.theme==='dark'?'light':'dark'})} className="p-2 rounded-lg border-2 border-slate-700 text-amber-400">{appearance.theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button>
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
            title="复制当前模式配置的分享链接"
          >
            {shareToast ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>已复制</span>
              </>
            ) : (
              <>
                <LinkIcon className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">分享方案</span>
                <span className="sm:hidden">分享</span>
              </>
            )}
          </button>

          <PWAInstallButton />
        </div>
      </header>

      {/* ============================================================== */}
      {/* MAIN VIEWPORT: HIGH-DENSITY FACTORIOLAB ARCHITECTURE */}
      {/* ============================================================== */}
      <main className="planner-main flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-6 py-4 space-y-4">
        <div className="flex flex-wrap justify-between gap-3 items-center border-b-2 border-[#2d3748] pb-3">
          <div className="flex gap-2 p-1 bg-slate-900 border-2 border-[#2d3748] rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.5)]">
            {([['mixed','混带模式'],['ordinary','普通量化模式']] as const).map(([mode,label])=><button key={mode} type="button" aria-pressed={activeMode===mode} onClick={()=>switchMode(mode)} className={`px-3 py-2 text-sm font-bold rounded-lg border-2 transition-colors ${activeMode===mode?'text-cyan-300 bg-cyan-500/20 border-cyan-400/80':'text-slate-400 border-transparent hover:text-white'}`}>{label}</button>)}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button type="button" onClick={()=>setIsCustomModalOpen(true)} className="workspace-action pixel-label hover:text-cyan-300">新建当前模式配方</button>
            <button type="button" onClick={()=>fileInput.current?.click()} className="workspace-action pixel-label hover:text-cyan-300">导入当前模式数据</button>
            <button type="button" onClick={handleResetDefaults} className="workspace-action pixel-label hover:text-rose-300">重置当前模式</button>
            <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={handleImportFile}/>
          </div>
        </div>
        <p className="text-xs text-slate-400">{activeMode==='ordinary'?'按目标产量展开完整生产链，可配置外供、替代配方和每段建筑。':'规划单段混带进料、分拣器与回流排布。'} 两种模式独立保存，切换保留各自的配置和 2D 视图</p>
        {notice&&<div role="status" className="border-2 border-[#2d3748] bg-slate-900 text-cyan-200 rounded-lg p-2 text-xs flex justify-between">{notice}<button type="button" onClick={()=>setNotice('')} aria-label="关闭提示">×</button></div>}
        <GameDataProvider items={state.mixed.items}>
        <div data-testid="mixed-workspace" hidden={activeMode!=='mixed'} className="space-y-4">
        {mixedCalculation.error&&<div role="alert" className="bg-rose-950 border-2 border-rose-500 rounded-lg p-3 text-rose-200 text-sm">混带计算失败：{mixedCalculation.error}。请调整配置；普通模式仍可使用。</div>}

        {/* 1. Collapsible High-Density Header Panel */}
        <section>
          <CompactHeaderPanel recipes={mixedRecipes}
            inputState={inputState}
            result={result}
            onChangeInput={updateInputWithHistory}
            onOpenCustomRecipe={() => setIsCustomModalOpen(true)}
            onOpenGlobalDrawer={openSettings}
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
        {(
          <section id="schematic-section" hidden={state.mixed.view!=='schematic'}>
            <SchematicView inputState={inputState} result={result} />
          </section>
        )}

        {/* 4. Tab Content 2: Quantitative Metrics & Sorter Recommender View */}
        {(
          <section id="metrics-section" hidden={state.mixed.view!=='metrics'}>
            <MetricsCard 
              result={result} 
              inputState={inputState} 
              onChangeInput={updateInputWithHistory} 
            />
          </section>
        )}
        </div>
        </GameDataProvider>
        <GameDataProvider items={state.ordinary.items}>
          <div id="ordinary-workspace" data-testid="ordinary-workspace" hidden={activeMode!=='ordinary'}>
            <ProductionWorkspace input={state.ordinary.input} onChange={input=>dispatch({type:'ordinaryInput',input})} view={state.ordinary.view} onViewChange={view=>dispatch({type:'view',mode:'ordinary',view})} recipes={ordinaryRecipes} onCopyToMixed={handleCopyToMixed}/>
          </div>
        </GameDataProvider>
      </main>

      {/* Footer from Variation 6 */}
      <footer className="mt-auto border-t-2 border-[#2d3748] bg-[#0c0e15] px-4 py-3 text-xs text-slate-400 font-mono">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">DSP MIX-MAX // PRODUCTION PLANNER</span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-500 hidden sm:inline">戴森球计划：普通量化与混带规划</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LOCAL_ENGINE
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
      <GameDataProvider items={state.mixed.items}>
      {appearanceOpen&&<AppearanceSettings value={appearance} onChange={setAppearance} onClose={()=>setAppearanceOpen(false)} mode={activeMode==='mixed'?'混带模式':'普通量化模式'} onModeSettings={()=>{setAppearanceOpen(false);openSettings();}}/>}
      <GlobalDrawer
        isOpen={isDrawerOpen && activeMode==='mixed'}
        onImportData={handleImport}
        onClose={() => setIsDrawerOpen(false)}
        inputState={inputState}
        onChangeInput={updateInputWithHistory}
        onResetDefaults={handleResetDefaults}
        modeLabel="混带模式"
      />

      </GameDataProvider>
      <OrdinarySettingsDrawer isOpen={isDrawerOpen && activeMode==='ordinary'} input={state.ordinary.input} onChange={next => dispatch({type:'ordinaryInput', input:next})} onClose={() => setIsDrawerOpen(false)} onReset={() => { dispatch({type:'reset', mode:'ordinary'}); setIsDrawerOpen(false); }} />
      {/* Modals & Offline Indicator */}
      <GameDataProvider items={state[activeMode].items}>
      <CustomRecipeModal key={activeMode}
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onSaveRecipe={handleSaveCustomRecipe}
      />

      </GameDataProvider>
      <FormulaRefModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
      />

      <OfflineIndicator />
    </div>
  );
}
