import type { Adventure, Continent, ElementType, MapDifficulty, PokeBallType, Sticker } from '../types';
import { getMapDifficultyConfig } from './mapDifficulty';

export interface ChapterTaskConfig {
  id: string;
  label: string;
  shortLabel: string;
  emoji: string;
  rewardText: string;
  stickerId: string;
}

export interface ChapterConfig {
  goalId: string;
  goalText: string;
  bossIntro: string;
  badgeName: string;
  badgeEmoji: string;
  storyFragments: string[];
}

export const CHAPTER_TASKS: Record<string, ChapterTaskConfig> = {
  treasure: {
    id: 'treasure',
    label: '找到一个宝箱',
    shortLabel: '找宝箱',
    emoji: '💎',
    rewardText: '发现宝箱，获得贴纸和精灵球！',
    stickerId: 'treasure',
  },
  encounter: {
    id: 'encounter',
    label: '遇见一只新伙伴',
    shortLabel: '遇见伙伴',
    emoji: '👣',
    rewardText: '记录了新的遭遇，图鉴更亮了！',
    stickerId: 'footprint',
  },
  battleWin: {
    id: 'battleWin',
    label: '赢下一场战斗',
    shortLabel: '赢战斗',
    emoji: '⚔️',
    rewardText: '赢得战斗，伙伴能量满满！',
    stickerId: 'victory',
  },
  rest: {
    id: 'rest',
    label: '到达一个休息点',
    shortLabel: '去休息',
    emoji: '💤',
    rewardText: '伙伴休息好了，准备继续冒险！',
    stickerId: 'rest',
  },
  boss: {
    id: 'boss',
    label: '挑战大陆守护者',
    shortLabel: '挑战Boss',
    emoji: '👑',
    rewardText: '挑战守护者，获得大陆徽章！',
    stickerId: 'boss',
  },
};

export const DEFAULT_TASK_IDS = ['treasure', 'encounter', 'battleWin'];

const CHAPTERS: Record<string, ChapterConfig> = {
  volcano: {
    goalId: 'volcano-badge',
    goalText: '找到火山徽章，唤醒勇敢之火',
    bossIntro: '熔岩巨兽守在火山口，想看看你们是不是勇敢的训练师。',
    badgeName: '火山徽章',
    badgeEmoji: '🌋',
    storyFragments: [
      '火山岛的石头里藏着会发光的火星。',
      '传说温柔的训练师能让岩浆安静下来。',
      '当三颗火星聚在一起，火山徽章就会出现。',
    ],
  },
  ice: {
    goalId: 'ice-badge',
    goalText: '收集雪花线索，帮助冰雪女王',
    bossIntro: '冰霜女王从雪雾里走来，她想考验你的耐心和勇气。',
    badgeName: '雪花徽章',
    badgeEmoji: '❄️',
    storyFragments: [
      '冰雪大陆的雪花会记住善良的脚印。',
      '迷路的伙伴只要听见笑声，就能找到回家的路。',
      '三片雪花拼在一起，会变成亮晶晶的徽章。',
    ],
  },
  jungle: {
    goalId: 'jungle-badge',
    goalText: '找到丛林徽章，听懂森林的声音',
    bossIntro: '丛林霸主从树影里跳出来，它想和最会保护伙伴的人比试。',
    badgeName: '丛林徽章',
    badgeEmoji: '🌴',
    storyFragments: [
      '丛林秘境里，每片叶子都在悄悄说话。',
      '宝可梦们会把最甜的果子留给勇敢的小朋友。',
      '集齐三段森林悄悄话，就能获得丛林徽章。',
    ],
  },
  'poison-swamp': {
    goalId: 'poison-swamp-badge',
    goalText: '收集净化露珠，驱散沼泽中的毒雾',
    bossIntro: '毒雾女王守在沼泽深处，它想看看你是否会照顾好伙伴。',
    badgeName: '净雾徽章',
    badgeEmoji: '☠️',
    storyFragments: [
      '沼泽的紫色雾气会在月光下变成小小的星点。',
      '只有互相提醒的伙伴，才不会在湿地里迷路。',
      '三颗露珠汇在一起，就能照亮净雾徽章。',
    ],
  },
  'normal-meadow': {
    goalId: 'normal-meadow-badge',
    goalText: '找到原野的四叶星，守护宁静的家园',
    bossIntro: '原野守护者在风车旁等待，它最欣赏会观察细节的训练师。',
    badgeName: '原野徽章',
    badgeEmoji: '⭐',
    storyFragments: [
      '星星原野的风会把悄悄话送到每一朵花身边。',
      '普通的石头下面，也许正藏着一个温暖的惊喜。',
      '集齐三颗四叶星，就能点亮原野徽章。',
    ],
  },
};

const ELEMENT_STICKERS: Record<ElementType, { emoji: string; name: string }> = {
  fire: { emoji: '🔥', name: '火焰贴纸' },
  water: { emoji: '💧', name: '水滴贴纸' },
  grass: { emoji: '🌿', name: '草叶贴纸' },
  electric: { emoji: '⚡', name: '闪电贴纸' },
  normal: { emoji: '⭐', name: '星星贴纸' },
  ice: { emoji: '❄️', name: '雪花贴纸' },
  fighting: { emoji: '👊', name: '拳头贴纸' },
  poison: { emoji: '☠️', name: '毒雾贴纸' },
  ground: { emoji: '🌍', name: '大地贴纸' },
  flying: { emoji: '🌪️', name: '旋风贴纸' },
  psychic: { emoji: '🔮', name: '水晶贴纸' },
  bug: { emoji: '🐛', name: '虫虫贴纸' },
  rock: { emoji: '🪨', name: '岩石贴纸' },
  ghost: { emoji: '👻', name: '幽灵贴纸' },
  dragon: { emoji: '🐉', name: '龙鳞贴纸' },
  dark: { emoji: '🌑', name: '月影贴纸' },
  steel: { emoji: '⚙️', name: '齿轮贴纸' },
  fairy: { emoji: '🧚', name: '妖精贴纸' },
  light: { emoji: '☀️', name: '阳光贴纸' },
};

export function getChapterConfig(continent: Continent): ChapterConfig {
  return CHAPTERS[continent.id] ?? {
    goalId: `${continent.id}-badge`,
    goalText: `找到${continent.name}徽章，完成新的冒险`,
    bossIntro: `${continent.bossName}正在等待一位勇敢又善良的训练师。`,
    badgeName: `${continent.name}徽章`,
    badgeEmoji: continent.emoji,
    storyFragments: [
      `${continent.name}藏着一个还没人讲过的小秘密。`,
      `这里的伙伴们都期待遇见新的朋友。`,
      `集齐三段故事，就能点亮${continent.name}徽章。`,
    ],
  };
}

export function ensureAdventureChapter(adventure: Adventure, continent: Continent): Adventure {
  const chapter = getChapterConfig(continent);
  return {
    ...adventure,
    difficulty: adventure.difficulty ?? 'easy',
    chapterGoalId: adventure.chapterGoalId ?? chapter.goalId,
    taskIds: adventure.taskIds?.length ? adventure.taskIds : DEFAULT_TASK_IDS,
    completedTaskIds: adventure.completedTaskIds ?? [],
    storyFragmentIds: adventure.storyFragmentIds ?? [],
  };
}

export function completeTask(adventure: Adventure, taskId: string): { adventure: Adventure; completedNow: boolean } {
  const completed = adventure.completedTaskIds ?? [];
  if (completed.includes(taskId)) {
    return { adventure, completedNow: false };
  }

  return {
    adventure: {
      ...adventure,
      completedTaskIds: [...completed, taskId],
    },
    completedNow: true,
  };
}

export function addStoryFragment(adventure: Adventure, continent: Continent): { adventure: Adventure; fragmentText: string | null } {
  const chapter = getChapterConfig(continent);
  const existing = adventure.storyFragmentIds ?? [];
  const nextIndex = existing.length;
  if (nextIndex >= chapter.storyFragments.length) {
    return { adventure, fragmentText: null };
  }

  return {
    adventure: {
      ...adventure,
      storyFragmentIds: [...existing, `${chapter.goalId}-fragment-${nextIndex + 1}`],
    },
    fragmentText: chapter.storyFragments[nextIndex],
  };
}

export function createTaskSticker(
  continent: Continent,
  taskId: string,
  trainerId?: number
): Omit<Sticker, 'id'> {
  const task = CHAPTER_TASKS[taskId] ?? CHAPTER_TASKS.treasure;
  const elementSticker = ELEMENT_STICKERS[continent.element];
  return {
    trainerId,
    stickerId: `${continent.id}-${task.stickerId}`,
    name: taskId === 'boss' ? `${continent.name}守护者贴纸` : elementSticker.name,
    emoji: taskId === 'boss' ? '👑' : elementSticker.emoji,
    continentId: continent.id,
    earnedAt: new Date(),
  };
}

export function createBadge(continent: Continent, trainerId?: number, difficulty?: MapDifficulty) {
  const chapter = getChapterConfig(continent);
  const difficultyConfig = getMapDifficultyConfig(difficulty);
  const difficultyPrefix = difficultyConfig.id === 'easy' ? '' : `${difficultyConfig.label}`;
  return {
    trainerId,
    continentId: continent.id,
    difficulty: difficultyConfig.id,
    name: `${difficultyPrefix}${chapter.badgeName}`,
    emoji: difficultyConfig.id === 'hell' ? '👑' : chapter.badgeEmoji,
    earnedAt: new Date(),
  };
}

export function getTaskRewardBall(taskId: string): { type: PokeBallType; count: number } {
  if (taskId === 'boss') return { type: 'great', count: 1 };
  return { type: 'normal', count: 1 };
}
