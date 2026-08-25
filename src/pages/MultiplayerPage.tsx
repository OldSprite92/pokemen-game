import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import VoiceTextInput from '../components/VoiceTextInput';
import TrainerAvatar from '../components/TrainerAvatar';
import { db } from '../db/database';
import { useMultiplayer } from '../hooks/useMultiplayer';
import { useGameStore } from '../stores/gameStore';
import type { Monster } from '../types';

export default function MultiplayerPage() {
  const navigate = useNavigate();
  const currentTrainer = useGameStore((state) => state.currentTrainer);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [selectedMonsterIds, setSelectedMonsterIds] = useState<number[]>([]);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [serverInput, setServerInput] = useState('');
  const [showManualAddress, setShowManualAddress] = useState(false);
  const [view, setView] = useState<'menu' | 'create' | 'join' | 'room'>('menu');
  const [selectedMode, setSelectedMode] = useState<'pvp' | 'coop'>('pvp');
  const mp = useMultiplayer();

  useEffect(() => {
    setServerInput(mp.serverUrl);
  }, [mp.serverUrl]);

  useEffect(() => {
    if (currentTrainer && currentTrainer.monsterIds.length > 0) {
      db.monsters.bulkGet(currentTrainer.monsterIds).then((ms) => {
        setMonsters(
          ms.filter((m): m is Monster => m !== undefined && m.trainerId === currentTrainer.id)
        );
      });
    } else {
      setMonsters([]);
    }
  }, [currentTrainer]);

  useEffect(() => {
    if (mp.gameState === 'playing') {
      if (mp.mode === 'coop') {
        if (mp.continentId) navigate(`/map/${mp.continentId}`);
      } else {
        navigate('/team-battle');
      }
    }
  }, [mp.gameState, mp.mode, mp.continentId, navigate]);

  const connectServer = async (url = serverInput) => {
    const normalized = mp.setServerUrl(url);
    if (!normalized) return false;
    return mp.connect(normalized);
  };

  const handleCreateRoom = async () => {
    if (!currentTrainer) return;
    const created = await mp.createRoom(currentTrainer.name, currentTrainer.avatar, selectedMode);
    if (created) setView('room');
  };

  const handleJoinRoom = async () => {
    if (!currentTrainer || !joinRoomId.trim()) return;
    if (serverInput.trim()) mp.setServerUrl(serverInput);
    const joined = await mp.joinRoom(joinRoomId.trim(), currentTrainer.name, currentTrainer.avatar);
    if (joined) setView('room');
  };

  const handleFindHost = async () => {
    setShowManualAddress(false);
    await mp.scanHosts();
  };

  const handleReady = () => {
    if (mp.roomId) mp.ready(mp.roomId, selectedMonsterIds);
  };

  const handleUnready = () => {
    if (mp.roomId) mp.unready(mp.roomId);
  };

  const handleLeave = () => {
    if (!mp.roomId) return;
    mp.leaveRoom(mp.roomId);
    setView('menu');
  };

  const toggleMonster = (id: number) => {
    setSelectedMonsterIds((prev) =>
      prev.includes(id) ? prev.filter((monsterId) => monsterId !== id) : [...prev, id]
    );
  };

  const ServerPanel = ({ compact = false }: { compact?: boolean }) => (
    <div className={`pixel-border rounded-xl bg-gray-900/70 ${compact ? 'p-3' : 'p-4'} w-full max-w-xl`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-yellow-200">家庭房主</p>
          <p className="text-xs text-gray-400">
            一台手机或平板创建房间，其他设备加入。
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${mp.connected ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'}`}>
          {mp.connected ? '已连接' : '未连接'}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <VoiceTextInput
          type="text"
          value={serverInput}
          onChangeText={setServerInput}
          voiceTransform={(value) => value.replace(/\s/g, '').replace(/：/g, ':')}
          placeholder="房主地址，例如：192.168.1.23:3001"
          wrapperClassName="w-full"
          className="w-full rounded-lg border-2 border-blue-400/40 bg-gray-800 px-3 py-2 text-sm text-white"
        />
        <button
          onClick={() => connectServer()}
          disabled={mp.isConnecting || !serverInput.trim()}
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50"
        >
          {mp.isConnecting ? '连接中' : '连接'}
        </button>
        <button
          onClick={() => mp.scanHosts()}
          disabled={mp.isScanning}
          className="rounded-lg bg-purple-500 px-4 py-2 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50"
        >
          {mp.isScanning ? '寻找中' : '自动寻找房主'}
        </button>
      </div>

      {mp.discoveredHosts.length > 0 && (
        <div className="mt-3 grid gap-2">
          {mp.discoveredHosts.map((host) => (
            <button
              key={host.url}
              onClick={() => {
                setServerInput(host.url);
                void connectServer(host.url);
              }}
              className="rounded-lg bg-green-600 px-3 py-2 text-left text-sm font-bold text-white transition-all active:scale-95"
            >
              找到房主：{host.ip}（{host.latency}ms）
            </button>
          ))}
        </div>
      )}

      {!compact && (
        <p className="mt-3 text-xs text-gray-500">
          提示：所有设备连接同一个 WiFi。房主先点“创建房间”，加入方再点“自动寻找房主”。
        </p>
      )}
    </div>
  );

  if (view === 'menu') {
    return (
      <div className="multiplayer-page flex flex-col min-h-[100dvh] p-4 gap-4">
        <div className="page-topbar sticky top-0 z-40 flex items-center justify-between">
          <Link to="/" className="text-blue-400 hover:text-blue-300 text-lg font-bold">
            ← 返回
          </Link>
          <h1 className="text-xl font-bold text-yellow-300 pixel-title">🌐 家庭联机</h1>
          <div className="w-12" />
        </div>

        {!currentTrainer ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-xl text-gray-400">先创建训练师才能联机</p>
            <Link to="/trainer" className="bg-purple-500 text-white px-6 py-3 rounded-xl font-bold">
              创建训练师
            </Link>
          </div>
        ) : monsters.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-xl text-gray-400">先创造宝可梦才能对战</p>
            <Link to="/create" className="bg-red-500 text-white px-6 py-3 rounded-xl font-bold">
              创造宝可梦
            </Link>
          </div>
        ) : (
          <div className="multiplayer-workspace flex-1 flex flex-col items-center justify-center gap-5 min-h-0 overflow-y-auto">
            <div className="text-6xl">🌐</div>
            <h2 className="text-2xl font-bold text-yellow-300 pixel-title text-center">
              家庭联机冒险
            </h2>
            <p className="text-lg text-gray-300 text-center">
              不用电脑，一台设备当房主
            </p>

            <div className="flex flex-col gap-4 w-full max-w-sm">
              <button
                onClick={() => setView('create')}
                disabled={mp.isConnecting}
                className="bg-green-500 text-white text-xl font-bold py-4 rounded-xl hover:bg-green-400 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🏠 创建房间
              </button>
              <button
                onClick={() => setView('join')}
                disabled={mp.isConnecting}
                className="bg-blue-500 text-white text-xl font-bold py-4 rounded-xl hover:bg-blue-400 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🔑 加入房间
              </button>
            </div>
          </div>
        )}

        {mp.error && (
          <div className="pixel-border rounded-xl p-3 bg-red-900/30 text-center">
            <p className="text-red-300 text-sm">{mp.error}</p>
            <button onClick={mp.clearError} className="text-sm text-gray-400 mt-1">
              关闭
            </button>
          </div>
        )}
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="multiplayer-page flex flex-col min-h-[100dvh] p-4 gap-4">
        <div className="page-topbar sticky top-0 z-40 flex items-center justify-between">
          <button onClick={() => setView('menu')} className="text-blue-400 hover:text-blue-300 text-lg font-bold">
            ← 返回
          </button>
          <h1 className="text-xl font-bold text-yellow-300 pixel-title">🏠 创建房间</h1>
          <div className="w-12" />
        </div>

        <div className="multiplayer-workspace flex-1 flex flex-col items-center justify-center gap-5 min-h-0 overflow-y-auto">
          <div className="text-5xl">🏠</div>
          <p className="max-w-sm text-center text-sm text-green-200">
            点创建后，这台设备会自动当房主。其他设备输入房间号加入就可以了。
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
              <p className="text-sm text-gray-400">一起闯大陆，群殴 Boss</p>
            </button>
          </div>

          <button
            onClick={handleCreateRoom}
            disabled={mp.isConnecting}
            className="bg-green-500 text-white text-xl font-bold py-4 px-8 rounded-xl hover:bg-green-400 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mp.isConnecting ? '正在开房...' : '✅ 创建房间'}
          </button>

          {mp.error && (
            <div className="pixel-border rounded-xl p-3 bg-red-900/30 text-center max-w-sm">
              <p className="text-red-300 text-sm">{mp.error}</p>
              <button onClick={mp.clearError} className="text-sm text-gray-400 mt-1">
                关闭
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'join') {
    return (
      <div className="multiplayer-page flex flex-col min-h-[100dvh] p-4 gap-4">
        <div className="page-topbar sticky top-0 z-40 flex items-center justify-between">
          <button onClick={() => setView('menu')} className="text-blue-400 hover:text-blue-300 text-lg font-bold">
            ← 返回
          </button>
          <h1 className="text-xl font-bold text-yellow-300 pixel-title">🔑 加入房间</h1>
          <div className="w-12" />
        </div>

        <div className="multiplayer-workspace flex-1 flex flex-col items-center justify-center gap-5 min-h-0 overflow-y-auto">
          <div className="text-5xl">🔑</div>
          <button
            onClick={handleFindHost}
            disabled={mp.isScanning}
            className="w-full max-w-sm rounded-xl bg-purple-500 px-6 py-4 text-lg font-bold text-white transition-all active:scale-95 disabled:opacity-50"
          >
            {mp.isScanning ? '正在寻找房主...' : '自动寻找房主'}
          </button>
          {mp.discoveredHosts.length > 0 && (
            <div className="w-full max-w-sm rounded-xl border border-green-400/40 bg-green-500/10 px-4 py-3 text-center">
              <p className="text-sm font-bold text-green-200">已经找到房主，现在输入房间号就可以加入。</p>
            </div>
          )}
          <p className="text-lg text-gray-300 text-center">
            输入房主告诉你的房间号
          </p>
          <VoiceTextInput
            type="text"
            value={joinRoomId}
            onChangeText={(value) => setJoinRoomId(value.toUpperCase())}
            voiceTransform={(value) => value.replace(/\s/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6)}
            placeholder="房间号"
            wrapperClassName="w-full max-w-xs"
            className="bg-gray-800 border-2 border-yellow-400/50 rounded-xl px-6 py-4 text-white text-2xl font-bold text-center w-full max-w-xs uppercase"
            maxLength={6}
          />
          <button
            onClick={handleJoinRoom}
            disabled={!joinRoomId.trim() || mp.isConnecting || !mp.serverUrl}
            className={`text-xl font-bold py-4 px-8 rounded-xl transition-all ${
              joinRoomId.trim() && !mp.isConnecting
                ? 'bg-blue-500 text-white hover:bg-blue-400 active:scale-95'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            {mp.isConnecting ? '正在加入...' : '🔑 加入'}
          </button>

          <button
            onClick={() => setShowManualAddress((value) => !value)}
            className="text-sm font-bold text-gray-400 underline underline-offset-4"
          >
            {showManualAddress ? '收起备用连接方式' : '没有找到房主？'}
          </button>

          {showManualAddress && (
            <div className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-900/70 p-3">
              <p className="mb-2 text-sm text-gray-300">请让大人输入房主设备显示的地址。</p>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <VoiceTextInput
                  type="text"
                  value={serverInput}
                  onChangeText={setServerInput}
                  voiceTransform={(value) => value.replace(/\s/g, '').replace(/，/g, ':')}
                  placeholder="例如：192.168.1.23:3001"
                  wrapperClassName="w-full"
                  className="w-full rounded-lg border border-blue-400/40 bg-gray-800 px-3 py-2 text-sm text-white"
                />
                <button
                  onClick={() => connectServer()}
                  disabled={mp.isConnecting || !serverInput.trim()}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50"
                >
                  {mp.isConnecting ? '连接中' : '连接'}
                </button>
              </div>
            </div>
          )}

          {mp.error && (
            <div className="pixel-border rounded-xl p-3 bg-red-900/30 text-center max-w-sm">
              <p className="text-red-300 text-sm">{mp.error}</p>
              <button onClick={mp.clearError} className="text-sm text-gray-400 mt-1">
                关闭
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const me = mp.players.find((player) => player.id === mp.socketId);
  const isReady = me?.isReady || false;

  return (
    <div className="multiplayer-page flex flex-col min-h-[100dvh] p-4 gap-4">
      <div className="page-topbar sticky top-0 z-40 flex items-center justify-between">
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
        {mp.isHost && mp.serverUrl && (
          <details className="mt-3 text-left text-xs text-gray-400">
            <summary className="cursor-pointer text-center text-blue-200">自动寻找失败？给大人看备用地址</summary>
            <p className="mt-2 break-all text-blue-100">{mp.serverUrl}</p>
          </details>
        )}
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
            <TrainerAvatar
              avatar={player.avatar}
              className="w-10 h-10 rounded-lg"
              imageClassName="w-full h-full object-cover rounded-lg"
              emojiClassName="text-2xl"
            />
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
            ⏳ 取消准备
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
