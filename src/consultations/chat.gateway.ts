import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConsultationsService } from './consultations.service';

/**
 * FR-5.3 Real-time chat.
 * - JWT verified from handshake.auth.token; invalid -> immediate disconnect
 * - joinRoom only for participants (doctor / patient / scheduling CHW)
 * - messages persisted BEFORE broadcast (transcript = clinical record)
 */
@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private consultationsService: ConsultationsService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      const payload = this.jwtService.verify(token);
      client.data.user = {
        id: payload.sub, email: payload.email, role: payload.role, name: payload.name,
      };
    } catch {
      client.disconnect();
    }
  }

  private room(consultationId: number) {
    return `consult:${consultationId}`;
  }

  @SubscribeMessage('joinRoom')
  async joinRoom(@ConnectedSocket() client: Socket, @MessageBody() body: { consultationId: number }) {
    const user = client.data.user;
    try {
      const c = await this.consultationsService.getWithParticipants(body.consultationId);
      this.consultationsService.assertParticipant(user.id, c);
    } catch (e) {
      client.emit('error', { message: e.message ?? 'Cannot join room' });
      return;
    }
    const room = this.room(body.consultationId);
    client.join(room);
    client.to(room).emit('userJoined', { userId: user.id, name: user.name });
  }

  @SubscribeMessage('sendMessage')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { consultationId: number; text: string },
  ) {
    const user = client.data.user;
    if (!body?.text || String(body.text).trim().length === 0) return;
    if (String(body.text).length > 2000) {
      client.emit('error', { message: 'Message too long (max 2000 chars)' });
      return;
    }
    try {
      const saved = await this.consultationsService.addMessage(
        user.id, body.consultationId, String(body.text).trim(),
      );
      this.server.to(this.room(body.consultationId)).emit('newMessage', {
        id: saved.id,
        consultationId: body.consultationId,
        sender: { id: user.id, name: user.name, role: user.role },
        message: saved.message,
        sentAt: saved.sentAt,
      });
    } catch (e) {
      client.emit('error', { message: e.message ?? 'Message rejected' });
    }
  }

  @SubscribeMessage('typing')
  typing(@ConnectedSocket() client: Socket, @MessageBody() body: { consultationId: number }) {
    const user = client.data.user;
    client.to(this.room(body.consultationId)).emit('typing', { userId: user.id, name: user.name });
  }

  /** Called by the controller when the doctor completes the consultation */
  notifyEnded(consultationId: number) {
    this.server.to(this.room(consultationId)).emit('consultationEnded', { consultationId });
  }
}
