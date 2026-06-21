import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../db/database';
import { useGameStore } from '../stores/gameStore';
import { getPresetContinents, createCustomContinent, PRESET_CONTINENTS } from '../game/continentData';
import { ELEMENT_CONFIG } from '../components/create/StepElement';
import type { Continent, ElementType } from '../types';

export default function AdventurePage() {
  const navigate = useNavigate();
  const [continents, setContinents] = useState<Continent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customElement, setCustomElement] = useState<ElementType>('fire');
  const [customColor, setCustomColor] = useState('#ef4444');

  useEffect(() => {
    loadContinents();
  }, []);

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

  const handleSelectContinent = (continent: Continent) => {
    // 保存当前冒险到store
    useGameStore.getState().setCurrentAdventure({
      continentId: continent.id,
      currentPosition: { x: Math.floor(continent.gridSize / 2), y: Math.floor(continent.gridSize / 2) },
      events: [],
    });
    navigate(`/map/${continent.id}`);
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
    <div className="flex flex-col min-h-screen p-4 gap-4">
      {/* 顶部 */}
      <div className="flex items-center justify-between">
        <Link to="/" className="text-blue-400 hover:text-blue-300 text-lg font-bold">
          ← 返回
        </Link>
        <h1 className="text-xl font-bold text-yellow-300 pixel-title">🗺️ 冒险大陆</h1>
        <div className="w-12" />
      </div>

      {/* 大陆列表 */}
      <div className="flex flex-col gap-3">
        {continents.map((continent) => (
          <button
            key={continent.id}
            onClick={() => handleSelectContinent(continent)}
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
                  {continent.completed && <span className="text-green-400 text-sm">✅ 已通关</span>}
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
              <span className="text-2xl">→</span>
            </div>
          </button>
        ))}
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
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="大陆名字"
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
