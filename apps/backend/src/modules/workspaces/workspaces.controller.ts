import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WorkspaceRoleGuard } from '../../common/guards/workspace-role.guard';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import {
  ActiveWorkspace,
  ActiveWorkspaceContext,
} from '../../common/decorators/workspace-context.decorator';
import { WorkspaceRole } from '@prisma/client';

@ApiTags('Workspaces')
@ApiBearerAuth('bearer')
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiResponse({ status: 201, description: 'Workspace created successfully' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWorkspaceDto,
  ) {
    const workspace = await this.workspacesService.createWorkspace(userId, dto);
    return {
      success: true,
      data: workspace,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all workspaces for the current user' })
  async listUserWorkspaces(@CurrentUser('id') userId: string) {
    const workspaces = await this.workspacesService.getUserWorkspaces(userId);
    return {
      success: true,
      data: workspaces,
    };
  }

  @Get(':workspaceId')
  @UseGuards(WorkspaceRoleGuard)
  @ApiOperation({ summary: 'Get workspace details by ID' })
  async getDetails(@Param('workspaceId') workspaceId: string) {
    const workspace = await this.workspacesService.getWorkspaceDetails(workspaceId);
    return {
      success: true,
      data: workspace,
    };
  }

  @Get(':workspaceId/members')
  @UseGuards(WorkspaceRoleGuard)
  @ApiOperation({ summary: 'List all members in the workspace' })
  async listMembers(@Param('workspaceId') workspaceId: string) {
    const members = await this.workspacesService.getWorkspaceMembers(workspaceId);
    return {
      success: true,
      data: members,
    };
  }

  @Post(':workspaceId/members')
  @UseGuards(WorkspaceRoleGuard)
  @RequireRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ApiOperation({ summary: 'Invite a new member to the workspace' })
  @ApiResponse({ status: 201, description: 'Member invited successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async inviteMember(
    @Param('workspaceId') workspaceId: string,
    @ActiveWorkspace() ctx: ActiveWorkspaceContext,
    @Body() dto: InviteMemberDto,
  ) {
    const member = await this.workspacesService.inviteMember(
      workspaceId,
      ctx.userId,
      ctx.role,
      dto,
    );
    return {
      success: true,
      data: member,
    };
  }

  @Patch(':workspaceId/members/:userId/role')
  @UseGuards(WorkspaceRoleGuard)
  @RequireRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ApiOperation({ summary: 'Update a member role' })
  @ApiResponse({ status: 200, description: 'Member role updated' })
  @ApiResponse({ status: 403, description: 'Privilege escalation rejected' })
  async updateRole(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string,
    @ActiveWorkspace() ctx: ActiveWorkspaceContext,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    const updated = await this.workspacesService.updateMemberRole(
      workspaceId,
      ctx.userId,
      ctx.role,
      targetUserId,
      dto.role,
    );
    return {
      success: true,
      data: updated,
    };
  }

  @Delete(':workspaceId/members/:userId')
  @UseGuards(WorkspaceRoleGuard)
  @RequireRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ApiOperation({ summary: 'Remove a member from the workspace' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  @ApiResponse({ status: 403, description: 'Forbidden action' })
  async removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string,
    @ActiveWorkspace() ctx: ActiveWorkspaceContext,
  ) {
    const result = await this.workspacesService.removeMember(
      workspaceId,
      ctx.userId,
      ctx.role,
      targetUserId,
    );
    return result;
  }
}
