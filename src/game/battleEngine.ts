import type { BattleStatus, BattleStatusType, ElementType, Monster, Skill } from '../types';
import { getMonsterElements } from './monsterElements';

// ============ 属性克制表 ============
// 值 > 1 表示克制，值 < 1 表示被克制，值 = 1 表示普通，0 表示无效

export const TYPE_CHART: Record<ElementType, Partial<Record<ElementType, number>>> = {
  normal: {
    ghost: 0,
  },
  fire: {
    grass: 2, ice: 2, bug: 2, steel: 2,
    water: 0.5, rock: 0.5, dragon: 0.5,
  },
  water: {
    fire: 2, ground: 2, rock: 2,
    grass: 0.5, electric: 0.5, dragon: 0.5,
  },
  grass: {
    water: 2, ground: 2, rock: 2,
    fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, ice: 0.5, dragon: 0.5, steel: 0.5,
  },
  electric: {
    water: 2, flying: 2,
    grass: 0.5, dragon: 0.5, ground: 0,
  },
  ice: {
    grass: 2, ground: 2, flying: 2, dragon: 2,
    fire: 0.5, water: 0.5, ice: 0.5, steel: 0.5,
  },
  fighting: {
    normal: 2, ice: 2, rock: 2, dark: 2, steel: 2,
    poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, fairy: 0.5, ghost: 0,
  },
  poison: {
    grass: 2, fairy: 2,
    poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0,
  },
  ground: {
    fire: 2, electric: 2, poison: 2, rock: 2, steel: 2,
    grass: 0.5, bug: 0.5, flying: 0,
  },
  flying: {
    grass: 2, fighting: 2, bug: 2,
    electric: 0.5, rock: 0.5, steel: 0.5,
  },
  psychic: {
    fighting: 2, poison: 2,
    psychic: 0.5, steel: 0.5, dark: 0,
  },
  bug: {
    grass: 2, psychic: 2, dark: 2,
    fire: 0.5, fighting: 0.5, poison: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5,
  },
  rock: {
    fire: 2, ice: 2, flying: 2, bug: 2,
    fighting: 0.5, ground: 0.5, steel: 0.5,
  },
  ghost: {
    psychic: 2, ghost: 2,
    dark: 0.5, normal: 0,
  },
  dragon: {
    dragon: 2,
    steel: 0.5, fairy: 0,
  },
  dark: {
    psychic: 2, ghost: 2,
    fighting: 0.5, dark: 0.5, fairy: 0.5, light: 0.5,
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
    // The original attribute: dawn light dispels shadows and purifies poison,
    // while mirrors, crystal magic, and deep caves scatter its beam.
    dark: 2, ghost: 2, poison: 2,
    rock: 0.5, steel: 0.5, fairy: 0.5,
  },
};

const ELEMENT_NAMES: Record<ElementType, string> = {
  normal: '普通', fire: '火', water: '水', grass: '草', electric: '电', ice: '冰',
  fighting: '格斗', poison: '毒', ground: '地面', flying: '飞行', psychic: '超能',
  bug: '虫', rock: '岩石', ghost: '幽灵', dragon: '龙', dark: '恶', steel: '钢',
  fairy: '妖精', light: '光',
};

/** Returns the player-facing Chinese name for an element. Never expose internal element ids in UI text. */
export function getElementName(element: ElementType): string {
  return ELEMENT_NAMES[element];
}

const TYPE_STORY_HINTS: Partial<Record<`${ElementType}:${ElementType}`, string>> = {
  'fire:grass': '火焰能把草叶烧成暖暖的灰烬',
  'water:fire': '水流能把火焰变成一团白烟',
  'grass:water': '草根会悄悄吸走水流的力量',
  'electric:water': '水面会把电光传得更远',
  'ice:dragon': '冰霜能让飞腾的龙翼变得沉重',
  'fighting:normal': '认真练出的拳头最能打破普通防守',
  'poison:fairy': '毒雾会弄乱妖精的魔法花粉',
  'ground:electric': '大地会悄悄把电流引走',
  'electric:ground': '大地会悄悄把电流引走',
  'flying:bug': '高空的风能吹散小虫的队伍',
  'psychic:fighting': '念力能先一步猜到拳头的方向',
  'bug:dark': '小虫的亮翅膀会照出黑暗里的藏身处',
  'rock:flying': '落石会堵住天空中的飞行路线',
  'ghost:psychic': '幽灵最爱从念头的缝隙里冒出来',
  'dragon:dragon': '只有龙的咆哮听得懂另一条龙的弱点',
  'dark:ghost': '黑暗能吞掉飘忽的影子',
  'steel:ice': '钢铁的重量能砸碎脆冰',
  'fairy:dragon': '妖精的星光会安抚暴躁的龙息',
  'light:dark': '晨光一照，黑暗就没有地方躲了',
  'light:ghost': '暖光会照亮幽灵藏起来的脚印',
  'light:poison': '净化之光能赶走黏糊糊的毒雾',
};

/** 计算属性克制倍率 */
export function getTypeEffectiveness(
  attackerElement: ElementType,
  defenderElement: ElementType
): number {
  return TYPE_CHART[attackerElement]?.[defenderElement] ?? 1;
}

/**
 * Calculates an attack against every saved defender attribute. This keeps
 * dual-attribute battle rules in sync with the badges shown in the UI: a
 * resistance on either attribute matters, and a single immunity blocks the
 * move completely.
 */
export function getMonsterTypeEffectiveness(attackerElement: ElementType, defender: Pick<Monster, 'element' | 'elements'>): number {
  return getMonsterElements(defender)
    .map((element) => getTypeEffectiveness(attackerElement, element))
    .reduce((total, multiplier) => total * multiplier, 1);
}

export function getMonsterTypeMatchupHint(attackerElement: ElementType, defender: Pick<Monster, 'element' | 'elements'>): string {
  const elements = getMonsterElements(defender);
  const effectiveness = getMonsterTypeEffectiveness(attackerElement, defender);
  if (elements.length === 1) return getTypeMatchupHint(attackerElement, elements[0]);

  const defenderName = elements.map(getElementName).join('和');
  const attackerName = getElementName(attackerElement);
  if (effectiveness === 0) return `${defenderName}属性中有一种完全挡住了${attackerName}属性`;
  if (effectiveness > 1) return `${attackerName}属性同时压制了${defenderName}属性`;
  if (effectiveness < 1) return `${defenderName}属性合起来不太怕${attackerName}属性`;
  return `${attackerName}属性对${defenderName}属性的力量旗鼓相当`;
}

/** 获取克制关系描述 */
export function getEffectivenessLabel(effectiveness: number): string {
  if (effectiveness === 0) return '没有效果';
  if (effectiveness < 1) return '效果不佳';
  if (effectiveness > 1) return '效果拔群';
  return '';
}

/** A short, child-friendly explanation shown before choosing a move. */
export function getTypeMatchupHint(
  attackerElement: ElementType,
  defenderElement: ElementType
): string {
  const effectiveness = getTypeEffectiveness(attackerElement, defenderElement);
  const attackerName = getElementName(attackerElement);
  const defenderName = getElementName(defenderElement);

  if (effectiveness === 2) {
    return TYPE_STORY_HINTS[`${attackerElement}:${defenderElement}`]
      ?? `${attackerName}属性正好能克制${defenderName}属性`;
  }
  if (effectiveness === 0) {
    return TYPE_STORY_HINTS[`${attackerElement}:${defenderElement}`]
      ?? `${defenderName}属性完全挡住了这招`;
  }
  if (effectiveness < 1) return `${defenderName}属性不太怕${attackerName}属性`;
  return '属性力量旗鼓相当';
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
    turns: 3,
    damagePerTurn: 4,
  },
  poison: {
    type: 'poison',
    name: '中毒',
    emoji: '☠️',
    description: '每回合受到毒素伤害',
    turns: 3,
    damagePerTurn: 6,
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

// 玩家自创技能与早期伙伴技能的 id 不遵循技能池编号（例如 skill-闪电麻痹）。
// 这些招式过去不会有任何状态效果，所以改为按属性提供稳定的保底规则。
const ELEMENT_STATUS_RULES: Partial<Record<Skill['element'], { type: BattleStatusType; chance: number }>> = {
  fire: { type: 'burn', chance: 0.45 },
  electric: { type: 'paralysis', chance: 0.50 },
  poison: { type: 'poison', chance: 0.60 },
  ice: { type: 'freeze', chance: 0.40 },
  grass: { type: 'bind', chance: 0.45 },
  bug: { type: 'bind', chance: 0.40 },
  psychic: { type: 'fear', chance: 0.45 },
  ghost: { type: 'fear', chance: 0.50 },
  dark: { type: 'fear', chance: 0.45 },
};

export function getBattleStatusConfig(type: BattleStatusType) {
  return STATUS_CONFIGS[type];
}

export function getSkillStatusConfig(skill: Skill): BattleStatusConfig | null {
  const rule = SKILL_STATUS_RULES[skill.id] ?? ELEMENT_STATUS_RULES[skill.element];
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
 * 然后 × 属性克制倍率 × 随机浮动(0.9~1.1)
 * 暴击率 1/16，暴击伤害 × 1.35
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
  baseDamage = Math.max(4, baseDamage); // 非免疫攻击最低4点伤害

  // 属性克制
  const effectiveness = getMonsterTypeEffectiveness(skill.element, defender);
  baseDamage *= effectiveness;

  // 随机浮动 0.9 ~ 1.1，减少“选对了却差很多”的挫败感
  const randomFactor = 0.9 + Math.random() * 0.2;
  baseDamage *= randomFactor;

  // 暴击判定 (1/16 概率)
  const isCritical = Math.random() < 1 / 16;
  if (isCritical) {
    baseDamage *= 1.35;
  }

  // 最终伤害取整。较低下限让效果不佳的攻击和普通攻击明显区分，
  // 上限避免一次攻击直接结束满血的普通战斗。
  let finalDamage = Math.round(baseDamage);
  finalDamage = Math.max(4, Math.min(36, finalDamage));

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
    logMessage = `${attacker.name} 使用了 ${skill.name}，但是${getMonsterTypeMatchupHint(skill.element, defender)}！`;
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
