import { describe, it, expect } from 'vitest';
import {
  SKILL_POOL,
  getUnlockableSkills,
  learnNewSkill,
  getSkillCountByLevel,
  checkSkillUnlock,
} from './skillPool';
import type { ElementType } from '../types';

describe('技能池', () => {
  it('每个属性至少有6个技能', () => {
    const elements: ElementType[] = [
      'fire', 'water', 'grass', 'electric', 'normal', 'ice',
      'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
      'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy', 'light',
    ];
    elements.forEach((el) => {
      const pool = SKILL_POOL[el];
      expect(pool?.length).toBeGreaterThanOrEqual(6);
    });
  });

  it('getUnlockableSkills 返回正确等级技能', () => {
    const skills = getUnlockableSkills('fire', 5);
    // 解锁等级 <= 5 的技能应该包含2级和4级解锁的
    expect(skills.length).toBeGreaterThanOrEqual(4);
  });

  it('learnNewSkill 不会重复学习', () => {
    const existing = [{ id: 'fire-1', name: '火花', element: 'fire' as ElementType, power: 15, accuracy: 100, description: '' }];
    const newSkill = learnNewSkill(existing, 'fire', 10);
    expect(newSkill).not.toBeNull();
    expect(newSkill?.id).not.toBe('fire-1');
  });

  it('getSkillCountByLevel 返回正确数量', () => {
    expect(getSkillCountByLevel(1)).toBe(2);
    expect(getSkillCountByLevel(2)).toBe(2);
    expect(getSkillCountByLevel(3)).toBe(3);
    expect(getSkillCountByLevel(4)).toBe(3);
    expect(getSkillCountByLevel(5)).toBe(4);
    expect(getSkillCountByLevel(6)).toBe(4);
    expect(getSkillCountByLevel(7)).toBe(5);
    expect(getSkillCountByLevel(8)).toBe(5);
    expect(getSkillCountByLevel(9)).toBe(6);
    expect(getSkillCountByLevel(10)).toBe(6);
  });

  it('checkSkillUnlock 正确检测解锁点', () => {
    expect(checkSkillUnlock(1, 2)).toBe(2);
    expect(checkSkillUnlock(2, 3)).toBeNull();
    expect(checkSkillUnlock(3, 4)).toBe(4);
    expect(checkSkillUnlock(5, 6)).toBe(6);
    expect(checkSkillUnlock(7, 8)).toBe(8);
    expect(checkSkillUnlock(9, 10)).toBe(10);
  });
});
