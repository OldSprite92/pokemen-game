import { describe, expect, it, beforeEach } from 'vitest';
import type { Continent, Monster } from '../types';
import {
  createBossMonster,
  createDifficultyCells,
  deleteDifficultyExploration,
  getDifficultyExploration,
  hasCompletedDifficulty,
  isDifficultyUnlocked,
  markDifficultyComplete,
  scaleMonsterForDifficulty,
  saveDifficultyExploration,
} from './mapDifficulty';

const continent: Continent = {
  id: 'volcano',
  name: '火山岛',
  emoji: '🌋',
  themeColor: '#ef4444',
  bgColor: '#451a03',
  element: 'fire',
  description: '测试大陆',
  gridSize: 10,
  cells: [],
  bossName: '熔岩巨兽',
  bossAvatar: 'dragon',
  completed: false,
  isCustom: false,
};

const monster: Monster = {
  name: '测试兽',
  element: 'fire',
  skills: [],
  avatar: 'dragon',
  hp: 100,
  maxHp: 100,
  attack: 50,
  defense: 40,
  speed: 30,
  level: 5,
  exp: 0,
  createdBy: 'system',
  createdAt: new Date(),
};

describe('mapDifficulty', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('简单难度默认开放', () => {
    expect(isDifficultyUnlocked('volcano', 'easy', [])).toBe(true);
  });

  it('困难难度在简单通关后开放', () => {
    expect(isDifficultyUnlocked('volcano', 'hard', [])).toBe(false);
    markDifficultyComplete('volcano', 'easy');
    expect(hasCompletedDifficulty('volcano', 'easy')).toBe(true);
    expect(isDifficultyUnlocked('volcano', 'hard', [])).toBe(true);
  });

  it('地狱难度在困难通关后开放', () => {
    expect(isDifficultyUnlocked('volcano', 'hell', [])).toBe(false);
    markDifficultyComplete('volcano', 'hard');
    expect(isDifficultyUnlocked('volcano', 'hell', [])).toBe(true);
  });

  it('有两只4级以上伙伴时可以提前开放困难', () => {
    const team = [
      { ...monster, id: 1, level: 4 },
      { ...monster, id: 2, level: 5 },
    ];
    expect(isDifficultyUnlocked('volcano', 'hard', team)).toBe(true);
  });

  it('高难度会提升敌人等级和属性', () => {
    const hardMonster = scaleMonsterForDifficulty(monster, 'hard');
    expect(hardMonster.level).toBe(7);
    expect(hardMonster.attack).toBeGreaterThan(monster.attack);
  });

  it('Boss会按难度生成守护者', () => {
    const boss = createBossMonster(continent, 'hell');
    expect(boss.name).toBe('熔岩巨兽');
    expect(boss.level).toBeGreaterThanOrEqual(12);
    expect(boss.hp).toBeGreaterThan(110);
  });

  it('不同难度都能生成完整地图', () => {
    expect(createDifficultyCells(continent, 'easy').length).toBe(100);
    expect(createDifficultyCells(continent, 'hard').length).toBe(100);
    expect(createDifficultyCells(continent, 'hell').length).toBe(100);
  });

  it('通关地图会保存探索状态，不会在再次进入时重掷路线', () => {
    const cells = createDifficultyCells(continent, 'easy').map((cell) => ({ ...cell, revealed: true }));
    const adventure = { continentId: continent.id, difficulty: 'easy' as const, currentPosition: { x: 3, y: 2 }, events: [] };
    saveDifficultyExploration(continent.id, 'easy', 7, cells, adventure);

    const restored = getDifficultyExploration(continent.id, 'easy', 7);
    expect(restored?.cells).toEqual(cells);
    expect(restored?.adventure.currentPosition).toEqual({ x: 3, y: 2 });
  });

  it('删除自定义地图时会清理对应的探索和难度记录', () => {
    const adventure = { continentId: continent.id, difficulty: 'easy' as const, currentPosition: { x: 3, y: 2 }, events: [] };
    saveDifficultyExploration(continent.id, 'easy', 7, createDifficultyCells(continent, 'easy'), adventure);
    markDifficultyComplete(continent.id, 'easy', 7);

    deleteDifficultyExploration(continent.id, 7);

    expect(getDifficultyExploration(continent.id, 'easy', 7)).toBeNull();
    expect(hasCompletedDifficulty(continent.id, 'easy', 7)).toBe(false);
  });
});
