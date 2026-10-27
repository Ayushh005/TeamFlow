import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { WorkspaceRole } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a project within a workspace
   * Enforces: Viewers cannot create projects
   */
  async createProject(
    workspaceId: string,
    callerId: string,
    callerRole: WorkspaceRole,
    dto: CreateProjectDto,
  ) {
    if (callerRole === WorkspaceRole.VIEWER) {
      throw new ForbiddenException('Viewers do not have permission to create projects');
    }

    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          workspaceId,
          name: dto.name,
          description: dto.description,
        },
      });

      await tx.activityLog.create({
        data: {
          workspaceId,
          actorId: callerId,
          action: 'PROJECT_CREATED',
          targetType: 'Project',
          targetId: project.id,
          metadata: { name: project.name },
        },
      });

      return project;
    });
  }

  /**
   * List all active projects in a workspace with task counts
   */
  async findAll(workspaceId: string) {
    const projects = await this.prisma.project.findMany({
      where: {
        workspaceId,
        archivedAt: null,
      },
      include: {
        _count: {
          select: {
            tasks: true,
            fileObjects: true,
          },
        },
        tasks: {
          select: {
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((p) => {
      const totalTasks = p._count.tasks;
      const completedTasks = p.tasks.filter((t) => t.status === 'DONE').length;
      const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        createdAt: p.createdAt,
        totalTasks,
        completedTasks,
        progressPercent,
      };
    });
  }

  /**
   * Find project by ID scoped to workspace (IDOR protection)
   */
  async findById(workspaceId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId,
      },
      include: {
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                displayName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found in this workspace');
    }

    return project;
  }

  /**
   * Update project details
   */
  async update(
    workspaceId: string,
    projectId: string,
    callerId: string,
    callerRole: WorkspaceRole,
    dto: UpdateProjectDto,
  ) {
    if (callerRole === WorkspaceRole.VIEWER) {
      throw new ForbiddenException('Viewers do not have permission to edit projects');
    }

    const existing = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.project.update({
        where: { id: projectId },
        data: {
          name: dto.name,
          description: dto.description,
        },
      });

      await tx.activityLog.create({
        data: {
          workspaceId,
          actorId: callerId,
          action: 'PROJECT_UPDATED',
          targetType: 'Project',
          targetId: projectId,
          metadata: { name: updated.name },
        },
      });

      return updated;
    });
  }

  /**
   * Archive project
   */
  async archive(
    workspaceId: string,
    projectId: string,
    callerId: string,
    callerRole: WorkspaceRole,
  ) {
    if (callerRole !== WorkspaceRole.OWNER && callerRole !== WorkspaceRole.ADMIN) {
      throw new ForbiddenException('Only Owners and Admins can delete or archive projects');
    }

    const existing = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: { archivedAt: new Date() },
      });

      await tx.activityLog.create({
        data: {
          workspaceId,
          actorId: callerId,
          action: 'PROJECT_ARCHIVED',
          targetType: 'Project',
          targetId: projectId,
          metadata: { name: existing.name },
        },
      });

      return { success: true, message: 'Project archived successfully' };
    });
  }
}
