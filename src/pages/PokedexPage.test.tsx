import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PokedexPage from '../pages/PokedexPage';
import { db } from '../db/database';
import type { Monster, EncounterRecord } from '../types';

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: vi.fn(() => true),
});

describe('图鉴页面', () => {
  beforeEach(async () => {
    await db.monsters.clear();
    await db.encounters.clear();
  });

  it('加载状态显示', () => {
    render(
      <MemoryRouter>
        <PokedexPage />
      </MemoryRouter>
    );
    expect(screen.getByText('加载图鉴...')).toBeInTheDocument();
  });

  it('空状态显示创造按钮', async () => {
    render(
      <MemoryRouter>
        <PokedexPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('还没有宝可梦')).toBeInTheDocument();
    });

    const createLink = screen.getByText('🎨 去创造宝可梦');
    expect(createLink).toBeInTheDocument();
    expect(createLink.closest('a')).toHaveAttribute('href', '/create');
  });

  it('显示已拥有的宝可梦列表', async () => {
    const monster: Monster = {
      id: 1,
      name: '火焰龙',
      element: 'fire',
      skills: [
        { id: 's1', name: '火焰拳', element: 'fire', power: 20, accuracy: 100, description: '火焰攻击' },
      ],
      avatar: 'dragon',
      hp: 80,
      attack: 70,
      defense: 60,
      speed: 75,
      level: 5,
      exp: 0,
      createdBy: 'user',
      createdAt: new Date(),
    };

    await db.monsters.add(monster);

    render(
      <MemoryRouter>
        <PokedexPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('火焰龙')).toBeInTheDocument();
    });

    expect(screen.getByText('Lv.5 | HP 80/80')).toBeInTheDocument();
    expect(screen.getByText('火焰拳')).toBeInTheDocument();
  });

  it('点击宝可梦卡片显示详情弹窗', async () => {
    const monster: Monster = {
      id: 1,
      name: '火焰龙',
      element: 'fire',
      skills: [
        { id: 's1', name: '火焰拳', element: 'fire', power: 20, accuracy: 100, description: '火焰攻击' },
      ],
      avatar: 'dragon',
      hp: 80,
      attack: 70,
      defense: 60,
      speed: 75,
      level: 5,
      exp: 0,
      createdBy: 'user',
      createdAt: new Date(),
    };

    await db.monsters.add(monster);

    render(
      <MemoryRouter>
        <PokedexPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('火焰龙')).toBeInTheDocument();
    });

    // 点击卡片
    fireEvent.click(screen.getByText('火焰龙'));

    // 弹窗应该显示
    await waitFor(() => {
      expect(screen.getByText('种族值')).toBeInTheDocument();
    });

    // 检查详情内容 - 使用 getAllByText 因为页面可能有多个匹配
    expect(screen.getAllByText('HP')[0]).toBeInTheDocument();
    expect(screen.getByText('攻击')).toBeInTheDocument();
    expect(screen.getByText('防御')).toBeInTheDocument();
    expect(screen.getByText('速度')).toBeInTheDocument();
  });

  it('切换标签显示遭遇记录', async () => {
    const encounter: EncounterRecord = {
      id: 1,
      monsterName: '水精灵',
      monsterElement: 'water',
      monsterLevel: 3,
      monsterAvatar: 'fish',
      continentName: '火山岛',
      encounteredAt: new Date(),
      captured: true,
      defeated: false,
    };

    await db.encounters.add(encounter);

    render(
      <MemoryRouter>
        <PokedexPage />
      </MemoryRouter>
    );

    // 切换到遭遇记录标签
    await waitFor(() => {
      const encounterTab = screen.getByText(/遭遇记录/);
      fireEvent.click(encounterTab);
    });

    await waitFor(() => {
      expect(screen.getByText('水精灵')).toBeInTheDocument();
    });

    expect(screen.getByText(/火山岛/)).toBeInTheDocument();
  });

  it('遭遇记录空状态显示冒险按钮', async () => {
    render(
      <MemoryRouter>
        <PokedexPage />
      </MemoryRouter>
    );

    // 切换到遭遇记录标签
    await waitFor(() => {
      const encounterTab = screen.getByText(/遭遇记录/);
      fireEvent.click(encounterTab);
    });

    await waitFor(() => {
      expect(screen.getByText('还没有遭遇记录')).toBeInTheDocument();
    });

    const adventureLink = screen.getByText('🗺️ 去冒险');
    expect(adventureLink).toBeInTheDocument();
    expect(adventureLink.closest('a')).toHaveAttribute('href', '/adventure');
  });

  it('技能管理按钮打开技能详情', async () => {
    const monster: Monster = {
      id: 1,
      name: '火焰龙',
      element: 'fire',
      skills: [
        { id: 's1', name: '火焰拳', element: 'fire', power: 20, accuracy: 100, description: '火焰攻击' },
      ],
      avatar: 'dragon',
      hp: 80,
      attack: 70,
      defense: 60,
      speed: 75,
      level: 5,
      exp: 0,
      createdBy: 'user',
      createdAt: new Date(),
    };

    await db.monsters.add(monster);

    render(
      <MemoryRouter>
        <PokedexPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('火焰龙')).toBeInTheDocument();
    });

    // 点击卡片打开详情
    fireEvent.click(screen.getByText('火焰龙'));

    await waitFor(() => {
      expect(screen.getByText('💎 技能管理')).toBeInTheDocument();
    });

    // 点击技能管理按钮
    fireEvent.click(screen.getByText('💎 技能管理'));

    // 技能详情弹窗应该显示
    await waitFor(() => {
      expect(screen.getByText('技能列表：')).toBeInTheDocument();
    });

    expect(screen.getByText('遗忘')).toBeInTheDocument();
  });

  it('返回首页链接存在', async () => {
    render(
      <MemoryRouter>
        <PokedexPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      const backLink = screen.getByText('← 返回');
      expect(backLink).toBeInTheDocument();
      expect(backLink.closest('a')).toHaveAttribute('href', '/');
    });
  });
});
