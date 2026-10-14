<p align="center"><img src="public/icon.svg" width="80" alt="DSP MIX-MAX 标志"></p>

# DSP MIX-MAX

戴森球计划（Dyson Sphere Program）的生产链量化与混带物流规划工具普通模式计算完整生产链，混带模式估算单段配方的物流容量，两种模式可平滑切换并独立保存配置

[报告问题](https://github.com/PingGuojiang/Dyson-Sphere-Program-Quantitative-Calculator/issues) · [贡献指南](CONTRIBUTING.md) · [架构说明](docs/ARCHITECTURE.md) · [第三方来源](THIRD_PARTY_NOTICES.md)

## 目录

- [功能](#功能)
- [快速开始](#快速开始)
- [使用方法](#使用方法)
- [计算范围](#计算范围)
- [开发与部署](#开发与部署)
- [未来开发计划](#未来开发计划)
- [项目文档与-wiki](#项目文档与-wiki)
- [项目结构](#项目结构)
- [借鉴与鸣谢](#借鉴与鸣谢)
- [开源协议](#开源协议)

## 功能

| 功能 | 普通量化模式 | 混带模式 |
| --- | --- | --- |
| 计算目标 | 多目标完整生产链，共享原料与副产物平衡 | 单配方进料比例、带宽与分拣容量 |
| 配置 | 替代配方、外供上限、逐配方建筑与增产剂 | 建筑、带速、堆叠、分拣与冗余倍率 |
| 结果 | 理论/部署设备数、建筑功耗、物料速率、带数 | 设备上限、进料序列、物流约束与回流示意 |
| 2D 交互 | 图标节点、卡片拖拽、滚轮缩放、平移与布局重置 | 布局示意、物料动画、缩放、拖拽与高度切换 |

- 深色工业面板与游戏物品图标，支持桌面和手机布局
- 左侧模式设定抽屉；配置、撤销历史、扩展数据与视图标签分别管理
- 本地自动保存、分享链接、自定义配方和 JSON 数据导入
- PWA 安装及静态资源离线缓存

## 快速开始

需要 **Node.js 22.12+** 和 npm

```sh
git clone https://github.com/PingGuojiang/Dyson-Sphere-Program-Quantitative-Calculator.git
cd Dyson-Sphere-Program-Quantitative-Calculator
npm ci
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)核心量化功能在浏览器本地运行，无需 API Key

## 使用方法

### 普通量化

1. 切换到“普通量化模式”，添加物品目标，产量单位为件/分钟
2. 按需要指定外部供应和上限；外供中间产物会截断对应生产链
3. 在“配方与建筑”选择替代配方、建筑和增产策略
4. 查看量化结果，或在 2D 图中拖动卡片整理生产链

“复制此步骤到混带”会生成独立混带配置快照，后续修改不会同步

### 混带规划

1. 选择配方和建筑
2. 在设定面板选择传送带、实际堆叠层数、分拣参数和增产策略
3. 查看设备上限与物料序列，在 2D 示意中检查进料和回流路径
4. 在游戏内验证分流优先级、局部供料和输出通畅情况

两个模式的配置在刷新后恢复2D 视野、节点位置和选中状态在当前会话内保留，刷新后恢复默认布局分享链接只载入对应模式，保留另一个工作区，并兼容旧 `#s` 链接

## 计算范围

- 原矿、采集资源和未建模特殊过程（临界光子、分馏、充电等）按外部供应处理；供应上限不足会报错
- 普通模式功耗按理论建筑负荷估算，不包含采矿、物流、增产剂制造或喷涂消耗
- 混带容量假设带上实际达到所选堆叠层数科技不会减少配方耗料
- 白爪每趟件数是手动简化估算；缓冲参考量约为十秒消耗量入口余量不代表实际回流量
- 需求容量倍率 110% 表示需求乘以 1.1；未取整时约保留 9.1% 入口容量余量
- 2D 与动画是规划示意，不模拟游戏物理；副产物积压、背压和逐台供料需在游戏内验证
- 数据来源版本与当前游戏版本可能不同，详见来源说明

## 开发与部署

```sh
npm test          # 计算、工作区状态与组件交互测试
npm run lint      # TypeScript 类型检查
npm run build     # 生成 dist/ 静态站点
npm run preview   # 本地预览构建结果
```

技术栈：React、TypeScript、Vite、Tailwind CSS、javascript-lp-solver、vite-plugin-pwa

部署时将 `dist/` 上传到静态站点服务使用子路径部署前，需配置 Vite 的 `base` 并验证游戏图标和 PWA 缓存路径不要提交构建产物、依赖目录、密钥或本地开发过程文件

## 未来开发计划

以下功能尚未实现，具体顺序按反馈与可行性调整：

- [ ] **蓝图生成与导出**：从生产方案生成建筑、传送带和分拣器布局，导出可导入游戏的蓝图文本/文件，并完成游戏内校验
- [ ] 保存和分享 2D 手动布局，支持长生产链分组与搜索
- [ ] 批量建筑/增产策略设置，完善游戏版本与特殊过程模型
- [ ] 增产剂消耗、物流功耗、方案对比与结果清单导出

阶段目标与蓝图边界见 [开发路线图](docs/ROADMAP.md)

## 项目文档与 Wiki

- [项目 Wiki 首页](docs/wiki/Home.md)：模式使用、画布操作、配置分享、计算公式和常见问题
- [GitHub Pages 部署教程](docs/GITHUB_PAGES.md)：子路径与 PWA 配置、Actions 工作流和发布检查
- [架构说明](docs/ARCHITECTURE.md) · [贡献指南](CONTRIBUTING.md)

Wiki 当前随源码维护，尚未同步至 GitHub 独立 Wiki仓库型 Pages 部署前需调整根路径 PWA 配置，详见教程

## 项目结构

```text
src/
  components/     页面、设定抽屉、图标和 2D 画布
  data/           游戏数据、转换与工作区数据上下文
  engine/         普通生产链求解与混带容量计算
  utils/          状态校验、保存、分享与撤销
public/           游戏图标和 PWA 静态资源
docs/             公开技术文档
LICENSES/         第三方许可原文
```

贡献前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)

## 借鉴与鸣谢

- [DSPCalculator/dsp-calc](https://github.com/DSPCalculator/dsp-calc)：原版物品/配方数据来源，参考生产链量化与增产配置设计，采用 MulanPSL-2.0
- [FactorioLab](https://github.com/factoriolab/factoriolab)：参考生产链求解、配方调整、状态管理与图形组织设计，采用 MIT
- [DSP Wiki](https://dsp-wiki.com/)：物流、堆叠、增产及特殊生产过程规则参考
- [Best_README_template](https://github.com/shaojintian/Best_README_template)：参考本文的介绍、安装、目录、贡献与鸣谢组织方式

本项目不是游戏官方产品，游戏名称，图标和相关素材的权利属于相应权利人，详细范围及来源记录见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)

## 开源协议

本项目原创代码采用 **GNU General Public License v3.0（GPL-3.0-only）**，全文见 [LICENSE](LICENSE)分发修改版本或构建产物时须遵守 GPL 的相应源代码提供等要求第三方数据和游戏素材不因该协议而变更授权；`src/data/dsp_vanilla.json` 的来源协议全文保留在 [LICENSES/MulanPSL-2.0.txt](LICENSES/MulanPSL-2.0.txt)
