import type {
  Continent,
  ElementType,
  GymBattleFormat,
  GymChallenge,
  GymProgress,
  GymRosterMember,
  GymSwitchRule,
  MapDifficulty,
  Monster,
} from '../types';
import { getMonsterElements } from './monsterElements';
import { ALL_WILD_MONSTERS, generateWildMonster } from './wildMonsters';

export interface GymDefinition {
  name: string;
  leaderName: string;
  leaderTitle: string;
  greeting: string;
}

/** 19 种属性的道馆与馆主。馆主是 NPC，不参与属性或伤害计算。 */
export const GYM_DEFINITIONS: Record<ElementType, GymDefinition> = {
  fire: { name: '红莲道馆', leaderName: '夏伯', leaderTitle: '炽焰馆主', greeting: '火焰会照亮勇敢的选择。' },
  water: { name: '华蓝道馆', leaderName: '小霞', leaderTitle: '浪花馆主', greeting: '水流会记住每一次灵巧的转弯。' },
  grass: { name: '玉虹道馆', leaderName: '莉佳', leaderTitle: '花园馆主', greeting: '耐心培育的伙伴，总能开出惊喜。' },
  electric: { name: '雷电道馆', leaderName: '马志士', leaderTitle: '雷鸣馆主', greeting: '电光一闪前，先看清你的目标！' },
  normal: { name: '橙华道馆', leaderName: '千里', leaderTitle: '原野馆主', greeting: '最简单的招式，也能练成最可靠的本领。' },
  ice: { name: '雪花道馆', leaderName: '柳伯', leaderTitle: '霜雪馆主', greeting: '冷静观察，才不会在冰面上打滑。' },
  fighting: { name: '武斗道馆', leaderName: '阿四', leaderTitle: '热拳馆主', greeting: '拳头的力量，来自守护伙伴的决心。' },
  poison: { name: '浅红道馆', leaderName: '阿桔', leaderTitle: '迷雾馆主', greeting: '看不见的变化，也要学会提前应对。' },
  ground: { name: '沙隐道馆', leaderName: '坂木', leaderTitle: '大地馆主', greeting: '脚下站稳，才能找到胜利的时机。' },
  flying: { name: '桔梗道馆', leaderName: '阿速', leaderTitle: '风翼馆主', greeting: '抬头看看，答案有时在风里。' },
  psychic: { name: '金黄道馆', leaderName: '娜姿', leaderTitle: '心灵馆主', greeting: '读懂局势，比猜中对手更重要。' },
  bug: { name: '桧皮道馆', leaderName: '阿笔', leaderTitle: '虫鸣馆主', greeting: '小小的伙伴，也能织出巧妙战术。' },
  rock: { name: '黑金道馆', leaderName: '瓢太', leaderTitle: '岩壁馆主', greeting: '岩石不会着急，稳稳推进就会赢。' },
  ghost: { name: '紫苑道馆', leaderName: '松叶', leaderTitle: '幽影馆主', greeting: '别害怕未知，先听听它想告诉你什么。' },
  dragon: { name: '烟墨道馆', leaderName: '小椿', leaderTitle: '龙息馆主', greeting: '强大不是逞强，而是懂得何时配合。' },
  dark: { name: '夜幕道馆', leaderName: '玛俐', leaderTitle: '月影馆主', greeting: '在暗处看清机会，才叫真正的冷静。' },
  steel: { name: '水脉道馆', leaderName: '东钢', leaderTitle: '钢心馆主', greeting: '经得住考验的队伍，才有闪亮的默契。' },
  fairy: { name: '香薰道馆', leaderName: '玛绣', leaderTitle: '花香馆主', greeting: '优雅的配合，也可以非常有力量。' },
  light: { name: '日轮道馆', leaderName: '曦月', leaderTitle: '晨光馆主', greeting: '让伙伴的光，照出下一步方向吧。' },
};

const ROSTER_SIZE_BY_DIFFICULTY: Record<MapDifficulty, number> = { easy: 3, hard: 4, hell: 5 };

export function getGymDefinition(element: ElementType) {
  return GYM_DEFINITIONS[element];
}

/** 生成并固定一张地图内的 3–6 人馆内阵容；人数会随地图难度成长。 */
export function createGymRoster(continent: Continent, difficulty: MapDifficulty = 'easy'): GymRosterMember[] {
  const candidates = ALL_WILD_MONSTERS.filter((config) => getMonsterElements(config.monster).includes(continent.element));
  const rosterSize = ROSTER_SIZE_BY_DIFFICULTY[difficulty];
  if (candidates.length === 0) throw new Error(`${continent.element} 道馆没有可用馆内宝可梦`);

  return Array.from({ length: rosterSize }, (_, index) => {
    const config = candidates[index % candidates.length];
    const base = generateWildMonster(config);
    const level = Math.max(3, Math.min(14, base.level + Math.floor(index / candidates.length)));
    const levelMultiplier = level / base.level;
    return {
      id: `${continent.id}-gym-${index + 1}-${config.monster.name}`,
      monster: {
        ...base,
        level,
        hp: Math.max(1, Math.round(base.hp * levelMultiplier)),
        maxHp: Math.max(1, Math.round((base.maxHp ?? base.hp) * levelMultiplier)),
        attack: Math.max(1, Math.round(base.attack * levelMultiplier)),
        defense: Math.max(1, Math.round(base.defense * levelMultiplier)),
        speed: Math.max(1, Math.round(base.speed * levelMultiplier)),
      },
    };
  });
}

export function createGymProgress(continent: Continent, difficulty: MapDifficulty = 'easy'): GymProgress {
  return {
    continentId: continent.id,
    cleared: false,
    attempts: 0,
    roster: createGymRoster(continent, difficulty),
  };
}

function chooseFormat(availableCount: number, random: () => number): GymBattleFormat {
  if (availableCount <= 1) return 1;
  const roll = random();
  if (availableCount === 2) return roll < 0.4 ? 1 : 2;
  if (roll < 0.2) return 1;
  return roll < 0.65 ? 2 : 3;
}

function pickUnique<T>(items: T[], count: number, random: () => number): T[] {
  const pool = [...items];
  const picked: T[] = [];
  while (pool.length > 0 && picked.length < count) {
    const index = Math.floor(random() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

/** 规则与对手在一次挑战书打开后锁定；离开页面不会重掷。 */
export function createGymChallenge(
  progress: GymProgress,
  availableMonsters: Monster[],
  random: () => number = Math.random,
): GymChallenge {
  const ready = availableMonsters.filter((monster) => !monster.fatigueEndTime || monster.fatigueEndTime <= new Date());
  const format = Math.min(chooseFormat(ready.length, random), progress.roster.length) as GymBattleFormat;
  const switchRule: GymSwitchRule = format === 1 ? 'solo' : random() < 0.5 ? 'free' : 'locked';
  // 自由换人时双方各保留一只替补；无法形成替补时自动改为坚守到底。
  const canHaveReserve = format > 1 && progress.roster.length > format && ready.length > format;
  const effectiveSwitchRule: GymSwitchRule = switchRule === 'free' && !canHaveReserve ? 'locked' : switchRule;
  const opponentCount = format + (effectiveSwitchRule === 'free' ? 1 : 0);
  const chosenOpponents = pickUnique(progress.roster, opponentCount, random);
  return {
    format,
    switchRule: effectiveSwitchRule,
    // 馆主决定赛制与对手；出战伙伴永远由孩子自己挑选。
    playerIds: [],
    opponentIds: chosenOpponents.map((member) => member.id),
    createdAt: new Date(),
  };
}

export const GYM_FORMAT_LABEL: Record<GymBattleFormat, string> = { 1: '1 对 1', 2: '2 对 2', 3: '3 对 3' };
export const GYM_SWITCH_RULE_LABEL: Record<GymSwitchRule, string> = {
  solo: '单骑挑战',
  free: '自由换人',
  locked: '坚守到底',
};

export function gymRuleExplanation(switchRule: GymSwitchRule) {
  if (switchRule === 'solo') return '双方各派一只伙伴，直到分出胜负。';
  if (switchRule === 'free') return '可以在轮到自己时主动换人；换入伙伴会获得首回合减伤。';
  return '不能主动换人，只有伙伴完全战败后才能派出下一只。';
}
