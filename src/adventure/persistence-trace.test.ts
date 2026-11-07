import { expect, it } from "vitest";
import { AREAS, AREA_ORDER, SPECIES_LIST } from "./data";
import {
  createGame,
  reduceGame,
  canWalk,
  bossReady,
  type GameAction,
} from "./engine";
import { movesFor, trainersFor } from "./journey";
import { validateGame } from "./save";
it("keeps real combat, rewards, status and travel snapshots reloadable during long play", () => {
  let seed = 41;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  let state = createGame(25);
  for (let step = 0; step < 2000; step++) {
    const b = state.battle;
    let action: GameAction;
    if (b?.status === "active") {
      const c = state.roster.find((c) => c.id === b.activeId)!;
      const n = random();
      action =
        n < 0.2
          ? { type: "catch" }
          : n < 0.25
            ? { type: "food", creatureId: c.id }
            : {
                type: "attack",
                moveIndex: Math.floor(
                  random() * movesFor(c.speciesId, c.learned).length,
                ),
              };
    } else if (b) action = { type: "finishBattle" };
    else if (state.area === "camp")
      action = { type: "travel", area: state.journey?.campReturn || "meadow" };
    else {
      const n = random();
      const destinations = AREA_ORDER.filter(
        (id) => canWalk(state, id) && id !== state.area,
      );
      action =
        n < 0.08 && destinations.length
          ? {
              type: "travel",
              area: destinations[Math.floor(random() * destinations.length)],
            }
          : n < 0.16
            ? { type: "route", index: random() < 0.5 ? 0 : 1 }
            : n < 0.24
              ? { type: "sign" }
              : n < 0.3 && bossReady(state)
                ? { type: "encounter", boss: true }
                : n < 0.36
                  ? {
                      type: "encounter",
                      trainerId: trainersFor(state.area)[0].id,
                    }
                  : {
                      type: "encounter",
                      speciesId:
                        AREAS[state.area].speciesIds[
                          Math.floor(
                            random() * AREAS[state.area].speciesIds.length,
                          )
                        ],
                    };
    }
    state = reduceGame(state, action, random);
    const encoded = JSON.parse(JSON.stringify(state));
    expect(
      validateGame(encoded),
      `Unreloadable step ${step}: ${action.type}`,
    ).not.toBeNull();
  }
  expect(SPECIES_LIST.every((s) => /\p{Script=Han}/u.test(s.name))).toBe(true);
  expect(movesFor(16).some((m) => m.name === "奇异之光")).toBe(false);
  expect(movesFor(10).some((m) => m.name === "毒粉")).toBe(false);
});
