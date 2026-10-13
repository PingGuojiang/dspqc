# 戴森球计划：混带蓝图计算器 (DSP Mixed Belt Planner) - 需求与公式审查修订版

一款专为《戴森球计划》玩家设计的纯前端混带黑盒进料计算与 2D 可视化排布辅助工具。严格遵循《戴森球计划》官方游戏物理与社区 Wiki 权威公式，精准推导进料速度、整线运力极限、集装堆叠倍率、白爪集装判定、分拣器跨格衰减与回流防死锁闭环。

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **已严格审查并合并用户提供的公式 JSON 与 DSP 游戏 Wiki 规则**：

1. **核心进料速度公式审查与确立**：
   $$v_{\text{feed}} = \frac{\text{total\_raw\_materials} \times \text{facility\_speed}}{\text{production\_time} \times \text{stack\_layers}}$$
   - **特殊科技锁判定 (`is_tech_locked`)**：若玩家尚未解锁集装科技且未使用白爪（集装分拣器）手动堆叠，根据游戏逻辑，未堆叠状态下的等效进料吞吐量需乘以 $0.25$（即除以 4）。
   - **分物料进料速率**：对于配方中第 $i$ 种原料，其瞬时消耗速率为：
     $$r_i = \frac{\text{raw\_count}_i \times \text{facility\_speed} \times \text{speed\_bonus}}{\text{production\_time}}$$
2. **最大设施数量（产线长度极限）公式确立**：
   $$N_{\text{max}} = \left\lfloor \frac{\text{belt\_capacity} \times \text{production\_time}}{\text{facility\_speed} \times \text{total\_raw\_materials} \times \text{speed\_bonus}} \right\rfloor$$
   - 基准示例（满载 4 层蓝带）：$\text{belt\_capacity} = 30 \text{ 格/秒} \times 4 \text{ 层} = 120 \text{ items/s}$。
   - 当涂抹增产剂选择“额外速度”时，$\text{speed\_bonus} = 1.0 + \text{bonus}$（如 Mk.III 为 2.0 倍速），设施原料吞吐成倍翻倍，支持的最大设施数相应折半；
   - 当选择“额外产出”时，进料消耗速率不变（$\text{speed\_bonus} = 1.0$），仅产物产出量与耗电提升。
3. **分拣器（爪带）跨格衰减与白爪兜底矩阵**：
   - 黄爪 (Mk.I): 基准 $1.5$ 次/s（1格 1.5, 2格 0.75, 3格 0.5 item/s）
   - 绿爪 (Mk.II): 基准 $3.0$ 次/s（1格 3.0, 2格 1.5, 3格 1.0 item/s）
   - 蓝爪 (Mk.III): 基准 $6.0$ 次/s（1格 6.0, 2格 3.0, 3格 2.0 item/s）
   - 白爪 (Mk.IV 集装分拣器): 具备货物叠加瞬间抓取机制（结合“分拣器货物叠加”科技最高单次抓取 4+ 个，吞吐可达 $24 \sim 48$ items/s）。当蓝爪跨 1 格仍无法满足极端进料时，强制推荐白爪，若白爪仍超负荷则触发红色瓶颈警报。
4. **物料循环入带序列 (Interleaved Ratio Pattern)**：
   - 采用平滑分配算法（Bresenham 平滑交织）生成最佳混带物料循环排布（如 $2:1:1 \to \text{A-B-A-C}$），避免前部建筑被单一物料填满导致后端建筑发生物料饥饿。
5. **始端缓冲箱与回流防死锁闭环 (Loopback Return Line)**：
   - 混带末端默认绘制循环回流线接入始端四向分流器/缓冲箱，根据用户设定的冗余度容错率（如 $110\%$）计算建议的缓冲箱容量。

---

## 1. Overview & Core Concept

- **What It Does**: 提供全套《戴森球计划》原版配方字典与自定义配方构建器，玩家只需选定产物配方、制造建筑、增产模式和科技等级，即可秒级获知单带最大设施数、各原料消耗速率、最优入带顺序与分拣器搭配，并在 2D 可视化像素 HUD 画布上查看完整排布。
- **Target Audience / Persona**: 追求极致紧凑、黑盒化产线设计的《戴森球计划》玩家与蓝图作者。
- **Key Value**: 告别纸笔反复推算和游戏内反复试错拆建，彻底杜绝混带卡带死锁。

---

## 2. User Experience & Visual Design

### Key User Flows
1. **输入配置区 (自上而下流式卡片)**：
   - **卡片 1：基础设定**：配方选择（高频混带精选 + 原版全配方搜索 + 自定义配方沙盒）、设施等级选择（制造台 Mk.I/II/III/极速，熔炉 Mk.I/II/III，化工厂，矩阵研究站等）。
   - **卡片 2：科技与物流设定**：传送带等级（黄 6 / 绿 12 / 蓝 30）、集装堆叠层数（1 ~ 4 层）、分拣器叠加等级与白爪解锁状态。
   - **卡片 3：增产与容错（可折叠）**：增产剂等级（无 / Mk.I / Mk.II / Mk.III）、增产策略（额外产出 vs 额外速度）、安全容错冗余（如 105% ~ 120%）。
2. **实时物理推演看板**：
   - 满带综合运力卡片（如 $120 \text{ items/s}$）。
   - 单带最大允许设施数量卡片（如 $24$ 台），支持滑块手动指定实际安装台数并实时重新校验负荷。
   - 物料消耗清单与分拣器智能推荐表格（清晰罗列各原料需求速度、推荐分拣器等级与跨格数）。
   - 混带循环序列可视化展示（如 `[铁块] [铜块] [铁块] [电路板]` 色块条带）。
3. **2D 可视化排布简图 (Pixelated Industrial HUD)**：
   - 始端：集装缓冲箱、混带进料口与回流合流器。
   - 主体：主传送带横向贯通，带有带体流动粒子与交织原料方块；制造建筑以规整方阵展开，显示配方图标；分拣器以彩色箭头线段（黄/绿/蓝/白）跨格直连传送带与建筑。
   - 末端：防死锁回流虚线/实线由末端回旋引回始端合流器。
   - 预警系统：任何超载分拣器或超长产线以醒目红金 HUD 边框高亮警示。
4. **PWA 离线支持与跨端适配**：
   - 包含标准的 PWA 安装按钮、iOS 安装指引模态窗及离线状态提示徽标。

---

## 3. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DSP Mixed Belt Planner (PWA)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Top Bar (DSP Mixed Belt Planner · PWA Install · Offline Status · Reset)    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────┐     ┌──────────────────────────────────┐ │
│  │   Input Configuration Cards   │     │    Real-Time Metric Dashboard    │ │
│  │ ───────────────────────────── │     │ ──────────────────────────────── │ │
│  │ • Recipe Selector & Editor    │     │ • Belt Capacity (items/s)        │ │
│  │ • Facility & Belt Tier        │ ──► │ • Max Facility Limit (Integer)   │ │
│  │ • Stack Layers (1~4) & Tech   │     │ • Per-Material Rate & Sorter Rec │ │
│  │ • Proliferator & Redundancy % │     │ • Optimal Interleaved Sequence   │ │
│  └──────────────┬────────────────┘     └────────────────┬─────────────────┘ │
│                 │                                       │                   │
│                 ▼                                       ▼                   │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │            DSP Physics Engine & Sorter Recommendation Model            │ │
│  │   (v_feed = (M*S)/(T*L), N_max = (C*T)/(S*M), Sorter Decay Table)      │ │
│  └──────────────────────────────────────┬─────────────────────────────────┘ │
│                                         │                                   │
│                                         ▼                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │               2D Schematic Blueprint (Interactive SVG Engine)          │ │
│  │ ────────────────────────────────────────────────────────────────────── │ │
│  │ • Inflow Buffer Box & Splitter Merging Zone                            │ │
│  │ • Main Mixed Belt with Animated Directional Arrows & Item Sequence     │ │
│  │ • Facility Row Matrix (Grid coordinates, crafting badges)              │ │
│  │ • Sorters with Color-tier (Mk.I~IV) & Distance Spans (1~3 grid lines)  │ │
│  │ • Loopback Anti-Deadlock Return Belt with circulation indicators       │ │
│  │ • Bottleneck Warning Highlights & Detail Tooltips                      │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Decoupled Data Schema (`src/data/dspData.ts`)
```typescript
export interface DSPItem {
  id: string;
  name: string;
  category: 'raw' | 'intermediate' | 'matrix' | 'building';
  color: string;
}

export interface DSPRecipe {
  id: string;
  name: string;
  craftTime: number; // 秒
  facilityCategory: 'assembler' | 'smelter' | 'chemical' | 'refinery' | 'lab';
  inputs: { itemId: string; count: number }[];
  outputs: { itemId: string; count: number }[];
  isCustom?: boolean;
}
```

---

## 4. Execution Steps
1. **PWA 基础设施与配置**：配置 `vite-plugin-pwa`，输出符合标准的 Web App Manifest、图标定义、`usePWAInstall` 钩子与离线感知组件。
2. **DSP 核心数据字典构建 (`src/data/dspData.ts`)**：内置原版全部高频混带核心配方（电磁矩阵、能量矩阵、结构矩阵、电动机、磁场环、芯片、微型聚变、小型火箭部件等）与全部游戏原版基础数据字典。
3. **物理与运力推演计算引擎 (`src/engine/calculator.ts`)**：
   - 严格实现 JSON 审查通过的 `feed_rate`、`is_tech_locked` 判定、`max_facilities`。
   - 实现增产剂双分支（额外速度 vs 额外产出）耗料推演。
   - 实现分拣器跨格距离衰减表与白爪集装堆叠推荐算法。
   - 实现 Bresenham 平滑交织物料循环序列算法。
4. **卡片化配置器与数据看板 (`src/components/ConfigCard.tsx`, `MetricsCard.tsx`)**：
   - 现代化流动卡片，支持移动端单列自适应与桌面双列并排。
   - 包含自定义配方沙盒弹窗（自由增减原料与产出数量）。
5. **2D 可视化排布图 (`src/components/SchematicView.tsx`)**：
   - 像素工业风暗黑 HUD 风格交互式 SVG 画布。
   - 渲染进料端、主传送带、闭环回流线、制造设施方阵、跨格彩色分拣器与卡带/失速危险预警。
6. **最终编译与格式验证**：执行 `compile_applet` 和 `lint_applet`，确保零警告、零报错。
