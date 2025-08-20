import { WebSocketGateway, WebSocketServer, OnGatewayInit, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

@WebSocketGateway({ cors: true })
export class AppGateway implements OnGatewayInit {
  @WebSocketServer() server: Server;
  private rooms: Map<string, {
    initiator: string;
    peers: Set<string>;
    iceServers: RTCIceServer[] // Добавляем хранение ICE-серверов
  }> = new Map();

  afterInit(server: Server) {
    console.log('WebSocket server initialized');
  }

  @SubscribeMessage('create-room')
  handleCreateRoom(client: Socket, iceServers: RTCIceServer[]): { roomId: string } {
    const roomId = uuidv4();
    console.log(`create-room ${roomId}`)
    this.rooms.set(roomId, {
      initiator: client.id,
      peers: new Set([client.id]),
      iceServers // Сохраняем ICE-серверы
    });
    return { roomId };
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(client: Socket, roomId: string): {
    success: boolean;
    iceServers?: RTCIceServer[]
  } {
    const room = this.rooms.get(roomId);
    if (!room || room.peers.size >= 2) {
      return { success: false };
    }

    room.peers.add(client.id);
    client.join(roomId);
    client.to(roomId).emit('new-peer', client.id);
    console.log('join-room', roomId, client.id,)
    // Отправляем ICE-серверы новому участнику
    return {
      success: true,
      iceServers: room.iceServers
    };
  }

  @SubscribeMessage('relay-ice')
  handleIceCandidate(client: Socket, payload: { candidate: any; roomId: string }) {
    console.log('relay-ice')
    client.to(payload.roomId).emit('ice-candidate', payload.candidate);
  }

  @SubscribeMessage('relay-offer')
  handleOffer(client: Socket, payload: { offer: any; roomId: string }) {
    console.log('relay-offer')
    client.to(payload.roomId).emit('offer', payload.offer);
  }

  @SubscribeMessage('relay-answer')
  handleAnswer(client: Socket, payload: { answer: any; roomId: string }) {
    console.log('relay-answer')
    client.to(payload.roomId).emit('answer', payload.answer);
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(client: Socket, roomId: string) {
    console.log('leave-room')
    client.leave(roomId);
    const room = this.rooms.get(roomId);
    if (room) {
      room.peers.delete(client.id);
      if (room.peers.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }
}