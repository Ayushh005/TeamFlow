import { Module } from '@nestjs/common';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { WorkspaceRoleGuard } from '../../common/guards/workspace-role.guard';

@Module({
  controllers: [ActivityController],
  providers: [ActivityService, WorkspaceRoleGuard],
  exports: [ActivityService],
})
export class ActivityModule {}
