import { describe, it, expect, vi } from 'vitest';
import { generateMapGrid, generateContinent, getPresetContinents, createCustomContinent, CELL_ICONS, CELL_NAMES, relocateLegacyCornerBoss, ensureGymCell } from './continentData';
import type { ElementType } from '../types';

describe('continentData', () => {
  describe('generateMapGrid', () => {
    it('生成10x10格子地图', () => {
      const cells = generateMapGrid(10, 'fire');
      expect(cells.length).toBe(100);
    });

    it('中心格子是起点', () => {
      const cells = generateMapGrid(10, 'fire');
      const center = cells.find((c) => c.x === 5 && c.y === 5);
      expect(center?.type).toBe('start');
      expect(center?.visited).toBe(true);
      expect(center?.revealed).toBe(true);
    });

    it('至少有一个Boss', () => {
      const cells = generateMapGrid(10, 'water');
      const bossCells = cells.filter((c) => c.type === 'boss');
      expect(bossCells.length).toBeGreaterThanOrEqual(1);
    });

    it('每张地图都有一座远离起点、可到达且不和 Boss 重叠的道馆', () => {
      const cells = generateMapGrid(10, 'water');
      const gym = cells.find((cell) => cell.type === 'gym');
      const boss = cells.find((cell) => cell.type === 'boss');
      expect(gym).toBeDefined();
      expect(gym).not.toMatchObject({ x: 5, y: 5 });
      expect(gym).not.toMatchObject({ x: boss?.x, y: boss?.y });
      expect(Math.abs(gym!.x - 5) + Math.abs(gym!.y - 5)).toBeGreaterThanOrEqual(5);
    });

    it('旧地图加载时会补上一座道馆', () => {
      const legacyCells = generateMapGrid(10, 'fire').map((cell) =>
        cell.type === 'gym' ? { ...cell, type: 'empty' as const } : cell
      );
      expect(ensureGymCell(legacyCells, 10).filter((cell) => cell.type === 'gym')).toHaveLength(1);
    });

    it('Boss 会随机出现在远离起点且可到达的位置，不再固定右上角', () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
      const cells = generateMapGrid(10, 'fire');
      randomSpy.mockRestore();
      const boss = cells.find((cell) => cell.type === 'boss');

      expect(boss).toBeDefined();
      expect(boss).not.toMatchObject({ x: 9, y: 0 });
      expect(Math.abs(boss!.x - 5) + Math.abs(boss!.y - 5)).toBeGreaterThanOrEqual(6);
    });

    it('旧地图右上角的 Boss 会在载入时迁走', () => {
      const cells = generateMapGrid(10, 'fire').map((cell) =>
        cell.type === 'boss' ? { ...cell, type: 'empty' as const } : cell
      );
      const legacyBoss = cells.find((cell) => cell.x === 9 && cell.y === 0)!;
      legacyBoss.type = 'boss';

      const updated = relocateLegacyCornerBoss(cells, 10);
      expect(updated.find((cell) => cell.type === 'boss')).not.toMatchObject({ x: 9, y: 0 });
      expect(updated.filter((cell) => cell.type === 'boss')).toHaveLength(1);
    });

    it('起点周围没有障碍物', () => {
      const cells = generateMapGrid(10, 'grass');
      const neighbors = [
        cells.find((c) => c.x === 4 && c.y === 5),
        cells.find((c) => c.x === 6 && c.y === 5),
        cells.find((c) => c.x === 5 && c.y === 4),
        cells.find((c) => c.x === 5 && c.y === 6),
      ];
      neighbors.forEach((cell) => {
        expect(cell?.type).not.toBe('blocked');
      });
    });
  });

  describe('generateContinent', () => {
    it('生成完整大陆包含cells', () => {
      const continent = generateContinent({
        id: 'test',
        name: '测试大陆',
        emoji: '🧪',
        themeColor: '#ff0000',
        bgColor: '#110000',
        element: 'fire' as ElementType,
        description: '测试',
        gridSize: 5,
        bossName: '测试Boss',
        bossAvatar: 'dragon',
        completed: false,
        isCustom: false,
      });

      expect(continent.id).toBe('test');
      expect(continent.name).toBe('测试大陆');
      expect(continent.cells.length).toBe(25);
    });
  });

  describe('getPresetContinents', () => {
    it('返回5个预设大陆，包含毒系和一般系地图', () => {
      const continents = getPresetContinents();
      expect(continents.length).toBe(5);
      expect(continents.map((c) => c.name)).toContain('火山岛');
      expect(continents.map((c) => c.name)).toContain('冰雪大陆');
      expect(continents.map((c) => c.name)).toContain('丛林秘境');
      expect(continents.map((c) => c.name)).toContain('毒雾沼泽');
      expect(continents.map((c) => c.name)).toContain('星星原野');
    });
  });

  describe('createCustomContinent', () => {
    it('创建自定义大陆', () => {
      const continent = createCustomContinent('我的大陆', 'electric' as ElementType, '#eab308');
      expect(continent.name).toBe('我的大陆');
      expect(continent.element).toBe('electric');
      expect(continent.isCustom).toBe(true);
      expect(continent.id.startsWith('custom-')).toBe(true);
    });
  });

  describe('CELL config', () => {
    it('所有格子类型都有图标', () => {
      const types = ['start', 'empty', 'wild', 'treasure', 'rest', 'gym', 'boss', 'blocked'] as const;
      types.forEach((type) => {
        expect(CELL_ICONS[type]).toBeDefined();
        expect(CELL_NAMES[type]).toBeDefined();
      });
    });
  });
});
