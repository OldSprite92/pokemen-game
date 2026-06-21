import { useMemo } from 'react';
import { AVATAR_OPTIONS } from './StepAvatar';
import { ELEMENT_CONFIG } from './StepElement';
import type { ElementType } from '../../types';

interface SkillEntry {
  name: string;
  description: string;
}

interface StepStatsProps {
  name: string;
  elements: ElementType[];
  skills: SkillEntry[];
  avatar: string;
}

/** 属性基础数值倾向 */
const ELEMENT_BASE_STATS: Record<string, { hp: number; attack: number; defense: number; speed: number }> = {
  fire:     { hp: 75, attack: 90, defense: 60, speed: 85 },
  water:    { hp: 85, attack: 70, defense: 80, speed: 65 },
  grass:    { hp: 80, attack: 65, defense: 85, speed: 70 },
  electric: { hp: 70, attack: 85, defense: 55, speed: 95 },
  ice:      { hp: 80, attack: 75, defense: 85, speed: 60 },
  ground:   { hp: 90, attack: 80, defense: 90, speed: 45 },
  flying:   { hp: 70, attack: 75, defense: 60, speed: 90 },
  dark:     { hp: 70, attack: 90, defense: 60, speed: 85 },
  psychic:  { hp: 65, attack: 70, defense: 65, speed: 100 },
  poison:   { hp: 75, attack: 80, defense: 70, speed: 70 },
  fighting: { hp: 85, attack: 95, defense: 70, speed: 65 },
  bug:      { hp: 70, attack: 65, defense: 70, speed: 80 },
};

/** 形象特征描述 */
const AVATAR_FEATURES: Record<string, { body: string; feature: string; personality: string }> = {
  pig:     { body: '圆滚滚的身体', feature: '大耳朵和卷尾巴', personality: '憨厚可爱' },
  fish:    { body: '流线型的身体', feature: '闪亮的鳞片', personality: '灵活敏捷' },
  bird:    { body: '轻盈的翅膀', feature: '尖锐的喙', personality: '自由翱翔' },
  cat:     { body: '优雅的身姿', feature: '锋利的爪子', personality: '神秘独立' },
  dog:     { body: '健壮的身躯', feature: '灵敏的鼻子', personality: '忠诚勇敢' },
  dragon:  { body: '强壮的龙躯', feature: '巨大的翅膀', personality: '威严霸气' },
  fox:     { body: '灵巧的身体', feature: '蓬松的大尾巴', personality: '聪明狡黠' },
  bear:    { body: '强壮的身躯', feature: '厚实的熊掌', personality: '勇猛力量' },
  rabbit:  { body: '柔软的身体', feature: '长长的耳朵', personality: '活泼可爱' },
  tiger:   { body: '健壮的虎躯', feature: '霸气的条纹', personality: '勇猛威严' },
  monkey:  { body: '灵活的身体', feature: '长长的尾巴', personality: '调皮聪明' },
  panda:   { body: '圆滚滚的身体', feature: '黑白相间的毛', personality: '温和友善' },
  wolf:    { body: '精瘦的身躯', feature: '尖锐的獠牙', personality: '冷酷团队' },
  lion:    { body: '雄壮的狮躯', feature: '威武的鬃毛', personality: '王者霸气' },
  frog:    { body: '圆润的身体', feature: '强壮的后腿', personality: '跳跃活力' },
  mouse:   { body: '小巧的身体', feature: '灵敏的胡须', personality: '机灵快速' },
  snake:   { body: '修长的身体', feature: '光滑的鳞片', personality: '冷静智慧' },
  turtle:  { body: '坚硬的龟壳', feature: '粗壮的四肢', personality: '稳重长寿' },
  unicorn: { body: '优雅的马躯', feature: '闪亮的独角', personality: '纯洁魔法' },
  dino:    { body: '巨大的身躯', feature: '锋利的牙齿', personality: '原始力量' },
};

/** 生成最终数值（取属性平均值 + 随机浮动 ±5） */
function generateStats(elements: ElementType[]) {
  if (elements.length === 0) {
    return { hp: 70, attack: 70, defense: 70, speed: 70 };
  }

  const bases = elements.map((el) => ELEMENT_BASE_STATS[el] || ELEMENT_BASE_STATS.fire);

  const avg = {
    hp: Math.round(bases.reduce((sum, b) => sum + b.hp, 0) / bases.length),
    attack: Math.round(bases.reduce((sum, b) => sum + b.attack, 0) / bases.length),
    defense: Math.round(bases.reduce((sum, b) => sum + b.defense, 0) / bases.length),
    speed: Math.round(bases.reduce((sum, b) => sum + b.speed, 0) / bases.length),
  };

  // 随机浮动 ±5
  const randomOffset = () => Math.floor(Math.random() * 11) - 5;

  return {
    hp: Math.max(50, Math.min(100, avg.hp + randomOffset())),
    attack: Math.max(50, Math.min(100, avg.attack + randomOffset())),
    defense: Math.max(50, Math.min(100, avg.defense + randomOffset())),
    speed: Math.max(50, Math.min(100, avg.speed + randomOffset())),
  };
}

/** 生成宝可梦描述 */
function generateDescription(
  name: string,
  elements: ElementType[],
  avatarId: string
): string {
  const avatarInfo = AVATAR_OPTIONS.find((a) => a.id === avatarId);
  const avatarFeature = AVATAR_FEATURES[avatarId];
  const primaryElement = elements[0];
  const elementInfo = primaryElement ? ELEMENT_CONFIG[primaryElement] : null;

  if (!avatarInfo || !avatarFeature || !elementInfo) {
    return `${name}是一只神秘的宝可梦！`;
  }

  const elementDesc = elements.map((el) => {
    const cfg = ELEMENT_CONFIG[el];
    return cfg ? `${cfg.emoji}${cfg.label}` : '';
  }).join('、');

  return `${name}是一只${elementDesc}属性的宝可梦。它有着${avatarFeature.body}，${avatarFeature.feature}，性格${avatarFeature.personality}。`;
}

/** 数值条颜色 */
function statColor(value: number): string {
  if (value >= 85) return '#22c55e'; // 绿
  if (value >= 70) return '#3b82f6'; // 蓝
  if (value >= 55) return '#eab308'; // 黄
  return '#ef4444'; // 红
}

/** 数值评价 */
function statLabel(value: number): string {
  if (value >= 85) return '优秀';
  if (value >= 70) return '良好';
  if (value >= 55) return '普通';
  return '偏弱';
}

export default function StepStats({ name, elements, skills, avatar }: StepStatsProps) {
  const stats = useMemo(() => generateStats(elements), [elements]);

  const avatarInfo = AVATAR_OPTIONS.find((a) => a.id === avatar);
  const primaryElement = elements[0];
  const elementInfo = primaryElement ? ELEMENT_CONFIG[primaryElement] : null;
  const description = useMemo(
    () => generateDescription(name, elements, avatar),
    [name, elements, avatar]
  );

  const statItems = [
    { key: 'hp', label: '❤️ HP', value: stats.hp },
    { key: 'attack', label: '⚔️ 攻击', value: stats.attack },
    { key: 'defense', label: '🛡️ 防御', value: stats.defense },
    { key: 'speed', label: '💨 速度', value: stats.speed },
  ];

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-6xl">✨</div>
      <h2 className="text-2xl font-bold text-yellow-300 pixel-title text-center">
        你的宝可梦诞生了！
      </h2>

      {/* 宝可梦形象卡片 */}
      <div className="pixel-border rounded-2xl p-5 bg-gray-800/70 w-full max-w-sm">
        {/* 形象展示区 */}
        <div className="flex flex-col items-center gap-3 mb-4">
          {/* 大头像 + 属性光环 */}
          <div className="relative">
            <div
              className={`w-24 h-24 rounded-2xl flex items-center justify-center text-5xl ${primaryElement ? `element-${primaryElement}` : ''}`}
              style={{
                backgroundColor: avatarInfo?.bg || '#1f2937',
              }}
            >
              {avatarInfo?.emoji || '❓'}
            </div>
            {/* 属性标记 */}
            {elements.length > 0 && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {elements.map((el) => {
                  const cfg = ELEMENT_CONFIG[el];
                  return (
                    <span
                      key={el}
                      className="text-lg bg-gray-900 rounded-full px-2 py-0.5"
                      title={cfg?.label}
                    >
                      {cfg?.emoji}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* 名字 */}
          <h3 className="text-2xl font-bold text-white mt-2">{name || '未命名'}</h3>

          {/* 描述 */}
          <p className="text-sm text-gray-300 text-center leading-relaxed px-2">
            {description}
          </p>
        </div>

        {/* 分隔线 */}
        <div className="h-px bg-gray-600 my-4" />

        {/* 技能列表 */}
        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-2 font-bold">🎯 技能</p>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, i) =>
              skill.name ? (
                <span
                  key={i}
                  className="text-sm font-bold px-3 py-1.5 rounded-lg"
                  style={{
                    backgroundColor: (elementInfo?.color || '#666') + '25',
                    color: elementInfo?.color || '#ccc',
                    border: `1px solid ${(elementInfo?.color || '#666') + '40'}`,
                  }}
                >
                  {elementInfo?.emoji} {skill.name}
                </span>
              ) : null
            )}
          </div>
        </div>

        {/* 数值条 */}
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-400 font-bold">📊 能力值</p>
          {statItems.map((item) => {
            const color = statColor(item.value);
            return (
              <div key={item.key} className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-300">{item.label}</span>
                  <span className="text-sm font-bold" style={{ color }}>
                    {item.value} <span className="text-xs text-gray-500">({statLabel(item.value)})</span>
                  </span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full stat-bar-fill"
                    style={{
                      width: `${item.value}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 提示 */}
      <p className="text-sm text-gray-500 text-center">
        💡 数值由属性倾向决定，每次创建会有小幅随机变化
      </p>
    </div>
  );
}

export { generateStats };
