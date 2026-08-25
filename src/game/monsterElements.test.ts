import { describe, expect, it } from 'vitest';
import { getMonsterElements } from './monsterElements';

describe('getMonsterElements', () => {
  it('旧存档的单属性宝可梦仍正确展示', () => {
    expect(getMonsterElements({ element: 'fire' })).toEqual(['fire']);
  });

  it('双属性宝可梦按保存顺序展示全部属性', () => {
    expect(getMonsterElements({ element: 'ground', elements: ['ground', 'electric'] })).toEqual(['ground', 'electric']);
  });

  it('即使旧数据漏存了主属性也不会漏展示', () => {
    expect(getMonsterElements({ element: 'grass', elements: ['poison'] })).toEqual(['grass', 'poison']);
  });
});
