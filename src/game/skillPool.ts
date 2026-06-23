import type { Skill, ElementType } from '../types';

/** 技能池条目 */
export interface SkillPoolEntry {
  skill: Skill;
  unlockLevel: number; // 2, 4, 6, 8, 10
}

/** 按属性分类的技能池 */
export const SKILL_POOL: Record<ElementType, SkillPoolEntry[]> = {
  fire: [
    { skill: { id: 'fire-1', name: '火花', element: 'fire', power: 15, accuracy: 100, description: '发出小火苗攻击' }, unlockLevel: 2 },
    { skill: { id: 'fire-2', name: '火焰喷射', element: 'fire', power: 25, accuracy: 90, description: '喷出炽热火焰' }, unlockLevel: 2 },
    { skill: { id: 'fire-3', name: '火球术', element: 'fire', power: 20, accuracy: 95, description: '投掷火球' }, unlockLevel: 4 },
    { skill: { id: 'fire-4', name: '烈焰冲击', element: 'fire', power: 30, accuracy: 85, description: '用烈焰冲击敌人' }, unlockLevel: 4 },
    { skill: { id: 'fire-5', name: '燃烧之刃', element: 'fire', power: 25, accuracy: 90, description: '用火焰之刃切割' }, unlockLevel: 6 },
    { skill: { id: 'fire-6', name: '爆炎', element: 'fire', power: 35, accuracy: 80, description: '引发爆炸火焰' }, unlockLevel: 8 },
    { skill: { id: 'fire-7', name: '地狱之火', element: 'fire', power: 40, accuracy: 75, description: '释放地狱烈焰' }, unlockLevel: 10 },
  ],
  water: [
    { skill: { id: 'water-1', name: '水枪', element: 'water', power: 15, accuracy: 100, description: '喷射水流' }, unlockLevel: 2 },
    { skill: { id: 'water-2', name: '水泡', element: 'water', power: 20, accuracy: 95, description: '吹出水泡' }, unlockLevel: 2 },
    { skill: { id: 'water-3', name: '水流冲击', element: 'water', power: 25, accuracy: 90, description: '高压水流冲击' }, unlockLevel: 4 },
    { skill: { id: 'water-4', name: '冰冻之泪', element: 'water', power: 20, accuracy: 95, description: '冰冻泪水攻击' }, unlockLevel: 4 },
    { skill: { id: 'water-5', name: '漩涡', element: 'water', power: 30, accuracy: 85, description: '制造水流漩涡' }, unlockLevel: 6 },
    { skill: { id: 'water-6', name: '海啸', element: 'water', power: 35, accuracy: 80, description: '召唤小型海啸' }, unlockLevel: 8 },
    { skill: { id: 'water-7', name: '暴雨', element: 'water', power: 40, accuracy: 75, description: '召唤暴雨攻击' }, unlockLevel: 10 },
  ],
  grass: [
    { skill: { id: 'grass-1', name: '藤蔓缠绕', element: 'grass', power: 15, accuracy: 100, description: '用藤蔓缠绕敌人' }, unlockLevel: 2 },
    { skill: { id: 'grass-2', name: '种子炸弹', element: 'grass', power: 20, accuracy: 95, description: '投掷种子炸弹' }, unlockLevel: 2 },
    { skill: { id: 'grass-3', name: '光合作用', element: 'grass', power: 0, accuracy: 100, description: '吸收阳光恢复HP' }, unlockLevel: 4 },
    { skill: { id: 'grass-4', name: '毒粉', element: 'grass', power: 20, accuracy: 95, description: '撒出毒粉' }, unlockLevel: 4 },
    { skill: { id: 'grass-5', name: '飞叶快刀', element: 'grass', power: 25, accuracy: 90, description: '发射锋利叶片' }, unlockLevel: 6 },
    { skill: { id: 'grass-6', name: '阳光烈焰', element: 'grass', power: 35, accuracy: 80, description: '聚集阳光发射烈焰' }, unlockLevel: 8 },
    { skill: { id: 'grass-7', name: '森林诅咒', element: 'grass', power: 40, accuracy: 75, description: '召唤森林之力' }, unlockLevel: 10 },
  ],
  electric: [
    { skill: { id: 'electric-1', name: '电击', element: 'electric', power: 15, accuracy: 100, description: '释放微弱电流' }, unlockLevel: 2 },
    { skill: { id: 'electric-2', name: '十万伏特', element: 'electric', power: 25, accuracy: 90, description: '释放高压电流' }, unlockLevel: 2 },
    { skill: { id: 'electric-3', name: '雷电拳', element: 'electric', power: 20, accuracy: 95, description: '带电的拳击' }, unlockLevel: 4 },
    { skill: { id: 'electric-4', name: '静电场', element: 'electric', power: 0, accuracy: 100, description: '释放静电干扰' }, unlockLevel: 4 },
    { skill: { id: 'electric-5', name: '打雷', element: 'electric', power: 30, accuracy: 85, description: '召唤雷电' }, unlockLevel: 6 },
    { skill: { id: 'electric-6', name: '电磁炮', element: 'electric', power: 35, accuracy: 80, description: '发射电磁能量' }, unlockLevel: 8 },
    { skill: { id: 'electric-7', name: '雷神之怒', element: 'electric', power: 40, accuracy: 75, description: '召唤雷神之力' }, unlockLevel: 10 },
  ],
  normal: [
    { skill: { id: 'normal-1', name: '撞击', element: 'normal', power: 15, accuracy: 100, description: '用身体撞击' }, unlockLevel: 2 },
    { skill: { id: 'normal-2', name: '抓挠', element: 'normal', power: 20, accuracy: 95, description: '用爪子抓挠' }, unlockLevel: 2 },
    { skill: { id: 'normal-3', name: '吼叫', element: 'normal', power: 0, accuracy: 100, description: '大声吼叫威慑' }, unlockLevel: 4 },
    { skill: { id: 'normal-4', name: '猛撞', element: 'normal', power: 25, accuracy: 90, description: '全力冲撞' }, unlockLevel: 4 },
    { skill: { id: 'normal-5', name: '舍身冲撞', element: 'normal', power: 30, accuracy: 85, description: '舍身攻击' }, unlockLevel: 6 },
    { skill: { id: 'normal-6', name: '破坏死光', element: 'normal', power: 35, accuracy: 80, description: '发射破坏光线' }, unlockLevel: 8 },
    { skill: { id: 'normal-7', name: '终极冲击', element: 'normal', power: 40, accuracy: 75, description: '终极全力一击' }, unlockLevel: 10 },
  ],
  ice: [
    { skill: { id: 'ice-1', name: '冰冻光束', element: 'ice', power: 15, accuracy: 100, description: '发射冰冻光线' }, unlockLevel: 2 },
    { skill: { id: 'ice-2', name: '冰锥', element: 'ice', power: 20, accuracy: 95, description: '发射冰锥' }, unlockLevel: 2 },
    { skill: { id: 'ice-3', name: '霜冻', element: 'ice', power: 20, accuracy: 95, description: '释放霜冻' }, unlockLevel: 4 },
    { skill: { id: 'ice-4', name: '暴风雪', element: 'ice', power: 25, accuracy: 90, description: '召唤暴风雪' }, unlockLevel: 4 },
    { skill: { id: 'ice-5', name: '绝对零度', element: 'ice', power: 30, accuracy: 85, description: '释放极寒' }, unlockLevel: 6 },
    { skill: { id: 'ice-6', name: '冰川崩塌', element: 'ice', power: 35, accuracy: 80, description: '引发冰川崩塌' }, unlockLevel: 8 },
    { skill: { id: 'ice-7', name: '永恒冰河', element: 'ice', power: 40, accuracy: 75, description: '冻结一切' }, unlockLevel: 10 },
  ],
  fighting: [
    { skill: { id: 'fighting-1', name: '空手劈', element: 'fighting', power: 15, accuracy: 100, description: '用手刀劈砍' }, unlockLevel: 2 },
    { skill: { id: 'fighting-2', name: '飞踢', element: 'fighting', power: 25, accuracy: 90, description: '飞身踢击' }, unlockLevel: 2 },
    { skill: { id: 'fighting-3', name: '气功波', element: 'fighting', power: 20, accuracy: 95, description: '发射气功波' }, unlockLevel: 4 },
    { skill: { id: 'fighting-4', name: '重拳', element: 'fighting', power: 25, accuracy: 90, description: '强力拳击' }, unlockLevel: 4 },
    { skill: { id: 'fighting-5', name: '爆裂拳', element: 'fighting', power: 30, accuracy: 85, description: '爆炸般的一拳' }, unlockLevel: 6 },
    { skill: { id: 'fighting-6', name: '庐山升龙霸', element: 'fighting', power: 35, accuracy: 80, description: '升龙一击' }, unlockLevel: 8 },
    { skill: { id: 'fighting-7', name: '霸王翔吼拳', element: 'fighting', power: 40, accuracy: 75, description: '终极格斗技' }, unlockLevel: 10 },
  ],
  poison: [
    { skill: { id: 'poison-1', name: '毒液', element: 'poison', power: 15, accuracy: 100, description: '喷射毒液' }, unlockLevel: 2 },
    { skill: { id: 'poison-2', name: '腐蚀气体', element: 'poison', power: 20, accuracy: 95, description: '释放腐蚀气体' }, unlockLevel: 2 },
    { skill: { id: 'poison-3', name: '剧毒', element: 'poison', power: 20, accuracy: 95, description: '释放剧毒' }, unlockLevel: 4 },
    { skill: { id: 'poison-4', name: '酸雨', element: 'poison', power: 25, accuracy: 90, description: '降下酸雨' }, unlockLevel: 4 },
    { skill: { id: 'poison-5', name: '毒爆弹', element: 'poison', power: 30, accuracy: 85, description: '投掷毒爆弹' }, unlockLevel: 6 },
    { skill: { id: 'poison-6', name: '瘟疫蔓延', element: 'poison', power: 35, accuracy: 80, description: '释放瘟疫' }, unlockLevel: 8 },
    { skill: { id: 'poison-7', name: '万毒噬心', element: 'poison', power: 40, accuracy: 75, description: '终极剧毒' }, unlockLevel: 10 },
  ],
  ground: [
    { skill: { id: 'ground-1', name: '沙暴', element: 'ground', power: 15, accuracy: 100, description: '掀起沙暴' }, unlockLevel: 2 },
    { skill: { id: 'ground-2', name: '岩石投掷', element: 'ground', power: 20, accuracy: 95, description: '投掷岩石' }, unlockLevel: 2 },
    { skill: { id: 'ground-3', name: '地震', element: 'ground', power: 25, accuracy: 90, description: '引发地震' }, unlockLevel: 4 },
    { skill: { id: 'ground-4', name: '地裂', element: 'ground', power: 25, accuracy: 90, description: '撕裂地面' }, unlockLevel: 4 },
    { skill: { id: 'ground-5', name: '泥石流', element: 'ground', power: 30, accuracy: 85, description: '引发泥石流' }, unlockLevel: 6 },
    { skill: { id: 'ground-6', name: '大地之力', element: 'ground', power: 35, accuracy: 80, description: '借用大地之力' }, unlockLevel: 8 },
    { skill: { id: 'ground-7', name: '天崩地裂', element: 'ground', power: 40, accuracy: 75, description: '毁灭性地震' }, unlockLevel: 10 },
  ],
  flying: [
    { skill: { id: 'flying-1', name: '翅膀攻击', element: 'flying', power: 15, accuracy: 100, description: '用翅膀拍打' }, unlockLevel: 2 },
    { skill: { id: 'flying-2', name: '空气斩', element: 'flying', power: 20, accuracy: 95, description: '斩开空气' }, unlockLevel: 2 },
    { skill: { id: 'flying-3', name: '旋风', element: 'flying', power: 20, accuracy: 95, description: '制造旋风' }, unlockLevel: 4 },
    { skill: { id: 'flying-4', name: '俯冲', element: 'flying', power: 25, accuracy: 90, description: '高空俯冲' }, unlockLevel: 4 },
    { skill: { id: 'flying-5', name: '飓风', element: 'flying', power: 30, accuracy: 85, description: '召唤飓风' }, unlockLevel: 6 },
    { skill: { id: 'flying-6', name: '龙卷风', element: 'flying', power: 35, accuracy: 80, description: '召唤龙卷风' }, unlockLevel: 8 },
    { skill: { id: 'flying-7', name: '天空之怒', element: 'flying', power: 40, accuracy: 75, description: '天空的愤怒' }, unlockLevel: 10 },
  ],
  psychic: [
    { skill: { id: 'psychic-1', name: '念力', element: 'psychic', power: 15, accuracy: 100, description: '用念力攻击' }, unlockLevel: 2 },
    { skill: { id: 'psychic-2', name: '精神强念', element: 'psychic', power: 25, accuracy: 90, description: '强化念力' }, unlockLevel: 2 },
    { skill: { id: 'psychic-3', name: '催眠术', element: 'psychic', power: 0, accuracy: 100, description: '催眠敌人' }, unlockLevel: 4 },
    { skill: { id: 'psychic-4', name: '预知未来', element: 'psychic', power: 20, accuracy: 95, description: '预知攻击' }, unlockLevel: 4 },
    { skill: { id: 'psychic-5', name: '精神冲击', element: 'psychic', power: 30, accuracy: 85, description: '精神冲击波' }, unlockLevel: 6 },
    { skill: { id: 'psychic-6', name: '意念操控', element: 'psychic', power: 35, accuracy: 80, description: '操控敌人' }, unlockLevel: 8 },
    { skill: { id: 'psychic-7', name: '宇宙力量', element: 'psychic', power: 40, accuracy: 75, description: '借用宇宙之力' }, unlockLevel: 10 },
  ],
  bug: [
    { skill: { id: 'bug-1', name: '虫咬', element: 'bug', power: 15, accuracy: 100, description: '用虫牙咬' }, unlockLevel: 2 },
    { skill: { id: 'bug-2', name: '丝线缠绕', element: 'bug', power: 20, accuracy: 95, description: '用丝缠绕' }, unlockLevel: 2 },
    { skill: { id: 'bug-3', name: '毒针', element: 'bug', power: 20, accuracy: 95, description: '发射毒针' }, unlockLevel: 4 },
    { skill: { id: 'bug-4', name: '鳞粉', element: 'bug', power: 0, accuracy: 100, description: '撒出鳞粉' }, unlockLevel: 4 },
    { skill: { id: 'bug-5', name: '虫鸣', element: 'bug', power: 25, accuracy: 90, description: '发出虫鸣' }, unlockLevel: 6 },
    { skill: { id: 'bug-6', name: '蜂群攻击', element: 'bug', power: 35, accuracy: 80, description: '召唤蜂群' }, unlockLevel: 8 },
    { skill: { id: 'bug-7', name: '虫之舞', element: 'bug', power: 40, accuracy: 75, description: '虫群之舞' }, unlockLevel: 10 },
  ],
  rock: [
    { skill: { id: 'rock-1', name: '落石', element: 'rock', power: 15, accuracy: 100, description: '落下岩石' }, unlockLevel: 2 },
    { skill: { id: 'rock-2', name: '岩石封锁', element: 'rock', power: 20, accuracy: 95, description: '用岩石封锁' }, unlockLevel: 2 },
    { skill: { id: 'rock-3', name: '岩崩', element: 'rock', power: 25, accuracy: 90, description: '引发岩崩' }, unlockLevel: 4 },
    { skill: { id: 'rock-4', name: '石刃', element: 'rock', power: 25, accuracy: 90, description: '发射石刃' }, unlockLevel: 4 },
    { skill: { id: 'rock-5', name: '巨石冲击', element: 'rock', power: 30, accuracy: 85, description: '投掷巨石' }, unlockLevel: 6 },
    { skill: { id: 'rock-6', name: '钻石风暴', element: 'rock', power: 35, accuracy: 80, description: '钻石风暴' }, unlockLevel: 8 },
    { skill: { id: 'rock-7', name: '山崩地裂', element: 'rock', power: 40, accuracy: 75, description: '山崩地裂' }, unlockLevel: 10 },
  ],
  ghost: [
    { skill: { id: 'ghost-1', name: '暗影爪', element: 'ghost', power: 15, accuracy: 100, description: '暗影之爪' }, unlockLevel: 2 },
    { skill: { id: 'ghost-2', name: '惊吓', element: 'ghost', power: 20, accuracy: 95, description: '惊吓敌人' }, unlockLevel: 2 },
    { skill: { id: 'ghost-3', name: '暗影球', element: 'ghost', power: 25, accuracy: 90, description: '发射暗影球' }, unlockLevel: 4 },
    { skill: { id: 'ghost-4', name: '诅咒', element: 'ghost', power: 0, accuracy: 100, description: '诅咒敌人' }, unlockLevel: 4 },
    { skill: { id: 'ghost-5', name: '暗影偷袭', element: 'ghost', power: 30, accuracy: 85, description: '暗影中偷袭' }, unlockLevel: 6 },
    { skill: { id: 'ghost-6', name: '怨念', element: 'ghost', power: 35, accuracy: 80, description: '释放怨念' }, unlockLevel: 8 },
    { skill: { id: 'ghost-7', name: '冥界之门', element: 'ghost', power: 40, accuracy: 75, description: '打开冥界' }, unlockLevel: 10 },
  ],
  dragon: [
    { skill: { id: 'dragon-1', name: '龙爪', element: 'dragon', power: 15, accuracy: 100, description: '龙之利爪' }, unlockLevel: 2 },
    { skill: { id: 'dragon-2', name: '龙之怒', element: 'dragon', power: 25, accuracy: 90, description: '龙之愤怒' }, unlockLevel: 2 },
    { skill: { id: 'dragon-3', name: '龙息', element: 'dragon', power: 20, accuracy: 95, description: '龙之吐息' }, unlockLevel: 4 },
    { skill: { id: 'dragon-4', name: '龙之波动', element: 'dragon', power: 25, accuracy: 90, description: '龙之波动' }, unlockLevel: 4 },
    { skill: { id: 'dragon-5', name: '龙之俯冲', element: 'dragon', power: 30, accuracy: 85, description: '龙俯冲' }, unlockLevel: 6 },
    { skill: { id: 'dragon-6', name: '流星群', element: 'dragon', power: 35, accuracy: 80, description: '召唤流星' }, unlockLevel: 8 },
    { skill: { id: 'dragon-7', name: '时空破碎', element: 'dragon', power: 40, accuracy: 75, description: '破碎时空' }, unlockLevel: 10 },
  ],
  dark: [
    { skill: { id: 'dark-1', name: '咬住', element: 'dark', power: 15, accuracy: 100, description: '咬住敌人' }, unlockLevel: 2 },
    { skill: { id: 'dark-2', name: '欺诈', element: 'dark', power: 25, accuracy: 90, description: '欺诈攻击' }, unlockLevel: 2 },
    { skill: { id: 'dark-3', name: '恶之波动', element: 'dark', power: 25, accuracy: 90, description: '恶之波动' }, unlockLevel: 4 },
    { skill: { id: 'dark-4', name: '挑衅', element: 'dark', power: 0, accuracy: 100, description: '挑衅敌人' }, unlockLevel: 4 },
    { skill: { id: 'dark-5', name: '暗黑洞', element: 'dark', power: 30, accuracy: 85, description: '制造黑洞' }, unlockLevel: 6 },
    { skill: { id: 'dark-6', name: '暗夜审判', element: 'dark', power: 35, accuracy: 80, description: '暗夜审判' }, unlockLevel: 8 },
    { skill: { id: 'dark-7', name: '无尽黑暗', element: 'dark', power: 40, accuracy: 75, description: '吞噬一切' }, unlockLevel: 10 },
  ],
  steel: [
    { skill: { id: 'steel-1', name: '金属爪', element: 'steel', power: 15, accuracy: 100, description: '金属之爪' }, unlockLevel: 2 },
    { skill: { id: 'steel-2', name: '铁壁', element: 'steel', power: 0, accuracy: 100, description: '铁壁防御' }, unlockLevel: 2 },
    { skill: { id: 'steel-3', name: '钢翼', element: 'steel', power: 25, accuracy: 90, description: '钢铁翅膀' }, unlockLevel: 4 },
    { skill: { id: 'steel-4', name: '铁头', element: 'steel', power: 25, accuracy: 90, description: '铁头撞击' }, unlockLevel: 4 },
    { skill: { id: 'steel-5', name: '加农光炮', element: 'steel', power: 30, accuracy: 85, description: '发射光炮' }, unlockLevel: 6 },
    { skill: { id: 'steel-6', name: '钢铁洪流', element: 'steel', power: 35, accuracy: 80, description: '钢铁洪流' }, unlockLevel: 8 },
    { skill: { id: 'steel-7', name: '神钢裁决', element: 'steel', power: 40, accuracy: 75, description: '神钢裁决' }, unlockLevel: 10 },
  ],
  fairy: [
    { skill: { id: 'fairy-1', name: '妖精之风', element: 'fairy', power: 15, accuracy: 100, description: '妖精之风吹拂' }, unlockLevel: 2 },
    { skill: { id: 'fairy-2', name: '魅惑', element: 'fairy', power: 0, accuracy: 100, description: '魅惑敌人' }, unlockLevel: 2 },
    { skill: { id: 'fairy-3', name: '月光', element: 'fairy', power: 0, accuracy: 100, description: '月光恢复' }, unlockLevel: 4 },
    { skill: { id: 'fairy-4', name: '魔法闪耀', element: 'fairy', power: 25, accuracy: 90, description: '魔法闪耀' }, unlockLevel: 4 },
    { skill: { id: 'fairy-5', name: '妖精诅咒', element: 'fairy', power: 30, accuracy: 85, description: '妖精诅咒' }, unlockLevel: 6 },
    { skill: { id: 'fairy-6', name: '星耀风暴', element: 'fairy', power: 35, accuracy: 80, description: '星耀风暴' }, unlockLevel: 8 },
    { skill: { id: 'fairy-7', name: '妖精女王', element: 'fairy', power: 40, accuracy: 75, description: '妖精女王之力' }, unlockLevel: 10 },
  ],
  light: [
    { skill: { id: 'light-1', name: '闪光', element: 'light', power: 15, accuracy: 100, description: '发出闪光' }, unlockLevel: 2 },
    { skill: { id: 'light-2', name: '光之箭', element: 'light', power: 20, accuracy: 95, description: '光之箭矢' }, unlockLevel: 2 },
    { skill: { id: 'light-3', name: '治愈之光', element: 'light', power: 0, accuracy: 100, description: '治愈光芒' }, unlockLevel: 4 },
    { skill: { id: 'light-4', name: '圣光', element: 'light', power: 25, accuracy: 90, description: '神圣之光' }, unlockLevel: 4 },
    { skill: { id: 'light-5', name: '光之壁', element: 'light', power: 0, accuracy: 100, description: '光之屏障' }, unlockLevel: 6 },
    { skill: { id: 'light-6', name: '审判之光', element: 'light', power: 35, accuracy: 80, description: '审判之光' }, unlockLevel: 8 },
    { skill: { id: 'light-7', name: '创世之光', element: 'light', power: 40, accuracy: 75, description: '创世之光' }, unlockLevel: 10 },
  ],
};

/** 获取某属性在指定等级可学习的所有技能 */
export function getUnlockableSkills(element: ElementType, level: number): Skill[] {
  const pool = SKILL_POOL[element] || [];
  return pool
    .filter((entry) => entry.unlockLevel <= level)
    .map((entry) => ({ ...entry.skill }));
}

/** 为宝可梦学习新技能（从属性池中随机选一个未拥有的） */
export function learnNewSkill(currentSkills: Skill[], element: ElementType, level: number): Skill | null {
  const learnable = getUnlockableSkills(element, level);
  const existingIds = new Set(currentSkills.map((s) => s.id));
  const available = learnable.filter((s) => !existingIds.has(s.id));

  if (available.length === 0) return null;

  // 随机选择一个
  return available[Math.floor(Math.random() * available.length)];
}

/** 根据等级计算应有的技能数量 */
export function getSkillCountByLevel(level: number): number {
  if (level <= 2) return 2;
  if (level <= 4) return 3;
  if (level <= 6) return 4;
  if (level <= 8) return 5;
  return 6;
}

/** 检查是否触发技能解锁 */
export function checkSkillUnlock(oldLevel: number, newLevel: number): number | null {
  const unlockPoints = [2, 4, 6, 8, 10];
  for (const point of unlockPoints) {
    if (oldLevel < point && newLevel >= point) {
      return point;
    }
  }
  return null;
}
