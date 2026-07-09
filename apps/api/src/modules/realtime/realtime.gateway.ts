import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@Injectable()
@WebSocketGateway({
  namespace: '/attendance',
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth && (client.handshake.auth as any).token) ||
        (client.handshake.query && (client.handshake.query.token as string));

      if (!token) {
        this.logger.warn(`Socket ${client.id} rejected: no token provided`);
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'super-secret-key-change-me',
      });

      (client.data as any).userId = payload.sub;
      (client.data as any).phoneNumber = payload.phoneNumber;
    } catch (err) {
      this.logger.warn(`Socket ${client.id} rejected: invalid token (${err.message})`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    // No-op: rooms are cleaned up automatically by socket.io on disconnect.
  }

  @SubscribeMessage('join:gym')
  handleJoinGym(@ConnectedSocket() client: Socket, @MessageBody() data: { gymId: string }) {
    if (!data?.gymId) {
      return;
    }
    client.join(`gym:${data.gymId}`);
    return { success: true, room: `gym:${data.gymId}` };
  }

  emitCheckIn(gymId: string, record: any) {
    this.server.to(`gym:${gymId}`).emit('attendance:check-in', record);
  }

  emitCheckOut(gymId: string, record: any) {
    this.server.to(`gym:${gymId}`).emit('attendance:check-out', record);
  }

  emitOccupancyUpdate(gymId: string, occupancy: any) {
    this.server.to(`gym:${gymId}`).emit('occupancy:update', occupancy);
  }

  emitDeviceStatus(gymId: string, device: any) {
    this.server.to(`gym:${gymId}`).emit('device:status', device);
  }

  emitValidation(gymId: string, payload: any) {
    this.server.to(`gym:${gymId}`).emit('membership:validation', payload);
  }

  emitAlert(gymId: string, alert: any) {
    this.server.to(`gym:${gymId}`).emit('alert', alert);
  }
}
