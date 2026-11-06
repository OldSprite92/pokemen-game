import { beforeEach, describe, expect, it } from 'vitest';
import type { Badge, ElementType } from '../types';
import { getStoredPokeBalls, getTrainerDiamonds, setTrainerDiamonds } from './trainerInventory';
import {
  buyShopPokeball,
  getShopLockReason,
  SHOP_POKEBALL_PRODUCTS,
} from './shop';

const gymBadge = (element: ElementType): Badge => ({
  continentId: `gym-${element}`,
  name: `${element}徽章`,
  emoji: '🏅',
  element,
  kind: 'gym',
  earnedAt: new Date(),
});

describe('精灵球商店', () => {
  beforeEach(() => localStorage.clear());

  it('使用适合长期存档的高价区间', () => {
    expect(SHOP_POKEBALL_PRODUCTS.find((item) => item.type === 'normal')?.price).toBe(120);
    expect(SHOP_POKEBALL_PRODUCTS.find((item) => item.type === 'master')?.price).toBe(2600);
    expect(SHOP_POKEBALL_PRODUCTS.find((item) => item.type === 'transcend')?.price).toBe(15000);
  });

  it('购买时同时扣除钻石并增加当前训练师的精灵球', () => {
    const product = SHOP_POKEBALL_PRODUCTS.find((item) => item.type === 'normal')!;
    setTrainerDiamonds(1000, 7);
    const result = buyShopPokeball(7, product, 5, []);

    expect(result.ok).toBe(true);
    expect(getTrainerDiamonds(7)).toBe(400);
    expect(getStoredPokeBalls(7).normal).toBe(8);
  });

  it('余额不足时不会改变钻石或背包', () => {
    const product = SHOP_POKEBALL_PRODUCTS.find((item) => item.type === 'great')!;
    setTrainerDiamonds(100, 3);
    const before = getStoredPokeBalls(3);
    const result = buyShopPokeball(3, product, 1, []);

    expect(result.ok).toBe(false);
    expect(getTrainerDiamonds(3)).toBe(100);
    expect(getStoredPokeBalls(3)).toEqual(before);
  });

  it('高级商品按不同属性道馆徽章数量解锁', () => {
    const master = SHOP_POKEBALL_PRODUCTS.find((item) => item.type === 'master')!;
    expect(getShopLockReason(master, [gymBadge('fire'), gymBadge('fire')])).toContain('3');
    expect(getShopLockReason(master, [gymBadge('fire'), gymBadge('water'), gymBadge('grass')])).toBeNull();
  });

  it('超限球必须在成功合成超级勋章后解锁', () => {
    const transcend = SHOP_POKEBALL_PRODUCTS.find((item) => item.type === 'transcend')!;
    expect(getShopLockReason(transcend, [])).not.toBeNull();
    expect(getShopLockReason(transcend, [{
      continentId: 'super-fusion',
      name: '超级勋章',
      emoji: '⭐',
      kind: 'super',
      earnedAt: new Date(),
    }])).toBeNull();
  });
});
