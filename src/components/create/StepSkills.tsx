import { ELEMENT_CONFIG } from './StepElement';
import type { ElementType } from '../../types';
import VoiceInputButton from '../VoiceInputButton';

interface SkillEntry {
  name: string;
  description: string;
}

interface StepSkillsProps {
  skills: SkillEntry[];
  onChange: (skills: SkillEntry[]) => void;
  elements: ElementType[];
}

const SKILL_NAME_EXAMPLES = ['火焰拳', '冰冻光线', '水花飞溅', '雷电一击', '草叶风暴', '暗影球'];
const SKILL_DESC_EXAMPLES = ['用火焰攻击对手', '用冰冻光线冻结对手', '用水花冲击对手', '释放强力雷电', '召唤草叶风暴', '发射暗影能量球'];

export default function StepSkills({ skills, onChange, elements }: StepSkillsProps) {
  const addSkill = () => {
    if (skills.length < 4) {
      onChange([...skills, { name: '', description: '' }]);
    }
  };

  const removeSkill = (index: number) => {
    if (skills.length > 1) {
      onChange(skills.filter((_, i) => i !== index));
    }
  };

  const updateSkill = (index: number, field: 'name' | 'description', value: string) => {
    const updated = [...skills];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const primaryElement = elements[0] || 'fire';

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-6xl">⚔️</div>
      <h2 className="text-2xl font-bold text-yellow-300 pixel-title text-center">
        配置技能！
      </h2>
      <p className="text-lg text-gray-300 text-center">
        每个宝可梦最多可以有 4 个技能 🎯
      </p>

      {/* 提示信息 */}
      <div className="w-full max-w-sm bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
        <p className="text-sm text-yellow-200">
          💡 <span className="font-bold">提示：</span>至少填写一个技能名字才能继续哦！威力会自动生成。
        </p>
      </div>

      {/* 技能列表 */}
      <div className="w-full max-w-sm flex flex-col gap-4">
        {skills.map((skill, index) => {
          const namePlaceholder = SKILL_NAME_EXAMPLES[index % SKILL_NAME_EXAMPLES.length];
          const descPlaceholder = SKILL_DESC_EXAMPLES[index % SKILL_DESC_EXAMPLES.length];
          const elCfg = ELEMENT_CONFIG[primaryElement];

          return (
            <div
              key={index}
              className="pixel-border rounded-xl p-4 bg-gray-800/70 flex flex-col gap-3"
            >
              {/* 技能编号 + 属性标记 */}
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold flex items-center gap-2" style={{ color: elCfg?.color }}>
                  <span className="text-xl">{elCfg?.emoji}</span>
                  技能 {index + 1}
                </span>
                {skills.length > 1 && (
                  <button
                    onClick={() => removeSkill(index)}
                    className="text-red-400 hover:text-red-300 text-sm font-bold
                      bg-red-900/30 rounded-lg px-3 py-1 transition-colors"
                  >
                    ✕ 删除
                  </button>
                )}
              </div>

              {/* 技能名 */}
              <label className="text-sm text-gray-400 font-bold">技能名字（必填）</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={skill.name}
                  onChange={(e) => updateSkill(index, 'name', e.target.value)}
                  placeholder={namePlaceholder}
                  className="flex-1 text-lg font-bold
                    bg-gray-900 border-2 border-gray-600 rounded-lg
                    px-4 py-3 text-white
                    placeholder:text-gray-500
                    focus:border-yellow-400/60 focus:ring-1 focus:ring-yellow-400/30
                    focus:outline-none transition-all"
                  maxLength={12}
                />
                <VoiceInputButton
                  onResult={(text) => updateSkill(index, 'name', text)}
                />
              </div>

              {/* 效果简述 */}
              <label className="text-sm text-gray-400 font-bold">效果描述（可选）</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={skill.description}
                  onChange={(e) => updateSkill(index, 'description', e.target.value)}
                  placeholder={descPlaceholder}
                  className="flex-1 text-base
                    bg-gray-900 border-2 border-gray-600 rounded-lg
                    px-4 py-3 text-white
                    placeholder:text-gray-500
                    focus:border-yellow-400/60 focus:ring-1 focus:ring-yellow-400/30
                    focus:outline-none transition-all"
                  maxLength={30}
                />
                <VoiceInputButton
                  onResult={(text) => updateSkill(index, 'description', text)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 添加技能按钮 */}
      {skills.length < 4 && (
        <button
          onClick={addSkill}
          className="flex items-center justify-center gap-2
            bg-green-600 hover:bg-green-500 active:bg-green-700
            text-white text-lg font-bold
            h-12 px-6 rounded-xl
            transition-all duration-200 active:scale-95
            shadow-lg"
        >
          <span className="text-xl">➕</span>
          添加技能
        </button>
      )}
    </div>
  );
}
