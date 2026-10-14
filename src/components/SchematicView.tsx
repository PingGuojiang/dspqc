import { useDSPItems } from '../data/GameDataContext';
import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Info, 
  Layers, 
  Activity, 
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Box,
  Split,
  Monitor,
  Scan,
  MousePointer,
  X
} from 'lucide-react';
import { CalculationInput, CalculationResult } from '../engine/calculator';
import { DSP_ITEMS, DSP_SORTERS, DSPFacility } from '../data/dspData';
import { DSPItemIcon, DSPSorterIcon, DSPBeltIcon } from './DSPItemIcon';
import { BeltSequencePattern } from './BeltSequencePattern';
import { SchematicLegend } from './SchematicLegend';

// Extract tech tier code (e.g. Mk.I, Mk.II, Mk.III) from facility name
export function getFacilityTechCode(facilityName: string): string {
  const match = facilityName.match(/(Mk\.[I|V|X]+)/i);
  if (match) return match[1];
  if (facilityName.includes('重组')) return 'Mk.Re';
  if (facilityName.includes('位面')) return 'Mk.II';
  if (facilityName.includes('负熵')) return 'Mk.III';
  if (facilityName.includes('自化')) return 'Mk.II';
  if (facilityName.includes('量子')) return 'Mk.II';
  if (facilityName.includes('对撞')) return 'Mk.Col';
  if (facilityName.includes('精炼')) return 'Mk.Ref';
  return 'Mk.I';
}

// Facility icon renderer with real game icon PNG and robust fallback badge
export const FacilityIconRenderer: React.FC<{
  facility: DSPFacility;
  size?: number;
  className?: string;
}> = ({ facility, size = 28, className = '' }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const techCode = getFacilityTechCode(facility.name);

  // Reset error state if facility ID changes
  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [facility.id, facility.numericId, facility.iconName]);

  const basePath = (import.meta.env?.BASE_URL ?? '/') || '/';
  const cleanBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
  
  // Prefer facility.iconName (e.g., 'assembler-1', 'smelter'), fallback to numericId or id
  const iconFilename = facility.iconName || (facility.category === 'assembler' 
    ? (facility.id === 'assembler_1' ? 'assembler-1' : facility.id === 'assembler_2' ? 'assembler-2' : facility.id === 'assembler_3' ? 'assembler-3' : 'reassembler')
    : facility.category === 'smelter'
    ? (facility.id === 'smelter_1' ? 'smelter' : facility.id === 'smelter_plane' ? 'smelter-2' : 'negentropy')
    : facility.numericId || facility.id);

  const iconSrc = `${cleanBase}dsp_icons/${iconFilename}.png`;

  return (
    <div 
      className={`relative w-full h-full flex items-center justify-center rounded overflow-hidden select-none ${className}`}
      title={`${facility.name} [${techCode}]`}
    >
      {/* Fallback & Underlay Tech Badge */}
      <div
        className="absolute inset-0 flex items-center justify-center rounded bg-slate-900 border border-slate-700/80 font-mono font-bold select-none shadow-xs"
        style={{
          fontSize: size <= 22 ? '8px' : size <= 28 ? '9px' : '10px',
          color: facility.color || '#38bdf8',
          backgroundColor: `${facility.color || '#38bdf8'}18`,
        }}
      >
        <span>{techCode}</span>
      </div>

      {/* Real Game Facility Icon */}
      {!hasError && (
        <img
          src={iconSrc}
          alt={facility.name}
          width={size}
          height={size}
          loading="eager"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          onLoad={() => setIsLoaded(true)}
          className={`relative z-10 w-full h-full object-contain p-0.5 filter drop-shadow select-none transition-opacity duration-150 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
};

// Clean helper for resolving DSP icon URLs with Vite BASE_URL
export function getDspIconUrl(iconName: string): string {
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
  const clean = base.endsWith('/') ? base : `${base}/`;
  return `${clean}dsp_icons/${iconName}.png`;
}

// Resilient Icon Renderer for Popup Inspector with robust fallback and error handling
export const PopupIconRenderer: React.FC<{
  iconSrc?: string;
  iconSymbol?: string;
  title: string;
  tagColor?: string;
}> = ({ iconSrc, iconSymbol, title, tagColor = '#00f0ff' }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [iconSrc]);

  const symbol = iconSymbol || (title ? title.slice(0, 2) : '??');

  return (
    <div 
      className="w-8 h-8 rounded-lg bg-slate-900 border p-0.5 shrink-0 flex items-center justify-center shadow-xs relative overflow-hidden select-none"
      style={{ borderColor: `${tagColor}80` }}
    >
      {/* Background symbol fallback (always present, never blank or broken) */}
      <div 
        className="absolute inset-0 flex items-center justify-center font-mono font-bold text-xs"
        style={{ 
          color: tagColor,
          backgroundColor: `${tagColor}18`,
        }}
      >
        {symbol}
      </div>

      {/* Real Game PNG with graceful error interception */}
      {iconSrc && !hasError && (
        <img 
          src={iconSrc} 
          alt={title} 
          onError={() => setHasError(true)}
          onLoad={() => setIsLoaded(true)}
          className={`relative z-10 w-full h-full object-contain filter drop-shadow transition-opacity duration-150 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`} 
          loading="eager"
        />
      )}
    </div>
  );
};

export type CanvasHeightMode = 'compact' | 'standard' | 'tall' | 'fit';

// 点击弹窗数据结构 (包含 SVG 坐标锚点，缩放后依然精确对齐)
export interface CanvasItemPopup {
  id: string; // 唯一标识符
  title: string;
  subtitle?: string;
  category?: string;
  tagColor?: string;
  iconSrc?: string;
  iconSymbol?: string;
  anchorX: number; // SVG 空间中的锚点 X
  anchorY: number; // SVG 空间中的锚点 Y
  anchorPlacement?: 'top' | 'bottom'; // 弹出方向 (顶部或底部)
  stats?: { label: string; value: string; color?: string }[];
  description?: string;
}

interface SchematicViewProps {
  inputState: CalculationInput;
  result: CalculationResult;
}

export const SchematicView: React.FC<SchematicViewProps> = ({ inputState, result }) => {
  const DSP_ITEMS = useDSPItems();
  const [viewport, setViewport] = useState({zoom:1,x:16,y:16});
  const zoom = viewport.zoom;
  const setZoom = (value: React.SetStateAction<number>) => setViewport(previous => ({...previous,zoom:typeof value==='function'?value(previous.zoom):value}));
  const [cardPositions, setCardPositions] = useState<Record<number, {x:number;y:number}>>({});
  const cardDrag = useRef<{index:number;x:number;y:number;originX:number;originY:number;moved:boolean}|null>(null);
  const suppressClick = useRef(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedFacilityIndex, setSelectedFacilityIndex] = useState<number | null>(0);
  const [showFlowLabels, setShowFlowLabels] = useState(true);
  const [canvasHeightMode, setCanvasHeightMode] = useState<CanvasHeightMode>('standard');
  const [isDragging, setIsDragging] = useState(false);
  // 点击弹出卡片状态 (点击显示，支持缩放自适应锚定)
  const [activePopup, setActivePopup] = useState<CanvasItemPopup | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // 切换点击弹出卡片 (再次点击同个物体则关闭，点击新物体则切换)
  const handleTogglePopup = (popup: CanvasItemPopup) => {
    setActivePopup(prev => (prev?.id === popup.id ? null : popup));
  };

  // 支持键盘 Esc 键快速关闭弹窗
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePopup(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const {
    recipe,
    facility,
    belt,
    beltStackLayers,
  } = inputState;

  const {
    beltCapacity,
    actualFacilitiesCount,
    maxFacilitiesLimit,
    interleavedPattern,
    materials,
    isBeltOverloaded,
    bufferStorage,
  } = result;

  // ========================================================================
  // 核心布局参数 (Layout Coordinates & Parameters) - 方便随时微调
  // ========================================================================
  // 1. 设施卡片基础尺寸与坐标
  const facilityWidth = 90;
  const facilityHeight = 80;
  const facilityGap = 35;
  const inletWidth = 140;
  const outletLoopWidth = 80;
  const facilityY = 45; // 设施卡片顶部 Y 坐标 (设施底边为 facilityY + facilityHeight = 125)

  // 2. 【修改点 1】设施底边与主混合进料带的垂直间距 (恢复为原本的 40px)
  // 如果日后想微调该间距，直接修改下面的 facilityToMainBeltGap 数值即可！
  const facilityToMainBeltGap = 40; 
  const mainBeltY = facilityY + facilityHeight + facilityToMainBeltGap; // 45 + 80 + 40 = 165

  // 3. 【修改点 2】主混合进料带与回流传送带的垂直高度间距 (用户设定: 200px)
  // 如果日后想微调回流带与主进料带之间的间距，直接修改下面的 mainBeltToLoopbackGap 数值即可！
  const mainBeltToLoopbackGap = 200; 
  const loopbackY = mainBeltY + mainBeltToLoopbackGap; // 165 + 200 = 365

  // 4. 始端合流区起始 Y 坐标 (使四向分流器右侧出料口 inletY + 93 + 12 = mainBeltY 165 保持严格对齐)
  const inletY = mainBeltY - 105; // 165 - 105 = 60

  // 5. SVG 画布尺寸
  const displayFacilityCount = Math.min(10, actualFacilitiesCount);
  const startX = inletWidth + 30;
  const totalContentWidth = startX + displayFacilityCount * (facilityWidth + facilityGap) + outletLoopWidth;
  const svgWidth = Math.max(900, totalContentWidth + 60, ...Object.values(cardPositions).map(position => position.x + 140));
  const svgHeight = Math.max(loopbackY + 65, ...Object.values(cardPositions).map(position => position.y + 120)); // 365 + 65 = 430 (预留底部标签与安全呼吸空间)

  // 自动缩放功能：根据当前视口宽高自动计算最优缩放比，完整呈现全貌
  const handleAutoFit = () => {
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.clientWidth - 48;
    const containerHeight = container.clientHeight - 48;

    if (containerWidth <= 0 || containerHeight <= 0) return;

    const scaleX = containerWidth / svgWidth;
    const scaleY = containerHeight / svgHeight;
    const fitRatio = Math.min(scaleX, scaleY);
    const targetZoom = Math.min(1.5, Math.max(0.1, Math.round(fitRatio * 100) / 100));

    setViewport({zoom:targetZoom,x:(container.clientWidth-svgWidth*targetZoom)/2,y:(container.clientHeight-svgHeight*targetZoom)/2});
  };

  // 鼠标滚轮缩放功能：监听画布区域原生 wheel 事件，平滑放大缩小
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const bounds = container.getBoundingClientRect();
      const x = e.clientX - bounds.left;
      const y = e.clientY - bounds.top;
      setViewport(previous => {
        const next = Math.min(2.5, Math.max(0.1, previous.zoom * Math.exp(-e.deltaY * 0.0015)));
        const ratio = next / previous.zoom;
        return {zoom:next,x:x-(x-previous.x)*ratio,y:y-(y-previous.y)*ratio};
      });
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, [svgWidth, svgHeight, zoom]);

  // 鼠标拖拽平移功能 (Drag to Pan)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('[data-mixed-card]')) return;

    const container = containerRef.current;
    if (!container) return;

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: viewport.x,
      scrollTop: viewport.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const container = containerRef.current;
    if (!container) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setViewport(previous=>({...previous,x:dragStartRef.current.scrollLeft+dx,y:dragStartRef.current.scrollTop+dy}));
  };

  const handleMouseUpOrLeave = () => {
    if (isDragging) setIsDragging(false);
  };

  return (
    <div className="bg-[#161b26] border-2 border-[#2d3748] rounded-xl shadow-[6px_6px_0px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
      {/* HUD Header Toolbar */}
      <div className="px-4 py-3 border-b-2 border-[#2d3748] flex flex-wrap items-center justify-between gap-3 bg-[#0e121c]">
        <div className="flex items-center gap-2.5">
          <span className="pixel-label" style={{ background: '#ff0055', color: '#fff', borderColor: '#80002b' }}>
            LIVE_FLOW_MAP
          </span>
          <h2 className="text-sm font-bold text-white tracking-wide">
            2D 进料排布与闭环回流简图 (Schematic Canvas)
          </h2>
          <span className="text-xs text-slate-400 hidden sm:inline font-mono">
            · 示意布局 · 实际运行需验证
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Flow Animation Toggle */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold rounded-lg border-2 transition active:translate-x-0.5 active:translate-y-0.5 ${
              isPlaying
                ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[2px_2px_0px_rgba(0,240,255,0.4)]'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="播放/暂停传送带动效"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span className="hidden sm:inline">{isPlaying ? '物料流动' : '已暂停'}</span>
          </button>

          {/* Toggle Flow Labels */}
          <button
            type="button"
            onClick={() => setShowFlowLabels(!showFlowLabels)}
            className={`px-2.5 py-1 text-xs rounded border transition ${
              showFlowLabels
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            物料标签
          </button>

          {/* Canvas Height Mode Controls (电脑显示高度模式优化) */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5" title="调整电脑显示高度">
            <span className="text-[10px] text-slate-400 font-mono px-1.5 flex items-center gap-1">
              <Monitor className="w-3 h-3 text-cyan-400" />
              <span className="hidden md:inline">高度</span>
            </span>
            {(
              [
                { id: 'compact', label: '紧凑', desc: '360px' },
                { id: 'standard', label: '标准', desc: '440px (电脑推荐)' },
                { id: 'tall', label: '大屏', desc: '560px' },
                { id: 'fit', label: '撑满', desc: '适应屏幕' },
              ] as const
            ).map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setCanvasHeightMode(preset.id)}
                className={`px-2 py-0.5 text-[11px] font-mono rounded transition ${
                  canvasHeightMode === preset.id
                    ? 'bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={`${preset.label}模式: ${preset.desc}`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Auto-Fit / Zoom Controls (自动缩放与鼠标缩放) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleAutoFit}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold text-cyan-300 hover:text-white bg-cyan-950/80 hover:bg-cyan-900 border-2 border-cyan-500/60 rounded-lg transition active:translate-x-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_rgba(0,240,255,0.3)]"
              title="自动缩放: 计算最佳缩放比例，让整条排布图完整填满视口"
            >
              <Scan className="w-3.5 h-3.5 text-cyan-400" />
              <span>自动缩放</span>
            </button>

            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setZoom(prev => Math.max(0.35, Math.round((prev - 0.1) * 100) / 100))}
                className="p-1 text-slate-400 hover:text-white transition"
                title="缩小 (亦可使用鼠标滚轮向下滚动)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono text-slate-400 px-1.5 tabular-nums">
                {(zoom * 100).toFixed(0)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom(prev => Math.min(2.5, Math.round((prev + 0.1) * 100) / 100))}
                className="p-1 text-slate-400 hover:text-white transition"
                title="放大 (亦可使用鼠标滚轮向上滚动)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="p-1 text-slate-500 hover:text-cyan-400 transition border-l border-slate-800 ml-0.5"
                title="还原为 100%"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-1.5 bg-[#0e121c] border-b border-slate-800 text-[10px] text-slate-400 flex items-center justify-between"><span>滚轮以鼠标为中心缩放 · 拖动卡片调整布局 · 空白处平移 · 卡片移动不改变实际抓距计算</span><button type="button" className="text-cyan-300 border border-cyan-800 rounded px-2 py-1 shrink-0" onClick={()=>{setCardPositions({});setActivePopup(null);}}>重置卡片布局</button></div>
      {/* SVG Canvas Stage Viewport - 独立非滚动视口外层，确保底部控制栏永远在底部吸附，绝不随缩放或平移乱跑 */}
      <div className="relative w-full overflow-hidden border-b border-slate-800/80">
        <div 
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onClick={(e) => {
            // 点击画布空白区域关闭弹出卡片 (若未点击交互元素与卡片本身)
            const target = e.target as HTMLElement;
            if (!target.closest('.canvas-interactive-item') && !target.closest('.canvas-popup-card')) {
              setActivePopup(null);
            }
          }}
          className={`w-full overflow-hidden bg-[#07090e] select-none bg-dsp-grid relative ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          } ${
            canvasHeightMode === 'compact'
              ? 'h-[360px] md:h-[380px]'
              : canvasHeightMode === 'tall'
              ? 'h-[520px] md:h-[580px] lg:h-[640px]'
              : canvasHeightMode === 'fit'
              ? 'h-[calc(100vh-260px)] min-h-[440px] max-h-[880px]'
              : 'h-[440px] md:h-[480px] lg:h-[520px]' // 'standard': 充裕开阔的电脑显示高度
          }`}
        >
        <div 
          style={{ 
            width: svgWidth,
            height: svgHeight,
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${zoom})`,
            transformOrigin: 'top left' 
          }}
          className="absolute left-0 top-0"
        >
          <svg
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="font-sans"
          >
            <defs>
              {/* Conveyor Belt Pattern / Grid Markers */}

              {/* Belt Roller Texture */}
              <pattern id="beltRollers" width="8" height="14" patternUnits="userSpaceOnUse">
                <rect width="7" height="14" fill="#0b1329" />
                <line x1="1" y1="0" x2="1" y2="14" stroke="#1e293b" strokeWidth="1" />
                <line x1="6" y1="0" x2="6" y2="14" stroke="#0ea5e9" strokeWidth="1" opacity="0.6" />
              </pattern>

              {/* Marker Arrow for Belt Direction */}
              <marker id="beltArrowCyan" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#00f0ff" />
              </marker>

              <marker id="beltArrowAmber" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#fbbf24" />
              </marker>

              {/* Filter glow for HUD */}
              <filter id="hudGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* The viewport owns the grid; a second scaled SVG grid causes moire while dragging. */}

            {/* ============================================================== */}
            {/* 1. INFLOW ZONE (BUFFER CHEST + SPLITTER MERGING) */}
            {/* ============================================================== */}
            <g transform={`translate(20, ${inletY})`}>
              {/* Outer boundary of Inlet Area */}
              <rect
                x="0"
                y="0"
                width={inletWidth}
                height="165"
                rx="6"
                fill="#0d1424"
                stroke="#1e293b"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text x="12" y="20" fill="#64748b" fontSize="10" fontWeight="600" letterSpacing="0.5">
                始端混料与合流区
              </text>

              {/* Inflow Inputs (Raw source) */}
              <rect x="15" y="35" width="45" height="30" rx="4" fill="#131e36" stroke="#334155" strokeWidth="1" />
              <text x="37" y="53" fill="#38bdf8" fontSize="10" textAnchor="middle" fontWeight="bold">
                新原料
              </text>

              {/* Buffer Storage Chest with storage-1 icon (点击显示详情卡片) */}
              <g 
                transform="translate(75, 26)"
                className="cursor-pointer canvas-interactive-item group"
                onClick={(e) => {
                  e.stopPropagation();
                  const cleanBase = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
                  handleTogglePopup({
                    id: 'buffer_chest',
                    title: '小型储物仓 (缓冲箱)',
                    subtitle: '防死锁容错缓冲节点',
                    category: '物流仓储',
                    tagColor: '#00f0ff',
                    iconSrc: getDspIconUrl('storage-1'),
                    anchorX: 20 + 75 + 23,
                    anchorY: inletY + 26 + 46,
                    anchorPlacement: 'bottom',
                    stats: [
                      { label: '防死锁推荐缓冲', value: `${bufferStorage.recommendedItems} items` },
                      { label: '推荐仓储箱数', value: `${bufferStorage.recommendedChests} 个` },
                      { label: '入口未占用运力', value: `${bufferStorage.residualReturnRate} /s` },
                      { label: '接入位置', value: '合流四向分流器输入端' },
                    ],
                    description: '闭环混流的核心缓冲机构，吸收回流余料并在供料不足时自动吐出，保持回路动平衡。',
                  });
                }}
              >
                <rect 
                  x="0" 
                  y="0" 
                  width="46" 
                  height="46" 
                  rx="6" 
                  fill="#0b172d" 
                  stroke={activePopup?.id === 'buffer_chest' ? '#38bdf8' : '#00f0ff'} 
                  strokeWidth={activePopup?.id === 'buffer_chest' ? 2.5 : 1.5} 
                  filter="url(#hudGlow)" 
                  className="transition-all duration-150 group-hover:stroke-cyan-300 group-hover:stroke-[2px]"
                />
                <foreignObject x="9" y="4" width="28" height="28" className="pointer-events-none">
                  <div className="w-full h-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <img 
                      src={getDspIconUrl('storage-1')}
                      alt="缓冲箱" 
                      title="点击查看缓冲箱参数"
                      className="w-full h-full object-contain filter drop-shadow"
                    />
                  </div>
                </foreignObject>
                <text x="23" y="40" fill="#00f0ff" fontSize="8" textAnchor="middle" fontWeight="bold">
                  缓冲箱
                </text>
              </g>

              {/* 4-Way Splitter / Merge node with splitter-4dir icon (点击显示详情卡片) */}
              <g 
                transform="translate(48, 93)"
                className="cursor-pointer canvas-interactive-item group"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePopup({
                    id: 'splitter_4dir',
                    title: '四向分流器',
                    subtitle: '优先合流控制枢纽',
                    category: '物流分流',
                    tagColor: '#38bdf8',
                    iconSrc: getDspIconUrl('splitter-4dir'),
                    anchorX: 20 + 48 + 23,
                    anchorY: inletY + 93 + 38,
                    anchorPlacement: 'bottom',
                    stats: [
                      { label: '合流逻辑', value: '回流料输入优先级高于新原料' },
                      { label: '输出带宽', value: `${beltCapacity} /s` },
                      { label: '端口配置', value: '下端回流输入 / 左端新料 / 右端主带' },
                      { label: '防死锁机制', value: '优先合流避免积压循环' },
                    ],
                    description: '四向分流器将回流传送带与新原料混合。回流优先可减少积压风险，还需控制新料输入和输出背压。',
                  });
                }}
              >
                <rect 
                  x="0" 
                  y="0" 
                  width="46" 
                  height="38" 
                  rx="6" 
                  fill="#1e293b" 
                  stroke={activePopup?.id === 'splitter_4dir' ? '#38bdf8' : '#38bdf8'} 
                  strokeWidth={activePopup?.id === 'splitter_4dir' ? 2.5 : 1.5}
                  className="transition-all duration-150 group-hover:stroke-cyan-300 group-hover:stroke-[2px]"
                />
                <foreignObject x="3" y="2" width="20" height="20" className="pointer-events-none">
                  <div className="w-full h-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <img 
                      src={getDspIconUrl('splitter-4dir')}
                      alt="四向分流器" 
                      title="点击查看四向分流器参数"
                      className="w-full h-full object-contain filter drop-shadow"
                    />
                  </div>
                </foreignObject>
                <path d="M 24 12 L 40 12" stroke="#00f0ff" strokeWidth="2" markerEnd="url(#beltArrowCyan)" />
                <path d="M 23 28 L 23 18" stroke="#fbbf24" strokeWidth="2" />
                <text x="23" y="34" fill="#94a3b8" fontSize="8" textAnchor="middle">四向分流器</text>
              </g>

              {/* Connection Lines within Inlet */}
              {/* Raw Inflow -> Splitter */}
              <path d="M 37 65 L 37 112 L 48 112" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
              {/* Buffer -> Splitter */}
              <path d="M 97 74 L 97 112 L 94 112" fill="none" stroke="#00f0ff" strokeWidth="2" />

              <text x="12" y="152" fill="#475569" fontSize="9" fontStyle="italic">
                容错缓冲: {bufferStorage.recommendedItems} items
              </text>
            </g>

            {/* ============================================================== */}
            {/* 2. MAIN MIXED CONVEYOR BELT (FEEDING ROW) */}
            {/* ============================================================== */}
            {/* Belt Base Line */}
            {(() => {
              const beltStartX = startX - 25;
              const beltEndX = startX + displayFacilityCount * (facilityWidth + facilityGap);

              return (
                <g>
                  {/* Belt Track Shadow / Frame */}
                  <line
                    x1={beltStartX}
                    y1={mainBeltY}
                    x2={beltEndX}
                    y2={mainBeltY}
                    stroke="#111827"
                    strokeWidth="20"
                    strokeLinecap="round"
                  />
                  {/* Moving / Flowing Main Belt */}
                  <line
                    x1={beltStartX}
                    y1={mainBeltY}
                    x2={beltEndX}
                    y2={mainBeltY}
                    stroke={belt.tier === 3 ? '#0284c7' : belt.tier === 2 ? '#15803d' : '#ca8a04'}
                    strokeWidth="14"
                    strokeLinecap="round"
                  />
                  {/* Dash overlay for moving effect */}
                  <line
                    x1={beltStartX}
                    y1={mainBeltY}
                    x2={beltEndX}
                    y2={mainBeltY}
                    stroke="#ffffff"
                    strokeWidth="3"
                    strokeDasharray="6 12"
                    className={isPlaying ? 'animate-belt-flow' : ''}
                    opacity="0.8"
                  />
                  {/* Flow Arrow Indicator */}
                  <path
                    d={`M ${beltEndX - 5} ${mainBeltY} L ${beltEndX + 5} ${mainBeltY}`}
                    stroke="#00f0ff"
                    strokeWidth="3"
                    markerEnd="url(#beltArrowCyan)"
                  />

                  {/* Belt Capacity Tag at Start with Belt Tier Icon (点击查看传送带与运力) */}
                  <g 
                    transform={`translate(${beltStartX + 10}, ${mainBeltY + 22})`}
                    className="cursor-pointer canvas-interactive-item group"
                    onClick={(e) => {
                      e.stopPropagation();
                      const cleanBase = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
                      const normalizedBase = cleanBase.endsWith('/') ? cleanBase : `${cleanBase}/`;
                      handleTogglePopup({
                        id: 'main_belt',
                        title: belt.name,
                        subtitle: `主混合进料传送带 (${beltStackLayers}层堆叠)`,
                        category: '传送系统',
                        tagColor: belt.tier === 3 ? '#0284c7' : belt.tier === 2 ? '#15803d' : '#ca8a04',
                        iconSrc: `${normalizedBase}dsp_icons/belt-${belt.tier}.png`,
                        anchorX: beltStartX + 10 + 84,
                        anchorY: mainBeltY + 22 + 22,
                        anchorPlacement: 'bottom',
                        stats: [
                          { label: '单层基准运力', value: `${belt.baseSpeed} /s` },
                          { label: '堆叠倍率', value: `${beltStackLayers} 层 (${beltCapacity} /s)` },
                          { label: '总需求负荷', value: `${result.totalFeedRateDemand} /s (${result.beltLoadPercentage.toFixed(1)}%)` },
                          { label: '运力状态', value: isBeltOverloaded ? '超载卡带' : '负荷充足' },
                        ],
                        description: '主混合进料带按计算出的穿插交错模式携带全部所需原料，掠过所有制造设施前端。',
                      });
                    }}
                  >
                    <rect 
                      x="0" 
                      y="0" 
                      width="168" 
                      height="22" 
                      rx="4" 
                      fill="#07090e" 
                      stroke={activePopup?.id === 'main_belt' ? '#38bdf8' : '#1e293b'} 
                      strokeWidth={activePopup?.id === 'main_belt' ? 2 : 1.2} 
                      className="transition-all duration-150 group-hover:stroke-cyan-400"
                    />
                    <foreignObject x="3" y="2" width="18" height="18" className="pointer-events-none">
                      <DSPBeltIcon belt={belt} size={18} showTooltip={false} />
                    </foreignObject>
                    <text x="25" y="14" fill="#94a3b8" fontSize="9" fontWeight="medium">
                      {belt.name.split(' ')[0]}
                    </text>
                    <text x="162" y="14" fill="#38bdf8" fontSize="10" textAnchor="end" fontWeight="bold" fontFamily="monospace">
                      {beltCapacity} /s
                    </text>
                  </g>
                </g>
              );
            })()}

            {/* Render Material Tokens on Belt representing Interleaved Pattern (点击显示原料详情) */}
            {(() => {
              const tokens = [];
              const beltStartX = startX;
              const beltEndX = startX + displayFacilityCount * (facilityWidth + facilityGap);
              const step = 42; // pixel step between tokens on belt

              let tokenIdx = 0;
              for (let x = beltStartX + 20; x < beltEndX - 20; x += step) {
                const patternItem = interleavedPattern[tokenIdx % interleavedPattern.length];
                const itemMeta = DSP_ITEMS[patternItem];
                tokenIdx++;

                if (!itemMeta) continue;

                const cleanBase = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
                const normalizedBase = cleanBase.endsWith('/') ? cleanBase : `${cleanBase}/`;
                const itemIconUrl = itemMeta.iconUrl || (itemMeta.iconName ? `${normalizedBase}dsp_icons/${itemMeta.iconName}.png` : undefined);
                const mat = materials.find(m => m.itemId === itemMeta.id || m.itemName === itemMeta.name);
                const isItemActive = activePopup?.id === `token_${x}`;

                tokens.push(
                  <g 
                    key={`token_${x}`} 
                    transform={`translate(${x}, ${mainBeltY})`}
                    className="cursor-pointer canvas-interactive-item group"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePopup({
                        id: `token_${x}`,
                        title: itemMeta.name,
                        subtitle: '主混料带原料 (在带流动)',
                        category: '配方原料',
                        tagColor: itemMeta.color || '#00f0ff',
                        iconSrc: itemIconUrl,
                        iconSymbol: itemMeta.iconSymbol,
                        anchorX: x,
                        anchorY: mainBeltY + 12,
                        anchorPlacement: 'bottom',
                        stats: [
                          { label: '单台设施需求', value: mat ? `${mat.feedRatePerFacility} /s` : '-' },
                          { label: '整条产线需求', value: mat ? `${mat.totalFeedRateAllFacilities} /s` : '-' },
                          { label: '单次合成用量', value: mat ? `${mat.countPerCraft} 个/次` : '-' },
                          { label: '推荐分拣爪', value: mat ? `${mat.recommendedSorter.name.split(' ')[0]} (${mat.recommendedDistance}格)` : '-' },
                        ],
                        description: `配方「${recipe.name}」的关键原料。在混料传送带上按比例循环排布，分拣爪就近抓取。`,
                      });
                    }}
                  >
                    {/* Generous clickable transparent area */}
                    <circle cx="0" cy="0" r="14" fill="transparent" />
                    {/* Active focus ring if clicked */}
                    {isItemActive && (
                      <circle cx="0" cy="0" r="13" fill="none" stroke="#00f0ff" strokeWidth="2" filter="url(#hudGlow)" />
                    )}
                    <foreignObject x="-10" y="-10" width="20" height="20" className="pointer-events-none">
                      <div className="w-full h-full flex items-center justify-center group-hover:scale-125 transition-transform duration-150">
                        <DSPItemIcon item={itemMeta} size={20} showTooltip={false} />
                      </div>
                    </foreignObject>
                  </g>
                );
              }
              return <g>{tokens}</g>;
            })()}

            {/* ============================================================== */}
            {/* 3. PRODUCTION FACILITY ARRAY & SORTERS */}
            {/* ============================================================== */}
            {Array.from({ length: displayFacilityCount }).map((_, i) => {
              const originalX = startX + i * (facilityWidth + facilityGap);
              const facX = cardPositions[i]?.x ?? originalX;
              const cardY = cardPositions[i]?.y ?? facilityY;
              const isSelected = selectedFacilityIndex === i;

              return (
                <g 
                  key={`facility_${i}`}
                  onClick={() => setSelectedFacilityIndex(i)}
                  className="cursor-pointer"
                >
                  {/* Sorters (爪带) connecting Main Belt to Facility (点击显示爪带详情) */}
                  {materials.map((mat, matIdx) => {
                    const offset = (matIdx - (materials.length - 1) / 2) * 18;
                    const sorterX = facX + facilityWidth / 2 + offset;
                    const startY = mainBeltY - 8;
                    const beltX = originalX + facilityWidth / 2 + offset;
                    const endY = cardY + facilityHeight;

                    const sorterColor = mat.recommendedSorter.hexColor;
                    const midY = (startY + endY) / 2;
                    const isSorterActive = activePopup?.id === `sorter_${i}_${mat.itemId}`;

                    return (
                      <g 
                        key={`sorter_${i}_${mat.itemId}`}
                        className="cursor-pointer canvas-interactive-item group"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePopup({
                            id: `sorter_${i}_${mat.itemId}`,
                            title: mat.recommendedSorter.name,
                            subtitle: `分拣目标: ${mat.itemName} (${mat.recommendedDistance}格抓距)`,
                            category: '分拣设备',
                            tagColor: sorterColor,
                            iconSrc: getDspIconUrl(`inserter-${mat.recommendedSorter.tier}`),
                            iconSymbol: mat.recommendedSorter.name.slice(0, 2),
                            anchorX: sorterX,
                            anchorY: mainBeltY + 12,
                            anchorPlacement: 'bottom',
                            stats: [
                              { label: '抓取原料', value: mat.itemName },
                              { label: '推荐抓距', value: `${mat.recommendedDistance} 格` },
                              { label: '单爪能力', value: `${mat.sorterThroughput} /s` },
                              { label: '单台需求', value: `${mat.feedRatePerFacility} /s` },
                            ],
                            description: `将主混合进料带上的「${mat.itemName}」按需分拣送入 #${i + 1} 号设施内部。`,
                          });
                        }}
                      >
                        {/* Generous hit area for clicking sorter line */}
                        <line
                          x1={beltX}
                          y1={startY}
                          x2={sorterX}
                          y2={endY + 2}
                          stroke="transparent"
                          strokeWidth="16"
                        />
                        {/* Sorter Arm Guide / Beam Line */}
                        <line
                          x1={beltX}
                          y1={startY}
                          x2={sorterX}
                          y2={endY + 2}
                          stroke={isSorterActive ? '#ffffff' : sorterColor}
                          strokeWidth={isSorterActive ? '4' : '3'}
                          strokeLinecap="round"
                          className="transition-all duration-150 group-hover:stroke-[4px]"
                        />
                        {/* Sorter Gripper Arrow Head pointing into facility */}
                        <polygon
                          points={`${sorterX - 3.5},${endY + 8} ${sorterX + 3.5},${endY + 8} ${sorterX},${endY + 2}`}
                          fill={isSorterActive ? '#ffffff' : sorterColor}
                        />
                        {/* Sorter Joint Pivot Base on Belt */}
                        <circle cx={beltX} cy={startY} r="3" fill="#07090e" stroke={sorterColor} strokeWidth="1.8" />

                        {/* Sorter Distance Badge */}
                        {showFlowLabels && (i === 0 || isSelected) && (
                          <g transform={`translate(${sorterX}, ${midY})`}>
                            <rect 
                              x="-14" 
                              y="-7.5" 
                              width="28" 
                              height="15" 
                              rx="3" 
                              fill="#07090e" 
                              stroke={isSorterActive ? '#ffffff' : sorterColor} 
                              strokeWidth={isSorterActive ? 1.8 : 1.2} 
                            />
                            <text 
                              x="0" 
                              y="3" 
                              fill={isSorterActive ? '#ffffff' : sorterColor} 
                              fontSize="8" 
                              textAnchor="middle" 
                              fontWeight="bold"
                              fontFamily="monospace"
                            >
                              {mat.recommendedDistance}格
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {/* Facility Building Card */}
                  <g data-mixed-card={i} data-reference-machine={i===0} data-selected-machine={isSelected} data-overloaded-machine={isBeltOverloaded && i >= maxFacilitiesLimit} transform={`translate(${facX}, ${cardY})`} className="cursor-grab active:cursor-grabbing"
                    onPointerDown={event => { if(event.button!==0)return; if((event.target as Element).closest('.canvas-interactive-item')){event.stopPropagation();return;} event.stopPropagation(); cardDrag.current={index:i,x:event.clientX,y:event.clientY,originX:facX,originY:cardY,moved:false}; suppressClick.current=false; event.currentTarget.setPointerCapture(event.pointerId); setSelectedFacilityIndex(i); }}
                    onPointerMove={event => { const drag=cardDrag.current;if(!drag || drag.index!==i)return;const dx=event.clientX-drag.x;const dy=event.clientY-drag.y;if(Math.hypot(dx,dy)<3 && !drag.moved)return;drag.moved=true;suppressClick.current=true;setActivePopup(null);setCardPositions(previous=>({...previous,[i]:{x:Math.max(0,drag.originX+dx/zoom),y:Math.max(0,drag.originY+dy/zoom)}})); }}
                    onPointerUp={() => {cardDrag.current=null;}}
                    onPointerCancel={() => {cardDrag.current=null;}}
                    onLostPointerCapture={() => {cardDrag.current=null;}}
                    onClickCapture={event=>{if(suppressClick.current){event.stopPropagation();suppressClick.current=false;}}}
                    onDragStart={event=>event.preventDefault()}>
                    <title>拖动调整卡片位置（仅布局示意）</title>
                    <rect className="machine-body"
                      x="0"
                      y="0"
                      width={facilityWidth}
                      height={facilityHeight}
                      rx="6"
                      fill={isSelected ? '#131e36' : '#0c1220'}
                      stroke={
                        isBeltOverloaded && i >= maxFacilitiesLimit
                          ? '#ef4444'
                          : isSelected
                          ? '#00f0ff'
                          : '#1e293b'
                      }
                      strokeWidth={isSelected ? 2 : 1.2}
                      filter={isSelected ? 'url(#hudGlow)' : undefined}
                    />

                    {/* Facility Number Header */}
                    <rect className="machine-header" x="0" y="0" width={facilityWidth} height="18" rx="6" fill="#1e293b" opacity="0.6" />
                    <text className="machine-header-label" x="8" y="12" fill="#94a3b8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                      #{i + 1}
                    </text>
                    <text className="machine-header-label" x={facilityWidth - 8} y="12" fill="#38bdf8" fontSize="9" textAnchor="end" fontWeight="bold">
                      {facility.speedMultiplier}x
                    </text>

                    {i===0&&<circle className="machine-reference-light" cx={facilityWidth/2} cy="9" r="2.5" fill="#FF5722"><title>首台基准机器</title></circle>}
                    {/* Facility Building & Recipe Output Icons (点击显示详情) */}
                    <foreignObject
                      x={8}
                      y={22}
                      width={facilityWidth - 16}
                      height={36}
                    >
                      <div className="w-full h-full flex items-center justify-between gap-1 px-1">
                        {/* Facility Building Icon */}
                        <div 
                          className="w-7 h-7 shrink-0 flex items-center justify-center cursor-pointer canvas-interactive-item hover:scale-110 transition-transform"
                          title={`点击查看 ${facility.name} 参数`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFacilityIndex(i);
                            const cleanBase = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
                            const normalizedBase = cleanBase.endsWith('/') ? cleanBase : `${cleanBase}/`;
                            handleTogglePopup({
                              id: `facility_icon_${i}`,
                              title: `${facility.name} #${i + 1}`,
                              subtitle: `制造设施 (${facility.speedMultiplier}x 生产倍率)`,
                              category: '制造设施',
                              tagColor: facility.color || '#38bdf8',
                              iconSrc: `${normalizedBase}dsp_icons/${facility.iconName || 'assembler-1'}.png`,
                              anchorX: facX + 22,
                              anchorY: cardY + facilityHeight + 8,
                              anchorPlacement: 'bottom',
                              stats: [
                                { label: '生产倍率', value: `${facility.speedMultiplier}x` },
                                { label: '单台原料需求', value: `${result.feedRatePerFacilityTotal} /s` },
                                { label: '整线总设施数', value: `${actualFacilitiesCount} 台` },
                                { label: '满载状态', value: isBeltOverloaded && i >= maxFacilitiesLimit ? '原料卡带' : '额定满载' },
                              ],
                              description: `当前生产单元 #${i + 1}。混流原料在传送带上按交错次序流动，爪子将匹配物料抓取投入。`,
                            });
                          }}
                        >
                          <FacilityIconRenderer facility={facility} size={28} />
                        </div>

                        <span className="text-slate-600 font-bold text-[9px]">▶</span>

                        {/* Recipe Output Product */}
                        <div 
                          className="w-7 h-7 shrink-0 flex items-center justify-center cursor-pointer canvas-interactive-item hover:scale-110 transition-transform"
                          title="点击查看产出物品详情"
                          onClick={(e) => {
                            e.stopPropagation();
                            const primaryOutput = recipe.outputs[0];
                            const targetItem = primaryOutput 
                              ? (DSP_ITEMS[primaryOutput.itemId] || DSP_ITEMS[recipe.name] || Object.values(DSP_ITEMS).find(it => it.id === primaryOutput.itemId || it.name === primaryOutput.itemId) || null)
                              : null;
                            if (targetItem) {
                              const cleanBase = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
                              const normalizedBase = cleanBase.endsWith('/') ? cleanBase : `${cleanBase}/`;
                              const iconUrl = targetItem.iconUrl || (targetItem.iconName ? `${normalizedBase}dsp_icons/${targetItem.iconName}.png` : undefined);
                              handleTogglePopup({
                                id: `output_product_${i}`,
                                title: targetItem.name,
                                subtitle: `配方最终产物 (${recipe.name})`,
                                category: '配方产物',
                                tagColor: targetItem.color || '#38bdf8',
                                iconSrc: iconUrl,
                                iconSymbol: targetItem.iconSymbol,
                                anchorX: facX + facilityWidth - 22,
                                anchorY: cardY + facilityHeight + 8,
                                anchorPlacement: 'bottom',
                                stats: [
                                  { label: '单台理论产量', value: `${(result.outputs[0]?.ratePerFacility ?? 0).toFixed(2)} /s` },
                                  { label: '配方基础耗时', value: `${recipe.craftTime} 秒` },
                                  { label: '整线理论总产量', value: `${((result.outputs[0]?.ratePerMinute ?? 0) / 60).toFixed(2)} /s` },
                                  { label: '输出方式', value: '独立输出带送出' },
                                ],
                                description: `设施生产的最终产物。通常由背面或侧面的专用输出传送带输出至主线或仓储。`,
                              });
                            }
                          }}
                        >
                          {(() => {
                            const primaryOutput = recipe.outputs[0];
                            const targetItem = primaryOutput 
                              ? (DSP_ITEMS[primaryOutput.itemId] || DSP_ITEMS[recipe.name] || Object.values(DSP_ITEMS).find(it => it.id === primaryOutput.itemId || it.name === primaryOutput.itemId) || null)
                              : null;

                            return targetItem ? (
                              <DSPItemIcon item={targetItem} size={28} showTooltip={false} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center rounded bg-slate-800 text-cyan-400 font-mono text-[9px] font-bold border border-slate-700">
                                {recipe.name.slice(0, 2)}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </foreignObject>

                    {/* Crafting State Bar */}
                    <rect x="12" y="64" width={facilityWidth - 24} height="6" rx="3" fill="#1e293b" />
                    <rect
                      x="12"
                      y="64"
                      width={(facilityWidth - 24) * 0.8}
                      height="6"
                      rx="3"
                      fill={isBeltOverloaded && i >= maxFacilitiesLimit ? '#ef4444' : '#22c55e'}
                    />
                  </g>
                </g>
              );
            })}

            {/* If actual facility count > displayed, show summary indicator card */}
            {actualFacilitiesCount > displayFacilityCount && (
              <g transform={`translate(${startX + displayFacilityCount * (facilityWidth + facilityGap)}, ${facilityY})`}>
                <rect x="0" y="0" width="70" height={facilityHeight} rx="6" fill="#0d1424" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                <text x="35" y="38" fill="#38bdf8" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  +{actualFacilitiesCount - displayFacilityCount}
                </text>
                <text x="35" y="52" fill="#64748b" fontSize="9" textAnchor="middle">
                  后续设施
                </text>
              </g>
            )}

            {/* ============================================================== */}
            {/* 4. END-TO-END LOOPBACK RETURN BELT (ANTI-DEADLOCK CIRCULATION) */}
            {/* ============================================================== */}
            {(() => {
              const beltEndX = startX + displayFacilityCount * (facilityWidth + facilityGap) + (actualFacilitiesCount > displayFacilityCount ? 80 : 0);
              const loopReturnX = 40;
              const badgeWidth = 120;
              // 闭环回流提示框在回流带主区间水平居中
              const badgeX = (startX + beltEndX - badgeWidth) / 2;

              return (
                <g>
                  {/* End curve wrapping down to loopback line */}
                  <path
                    d={`
                      M ${beltEndX} ${mainBeltY}
                      Q ${beltEndX + 35} ${mainBeltY} ${beltEndX + 35} ${mainBeltY + (loopbackY - mainBeltY) / 2}
                      Q ${beltEndX + 35} ${loopbackY} ${beltEndX} ${loopbackY}
                      L ${loopReturnX + 30} ${loopbackY}
                      Q ${loopReturnX} ${loopbackY} ${loopReturnX} ${loopbackY - 30}
                      L ${loopReturnX} ${inletY + 93 + 28}
                      L ${20 + 48 + 23} ${inletY + 93 + 28}
                    `}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={isPlaying ? '8 6' : 'none'}
                    className={isPlaying ? 'animate-belt-flow' : ''}
                    opacity="0.9"
                  />

                  {/* Return Belt Direction Arrows */}
                  <path
                    d={`M ${beltEndX - 20} ${loopbackY} L ${beltEndX - 35} ${loopbackY}`}
                    stroke="#fbbf24"
                    strokeWidth="3"
                    markerEnd="url(#beltArrowAmber)"
                  />
                  <path
                    d={`M ${startX + 80} ${loopbackY} L ${startX + 60} ${loopbackY}`}
                    stroke="#fbbf24"
                    strokeWidth="3"
                    markerEnd="url(#beltArrowAmber)"
                  />

                  {/* Anti-Deadlock Return Line Tag (提示框宽度 120，水平居中对齐，点击弹出说明) */}
                  <g 
                    transform={`translate(${badgeX}, ${loopbackY + 12})`}
                    className="cursor-pointer canvas-interactive-item group"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePopup({
                        id: 'loopback_badge',
                        title: '闭环回流示意线',
                        subtitle: '末端至始端闭环回流传送带',
                        category: '混流核心',
                        tagColor: '#f59e0b',
                        anchorX: badgeX + badgeWidth / 2,
                        anchorY: loopbackY - 4,
                        anchorPlacement: 'top',
                        stats: [
                          { label: '回路走向', value: '末端回流至始端四向分流器' },
                          { label: '防死锁机制', value: '未被拾取的原料循环流动，永不堵塞' },
                          { label: '优先合流', value: '回流料享有优先权，空位补新料' },
                          { label: '垂直间距', value: '200px 保持开阔整洁' },
                        ],
                        description: '回流与缓冲有助于消化暂时余料，但不能修复长期配比失衡；需要验证回流优先级、补料控制和产物输出。',
                      });
                    }}
                  >
                    <rect 
                      x="0" 
                      y="0" 
                      width={badgeWidth} 
                      height="20" 
                      rx="3" 
                      fill="#07090e" 
                      stroke={activePopup?.id === 'loopback_badge' ? '#fbbf24' : '#f59e0b'} 
                      strokeWidth={activePopup?.id === 'loopback_badge' ? 2 : 1} 
                      className="transition-all duration-150 group-hover:stroke-amber-300 group-hover:fill-slate-900"
                    />
                    <text x={badgeWidth / 2} y="14" fill="#fbbf24" fontSize="10" textAnchor="middle" fontWeight="bold">
                      闭环回流
                    </text>
                  </g>
                </g>
              );
            })()}
          </svg>

          {/* ============================================================== */}
          {/* ACTIVE CLICKED ITEM INSPECTOR POPUP (缩放自适应锚定在被点击物体位置) */}
          {/* ============================================================== */}
          {activePopup && (() => {
            const cardWidth = 268;
            // 保证卡片横向居中并限制在画布安全区间内，避免左侧或右侧溢出裁剪
            const cardLeft = Math.max(cardWidth / 2 + 10, Math.min(svgWidth - cardWidth / 2 - 10, activePopup.anchorX));
            // 箭头指针偏移量 (指向实际物体的 anchorX)
            const arrowOffset = Math.max(-cardWidth / 2 + 18, Math.min(cardWidth / 2 - 18, activePopup.anchorX - cardLeft));
            const isBottom = activePopup.anchorPlacement === 'bottom';

            return (
              <div
                className="canvas-popup-card absolute z-50 select-text transition-all duration-150 animate-in fade-in zoom-in-95"
                style={{
                  left: `${cardLeft}px`,
                  top: `${activePopup.anchorY}px`,
                  // 关键：结合外层 scale(zoom)，内层 counter-scale(1/zoom) 消除缩放变形，保持字体100%清晰且永远锁定在物体真实位置
                  transform: `translate(-50%, ${isBottom ? '14px' : 'calc(-100% - 14px)'}) scale(${1 / zoom})`,
                  transformOrigin: isBottom ? `calc(50% + ${arrowOffset}px) 0%` : `calc(50% + ${arrowOffset}px) 100%`,
                  width: `${cardWidth}px`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div 
                  className="relative bg-[#090e1a]/95 rounded-xl border p-3.5 text-slate-100 flex flex-col gap-2.5 backdrop-blur-md shadow-2xl"
                  style={{
                    borderColor: activePopup.tagColor || '#00f0ff',
                    boxShadow: `0 0 24px ${activePopup.tagColor || '#00f0ff'}40, 0 16px 36px rgba(0,0,0,0.9)`,
                  }}
                >
                  {/* Caret Needle pointing directly to clicked item */}
                  {isBottom ? (
                    <div 
                      className="absolute -top-[7px] w-3 h-3 rotate-45 border-l border-t bg-[#090e1a]"
                      style={{
                        left: `calc(50% + ${arrowOffset}px - 6px)`,
                        borderColor: activePopup.tagColor || '#00f0ff',
                      }}
                    />
                  ) : (
                    <div 
                      className="absolute -bottom-[7px] w-3 h-3 rotate-45 border-r border-b bg-[#090e1a]"
                      style={{
                        left: `calc(50% + ${arrowOffset}px - 6px)`,
                        borderColor: activePopup.tagColor || '#00f0ff',
                      }}
                    />
                  )}

                  {/* Header: Icon + Title + Category + Close Button */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PopupIconRenderer 
                        iconSrc={activePopup.iconSrc} 
                        iconSymbol={activePopup.iconSymbol} 
                        title={activePopup.title} 
                        tagColor={activePopup.tagColor || '#00f0ff'} 
                      />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-white tracking-wide truncate">
                            {activePopup.title}
                          </span>
                          {activePopup.category && (
                            <span 
                              className="text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold"
                              style={{
                                color: activePopup.tagColor || '#00f0ff',
                                borderColor: `${activePopup.tagColor || '#00f0ff'}40`,
                                backgroundColor: `${activePopup.tagColor || '#00f0ff'}15`,
                              }}
                            >
                              {activePopup.category}
                            </span>
                          )}
                        </div>
                        {activePopup.subtitle && (
                          <span className="text-[11px] text-slate-400 truncate mt-0.5">
                            {activePopup.subtitle}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Close button */}
                    <button
                      type="button"
                      onClick={() => setActivePopup(null)}
                      className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition shrink-0 cursor-pointer"
                      title="关闭 (Esc / 点击空白)"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* In-Game Stats / Parameters Grid */}
                  {activePopup.stats && activePopup.stats.length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      {activePopup.stats.map((stat, sIdx) => (
                        <div key={sIdx} className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {stat.label}
                          </span>
                          <span 
                            className="text-xs font-mono font-bold truncate mt-0.5"
                            style={{ color: stat.color || '#38bdf8' }}
                          >
                            {stat.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Mechanism / Gameplay Description */}
                  {activePopup.description && (
                    <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/40 p-2 rounded-lg border border-slate-800/40">
                      {activePopup.description}
                    </p>
                  )}

                  {/* Footer Hint */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/40">
                    <span className="text-cyan-400/90 font-medium">⚡ 缩放自适应定位</span>
                    <span>点击空白关闭</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 底部吸附控制栏 (稳固吸附在视口底部，无论缩放多大比例或如何拖拽平移都绝不漂移乱跑) */}
      <div className="absolute bottom-2.5 right-3 pointer-events-auto z-20 flex items-center gap-2 bg-slate-950/95 border border-slate-800/90 px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-mono text-slate-300 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.7)] select-none">
        <span className="flex items-center gap-1.5 text-slate-400">
          <MousePointer className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">点击图标查看详情 · 滚轮缩放 / 拖拽平移</span>
          <span className="sm:hidden">点击看详情 · 滚轮缩放</span>
        </span>
        <span className="text-slate-600">|</span>
        <button
          type="button"
          onClick={handleAutoFit}
          className="text-cyan-400 hover:text-cyan-200 font-bold underline cursor-pointer hover:scale-105 active:scale-95 transition-transform"
          title="点击自适应视口"
        >
          {(zoom * 100).toFixed(0)}% (点击自适应)
        </button>
      </div>
    </div>

      {/* 2D Layout Comprehensive Legend (图例组件：解释设施类型与 Mk.I/II/III 视觉区分) */}
      <div className="p-3 sm:p-4 bg-slate-900/40 border-t border-slate-800">
        <SchematicLegend
          currentFacility={facility}
          currentBelt={belt}
          beltStackLayers={beltStackLayers}
          currentSorter={result.materials[0]?.recommendedSorter}
          isOverloaded={isBeltOverloaded}
          defaultExpanded={false}
        />
      </div>

      {/* Recommended Infeed Sequence Pattern (傻瓜式入带序列可视化) */}
      <div className="p-3 sm:p-4 bg-slate-900/60 border-t border-slate-800">
        <BeltSequencePattern
          sequenceInfo={result.beltSequenceInfo}
          belt={belt}
          beltStackLayers={beltStackLayers}
          materials={result.materials}
          feedRateTotal={result.totalFeedRateDemand}
          defaultExpanded={false}
        />
      </div>

      {/* Interactive Legend & Sorter Inspection Footer */}
      <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Sorters color code legend */}
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-medium">分拣爪色标:</span>
          {DSP_SORTERS.map(s => (
            <div key={s.tier} className="flex items-center gap-1.5 font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800/80">
              <DSPSorterIcon sorter={s} size={16} />
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.hexColor }} />
              <span className="text-slate-300">{s.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>

        {/* Selected Facility Inspector */}
        {selectedFacilityIndex !== null && (
          <div className="flex items-center gap-2 font-mono text-[11px] bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            <div className="w-5 h-5 shrink-0 flex items-center justify-center">
              <FacilityIconRenderer facility={facility} size={20} />
            </div>
            <span className="text-cyan-400 font-semibold">{facility.name} #{selectedFacilityIndex + 1}:</span>
            <span className="text-slate-300">
              单台进料 {Number(result.feedRatePerFacilityTotal.toFixed(3))} /s
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300">
              状态: {isBeltOverloaded && selectedFacilityIndex >= maxFacilitiesLimit ? '原料卡带' : '额定满载'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
