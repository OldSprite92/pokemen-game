import { SPECIES, type AreaId, type Element, type Move } from "./data";
import { SPECIES_STATS } from "./species-stats";
import { MOVE_RULES } from "./move-rules";

export type BallId =
  | "poke"
  | "great"
  | "ultra"
  | "quick"
  | "dusk"
  | "net"
  | "timer"
  | "level"
  | "master";
export type Status = "paralysis" | "burn" | "poison" | "confusion";
export const STATUS_NAMES: Record<Status, string> = {
  paralysis: "麻痹",
  burn: "灼伤",
  poison: "中毒",
  confusion: "混乱",
};
export const BALLS: Record<
  BallId,
  { name: string; price: number; multiplier: number; note: string }
> = {
  poke: { name: "精灵球", price: 20, multiplier: 1, note: "基本捕捉球" },
  great: {
    name: "超级球",
    price: 45,
    multiplier: 1.5,
    note: "基础捕捉效果 ×1.5",
  },
  ultra: { name: "高级球", price: 80, multiplier: 2, note: "基础捕捉效果 ×2" },
  quick: { name: "先机球", price: 85, multiplier: 1, note: "第一回合效果 ×5" },
  dusk: { name: "黑暗球", price: 65, multiplier: 1, note: "洞窟中效果 ×3" },
  net: {
    name: "捕网球",
    price: 65,
    multiplier: 1,
    note: "水或虫属性效果 ×3.5",
  },
  timer: {
    name: "计时球",
    price: 65,
    multiplier: 1,
    note: "每回合提升，最高 ×4",
  },
  level: {
    name: "等级球",
    price: 90,
    multiplier: 1,
    note: "我方等级更高时提升效果",
  },
  master: {
    name: "大师球",
    price: 0,
    multiplier: 255,
    note: "隐藏挑战限量奖励，野生目标必定捕获",
  },
};
export const BALL_IDS = Object.keys(BALLS) as BallId[];
export function ballMultiplier(
  id: BallId,
  area: AreaId,
  type: Element,
  turn: number,
  ownLevel: number,
  enemyLevel: number,
): number {
  if (id === "quick") return turn === 0 ? 5 : 1;
  if (id === "dusk") return ["cave", "secret"].includes(area) ? 3 : 1;
  if (id === "net") return ["water", "bug"].includes(type) ? 3.5 : 1;
  if (id === "timer") return Math.min(4, 1 + turn * 0.3);
  if (id === "level")
    return ownLevel >= enemyLevel * 4
      ? 8
      : ownLevel >= enemyLevel * 2
        ? 4
        : ownLevel > enemyLevel
          ? 2
          : 1;
  return BALLS[id].multiplier;
}
export interface JourneyMove extends Move {
  hits?: [number, number];
  accuracy: number;
  category: "physical" | "special";
  status?: Status;
  statusChance?: number;
  priority?: number;
}
const special = new Set(["electric", "fire", "water", "grass", "poison"]);
export const DISC_MOVES: Record<string, JourneyMove> = {
  thunderbolt: {
    id: "thunderbolt",
    name: "十万伏特",
    type: "electric",
    power: 90,
    accuracy: 100,
    category: "special",
    status: "paralysis",
    statusChance: 0.1,
  },
  flamethrower: {
    id: "flamethrower",
    name: "喷射火焰",
    type: "fire",
    power: 90,
    accuracy: 100,
    category: "special",
    status: "burn",
    statusChance: 0.1,
  },
  surf: {
    id: "surf",
    name: "冲浪",
    type: "water",
    power: 90,
    accuracy: 100,
    category: "special",
  },
  energy: {
    id: "energy",
    name: "能量球",
    type: "grass",
    power: 90,
    accuracy: 100,
    category: "special",
  },
  swift: {
    id: "swift",
    name: "高速星星",
    type: "normal",
    power: 60,
    accuracy: 100,
    category: "special",
  },
};
export const DISCS = [
  {
    id: "thunderbolt",
    price: 220,
    minLevel: 12,
    species: [25, 26, 403, 404, 405, 522, 523, 587],
  },
  {
    id: "flamethrower",
    price: 220,
    minLevel: 12,
    species: [4, 5, 662, 725, 726],
  },
  {
    id: "surf",
    price: 220,
    minLevel: 12,
    species: [7, 8, 54, 55, 130, 656, 657, 728, 729],
  },
  {
    id: "energy",
    price: 220,
    minLevel: 12,
    species: [1, 2, 12, 650, 651, 722, 723],
  },
  {
    id: "swift",
    price: 150,
    minLevel: 8,
    species: [
      25, 26, 133, 16, 17, 54, 55, 403, 404, 405, 522, 523, 587, 656, 657, 661,
      662, 744, 745,
    ],
  },
].map((disc) => ({
  ...disc,
  species: disc.species.filter((id) =>
    SPECIES_STATS[id].legalMoves.includes(
      MOVE_RULES[DISC_MOVES[disc.id].name].id,
    ),
  ),
}));
export function canLearn(
  speciesId: number,
  level: number,
  discId: string,
): boolean {
  const disc = DISCS.find((d) => d.id === discId);
  return !!disc && disc.species.includes(speciesId) && level >= disc.minLevel;
}
export function movesFor(
  speciesId: number,
  learned: string[] = [],
): JourneyMove[] {
  const species = SPECIES[speciesId];
  const natural: JourneyMove[] = species.moves.map((m) => ({
    ...m,
    power: m.power * 4,
    accuracy: 100,
    category: special.has(m.type) ? "special" : "physical",
    ...(m.id === "quick" && { priority: 1 }),
    ...(m.type === "fire" && { status: "burn" as const, statusChance: 0.15 }),
    ...(m.type === "electric" && {
      status: "paralysis" as const,
      statusChance: 0.2,
    }),
    ...(m.type === "poison" && {
      status: "poison" as const,
      statusChance: 0.3,
    }),
    ...(m.id === "pulse" && {
      status: "confusion" as const,
      statusChance: 0.2,
    }),
  }));
  const status: JourneyMove =
    species.type === "electric"
      ? {
          id: "thunder-wave",
          name: "电磁波",
          type: "electric",
          power: 0,
          accuracy: 90,
          category: "special",
          status: "paralysis",
          statusChance: 1,
        }
      : species.type === "fire"
        ? {
            id: "will-o-wisp",
            name: "鬼火",
            type: "fire",
            power: 0,
            accuracy: 85,
            category: "special",
            status: "burn",
            statusChance: 1,
          }
        : species.type === "poison" || species.type === "bug"
          ? {
              id: "poison-powder",
              name: "毒粉",
              type: "poison",
              power: 0,
              accuracy: 75,
              category: "special",
              status: "poison",
              statusChance: 1,
            }
          : {
              id: "confuse-ray",
              name: "奇异之光",
              type: "normal",
              power: 0,
              accuracy: 100,
              category: "special",
              status: "confusion",
              statusChance: 1,
            };
  const fourth: JourneyMove = {
    id: "body-slam",
    name: "泰山压顶",
    type: "normal",
    power: 65,
    accuracy: 95,
    category: "physical",
    status: "paralysis",
    statusChance: 0.15,
  };
  const canonical: Record<string, string> = {
    撞击: "tackle",
    电光一闪: "quick-attack",
    飞叶快刀: "razor-leaf",
    火花: "ember",
    水枪: "water-gun",
    电击: "thunder-shock",
    虫咬: "bug-bite",
    起风: "gust",
    落石: "rock-throw",
    毒针: "poison-sting",
    藤鞭: "vine-whip",
    火焰牙: "fire-fang",
    泡沫光线: "bubble-beam",
    翅膀攻击: "wing-attack",
    十万伏特: "thunderbolt",
    空气利刃: "air-cutter",
    水之波动: "water-pulse",
    岩石爆击: "rock-blast",
    摔打: "slam",
    水流尾: "aqua-tail",
    咬住: "bite",
    高速星星: "swift",
    泰山压顶: "body-slam",
    电磁波: "thunder-wave",
    鬼火: "will-o-wisp",
    毒粉: "poison-powder",
    奇异之光: "confuse-ray",
  };
  const legal = SPECIES_STATS[speciesId]?.legalMoves;
  const valid = (m: JourneyMove) =>
    !legal || legal.includes(canonical[m.name] || m.id);
  const base = [...natural, status, fourth].filter(valid);
  const fallback: JourneyMove[] = [
    {
      id: "bite",
      name: "咬住",
      type: "dark",
      power: 60,
      accuracy: 100,
      category: "physical",
    },
    {
      id: "swift",
      name: "高速星星",
      type: "normal",
      power: 60,
      accuracy: 100,
      category: "special",
    },
    {
      id: "headbutt",
      name: "头锤",
      type: "normal",
      power: 70,
      accuracy: 100,
      category: "physical",
    },
    {
      id: "water-pulse",
      name: "水之波动",
      type: "water",
      power: 60,
      accuracy: 100,
      category: "special",
      status: "confusion",
      statusChance: 0.2,
    },
    {
      id: "wing-attack",
      name: "翅膀攻击",
      type: "flying",
      power: 60,
      accuracy: 100,
      category: "physical",
    },
    {
      id: "confuse-ray",
      name: "奇异之光",
      type: "ghost",
      power: 0,
      accuracy: 100,
      category: "special",
      status: "confusion",
      statusChance: 1,
    },
    {
      id: "poison-powder",
      name: "毒粉",
      type: "poison",
      power: 0,
      accuracy: 75,
      category: "special",
      status: "poison",
      statusChance: 1,
    },
    {
      id: "tackle",
      name: "撞击",
      type: "normal",
      power: 40,
      accuracy: 100,
      category: "physical",
    },
  ];
  for (const move of fallback)
    if (
      base.length < 4 &&
      valid(move) &&
      !base.some((m) => m.name === move.name)
    )
      base.push(move);
  const result = base.slice(0, 4);
  learned.forEach((id, index) => {
    if (DISC_MOVES[id] && index < 4) result[index] = DISC_MOVES[id];
  });
  return result
    .filter(Boolean)
    .map((move) => ({ ...move, ...MOVE_RULES[move.name] }));
}
export interface Trainer {
  id: string;
  name: string;
  dialogue: string;
  species: number[];
  level: number;
  coins: number;
  fragment: boolean;
}
export const MAIN_AREAS: AreaId[] = [
  "meadow",
  "lake",
  "cave",
  "unova",
  "kalos",
  "alola",
];
export const BOSS_TEAMS: Record<string, number[]> = {
  meadow: [16, 12],
  lake: [54, 130],
  cave: [74, 42, 95],
  unova: [587, 25, 523],
  kalos: [651, 662, 133, 657],
  alola: [723, 726, 729, 745],
  secret: [75, 42, 95, 5],
};
export function trainersFor(area: AreaId): Trainer[] {
  const index = MAIN_AREAS.indexOf(area);
  if (area === "camp") return [];
  const levels = [5, 9, 14, 19, 24, 30];
  const pools = BOSS_TEAMS[area] || [75, 42, 5];
  return Array.from({ length: 3 }, (_, i) => ({
    id: `${area}-${i}`,
    name: ["旅行训练家小岚", "研究员阿青", "资深训练家阿岳"][i],
    dialogue: [
      "我在收集不同属性的伙伴。来试试我们的配合吗？",
      "击败守护者后，还能在道路上遇见它。准备好再挑战我吧！",
      "我研究了换人和异常状态。赢过我，就把珍藏的线索交给你。",
    ][i],
    species: [
      pools[i % pools.length],
      pools[(i + 1) % pools.length],
      ...(index >= 3 ? [pools[(i + 2) % pools.length]] : []),
    ],
    level: (levels[index] || 34) + i,
    coins: 60 + Math.max(0, index) * 25,
    fragment: i === 2 && index >= 0 && index < 3,
  }));
}
export const ROUTES = ["林荫道路", "河岸道路"];
export function routesFor(area: AreaId): string[] {
  const names: Partial<Record<AreaId, string[]>> = {
    lake: ["碧波河岸", "花园水道"],
    cave: ["矿山小径", "地下水道"],
    unova: ["街角步道", "游乐园路"],
    kalos: ["花园大道", "塔下广场"],
    alola: ["码头海岸", "棕榈小径"],
    secret: ["瀑布外径", "水晶洞窟"],
  };
  return names[area] || ROUTES;
}
export function cityObjective(index: number): string {
  return index === 0
    ? "在两条道路各调查一处路标，并完成三次野生相遇"
    : "调查两条道路的路标，并赢得两场野生对战";
}
