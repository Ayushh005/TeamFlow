import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { WorkspaceRoleGuard } from '../../common/guards/workspace-role.guard';
import {
  ActiveWorkspace,
  ActiveWorkspaceContext,
} from '../../common/decorators/workspace-context.decorator';
import { TaskPriority, TaskStatus, WorkspaceRole } from '@prisma/client';
import { RequireRoles } from '../../common/decorators/roles.decorator';

@ApiTags('Tasks')
@ApiBearerAuth('bearer')
@UseGuards(WorkspaceRoleGuard)
@Controller('workspaces/:workspaceId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task in the workspace' })
  @ApiResponse({ status: 201, description: 'Task created' })
  @ApiResponse({ status: 403, description: 'Forbidden for Viewers' })
  async create(
    @Param('workspaceId') workspaceId: string,
    @ActiveWorkspace() ctx: ActiveWorkspaceContext,
    @Body() dto: CreateTaskDto,
  ) {
    const task = await this.tasksService.createTask(
      workspaceId,
      ctx.userId,
      ctx.role,
      dto,
    );
    return {
      success: true,
      data: task,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List tasks in workspace with optional filters' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', enum: TaskStatus, required: false })
  @ApiQuery({ name: 'priority', enum: TaskPriority, required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Param('workspaceId') workspaceId: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: TaskPriority,
    @Query('search') search?: string,
  ) {
    const tasks = await this.tasksService.findAll(
      workspaceId,
      projectId,
      status,
      priority,
      search,
    );
    return {
      success: true,
      data: tasks,
    };
  }

  @Get(':taskId')
  @ApiOperation({ summary: 'Get single task details with comments and activity' })
  async findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
  ) {
    const task = await this.tasksService.findById(workspaceId, taskId);
    return {
      success: true,
      data: task,
    };
  }

  @Patch(':taskId')
  @ApiOperation({ summary: 'Update task fields or transition status' })
  async update(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
    @ActiveWorkspace() ctx: ActiveWorkspaceContext,
    @Body() dto: UpdateTaskDto,
  ) {
    const task = await this.tasksService.updateTask(
      workspaceId,
      taskId,
      ctx.userId,
      ctx.role,
      dto,
    );
    return {
      success: true,
      data: task,
    };
  }

  @Delete(':taskId')
  @RequireRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ApiOperation({ summary: 'Delete a task (Owner/Admin only)' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden for non-Admin/non-Owner' })
  async remove(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
    @ActiveWorkspace() ctx: ActiveWorkspaceContext,
  ) {
    return this.tasksService.deleteTask(
      workspaceId,
      taskId,
      ctx.userId,
      ctx.role,
    );
  }
}
