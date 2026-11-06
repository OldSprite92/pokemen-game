import type { ElementType, Monster, PokeBallType } from '../types';

export const DEFAULT_POKEBALLS: Record<PokeBallType, number> = {
  normal: 3,
  great: 1,
  ultra: 0,
  master: 0,
  legend: 0,
  transcend: 0,
};

/** Every trainer starts with enough medical diamonds to recover their starter. */
export const STARTING_DIAMONDS = 12;

export interface StoredSkillStone {
  id: string;
  element: ElementType;
}

const keyFor = (kind: string, trainerId?: number) => trainerId === undefined ? kind : `${kind}_trainer_${trainerId}`;

export function getTrainerDiamonds(trainerId?: number): number {
  const saved = localStorage.getItem(keyFor('diamonds', trainerId));
  const amount = saved === null ? STARTING_DIAMONDS : Number(saved);
  return Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : STARTING_DIAMONDS;
}

export function setTrainerDiamonds(amount: number, trainerId?: number) {
  localStorage.setItem(keyFor('diamonds', trainerId), String(Math.max(0, Math.floor(amount))));
}

export function addTrainerDiamonds(amount: number, trainerId?: number): number {
  const next = getTrainerDiamonds(trainerId) + Math.max(0, Math.floor(amount));
  setTrainerDiamonds(next, trainerId);
  return next;
}

export function spendTrainerDiamonds(amount: number, trainerId?: number): boolean {
  const current = getTrainerDiamonds(trainerId);
  const cost = Math.max(0, Math.floor(amount));
  if (current < cost) return false;
  setTrainerDiamonds(current - cost, trainerId);
  return true;
}

export function getStoredPokeBalls(trainerId?: number): Record<PokeBallType, number> {
  const saved = localStorage.getItem(keyFor('pokeballs', trainerId));
  if (!saved) return { ...DEFAULT_POKEBALLS };
  try {
    return { ...DEFAULT_POKEBALLS, ...JSON.parse(saved) };
  } catch {
    return { ...DEFAULT_POKEBALLS };
  }
}

export function setStoredPokeBalls(
  pokeballs: Record<PokeBallType, number>,
  trainerId?: number,
) {
  const normalized = Object.fromEntries(
    Object.entries({ ...DEFAULT_POKEBALLS, ...pokeballs }).map(([type, count]) => [
      type,
      Math.max(0, Math.floor(Number(count) || 0)),
    ]),
  ) as Record<PokeBallType, number>;
  localStorage.setItem(keyFor('pokeballs', trainerId), JSON.stringify(normalized));
}

export function getStoredSkillStones(trainerId?: number): StoredSkillStone[] {
  const saved = localStorage.getItem(keyFor('skillStones', trainerId));
  if (!saved) return [];
  try {
    return JSON.parse(saved) as StoredSkillStone[];
  } catch {
    return [];
  }
}

/** Full HP recovery and waking a resting partner. Costs scale gently with level. */
export function getHospitalCost(monster: Monster): number {
  return 3 + Math.ceil(monster.level / 2);
}

/** Old saves did not always persist maxHp. Keep a fainted legacy partner recoverable. */
export function getRecoverableMaxHp(monster: Monster): number {
  return Math.max(monster.maxHp ?? 0, monster.hp, 55 + monster.level * 5);
}
