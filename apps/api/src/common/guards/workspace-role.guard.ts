import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { WorkspaceRole } from '@prisma/client';

@Injectable()
export class WorkspaceRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User authentication required');
    }

    // Extract workspaceId from params, query, or x-workspace-id header
    const workspaceId =
      request.params?.workspaceId ||
      request.query?.workspaceId ||
      request.headers?.['x-workspace-id'];

    if (!workspaceId) {
      throw new BadRequestException('Workspace ID context is required');
    }

    // Verify membership in database (Zero IDOR)
    const membership = await this.prisma.membership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Access denied: You do not belong to this workspace',
      );
    }

    // Attach workspace context to request object
    request.workspaceContext = {
      workspaceId: membership.workspaceId,
      userId: user.id,
      role: membership.role,
      membershipId: membership.id,
      workspace: membership.workspace,
    };

    // Check required role permissions if declared on route
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const hasRequiredRole = requiredRoles.includes(membership.role);
    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Insufficient permissions. Required role: ${requiredRoles.join(', ')} (Your role: ${membership.role})`,
      );
    }

    return true;
  }
}
