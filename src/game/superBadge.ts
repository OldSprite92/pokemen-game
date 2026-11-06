import type { Badge, ElementType } from '../types';

/** The seven Gym emblems needed for the manual Super Badge fusion. */
export const SUPER_BADGE_ELEMENTS = ['rock', 'water', 'grass', 'electric', 'fire', 'poison', 'psychic'] as const;

export type SuperBadgeElement = typeof SUPER_BADGE_ELEMENTS[number];

export const SUPER_BADGE_SLOT_LABELS: Record<SuperBadgeElement, string> = {
  rock: '岩石',
  water: '水',
  grass: '草',
  electric: '电',
  fire: '火',
  poison: '毒',
  psychic: '超能力',
};

/** Returns one usable Gym badge for each required Super Badge slot. */
export function getSuperBadgeIngredients(badges: Badge[]): Badge[] {
  return SUPER_BADGE_ELEMENTS.flatMap((element) => {
    const badge = badges.find((item) => item.kind === 'gym' && item.element === element);
    return badge ? [badge] : [];
  });
}

export function isSuperBadgeElement(element: ElementType | undefined): element is SuperBadgeElement {
  return Boolean(element && SUPER_BADGE_ELEMENTS.includes(element as SuperBadgeElement));
}
