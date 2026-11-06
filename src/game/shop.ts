import type { Badge, PokeBallType } from '../types';
import {
  getStoredPokeBalls,
  getTrainerDiamonds,
  setStoredPokeBalls,
  setTrainerDiamonds,
} from './trainerInventory';

export interface ShopPokeballProduct {
  type: PokeBallType;
  price: number;
  requiredGymBadgeTypes?: number;
  requiresSuperBadge?: boolean;
  quantities: number[];
}

/** Prices intentionally target long-running saves that already hold thousands of diamonds. */
export const SHOP_POKEBALL_PRODUCTS: ShopPokeballProduct[] = [
  { type: 'normal', price: 120, quantities: [1, 5, 10] },
  { type: 'great', price: 360, quantities: [1, 5, 10] },
  { type: 'ultra', price: 900, requiredGymBadgeTypes: 1, quantities: [1, 5] },
  { type: 'master', price: 2600, requiredGymBadgeTypes: 3, quantities: [1] },
  { type: 'legend', price: 6500, requiredGymBadgeTypes: 7, quantities: [1] },
  { type: 'transcend', price: 15000, requiresSuperBadge: true, quantities: [1] },
];

export function getGymBadgeTypeCount(badges: Badge[]): number {
  return new Set(
    badges
      .filter((badge) => badge.kind === 'gym' && badge.element)
      .map((badge) => badge.element),
  ).size;
}

export function getShopLockReason(product: ShopPokeballProduct, badges: Badge[]): string | null {
  if (product.requiresSuperBadge && !badges.some((badge) => badge.kind === 'super')) {
    return '成功合成超级勋章后解锁';
  }

  const badgeCount = getGymBadgeTypeCount(badges);
  if (product.requiredGymBadgeTypes && badgeCount < product.requiredGymBadgeTypes) {
    return `收集 ${product.requiredGymBadgeTypes} 种属性徽章后解锁`;
  }

  return null;
}

export interface ShopPurchaseResult {
  ok: boolean;
  message: string;
  diamonds: number;
  pokeballs: Record<PokeBallType, number>;
}

export function buyShopPokeball(
  trainerId: number,
  product: ShopPokeballProduct,
  quantity: number,
  badges: Badge[],
): ShopPurchaseResult {
  const diamonds = getTrainerDiamonds(trainerId);
  const pokeballs = getStoredPokeBalls(trainerId);
  const lockReason = getShopLockReason(product, badges);
  if (lockReason) return { ok: false, message: lockReason, diamonds, pokeballs };

  if (!product.quantities.includes(quantity)) {
    return { ok: false, message: '这个购买数量不可用', diamonds, pokeballs };
  }

  const cost = product.price * quantity;
  if (diamonds < cost) {
    return {
      ok: false,
      message: `钻石不足，还差 ${cost - diamonds} 枚`,
      diamonds,
      pokeballs,
    };
  }

  const nextPokeballs = {
    ...pokeballs,
    [product.type]: pokeballs[product.type] + quantity,
  };

  try {
    setStoredPokeBalls(nextPokeballs, trainerId);
    setTrainerDiamonds(diamonds - cost, trainerId);
  } catch (error) {
    // localStorage writes are synchronous. Restore both values if either write fails.
    setStoredPokeBalls(pokeballs, trainerId);
    setTrainerDiamonds(diamonds, trainerId);
    throw error;
  }

  return {
    ok: true,
    message: `购买成功，已放入背包 ×${quantity}`,
    diamonds: diamonds - cost,
    pokeballs: nextPokeballs,
  };
}
