import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db/database';
import { ELEMENT_CONFIG } from '../components/create/StepElement';
import { AVATAR_OPTIONS } from '../components/create/StepAvatar';
import { generateRandomSkill } from '../game/rewardSystem';
import type { Monster, ElementType, EncounterRecord } from '../types';

/** 技能石配置 */
const SKILL_STONE_CONFIG: Record<ElementType, { emoji: string; color: string; name: string }> = {
  fire: { emoji: '🔥', color: '#ef4444', name: '火之石' },
  water: { emoji: '💧', color: '#3b82f6', name: '水之石' },
  grass: { emoji: '🌿', color: '#22c55e', name: '草之石' },
  electric: { emoji: '⚡', color: '#eab308', name: '雷之石' },
  normal: { emoji: '⭐', color: '#9ca3af', name: '光之石' },
  ice: { emoji: '❄️', color: '#06b6d4', name: '冰之石' },
  fighting: { emoji: '👊', color: '#dc2626', name: '斗之石' },
  poison: { emoji: '☠️', color: '#a855f7', name: '毒之石' },
  ground: { emoji: '🌍', color: '#92400e', name: '地之石' },
  flying: { emoji: '🌪️', color: '#60a5fa', name: '风之石' },
  psychic: { emoji: '🔮', color: '#ec4899', name: '超之石' },
  bug: { emoji: '🐛', color: '#84cc16', name: '虫之石' },
  rock: { emoji: '🪨', color: '#78716c', name: '岩之石' },
  ghost: { emoji: '👻', color: '#6366f1', name: '鬼之石' },
  dragon: { emoji: '🐉', color: '#7c3aed', name: '龙之石' },
  dark: { emoji: '🌑', color: '#374151', name: '暗之石' },
  steel: { emoji: '⚙️', color: '#64748b', name: '钢之石' },
  fairy: { emoji: '🧚', color: '#f472b6', name: '妖之石' },
  light: { emoji: '☀️', color: '#fbbf24', name: '光之石' },
};

export default function PokedexPage() {
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [encounters, setEncounters] = useState<EncounterRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'owned' | 'encountered'>('owned');
  const [loading, setLoading] = useState(true);
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null);
  const [showSkillDetail, setShowSkillDetail] = useState(false);
  const [showSkillStone, setShowSkillStone] = useState(false);
  const [skillStones, setSkillStones] = useState<{ element: ElementType; id: string }[]>([]);
  const [useMessage, setUseMessage] = useState('');

  useEffect(() => {
    loadMonsters();
    loadEncounters();
    loadSkillStones();
  }, []);

  const loadMonsters = async () => {
    try {
      const all = await db.monsters.toArray();
      setMonsters(all.reverse());
    } catch (err) {
      console.error('加载失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEncounters = async () => {
    try {
      const all = await db.encounters.toArray();
      // 按怪物名称去重，保留最新的
      const unique = new Map<string, EncounterRecord>();
      all.forEach((e) => {
        const existing = unique.get(e.monsterName);
        if (!existing || e.encounteredAt > existing.encounteredAt) {
          unique.set(e.monsterName, e);
        }
      });
      setEncounters(Array.from(unique.values()));
    } catch (err) {
      console.error('加载遭遇记录失败:', err);
    }
  };

  const loadSkillStones = () => {
    const saved = localStorage.getItem('skillStones');
    if (saved) {
      setSkillStones(JSON.parse(saved));
    }
  };

  const saveSkillStones = (stones: { element: ElementType; id: string }[]) => {
    localStorage.setItem('skillStones', JSON.stringify(stones));
    setSkillStones(stones);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这只宝可梦吗？')) return;
    try {
      await db.monsters.delete(id);
      setMonsters((prev) => prev.filter((m) => m.id !== id));
      if (selectedMonster?.id === id) {
        setSelectedMonster(null);
        setShowSkillDetail(false);
      }
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const handleUseSkillStone = (monster: Monster, stoneIndex: number) => {
    if (monster.skills.length >= 6) {
      setUseMessage(`${monster.name} 已经有6个技能了，不能再学了！`);
      setTimeout(() => setUseMessage(''), 2000);
      return;
    }

    const stone = skillStones[stoneIndex];
    if (!stone) return;

    const newSkill = generateRandomSkill(stone.element);
    const updatedSkills = [...monster.skills, newSkill];

    if (monster.id) {
      db.monsters.update(monster.id, { skills: updatedSkills } as any);
    }

    const newStones = skillStones.filter((_, i) => i !== stoneIndex);
    saveSkillStones(newStones);

    setMonsters((prev) =>
      prev.map((m) => (m.id === monster.id ? { ...m, skills: updatedSkills } as Monster : m))
    );
    if (selectedMonster?.id === monster.id) {
      setSelectedMonster({ ...selectedMonster, skills: updatedSkills } as Monster);
    }

    setUseMessage(`${monster.name} 学会了 ${newSkill.name}！`);
    setTimeout(() => setUseMessage(''), 2000);
    setShowSkillStone(false);
  };

  const handleForgetSkill = (monster: Monster, skillIndex: number) => {
    if (monster.skills.length <= 1) {
      setUseMessage('至少保留一个技能！');
      setTimeout(() => setUseMessage(''), 2000);
      return;
    }

    const updatedSkills = monster.skills.filter((_, i) => i !== skillIndex);

    if (monster.id) {
      db.monsters.update(monster.id, { skills: updatedSkills } as any);
    }

    setMonsters((prev) =>
      prev.map((m) => (m.id === monster.id ? { ...m, skills: updatedSkills } as Monster : m))
    );
    if (selectedMonster?.id === monster.id) {
      setSelectedMonster({ ...selectedMonster, skills: updatedSkills } as Monster);
    }

    setUseMessage('遗忘成功！');
    setTimeout(() => setUseMessage(''), 2000);
  };

  const getAvatarEmoji = (avatarId: string) => {
    return AVATAR_OPTIONS.find((a) => a.id === avatarId)?.emoji || '❓';
  };

  const getElementColor = (element: ElementType) => {
    return ELEMENT_CONFIG[element]?.color || '#9ca3af';
  };

  const getElementEmoji = (element: ElementType) => {
    return ELEMENT_CONFIG[element]?.emoji || '❓';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-4xl animate-spin">⏳</div>
        <p className="text-lg text-gray-300 mt-4">加载图鉴...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen p-4 gap-4">
      {/* 顶部 */}
      <div className="flex items-center justify-between">
        <Link to="/" className="text-blue-400 hover:text-blue-300 text-lg font-bold">
          ← 返回
        </Link>
        <h1 className="text-xl font-bold text-yellow-300 pixel-title">📖 宝可梦图鉴</h1>
        <div className="w-12" />
      </div>

      {/* 标签切换 */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('owned')}
          className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'owned'
              ? 'bg-yellow-500 text-gray-900'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          🎒 我的宝可梦 ({monsters.length})
        </button>
        <button
          onClick={() => setActiveTab('encountered')}
          className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'encountered'
              ? 'bg-yellow-500 text-gray-900'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          👁️ 遭遇记录 ({encounters.length})
        </button>
      </div>

      {/* 提示消息 */}
      {useMessage && (
        <div className="pixel-border rounded-xl p-3 bg-green-900/30 text-center">
          <p className="text-green-300">{useMessage}</p>
        </div>
      )}

      {/* 我的宝可梦列表 */}
      {activeTab === 'owned' && (
        <>
          {monsters.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <p className="text-xl text-gray-400">还没有宝可梦</p>
              <Link to="/create" className="bg-red-500 text-white px-6 py-3 rounded-xl font-bold">
                🎨 去创造宝可梦
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {monsters.map((monster) => (
                <div
                  key={monster.id}
                  onClick={() => {
                    setSelectedMonster(monster);
                    setShowSkillDetail(true);
                    setShowSkillStone(false);
                  }}
                  className={`pixel-border rounded-xl p-4 cursor-pointer transition-all active:scale-95 ${
                    selectedMonster?.id === monster.id
                      ? 'bg-yellow-500/10 border-yellow-400'
                      : 'bg-gray-800/50 hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: getElementColor(monster.element) + '30' }}
                    >
                      {getAvatarEmoji(monster.avatar)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{monster.name}</span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-lg font-bold"
                          style={{
                            backgroundColor: getElementColor(monster.element) + '30',
                            color: getElementColor(monster.element),
                          }}
                        >
                          {getElementEmoji(monster.element)} {ELEMENT_CONFIG[monster.element]?.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        Lv.{monster.level} | HP {monster.hp}/{monster.maxHp || monster.hp}
                      </p>
                      <div className="flex gap-2 mt-1">
                        {monster.skills.map((skill) => (
                          <span
                            key={skill.id}
                            className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300"
                          >
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 遭遇记录列表 */}
      {activeTab === 'encountered' && (
        <>
          {encounters.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <p className="text-xl text-gray-400">还没有遭遇记录</p>
              <p className="text-sm text-gray-500">去大陆冒险中探索吧！</p>
              <Link to="/adventure" className="bg-green-500 text-white px-6 py-3 rounded-xl font-bold">
                🗺️ 去冒险
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {encounters.map((encounter) => (
                <div
                  key={encounter.monsterName}
                  className="pixel-border rounded-xl p-4 bg-gray-800/50"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: getElementColor(encounter.monsterElement) + '30' }}
                    >
                      {getAvatarEmoji(encounter.monsterAvatar)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{encounter.monsterName}</span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-lg font-bold"
                          style={{
                            backgroundColor: getElementColor(encounter.monsterElement) + '30',
                            color: getElementColor(encounter.monsterElement),
                          }}
                        >
                          {getElementEmoji(encounter.monsterElement)} {ELEMENT_CONFIG[encounter.monsterElement]?.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        Lv.{encounter.monsterLevel} | 在 {encounter.continentName} 遭遇
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(encounter.encounteredAt).toLocaleDateString('zh-CN')}
                        {encounter.captured && ' · ✅ 已捕获'}
                        {encounter.defeated && ' · ⚔️ 已击败'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 技能详情弹窗 */}
      {showSkillDetail && selectedMonster && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="pixel-border rounded-xl bg-gray-900 p-6 max-w-sm w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-yellow-300">{selectedMonster.name}</h2>
              <button
                onClick={() => setShowSkillDetail(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                style={{ backgroundColor: getElementColor(selectedMonster.element) + '30' }}
              >
                {getAvatarEmoji(selectedMonster.avatar)}
              </div>
              <div>
                <p className="text-sm text-gray-400">
                  Lv.{selectedMonster.level} | HP {selectedMonster.hp}/{selectedMonster.maxHp || selectedMonster.hp}
                </p>
                <p className="text-sm text-gray-400">
                  攻击 {selectedMonster.attack} | 防御 {selectedMonster.defense} | 速度 {selectedMonster.speed}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 mb-4">
              <p className="text-sm text-gray-400 font-bold">技能列表：</p>
              {selectedMonster.skills.map((skill, index) => (
                <div key={skill.id} className="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
                  <span className="text-sm flex-1">
                    {skill.name} ({getElementEmoji(skill.element)} {ELEMENT_CONFIG[skill.element]?.label})
                  </span>
                  <span className="text-xs text-gray-500">
                    威力{skill.power} 命中{skill.accuracy}%
                  </span>
                  <button
                    onClick={() => handleForgetSkill(selectedMonster, index)}
                    className="text-xs text-red-400 hover:text-red-300 px-2"
                  >
                    遗忘
                  </button>
                </div>
              ))}
            </div>

            {/* 技能石使用 */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowSkillStone(!showSkillStone)}
                className="bg-purple-500 text-white py-2 rounded-xl font-bold hover:bg-purple-400 transition-all"
              >
                💎 使用技能石
              </button>

              {showSkillStone && (
                <div className="flex flex-col gap-2 mt-2">
                  {skillStones.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center">没有技能石</p>
                  ) : (
                    skillStones.map((stone, index) => (
                      <button
                        key={stone.id}
                        onClick={() => handleUseSkillStone(selectedMonster, index)}
                        className="flex items-center gap-2 bg-gray-800 rounded-lg p-2 hover:bg-gray-700 transition-all"
                      >
                        <span style={{ color: SKILL_STONE_CONFIG[stone.element].color }}>
                          {SKILL_STONE_CONFIG[stone.element].emoji}
                        </span>
                        <span className="text-sm">{SKILL_STONE_CONFIG[stone.element].name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 删除按钮 */}
            <button
              onClick={() => selectedMonster.id && handleDelete(selectedMonster.id)}
              className="w-full mt-4 bg-red-500/20 text-red-400 py-2 rounded-xl font-bold hover:bg-red-500/30 transition-all"
            >
              🗑️ 删除这只宝可梦
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
