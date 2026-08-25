import { create } from 'zustand';
import type { BattleStatus, GameState, Monster, BattleState, Trainer, Adventure, Skill } from '../types';
import {
  calculateDamage,
  determineFirstTurn,
  calculateExpGain,
  getExpToNextLevel,
  levelUp,
  getBattleStatusConfig,
  getSkillStatusConfig,
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
  skill?: Skill;
}

export type EnemyIntentKind = 'attack' | 'charge' | 'shield' | 'status';

export interface EnemyIntent {
  kind: EnemyIntentKind;
  skillIndex: number;
  emoji: string;
  label: string;
  description: string;
}

export type PartnerActionKind = 'burst' | 'interrupt' | 'rescue';

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
  isBoss?: boolean;
  enemyIntent?: EnemyIntent | null;
  enemyIntentCountered?: boolean;
  /** A switched-in partner is protected from the next enemy hit. */
  playerGuardTurns?: number;
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
  isBoss: false,
  enemyIntent: null,
  enemyIntentCountered: false,
  playerGuardTurns: 0,
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

function getEnemyIntent(enemy: Monster, turnCount: number, isBoss: boolean): EnemyIntent {
  const statusSkillIndex = enemy.skills.findIndex((skill) => Boolean(getSkillStatusConfig(skill)));
  const strongestSkillIndex = enemy.skills.reduce(
    (bestIndex, skill, index, skills) => skill.power > skills[bestIndex].power ? index : bestIndex,
    0
  );
  const basicSkillIndex = enemy.skills.length ? turnCount % enemy.skills.length : 0;

  if (isBoss) {
    const phase = turnCount % 3;
    if (phase === 0) {
      return {
        kind: 'charge', skillIndex: strongestSkillIndex, emoji: '⚡', label: '正在蓄力',
        description: '用克制攻击命中，就能打断它的大招！',
      };
    }
    if (phase === 1) {
      return {
        kind: 'shield', skillIndex: basicSkillIndex, emoji: '🛡️', label: '撑起护盾',
        description: '普通攻击会变弱，用克制技能可以破盾。',
      };
    }
    if (statusSkillIndex >= 0) {
      return {
        kind: 'status', skillIndex: statusSkillIndex, emoji: '🌫️', label: '准备特殊招式',
        description: '它想给伙伴添麻烦，快先想好对策！',
      };
    }
  }

  if (statusSkillIndex >= 0 && turnCount % 3 === 2) {
    return {
      kind: 'status', skillIndex: statusSkillIndex, emoji: '✨', label: '准备特殊招式',
      description: '这招可能会带来状态效果。',
    };
  }

  return {
    kind: 'attack', skillIndex: basicSkillIndex, emoji: '👀', label: '准备攻击',
    description: '观察它的属性，选一个合适的技能吧。',
  };
}

function scaleDamage(result: DamageResult, multiplier: number, suffix: string): DamageResult {
  if (result.damage <= 0) return result;
  const damage = Math.max(1, Math.min(36, Math.round(result.damage * multiplier)));
  return { ...result, damage, logMessage: `${result.logMessage} ${suffix}` };
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
  startBattleExtended: (playerMonster: Monster, enemyMonster: Monster, playerTeam?: Monster[], isPVP?: boolean, isBoss?: boolean) => void;
  executePlayerTurn: (skillIndex: number) => BattleTurnResult | null;
  executeEnemyTurn: () => BattleTurnResult | null;
  checkBattleEnd: () => boolean;
  endBattleExtended: () => void;
  switchPlayerMonster: (monsterIndex: number) => boolean;
  performPartnerAction: (kind: PartnerActionKind) => BattleTurnResult | null;
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
      const trainerId = get().currentTrainer?.id;
      const adventures = trainerId === undefined
        ? await db.adventures.filter((adventure) => adventure.trainerId === undefined).toArray()
        : await db.adventures.where('trainerId').equals(trainerId).toArray();
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
    const previousTrainerId = get().currentTrainer?.id;
    const nextTrainerId = trainer?.id;
    set({
      currentTrainer: trainer,
      currentAdventure: previousTrainerId === nextTrainerId ? get().currentAdventure : null,
    });
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
    const trainerId = get().currentTrainer?.id;
    const scopedAdventure = adventure && trainerId !== undefined
      ? { ...adventure, trainerId }
      : adventure;
    set({ currentAdventure: scopedAdventure });
    // 同时保存到数据库
    if (scopedAdventure) {
      db.adventures.put(scopedAdventure).catch(err => console.error('保存冒险状态失败:', err));
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

  startBattleExtended: (playerMonster: Monster, enemyMonster: Monster, playerTeam?: Monster[], isPVP?: boolean, isBoss = false) => {
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
        isBoss,
        enemyIntent: getEnemyIntent(enemyMonster, 0, isBoss),
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
          playerTeam: s.extendedBattleState.playerTeam.map((monster, index) =>
            index === s.extendedBattleState.activePlayerIndex ? { ...monster, hp: statusStart.nextHp } : monster
          ),
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

    let damageResult = calculateDamage(player, enemy, skill);
    let enemyIntentCountered = state.enemyIntentCountered;
    const intentLog: string[] = [];
    if (!damageResult.isMiss && damageResult.damage > 0 && state.enemyIntent) {
      if (state.enemyIntent.kind === 'shield' && damageResult.effectiveness <= 1) {
        damageResult = scaleDamage(damageResult, 0.5, '🛡️ 护盾挡住了部分伤害！');
      } else if (state.enemyIntent.kind === 'shield' && damageResult.effectiveness > 1) {
        intentLog.push(`💥 ${enemy.name}的护盾被克制攻击打碎了！`);
      }
      if (state.enemyIntent.kind === 'charge' && damageResult.effectiveness > 1) {
        enemyIntentCountered = true;
        intentLog.push(`⚡ ${enemy.name}的蓄力被打断了！`);
      }
    }
    const newEnemyHp = Math.max(0, state.enemyCurrentHp - damageResult.damage);

    let nextEnemyStatuses = state.enemyStatuses;
    const newLog = [...state.log, ...statusStart.messages, damageResult.logMessage, ...intentLog];
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
        playerTeam: s.extendedBattleState.playerTeam.map((monster, index) =>
          index === s.extendedBattleState.activePlayerIndex ? { ...monster, hp: statusStart.nextHp } : monster
        ),
        playerStatuses: statusStart.nextStatuses,
        enemyCurrentHp: newEnemyHp,
        enemyStatuses: nextEnemyStatuses,
        log: newLog,
        lastDamageResult: damageResult,
        enemyIntentCountered,
        turn: newEnemyHp <= 0 ? s.extendedBattleState.turn : 'enemy',
      },
    }));

    return {
      attacker: 'player',
      damageResult,
      targetHp: newEnemyHp,
      statusDamage: statusStart.statusDamage,
      skill,
    };
  },

  // 切换宝可梦
  switchPlayerMonster: (monsterIndex: number) => {
    const state = get().extendedBattleState;
    if (!state.isActive || state.isOver || state.turn !== 'player') return false;
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
        playerGuardTurns: 1,
        log: newLog,
        turn: 'enemy', // 替换消耗一回合
      },
    }));

    return true;
  },

  performPartnerAction: (kind: PartnerActionKind) => {
    const state = get().extendedBattleState;
    if (!state.isActive || state.isOver || state.turn !== 'player') return null;

    const player = state.playerMonster!;
    const enemy = state.enemyMonster!;
    let nextEnemyHp = state.enemyCurrentHp;
    let nextPlayerStatuses = state.playerStatuses;
    let playerGuardTurns = state.playerGuardTurns ?? 0;
    let enemyIntentCountered = state.enemyIntentCountered ?? false;
    let message: string;
    let result = noActionResult('');

    if (kind === 'burst') {
      const damage = Math.min(18, nextEnemyHp);
      nextEnemyHp = Math.max(0, nextEnemyHp - damage);
      message = `✨ ${createPartnerMoveName(player)}爆发伙伴能量，造成 ${damage} 点伤害！`;
      result = { ...noActionResult(message), damage };
    } else if (kind === 'interrupt') {
      enemyIntentCountered = true;
      message = `🛑 ${player.name}用伙伴默契打乱了${enemy.name}的节奏！`;
      result = noActionResult(message);
    } else {
      nextPlayerStatuses = [];
      playerGuardTurns = 1;
      message = `💞 ${player.name}得到伙伴鼓励，解除了状态并做好防守！`;
      result = noActionResult(message);
    }

    if (nextEnemyHp <= 0) message += ` ${enemy.name}倒下了！`;
    set((s) => ({
      extendedBattleState: {
        ...s.extendedBattleState,
        enemyCurrentHp: nextEnemyHp,
        playerStatuses: nextPlayerStatuses,
        playerGuardTurns,
        enemyIntentCountered,
        lastDamageResult: result,
        log: [...s.extendedBattleState.log, message],
        turn: nextEnemyHp <= 0 ? s.extendedBattleState.turn : 'enemy',
      },
    }));
    return { attacker: 'player', damageResult: result, targetHp: nextEnemyHp };
  },

  executeEnemyTurn: () => {
    const state = get().extendedBattleState;
    if (!state.isActive || state.isOver || state.turn !== 'enemy') return null;

    const player = state.playerMonster!;
    const enemy = state.enemyMonster!;

    if (state.enemyIntentCountered) {
      const nextTurnCount = state.turnCount + 1;
      const message = `⚡ ${enemy.name}的蓄力被打断，这回合没能出招！`;
      set((s) => ({
        extendedBattleState: {
          ...s.extendedBattleState,
          enemyIntentCountered: false,
          enemyIntent: getEnemyIntent(enemy, nextTurnCount, s.extendedBattleState.isBoss ?? false),
          log: [...s.extendedBattleState.log, message],
          turn: 'player',
          turnCount: nextTurnCount,
        },
      }));
      return {
        attacker: 'enemy',
        damageResult: noActionResult(message),
        targetHp: state.playerCurrentHp,
      };
    }

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
          enemyIntent: getEnemyIntent(enemy, s.extendedBattleState.turnCount + 1, s.extendedBattleState.isBoss ?? false),
        },
      }));
      return {
        attacker: 'enemy',
        damageResult: noActionResult(statusStart.messages[statusStart.messages.length - 1] || `${enemy.name}没能行动。`),
        targetHp: state.playerCurrentHp,
        statusDamage: statusStart.statusDamage,
      };
    }

    // 敌方先展示意图，再按意图使用对应技能；避免完全随机导致无法预判。
    const skillIndex = state.enemyIntent?.skillIndex ?? 0;
    const skill = enemy.skills[skillIndex];

    let damageResult = calculateDamage(enemy, player, skill);
    if (state.enemyIntent?.kind === 'charge' && !damageResult.isMiss) {
      damageResult = scaleDamage(damageResult, 1.35, '⚡ 蓄力攻击爆发了！');
    }
    if ((state.playerGuardTurns ?? 0) > 0 && !damageResult.isMiss) {
      damageResult = scaleDamage(damageResult, 0.7, '🛡️ 换人保护挡住了一部分伤害！');
    }
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
        playerTeam: s.extendedBattleState.playerTeam.map((monster, index) =>
          index === s.extendedBattleState.activePlayerIndex ? { ...monster, hp: newPlayerHp } : monster
        ),
        playerStatuses: nextPlayerStatuses,
        log: newLog,
        lastDamageResult: damageResult,
        turn: newPlayerHp <= 0 ? s.extendedBattleState.turn : 'player',
        turnCount: s.extendedBattleState.turnCount + 1,
        enemyIntent: getEnemyIntent(enemy, s.extendedBattleState.turnCount + 1, s.extendedBattleState.isBoss ?? false),
        enemyIntentCountered: false,
        playerGuardTurns: 0,
      },
    }));

    return {
      attacker: 'enemy',
      damageResult,
      targetHp: newPlayerHp,
      statusDamage: statusStart.statusDamage,
      skill,
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

function createPartnerMoveName(monster: Monster): string {
  const strongest = [...monster.skills].sort((a, b) => b.power - a.power)[0];
  return strongest?.name ? `${monster.name}的${strongest.name}` : `${monster.name}的伙伴大招`;
}
