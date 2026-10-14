# 架构说明

应用是浏览器端 React/TypeScript 静态站点，无需后端即可进行核心量化

## 数据和计算

`src/data/dsp_vanilla.json` 提供原版数据，`dspData.ts` 转换为物品、配方与建筑定义工作区通过 `GameDataContext.tsx` 合并自己的扩展数据，避免修改共享原版字典

`engine/production.ts` 按物料守恒构造线性规划，处理多目标、共享原料、副产物、循环配方与外供上限`engine/calculator.ts` 计算混带配方的稳态耗料、带宽及分拣容量

## 工作区状态

`utils/workspaces.ts` 分别维护普通和混带的输入、视图、扩展数据与撤销历史；`stateValidation.ts` 校验导入和恢复数据分享编码只加载链接所属模式本地浏览器存储保存两个工作区

## 界面与画布

`App.tsx` 组织模式切换普通模式由 `ProductionWorkspace.tsx`、`ProductionItemPicker.tsx` 和 `ProductionFlowView.tsx` 提供编辑、图标选择与节点图；混带模式由摘要、指标与 `SchematicView.tsx` 提供容量和物流示意

两个画布在模式/视图切换时保持挂载，保留会话内缩放、平移和选择普通节点位置属于画布本地状态，连线由节点位置实时派生数据配置与画布布局分离；刷新不恢复手动节点布局

## 发布

Vite 构建静态资源，PWA 插件生成缓存与 Service Worker运行资源与第三方许可须随部署保留；内部开发过程文件不属于公开文档
