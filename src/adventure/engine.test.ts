import { describe, it, expect } from "vitest";
import {
  createGame,
  reduceGame,
  maxHp,
  canTravel,
  progress,
  availableSpecies,
  isAdventureComplete,
  type GameState,
} from "./engine";
import { SPECIES, effectiveness } from "./data";
import { MAIN_AREAS } from "./journey";
import { validateGame } from "./save";
const high = () => 0.99;
function prepared(): GameState {
  const s = createGame(25);
  s.roster[0].level = 40;
  s.roster[0].hp = maxHp(s.roster[0]);
  return s;
}
function win(state: GameState): GameState {
  let s = state;
  for (let i = 0; i < 200 && s.battle?.status === "active"; i++) {
    s.battle.enemy.hp = 1;
    s = reduceGame(s, { type: "attack", moveIndex: 1 }, () => 0.5);
  }
  expect(s.battle?.status).toBe("won");
  return s;
}
describe("adventure battle rules", () => {
  it("does not mutate the input and rejects encounters outside their habitat", () => {
    const s = createGame(25),
      before = JSON.stringify(s);
    reduceGame(s, { type: "encounter", speciesId: 10 });
    expect(JSON.stringify(s)).toBe(before);
    expect(
      reduceGame(s, { type: "encounter", speciesId: 95 }).battle,
    ).toBeNull();
  });
  it("captures the first companion but does not reissue a finished reward", () => {
    let s = reduceGame(createGame(25), { type: "encounter", speciesId: 10 });
    s = reduceGame(s, { type: "catch" }, high);
    expect(s.battle?.status).toBe("caught");
    expect(s.roster).toHaveLength(2);
    expect(reduceGame(s, { type: "catch" }, high)).toBe(s);
    expect(canTravel(s, "lake")).toBe(false);
    expect(validateGame(s)).not.toBeNull();
  });
  it("consumes finite balls and has no second-attempt capture guarantee", () => {
    let s = createGame(25);
    s.tutorialCaptured = true;
    s = reduceGame(s, { type: "encounter", speciesId: 10 });
    s = reduceGame(s, { type: "catch" }, high);
    s = reduceGame(s, { type: "catch" }, high);
    expect(s.battle?.status).toBe("active");
    expect(progress(s).balls.poke).toBe(8);
    progress(s).balls.poke = 0;
    const turn = s.battle!.turn;
    s = reduceGame(s, { type: "catch" }, high);
    expect(s.battle?.turn).toBe(turn);
  });
  it("does not charge turn or inventory when trying to catch a trainer partner", () => {
    let s = reduceGame(createGame(25), {
      type: "encounter",
      trainerId: "meadow-0",
    });
    s = reduceGame(s, { type: "catch" });
    expect(s.battle?.turn).toBe(0);
    expect(progress(s).balls.poke).toBe(10);
    expect(reduceGame(s, { type: "leave" }).battle?.status).toBe("active");
  });
  it("lets wild encounters leave immediately", () => {
    const s = reduceGame(createGame(25), { type: "encounter", speciesId: 10 });
    expect(reduceGame(s, { type: "leave" }).battle).toBeNull();
  });
  it("records trainer first wins, repeat rewards and one-time fragments", () => {
    let s = prepared();
    s = reduceGame(s, { type: "encounter", trainerId: "meadow-2" });
    s = win(s);
    expect(progress(s).fragments).toEqual(["meadow-2"]);
    expect(s.battle?.rewardCoins).toBe(60);
    const coins = progress(s).coins;
    expect(reduceGame(s, { type: "attack", moveIndex: 0 })).toBe(s);
    s = reduceGame(s, { type: "finishBattle" });
    s = reduceGame(s, { type: "encounter", trainerId: "meadow-2" });
    s = win(s);
    expect(progress(s).fragments).toHaveLength(1);
    expect(progress(s).coins).toBe(coins + 25);
  });
  it("requires and awards all six city badges, with catchable guardians after each win", () => {
    let s = prepared();
    for (const area of MAIN_AREAS) {
      expect(canTravel(s, area)).toBe(true);
      s = reduceGame(s, { type: "travel", area });
      progress(s).signs.push(`${area}-0`, `${area}-1`);
      progress(s).wins[area] = 5;
      s.caughtSpeciesIds = [
        ...new Set([
          ...s.caughtSpeciesIds,
          ...Object.values(SPECIES)
            .filter((p) => p.habitat.includes(area))
            .map((p) => p.id),
          ...availableSpecies(s, area),
        ]),
      ];
      s.seen = [...s.caughtSpeciesIds];
      s = reduceGame(s, { type: "encounter", boss: true });
      s = win(s);
      expect(s.badges).toContain(area);
      expect(s.battle?.newBadge).toBe(true);
      expect(availableSpecies(s, area)).toContain(
        SPECIES[s.battle!.enemy.speciesId].id,
      );
      expect(validateGame(s)).not.toBeNull();
      s = reduceGame(s, { type: "finishBattle" });
    }
    expect(isAdventureComplete(s)).toBe(true);
    expect(canTravel(s, "secret")).toBe(false);
    progress(s).fragments = ["meadow-2", "lake-2", "cave-2"];
    expect(canTravel(s, "secret")).toBe(true);
  });
  it("keeps strong, resisted and immune matchups distinct", () => {
    expect(effectiveness("electric", "water")).toBe(2);
    expect(effectiveness("electric", "grass")).toBe(0.5);
    expect(effectiveness("electric", "ground")).toBe(0);
    expect(effectiveness("dragon", "fairy")).toBe(0);
  });
  it("supports stateful ailments and rejects corrupt statuses on reload", () => {
    let s = createGame(25);
    s = reduceGame(s, { type: "encounter", speciesId: 10 });
    s = reduceGame(s, { type: "attack", moveIndex: 2 }, () => 0.3);
    expect(s.battle?.enemy.status).toBe("paralysis");
    expect(validateGame(s)?.battle?.enemy.status).toBe("paralysis");
    const bad = JSON.parse(JSON.stringify(s));
    bad.roster[0].status = "invisible";
    expect(validateGame(bad)).toBeNull();
  });
  it("preserves old forms in the collection when evolving", () => {
    let s = createGame(25);
    s.roster[0].level = 10;
    s = reduceGame(s, { type: "evolve", creatureId: s.leaderId });
    expect(s.roster[0].speciesId).toBe(26);
    expect(s.caughtSpeciesIds).toEqual([25, 26]);
    expect(validateGame(s)).not.toBeNull();
  });
  it("migrates an old visual save without erasing companions or badges", () => {
    const old = createGame(25);
    delete old.journey;
    old.badges = ["lake", "cave"];
    old.area = "cave";
    const migrated = validateGame(old);
    expect(migrated?.badges).toEqual(["lake", "cave", "meadow"]);
    expect(migrated?.roster).toEqual(old.roster);
    expect(migrated?.journey?.coins).toBe(200);
  });
  it("awards the hidden guardian Master Ball only once", () => {
    let s = prepared();
    s.badges = [...MAIN_AREAS];
    s.area = "secret";
    s.journey!.fragments = ["meadow-2", "lake-2", "cave-2"];
    s.journey!.signs = ["secret-0", "secret-1"];
    s.journey!.wins.secret = 5;
    s.caughtSpeciesIds = [
      ...new Set([...s.caughtSpeciesIds, ...availableSpecies(s, "secret")]),
    ];
    s.seen = [...s.caughtSpeciesIds];
    s = win(reduceGame(s, { type: "encounter", boss: true }));
    expect(s.journey!.balls.master).toBe(1);
    expect(validateGame(s)).not.toBeNull();
    s = reduceGame(s, { type: "finishBattle" });
    s = win(reduceGame(s, { type: "encounter", boss: true }));
    expect(s.journey!.balls.master).toBe(1);
  });
});
