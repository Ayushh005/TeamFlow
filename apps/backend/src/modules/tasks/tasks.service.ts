import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { WorkspaceRole, TaskStatus, TaskPriority } from '@prisma/client';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  /**
   * Create task with workspace validation and assignee membership check
   */
  async createTask(
    workspaceId: string,
    callerId: string,
    callerRole: WorkspaceRole,
    dto: CreateTaskDto,
  ) {
    if (callerRole === WorkspaceRole.VIEWER) {
      throw new ForbiddenException('Viewers do not have permission to create tasks');
    }

    // 1. Validate that the project belongs to this workspace
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, workspaceId },
    });

    if (!project) {
      throw new BadRequestException('Project does not exist in this workspace');
    }

    // 2. Validate that the assignee is an active member of this workspace
    if (dto.assigneeId) {
      const assigneeMembership = await this.prisma.membership.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: dto.assigneeId,
          },
        },
      });

      if (!assigneeMembership) {
        throw new BadRequestException('Assignee must be an active member of this workspace');
      }
    }

    const createdTask = await this.prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          workspaceId,
          projectId: dto.projectId,
          title: dto.title,
          description: dto.description,
          status: dto.status || TaskStatus.TODO,
          priority: dto.priority || TaskPriority.MEDIUM,
          assigneeId: dto.assigneeId,
          createdById: callerId,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        },
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
          createdBy: { select: { id: true, displayName: true } },
        },
      });

      await tx.activityLog.create({
        data: {
          workspaceId,
          actorId: callerId,
          action: 'TASK_CREATED',
          targetType: 'Task',
          targetId: task.id,
          metadata: {
            title: task.title,
            status: task.status,
            priority: task.priority,
            projectId: task.projectId,
          },
        },
      });

      return task;
    });

    this.realtimeGateway.broadcastTaskCreated(workspaceId, createdTask);
    return createdTask;
  }

  /**
   * List tasks in workspace with optional filters (project, status, priority, search)
   */
  async findAll(
    workspaceId: string,
    projectId?: string,
    status?: TaskStatus,
    priority?: TaskPriority,
    search?: string,
  ) {
    const where: any = { workspaceId };

    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        createdBy: { select: { id: true, displayName: true } },
        _count: {
          select: {
            comments: true,
            fileObjects: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Find single task by ID with comments and activity
   */
  async findById(workspaceId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, workspaceId },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        createdBy: { select: { id: true, displayName: true } },
        comments: {
          include: {
            author: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        fileObjects: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            createdAt: true,
            uploadedBy: { select: { id: true, displayName: true } },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found in this workspace');
    }

    return task;
  }

  /**
   * Update task (status transitions, priority, title, assignee)
   */
  async updateTask(
    workspaceId: string,
    taskId: string,
    callerId: string,
    callerRole: WorkspaceRole,
    dto: UpdateTaskDto,
  ) {
    if (callerRole === WorkspaceRole.VIEWER) {
      throw new ForbiddenException('Viewers do not have permission to modify tasks');
    }

    const existing = await this.prisma.task.findFirst({
      where: { id: taskId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Task not found in this workspace');
    }

    // Assignee check
    if (dto.assigneeId && dto.assigneeId !== existing.assigneeId) {
      const assigneeMembership = await this.prisma.membership.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: dto.assigneeId,
          },
        },
      });

      if (!assigneeMembership) {
        throw new BadRequestException('Assignee must be an active member of this workspace');
      }
    }

    const updatedTask = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          title: dto.title,
          description: dto.description,
          status: dto.status,
          priority: dto.priority,
          assigneeId: dto.assigneeId !== undefined ? dto.assigneeId : undefined,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
          version: { increment: 1 },
        },
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        },
      });

      // Status change audit log
      if (dto.status && dto.status !== existing.status) {
        await tx.activityLog.create({
          data: {
            workspaceId,
            actorId: callerId,
            action: 'TASK_STATUS_CHANGED',
            targetType: 'Task',
            targetId: taskId,
            metadata: {
              taskTitle: updated.title,
              from: existing.status,
              to: dto.status,
            },
          },
        });
      }

      // Assignment audit log
      if (dto.assigneeId && dto.assigneeId !== existing.assigneeId) {
        await tx.activityLog.create({
          data: {
            workspaceId,
            actorId: callerId,
            action: 'TASK_ASSIGNED',
            targetType: 'Task',
            targetId: taskId,
            metadata: {
              taskTitle: updated.title,
              assigneeId: dto.assigneeId,
            },
          },
        });
      }

      return updated;
    });

    this.realtimeGateway.broadcastTaskUpdated(workspaceId, updatedTask);
    return updatedTask;
  }

  /**
   * Delete task (Owner / Admin only)
   */
  async deleteTask(
    workspaceId: string,
    taskId: string,
    callerId: string,
    callerRole: WorkspaceRole,
  ) {
    if (callerRole !== WorkspaceRole.OWNER && callerRole !== WorkspaceRole.ADMIN) {
      throw new ForbiddenException('Only Owners and Admins can delete tasks');
    }

    const existing = await this.prisma.task.findFirst({
      where: { id: taskId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Task not found in this workspace');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.task.delete({ where: { id: taskId } });

      await tx.activityLog.create({
        data: {
          workspaceId,
          actorId: callerId,
          action: 'TASK_DELETED',
          targetType: 'Task',
          targetId: taskId,
          metadata: { title: existing.title },
        },
      });

      return { success: true, message: 'Task deleted successfully' };
    });

    this.realtimeGateway.broadcastTaskDeleted(workspaceId, taskId);
    return result;
  }
}
