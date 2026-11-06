import type { BattleStatus, GymChallenge, GymRosterMember, GymSwitchRule, Monster, Skill } from '../types';
import { calculateDamage, getBattleStatusConfig, rollSkillStatus } from './battleEngine';

export interface GymBattleUnit {
  unitId: string;
  monster: Monster;
  currentHp: number;
  statuses: BattleStatus[];
  guardHits: number;
}

export interface GymBattleState {
  format: 1 | 2 | 3;
  switchRule: GymSwitchRule;
  round: number;
  playerField: GymBattleUnit[];
  playerBench: GymBattleUnit[];
  enemyField: GymBattleUnit[];
  enemyBench: GymBattleUnit[];
  log: string[];
  /** Visual feedback emitted by the most recently resolved round. */
  lastRoundEffects: GymBattleEffect[];
  winner: 'player' | 'enemy' | null;
}

export interface GymBattleEffect {
  attacker: 'player' | 'enemy';
  actorId: string;
  targetId: string;
  skill: Skill;
  didHit: boolean;
  isCritical: boolean;
  damage: number;
}

export type GymTurnAction =
  | { type: 'skill'; actorId: string; targetId: string; skillIndex: number }
  | { type: 'switch'; actorId: string; benchId: string };

function unitId(side: 'player' | 'enemy', index: number, monster: Monster | GymRosterMember) {
  if ('monster' in monster) return `enemy-${monster.id}`;
  return `${side}-${monster.id ?? monster.name}-${index}`;
}

function createUnit(side: 'player' | 'enemy', monster: Monster, index: number, source?: GymRosterMember): GymBattleUnit {
  return {
    unitId: source ? unitId('enemy', index, source) : unitId(side, index, monster),
    monster,
    currentHp: monster.maxHp ?? monster.hp,
    statuses: [],
    guardHits: 0,
  };
}

export function createGymBattleState(
  challenge: GymChallenge,
  playerMonsters: Monster[],
  opponentRoster: GymRosterMember[],
): GymBattleState {
  const playerOrder = challenge.playerIds
    .map((id) => playerMonsters.find((monster) => monster.id === id))
    .filter((monster): monster is Monster => Boolean(monster));
  const enemies = challenge.opponentIds
    .map((id) => opponentRoster.find((member) => member.id === id))
    .filter((member): member is GymRosterMember => Boolean(member));
  const format = Math.min(challenge.format, playerOrder.length, enemies.length) as 1 | 2 | 3;
  if (format < 1) throw new Error('道馆挑战缺少可出战的伙伴');

  const playerUnits = playerOrder.map((monster, index) => createUnit('player', monster, index));
  const enemyUnits = enemies.map((member, index) => createUnit('enemy', member.monster, index, member));
  return {
    format,
    switchRule: challenge.switchRule,
    round: 1,
    playerField: playerUnits.slice(0, format),
    playerBench: playerUnits.slice(format),
    enemyField: enemyUnits.slice(0, format),
    enemyBench: enemyUnits.slice(format),
    log: [`${format} 对 ${format} 道馆战开始！双方伙伴同时上场。`],
    lastRoundEffects: [],
    winner: null,
  };
}

function cloneState(state: GymBattleState): GymBattleState {
  const cloneUnit = (unit: GymBattleUnit): GymBattleUnit => ({ ...unit, statuses: unit.statuses.map((status) => ({ ...status })) });
  return {
    ...state,
    playerField: state.playerField.map(cloneUnit),
    playerBench: state.playerBench.map(cloneUnit),
    enemyField: state.enemyField.map(cloneUnit),
    enemyBench: state.enemyBench.map(cloneUnit),
    log: [...state.log],
    lastRoundEffects: [],
  };
}

function living(units: GymBattleUnit[]) {
  return units.filter((unit) => unit.currentHp > 0);
}

function findUnit(state: GymBattleState, unitId: string) {
  const all = [...state.playerField, ...state.playerBench, ...state.enemyField, ...state.enemyBench];
  return all.find((unit) => unit.unitId === unitId);
}

function getSide(state: GymBattleState, unitId: string) {
  if (state.playerField.some((unit) => unit.unitId === unitId) || state.playerBench.some((unit) => unit.unitId === unitId)) return 'player' as const;
  if (state.enemyField.some((unit) => unit.unitId === unitId) || state.enemyBench.some((unit) => unit.unitId === unitId)) return 'enemy' as const;
  return null;
}

function lowestHpTarget(units: GymBattleUnit[]) {
  return living(units).sort((a, b) => a.currentHp - b.currentHp)[0];
}

function mergeStatus(statuses: BattleStatus[], incoming: BattleStatus) {
  const existing = statuses.find((status) => status.type === incoming.type);
  if (!existing) return [...statuses, incoming];
  return statuses.map((status) => status.type === incoming.type
    ? { ...incoming, turnsRemaining: Math.max(status.turnsRemaining, incoming.turnsRemaining) }
    : status);
}

function resolveUnitStatuses(unit: GymBattleUnit, log: string[]) {
  let skip = false;
  unit.statuses = unit.statuses.flatMap((status) => {
    const config = getBattleStatusConfig(status.type);
    if (status.damagePerTurn) {
      const damage = Math.min(unit.currentHp, status.damagePerTurn);
      unit.currentHp = Math.max(0, unit.currentHp - damage);
      log.push(`${config.emoji} ${unit.monster.name}受到${config.name}影响，损失 ${damage} 点 HP。`);
    }
    if (status.skipChance && Math.random() < status.skipChance) {
      skip = true;
      log.push(`${config.emoji} ${unit.monster.name}因${config.name}无法行动。`);
    }
    const turnsRemaining = status.turnsRemaining - 1;
    if (turnsRemaining > 0) return [{ ...status, turnsRemaining }];
    log.push(`${unit.monster.name}的${config.name}状态消失了。`);
    return [];
  });
  return skip || unit.currentHp <= 0;
}

function replaceDefeated(state: GymBattleState, side: 'player' | 'enemy') {
  const fieldKey = side === 'player' ? 'playerField' : 'enemyField';
  const benchKey = side === 'player' ? 'playerBench' : 'enemyBench';
  const field = state[fieldKey];
  const bench = state[benchKey];
  const nextField = field.filter((unit) => unit.currentHp > 0);
  const nextBench = bench.filter((unit) => unit.currentHp > 0);
  while (nextField.length < state.format && nextBench.length > 0) {
    const replacement = nextBench.shift()!;
    nextField.push(replacement);
    state.log.push(`↪ ${side === 'player' ? '你' : '馆主'}派出 ${replacement.monster.name} 接替战斗！`);
  }
  state[fieldKey] = nextField;
  state[benchKey] = nextBench;
}

export function buildGymEnemyActions(state: GymBattleState): GymTurnAction[] {
  return living(state.enemyField).flatMap((enemy) => {
    const target = lowestHpTarget(state.playerField);
    if (!target || enemy.monster.skills.length === 0) return [];
    const bestIndex = enemy.monster.skills.reduce((best, skill, index, skills) =>
      skill.power > skills[best].power ? index : best, 0);
    return [{ type: 'skill' as const, actorId: enemy.unitId, targetId: target.unitId, skillIndex: bestIndex }];
  });
}

function applySwitch(state: GymBattleState, action: Extract<GymTurnAction, { type: 'switch' }>) {
  if (state.switchRule !== 'free') return false;
  const fieldIndex = state.playerField.findIndex((unit) => unit.unitId === action.actorId);
  const benchIndex = state.playerBench.findIndex((unit) => unit.unitId === action.benchId && unit.currentHp > 0);
  if (fieldIndex < 0 || benchIndex < 0) return false;
  const outgoing = state.playerField[fieldIndex];
  const incoming = state.playerBench[benchIndex];
  incoming.guardHits = 1;
  state.playerField[fieldIndex] = incoming;
  state.playerBench[benchIndex] = outgoing;
  state.log.push(`🔄 ${outgoing.monster.name}回到替补区，${incoming.monster.name}上场并获得首回合减伤！`);
  return true;
}

function getSkill(actor: GymBattleUnit, action: Extract<GymTurnAction, { type: 'skill' }>): Skill | null {
  return actor.monster.skills[action.skillIndex] ?? null;
}

export function resolveGymRound(state: GymBattleState, playerActions: GymTurnAction[]): GymBattleState {
  const next = cloneState(state);
  if (next.winner) return next;
  const allActions = [...playerActions, ...buildGymEnemyActions(next)];
  const ordered = allActions
    .map((action) => ({ action, actor: findUnit(next, action.actorId) }))
    .filter((entry): entry is { action: GymTurnAction; actor: GymBattleUnit } => Boolean(entry.actor && entry.actor.currentHp > 0))
    .sort((a, b) => b.actor.monster.speed - a.actor.monster.speed);

  const statusResolved = new Set<string>();
  ordered.forEach(({ action, actor }) => {
    if (next.winner || actor.currentHp <= 0) return;
    if (!statusResolved.has(actor.unitId)) {
      statusResolved.add(actor.unitId);
      if (resolveUnitStatuses(actor, next.log)) return;
    }
    if (action.type === 'switch') {
      applySwitch(next, action);
      return;
    }
    const side = getSide(next, actor.unitId);
    if (!side) return;
    const targetField = side === 'player' ? next.enemyField : next.playerField;
    const requestedTarget = targetField.find((unit) => unit.unitId === action.targetId && unit.currentHp > 0);
    const target = requestedTarget ?? lowestHpTarget(targetField);
    const skill = getSkill(actor, action);
    if (!target || !skill) return;
    let result = calculateDamage(actor.monster, target.monster, skill);
    if (target.guardHits > 0 && result.damage > 0) {
      result = { ...result, damage: Math.max(1, Math.round(result.damage * 0.7)), logMessage: `${result.logMessage} 🛡️ 换入减伤生效！` };
      target.guardHits -= 1;
    }
    target.currentHp = Math.max(0, target.currentHp - result.damage);
    next.lastRoundEffects.push({
      attacker: side,
      actorId: actor.unitId,
      targetId: target.unitId,
      skill,
      didHit: !result.isMiss && result.effectiveness > 0 && result.damage > 0,
      isCritical: result.isCritical,
      damage: result.damage,
    });
    next.log.push(result.logMessage);
    if (!result.isMiss && result.damage > 0 && result.effectiveness > 0) {
      const status = rollSkillStatus(skill);
      if (status) {
        target.statuses = mergeStatus(target.statuses, status);
        next.log.push(`${getBattleStatusConfig(status.type).emoji} ${target.monster.name}进入${getBattleStatusConfig(status.type).name}状态！`);
      }
    }
    if (target.currentHp <= 0) next.log.push(`💫 ${target.monster.name}失去战斗能力！`);
  });

  replaceDefeated(next, 'player');
  replaceDefeated(next, 'enemy');
  if (living(next.enemyField).length === 0 && living(next.enemyBench).length === 0) next.winner = 'player';
  if (living(next.playerField).length === 0 && living(next.playerBench).length === 0) next.winner = 'enemy';
  if (next.winner === 'player') next.log.push('🏅 馆主的全部伙伴都失去战斗能力，你获胜了！');
  if (next.winner === 'enemy') next.log.push('💤 你的出战伙伴都需要休息，这次挑战结束。');
  next.round += 1;
  return next;
}
