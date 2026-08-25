import type { ElementType, Monster } from '../types';

/**
 * 返回宝可梦的完整属性列表。旧存档只有 element 时会自动视为单属性，
 * 这样新旧数据在所有展示页面都能使用同一套逻辑。
 */
export function getMonsterElements(monster: Pick<Monster, 'element' | 'elements'>): ElementType[] {
  const savedElements = monster.elements?.filter(Boolean) ?? [];
  const elements = savedElements.length > 0
    ? (savedElements.includes(monster.element) ? savedElements : [monster.element, ...savedElements])
    : [monster.element];
  return [...new Set(elements)];
}
