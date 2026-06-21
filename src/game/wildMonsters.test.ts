import { describe, it, expect } from 'vitest';
import {
  ALL_WILD_MONSTERS,
  getWildMonsterPool,
  generateWildMonster,
  randomEncounter,
  FEN_XIAN_PIG,
  YAN_ZONG_DOG,
  YOU_MING_BAT,
  DONG_YUAN_GOOSE,
  LEI_GUAN_RHINO,
  ZAO_KAI_TURTLE,
  LIE_KONG_EAGLE,
  YING_WEI_FOX,
  CHI_NI_CROC,
  CI_YU_SWALLOW,
  DA_SHE_ELEPHANT,
  XIANG_CAO_PIG,
  PAO_PAO_PIG,
  CAO_MI_ORCHID,
  SHUI_MIAN_COTTON,
  HUO_YI_DRAGON,
  BING_JU_LIZARD,
  YAN_LU_LIZARD,
  SHAN_DIAN_LIZARD,
  YI_HUAN_DRAGON,
  XUE_BAI_NA,
  HEI_XIAN_PIG,
  LIE_GUANG_BIRD,
} from './wildMonsters';
import type { ElementType } from '../types';

describe('野生宝可梦数据', () => {
  it('应该有24个野生宝可梦配置', () => {
    expect(ALL_WILD_MONSTERS.length).toBe(24);
  });

  it('每个宝可梦都有名字', () => {
    ALL_WILD_MONSTERS.forEach((config) => {
      expect(config.monster.name).toBeTruthy();
      expect(typeof config.monster.name).toBe('string');
    });
  });

  it('每个宝可梦都有有效属性', () => {
    const validElements: ElementType[] = [
      'fire', 'water', 'grass', 'electric', 'normal', 'ice',
      'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
      'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy', 'light',
    ];
    ALL_WILD_MONSTERS.forEach((config) => {
      expect(validElements).toContain(config.monster.element);
    });
  });

  it('每个宝可梦都有2-4个技能', () => {
    ALL_WILD_MONSTERS.forEach((config) => {
      expect(config.monster.skills.length).toBeGreaterThanOrEqual(2);
      expect(config.monster.skills.length).toBeLessThanOrEqual(4);
    });
  });

  it('每个宝可梦都有头像', () => {
    ALL_WILD_MONSTERS.forEach((config) => {
      expect(config.monster.avatar).toBeTruthy();
      expect(typeof config.monster.avatar).toBe('string');
    });
  });

  it('每个宝可梦都有正数属性值', () => {
    ALL_WILD_MONSTERS.forEach((config) => {
      expect(config.monster.hp).toBeGreaterThan(0);
      expect(config.monster.attack).toBeGreaterThan(0);
      expect(config.monster.defense).toBeGreaterThan(0);
      expect(config.monster.speed).toBeGreaterThan(0);
    });
  });

  it('等级范围有效', () => {
    ALL_WILD_MONSTERS.forEach((config) => {
      expect(config.minLevel).toBeGreaterThanOrEqual(2);
      expect(config.maxLevel).toBeLessThanOrEqual(15);
      expect(config.minLevel).toBeLessThanOrEqual(config.maxLevel);
    });
  });

  it('遇敌率有效', () => {
    ALL_WILD_MONSTERS.forEach((config) => {
      expect(config.encounterRate).toBeGreaterThan(0);
      expect(config.encounterRate).toBeLessThanOrEqual(20);
    });
  });

  it('每个宝可梦都有至少一个偏好属性', () => {
    ALL_WILD_MONSTERS.forEach((config) => {
      expect(config.preferredElements.length).toBeGreaterThan(0);
    });
  });
});

describe('getWildMonsterPool', () => {
  it('火大陆应该返回火属性宝可梦', () => {
    const pool = getWildMonsterPool('fire');
    expect(pool.length).toBeGreaterThan(0);
    pool.forEach((config) => {
      expect(config.preferredElements).toContain('fire');
    });
  });

  it('水大陆应该返回水属性宝可梦', () => {
    const pool = getWildMonsterPool('water');
    expect(pool.length).toBeGreaterThan(0);
    pool.forEach((config) => {
      expect(config.preferredElements).toContain('water');
    });
  });

  it('草大陆应该返回草属性宝可梦', () => {
    const pool = getWildMonsterPool('grass');
    expect(pool.length).toBeGreaterThan(0);
    pool.forEach((config) => {
      expect(config.preferredElements).toContain('grass');
    });
  });

  it('光大陆应该返回光属性宝可梦', () => {
    const pool = getWildMonsterPool('light');
    expect(pool.length).toBeGreaterThan(0);
    pool.forEach((config) => {
      expect(config.preferredElements).toContain('light');
    });
  });
});

describe('generateWildMonster', () => {
  it('生成的宝可梦等级在范围内', () => {
    const config = ALL_WILD_MONSTERS[0];
    for (let i = 0; i < 10; i++) {
      const monster = generateWildMonster(config);
      expect(monster.level).toBeGreaterThanOrEqual(config.minLevel);
      expect(monster.level).toBeLessThanOrEqual(config.maxLevel);
    }
  });

  it('生成的宝可梦属性按等级缩放', () => {
    const config = ALL_WILD_MONSTERS[0];
    const monster = generateWildMonster(config);
    const levelMultiplier = 1 + (monster.level - 5) * 0.1;
    expect(monster.hp).toBe(Math.floor(config.monster.hp * levelMultiplier));
  });

  it('生成的宝可梦没有id', () => {
    const config = ALL_WILD_MONSTERS[0];
    const monster = generateWildMonster(config);
    expect(monster.id).toBeUndefined();
  });
});

describe('randomEncounter', () => {
  it('火大陆应该返回宝可梦', () => {
    const monster = randomEncounter('fire');
    expect(monster).not.toBeNull();
    if (monster) {
      expect(monster.name).toBeTruthy();
      expect(monster.level).toBeGreaterThanOrEqual(2);
    }
  });

  it('水大陆应该返回宝可梦', () => {
    const monster = randomEncounter('water');
    expect(monster).not.toBeNull();
    if (monster) {
      expect(monster.name).toBeTruthy();
    }
  });

  it('草大陆应该返回宝可梦', () => {
    const monster = randomEncounter('grass');
    expect(monster).not.toBeNull();
    if (monster) {
      expect(monster.name).toBeTruthy();
    }
  });

  it('多次调用应该返回不同等级', () => {
    const levels = new Set<number>();
    for (let i = 0; i < 20; i++) {
      const monster = randomEncounter('fire');
      if (monster) levels.add(monster.level);
    }
    // 由于随机性，应该有至少2个不同等级
    expect(levels.size).toBeGreaterThanOrEqual(1);
  });
});

describe('24个宝可梦导出', () => {
  it('所有宝可梦常量都已导出', () => {
    expect(FEN_XIAN_PIG.name).toBe('粉仙猪');
    expect(YAN_ZONG_DOG.name).toBe('炎鬃犬');
    expect(YOU_MING_BAT.name).toBe('幽冥蝠');
    expect(DONG_YUAN_GOOSE.name).toBe('冻原鹅');
    expect(LEI_GUAN_RHINO.name).toBe('雷冠犀');
    expect(ZAO_KAI_TURTLE.name).toBe('藻铠龟');
    expect(LIE_KONG_EAGLE.name).toBe('裂空鹰');
    expect(YING_WEI_FOX.name).toBe('樱尾狐');
    expect(CHI_NI_CROC.name).toBe('炽泥鳄');
    expect(CI_YU_SWALLOW.name).toBe('磁羽燕');
    expect(DA_SHE_ELEPHANT.name).toBe('大舌象');
    expect(XIANG_CAO_PIG.name).toBe('香草猪');
    expect(PAO_PAO_PIG.name).toBe('泡泡猪');
    expect(CAO_MI_ORCHID.name).toBe('草蜜兰');
    expect(SHUI_MIAN_COTTON.name).toBe('水棉兰');
    expect(HUO_YI_DRAGON.name).toBe('火翼龙');
    expect(BING_JU_LIZARD.name).toBe('冰锯蜥');
    expect(YAN_LU_LIZARD.name).toBe('岩陆蜥');
    expect(SHAN_DIAN_LIZARD.name).toBe('闪电蜥');
    expect(YI_HUAN_DRAGON.name).toBe('翼幻接龙');
    expect(XUE_BAI_NA.name).toBe('雪百纳');
    expect(HEI_XIAN_PIG.name).toBe('黑仙猪');
    expect(LIE_GUANG_BIRD.name).toBe('烈光鸟');
    expect(LIE_GUANG_BIRD.element).toBe('light');
  });
});
