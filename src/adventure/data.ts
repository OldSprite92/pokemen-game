export type AreaId =
  "camp" | "meadow" | "lake" | "cave" | "unova" | "kalos" | "alola" | "secret";
import { matchup } from "./type-chart";
import { ADDITIONAL_SPECIES } from "./additional-species";
export type Element =
  | "normal"
  | "grass"
  | "fire"
  | "water"
  | "electric"
  | "bug"
  | "flying"
  | "rock"
  | "poison"
  | "ice"
  | "fighting"
  | "ground"
  | "psychic"
  | "ghost"
  | "dragon"
  | "dark"
  | "steel"
  | "fairy";

export interface Move {
  id: string;
  name: string;
  type: Element;
  power: number;
}

export interface Species {
  id: number;
  name: string;
  type: Element;
  baseHp: number;
  attack: number;
  moves: [Move, Move];
  evolution?: { id: number; level: number };
  habitat: AreaId[];
  description: string;
}

export interface Area {
  id: AreaId;
  name: string;
  subtitle: string;
  description: string;
  speciesIds: number[];
  bossSpeciesId?: number;
  bossName?: string;
  badgeName?: string;
  level: number;
}

const move = (
  id: string,
  name: string,
  type: Element,
  power: number,
): Move => ({ id, name, type, power });
const tackle = move("tackle", "撞击", "normal", 11);
const quick = move("quick", "电光一闪", "normal", 12);
const leaf = move("leaf", "飞叶快刀", "grass", 12);
const ember = move("ember", "火花", "fire", 12);
const water = move("water", "水枪", "water", 12);
const spark = move("spark", "电击", "electric", 12);
const bug = move("bug", "虫咬", "bug", 12);
const gust = move("gust", "起风", "flying", 12);
const rock = move("rock", "落石", "rock", 13);
const poison = move("poison", "毒针", "poison", 11);

export const SPECIES_LIST: Species[] = [
  {
    id: 1,
    name: "妙蛙种子",
    type: "grass",
    baseHp: 40,
    attack: 8,
    moves: [leaf, tackle],
    evolution: { id: 2, level: 6 },
    habitat: ["meadow"],
    description: "背上的种子喜欢阳光。一起在草地散步吧！",
  },
  {
    id: 2,
    name: "妙蛙草",
    type: "grass",
    baseHp: 50,
    attack: 10,
    moves: [move("vine", "藤鞭", "grass", 15), tackle],
    habitat: ["meadow"],
    description: "花苞慢慢长大了。它会用藤蔓帮伙伴开路。",
  },
  {
    id: 4,
    name: "小火龙",
    type: "fire",
    baseHp: 38,
    attack: 9,
    moves: [ember, tackle],
    evolution: { id: 5, level: 6 },
    habitat: ["cave"],
    description: "尾巴上的小火苗暖暖的。它是勇敢的探险伙伴。",
  },
  {
    id: 5,
    name: "火恐龙",
    type: "fire",
    baseHp: 48,
    attack: 12,
    moves: [move("flame", "火焰牙", "fire", 15), quick],
    habitat: ["cave"],
    description: "长大后更有精神了！尾巴的火焰照亮前方。",
  },
  {
    id: 7,
    name: "杰尼龟",
    type: "water",
    baseHp: 43,
    attack: 8,
    moves: [water, tackle],
    evolution: { id: 8, level: 6 },
    habitat: ["lake"],
    description: "最喜欢在水边玩耍。遇到困难时也很沉着。",
  },
  {
    id: 8,
    name: "卡咪龟",
    type: "water",
    baseHp: 53,
    attack: 10,
    moves: [move("bubble", "泡沫光线", "water", 15), tackle],
    habitat: ["lake"],
    description: "毛茸茸的尾巴像海浪。它游泳的本领更厉害了。",
  },
  {
    id: 10,
    name: "绿毛虫",
    type: "bug",
    baseHp: 30,
    attack: 5,
    moves: [bug, tackle],
    evolution: { id: 11, level: 4 },
    habitat: ["meadow"],
    description: "小小的身体有大大的好奇心。最爱新鲜的叶子。",
  },
  {
    id: 11,
    name: "铁甲蛹",
    type: "bug",
    baseHp: 40,
    attack: 6,
    moves: [bug, tackle],
    evolution: { id: 12, level: 6 },
    habitat: ["meadow"],
    description: "安静地积蓄力量，准备迎接下一次美丽的变化。",
  },
  {
    id: 12,
    name: "巴大蝶",
    type: "bug",
    baseHp: 48,
    attack: 10,
    moves: [gust, bug],
    habitat: ["meadow"],
    description: "展开翅膀飞过花田。它记得每朵花的位置。",
  },
  {
    id: 16,
    name: "波波",
    type: "flying",
    baseHp: 34,
    attack: 7,
    moves: [gust, quick],
    evolution: { id: 17, level: 6 },
    habitat: ["meadow"],
    description: "会在前面的小路上等你。眼睛能发现远处的树果。",
  },
  {
    id: 17,
    name: "比比鸟",
    type: "flying",
    baseHp: 48,
    attack: 11,
    moves: [move("wing", "翅膀攻击", "flying", 15), quick],
    habitat: ["meadow"],
    description: "展开强壮的翅膀，为伙伴指引前进的方向。",
  },
  {
    id: 25,
    name: "皮卡丘",
    type: "electric",
    baseHp: 38,
    attack: 9,
    moves: [spark, quick],
    evolution: { id: 26, level: 7 },
    habitat: ["meadow"],
    description: "脸颊藏着小小的电力。开心时耳朵会轻轻晃动。",
  },
  {
    id: 26,
    name: "雷丘",
    type: "electric",
    baseHp: 52,
    attack: 12,
    moves: [move("bolt", "十万伏特", "electric", 16), quick],
    habitat: ["meadow"],
    description: "长长的尾巴帮助它保持平衡。现在能照亮更多地方！",
  },
  {
    id: 41,
    name: "超音蝠",
    type: "poison",
    baseHp: 35,
    attack: 7,
    moves: [gust, poison],
    evolution: { id: 42, level: 6 },
    habitat: ["cave"],
    description: "用声音寻找道路。黑暗的洞穴也难不倒它。",
  },
  {
    id: 42,
    name: "大嘴蝠",
    type: "poison",
    baseHp: 50,
    attack: 11,
    moves: [move("air", "空气利刃", "flying", 15), poison],
    habitat: ["cave"],
    description: "飞行变得更稳了。它会陪伙伴探索洞穴深处。",
  },
  {
    id: 54,
    name: "可达鸭",
    type: "water",
    baseHp: 40,
    attack: 8,
    moves: [water, tackle],
    evolution: { id: 55, level: 6 },
    habitat: ["lake"],
    description: "常常抱着脑袋发呆。游起泳来却很熟练。",
  },
  {
    id: 55,
    name: "哥达鸭",
    type: "water",
    baseHp: 52,
    attack: 11,
    moves: [move("pulse", "水之波动", "water", 15), quick],
    habitat: ["lake"],
    description: "在水面轻快地游动。额头的红宝石闪闪发亮。",
  },
  {
    id: 74,
    name: "小拳石",
    type: "rock",
    baseHp: 44,
    attack: 9,
    moves: [rock, tackle],
    evolution: { id: 75, level: 6 },
    habitat: ["cave"],
    description: "喜欢坐在石头堆里。伸出手臂就能和你打招呼。",
  },
  {
    id: 75,
    name: "隆隆石",
    type: "rock",
    baseHp: 57,
    attack: 12,
    moves: [move("rock-blast", "岩石爆击", "rock", 16), tackle],
    habitat: ["cave"],
    description: "四只手臂特别有力，能够搬开挡路的大石头。",
  },
  {
    id: 95,
    name: "大岩蛇",
    type: "rock",
    baseHp: 70,
    attack: 11,
    moves: [rock, move("slam", "摔打", "normal", 14)],
    habitat: ["cave"],
    description: "守护着闪光洞窟的大伙伴。它欣赏勇敢的挑战者。",
  },
  {
    id: 130,
    name: "暴鲤龙",
    type: "water",
    baseHp: 66,
    attack: 12,
    moves: [
      move("wave", "水流尾", "water", 15),
      move("bite", "咬住", "normal", 13),
    ],
    habitat: ["lake"],
    description: "湖泊的守护者。经过挑战，它会认可你和伙伴的默契。",
  },
  {
    id: 133,
    name: "伊布",
    type: "normal",
    baseHp: 41,
    attack: 8,
    moves: [quick, move("swift", "高速星星", "normal", 13)],
    habitat: ["meadow", "lake"],
    description: "毛茸茸的小伙伴，对每一条新路都充满好奇。",
  },
];

SPECIES_LIST.push(
  ...ADDITIONAL_SPECIES.map((s) => ({
    ...s,
    type: s.type as Element,
    habitat: s.habitat as AreaId[],
    moves: [
      s.type === "electric"
        ? spark
        : s.type === "fire"
          ? ember
          : s.type === "water"
            ? water
            : s.type === "grass"
              ? leaf
              : s.type === "rock"
                ? rock
                : s.type === "flying"
                  ? gust
                  : tackle,
      quick,
    ] as [Move, Move],
    ...([403, 404, 522, 650, 656, 661, 722, 725, 728, 744].includes(s.id)
      ? {
          evolution: {
            id: s.id === 744 ? 745 : s.id + 1,
            level: s.id === 403 ? 15 : s.id === 404 ? 30 : 17,
          },
        }
      : {}),
  })),
);
export const SPECIES = Object.fromEntries(
  SPECIES_LIST.map((species) => [species.id, species]),
) as Record<number, Species>;
export const STARTERS = [25, 4, 7] as const;
export const AREA_ORDER: AreaId[] = [
  "camp",
  "meadow",
  "lake",
  "cave",
  "unova",
  "kalos",
  "alola",
  "secret",
];
export const AREAS: Record<AreaId, Area> = {
  unova: {
    id: "unova",
    name: "雷文市",
    subtitle: "合众 · 灯光大道",
    description: "在灯光下与训练家切磋，寻找下一位伙伴。",
    speciesIds: [522, 523, 587, 25, 26, 17],
    bossSpeciesId: 523,
    bossName: "雷文守护者",
    badgeName: "闪电徽章",
    level: 18,
  },
  kalos: {
    id: "kalos",
    name: "密阿雷市",
    subtitle: "卡洛斯 · 花园道路",
    description: "街角和花园藏着新的相遇。",
    speciesIds: [650, 651, 656, 657, 661, 662, 133],
    bossSpeciesId: 657,
    bossName: "密阿雷守护者",
    badgeName: "花园徽章",
    level: 23,
  },
  alola: {
    id: "alola",
    name: "好奥乐市",
    subtitle: "阿罗拉 · 海风道路",
    description: "沿着海风追寻最后的主线徽章。",
    speciesIds: [722, 723, 725, 726, 728, 729, 744, 745],
    bossSpeciesId: 745,
    bossName: "好奥乐守护者",
    badgeName: "海风徽章",
    level: 29,
  },
  secret: {
    id: "secret",
    name: "流星瀑布",
    subtitle: "丰缘 · 隐藏道路",
    description: "三片钥匙指向瀑布深处的秘密。",
    speciesIds: [4, 5, 41, 42, 74, 75],
    bossSpeciesId: 5,
    bossName: "流星守护者",
    badgeName: "流星徽章",
    level: 34,
  },
  camp: {
    id: "camp",
    name: "暖阳营地",
    subtitle: "伙伴们的家",
    description: "休息一下，再一起出发。",
    speciesIds: [],
    level: 3,
  },
  meadow: {
    id: "meadow",
    name: "常磐市",
    subtitle: "关都 · 林荫道路",
    description: "草丛里藏着好奇的小伙伴。",
    speciesIds: [10, 16, 1, 133, 25],
    bossSpeciesId: 12,
    bossName: "花田守护者",
    badgeName: "绿叶徽章",
    level: 3,
  },
  lake: {
    id: "lake",
    name: "华蓝市",
    subtitle: "关都 · 河岸道路",
    description: "听，水面上传来了扑通声。",
    speciesIds: [54, 7, 133],
    bossSpeciesId: 130,
    bossName: "湖泊守护者",
    badgeName: "水滴徽章",
    level: 8,
  },
  cave: {
    id: "cave",
    name: "黑金市",
    subtitle: "神奥 · 矿山道路",
    description: "闪亮的岩石照出前方的路。",
    speciesIds: [74, 41, 4, 403, 404],
    bossSpeciesId: 95,
    bossName: "岩石守护者",
    badgeName: "星岩徽章",
    level: 13,
  },
};

const TYPE_NAMES: Record<Element, string> = {
  normal: "一般",
  grass: "草",
  fire: "火",
  water: "水",
  electric: "电",
  bug: "虫",
  flying: "飞行",
  rock: "岩石",
  poison: "毒",
  ice: "冰",
  fighting: "格斗",
  ground: "地面",
  psychic: "超能力",
  ghost: "幽灵",
  dragon: "龙",
  dark: "恶",
  steel: "钢",
  fairy: "妖精",
};
export function typeLabel(type: Element): string {
  return TYPE_NAMES[type];
}
export function spriteUrl(id: number, back = false): string {
  return `/game/pokemon/${id}${back ? "-back" : ""}.png`;
}

export function effectiveness(
  attackType: Element,
  defenseType: Element,
): number {
  return matchup(attackType, defenseType);
}
