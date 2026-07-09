import { create } from 'zustand';
import type { BattleStatus, GameState, Monster, BattleState, Trainer, Adventure } from '../types';
import {
  calculateDamage,
  determineFirstTurn,
  calculateExpGain,
  getExpToNextLevel,
  levelUp,
  getBattleStatusConfig,
  rollSkillStatus,
} from '../game/battleEngine';
import type { DamageResult } from '../game/battleEngine';
import { db } from '../db/database';

export interface BattleAction {
  type: 'skill' | 'escape' | 'item' | 'switch';
  skillIndex?: number;
  switchMonsterId?: number;
}

export interface BattleTurnResult {
  attacker: 'player' | 'enemy';
  damageResult: DamageResult;
  targetHp: number;
  statusDamage?: number;
}

export interface ExtendedBattleState extends BattleState {
  playerCurrentHp: number;
  enemyCurrentHp: number;
  turnCount: number;
  isOver: boolean;
  winner: 'player' | 'enemy' | null;
  lastDamageResult: DamageResult | null;
  expGained: number;
  leveledUp: boolean;
  playerTeam: Monster[]; // 玩家可替换的宝可梦队伍
  activePlayerIndex: number; // 当前出战宝可梦索引
  isPVP: boolean; // 是否PVP对战
  playerStatuses: BattleStatus[];
  enemyStatuses: BattleStatus[];
}

const initialBattleState: ExtendedBattleState = {
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
  playerStatuses: [],
  enemyStatuses: [],
};

function noActionResult(message: string): DamageResult {
  return {
    damage: 0,
    effectiveness: 1,
    effectivenessLabel: '',
    isCritical: false,
    isMiss: false,
    logMessage: message,
  };
}

function mergeStatus(statuses: BattleStatus[], incoming: BattleStatus) {
  const existing = statuses.find((status) => status.type === incoming.type);
  if (!existing) return [...statuses, incoming];
  return statuses.map((status) =>
    status.type === incoming.type
      ? { ...incoming, turnsRemaining: Math.max(status.turnsRemaining, incoming.turnsRemaining) }
      : status
  );
}

function resolveStatusesAtTurnStart(
  statuses: BattleStatus[],
  currentHp: number,
  monsterName: string
) {
  let nextHp = currentHp;
  let statusDamage = 0;
  let shouldSkip = false;
  const messages: string[] = [];
  const nextStatuses: BattleStatus[] = [];

  statuses.forEach((status) => {
    const config = getBattleStatusConfig(status.type);
    if (status.damagePerTurn) {
      const damage = Math.min(status.damagePerTurn, nextHp);
      nextHp = Math.max(0, nextHp - damage);
      statusDamage += damage;
      messages.push(`${config.emoji} ${monsterName}受到${config.name}影响，损失 ${damage} 点HP。`);
    }

    if (status.skipChance && Math.random() < status.skipChance) {
      shouldSkip = true;
      messages.push(`${config.emoji} ${monsterName}因为${config.name}，这回合没能行动。`);
    }

    const turnsRemaining = status.turnsRemaining - 1;
    if (turnsRemaining > 0) {
      nextStatuses.push({ ...status, turnsRemaining });
    } else {
      messages.push(`${monsterName}的${config.name}状态消失了。`);
    }
  });

  return { nextHp, nextStatuses, messages, shouldSkip, statusDamage };
}

interface ExtendedGameState extends GameState {
  extendedBattleState: ExtendedBattleState;
  wildMonster: Monster | null;
  setWildMonster: (monster: Monster | null) => void;
  setExtendedBattleState: (state: Partial<ExtendedBattleState>) => void;
  startBattleExtended: (playerMonster: Monster, enemyMonster: Monster, playerTeam?: Monster[], isPVP?: boolean) => void;
  executePlayerTurn: (skillIndex: number) => BattleTurnResult | null;
  executeEnemyTurn: () => BattleTurnResult | null;
  checkBattleEnd: () => boolean;
  endBattleExtended: () => void;
  switchPlayerMonster: (monsterIndex: number) => boolean;
  restoreTrainerFromDB: () => Promise<void>;
  restoreAdventureFromDB: () => Promise<void>;
}

export const useGameStore = create<ExtendedGameState>((set, get) => ({
  currentTrainer: null,
  battleState: initialBattleState,
  extendedBattleState: initialBattleState,
  currentAdventure: null,
  wildMonster: null,

  // 从数据库恢复训练师状态（页面刷新后调用）
  restoreTrainerFromDB: async () => {
    try {
      const trainers = await db.trainers.toArray();
      if (trainers.length > 0) {
        // 使用最新的训练师
        const latest = trainers.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        set({ currentTrainer: latest });
      }
    } catch (err) {
      console.error('恢复训练师失败:', err);
    }
  },

  // 从数据库恢复冒险状态（页面刷新后调用）
  restoreAdventureFromDB: async () => {
    try {
      const adventures = await db.adventures.toArray();
      if (adventures.length > 0) {
        // 使用最新的未完成的冒险
        const latest = adventures
          .filter(a => !a.completedAt)
          .sort((a, b) => {
            const aTime = a.id || 0;
            const bTime = b.id || 0;
            return bTime - aTime;
          })[0];
        if (latest) {
          set({ currentAdventure: latest });
        }
      }
    } catch (err) {
      console.error('恢复冒险状态失败:', err);
    }
  },

  setCurrentTrainer: (trainer: Trainer | null) => {
    set({ currentTrainer: trainer });
    // 同时保存到数据库（更新现有训练师）
    if (trainer && trainer.id) {
      db.trainers.update(trainer.id, { ...trainer }).catch(err => console.error('更新训练师失败:', err));
    }
  },

  setWildMonster: (monster: Monster | null) =>
    set({ wildMonster: monster }),

  setBattleState: (partial: Partial<BattleState>) =>
    set((state) => ({
      battleState: { ...state.battleState, ...partial },
    })),

  setCurrentAdventure: (adventure: Adventure | null) => {
    set({ currentAdventure: adventure });
    // 同时保存到数据库
    if (adventure) {
      db.adventures.put(adventure).catch(err => console.error('保存冒险状态失败:', err));
    }
  },

  startBattle: (playerMonster: Monster, enemyMonster: Monster) =>
    set({
      battleState: {
        isActive: true,
        playerMonster,
        enemyMonster,
        turn: 'player',
        log: ['战斗开始！'],
      },
    }),

  endBattle: () =>
    set({
      battleState: initialBattleState,
    }),

  // 扩展对战状态
  setExtendedBattleState: (partial: Partial<ExtendedBattleState>) =>
    set((state) => ({
      extendedBattleState: { ...state.extendedBattleState, ...partial },
    })),

  startBattleExtended: (playerMonster: Monster, enemyMonster: Monster, playerTeam?: Monster[], isPVP?: boolean) => {
    const firstTurn = determineFirstTurn(playerMonster, enemyMonster);
    const team = playerTeam && playerTeam.length > 0 ? playerTeam : [playerMonster];
    const activeIndex = team.findIndex(m => m.id === playerMonster.id);
    set({
      extendedBattleState: {
        ...initialBattleState,
        isActive: true,
        playerMonster,
        enemyMonster,
        turn: firstTurn,
        log: [
          `战斗开始！${playerMonster.name} VS ${enemyMonster.name}！`,
          firstTurn === 'player' ? '你先手！' : '敌人先手！',
        ],
        playerCurrentHp: playerMonster.hp,
        enemyCurrentHp: enemyMonster.hp,
        playerTeam: team,
        activePlayerIndex: activeIndex >= 0 ? activeIndex : 0,
        isPVP: isPVP || false,
      },
    });
  },

  executePlayerTurn: (skillIndex: number) => {
    const state = get().extendedBattleState;
    if (!state.isActive || state.isOver || state.turn !== 'player') return null;

    const player = state.playerMonster!;
    const enemy = state.enemyMonster!;
    const skill = player.skills[skillIndex];

    if (!skill) return null;

    const statusStart = resolveStatusesAtTurnStart(state.playerStatuses, state.playerCurrentHp, player.name);
    if (statusStart.nextHp <= 0 || statusStart.shouldSkip) {
      const newLog = [...state.log, ...statusStart.messages];
      if (statusStart.nextHp <= 0) {
        newLog.push(`${player.name} 倒下了！`);
      }
      set((s) => ({
        extendedBattleState: {
          ...s.extendedBattleState,
          playerCurrentHp: statusStart.nextHp,
          playerStatuses: statusStart.nextStatuses,
          log: newLog,
          turn: statusStart.nextHp <= 0 ? s.extendedBattleState.turn : 'enemy',
        },
      }));
      return {
        attacker: 'player',
        damageResult: noActionResult(statusStart.messages[statusStart.messages.length - 1] || `${player.name}没能行动。`),
        targetHp: state.enemyCurrentHp,
        statusDamage: statusStart.statusDamage,
      };
    }

    const damageResult = calculateDamage(player, enemy, skill);
    const newEnemyHp = Math.max(0, state.enemyCurrentHp - damageResult.damage);

    let nextEnemyStatuses = state.enemyStatuses;
    const newLog = [...state.log, ...statusStart.messages, damageResult.logMessage];
    if (!damageResult.isMiss && damageResult.effectiveness > 0 && damageResult.damage > 0) {
      const newStatus = rollSkillStatus(skill);
      if (newStatus) {
        nextEnemyStatuses = mergeStatus(nextEnemyStatuses, newStatus);
        const config = getBattleStatusConfig(newStatus.type);
        newLog.push(`${config.emoji} ${enemy.name}进入${config.name}状态，持续 ${newStatus.turnsRemaining} 回合！`);
      }
    }
    if (newEnemyHp <= 0) {
      newLog.push(`${enemy.name} 倒下了！`);
    }

    set((s) => ({
      extendedBattleState: {
        ...s.extendedBattleState,
        playerCurrentHp: statusStart.nextHp,
        playerStatuses: statusStart.nextStatuses,
        enemyCurrentHp: newEnemyHp,
        enemyStatuses: nextEnemyStatuses,
        log: newLog,
        lastDamageResult: damageResult,
        turn: newEnemyHp <= 0 ? s.extendedBattleState.turn : 'enemy',
      },
    }));

    return {
      attacker: 'player',
      damageResult,
      targetHp: newEnemyHp,
      statusDamage: statusStart.statusDamage,
    };
  },

  // 切换宝可梦
  switchPlayerMonster: (monsterIndex: number) => {
    const state = get().extendedBattleState;
    if (!state.isActive || state.isOver) return false;
    if (monsterIndex < 0 || monsterIndex >= state.playerTeam.length) return false;
    if (monsterIndex === state.activePlayerIndex) return false;

    const newMonster = state.playerTeam[monsterIndex];
    if (!newMonster) return false;

    // 检查是否疲劳
    if (newMonster.fatigueEndTime && new Date() < newMonster.fatigueEndTime) {
      return false;
    }

    const newLog = [...state.log, `召回 ${state.playerMonster!.name}，派出 ${newMonster.name}！`];

    set((s) => ({
      extendedBattleState: {
        ...s.extendedBattleState,
        playerMonster: newMonster,
        playerCurrentHp: newMonster.hp,
        playerStatuses: [],
        activePlayerIndex: monsterIndex,
        log: newLog,
        turn: 'enemy', // 替换消耗一回合
      },
    }));

    return true;
  },

  executeEnemyTurn: () => {
    const state = get().extendedBattleState;
    if (!state.isActive || state.isOver || state.turn !== 'enemy') return null;

    const player = state.playerMonster!;
    const enemy = state.enemyMonster!;

    const statusStart = resolveStatusesAtTurnStart(state.enemyStatuses, state.enemyCurrentHp, enemy.name);
    if (statusStart.nextHp <= 0 || statusStart.shouldSkip) {
      const newLog = [...state.log, ...statusStart.messages];
      if (statusStart.nextHp <= 0) {
        newLog.push(`${enemy.name} 倒下了！`);
      }
      set((s) => ({
        extendedBattleState: {
          ...s.extendedBattleState,
          enemyCurrentHp: statusStart.nextHp,
          enemyStatuses: statusStart.nextStatuses,
          log: newLog,
          turn: statusStart.nextHp <= 0 ? s.extendedBattleState.turn : 'player',
          turnCount: s.extendedBattleState.turnCount + 1,
        },
      }));
      return {
        attacker: 'enemy',
        damageResult: noActionResult(statusStart.messages[statusStart.messages.length - 1] || `${enemy.name}没能行动。`),
        targetHp: state.playerCurrentHp,
        statusDamage: statusStart.statusDamage,
      };
    }

    // AI：随机选择一个技能
    const skillIndex = Math.floor(Math.random() * enemy.skills.length);
    const skill = enemy.skills[skillIndex];

    const damageResult = calculateDamage(enemy, player, skill);
    const newPlayerHp = Math.max(0, state.playerCurrentHp - damageResult.damage);

    let nextPlayerStatuses = state.playerStatuses;
    const newLog = [...state.log, ...statusStart.messages, damageResult.logMessage];
    if (!damageResult.isMiss && damageResult.effectiveness > 0 && damageResult.damage > 0) {
      const newStatus = rollSkillStatus(skill);
      if (newStatus) {
        nextPlayerStatuses = mergeStatus(nextPlayerStatuses, newStatus);
        const config = getBattleStatusConfig(newStatus.type);
        newLog.push(`${config.emoji} ${player.name}进入${config.name}状态，持续 ${newStatus.turnsRemaining} 回合！`);
      }
    }
    if (newPlayerHp <= 0) {
      newLog.push(`${player.name} 倒下了！`);
    }

    set((s) => ({
      extendedBattleState: {
        ...s.extendedBattleState,
        enemyCurrentHp: statusStart.nextHp,
        enemyStatuses: statusStart.nextStatuses,
        playerCurrentHp: newPlayerHp,
        playerStatuses: nextPlayerStatuses,
        log: newLog,
        lastDamageResult: damageResult,
        turn: newPlayerHp <= 0 ? s.extendedBattleState.turn : 'player',
        turnCount: s.extendedBattleState.turnCount + 1,
      },
    }));

    return {
      attacker: 'enemy',
      damageResult,
      targetHp: newPlayerHp,
      statusDamage: statusStart.statusDamage,
    };
  },

  checkBattleEnd: () => {
    const state = get().extendedBattleState;
    if (!state.isActive || state.isOver) return false;

    if (state.enemyCurrentHp <= 0) {
      const exp = calculateExpGain(state.enemyMonster!);
      const newLog = [...state.log, `战斗胜利！获得 ${exp} 点经验！`];

      let leveledUp = false;
      const player = state.playerMonster!;
      const newExp = player.exp + exp;
      const expToNext = getExpToNextLevel(player.level);

      if (newExp >= expToNext) {
        leveledUp = true;
        newLog.push(`${player.name} 升级了！现在是 ${player.level + 1} 级！`);
      }

      set((s) => ({
        extendedBattleState: {
          ...s.extendedBattleState,
          isOver: true,
          winner: 'player',
          log: newLog,
          expGained: exp,
          leveledUp,
        },
      }));
      return true;
    }

    if (state.playerCurrentHp <= 0) {
      const newLog = [...state.log, `${state.playerMonster!.name} 需要休息...`];
      
      // 检查是否还有可战斗的宝可梦
      const availableTeam = state.playerTeam.filter((m, i) => {
        if (i === state.activePlayerIndex) return false;
        if (m.fatigueEndTime && new Date() < m.fatigueEndTime) return false;
        return m.hp > 0;
      });

      if (availableTeam.length > 0) {
        // 自动切换到下一只可用宝可梦
        const nextMonster = availableTeam[0];
        const nextIndex = state.playerTeam.findIndex(m => m.id === nextMonster.id);
        newLog.push(`自动派出 ${nextMonster.name}！`);
        
        set((s) => ({
          extendedBattleState: {
            ...s.extendedBattleState,
            playerMonster: nextMonster,
            playerCurrentHp: nextMonster.hp,
            playerStatuses: [],
            activePlayerIndex: nextIndex >= 0 ? nextIndex : 0,
            log: newLog,
            turn: 'player',
          },
        }));
        return false; // 战斗继续
      }

      // 所有宝可梦都倒下了，战斗结束
      newLog.push('所有宝可梦都需要休息...');
      
      // PVP模式下设置疲劳
      if (state.isPVP) {
        const fatigueEnd = new Date(Date.now() + 3 * 60 * 1000); // 3分钟疲劳
        // 这里应该更新数据库中的疲劳时间
      }

      set((s) => ({
        extendedBattleState: {
          ...s.extendedBattleState,
          isOver: true,
          winner: 'enemy',
          log: newLog,
        },
      }));
      return true;
    }

    return false;
  },

  endBattleExtended: () => {
    set({
      extendedBattleState: initialBattleState,
    });
  },
}));
