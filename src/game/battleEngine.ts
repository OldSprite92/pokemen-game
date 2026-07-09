import type { BattleStatus, BattleStatusType, ElementType, Monster, Skill } from '../types';

// ============ 属性克制表 ============
// 值 > 1 表示克制，值 < 1 表示被克制，值 = 1 表示普通，0 表示无效

export const TYPE_CHART: Record<ElementType, Partial<Record<ElementType, number>>> = {
  fire: {
    grass: 2, ice: 2, bug: 2,
    water: 0.5, ground: 0.5, rock: 0.5,
  },
  water: {
    fire: 2, ground: 2, rock: 2,
    grass: 0.5, electric: 0.5,
  },
  grass: {
    water: 2, ground: 2, rock: 2,
    fire: 0.5, ice: 0.5, bug: 0.5, poison: 0.5, flying: 0.5,
  },
  electric: {
    water: 2, flying: 2,
    ground: 0, grass: 0.5,
  },
  ice: {
    grass: 2, ground: 2, flying: 2,
    water: 0.5, fire: 0.5, fighting: 0.5,
  },
  ground: {
    fire: 2, electric: 2, poison: 2, rock: 2,
    grass: 0.5, water: 0.5, ice: 0.5, flying: 0,
  },
  flying: {
    grass: 2, fighting: 2, bug: 2,
    electric: 0.5, ice: 0.5, rock: 0.5,
  },
  dark: {
    psychic: 2, ghost: 2,
    fighting: 0.5, bug: 0.5,
  },
  psychic: {
    fighting: 2, poison: 2,
    dark: 0, bug: 0.5, ghost: 0.5,
  },
  poison: {
    grass: 2, fairy: 2,
    ground: 0.5, psychic: 0.5,
  },
  fighting: {
    normal: 2, ice: 2, rock: 2, dark: 2, steel: 2,
    flying: 0.5, psychic: 0.5, fairy: 0.5,
  },
  bug: {
    grass: 2, psychic: 2, dark: 2,
    fire: 0.5, fighting: 0.5, flying: 0.5,
  },
  rock: {
    fire: 2, ice: 2, flying: 2, bug: 2,
    water: 0.5, grass: 0.5, fighting: 0.5, ground: 0.5, steel: 0.5,
  },
  ghost: {
    psychic: 2, ghost: 2,
    dark: 0.5,
  },
  dragon: {
    dragon: 2,
    ice: 0.5, fairy: 0,
  },
  steel: {
    ice: 2, rock: 2, fairy: 2,
    fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5,
  },
  fairy: {
    fighting: 2, dragon: 2, dark: 2,
    poison: 0.5, steel: 0.5,
  },
  light: {
    dark: 2, ghost: 2,
    steel: 0.5, fairy: 0.5,
  },
  normal: {},
};

/** 计算属性克制倍率 */
export function getTypeEffectiveness(
  attackerElement: ElementType,
  defenderElement: ElementType
): number {
  return TYPE_CHART[attackerElement]?.[defenderElement] ?? 1;
}

/** 获取克制关系描述 */
export function getEffectivenessLabel(effectiveness: number): string {
  if (effectiveness === 0) return '没有效果';
  if (effectiveness < 1) return '效果不佳';
  if (effectiveness > 1) return '效果拔群';
  return '';
}

// ============ 技能负面状态 ============

export interface BattleStatusConfig {
  type: BattleStatusType;
  name: string;
  emoji: string;
  description: string;
  turns: number;
  chance: number;
  damagePerTurn?: number;
  skipChance?: number;
}

const STATUS_CONFIGS: Record<BattleStatusType, Omit<BattleStatusConfig, 'chance'>> = {
  burn: {
    type: 'burn',
    name: '灼伤',
    emoji: '🔥',
    description: '每回合受到少量火焰伤害',
    turns: 2,
    damagePerTurn: 4,
  },
  poison: {
    type: 'poison',
    name: '中毒',
    emoji: '☠️',
    description: '每回合受到毒素伤害',
    turns: 3,
    damagePerTurn: 5,
  },
  paralysis: {
    type: 'paralysis',
    name: '麻痹',
    emoji: '⚡',
    description: '可能因为发麻而不能行动',
    turns: 2,
    skipChance: 0.35,
  },
  freeze: {
    type: 'freeze',
    name: '冻住',
    emoji: '❄️',
    description: '下一次行动会被冰雪挡住',
    turns: 1,
    skipChance: 1,
  },
  bind: {
    type: 'bind',
    name: '缠绕',
    emoji: '🌿',
    description: '每回合受到藤蔓或丝线伤害',
    turns: 2,
    damagePerTurn: 3,
  },
  fear: {
    type: 'fear',
    name: '害怕',
    emoji: '🌙',
    description: '下一次行动会犹豫一下',
    turns: 1,
    skipChance: 1,
  },
};

const SKILL_STATUS_RULES: Record<string, { type: BattleStatusType; chance: number }> = {
  'fire-2': { type: 'burn', chance: 0.25 },
  'fire-4': { type: 'burn', chance: 0.35 },
  'fire-5': { type: 'burn', chance: 0.30 },
  'fire-6': { type: 'burn', chance: 0.40 },
  'fire-7': { type: 'burn', chance: 0.45 },
  'electric-1': { type: 'paralysis', chance: 0.25 },
  'electric-2': { type: 'paralysis', chance: 0.30 },
  'electric-3': { type: 'paralysis', chance: 0.25 },
  'electric-4': { type: 'paralysis', chance: 0.60 },
  'electric-5': { type: 'paralysis', chance: 0.35 },
  'electric-6': { type: 'paralysis', chance: 0.45 },
  'electric-7': { type: 'paralysis', chance: 0.50 },
  'poison-1': { type: 'poison', chance: 0.35 },
  'poison-2': { type: 'poison', chance: 0.40 },
  'poison-3': { type: 'poison', chance: 0.60 },
  'poison-4': { type: 'poison', chance: 0.45 },
  'poison-5': { type: 'poison', chance: 0.50 },
  'poison-6': { type: 'poison', chance: 0.55 },
  'poison-7': { type: 'poison', chance: 0.65 },
  'grass-1': { type: 'bind', chance: 0.40 },
  'grass-4': { type: 'poison', chance: 0.45 },
  'bug-2': { type: 'bind', chance: 0.40 },
  'bug-3': { type: 'poison', chance: 0.35 },
  'ice-1': { type: 'freeze', chance: 0.20 },
  'ice-3': { type: 'freeze', chance: 0.30 },
  'ice-4': { type: 'freeze', chance: 0.25 },
  'ice-5': { type: 'freeze', chance: 0.35 },
  'ice-6': { type: 'freeze', chance: 0.40 },
  'ice-7': { type: 'freeze', chance: 0.45 },
  'psychic-3': { type: 'fear', chance: 0.55 },
  'ghost-4': { type: 'fear', chance: 0.60 },
  'dark-4': { type: 'fear', chance: 0.55 },
};

export function getBattleStatusConfig(type: BattleStatusType) {
  return STATUS_CONFIGS[type];
}

export function getSkillStatusConfig(skill: Skill): BattleStatusConfig | null {
  const rule = SKILL_STATUS_RULES[skill.id];
  if (!rule) return null;
  return { ...STATUS_CONFIGS[rule.type], chance: rule.chance };
}

export function rollSkillStatus(skill: Skill): BattleStatus | null {
  const config = getSkillStatusConfig(skill);
  if (!config || Math.random() >= config.chance) return null;
  return {
    type: config.type,
    turnsRemaining: config.turns,
    damagePerTurn: config.damagePerTurn,
    skipChance: config.skipChance,
    sourceSkillName: skill.name,
  };
}

// ============ 伤害计算 ============

export interface DamageResult {
  damage: number;
  effectiveness: number;
  effectivenessLabel: string;
  isCritical: boolean;
  isMiss: boolean;
  logMessage: string;
}

/** 计算伤害
 * 公式：基础伤害 = 技能威力 + (攻击方攻击 - 防御方防御) / 2
 * 然后 × 属性克制倍率 × 随机浮动(0.85~1.15)
 * 暴击率 1/16，暴击伤害 × 1.5
 * 命中率判定
 */
export function calculateDamage(
  attacker: Monster,
  defender: Monster,
  skill: Skill
): DamageResult {
  // 命中率判定
  const hitRoll = Math.random() * 100;
  if (hitRoll > skill.accuracy) {
    return {
      damage: 0,
      effectiveness: 1,
      effectivenessLabel: '',
      isCritical: false,
      isMiss: true,
      logMessage: `${attacker.name} 使用了 ${skill.name}，但是没有打中！`,
    };
  }

  // 基础伤害
  let baseDamage = skill.power + (attacker.attack - defender.defense) / 2;
  baseDamage = Math.max(5, baseDamage); // 最低5点伤害

  // 属性克制
  const effectiveness = getTypeEffectiveness(skill.element, defender.element);
  baseDamage *= effectiveness;

  // 随机浮动 0.85 ~ 1.15
  const randomFactor = 0.85 + Math.random() * 0.3;
  baseDamage *= randomFactor;

  // 暴击判定 (1/16 概率)
  const isCritical = Math.random() < 1 / 16;
  if (isCritical) {
    baseDamage *= 1.5;
  }

  // 最终伤害取整，限制在 10-30 范围（计划要求）
  let finalDamage = Math.round(baseDamage);
  finalDamage = Math.max(10, Math.min(30, finalDamage));

  const effectivenessLabel = getEffectivenessLabel(effectiveness);
  let logMessage = `${attacker.name} 使用了 ${skill.name}！`;

  if (effectivenessLabel) {
    logMessage += ` ${effectivenessLabel}！`;
  }
  if (isCritical) {
    logMessage += ' 暴击！';
  }
  logMessage += ` 造成了 ${finalDamage} 点伤害！`;

  if (effectiveness === 0) {
    finalDamage = 0;
    logMessage = `${attacker.name} 使用了 ${skill.name}，但是对 ${defender.element} 属性的宝可梦没有效果！`;
  }

  return {
    damage: finalDamage,
    effectiveness,
    effectivenessLabel,
    isCritical,
    isMiss: false,
    logMessage,
  };
}

// ============ 先手判定 ============

/** 根据速度决定先手方 */
export function determineFirstTurn(player: Monster, enemy: Monster): 'player' | 'enemy' {
  if (player.speed > enemy.speed) return 'player';
  if (enemy.speed > player.speed) return 'enemy';
  // 速度相同随机
  return Math.random() < 0.5 ? 'player' : 'enemy';
}

// ============ 经验值与升级 ============

/** 战斗胜利获得的经验值 */
export function calculateExpGain(enemy: Monster): number {
  // 基础经验 = 敌人等级 × 10
  return enemy.level * 10;
}

/** 升级所需经验 */
export function getExpToNextLevel(level: number): number {
  return level * 20;
}

/** 升级提升属性 */
export function levelUp(monster: Monster): Monster {
  const newLevel = monster.level + 1;
  return {
    ...monster,
    level: newLevel,
    exp: 0,
    hp: Math.min(100, monster.hp + 3),
    attack: Math.min(100, monster.attack + 2),
    defense: Math.min(100, monster.defense + 2),
    speed: Math.min(100, monster.speed + 2),
  };
}
