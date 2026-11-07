import { describe, it, expect } from "vitest";
import { AREAS, type AreaId } from "./data";
import {
  createGame,
  reduceGame,
  maxHp,
  typeEffectiveness,
  combatStat,
  type GameState,
} from "./engine";
import { MAIN_AREAS, movesFor } from "./journey";
function rng(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}
function team(area: AreaId, ids: number[], level: number) {
  const s = createGame(25);
  s.area = area;
  s.badges = MAIN_AREAS.slice(0, MAIN_AREAS.indexOf(area));
  s.roster = ids.map((id, i) => {
    const c = { id: `partner-${i + 1}`, speciesId: id, level, xp: 0, hp: 1 };
    c.hp = maxHp(c);
    return c;
  });
  s.teamIds = s.roster.map((c) => c.id);
  s.leaderId = s.teamIds[0];
  s.seen = ids;
  s.caughtSpeciesIds = ids;
  s.nextCreatureId = ids.length + 1;
  s.journey!.signs = [`${area}-0`, `${area}-1`];
  s.journey!.wins[area] = 5;
  if (area === "secret") {
    s.badges = [...MAIN_AREAS];
    s.journey!.fragments = ["meadow-2", "lake-2", "cave-2"];
  }
  s.caughtSpeciesIds = [...new Set([...ids, ...AREAS[area].speciesIds])];
  s.seen = [...s.caughtSpeciesIds];
  return reduceGame(s, { type: "encounter", boss: true });
}
function play(state: GameState, seed: number, spam = false) {
  let s = state;
  const random = rng(seed);
  for (let i = 0; i < 120 && s.battle?.status === "active"; i++) {
    const active = s.roster.find((c) => c.id === s.battle!.activeId)!;
    if (!spam) {
      const rank = s.roster
        .filter((c) => c.hp > maxHp(c) * 0.3)
        .map((c) => ({
          c,
          score: Math.max(
            ...movesFor(c.speciesId, c.learned).map(
              (m) => m.power * typeEffectiveness(m.type, s.battle!.enemy),
            ),
          ),
        }))
        .sort((a, b) => b.score - a.score);
      const own = Math.max(
        ...movesFor(active.speciesId, active.learned).map(
          (m) => m.power * typeEffectiveness(m.type, s.battle!.enemy),
        ),
      );
      if (rank[0] && rank[0].c.id !== active.id && rank[0].score > own * 1.6) {
        s = reduceGame(s, { type: "switch", creatureId: rank[0].c.id }, random);
        continue;
      }
    }
    if (!spam && active.hp < maxHp(active) * 0.3 && s.journey!.food > 0) {
      s = reduceGame(s, { type: "food", creatureId: active.id }, random);
      continue;
    }
    const scores = movesFor(active.speciesId, active.learned).map(
      (move, index) => ({
        index,
        score:
          move.power *
          typeEffectiveness(move.type, s.battle!.enemy) *
          combatStat(
            active,
            move.category === "physical" ? "attack" : "spAttack",
          ),
      }),
    );
    scores.sort((a, b) => b.score - a.score);
    s = reduceGame(
      s,
      { type: "attack", moveIndex: spam ? 0 : scores[0].index },
      random,
    );
  }
  return s;
}
describe("expert trainer difficulty checks", () => {
  const fixtures: [AreaId, number[]][] = [
    ["meadow", [4, 25, 16]],
    ["lake", [26, 2, 8]],
    ["cave", [8, 2, 26]],
    ["unova", [75, 2, 133]],
    ["kalos", [26, 5, 17, 8]],
    ["alola", [8, 26, 2, 5]],
    ["secret", [8, 26, 2, 5]],
  ];
  for (const [area, ids] of fixtures)
    it(`${area}: a varied prepared team can win at the recommended level`, () => {
      let wins = 0;
      const turns: number[] = [];
      for (let seed = 1; seed <= 20; seed++) {
        const result = play(team(area, ids, AREAS[area].level + 1), seed);
        if (result.battle?.status === "won") wins++;
        turns.push(result.battle?.turn || 0);
      }
      expect(wins).toBeGreaterThanOrEqual(14);
      expect(Math.max(...turns)).toBeGreaterThan(3);
    });
  it("a lone Pikachu repeating electric damage cannot sweep the rock city", () => {
    expect(play(team("cave", [25], 14), 11, true).battle?.status).toBe("lost");
  });
});
