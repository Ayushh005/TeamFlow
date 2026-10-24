import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { WorkspaceRoleGuard } from '../../common/guards/workspace-role.guard';

@Module({
  controllers: [TasksController],
  providers: [TasksService, WorkspaceRoleGuard],
  exports: [TasksService],
})
export class TasksModule {}
