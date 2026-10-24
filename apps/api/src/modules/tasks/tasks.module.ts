import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { WorkspaceRoleGuard } from '../../common/guards/workspace-role.guard';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [TasksController],
  providers: [TasksService, WorkspaceRoleGuard],
  exports: [TasksService],
})
export class TasksModule {}
