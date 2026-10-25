import { SetMetadata } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const RequireRoles = (...roles: WorkspaceRole[]) => SetMetadata(ROLES_KEY, roles);
