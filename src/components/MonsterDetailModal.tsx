import { AVATAR_OPTIONS } from './create/StepAvatar';
import { ELEMENT_CONFIG } from './create/StepElement';
import MonsterElementBadges from './MonsterElementBadges';
import { generateMonsterBackstory } from '../game/monsterStory';
import type { ElementType, Monster } from '../types';

// 副作用：确保此模块不会被 Tree Shaking 移除
if (typeof window !== 'undefined') {
  (window as any).__monsterDetailModalLoaded = true;
}

/** 获取属性颜色 */
function getElementColor(element: ElementType) {
  return ELEMENT_CONFIG[element]?.color || '#9ca3af';
}

/** 获取属性emoji */
function getElementEmoji(element: ElementType) {
  return ELEMENT_CONFIG[element]?.emoji || '❓';
}

/** 获取头像emoji */
function getAvatarEmoji(avatarId: string) {
  return AVATAR_OPTIONS.find((a) => a.id === avatarId)?.emoji || '❓';
}

/** 获取种族值百分比 */
function getStatPercent(value: number) {
  const max = 150;
  return Math.min((value / max) * 100, 100);
}

/** 获取种族值颜色 */
function getStatColor(stat: string) {
  const colors: Record<string, string> = {
    hp: '#ef4444',
    attack: '#f97316',
    defense: '#eab308',
    spAttack: '#3b82f6',
    spDefense: '#22c55e',
    speed: '#a855f7',
  };
  return colors[stat] || '#9ca3af';
}

/** 获取总种族值 */
function getTotalStats(m: Monster) {
  return m.hp + m.attack + m.defense + m.speed;
}

/** 获取描述 */
function getDescription(m: Monster) {
  if (m.description) return m.description;
  const descs: Record<string, string> = {
    fire: '体内蕴含着炽热的火焰能量，情绪激动时体温会急剧上升。',
    water: '喜欢生活在清澈的水域附近，能操控水流进行攻击。',
    grass: '身上长满了翠绿的植物，能通过光合作用恢复体力。',
    electric: '体内储存着强大的电能，奔跑时会产生静电火花。',
    normal: '性格温和，适应力极强，在各种环境中都能生存。',
    ice: '体温极低，呼出的气息能瞬间凝结成冰晶。',
    fighting: '天生就是格斗高手，每天都在寻找更强的对手。',
    poison: '体内流淌着剧毒液体，皮肤接触就会中毒。',
    ground: '擅长挖掘地道，能在地下自由穿行。',
    flying: '拥有轻盈的翅膀，能在高空中优雅地翱翔。',
    psychic: '拥有强大的精神力量，能读取他人的思想。',
    bug: '虽然体型小巧，但拥有惊人的繁殖能力和适应力。',
    rock: '身体坚硬如岩石，普通的攻击根本无法伤其分毫。',
    ghost: '来无影去无踪，常常在深夜出现在古老遗迹中。',
    dragon: '传说中的存在，拥有毁天灭地的恐怖力量。',
    dark: '潜伏在阴影之中，擅长出其不意地发动攻击。',
    steel: '全身覆盖着坚不可摧的钢铁铠甲，防御力惊人。',
    fairy: '拥有神奇的治愈能力，能给人们带来好运。',
    light: '散发着耀眼的光芒，能驱散一切黑暗与邪恶。',
  };
  return descs[m.element] || '这是一只神秘的宝可梦，等待着训练师去发现它的秘密。';
}

/** 获取种类 */
function getSpecies(m: Monster) {
  if (m.species) return m.species;
  const speciesMap: Record<string, string> = {
    fire: '火焰宝可梦', water: '水栖宝可梦', grass: '草苗宝可梦',
    electric: '电气宝可梦', normal: '一般宝可梦', ice: '冰雪宝可梦',
    fighting: '格斗宝可梦', poison: '毒液宝可梦', ground: '地面宝可梦',
    flying: '飞行宝可梦', psychic: '超能宝可梦', bug: '虫虫宝可梦',
    rock: '岩石宝可梦', ghost: '幽灵宝可梦', dragon: '龙之宝可梦',
    dark: '恶之宝可梦', steel: '钢铁宝可梦', fairy: '妖精宝可梦',
    light: '光明宝可梦',
  };
  return speciesMap[m.element] || '未知宝可梦';
}

function getDisplayHeight(m: Monster) {
  if (m.height) return `${m.height} m`;
  const baseByElement: Partial<Record<ElementType, number>> = {
    bug: 0.4, fairy: 0.6, normal: 0.8, electric: 0.9, grass: 1.0,
    water: 1.1, fire: 1.2, ice: 1.2, fighting: 1.3, poison: 1.0,
    ground: 1.4, flying: 1.1, psychic: 1.2, rock: 1.5, ghost: 1.0,
    dragon: 1.8, dark: 1.2, steel: 1.6, light: 1.3,
  };
  return `${((baseByElement[m.element] ?? 1.0) + Math.min(m.level, 10) * 0.05).toFixed(1)} m`;
}

function getDisplayWeight(m: Monster) {
  if (m.weight) return `${m.weight} kg`;
  const baseByElement: Partial<Record<ElementType, number>> = {
    bug: 8, fairy: 12, normal: 18, electric: 22, grass: 25,
    water: 28, fire: 30, ice: 32, fighting: 36, poison: 24,
    ground: 45, flying: 20, psychic: 26, rock: 60, ghost: 10,
    dragon: 72, dark: 30, steel: 80, light: 24,
  };
  return `${((baseByElement[m.element] ?? 20) + Math.min(m.level, 10) * 2).toFixed(1)} kg`;
}

function getBackstory(m: Monster) {
  return generateMonsterBackstory(m);
}

interface MonsterDetailModalProps {
  visible: boolean;
  monster: Monster | null;
  onClose: () => void;
  onSkillManage: () => void;
  onDelete: () => void;
}

/** 宝可梦详情弹窗组件 */
export default function MonsterDetailModal({
  visible,
  monster,
  onClose,
  onSkillManage,
  onDelete,
}: MonsterDetailModalProps) {
  if (!visible || !monster) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pixel-border rounded-2xl bg-gray-900 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* 顶部关闭按钮 */}
        <div className="flex items-center justify-end p-3">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-700 transition-all"
          >
            ✕
          </button>
        </div>

        {/* 头部信息区 */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-4">
            {/* 左侧大图 */}
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl flex-shrink-0 relative"
              style={{ backgroundColor: getElementColor(monster.element) + '25' }}
            >
              {getAvatarEmoji(monster.avatar)}
              <div
                className="absolute inset-0 rounded-2xl opacity-20"
                style={{ background: `radial-gradient(circle at 30% 30%, ${getElementColor(monster.element)}, transparent 70%)` }}
              />
            </div>

            {/* 右侧基本信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500 font-mono">#{String(monster.id || 0).padStart(4, '0')}</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">{monster.name}</h2>
              <p className="text-sm text-gray-400 mb-2">{getSpecies(monster)}</p>
              <div className="flex flex-wrap items-center gap-2">
                <MonsterElementBadges monster={monster} badgeClassName="text-xs px-3 py-1 rounded-full font-bold" />
                <span className="text-xs px-3 py-1 rounded-full bg-gray-700 text-gray-300 font-bold">
                  Lv.{monster.level}
                </span>
              </div>
            </div>
          </div>

          {/* 描述 */}
          <div className="mt-4 p-3 rounded-xl bg-gray-800/50">
            <p className="text-sm text-gray-300 leading-relaxed">{getDescription(monster)}</p>
          </div>

          <div className="mt-3 p-3 rounded-xl bg-indigo-900/30 border border-indigo-400/20">
            <h3 className="text-sm font-bold text-indigo-200 mb-2">📜 经历故事</h3>
            <p className="text-sm text-gray-300 leading-relaxed">{getBackstory(monster)}</p>
          </div>
        </div>

        {/* 种族值 */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-400">种族值</h3>
            <span className="text-sm font-bold text-yellow-400">合计 {getTotalStats(monster)}</span>
          </div>

          <div className="flex flex-col gap-2">
            {[
              { key: 'hp', label: 'HP', value: monster.hp },
              { key: 'attack', label: '攻击', value: monster.attack },
              { key: 'defense', label: '防御', value: monster.defense },
              { key: 'spAttack', label: '特攻', value: Math.round(monster.attack * 0.9) },
              { key: 'spDefense', label: '特防', value: Math.round(monster.defense * 0.9) },
              { key: 'speed', label: '速度', value: monster.speed },
            ].map((stat) => (
              <div key={stat.key} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-10 text-right">{stat.label}</span>
                <div className="flex-1 h-2.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${getStatPercent(stat.value)}%`,
                      backgroundColor: getStatColor(stat.key),
                    }}
                  />
                </div>
                <span className="text-xs font-bold text-white w-8 text-right">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 基本信息网格 */}
        <div className="px-6 pb-4">
          <h3 className="text-sm font-bold text-gray-400 mb-3">基本信息</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-gray-800/50">
              <p className="text-xs text-gray-500 mb-1">身高</p>
              <p className="text-sm font-bold text-white">{getDisplayHeight(monster)}</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-800/50">
              <p className="text-xs text-gray-500 mb-1">体重</p>
              <p className="text-sm font-bold text-white">{getDisplayWeight(monster)}</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-800/50">
              <p className="text-xs text-gray-500 mb-1">HP</p>
              <p className="text-sm font-bold text-white">{monster.hp} / {monster.maxHp || monster.hp}</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-800/50">
              <p className="text-xs text-gray-500 mb-1">经验值</p>
              <p className="text-sm font-bold text-white">{monster.exp} / {monster.expToNext || 100}</p>
            </div>
          </div>
        </div>

        {/* 技能列表 */}
        <div className="px-6 pb-4">
          <h3 className="text-sm font-bold text-gray-400 mb-3">技能</h3>
          <div className="flex flex-col gap-2">
            {monster.skills.map((skill) => (
              <div
                key={skill.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50"
              >
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                  style={{ backgroundColor: getElementColor(skill.element) + '30' }}
                >
                  {getElementEmoji(skill.element)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{skill.name}</p>
                  <p className="text-xs text-gray-500">{skill.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">威力{skill.power}</p>
                  <p className="text-xs text-gray-400">命中{skill.accuracy}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onSkillManage}
            className="flex-1 bg-purple-500 text-white py-3 rounded-xl font-bold hover:bg-purple-400 transition-all"
          >
            💎 技能管理
          </button>
          <button
            onClick={onDelete}
            className="px-4 bg-red-500/20 text-red-400 py-3 rounded-xl font-bold hover:bg-red-500/30 transition-all"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
