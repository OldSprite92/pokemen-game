import fs from "node:fs/promises";
const names = [
  "tackle",
  "quick-attack",
  "razor-leaf",
  "ember",
  "water-gun",
  "thunder-shock",
  "bug-bite",
  "gust",
  "rock-throw",
  "poison-sting",
  "vine-whip",
  "fire-fang",
  "bubble-beam",
  "wing-attack",
  "thunderbolt",
  "air-cutter",
  "water-pulse",
  "rock-blast",
  "slam",
  "aqua-tail",
  "bite",
  "swift",
  "body-slam",
  "headbutt",
  "thunder-wave",
  "will-o-wisp",
  "poison-powder",
  "confuse-ray",
  "flamethrower",
  "surf",
  "energy-ball",
];
const output = {};
for (let i = 0; i < names.length; i += 4)
  await Promise.all(
    names.slice(i, i + 4).map(async (id) => {
      const response = await fetch(`https://pokeapi.co/api/v2/move/${id}`);
      if (!response.ok) throw Error(`Cannot fetch ${id}`);
      const move = await response.json();
      const name = move.names.find(
        (n) => n.language.name.toLowerCase() === "zh-hans",
      )?.name;
      if (!name) throw Error(`Missing Chinese name ${id}`);
      output[name] = {
        id,
        name,
        type: move.type.name,
        power: move.power || 0,
        accuracy: move.accuracy || 100,
        category:
          move.damage_class.name === "physical" ? "physical" : "special",
        priority: move.priority,
        ...(["paralysis", "burn", "poison", "confusion"].includes(
          move.meta?.ailment.name,
        )
          ? {
              status: move.meta.ailment.name,
              statusChance: move.meta.ailment_chance
                ? move.meta.ailment_chance / 100
                : 1,
            }
          : {}),
        ...(move.meta?.min_hits
          ? { hits: [move.meta.min_hits, move.meta.max_hits] }
          : {}),
      };
      process.stdout.write(`${id} `);
    }),
  );
await fs.writeFile(
  "src/adventure/move-rules.ts",
  `// Generated from PokeAPI /api/v2/move; see scripts/fetch-move-rules.mjs.\nimport type { JourneyMove } from './journey'\nexport const MOVE_RULES: Record<string,JourneyMove> = ${JSON.stringify(output, null, 2)}\n`,
);
