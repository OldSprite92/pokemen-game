import type { ElementType } from '../types';

/** 区域等级配置 */
export interface ZoneConfig {
  minDistance: number;      // 最小距离（含）
  maxDistance: number;      // 最大距离（含）
  minLevel: number;         // 该区域野生宝可梦最低等级
  maxLevel: number;         // 该区域野生宝可梦最高等级
}

/** 默认分区配置（10×10地图） */
export const DEFAULT_ZONES: ZoneConfig[] = [
  { minDistance: 0, maxDistance: 1, minLevel: 1, maxLevel: 2 },
  { minDistance: 2, maxDistance: 3, minLevel: 2, maxLevel: 4 },
  { minDistance: 4, maxDistance: 5, minLevel: 4, maxLevel: 6 },
  { minDistance: 6, maxDistance: 7, minLevel: 6, maxLevel: 8 },
  { minDistance: 8, maxDistance: 10, minLevel: 8, maxLevel: 10 },
];

/** 预计算的分区网格缓存 */
let PRECOMPUTED_GRID: Map<string, { minLevel: number; maxLevel: number }> | null = null;
let PRECOMPUTED_SIZE = 0;

/** 计算曼哈顿距离 */
function manhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/** 预计算整个地图的等级分区 */
export function precomputeZoneGrid(size: number = 10): Map<string, { minLevel: number; maxLevel: number }> {
  if (PRECOMPUTED_GRID && PRECOMPUTED_SIZE === size) {
    return PRECOMPUTED_GRID;
  }

  const center = { x: Math.floor(size / 2), y: Math.floor(size / 2) };
  const cellLevels = new Map<string, { minLevel: number; maxLevel: number }>();

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = manhattanDistance(x, y, center.x, center.y);
      const zone = DEFAULT_ZONES.find((z) => dist >= z.minDistance && dist <= z.maxDistance);

      const key = `${x},${y}`;
      cellLevels.set(key, {
        minLevel: zone?.minLevel ?? 1,
        maxLevel: zone?.maxLevel ?? 10,
      });
    }
  }

  PRECOMPUTED_GRID = cellLevels;
  PRECOMPUTED_SIZE = size;
  return cellLevels;
}

/** 获取指定位置的等级范围（O(1)查询） */
export function getLevelRangeAtPosition(
  x: number,
  y: number,
  size: number = 10
): { minLevel: number; maxLevel: number } {
  const grid = precomputeZoneGrid(size);
  const key = `${x},${y}`;
  return grid.get(key) ?? { minLevel: 1, maxLevel: 10 };
}

/** 根据玩家位置生成野生宝可梦的等级 */
export function generateWildLevelAtPosition(
  x: number,
  y: number,
  size: number = 10
): number {
  const range = getLevelRangeAtPosition(x, y, size);
  return range.minLevel + Math.floor(Math.random() * (range.maxLevel - range.minLevel + 1));
}
