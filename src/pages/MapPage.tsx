import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../db/database';
import { useGameStore } from '../stores/gameStore';
import { CELL_ICONS, CELL_COLORS, CELL_NAMES, CONTINENT_EFFECTS } from '../game/continentData';
import { ELEMENT_CONFIG } from '../components/create/StepElement';
import { AVATAR_OPTIONS } from '../components/create/StepAvatar';
import { randomEncounter } from '../game/wildMonsters';
import type { Continent, MapCell, AdventureEvent } from '../types';

export default function MapPage() {
  const { continentId } = useParams<{ continentId: string }>();
  const navigate = useNavigate();
  const [continent, setContinent] = useState<Continent | null>(null);
  const [currentPos, setCurrentPos] = useState({ x: 4, y: 4 });
  const [events, setEvents] = useState<AdventureEvent[]>([]);
  const [showEvent, setShowEvent] = useState<AdventureEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockedHint, setBlockedHint] = useState<string | null>(null);

  const currentAdventure = useGameStore((state) => state.currentAdventure);
  const setCurrentAdventure = useGameStore((state) => state.setCurrentAdventure);

  useEffect(() => {
    if (!continentId) return;
    loadContinent();
  }, [continentId]);

  const loadContinent = async () => {
    try {
      const found = await db.continents.where('id').equals(continentId!).first();
      if (found) {
        setContinent(found);
        // 恢复位置
        if (currentAdventure && currentAdventure.continentId === continentId) {
          setCurrentPos(currentAdventure.currentPosition);
          setEvents(currentAdventure.events);
        } else {
          // 初始化新冒险
          const startPos = { x: Math.floor(found.gridSize / 2), y: Math.floor(found.gridSize / 2) };
          setCurrentPos(startPos);
          setCurrentAdventure({
            continentId: continentId!,
            currentPosition: startPos,
            events: [],
          });
        }
      }
    } catch (err) {
      console.error('加载失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCell = useCallback(
    (x: number, y: number): MapCell | undefined => {
      return continent?.cells.find((c) => c.x === x && c.y === y);
    },
    [continent]
  );

  const revealNeighbors = useCallback(
    (x: number, y: number) => {
      if (!continent) return;
      const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ];
      const updatedCells = continent.cells.map((cell) => {
        if (neighbors.some(([nx, ny]) => cell.x === nx && cell.y === ny)) {
          return { ...cell, revealed: true };
        }
        return cell;
      });
      setContinent({ ...continent, cells: updatedCells });
    },
    [continent]
  );

  const handleMove = async (dx: number, dy: number) => {
    if (!continent || showEvent) return;

    const newX = currentPos.x + dx;
    const newY = currentPos.y + dy;

    // 边界检查
    if (newX < 0 || newX >= continent.gridSize || newY < 0 || newY >= continent.gridSize) {
      return;
    }

    const targetCell = getCell(newX, newY);
    if (!targetCell || targetCell.type === 'blocked') {
      return; // 障碍物不能走
    }

    // 更新位置
    const newPos = { x: newX, y: newY };
    setCurrentPos(newPos);

    // 标记已访问
    const updatedCells = continent.cells.map((c) =>
      c.x === newX && c.y === newY ? { ...c, visited: true, revealed: true } : c
    );
    const updatedContinent = { ...continent, cells: updatedCells };
    setContinent(updatedContinent);

    // 揭示周围
    revealNeighbors(newX, newY);

    // 触发事件
    const event = await triggerEvent(targetCell.type, continent);
    if (event) {
      setShowEvent(event);
      const newEvents = [...events, event];
      setEvents(newEvents);

      // 保存冒险状态（包含新事件）
      setCurrentAdventure({
        continentId: continentId!,
        currentPosition: newPos,
        events: newEvents,
      });
    } else {
      // 无事件也保存位置
      setCurrentAdventure({
        continentId: continentId!,
        currentPosition: newPos,
        events: events,
      });
    }

    // 更新数据库
    await db.continents.update(continent.id!, { cells: updatedCells });
  };

  const triggerEvent = async (cellType: string, cont: Continent): Promise<AdventureEvent | null> => {
    switch (cellType) {
      case 'wild': {
        // 根据大陆属性生成野生宝可梦
        const wildMonster = randomEncounter(cont.element);
        if (wildMonster) {
          // 保存野生宝可梦到状态，供战斗页面使用
          useGameStore.getState().setWildMonster(wildMonster);
          // 保存遭遇记录到数据库
          try {
            await db.encounters.add({
              monsterName: wildMonster.name,
              monsterElement: wildMonster.element,
              monsterLevel: wildMonster.level,
              monsterAvatar: wildMonster.avatar,
              continentName: cont.name,
              encounteredAt: new Date(),
              captured: false,
              defeated: false,
            });
          } catch (err) {
            console.error('保存遭遇记录失败:', err);
          }
          return {
            type: 'battle',
            description: `遭遇了 Lv.${wildMonster.level} ${wildMonster.name}！准备战斗！`,
            completed: false,
          };
        }
        // 如果没有匹配的宝可梦，使用默认
        return {
          type: 'battle',
          description: '遭遇了野生宝可梦！准备战斗！',
          completed: false,
        };
      }
      case 'treasure': {
        const rewards = [
          { desc: '发现经验果实！', exp: 20 },
          { desc: '发现治愈草药！', hp: 20 },
          { desc: '发现神秘宝箱！', exp: 30 },
        ];
        const reward = rewards[Math.floor(Math.random() * rewards.length)];
        return {
          type: 'item',
          description: reward.desc,
          completed: true,
          reward: { exp: reward.exp, hp: reward.hp },
        };
      }
      case 'rest': {
        return {
          type: 'rest',
          description: '在休息点恢复了体力！HP +30',
          completed: true,
          reward: { hp: 30 },
        };
      }
      case 'boss': {
        return {
          type: 'battle',
          description: `⚠️ Boss战！${cont.bossName} 出现了！`,
          completed: false,
        };
      }
      default:
        return null;
    }
  };

  const handleEventAction = (action: 'fight' | 'run' | 'ok') => {
    if (!showEvent || !continent) return;

    if (action === 'fight' && showEvent.type === 'battle') {
      // 进入战斗
      setShowEvent(null);
      // TODO: 生成敌人并进入战斗页面
      navigate('/battle-select');
    } else if (action === 'run') {
      setShowEvent(null);
    } else if (action === 'ok') {
      // 领取奖励
      setShowEvent(null);
    }
  };

  const handleCompleteContinent = async () => {
    if (!continent) return;
    await db.continents.update(continent.id!, { completed: true });
    setContinent({ ...continent, completed: true });
    setCurrentAdventure(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-4xl animate-spin">⏳</div>
        <p className="text-lg text-gray-300 mt-4">加载地图...</p>
      </div>
    );
  }

  if (!continent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-xl text-gray-400">大陆不存在</p>
        <Link to="/adventure" className="text-blue-400 hover:text-blue-300">
          ← 返回大陆选择
        </Link>
      </div>
    );
  }

  const elementInfo = ELEMENT_CONFIG[continent.element];
  const effects = CONTINENT_EFFECTS[continent.element];

  return (
    <div 
      className="flex flex-col min-h-screen p-4 gap-4 relative overflow-hidden"
      style={effects ? { background: effects.bgGradient } : undefined}
    >
      {/* 环境粒子特效 */}
      {effects && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className={`absolute text-lg opacity-20 ${effects.particleAnimation}`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            >
              {effects.particleEmoji}
            </span>
          ))}
        </div>
      )}

      {/* 顶部 */}
      <div className="flex items-center justify-between relative z-10">
        <Link to="/adventure" className="text-blue-400 hover:text-blue-300 text-lg font-bold">
          ← 返回
        </Link>
        <div className="text-center">
          <h1 className="text-lg font-bold text-yellow-300 pixel-title">
            {continent.emoji} {continent.name}
          </h1>
          <p className="text-xs text-gray-400">
            {elementInfo?.emoji} {elementInfo?.label}属性大陆
          </p>
          {effects && (
            <p className="text-xs text-gray-500 mt-1 italic">
              {effects.ambienceText}
            </p>
          )}
        </div>
        <div className="w-12" />
      </div>

      {/* 地图网格 */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        <div
          className="grid gap-1 p-2 rounded-xl backdrop-blur-sm"
          style={{
            gridTemplateColumns: `repeat(${continent.gridSize}, minmax(0, 1fr))`,
            backgroundColor: continent.themeColor + '20',
            border: `2px solid ${continent.themeColor}40`,
          }}
        >
          {continent.cells.map((cell) => {
            const isCurrent = cell.x === currentPos.x && cell.y === currentPos.y;
            const isRevealed = cell.revealed || cell.visited;

            return (
              <div
                key={`${cell.x}-${cell.y}`}
                onClick={() => {
                  if (isCurrent || showEvent) return;
                  const dx = cell.x - currentPos.x;
                  const dy = cell.y - currentPos.y;
                  if (Math.abs(dx) + Math.abs(dy) === 1) {
                    handleMove(dx, dy);
                  }
                }}
                className={`
                  w-14 h-14 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center text-xl
                  transition-all duration-200 relative select-none
                  ${isCurrent ? 'ring-2 ring-yellow-400 scale-110 z-10' : ''}
                  ${cell.visited ? 'opacity-80' : ''}
                  ${!isRevealed ? 'opacity-30' : ''}
                  ${isRevealed && !isCurrent && !showEvent ? 'cursor-pointer active:scale-95 hover:brightness-110' : ''}
                `}
                style={{
                  backgroundColor: isRevealed ? CELL_COLORS[cell.type] + '40' : '#1f2937',
                }}
              >
                {isCurrent ? (
                  <span className="text-2xl animate-bounce">🧑‍🎤</span>
                ) : isRevealed ? (
                  <span>{CELL_ICONS[cell.type]}</span>
                ) : (
                  <span className="text-gray-600">?</span>
                )}

                {/* 已访问标记 */}
                {cell.visited && !isCurrent && (
                  <div className="absolute bottom-0.5 right-0.5 w-2 h-2 bg-green-400 rounded-full" />
                )}
              </div>
            );
          })}
        </div>

        {/* 当前位置信息 */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-400">
            位置: ({currentPos.x + 1}, {currentPos.y + 1}) |
            {(() => {
              const cell = getCell(currentPos.x, currentPos.y);
              return cell ? ` ${CELL_NAMES[cell.type]}` : '';
            })()}
          </p>
        </div>
      </div>

      {/* 事件弹窗 */}
      {showEvent && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-50">
          <div className="pixel-border rounded-2xl p-6 bg-gray-800 max-w-sm w-full text-center">
            <div className="text-5xl mb-4">
              {showEvent.type === 'battle' ? '⚔️' : showEvent.type === 'item' ? '💎' : '💤'}
            </div>
            <h3 className="text-xl font-bold text-yellow-300 mb-2">
              {showEvent.type === 'battle' ? '遭遇！' : showEvent.type === 'item' ? '发现！' : '休息点'}
            </h3>
            <p className="text-lg text-gray-300 mb-4">{showEvent.description}</p>

            {showEvent.reward && (
              <div className="mb-4">
                {showEvent.reward.exp && (
                  <p className="text-yellow-400">获得 {showEvent.reward.exp} 经验</p>
                )}
                {showEvent.reward.hp && (
                  <p className="text-green-400">恢复 {showEvent.reward.hp} HP</p>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              {showEvent.type === 'battle' ? (
                <>
                  <button
                    onClick={() => handleEventAction('fight')}
                    className="bg-red-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-400 active:scale-95 transition-all"
                  >
                    ⚔️ 战斗
                  </button>
                  <button
                    onClick={() => handleEventAction('run')}
                    className="bg-gray-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-gray-500 active:scale-95 transition-all"
                  >
                    🏃 逃跑
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleEventAction('ok')}
                  className="bg-green-500 text-white px-8 py-2 rounded-xl font-bold hover:bg-green-400 active:scale-95 transition-all"
                >
                  ✅ 好的
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 通关按钮 */}
      {continent.completed && (
        <div className="text-center">
          <p className="text-green-400 font-bold mb-2">🎉 已通关！</p>
        </div>
      )}
    </div>
  );
}
