import { describe, it, expect } from "vitest";
import {
  createGame,
  reduceGame,
  progress,
  canTravel,
  bossReady,
  maxHp,
} from "./engine";
import { validateGame } from "./save";
import { ballMultiplier, movesFor, trainersFor, BOSS_TEAMS } from "./journey";

describe("trainer journey expansion", () => {
  it("requires the previous city badge and keeps flights inside opened cities", () => {
    let state = createGame(25);
    expect(canTravel(state, "lake")).toBe(false);
    state.badges.push("meadow");
    expect(canTravel(state, "lake")).toBe(true);
    state = reduceGame(state, { type: "buy", item: "ticket" });
    state = reduceGame(state, { type: "fly", area: "alola" });
    expect(state.area).toBe("meadow");
    expect(progress(state).tickets).toBe(1);
    state = reduceGame(state, { type: "fly", area: "lake" });
    expect(state.area).toBe("lake");
    expect(progress(state).tickets).toBe(0);
  });
  it("records each road clue once and requires real field outcomes before the boss", () => {
    let state = createGame(25);
    expect(bossReady(state)).toBe(false);
    state = reduceGame(state, { type: "sign" });
    const coins = progress(state).coins;
    state = reduceGame(state, { type: "sign" });
    expect(progress(state).coins).toBe(coins);
    state = reduceGame(state, { type: "route", index: 1 });
    state = reduceGame(state, { type: "sign" });
    expect(progress(state).signs).toHaveLength(2);
    expect(bossReady(state)).toBe(false);
    progress(state).wins.meadow = 3;
    state.caughtSpeciesIds.push(10);
    state.seen.push(10);
    expect(bossReady(state)).toBe(true);
    const battle = reduceGame(state, { type: "encounter", boss: true });
    expect(battle.battle?.remaining).toHaveLength(BOSS_TEAMS.meadow.length - 1);
    expect(validateGame(battle)).not.toBeNull();
  });
  it("offers trainer teams, forbids taking their Pokemon and persists the match", () => {
    let state = createGame(25);
    state = reduceGame(state, {
      type: "encounter",
      trainerId: trainersFor("meadow")[0].id,
    });
    expect(state.battle?.kind).toBe("trainer");
    const coins = progress(state).coins;
    const next = reduceGame(state, { type: "catch", ball: "master" });
    expect(next.roster).toHaveLength(1);
    expect(progress(next).coins).toBe(coins);
    expect(validateGame(next)?.battle?.trainerId).toBe("meadow-0");
  });
  it("charges money once, owns reusable discs, and checks actual species and level", () => {
    let state = createGame(25);
    progress(state).coins = 500;
    state = reduceGame(state, { type: "buy", item: "thunderbolt" });
    expect(progress(state).coins).toBe(280);
    state = reduceGame(state, { type: "buy", item: "thunderbolt" });
    expect(progress(state).coins).toBe(280);
    state = reduceGame(state, {
      type: "learn",
      creatureId: state.leaderId,
      discId: "thunderbolt",
      slot: 3,
    });
    expect(movesFor(25, state.roster[0].learned)[3].id).not.toBe("thunderbolt");
    state.roster[0].level = 12;
    state.roster[0].hp = maxHp(state.roster[0]);
    state = reduceGame(state, {
      type: "learn",
      creatureId: state.leaderId,
      discId: "thunderbolt",
      slot: 3,
    });
    expect(movesFor(25, state.roster[0].learned)[3].id).toBe("thunderbolt");
    expect(validateGame(JSON.parse(JSON.stringify(state)))).not.toBeNull();
  });
  it("uses actual ball conditions rather than repeated-catch guarantees", () => {
    expect(ballMultiplier("quick", "meadow", "normal", 0, 10, 10)).toBe(5);
    expect(ballMultiplier("quick", "meadow", "normal", 1, 10, 10)).toBe(1);
    expect(ballMultiplier("net", "lake", "water", 0, 10, 10)).toBe(3.5);
    expect(ballMultiplier("dusk", "cave", "normal", 0, 10, 10)).toBe(3);
    expect(ballMultiplier("timer", "meadow", "normal", 20, 10, 10)).toBe(4);
    expect(ballMultiplier("level", "meadow", "normal", 0, 40, 10)).toBe(8);
  });
  it("heals status with finite food and leaves no residual condition after camp healing", () => {
    let state = createGame(25);
    state.roster[0].status = "poison";
    state.roster[0].hp = 5;
    state = reduceGame(state, { type: "food", creatureId: state.leaderId });
    expect(state.roster[0].status).toBeUndefined();
    expect(progress(state).food).toBe(1);
    state.roster[0].status = "burn";
    state = reduceGame(state, { type: "travel", area: "camp" });
    expect(state.roster[0].hp).toBe(maxHp(state.roster[0]));
    expect(state.roster[0].status).toBeUndefined();
  });
});
