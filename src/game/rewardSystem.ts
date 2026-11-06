import type { Monster, ElementType, Skill, PokeBallType, MapDifficulty } from '../types';
import { POKEBALL_CONFIG } from './catchSystem';
import { learnNewSkill, checkSkillUnlock, getSkillCountByLevel } from './skillPool';

/** 战斗胜利奖励结果 */
export interface BattleReward {
  exp: number;
  diamonds: number;
  skillStone: boolean;
  skillStoneElement?: ElementType;
  pokeballs: { type: PokeBallType; count: number }[];
}

/** 计算经验值奖励 */
export function calculateExpReward(enemy: Monster): number {
  const baseExp = enemy.level * 10;
  const randomBonus = Math.floor(Math.random() * 6); // 0~5
  return baseExp + randomBonus;
}

/** 随机生成技能石 */
export function generateSkillStone(): { element: ElementType } | null {
  // 30%概率获得技能石
  if (Math.random() > 0.3) return null;

  const elements: ElementType[] = [
    'fire', 'water', 'grass', 'electric', 'normal', 'ice', 'fighting',
    'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost',
    'dragon', 'dark', 'steel', 'fairy', 'light',
  ];
  const element = elements[Math.floor(Math.random() * elements.length)];
  return { element };
}

/**
 * Each difficulty has its own complete 100% distribution. Higher difficulties
 * steadily exchange common-ball weight for rare-ball weight.
 */
export const POKEBALL_DROP_RATES: Record<MapDifficulty, Record<PokeBallType, number>> = {
  easy: {
    normal: 76,
    great: 20,
    ultra: 3.5,
    master: 0.5,
    legend: 0,
    transcend: 0,
  },
  hard: {
    normal: 64,
    great: 24,
    ultra: 8,
    master: 3,
    legend: 0.8,
    transcend: 0.2,
  },
  hell: {
    normal: 50,
    great: 25,
    ultra: 14,
    master: 7,
    legend: 3,
    transcend: 1,
  },
};

const POKEBALL_DROP_ORDER: PokeBallType[] = [
  'normal',
  'great',
  'ultra',
  'master',
  'legend',
  'transcend',
];

/** 随地图难度随机生成 1～3 个精灵球掉落。 */
export function generatePokeballDrops(
  difficulty: MapDifficulty = 'easy',
  random: () => number = Math.random,
): { type: PokeBallType; count: number }[] {
  const totalCount = 1 + Math.floor(random() * 3); // 1-3个
  const drops: { type: PokeBallType; count: number }[] = [];
  const rates = POKEBALL_DROP_RATES[difficulty];
  const totalWeight = POKEBALL_DROP_ORDER.reduce((sum, type) => sum + rates[type], 0);

  for (let i = 0; i < totalCount; i++) {
    const roll = random() * totalWeight;
    let cumulative = 0;
    let selected: PokeBallType = POKEBALL_DROP_ORDER[POKEBALL_DROP_ORDER.length - 1];

    for (const type of POKEBALL_DROP_ORDER) {
      cumulative += rates[type];
      if (roll < cumulative) {
        selected = type;
        break;
      }
    }

    const existing = drops.find((d) => d.type === selected);
    if (existing) {
      existing.count++;
    } else {
      drops.push({ type: selected, count: 1 });
    }
  }

  return drops;
}

/** 生成完整战斗奖励 */
export function generateBattleReward(enemy: Monster, difficulty: MapDifficulty = 'easy'): BattleReward {
  const exp = calculateExpReward(enemy);
  const skillStoneResult = generateSkillStone();
  const pokeballs = generatePokeballDrops(difficulty);

  return {
    exp,
    diamonds: 2 + Math.floor(enemy.level / 2) + Math.floor(Math.random() * 3),
    skillStone: skillStoneResult !== null,
    skillStoneElement: skillStoneResult?.element,
    pokeballs,
  };
}

/** 生成随机技能 */
export function generateRandomSkill(element: ElementType): Skill {
  const skillNames: Record<string, string[]> = {
    fire: ['火焰喷射', '火球术', '烈焰冲击', '燃烧之刃'],
    water: ['水枪', '水流冲击', '海啸', '冰冻之泪'],
    grass: ['藤蔓缠绕', '种子炸弹', '光合作用', '毒粉'],
    electric: ['电击', '十万伏特', '雷电拳', '静电场'],
    normal: ['撞击', '抓挠', '猛撞', '星星冲击'],
    ice: ['冰冻光束', '暴风雪', '冰锥', '霜冻'],
    fighting: ['空手劈', '飞踢', '气功波', '重拳'],
    poison: ['毒液', '腐蚀气体', '剧毒', '酸雨'],
    ground: ['地震', '沙暴', '岩石投掷', '地裂'],
    flying: ['翅膀攻击', '空气斩', '旋风', '俯冲'],
    psychic: ['念力', '精神强念', '预知未来', '催眠术'],
    bug: ['虫咬', '丝线缠绕', '毒针', '鳞粉'],
    rock: ['落石', '岩石封锁', '岩崩', '石刃'],
    ghost: ['暗影爪', '惊吓', '暗影球', '诅咒'],
    dragon: ['龙爪', '龙之怒', '龙息', '龙星群'],
    dark: ['暗影爪', '恶之波动', '偷袭', '欺诈'],
    steel: ['金属爪', '铁头', '钢翼', '钢铁冲击'],
    fairy: ['妖精之风', '星光魔法', '月亮之力', '治愈之愿'],
    light: ['闪光', '光束冲击', '阳光烈焰', '圣光守护'],
  };

  const names = skillNames[element] || ['神秘攻击'];
  const name = names[Math.floor(Math.random() * names.length)];
  const power = 15 + Math.floor(Math.random() * 16); // 15-30
  const accuracy = 90 + Math.floor(Math.random() * 11); // 90-100

  return {
    id: `skill-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    name,
    element,
    power,
    accuracy,
    description: `${name}攻击`,
  };
}

/** 应用经验值（升级检测） */
export function applyExp(monster: Monster, exp: number): { monster: Monster; leveledUp: boolean; newSkills?: Skill[] } {
  let newExp = monster.exp + exp;
  let newLevel = monster.level;
  const originalMaxHp = monster.maxHp || monster.hp;
  let newHp = originalMaxHp;
  // Experience should not quietly erase all battle damage.  A level-up grants
  // the newly earned maximum-HP portion, while camps remain the reliable way
  // to heal an expedition party.
  let currentHp = Math.min(monster.hp, originalMaxHp);
  let newAttack = monster.attack;
  let newDefense = monster.defense;
  let newSpeed = monster.speed;
  let expToNext = monster.expToNext || 100;
  let leveledUp = false;
  const newSkills: Skill[] = [];
  let currentSkills = [...monster.skills];

  // 检测升级（最高10级）
  while (newExp >= expToNext && newLevel < 10) {
    const oldLevel = newLevel;
    newExp -= expToNext;
    newLevel++;
    leveledUp = true;

    // 升级属性提升
    const hpGain = 3 + Math.floor(Math.random() * 3);
    newHp += hpGain;
    currentHp += hpGain;
    newAttack += 2 + Math.floor(Math.random() * 3);
    newDefense += 2 + Math.floor(Math.random() * 3);
    newSpeed += 2 + Math.floor(Math.random() * 3);

    // 新的升级所需经验递增
    expToNext = Math.floor(expToNext * 1.2) + 10;

    // 检查是否触发技能解锁
    const unlockLevel = checkSkillUnlock(oldLevel, newLevel);
    if (unlockLevel) {
      const skill = learnNewSkill(currentSkills, monster.element, unlockLevel);
      if (skill) {
        newSkills.push(skill);
        currentSkills.push(skill);
      }
    }
  }

  // 满级后不再积累经验
  if (newLevel >= 10) {
    newExp = 0;
  }

  // 限制技能数量上限
  const maxSkills = getSkillCountByLevel(newLevel);
  const finalSkills = currentSkills.slice(0, maxSkills);

  return {
    monster: {
      ...monster,
      level: newLevel,
      exp: newExp,
      expToNext,
      maxHp: newHp,
      hp: Math.min(newHp, currentHp),
      attack: newAttack,
      defense: newDefense,
      speed: newSpeed,
      skills: finalSkills,
    },
    leveledUp,
    newSkills: newSkills.length > 0 ? newSkills : undefined,
  };
}

/** 生成奖励描述文本 */
export function generateRewardText(reward: BattleReward): string[] {
  const texts: string[] = [];
  texts.push(`获得 ${reward.exp} 经验值！`);
  texts.push(`获得 💎 ${reward.diamonds} 枚钻石！`);

  if (reward.skillStone) {
    texts.push(`获得技能石！💎`);
  }

  reward.pokeballs.forEach((drop) => {
    const config = POKEBALL_CONFIG[drop.type];
    texts.push(`获得 ${config.emoji} ${config.name} x${drop.count}！`);
  });

  return texts;
}
