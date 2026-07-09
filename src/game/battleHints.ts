import type { Monster, Skill } from '../types';
import { getTypeEffectiveness } from './battleEngine';

export type SkillHintLevel = 'recommended' | 'normal' | 'careful';

export interface SkillHint {
  level: SkillHintLevel;
  label: '推荐' | '普通' | '小心';
  reason: string;
  colorClass: string;
}

export function getSkillHint(skill: Skill, attacker: Monster, defender: Monster): SkillHint {
  const effectiveness = getTypeEffectiveness(skill.element, defender.element);
  const estimatedDamage = Math.max(5, skill.power + (attacker.attack - defender.defense) / 2) * effectiveness;

  if (effectiveness === 0 || skill.accuracy < 80 || effectiveness < 1) {
    return {
      level: 'careful',
      label: '小心',
      reason: effectiveness === 0 ? '可能没有效果' : effectiveness < 1 ? '效果不太好' : '可能打不中',
      colorClass: 'bg-red-500/20 text-red-200 border-red-400/50',
    };
  }

  if (effectiveness > 1 || estimatedDamage >= 28 || skill.accuracy >= 95) {
    return {
      level: 'recommended',
      label: '推荐',
      reason: effectiveness > 1 ? '属性很有效' : '很稳定',
      colorClass: 'bg-green-500/20 text-green-200 border-green-400/50',
    };
  }

  return {
    level: 'normal',
    label: '普通',
    reason: '正常攻击',
    colorClass: 'bg-gray-600/50 text-gray-200 border-gray-500/50',
  };
}

export function createSignatureMoveName(monster: Monster): string {
  const strongest = [...monster.skills].sort((a, b) => b.power - a.power)[0];
  if (strongest?.name) return `${monster.name}的${strongest.name}`;
  return `${monster.name}的伙伴大招`;
}
