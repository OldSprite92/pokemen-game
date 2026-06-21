import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/database';
import { useGameStore } from '../stores/gameStore';
import { ELEMENT_CONFIG } from '../components/create/StepElement';
import { AVATAR_OPTIONS } from '../components/create/StepAvatar';
import type { Monster } from '../types';

/** 生成一个简单的野生宝可梦（用于测试对战） */
function createWildMonster(): Monster {
  const wildNames = ['小火苗', '水滴怪', '草叶虫', '闪电鼠', '冰块精'];
  const wildElements = ['fire', 'water', 'grass', 'electric', 'ice'] as const;
  const wildAvatars = ['bird', 'fish', 'frog', 'mouse', 'rabbit'];

  const index = Math.floor(Math.random() * wildNames.length);
  const element = wildElements[index];

  return {
    name: wildNames[index],
    element,
    skills: [
      {
        id: `wild-skill-1`,
        name: `${ELEMENT_CONFIG[element]?.label}攻击`,
        element,
        power: 20,
        accuracy: 95,
        description: `使用${ELEMENT_CONFIG[element]?.label}属性攻击`,
      },
      {
        id: `wild-skill-2`,
        name: '猛撞',
        element: 'normal',
        power: 15,
        accuracy: 100,
        description: '用身体撞击对手',
      },
    ],
    avatar: wildAvatars[index],
    hp: 70 + Math.floor(Math.random() * 21), // 70-90
    attack: 60 + Math.floor(Math.random() * 21),
    defense: 55 + Math.floor(Math.random() * 21),
    speed: 50 + Math.floor(Math.random() * 31),
    level: 1 + Math.floor(Math.random() * 3),
    exp: 0,
    createdBy: 'system',
    createdAt: new Date(),
  };
}

export default function BattleSelectPage() {
  const navigate = useNavigate();
  const { startBattleExtended } = useGameStore();
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.monsters.toArray().then((list) => {
      setMonsters(list);
      setLoading(false);
    });
  }, []);

  const handleStartBattle = () => {
    if (!selectedMonster) return;
    const wildMonster = createWildMonster();
    startBattleExtended(selectedMonster, wildMonster);
    navigate('/battle');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl text-gray-300">加载中...</p>
      </div>
    );
  }

  if (monsters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-6">
        <div className="text-6xl">🥚</div>
        <h2 className="text-2xl font-bold text-yellow-300">还没有宝可梦！</h2>
        <p className="text-lg text-gray-300">先创造一只宝可梦再来对战吧！</p>
        <button
          onClick={() => navigate('/create')}
          className="bg-yellow-500 text-gray-900 px-6 py-3 rounded-xl font-bold text-lg hover:bg-yellow-400 active:scale-95 transition-all"
        >
          🎨 去创造宝可梦
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen p-4 gap-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="text-blue-400 hover:text-blue-300 text-lg font-bold"
        >
          ← 返回
        </button>
        <h1 className="text-xl font-bold text-yellow-300 pixel-title">⚔️ 选择对战</h1>
        <div className="w-12" />
      </div>

      <p className="text-center text-lg text-gray-300">选择你的宝可梦去战斗！</p>

      {/* 宝可梦列表 */}
      <div className="flex flex-col gap-3">
        {monsters.map((monster) => {
          const avatar = AVATAR_OPTIONS.find((a) => a.id === monster.avatar);
          const element = ELEMENT_CONFIG[monster.element];
          const isSelected = selectedMonster?.id === monster.id;

          return (
            <button
              key={monster.id}
              onClick={() => setSelectedMonster(monster)}
              className={`
                flex items-center gap-4 p-4 rounded-xl
                transition-all duration-200 active:scale-95
                ${isSelected
                  ? 'bg-yellow-500/20 border-2 border-yellow-400 shadow-lg'
                  : 'bg-gray-800/70 border-2 border-transparent hover:bg-gray-700'
                }
              `}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: avatar?.bg || '#1f2937' }}
              >
                {avatar?.emoji || '❓'}
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">{monster.name}</span>
                  <span className="text-sm" style={{ color: element?.color }}>
                    {element?.emoji} {element?.label}
                  </span>
                </div>
                <p className="text-sm text-gray-400">
                  Lv.{monster.level} | HP {monster.hp} | 攻击 {monster.attack} | 速度 {monster.speed}
                </p>
              </div>
              {isSelected && <span className="text-2xl">✅</span>}
            </button>
          );
        })}
      </div>

      {/* 开始战斗按钮 */}
      <button
        onClick={handleStartBattle}
        disabled={!selectedMonster}
        className={`
          mt-4 py-4 rounded-xl font-bold text-xl transition-all
          ${selectedMonster
            ? 'bg-red-500 text-white hover:bg-red-400 active:scale-95 shadow-lg'
            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          }
        `}
      >
        ⚔️ 开始战斗！
      </button>
    </div>
  );
}
