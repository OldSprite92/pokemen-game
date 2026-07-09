import type { PokeBallType, Sticker } from '../types';

export type DailyTaskAction = 'treasure' | 'encounter' | 'battleWin' | 'rest' | 'catch';

export interface DailyTaskConfig {
  id: string;
  action: DailyTaskAction;
  label: string;
  shortLabel: string;
  emoji: string;
  rewardText: string;
}

export interface DailyTaskState {
  date: string;
  taskIds: string[];
  completedTaskIds: string[];
  bonusClaimed: boolean;
}

export const DAILY_TASKS: Record<string, DailyTaskConfig> = {
  dailyTreasure: {
    id: 'dailyTreasure',
    action: 'treasure',
    label: '找到一个宝箱',
    shortLabel: '找宝箱',
    emoji: '💎',
    rewardText: '获得 1 个精灵球',
  },
  dailyEncounter: {
    id: 'dailyEncounter',
    action: 'encounter',
    label: '遇见一只野生伙伴',
    shortLabel: '遇见伙伴',
    emoji: '👣',
    rewardText: '获得 1 个精灵球',
  },
  dailyBattle: {
    id: 'dailyBattle',
    action: 'battleWin',
    label: '赢下一场战斗',
    shortLabel: '赢战斗',
    emoji: '⚔️',
    rewardText: '获得 1 个精灵球',
  },
  dailyRest: {
    id: 'dailyRest',
    action: 'rest',
    label: '到休息点休息一次',
    shortLabel: '去休息',
    emoji: '💤',
    rewardText: '获得 1 个精灵球',
  },
  dailyCatch: {
    id: 'dailyCatch',
    action: 'catch',
    label: '邀请一位新伙伴入队',
    shortLabel: '捕获伙伴',
    emoji: '🎊',
    rewardText: '获得今日贴纸',
  },
};

const DAILY_ROTATION = [
  ['dailyTreasure', 'dailyEncounter', 'dailyBattle'],
  ['dailyEncounter', 'dailyRest', 'dailyBattle'],
  ['dailyTreasure', 'dailyRest', 'dailyCatch'],
  ['dailyTreasure', 'dailyBattle', 'dailyRest'],
];

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getStorageKey(trainerId?: number) {
  return trainerId ? `dailyTasks_trainer_${trainerId}` : 'dailyTasks_guest';
}

function pickTaskIds(dateKey: string) {
  const seed = dateKey.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return DAILY_ROTATION[seed % DAILY_ROTATION.length];
}

export function getDailyTaskState(trainerId?: number): DailyTaskState {
  const date = getDateKey();
  const saved = localStorage.getItem(getStorageKey(trainerId));
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as DailyTaskState;
      if (parsed.date === date && parsed.taskIds?.length) {
        return {
          date,
          taskIds: parsed.taskIds,
          completedTaskIds: parsed.completedTaskIds ?? [],
          bonusClaimed: parsed.bonusClaimed ?? false,
        };
      }
    } catch {
      // Ignore broken localStorage data and recreate below.
    }
  }

  const fresh: DailyTaskState = {
    date,
    taskIds: pickTaskIds(date),
    completedTaskIds: [],
    bonusClaimed: false,
  };
  localStorage.setItem(getStorageKey(trainerId), JSON.stringify(fresh));
  return fresh;
}

export function getDailyTaskConfigs(trainerId?: number) {
  const state = getDailyTaskState(trainerId);
  return state.taskIds.map((id) => DAILY_TASKS[id]).filter(Boolean);
}

export function completeDailyTask(action: DailyTaskAction, trainerId?: number) {
  const state = getDailyTaskState(trainerId);
  const task = state.taskIds.map((id) => DAILY_TASKS[id]).find((config) => config?.action === action);
  if (!task || state.completedTaskIds.includes(task.id)) {
    return { state, completedNow: false, task: null, bonusCompletedNow: false };
  }

  const completedTaskIds = [...state.completedTaskIds, task.id];
  const bonusCompletedNow = completedTaskIds.length === state.taskIds.length && !state.bonusClaimed;
  const next: DailyTaskState = {
    ...state,
    completedTaskIds,
    bonusClaimed: bonusCompletedNow ? true : state.bonusClaimed,
  };
  localStorage.setItem(getStorageKey(trainerId), JSON.stringify(next));
  return { state: next, completedNow: true, task, bonusCompletedNow };
}

export function getDailyTaskRewardBall(taskId: string): { type: PokeBallType; count: number } {
  if (taskId === 'dailyCatch') return { type: 'great', count: 1 };
  return { type: 'normal', count: 1 };
}

export function createDailySticker(trainerId?: number): Omit<Sticker, 'id'> {
  return {
    trainerId,
    stickerId: `daily-${getDateKey()}`,
    name: '今日冒险贴纸',
    emoji: '🌈',
    continentId: 'daily',
    earnedAt: new Date(),
  };
}
