import { createServer } from 'http';
import { Server } from 'socket.io';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

/** 房间信息 */
interface Room {
  id: string;
  hostId: string;
  players: Map<string, Player>;
  gameState: 'waiting' | 'playing' | 'ended';
  mode: 'pvp' | 'coop'; // 对战模式或组队模式
  continentId?: string; // 组队模式下选择的大陆
  playerPositions: Map<string, { x: number; y: number }>; // 组队模式下玩家位置
  createdAt: Date;
}

interface Player {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  monsterIds: number[];
}

const rooms = new Map<string, Room>();

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('玩家连接:', socket.id);

  /** 创建房间 */
  socket.on('create-room', (data: { playerName: string; avatar: string; mode?: 'pvp' | 'coop' }) => {
    const roomId = generateRoomId();
    const room: Room = {
      id: roomId,
      hostId: socket.id,
      players: new Map(),
      gameState: 'waiting',
      mode: data.mode || 'pvp',
      playerPositions: new Map(),
      createdAt: new Date(),
    };

    const player: Player = {
      id: socket.id,
      name: data.playerName,
      avatar: data.avatar,
      isHost: true,
      isReady: false,
      monsterIds: [],
    };

    room.players.set(socket.id, player);
    rooms.set(roomId, room);
    socket.join(roomId);

    socket.emit('room-created', { roomId, player, mode: room.mode });
    console.log(`房间 ${roomId} 创建，模式: ${room.mode}，房主: ${data.playerName}`);
  });

  /** 加入房间 */
  socket.on('join-room', (data: { roomId: string; playerName: string; avatar: string }) => {
    const room = rooms.get(data.roomId.toUpperCase());

    if (!room) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }

    if (room.players.size >= 3) {
      socket.emit('error', { message: '房间已满（最多3人）' });
      return;
    }

    if (room.gameState !== 'waiting') {
      socket.emit('error', { message: '游戏已开始' });
      return;
    }

    const player: Player = {
      id: socket.id,
      name: data.playerName,
      avatar: data.avatar,
      isHost: false,
      isReady: false,
      monsterIds: [],
    };

    room.players.set(socket.id, player);
    socket.join(room.id);

    socket.emit('room-joined', { roomId: room.id, player, mode: room.mode });
    io.to(room.id).emit('player-joined', {
      players: Array.from(room.players.values()),
    });

    console.log(`玩家 ${data.playerName} 加入房间 ${room.id}`);
  });

  /** 选择大陆（组队模式） */
  socket.on('select-continent', (data: { roomId: string; continentId: string }) => {
    const room = rooms.get(data.roomId);
    if (!room) return;
    if (room.hostId !== socket.id) {
      socket.emit('error', { message: '只有房主可以选择大陆' });
      return;
    }
    if (room.mode !== 'coop') {
      socket.emit('error', { message: '只有组队模式可以选择大陆' });
      return;
    }

    room.continentId = data.continentId;
    io.to(room.id).emit('continent-selected', { continentId: data.continentId });
    console.log(`房间 ${room.id} 选择大陆: ${data.continentId}`);
  });

  /** 玩家移动（组队模式） */
  socket.on('player-move', (data: { roomId: string; position: { x: number; y: number } }) => {
    const room = rooms.get(data.roomId);
    if (!room || room.mode !== 'coop' || room.gameState !== 'playing') return;

    room.playerPositions.set(socket.id, data.position);
    io.to(room.id).emit('player-moved', {
      playerId: socket.id,
      position: data.position,
    });
  });

  /** 遭遇战斗（组队模式） */
  socket.on('encounter-battle', (data: { roomId: string; monsterName: string; monsterLevel: number }) => {
    const room = rooms.get(data.roomId);
    if (!room || room.mode !== 'coop') return;

    // 广播给所有玩家，群殴Boss
    io.to(room.id).emit('team-battle', {
      monsterName: data.monsterName,
      monsterLevel: data.monsterLevel,
      initiatorId: socket.id,
    });
  });

  /** 战斗结果（组队模式） */
  socket.on('battle-result', (data: { roomId: string; won: boolean; damage: number; exp: number }) => {
    const room = rooms.get(data.roomId);
    if (!room || room.mode !== 'coop') return;

    // 广播战斗结果，所有参与者获得奖励
    io.to(room.id).emit('team-battle-result', {
      playerId: socket.id,
      won: data.won,
      damage: data.damage,
      exp: data.exp,
    });
  });

  /** 准备 */
  socket.on('player-ready', (data: { roomId: string; monsterIds: number[] }) => {
    const room = rooms.get(data.roomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (player) {
      player.isReady = true;
      player.monsterIds = data.monsterIds;

      io.to(room.id).emit('player-ready', {
        playerId: socket.id,
        players: Array.from(room.players.values()),
      });

      // 检查是否所有人都准备了
      const allReady = Array.from(room.players.values()).every((p) => p.isReady);
      if (allReady && room.players.size >= 2) {
        room.gameState = 'playing';
        
        // 组队模式：初始化所有玩家位置
        if (room.mode === 'coop') {
          const startPos = { x: 2, y: 2 };
          for (const [pid] of room.players) {
            room.playerPositions.set(pid, startPos);
          }
        }
        
        io.to(room.id).emit('game-start', {
          players: Array.from(room.players.values()),
          mode: room.mode,
          continentId: room.continentId,
        });
        console.log(`房间 ${room.id} 游戏开始！模式: ${room.mode}`);
      }
    }
  });

  /** 取消准备 */
  socket.on('player-unready', (data: { roomId: string }) => {
    const room = rooms.get(data.roomId);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (player) {
      player.isReady = false;
      io.to(room.id).emit('player-unready', {
        playerId: socket.id,
        players: Array.from(room.players.values()),
      });
    }
  });

  /** 对战动作 */
  socket.on('battle-action', (data: { roomId: string; action: string; skillIndex?: number }) => {
    const room = rooms.get(data.roomId);
    if (!room || room.gameState !== 'playing') return;

    // 广播给房间内其他玩家
    socket.to(room.id).emit('battle-action', {
      playerId: socket.id,
      action: data.action,
      skillIndex: data.skillIndex,
    });
  });

  /** 离开房间 */
  socket.on('leave-room', (data: { roomId: string }) => {
    const room = rooms.get(data.roomId);
    if (!room) return;

    room.players.delete(socket.id);
    socket.leave(room.id);

    if (room.players.size === 0) {
      rooms.delete(room.id);
      console.log(`房间 ${room.id} 已解散`);
    } else {
      // 如果房主离开，指定新房主
      if (room.hostId === socket.id) {
        const newHost = room.players.values().next().value;
        if (newHost) {
          room.hostId = newHost.id;
          newHost.isHost = true;
        }
      }

      io.to(room.id).emit('player-left', {
        playerId: socket.id,
        players: Array.from(room.players.values()),
      });
    }
  });

  /** 断开连接 */
  socket.on('disconnect', () => {
    console.log('玩家断开:', socket.id);

    // 从所有房间中移除
    for (const [roomId, room] of rooms) {
      if (room.players.has(socket.id)) {
        room.players.delete(socket.id);

        if (room.players.size === 0) {
          rooms.delete(roomId);
        } else {
          if (room.hostId === socket.id) {
            const newHost = room.players.values().next().value;
            if (newHost) {
              room.hostId = newHost.id;
              newHost.isHost = true;
            }
          }
          io.to(room.id).emit('player-left', {
            playerId: socket.id,
            players: Array.from(room.players.values()),
          });
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🎮 联机服务器运行在端口 ${PORT}`);
  console.log(`📡 局域网地址: http://localhost:${PORT}`);
});
