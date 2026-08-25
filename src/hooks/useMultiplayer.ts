import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';

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
  mapCalls: Array<{ id: string; playerId: string; playerName: string; type: string; message: string; expiresAt: number }>;
  mapRoles: Record<string, 'clue' | 'supply'>;
  teamBattle: TeamBattleState | null;
  error: string | null;
  serverUrl: string;
  discoveredHosts: DiscoveredHost[];
  isScanning: boolean;
  isConnecting: boolean;
  socketId: string | null;
  canHostOnDevice: boolean;
}

export interface TeamBattleState {
  battleId: string;
  mode: 'coop' | 'pvp';
  phase: 'active' | 'victory' | 'defeat';
  bossName?: string;
  monsterLevel?: number;
  bossLevel?: number;
  bossElement?: string;
  bossElements?: string[];
  bossAvatar?: string;
  bossHp?: number;
  bossMaxHp?: number;
  teamHp?: number;
  teamMaxHp?: number;
  requiredTags?: string[];
  roundDeadlineAt?: number;
  bossIntent?: { kind: 'charge' | 'sweep' | 'status'; emoji: string; label: string; description: string; element?: string };
  synergy?: number;
  teamEnergy?: number;
  rescueAvailable?: boolean;
  round?: number;
  actions?: Record<string, { tag?: string; skillName?: string; monsterName?: string; skillElement?: string; targetId?: string }>;
  bossStatuses?: Array<{ type: string; turnsRemaining: number }>;
  playerStatuses?: Record<string, Array<{ type: string; turnsRemaining: number }>>;
  playerHp?: Record<string, number>;
  scores?: Record<string, number>;
  targetScore?: number;
  winnerId?: string;
  captureAvailable?: boolean;
  capturePhase?: 'calm' | 'throw' | 'complete';
  captureVotes?: Record<string, boolean>;
  lastRound?: {
    round: number;
    totalDamage: number;
    counterDamage: number;
    synergyHit: boolean;
    outcome?: 'victory' | 'defeat';
  };
  log?: string[];
}

interface RoomStatePayload {
  roomId: string;
  players: RoomPlayer[];
  gameState: NetworkState['gameState'];
  mode: NetworkState['mode'];
  continentId?: string | null;
  playerPositions?: Record<string, { x: number; y: number }>;
  mapCalls?: NetworkState['mapCalls'];
  mapRoles?: NetworkState['mapRoles'];
  teamBattle?: TeamBattleState | null;
}

interface StartServerResult {
  ok: boolean;
  url: string;
  ip: string;
  port: number;
  roomId: string;
  playerId: string;
  state: RoomStatePayload;
}

interface MultiplayerServerPlugin {
  start(options: { playerName: string; avatar: string; mode: 'pvp' | 'coop' }): Promise<StartServerResult>;
  stop(): Promise<{ ok: boolean }>;
  status(): Promise<{ running: boolean; url?: string; roomId?: string; playerId?: string; state?: RoomStatePayload }>;
  request(options: { url: string; method: string; body?: string }): Promise<{ ok: boolean; status: number; body: string }>;
  discover(): Promise<{ ok: boolean; hosts: Array<{ ip: string; url: string; roomId?: string }> }>;
}

const NativeMultiplayerServer = registerPlugin<MultiplayerServerPlugin>('MultiplayerServer');
const SERVER_URL_KEY = 'pokemonAdventure.multiplayerServerUrl';
const SESSION_KEY = 'pokemonAdventure.multiplayerSession';
const DEFAULT_PORT = 3001;
const POLL_INTERVAL_MS = 800;

function canHostOnThisDevice(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

function getSavedServerUrl(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(SERVER_URL_KEY) || '';
}

function saveServerUrl(url: string) {
  if (typeof window === 'undefined') return;
  if (url) {
    localStorage.setItem(SERVER_URL_KEY, url);
  } else {
    localStorage.removeItem(SERVER_URL_KEY);
  }
}

function getSavedSession(): { serverUrl: string; roomId: string; playerId: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = sessionStorage.getItem(SESSION_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function saveSession(serverUrl: string, roomId: string, playerId: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ serverUrl, roomId, playerId }));
}

function clearSession() {
  if (typeof window !== 'undefined') sessionStorage.removeItem(SESSION_KEY);
}

function normalizeServerUrl(input: string): string {
  const raw = input.trim();
  if (!raw) return '';
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;

  try {
    const url = new URL(withProtocol);
    if (!url.port) url.port = String(DEFAULT_PORT);
    url.pathname = '';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return withProtocol.replace(/\/$/, '');
  }
}

function getDefaultServerUrl(): string {
  const saved = getSavedServerUrl();
  if (saved) return saved;
  if (typeof window === 'undefined') return '';

  const host = window.location.hostname;
  if (!host || host === 'localhost' || host.startsWith('127.')) return '';
  return `http://${host}:${DEFAULT_PORT}`;
}

function getLanPrefixes(): string[] {
  const prefixes = new Set<string>();

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const parts = host?.split('.') ?? [];
    if (parts.length === 4 && !host.startsWith('127.')) {
      prefixes.add(`${parts[0]}.${parts[1]}.${parts[2]}`);
    }
  }

  prefixes.add('192.168.1');
  prefixes.add('192.168.0');
  prefixes.add('192.168.31');
  prefixes.add('10.0.0');

  return Array.from(prefixes);
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  if (canHostOnThisDevice()) {
    const response = await NativeMultiplayerServer.request({
      url,
      method: options?.method || 'GET',
      body: typeof options?.body === 'string' ? options.body : undefined,
    });
    const data = response.body ? JSON.parse(response.body) : {};
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.message || '请求失败：' + response.status);
    }
    return data as T;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok || data?.ok === false) {
    throw new Error(data?.message || `请求失败：${response.status}`);
  }

  return data as T;
}

async function probeHost(url: string, timeout: number): Promise<number | null> {
  const startTime = Date.now();

  try {
    if (canHostOnThisDevice()) {
      const data = await requestJson<{ ok?: boolean; service?: string }>(url + '/health', { method: 'GET' });
      if (!data?.ok || data?.service !== 'pokemon-adventure-mobile-host') return null;
      return Date.now() - startTime;
    }

    const response = await fetch(`${url}/health`, {
      method: 'GET',
      mode: 'cors',
      signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok) return null;
    const data = await response.json().catch(() => null);
    if (!data?.ok || data?.service !== 'pokemon-adventure-mobile-host') return null;
    return Date.now() - startTime;
  } catch {
    return null;
  }
}

async function scanLanHosts(port: number = DEFAULT_PORT, timeout: number = 450): Promise<DiscoveredHost[]> {
  if (canHostOnThisDevice()) {
    const result = await NativeMultiplayerServer.discover();
    return result.hosts.map((host) => ({
      ip: host.ip,
      url: host.url,
      latency: 0,
    }));
  }

  const hosts: DiscoveredHost[] = [];
  const lastOctets = Array.from({ length: 254 }, (_, index) => index + 1);
  const targets = getLanPrefixes().flatMap((prefix) =>
    lastOctets.map((last) => {
      const ip = `${prefix}.${last}`;
      return { ip, url: `http://${ip}:${port}` };
    })
  );

  for (let index = 0; index < targets.length; index += 72) {
    const batch = targets.slice(index, index + 72);
    await Promise.all(batch.map(async (target) => {
      const latency = await probeHost(target.url, timeout);
      if (latency !== null) {
        hosts.push({ ...target, latency });
      }
    }));
    if (hosts.length > 0) break;
  }

  return hosts.sort((a, b) => a.latency - b.latency);
}

function getFriendlyNetworkError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : '';
  if (!message) return fallback;
  if (/failed to fetch|network|timeout/i.test(message)) {
    return '没能找到房主设备。请确认房主已经创建房间，且两台设备连接同一个 WiFi。';
  }
  return message;
}

function initialState(): NetworkState {
  const session = getSavedSession();
  return {
    connected: Boolean(session),
    roomId: session?.roomId ?? null,
    players: [],
    isHost: false,
    gameState: 'idle',
    mode: null,
    continentId: null,
    playerPositions: {},
    mapCalls: [],
    mapRoles: {},
    teamBattle: null,
    error: null,
    serverUrl: session?.serverUrl ?? getDefaultServerUrl(),
    discoveredHosts: [],
    isScanning: false,
    isConnecting: false,
    socketId: session?.playerId ?? null,
    canHostOnDevice: canHostOnThisDevice(),
  };
}

export function useMultiplayer() {
  const [state, setState] = useState<NetworkState>(() => initialState());
  const playerIdRef = useRef<string | null>(getSavedSession()?.playerId ?? null);
  const pollTimerRef = useRef<number | null>(null);

  const applyRoomState = useCallback((payload: RoomStatePayload, playerId = playerIdRef.current) => {
    const me = payload.players.find((player) => player.id === playerId);
    if (payload.gameState === 'ended') {
      // The other player may have tapped exit or closed the app.  A completed room must not
      // strand the remaining player on a multiplayer-only screen.
      const wasHost = state.isHost;
      const hostHasLeft = wasHost && !me;
      playerIdRef.current = null;
      clearSession();
      setState((prev) => ({
        ...prev,
        connected: false,
        roomId: null,
        players: [],
        isHost: false,
        gameState: 'idle',
        mode: null,
        // Keep the last map id so a player who was in a Boss fight can land back in
        // the same map as a normal solo adventure.
        continentId: prev.continentId,
        playerPositions: {},
        mapCalls: [],
        mapRoles: {},
        teamBattle: null,
        socketId: null,
        error: '伙伴已退出联机，已回到单人冒险。',
      }));
      // When the host left, give the other tablet one poll interval to receive the ended state.
      if (wasHost && canHostOnThisDevice()) {
        window.setTimeout(() => {
          void NativeMultiplayerServer.stop().catch(() => undefined);
        }, hostHasLeft ? POLL_INTERVAL_MS + 300 : 0);
      }
      return;
    }
    setState((prev) => ({
      ...prev,
      connected: true,
      roomId: payload.roomId,
      players: payload.players,
      isHost: Boolean(me?.isHost),
      gameState: payload.gameState,
      mode: payload.mode,
      continentId: payload.continentId || null,
      playerPositions: payload.playerPositions || {},
      mapCalls: payload.mapCalls || [],
      mapRoles: payload.mapRoles || {},
      teamBattle: payload.teamBattle || null,
      socketId: playerId || prev.socketId,
      error: null,
    }));
    if (playerId) saveSession(state.serverUrl, payload.roomId, playerId);
  }, [state.isHost, state.serverUrl]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const pollState = useCallback(async () => {
    const { roomId, serverUrl } = state;
    if (!roomId || !serverUrl) return;

    try {
      const payload = await requestJson<RoomStatePayload>(
        `${serverUrl}/state?roomId=${encodeURIComponent(roomId)}`
      );
      applyRoomState(payload);
    } catch {
      setState((prev) => ({
        ...prev,
        connected: false,
        error: '和房主设备的连接断开了，请确认大家还在同一个 WiFi。',
      }));
    }
  }, [applyRoomState, state.roomId, state.serverUrl]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollTimerRef.current = window.setInterval(() => {
      void pollState();
    }, POLL_INTERVAL_MS);
  }, [pollState, stopPolling]);

  useEffect(() => {
    if (state.connected && state.roomId && state.serverUrl) {
      startPolling();
      return stopPolling;
    }
    stopPolling();
    return undefined;
  }, [startPolling, state.connected, state.roomId, state.serverUrl, stopPolling]);

  const setServerUrl = useCallback((url: string) => {
    const normalized = normalizeServerUrl(url);
    saveServerUrl(normalized);
    setState((prev) => ({ ...prev, serverUrl: normalized, error: null }));
    return normalized;
  }, []);

  const scanHosts = useCallback(async () => {
    setState((prev) => ({ ...prev, isScanning: true, discoveredHosts: [], error: null }));
    try {
      const hosts = await scanLanHosts();
      setState((prev) => ({
        ...prev,
        discoveredHosts: hosts,
        serverUrl: hosts[0]?.url ?? prev.serverUrl,
        isScanning: false,
        error: hosts.length === 0 ? '没有找到房主设备。请确认房主已经点了“创建房间”，并且大家在同一个 WiFi。' : null,
      }));
      if (hosts[0]) saveServerUrl(hosts[0].url);
      return hosts;
    } catch {
      setState((prev) => ({
        ...prev,
        isScanning: false,
        error: '寻找房主失败，请手动输入房主设备上显示的地址。',
      }));
      return [];
    }
  }, []);

  const connect = useCallback(async (requestedUrl?: string): Promise<boolean> => {
    const url = normalizeServerUrl(requestedUrl || state.serverUrl || getDefaultServerUrl());
    if (!url) {
      setState((prev) => ({
        ...prev,
        error: '请先输入房主设备地址，或点击“自动寻找房主”。',
      }));
      return false;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null, serverUrl: url }));

    try {
      const latency = await probeHost(url, 1500);
      if (latency === null) throw new Error('not found');
      saveServerUrl(url);
      setState((prev) => ({ ...prev, connected: true, isConnecting: false, serverUrl: url }));
      return true;
    } catch {
      setState((prev) => ({
        ...prev,
        connected: false,
        isConnecting: false,
        error: `连接不到房主设备：${url}。请确认房主已经创建房间，且大家在同一个 WiFi。`,
      }));
      return false;
    }
  }, [state.serverUrl]);

  const createRoom = useCallback(async (playerName: string, avatar: string, mode: 'pvp' | 'coop' = 'pvp') => {
    if (!canHostOnThisDevice()) {
      setState((prev) => ({ ...prev, error: '当前设备暂时不能当房主，请在安卓手机或平板上创建房间。' }));
      return false;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const result = await NativeMultiplayerServer.start({ playerName, avatar, mode });
      playerIdRef.current = result.playerId;
      saveServerUrl(result.url);
      saveSession(result.url, result.state.roomId, result.playerId);
      setState((prev) => ({
        ...prev,
        connected: true,
        isConnecting: false,
        serverUrl: result.url,
        socketId: result.playerId,
      }));
      applyRoomState(result.state, result.playerId);
      return true;
    } catch {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: '本机开房失败，请检查是否连接了 WiFi 后再试一次。',
      }));
      return false;
    }
  }, [applyRoomState]);

  const joinRoom = useCallback(async (roomId: string, playerName: string, avatar: string) => {
    const url = normalizeServerUrl(state.serverUrl || getDefaultServerUrl());
    if (!url) {
      setState((prev) => ({ ...prev, error: '请先自动寻找房主，或输入房主设备显示的地址。' }));
      return false;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null, serverUrl: url }));

    try {
      const result = await requestJson<{ ok: boolean; playerId: string; state: RoomStatePayload }>(`${url}/join-room`, {
        method: 'POST',
        body: JSON.stringify({ roomId, playerName, avatar }),
      });
      playerIdRef.current = result.playerId;
      saveServerUrl(url);
      saveSession(url, result.state.roomId, result.playerId);
      setState((prev) => ({
        ...prev,
        connected: true,
        isConnecting: false,
        serverUrl: url,
        socketId: result.playerId,
      }));
      applyRoomState(result.state, result.playerId);
      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: getFriendlyNetworkError(error, '加入房间失败，请检查房间号。'),
      }));
      return false;
    }
  }, [applyRoomState, state.serverUrl]);

  const postRoomAction = useCallback(async (path: string, body: Record<string, unknown>) => {
    if (!state.serverUrl || !state.roomId || !playerIdRef.current) return;
    try {
      const result = await requestJson<{ ok: boolean; state: RoomStatePayload }>(`${state.serverUrl}/${path}`, {
        method: 'POST',
        body: JSON.stringify({
          roomId: state.roomId,
          playerId: playerIdRef.current,
          ...body,
        }),
      });
      applyRoomState(result.state);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: getFriendlyNetworkError(error, '房间同步失败，请稍后再试。'),
      }));
    }
  }, [applyRoomState, state.roomId, state.serverUrl]);

  const selectContinent = useCallback((roomId: string, continentId: string) => {
    void postRoomAction('select-continent', { roomId, continentId });
  }, [postRoomAction]);

  const sendPlayerMove = useCallback((roomId: string, position: { x: number; y: number }) => {
    void postRoomAction('player-move', { roomId, position });
  }, [postRoomAction]);

  const sendMapCall = useCallback((type: 'boss' | 'help' | 'treasure', message: string) => {
    void postRoomAction('map-call', { type, message });
  }, [postRoomAction]);

  const chooseMapRole = useCallback((role: 'clue' | 'supply') => {
    void postRoomAction('map-role', { role });
  }, [postRoomAction]);

  const sendEncounter = useCallback((roomId: string, monsterName: string, monsterLevel: number, monsterElement?: string, monsterAvatar?: string, monsterElements?: string[]) => {
    void postRoomAction('encounter-battle', { roomId, monsterName, monsterLevel, monsterElement, monsterAvatar, monsterElements });
  }, [postRoomAction]);

  const sendBattleResult = useCallback((roomId: string, won: boolean, damage: number, exp: number) => {
    void postRoomAction('battle-result', { roomId, won, damage, exp });
  }, [postRoomAction]);

  const ready = useCallback((roomId: string, monsterIds: number[]) => {
    void postRoomAction('player-ready', { roomId, monsterIds });
  }, [postRoomAction]);

  const unready = useCallback((roomId: string) => {
    void postRoomAction('player-unready', { roomId });
  }, [postRoomAction]);

  const leaveRoom = useCallback((roomId: string) => {
    void postRoomAction('leave-room', { roomId });
    playerIdRef.current = null;
    clearSession();
    stopPolling();
    setState((prev) => ({
      ...prev,
      connected: false,
      roomId: null,
      players: [],
      isHost: false,
      gameState: 'idle',
      mode: null,
      continentId: null,
      playerPositions: {},
      mapCalls: [],
      mapRoles: {},
      teamBattle: null,
      socketId: null,
      error: null,
    }));
  }, [postRoomAction, stopPolling]);

  const sendBattleAction = useCallback((action: {
    tag: string;
    skillName: string;
    monsterName?: string;
    skillElement?: string;
    accuracy?: number;
    power: number;
    targetId?: string;
  }) => {
    void postRoomAction('battle-action', action);
  }, [postRoomAction]);

  const rescueTeam = useCallback(() => {
    void postRoomAction('team-rescue', {});
  }, [postRoomAction]);

  const sendCaptureAction = useCallback((action: 'calm' | 'throw') => {
    void postRoomAction('capture-action', { action });
  }, [postRoomAction]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearTeamBattle = useCallback(() => {
    setState((prev) => ({ ...prev, teamBattle: null }));
  }, []);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    ...state,
    createRoom,
    joinRoom,
    selectContinent,
    sendPlayerMove,
    sendMapCall,
    chooseMapRole,
    sendEncounter,
    sendBattleResult,
    ready,
    unready,
    leaveRoom,
    sendBattleAction,
    rescueTeam,
    sendCaptureAction,
    clearError,
    clearTeamBattle,
    connect,
    scanHosts,
    setServerUrl,
  };
}
