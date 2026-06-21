import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface RoomPlayer {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  monsterIds: number[];
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
}

const SERVER_URL = 'http://localhost:3001';

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
  });

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setState((prev) => ({ ...prev, connected: true, error: null }));
    });

    socket.on('disconnect', () => {
      setState((prev) => ({ ...prev, connected: false, gameState: 'idle' }));
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

    // 组队模式事件
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

    socket.on('team-battle-result', (data: { playerId: string; won: boolean; damage: number; exp: number }) => {
      // 战斗结果处理，可以在这里显示提示
      console.log('战斗结果:', data);
    });

    socket.on('error', (data: { message: string }) => {
      setState((prev) => ({ ...prev, error: data.message }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback((playerName: string, avatar: string, mode: 'pvp' | 'coop' = 'pvp') => {
    socketRef.current?.emit('create-room', { playerName, avatar, mode });
  }, []);

  const joinRoom = useCallback((roomId: string, playerName: string, avatar: string) => {
    socketRef.current?.emit('join-room', { roomId, playerName, avatar });
  }, []);

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
    setState({
      connected: state.connected,
      roomId: null,
      players: [],
      isHost: false,
      gameState: 'idle',
      mode: null,
      continentId: null,
      playerPositions: {},
      teamBattle: null,
      error: null,
    });
  }, [state.connected]);

  const sendBattleAction = useCallback((roomId: string, action: string, skillIndex?: number) => {
    socketRef.current?.emit('battle-action', { roomId, action, skillIndex });
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearTeamBattle = useCallback(() => {
    setState((prev) => ({ ...prev, teamBattle: null }));
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
  };
}
