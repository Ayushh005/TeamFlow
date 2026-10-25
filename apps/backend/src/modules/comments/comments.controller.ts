import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/comment.dto';
import { WorkspaceRoleGuard } from '../../common/guards/workspace-role.guard';
import {
  ActiveWorkspace,
  ActiveWorkspaceContext,
} from '../../common/decorators/workspace-context.decorator';

@ApiTags('Comments')
@ApiBearerAuth('bearer')
@UseGuards(WorkspaceRoleGuard)
@Controller('workspaces/:workspaceId/tasks/:taskId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Add a comment to a task' })
  @ApiResponse({ status: 201, description: 'Comment created' })
  @ApiResponse({ status: 403, description: 'Forbidden for Viewers' })
  async create(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
    @ActiveWorkspace() ctx: ActiveWorkspaceContext,
    @Body() dto: CreateCommentDto,
  ) {
    const comment = await this.commentsService.createComment(
      workspaceId,
      taskId,
      ctx.userId,
      ctx.role,
      dto,
    );
    return {
      success: true,
      data: comment,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all comments on a task' })
  async findAll(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
  ) {
    const comments = await this.commentsService.findByTask(workspaceId, taskId);
    return {
      success: true,
      data: comments,
    };
  }
}
