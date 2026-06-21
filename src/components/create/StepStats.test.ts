import { describe, it, expect } from 'vitest';
import { generateStats } from './StepStats';

describe('StepStats generateStats', () => {
  it('单个属性生成数值', () => {
    const stats = generateStats(['fire']);
    expect(stats.hp).toBeGreaterThanOrEqual(50);
    expect(stats.hp).toBeLessThanOrEqual(100);
    expect(stats.attack).toBeGreaterThanOrEqual(50);
    expect(stats.attack).toBeLessThanOrEqual(100);
  });

  it('双属性取平均值', () => {
    const stats = generateStats(['fire', 'water']);
    // 火 HP=75, 水 HP=85, 平均约80
    expect(stats.hp).toBeGreaterThanOrEqual(70);
    expect(stats.hp).toBeLessThanOrEqual(90);
  });

  it('空属性返回默认值', () => {
    const stats = generateStats([]);
    expect(stats.hp).toBe(70);
    expect(stats.attack).toBe(70);
    expect(stats.defense).toBe(70);
    expect(stats.speed).toBe(70);
  });
});
