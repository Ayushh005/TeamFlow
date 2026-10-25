import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Authenticate socket client during connection handshake via JWT
   */
  async handleConnection(client: Socket) {
    try {
      const authHeader =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization ||
        client.handshake.query?.token;

      if (!authHeader) {
        this.logger.warn(`Socket connection rejected: No auth token provided (${client.id})`);
        client.disconnect();
        return;
      }

      const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : (authHeader as string);

      const secret = this.configService.get<string>('JWT_ACCESS_SECRET', 'super_secret_teamflow_access_key');
      const payload = this.jwtService.verify(token, { secret });

      client.data.user = {
        id: payload.sub,
        email: payload.email,
        displayName: payload.displayName,
      };

      this.logger.log(`Socket client connected: ${client.data.user.email} (${client.id})`);
    } catch (err: any) {
      this.logger.warn(`Socket auth verification failed for ${client.id}: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket client disconnected: ${client.id}`);
  }

  /**
   * Zero-IDOR Workspace Room Joining
   * Validates database membership before allowing a client to join workspace channel
   */
  @SubscribeMessage('join_workspace')
  async handleJoinWorkspace(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const user = client.data.user;
    const workspaceId = typeof data === 'string'
      ? (data.startsWith('{') ? JSON.parse(data)?.workspaceId : data)
      : data?.workspaceId;

    if (!user || !user.id || !workspaceId) {
      return { success: false, error: 'Unauthorized or missing workspaceId' };
    }

    // Verify membership in database (Zero-IDOR Room Isolation)
    const membership = await this.prisma.membership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      this.logger.warn(
        `User ${user.email} denied join to unauthorized workspace room: ${workspaceId}`,
      );
      return { success: false, error: 'Not a member of this workspace' };
    }

    const roomName = `workspace_${workspaceId}`;
    await client.join(roomName);
    this.logger.log(`User ${user.email} joined room: ${roomName}`);

    return {
      success: true,
      room: roomName,
      role: membership.role,
    };
  }

  @SubscribeMessage('leave_workspace')
  async handleLeaveWorkspace(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const workspaceId = typeof data === 'string'
      ? (data.startsWith('{') ? JSON.parse(data)?.workspaceId : data)
      : data?.workspaceId;

    if (workspaceId) {
      const roomName = `workspace_${workspaceId}`;
      await client.leave(roomName);
      this.logger.log(`Client ${client.id} left room: ${roomName}`);
    }
    return { success: true };
  }

  /**
   * Broadcast helpers for workspace events
   */
  broadcastTaskCreated(workspaceId: string, task: any) {
    this.server.to(`workspace_${workspaceId}`).emit('task.created', task);
    this.logger.log(`Broadcast [task.created] on workspace_${workspaceId}: ${task.id}`);
  }

  broadcastTaskUpdated(workspaceId: string, task: any) {
    this.server.to(`workspace_${workspaceId}`).emit('task.updated', task);
    this.logger.log(`Broadcast [task.updated] on workspace_${workspaceId}: ${task.id}`);
  }

  broadcastTaskDeleted(workspaceId: string, taskId: string) {
    this.server.to(`workspace_${workspaceId}`).emit('task.deleted', { taskId });
    this.logger.log(`Broadcast [task.deleted] on workspace_${workspaceId}: ${taskId}`);
  }

  broadcastCommentCreated(workspaceId: string, comment: any) {
    this.server.to(`workspace_${workspaceId}`).emit('comment.created', comment);
    this.logger.log(`Broadcast [comment.created] on workspace_${workspaceId}: ${comment.id}`);
  }
}
