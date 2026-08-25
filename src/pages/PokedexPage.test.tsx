import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PokedexPage from '../pages/PokedexPage';
import { db } from '../db/database';
import { useGameStore } from '../stores/gameStore';
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
    await db.badges.clear();
    await db.stickers.clear();
    await db.diaryEntries.clear();
    useGameStore.setState({
      currentTrainer: {
        id: 1,
        name: '测试训练师',
        avatar: 'boy',
        monsterIds: [],
        createdAt: new Date(),
      },
    });
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
      <MemoryRouter initialEntries={['/warehouse']}>
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
      trainerId: 1,
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
      <MemoryRouter initialEntries={['/warehouse']}>
        <PokedexPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('火焰龙')).toBeInTheDocument();
    });

    expect(screen.getByText('Lv.5 | HP 80/80')).toBeInTheDocument();
    expect(screen.getByText('火焰拳')).toBeInTheDocument();
  });

  it('只显示当前训练师的伙伴和遭遇记录', async () => {
    await db.monsters.bulkAdd([
      {
        name: '我的小火龙', trainerId: 1, element: 'fire', skills: [], avatar: 'dragon',
        hp: 80, attack: 60, defense: 50, speed: 60, level: 3, exp: 0,
        createdBy: 'user', createdAt: new Date(),
      },
      {
        name: '别人的水精灵', trainerId: 2, element: 'water', skills: [], avatar: 'fish',
        hp: 80, attack: 60, defense: 50, speed: 60, level: 3, exp: 0,
        createdBy: 'user', createdAt: new Date(),
      },
    ]);
    await db.encounters.bulkAdd([
      {
        trainerId: 1, monsterName: '我遇见的伙伴', monsterElement: 'fire', monsterLevel: 2,
        monsterAvatar: 'dragon', continentName: '火山岛', encounteredAt: new Date(), captured: false, defeated: false,
      },
      {
        trainerId: 2, monsterName: '别人的遭遇', monsterElement: 'water', monsterLevel: 2,
        monsterAvatar: 'fish', continentName: '冰原岛', encounteredAt: new Date(), captured: false, defeated: false,
      },
    ]);

    const warehouseView = render(
      <MemoryRouter initialEntries={['/warehouse']}>
        <PokedexPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('我的小火龙')).toBeInTheDocument());
    expect(screen.queryByText('别人的水精灵')).not.toBeInTheDocument();

    warehouseView.unmount();
    render(<MemoryRouter><PokedexPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('我遇见的伙伴')).toBeInTheDocument());
    expect(screen.queryByText('别人的遭遇')).not.toBeInTheDocument();
  });

  it('点击宝可梦卡片显示详情弹窗', async () => {
    const monster: Monster = {
      id: 1,
      trainerId: 1,
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
      <MemoryRouter initialEntries={['/warehouse']}>
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
      trainerId: 1,
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
      trainerId: 1,
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
      <MemoryRouter initialEntries={['/warehouse']}>
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

  it('道馆徽章只能给同属性伙伴分配，并真实强化属性', async () => {
    await db.monsters.bulkAdd([
      {
        id: 1, trainerId: 1, name: '双属性小伙伴', element: 'fire', elements: ['fire', 'bug'], skills: [], avatar: 'butterfly',
        hp: 80, attack: 60, defense: 50, speed: 55, level: 5, exp: 0,
        createdBy: 'user', createdAt: new Date(),
      },
      {
        id: 2, trainerId: 1, name: '水属性伙伴', element: 'water', skills: [], avatar: 'fish',
        hp: 80, attack: 60, defense: 50, speed: 55, level: 5, exp: 0,
        createdBy: 'user', createdAt: new Date(),
      },
    ]);
    await db.badges.add({
      trainerId: 1, continentId: 'fire', name: '红莲徽章', emoji: '🔥', element: 'fire', kind: 'gym', earnedAt: new Date(),
    });

    render(
      <MemoryRouter>
        <PokedexPage />
      </MemoryRouter>
    );

    await waitFor(() => fireEvent.click(screen.getByText(/徽章 1/)));
    fireEvent.click(screen.getByText('分配强化'));
    expect(screen.getByText('双属性小伙伴')).toBeInTheDocument();
    expect(screen.queryByText('水属性伙伴')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '攻击 +4' }));
    await waitFor(async () => {
      const [monster] = await db.monsters.where('id').equals(1).toArray();
      const [badge] = await db.badges.toArray();
      expect(monster.attack).toBe(64);
      expect(badge.assignedMonsterId).toBe(1);
      expect(badge.statBoost).toBe('attack');
    });
  });
});
