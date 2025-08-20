import { WebSocketGateway, WebSocketServer, OnGatewayInit, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { Room } from './room.interface';

@WebSocketGateway({ cors: true })
export class AppGateway implements OnGatewayInit {
  @WebSocketServer() server: Server;
  private rooms: Map<string, Room> = new Map();
  private readonly ROOM_TIMEOUT_MS = 20 * 60 * 1000;

  afterInit(server: Server) {
    console.log('WebSocket server initialized');
  }

  private scheduleRoomCleanup(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Очищаем предыдущий таймаут, если был
    if (room.timeoutId) {
      clearTimeout(room.timeoutId);
    }

    // Устанавливаем новый таймаут
    room.timeoutId = setTimeout(() => {
      this.cleanupRoom(roomId);
    }, this.ROOM_TIMEOUT_MS);

    room.lastActivity = new Date();
  }

  private cleanupRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      console.log(`Cleaning up room ${roomId} due to inactivity`);

      // Уведомляем всех участников о закрытии комнаты
      this.server.to(roomId).emit('room-closed', {
        reason: 'inactivity',
        roomId
      });

      // Отключаем всех участников
      room.peers.forEach(peerId => {
        const socket = this.server.sockets.sockets.get(peerId);
        if (socket) {
          socket.leave(roomId);
          socket.emit('room-closed', { reason: 'inactivity', roomId });
        }
      });

      // Очищаем таймаут и удаляем комнату
      if (room.timeoutId) {
        clearTimeout(room.timeoutId);
      }
      this.rooms.delete(roomId);
    }
  }

  private updateRoomActivity(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.lastActivity = new Date();
      this.scheduleRoomCleanup(roomId);
    }
  }



  @SubscribeMessage('create-room')
  handleCreateRoom(client: Socket, iceServers: RTCIceServer[]): { roomId: string } {
    const roomId = uuidv4();
    console.log(`create-room ${roomId}`);

    this.rooms.set(roomId, {
      initiator: client.id,
      peers: new Set([client.id]),
      iceServers,
      createdAt: new Date(),
      lastActivity: new Date()
    });

    this.scheduleRoomCleanup(roomId);
    return { roomId };
  }


  @SubscribeMessage('join-room')
  handleJoinRoom(client: Socket, roomId: string): {
    success: boolean;
    iceServers?: RTCIceServer[];
    error?: string;
  } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.peers.size >= 2) {
      return { success: false, error: 'Room is full' };
    }

    room.peers.add(client.id);
    client.join(roomId);
    this.updateRoomActivity(roomId);

    console.log('join-room', roomId, client.id);
    client.to(roomId).emit('new-peer', client.id);

    return {
      success: true,
      iceServers: room.iceServers
    };
  } @SubscribeMessage('relay-ice')
  handleIceCandidate(client: Socket, payload: { candidate: any; roomId: string }) {
    console.log('relay-ice');
    this.updateRoomActivity(payload.roomId);
    client.to(payload.roomId).emit('ice-candidate', payload.candidate);
  }

  @SubscribeMessage('relay-offer')
  handleOffer(client: Socket, payload: { offer: any; roomId: string }) {
    console.log('relay-offer');
    this.updateRoomActivity(payload.roomId);
    client.to(payload.roomId).emit('offer', payload.offer);
  }

  @SubscribeMessage('relay-answer')
  handleAnswer(client: Socket, payload: { answer: any; roomId: string }) {
    console.log('relay-answer');
    this.updateRoomActivity(payload.roomId);
    client.to(payload.roomId).emit('answer', payload.answer);
  }

  @SubscribeMessage('keep-alive')
  handleKeepAlive(client: Socket, roomId: string) {
    this.updateRoomActivity(roomId);
    client.emit('keep-alive-ack');
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(client: Socket, roomId: string) {
    console.log('leave-room', roomId, client.id);

    client.leave(roomId);
    const room = this.rooms.get(roomId);

    if (room) {
      room.peers.delete(client.id);
      this.updateRoomActivity(roomId);

      if (room.peers.size === 0) {
        console.log(`Room ${roomId} is empty, scheduling cleanup`);
        this.scheduleRoomCleanup(roomId);
      } else {
        // Уведомляем оставшихся участников
        client.to(roomId).emit('peer-left', { peerId: client.id });
      }
    }
  }

  // Очистка при отключении клиента
  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);

    // Находим все комнаты, где был этот клиент
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.peers.has(client.id)) {
        this.handleLeaveRoom(client, roomId);
      }
    }
  }
}