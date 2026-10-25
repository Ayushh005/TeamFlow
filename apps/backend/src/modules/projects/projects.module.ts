import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { WorkspaceRoleGuard } from '../../common/guards/workspace-role.guard';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, WorkspaceRoleGuard],
  exports: [ProjectsService],
})
export class ProjectsModule {}
