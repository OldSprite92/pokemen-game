import { create } from 'zustand';
import type { GameState, Monster, BattleState, Trainer, Adventure } from '../types';
import { calculateDamage, determineFirstTurn, calculateExpGain, getExpToNextLevel, levelUp } from '../game/battleEngine';
import type { DamageResult } from '../game/battleEngine';

export interface BattleAction {
  type: 'skill' | 'escape' | 'item' | 'switch';
  skillIndex?: number;
  switchMonsterId?: number;
}

export interface BattleTurnResult {
  attacker: 'player' | 'enemy';
  damageResult: DamageResult;
  targetHp: number;
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
};

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
}

export const useGameStore = create<ExtendedGameState>((set, get) => ({
  currentTrainer: null,
  battleState: initialBattleState,
  extendedBattleState: initialBattleState,
  currentAdventure: null,
  wildMonster: null,

  setCurrentTrainer: (trainer: Trainer | null) =>
    set({ currentTrainer: trainer }),

  setWildMonster: (monster: Monster | null) =>
    set({ wildMonster: monster }),

  setBattleState: (partial: Partial<BattleState>) =>
    set((state) => ({
      battleState: { ...state.battleState, ...partial },
    })),

  setCurrentAdventure: (adventure: Adventure | null) =>
    set({ currentAdventure: adventure }),

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

    const damageResult = calculateDamage(player, enemy, skill);
    const newEnemyHp = Math.max(0, state.enemyCurrentHp - damageResult.damage);

    const newLog = [...state.log, damageResult.logMessage];
    if (newEnemyHp <= 0) {
      newLog.push(`${enemy.name} 倒下了！`);
    }

    set((s) => ({
      extendedBattleState: {
        ...s.extendedBattleState,
        enemyCurrentHp: newEnemyHp,
        log: newLog,
        lastDamageResult: damageResult,
        turn: newEnemyHp <= 0 ? s.extendedBattleState.turn : 'enemy',
      },
    }));

    return {
      attacker: 'player',
      damageResult,
      targetHp: newEnemyHp,
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

    // AI：随机选择一个技能
    const skillIndex = Math.floor(Math.random() * enemy.skills.length);
    const skill = enemy.skills[skillIndex];

    const damageResult = calculateDamage(enemy, player, skill);
    const newPlayerHp = Math.max(0, state.playerCurrentHp - damageResult.damage);

    const newLog = [...state.log, damageResult.logMessage];
    if (newPlayerHp <= 0) {
      newLog.push(`${player.name} 倒下了！`);
    }

    set((s) => ({
      extendedBattleState: {
        ...s.extendedBattleState,
        playerCurrentHp: newPlayerHp,
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
