import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import TrainerPage from '../pages/TrainerPage';
import { db } from '../db/database';
import { useGameStore } from '../stores/gameStore';
import type { Trainer, Monster } from '../types';

describe('🐛 Bug 发现测试 - 数据持久化与状态管理', () => {
  beforeEach(async () => {
    await db.monsters.clear();
    await db.trainers.clear();
    await db.adventures.clear();
    await db.continents.clear();
    await db.encounters.clear();
    await db.inventory.clear();
    localStorage.clear();
    // 重置 store
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

  describe('BUG-001: 训练师信息页面刷新后丢失', () => {
    it('训练师保存到数据库后，store 中有 currentTrainer', async () => {
      const trainer: Trainer = {
        id: 1,
        name: '小明',
        avatar: 'boy1',
        monsterIds: [],
        createdAt: new Date(),
      };
      await db.trainers.add(trainer);
      useGameStore.getState().setCurrentTrainer(trainer);

      expect(useGameStore.getState().currentTrainer).not.toBeNull();
      expect(useGameStore.getState().currentTrainer?.name).toBe('小明');
    });

    it('⚠️ 模拟页面刷新后，store 中的 currentTrainer 变为 null', () => {
      // 这是当前代码的实际行为：Zustand store 没有持久化
      // 页面刷新后 store 会重置为初始状态
      const store = useGameStore.getState();
      expect(store.currentTrainer).toBeNull();
      // 即使数据库中有训练师数据，store 也不会自动恢复
    });

    it('⚠️ HomePage 不会自动从数据库恢复训练师', async () => {
      // 先创建训练师到数据库
      const trainer: Trainer = {
        id: 1,
        name: '小明',
        avatar: 'boy1',
        monsterIds: [],
        createdAt: new Date(),
      };
      await db.trainers.add(trainer);
      // 注意：没有调用 setCurrentTrainer

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      // HomePage 显示"还没有训练师"，因为 store 中没有 currentTrainer
      await waitFor(() => {
        expect(screen.getByText('还没有训练师')).toBeInTheDocument();
      });
      // 这就是用户反馈的 bug：刷新后训练师"丢失"了
    });
  });

  describe('BUG-002: 冒险状态页面刷新后丢失', () => {
    it('冒险状态只保存在 store 中，没有持久化到数据库', () => {
      const store = useGameStore.getState();
      store.setCurrentAdventure({
        continentId: 'test-continent',
        currentPosition: { x: 5, y: 5 },
        events: [{ type: 'battle', description: '遭遇野生宝可梦', completed: false }],
      });

      expect(useGameStore.getState().currentAdventure).not.toBeNull();

      // 模拟刷新：store 重置
      useGameStore.setState({ currentAdventure: null });
      expect(useGameStore.getState().currentAdventure).toBeNull();
      // 数据没有保存到 IndexedDB，所以无法恢复
    });
  });

  describe('BUG-003: 技能石存储在 localStorage，但读取逻辑有问题', () => {
    it('战斗胜利后技能石应保存到 localStorage', () => {
      // 模拟保存技能石
      const skillStones = [{ element: 'fire' as const, id: 'stone-1' }];
      localStorage.setItem('skillStones', JSON.stringify(skillStones));

      const saved = localStorage.getItem('skillStones');
      expect(saved).not.toBeNull();
      expect(JSON.parse(saved!)).toEqual(skillStones);
    });

    it('⚠️ PokedexPage 读取 skillStones 时缺少 trainerId 关联', async () => {
      // PokedexPage 的 loadSkillStones 只是简单读取 localStorage
      // 没有区分不同训练师的技能石
      // 这意味着多个训练师共用同一组技能石
    });
  });

  describe('BUG-004: 战斗奖励中的技能石没有保存到 localStorage', () => {
    it('⚠️ BattlePage 的 handleBattleEnd 中没有处理技能石奖励', () => {
      // 查看 BattlePage.tsx 的 handleBattleEnd 函数
      // 它调用了 generateBattleReward 生成奖励
      // 但只处理了经验值和精灵球，没有处理技能石！
      // reward.skillStone 和 reward.skillStoneElement 被忽略了
    });
  });

  describe('BUG-005: 精灵球背包没有关联到训练师', () => {
    it('⚠️ 所有用户共用同一套精灵球背包（localStorage key: "pokeballs"）', () => {
      // BattlePage 使用 localStorage.getItem('pokeballs')
      // 没有区分不同训练师，多个用户共用
    });
  });

  describe('BUG-006: MapPage 冒险位置只在 store 中保存', () => {
    it('⚠️ 移动后的位置没有保存到数据库', () => {
      // MapPage 的 handleMove 只调用了 setCurrentAdventure
      // 没有将冒险数据保存到 db.adventures
      // 刷新后位置丢失
    });
  });

  describe('BUG-007: 遭遇记录状态未更新', () => {
    it('⚠️ 击败或捕获后遭遇记录的 captured/defeated 状态未更新', () => {
      // MapPage 创建遭遇记录时 captured: false, defeated: false
      // 但战斗结束后没有更新这些状态
    });
  });
});
