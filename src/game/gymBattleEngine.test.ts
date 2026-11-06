import { describe, expect, it } from 'vitest';
import type { GymChallenge, GymRosterMember, Monster } from '../types';
import { createGymBattleState, resolveGymRound } from './gymBattleEngine';

function monster(id: number, name: string, element: Monster['element'], speed: number, hp = 60): Monster {
  return { id, name, element, skills: [{ id: `${name}-hit`, name: '稳定攻击', element, power: 30, accuracy: 100, description: '' }], avatar: 'fish', hp, maxHp: hp, attack: 70, defense: 40, speed, level: 5, exp: 0, createdBy: 'user', createdAt: new Date() };
}

describe('道馆同时队伍战', () => {
  it('2v2 会让双方场上伙伴在同一回合各自结算行动', () => {
    const players = [monster(1, '水一号', 'water', 80), monster(2, '草二号', 'grass', 70)];
    const enemies: GymRosterMember[] = [
      { id: 'e1', monster: monster(11, '火一号', 'fire', 50, 10) },
      { id: 'e2', monster: monster(12, '火二号', 'fire', 40, 10) },
    ];
    const challenge: GymChallenge = { format: 2, switchRule: 'locked', playerIds: [1, 2], opponentIds: ['e1', 'e2'], createdAt: new Date() };
    const state = createGymBattleState(challenge, players, enemies);
    const result = resolveGymRound(state, [
      { type: 'skill', actorId: state.playerField[0].unitId, targetId: state.enemyField[0].unitId, skillIndex: 0 },
      { type: 'skill', actorId: state.playerField[1].unitId, targetId: state.enemyField[1].unitId, skillIndex: 0 },
    ]);
    expect(result.winner).toBe('player');
    expect(result.log.some((line) => line.includes('火一号'))).toBe(true);
    expect(result.log.some((line) => line.includes('火二号'))).toBe(true);
    expect(result.lastRoundEffects).toHaveLength(2);
    expect(result.lastRoundEffects.every((effect) => effect.attacker === 'player' && effect.didHit)).toBe(true);
  });

  it('自由换人会用替补替换场上伙伴并给换入伙伴首回合减伤', () => {
    const players = [monster(1, '水一号', 'water', 80), monster(2, '草二号', 'grass', 70), monster(3, '电替补', 'electric', 60, 200)];
    const enemies: GymRosterMember[] = [
      { id: 'e1', monster: monster(11, '火一号', 'fire', 50) },
      { id: 'e2', monster: monster(12, '火二号', 'fire', 40) },
      { id: 'e3', monster: monster(13, '火替补', 'fire', 30) },
    ];
    const challenge: GymChallenge = { format: 2, switchRule: 'free', playerIds: [1, 2, 3], opponentIds: ['e1', 'e2', 'e3'], createdAt: new Date() };
    const state = createGymBattleState(challenge, players, enemies);
    const result = resolveGymRound(state, [{ type: 'switch', actorId: state.playerField[0].unitId, benchId: state.playerBench[0].unitId }]);
    expect(result.playerField.map((unit) => unit.monster.name)).toContain('电替补');
    expect(result.log.some((line) => line.includes('上场并获得首回合减伤'))).toBe(true);
  });
});
