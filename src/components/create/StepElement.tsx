import type { ElementType } from '../../types';

/** 属性配置：emoji、中文名、颜色 */
export const ELEMENT_CONFIG: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
  fire:      { emoji: '🔥', label: '火',  color: '#ef4444', bg: 'bg-red-500' },
  water:     { emoji: '💧', label: '水',  color: '#3b82f6', bg: 'bg-blue-500' },
  grass:     { emoji: '🌿', label: '草',  color: '#22c55e', bg: 'bg-green-500' },
  electric:  { emoji: '⚡', label: '电',  color: '#eab308', bg: 'bg-yellow-500' },
  ice:       { emoji: '❄️', label: '冰',  color: '#06b6d4', bg: 'bg-cyan-500' },
  ground:    { emoji: '🏔️', label: '地面', color: '#a16207', bg: 'bg-amber-700' },
  flying:    { emoji: '🌪️', label: '风',  color: '#8b5cf6', bg: 'bg-purple-500' },
  dark:      { emoji: '🌙', label: '暗',  color: '#4a1d96', bg: 'bg-purple-900' },
  psychic:   { emoji: '✨', label: '光',  color: '#f472b6', bg: 'bg-pink-400' },
  poison:   { emoji: '☠️', label: '毒',  color: '#7c3aed', bg: 'bg-violet-600' },
  fighting:  { emoji: '👊', label: '格斗', color: '#dc2626', bg: 'bg-red-700' },
  bug:       { emoji: '🐛', label: '虫',  color: '#84cc16', bg: 'bg-lime-500' },
  normal:    { emoji: '⭐', label: '一般', color: '#9ca3af', bg: 'bg-gray-400' },
  rock:      { emoji: '🪨', label: '岩石', color: '#78716c', bg: 'bg-stone-500' },
  ghost:     { emoji: '👻', label: '幽灵', color: '#6366f1', bg: 'bg-indigo-500' },
  dragon:    { emoji: '🐉', label: '龙',  color: '#7c3aed', bg: 'bg-violet-600' },
  steel:     { emoji: '⚙️', label: '钢',  color: '#64748b', bg: 'bg-slate-500' },
  fairy:     { emoji: '🧚', label: '妖精', color: '#f472b6', bg: 'bg-pink-400' },
  light:     { emoji: '☀️', label: '光',  color: '#fbbf24', bg: 'bg-amber-400' },
};

/** 任务要求中出现的属性列表（按顺序） */
const AVAILABLE_ELEMENTS = [
  'fire', 'water', 'grass', 'electric', 'ice',
  'ground', 'flying', 'dark', 'psychic', 'poison',
  'fighting', 'bug',
];

interface StepElementProps {
  elements: ElementType[];
  onChange: (elements: ElementType[]) => void;
}

export default function StepElement({ elements, onChange }: StepElementProps) {
  const handleToggle = (el: ElementType) => {
    if (elements.includes(el)) {
      onChange(elements.filter((e) => e !== el));
    } else if (elements.length < 2) {
      onChange([...elements, el]);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-6xl">🌈</div>
      <h2 className="text-2xl font-bold text-yellow-300 pixel-title text-center">
        选属性！
      </h2>
      <p className="text-lg text-gray-300 text-center">
        可以选 1～2 个属性，决定了你的宝可梦是什么类型 💪
      </p>

      {/* 属性网格 */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
        {AVAILABLE_ELEMENTS.map((el) => {
          const cfg = ELEMENT_CONFIG[el];
          const isSelected = elements.includes(el as ElementType);
          const isDisabled = !isSelected && elements.length >= 2;
          return (
            <button
              key={el}
              onClick={() => handleToggle(el as ElementType)}
              disabled={isDisabled}
              className={`
                flex flex-col items-center justify-center gap-1
                h-16 rounded-xl text-lg font-bold
                transition-all duration-200 active:scale-95
                ${isSelected
                  ? `${cfg.bg} text-white shadow-lg scale-105 border-2 border-white/40`
                  : isDisabled
                    ? 'bg-gray-700/50 text-gray-500 opacity-50 cursor-not-allowed'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-2 border-transparent'
                }
              `}
              style={isSelected ? { boxShadow: `0 0 16px ${cfg.color}40` } : undefined}
            >
              <span className="text-2xl">{cfg.emoji}</span>
              <span className="text-sm font-bold">{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {/* 已选提示 */}
      {elements.length > 0 && (
        <div className="pixel-border rounded-lg px-4 py-2 bg-gray-800/50 text-center">
          <p className="text-lg text-yellow-200/80">
            已选属性：
            {elements.map((el) => (
              <span key={el} className="ml-2 inline-flex items-center gap-1 font-bold" style={{ color: ELEMENT_CONFIG[el]?.color }}>
                {ELEMENT_CONFIG[el]?.emoji} {ELEMENT_CONFIG[el]?.label}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}
