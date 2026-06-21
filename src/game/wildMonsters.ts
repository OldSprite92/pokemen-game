import type { Monster, ElementType } from '../types';
import { createSkill } from './starterMonsters';

/** 野生宝可梦等级配置 */
export interface WildMonsterConfig {
  monster: Monster;
  minLevel: number;
  maxLevel: number;
  encounterRate: number; // 遇到概率权重
  preferredElements: ElementType[]; // 偏好的大陆属性
}

// ============ 1-8号 ============

/** 1. 粉仙猪 - 草+妖精 */
export const FEN_XIAN_PIG: Monster = {
  name: '粉仙猪',
  element: 'grass',
  skills: [
    createSkill('花瓣舞', 'grass', 20, 90, '撒出粉色花瓣攻击'),
    createSkill('妖精之风', 'fairy', 25, 85, '刮起妖精属性的风'),
    createSkill('治愈香气', 'grass', 0, 100, '散发香气恢复少量HP'),
    createSkill('魅惑之眼', 'fairy', 15, 95, '用迷人的眼神降低敌人命中'),
  ],
  avatar: 'pinkpig',
  hp: 85,
  maxHp: 85,
  attack: 50,
  defense: 55,
  speed: 45,
  level: 5,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

/** 2. 炎鬃犬 - 火+岩石 */
export const YAN_ZONG_DOG: Monster = {
  name: '炎鬃犬',
  element: 'fire',
  skills: [
    createSkill('火焰牙', 'fire', 25, 90, '用燃烧的双牙撕咬'),
    createSkill('岩石冲撞', 'rock', 30, 85, '用岩石包裹身体冲撞'),
    createSkill('烈焰鬃毛', 'fire', 20, 95, '竖起燃烧的鬃毛灼烧敌人'),
  ],
  avatar: 'firedog',
  hp: 80,
  maxHp: 80,
  attack: 70,
  defense: 60,
  speed: 65,
  level: 6,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

/** 3. 幽冥蝠 - 幽灵+毒 */
export const YOU_MING_BAT: Monster = {
  name: '幽冥蝠',
  element: 'ghost',
  skills: [
    createSkill('暗影球', 'ghost', 25, 90, '投掷暗影能量球'),
    createSkill('毒牙', 'poison', 20, 95, '用带毒的牙齿攻击'),
    createSkill('超声波', 'normal', 15, 100, '发出超声波干扰敌人'),
    createSkill('黑夜魔影', 'ghost', 30, 80, '召唤黑夜中的恐怖幻影'),
  ],
  avatar: 'bat',
  hp: 70,
  maxHp: 70,
  attack: 60,
  defense: 45,
  speed: 80,
  level: 7,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

/** 4. 冻原鹅 - 冰+飞行 */
export const DONG_YUAN_GOOSE: Monster = {
  name: '冻原鹅',
  element: 'ice',
  skills: [
    createSkill('冰冻之风', 'ice', 20, 95, '刮起冰冻的寒风'),
    createSkill('翅膀攻击', 'flying', 25, 90, '用坚硬的翅膀拍打'),
    createSkill('暴风雪', 'ice', 35, 75, '召唤小型暴风雪'),
  ],
  avatar: 'goose',
  hp: 75,
  maxHp: 75,
  attack: 55,
  defense: 50,
  speed: 60,
  level: 6,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

/** 5. 雷冠犀 - 电+地面 */
export const LEI_GUAN_RHINO: Monster = {
  name: '雷冠犀',
  element: 'electric',
  skills: [
    createSkill('雷电角', 'electric', 30, 85, '用带电的角撞击'),
    createSkill('地震', 'ground', 35, 80, '踩踏地面引发震动'),
    createSkill('充电', 'electric', 0, 100, '积蓄电力提升下次攻击'),
  ],
  avatar: 'rhino',
  hp: 100,
  maxHp: 100,
  attack: 75,
  defense: 80,
  speed: 30,
  level: 8,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

/** 6. 藻铠龟 - 水+钢 */
export const ZAO_KAI_TURTLE: Monster = {
  name: '藻铠龟',
  element: 'water',
  skills: [
    createSkill('水炮', 'water', 30, 85, '喷射高压水流'),
    createSkill('铁壁', 'steel', 0, 100, '用钢铁外壳提升防御'),
    createSkill('滚动攻击', 'steel', 25, 90, '缩成球滚动撞击'),
    createSkill('海藻缠绕', 'water', 20, 95, '用海藻缠住敌人'),
  ],
  avatar: 'turtle2',
  hp: 90,
  maxHp: 90,
  attack: 55,
  defense: 85,
  speed: 25,
  level: 7,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

/** 7. 裂空鹰 - 岩石+飞行 */
export const LIE_KONG_EAGLE: Monster = {
  name: '裂空鹰',
  element: 'rock',
  skills: [
    createSkill('岩石投掷', 'rock', 25, 90, '从空中投掷岩石'),
    createSkill('撕裂爪', 'flying', 30, 85, '用锋利的爪子撕裂'),
    createSkill('高空俯冲', 'flying', 35, 80, '从高空俯冲攻击'),
  ],
  avatar: 'eagle',
  hp: 80,
  maxHp: 80,
  attack: 75,
  defense: 55,
  speed: 70,
  level: 8,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

/** 8. 樱尾狐 - 一般+妖精 */
export const YING_WEI_FOX: Monster = {
  name: '樱尾狐',
  element: 'normal',
  skills: [
    createSkill('尾巴拍打', 'normal', 20, 95, '用蓬松的尾巴拍打'),
    createSkill('妖精火花', 'fairy', 25, 90, '撒出妖精属性的火花'),
    createSkill('撒娇', 'fairy', 0, 100, '撒娇降低敌人攻击'),
    createSkill('迅捷爪', 'normal', 30, 85, '快速用爪子攻击'),
  ],
  avatar: 'fox2',
  hp: 70,
  maxHp: 70,
  attack: 55,
  defense: 45,
  speed: 75,
  level: 5,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};
/** 9. 炽泥鳄 - 火+地面 */
export const CHI_NI_CROC: Monster = {
  name: '炽泥鳄',
  element: 'fire',
  skills: [
    createSkill('火焰喷射', 'fire', 30, 85, '喷出炽热火焰'),
    createSkill('泥浆投掷', 'ground', 25, 90, '投掷炽热泥浆'),
    createSkill('烈焰尾', 'fire', 20, 95, '用燃烧尾巴攻击'),
  ],
  avatar: 'croc',
  hp: 85,
  maxHp: 85,
  attack: 70,
  defense: 65,
  speed: 40,
  level: 7,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

/** 10. 荧菇蛙 - 草+毒 (从starterMonsters导入) */
import { GLOW_FROG } from './starterMonsters';

/** 11. 磁羽燕 - 电+钢 */
export const CI_YU_SWALLOW: Monster = {
  name: '磁羽燕',
  element: 'electric',
  skills: [
    createSkill('电磁冲击', 'electric', 25, 90, '用电磁力冲击敌人'),
    createSkill('钢翼', 'steel', 30, 85, '用钢铁翅膀切割'),
    createSkill('闪电俯冲', 'electric', 35, 80, '带电俯冲攻击'),
  ],
  avatar: 'swallow',
  hp: 70,
  maxHp: 70,
  attack: 60,
  defense: 50,
  speed: 85,
  level: 6,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

/** 12. 大舌象 - 格斗+恶 */
export const DA_SHE_ELEPHANT: Monster = {
  name: '大舌象',
  element: 'fighting',
  skills: [
    createSkill('重踏', 'fighting', 30, 85, '用巨力踩踏'),
    createSkill('恶之波动', 'dark', 25, 90, '释放恶意波动'),
    createSkill('象鼻鞭打', 'fighting', 35, 80, '用象鼻强力鞭打'),
  ],
  avatar: 'elephant',
  hp: 110,
  maxHp: 110,
  attack: 80,
  defense: 70,
  speed: 25,
  level: 9,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

/** 13. 香草猪 - 草+妖精 */
export const XIANG_CAO_PIG: Monster = {
  name: '香草猪',
  element: 'grass',
  skills: [
    createSkill('香草气息', 'grass', 20, 95, '散发香草气息治愈'),
    createSkill('妖精之吻', 'fairy', 25, 90, '用妖精之吻攻击'),
    createSkill('叶子盾牌', 'grass', 0, 100, '用叶子提升防御'),
    createSkill('甜甜香气', 'fairy', 15, 95, '用香气降低敌人速度'),
  ],
  avatar: 'vanilla',
  hp: 80,
  maxHp: 80,
  attack: 50,
  defense: 60,
  speed: 45,
  level: 5,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

/** 14. 泡泡猪 - 冰+格斗 */
export const PAO_PAO_PIG: Monster = {
  name: '泡泡猪',
  element: 'ice',
  skills: [
    createSkill('冰冻泡泡', 'ice', 20, 95, '吹出冰冻泡泡'),
    createSkill('格斗拳', 'fighting', 30, 85, '用格斗技巧出拳'),
    createSkill('雪球', 'ice', 25, 90, '投掷雪球'),
  ],
  avatar: 'bubblepig',
  hp: 75,
  maxHp: 75,
  attack: 65,
  defense: 55,
  speed: 50,
  level: 6,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

/** 15. 草蜜兰 - 草 */
export const CAO_MI_ORCHID: Monster = {
  name: '草蜜兰',
  element: 'grass',
  skills: [
    createSkill('花粉攻击', 'grass', 20, 95, '撒出花粉攻击'),
    createSkill('藤蔓缠绕', 'grass', 25, 90, '用藤蔓缠住敌人'),
    createSkill('光合作用', 'grass', 0, 100, '恢复少量HP'),
    createSkill('甜蜜香气', 'grass', 15, 95, '用香气降低敌人命中'),
  ],
  avatar: 'orchid',
  hp: 70,
  maxHp: 70,
  attack: 45,
  defense: 50,
  speed: 55,
  level: 4,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

/** 16. 水棉兰 - 水 */
export const SHUI_MIAN_COTTON: Monster = {
  name: '水棉兰',
  element: 'water',
  skills: [
    createSkill('水泡', 'water', 20, 95, '吹出水泡攻击'),
    createSkill('棉花护盾', 'water', 0, 100, '用棉花提升防御'),
    createSkill('水流喷射', 'water', 25, 90, '喷射水流'),
  ],
  avatar: 'cotton',
  hp: 75,
  maxHp: 75,
  attack: 50,
  defense: 55,
  speed: 50,
  level: 4,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

/** 17. 火翼龙 - 火+龙 */
export const HUO_YI_DRAGON: Monster = {
  name: '火翼龙',
  element: 'fire',
  skills: [
    createSkill('龙焰', 'fire', 35, 80, '喷出龙息火焰'),
    createSkill('龙之爪', 'dragon', 30, 85, '用龙爪撕裂'),
    createSkill('火焰翅膀', 'fire', 25, 90, '用火焰翅膀拍击'),
  ],
  avatar: 'firedrake',
  hp: 90,
  maxHp: 90,
  attack: 80,
  defense: 60,
  speed: 70,
  level: 10,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

/** 18. 冰锯蜥 - 冰 */
export const BING_JU_LIZARD: Monster = {
  name: '冰锯蜥',
  element: 'ice',
  skills: [
    createSkill('冰锯', 'ice', 30, 85, '用冰锯切割'),
    createSkill('冰冻光线', 'ice', 25, 90, '发射冰冻光线'),
    createSkill('冰甲', 'ice', 0, 100, '用冰甲提升防御'),
  ],
  avatar: 'icesaw',
  hp: 80,
  maxHp: 80,
  attack: 65,
  defense: 70,
  speed: 40,
  level: 7,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

/** 19. 岩陆蜥 - 岩石+钢 */
export const YAN_LU_LIZARD: Monster = {
  name: '岩陆蜥',
  element: 'rock',
  skills: [
    createSkill('岩石粉碎', 'rock', 30, 85, '粉碎岩石攻击'),
    createSkill('钢铁尾巴', 'steel', 25, 90, '用钢铁尾巴抽打'),
    createSkill('硬化', 'steel', 0, 100, '提升防御'),
  ],
  avatar: 'rocklizard',
  hp: 85,
  maxHp: 85,
  attack: 60,
  defense: 85,
  speed: 30,
  level: 8,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

/** 20. 闪电蜥 - 电 */
export const SHAN_DIAN_LIZARD: Monster = {
  name: '闪电蜥',
  element: 'electric',
  skills: [
    createSkill('电击', 'electric', 25, 90, '释放电击'),
    createSkill('闪电链', 'electric', 30, 85, '释放连锁闪电'),
    createSkill('蓄电', 'electric', 0, 100, '积蓄电力'),
  ],
  avatar: 'lightning',
  hp: 70,
  maxHp: 70,
  attack: 60,
  defense: 45,
  speed: 85,
  level: 6,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

/** 21. 翼幻接龙 - 龙+恶 */
export const YI_HUAN_DRAGON: Monster = {
  name: '翼幻接龙',
  element: 'dragon',
  skills: [
    createSkill('龙之怒', 'dragon', 35, 80, '释放龙之怒火'),
    createSkill('恶之爪', 'dark', 30, 85, '用恶之爪撕裂'),
    createSkill('幻影翅膀', 'dragon', 25, 90, '用幻影翅膀迷惑敌人'),
  ],
  avatar: 'dragon2',
  hp: 95,
  maxHp: 95,
  attack: 85,
  defense: 65,
  speed: 75,
  level: 12,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

/** 22. 雪百纳 - 冰+水 */
export const XUE_BAI_NA: Monster = {
  name: '雪百纳',
  element: 'ice',
  skills: [
    createSkill('冰雪风暴', 'ice', 30, 85, '召唤冰雪风暴'),
    createSkill('水流冲击', 'water', 25, 90, '用冲击水流攻击'),
    createSkill('冰冻之水', 'ice', 20, 95, '用冰冻的水攻击'),
  ],
  avatar: 'snow',
  hp: 85,
  maxHp: 85,
  attack: 60,
  defense: 65,
  speed: 55,
  level: 8,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

/** 23. 黑仙猪 - 恶+妖精 */
export const HEI_XIAN_PIG: Monster = {
  name: '黑仙猪',
  element: 'dark',
  skills: [
    createSkill('暗影冲击', 'dark', 30, 85, '用暗影力量冲击'),
    createSkill('妖精之舞', 'fairy', 25, 90, '跳起妖精之舞攻击'),
    createSkill('黑暗气场', 'dark', 0, 100, '释放黑暗气场降低敌人命中'),
    createSkill('魅惑之瞳', 'fairy', 15, 95, '用魅惑眼神降低敌人攻击'),
  ],
  avatar: 'darkpig',
  hp: 85,
  maxHp: 85,
  attack: 65,
  defense: 55,
  speed: 50,
  level: 8,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

/** 24. 烈光鸟 - 光 */
export const LIE_GUANG_BIRD: Monster = {
  name: '烈光鸟',
  element: 'light',
  skills: [
    createSkill('圣光射线', 'light', 30, 85, '发射神圣光芒'),
    createSkill('光之翼', 'light', 25, 90, '用光之翼拍击'),
    createSkill('闪光', 'light', 0, 100, '发出强光降低敌人命中'),
    createSkill('光芒万丈', 'light', 35, 80, '释放万丈光芒攻击'),
  ],
  avatar: 'lightbird',
  hp: 80,
  maxHp: 80,
  attack: 70,
  defense: 55,
  speed: 75,
  level: 10,
  exp: 0,
  expToNext: 100,
  createdBy: 'system',
  createdAt: new Date(),
};

// ============ 所有野生宝可梦配置 ============

export const ALL_WILD_MONSTERS: WildMonsterConfig[] = [
  { monster: FEN_XIAN_PIG, minLevel: 3, maxLevel: 8, encounterRate: 10, preferredElements: ['grass', 'fairy'] },
  { monster: YAN_ZONG_DOG, minLevel: 4, maxLevel: 9, encounterRate: 10, preferredElements: ['fire', 'rock'] },
  { monster: YOU_MING_BAT, minLevel: 5, maxLevel: 10, encounterRate: 8, preferredElements: ['ghost', 'poison'] },
  { monster: DONG_YUAN_GOOSE, minLevel: 4, maxLevel: 9, encounterRate: 10, preferredElements: ['ice', 'flying'] },
  { monster: LEI_GUAN_RHINO, minLevel: 6, maxLevel: 12, encounterRate: 6, preferredElements: ['electric', 'ground'] },
  { monster: ZAO_KAI_TURTLE, minLevel: 5, maxLevel: 10, encounterRate: 8, preferredElements: ['water', 'steel'] },
  { monster: LIE_KONG_EAGLE, minLevel: 6, maxLevel: 11, encounterRate: 7, preferredElements: ['rock', 'flying'] },
  { monster: YING_WEI_FOX, minLevel: 3, maxLevel: 7, encounterRate: 12, preferredElements: ['normal', 'fairy'] },
  { monster: CHI_NI_CROC, minLevel: 5, maxLevel: 10, encounterRate: 8, preferredElements: ['fire', 'ground'] },
  { monster: GLOW_FROG, minLevel: 3, maxLevel: 8, encounterRate: 10, preferredElements: ['grass', 'poison'] },
  { monster: CI_YU_SWALLOW, minLevel: 4, maxLevel: 9, encounterRate: 8, preferredElements: ['electric', 'steel'] },
  { monster: DA_SHE_ELEPHANT, minLevel: 7, maxLevel: 13, encounterRate: 5, preferredElements: ['fighting', 'dark'] },
  { monster: XIANG_CAO_PIG, minLevel: 3, maxLevel: 7, encounterRate: 10, preferredElements: ['grass', 'fairy'] },
  { monster: PAO_PAO_PIG, minLevel: 4, maxLevel: 8, encounterRate: 9, preferredElements: ['ice', 'fighting'] },
  { monster: CAO_MI_ORCHID, minLevel: 2, maxLevel: 6, encounterRate: 15, preferredElements: ['grass'] },
  { monster: SHUI_MIAN_COTTON, minLevel: 2, maxLevel: 6, encounterRate: 15, preferredElements: ['water'] },
  { monster: HUO_YI_DRAGON, minLevel: 8, maxLevel: 15, encounterRate: 4, preferredElements: ['fire', 'dragon'] },
  { monster: BING_JU_LIZARD, minLevel: 5, maxLevel: 9, encounterRate: 10, preferredElements: ['ice'] },
  { monster: YAN_LU_LIZARD, minLevel: 6, maxLevel: 11, encounterRate: 7, preferredElements: ['rock', 'steel'] },
  { monster: SHAN_DIAN_LIZARD, minLevel: 4, maxLevel: 8, encounterRate: 12, preferredElements: ['electric'] },
  { monster: YI_HUAN_DRAGON, minLevel: 9, maxLevel: 15, encounterRate: 3, preferredElements: ['dragon', 'dark'] },
  { monster: XUE_BAI_NA, minLevel: 5, maxLevel: 10, encounterRate: 8, preferredElements: ['ice', 'water'] },
  { monster: HEI_XIAN_PIG, minLevel: 6, maxLevel: 11, encounterRate: 6, preferredElements: ['dark', 'fairy'] },
  { monster: LIE_GUANG_BIRD, minLevel: 8, maxLevel: 15, encounterRate: 4, preferredElements: ['light'] },
];

/** 根据大陆属性获取可遇到的野生宝可梦池 */
export function getWildMonsterPool(element: ElementType): WildMonsterConfig[] {
  return ALL_WILD_MONSTERS.filter((config) =>
    config.preferredElements.includes(element)
  );
}

/** 生成一个野生宝可梦实例（带随机等级波动） */
export function generateWildMonster(config: WildMonsterConfig): Monster {
  const levelRange = config.maxLevel - config.minLevel;
  const level = config.minLevel + Math.floor(Math.random() * (levelRange + 1));
  
  // 根据等级调整属性
  const levelMultiplier = 1 + (level - 5) * 0.1;
  
  return {
    ...config.monster,
    id: undefined,
    level,
    hp: Math.floor(config.monster.hp * levelMultiplier),
    maxHp: Math.floor((config.monster.maxHp || config.monster.hp) * levelMultiplier),
    attack: Math.floor(config.monster.attack * levelMultiplier),
    defense: Math.floor(config.monster.defense * levelMultiplier),
    speed: Math.floor(config.monster.speed * levelMultiplier),
    exp: 0,
    expToNext: Math.floor(100 * Math.pow(1.2, level - 1)),
    createdAt: new Date(),
  };
}

/** 随机选择一个野生宝可梦 */
export function randomEncounter(element: ElementType): Monster | null {
  const pool = getWildMonsterPool(element);
  if (pool.length === 0) return null;

  // 根据encounterRate加权随机选择
  const totalRate = pool.reduce((sum, c) => sum + c.encounterRate, 0);
  let roll = Math.random() * totalRate;
  
  for (const config of pool) {
    roll -= config.encounterRate;
    if (roll <= 0) {
      return generateWildMonster(config);
    }
  }
  
  return generateWildMonster(pool[0]);
}
