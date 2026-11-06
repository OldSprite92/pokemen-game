import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { db } from '../db/database';
import { useGameStore } from '../stores/gameStore';
import { ELEMENT_CONFIG } from '../components/create/StepElement';
import MonsterElementBadges from '../components/MonsterElementBadges';
import { AVATAR_OPTIONS } from '../components/create/StepAvatar';
import { generateRandomSkill } from '../game/rewardSystem';
import { ALL_WILD_MONSTERS } from '../game/wildMonsters';
import { generateMonsterBackstory } from '../game/monsterStory';
import { getMonsterElements } from '../game/monsterElements';
import { GymBadgeEmblem, SuperBadgeEmblem } from '../components/GymBadgeEmblem';
import { SUPER_BADGE_ELEMENTS, SUPER_BADGE_SLOT_LABELS, getSuperBadgeIngredients, type SuperBadgeElement } from '../game/superBadge';
import { ELEMENT_LESSONS } from '../game/languageLab';
import { getMasteryStatus, loadLanguageProgress } from '../game/languageProgress';
import type { AdventureDiaryEntry, Badge, Monster, ElementType, EncounterRecord, Sticker } from '../types';

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

// Match the seven-segment badge wheel: the empty core becomes the Super Badge.
const FUSION_SLOT_LAYOUT: Record<SuperBadgeElement, { left: number; top: number }> = {
  psychic: { left: 27, top: 22 },
  poison: { left: 54, top: 17 },
  rock: { left: 83, top: 43 },
  water: { left: 75, top: 74 },
  grass: { left: 50, top: 88 },
  fire: { left: 26, top: 70 },
  electric: { left: 14, top: 47 },
};

export default function PokedexPage() {
  const location = useLocation();
  const isWarehouse = location.pathname === '/warehouse';
  const currentTrainer = useGameStore((state) => state.currentTrainer);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [encounters, setEncounters] = useState<EncounterRecord[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<AdventureDiaryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'owned' | 'encountered' | 'badges' | 'stickers' | 'diary'>(isWarehouse ? 'owned' : 'encountered');
  const [loading, setLoading] = useState(true);
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null);
  const [showSkillDetail, setShowSkillDetail] = useState(false);
  const [showSkillStone, setShowSkillStone] = useState(false);
  const [skillStones, setSkillStones] = useState<{ element: ElementType; id: string }[]>([]);
  const [useMessage, setUseMessage] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isEncounterDetail, setIsEncounterDetail] = useState(false); // 区分遭遇记录详情
  const [badgeToAssign, setBadgeToAssign] = useState<Badge | null>(null);
  const [showBadgeFusion, setShowBadgeFusion] = useState(false);
  const [selectedFusionBadgeId, setSelectedFusionBadgeId] = useState<number | null>(null);
  const [fusionSlots, setFusionSlots] = useState<Partial<Record<SuperBadgeElement, number>>>({});
  const [isFusingBadge, setIsFusingBadge] = useState(false);
  const languageProgress = useMemo(() => loadLanguageProgress(currentTrainer?.id), [currentTrainer?.id]);
  const masteredPinyinCount = Object.values(languageProgress.pinyin).filter((record) => getMasteryStatus(record) === 'mastered').length;
  const masteredEnglishCount = Object.keys(ELEMENT_LESSONS).filter((element) => getMasteryStatus(languageProgress.english[element as keyof typeof languageProgress.english]) === 'mastered').length;

  // 获取当前训练师的 localStorage key
  const getStorageKey = (key: string) => {
    const trainerId = currentTrainer?.id;
    return trainerId ? `${key}_trainer_${trainerId}` : key;
  };

  useEffect(() => {
    loadMonsters();
    loadEncounters();
    loadCollections();
    loadSkillStones();
  }, [currentTrainer]); // 当训练师变化时重新加载技能石

  useEffect(() => {
    setActiveTab(isWarehouse ? 'owned' : 'encountered');
  }, [isWarehouse]);

  const loadMonsters = async () => {
    const trainerId = currentTrainer?.id;
    if (trainerId === undefined) {
      setMonsters([]);
      setLoading(false);
      return;
    }
    try {
      const all = await db.monsters.where('trainerId').equals(trainerId).toArray();
      setMonsters(all.reverse());
    } catch (err) {
      console.error('加载失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEncounters = async () => {
    const trainerId = currentTrainer?.id;
    if (trainerId === undefined) {
      setEncounters([]);
      return;
    }
    try {
      const all = await db.encounters.where('trainerId').equals(trainerId).toArray();
      const unique = new Map<string, EncounterRecord>();
      all.forEach((e) => {
        // 确保 encounteredAt 是 Date 对象
        const encounterDate = e.encounteredAt instanceof Date ? e.encounteredAt : new Date(e.encounteredAt);
        const existing = unique.get(e.monsterName);
        const existingDate = existing?.encounteredAt instanceof Date ? existing.encounteredAt : new Date(existing?.encounteredAt || 0);
        if (!existing || encounterDate.getTime() > existingDate.getTime()) {
          unique.set(e.monsterName, { ...e, encounteredAt: encounterDate });
        }
      });
      // 按时间倒序排列（最新的在前面）
      const sorted = Array.from(unique.values()).sort((a, b) => {
        const dateA = a.encounteredAt instanceof Date ? a.encounteredAt : new Date(a.encounteredAt);
        const dateB = b.encounteredAt instanceof Date ? b.encounteredAt : new Date(b.encounteredAt);
        return dateB.getTime() - dateA.getTime();
      });
      setEncounters(sorted);
    } catch (err) {
      console.error('加载遭遇记录失败:', err);
    }
  };

  const loadSkillStones = () => {
    const saved = localStorage.getItem(getStorageKey('skillStones'));
    if (saved) {
      setSkillStones(JSON.parse(saved));
    } else {
      setSkillStones([]);
    }
  };

  const loadCollections = async () => {
    const trainerId = currentTrainer?.id;
    if (trainerId === undefined) {
      setBadges([]);
      setStickers([]);
      setDiaryEntries([]);
      return;
    }
    const [trainerBadges, trainerStickers, trainerDiary] = await Promise.all([
      db.badges.where('trainerId').equals(trainerId).toArray(),
      db.stickers.where('trainerId').equals(trainerId).toArray(),
      db.diaryEntries.where('trainerId').equals(trainerId).toArray(),
    ]);
    setBadges(trainerBadges.reverse());
    setStickers(trainerStickers.reverse());
    setDiaryEntries(
      trainerDiary.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );
  };

  const saveSkillStones = (stones: { element: ElementType; id: string }[]) => {
    localStorage.setItem(getStorageKey('skillStones'), JSON.stringify(stones));
    setSkillStones(stones);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这只宝可梦吗？')) return;
    try {
      const monster = await db.monsters.get(id);
      if (!monster || monster.trainerId !== currentTrainer?.id) return;
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
      db.monsters
        .where('id')
        .equals(monster.id)
        .and((item) => item.trainerId === currentTrainer?.id)
        .modify({ skills: updatedSkills });
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
      db.monsters
        .where('id')
        .equals(monster.id)
        .and((item) => item.trainerId === currentTrainer?.id)
        .modify({ skills: updatedSkills });
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

  const getStatPercent = (value: number) => {
    const max = 150;
    return Math.min((value / max) * 100, 100);
  };

  const getStatColor = (stat: string) => {
    const colors: Record<string, string> = {
      hp: '#ef4444',
      attack: '#f97316',
      defense: '#eab308',
      spAttack: '#3b82f6',
      spDefense: '#22c55e',
      speed: '#a855f7',
    };
    return colors[stat] || '#9ca3af';
  };

  const getTotalStats = (m: Monster) => {
    return m.hp + m.attack + m.defense + m.speed;
  };

  const getDescription = (m: Monster) => {
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
  };

  const getSpecies = (m: Monster) => {
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
  };

  const assignGymBadge = async (badge: Badge, monster: Monster, statBoost: NonNullable<Badge['statBoost']>) => {
    if (badge.id === undefined || monster.id === undefined || badge.kind !== 'gym' || !badge.element) return;
    if (!getMonsterElements(monster).includes(badge.element)) {
      setUseMessage(`${monster.name}没有${ELEMENT_CONFIG[badge.element].label}属性，不能使用这枚徽章。`);
      return;
    }
    const usedOnMonster = badges.filter((item) => item.kind === 'gym' && item.assignedMonsterId === monster.id);
    if (usedOnMonster.length >= 2 || usedOnMonster.some((item) => item.statBoost === statBoost)) {
      setUseMessage('每只伙伴最多装备 2 枚徽章，同一种强化不能重复。');
      return;
    }
    const increase = statBoost === 'hp' ? 6 : statBoost === 'speed' ? 3 : 4;
    const update: Partial<Monster> = statBoost === 'hp'
      ? { hp: monster.hp + increase, maxHp: (monster.maxHp ?? monster.hp) + increase }
      : { [statBoost]: monster[statBoost] + increase } as Partial<Monster>;
    await db.transaction('rw', db.badges, db.monsters, async () => {
      await db.badges.update(badge.id!, { assignedMonsterId: monster.id, statBoost });
      await db.monsters.update(monster.id!, update);
    });
    const updatedMonster = { ...monster, ...update } as Monster;
    setMonsters((previous) => previous.map((item) => item.id === monster.id ? updatedMonster : item));
    setBadges((previous) => previous.map((item) => item.id === badge.id ? { ...item, assignedMonsterId: monster.id, statBoost } : item));
    setBadgeToAssign(null);
    const labels: Record<NonNullable<Badge['statBoost']>, string> = { hp: '体力 +6', attack: '攻击 +4', defense: '防御 +4', speed: '速度 +3' };
    setUseMessage(`🏅 ${monster.name}获得${labels[statBoost]}！`);
    setTimeout(() => setUseMessage(''), 2600);
  };

  const openBadgeFusion = () => {
    setFusionSlots({});
    setSelectedFusionBadgeId(null);
    setShowBadgeFusion(true);
  };

  const fillFusionSlot = (element: SuperBadgeElement) => {
    const occupiedBadgeId = fusionSlots[element];
    if (occupiedBadgeId !== undefined) {
      setFusionSlots((previous) => {
        const next = { ...previous };
        delete next[element];
        return next;
      });
      return;
    }
    const selectedBadge = badges.find((badge) => badge.id === selectedFusionBadgeId);
    if (!selectedBadge || selectedBadge.id === undefined || selectedBadge.element !== element || selectedBadge.kind !== 'gym') {
      setUseMessage(`请选择${SUPER_BADGE_SLOT_LABELS[element]}属性徽章，填入这个槽位。`);
      setTimeout(() => setUseMessage(''), 2400);
      return;
    }
    if (Object.values(fusionSlots).includes(selectedBadge.id)) {
      setUseMessage('这枚徽章已经放进圆盘了。');
      setTimeout(() => setUseMessage(''), 2200);
      return;
    }
    setFusionSlots((previous) => ({ ...previous, [element]: selectedBadge.id }));
    setSelectedFusionBadgeId(null);
  };

  const fuseSuperBadge = async () => {
    const trainerId = currentTrainer?.id;
    const selectedIds = SUPER_BADGE_ELEMENTS.map((element) => fusionSlots[element]);
    if (trainerId === undefined || selectedIds.some((id) => id === undefined) || isFusingBadge) return;
    if (!window.confirm('合成会消耗圆盘中的 7 枚道馆徽章，确定合成超级勋章吗？')) return;

    setIsFusingBadge(true);
    try {
      await db.transaction('rw', db.badges, async () => {
        const latestBadges = await db.badges.where('trainerId').equals(trainerId).toArray();
        const ingredients = SUPER_BADGE_ELEMENTS.map((element) => latestBadges.find((badge) => badge.id === fusionSlots[element] && badge.kind === 'gym' && badge.element === element));
        if (ingredients.some((badge) => !badge?.id)) throw new Error('合成材料已变化');
        await db.badges.bulkDelete(ingredients.map((badge) => badge!.id!));
        await db.badges.add({
          trainerId,
          continentId: 'super-badge',
          name: '超级勋章',
          emoji: '🌟',
          kind: 'super',
          earnedAt: new Date(),
        });
      });
      await loadCollections();
      setShowBadgeFusion(false);
      setFusionSlots({});
      setUseMessage('🌟 合成成功！超级勋章已放入徽章盒。');
      setTimeout(() => setUseMessage(''), 2800);
    } catch (err) {
      console.error('合成超级勋章失败:', err);
      setUseMessage('合成失败：请确认七枚属性徽章都仍在圆盘中。');
    } finally {
      setIsFusingBadge(false);
    }
  };

  const useSuperBadge = async (badge: Badge) => {
    const trainerId = currentTrainer?.id;
    if (trainerId === undefined || badge.id === undefined || badge.kind !== 'super' || badge.usedAt || monsters.length === 0) return;
    if (!window.confirm('使用后会随机强化一只伙伴的 HP、攻击、防御和速度各 1 点，确定使用吗？')) return;

    const target = monsters[Math.floor(Math.random() * monsters.length)];
    if (!target || target.id === undefined) return;
    const update: Partial<Monster> = {
      hp: target.hp + 1,
      maxHp: (target.maxHp ?? target.hp) + 1,
      attack: target.attack + 1,
      defense: target.defense + 1,
      speed: target.speed + 1,
    };
    try {
      await db.transaction('rw', db.badges, db.monsters, async () => {
        const latestBadge = await db.badges.get(badge.id!);
        const latestMonster = await db.monsters.get(target.id!);
        if (!latestBadge || latestBadge.trainerId !== trainerId || latestBadge.kind !== 'super' || latestBadge.usedAt || !latestMonster || latestMonster.trainerId !== trainerId) {
          throw new Error('超级勋章已被使用或伙伴已变化');
        }
        await db.badges.update(badge.id!, { usedAt: new Date() });
        await db.monsters.update(target.id!, update);
      });
      const updatedTarget = { ...target, ...update } as Monster;
      setBadges((previous) => previous.map((item) => item.id === badge.id ? { ...item, usedAt: new Date() } : item));
      setMonsters((previous) => previous.map((item) => item.id === target.id ? updatedTarget : item));
      if (selectedMonster?.id === target.id) setSelectedMonster(updatedTarget);
      setUseMessage(`🌟 超级勋章生效！${target.name}的 HP、攻击、防御、速度各 +1。`);
      setTimeout(() => setUseMessage(''), 3200);
    } catch (err) {
      console.error('使用超级勋章失败:', err);
      setUseMessage('超级勋章暂时无法使用，请稍后再试。');
    }
  };

  const getDisplayHeight = (m: Monster) => {
    if (m.height) return `${m.height} m`;
    const baseByElement: Partial<Record<ElementType, number>> = {
      bug: 0.4,
      fairy: 0.6,
      normal: 0.8,
      electric: 0.9,
      grass: 1.0,
      water: 1.1,
      fire: 1.2,
      ice: 1.2,
      fighting: 1.3,
      poison: 1.0,
      ground: 1.4,
      flying: 1.1,
      psychic: 1.2,
      rock: 1.5,
      ghost: 1.0,
      dragon: 1.8,
      dark: 1.2,
      steel: 1.6,
      light: 1.3,
    };
    const height = (baseByElement[m.element] ?? 1.0) + Math.min(m.level, 10) * 0.05;
    return `${height.toFixed(1)} m`;
  };

  const getDisplayWeight = (m: Monster) => {
    if (m.weight) return `${m.weight} kg`;
    const baseByElement: Partial<Record<ElementType, number>> = {
      bug: 8,
      fairy: 12,
      normal: 18,
      electric: 22,
      grass: 25,
      water: 28,
      fire: 30,
      ice: 32,
      fighting: 36,
      poison: 24,
      ground: 45,
      flying: 20,
      psychic: 26,
      rock: 60,
      ghost: 10,
      dragon: 72,
      dark: 30,
      steel: 80,
      light: 24,
    };
    const weight = (baseByElement[m.element] ?? 20) + Math.min(m.level, 10) * 2;
    return `${weight.toFixed(1)} kg`;
  };

  const getBackstory = (m: Monster) => {
    const encounter = encounters.find((e) => e.monsterName === m.name);
    const place = encounter?.continentName || '冒险路上';
    return generateMonsterBackstory(m, { discoveredPlace: place });
  };

  const renderDetailModal = () => {
    if (!showDetailModal || !selectedMonster) return null;
    return (
      <div
        className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowDetailModal(false);
        }}
      >
        <div className="pixel-border rounded-2xl bg-gray-900 w-full max-w-md max-h-[90vh] overflow-y-auto">
          {/* 顶部关闭按钮 */}
          <div className="flex items-center justify-end p-3">
            <button
              onClick={() => setShowDetailModal(false)}
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
                style={{ backgroundColor: getElementColor(selectedMonster.element) + '25' }}
              >
                {getAvatarEmoji(selectedMonster.avatar)}
                <div
                  className="absolute inset-0 rounded-2xl opacity-20"
                  style={{ background: `radial-gradient(circle at 30% 30%, ${getElementColor(selectedMonster.element)}, transparent 70%)` }}
                />
              </div>

              {/* 右侧基本信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-500 font-mono">#{String(selectedMonster.id || 0).padStart(4, '0')}</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">{selectedMonster.name}</h2>
                <p className="text-sm text-gray-400 mb-2">{getSpecies(selectedMonster)}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <MonsterElementBadges monster={selectedMonster} badgeClassName="text-xs px-3 py-1 rounded-full font-bold" />
                  <span className="text-xs px-3 py-1 rounded-full bg-gray-700 text-gray-300 font-bold">
                    Lv.{selectedMonster.level}
                  </span>
                </div>
              </div>
            </div>

            {/* 描述 */}
            <div className="mt-4 p-3 rounded-xl bg-gray-800/50">
              <p className="text-sm text-gray-300 leading-relaxed">{getDescription(selectedMonster)}</p>
            </div>

            <div className="mt-3 p-3 rounded-xl bg-indigo-900/30 border border-indigo-400/20">
              <h3 className="text-sm font-bold text-indigo-200 mb-2">📜 经历故事</h3>
              <p className="text-sm text-gray-300 leading-relaxed">{getBackstory(selectedMonster)}</p>
            </div>
          </div>

          {/* 种族值 */}
          <div className="px-6 pb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-400">种族值</h3>
              <span className="text-sm font-bold text-yellow-400">合计 {getTotalStats(selectedMonster)}</span>
            </div>

            <div className="flex flex-col gap-2">
              {[
                { key: 'hp', label: 'HP', value: selectedMonster.hp },
                { key: 'attack', label: '攻击', value: selectedMonster.attack },
                { key: 'defense', label: '防御', value: selectedMonster.defense },
                { key: 'spAttack', label: '特攻', value: Math.round(selectedMonster.attack * 0.9) },
                { key: 'spDefense', label: '特防', value: Math.round(selectedMonster.defense * 0.9) },
                { key: 'speed', label: '速度', value: selectedMonster.speed },
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
                <p className="text-sm font-bold text-white">{getDisplayHeight(selectedMonster)}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-800/50">
                <p className="text-xs text-gray-500 mb-1">体重</p>
                <p className="text-sm font-bold text-white">{getDisplayWeight(selectedMonster)}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-800/50">
                <p className="text-xs text-gray-500 mb-1">HP</p>
                <p className="text-sm font-bold text-white">{selectedMonster.hp} / {selectedMonster.maxHp || selectedMonster.hp}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-800/50">
                <p className="text-xs text-gray-500 mb-1">经验值</p>
                <p className="text-sm font-bold text-white">{selectedMonster.exp} / {selectedMonster.expToNext || 100}</p>
              </div>
            </div>
          </div>

          {!isEncounterDetail && (selectedMonster.personality || selectedMonster.favoriteThing || selectedMonster.catchphrase) && (
            <div className="px-6 pb-4">
              <h3 className="text-sm font-bold text-gray-400 mb-3">伙伴小秘密</h3>
              <div className="grid grid-cols-1 gap-2">
                {selectedMonster.personality && (
                  <div className="p-3 rounded-xl bg-yellow-500/10 text-sm text-yellow-100">
                    性格：{selectedMonster.personality}
                  </div>
                )}
                {selectedMonster.favoriteThing && (
                  <div className="p-3 rounded-xl bg-pink-500/10 text-sm text-pink-100">
                    最喜欢：{selectedMonster.favoriteThing}
                  </div>
                )}
                {selectedMonster.catchphrase && (
                  <div className="p-3 rounded-xl bg-blue-500/10 text-sm text-blue-100">
                    口头禅：“{selectedMonster.catchphrase}！”
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 技能列表 - 仅我的宝可梦显示 */}
          {!isEncounterDetail && (
            <div className="px-6 pb-4">
              <h3 className="text-sm font-bold text-gray-400 mb-3">技能</h3>
              <div className="flex flex-col gap-2">
                {selectedMonster.skills.map((skill) => (
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
          )}

          {/* 底部按钮 - 仅我的宝可梦显示操作按钮 */}
          {!isEncounterDetail && (
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setShowSkillDetail(true);
                }}
                className="flex-1 bg-purple-500 text-white py-3 rounded-xl font-bold hover:bg-purple-400 transition-all"
              >
                💎 技能管理
              </button>
              <button
                onClick={() => selectedMonster.id && handleDelete(selectedMonster.id)}
                className="px-4 bg-red-500/20 text-red-400 py-3 rounded-xl font-bold hover:bg-red-500/30 transition-all"
              >
                🗑️
              </button>
            </div>
          )}
          {isEncounterDetail && (
            <div className="px-6 pb-6">
              {/* 遭遇信息 */}
              <div className="p-3 rounded-xl bg-gray-800/50 mb-3">
                <h3 className="text-sm font-bold text-yellow-400 mb-2">🗺️ 遭遇信息</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">遭遇地点：</span>
                    <span className="text-white">{(() => {
                      const enc = encounters.find(e => e.monsterName === selectedMonster.name);
                      return enc?.continentName || '未知大陆';
                    })()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">遭遇时间：</span>
                    <span className="text-white">
                      {selectedMonster.createdAt ? new Date(selectedMonster.createdAt).toLocaleDateString('zh-CN') : '未知'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">等级：</span>
                    <span className="text-white">Lv.{selectedMonster.level}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">状态：</span>
                    <span className="text-white">
                      {(() => {
                        const enc = encounters.find(e => e.monsterName === selectedMonster.name);
                        if (enc?.captured) return '✅ 已捕获';
                        if (enc?.defeated) return '⚔️ 已击败';
                        return '👁️ 已遭遇';
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* 可能携带的技能 */}
              <div className="p-3 rounded-xl bg-gray-800/50">
                <h3 className="text-sm font-bold text-yellow-400 mb-2">⚔️ 技能</h3>
                <p className="text-xs text-gray-500 mb-2">
                  这是野生宝可梦使用的技能，在战斗中要小心哦！
                </p>
                <div className="flex flex-col gap-2">
                  {selectedMonster.skills && selectedMonster.skills.length > 0 ? (
                    selectedMonster.skills.map((skill) => (
                      <div
                        key={skill.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-gray-700/50"
                      >
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
                          style={{ backgroundColor: getElementColor(skill.element) + '30' }}
                        >
                          {getElementEmoji(skill.element)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white">{skill.name}</p>
                          <p className="text-xs text-gray-400">{skill.description}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-gray-400">威力{skill.power}</p>
                          <p className="text-xs text-gray-400">命中{skill.accuracy}%</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-2">
                      该野生宝可梦的技能信息未记录
                    </p>
                  )}
                </div>
              </div>

              {/* 提示 */}
              <div className="mt-3 p-3 rounded-xl bg-blue-900/20 border border-blue-500/20 text-center">
                <p className="text-sm text-blue-300">
                  💡 在冒险中捕获这只宝可梦，就可以让它成为你的伙伴啦！
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
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
    <div className="pokedex-page flex flex-col min-h-[100dvh] p-4 gap-4">
      {/* 顶部 */}
      <div className="page-topbar sticky top-0 z-40 flex items-center justify-between">
        <Link to={isWarehouse ? '/backpack' : '/'} className="text-blue-400 hover:text-blue-300 text-lg font-bold">
          ← 返回
        </Link>
        <h1 className="text-xl font-bold text-yellow-300 pixel-title">{isWarehouse ? '宝可梦仓库' : '📖 宝可梦图鉴'}</h1>
        <div className="w-12" />
      </div>

      {!isWarehouse && (
        <Link to="/language-lab" className="rounded-2xl border-2 border-indigo-300/45 bg-indigo-400/10 p-4 text-indigo-50 shadow-lg transition-colors hover:bg-indigo-400/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300">
          <span className="block text-lg font-black">语言学习图鉴</span>
          <span className="mt-1 block text-sm text-indigo-100/85">拼音已掌握 {masteredPinyinCount}/24 · English 已掌握 {masteredEnglishCount}/18</span>
        </Link>
      )}

      {/* 标签切换 */}
      {!isWarehouse && <div className="grid grid-cols-2 gap-2">
        {[
          { id: 'encountered', label: `👁️ 遭遇记录 ${encounters.length}` },
          { id: 'badges', label: `🏅 徽章 ${badges.length}` },
          { id: 'stickers', label: `🌟 贴纸 ${stickers.length}` },
          { id: 'diary', label: `📔 日记 ${diaryEntries.length}` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`py-2 rounded-xl font-bold text-xs transition-all ${
              activeTab === tab.id
                ? 'bg-yellow-500 text-gray-900'
                : 'bg-gray-800 text-gray-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>}

      {isWarehouse && <div className="rounded-xl border border-cyan-300/35 bg-cyan-400/10 p-3 text-sm font-bold text-cyan-100">这里装着你已经拥有的伙伴。点一只可以查看资料、使用技能石、整理技能，或删除不需要的伙伴。</div>}

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
                    setIsEncounterDetail(false); // 我的宝可梦
                    setShowDetailModal(true);
                  }}
                  className={`pixel-border rounded-xl p-4 cursor-pointer transition-all active:scale-95 hover:scale-[1.02] ${
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
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white">{monster.name}</span>
                        <MonsterElementBadges monster={monster} />
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
              {encounters.map((encounter, index) => (
                <div
                  key={`${encounter.monsterName}-${encounter.encounteredAt}-${index}`}
                  onClick={() => {
                    // 从野生宝可梦配置中查找对应的技能
                    const wildConfig = ALL_WILD_MONSTERS.find(
                      (config) => config.monster.name === encounter.monsterName
                    );
                    const wildSkills = wildConfig?.monster.skills || [];
                    const mockMonster: Monster = {
                      id: undefined,
                      name: encounter.monsterName,
                      elements: encounter.monsterElements,
                      element: encounter.monsterElement,
                      skills: wildSkills,
                      avatar: encounter.monsterAvatar,
                      hp: 50 + encounter.monsterLevel * 5,
                      maxHp: 50 + encounter.monsterLevel * 5,
                      attack: 30 + encounter.monsterLevel * 3,
                      defense: 25 + encounter.monsterLevel * 2,
                      speed: 20 + encounter.monsterLevel * 2,
                      level: encounter.monsterLevel,
                      exp: 0,
                      createdBy: 'system',
                      createdAt: encounter.encounteredAt,
                    };
                    setSelectedMonster(mockMonster);
                    setIsEncounterDetail(true); // 遭遇记录
                    setShowDetailModal(true);
                  }}
                  className="pixel-border rounded-xl p-4 bg-gray-800/50 cursor-pointer transition-all active:scale-95 hover:scale-[1.02] hover:bg-gray-700/50"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: getElementColor(encounter.monsterElement) + '30' }}
                    >
                      {getAvatarEmoji(encounter.monsterAvatar)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white">{encounter.monsterName}</span>
                        <MonsterElementBadges monster={{ element: encounter.monsterElement, elements: encounter.monsterElements }} />
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

      {activeTab === 'badges' && (
        <div className="flex flex-col gap-3">
          {(() => {
            const ingredientCount = getSuperBadgeIngredients(badges).length;
            const alreadyHasSuperBadge = badges.some((badge) => badge.kind === 'super' && !badge.usedAt);
            return (
              <section className="rounded-2xl border border-violet-300/35 bg-[radial-gradient(circle_at_50%_0%,rgba(217,151,255,.28),transparent_55%),#211735] p-4 shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-violet-100">🌀 合成勋章</p>
                    <p className="mt-1 text-xs leading-5 text-violet-100/80">把岩石、水、草、电、火、毒、超能力七枚道馆徽章亲手填入圆盘，合成可强化伙伴的超级勋章。</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-yellow-200/40 bg-yellow-300/15 px-3 py-2 text-sm font-black text-yellow-100">{ingredientCount}/7</span>
                </div>
                <button onClick={openBadgeFusion} disabled={alreadyHasSuperBadge} className="mt-3 w-full rounded-xl border border-yellow-100/50 bg-gradient-to-r from-yellow-300 to-amber-500 px-4 py-3 font-black text-slate-950 shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-400">
                  {alreadyHasSuperBadge ? '超级勋章已在徽章盒中' : ingredientCount < 7 ? `打开圆盘（还差 ${7 - ingredientCount} 枚）` : '打开合成圆盘'}
                </button>
              </section>
            );
          })()}
          {badges.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
              <p className="text-xl text-gray-400">还没有徽章</p>
              <Link to="/adventure" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold">
                🗺️ 去挑战大陆Boss
              </Link>
            </div>
          ) : badges.map((badge) => {
            const assignedMonster = monsters.find((monster) => monster.id === badge.assignedMonsterId);
            const isAssignable = badge.kind === 'gym' && badge.element && !badge.assignedMonsterId;
            const boostLabel: Record<NonNullable<Badge['statBoost']>, string> = { hp: '体力 +6', attack: '攻击 +4', defense: '防御 +4', speed: '速度 +3' };
            return (
              <div key={badge.id} className={`pixel-border rounded-xl p-4 ${badge.kind === 'super' ? 'border-violet-300/60 bg-violet-500/15' : 'bg-yellow-500/10'}`}>
                <div className="flex items-center gap-4">
                  {badge.kind === 'gym' && badge.element ? <GymBadgeEmblem element={badge.element} /> : <SuperBadgeEmblem />}
                  <div className="flex-1">
                    <p className="text-lg font-bold text-yellow-200">{badge.name}</p>
                    <p className="text-sm text-gray-400">{new Date(badge.earnedAt).toLocaleDateString('zh-CN')} 获得</p>
                    {badge.element && <p className="mt-1 text-xs font-bold text-yellow-100">只能强化拥有 {ELEMENT_CONFIG[badge.element].label} 属性的伙伴</p>}
                    {assignedMonster && badge.statBoost && <p className="mt-1 text-sm font-bold text-green-300">已给 {assignedMonster.name}：{boostLabel[badge.statBoost]}</p>}
                    {badge.kind === 'super' && <p className={`mt-1 text-xs font-bold ${badge.usedAt ? 'text-gray-400' : 'text-violet-100'}`}>{badge.usedAt ? '已使用：伙伴已获得全属性 +1' : '可使用：随机让一只伙伴的全属性 +1'}</p>}
                  </div>
                  {isAssignable && <button onClick={() => setBadgeToAssign(badge)} className="rounded-lg bg-yellow-400 px-3 py-2 text-sm font-bold text-gray-900">分配强化</button>}
                  {badge.kind === 'super' && !badge.usedAt && <button onClick={() => void useSuperBadge(badge)} disabled={monsters.length === 0} className="rounded-lg bg-violet-300 px-3 py-2 text-sm font-black text-violet-950 shadow disabled:cursor-not-allowed disabled:bg-gray-600 disabled:text-gray-300">使用勋章</button>}
                </div>
                {badgeToAssign?.id === badge.id && badge.element && (
                  <div className="mt-4 border-t border-yellow-300/30 pt-3">
                    <p className="mb-2 text-sm font-bold text-yellow-100">先选一只 {ELEMENT_CONFIG[badge.element].label} 属性伙伴，再选强化项目：</p>
                    {monsters.filter((monster) => getMonsterElements(monster).includes(badge.element!)).map((monster) => (
                      <div key={monster.id} className="mb-2 rounded-lg bg-gray-800/70 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold text-white">{monster.name}</span><MonsterElementBadges monster={monster} badgeClassName="text-xs font-bold" /></div>
                        <div className="mt-2 grid grid-cols-4 gap-1">{([
                          ['hp', '体力 +6'], ['attack', '攻击 +4'], ['defense', '防御 +4'], ['speed', '速度 +3'],
                        ] as const).map(([stat, label]) => <button key={stat} onClick={() => assignGymBadge(badge, monster, stat)} className="rounded bg-yellow-500/20 px-1 py-2 text-xs font-bold text-yellow-100 hover:bg-yellow-500/40">{label}</button>)}</div>
                      </div>
                    ))}
                    <button onClick={() => setBadgeToAssign(null)} className="mt-1 text-sm font-bold text-gray-300">取消</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showBadgeFusion && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0b0916]/90 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="合成超级勋章">
          <section className="w-full max-w-lg rounded-[28px] border-2 border-yellow-200/65 bg-[#201631] p-4 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-2xl font-black text-yellow-200">🌀 合成勋章</p><p className="mt-1 text-sm text-violet-100/90">先点选一枚徽章，再点击圆盘中对应属性的槽位。</p></div>
              <button onClick={() => setShowBadgeFusion(false)} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20" aria-label="关闭合成圆盘">×</button>
            </div>
            <div className="fusion-wheel mt-5" aria-label="七属性徽章合成圆盘">
              <div className="fusion-wheel-core"><SuperBadgeEmblem size="62%" /></div>
              {SUPER_BADGE_ELEMENTS.map((element) => {
                const slotPosition = FUSION_SLOT_LAYOUT[element];
                const badgeId = fusionSlots[element];
                const placedBadge = badges.find((badge) => badge.id === badgeId);
                return <button key={element} onClick={() => fillFusionSlot(element)} className={`fusion-slot ${placedBadge ? 'is-filled' : ''}`} style={{ left: `${slotPosition.left}%`, top: `${slotPosition.top}%` }} aria-label={`${SUPER_BADGE_SLOT_LABELS[element]}属性槽位${placedBadge ? '，已填入' : ''}`} title={placedBadge ? `移除${SUPER_BADGE_SLOT_LABELS[element]}徽章` : `填入${SUPER_BADGE_SLOT_LABELS[element]}徽章`}>
                  {placedBadge ? <GymBadgeEmblem element={element} size="100%" /> : <span className="text-xl opacity-60">＋</span>}
                  <span className="fusion-slot-label">{SUPER_BADGE_SLOT_LABELS[element]}</span>
                </button>;
              })}
            </div>
            <div className="mt-6 rounded-2xl border border-white/15 bg-black/20 p-3">
              <p className="text-sm font-bold text-yellow-100">选择要填入的道馆徽章</p>
              <div className="mt-3 flex flex-wrap justify-center gap-3">
                {getSuperBadgeIngredients(badges).map((badge) => {
                  const isPlaced = badge.id !== undefined && Object.values(fusionSlots).includes(badge.id);
                  const isSelected = selectedFusionBadgeId === badge.id;
                  return badge.element ? <button key={badge.id} onClick={() => !isPlaced && setSelectedFusionBadgeId(isSelected ? null : badge.id ?? null)} disabled={isPlaced} className={`rounded-xl p-1 transition ${isSelected ? 'bg-yellow-300/30 ring-2 ring-yellow-200' : 'bg-white/5'} disabled:cursor-not-allowed disabled:opacity-35`} aria-label={`选择${SUPER_BADGE_SLOT_LABELS[badge.element as SuperBadgeElement]}徽章`}>
                    <GymBadgeEmblem element={badge.element} />
                  </button> : null;
                })}
              </div>
              <p className="mt-3 text-center text-xs text-gray-300">已填入 {Object.keys(fusionSlots).length}/7 枚。点击已填入的槽位可取回徽章。</p>
            </div>
            <button onClick={() => void fuseSuperBadge()} disabled={Object.keys(fusionSlots).length !== 7 || isFusingBadge} className="mt-4 w-full rounded-xl bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400 px-5 py-4 text-lg font-black text-slate-950 shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400">
              {isFusingBadge ? '正在合成…' : Object.keys(fusionSlots).length === 7 ? '🌟 合成超级勋章' : `还需填入 ${7 - Object.keys(fusionSlots).length} 枚徽章`}
            </button>
          </section>
        </div>
      )}

      {activeTab === 'stickers' && (
        <div className="grid grid-cols-3 gap-3">
          {stickers.length === 0 ? (
            <div className="col-span-3 flex flex-col items-center justify-center gap-4 py-12">
              <p className="text-xl text-gray-400">还没有贴纸</p>
              <Link to="/adventure" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold">
                💎 去完成小任务
              </Link>
            </div>
          ) : stickers.map((sticker) => (
            <div key={sticker.id} className="pixel-border rounded-xl p-3 bg-gray-800/50 text-center">
              <div className="text-4xl">{sticker.emoji}</div>
              <p className="text-sm font-bold text-white mt-2">{sticker.name}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'diary' && (
        <div className="flex flex-col gap-3">
          {diaryEntries.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
              <p className="text-xl text-gray-400">还没有冒险日记</p>
              <p className="text-sm text-gray-500">赢得战斗或捕获伙伴后会自动记录。</p>
            </div>
          ) : diaryEntries.map((entry) => (
            <div key={entry.id} className="pixel-border rounded-xl p-4 bg-gray-800/50">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-yellow-200">{entry.title}</p>
                <p className="text-xs text-gray-500">{new Date(entry.createdAt).toLocaleDateString('zh-CN')}</p>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{entry.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* 精美详情弹窗 - 使用函数调用来避免Tree Shaking */}
      {renderDetailModal()}

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
