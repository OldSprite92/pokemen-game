import { describe, it, expect } from 'vitest';
import {
  getTypeEffectiveness,
  getEffectivenessLabel,
  calculateDamage,
  determineFirstTurn,
  calculateExpGain,
  getExpToNextLevel,
  levelUp,
} from '../game/battleEngine';
import type { Monster, Skill } from '../types';

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

describe('战斗引擎边界测试', () => {
  describe('属性克制边界', () => {
    it('格斗属性克制普通属性', () => {
      expect(getTypeEffectiveness('fighting', 'normal')).toBe(2);
    });

    it('除幽灵外，大部分属性对普通属性无克制', () => {
      const elements: Monster['element'][] = ['fire', 'water', 'grass', 'electric', 'ice', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'dragon', 'dark', 'steel', 'fairy', 'light'];
      elements.forEach((el) => {
        const effectiveness = getTypeEffectiveness(el, 'normal');
        expect(effectiveness).toBe(1);
      });
    });

    it('普通属性对幽灵无效，对其他属性无克制', () => {
      const elements: Monster['element'][] = ['fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'dragon', 'dark', 'steel', 'fairy', 'light'];
      elements.forEach((el) => {
        expect(getTypeEffectiveness('normal', el)).toBe(1);
      });
      expect(getTypeEffectiveness('normal', 'ghost')).toBe(0);
    });

    it('龙属性只克制龙属性', () => {
      expect(getTypeEffectiveness('dragon', 'dragon')).toBe(2);
      expect(getTypeEffectiveness('dragon', 'fire')).toBe(1);
      expect(getTypeEffectiveness('dragon', 'water')).toBe(1);
    });

    it('妖精属性免疫龙属性', () => {
      expect(getTypeEffectiveness('dragon', 'fairy')).toBe(0);
    });
  });

  describe('伤害计算边界', () => {
    it('防御远高于攻击时仍有最低伤害', () => {
      const attacker = createTestMonster({ attack: 10 });
      const defender = createTestMonster({ defense: 100 });
      const skill = createTestSkill();

      const result = calculateDamage(attacker, defender, skill);
      if (!result.isMiss) {
        expect(result.damage).toBeGreaterThanOrEqual(4);
      }
    });

    it('攻击远高于防御时伤害被上限限制', () => {
      const attacker = createTestMonster({ attack: 200 });
      const defender = createTestMonster({ defense: 10 });
      const skill = createTestSkill({ power: 50 });

      const result = calculateDamage(attacker, defender, skill);
      if (!result.isMiss) {
        expect(result.damage).toBeLessThanOrEqual(36);
      }
    });

    it('0威力技能造成最低伤害', () => {
      const attacker = createTestMonster();
      const defender = createTestMonster();
      const skill = createTestSkill({ power: 0 });

      const result = calculateDamage(attacker, defender, skill);
      if (!result.isMiss) {
        expect(result.damage).toBeGreaterThanOrEqual(4);
      }
    });

    it('100%命中率必定命中', () => {
      const attacker = createTestMonster();
      const defender = createTestMonster();
      const skill = createTestSkill({ accuracy: 100 });

      for (let i = 0; i < 50; i++) {
        const result = calculateDamage(attacker, defender, skill);
        expect(result.isMiss).toBe(false);
      }
    });

    it('0%命中率必定miss', () => {
      const attacker = createTestMonster();
      const defender = createTestMonster();
      const skill = createTestSkill({ accuracy: 0 });

      const result = calculateDamage(attacker, defender, skill);
      expect(result.isMiss).toBe(true);
      expect(result.damage).toBe(0);
    });

    it('无效属性攻击造成0伤害', () => {
      const attacker = createTestMonster({ element: 'electric' });
      const defender = createTestMonster({ element: 'ground' });
      const skill = createTestSkill({ element: 'electric' });

      const result = calculateDamage(attacker, defender, skill);
      expect(result.damage).toBe(0);
      expect(result.effectiveness).toBe(0);
    });
  });

  describe('先手判定边界', () => {
    it('速度相同时可能玩家或敌人先手', () => {
      const player = createTestMonster({ speed: 50 });
      const enemy = createTestMonster({ speed: 50 });

      const results = Array.from({ length: 50 }, () => determineFirstTurn(player, enemy));
      expect(results).toContain('player');
      expect(results).toContain('enemy');
    });

    it('玩家速度为0时敌人先手', () => {
      const player = createTestMonster({ speed: 0 });
      const enemy = createTestMonster({ speed: 1 });
      expect(determineFirstTurn(player, enemy)).toBe('enemy');
    });
  });

  describe('经验值与升级边界', () => {
    it('1级升级需要20经验', () => {
      expect(getExpToNextLevel(1)).toBe(20);
    });

    it('高等级需要更多经验', () => {
      expect(getExpToNextLevel(10)).toBeGreaterThan(getExpToNextLevel(1));
    });

    it('升级后属性不超过100', () => {
      const monster = createTestMonster({ hp: 99, attack: 99, defense: 99, speed: 99 });
      const leveled = levelUp(monster);
      expect(leveled.hp).toBeLessThanOrEqual(100);
      expect(leveled.attack).toBeLessThanOrEqual(100);
      expect(leveled.defense).toBeLessThanOrEqual(100);
      expect(leveled.speed).toBeLessThanOrEqual(100);
    });

    it('击败10级敌人获得100经验', () => {
      const enemy = createTestMonster({ level: 10 });
      expect(calculateExpGain(enemy)).toBe(100);
    });
  });
});
