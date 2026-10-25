import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { WorkspaceRoleGuard } from '../../common/guards/workspace-role.guard';

@ApiTags('Activity')
@ApiBearerAuth('bearer')
@UseGuards(WorkspaceRoleGuard)
@Controller('workspaces/:workspaceId/activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @ApiOperation({ summary: 'Get workspace audit activity feed' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getActivity(
    @Param('workspaceId') workspaceId: string,
    @Query('limit') limit?: number,
  ) {
    const logs = await this.activityService.getWorkspaceActivity(
      workspaceId,
      limit ? Number(limit) : 50,
    );
    return {
      success: true,
      data: logs,
    };
  }
}
