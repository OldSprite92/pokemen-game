import { describe, expect, it } from 'vitest';
import type { Continent, Monster } from '../types';
import { createGymChallenge, createGymProgress, getGymDefinition, GYM_DEFINITIONS } from './gymSystem';

const continent: Continent = {
  id: 'test-psychic', name: '心灵高原', emoji: '🔮', themeColor: '#f0a', bgColor: '#302',
  element: 'psychic', description: '', gridSize: 10, cells: [], bossName: '测试守护者', bossAvatar: 'unicorn', completed: false, isCustom: false,
};

function player(id: number): Monster {
  return { id, name: `伙伴${id}`, element: 'water', skills: [], avatar: 'fish', hp: 60, attack: 50, defense: 50, speed: 50, level: 5, exp: 0, createdBy: 'user', createdAt: new Date() };
}

describe('道馆系统', () => {
  it('19 种属性都有道馆与馆主', () => {
    expect(Object.keys(GYM_DEFINITIONS)).toHaveLength(19);
    expect(getGymDefinition('fire')).toMatchObject({ name: '红莲道馆', leaderName: '夏伯' });
    expect(getGymDefinition('psychic')).toMatchObject({ name: '金黄道馆', leaderName: '娜姿' });
  });

  it('按地图难度固定生成 3–5 只匹配属性的馆内阵容', () => {
    const easy = createGymProgress(continent, 'easy');
    const hard = createGymProgress(continent, 'hard');
    const hell = createGymProgress(continent, 'hell');
    expect(easy.roster).toHaveLength(3);
    expect(hard.roster).toHaveLength(4);
    expect(hell.roster).toHaveLength(5);
    easy.roster.forEach((member) => expect(member.monster.elements).toContain('psychic'));
  });

  it('挑战书只会抽取可用伙伴数量支持的赛制，并抽取无重复对手', () => {
    const progress = createGymProgress(continent, 'hell');
    const challenge = createGymChallenge(progress, [player(1), player(2)], () => 0.99);
    expect(challenge.format).toBe(2);
    expect(challenge.playerIds).toHaveLength(0);
    expect(new Set(challenge.opponentIds).size).toBe(2);
    expect(['free', 'locked']).toContain(challenge.switchRule);
  });
});
