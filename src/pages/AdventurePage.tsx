import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../db/database';
import { useGameStore } from '../stores/gameStore';
import { getPresetContinents, createCustomContinent } from '../game/continentData';
import { ELEMENT_CONFIG } from '../components/create/StepElement';
import VoiceTextInput from '../components/VoiceTextInput';
import {
  MAP_DIFFICULTIES,
  createDifficultyCells,
  getMapDifficultyConfig,
  hasCompletedDifficulty,
  isDifficultyUnlocked,
  unlockDifficultyByParent,
} from '../game/mapDifficulty';
import type { Continent, ElementType, MapDifficulty, Monster } from '../types';

export default function AdventurePage() {
  const navigate = useNavigate();
  const [continents, setContinents] = useState<Continent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customElement, setCustomElement] = useState<ElementType>('fire');
  const [customColor, setCustomColor] = useState('#ef4444');
  const [trainerMonsters, setTrainerMonsters] = useState<Monster[]>([]);
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null);
  const currentTrainer = useGameStore((state) => state.currentTrainer);

  useEffect(() => {
    loadContinents();
  }, []);

  useEffect(() => {
    loadTrainerMonsters();
  }, [currentTrainer]);

  const loadContinents = async () => {
    try {
      const saved = await db.continents.toArray();
      if (saved.length === 0) {
        // 首次加载，初始化预设大陆
        const presets = getPresetContinents();
        await db.continents.bulkAdd(presets);
        setContinents(presets);
      } else {
        // 检查是否需要更新预设大陆（gridSize变化等）
        const presets = getPresetContinents();
        const updated = await Promise.all(
          saved.map(async (continent) => {
            const preset = presets.find((p) => p.id === continent.id);
            if (preset && continent.gridSize !== preset.gridSize) {
              // 更新为新的预设数据
              await db.continents.put(preset);
              return preset;
            }
            return continent;
          })
        );
        setContinents(updated);
      }
    } catch (err) {
      console.error('加载大陆失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTrainerMonsters = async () => {
    const monsters = await db.monsters.toArray();
    const trainerIds = currentTrainer?.monsterIds ?? [];
    setTrainerMonsters(trainerIds.length > 0
      ? monsters.filter((monster) => monster.id && trainerIds.includes(monster.id))
      : monsters);
  };

  const handleSelectContinent = async (continent: Continent, difficulty: MapDifficulty) => {
    const unlocked = isDifficultyUnlocked(
      continent.id,
      difficulty,
      trainerMonsters,
      currentTrainer?.id,
      continent.completed
    );
    if (!unlocked) {
      const config = getMapDifficultyConfig(difficulty);
      setUnlockMessage(`${config.label}难度还没开放：${config.unlockHint}`);
      setTimeout(() => setUnlockMessage(null), 3500);
      return;
    }

    const startPos = { x: Math.floor(continent.gridSize / 2), y: Math.floor(continent.gridSize / 2) };
    const difficultyCells = createDifficultyCells(continent, difficulty);
    await db.continents.update(continent.id, { cells: difficultyCells });
    setContinents((prev) => prev.map((item) =>
      item.id === continent.id ? { ...item, cells: difficultyCells } : item
    ));

    // 保存当前冒险到store
    useGameStore.getState().setCurrentAdventure({
      continentId: continent.id,
      difficulty,
      currentPosition: startPos,
      events: [],
    });
    navigate(`/map/${continent.id}`);
  };

  const handleParentUnlock = (continent: Continent, difficulty: MapDifficulty) => {
    const config = getMapDifficultyConfig(difficulty);
    const ok = window.confirm(`家长解锁：确定开放${continent.name}的${config.displayLabel}吗？`);
    if (!ok) return;
    unlockDifficultyByParent(continent.id, difficulty, currentTrainer?.id);
    setUnlockMessage(`${continent.name}的${config.label}难度已开放。`);
    setTimeout(() => setUnlockMessage(null), 3500);
  };

  const handleCreateCustom = async () => {
    if (!customName.trim()) return;
    const newContinent = createCustomContinent(customName.trim(), customElement, customColor);
    try {
      await db.continents.add(newContinent);
      setContinents((prev) => [...prev, newContinent]);
      setShowCreate(false);
      setCustomName('');
    } catch (err) {
      console.error('创建失败:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-4xl animate-spin">⏳</div>
        <p className="text-lg text-gray-300 mt-4">加载大陆...</p>
      </div>
    );
  }

  return (
    <div className="adventure-page flex flex-col min-h-[100dvh] p-4 gap-4">
      {/* 顶部 */}
      <div className="flex items-center justify-between">
        <Link to="/" className="text-blue-400 hover:text-blue-300 text-lg font-bold">
          ← 返回
        </Link>
        <h1 className="text-xl font-bold text-yellow-300 pixel-title">🗺️ 冒险大陆</h1>
        <div className="w-12" />
      </div>

      {unlockMessage && (
        <div className="pixel-border rounded-xl bg-yellow-500/15 border-yellow-400/40 p-3 text-center text-sm font-bold text-yellow-100">
          {unlockMessage}
        </div>
      )}

      {/* 大陆列表 */}
      <div className="adventure-list flex flex-col gap-3 min-h-0 overflow-y-auto">
        {continents.map((continent) => {
          const completedEasy = hasCompletedDifficulty(continent.id, 'easy', currentTrainer?.id, continent.completed);
          return (
          <div
            key={continent.id}
            className="pixel-border rounded-xl p-4 text-left transition-all hover:scale-[1.02] active:scale-95"
            style={{ backgroundColor: continent.bgColor + '80' }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                style={{ backgroundColor: continent.themeColor + '30' }}
              >
                {continent.emoji}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">{continent.name}</h3>
                  {completedEasy && <span className="text-green-400 text-sm">✅ 简单已通关</span>}
                  {continent.isCustom && <span className="text-yellow-400 text-sm">⭐ 自定义</span>}
                </div>
                <p className="text-sm text-gray-300">{continent.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: ELEMENT_CONFIG[continent.element]?.color + '30',
                      color: ELEMENT_CONFIG[continent.element]?.color,
                    }}
                  >
                    {ELEMENT_CONFIG[continent.element]?.emoji} {ELEMENT_CONFIG[continent.element]?.label}
                  </span>
                  <span className="text-xs text-gray-400">Boss: {continent.bossName}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {MAP_DIFFICULTIES.map((difficulty) => {
                const config = getMapDifficultyConfig(difficulty);
                const unlocked = isDifficultyUnlocked(
                  continent.id,
                  difficulty,
                  trainerMonsters,
                  currentTrainer?.id,
                  continent.completed
                );
                const completed = hasCompletedDifficulty(continent.id, difficulty, currentTrainer?.id, continent.completed);
                return (
                  <div key={difficulty} className="flex flex-col gap-1">
                    <button
                      onClick={() => handleSelectContinent(continent, difficulty)}
                      className={`min-h-20 rounded-lg border px-2 py-2 text-center transition-all active:scale-95 ${
                        unlocked
                          ? 'bg-gray-900/70 border-yellow-400/40 text-white hover:bg-gray-800'
                          : 'bg-gray-900/40 border-gray-700 text-gray-500'
                      }`}
                    >
                      <div className="text-xl">{completed ? '🏅' : config.emoji}</div>
                      <div className="text-sm font-bold">{config.label}</div>
                      <div className="text-[11px] leading-tight">{unlocked ? config.treasureLabel : '未开放'}</div>
                    </button>
                    {!unlocked && difficulty !== 'easy' && (
                      <button
                        onClick={() => handleParentUnlock(continent, difficulty)}
                        className="rounded-md bg-blue-500/20 px-1 py-1 text-[11px] font-bold text-blue-200 active:scale-95"
                      >
                        家长解锁
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
        })}
      </div>

      {/* 创建自定义大陆 */}
      {!showCreate ? (
        <button
          onClick={() => setShowCreate(true)}
          className="pixel-border rounded-xl p-4 bg-gray-800/50 text-center hover:bg-gray-700/50 transition-all active:scale-95"
        >
          <span className="text-2xl">➕</span>
          <p className="text-lg font-bold text-yellow-300 mt-1">创建新大陆</p>
        </button>
      ) : (
        <div className="pixel-border rounded-xl p-4 bg-gray-800/70 flex flex-col gap-3">
          <h3 className="text-lg font-bold text-yellow-300">创建自定义大陆</h3>
          <VoiceTextInput
            type="text"
            value={customName}
            onChangeText={setCustomName}
            placeholder="大陆名字"
            wrapperClassName="w-full"
            className="bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2 text-white text-center"
            maxLength={12}
          />
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(ELEMENT_CONFIG).slice(0, 8).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => {
                  setCustomElement(key as ElementType);
                  setCustomColor(cfg.color);
                }}
                className={`p-2 rounded-lg text-sm font-bold transition-all ${
                  customElement === key ? 'ring-2 ring-white' : ''
                }`}
                style={{
                  backgroundColor: cfg.color + '30',
                  color: cfg.color,
                }}
              >
                {cfg.emoji} {cfg.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreate(false)}
              className="flex-1 py-2 rounded-lg bg-gray-700 text-gray-300 font-bold hover:bg-gray-600"
            >
              取消
            </button>
            <button
              onClick={handleCreateCustom}
              disabled={!customName.trim()}
              className={`flex-1 py-2 rounded-lg font-bold ${
                customName.trim()
                  ? 'bg-green-500 text-white hover:bg-green-400'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              创建
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
