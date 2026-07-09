import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../db/database';
import { useGameStore } from '../stores/gameStore';
import { CELL_ICONS, CELL_COLORS, CELL_NAMES, CONTINENT_EFFECTS } from '../game/continentData';
import { ELEMENT_CONFIG } from '../components/create/StepElement';
import { randomEncounter } from '../game/wildMonsters';
import {
  CHAPTER_TASKS,
  addStoryFragment,
  completeTask,
  createTaskSticker,
  ensureAdventureChapter,
  getChapterConfig,
  getTaskRewardBall,
} from '../game/chapterSystem';
import {
  completeDailyTask,
  createDailySticker,
  getDailyTaskRewardBall,
  type DailyTaskAction,
} from '../game/dailyTasks';
import {
  createBossMonster,
  getMapDifficultyConfig,
  normalizeDifficulty,
  scaleMonsterForDifficulty,
} from '../game/mapDifficulty';
import type { Adventure, Continent, MapCell, AdventureEvent, PokeBallType } from '../types';

export default function MapPage() {
  const { continentId } = useParams<{ continentId: string }>();
  const navigate = useNavigate();
  const [continent, setContinent] = useState<Continent | null>(null);
  const [currentPos, setCurrentPos] = useState({ x: 4, y: 4 });
  const [events, setEvents] = useState<AdventureEvent[]>([]);
  const [showEvent, setShowEvent] = useState<AdventureEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockedHint, setBlockedHint] = useState<string | null>(null);
  const [taskMessage, setTaskMessage] = useState<string | null>(null);
  const [parentNarration] = useState(() => localStorage.getItem('parentNarration') !== 'off');

  const currentAdventure = useGameStore((state) => state.currentAdventure);
  const setCurrentAdventure = useGameStore((state) => state.setCurrentAdventure);
  const currentTrainer = useGameStore((state) => state.currentTrainer);

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
          const restoredAdventure = ensureAdventureChapter(currentAdventure, found);
          setCurrentPos(restoredAdventure.currentPosition);
          setEvents(restoredAdventure.events);
          setCurrentAdventure(restoredAdventure);
        } else {
          // 初始化新冒险
          const startPos = { x: Math.floor(found.gridSize / 2), y: Math.floor(found.gridSize / 2) };
          const newAdventure = ensureAdventureChapter({
            continentId: continentId!,
            difficulty: 'easy',
            currentPosition: startPos,
            events: [],
          }, found);
          setCurrentPos(startPos);
          setCurrentAdventure(newAdventure);
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

  const getStorageKey = (key: string) => {
    const trainerId = currentTrainer?.id;
    return trainerId ? `${key}_trainer_${trainerId}` : key;
  };

  const addPokeballReward = (type: PokeBallType, count: number) => {
    const saved = localStorage.getItem(getStorageKey('pokeballs'));
    const inventory = saved
      ? JSON.parse(saved)
      : { normal: 3, great: 1, ultra: 0, master: 0, legend: 0, transcend: 0 };
    inventory[type] = (inventory[type] || 0) + count;
    localStorage.setItem(getStorageKey('pokeballs'), JSON.stringify(inventory));
  };

  const showTaskToast = (message: string) => {
    setTaskMessage((prev) => prev ? `${prev} ${message}` : message);
    setTimeout(() => setTaskMessage(null), 4500);
  };

  const awardDailyTaskReward = async (action: DailyTaskAction) => {
    const { completedNow, task, bonusCompletedNow } = completeDailyTask(action, currentTrainer?.id);
    if (!completedNow || !task) return;

    const ball = getDailyTaskRewardBall(task.id);
    addPokeballReward(ball.type, ball.count);
    let message = `${task.emoji} 完成今日目标：${task.label}！${task.rewardText}。`;

    if (bonusCompletedNow) {
      const sticker = createDailySticker(currentTrainer?.id);
      const existingSticker = await db.stickers
        .where('stickerId')
        .equals(sticker.stickerId)
        .and((item) => item.trainerId === currentTrainer?.id)
        .first();
      if (!existingSticker) {
        await db.stickers.add(sticker);
      }
      message += ' 今日目标全部完成，获得彩虹贴纸！';
    }

    showTaskToast(message);
  };

  const awardTaskReward = async (taskId: string, baseAdventure: Adventure, cont: Continent) => {
    const { adventure, completedNow } = completeTask(baseAdventure, taskId);
    if (!completedNow) return baseAdventure;

    const ball = getTaskRewardBall(taskId);
    addPokeballReward(ball.type, ball.count);
    await db.stickers.add(createTaskSticker(cont, taskId, currentTrainer?.id));

    const { adventure: withFragment, fragmentText } = addStoryFragment(adventure, cont);
    const task = CHAPTER_TASKS[taskId];
    const message = `${task.emoji} 完成小任务：${task.label}！获得 ${ball.count} 个精灵球和新贴纸。`;
    showTaskToast(fragmentText ? `${message} 故事碎片：${fragmentText}` : message);
    return withFragment;
  };

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

    const chapterAdventure = ensureAdventureChapter({
      ...(currentAdventure ?? {
        continentId: continentId!,
        difficulty: 'easy',
        currentPosition: newPos,
        events,
      }),
      currentPosition: newPos,
      events,
    }, continent);

    // 触发事件
    const event = await triggerEvent(targetCell.type, continent, newPos.x, newPos.y);
    let nextAdventure = chapterAdventure;
    if (targetCell.type === 'treasure') {
      nextAdventure = await awardTaskReward('treasure', nextAdventure, continent);
      await awardDailyTaskReward('treasure');
    } else if (targetCell.type === 'rest') {
      nextAdventure = await awardTaskReward('rest', nextAdventure, continent);
      await awardDailyTaskReward('rest');
    } else if (targetCell.type === 'wild') {
      nextAdventure = await awardTaskReward('encounter', nextAdventure, continent);
      await awardDailyTaskReward('encounter');
    }

    if (event) {
      setShowEvent(event);
      const newEvents = [...events, event];
      setEvents(newEvents);

      // 保存冒险状态（包含新事件）
      setCurrentAdventure({
        ...nextAdventure,
        events: newEvents,
        pendingBattleType: event.type === 'battle' ? event.cellType === 'boss' ? 'boss' : 'wild' : nextAdventure.pendingBattleType,
      });
    } else {
      // 无事件也保存位置
      setCurrentAdventure({
        ...nextAdventure,
        events,
      });
    }

    // 更新数据库
    await db.continents.update(continent.id!, { cells: updatedCells });
  };

  const triggerEvent = async (cellType: string, cont: Continent, x: number, y: number): Promise<AdventureEvent | null> => {
    const chapter = getChapterConfig(cont);
    const difficulty = normalizeDifficulty(useGameStore.getState().currentAdventure?.difficulty);
    const difficultyConfig = getMapDifficultyConfig(difficulty);
    switch (cellType) {
      case 'wild': {
        // 根据大陆属性生成野生宝可梦，传入当前位置
        const generatedWildMonster = randomEncounter(cont.element, x, y, cont.gridSize);
        const wildMonster = generatedWildMonster
          ? scaleMonsterForDifficulty(generatedWildMonster, difficulty)
          : null;
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
            description: `草丛晃了一下，${difficultyConfig.label}难度的 Lv.${wildMonster.level} ${wildMonster.name} 跳了出来！它看起来想和你比试一下。`,
            completed: false,
            cellType: 'wild',
            parentPrompt: '家长旁白：问问孩子，要用哪只伙伴来打招呼式地比试？',
          };
        }
        // 如果没有匹配的宝可梦，使用默认
        return {
          type: 'battle',
          description: '遭遇了野生宝可梦！准备战斗！',
          completed: false,
          cellType: 'wild',
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
          cellType: 'treasure',
          parentPrompt: '家长旁白：请孩子猜猜宝箱里还藏着什么亮晶晶的东西。',
        };
      }
      case 'rest': {
        return {
          type: 'rest',
          description: '在休息点恢复了体力！HP +30',
          completed: true,
          reward: { hp: 30 },
          cellType: 'rest',
          parentPrompt: '家长旁白：请孩子说说伙伴吃了什么点心恢复体力。',
        };
      }
      case 'boss': {
        const bossMonster = createBossMonster(cont, difficulty);
        useGameStore.getState().setWildMonster(bossMonster);
        return {
          type: 'battle',
          description: `⚠️ ${difficultyConfig.displayLabel}Boss战！${chapter.bossIntro}`,
          completed: false,
          cellType: 'boss',
          parentPrompt: `家长扮演Boss：我是${cont.bossName}，让我看看你们的勇气！`,
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
  const adventure = currentAdventure?.continentId === continent.id
    ? ensureAdventureChapter(currentAdventure, continent)
    : null;
  const difficulty = normalizeDifficulty(adventure?.difficulty);
  const difficultyConfig = getMapDifficultyConfig(difficulty);
  const chapter = getChapterConfig(continent);
  const taskIds = adventure?.taskIds ?? [];
  const completedTaskIds = adventure?.completedTaskIds ?? [];

  return (
    <div 
      className="map-page flex flex-col min-h-[100dvh] p-4 gap-4 relative overflow-hidden"
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
          <p className="mt-1 inline-flex items-center rounded-full border border-yellow-400/40 bg-yellow-500/15 px-2 py-0.5 text-xs font-bold text-yellow-100">
            {difficultyConfig.emoji} {difficultyConfig.displayLabel}
          </p>
          {effects && (
            <p className="text-xs text-gray-500 mt-1 italic">
              {effects.ambienceText}
            </p>
          )}
        </div>
        <div className="w-12" />
      </div>

      {/* 章节目标与小任务 */}
      <div className="relative z-10 pixel-border rounded-xl p-3 bg-gray-900/70">
        <p className="text-sm text-yellow-200 font-bold">今日目标：{chapter.goalText}</p>
        <p className="mt-1 text-xs text-gray-300">
          当前难度：{difficultyConfig.description}
        </p>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {taskIds.map((taskId) => {
            const task = CHAPTER_TASKS[taskId];
            const done = completedTaskIds.includes(taskId);
            return (
              <div
                key={taskId}
                className={`rounded-lg px-2 py-2 text-center text-xs font-bold border ${
                  done
                    ? 'bg-green-500/20 text-green-200 border-green-400/50'
                    : 'bg-gray-800/80 text-gray-300 border-gray-700'
                }`}
              >
                <div className="text-lg">{done ? '✅' : task.emoji}</div>
                <div>{task.shortLabel}</div>
              </div>
            );
          })}
        </div>
        {taskMessage && (
          <div className="mt-3 rounded-lg bg-yellow-500/20 border border-yellow-400/40 p-2 text-sm text-yellow-100">
            {taskMessage}
          </div>
        )}
      </div>

      {/* 地图网格 */}
      <div className="map-board-wrap flex-1 flex flex-col items-center justify-center relative z-10 min-h-0">
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
                  map-cell w-14 h-14 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center text-xl
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
            {parentNarration && showEvent.parentPrompt && (
              <p className="text-sm text-blue-200 bg-blue-900/30 rounded-lg p-2 mb-4">
                {showEvent.parentPrompt}
              </p>
            )}

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
