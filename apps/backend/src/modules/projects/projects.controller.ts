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
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { WorkspaceRoleGuard } from '../../common/guards/workspace-role.guard';
import {
  ActiveWorkspace,
  ActiveWorkspaceContext,
} from '../../common/decorators/workspace-context.decorator';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { WorkspaceRole } from '@prisma/client';

@ApiTags('Projects')
@ApiBearerAuth('bearer')
@UseGuards(WorkspaceRoleGuard)
@Controller('workspaces/:workspaceId/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project in the workspace' })
  @ApiResponse({ status: 201, description: 'Project created' })
  @ApiResponse({ status: 403, description: 'Forbidden for Viewers' })
  async create(
    @Param('workspaceId') workspaceId: string,
    @ActiveWorkspace() ctx: ActiveWorkspaceContext,
    @Body() dto: CreateProjectDto,
  ) {
    const project = await this.projectsService.createProject(
      workspaceId,
      ctx.userId,
      ctx.role,
      dto,
    );
    return {
      success: true,
      data: project,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all active projects in the workspace' })
  async findAll(@Param('workspaceId') workspaceId: string) {
    const projects = await this.projectsService.findAll(workspaceId);
    return {
      success: true,
      data: projects,
    };
  }

  @Get(':projectId')
  @ApiOperation({ summary: 'Get project details with tasks' })
  async findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    const project = await this.projectsService.findById(workspaceId, projectId);
    return {
      success: true,
      data: project,
    };
  }

  @Patch(':projectId')
  @ApiOperation({ summary: 'Update project details' })
  async update(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @ActiveWorkspace() ctx: ActiveWorkspaceContext,
    @Body() dto: UpdateProjectDto,
  ) {
    const project = await this.projectsService.update(
      workspaceId,
      projectId,
      ctx.userId,
      ctx.role,
      dto,
    );
    return {
      success: true,
      data: project,
    };
  }

  @Delete(':projectId')
  @RequireRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ApiOperation({ summary: 'Archive/Delete a project (Owner/Admin only)' })
  @ApiResponse({ status: 200, description: 'Project archived' })
  @ApiResponse({ status: 403, description: 'Forbidden for non-Admin/non-Owner' })
  async archive(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @ActiveWorkspace() ctx: ActiveWorkspaceContext,
  ) {
    return this.projectsService.archive(
      workspaceId,
      projectId,
      ctx.userId,
      ctx.role,
    );
  }
}
