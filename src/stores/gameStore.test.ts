import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '../stores/gameStore';
import type { Monster } from '../types';

function createTestMonster(overrides: Partial<Monster> = {}): Monster {
  return {
    name: '测试宝可梦',
    element: 'fire',
    skills: [
      { id: 's1', name: '火焰拳', element: 'fire', power: 20, accuracy: 100, description: '火焰攻击' },
    ],
    avatar: 'dragon',
    hp: 80,
    attack: 70,
    defense: 60,
    speed: 30,
    level: 1,
    exp: 0,
    createdBy: 'user',
    createdAt: new Date(),
    ...overrides,
  };
}

function createFastEnemy(): Monster {
  return {
    name: '快速敌人',
    element: 'water',
    skills: [
      { id: 'e1', name: '水枪', element: 'water', power: 20, accuracy: 100, description: '水攻击' },
    ],
    avatar: 'fish',
    hp: 70,
    attack: 65,
    defense: 55,
    speed: 90,
    level: 1,
    exp: 0,
    createdBy: 'system',
    createdAt: new Date(),
  };
}

describe('gameStore 敌人先手', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useGameStore.getState().endBattleExtended();
  });

  it('敌人速度快时应该先手', () => {
    const player = createTestMonster();
    const enemy = createFastEnemy();

    useGameStore.getState().startBattleExtended(player, enemy);

    const state = useGameStore.getState().extendedBattleState;
    expect(state.turn).toBe('enemy');
    expect(state.isActive).toBe(true);
    expect(state.playerCurrentHp).toBe(player.hp);
    expect(state.enemyCurrentHp).toBe(enemy.hp);
  });

  it('executeEnemyTurn 应该造成伤害并切换回玩家回合', () => {
    const player = createTestMonster();
    const enemy = createFastEnemy();

    useGameStore.getState().startBattleExtended(player, enemy);

    // 直接执行敌人回合
    const result = useGameStore.getState().executeEnemyTurn();

    expect(result).not.toBeNull();
    expect(result?.attacker).toBe('enemy');
    expect(result?.damageResult.damage).toBeGreaterThan(0);

    const state = useGameStore.getState().extendedBattleState;
    expect(state.turn).toBe('player'); // 切换回玩家回合
    expect(state.playerCurrentHp).toBeLessThan(player.hp); // 玩家受伤
    expect(state.log.length).toBeGreaterThan(2); // 有战斗播报
  });

  it('玩家速度快时应该先手', () => {
    const player = createTestMonster({ speed: 100 });
    const enemy = createFastEnemy();
    enemy.speed = 10;

    useGameStore.getState().startBattleExtended(player, enemy);

    const state = useGameStore.getState().extendedBattleState;
    expect(state.turn).toBe('player');
  });

  it('完整对战流程：敌人先手 -> 玩家反击 -> 敌人再攻击', () => {
    const player = createTestMonster();
    const enemy = createFastEnemy();

    useGameStore.getState().startBattleExtended(player, enemy);

    // 敌人先手攻击
    const enemyResult1 = useGameStore.getState().executeEnemyTurn();
    expect(enemyResult1).not.toBeNull();

    let state = useGameStore.getState().extendedBattleState;
    expect(state.turn).toBe('player');

    // 玩家反击
    const playerResult = useGameStore.getState().executePlayerTurn(0);
    expect(playerResult).not.toBeNull();

    state = useGameStore.getState().extendedBattleState;
    expect(state.turn).toBe('enemy');

    // 敌人再次攻击
    const enemyResult2 = useGameStore.getState().executeEnemyTurn();
    expect(enemyResult2).not.toBeNull();

    state = useGameStore.getState().extendedBattleState;
    expect(state.turn).toBe('player');
  });

  it('电系技能命中后可以让敌人麻痹并跳过行动', () => {
    const player = createTestMonster({
      speed: 100,
      skills: [
        { id: 'electric-1', name: '电击', element: 'electric', power: 15, accuracy: 100, description: '电击' },
      ],
    });
    const enemy = createFastEnemy();
    enemy.speed = 10;

    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0);

    useGameStore.getState().startBattleExtended(player, enemy);
    const playerResult = useGameStore.getState().executePlayerTurn(0);
    expect(playerResult).not.toBeNull();

    let state = useGameStore.getState().extendedBattleState;
    expect(state.enemyStatuses[0]?.type).toBe('paralysis');
    expect(state.turn).toBe('enemy');

    randomSpy.mockReturnValueOnce(0);
    const enemyResult = useGameStore.getState().executeEnemyTurn();
    expect(enemyResult?.damageResult.damage).toBe(0);

    state = useGameStore.getState().extendedBattleState;
    expect(state.turn).toBe('player');
    expect(state.log.at(-1)).toContain('没能行动');
  });

  it('毒系技能命中后会造成持续掉血', () => {
    const player = createTestMonster({
      speed: 100,
      skills: [
        { id: 'poison-3', name: '剧毒', element: 'poison', power: 20, accuracy: 100, description: '剧毒' },
      ],
    });
    const enemy = createFastEnemy();
    enemy.speed = 10;
    enemy.element = 'normal';

    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0);

    useGameStore.getState().startBattleExtended(player, enemy);
    useGameStore.getState().executePlayerTurn(0);
    const hpAfterHit = useGameStore.getState().extendedBattleState.enemyCurrentHp;

    randomSpy
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.9);

    const enemyResult = useGameStore.getState().executeEnemyTurn();
    const state = useGameStore.getState().extendedBattleState;

    expect(enemyResult?.statusDamage).toBe(5);
    expect(state.enemyCurrentHp).toBe(hpAfterHit - 5);
    expect(state.enemyStatuses[0]?.turnsRemaining).toBe(2);
  });
});
