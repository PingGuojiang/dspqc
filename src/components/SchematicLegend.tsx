import React, { useState } from 'react';
import {
  Layers,
  Zap,
  Repeat,
  ArrowRight,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Gauge,
  HelpCircle,
  Cpu,
  Flame,
  FlaskConical,
  Atom,
  Boxes,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { DSPFacility, DSP_FACILITIES, DSP_SORTERS, DSP_BELTS, DSPBelt, DSPSorter } from '../data/dspData';
import { DSPFacilityIcon, DSPSorterIcon, DSPBeltIcon, getFacilityTechCode } from './DSPItemIcon';

export interface SchematicLegendProps {
  currentFacility?: DSPFacility;
  currentBelt?: DSPBelt;
  beltStackLayers?: number;
  currentSorter?: DSPSorter;
  isOverloaded?: boolean;
  className?: string;
  defaultExpanded?: boolean;
}

type LegendCategory = 'all' | 'assembler' | 'smelter' | 'chemical' | 'lab_collider' | 'mechanics';

// Official DSP Game facility detailed documentation
interface FacilityGameDoc {
  speedText: string;
  powerText: string;
  tierLabel: 'Mk.I 基础' | 'Mk.II 高速' | 'Mk.III 极速' | '终极黑雾拓展';
  tierColor: string;
  bgGradient: string;
  borderColor: string;
  summary: string;
  dspTechRequirement: string;
}

const FACILITY_DOCS: Record<string, FacilityGameDoc> = {
  assembler_1: {
    speedText: '0.75x 制作速度',
    powerText: '270 kW (待机 9 kW)',
    tierLabel: 'Mk.I 基础',
    tierColor: '#38bdf8',
    bgGradient: 'from-sky-950/40 to-slate-900/60',
    borderColor: 'border-sky-500/40',
    summary: '初期开局制造设施，建造消耗铁板与齿轮。制作速度为基准 75%，功耗低。',
    dspTechRequirement: '基础制造技术',
  },
  assembler_2: {
    speedText: '1.00x 标准基准',
    powerText: '540 kW (待机 18 kW)',
    tierLabel: 'Mk.II 高速',
    tierColor: '#22c55e',
    bgGradient: 'from-emerald-950/40 to-slate-900/60',
    borderColor: 'border-emerald-500/40',
    summary: '中期主力制造台，拥有 100% 额定制造速度，性价比极高，大规模量产推荐。',
    dspTechRequirement: '高速制造技术',
  },
  assembler_3: {
    speedText: '1.50x 高速超频',
    powerText: '1.08 MW (待机 36 kW)',
    tierLabel: 'Mk.III 极速',
    tierColor: '#818cf8',
    bgGradient: 'from-indigo-950/40 to-slate-900/60',
    borderColor: 'border-indigo-500/40',
    summary: '高阶量子计算级制造台，1.5倍制作速度大幅节约黑盒占地，但耗电量成倍上升。',
    dspTechRequirement: '量子制造技术',
  },
  assembler_recompose: {
    speedText: '3.00x 极限重组',
    powerText: '2.70 MW (待机 90 kW)',
    tierLabel: '终极黑雾拓展',
    tierColor: '#ec4899',
    bgGradient: 'from-pink-950/40 to-slate-900/60',
    borderColor: 'border-pink-500/50',
    summary: '黑雾崛起终局战利品制造台，达到极致的 3 倍制作速度，混线高密黑盒的终极神器。',
    dspTechRequirement: '黑雾逆向重组技术',
  },

  smelter_1: {
    speedText: '1.00x 基础冶炼',
    powerText: '360 kW (待机 12 kW)',
    tierLabel: 'Mk.I 基础',
    tierColor: '#f59e0b',
    bgGradient: 'from-amber-950/40 to-slate-900/60',
    borderColor: 'border-amber-500/40',
    summary: '经典电弧熔炉，开局最基本的矿物精炼冶炼设施，耗电平稳可靠。',
    dspTechRequirement: '冶炼技术',
  },
  smelter_plane: {
    speedText: '2.00x 位面倍速',
    powerText: '1.44 MW (待机 48 kW)',
    tierLabel: 'Mk.II 高速',
    tierColor: '#06b6d4',
    bgGradient: 'from-cyan-950/40 to-slate-900/60',
    borderColor: 'border-cyan-500/40',
    summary: '基于位面滤镜技术研发的双倍速熔炉，速度提升至 2.0x，占地减少一半。',
    dspTechRequirement: '位面熔炼技术',
  },
  smelter_negentropy: {
    speedText: '3.00x 负熵极速',
    powerText: '2.88 MW (待机 96 kW)',
    tierLabel: '终极黑雾拓展',
    tierColor: '#a855f7',
    bgGradient: 'from-purple-950/40 to-slate-900/60',
    borderColor: 'border-purple-500/50',
    summary: '黑雾掉落硅基负熵核心构筑的终局熔炉，冶炼速度突破至 3.0x，极致紧凑。',
    dspTechRequirement: '负熵熔炼技术',
  },

  chemical_1: {
    speedText: '1.00x 催化反应',
    powerText: '720 kW (待机 24 kW)',
    tierLabel: 'Mk.I 基础',
    tierColor: '#10b981',
    bgGradient: 'from-teal-950/40 to-slate-900/60',
    borderColor: 'border-teal-500/40',
    summary: '用于塑料、有机晶体、石墨烯、硫酸等化学品反应合成的标准反应釜。',
    dspTechRequirement: '应用化学技术',
  },
  chemical_quantum: {
    speedText: '2.00x 量子催化',
    powerText: '2.16 MW (待机 72 kW)',
    tierLabel: 'Mk.II 高速',
    tierColor: '#a855f7',
    bgGradient: 'from-purple-950/40 to-slate-900/60',
    borderColor: 'border-purple-500/40',
    summary: '集成量子超导线圈的次世代化工厂，2.0x 双倍催化反应速度，大幅缩短化工产线跨度。',
    dspTechRequirement: '量子化工技术',
  },
  refinery_1: {
    speedText: '1.00x 原油裂解',
    powerText: '960 kW (待机 32 kW)',
    tierLabel: 'Mk.I 基础',
    tierColor: '#64748b',
    bgGradient: 'from-slate-900/60 to-slate-950/80',
    borderColor: 'border-slate-500/40',
    summary: '用于等离子精炼（原油裂解精炼油与氢）和X射线裂解的工业高塔。',
    dspTechRequirement: '流体储存与精炼',
  },

  lab_1: {
    speedText: '1.00x 矩阵合成',
    powerText: '480 kW (待机 15 kW)',
    tierLabel: 'Mk.I 基础',
    tierColor: '#3b82f6',
    bgGradient: 'from-blue-950/40 to-slate-900/60',
    borderColor: 'border-blue-500/40',
    summary: '用于矩阵方块合成或科研消耗的垂直矩阵研究塔，多层向上堆叠运行。',
    dspTechRequirement: '电磁矩阵科技',
  },
  lab_self_evolution: {
    speedText: '3.00x 自化极速',
    powerText: '1.92 MW (待机 60 kW)',
    tierLabel: '终极黑雾拓展',
    tierColor: '#ec4899',
    bgGradient: 'from-pink-950/40 to-slate-900/60',
    borderColor: 'border-pink-500/50',
    summary: '黑雾暗能量自化研究站，3.0x 极限产速，极高科研效率。',
    dspTechRequirement: '自化科技矩阵',
  },
  collider_1: {
    speedText: '1.00x 高能粒子',
    powerText: '12.0 MW (极高负荷)',
    tierLabel: 'Mk.I 基础',
    tierColor: '#f43f5e',
    bgGradient: 'from-rose-950/40 to-slate-900/60',
    borderColor: 'border-rose-500/40',
    summary: '微型强子对撞机，用于重氢浓缩、反物质生成等超高能级粒子物理反应。',
    dspTechRequirement: '微型强子对撞技术',
  },
};

export const SchematicLegend: React.FC<SchematicLegendProps> = ({
  currentFacility,
  currentBelt,
  beltStackLayers = 1,
  currentSorter,
  isOverloaded = false,
  className = '',
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [activeCategory, setActiveCategory] = useState<LegendCategory>('all');
  const [inspectedFacilityId, setInspectedFacilityId] = useState<string | null>(null);

  // Group facility definitions
  const assemblers = DSP_FACILITIES.filter(f => f.category === 'assembler');
  const smelters = DSP_FACILITIES.filter(f => f.category === 'smelter');
  const chemicals = DSP_FACILITIES.filter(f => f.category === 'chemical' || f.category === 'refinery');
  const labsAndColliders = DSP_FACILITIES.filter(f => f.category === 'lab' || f.category === 'collider');

  // Filter facilities based on tab
  const getVisibleFacilities = () => {
    switch (activeCategory) {
      case 'assembler':
        return assemblers;
      case 'smelter':
        return smelters;
      case 'chemical':
        return chemicals;
      case 'lab_collider':
        return labsAndColliders;
      case 'all':
      default:
        return DSP_FACILITIES;
    }
  };

  const visibleFacilities = getVisibleFacilities();

  return (
    <div className={`w-full bg-[#121622] border-2 border-[#2d3748] rounded-xl overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,0.5)] ${className}`}>
      {/* Legend Header Bar (Clickable whole-bar toggle) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none group hover:bg-slate-850 transition-colors ${
          isExpanded ? 'border-b-2 border-[#2d3748]' : ''
        }`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400 group-hover:scale-105 transition-all shadow-inner">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 tracking-wide group-hover:text-cyan-300 transition-colors">
                2D 布局图例与设施等级规格
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
                Schematic Legend
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                <ShieldCheck className="w-3 h-3" />
                DSP 原版核验
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              解释简图内设施图标、Mk.I/II/III 等级视觉区分、闭环回流防死锁机制与传送带色标
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {currentFacility && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700/80 text-xs">
              <span className="text-slate-400 text-[11px]">当前选用:</span>
              <div className="w-4 h-4 flex items-center justify-center">
                <DSPFacilityIcon facility={currentFacility} size={16} />
              </div>
              <span className="text-cyan-400 font-semibold">{currentFacility.name}</span>
              <span className="font-mono text-[10px] text-cyan-300">
                ({currentFacility.speedMultiplier}x)
              </span>
            </div>
          )}

          <div
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-900 group-hover:bg-slate-800 text-slate-300 group-hover:text-white border border-slate-700/80 group-hover:border-cyan-500/50 transition shadow-sm"
          >
            <span className="font-medium">{isExpanded ? '收起图例' : '点击展开图例'}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-300" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-cyan-400 group-hover:text-cyan-300 group-hover:translate-y-0.5 transition-transform" />
            )}
          </div>
        </div>
      </div>

      {/* Collapsed simple information preview bar */}
      {!isExpanded && (
        <div 
          onClick={() => setIsExpanded(true)}
          className="px-4 py-2.5 bg-slate-900/40 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-300 cursor-pointer hover:bg-slate-850/60 transition-colors"
        >
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-slate-400 font-medium">图例速览:</span>
            {currentFacility && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800/90 border border-slate-700 font-mono text-cyan-300">
                <DSPFacilityIcon facility={currentFacility} size={14} />
                <span className="text-white font-medium">{currentFacility.name}</span>
                <span className="text-cyan-400 font-semibold">{currentFacility.speedMultiplier}x 速</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800/60 border border-slate-700/60 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>橙黄虚线: 闭环回流防死锁</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800/60 border border-slate-700/60 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>主混带: 自动按序交错进料</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/40 border border-slate-800 text-slate-400">
              <span>包含 13 种设施 Mk.I~IV 等级</span>
            </span>
          </div>

          <span className="text-[11px] text-cyan-400 font-medium flex items-center gap-1 ml-auto">
            <span>点击展开 13 种设施规格与机制解析</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </span>
        </div>
      )}

      {/* Expandable Content Area */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Navigation Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {[
              { id: 'all', label: '全部设施 (13种)', icon: Boxes },
              { id: 'assembler', label: '制造台 (Mk.I-IV)', icon: Cpu },
              { id: 'smelter', label: '熔炉 (Mk.I-III)', icon: Flame },
              { id: 'chemical', label: '化工与精炼', icon: FlaskConical },
              { id: 'lab_collider', label: '矩阵与对撞', icon: Atom },
              { id: 'mechanics', label: '线网与防死锁回流', icon: Repeat },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id as LegendCategory)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition border ${
                    isActive
                      ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60 shadow-xs'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-850'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Section 1: Facility Matrix & Tier Distinctions */}
          {activeCategory !== 'mechanics' && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    设施类型与 Mk 级别视觉特征表 (Facility Tier Specifications)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    点击卡片可查看游戏内详细参数与产线适配建议
                  </span>
                </div>
              </div>

              {/* Facility Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {visibleFacilities.map(fac => {
                  const doc = FACILITY_DOCS[fac.id] || {
                    speedText: `${fac.speedMultiplier.toFixed(2)}x 制作速度`,
                    powerText: `${fac.powerMW} MW`,
                    tierLabel: 'Mk.I 基础',
                    tierColor: fac.color || '#38bdf8',
                    bgGradient: 'from-slate-900 to-slate-950',
                    borderColor: 'border-slate-800',
                    summary: '戴森球计划标准工业生产建筑。',
                    dspTechRequirement: '常规工业科技',
                  };

                  const isCurrent = currentFacility?.id === fac.id;
                  const isInspected = inspectedFacilityId === fac.id;
                  const techCode = getFacilityTechCode(fac.name);

                  return (
                    <div
                      key={fac.id}
                      onClick={() => setInspectedFacilityId(isInspected ? null : fac.id)}
                      className={`relative p-3 rounded-lg border transition-all cursor-pointer select-none bg-gradient-to-br ${
                        doc.bgGradient
                      } ${
                        isCurrent
                          ? 'border-cyan-400/90 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-400/40'
                          : isInspected
                          ? 'border-slate-500 ring-1 ring-slate-500'
                          : `${doc.borderColor} hover:border-slate-600`
                      }`}
                    >
                      {/* Active in Schematic Glowing Badge */}
                      {isCurrent && (
                        <div className="absolute -top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-bold text-[9px] shadow-sm animate-pulse">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>当前产线选用 (Active)</span>
                        </div>
                      )}

                      <div className="flex items-start gap-2.5">
                        {/* Facility High-Res Icon & Visual Fallback */}
                        <div className="shrink-0 relative">
                          <div
                            className="w-10 h-10 rounded-lg p-0.5 border flex items-center justify-center bg-slate-900/90 shadow-inner"
                            style={{ borderColor: `${doc.tierColor}80` }}
                          >
                            <DSPFacilityIcon facility={fac} size={32} />
                          </div>
                          {/* Mini Tier Badge Overlay */}
                          <span
                            className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded font-mono font-bold text-[8px] border bg-slate-950 shadow-xs"
                            style={{
                              color: doc.tierColor,
                              borderColor: `${doc.tierColor}80`,
                            }}
                          >
                            {techCode}
                          </span>
                        </div>

                        {/* Facility Title & Tier Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs text-slate-100 truncate">
                              {fac.name}
                            </span>
                            <span
                              className="text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase"
                              style={{
                                color: doc.tierColor,
                                borderColor: `${doc.tierColor}50`,
                                backgroundColor: `${doc.tierColor}15`,
                              }}
                            >
                              {doc.tierLabel}
                            </span>
                          </div>

                          {/* Speed & Power Multipliers */}
                          <div className="mt-1 flex items-center gap-2 text-[11px] font-mono">
                            <span className="text-cyan-400 font-bold flex items-center gap-0.5">
                              <Gauge className="w-3 h-3 inline" />
                              {doc.speedText.split(' ')[0]}
                            </span>
                            <span className="text-slate-600">|</span>
                            <span className="text-amber-400 font-medium flex items-center gap-0.5">
                              <Zap className="w-3 h-3 inline" />
                              {doc.powerText.split(' ')[0]} {doc.powerText.split(' ')[1]}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Brief game doc description */}
                      <p className="mt-2 text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                        {doc.summary}
                      </p>

                      {/* Expanded In-depth Technical Specs */}
                      {isInspected && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800 text-[10px] space-y-1 text-slate-300 font-mono bg-slate-950/60 p-2 rounded">
                          <div className="flex justify-between">
                            <span className="text-slate-400">解锁科技:</span>
                            <span className="text-cyan-300">{doc.dspTechRequirement}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">额定功耗:</span>
                            <span className="text-amber-300">{doc.powerText}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">类别分类:</span>
                            <span className="text-slate-200 capitalize">{fac.category}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Visual Differentiation Summary Guide */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
            {/* Tier Color Coding */}
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Mk 等级视觉特征辨析</span>
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0 shadow-xs shadow-sky-400/50" />
                  <span>
                    <strong className="text-sky-300">Mk.I (天蓝/琥珀)</strong>: 基础速度 (0.75x~1.0x)，功耗最低，前期开荒主力
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 shadow-xs shadow-emerald-400/50" />
                  <span>
                    <strong className="text-emerald-300">Mk.II (绿色/位面青)</strong>: 倍速升级 (1.0x~2.0x)，高能效比，中期规模化标配
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shrink-0 shadow-xs shadow-indigo-400/50" />
                  <span>
                    <strong className="text-indigo-300">Mk.III (紫蓝/负熵紫)</strong>: 极速超频 (1.5x~3.0x)，大幅压缩黑盒阵列占地
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-400 shrink-0 shadow-xs shadow-pink-400/50" />
                  <span>
                    <strong className="text-pink-300">终极重组 (霓虹粉)</strong>: 黑雾逆向技术 (3.0x)，满载超频高密终局生产
                  </span>
                </li>
              </ul>
            </div>

            {/* Canvas Node Elements Legend */}
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>2D 简图卡片图形元素含义</span>
              </div>
              <div className="text-[11px] text-slate-300 space-y-1.5">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 font-mono text-[9px] text-cyan-400 font-bold">
                    Mk
                  </div>
                  <div>
                    <strong className="text-slate-200">建筑图标与徽标</strong>: 真实高清模型图标，右下带 Mk.I/II/III 科技角标。
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-emerald-400 font-bold text-[9px]">
                    产物
                  </div>
                  <div>
                    <strong className="text-slate-200">右上产物图标</strong>: 当前设施正在合成的目标配方产物图标。
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-10 h-2 bg-emerald-500 rounded mt-1 shrink-0" />
                  <div>
                    <strong className="text-emerald-400">负荷状态条 (绿色)</strong>: 额定满载 100% 运行，传送带运力充沛。
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-10 h-2 bg-rose-500 rounded mt-1 shrink-0" />
                  <div>
                    <strong className="text-rose-400">负荷状态条 (红色)</strong>: 原料断供或超载卡带警告，需扩容传送带。
                  </div>
                </div>
              </div>
            </div>

            {/* Anti-Deadlock Return Belt Explanation (闭环防死锁回流原理) */}
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <Repeat className="w-3.5 h-3.5 text-amber-400" />
                <span>闭环回流防死锁机制 (DSP 原版核心)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                在混流传送带（Mixed Belt）中，当设施因批次生产停机或供料不均时，末端多余物料将沿
                <strong className="text-amber-400"> 橙色闭环回流线 </strong>
                倒流至前端，并通过四向分流器优先输入，避免传送带被单一物料堵塞导致全线死锁。
              </p>
              <div className="flex items-center gap-2 pt-1 font-mono text-[10px]">
                <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-600/60">
                  四向分流器优先回流
                </span>
                <span className="text-slate-500">→</span>
                <span className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-600/60">
                  消除原料拥堵
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Sorter & Conveyor Belts Quick Legend Bar */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
            {/* Sorters Legend */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-slate-500" />
                分拣爪抓取色标:
              </span>
              {DSP_SORTERS.map(s => {
                const isCurrent = currentSorter?.tier === s.tier;
                return (
                  <div
                    key={s.tier}
                    className={`flex items-center gap-1.5 font-mono text-[11px] px-2 py-0.5 rounded border transition ${
                      isCurrent
                        ? 'bg-slate-900 border-cyan-400/80 text-cyan-300 shadow-xs'
                        : 'bg-slate-900/90 border-slate-800 text-slate-300'
                    }`}
                  >
                    <DSPSorterIcon sorter={s} size={15} />
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.hexColor }} />
                    <span>{s.name.split(' ')[0]}</span>
                    <span className="text-slate-500 text-[10px]">({s.baseTripsPerSec * s.baseStack}/s)</span>
                  </div>
                );
              })}
            </div>

            {/* Belts Legend */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Boxes className="w-3.5 h-3.5 text-slate-500" />
                传送带规格:
              </span>
              {DSP_BELTS.map(b => {
                const isCurrent = currentBelt?.tier === b.tier;
                return (
                  <div
                    key={b.tier}
                    className={`flex items-center gap-1.5 font-mono text-[11px] px-2 py-0.5 rounded border transition ${
                      isCurrent
                        ? 'bg-slate-900 border-cyan-400/80 text-cyan-300 shadow-xs'
                        : 'bg-slate-900/90 border-slate-800 text-slate-300'
                    }`}
                  >
                    <DSPBeltIcon belt={b} size={15} />
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                    <span>{b.name.split(' ')[0]}</span>
                    <span className="text-slate-500 text-[10px]">
                      ({b.baseSpeed * (isCurrent ? beltStackLayers : 1)}/s)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
