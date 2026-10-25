import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { WorkspaceRole } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new workspace, assigning the caller as the OWNER
   */
  async createWorkspace(userId: string, dto: CreateWorkspaceDto) {
    const slugBase = dto.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const slug = `${slugBase}-${crypto.randomBytes(3).toString('hex')}`;

    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: dto.name,
          slug,
          createdById: userId,
          memberships: {
            create: {
              userId,
              role: WorkspaceRole.OWNER,
            },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          workspaceId: workspace.id,
          actorId: userId,
          action: 'WORKSPACE_CREATED',
          targetType: 'Workspace',
          targetId: workspace.id,
          metadata: { name: workspace.name },
        },
      });

      return workspace;
    });
  }

  /**
   * List all workspaces the user has an active membership in
   */
  async getUserWorkspaces(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            _count: {
              select: {
                memberships: true,
                projects: true,
                tasks: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map((m) => ({
      ...m.workspace,
      userRole: m.role,
      memberCount: m.workspace._count.memberships,
      projectCount: m.workspace._count.projects,
      taskCount: m.workspace._count.tasks,
    }));
  }

  /**
   * Get single workspace details with summary counts
   */
  async getWorkspaceDetails(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        _count: {
          select: {
            memberships: true,
            projects: true,
            tasks: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return {
      ...workspace,
      memberCount: workspace._count.memberships,
      projectCount: workspace._count.projects,
      taskCount: workspace._count.tasks,
    };
  }

  /**
   * List all members belonging to this workspace
   */
  async getWorkspaceMembers(workspaceId: string) {
    return this.prisma.membership.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  /**
   * Add/invite a member to the workspace
   * Enforces privilege escalation rules:
   * - Only Owner or Admin can invite
   * - Admins cannot grant Owner role
   */
  async inviteMember(
    workspaceId: string,
    callerId: string,
    callerRole: WorkspaceRole,
    dto: InviteMemberDto,
  ) {
    // Privilege escalation prevention:
    if (callerRole !== WorkspaceRole.OWNER && callerRole !== WorkspaceRole.ADMIN) {
      throw new ForbiddenException('Only Owners and Admins can invite team members');
    }

    if (callerRole === WorkspaceRole.ADMIN && dto.role === WorkspaceRole.OWNER) {
      throw new ForbiddenException('Admins cannot grant the Owner role');
    }

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      const defaultHash = await bcrypt.hash('Password123!', 10);
      const nameFromEmail = dto.email.split('@')[0];
      const displayName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);

      user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash: defaultHash,
          displayName,
        },
      });
    }

    // Check existing membership
    const existingMembership = await this.prisma.membership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictException('This user is already a member of this workspace');
    }

    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.membership.create({
        data: {
          workspaceId,
          userId: user.id,
          role: dto.role,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          workspaceId,
          actorId: callerId,
          action: 'MEMBER_INVITED',
          targetType: 'User',
          targetId: user.id,
          metadata: {
            email: user.email,
            role: dto.role,
          },
        },
      });

      return membership;
    });
  }

  /**
   * Update a member's role
   * Enforces strict RBAC invariants:
   * - Admins cannot modify Owner's role
   * - Admins cannot promote someone to Owner
   * - The last remaining Owner cannot be demoted
   */
  async updateMemberRole(
    workspaceId: string,
    callerId: string,
    callerRole: WorkspaceRole,
    targetUserId: string,
    newRole: WorkspaceRole,
  ) {
    if (callerRole !== WorkspaceRole.OWNER && callerRole !== WorkspaceRole.ADMIN) {
      throw new ForbiddenException('Only Owners and Admins can manage roles');
    }

    const targetMembership = await this.prisma.membership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: targetUserId,
        },
      },
    });

    if (!targetMembership) {
      throw new NotFoundException('Member not found in this workspace');
    }

    // Rule 1: Admins cannot change an Owner's role
    if (callerRole === WorkspaceRole.ADMIN && targetMembership.role === WorkspaceRole.OWNER) {
      throw new ForbiddenException('Admins cannot modify an Owner’s role');
    }

    // Rule 2: Admins cannot grant the Owner role
    if (callerRole === WorkspaceRole.ADMIN && newRole === WorkspaceRole.OWNER) {
      throw new ForbiddenException('Admins cannot grant the Owner role');
    }

    // Rule 3: Last Owner safeguard - Cannot demote the last remaining Owner
    if (targetMembership.role === WorkspaceRole.OWNER && newRole !== WorkspaceRole.OWNER) {
      const ownerCount = await this.prisma.membership.count({
        where: {
          workspaceId,
          role: WorkspaceRole.OWNER,
        },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot demote the last remaining Owner of the workspace');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.membership.update({
        where: { id: targetMembership.id },
        data: { role: newRole },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          workspaceId,
          actorId: callerId,
          action: 'MEMBER_ROLE_UPDATED',
          targetType: 'Membership',
          targetId: targetMembership.id,
          metadata: {
            userId: targetUserId,
            previousRole: targetMembership.role,
            newRole,
          },
        },
      });

      return updated;
    });
  }

  /**
   * Remove a member from the workspace
   * Enforces safeguards:
   * - Admins cannot remove an Owner
   * - Cannot remove the last remaining Owner
   */
  async removeMember(
    workspaceId: string,
    callerId: string,
    callerRole: WorkspaceRole,
    targetUserId: string,
  ) {
    if (callerRole !== WorkspaceRole.OWNER && callerRole !== WorkspaceRole.ADMIN) {
      throw new ForbiddenException('Only Owners and Admins can remove members');
    }

    const targetMembership = await this.prisma.membership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: targetUserId,
        },
      },
    });

    if (!targetMembership) {
      throw new NotFoundException('Member not found in this workspace');
    }

    // Admins cannot remove Owner
    if (callerRole === WorkspaceRole.ADMIN && targetMembership.role === WorkspaceRole.OWNER) {
      throw new ForbiddenException('Admins cannot remove a workspace Owner');
    }

    // Cannot remove last Owner
    if (targetMembership.role === WorkspaceRole.OWNER) {
      const ownerCount = await this.prisma.membership.count({
        where: {
          workspaceId,
          role: WorkspaceRole.OWNER,
        },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot remove the last remaining Owner of the workspace');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.membership.delete({
        where: { id: targetMembership.id },
      });

      await tx.activityLog.create({
        data: {
          workspaceId,
          actorId: callerId,
          action: 'MEMBER_REMOVED',
          targetType: 'Membership',
          targetId: targetMembership.id,
          metadata: {
            userId: targetUserId,
          },
        },
      });

      return { success: true, message: 'Member removed successfully' };
    });
  }
}
