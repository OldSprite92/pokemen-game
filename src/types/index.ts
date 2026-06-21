// ============ 宝可梦（怪物）相关类型 ============

/** 元素属性 */
export type ElementType = 'fire' | 'water' | 'grass' | 'electric' | 'normal' | 'ice' | 'fighting' | 'poison' | 'ground' | 'flying' | 'psychic' | 'bug' | 'rock' | 'ghost' | 'dragon' | 'dark' | 'steel' | 'fairy' | 'light';

/** 技能 */
export interface Skill {
  id: string;
  name: string;
  element: ElementType;
  power: number;
  accuracy: number;
  description: string;
}

/** 宝可梦（怪物） */
export interface Monster {
  id?: number;
  name: string;
  element: ElementType;
  skills: Skill[];
  avatar: string;
  hp: number;
  maxHp?: number; // 如果未设置，默认等于hp
  attack: number;
  defense: number;
  speed: number;
  level: number;
  exp: number;
  expToNext?: number; // 如果未设置，默认100
  fatigueEndTime?: Date; // 疲劳结束时间
  createdBy: 'user' | 'system';
  createdAt: Date;
}

// ============ 道具系统 ============

/** 精灵球类型 */
export type PokeBallType = 'normal' | 'great' | 'ultra' | 'master' | 'legend' | 'transcend';

/** 精灵球配置 */
export interface PokeBallConfig {
  type: PokeBallType;
  name: string;
  emoji: string;
  color: string;
  catchRateMultiplier: number;
}

/** 技能石 */
export interface SkillStone {
  id: string;
  element: ElementType;
  used: boolean;
}

/** 玩家背包 */
export interface PlayerInventory {
  id?: number;
  trainerId: number;
  pokeballs: Record<PokeBallType, number>;
  skillStones: SkillStone[];
  updatedAt: Date;
}

// ============ 训练师相关类型 ============

/** 训练师 */
export interface Trainer {
  id?: number;
  name: string;
  avatar: string;
  monsterIds: number[];
  activeMonsterId?: number; // 当前出战的宝可梦
  createdAt: Date;
}

// ============ 冒险相关类型 ============

/** 格子类型 */
export type CellType = 'start' | 'empty' | 'wild' | 'treasure' | 'rest' | 'boss' | 'blocked';

/** 格子 */
export interface MapCell {
  x: number;
  y: number;
  type: CellType;
  visited: boolean;
  revealed: boolean;
}

/** 大陆 */
export interface Continent {
  id: string;
  name: string;
  emoji: string;
  themeColor: string;
  bgColor: string;
  element: ElementType;
  description: string;
  gridSize: number;
  cells: MapCell[];
  bossName: string;
  bossAvatar: string;
  completed: boolean;
  isCustom: boolean;
}

/** 冒险事件 */
export interface AdventureEvent {
  type: 'battle' | 'item' | 'story' | 'npc' | 'rest';
  description: string;
  completed: boolean;
  reward?: { exp?: number; hp?: number };
}

/** 冒险记录 */
export interface Adventure {
  id?: number;
  continentId: string;
  currentPosition: { x: number; y: number };
  events: AdventureEvent[];
  completedAt?: Date;
}

/** 遭遇记录 */
export interface EncounterRecord {
  id?: number;
  monsterName: string;
  monsterElement: ElementType;
  monsterLevel: number;
  monsterAvatar: string;
  continentName: string;
  encounteredAt: Date;
  captured: boolean;
  defeated: boolean;
}

// ============ 游戏状态类型 ============

/** 对战状态 */
export interface BattleState {
  isActive: boolean;
  playerMonster: Monster | null;
  enemyMonster: Monster | null;
  turn: 'player' | 'enemy';
  log: string[];
}

/** 游戏全局状态 */
export interface GameState {
  currentTrainer: Trainer | null;
  battleState: BattleState;
  currentAdventure: Adventure | null;
  setCurrentTrainer: (trainer: Trainer | null) => void;
  setBattleState: (state: Partial<BattleState>) => void;
  setCurrentAdventure: (adventure: Adventure | null) => void;
  startBattle: (playerMonster: Monster, enemyMonster: Monster) => void;
  endBattle: () => void;
}
