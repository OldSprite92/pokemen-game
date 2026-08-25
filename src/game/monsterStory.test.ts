import { describe, expect, it } from 'vitest';
import { ALL_WILD_MONSTERS } from './wildMonsters';
import { CAVE_CRAB, KULI_PIG } from './starterMonsters';
import { generateMonsterBackstory } from './monsterStory';
import type { Monster } from '../types';

describe('图鉴经历故事', () => {
  it('每一只系统伙伴都有独一份的可读故事', () => {
    const residents = [...ALL_WILD_MONSTERS.map((item) => item.monster), KULI_PIG, CAVE_CRAB];
    const uniqueResidents = [...new Map(residents.map((monster) => [monster.name, monster])).values()];
    const stories = uniqueResidents.map((monster) => generateMonsterBackstory(monster));

    expect(uniqueResidents).toHaveLength(ALL_WILD_MONSTERS.length + 2);
    expect(new Set(stories).size).toBe(uniqueResidents.length);
    stories.forEach((story) => expect(Array.from(story).length).toBeGreaterThan(65));
  });

  it('自创伙伴的故事会带回孩子写下的设定', () => {
    const monster: Monster = {
      name: '栗子闪闪',
      element: 'electric',
      avatar: 'lightning',
      skills: [{ id: 'spark-tail', name: '雷霆尾巴', element: 'electric', power: 25, accuracy: 95, description: '甩出闪电尾巴' }],
      hp: 70,
      attack: 60,
      defense: 50,
      speed: 75,
      level: 4,
      exp: 0,
      createdBy: 'user',
      createdAt: new Date(),
      personality: '爱逞强',
      favoriteThing: '收集圆圆的栗子',
      catchphrase: '我先去看看',
    };

    const story = generateMonsterBackstory(monster, { discoveredPlace: '雷鸣山谷' });

    expect(story).toContain('栗子闪闪');
    expect(story).toContain('雷霆尾巴');
    expect(story).toContain('收集圆圆的栗子');
  });
});
