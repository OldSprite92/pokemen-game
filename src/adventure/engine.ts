import {
  AREAS,
  SPECIES,
  STARTERS,
  effectiveness,
  type AreaId,
  type Element,
} from "./data";
import { SPECIES_STATS } from "./species-stats";
import {
  MAIN_AREAS,
  BOSS_TEAMS,
  BALLS,
  BALL_IDS,
  DISCS,
  DISC_MOVES,
  STATUS_NAMES,
  movesFor,
  trainersFor,
  ballMultiplier,
  canLearn,
  type Status,
  type BallId,
  type JourneyMove,
} from "./journey";
export type { AreaId, Species, Element } from "./data";
export type PokemonType = Element;

export interface Creature {
  id: string;
  speciesId: number;
  level: number;
  xp: number;
  hp: number;
  status?: Status;
  confusion?: number;
  learned?: string[];
}
export interface JourneyProgress {
  coins: number;
  fragments: string[];
  trainers: string[];
  balls: Record<BallId, number>;
  discs: string[];
  food: number;
  tickets: number;
  route: number;
  signs: string[];
  wins: Record<string, number>;
  campReturn?: AreaId;
}
export function newProgress(): JourneyProgress {
  return {
    coins: 200,
    fragments: [],
    trainers: [],
    balls: {
      poke: 10,
      great: 0,
      ultra: 0,
      quick: 0,
      dusk: 0,
      net: 0,
      timer: 0,
      level: 0,
      master: 0,
    },
    discs: [],
    food: 2,
    tickets: 0,
    route: 0,
    signs: [],
    wins: {},
  };
}
export function progress(state: GameState): JourneyProgress {
  return state.journey || newProgress();
}
export interface Battle {
  id: string;
  kind: "wild" | "boss" | "trainer";
  area: AreaId;
  enemy: Creature;
  activeId: string;
  turn: number;
  catchReady: boolean;
  failedReadyCatches: number;
  status: "active" | "won" | "caught" | "lost";
  rewardClaimed: boolean;
  caughtId?: string;
  newBadge?: boolean;
  trainerId?: string;
  remaining?: Creature[];
  rewardCoins?: number;
}
export type EventKind =
  | "encounter"
  | "attack"
  | "damage"
  | "catch-success"
  | "catch-fail"
  | "level-up"
  | "win"
  | "loss"
  | "switch"
  | "heal"
  | "evolve"
  | "message";
export interface GameEvent {
  kind: EventKind;
  message: string;
  speciesId?: number;
  creatureId?: string;
  damage?: number;
  actor?: "player" | "enemy" | "system";
  moveName?: string;
  moveType?: Element;
}
export interface GameState {
  version: 2;
  roster: Creature[];
  teamIds: string[];
  leaderId: string;
  area: AreaId;
  seen: number[];
  caughtSpeciesIds: number[];
  badges: string[];
  berries: number;
  tutorialCaptured: boolean;
  encounters: number;
  settings: { reducedMotion: boolean };
  battle: Battle | null;
  events: GameEvent[];
  revision: number;
  nextCreatureId: number;
  journey?: JourneyProgress;
}
export type GameAction =
  | { type: "travel"; area: AreaId }
  | {
      type: "encounter";
      speciesId?: number;
      boss?: boolean;
      trainerId?: string;
    }
  | { type: "attack"; moveIndex: number }
  | { type: "catch"; ball?: BallId }
  | { type: "route"; index: number }
  | { type: "sign" }
  | { type: "buy"; item: string }
  | { type: "learn"; creatureId: string; discId: string; slot: number }
  | { type: "food"; creatureId: string }
  | { type: "fly"; area: AreaId }
  | { type: "switch"; creatureId: string }
  | { type: "leave" }
  | { type: "finishBattle" }
  | { type: "heal" }
  | { type: "berry"; creatureId: string }
  | { type: "setLeader"; creatureId: string }
  | { type: "toggleTeam"; creatureId: string }
  | { type: "evolve"; creatureId: string }
  | { type: "settings"; reducedMotion: boolean };

export function maxHp(creature: Creature): number {
  return SPECIES[creature.speciesId].baseHp + creature.level * 6;
}
export function combatStat(
  c: Creature,
  key: "attack" | "defense" | "spAttack" | "spDefense" | "speed",
): number {
  const raw = SPECIES_STATS[c.speciesId];
  return Math.floor(((2 * (raw?.[key] || 50) + 31) * c.level) / 100) + 5;
}
export function typeEffectiveness(type: Element, c: Creature): number {
  return (
    SPECIES_STATS[c.speciesId]?.types || [SPECIES[c.speciesId].type]
  ).reduce((value, t) => value * effectiveness(type, t as Element), 1);
}
export function xpToNext(level: number): number {
  return level * 10;
}
export function getLeader(state: GameState): Creature {
  return state.roster.find((c) => c.id === state.leaderId) ?? state.roster[0];
}
export function canEvolve(creature: Creature): boolean {
  const evolution = SPECIES[creature.speciesId].evolution;
  return !!evolution && creature.level >= evolution.level;
}
export function canTravel(state: GameState, area: AreaId): boolean {
  if (!AREAS[area]) return false;
  if (area === "camp" || area === "meadow") return true;
  if (area === "secret")
    return (
      progress(state).fragments.length >= 3 && state.badges.includes("cave")
    );
  return state.badges.includes(MAIN_AREAS[MAIN_AREAS.indexOf(area) - 1]);
}
export function cityGoal(state: GameState) {
  return {
    field: state.area === "meadow" ? 3 : 5,
    collection: state.area === "meadow" ? 2 : 3,
    caught: AREAS[state.area].speciesIds.filter((id) =>
      state.caughtSpeciesIds.includes(id),
    ).length,
  };
}
export function bossReady(state: GameState): boolean {
  const p = progress(state);
  return (
    state.badges.includes(state.area) ||
    (p.signs.includes(`${state.area}-0`) &&
      p.signs.includes(`${state.area}-1`) &&
      (p.wins[state.area] || 0) >= cityGoal(state).field &&
      cityGoal(state).caught >= cityGoal(state).collection)
  );
}
export function canWalk(state: GameState, area: AreaId): boolean {
  if (!canTravel(state, area)) return false;
  if (area === "camp" || area === state.area) return true;
  if (state.area === "camp")
    return area === (progress(state).campReturn || "meadow");
  if (area === "secret") return state.area === "cave";
  if (state.area === "secret") return area === "cave";
  return (
    Math.abs(MAIN_AREAS.indexOf(area) - MAIN_AREAS.indexOf(state.area)) === 1
  );
}
export function availableSpecies(
  state: GameState,
  area: AreaId = state.area,
): number[] {
  const region = AREAS[area];
  if (!region) return [];
  const pool = [...region.speciesIds];
  if (
    region.bossSpeciesId &&
    state.badges.includes(area) &&
    !pool.includes(region.bossSpeciesId)
  )
    pool.push(region.bossSpeciesId);
  return pool;
}
export function isAdventureComplete(state: GameState): boolean {
  return MAIN_AREAS.every((area) => state.badges.includes(area));
}

export function createGame(starterId: number): GameState {
  const speciesId = STARTERS.includes(starterId as (typeof STARTERS)[number])
    ? starterId
    : STARTERS[0];
  const starter: Creature = {
    id: "partner-1",
    speciesId,
    level: 3,
    xp: 0,
    hp: 1,
  };
  starter.hp = maxHp(starter);
  return {
    version: 2,
    journey: newProgress(),
    roster: [starter],
    teamIds: [starter.id],
    leaderId: starter.id,
    area: "meadow",
    seen: [speciesId],
    caughtSpeciesIds: [speciesId],
    badges: [],
    berries: 3,
    tutorialCaptured: false,
    encounters: 0,
    settings: { reducedMotion: false },
    battle: null,
    events: [
      {
        kind: "message",
        message: "点一点草丛里的宝可梦，一起开始冒险！",
        speciesId,
      },
    ],
    revision: 0,
    nextCreatureId: 2,
  };
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    journey: structuredClone(progress(state)),
    roster: state.roster.map((creature) => ({
      ...creature,
      learned: [...(creature.learned || [])],
    })),
    teamIds: [...state.teamIds],
    seen: [...state.seen],
    caughtSpeciesIds: [...state.caughtSpeciesIds],
    badges: [...state.badges],
    settings: { ...state.settings },
    battle: state.battle
      ? {
          ...state.battle,
          remaining: state.battle.remaining?.map((c) => ({ ...c })),
          enemy: { ...state.battle.enemy },
        }
      : null,
    events: [],
    revision: state.revision + 1,
  };
}
function message(state: GameState, text: string): void {
  state.events.push({ kind: "message", message: text, actor: "system" });
}
function randomValue(rng: () => number): number {
  const value = rng();
  return Number.isFinite(value) ? Math.min(0.999999, Math.max(0, value)) : 0.5;
}
function see(state: GameState, speciesId: number): void {
  if (!state.seen.includes(speciesId)) state.seen.push(speciesId);
}
function rememberCaught(state: GameState, speciesId: number): void {
  if (!state.caughtSpeciesIds.includes(speciesId))
    state.caughtSpeciesIds.push(speciesId);
}
function healEveryone(state: GameState): void {
  state.roster.forEach((c) => {
    c.hp = maxHp(c);
    c.status = undefined;
    c.confusion = 0;
  });
  state.berries = Math.max(3, state.berries);
  if (state.journey)
    state.journey.balls.poke = Math.max(3, state.journey.balls.poke);
}
function addExperience(
  state: GameState,
  activeId: string,
  amount: number,
): void {
  for (const id of state.teamIds) {
    const creature = state.roster.find((c) => c.id === id)!;
    creature.xp +=
      id === activeId ? amount : Math.max(5, Math.floor(amount / 2));
    while (creature.level < 50 && creature.xp >= xpToNext(creature.level)) {
      const oldMax = maxHp(creature);
      creature.xp -= xpToNext(creature.level);
      creature.level += 1;
      creature.hp = Math.min(
        maxHp(creature),
        creature.hp + maxHp(creature) - oldMax,
      );
      state.events.push({
        kind: "level-up",
        message: `${SPECIES[creature.speciesId].name}升到 ${creature.level} 级了！`,
        speciesId: creature.speciesId,
        creatureId: creature.id,
        actor: "player",
      });
    }
    if (creature.level === 50)
      creature.xp = Math.min(creature.xp, xpToNext(50) - 1);
  }
}
function finishWin(state: GameState): void {
  const battle = state.battle!;
  if (battle.rewardClaimed) return;
  if (battle.remaining?.length) {
    battle.enemy = battle.remaining.shift()!;
    see(state, battle.enemy.speciesId);
    message(state, `对手派出了${SPECIES[battle.enemy.speciesId].name}！`);
    return;
  }
  battle.status = "won";
  battle.rewardClaimed = true;
  battle.newBadge = false;
  const area = AREAS[battle.area];
  if (battle.kind === "boss" && !state.badges.includes(battle.area)) {
    state.badges.push(battle.area);
    battle.newBadge = true;
    state.events.push({
      kind: "win",
      message: `获得${area.badgeName}！伙伴们做到了！`,
      speciesId: battle.enemy.speciesId,
      actor: "system",
    });
  } else
    state.events.push({
      kind: "win",
      message: "配合得真好！冒险经验增加了。",
      speciesId: battle.enemy.speciesId,
      actor: "system",
    });
  const p = state.journey!;
  if (battle.kind === "wild")
    p.wins[battle.area] = (p.wins[battle.area] || 0) + 1;
  let coins =
    battle.kind === "wild"
      ? 20
      : battle.kind === "boss"
        ? battle.newBadge
          ? 180
          : 35
        : 25;
  if (battle.trainerId && !p.trainers.includes(battle.trainerId)) {
    const t = trainersFor(battle.area).find((t) => t.id === battle.trainerId)!;
    p.trainers.push(t.id);
    coins = t.coins;
    if (t.fragment && !p.fragments.includes(t.id)) {
      p.fragments.push(t.id);
      message(state, "获得隐藏地图钥匙碎片！");
    }
  }
  p.coins += coins;
  battle.rewardCoins = coins;
  message(state, `获得 ${coins} 金币。`);
  if (battle.area === "secret" && battle.newBadge) p.balls.master += 1;
  addExperience(
    state,
    battle.activeId,
    battle.enemy.level *
      (battle.kind === "boss" ? 25 : battle.kind === "trainer" ? 15 : 9),
  );
  state.berries = Math.min(9, state.berries + 1);
}
function strike(
  state: GameState,
  attacker: Creature,
  target: Creature,
  move: JourneyMove,
  actor: "player" | "enemy",
  rng: () => number,
): void {
  if (attacker.hp <= 0) return;
  if (attacker.status === "paralysis" && randomValue(rng) < 0.25) {
    message(state, `${SPECIES[attacker.speciesId].name}麻痹了，无法行动！`);
    return;
  }
  if (attacker.confusion) {
    attacker.confusion--;
    if (randomValue(rng) < 1 / 3) {
      const hit = Math.max(1, Math.floor(maxHp(attacker) / 8));
      attacker.hp = Math.max(0, attacker.hp - hit);
      message(state, `${SPECIES[attacker.speciesId].name}混乱中伤到了自己！`);
      return;
    }
  }
  if (randomValue(rng) * 100 >= move.accuracy) {
    message(state, `${move.name}没有命中！`);
    return;
  }
  const own = SPECIES[attacker.speciesId],
    opponent = SPECIES[target.speciesId];
  const attack = combatStat(
    attacker,
    move.category === "physical" ? "attack" : "spAttack",
  );
  const defense = combatStat(
    target,
    move.category === "physical" ? "defense" : "spDefense",
  );
  const stab = SPECIES_STATS[attacker.speciesId]?.types.includes(move.type)
    ? 1.5
    : 1;
  const multiplier = typeEffectiveness(move.type, target);
  if (multiplier === 0 && !(move.power === 0 && move.status === "confusion")) {
    message(state, `${move.name}对${opponent.name}没有效果。`);
    return;
  }
  const hitCount = move.hits
    ? move.hits[0] +
      Math.floor(randomValue(rng) * (move.hits[1] - move.hits[0] + 1))
    : 1;
  const damage =
    hitCount *
    (move.power === 0
      ? 0
      : Math.max(
          1,
          Math.round(
            ((((2 * attacker.level) / 5 + 2) * move.power * attack) /
              defense /
              50 +
              2) *
              multiplier *
              stab *
              (attacker.status === "burn" && move.category === "physical"
                ? 0.5
                : 1) *
              (0.85 + randomValue(rng) * 0.15) *
              2,
          ),
        ));
  target.hp = Math.max(0, target.hp - damage);
  state.events.push({
    kind: actor === "player" ? "attack" : "damage",
    message: `${own.name}使出了${move.name}！${hitCount > 1 ? `命中${hitCount}次！` : ""}`,
    speciesId: attacker.speciesId,
    creatureId: target.id,
    damage,
    actor,
    moveName: move.name,
    moveType: move.type,
  });
  if (
    target.hp > 0 &&
    move.status &&
    randomValue(rng) < (move.statusChance || 0)
  ) {
    if (move.status === "confusion") {
      if (!target.confusion) target.confusion = 3;
    } else if (
      !target.status &&
      !(move.status === "burn" && opponent.type === "fire") &&
      !(move.status === "poison" && opponent.type === "poison") &&
      !(move.status === "paralysis" && opponent.type === "electric")
    )
      target.status = move.status;
    if (target.status === move.status || move.status === "confusion")
      message(state, `${opponent.name}陷入${STATUS_NAMES[move.status]}！`);
  }
}
function resolveOwnFaint(state: GameState): void {
  const battle = state.battle!;
  if (battle.status !== "active") return;
  const active = state.roster.find((c) => c.id === battle.activeId)!;
  if (active.hp > 0) return;
  const next = state.roster.find(
    (c) => state.teamIds.includes(c.id) && c.hp > 0,
  );
  if (next) {
    battle.activeId = next.id;
    state.events.push({
      kind: "switch",
      message: `${SPECIES[active.speciesId].name}休息一下，${SPECIES[next.speciesId].name}来帮忙！`,
      speciesId: next.speciesId,
      creatureId: next.id,
      actor: "player",
    });
  } else {
    battle.status = "lost";
    battle.rewardClaimed = true;
    state.journey!.campReturn = battle.area;
    state.area = "camp";
    healEveryone(state);
    state.events.push({
      kind: "loss",
      message: "伙伴们有点累了。已经回营地恢复，随时可以再出发！",
      actor: "system",
    });
  }
}
function enemyTurn(state: GameState, rng: () => number): void {
  const battle = state.battle!;
  if (battle.status !== "active") return;
  const active = state.roster.find((c) => c.id === battle.activeId)!;
  const moves = movesFor(battle.enemy.speciesId);
  const scored = moves.map((move) => ({
    move,
    score: move.power
      ? move.power * typeEffectiveness(move.type, active)
      : active.status || active.confusion
        ? 0
        : 75,
  }));
  scored.sort((a, b) => b.score - a.score);
  const move =
    randomValue(rng) < 0.75
      ? scored[0].move
      : moves[Math.floor(randomValue(rng) * moves.length)];
  strike(state, battle.enemy, active, move, "enemy", rng);
  resolveOwnFaint(state);
  if (battle.enemy.hp <= 0) finishWin(state);
}
function endRound(state: GameState): void {
  const b = state.battle!;
  if (b.status !== "active") return;
  const active = state.roster.find((c) => c.id === b.activeId)!;
  for (const c of [active, b.enemy])
    if (c.hp > 0 && (c.status === "poison" || c.status === "burn")) {
      c.hp = Math.max(
        0,
        c.hp -
          Math.max(1, Math.floor(maxHp(c) / (c.status === "poison" ? 8 : 16))),
      );
      message(
        state,
        `${SPECIES[c.speciesId].name}受到${STATUS_NAMES[c.status]}伤害。`,
      );
    }
  if (b.enemy.hp <= 0) finishWin(state);
  resolveOwnFaint(state);
}

/** All turn outcomes are committed together; events describe their playback order. */
export function reduceGame(
  original: GameState,
  action: GameAction,
  rng: () => number = Math.random,
): GameState {
  const state = cloneState(original);
  const battle = state.battle;
  const activeBattle = battle?.status === "active";
  switch (action.type) {
    case "route":
      if (!battle && [0, 1].includes(action.index))
        state.journey!.route = action.index;
      break;
    case "sign":
      if (!battle) {
        const key = `${state.area}-${state.journey!.route}`;
        if (!state.journey!.signs.includes(key)) {
          state.journey!.signs.push(key);
          state.journey!.coins += 15;
          message(state, "发现城市线索，获得 15 金币！");
        } else message(state, "这处路标已经调查过了。");
      }
      break;
    case "buy": {
      if (battle) return original;
      const p = state.journey!,
        ball = BALLS[action.item as BallId],
        disc = DISCS.find((d) => d.id === action.item);
      const cost =
        ball && action.item !== "master"
          ? ball.price
          : (disc?.price ??
            (action.item === "food"
              ? 45
              : action.item === "ticket"
                ? 70
                : action.item === "berry"
                  ? 25
                  : 0));
      if (!cost) {
        message(state, "这件物品不能购买。");
        break;
      }
      if (disc && p.discs.includes(disc.id)) {
        message(state, "已经拥有这个学习器。");
        break;
      }
      if (p.coins < cost) {
        message(state, "金币不足，可以挑战训练家获得奖励。");
        break;
      }
      p.coins -= cost;
      if (ball) p.balls[action.item as BallId]++;
      else if (disc) p.discs.push(disc.id);
      else if (action.item === "food") p.food++;
      else if (action.item === "ticket") p.tickets++;
      else state.berries = Math.min(99, state.berries + 1);
      message(state, "兑换成功，已经放入背包。");
      break;
    }
    case "learn": {
      if (battle) return original;
      const c = state.roster.find((c) => c.id === action.creatureId),
        p = state.journey!;
      if (
        !c ||
        !p.discs.includes(action.discId) ||
        !canLearn(c.speciesId, c.level, action.discId) ||
        !Number.isInteger(action.slot) ||
        action.slot < 0 ||
        action.slot > 3 ||
        action.slot > movesFor(c.speciesId, c.learned).length
      ) {
        message(state, "这位伙伴的种类或等级不符合学习条件。");
        break;
      }
      c.learned = [...(c.learned || [])];
      if (
        movesFor(c.speciesId, c.learned).some(
          (m, i) =>
            i !== action.slot && m.name === DISC_MOVES[action.discId].name,
        )
      ) {
        message(state, "这位伙伴已经学会这个招式了。");
        break;
      }
      c.learned[action.slot] = action.discId;
      message(
        state,
        `${SPECIES[c.speciesId].name}学会了${DISC_MOVES[action.discId].name}！`,
      );
      break;
    }
    case "food": {
      const c = state.roster.find((c) => c.id === action.creatureId),
        p = state.journey!;
      if (!c || p.food <= 0 || (activeBattle && battle?.activeId !== c.id))
        return original;
      if (c.hp >= maxHp(c) && !c.status && !c.confusion) {
        message(state, "伙伴现在状态很好，营养餐留着需要时再用。");
        break;
      }
      p.food--;
      c.hp = Math.min(maxHp(c), c.hp + Math.ceil(maxHp(c) * 0.6));
      c.status = undefined;
      c.confusion = 0;
      message(state, "伙伴吃下营养餐，恢复体力并解除异常状态。");
      if (activeBattle) {
        battle!.turn++;
        enemyTurn(state, rng);
        endRound(state);
      }
      break;
    }
    case "fly":
      if (
        !battle &&
        state.journey!.tickets > 0 &&
        canTravel(state, action.area) &&
        action.area !== "secret"
      ) {
        state.journey!.tickets--;
        state.area = action.area;
        state.journey!.route = 0;
        message(state, `乘飞机抵达${AREAS[action.area].name}。`);
      } else message(state, "需要机票，并且目的地已经开放。");
      break;
    case "settings":
      state.settings.reducedMotion = !!action.reducedMotion;
      break;
    case "travel": {
      if (activeBattle) {
        message(state, "先完成眼前的对战吧。");
        break;
      }
      if (!canTravel(state, action.area)) {
        message(state, "先击败上一座城市的守护者；隐藏地点还需要三片钥匙。");
        break;
      }
      if (!canWalk(state, action.area)) {
        message(
          state,
          "目的地较远。可以经相邻城市步行，或在商城机场使用机票直达。",
        );
        break;
      }
      state.battle = null;
      if (action.area === "camp" && state.area !== "camp")
        state.journey!.campReturn = state.area;
      state.area = action.area;
      state.journey!.route = 0;
      if (action.area === "camp") {
        healEveryone(state);
        state.events.push({
          kind: "heal",
          message: "伙伴体力已恢复，树果也补好了。",
          actor: "system",
        });
      } else
        message(
          state,
          `来到${AREAS[action.area].name}。点一点想认识的宝可梦吧！`,
        );
      break;
    }
    case "encounter": {
      if (battle) {
        message(state, "先结束这次相遇吧。");
        break;
      }
      if (state.area === "camp") {
        message(state, "先选一处地方去冒险吧。");
        break;
      }
      const area = AREAS[state.area];
      if (action.boss && !bossReady(state)) {
        message(
          state,
          "先调查两条道路，结识当地不同伙伴，并完成城市的野生对战目标。",
        );
        break;
      }
      const trainer = action.trainerId
        ? trainersFor(state.area).find((t) => t.id === action.trainerId)
        : undefined;
      if (action.trainerId && !trainer) return original;
      const pool = availableSpecies(state);
      const squad = action.boss ? BOSS_TEAMS[state.area] : trainer?.species;
      const speciesId =
        squad?.[0] ??
        action.speciesId ??
        pool[Math.floor(randomValue(rng) * pool.length)];
      if (
        !speciesId ||
        !SPECIES[speciesId] ||
        (!action.boss && !trainer && !pool.includes(speciesId))
      ) {
        message(state, "这位伙伴不在这里，去附近找找吧。");
        break;
      }
      const leader = getLeader(state);
      const active =
        leader.hp > 0
          ? leader
          : state.roster.find((c) => state.teamIds.includes(c.id) && c.hp > 0);
      if (!active) {
        state.area = "camp";
        healEveryone(state);
        message(state, "先回营地恢复体力，再出发吧。");
        break;
      }
      state.encounters += 1;
      const enemy: Creature = {
        id: `wild-${state.encounters}`,
        speciesId,
        level: trainer?.level ?? area.level + (action.boss ? 2 : 0),
        xp: 0,
        hp: 1,
      };
      enemy.hp = maxHp(enemy);
      state.battle = {
        id: `encounter-${state.encounters}`,
        kind: action.boss ? "boss" : "wild",
        area: state.area,
        enemy,
        activeId: active.id,
        turn: 0,
        catchReady: false,
        failedReadyCatches: 0,
        status: "active",
        rewardClaimed: false,
        newBadge: false,
      };
      if (trainer) {
        state.battle.kind = "trainer";
        state.battle.trainerId = trainer.id;
      }
      state.battle.remaining = squad?.slice(1).map((id) => {
        const c: Creature = {
          id: `wild-${state.encounters}`,
          speciesId: id,
          level: enemy.level,
          xp: 0,
          hp: 1,
        };
        c.hp = maxHp(c);
        return c;
      });
      see(state, speciesId);
      state.events.push({
        kind: "encounter",
        message: action.boss
          ? `${area.bossName}接受挑战！胜利后获得徽章。`
          : `遇见${SPECIES[speciesId].name}了！`,
        speciesId,
        actor: "enemy",
      });
      break;
    }
    case "attack": {
      if (
        !activeBattle ||
        !battle ||
        !Number.isInteger(action.moveIndex) ||
        action.moveIndex < 0 ||
        action.moveIndex > 3
      )
        return original;
      const active = state.roster.find((c) => c.id === battle.activeId)!;
      const species = SPECIES[active.speciesId];
      const selectedMove = movesFor(active.speciesId, active.learned)[
        action.moveIndex
      ];
      if (!selectedMove) return original;
      const ownSpeed =
        combatStat(active, "speed") * (active.status === "paralysis" ? 0.5 : 1);
      const enemySpeed =
        combatStat(battle.enemy, "speed") *
        (battle.enemy.status === "paralysis" ? 0.5 : 1);
      const enemyFirst = !selectedMove.priority && enemySpeed > ownSpeed;
      battle.catchReady =
        battle.enemy.hp < maxHp(battle.enemy) * 0.7 || !!battle.enemy.status;
      battle.turn += 1;
      if (enemyFirst) {
        enemyTurn(state, rng);
        if (
          battle.status !== "active" ||
          battle.activeId !== active.id ||
          active.hp <= 0
        ) {
          endRound(state);
          break;
        }
      }
      strike(state, active, battle.enemy, selectedMove, "player", rng);
      if (battle.enemy.hp === 0) finishWin(state);
      else if (!enemyFirst) enemyTurn(state, rng);
      resolveOwnFaint(state);
      endRound(state);
      break;
    }
    case "catch": {
      if (!activeBattle || !battle) return original;
      if (battle.kind !== "wild") {
        message(state, "挑战中的宝可梦不能捕捉。");
        break;
      }
      if (state.roster.length >= 1000) {
        message(state, "营地已经住满伙伴啦，带着大家继续挑战吧。");
        break;
      }
      const ball = action.ball || "poke",
        p = state.journey!;
      if (!BALL_IDS.includes(ball) || p.balls[ball] <= 0) {
        message(state, "这种精灵球用完了，商城可以补充。");
        break;
      }
      p.balls[ball]--;
      const active = state.roster.find((c) => c.id === battle.activeId)!;
      const rarity =
        (SPECIES_STATS[battle.enemy.speciesId]?.catchRate || 120) / 255;
      const chance = Math.min(
        0.95,
        rarity *
          (1 - (battle.enemy.hp / maxHp(battle.enemy)) * 0.7) *
          (battle.enemy.status ? 1.5 : 1) *
          ballMultiplier(
            ball,
            battle.area,
            SPECIES[battle.enemy.speciesId].type,
            battle.turn,
            active.level,
            battle.enemy.level,
          ),
      );
      const success =
        !state.tutorialCaptured ||
        ball === "master" ||
        randomValue(rng) < chance;
      battle.turn += 1;
      if (success) {
        const caught: Creature = {
          ...battle.enemy,
          id: `partner-${state.nextCreatureId++}`,
          xp: 0,
        };
        caught.hp = maxHp(caught);
        state.roster.push(caught);
        rememberCaught(state, caught.speciesId);
        const joinedTeam = state.teamIds.length < 6;
        if (joinedTeam) state.teamIds.push(caught.id);
        state.tutorialCaptured = true;
        p.wins[battle.area] = (p.wins[battle.area] || 0) + 1;
        battle.status = "caught";
        battle.rewardClaimed = true;
        battle.caughtId = caught.id;
        state.events.push({
          kind: "catch-success",
          message: `${SPECIES[caught.speciesId].name}成为新伙伴！${joinedTeam ? "已经加入队伍。" : "正在营地等你。"}`,
          speciesId: caught.speciesId,
          creatureId: caught.id,
          actor: "player",
        });
        addExperience(state, battle.activeId, battle.enemy.level * 7);
      } else {
        if (battle.catchReady)
          battle.failedReadyCatches = Math.min(
            99,
            battle.failedReadyCatches + 1,
          );
        state.events.push({
          kind: "catch-fail",
          message: battle.catchReady
            ? "差一点点！降低体力或换一种精灵球，再试试看。"
            : "它还很有精神。先用招式创造机会吧！",
          speciesId: battle.enemy.speciesId,
          actor: "enemy",
        });
        enemyTurn(state, rng);
        endRound(state);
      }
      break;
    }
    case "switch": {
      if (!activeBattle || !battle) return original;
      const next = state.roster.find((c) => c.id === action.creatureId);
      if (
        !next ||
        !state.teamIds.includes(next.id) ||
        next.hp <= 0 ||
        battle.activeId === next.id
      )
        return original;
      battle.activeId = next.id;
      battle.turn += 1;
      state.events.push({
        kind: "switch",
        message: `上吧，${SPECIES[next.speciesId].name}！`,
        speciesId: next.speciesId,
        creatureId: next.id,
        actor: "player",
      });
      enemyTurn(state, rng);
      endRound(state);
      break;
    }
    case "leave": {
      if (!battle) return original;
      if (activeBattle && battle.kind !== "wild") {
        message(state, "挑战已经开始，完成这次对战后再离开。");
        break;
      }
      state.battle = null;
      message(state, "继续看看附近有什么吧。");
      break;
    }
    case "finishBattle":
      if (battle && !activeBattle) {
        state.battle = null;
        message(
          state,
          state.area === "camp"
            ? "伙伴们休息好了，一起再出发吧。"
            : "下一位伙伴，会在哪里呢？",
        );
      } else return original;
      break;
    case "heal": {
      if (activeBattle) {
        message(state, "现在可以用树果恢复体力。");
        break;
      }
      if (state.area !== "camp") {
        message(state, "回营地就能让所有伙伴恢复体力。");
        break;
      }
      healEveryone(state);
      state.events.push({
        kind: "heal",
        message: "大家恢复精神了！树果补到 3 颗。",
        actor: "system",
      });
      break;
    }
    case "berry": {
      const target = state.roster.find((c) => c.id === action.creatureId);
      if (!target || (activeBattle && !state.teamIds.includes(target.id)))
        return original;
      if (state.berries <= 0) {
        message(state, "树果用完了，回营地可以补充。");
        break;
      }
      if (target.hp >= maxHp(target)) {
        message(state, `${SPECIES[target.speciesId].name}现在精神满满！`);
        break;
      }
      state.berries -= 1;
      target.hp = Math.min(
        maxHp(target),
        target.hp + Math.ceil(maxHp(target) * 0.45),
      );
      state.events.push({
        kind: "heal",
        message: `${SPECIES[target.speciesId].name}吃下树果，恢复了体力。`,
        speciesId: target.speciesId,
        creatureId: target.id,
        actor: "player",
      });
      if (activeBattle && battle) {
        battle.turn += 1;
        enemyTurn(state, rng);
        endRound(state);
      }
      break;
    }
    case "setLeader": {
      if (activeBattle) return original;
      const target = state.roster.find((c) => c.id === action.creatureId);
      if (!target) return original;
      if (!state.teamIds.includes(target.id)) {
        message(state, "先让它加入队伍，再一起走吧。");
        break;
      }
      state.leaderId = target.id;
      state.events.push({
        kind: "switch",
        message: `${SPECIES[target.speciesId].name}会跟着你一起走！`,
        speciesId: target.speciesId,
        creatureId: target.id,
        actor: "player",
      });
      break;
    }
    case "toggleTeam": {
      if (activeBattle) return original;
      const target = state.roster.find((c) => c.id === action.creatureId);
      if (!target) return original;
      if (state.teamIds.includes(target.id)) {
        if (state.teamIds.length === 1) {
          message(state, "至少带上一位伙伴，一起冒险吧。");
          break;
        }
        state.teamIds = state.teamIds.filter((id) => id !== target.id);
        if (state.leaderId === target.id) state.leaderId = state.teamIds[0];
        message(state, `${SPECIES[target.speciesId].name}会在营地等你。`);
      } else {
        if (state.teamIds.length >= 6) {
          message(state, "队伍有 6 位伙伴啦。先让一位回营地休息吧。");
          break;
        }
        state.teamIds.push(target.id);
        message(state, `${SPECIES[target.speciesId].name}加入队伍了！`);
      }
      break;
    }
    case "evolve": {
      if (activeBattle) return original;
      const target = state.roster.find((c) => c.id === action.creatureId);
      if (!target || !canEvolve(target)) return original;
      const oldName = SPECIES[target.speciesId].name;
      rememberCaught(state, target.speciesId);
      target.speciesId = SPECIES[target.speciesId].evolution!.id;
      target.hp = maxHp(target);
      see(state, target.speciesId);
      rememberCaught(state, target.speciesId);
      state.events.push({
        kind: "evolve",
        message: `${oldName}进化成了${SPECIES[target.speciesId].name}！`,
        speciesId: target.speciesId,
        creatureId: target.id,
        actor: "player",
      });
      break;
    }
    default:
      return original;
  }
  if (state.battle?.status === "active" && state.battle.kind === "wild")
    state.battle.catchReady =
      state.battle.enemy.hp < maxHp(state.battle.enemy) * 0.7 ||
      !!state.battle.enemy.status;
  return state;
}
