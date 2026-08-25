import { describe, expect, it } from 'vitest';
import { getPvpTargetScore, getRaidRules, getTeamActionTag } from './multiplayerRules';

describe('联机人数规则', () => {
  it('Boss 血量随野生宝可梦等级成长，而不是固定 220', () => {
    expect(getRaidRules(2, 3)).toEqual({ playerCount: 2, bossHp: 141, teamHp: 200, requiredTags: 2, enrageRound: 7 });
    expect(getRaidRules(3, 8)).toEqual({ playerCount: 3, bossHp: 245, teamHp: 300, requiredTags: 3, enrageRound: 6 });
    expect(getRaidRules(2, 8).bossHp).toBeGreaterThan(getRaidRules(2, 3).bossHp);
  });

  it('把属性映射为便于队友配合的战术标签', () => {
    expect(getTeamActionTag('electric')).toBe('control');
    expect(getTeamActionTag('water')).toBe('guard');
    expect(getTeamActionTag('grass')).toBe('support');
    expect(getTeamActionTag('fire')).toBe('burst');
  });

  it('三人斗技比双人斗技多一枚胜利星', () => {
    expect(getPvpTargetScore(2)).toBe(2);
    expect(getPvpTargetScore(3)).toBe(3);
  });
});
