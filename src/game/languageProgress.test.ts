import { beforeEach, describe, expect, it } from 'vitest';
import {
  completeLanguageSession,
  createEmptyLanguageProgress,
  getEnglishOptionCount,
  getMasteryStatus,
  loadLanguageProgress,
  saveLanguageProgress,
} from './languageProgress';

const results = [
  { kind: 'pinyin' as const, key: 'bubblepig', firstCorrect: true, hints: 0 },
  { kind: 'english' as const, key: 'water', firstCorrect: true, hints: 0 },
];

describe('语言研究进度', () => {
  beforeEach(() => localStorage.clear());

  it('每日奖励一天只发一次', () => {
    const first = completeLanguageSession(createEmptyLanguageProgress(), results, new Date('2026-09-29T08:00:00Z'));
    const second = completeLanguageSession(first.progress, results, new Date('2026-09-29T12:00:00Z'));

    expect(first.dailyReward).toBe(true);
    expect(first.progress.researchStamps).toBe(1);
    expect(second.dailyReward).toBe(false);
    expect(second.progress.researchStamps).toBe(1);
  });

  it('累计 5 枚研究章自动兑换研究员礼包', () => {
    let progress = createEmptyLanguageProgress();
    let lastResult = completeLanguageSession(progress, results, new Date('2026-09-25T08:00:00Z'));
    progress = lastResult.progress;
    for (let day = 26; day <= 29; day += 1) {
      lastResult = completeLanguageSession(progress, results, new Date(`2026-09-${day}T08:00:00Z`));
      progress = lastResult.progress;
    }

    expect(lastResult.researcherPack).toBe(true);
    expect(progress.researchStamps).toBe(0);
    expect(progress.researcherPacks).toBe(1);
  });

  it('跨 3 天且首答正确 4 次后标记为已掌握', () => {
    let progress = createEmptyLanguageProgress();
    for (const date of ['2026-09-25', '2026-09-26', '2026-09-27', '2026-09-27']) {
      progress = completeLanguageSession(progress, [results[0]], new Date(`${date}T08:00:00Z`)).progress;
    }
    expect(getMasteryStatus(progress.pinyin.bubblepig)).toBe('mastered');
  });

  it('根据最近正确率将英语选项调整为 2 到 4 个', () => {
    const low = { ...createEmptyLanguageProgress(), recentAnswers: [true, false, false, true, false, false] };
    const high = { ...createEmptyLanguageProgress(), recentAnswers: Array(12).fill(true) };
    expect(getEnglishOptionCount(low)).toBe(2);
    expect(getEnglishOptionCount(high)).toBe(4);
  });

  it('按训练师隔离并恢复本地记录', () => {
    const progress = completeLanguageSession(createEmptyLanguageProgress(), results, new Date('2026-09-29T08:00:00Z')).progress;
    saveLanguageProgress(progress, 7);
    expect(loadLanguageProgress(7).sessions).toHaveLength(1);
    expect(loadLanguageProgress(8).sessions).toHaveLength(0);
  });
});
