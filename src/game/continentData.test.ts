import { describe, it, expect } from 'vitest';
import { generateMapGrid, generateContinent, getPresetContinents, createCustomContinent, CELL_ICONS, CELL_NAMES } from './continentData';
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
    it('返回3个预设大陆', () => {
      const continents = getPresetContinents();
      expect(continents.length).toBe(3);
      expect(continents.map((c) => c.name)).toContain('火山岛');
      expect(continents.map((c) => c.name)).toContain('冰雪大陆');
      expect(continents.map((c) => c.name)).toContain('丛林秘境');
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
      const types = ['start', 'empty', 'wild', 'treasure', 'rest', 'boss', 'blocked'] as const;
      types.forEach((type) => {
        expect(CELL_ICONS[type]).toBeDefined();
        expect(CELL_NAMES[type]).toBeDefined();
      });
    });
  });
});
