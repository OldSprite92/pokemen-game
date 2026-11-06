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

/** 战斗负面状态 */
export type BattleStatusType = 'burn' | 'poison' | 'paralysis' | 'freeze' | 'bind' | 'fear';

/** 战斗中挂在一方身上的状态 */
export interface BattleStatus {
  type: BattleStatusType;
  turnsRemaining: number;
  damagePerTurn?: number;
  skipChance?: number;
  sourceSkillName: string;
}

/** 宝可梦（怪物） */
export interface Monster {
  id?: number;
  /** Belongs to one trainer only. Records without this value are legacy shared data. */
  trainerId?: number;
  name: string;
  /** 全部属性；element 保留为主属性，兼容已有存档和战斗计算。 */
  elements?: ElementType[];
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
  description?: string; // 宝可梦描述/图鉴介绍
  height?: number; // 身高(m)
  weight?: number; // 体重(kg)
  species?: string; // 种类/分类
  personality?: string; // 性格
  favoriteThing?: string; // 喜欢的东西
  catchphrase?: string; // 口头禅/叫声
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
export type CellType = 'start' | 'empty' | 'wild' | 'treasure' | 'rest' | 'gym' | 'boss' | 'blocked';

/** 地图难度 */
export type MapDifficulty = 'easy' | 'hard' | 'hell';

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
  reward?: { exp?: number; hp?: number; diamonds?: number };
  cellType?: CellType;
  parentPrompt?: string;
  mapPosition?: { x: number; y: number };
  choices?: AdventureEventChoice[];
}

/** A short, consequence-bearing map choice. */
export interface AdventureEventChoice {
  id: string;
  label: string;
  outcome: string;
  bondDelta?: number;
  bossHint?: string;
}

/** 冒险记录 */
export interface Adventure {
  id?: number;
  /** Keeps unfinished maps from appearing in another trainer's session. */
  trainerId?: number;
  continentId: string;
  difficulty?: MapDifficulty;
  /** 本次进入地图时从仓库带出的远征小队；孩子可自由决定人数。 */
  mapPartyIds?: number[];
  currentPosition: { x: number; y: number };
  events: AdventureEvent[];
  chapterGoalId?: string;
  taskIds?: string[];
  completedTaskIds?: string[];
  storyFragmentIds?: string[];
  pendingBattleType?: 'wild' | 'gym' | 'boss';
  /** Lightweight relationship progress earned from caring choices and smart battles. */
  bondPoints?: number;
  /** Short tactical clues found on the map and shown before a Boss battle. */
  bossHints?: string[];
  /** 当前地图的道馆许可与挑战书状态，按训练师的冒险存档保存。 */
  gymProgress?: GymProgress;
  completedAt?: Date;
}

/** 道馆单次挑战的随机赛制；规则由馆主公布，玩家只负责配队。 */
export type GymBattleFormat = 1 | 2 | 3;
export type GymSwitchRule = 'solo' | 'free' | 'locked';

export interface GymChallenge {
  format: GymBattleFormat;
  switchRule: GymSwitchRule;
  opponentIds: string[];
  playerIds: number[];
  createdAt: Date;
}

export interface GymRosterMember {
  id: string;
  monster: Monster;
}

/** 每个训练师在一张地图上的道馆进度。 */
export interface GymProgress {
  continentId: string;
  cleared: boolean;
  challenge?: GymChallenge;
  attempts: number;
  roster: GymRosterMember[];
  lastResult?: 'win' | 'loss';
}

/** 徽章 */
export interface Badge {
  id?: number;
  trainerId?: number;
  continentId: string;
  difficulty?: MapDifficulty;
  name: string;
  emoji: string;
  earnedAt: Date;
  /** 道馆徽章的来源属性与分配状态；旧 Boss 徽章不填写。 */
  element?: ElementType;
  kind?: 'boss' | 'gym' | 'super';
  assignedMonsterId?: number;
  statBoost?: 'hp' | 'attack' | 'defense' | 'speed';
  /** 超级勋章被使用的时间；已使用的勋章不可再次强化。 */
  usedAt?: Date;
}

/** 贴纸 */
export interface Sticker {
  id?: number;
  trainerId?: number;
  stickerId: string;
  name: string;
  emoji: string;
  continentId: string;
  earnedAt: Date;
}

/** 冒险日记 */
export interface AdventureDiaryEntry {
  id?: number;
  trainerId?: number;
  continentId: string;
  title: string;
  text: string;
  createdAt: Date;
}

/** 遭遇记录 */
export interface EncounterRecord {
  id?: number;
  /** The trainer who met this monster. */
  trainerId?: number;
  monsterName: string;
  /** 完整属性列表；monsterElement 保留为主属性，兼容旧遭遇记录。 */
  monsterElements?: ElementType[];
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
