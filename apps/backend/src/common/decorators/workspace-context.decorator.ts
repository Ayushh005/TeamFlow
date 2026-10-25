import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Membership, WorkspaceRole } from '@prisma/client';

export interface ActiveWorkspaceContext {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  membershipId: string;
}

export const ActiveWorkspace = createParamDecorator(
  (data: keyof ActiveWorkspaceContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const context: ActiveWorkspaceContext = request.workspaceContext;
    return data ? context?.[data] : context;
  },
);
