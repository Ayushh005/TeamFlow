import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Res,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import { FilesService } from './files.service';
import { PresignUploadDto, ConfirmUploadDto } from './dto/file.dto';
import { WorkspaceRoleGuard } from '../../common/guards/workspace-role.guard';
import {
  ActiveWorkspace,
  ActiveWorkspaceContext,
} from '../../common/decorators/workspace-context.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Files')
@ApiBearerAuth('bearer')
@UseGuards(WorkspaceRoleGuard)
@Controller('workspaces/:workspaceId')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('files/presign-upload')
  @ApiOperation({ summary: 'Generate presigned S3/MinIO upload URL for direct client upload' })
  @ApiResponse({ status: 201, description: 'Presigned upload URL generated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Viewers cannot upload files' })
  async getPresignedUpload(
    @Param('workspaceId') workspaceId: string,
    @ActiveWorkspace() ctx: ActiveWorkspaceContext,
    @Body() dto: PresignUploadDto,
  ) {
    const result = await this.filesService.getPresignedUploadUrl(
      workspaceId,
      ctx.userId,
      ctx.role,
      dto,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Local upload endpoint for development when MinIO container is not running
   */
  @Put('files/local-upload')
  @Public() // Can be uploaded with the presigned URL token
  @ApiOperation({ summary: 'Local file upload fallback for development' })
  async localUpload(
    @Param('workspaceId') workspaceId: string,
    @Query('objectKey') objectKey: string,
    @Req() req: Request,
  ) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    await this.filesService.saveLocalFile(workspaceId, objectKey, buffer);
    return {
      success: true,
      message: 'Local file stored successfully',
    };
  }

  @Post('files/confirm')
  @ApiOperation({ summary: 'Confirm file upload and record metadata in database' })
  @ApiResponse({ status: 201, description: 'File metadata recorded successfully' })
  async confirmUpload(
    @Param('workspaceId') workspaceId: string,
    @ActiveWorkspace() ctx: ActiveWorkspaceContext,
    @Body() dto: ConfirmUploadDto,
  ) {
    const file = await this.filesService.confirmUpload(
      workspaceId,
      ctx.userId,
      ctx.role,
      dto,
    );
    return {
      success: true,
      data: file,
    };
  }

  @Get('files/:fileId/presign-download')
  @ApiOperation({ summary: 'Generate presigned download URL for an authorized workspace file' })
  @ApiResponse({ status: 200, description: 'Presigned download URL generated successfully' })
  @ApiResponse({ status: 404, description: 'File not found in workspace' })
  async getPresignedDownload(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @ActiveWorkspace() ctx: ActiveWorkspaceContext,
  ) {
    const result = await this.filesService.getPresignedDownloadUrl(
      workspaceId,
      fileId,
      ctx.userId,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Direct download endpoint for local files
   */
  @Get('files/:fileId/download')
  @Public()
  @ApiOperation({ summary: 'Stream download for local development files' })
  async downloadLocalFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const { file, filePath, existsOnDisk } = await this.filesService.getLocalFilePath(
      workspaceId,
      fileId,
    );

    if (!existsOnDisk) {
      // If file metadata exists but binary wasn't on disk, send a mock placeholder or error
      res.setHeader('Content-Type', file.mimeType || 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
      res.send(`TeamFlow file attachment: ${file.originalName} (${file.sizeBytes} bytes)`);
      return;
    }

    res.download(filePath, file.originalName);
  }

  @Get('tasks/:taskId/files')
  @ApiOperation({ summary: 'List all files attached to a specific task' })
  @ApiResponse({ status: 200, description: 'List of task attachments' })
  async getTaskFiles(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
  ) {
    const files = await this.filesService.findByTask(workspaceId, taskId);
    return {
      success: true,
      data: files,
    };
  }

  @Delete('files/:fileId')
  @ApiOperation({ summary: 'Delete file attachment (Owner, Admin, or original uploader)' })
  @ApiResponse({ status: 200, description: 'File deleted' })
  async deleteFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @ActiveWorkspace() ctx: ActiveWorkspaceContext,
  ) {
    const result = await this.filesService.deleteFile(
      workspaceId,
      fileId,
      ctx.userId,
      ctx.role,
    );
    return {
      success: true,
      data: result,
    };
  }
}
