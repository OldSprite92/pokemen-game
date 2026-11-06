import { ENGLISH_PACKS, type OfficialElement } from './languageLab';

export type MasteryStatus = 'new' | 'learning' | 'familiar' | 'mastered';
export type LearningKind = 'pinyin' | 'english';

export interface LearningRecord {
  attempts: number;
  firstCorrect: number;
  hintCount: number;
  wrongStreak: number;
  practiceDates: string[];
  correctSessionIds: string[];
  lastPracticedAt?: string;
  nextReviewDate?: string;
}

export interface SessionResultItem {
  kind: LearningKind;
  key: string;
  firstCorrect: boolean;
  hints: number;
}

export interface LanguageSessionLog {
  id: string;
  completedAt: string;
  firstCorrect: number;
  total: number;
  itemKeys: string[];
}

export interface LanguageLabProgress {
  version: 1;
  pinyin: Record<string, LearningRecord>;
  english: Partial<Record<OfficialElement, LearningRecord>>;
  sessions: LanguageSessionLog[];
  recentAnswers: boolean[];
  researchStamps: number;
  totalStampsEarned: number;
  researcherPacks: number;
  earnedStageBadges: string[];
  lastDailyRewardDate?: string;
}

export interface SessionCompletion {
  progress: LanguageLabProgress;
  dailyReward: boolean;
  researcherPack: boolean;
  newStageBadges: string[];
}

const EMPTY_RECORD = (): LearningRecord => ({
  attempts: 0,
  firstCorrect: 0,
  hintCount: 0,
  wrongStreak: 0,
  practiceDates: [],
  correctSessionIds: [],
});

export function createEmptyLanguageProgress(): LanguageLabProgress {
  return {
    version: 1,
    pinyin: {},
    english: {},
    sessions: [],
    recentAnswers: [],
    researchStamps: 0,
    totalStampsEarned: 0,
    researcherPacks: 0,
    earnedStageBadges: [],
  };
}

const storageKey = (trainerId?: number) => `language_lab_progress_${trainerId ?? 'guest'}`;

function localDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function loadLanguageProgress(trainerId?: number): LanguageLabProgress {
  const saved = localStorage.getItem(storageKey(trainerId));
  if (!saved) return createEmptyLanguageProgress();
  try {
    const parsed = JSON.parse(saved) as Partial<LanguageLabProgress>;
    return {
      ...createEmptyLanguageProgress(),
      ...parsed,
      pinyin: parsed.pinyin ?? {},
      english: parsed.english ?? {},
      sessions: parsed.sessions ?? [],
      recentAnswers: parsed.recentAnswers ?? [],
      earnedStageBadges: parsed.earnedStageBadges ?? [],
    };
  } catch {
    return createEmptyLanguageProgress();
  }
}

export function saveLanguageProgress(progress: LanguageLabProgress, trainerId?: number) {
  localStorage.setItem(storageKey(trainerId), JSON.stringify(progress));
}

export function getMasteryStatus(record?: LearningRecord): MasteryStatus {
  if (!record || record.attempts === 0) return 'new';
  if (
    record.practiceDates.length >= 3
    && record.firstCorrect >= 4
    && record.hintCount <= 1
  ) return 'mastered';
  if (record.correctSessionIds.length >= 2) return 'familiar';
  return 'learning';
}

export function getEnglishOptionCount(progress: LanguageLabProgress): number {
  const recent = progress.recentAnswers.slice(-12);
  if (recent.length < 6) return 3;
  const accuracy = recent.filter(Boolean).length / recent.length;
  if (accuracy < 0.7) return 2;
  if (recent.length >= 12 && accuracy > 0.9) return 4;
  return 3;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return localDayKey(next);
}

function updateRecord(
  current: LearningRecord | undefined,
  result: SessionResultItem,
  sessionId: string,
  completedAt: Date,
): LearningRecord {
  const base = current ?? EMPTY_RECORD();
  const day = localDayKey(completedAt);
  const firstCorrect = base.firstCorrect + (result.firstCorrect ? 1 : 0);
  const practiceDates = base.practiceDates.includes(day) ? base.practiceDates : [...base.practiceDates, day];
  const correctSessionIds = result.firstCorrect && !base.correctSessionIds.includes(sessionId)
    ? [...base.correctSessionIds, sessionId]
    : base.correctSessionIds;
  const interval = firstCorrect >= 4 ? 7 : firstCorrect >= 2 ? 3 : 1;

  return {
    attempts: base.attempts + 1,
    firstCorrect,
    hintCount: base.hintCount + result.hints,
    wrongStreak: result.firstCorrect ? 0 : base.wrongStreak + 1,
    practiceDates,
    correctSessionIds,
    lastPracticedAt: completedAt.toISOString(),
    nextReviewDate: addDays(completedAt, interval),
  };
}

function masteredStageIds(progress: LanguageLabProgress) {
  return ENGLISH_PACKS
    .filter((pack) => (pack.elements ?? []).every((element) => getMasteryStatus(progress.english[element]) === 'mastered'))
    .map((pack) => pack.id);
}

export function completeLanguageSession(
  current: LanguageLabProgress,
  results: SessionResultItem[],
  completedAt = new Date(),
): SessionCompletion {
  const day = localDayKey(completedAt);
  const sessionId = `${completedAt.toISOString()}-${current.sessions.length + 1}`;
  const progress: LanguageLabProgress = {
    ...current,
    pinyin: { ...current.pinyin },
    english: { ...current.english },
    sessions: [...current.sessions],
    recentAnswers: [...current.recentAnswers],
    earnedStageBadges: [...current.earnedStageBadges],
  };

  results.forEach((result) => {
    if (result.kind === 'pinyin') {
      progress.pinyin[result.key] = updateRecord(progress.pinyin[result.key], result, sessionId, completedAt);
    } else {
      const element = result.key as OfficialElement;
      progress.english[element] = updateRecord(progress.english[element], result, sessionId, completedAt);
    }
  });

  progress.recentAnswers = [
    ...progress.recentAnswers,
    ...results.map((result) => result.firstCorrect),
  ].slice(-12);
  progress.sessions.push({
    id: sessionId,
    completedAt: completedAt.toISOString(),
    firstCorrect: results.filter((result) => result.firstCorrect).length,
    total: results.length,
    itemKeys: results.map((result) => `${result.kind}:${result.key}`),
  });
  progress.sessions = progress.sessions.slice(-120);

  const dailyReward = progress.lastDailyRewardDate !== day;
  let researcherPack = false;
  if (dailyReward) {
    progress.lastDailyRewardDate = day;
    progress.researchStamps += 1;
    progress.totalStampsEarned += 1;
    if (progress.researchStamps >= 5) {
      progress.researchStamps -= 5;
      progress.researcherPacks += 1;
      researcherPack = true;
    }
  }

  const completedStages = masteredStageIds(progress);
  const newStageBadges = completedStages.filter((stage) => !progress.earnedStageBadges.includes(stage));
  progress.earnedStageBadges = [...progress.earnedStageBadges, ...newStageBadges];

  return { progress, dailyReward, researcherPack, newStageBadges };
}

export function getWeeklySummary(progress: LanguageLabProgress, now = new Date()) {
  const start = new Date(now);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  const sessions = progress.sessions.filter((session) => new Date(session.completedAt) >= start);
  const practiced = new Set(sessions.flatMap((session) => session.itemKeys));
  const reviewCount = [
    ...Object.values(progress.pinyin),
    ...Object.values(progress.english),
  ].filter((record) => record?.nextReviewDate && record.nextReviewDate <= localDayKey(now)).length;
  const masteredCount = [
    ...Object.values(progress.pinyin),
    ...Object.values(progress.english),
  ].filter((record) => getMasteryStatus(record) === 'mastered').length;

  return {
    sessionCount: sessions.length,
    practicedCount: practiced.size,
    masteredCount,
    reviewCount,
  };
}

export function resetLanguageProgress(trainerId?: number) {
  const fresh = createEmptyLanguageProgress();
  saveLanguageProgress(fresh, trainerId);
  return fresh;
}
