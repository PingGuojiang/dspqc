import React, { useState } from 'react';
import { SmartAdvisorItem } from '../engine/calculator';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  ChevronRight, 
  Lightbulb, 
  CheckCircle2,
  Sliders,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';

interface SmartAdvisorAlertProps {
  alerts: SmartAdvisorItem[];
  onQuickAction?: (actionType: string) => void;
}

export const SmartAdvisorAlert: React.FC<SmartAdvisorAlertProps> = ({ alerts, onQuickAction }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'all' | 'critical' | 'warning'>('all');

  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-200">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-emerald-300">硬核黑盒运行状态优良</span>
            <span className="text-emerald-400/80 ml-2">
              未检测到分拣器跨距衰减、局部原料饥饿或回流反涌卡带风险。
            </span>
          </div>
        </div>
      </div>
    );
  }

  const criticalCount = alerts.filter(a => a.level === 'critical').length;
  const warningCount = alerts.filter(a => a.level === 'warning').length;

  const filteredAlerts = alerts.filter(a => {
    if (activeCategory === 'critical') return a.level === 'critical';
    if (activeCategory === 'warning') return a.level === 'warning';
    return true;
  });

  return (
    <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl overflow-hidden shadow-xl backdrop-blur-md">
      {/* Top Banner Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-700/80 cursor-pointer select-none hover:bg-slate-800/60 transition"
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-inner ${
            criticalCount > 0 
              ? 'bg-rose-950/80 text-rose-400 border border-rose-500/40' 
              : 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
          }`}>
            {criticalCount > 0 ? (
              <AlertCircle className="w-4 h-4 animate-bounce" />
            ) : (
              <Lightbulb className="w-4 h-4 text-amber-300" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-100">
                DSP 混带黑盒专家建议系统
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 font-mono text-slate-300">
                {alerts.length} 条诊断
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              基于官方 Wiki 跨距衰减表与 Bilibili 混带防卡带实战策略深度诊断
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {criticalCount} 项致命瓶颈
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
              {warningCount} 项潜伏隐患
            </span>
          )}
          <button className="text-slate-400 hover:text-slate-200 p-1">
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expandable Content Body */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {/* Quick Filter Pill */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 pb-1">
            <span>筛选诊断:</span>
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-2 py-0.5 rounded text-xs transition ${
                activeCategory === 'all' 
                  ? 'bg-slate-700 text-slate-100 font-medium' 
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400'
              }`}
            >
              全部 ({alerts.length})
            </button>
            {criticalCount > 0 && (
              <button
                onClick={() => setActiveCategory('critical')}
                className={`px-2 py-0.5 rounded text-xs transition ${
                  activeCategory === 'critical' 
                    ? 'bg-rose-900/60 text-rose-200 font-medium border border-rose-500/40' 
                    : 'bg-slate-800/60 hover:bg-slate-800 text-rose-400'
                }`}
              >
                致命卡带 ({criticalCount})
              </button>
            )}
            {warningCount > 0 && (
              <button
                onClick={() => setActiveCategory('warning')}
                className={`px-2 py-0.5 rounded text-xs transition ${
                  activeCategory === 'warning' 
                    ? 'bg-amber-900/60 text-amber-200 font-medium border border-amber-500/40' 
                    : 'bg-slate-800/60 hover:bg-slate-800 text-amber-400'
                }`}
              >
                运行风险 ({warningCount})
              </button>
            )}
          </div>

          {/* Cards List */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {filteredAlerts.map(alert => {
              const isCritical = alert.level === 'critical';
              const isWarning = alert.level === 'warning';

              const borderColor = isCritical 
                ? 'border-rose-500/40 bg-rose-950/20' 
                : isWarning 
                  ? 'border-amber-500/40 bg-amber-950/20' 
                  : 'border-cyan-500/30 bg-cyan-950/20';

              const iconBadge = isCritical ? (
                <div className="w-5 h-5 rounded bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
              ) : isWarning ? (
                <div className="w-5 h-5 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Info className="w-3.5 h-3.5" />
                </div>
              );

              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border text-xs transition-all ${borderColor}`}
                >
                  <div className="flex items-start gap-2.5">
                    {iconBadge}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold tracking-wide ${
                          isCritical ? 'text-rose-200' : isWarning ? 'text-amber-200' : 'text-cyan-200'
                        }`}>
                          {alert.title}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {alert.category.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Main Message */}
                      <p className="text-slate-300 leading-relaxed font-sans">
                        {alert.message}
                      </p>

                      {/* Expert Actionable Advice */}
                      <div className="mt-1.5 p-2 rounded bg-slate-900/80 border border-slate-700/60 flex items-start gap-2 text-slate-200">
                        <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-cyan-300">专家解法：</span>
                          <span className="text-slate-300 ml-1">{alert.suggestion}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
