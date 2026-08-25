import type { Continent, MapCell, CellType, ElementType } from '../types';

function getReachableCellKeys(cells: MapCell[], size: number) {
  const center = Math.floor(size / 2);
  const byPosition = new Map(cells.map((cell) => [`${cell.x},${cell.y}`, cell]));
  const reachable = new Set<string>();
  const queue = [{ x: center, y: center }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = `${current.x},${current.y}`;
    if (reachable.has(key)) continue;
    const cell = byPosition.get(key);
    if (!cell || cell.type === 'blocked') continue;
    reachable.add(key);

    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => {
      const x = current.x + dx;
      const y = current.y + dy;
      if (x >= 0 && x < size && y >= 0 && y < size) queue.push({ x, y });
    });
  }

  return reachable;
}

/** 从远离起点、实际能走到的位置中随机放置 Boss，避免形成固定路线。 */
function placeBoss(cells: MapCell[], size: number): MapCell[] {
  const center = Math.floor(size / 2);
  const minimumDistance = Math.max(3, Math.ceil(size * 0.6));
  const reachable = getReachableCellKeys(cells, size);
  const candidates = cells.filter((cell) => {
    const distance = Math.abs(cell.x - center) + Math.abs(cell.y - center);
    return cell.type !== 'blocked'
      && cell.type !== 'start'
      && !cell.visited
      && distance >= minimumDistance
      && reachable.has(`${cell.x},${cell.y}`);
  });
  const fallbackCandidates = cells.filter((cell) =>
    cell.type !== 'blocked' && cell.type !== 'start' && !cell.visited && reachable.has(`${cell.x},${cell.y}`)
  );
  const pool = candidates.length > 0 ? candidates : fallbackCandidates;
  const bossCell = pool[Math.floor(Math.random() * pool.length)];

  if (!bossCell) return cells;
  return cells.map((cell) =>
    cell.x === bossCell.x && cell.y === bossCell.y
      ? { ...cell, type: 'boss', revealed: false, visited: false }
      : cell
  );
}

/** 道馆和 Boss 一样必须可达且位置不形成固定跑图规律。 */
function placeGym(cells: MapCell[], size: number): MapCell[] {
  const center = Math.floor(size / 2);
  const minimumDistance = Math.max(3, Math.ceil(size * 0.45));
  const reachable = getReachableCellKeys(cells, size);
  const candidates = cells.filter((cell) => {
    const distance = Math.abs(cell.x - center) + Math.abs(cell.y - center);
    return cell.type !== 'blocked'
      && cell.type !== 'start'
      && cell.type !== 'boss'
      && !cell.visited
      && distance >= minimumDistance
      && reachable.has(`${cell.x},${cell.y}`);
  });
  const fallbackCandidates = cells.filter((cell) =>
    cell.type !== 'blocked' && cell.type !== 'start' && cell.type !== 'boss' && reachable.has(`${cell.x},${cell.y}`)
  );
  const pool = candidates.length > 0 ? candidates : fallbackCandidates;
  const gymCell = pool[Math.floor(Math.random() * pool.length)];
  if (!gymCell) return cells;
  return cells.map((cell) =>
    cell.x === gymCell.x && cell.y === gymCell.y
      ? { ...cell, type: 'gym', revealed: false, visited: false }
      : cell
  );
}

/** 为旧存档补上一座随机可达道馆，保留原 Boss 位置。 */
export function ensureGymCell(cells: MapCell[], size: number): MapCell[] {
  return cells.some((cell) => cell.type === 'gym') ? cells : placeGym(cells, size);
}

/** 将旧版本固定在右上角的 Boss 迁到随机且可到达的位置。 */
export function relocateLegacyCornerBoss(cells: MapCell[], size: number): MapCell[] {
  const hadLegacyBoss = cells.some((cell) => cell.type === 'boss' && cell.x === size - 1 && cell.y === 0);
  if (!hadLegacyBoss) return cells;

  const clearedCells: MapCell[] = cells.map((cell): MapCell =>
    cell.type === 'boss'
      ? { ...cell, type: 'empty' as CellType, revealed: false, visited: cell.x === size - 1 && cell.y === 0 }
      : cell
  );
  return placeBoss(clearedCells, size).map((cell) =>
    cell.x === size - 1 && cell.y === 0 ? { ...cell, visited: false } : cell
  );
}

/** 生成格子地图 */
export function generateMapGrid(size: number, element: ElementType): MapCell[] {
  const cells: MapCell[] = [];
  const center = Math.floor(size / 2);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let type: CellType = 'empty';

      // 起点在中心
      if (x === center && y === center) {
        type = 'start';
      } else {
        // 随机生成其他格子
        const rand = Math.random();
        if (rand < 0.2) {
          type = 'wild'; // 20% 野生宝可梦
        } else if (rand < 0.3) {
          type = 'treasure'; // 10% 宝藏
        } else if (rand < 0.4) {
          type = 'rest'; // 10% 休息点
        } else if (rand < 0.5) {
          type = 'blocked'; // 10% 障碍物
        } else {
          type = 'empty'; // 50% 空地
        }
      }

      cells.push({
        x,
        y,
        type,
        visited: x === center && y === center,
        revealed: x === center && y === center,
      });
    }
  }

  // 确保起点周围有可达路径（移除起点周围的障碍物）
  const neighbors = [
    [center - 1, center],
    [center + 1, center],
    [center, center - 1],
    [center, center + 1],
  ];
  neighbors.forEach(([nx, ny]) => {
    const cell = cells.find((c) => c.x === nx && c.y === ny);
    if (cell && cell.type === 'blocked') {
      cell.type = 'empty';
    }
  });

  return placeGym(placeBoss(cells, size), size);
}

/** 预设大陆 */
export const PRESET_CONTINENTS: Omit<Continent, 'cells'>[] = [
  {
    id: 'volcano',
    name: '火山岛',
    emoji: '🌋',
    themeColor: '#ef4444',
    bgColor: '#451a03',
    element: 'fire',
    description: '岩浆喷发的炽热岛屿，火属性宝可梦的家园',
    gridSize: 10,
    bossName: '熔岩巨兽',
    bossAvatar: 'dragon',
    completed: false,
    isCustom: false,
  },
  {
    id: 'ice',
    name: '冰雪大陆',
    emoji: '❄️',
    themeColor: '#06b6d4',
    bgColor: '#083344',
    element: 'ice',
    description: '冰封万里的寒冷世界，冰属性宝可梦游荡于此',
    gridSize: 10,
    bossName: '冰霜女王',
    bossAvatar: 'unicorn',
    completed: false,
    isCustom: false,
  },
  {
    id: 'jungle',
    name: '丛林秘境',
    emoji: '🌴',
    themeColor: '#22c55e',
    bgColor: '#052e16',
    element: 'grass',
    description: '茂密神秘的原始森林，草属性宝可梦栖息其中',
    gridSize: 10,
    bossName: '丛林霸主',
    bossAvatar: 'tiger',
    completed: false,
    isCustom: false,
  },
  {
    id: 'poison-swamp',
    name: '毒雾沼泽',
    emoji: '☠️',
    themeColor: '#7c3aed',
    bgColor: '#3b0764',
    element: 'poison',
    description: '紫色雾气笼罩的湿地，勇敢又细心的训练师才能安全穿过',
    gridSize: 10,
    bossName: '毒雾女王',
    bossAvatar: 'snake',
    completed: false,
    isCustom: false,
  },
  {
    id: 'normal-meadow',
    name: '星星原野',
    emoji: '⭐',
    themeColor: '#9ca3af',
    bgColor: '#1f2937',
    element: 'normal',
    description: '看似平静却处处藏着惊喜的原野，一般属性伙伴在这里快乐生活',
    gridSize: 10,
    bossName: '原野守护者',
    bossAvatar: 'rabbit',
    completed: false,
    isCustom: false,
  },
];

/** 生成完整大陆 */
export function generateContinent(base: Omit<Continent, 'cells'>): Continent {
  return {
    ...base,
    cells: generateMapGrid(base.gridSize, base.element),
  };
}

/** 获取所有预设大陆（完整版） */
export function getPresetContinents(): Continent[] {
  return PRESET_CONTINENTS.map(generateContinent);
}

/** 创建自定义大陆 */
export function createCustomContinent(
  name: string,
  element: ElementType,
  themeColor: string
): Continent {
  const id = `custom-${Date.now()}`;
  return generateContinent({
    id,
    name,
    emoji: '⭐',
    themeColor,
    bgColor: themeColor + '20',
    element,
    description: `${name} - 自定义冒险大陆`,
    gridSize: 10,
    bossName: `${name}守护者`,
    bossAvatar: 'dragon',
    completed: false,
    isCustom: true,
  });
}

/** 格子图标 */
export const CELL_ICONS: Record<CellType, string> = {
  start: '🏠',
  empty: '',
  wild: '👣',
  treasure: '💎',
  rest: '💤',
  gym: '',
  boss: '👹',
  blocked: '🪨',
};

/** 格子颜色 */
export const CELL_COLORS: Record<CellType, string> = {
  start: '#22c55e',
  empty: 'transparent',
  wild: '#ef4444',
  treasure: '#eab308',
  rest: '#3b82f6',
  gym: '#f59e0b',
  boss: '#a855f7',
  blocked: '#4b5563',
};

/** 大陆属性特效配置 */
export const CONTINENT_EFFECTS: Record<ElementType, {
  particleEmoji: string;
  particleAnimation: string;
  bgGradient: string;
  ambienceText: string;
}> = {
  fire: {
    particleEmoji: '🔥',
    particleAnimation: 'animate-pulse',
    bgGradient: 'linear-gradient(180deg, #451a03 0%, #7c2d12 50%, #451a03 100%)',
    ambienceText: '岩浆翻滚，热气蒸腾...',
  },
  water: {
    particleEmoji: '💧',
    particleAnimation: 'animate-bounce',
    bgGradient: 'linear-gradient(180deg, #0c2d5e 0%, #1e40af 50%, #0c2d5e 100%)',
    ambienceText: '海浪轻拍，波光粼粼...',
  },
  grass: {
    particleEmoji: '🌿',
    particleAnimation: 'animate-pulse',
    bgGradient: 'linear-gradient(180deg, #052e16 0%, #14532d 50%, #052e16 100%)',
    ambienceText: '树叶沙沙，花香四溢...',
  },
  electric: {
    particleEmoji: '⚡',
    particleAnimation: 'animate-pulse',
    bgGradient: 'linear-gradient(180deg, #422006 0%, #854d0e 50%, #422006 100%)',
    ambienceText: '电闪雷鸣，空气中充满静电...',
  },
  ice: {
    particleEmoji: '❄️',
    particleAnimation: 'animate-spin-slow',
    bgGradient: 'linear-gradient(180deg, #083344 0%, #155e75 50%, #083344 100%)',
    ambienceText: '雪花飘落，寒风呼啸...',
  },
  ground: {
    particleEmoji: '🌪️',
    particleAnimation: 'animate-pulse',
    bgGradient: 'linear-gradient(180deg, #451a03 0%, #78350f 50%, #451a03 100%)',
    ambienceText: '沙尘飞扬，大地震动...',
  },
  flying: {
    particleEmoji: '🌪️',
    particleAnimation: 'animate-pulse',
    bgGradient: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
    ambienceText: '狂风呼啸，云雾缭绕...',
  },
  dark: {
    particleEmoji: '🌑',
    particleAnimation: 'animate-pulse',
    bgGradient: 'linear-gradient(180deg, #18181b 0%, #27272a 50%, #18181b 100%)',
    ambienceText: '黑暗笼罩，阴影蠕动...',
  },
  psychic: {
    particleEmoji: '✨',
    particleAnimation: 'animate-pulse',
    bgGradient: 'linear-gradient(180deg, #4a044e 0%, #86198f 50%, #4a044e 100%)',
    ambienceText: '星光闪烁，神秘能量流动...',
  },
  poison: {
    particleEmoji: '☠️',
    particleAnimation: 'animate-pulse',
    bgGradient: 'linear-gradient(180deg, #3b0764 0%, #6b21a8 50%, #3b0764 100%)',
    ambienceText: '毒雾弥漫，气味刺鼻...',
  },
  fighting: {
    particleEmoji: '👊',
    particleAnimation: 'animate-pulse',
    bgGradient: 'linear-gradient(180deg, #450a0a 0%, #7f1d1d 50%, #450a0a 100%)',
    ambienceText: '斗志昂扬，热血沸腾...',
  },
  bug: {
    particleEmoji: '🐛',
    particleAnimation: 'animate-pulse',
    bgGradient: 'linear-gradient(180deg, #1a2e05 0%, #365314 50%, #1a2e05 100%)',
    ambienceText: '虫鸣阵阵，苔藓湿滑...',
  },
  rock: {
    particleEmoji: '🪨',
    particleAnimation: 'animate-pulse',
    bgGradient: 'linear-gradient(180deg, #1c1917 0%, #44403c 50%, #1c1917 100%)',
    ambienceText: '岩石嶙峋，尘土飞扬...',
  },
  ghost: {
    particleEmoji: '👻',
    particleAnimation: 'animate-float',
    bgGradient: 'linear-gradient(180deg, #1e1b4b 0%, #4338ca 50%, #1e1b4b 100%)',
    ambienceText: '幽灵飘荡，阴风阵阵...',
  },
  dragon: {
    particleEmoji: '🐉',
    particleAnimation: 'animate-pulse',
    bgGradient: 'linear-gradient(180deg, #2e1065 0%, #5b21b6 50%, #2e1065 100%)',
    ambienceText: '龙威浩荡，天地变色...',
  },
  steel: {
    particleEmoji: '⚙️',
    particleAnimation: 'animate-pulse',
    bgGradient: 'linear-gradient(180deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
    ambienceText: '金属碰撞，火花四溅...',
  },
  fairy: {
    particleEmoji: '🧚',
    particleAnimation: 'animate-float',
    bgGradient: 'linear-gradient(180deg, #4a044e 0%, #a855f7 50%, #4a044e 100%)',
    ambienceText: '仙光缭绕，梦幻飘渺...',
  },
  light: {
    particleEmoji: '☀️',
    particleAnimation: 'animate-pulse',
    bgGradient: 'linear-gradient(180deg, #451a03 0%, #b45309 50%, #451a03 100%)',
    ambienceText: '光芒万丈，神圣庄严...',
  },
  normal: {
    particleEmoji: '⭐',
    particleAnimation: 'animate-pulse',
    bgGradient: 'linear-gradient(180deg, #1f2937 0%, #4b5563 50%, #1f2937 100%)',
    ambienceText: '平静祥和，万物安宁...',
  },
};
export const CELL_NAMES: Record<CellType, string> = {
  start: '起点',
  empty: '空地',
  wild: '野生宝可梦',
  treasure: '宝藏',
  rest: '休息点',
  gym: '属性道馆',
  boss: 'Boss战',
  blocked: '障碍物',
};
