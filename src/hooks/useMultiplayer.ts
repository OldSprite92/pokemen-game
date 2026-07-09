import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface RoomPlayer {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  monsterIds: number[];
}

export interface DiscoveredHost {
  ip: string;
  url: string;
  latency: number;
}

export interface NetworkState {
  connected: boolean;
  roomId: string | null;
  players: RoomPlayer[];
  isHost: boolean;
  gameState: 'idle' | 'waiting' | 'playing' | 'ended';
  mode: 'pvp' | 'coop' | null;
  continentId: string | null;
  playerPositions: Record<string, { x: number; y: number }>;
  teamBattle: { monsterName: string; monsterLevel: number; initiatorId: string } | null;
  error: string | null;
  serverUrl: string;
  discoveredHosts: DiscoveredHost[];
  isScanning: boolean;
  isConnecting: boolean;
}

function getDefaultServerUrl(): string {
  if (typeof window === 'undefined') return 'http://127.0.0.1:3001';
  const host = window.location.hostname;
  if (!host || host === 'localhost' || host.startsWith('127.')) {
    return 'http://127.0.0.1:3001';
  }
  return `http://${host}:3001`;
}

/** 获取本机局域网IP前缀 */
function getLanIpPrefix(): string {
  // 尝试从 window.location 获取
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host && host !== 'localhost' && !host.startsWith('127.')) {
      const parts = host.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}`;
      }
    }
  }
  // 默认常见的局域网前缀
  return '192.168.1';
}

/** 扫描局域网寻找服务器 */
async function scanLanHosts(port: number = 3001, timeout: number = 2000): Promise<DiscoveredHost[]> {
  const prefix = getLanIpPrefix();
  const hosts: DiscoveredHost[] = [];
  
  // 扫描 .1 到 .254
  const promises = [];
  for (let i = 1; i <= 254; i++) {
    const ip = `${prefix}.${i}`;
    const url = `http://${ip}:${port}`;
    
    promises.push(
      new Promise<void>((resolve) => {
        const startTime = Date.now();
        fetch(`${url}/socket.io/?EIO=4&transport=polling`, { 
          mode: 'no-cors',
          signal: AbortSignal.timeout(timeout)
        })
          .then(() => {
            hosts.push({
              ip,
              url,
              latency: Date.now() - startTime,
            });
          })
          .catch(() => {})
          .finally(() => resolve());
      })
    );
  }
  
  // 等待所有扫描完成（或超时）
  await Promise.all(promises);
  
  // 按延迟排序
  return hosts.sort((a, b) => a.latency - b.latency);
}

export function useMultiplayer() {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<NetworkState>({
    connected: false,
    roomId: null,
    players: [],
    isHost: false,
    gameState: 'idle',
    mode: null,
    continentId: null,
    playerPositions: {},
    teamBattle: null,
    error: null,
    serverUrl: '',
    discoveredHosts: [],
    isScanning: false,
    isConnecting: false,
  });

  /** 扫描局域网 */
  const scanHosts = useCallback(async () => {
    setState((prev) => ({ ...prev, isScanning: true, discoveredHosts: [] }));
    try {
      const hosts = await scanLanHosts();
      setState((prev) => ({ ...prev, discoveredHosts: hosts, isScanning: false }));
      return hosts;
    } catch (err) {
      setState((prev) => ({ ...prev, isScanning: false }));
      return [];
    }
  }, []);

  /** 连接到服务器 */
  const connect = useCallback((url: string = getDefaultServerUrl()): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!url) {
        setState((prev) => ({ ...prev, error: '请输入服务器地址' }));
        resolve(false);
        return;
      }

      if (socketRef.current?.connected) {
        resolve(true);
        return;
      }

      setState((prev) => ({ ...prev, isConnecting: true, error: null }));

      // 断开之前的连接
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const socket = io(url, {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        reconnection: false,
      });
      socketRef.current = socket;

      socket.once('connect', () => {
        setState((prev) => ({ ...prev, connected: true, isConnecting: false, error: null, serverUrl: url }));
        resolve(true);
      });

      socket.once('connect_error', (err) => {
        console.error('连接失败:', err);
        setState((prev) => ({ 
          ...prev, 
          connected: false,
          isConnecting: false,
          error: `连接失败：请先在房主设备启动联机服务器（${url}）` 
        }));
        resolve(false);
      });

      socket.on('disconnect', () => {
        setState((prev) => ({ ...prev, connected: false, isConnecting: false, gameState: 'idle' }));
      });

    socket.on('room-created', (data: { roomId: string; player: RoomPlayer; mode: 'pvp' | 'coop' }) => {
      setState((prev) => ({
        ...prev,
        roomId: data.roomId,
        isHost: true,
        gameState: 'waiting',
        mode: data.mode,
        players: [data.player],
        error: null,
      }));
    });

    socket.on('room-joined', (data: { roomId: string; player: RoomPlayer; mode: 'pvp' | 'coop' }) => {
      setState((prev) => ({
        ...prev,
        roomId: data.roomId,
        isHost: false,
        gameState: 'waiting',
        mode: data.mode,
        error: null,
      }));
    });

    socket.on('player-joined', (data: { players: RoomPlayer[] }) => {
      setState((prev) => ({ ...prev, players: data.players }));
    });

    socket.on('player-left', (data: { playerId: string; players: RoomPlayer[] }) => {
      setState((prev) => ({ ...prev, players: data.players }));
    });

    socket.on('player-ready', (data: { playerId: string; players: RoomPlayer[] }) => {
      setState((prev) => ({ ...prev, players: data.players }));
    });

    socket.on('player-unready', (data: { playerId: string; players: RoomPlayer[] }) => {
      setState((prev) => ({ ...prev, players: data.players }));
    });

    socket.on('game-start', (data: { players: RoomPlayer[]; mode: 'pvp' | 'coop'; continentId?: string }) => {
      setState((prev) => ({
        ...prev,
        gameState: 'playing',
        players: data.players,
        mode: data.mode,
        continentId: data.continentId || null,
      }));
    });

    socket.on('continent-selected', (data: { continentId: string }) => {
      setState((prev) => ({ ...prev, continentId: data.continentId }));
    });

    socket.on('player-moved', (data: { playerId: string; position: { x: number; y: number } }) => {
      setState((prev) => ({
        ...prev,
        playerPositions: { ...prev.playerPositions, [data.playerId]: data.position },
      }));
    });

    socket.on('team-battle', (data: { monsterName: string; monsterLevel: number; initiatorId: string }) => {
      setState((prev) => ({
        ...prev,
        teamBattle: {
          monsterName: data.monsterName,
          monsterLevel: data.monsterLevel,
          initiatorId: data.initiatorId,
        },
      }));
    });

    socket.on('error', (data: { message: string }) => {
      setState((prev) => ({ ...prev, error: data.message }));
    });
    });
  }, []);

  const createRoom = useCallback(async (playerName: string, avatar: string, mode: 'pvp' | 'coop' = 'pvp') => {
    const connected = socketRef.current?.connected || await connect(getDefaultServerUrl());
    if (!connected) return false;
    socketRef.current?.emit('create-room', { playerName, avatar, mode });
    return true;
  }, [connect]);

  const joinRoom = useCallback(async (roomId: string, playerName: string, avatar: string) => {
    const connected = socketRef.current?.connected || await connect(getDefaultServerUrl());
    if (!connected) return false;
    socketRef.current?.emit('join-room', { roomId, playerName, avatar });
    return true;
  }, [connect]);

  const selectContinent = useCallback((roomId: string, continentId: string) => {
    socketRef.current?.emit('select-continent', { roomId, continentId });
  }, []);

  const sendPlayerMove = useCallback((roomId: string, position: { x: number; y: number }) => {
    socketRef.current?.emit('player-move', { roomId, position });
  }, []);

  const sendEncounter = useCallback((roomId: string, monsterName: string, monsterLevel: number) => {
    socketRef.current?.emit('encounter-battle', { roomId, monsterName, monsterLevel });
  }, []);

  const sendBattleResult = useCallback((roomId: string, won: boolean, damage: number, exp: number) => {
    socketRef.current?.emit('battle-result', { roomId, won, damage, exp });
  }, []);

  const ready = useCallback((roomId: string, monsterIds: number[]) => {
    socketRef.current?.emit('player-ready', { roomId, monsterIds });
  }, []);

  const unready = useCallback((roomId: string) => {
    socketRef.current?.emit('player-unready', { roomId });
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('leave-room', { roomId });
    setState((prev) => ({
      ...prev,
      roomId: null,
      players: [],
      isHost: false,
      gameState: 'idle',
      mode: null,
      continentId: null,
      playerPositions: {},
      teamBattle: null,
      error: null,
    }));
  }, []);

  const sendBattleAction = useCallback((roomId: string, action: string, skillIndex?: number) => {
    socketRef.current?.emit('battle-action', { roomId, action, skillIndex });
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearTeamBattle = useCallback(() => {
    setState((prev) => ({ ...prev, teamBattle: null }));
  }, []);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return {
    ...state,
    createRoom,
    joinRoom,
    selectContinent,
    sendPlayerMove,
    sendEncounter,
    sendBattleResult,
    ready,
    unready,
    leaveRoom,
    sendBattleAction,
    clearError,
    clearTeamBattle,
    connect,
    scanHosts,
  };
}
