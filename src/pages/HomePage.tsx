import { Link } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { db } from '../db/database';
import { useEffect, useState } from 'react';
import { AVATAR_OPTIONS } from '../components/create/StepAvatar';
import { ELEMENT_CONFIG } from '../components/create/StepElement';
import TrainerAvatar from '../components/TrainerAvatar';
import { getChapterConfig } from '../game/chapterSystem';
import { DAILY_TASKS, getDailyTaskState, type DailyTaskState } from '../game/dailyTasks';
import { APP_VERSION } from '../game/appVersion';
import type { Continent, Monster } from '../types';

const menuItems = [
  { to: '/language-lab', label: '🧪 语言研究所', color: 'bg-indigo-500 hover:bg-indigo-600', emoji: '🧪' },
  { to: '/create', label: '🎨 创造宝可梦', color: 'bg-red-500 hover:bg-red-600', emoji: '🎨' },
  { to: '/adventure', label: '🗺️ 开始冒险', color: 'bg-orange-500 hover:bg-orange-600', emoji: '🗺️' },
  { to: '/battle-select', label: '⚔️ 开始对战', color: 'bg-green-500 hover:bg-green-600', emoji: '⚔️' },
  { to: '/multiplayer', label: '🌐 家庭联机', color: 'bg-pink-500 hover:bg-pink-600', emoji: '🌐' },
  { to: '/pokedex', label: '📖 宝可梦图鉴', color: 'bg-blue-500 hover:bg-blue-600', emoji: '📖' },
  { to: '/backpack', label: '🎒 训练师背包', color: 'bg-cyan-600 hover:bg-cyan-700', emoji: '🎒' },
  { to: '/shop', label: '🏪 精灵球商店', color: 'bg-amber-600 hover:bg-amber-700', emoji: '🏪' },
  { to: '/hospital', label: '🏥 宝可梦医院', color: 'bg-rose-500 hover:bg-rose-600', emoji: '🏥' },
  { to: '/trainer', label: '🧑‍🎤 训练师', color: 'bg-purple-500 hover:bg-purple-600', emoji: '🧑‍🎤' },
];

export default function HomePage() {
  const currentTrainer = useGameStore((state) => state.currentTrainer);
  const currentAdventure = useGameStore((state) => state.currentAdventure);
  const [trainerMonsters, setTrainerMonsters] = useState<Monster[]>([]);
  const [adventureContinent, setAdventureContinent] = useState<Continent | null>(null);
  const [parentNarration, setParentNarration] = useState(() => localStorage.getItem('parentNarration') !== 'off');
  const [dailyTaskState, setDailyTaskState] = useState<DailyTaskState | null>(null);

  useEffect(() => {
    if (currentTrainer && currentTrainer.monsterIds.length > 0) {
      db.monsters.bulkGet(currentTrainer.monsterIds).then((monsters) => {
        setTrainerMonsters(
          monsters.filter((m): m is Monster => m !== undefined && m.trainerId === currentTrainer.id)
        );
      });
    } else {
      setTrainerMonsters([]);
    }
    setDailyTaskState(currentTrainer ? getDailyTaskState(currentTrainer.id) : null);
  }, [currentTrainer]);

  useEffect(() => {
    if (!currentAdventure) {
      setAdventureContinent(null);
      return;
    }
    db.continents.where('id').equals(currentAdventure.continentId).first().then((continent) => {
      setAdventureContinent(continent || null);
    });
  }, [currentAdventure]);

  const toggleParentNarration = () => {
    const next = !parentNarration;
    setParentNarration(next);
    localStorage.setItem('parentNarration', next ? 'on' : 'off');
  };

  return (
    <div className="home-page flex flex-col items-center justify-center min-h-[100dvh] p-6 gap-6">
      {/* 标题区域 */}
      <div className="home-title text-center mb-4">
        <h1 className="text-4xl font-bold text-yellow-300 pixel-title drop-shadow-lg">
          ⚡ 宝可梦 ⚡
        </h1>
        <h2 className="text-3xl font-bold text-yellow-300 pixel-title drop-shadow-lg mt-2">
          大冒险
        </h2>
        <p className="text-lg text-gray-300 mt-3">
          选择你的冒险之旅！
        </p>
      </div>

      {/* 训练师信息卡片 */}
      {currentTrainer ? (
        <div className="home-trainer pixel-border rounded-2xl p-4 bg-gray-800/70 w-full max-w-xs flex items-center gap-4">
          <TrainerAvatar
            avatar={currentTrainer.avatar}
            className="w-14 h-14 rounded-xl"
            imageClassName="w-full h-full object-cover rounded-xl"
            emojiClassName="text-3xl"
          />
          <div className="flex-1">
            <p className="text-xs text-gray-400">训练师</p>
            <p className="text-lg font-bold text-white">{currentTrainer.name}</p>
            <p className="text-xs text-yellow-300">
              拥有 {trainerMonsters.length} 只宝可梦
            </p>
          </div>
        </div>
      ) : (
        <Link
          to="/trainer"
          className="home-trainer pixel-border rounded-2xl p-4 bg-gray-800/70 w-full max-w-xs text-center hover:bg-gray-700/70 transition-colors"
        >
          <p className="text-gray-400">还没有训练师</p>
          <p className="text-yellow-300 font-bold">点击创建 →</p>
        </Link>
      )}

      {/* 装饰分割线 */}
      <div className="home-divider flex gap-1 mb-2">
        {Array.from({ length: 11 }).map((_, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'][i % 5] }}
          />
        ))}
      </div>

      {currentAdventure && adventureContinent && (
        <Link
          to={`/map/${currentAdventure.continentId}`}
          className="home-current pixel-border rounded-2xl p-4 bg-yellow-500/20 w-full max-w-xs text-center hover:bg-yellow-500/30 transition-all active:scale-95"
        >
          <p className="text-2xl mb-1">{adventureContinent.emoji}</p>
          <p className="text-xl font-bold text-yellow-200">继续冒险</p>
          <p className="text-sm text-gray-300 mt-1">{getChapterConfig(adventureContinent).goalText}</p>
        </Link>
      )}

      {currentTrainer && dailyTaskState && (
        <Link
          to={currentAdventure ? `/map/${currentAdventure.continentId}` : '/adventure'}
          className="home-daily pixel-border rounded-2xl p-4 bg-gray-800/70 w-full max-w-xs hover:bg-gray-700/70 transition-all active:scale-95"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400">今天要干什么</p>
              <p className="text-lg font-bold text-yellow-200">今日目标</p>
            </div>
            <span className="text-sm font-bold text-green-300">
              {dailyTaskState.completedTaskIds.length}/{dailyTaskState.taskIds.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {dailyTaskState.taskIds.map((taskId) => {
              const task = DAILY_TASKS[taskId];
              const done = dailyTaskState.completedTaskIds.includes(taskId);
              if (!task) return null;
              return (
                <div key={taskId} className="flex items-center gap-2 text-sm">
                  <span className="text-lg">{done ? '✅' : task.emoji}</span>
                  <span className={done ? 'text-green-200' : 'text-gray-300'}>{task.label}</span>
                </div>
              );
            })}
          </div>
          {dailyTaskState.bonusClaimed && (
            <p className="text-xs text-pink-200 mt-3">🌈 今日彩虹贴纸已获得</p>
          )}
        </Link>
      )}

      <button
        onClick={toggleParentNarration}
        className="home-parent w-full max-w-xs rounded-xl bg-gray-800/70 border border-gray-700 px-4 py-2 text-sm font-bold text-gray-200 hover:bg-gray-700/70"
      >
        🎙️ 亲子旁白：{parentNarration ? '开启' : '关闭'}
      </button>

      {/* 菜单按钮 */}
      <div className="home-menu flex flex-col gap-4 w-full max-w-xs">
        {menuItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`
              ${item.color}
              pixel-border
              text-white text-xl font-bold
              flex items-center justify-center gap-3
              h-16 px-6 rounded-lg
              transition-[transform,background-color,box-shadow] duration-150
              active:scale-95 active:translate-y-0.5
              focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-300
              shadow-lg
            `}
          >
            <span className="text-2xl" aria-hidden="true">{item.emoji}</span>
            <span>{item.label.replace(item.emoji + ' ', '')}</span>
          </Link>
        ))}
      </div>

      {/* 快捷宝可梦预览 */}
      {trainerMonsters.length > 0 && (
        <div className="home-monsters w-full max-w-xs">
          <p className="text-sm text-gray-400 mb-2 text-center">我的宝可梦：</p>
          <div className="flex justify-center gap-2 flex-wrap">
            {trainerMonsters.slice(0, 6).map((monster) => {
              const avatarInfo = AVATAR_OPTIONS.find((a) => a.id === monster.avatar);
              const elementInfo = ELEMENT_CONFIG[monster.element];
              return (
                <Link
                  key={monster.id}
                  to="/pokedex"
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
                  style={{
                    backgroundColor: avatarInfo?.bg || '#1f2937',
                    boxShadow: elementInfo ? `0 0 8px ${elementInfo.color}40` : undefined,
                  }}
                  title={monster.name}
                >
                  {avatarInfo?.emoji || '❓'}
                </Link>
              );
            })}
            {trainerMonsters.length > 6 && (
              <Link
                to="/pokedex"
                className="w-12 h-12 rounded-lg flex items-center justify-center text-sm bg-gray-700 text-gray-400"
              >
                +{trainerMonsters.length - 6}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* 底部提示 */}
      <p className="home-tip text-sm text-gray-500 mt-6">
        👆 点击按钮开始游戏吧！
      </p>
      <p className="home-version text-xs font-bold text-gray-600">版本 {APP_VERSION}</p>
    </div>
  );
}
