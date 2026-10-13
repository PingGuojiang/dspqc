import React from 'react';
import { X, BookOpen, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { DSPSorterIcon } from './DSPItemIcon';

interface FormulaRefModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FormulaRefModal: React.FC<FormulaRefModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-slate-200 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-semibold text-white">戴森球计划：混带物理公式与 Wiki 审查规范</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-5 text-xs text-slate-300">
          {/* Formula 1 */}
          <div className="p-3.5 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              1. 单设施进料速率 (Feed Rate)
            </div>
            <div className="p-2.5 bg-slate-900 rounded font-mono text-cyan-300 text-xs border border-slate-800">
              v_feed = (原料总数 × 设施倍速) / (生产时间 × 堆叠层数)
            </div>
            <p className="text-slate-400 leading-relaxed">
              用于计算单台制造台/熔炉每秒所消耗的原料总组数。若为多原料混带，每种原料按照其在配方中的单项消耗量独立代入：
              <span className="font-mono text-slate-200 block mt-1">r_i = (count_i × 设施倍速 × 增产速度倍率) / 生产时间</span>
            </p>
            <div className="flex items-start gap-2 p-2 bg-amber-950/30 border border-amber-900/50 rounded text-amber-300 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div>
                <strong>特殊科技锁分支 (is_tech_locked)</strong>：如果玩家在游戏初期未解锁集装箱与堆叠科技，且未使用白爪进行手动堆叠，根据官方物理机制，其实际瞬时吞吐需乘以 0.25（即除以 4）。
              </div>
            </div>
          </div>

          {/* Formula 2 */}
          <div className="p-3.5 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              2. 单带产线长度极限 (Max Facilities)
            </div>
            <div className="p-2.5 bg-slate-900 rounded font-mono text-cyan-300 text-xs border border-slate-800">
              N_max = (传送带运力 × 生产时间) / (设施倍速 × 原料总数 × 增产速度因子)
            </div>
            <p className="text-slate-400 leading-relaxed">
              基准范例：满载 4 层极速传送带（蓝带），传送带额定运力为 <span className="font-mono text-slate-200">30 × 4 = 120 items/s</span>。
              带入配方总耗料即可得出一条混带满负荷供给的最大建筑数量，并向下取整确保绝不卡带。
            </p>
          </div>

          {/* Sorter decay */}
          <div className="p-3.5 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              3. 分拣器 (爪带) 跨格衰减与白爪兜底机制
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-1">分拣器等级</th>
                    <th className="py-1">基准往返速度</th>
                    <th className="py-1">跨 1 格运力</th>
                    <th className="py-1">跨 2 格运力</th>
                    <th className="py-1">跨 3 格运力</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  <tr>
                    <td className="py-1.5 text-yellow-400 flex items-center gap-1.5">
                      <DSPSorterIcon tier={1} size={16} />
                      <span>黄爪 Mk.I</span>
                    </td>
                    <td className="py-1.5">1.5 次/s</td>
                    <td className="py-1.5">1.5 /s</td>
                    <td className="py-1.5">0.75 /s</td>
                    <td className="py-1.5">0.5 /s</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-emerald-400 flex items-center gap-1.5">
                      <DSPSorterIcon tier={2} size={16} />
                      <span>绿爪 Mk.II</span>
                    </td>
                    <td className="py-1.5">3.0 次/s</td>
                    <td className="py-1.5">3.0 /s</td>
                    <td className="py-1.5">1.5 /s</td>
                    <td className="py-1.5">1.0 /s</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-blue-400 flex items-center gap-1.5">
                      <DSPSorterIcon tier={3} size={16} />
                      <span>蓝爪 Mk.III</span>
                    </td>
                    <td className="py-1.5">6.0 次/s</td>
                    <td className="py-1.5">6.0 /s</td>
                    <td className="py-1.5">3.0 /s</td>
                    <td className="py-1.5">2.0 /s</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-white flex items-center gap-1.5">
                      <DSPSorterIcon tier={4} size={16} />
                      <span>白爪 Mk.IV (集装)</span>
                    </td>
                    <td className="py-1.5">6.0 次/s</td>
                    <td className="py-1.5 font-bold text-cyan-300">24.0 ~ 48.0 /s</td>
                    <td className="py-1.5">12.0 ~ 24.0 /s</td>
                    <td className="py-1.5">8.0 ~ 16.0 /s</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-slate-400 text-[11px] mt-1">
              * 白爪凭借货物叠加科技，单次可瞬间抓取 4~8 个货物，是高消耗混带的绝对兜底主力。
            </p>
          </div>

          {/* Proliferator Branches */}
          <div className="p-3.5 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              4. 增产剂策略双分支算法 (Proliferator Branches)
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-amber-400 font-semibold block mb-1">额外速度 (Extra Speed)</span>
                <p className="text-slate-400">
                  设施工作速度成倍提升（Mk.III 喷涂达 +100%）。<strong>原料进料需求等比翻倍</strong>，单带能支持的最大设施数相应减半。
                </p>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-emerald-400 font-semibold block mb-1">额外产出 (Extra Output)</span>
                <p className="text-slate-400">
                  <strong>进料消耗速率完全不变</strong>，仅提升产物的最终产出量（如 +25%），对前置混带进料运力无额外负担。
                </p>
              </div>
            </div>
          </div>

          {/* Deadlock loopback */}
          <div className="p-3.5 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              5. 闭环回流防死锁 (Loopback Belt & Buffer)
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              混带最致命的问题是末端残留单一物料堵塞通道造成全线死锁。本工具设计的排布方案在末端强制加入回流线将残料送回始端四向分流器/缓冲箱，并基于用户设定的安全冗余度（105% ~ 120%）计算建议的缓冲仓容积。
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>算法已与《戴森球计划》最新版本及社区蓝图实践完全对齐</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
          >
            返回计算器
          </button>
        </div>
      </div>
    </div>
  );
};
