import { describe, it, expect } from 'vitest';
import { getLevelRangeAtPosition, generateWildLevelAtPosition } from './mapZoneSystem';

describe('地图等级分区', () => {
  it('中心位置等级范围是1-2', () => {
    const range = getLevelRangeAtPosition(5, 5, 10);
    expect(range.minLevel).toBe(1);
    expect(range.maxLevel).toBe(2);
  });

  it('边缘位置等级范围是8-10', () => {
    const range = getLevelRangeAtPosition(0, 0, 10);
    expect(range.minLevel).toBe(8);
    expect(range.maxLevel).toBe(10);
  });

  it('中间位置等级范围合理', () => {
    const range = getLevelRangeAtPosition(3, 3, 10);
    expect(range.minLevel).toBeGreaterThanOrEqual(2);
    expect(range.maxLevel).toBeLessThanOrEqual(6);
  });

  it('generateWildLevelAtPosition 生成等级在范围内', () => {
    for (let i = 0; i < 20; i++) {
      const level = generateWildLevelAtPosition(5, 5, 10);
      expect(level).toBeGreaterThanOrEqual(1);
      expect(level).toBeLessThanOrEqual(2);
    }
  });
});
