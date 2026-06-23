import type { Monster, Skill, ElementType } from '../types';

/** 创建技能辅助函数 */
export function createSkill(
  name: string,
  element: ElementType,
  power: number,
  accuracy: number,
  description: string
): Skill {
  return {
    id: `skill-${name}`,
    name,
    element,
    power,
    accuracy,
    description,
  };
}

/** 苦力猪 - 地面+闪电属性 */
export const KULI_PIG: Monster = {
  name: '苦力猪',
  element: 'ground', // 主属性地面
  skills: [
    createSkill('泥石流冲锋', 'ground', 25, 90, '卷起泥石流冲向敌人'),
    createSkill('闪电麻痹', 'electric', 20, 95, '释放电流麻痹敌人'),
  ],
  avatar: 'pig',
  hp: 95,
  maxHp: 95,
  attack: 55,
  defense: 70,
  speed: 35,
  level: 1,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

/** 洞居蟹 - 格斗+水属性 */
export const CAVE_CRAB: Monster = {
  name: '洞居蟹',
  element: 'fighting', // 主属性格斗
  skills: [
    createSkill('水流冲击', 'water', 25, 90, '用高压水流冲击敌人'),
    createSkill('爆裂拳', 'fighting', 30, 85, '强力的爆裂拳击'),
  ],
  avatar: 'crab',
  hp: 80,
  maxHp: 80,
  attack: 65,
  defense: 60,
  speed: 45,
  level: 1,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

/** 萤菇蛙 - 草+毒属性 */
export const GLOW_FROG: Monster = {
  name: '萤菇蛙',
  element: 'grass', // 主属性草
  skills: [
    createSkill('喷射毒液', 'poison', 25, 90, '喷射剧毒液体攻击敌人'),
    createSkill('睡眠泡泡', 'grass', 15, 95, '释放让人昏昏欲睡的泡泡'),
  ],
  avatar: 'frog',
  hp: 75,
  maxHp: 75,
  attack: 60,
  defense: 50,
  speed: 55,
  level: 1,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

/** 所有初始宝可梦 */
export const STARTER_MONSTERS: Monster[] = [KULI_PIG, CAVE_CRAB, GLOW_FROG];

/** 初始宝可梦展示配置 */
export const STARTER_CONFIG = [
  {
    monster: KULI_PIG,
    emoji: '🐷',
    bgColor: '#92400e',
    description: '皮糙肉厚的苦力猪，擅长地面和闪电技能',
    secondaryElement: 'electric' as ElementType,
  },
  {
    monster: CAVE_CRAB,
    emoji: '🦀',
    bgColor: '#dc2626',
    description: '坚硬外壳的洞居蟹，格斗和水属性兼备',
    secondaryElement: 'water' as ElementType,
  },
  {
    monster: GLOW_FROG,
    emoji: '🐸',
    bgColor: '#22c55e',
    description: '神秘的萤菇蛙，草毒双属性的小精灵',
    secondaryElement: 'poison' as ElementType,
  },
];
