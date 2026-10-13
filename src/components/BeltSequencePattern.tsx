import React, { useState } from 'react';
import { BeltSequenceInfo, MaterialFeedSpec } from '../engine/calculator';
import { DSPRecipe, DSPBelt, DSP_ITEMS } from '../data/dspData';
import { DSPItemIcon } from './DSPItemIcon';
import { 
  ArrowRight, 
  Copy, 
  Check, 
  HelpCircle, 
  Sparkles, 
  Shuffle, 
  Repeat, 
  Layers,
  Info,
  Play,
  Pause,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export interface BeltSequencePatternProps {
  recipe?: DSPRecipe;
  sequenceInfo?: BeltSequenceInfo;
  belt?: DSPBelt;
  beltStackLayers?: number;
  materials?: MaterialFeedSpec[];
  feedRateTotal?: number;
  defaultExpanded?: boolean;
}

// Bresenham error-distribution algorithm to evenly interleave inputs
function computeInterleavedSequence(inputs: { itemId: string; count: number }[]): string[] {
  if (!inputs || inputs.length === 0) return [];
  if (inputs.length === 1) return Array(inputs[0].count).fill(inputs[0].itemId);

  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const commonDivisor = inputs.reduce((acc, curr) => gcd(acc, curr.count), inputs[0].count);
  const normalizedInputs = inputs.map(i => ({
    itemId: i.itemId,
    count: Math.max(1, Math.round(i.count / (commonDivisor || 1))),
  }));

  const totalSlots = normalizedInputs.reduce((sum, item) => sum + item.count, 0);
  const pattern: string[] = [];
  const accumulators = normalizedInputs.map(() => 0);

  for (let step = 0; step < totalSlots; step++) {
    let bestIndex = 0;
    let maxVal = -1;

    for (let i = 0; i < normalizedInputs.length; i++) {
      accumulators[i] += normalizedInputs[i].count;
      if (accumulators[i] > maxVal) {
        maxVal = accumulators[i];
        bestIndex = i;
      }
    }

    pattern.push(normalizedInputs[bestIndex].itemId);
    accumulators[bestIndex] -= totalSlots;
  }

  return pattern;
}

export const BeltSequencePattern: React.FC<BeltSequencePatternProps> = ({
  recipe,
  sequenceInfo: providedSequenceInfo,
  belt,
  beltStackLayers = 1,
  materials,
  feedRateTotal,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [copied, setCopied] = useState(false);
  const [showFormulaTip, setShowFormulaTip] = useState(false);
  const [selectedItemFilter, setSelectedItemFilter] = useState<string | null>(null);
  const [isFlowing, setIsFlowing] = useState<boolean>(true);

  // Speed multiplier based on belt tier
  const beltSpeedVal = belt ? belt.baseSpeed : 12;
  const flowDurationSec = Math.max(0.7, Math.min(2.8, (24 / beltSpeedVal) * 1.0));

  // Compute sequence info from recipe if not directly provided
  const resolvedSequenceInfo: BeltSequenceInfo | null = React.useMemo(() => {
    if (providedSequenceInfo) return providedSequenceInfo;
    if (!recipe || !recipe.inputs || recipe.inputs.length === 0) return null;

    const pattern = computeInterleavedSequence(recipe.inputs);
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const gcdDivisor = recipe.inputs.length > 0
      ? recipe.inputs.reduce((acc, curr) => gcd(acc, curr.count), recipe.inputs[0].count)
      : 1;

    const totalRaw = recipe.inputs.reduce((sum, i) => sum + i.count, 0);

    const steps = pattern.map((itemId, idx) => {
      const itemData = DSP_ITEMS[itemId] || { name: itemId, color: '#38bdf8', iconSymbol: itemId.slice(0, 2) };
      return {
        itemId,
        itemName: itemData.name,
        itemColor: itemData.color,
        itemSymbol: itemData.iconSymbol,
        stepIndex: idx + 1,
      };
    });

    const itemBreakdown = recipe.inputs.map(inp => {
      const itemData = DSP_ITEMS[inp.itemId] || { name: inp.itemId, color: '#38bdf8', iconSymbol: inp.itemId.slice(0, 2) };
      const countInCycle = Math.round(inp.count / (gcdDivisor > 0 ? gcdDivisor : 1));
      const ratioPercent = totalRaw > 0 ? Number(((inp.count / totalRaw) * 100).toFixed(1)) : 0;
      return {
        itemId: inp.itemId,
        itemName: itemData.name,
        itemColor: itemData.color,
        itemSymbol: itemData.iconSymbol,
        count: countInCycle,
        ratioPercent,
      };
    });

    return {
      pattern,
      cycleLength: steps.length,
      gcdDivisor,
      steps,
      itemBreakdown,
    };
  }, [recipe, providedSequenceInfo]);

  if (!resolvedSequenceInfo || !resolvedSequenceInfo.steps || resolvedSequenceInfo.steps.length === 0) {
    return null;
  }

  const { steps, cycleLength, itemBreakdown, gcdDivisor } = resolvedSequenceInfo;

  if (!steps || steps.length === 0) {
    return null;
  }

  // Generate readable text sequence
  const sequenceText = steps.map(s => s.itemName).join(' → ');

  const handleCopySequence = () => {
    navigator.clipboard.writeText(sequenceText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Repeated visual demonstration (repeat cycle 2-3 times if short to simulate endless belt flow)
  const displayCycles = cycleLength <= 8 ? 2 : 1;
  const fullDisplaySteps = Array.from({ length: displayCycles }).flatMap((_, cycleIdx) =>
    steps.map(step => ({
      ...step,
      uniqueKey: `${cycleIdx}-${step.stepIndex}`,
      cycleIdx,
    }))
  );

  return (
    <div className="bg-[#121622] border-2 border-[#2d3748] rounded-xl p-3 sm:p-4 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] backdrop-blur-md relative overflow-hidden">
      {/* Background tech grid line */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0833440a_1px,transparent_1px),linear-gradient(to_bottom,#0833440a_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

      {/* Header (Clickable whole-bar toggle) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex flex-wrap items-center justify-between gap-2.5 mb-2.5 relative z-10 cursor-pointer select-none group hover:bg-slate-800/40 p-1.5 -m-1.5 rounded-lg transition-colors"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400 group-hover:scale-105 transition-all shadow-inner">
            <Shuffle className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100 tracking-wide flex items-center gap-1.5 group-hover:text-cyan-300 transition-colors">
                <span>入带序列交错图</span>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                  Bresenham 匀化算法
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              精确平摊各种原料的进料槽位，杜绝“同种原料扎堆”引发的抓取延迟与局部断粮
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {/* Belt Flow Animation Toggle Button (visible when expanded) */}
          {isExpanded && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlowing(!isFlowing);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition active:scale-95 shadow-sm ${
                  isFlowing
                    ? 'bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border-emerald-500/50'
                    : 'bg-slate-800 hover:bg-slate-700/80 text-slate-400 border-slate-700'
                }`}
                title={isFlowing ? '暂停流动动画' : '开启流动动画'}
              >
                {isFlowing ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">流动中 ({beltSpeedVal}/s)</span>
                    <span className="sm:hidden">流动</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hidden sm:inline">已暂停</span>
                    <span className="sm:hidden">暂停</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFormulaTip(!showFormulaTip);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700/80 text-slate-300 border border-slate-700 transition"
                title="查看交错算法实战说明"
              >
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">实战进料提示</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCopySequence();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/50 transition active:scale-95 shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">已复制序列</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>复制排列顺序</span>
              </>
            )}
          </button>

          {/* Toggle Expand/Collapse */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700/80 text-slate-200 hover:text-white border border-slate-700 group-hover:border-cyan-500/50 transition active:scale-95 shadow-sm"
          >
            <span className="font-medium">{isExpanded ? '收起序列' : '点击展开序列'}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-y-0.5 transition-transform" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsed Compact Preview Bar with Mini Sequence Strip */}
      {!isExpanded && (
        <div 
          onClick={() => setIsExpanded(true)}
          className="pt-2.5 border-t border-slate-800/80 text-xs text-slate-400 relative z-10 cursor-pointer hover:bg-slate-850/60 -mx-1 px-2 py-2 rounded-lg transition-colors group"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60 text-slate-300">
                <Repeat className="w-3 h-3 text-indigo-400" />
                <span>最小循环: <strong className="text-slate-100">{cycleLength}格</strong></span>
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60 text-cyan-300">
                <Layers className="w-3 h-3 text-cyan-400" />
                <span>满带速率: <strong className="text-cyan-200">{belt ? belt.baseSpeed * beltStackLayers : 30 * beltStackLayers}/s</strong></span>
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60 text-emerald-300">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>配比: <strong className="text-emerald-200">{itemBreakdown.map(i => `${i.count}×${i.itemName}`).join(' + ')}</strong></span>
              </span>
            </div>

            <span className="text-[11px] text-cyan-400 group-hover:text-cyan-300 font-medium flex items-center gap-1 ml-auto">
              <span>点击展开 1:1 动态交错传送带</span>
              <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
            </span>
          </div>

          {/* Micro sequence tokens strip showing simplified order */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none border-t border-slate-800/60 mt-1 pt-1.5">
            <span className="text-[11px] text-slate-500 shrink-0 font-medium mr-1">交错顺序:</span>
            {steps.map((step, idx) => (
              <React.Fragment key={idx}>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-[11px] font-mono shrink-0 shadow-xs">
                  <DSPItemIcon item={DSP_ITEMS[step.itemId]} size={14} />
                  <span className="text-slate-200">{step.itemName}</span>
                </div>
                {idx < steps.length - 1 && (
                  <ArrowRight className="w-2.5 h-2.5 text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Expandable Full Content */}
      {isExpanded && (
        <div className="mt-2 space-y-3 relative z-10">

      {/* Real-world Blackbox advice tooltip (collapsible) */}
      {showFormulaTip && (
        <div className="mb-4 p-3.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-xs text-slate-300 leading-relaxed relative z-10 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-cyan-200">高端黑盒防卡带实战进料技巧：</p>
              <p>
                1. <strong>四向分流器 / 集装箱比例控流</strong>：使用四向分流器的优先级输出或支线输入配比，将各原料按下方交错顺序依次汇入主混带。
              </p>
              <p>
                2. <strong>杜绝成堆输入</strong>：若一次性送入 10 个铁块再送 1 个磁铁，靠近前段的制造台会全部抓光磁铁，造成后段制造台因“缺磁铁”停产并堆积铁块，最终触发回流死锁。
              </p>
              <p>
                3. <strong>闭环反涌优先级</strong>：在混带起始交汇点，务必将<strong>残料回流线</strong>设为四向分流器的“优先输入端”，确保旧原料被优先消化。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Compact Inline Tags Strip (数据卡片内联化，大幅减小垂直占用) */}
      <div className="flex flex-wrap items-center gap-2 mb-3 relative z-10 text-xs">
        {/* Tag 1: Cycle Length */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 font-mono text-[11px] text-slate-300">
          <Repeat className="w-3 h-3 text-indigo-400" />
          <span className="text-slate-400">最小循环:</span>
          <span className="font-bold text-slate-100">{cycleLength}格</span>
        </div>

        {/* Tag 2: Speed */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 font-mono text-[11px] text-cyan-300">
          <Layers className="w-3 h-3 text-cyan-400" />
          <span className="text-slate-400">满带速率:</span>
          <span className="font-bold">{belt ? belt.baseSpeed * beltStackLayers : 30 * beltStackLayers}/s</span>
          <span className="text-[10px] text-slate-400">({beltStackLayers}层)</span>
        </div>

        {/* Tag 3: Ratio */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 font-mono text-[11px] text-emerald-300 flex-1 min-w-[200px]">
          <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="text-slate-400 shrink-0">物料配比:</span>
          <span className="font-semibold truncate">
            {itemBreakdown.map(i => `${i.count}×${i.itemName}`).join(' + ')}
          </span>
          {gcdDivisor > 1 && (
            <span className="text-[10px] text-amber-400 shrink-0 font-normal">
              (÷{gcdDivisor})
            </span>
          )}
        </div>
      </div>

      {/* Streamlined Belt Simulation Track (横向撑满、去除冗余厚重边框与多余内边距) */}
      {/* Streamlined Belt Simulation Track (无缝连续传送带，移除垂直间距与断裂空隙) */}
      <div 
        className="relative z-10 bg-slate-950/70 border border-slate-800/80 rounded-lg p-2 my-0 overflow-hidden"
        style={{ backgroundPosition: '0% 50%' }}
      >
        {/* Belt Track Header */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 px-0.5">
          <span className="flex items-center gap-1 text-cyan-400 font-medium">
            <ArrowRight className="w-3 h-3 animate-pulse" />
            传送带流向 (Inlet → Assemblers)
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {displayCycles > 1 ? `循环演示 × ${displayCycles}` : '单周期全景'}
          </span>
        </div>

        {/* The Belt Graphic with seamless sci-fi conveyor track */}
        {(() => {
          const beltTier = belt?.tier ?? 1;
          const tierBorderColor = beltTier === 3 ? '#0284c7' : beltTier === 2 ? '#16a34a' : '#eab308';
          const tierLineColor = beltTier === 3 ? '#38bdf8' : beltTier === 2 ? '#4ade80' : '#fef08a';
          const tierBgGradient = beltTier === 3
            ? 'repeating-linear-gradient(45deg, #0284c7 0, #0284c7 2px, transparent 0, transparent 12px)'
            : beltTier === 2
            ? 'repeating-linear-gradient(45deg, #16a34a 0, #16a34a 2px, transparent 0, transparent 12px)'
            : 'repeating-linear-gradient(45deg, #eab308 0, #eab308 2px, transparent 0, transparent 12px)';

          return (
            <div 
              className="relative py-1 px-0.5 bg-slate-900/95 rounded-md border-y-2 shadow-inner overflow-hidden"
              style={{
                borderColor: tierBorderColor,
                backgroundPosition: '0 0',
              }}
            >
              {/* Animated belt conveyor continuous texture */}
              <div 
                className={`absolute inset-0 opacity-20 pointer-events-none ${isFlowing ? 'animate-belt-track' : ''}`}
                style={{
                  backgroundImage: tierBgGradient,
                  backgroundPosition: '0 0',
                  animationDuration: `${flowDurationSec}s`,
                }}
              />

              {/* Belt center continuous track line */}
              <div 
                className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 opacity-30 pointer-events-none"
                style={{
                  backgroundColor: tierLineColor,
                }}
              />

              {/* Slots Container with seamless contiguous conveyor layout (gap-0) */}
              <div className="relative flex items-center gap-0 overflow-x-auto pb-0.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {fullDisplaySteps.map((step, idx) => {
              const isMatchFilter = !selectedItemFilter || selectedItemFilter === step.itemId;
              const isFirstOfCycle = step.stepIndex === 1 && idx > 0;

              return (
                <React.Fragment key={step.uniqueKey}>
                  {/* Visual divider between repeated cycles */}
                  {isFirstOfCycle && (
                    <div className="h-12 w-px bg-cyan-500/50 relative flex items-center justify-center shrink-0 z-10">
                      <span className="text-[8px] uppercase tracking-tighter text-cyan-300 font-mono rotate-90 whitespace-nowrap">
                        LOOP
                      </span>
                    </div>
                  )}

                  <div
                    onClick={() => setSelectedItemFilter(selectedItemFilter === step.itemId ? null : step.itemId)}
                    className={`group relative flex flex-col items-center justify-between py-1 px-1 border-r border-slate-700/40 first:border-l transition-all cursor-pointer shrink-0 select-none ${
                      isMatchFilter
                        ? 'bg-slate-800/80 hover:bg-slate-700/80'
                        : 'bg-slate-900/60 opacity-40'
                    }`}
                    style={{ 
                      width: '58px', 
                      minHeight: '66px',
                      backgroundPosition: '0 0',
                    }}
                  >
                    {/* Slot Sequence Index */}
                    <span className="text-[10px] font-mono text-slate-400 group-hover:text-cyan-300">
                      #{step.stepIndex}
                    </span>

                    {/* Flowing Icon with subtle conveyor transport pulse & shimmer */}
                    <div 
                      className={`my-1 relative flex items-center justify-center ${
                        isFlowing ? 'animate-item-shimmer' : ''
                      }`}
                      style={{
                        animationDelay: `${(idx % cycleLength) * 0.12}s`,
                      }}
                    >
                      <DSPItemIcon
                        item={DSP_ITEMS[step.itemId]}
                        size={26}
                        className={`shadow-sm transition-transform group-hover:scale-110 ${
                          isFlowing ? 'transition-all duration-300' : ''
                        }`}
                      />

                      {/* Moving conveyor velocity trail under active item */}
                      {isFlowing && (
                        <div 
                          className="absolute -bottom-1 w-6 h-0.5 rounded-full bg-cyan-400/40 blur-[1px] animate-pulse" 
                          style={{ animationDuration: `${flowDurationSec * 0.8}s` }}
                        />
                      )}
                    </div>

                    {/* Item Name */}
                    <span 
                      className="text-[10px] font-medium text-slate-200 truncate w-full text-center"
                      title={step.itemName}
                    >
                      {step.itemName}
                    </span>

                    {/* Active filter dot indicator */}
                    {selectedItemFilter === step.itemId && (
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 border border-slate-900 shadow-sm" />
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
          );
        })()}
      </div>

      {/* Breakdown Badges by Material */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800 text-xs">
        <span className="text-slate-400 text-xs flex items-center gap-1 mr-1">
          <span>原料过滤器:</span>
        </span>
        {itemBreakdown.map(item => {
          const isSelected = selectedItemFilter === item.itemId;
          return (
            <button
              key={item.itemId}
              onClick={() => setSelectedItemFilter(isSelected ? null : item.itemId)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition border ${
                isSelected
                  ? 'bg-cyan-950 text-cyan-200 border-cyan-400 shadow-sm shadow-cyan-950'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/70'
              }`}
            >
              <DSPItemIcon item={DSP_ITEMS[item.itemId]} size={16} />
              <span className="font-medium">{item.itemName}</span>
              <span className="font-mono text-[11px] text-cyan-400">
                {item.count}格 ({item.ratioPercent}%)
              </span>
            </button>
          );
        })}

        {selectedItemFilter && (
          <button
            onClick={() => setSelectedItemFilter(null)}
            className="text-[11px] text-slate-400 hover:text-slate-200 underline ml-auto"
          >
            重置高亮
          </button>
        )}
      </div>
      </div>
      )}
    </div>
  );
};
