import { useState } from 'react';
import { ELEMENT_CONFIG } from './StepElement';
import type { ElementType } from '../../types';
import VoiceInputButton from '../VoiceInputButton';

interface SkillEntry {
  name: string;
  description: string;
  element?: ElementType;
}

interface StepSkillsProps {
  skills: SkillEntry[];
  onChange: (skills: SkillEntry[]) => void;
  elements: ElementType[];
}

const SKILL_NAME_EXAMPLES = ['火焰拳', '冰冻光线', '水花飞溅', '雷电一击', '草叶风暴', '暗影球'];
const SKILL_DESC_EXAMPLES = ['用火焰攻击对手', '用冰冻光线冻结对手', '用水花冲击对手', '释放强力雷电', '召唤草叶风暴', '发射暗影能量球'];

/** 所有可选属性 */
const ALL_ELEMENTS: ElementType[] = [
  'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison',
  'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon',
  'dark', 'steel', 'fairy', 'normal', 'light'
];

export default function StepSkills({ skills, onChange, elements }: StepSkillsProps) {
  const [showElementPicker, setShowElementPicker] = useState<number | null>(null);

  const addSkill = () => {
    if (skills.length < 4) {
      const defaultElement = elements[0] || 'fire';
      onChange([...skills, { name: '', description: '', element: defaultElement }]);
    }
  };

  const removeSkill = (index: number) => {
    if (skills.length > 1) {
      onChange(skills.filter((_, i) => i !== index));
    }
  };

  const updateSkill = (index: number, field: keyof SkillEntry, value: string) => {
    const updated = [...skills];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const selectElement = (index: number, element: ElementType) => {
    updateSkill(index, 'element', element);
    setShowElementPicker(null);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-6xl">⚔️</div>
      <h2 className="text-2xl font-bold text-yellow-300 pixel-title text-center">
        配置技能！
      </h2>
      <p className="text-lg text-gray-300 text-center">
        每个技能都可以选择不同的属性哦 🎯
      </p>

      {/* 提示信息 */}
      <div className="w-full max-w-sm bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
        <p className="text-sm text-yellow-200">
          💡 <span className="font-bold">提示：</span>点击属性图标可以切换技能的属性！威力会自动生成。
        </p>
      </div>

      {/* 技能列表 */}
      <div className="w-full max-w-sm flex flex-col gap-4">
        {skills.map((skill, index) => {
          const namePlaceholder = SKILL_NAME_EXAMPLES[index % SKILL_NAME_EXAMPLES.length];
          const descPlaceholder = SKILL_DESC_EXAMPLES[index % SKILL_DESC_EXAMPLES.length];
          const elCfg = ELEMENT_CONFIG[skill.element || elements[0] || 'fire'];

          return (
            <div
              key={index}
              className="pixel-border rounded-xl p-4 bg-gray-800/70 flex flex-col gap-3"
            >
              {/* 技能编号 + 属性选择器 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">技能 {index + 1}</span>
                  <button
                    onClick={() => setShowElementPicker(showElementPicker === index ? null : index)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-bold transition-all hover:scale-105"
                    style={{
                      backgroundColor: elCfg?.color + '30',
                      color: elCfg?.color,
                      border: `1px solid ${elCfg?.color}60`
                    }}
                  >
                    <span className="text-lg">{elCfg?.emoji}</span>
                    <span>{elCfg?.label}</span>
                    <span className="text-xs ml-1">▼</span>
                  </button>
                </div>
                {skills.length > 1 && (
                  <button
                    onClick={() => removeSkill(index)}
                    className="text-red-400 hover:text-red-300 text-sm font-bold bg-red-900/30 rounded-lg px-3 py-1 transition-colors"
                  >
                    ✕ 删除
                  </button>
                )}
              </div>

              {/* 属性选择面板 */}
              {showElementPicker === index && (
                <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">选择技能属性：</p>
                  <div className="grid grid-cols-5 gap-2">
                    {ALL_ELEMENTS.map((el) => {
                      const cfg = ELEMENT_CONFIG[el];
                      const isSelected = skill.element === el;
                      return (
                        <button
                          key={el}
                          onClick={() => selectElement(index, el)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                            isSelected ? 'ring-2 ring-white scale-105' : 'hover:bg-gray-700'
                          }`}
                          style={{
                            backgroundColor: isSelected ? cfg?.color + '40' : cfg?.color + '15',
                            color: cfg?.color,
                          }}
                        >
                          <span className="text-lg">{cfg?.emoji}</span>
                          <span>{cfg?.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 技能名 */}
              <label className="text-sm text-gray-400 font-bold">技能名字（必填）</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={skill.name}
                  onChange={(e) => updateSkill(index, 'name', e.target.value)}
                  placeholder={namePlaceholder}
                  className="flex-1 text-lg font-bold bg-gray-900 border-2 border-gray-600 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:border-yellow-400/60 focus:ring-1 focus:ring-yellow-400/30 focus:outline-none transition-all"
                  maxLength={12}
                />
                <VoiceInputButton onResult={(text) => updateSkill(index, 'name', text)} />
              </div>

              {/* 效果简述 */}
              <label className="text-sm text-gray-400 font-bold">效果描述（可选）</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={skill.description}
                  onChange={(e) => updateSkill(index, 'description', e.target.value)}
                  placeholder={descPlaceholder}
                  className="flex-1 text-base bg-gray-900 border-2 border-gray-600 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:border-yellow-400/60 focus:ring-1 focus:ring-yellow-400/30 focus:outline-none transition-all"
                  maxLength={30}
                />
                <VoiceInputButton onResult={(text) => updateSkill(index, 'description', text)} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 添加技能按钮 */}
      {skills.length < 4 && (
        <button
          onClick={addSkill}
          className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 active:bg-green-700 text-white text-lg font-bold h-12 px-6 rounded-xl transition-all duration-200 active:scale-95 shadow-lg"
        >
          <span className="text-xl">➕</span>
          添加技能
        </button>
      )}
    </div>
  );
}
