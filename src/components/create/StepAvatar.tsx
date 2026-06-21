import { useState } from 'react';

interface StepAvatarProps {
  avatar: string;
  onChange: (avatar: string) => void;
}

/** 内置像素风头像 - 用 emoji + 颜色组合代表不同宝可梦形象 */
export const AVATAR_OPTIONS = [
  { id: 'pig', emoji: '🐷', color: '#eab308', bg: '#451a03', label: '小猪' },
  { id: 'fish', emoji: '🐟', color: '#3b82f6', bg: '#0c2d5e', label: '小鱼' },
  { id: 'bird', emoji: '🐦', color: '#ef4444', bg: '#450a0a', label: '小鸟' },
  { id: 'cat', emoji: '🐱', color: '#f97316', bg: '#431407', label: '小猫' },
  { id: 'dog', emoji: '🐶', color: '#a16207', bg: '#451a03', label: '小狗' },
  { id: 'dragon', emoji: '🐲', color: '#22c55e', bg: '#052e16', label: '小龙' },
  { id: 'fox', emoji: '🦊', color: '#f97316', bg: '#431407', label: '小狐狸' },
  { id: 'bear', emoji: '🐻', color: '#a16207', bg: '#451a03', label: '小熊' },
  { id: 'rabbit', emoji: '🐰', color: '#f472b6', bg: '#500724', label: '小兔' },
  { id: 'tiger', emoji: '🐯', color: '#f59e0b', bg: '#451a03', label: '小虎' },
  { id: 'monkey', emoji: '🐵', color: '#a16207', bg: '#451a03', label: '小猴' },
  { id: 'panda', emoji: '🐼', color: '#374151', bg: '#111827', label: '熊猫' },
  { id: 'wolf', emoji: '🐺', color: '#6b7280', bg: '#1f2937', label: '小狼' },
  { id: 'lion', emoji: '🦁', color: '#f59e0b', bg: '#451a03', label: '小狮' },
  { id: 'frog', emoji: '🐸', color: '#22c55e', bg: '#052e16', label: '青蛙' },
  { id: 'crab', emoji: '🦀', color: '#dc2626', bg: '#450a0a', label: '螃蟹' },
  { id: 'mouse', emoji: '🐭', color: '#9ca3af', bg: '#1f2937', label: '小鼠' },
  { id: 'snake', emoji: '🐍', color: '#16a34a', bg: '#052e16', label: '小蛇' },
  { id: 'turtle', emoji: '🐢', color: '#16a34a', bg: '#052e16', label: '乌龟' },
  { id: 'unicorn', emoji: '🦄', color: '#d946ef', bg: '#4a044e', label: '独角兽' },
  { id: 'dino', emoji: '🦖', color: '#22c55e', bg: '#052e16', label: '恐龙' },
  // 新增野生宝可梦头像
  { id: 'pinkpig', emoji: '🐷', color: '#f472b6', bg: '#500724', label: '粉仙猪' },
  { id: 'firedog', emoji: '🐕', color: '#ef4444', bg: '#450a0a', label: '炎鬃犬' },
  { id: 'bat', emoji: '🦇', color: '#6366f1', bg: '#1e1b4b', label: '幽冥蝠' },
  { id: 'goose', emoji: '🪿', color: '#06b6d4', bg: '#083344', label: '冻原鹅' },
  { id: 'rhino', emoji: '🦏', color: '#eab308', bg: '#422006', label: '雷冠犀' },
  { id: 'turtle2', emoji: '🐢', color: '#3b82f6', bg: '#0c2d5e', label: '藻铠龟' },
  { id: 'eagle', emoji: '🦅', color: '#78716c', bg: '#1f2937', label: '裂空鹰' },
  { id: 'fox2', emoji: '🦊', color: '#f472b6', bg: '#500724', label: '樱尾狐' },
  { id: 'croc', emoji: '🐊', color: '#ef4444', bg: '#450a0a', label: '炽泥鳄' },
  { id: 'swallow', emoji: '🐦', color: '#eab308', bg: '#422006', label: '磁羽燕' },
  { id: 'elephant', emoji: '🐘', color: '#a16207', bg: '#451a03', label: '大舌象' },
  { id: 'vanilla', emoji: '🐷', color: '#22c55e', bg: '#052e16', label: '香草猪' },
  { id: 'bubblepig', emoji: '🐽', color: '#06b6d4', bg: '#083344', label: '泡泡猪' },
  { id: 'orchid', emoji: '🌸', color: '#22c55e', bg: '#052e16', label: '草蜜兰' },
  { id: 'cotton', emoji: '☁️', color: '#3b82f6', bg: '#0c2d5e', label: '水棉兰' },
  { id: 'firedrake', emoji: '🐉', color: '#ef4444', bg: '#450a0a', label: '火翼龙' },
  { id: 'icesaw', emoji: '🦎', color: '#06b6d4', bg: '#083344', label: '冰锯蜥' },
  { id: 'rocklizard', emoji: '🦎', color: '#78716c', bg: '#1f2937', label: '岩陆蜥' },
  { id: 'lightning', emoji: '⚡', color: '#eab308', bg: '#422006', label: '闪电蜥' },
  { id: 'dragon2', emoji: '🐲', color: '#7c3aed', bg: '#2e1065', label: '翼幻接龙' },
  { id: 'snow', emoji: '❄️', color: '#3b82f6', bg: '#0c2d5e', label: '雪百纳' },
  { id: 'darkpig', emoji: '🐗', color: '#a855f7', bg: '#3b0764', label: '黑仙猪' },
  { id: 'lightbird', emoji: '✨', color: '#fbbf24', bg: '#451a03', label: '烈光鸟' },
];

export default function StepAvatar({ avatar, onChange }: StepAvatarProps) {
  const [selectedId, setSelectedId] = useState(avatar || '');

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onChange(id);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-6xl">🎨</div>
      <h2 className="text-2xl font-bold text-yellow-300 pixel-title text-center">
        选个样子！
      </h2>
      <p className="text-lg text-gray-300 text-center">
        选一个你喜欢的形象 🎭
      </p>

      {/* 头像网格 */}
      <div className="grid grid-cols-4 gap-3 w-full max-w-sm">
        {AVATAR_OPTIONS.map((opt) => {
          const isSelected = selectedId === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={`
                flex flex-col items-center justify-center gap-1
                h-20 rounded-xl transition-all duration-200 active:scale-95
                ${isSelected
                  ? 'ring-2 ring-yellow-400 scale-105 shadow-lg'
                  : 'hover:scale-105'
                }
              `}
              style={{
                backgroundColor: opt.bg,
                boxShadow: isSelected ? `0 0 16px ${opt.color}60` : undefined,
              }}
            >
              <span className="text-3xl">{opt.emoji}</span>
              <span className="text-xs font-bold" style={{ color: opt.color }}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 已选预览 */}
      {selectedId && (
        <div className="pixel-border rounded-xl px-6 py-4 bg-gray-800/50 text-center flex flex-col items-center gap-2">
          <p className="text-lg text-yellow-200/80">你选的是：</p>
          {(() => {
            const opt = AVATAR_OPTIONS.find((o) => o.id === selectedId);
            return opt ? (
              <div className="flex items-center gap-3">
                <span className="text-4xl">{opt.emoji}</span>
                <span className="text-xl font-bold" style={{ color: opt.color }}>
                  {opt.label}
                </span>
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}
