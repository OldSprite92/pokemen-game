import { Link } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { db } from '../db/database';
import { useEffect, useState } from 'react';
import { AVATAR_OPTIONS } from '../components/create/StepAvatar';
import { ELEMENT_CONFIG } from '../components/create/StepElement';
import type { Monster } from '../types';

const menuItems = [
  { to: '/create', label: '🎨 创造宝可梦', color: 'bg-red-500 hover:bg-red-600', emoji: '🎨' },
  { to: '/adventure', label: '🗺️ 开始冒险', color: 'bg-orange-500 hover:bg-orange-600', emoji: '🗺️' },
  { to: '/battle-select', label: '⚔️ 开始对战', color: 'bg-green-500 hover:bg-green-600', emoji: '⚔️' },
  { to: '/multiplayer', label: '🌐 家庭联机', color: 'bg-pink-500 hover:bg-pink-600', emoji: '🌐' },
  { to: '/pokedex', label: '📖 宝可梦图鉴', color: 'bg-blue-500 hover:bg-blue-600', emoji: '📖' },
  { to: '/trainer', label: '🧑‍🎤 训练师', color: 'bg-purple-500 hover:bg-purple-600', emoji: '🧑‍🎤' },
];

/** 训练师头像配置 */
const TRAINER_AVATARS: Record<string, { emoji: string; color: string }> = {
  boy1: { emoji: '👦', color: '#3b82f6' },
  girl1: { emoji: '👧', color: '#ec4899' },
  man1: { emoji: '👨', color: '#1e40af' },
  woman1: { emoji: '👩', color: '#be185d' },
  boy2: { emoji: '🧑‍🎤', color: '#8b5cf6' },
  girl2: { emoji: '👸', color: '#f472b6' },
  grandpa: { emoji: '👴', color: '#78716c' },
  grandma: { emoji: '👵', color: '#a8a29e' },
};

export default function HomePage() {
  const currentTrainer = useGameStore((state) => state.currentTrainer);
  const [trainerMonsters, setTrainerMonsters] = useState<Monster[]>([]);

  useEffect(() => {
    if (currentTrainer && currentTrainer.monsterIds.length > 0) {
      db.monsters.bulkGet(currentTrainer.monsterIds).then((monsters) => {
        setTrainerMonsters(monsters.filter((m): m is Monster => m !== undefined));
      });
    } else {
      setTrainerMonsters([]);
    }
  }, [currentTrainer]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-6">
      {/* 标题区域 */}
      <div className="text-center mb-4">
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
        <div className="pixel-border rounded-2xl p-4 bg-gray-800/70 w-full max-w-xs flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
            style={{ backgroundColor: TRAINER_AVATARS[currentTrainer.avatar]?.color + '30' }}
          >
            {TRAINER_AVATARS[currentTrainer.avatar]?.emoji || '❓'}
          </div>
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
          className="pixel-border rounded-2xl p-4 bg-gray-800/70 w-full max-w-xs text-center hover:bg-gray-700/70 transition-colors"
        >
          <p className="text-gray-400">还没有训练师</p>
          <p className="text-yellow-300 font-bold">点击创建 →</p>
        </Link>
      )}

      {/* 装饰分割线 */}
      <div className="flex gap-1 mb-2">
        {Array.from({ length: 11 }).map((_, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'][i % 5] }}
          />
        ))}
      </div>

      {/* 菜单按钮 */}
      <div className="flex flex-col gap-4 w-full max-w-xs">
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
              transition-all duration-150
              active:scale-95 active:translate-y-0.5
              shadow-lg
            `}
          >
            <span className="text-2xl">{item.emoji}</span>
            <span>{item.label.replace(item.emoji + ' ', '')}</span>
          </Link>
        ))}
      </div>

      {/* 快捷宝可梦预览 */}
      {trainerMonsters.length > 0 && (
        <div className="w-full max-w-xs">
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
      <p className="text-sm text-gray-500 mt-6">
        👆 点击按钮开始游戏吧！
      </p>
    </div>
  );
}
