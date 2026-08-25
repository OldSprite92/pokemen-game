import { describe, it, expect } from 'vitest';
import {
  getTypeEffectiveness,
  getMonsterTypeEffectiveness,
  getEffectivenessLabel,
  calculateDamage,
  determineFirstTurn,
  calculateExpGain,
  getExpToNextLevel,
  levelUp,
  getSkillStatusConfig,
  getTypeMatchupHint,
  getElementName,
} from '../game/battleEngine';
import type { Monster, Skill } from '../types';

// 辅助函数：创建测试用宝可梦
function createTestMonster(overrides: Partial<Monster> = {}): Monster {
  return {
    name: '测试宝可梦',
    element: 'fire',
    skills: [],
    avatar: 'dragon',
    hp: 80,
    attack: 70,
    defense: 60,
    speed: 75,
    level: 1,
    exp: 0,
    createdBy: 'user',
    createdAt: new Date(),
    ...overrides,
  };
}

// 辅助函数：创建测试用技能
function createTestSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: 'test-skill',
    name: '测试技能',
    element: 'fire',
    power: 20,
    accuracy: 100,
    description: '测试用技能',
    ...overrides,
  };
}

describe('属性克制表', () => {
  it('火克草', () => {
    expect(getTypeEffectiveness('fire', 'grass')).toBe(2);
  });

  it('水克火', () => {
    expect(getTypeEffectiveness('water', 'fire')).toBe(2);
  });

  it('火被水克', () => {
    expect(getTypeEffectiveness('fire', 'water')).toBe(0.5);
  });

  it('电对地面无效', () => {
    expect(getTypeEffectiveness('electric', 'ground')).toBe(0);
  });

  it('普通属性无克制关系', () => {
    expect(getTypeEffectiveness('normal', 'fire')).toBe(1);
  });

  it('光属性有自己的净化克制关系', () => {
    expect(getTypeEffectiveness('light', 'dark')).toBe(2);
    expect(getTypeEffectiveness('light', 'ghost')).toBe(2);
    expect(getTypeEffectiveness('light', 'poison')).toBe(2);
    expect(getTypeEffectiveness('light', 'steel')).toBe(0.5);
  });

  it('补全了图表中的免疫关系', () => {
    expect(getTypeEffectiveness('normal', 'ghost')).toBe(0);
    expect(getTypeEffectiveness('fighting', 'ghost')).toBe(0);
    expect(getTypeEffectiveness('poison', 'steel')).toBe(0);
  });

  it('双属性会共同参与伤害倍率与免疫判定', () => {
    expect(getMonsterTypeEffectiveness('water', { element: 'fire', elements: ['fire', 'ground'] })).toBe(4);
    expect(getMonsterTypeEffectiveness('electric', { element: 'water', elements: ['water', 'ground'] })).toBe(0);
  });

  it('克制提示会用孩子能听懂的短故事说明原因', () => {
    expect(getTypeMatchupHint('light', 'dark')).toContain('晨光');
    expect(getTypeMatchupHint('water', 'fire')).toContain('水流');
    expect(getTypeMatchupHint('electric', 'ground')).toContain('电流引走');
  });

  it('所有面向玩家的属性名称均为中文', () => {
    expect(getElementName('ground')).toBe('地面');
    expect(getElementName('electric')).toBe('电');
    expect(getTypeMatchupHint('electric', 'ground')).not.toContain('ground');
  });

  it('克制关系描述', () => {
    expect(getEffectivenessLabel(2)).toBe('效果拔群');
    expect(getEffectivenessLabel(0.5)).toBe('效果不佳');
    expect(getEffectivenessLabel(0)).toBe('没有效果');
    expect(getEffectivenessLabel(1)).toBe('');
  });
});

describe('伤害计算', () => {
  it('基础伤害计算', () => {
    const attacker = createTestMonster({ attack: 80, name: '攻击者' });
    const defender = createTestMonster({ defense: 60, element: 'grass', name: '防御者' });
    const skill = createTestSkill({ power: 20, accuracy: 100 });

    const result = calculateDamage(attacker, defender, skill);

    // 火克草，应该有伤害
    expect(result.damage).toBeGreaterThan(0);
    expect(result.isMiss).toBe(false);
    expect(result.effectiveness).toBe(2);
    expect(result.effectivenessLabel).toBe('效果拔群');
  });

  it('命中率判定 - 未命中', () => {
    const attacker = createTestMonster();
    const defender = createTestMonster();
    const skill = createTestSkill({ accuracy: 0 }); // 0命中率必定miss

    const result = calculateDamage(attacker, defender, skill);

    expect(result.isMiss).toBe(true);
    expect(result.damage).toBe(0);
  });

  it('无效属性攻击', () => {
    const attacker = createTestMonster({ element: 'electric' });
    const defender = createTestMonster({ element: 'ground' });
    const skill = createTestSkill({ element: 'electric' });

    const result = calculateDamage(attacker, defender, skill);

    expect(result.damage).toBe(0);
    expect(result.effectiveness).toBe(0);
    expect(result.effectivenessLabel).toBe('没有效果');
    expect(result.logMessage).toContain('电流引走');
    expect(result.logMessage).not.toContain('ground');
  });

  it('双属性目标的弱点与免疫会影响实际伤害', () => {
    const attacker = createTestMonster({ name: '攻击者' });
    const waterSkill = createTestSkill({ element: 'water', accuracy: 100 });
    const electricSkill = createTestSkill({ element: 'electric', accuracy: 100 });
    const fireGround = createTestMonster({ element: 'fire', elements: ['fire', 'ground'], defense: 60 });
    const waterGround = createTestMonster({ element: 'water', elements: ['water', 'ground'], defense: 60 });

    expect(calculateDamage(attacker, fireGround, waterSkill).effectiveness).toBe(4);
    expect(calculateDamage(attacker, waterGround, electricSkill).damage).toBe(0);
  });

  it('伤害范围在4-36之间', () => {
    const attacker = createTestMonster({ attack: 100 });
    const defender = createTestMonster({ defense: 30 });
    const skill = createTestSkill({ power: 30 });

    // 多次测试确保范围正确
    for (let i = 0; i < 20; i++) {
      const result = calculateDamage(attacker, defender, skill);
      if (!result.isMiss) {
        expect(result.damage).toBeGreaterThanOrEqual(4);
        expect(result.damage).toBeLessThanOrEqual(36);
      }
    }
  });
});

describe('先手判定', () => {
  it('速度高的先手', () => {
    const fast = createTestMonster({ speed: 100 });
    const slow = createTestMonster({ speed: 50 });

    expect(determineFirstTurn(fast, slow)).toBe('player');
  });

  it('速度低的被先手', () => {
    const fast = createTestMonster({ speed: 100 });
    const slow = createTestMonster({ speed: 50 });

    expect(determineFirstTurn(slow, fast)).toBe('enemy');
  });
});

describe('经验值与升级', () => {
  it('经验值计算', () => {
    const enemy = createTestMonster({ level: 5 });
    expect(calculateExpGain(enemy)).toBe(50); // 5 * 10
  });

  it('升级所需经验', () => {
    expect(getExpToNextLevel(1)).toBe(20);
    expect(getExpToNextLevel(5)).toBe(100);
  });

  it('升级后属性提升', () => {
    const monster = createTestMonster({ hp: 80, attack: 70, defense: 60, speed: 75, level: 1 });
    const leveled = levelUp(monster);

    expect(leveled.level).toBe(2);
    expect(leveled.exp).toBe(0);
    expect(leveled.hp).toBeGreaterThan(monster.hp);
    expect(leveled.attack).toBeGreaterThan(monster.attack);
    expect(leveled.defense).toBeGreaterThan(monster.defense);
    expect(leveled.speed).toBeGreaterThan(monster.speed);
  });
});

describe('技能负面状态配置', () => {
  it('电击技能可能造成麻痹', () => {
    const skill = createTestSkill({ id: 'electric-1', name: '电击', element: 'electric' });
    const status = getSkillStatusConfig(skill);

    expect(status?.type).toBe('paralysis');
    expect(status?.turns).toBe(2);
    expect(status?.skipChance).toBe(0.35);
  });

  it('剧毒技能可能造成持续中毒伤害', () => {
    const skill = createTestSkill({ id: 'poison-3', name: '剧毒', element: 'poison' });
    const status = getSkillStatusConfig(skill);

    expect(status?.type).toBe('poison');
    expect(status?.turns).toBe(3);
    expect(status?.damagePerTurn).toBe(6);
  });

  it('普通撞击没有负面状态', () => {
    const skill = createTestSkill({ id: 'normal-1', name: '撞击', element: 'normal' });
    expect(getSkillStatusConfig(skill)).toBeNull();
  });

  it('自创的毒属性技能也会获得中毒效果', () => {
    const skill = createTestSkill({ id: 'skill-喷射毒液', name: '喷射毒液', element: 'poison' });
    const status = getSkillStatusConfig(skill);

    expect(status?.type).toBe('poison');
    expect(status?.chance).toBe(0.60);
    expect(status?.damagePerTurn).toBe(6);
  });

  it('自创的电属性技能也会获得麻痹效果', () => {
    const skill = createTestSkill({ id: 'skill-闪电麻痹', name: '闪电麻痹', element: 'electric' });
    const status = getSkillStatusConfig(skill);

    expect(status?.type).toBe('paralysis');
    expect(status?.chance).toBe(0.50);
  });
});
