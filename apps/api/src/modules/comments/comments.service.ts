import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommentDto } from './dto/comment.dto';
import { WorkspaceRole } from '@prisma/client';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createComment(
    workspaceId: string,
    taskId: string,
    callerId: string,
    callerRole: WorkspaceRole,
    dto: CreateCommentDto,
  ) {
    if (callerRole === WorkspaceRole.VIEWER) {
      throw new ForbiddenException('Viewers do not have permission to post comments');
    }

    const task = await this.prisma.task.findFirst({
      where: { id: taskId, workspaceId },
    });

    if (!task) {
      throw new NotFoundException('Task not found in this workspace');
    }

    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          workspaceId,
          taskId,
          authorId: callerId,
          body: dto.body,
        },
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          workspaceId,
          actorId: callerId,
          action: 'COMMENT_ADDED',
          targetType: 'Comment',
          targetId: comment.id,
          metadata: {
            taskId,
            taskTitle: task.title,
          },
        },
      });

      return comment;
    });
  }

  async findByTask(workspaceId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, workspaceId },
    });

    if (!task) {
      throw new NotFoundException('Task not found in this workspace');
    }

    return this.prisma.comment.findMany({
      where: { workspaceId, taskId },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
