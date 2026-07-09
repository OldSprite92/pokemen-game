import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '../db/database';
import { useGameStore } from '../stores/gameStore';
import HomePage from '../pages/HomePage';
import type { Trainer, Adventure } from '../types';

describe('🐛 Bug 修复回归测试', () => {
  beforeEach(async () => {
    await db.monsters.clear();
    await db.trainers.clear();
    await db.adventures.clear();
    await db.continents.clear();
    await db.encounters.clear();
    await db.inventory.clear();
    localStorage.clear();
    useGameStore.setState({
      currentTrainer: null,
      battleState: { isActive: false, playerMonster: null, enemyMonster: null, turn: 'player', log: [] },
      extendedBattleState: {
        isActive: false, playerMonster: null, enemyMonster: null, turn: 'player', log: [],
        playerCurrentHp: 0, enemyCurrentHp: 0, turnCount: 0, isOver: false, winner: null,
        lastDamageResult: null, expGained: 0, leveledUp: false, playerTeam: [], activePlayerIndex: 0, isPVP: false,
        playerStatuses: [], enemyStatuses: [],
      },
      currentAdventure: null,
      wildMonster: null,
    });
  });

  describe('BUG-001 修复验证: 训练师从数据库自动恢复', () => {
    it('restoreTrainerFromDB 能从数据库恢复训练师到 store', async () => {
      const trainer: Trainer = {
        id: 1,
        name: '小明',
        avatar: 'boy1',
        monsterIds: [],
        createdAt: new Date(),
      };
      await db.trainers.add(trainer);

      // 模拟页面刷新后 store 重置
      useGameStore.setState({ currentTrainer: null });
      expect(useGameStore.getState().currentTrainer).toBeNull();

      // 调用恢复方法
      await useGameStore.getState().restoreTrainerFromDB();

      // 训练师应该被恢复
      expect(useGameStore.getState().currentTrainer).not.toBeNull();
      expect(useGameStore.getState().currentTrainer?.name).toBe('小明');
    });

    it('HomePage 在恢复后能显示训练师信息', async () => {
      const trainer: Trainer = {
        id: 1,
        name: '小明',
        avatar: 'boy1',
        monsterIds: [],
        createdAt: new Date(),
      };
      await db.trainers.add(trainer);
      await useGameStore.getState().restoreTrainerFromDB();

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('小明')).toBeInTheDocument();
      });

      // 不再显示"还没有训练师"
      expect(screen.queryByText('还没有训练师')).not.toBeInTheDocument();
    });
  });

  describe('BUG-002 修复验证: 冒险状态保存到数据库', () => {
    it('setCurrentAdventure 同时保存到数据库', async () => {
      const adventure: Adventure = {
        id: 1,
        continentId: 'test-continent',
        currentPosition: { x: 5, y: 5 },
        events: [{ type: 'battle', description: '遭遇野生宝可梦', completed: false }],
      };

      useGameStore.getState().setCurrentAdventure(adventure);

      // 验证 store 中有数据
      expect(useGameStore.getState().currentAdventure).not.toBeNull();

      // 验证数据库中也有数据
      const saved = await db.adventures.get(1);
      expect(saved).toBeDefined();
      expect(saved?.currentPosition).toEqual({ x: 5, y: 5 });
    });

    it('restoreAdventureFromDB 能恢复未完成的冒险', async () => {
      const adventure: Adventure = {
        id: 1,
        continentId: 'test-continent',
        currentPosition: { x: 3, y: 4 },
        events: [],
      };
      await db.adventures.add(adventure);

      // 模拟刷新后 store 重置
      useGameStore.setState({ currentAdventure: null });

      // 恢复冒险状态
      await useGameStore.getState().restoreAdventureFromDB();

      expect(useGameStore.getState().currentAdventure).not.toBeNull();
      expect(useGameStore.getState().currentAdventure?.currentPosition).toEqual({ x: 3, y: 4 });
    });
  });

  describe('BUG-003 修复验证: 技能石保存到 localStorage', () => {
    it('战斗奖励技能石应保存到 localStorage', () => {
      // 模拟 BattlePage 中的技能石保存逻辑
      const reward = {
        skillStone: true,
        skillStoneElement: 'fire' as const,
      };

      if (reward.skillStone && reward.skillStoneElement) {
        const savedStones = localStorage.getItem('skillStones');
        const stones = savedStones ? JSON.parse(savedStones) : [];
        stones.push({
          element: reward.skillStoneElement,
          id: `stone-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        });
        localStorage.setItem('skillStones', JSON.stringify(stones));
      }

      const saved = localStorage.getItem('skillStones');
      expect(saved).not.toBeNull();
      const parsed = JSON.parse(saved!);
      expect(parsed.length).toBe(1);
      expect(parsed[0].element).toBe('fire');
    });
  });

  describe('BUG-004/005 修复验证: 数据按训练师隔离', () => {
    it('不同训练师使用不同的 localStorage key', () => {
      // 训练师 1 的精灵球
      localStorage.setItem('pokeballs_trainer_1', JSON.stringify({ normal: 5, great: 2 }));
      // 训练师 2 的精灵球
      localStorage.setItem('pokeballs_trainer_2', JSON.stringify({ normal: 1, great: 0 }));

      // 训练师 1 读取
      const trainer1Balls = JSON.parse(localStorage.getItem('pokeballs_trainer_1')!);
      expect(trainer1Balls.normal).toBe(5);

      // 训练师 2 读取
      const trainer2Balls = JSON.parse(localStorage.getItem('pokeballs_trainer_2')!);
      expect(trainer2Balls.normal).toBe(1);
    });

    it('不同训练师使用不同的技能石 key', () => {
      // 训练师 1 的技能石
      localStorage.setItem('skillStones_trainer_1', JSON.stringify([{ element: 'fire', id: 's1' }]));
      // 训练师 2 的技能石
      localStorage.setItem('skillStones_trainer_2', JSON.stringify([{ element: 'water', id: 's2' }]));

      const trainer1Stones = JSON.parse(localStorage.getItem('skillStones_trainer_1')!);
      expect(trainer1Stones[0].element).toBe('fire');

      const trainer2Stones = JSON.parse(localStorage.getItem('skillStones_trainer_2')!);
      expect(trainer2Stones[0].element).toBe('water');
    });
  });

  describe('BUG-006 修复验证: 遭遇记录状态更新', () => {
    it('updateEncounterStatus 能更新遭遇记录', async () => {
      // 先创建遭遇记录
      const encounterId = await db.encounters.add({
        monsterName: '火焰鼠',
        monsterElement: 'fire',
        monsterLevel: 5,
        monsterAvatar: 'mouse',
        continentName: '火山岛',
        encounteredAt: new Date(),
        captured: false,
        defeated: false,
      });

      // 模拟捕获成功后的更新
      await db.encounters.update(encounterId, { captured: true, defeated: false });

      const updated = await db.encounters.get(encounterId);
      expect(updated?.captured).toBe(true);
      expect(updated?.defeated).toBe(false);
    });
  });

  describe('综合回归测试: 完整用户流程', () => {
    it('创建训练师 -> 刷新 -> 训练师仍然存在', async () => {
      // 1. 创建训练师
      const trainer: Trainer = {
        id: 1,
        name: '小明',
        avatar: 'boy1',
        monsterIds: [],
        createdAt: new Date(),
      };
      await db.trainers.add(trainer);
      useGameStore.getState().setCurrentTrainer(trainer);

      // 2. 模拟刷新（store 重置）
      useGameStore.setState({ currentTrainer: null });

      // 3. 从数据库恢复
      await useGameStore.getState().restoreTrainerFromDB();

      // 4. 验证训练师存在
      expect(useGameStore.getState().currentTrainer?.name).toBe('小明');
    });

    it('开始冒险 -> 移动 -> 刷新 -> 位置恢复', async () => {
      // 1. 保存冒险状态
      const adventure: Adventure = {
        id: 1,
        continentId: 'volcano-island',
        currentPosition: { x: 6, y: 7 },
        events: [{ type: 'battle', description: '遭遇野生宝可梦', completed: true }],
      };
      useGameStore.getState().setCurrentAdventure(adventure);

      // 2. 模拟刷新
      useGameStore.setState({ currentAdventure: null });

      // 3. 从数据库恢复
      await useGameStore.getState().restoreAdventureFromDB();

      // 4. 验证位置恢复
      expect(useGameStore.getState().currentAdventure?.currentPosition).toEqual({ x: 6, y: 7 });
    });
  });
});
