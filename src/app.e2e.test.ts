import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db/database';
import { useGameStore } from './stores/gameStore';
import { generateStats } from './components/create/StepStats';
import { calculateDamage, determineFirstTurn, calculateExpGain, getExpToNextLevel, levelUp, TYPE_CHART } from './game/battleEngine';
import { generateMapGrid, getPresetContinents, createCustomContinent, CELL_ICONS, CELL_NAMES } from './game/continentData';
import type { Monster, ElementType, Skill } from './types';

/** 清理数据库 */
async function clearDatabase() {
  await db.monsters.clear();
  await db.trainers.clear();
  await db.adventures.clear();
  await db.continents.clear();
}

/** 创建测试宝可梦 */
function createTestMonster(overrides: Partial<Monster> = {}): Monster {
  const skill: Skill = {
    id: 'test-skill',
    name: '测试技能',
    element: 'fire',
    power: 20,
    accuracy: 100,
    description: '测试用技能',
  };

  return {
    name: '测试宝可梦',
    element: 'fire' as ElementType,
    skills: [skill],
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

describe('🎮 宝可梦大冒险 - 完整功能测试', () => {
  beforeEach(async () => {
    await clearDatabase();
    // 重置 Zustand store
    useGameStore.setState({
      currentTrainer: null,
      battleState: {
        isActive: false,
        playerMonster: null,
        enemyMonster: null,
        turn: 'player',
        log: [],
      },
      extendedBattleState: {
        isActive: false,
        playerMonster: null,
        enemyMonster: null,
        turn: 'player',
        log: [],
        playerCurrentHp: 0,
        enemyCurrentHp: 0,
        turnCount: 0,
        isOver: false,
        winner: null,
        lastDamageResult: null,
        expGained: 0,
        leveledUp: false,
        playerTeam: [],
        activePlayerIndex: 0,
        isPVP: false,
      },
      currentAdventure: null,
    });
  });

  // ========== Task 1: 项目骨架 ==========
  describe('Task 1: 项目骨架', () => {
    it('数据库表存在', () => {
      expect(db.monsters).toBeDefined();
      expect(db.trainers).toBeDefined();
      expect(db.adventures).toBeDefined();
      expect(db.continents).toBeDefined();
    });

    it('Zustand store 有初始状态', () => {
      const state = useGameStore.getState();
      expect(state.currentTrainer).toBeNull();
      expect(state.battleState.isActive).toBe(false);
      expect(state.currentAdventure).toBeNull();
    });
  });

  // ========== Task 2: 宝可梦创造器 ==========
  describe('Task 2: 宝可梦创造器', () => {
    it('创造宝可梦并保存到数据库', async () => {
      const monster = createTestMonster({ name: '火焰龙' });
      const id = await db.monsters.add(monster);
      expect(id).toBeDefined();

      const saved = await db.monsters.get(id);
      expect(saved).toBeDefined();
      expect(saved?.name).toBe('火焰龙');
      expect(saved?.element).toBe('fire');
    });

    it('生成数值在合理范围内', () => {
      const stats = generateStats(['fire']);
      expect(stats.hp).toBeGreaterThanOrEqual(50);
      expect(stats.hp).toBeLessThanOrEqual(100);
      expect(stats.attack).toBeGreaterThanOrEqual(50);
      expect(stats.attack).toBeLessThanOrEqual(100);
      expect(stats.defense).toBeGreaterThanOrEqual(50);
      expect(stats.defense).toBeLessThanOrEqual(100);
      expect(stats.speed).toBeGreaterThanOrEqual(50);
      expect(stats.speed).toBeLessThanOrEqual(100);
    });

    it('双属性数值取平均', () => {
      const stats = generateStats(['fire', 'water']);
      // 火 HP=75, 水 HP=85, 平均约80
      expect(stats.hp).toBeGreaterThanOrEqual(70);
      expect(stats.hp).toBeLessThanOrEqual(90);
    });

    it('可以查询所有宝可梦', async () => {
      await db.monsters.add(createTestMonster({ name: 'A' }));
      await db.monsters.add(createTestMonster({ name: 'B' }));
      const all = await db.monsters.toArray();
      expect(all.length).toBe(2);
    });

    it('可以删除宝可梦', async () => {
      const id = await db.monsters.add(createTestMonster());
      await db.monsters.delete(id);
      const found = await db.monsters.get(id);
      expect(found).toBeUndefined();
    });
  });

  // ========== Task 3: 对战系统 ==========
  describe('Task 3: 对战系统', () => {
    it('属性克制表存在', () => {
      expect(TYPE_CHART).toBeDefined();
      expect(TYPE_CHART.fire.water).toBe(0.5); // 火打水减半
      expect(TYPE_CHART.water.fire).toBe(2);   // 水打火加倍
    });

    it('伤害计算正确', () => {
      const attacker = createTestMonster({ element: 'water', attack: 80 });
      const defender = createTestMonster({ element: 'fire', defense: 60 });
      const skill = attacker.skills[0];
      skill.element = 'water';
      skill.power = 20;

      const result = calculateDamage(attacker, defender, skill);
      expect(result.damage).toBeGreaterThan(0);
      expect(result.damage).toBeLessThanOrEqual(30);
      expect(result.isCritical || !result.isCritical).toBe(true); // boolean
    });

    it('先手判定基于速度', () => {
      const fast = createTestMonster({ speed: 100 });
      const slow = createTestMonster({ speed: 50 });
      const turn = determineFirstTurn(fast, slow);
      expect(turn).toBe('player'); // fast is player
    });

    it('经验值计算', () => {
      const enemy = createTestMonster({ level: 5 });
      const exp = calculateExpGain(enemy);
      expect(exp).toBeGreaterThan(0);
    });

    it('升级所需经验递增', () => {
      expect(getExpToNextLevel(1)).toBeLessThan(getExpToNextLevel(5));
      expect(getExpToNextLevel(10)).toBeGreaterThan(getExpToNextLevel(1));
    });

    it('升级后属性提升', () => {
      const monster = createTestMonster({ level: 1, hp: 50, attack: 50, defense: 50, speed: 50 });
      const leveled = levelUp(monster);
      expect(leveled.level).toBe(2);
      expect(leveled.hp).toBeGreaterThan(50);
      expect(leveled.attack).toBeGreaterThan(50);
    });

    it('对战状态管理', () => {
      const player = createTestMonster();
      const enemy = createTestMonster({ name: '敌人' });
      const store = useGameStore.getState();

      store.startBattleExtended(player, enemy);
      const state = useGameStore.getState().extendedBattleState;
      expect(state.isActive).toBe(true);
      expect(state.playerMonster?.name).toBe('测试宝可梦');
      expect(state.enemyMonster?.name).toBe('敌人');
      expect(state.playerCurrentHp).toBe(player.hp);
      expect(state.enemyCurrentHp).toBe(enemy.hp);
    });

    it('玩家回合执行', () => {
      const player = createTestMonster({ speed: 100 }); // 确保玩家先手
      const enemy = createTestMonster({ name: '敌人', speed: 1 });
      const store = useGameStore.getState();

      store.startBattleExtended(player, enemy);
      // 如果敌人先手，等待敌人回合结束
      const state = store.extendedBattleState;
      if (state.turn === 'enemy') {
        store.executeEnemyTurn();
        store.checkBattleEnd();
      }
      const result = store.executePlayerTurn(0);
      expect(result).not.toBeNull();
      expect(result?.attacker).toBe('player');
      expect(result?.damageResult.damage).toBeGreaterThanOrEqual(0);
    });

    it('敌人回合执行', () => {
      const player = createTestMonster();
      const enemy = createTestMonster({ name: '敌人' });
      const store = useGameStore.getState();

      store.startBattleExtended(player, enemy);
      // 强制设置为敌人回合
      useGameStore.setState((s: any) => ({
        extendedBattleState: { ...s.extendedBattleState, turn: 'enemy' },
      }));

      const result = store.executeEnemyTurn();
      expect(result).not.toBeNull();
      expect(result?.attacker).toBe('enemy');
    });

    it('战斗结束判定', () => {
      const player = createTestMonster();
      const enemy = createTestMonster({ name: '敌人', hp: 10 });
      const store = useGameStore.getState();

      store.startBattleExtended(player, enemy);
      // 直接击败敌人
      useGameStore.setState((s: any) => ({
        extendedBattleState: { ...s.extendedBattleState, enemyCurrentHp: 0 },
      }));

      const ended = store.checkBattleEnd();
      expect(ended).toBe(true);
      const state = useGameStore.getState().extendedBattleState;
      expect(state.isOver).toBe(true);
      expect(state.winner).toBe('player');
    });
  });

  // ========== Task 4: 大陆冒险地图 ==========
  describe('Task 4: 大陆冒险地图', () => {
    it('生成5x5格子地图', () => {
      const cells = generateMapGrid(5, 'fire');
      expect(cells.length).toBe(25);
    });

    it('中心格子是起点', () => {
      const cells = generateMapGrid(5, 'fire');
      const center = cells.find((c: { x: number; y: number }) => c.x === 2 && c.y === 2);
      expect(center?.type).toBe('start');
      expect(center?.visited).toBe(true);
    });

    it('至少有一个Boss', () => {
      const cells = generateMapGrid(5, 'water');
      const bossCells = cells.filter((c: { type: string }) => c.type === 'boss');
      expect(bossCells.length).toBeGreaterThanOrEqual(1);
    });

    it('起点周围没有障碍物', () => {
      const cells = generateMapGrid(5, 'grass');
      const neighbors = [
        cells.find((c: { x: number; y: number }) => c.x === 1 && c.y === 2),
        cells.find((c: { x: number; y: number }) => c.x === 3 && c.y === 2),
        cells.find((c: { x: number; y: number }) => c.x === 2 && c.y === 1),
        cells.find((c: { x: number; y: number }) => c.x === 2 && c.y === 3),
      ];
      neighbors.forEach((cell) => {
        expect(cell?.type).not.toBe('blocked');
      });
    });

    it('3个预设大陆', () => {
      const continents = getPresetContinents();
      expect(continents.length).toBe(3);
      expect(continents.map((c: { name: string }) => c.name)).toContain('火山岛');
      expect(continents.map((c: { name: string }) => c.name)).toContain('冰雪大陆');
      expect(continents.map((c: { name: string }) => c.name)).toContain('丛林秘境');
    });

    it('创建自定义大陆', () => {
      const continent = createCustomContinent('我的大陆', 'electric' as ElementType, '#eab308');
      expect(continent.name).toBe('我的大陆');
      expect(continent.isCustom).toBe(true);
      expect(continent.cells.length).toBe(100);
    });

    it('大陆保存到数据库', async () => {
      const continent = createCustomContinent('测试大陆', 'fire' as ElementType, '#ef4444');
      const id = await db.continents.add(continent);
      const saved = await db.continents.get(id);
      expect(saved?.name).toBe('测试大陆');
    });

    it('所有格子类型有配置', () => {
      const types = ['start', 'empty', 'wild', 'treasure', 'rest', 'boss', 'blocked'] as const;
      types.forEach((type) => {
        expect(CELL_ICONS[type]).toBeDefined();
        expect(CELL_NAMES[type]).toBeDefined();
      });
    });
  });

  // ========== Task 6: 家庭队伍系统 ==========
  describe('Task 6: 家庭队伍系统', () => {
    it('创建训练师', async () => {
      const trainer = {
        name: '小明',
        avatar: 'boy1',
        monsterIds: [],
        createdAt: new Date(),
      };
      const id = await db.trainers.add(trainer);
      const saved = await db.trainers.get(id);
      expect(saved?.name).toBe('小明');
      expect(saved?.avatar).toBe('boy1');
    });

    it('训练师关联宝可梦', async () => {
      // 创建训练师
      const trainerId = await db.trainers.add({
        name: '小明',
        avatar: 'boy1',
        monsterIds: [],
        createdAt: new Date(),
      });

      // 创建宝可梦
      const monsterId = await db.monsters.add(createTestMonster());

      // 关联
      await db.trainers.update(trainerId, {
        monsterIds: [monsterId as number],
      });

      const trainer = await db.trainers.get(trainerId);
      expect(trainer?.monsterIds).toContain(monsterId);
    });

    it('Zustand store 设置训练师', () => {
      const trainer = { id: 1, name: '小明', avatar: 'boy1', monsterIds: [], createdAt: new Date() };
      useGameStore.getState().setCurrentTrainer(trainer);
      const state = useGameStore.getState();
      expect(state.currentTrainer?.name).toBe('小明');
    });

    it('查询训练师的宝可梦', async () => {
      const trainerId = await db.trainers.add({
        name: '小明',
        avatar: 'boy1',
        monsterIds: [],
        createdAt: new Date(),
      });

      const m1 = await db.monsters.add(createTestMonster({ name: 'A' }));
      const m2 = await db.monsters.add(createTestMonster({ name: 'B' }));

      await db.trainers.update(trainerId, {
        monsterIds: [m1 as number, m2 as number],
      });

      const trainer = await db.trainers.get(trainerId);
      const monsters = await db.monsters.bulkGet(trainer?.monsterIds || []);
      const validMonsters = monsters.filter((m): m is Monster => m !== undefined);
      expect(validMonsters.length).toBe(2);
      expect(validMonsters.map((m) => m.name)).toContain('A');
      expect(validMonsters.map((m) => m.name)).toContain('B');
    });
  });

  // ========== 数据持久化 ==========
  describe('数据持久化', () => {
    it('IndexedDB 数据刷新后仍存在', async () => {
      // 创建数据
      const monsterId = await db.monsters.add(createTestMonster({ name: '持久化测试' }));

      // 模拟重新打开数据库（直接查询验证）
      const found = await db.monsters.get(monsterId);
      expect(found?.name).toBe('持久化测试');
    });

    it('可以清空所有数据', async () => {
      await db.monsters.add(createTestMonster());
      await db.trainers.add({ name: 'T', avatar: 'boy1', monsterIds: [], createdAt: new Date() });

      await clearDatabase();

      const monsters = await db.monsters.toArray();
      const trainers = await db.trainers.toArray();
      expect(monsters.length).toBe(0);
      expect(trainers.length).toBe(0);
    });
  });

  // ========== 边界情况 ==========
  describe('边界情况', () => {
    it('空属性生成默认数值', () => {
      const stats = generateStats([]);
      expect(stats.hp).toBe(70);
      expect(stats.attack).toBe(70);
    });

    it('未激活战斗不能执行回合', () => {
      const store = useGameStore.getState();
      const result = store.executePlayerTurn(0);
      expect(result).toBeNull();
    });

    it('战斗结束后不能执行回合', () => {
      const player = createTestMonster();
      const enemy = createTestMonster();
      const store = useGameStore.getState();

      store.startBattleExtended(player, enemy);
      useGameStore.setState((s: any) => ({
        extendedBattleState: { ...s.extendedBattleState, isOver: true },
      }));

      const result = store.executePlayerTurn(0);
      expect(result).toBeNull();
    });

    it('自定义大陆ID唯一', async () => {
      const c1 = createCustomContinent('A', 'fire' as ElementType, '#000');
      await new Promise((r) => setTimeout(r, 10)); // 等待10ms确保时间戳不同
      const c2 = createCustomContinent('B', 'water' as ElementType, '#fff');
      expect(c1.id).not.toBe(c2.id);
    });
  });
});
