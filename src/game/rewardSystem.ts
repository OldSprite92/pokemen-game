import type { Monster, ElementType, Skill, PokeBallType } from '../types';
import { POKEBALL_CONFIG } from './catchSystem';
import { learnNewSkill, checkSkillUnlock, getSkillCountByLevel } from './skillPool';

/** 战斗胜利奖励结果 */
export interface BattleReward {
  exp: number;
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
    'fire', 'water', 'grass', 'electric', 'ice',
    'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'dark',
  ];
  const element = elements[Math.floor(Math.random() * elements.length)];
  return { element };
}

/** 随机生成精灵球掉落 */
export function generatePokeballDrops(): { type: PokeBallType; count: number }[] {
  const totalCount = 1 + Math.floor(Math.random() * 3); // 1-3个
  const drops: { type: PokeBallType; count: number }[] = [];

  const ballTypes: PokeBallType[] = ['normal', 'normal', 'normal', 'great', 'great', 'ultra', 'master'];
  const weights = [70, 70, 70, 20, 20, 8, 2]; // 概率权重

  for (let i = 0; i < totalCount; i++) {
    const roll = Math.random() * 100;
    let cumulative = 0;
    let selected: PokeBallType = 'normal';

    for (let j = 0; j < ballTypes.length; j++) {
      cumulative += weights[j];
      if (roll < cumulative) {
        selected = ballTypes[j];
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
export function generateBattleReward(enemy: Monster): BattleReward {
  const exp = calculateExpReward(enemy);
  const skillStoneResult = generateSkillStone();
  const pokeballs = generatePokeballDrops();

  return {
    exp,
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
    ice: ['冰冻光束', '暴风雪', '冰锥', '霜冻'],
    fighting: ['空手劈', '飞踢', '气功波', '重拳'],
    poison: ['毒液', '腐蚀气体', '剧毒', '酸雨'],
    ground: ['地震', '沙暴', '岩石投掷', '地裂'],
    flying: ['翅膀攻击', '空气斩', '旋风', '俯冲'],
    psychic: ['念力', '精神强念', '预知未来', '催眠术'],
    bug: ['虫咬', '丝线缠绕', '毒针', '鳞粉'],
    dark: ['暗影爪', '恶之波动', '偷袭', '欺诈'],
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
  let newHp = monster.maxHp || monster.hp;
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
    newHp += 3 + Math.floor(Math.random() * 3);
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
      hp: newHp, // 升级回满血
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

  if (reward.skillStone) {
    texts.push(`获得技能石！💎`);
  }

  reward.pokeballs.forEach((drop) => {
    const config = POKEBALL_CONFIG[drop.type];
    texts.push(`获得 ${config.emoji} ${config.name} x${drop.count}！`);
  });

  return texts;
}
