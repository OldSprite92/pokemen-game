import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMultiplayer } from '../hooks/useMultiplayer';
import { useGameStore } from '../stores/gameStore';
import { db } from '../db/database';
import { TRAINER_AVATARS } from './TrainerPage';
import type { Monster } from '../types';

export default function MultiplayerPage() {
  const navigate = useNavigate();
  const currentTrainer = useGameStore((state) => state.currentTrainer);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [selectedMonsterIds, setSelectedMonsterIds] = useState<number[]>([]);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [view, setView] = useState<'menu' | 'create' | 'join' | 'room'>('menu');
  const [selectedMode, setSelectedMode] = useState<'pvp' | 'coop'>('pvp');

  const mp = useMultiplayer();

  useEffect(() => {
    if (currentTrainer && currentTrainer.monsterIds.length > 0) {
      db.monsters.bulkGet(currentTrainer.monsterIds).then((ms) => {
        setMonsters(ms.filter((m): m is Monster => m !== undefined));
      });
    }
  }, [currentTrainer]);

  useEffect(() => {
    if (mp.gameState === 'playing') {
      if (mp.mode === 'coop') {
        if (mp.continentId) {
          navigate(`/map/${mp.continentId}`);
        }
      } else {
        navigate('/battle');
      }
    }
  }, [mp.gameState, mp.mode, mp.continentId, navigate]);

  const handleCreateRoom = () => {
    if (!currentTrainer) return;
    mp.createRoom(currentTrainer.name, currentTrainer.avatar, selectedMode);
    setView('room');
  };

  const handleJoinRoom = () => {
    if (!currentTrainer || !joinRoomId.trim()) return;
    mp.joinRoom(joinRoomId.trim(), currentTrainer.name, currentTrainer.avatar);
    setView('room');
  };

  const handleReady = () => {
    if (!mp.roomId) return;
    mp.ready(mp.roomId, selectedMonsterIds);
  };

  const handleUnready = () => {
    if (!mp.roomId) return;
    mp.unready(mp.roomId);
  };

  const handleLeave = () => {
    if (!mp.roomId) return;
    mp.leaveRoom(mp.roomId);
    setView('menu');
  };

  const toggleMonster = (id: number) => {
    setSelectedMonsterIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const getAvatarEmoji = (avatarId: string) => {
    return TRAINER_AVATARS[avatarId]?.emoji || '❓';
  };

  if (view === 'menu') {
    return (
      <div className="flex flex-col min-h-screen p-4 gap-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-blue-400 hover:text-blue-300 text-lg font-bold">
            ← 返回
          </Link>
          <h1 className="text-xl font-bold text-yellow-300 pixel-title">🌐 联机对战</h1>
          <div className="w-12" />
        </div>

        {!mp.connected && (
          <div className="pixel-border rounded-xl p-4 bg-red-900/30 text-center">
            <p className="text-red-300">⚠️ 未连接到服务器</p>
            <p className="text-sm text-gray-400">请确保服务器已启动: npm run server</p>
          </div>
        )}

        {!currentTrainer ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-xl text-gray-400">先创建训练师才能联机</p>
            <Link to="/trainer" className="bg-purple-500 text-white px-6 py-3 rounded-xl font-bold">
              🧑‍🎤 创建训练师
            </Link>
          </div>
        ) : monsters.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-xl text-gray-400">先创造宝可梦才能对战</p>
            <Link to="/create" className="bg-red-500 text-white px-6 py-3 rounded-xl font-bold">
              🎨 创造宝可梦
            </Link>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="text-6xl">🌐</div>
            <h2 className="text-2xl font-bold text-yellow-300 pixel-title text-center">
              家庭联机对战
            </h2>
            <p className="text-lg text-gray-300 text-center">
              一家三口一起玩！创建或加入房间
            </p>

            <div className="flex flex-col gap-4 w-full max-w-sm">
              <button
                onClick={() => setView('create')}
                disabled={!mp.connected}
                className="bg-green-500 text-white text-xl font-bold py-4 rounded-xl hover:bg-green-400 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🏠 创建房间
              </button>
              <button
                onClick={() => setView('join')}
                disabled={!mp.connected}
                className="bg-blue-500 text-white text-xl font-bold py-4 rounded-xl hover:bg-blue-400 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🔑 加入房间
              </button>
            </div>

            <p className="text-sm text-gray-500">
              💡 提示：所有设备需要在同一个WiFi下
            </p>
          </div>
        )}
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="flex flex-col min-h-screen p-4 gap-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setView('menu')} className="text-blue-400 hover:text-blue-300 text-lg font-bold">
            ← 返回
          </button>
          <h1 className="text-xl font-bold text-yellow-300 pixel-title">🏠 创建房间</h1>
          <div className="w-12" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="text-6xl">🏠</div>
          <p className="text-lg text-gray-300 text-center">
            选择游戏模式，创建房间后告诉家人房间号
          </p>

          <div className="flex flex-col gap-3 w-full max-w-sm">
            <p className="text-sm text-gray-400">选择游戏模式：</p>
            <button
              onClick={() => setSelectedMode('pvp')}
              className={`p-4 rounded-xl text-left transition-all ${
                selectedMode === 'pvp'
                  ? 'bg-yellow-500/20 border-2 border-yellow-400'
                  : 'bg-gray-800 border-2 border-gray-700'
              }`}
            >
              <p className="text-lg font-bold text-white">⚔️ 对战模式</p>
              <p className="text-sm text-gray-400">玩家之间互相战斗</p>
            </button>
            <button
              onClick={() => setSelectedMode('coop')}
              className={`p-4 rounded-xl text-left transition-all ${
                selectedMode === 'coop'
                  ? 'bg-yellow-500/20 border-2 border-yellow-400'
                  : 'bg-gray-800 border-2 border-gray-700'
              }`}
            >
              <p className="text-lg font-bold text-white">🤝 组队模式</p>
              <p className="text-sm text-gray-400">一起闯大陆，群殴Boss</p>
            </button>
          </div>

          <button
            onClick={handleCreateRoom}
            className="bg-green-500 text-white text-xl font-bold py-4 px-8 rounded-xl hover:bg-green-400 active:scale-95 transition-all"
          >
            ✅ 创建房间
          </button>
        </div>
      </div>
    );
  }

  if (view === 'join') {
    return (
      <div className="flex flex-col min-h-screen p-4 gap-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setView('menu')} className="text-blue-400 hover:text-blue-300 text-lg font-bold">
            ← 返回
          </button>
          <h1 className="text-xl font-bold text-yellow-300 pixel-title">🔑 加入房间</h1>
          <div className="w-12" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="text-6xl">🔑</div>
          <p className="text-lg text-gray-300 text-center">
            输入房主告诉你的房间号
          </p>
          <input
            type="text"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
            placeholder="房间号"
            className="bg-gray-800 border-2 border-yellow-400/50 rounded-xl px-6 py-4 text-white text-2xl font-bold text-center w-full max-w-xs uppercase"
            maxLength={6}
          />
          <button
            onClick={handleJoinRoom}
            disabled={!joinRoomId.trim()}
            className={`text-xl font-bold py-4 px-8 rounded-xl transition-all ${
              joinRoomId.trim()
                ? 'bg-blue-500 text-white hover:bg-blue-400 active:scale-95'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            🔑 加入
          </button>
        </div>
      </div>
    );
  }

  const me = mp.players.find((p) => p.id === (mp as any).socketRef?.current?.id);
  const isReady = me?.isReady || false;

  return (
    <div className="flex flex-col min-h-screen p-4 gap-4">
      <div className="flex items-center justify-between">
        <button onClick={handleLeave} className="text-red-400 hover:text-red-300 text-lg font-bold">
          ← 退出
        </button>
        <h1 className="text-xl font-bold text-yellow-300 pixel-title">🎮 房间</h1>
        <div className="w-12" />
      </div>

      <div className="pixel-border rounded-xl p-4 bg-gray-800/50 text-center">
        <p className="text-sm text-gray-400">房间号</p>
        <p className="text-3xl font-bold text-yellow-300 tracking-widest">{mp.roomId}</p>
        <p className="text-xs text-gray-500 mt-1">
          {mp.mode === 'coop' ? '🤝 组队模式' : '⚔️ 对战模式'} · 告诉家人输入这个房间号
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-gray-400">玩家 ({mp.players.length}/3):</p>
        {mp.players.map((player) => (
          <div
            key={player.id}
            className={`pixel-border rounded-xl p-3 flex items-center gap-3 ${
              player.isReady ? 'bg-green-900/30' : 'bg-gray-800/50'
            }`}
          >
            <span className="text-2xl">{getAvatarEmoji(player.avatar)}</span>
            <div className="flex-1">
              <p className="font-bold text-white">
                {player.name}
                {player.isHost && <span className="text-yellow-400 text-sm ml-2">👑 房主</span>}
              </p>
            </div>
            <span className={`text-sm font-bold ${player.isReady ? 'text-green-400' : 'text-gray-500'}`}>
              {player.isReady ? '✅ 已准备' : '⏳ 等待中'}
            </span>
          </div>
        ))}
      </div>

      {!isReady && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-400">选择出战宝可梦：</p>
          <div className="flex flex-wrap gap-2">
            {monsters.map((monster) => (
              <button
                key={monster.id}
                onClick={() => toggleMonster(monster.id!)}
                className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                  selectedMonsterIds.includes(monster.id!)
                    ? 'bg-yellow-500 text-gray-900'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {monster.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {!isReady ? (
          <button
            onClick={handleReady}
            disabled={selectedMonsterIds.length === 0}
            className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${
              selectedMonsterIds.length > 0
                ? 'bg-green-500 text-white hover:bg-green-400 active:scale-95'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            ✅ 准备
          </button>
        ) : (
          <button
            onClick={handleUnready}
            className="flex-1 py-3 rounded-xl font-bold text-lg bg-yellow-500 text-gray-900 hover:bg-yellow-400 active:scale-95 transition-all"
          >
            ⏸️ 取消准备
          </button>
        )}
      </div>

      {mp.error && (
        <div className="pixel-border rounded-xl p-3 bg-red-900/30 text-center">
          <p className="text-red-300">{mp.error}</p>
          <button onClick={mp.clearError} className="text-sm text-gray-400 mt-1">
            关闭
          </button>
        </div>
      )}
    </div>
  );
}
