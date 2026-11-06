import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateExpReward,
  generateSkillStone,
  generatePokeballDrops,
  generateBattleReward,
  generateRandomSkill,
  applyExp,
  generateRewardText,
  POKEBALL_DROP_RATES,
} from '../game/rewardSystem';
import type { Monster } from '../types';

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
    level: 5,
    exp: 0,
    createdBy: 'system',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('奖励系统', () => {
  describe('经验值奖励', () => {
    it('基础经验值 = 敌人等级 × 10', () => {
      const enemy = createTestMonster({ level: 5 });
      const exp = calculateExpReward(enemy);
      expect(exp).toBeGreaterThanOrEqual(50);
      expect(exp).toBeLessThanOrEqual(55);
    });

    it('高等级敌人给更多经验', () => {
      const lowLevel = createTestMonster({ level: 1 });
      const highLevel = createTestMonster({ level: 10 });
      expect(calculateExpReward(highLevel)).toBeGreaterThan(calculateExpReward(lowLevel));
    });
  });

  describe('技能石生成', () => {
    it('可能生成技能石或返回null', () => {
      const results = Array.from({ length: 100 }, () => generateSkillStone());
      const hasStone = results.some((r) => r !== null);
      const hasNull = results.some((r) => r === null);
      expect(hasStone).toBe(true);
      expect(hasNull).toBe(true);
    });

    it('生成的技能石有有效属性', () => {
      const stone = generateSkillStone();
      if (stone) {
        expect(stone.element).toBeDefined();
      }
    });
  });

  describe('精灵球掉落', () => {
    it('掉落1-3个精灵球', () => {
      const drops = generatePokeballDrops();
      const totalCount = drops.reduce((sum, d) => sum + d.count, 0);
      expect(totalCount).toBeGreaterThanOrEqual(1);
      expect(totalCount).toBeLessThanOrEqual(3);
    });

    it('掉落的精灵球类型有效', () => {
      const drops = generatePokeballDrops();
      const validTypes = ['normal', 'great', 'ultra', 'master', 'legend', 'transcend'];
      drops.forEach((drop) => {
        expect(validTypes).toContain(drop.type);
      });
    });

    it('每档难度的掉落权重总和都是100%', () => {
      Object.values(POKEBALL_DROP_RATES).forEach((rates) => {
        expect(Object.values(rates).reduce((sum, rate) => sum + rate, 0)).toBe(100);
      });
    });

    it('地图越难，普通球越少、稀有球越多', () => {
      expect(POKEBALL_DROP_RATES.easy.normal).toBeGreaterThan(POKEBALL_DROP_RATES.hard.normal);
      expect(POKEBALL_DROP_RATES.hard.normal).toBeGreaterThan(POKEBALL_DROP_RATES.hell.normal);
      expect(POKEBALL_DROP_RATES.easy.master).toBeLessThan(POKEBALL_DROP_RATES.hard.master);
      expect(POKEBALL_DROP_RATES.hard.master).toBeLessThan(POKEBALL_DROP_RATES.hell.master);
      expect(POKEBALL_DROP_RATES.easy.legend).toBeLessThan(POKEBALL_DROP_RATES.hard.legend);
      expect(POKEBALL_DROP_RATES.hard.legend).toBeLessThan(POKEBALL_DROP_RATES.hell.legend);
      expect(POKEBALL_DROP_RATES.easy.transcend).toBeLessThan(POKEBALL_DROP_RATES.hard.transcend);
      expect(POKEBALL_DROP_RATES.hard.transcend).toBeLessThan(POKEBALL_DROP_RATES.hell.transcend);
    });

    it('按难度边界能抽到对应的最高稀有球', () => {
      const easy = generatePokeballDrops('easy', (() => {
        const values = [0, 0.999];
        return () => values.shift() ?? 0;
      })());
      const hard = generatePokeballDrops('hard', (() => {
        const values = [0, 0.999];
        return () => values.shift() ?? 0;
      })());
      const hell = generatePokeballDrops('hell', (() => {
        const values = [0, 0.999];
        return () => values.shift() ?? 0;
      })());

      expect(easy).toEqual([{ type: 'master', count: 1 }]);
      expect(hard).toEqual([{ type: 'transcend', count: 1 }]);
      expect(hell).toEqual([{ type: 'transcend', count: 1 }]);
    });

    it('地狱难度同一次奖励可以合并重复类型数量', () => {
      const values = [0.99, 0.995, 0.995, 0.995];
      const drops = generatePokeballDrops('hell', () => values.shift() ?? 0);
      expect(drops).toEqual([{ type: 'transcend', count: 3 }]);
    });
  });

  describe('完整战斗奖励', () => {
    it('包含所有奖励字段', () => {
      const enemy = createTestMonster({ level: 3 });
      const reward = generateBattleReward(enemy);

      expect(reward.exp).toBeGreaterThan(0);
      expect(reward.diamonds).toBeGreaterThan(0);
      expect(typeof reward.skillStone).toBe('boolean');
      expect(Array.isArray(reward.pokeballs)).toBe(true);
    });
  });

  describe('随机技能生成', () => {
    it('生成的技能有正确属性', () => {
      const skill = generateRandomSkill('fire');
      expect(skill.element).toBe('fire');
      expect(skill.power).toBeGreaterThanOrEqual(15);
      expect(skill.power).toBeLessThanOrEqual(30);
      expect(skill.accuracy).toBeGreaterThanOrEqual(90);
      expect(skill.accuracy).toBeLessThanOrEqual(100);
    });

    it('不同属性生成不同技能名称', () => {
      const fireSkill = generateRandomSkill('fire');
      const waterSkill = generateRandomSkill('water');
      expect(fireSkill.name).not.toBe(waterSkill.name);
    });
  });

  describe('应用经验值', () => {
    it('未满级时增加经验', () => {
      const monster = createTestMonster({ level: 1, exp: 0, expToNext: 20 });
      const result = applyExp(monster, 10);
      expect(result.monster.exp).toBe(10);
      expect(result.leveledUp).toBe(false);
    });

    it('获得经验不会悄悄回满受伤伙伴', () => {
      const monster = createTestMonster({ level: 1, hp: 21, maxHp: 50, exp: 0, expToNext: 100 });
      const result = applyExp(monster, 10);
      expect(result.monster.hp).toBe(21);
      expect(result.monster.maxHp).toBe(50);
    });

    it('经验足够时升级', () => {
      const monster = createTestMonster({ level: 1, exp: 0, expToNext: 20 });
      const result = applyExp(monster, 25);
      expect(result.leveledUp).toBe(true);
      expect(result.monster.level).toBeGreaterThan(1);
    });

    it('满级后不再积累经验', () => {
      const monster = createTestMonster({ level: 10, exp: 0, expToNext: 200 });
      const result = applyExp(monster, 100);
      expect(result.monster.level).toBe(10);
      expect(result.monster.exp).toBe(0);
    });

    it('升级后属性提升', () => {
      const monster = createTestMonster({ level: 1, hp: 50, attack: 50, defense: 50, speed: 50 });
      const result = applyExp(monster, 100);
      if (result.leveledUp) {
        expect(result.monster.hp).toBeGreaterThan(50);
        expect(result.monster.attack).toBeGreaterThan(50);
      }
    });
  });

  describe('奖励文本生成', () => {
    it('包含经验值文本', () => {
      const reward = {
        exp: 50,
        diamonds: 4,
        skillStone: false,
        pokeballs: [],
      };
      const texts = generateRewardText(reward);
      expect(texts.some((t) => t.includes('50'))).toBe(true);
    });

    it('有技能石时显示技能石文本', () => {
      const reward = {
        exp: 50,
        diamonds: 4,
        skillStone: true,
        skillStoneElement: 'fire' as const,
        pokeballs: [],
      };
      const texts = generateRewardText(reward);
      expect(texts.some((t) => t.includes('技能石'))).toBe(true);
    });
  });
});
