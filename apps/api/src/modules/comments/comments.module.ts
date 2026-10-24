import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { WorkspaceRoleGuard } from '../../common/guards/workspace-role.guard';

@Module({
  controllers: [CommentsController],
  providers: [CommentsService, WorkspaceRoleGuard],
  exports: [CommentsService],
})
export class CommentsModule {}
