import { useDSPItems } from '../data/GameDataContext';
import React, { useState } from 'react';
import { X, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { DSP_ITEMS, DSPRecipe } from '../data/dspData';
import { DSPItemIcon } from './DSPItemIcon';

interface CustomRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRecipe: (recipe: DSPRecipe) => void;
}

export const CustomRecipeModal: React.FC<CustomRecipeModalProps> = ({ isOpen, onClose, onSaveRecipe }) => {
  const DSP_ITEMS = useDSPItems();
  const [name, setName] = useState('');
  const [craftTime, setCraftTime] = useState<number>(3.0);
  const [facilityCategory, setFacilityCategory] = useState<'assembler' | 'smelter' | 'chemical' | 'refinery' | 'lab'>('assembler');
  
  const [inputs, setInputs] = useState<{ itemId: string; count: number }[]>([
    { itemId: '1101', count: 2 }, // 铁块
    { itemId: '1104', count: 1 }, // 铜块
  ]);
  
  const [outputItemId, setOutputItemId] = useState('1111'); // 电路板
  const [outputCount, setOutputCount] = useState<number>(1);
  const [description, setDescription] = useState('');

  // Deduplicate items for selection dropdown
  const availableItems = React.useMemo(() => {
    const map = new Map<string, typeof DSP_ITEMS[string]>();
    for (const item of Object.values(DSP_ITEMS)) {
      if (item.numericId && !map.has(item.id)) {
        map.set(item.id, item);
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.numericId || 0) - (b.numericId || 0));
  }, [DSP_ITEMS]);

  if (!isOpen) return null;

  const handleAddInput = () => {
    setInputs([...inputs, { itemId: '1113', count: 1 }]); // 磁线圈
  };

  const handleRemoveInput = (index: number) => {
    if (inputs.length <= 1) return;
    setInputs(inputs.filter((_, i) => i !== index));
  };

  const handleInputChange = (index: number, field: 'itemId' | 'count', value: string | number) => {
    const updated = inputs.map(input => ({ ...input }));
    if (field === 'itemId') {
      updated[index].itemId = value as string;
    } else {
      updated[index].count = Math.max(1, Number(value) || 1);
    }
    setInputs(updated);
  };

  const handleSave = () => {
    const trimmedName = name.trim() || '自定义混带配方';
    const id = `custom_${Date.now()}`;
    const newRecipe: DSPRecipe = {
      id,
      name: trimmedName,
      craftTime: Math.max(0.1, Number(craftTime) || 1),
      facilityCategory,
      inputs,
      outputs: [{ itemId: outputItemId, count: Math.max(1, outputCount) }],
      description: description.trim() || '用户自定义配方沙盒',
      isCustom: true,
    };
    onSaveRecipe(newRecipe);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <h2 className="text-base font-semibold text-white">自定义混带配方沙盒 (Mod/自研)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">配方名称</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例如：量子计算机 Mk.I 或 高速马达混料"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">基础生产周期 (秒)</label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                value={craftTime}
                onChange={e => setCraftTime(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">生产设施类别</label>
              <select
                value={facilityCategory}
                onChange={e => setFacilityCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="assembler">制造台 (Assembler)</option>
                <option value="smelter">熔炉 (Smelter)</option>
                <option value="chemical">化工厂 (Chemical)</option>
                <option value="refinery">精炼厂 (Refinery)</option>
                <option value="lab">矩阵研究站 (Lab)</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-400 font-medium">原料进料清单 (Inputs)</label>
              <button
                type="button"
                onClick={handleAddInput}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加原料</span>
              </button>
            </div>

            <div className="space-y-2">
              {inputs.map((inp, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                  <span className="w-5 text-center text-slate-500 font-mono">{idx + 1}</span>
                  <DSPItemIcon item={DSP_ITEMS[inp.itemId]} size={22} />
                  <select
                    value={inp.itemId}
                    onChange={e => handleInputChange(idx, 'itemId', e.target.value)}
                    className="flex-1 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    {availableItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.iconSymbol})
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">数量</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={inp.count}
                      onChange={e => handleInputChange(idx, 'count', e.target.value)}
                      className="w-16 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 text-center font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  {inputs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveInput(idx)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                      title="删除原料"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <label className="block text-slate-400 mb-1">主产物设定 (Output)</label>
            <div className="flex items-center gap-2">
              <DSPItemIcon item={DSP_ITEMS[outputItemId]} size={28} />
              <select
                value={outputItemId}
                onChange={e => setOutputItemId(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {availableItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.iconSymbol})
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <span className="text-slate-500">产出量</span>
                <input
                  type="number"
                  min="1"
                  value={outputCount}
                  onChange={e => setOutputCount(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-center font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">配方备注说明</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="例如：专为极端紧凑混带设计的自制比例"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-lg transition"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition shadow-md shadow-cyan-500/20"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>保存并载入计算</span>
          </button>
        </div>
      </div>
    </div>
  );
};
