import type { Adventure, Continent, MapCell, MapDifficulty, Monster } from '../types';
import { generateMapGrid } from './continentData';

export interface MapDifficultyConfig {
  id: MapDifficulty;
  label: string;
  displayLabel: string;
  emoji: string;
  description: string;
  unlockHint: string;
  enemyLevelOffset: number;
  enemyStatMultiplier: number;
  bossHpMultiplier: number;
  bossAttackMultiplier: number;
  expMultiplier: number;
  treasureLabel: string;
}

export const MAP_DIFFICULTY_CONFIG: Record<MapDifficulty, MapDifficultyConfig> = {
  easy: {
    id: 'easy',
    label: '简单',
    displayLabel: '简单',
    emoji: '🌱',
    description: '宝箱和休息点更多，适合孩子自己探索。',
    unlockHint: '默认开放',
    enemyLevelOffset: 0,
    enemyStatMultiplier: 0.95,
    bossHpMultiplier: 0.9,
    bossAttackMultiplier: 0.9,
    expMultiplier: 1,
    treasureLabel: '普通贴纸',
  },
  hard: {
    id: 'hard',
    label: '困难',
    displayLabel: '困难',
    emoji: '🔥',
    description: '敌人更强，路线更紧张，适合亲子一起挑战。',
    unlockHint: '通关简单后开放',
    enemyLevelOffset: 2,
    enemyStatMultiplier: 1.15,
    bossHpMultiplier: 1.2,
    bossAttackMultiplier: 1.15,
    expMultiplier: 1.35,
    treasureLabel: '稀有贴纸',
  },
  hell: {
    id: 'hell',
    label: '地狱',
    displayLabel: '地狱 / 勇者试炼',
    emoji: '👑',
    description: '最刺激的勇者试炼，奖励以限定收藏为主。',
    unlockHint: '通关困难后开放',
    enemyLevelOffset: 4,
    enemyStatMultiplier: 1.3,
    bossHpMultiplier: 1.5,
    bossAttackMultiplier: 1.35,
    expMultiplier: 1.75,
    treasureLabel: '限定贴纸',
  },
};

interface StoredDifficultyProgress {
  completed: Record<string, Partial<Record<MapDifficulty, boolean>>>;
  parentUnlocked: Record<string, Partial<Record<MapDifficulty, boolean>>>;
}

const DEFAULT_PROGRESS: StoredDifficultyProgress = {
  completed: {},
  parentUnlocked: {},
};

/**
 * A completed difficulty is a finished expedition, not a disposable map.
 * Keep its explored tiles separately from the continent's currently selected
 * difficulty so returning to it never rerolls the route or its resources.
 */
export interface DifficultyExploration {
  cells: MapCell[];
  adventure: Adventure;
  savedAt: number;
}

type StoredExplorations = Record<string, Partial<Record<MapDifficulty, DifficultyExploration>>>;

function explorationKey(trainerId?: number) {
  return trainerId ? `mapExploration_trainer_${trainerId}` : 'mapExploration';
}

function getStoredExplorations(trainerId?: number): StoredExplorations {
  try {
    return JSON.parse(localStorage.getItem(explorationKey(trainerId)) || '{}') as StoredExplorations;
  } catch {
    return {};
  }
}

export function getDifficultyExploration(
  continentId: string,
  difficulty?: MapDifficulty,
  trainerId?: number,
): DifficultyExploration | null {
  return getStoredExplorations(trainerId)[continentId]?.[normalizeDifficulty(difficulty)] ?? null;
}

export function saveDifficultyExploration(
  continentId: string,
  difficulty: MapDifficulty | undefined,
  trainerId: number | undefined,
  cells: MapCell[],
  adventure: Adventure,
) {
  const normalized = normalizeDifficulty(difficulty);
  const explorations = getStoredExplorations(trainerId);
  explorations[continentId] = {
    ...explorations[continentId],
    [normalized]: {
      // Store value copies so later React state mutations cannot change a saved route.
      cells: cells.map((cell) => ({ ...cell })),
      adventure: { ...adventure, events: [...adventure.events] },
      savedAt: Date.now(),
    },
  };
  localStorage.setItem(explorationKey(trainerId), JSON.stringify(explorations));
}

/** Remove a deleted custom map's saved route for this trainer. */
export function deleteDifficultyExploration(continentId: string, trainerId?: number) {
  const explorations = getStoredExplorations(trainerId);
  if (explorations[continentId]) {
    delete explorations[continentId];
    localStorage.setItem(explorationKey(trainerId), JSON.stringify(explorations));
  }

  const progress = getDifficultyProgress(trainerId);
  delete progress.completed[continentId];
  delete progress.parentUnlocked[continentId];
  saveDifficultyProgress(progress, trainerId);
}

export const MAP_DIFFICULTIES: MapDifficulty[] = ['easy', 'hard', 'hell'];

export function normalizeDifficulty(difficulty?: MapDifficulty): MapDifficulty {
  return difficulty && MAP_DIFFICULTY_CONFIG[difficulty] ? difficulty : 'easy';
}

export function getMapDifficultyConfig(difficulty?: MapDifficulty): MapDifficultyConfig {
  return MAP_DIFFICULTY_CONFIG[normalizeDifficulty(difficulty)];
}

function progressKey(trainerId?: number) {
  return trainerId ? `mapDifficultyProgress_trainer_${trainerId}` : 'mapDifficultyProgress';
}

export function getDifficultyProgress(trainerId?: number): StoredDifficultyProgress {
  try {
    const saved = localStorage.getItem(progressKey(trainerId));
    return saved ? { ...DEFAULT_PROGRESS, ...JSON.parse(saved) } : DEFAULT_PROGRESS;
  } catch {
    return DEFAULT_PROGRESS;
  }
}

function saveDifficultyProgress(progress: StoredDifficultyProgress, trainerId?: number) {
  localStorage.setItem(progressKey(trainerId), JSON.stringify(progress));
}

export function hasCompletedDifficulty(
  continentId: string,
  difficulty: MapDifficulty,
  trainerId?: number,
  legacyCompleted = false
) {
  if (difficulty === 'easy' && legacyCompleted) return true;
  return Boolean(getDifficultyProgress(trainerId).completed[continentId]?.[difficulty]);
}

export function unlockDifficultyByParent(
  continentId: string,
  difficulty: MapDifficulty,
  trainerId?: number
) {
  const progress = getDifficultyProgress(trainerId);
  progress.parentUnlocked = {
    ...progress.parentUnlocked,
    [continentId]: {
      ...progress.parentUnlocked[continentId],
      [difficulty]: true,
    },
  };
  saveDifficultyProgress(progress, trainerId);
}

export function isDifficultyUnlocked(
  continentId: string,
  difficulty: MapDifficulty,
  trainerMonsters: Monster[],
  trainerId?: number,
  legacyCompleted = false
) {
  const progress = getDifficultyProgress(trainerId);
  if (difficulty === 'easy') return true;
  if (progress.parentUnlocked[continentId]?.[difficulty]) return true;

  const hasTwoReadyPartners = trainerMonsters.filter((monster) => monster.level >= 4).length >= 2;
  if (difficulty === 'hard') {
    return hasCompletedDifficulty(continentId, 'easy', trainerId, legacyCompleted) || hasTwoReadyPartners;
  }
  return hasCompletedDifficulty(continentId, 'hard', trainerId);
}

export function markDifficultyComplete(
  continentId: string,
  difficulty?: MapDifficulty,
  trainerId?: number
) {
  const normalized = normalizeDifficulty(difficulty);
  const progress = getDifficultyProgress(trainerId);
  progress.completed = {
    ...progress.completed,
    [continentId]: {
      ...progress.completed[continentId],
      [normalized]: true,
    },
  };
  saveDifficultyProgress(progress, trainerId);
}

export function getDifficultyRewardText(difficulty?: MapDifficulty) {
  const config = getMapDifficultyConfig(difficulty);
  if (config.id === 'easy') return '获得大陆徽章！';
  if (config.id === 'hard') return '获得困难徽章亮边！';
  return '获得勇者徽章边框！';
}

export function createDifficultyCells(continent: Continent, difficulty?: MapDifficulty): MapCell[] {
  const normalized = normalizeDifficulty(difficulty);
  const cells = generateMapGrid(continent.gridSize, continent.element);

  return cells.map((cell) => {
    if (cell.type === 'start' || cell.type === 'boss') return cell;
    const roll = Math.random();

    if (normalized === 'easy') {
      if (cell.type === 'blocked' && roll < 0.45) return { ...cell, type: 'empty' };
      if (cell.type === 'wild' && roll < 0.18) return { ...cell, type: 'treasure' };
      return cell;
    }

    if (normalized === 'hard') {
      if (cell.type === 'empty' && roll < 0.2) return { ...cell, type: 'wild' };
      if (cell.type === 'rest' && roll < 0.35) return { ...cell, type: 'empty' };
      if (cell.type === 'treasure' && roll < 0.2) return { ...cell, type: 'wild' };
      return cell;
    }

    if (cell.type === 'empty' && roll < 0.3) return { ...cell, type: 'wild' };
    if (cell.type === 'rest' && roll < 0.6) return { ...cell, type: 'wild' };
    if (cell.type === 'treasure' && roll < 0.35) return { ...cell, type: 'blocked' };
    return cell;
  });
}

function scaleStat(value: number, multiplier: number) {
  return Math.max(1, Math.floor(value * multiplier));
}

export function scaleMonsterForDifficulty(
  monster: Monster,
  difficulty?: MapDifficulty,
  isBoss = false
): Monster {
  const config = getMapDifficultyConfig(difficulty);
  const nextLevel = Math.min(14, monster.level + config.enemyLevelOffset);
  const hpMultiplier = isBoss ? config.bossHpMultiplier : config.enemyStatMultiplier;
  const attackMultiplier = isBoss ? config.bossAttackMultiplier : config.enemyStatMultiplier;

  return {
    ...monster,
    level: nextLevel,
    hp: scaleStat(monster.hp, hpMultiplier),
    maxHp: scaleStat(monster.maxHp || monster.hp, hpMultiplier),
    attack: scaleStat(monster.attack, attackMultiplier),
    defense: scaleStat(monster.defense, config.enemyStatMultiplier),
    speed: scaleStat(monster.speed, config.enemyStatMultiplier),
    expToNext: Math.floor((monster.expToNext || 100) * config.expMultiplier),
  };
}

export function createBossMonster(continent: Continent, difficulty?: MapDifficulty): Monster {
  const config = getMapDifficultyConfig(difficulty);
  const baseLevel = config.id === 'easy' ? 8 : config.id === 'hard' ? 10 : 12;
  const boss: Monster = {
    name: continent.bossName,
    element: continent.element,
    skills: [
      {
        id: `${continent.id}-boss-1`,
        name: `${continent.name}重击`,
        element: continent.element,
        power: config.id === 'easy' ? 28 : config.id === 'hard' ? 34 : 40,
        accuracy: config.id === 'hell' ? 82 : 88,
        description: `${continent.bossName}使出守护者力量`,
      },
      {
        id: `${continent.id}-boss-2`,
        name: '守护咆哮',
        element: 'normal',
        power: config.id === 'easy' ? 22 : 28,
        accuracy: 95,
        description: '发出守护大陆的咆哮',
      },
    ],
    avatar: continent.bossAvatar,
    hp: 110,
    maxHp: 110,
    attack: 72,
    defense: 65,
    speed: 45,
    level: baseLevel,
    exp: 0,
    expToNext: 100,
    createdBy: 'system',
    createdAt: new Date(),
  };

  return scaleMonsterForDifficulty(boss, difficulty, true);
}
