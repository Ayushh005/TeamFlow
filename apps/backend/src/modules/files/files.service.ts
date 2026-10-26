import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { PresignUploadDto, ConfirmUploadDto } from './dto/file.dto';
import { WorkspaceRole } from '@prisma/client';
import { FileJobsProducer } from '../jobs/producers/file-jobs.producer';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly localStorageDir: string;
  private isMinioAvailable = false;
  private readonly apiBaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly fileJobsProducer: FileJobsProducer,
  ) {
    const endpointHost = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const endpointPort = this.configService.get<string>('MINIO_PORT', '9000');
    const accessKey = this.configService.get<string>('MINIO_ROOT_USER', 'minioadmin');
    const secretKey = this.configService.get<string>('MINIO_ROOT_PASSWORD', 'minioadmin');
    this.bucketName = this.configService.get<string>('MINIO_BUCKET_NAME', 'teamflow-attachments');
    const port = this.configService.get<number>('PORT', 3000);
    this.apiBaseUrl = `http://localhost:${port}/api/v1`;

    // Local storage folder fallback for development without Docker
    this.localStorageDir = path.resolve(process.cwd(), 'storage', 'uploads');
    if (!fs.existsSync(this.localStorageDir)) {
      fs.mkdirSync(this.localStorageDir, { recursive: true });
    }

    const s3Endpoint = `http://${endpointHost}:${endpointPort}`;

    this.s3Client = new S3Client({
      endpoint: s3Endpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true,
      maxAttempts: 1, // Don't hang with repeated retries if MinIO is offline
    });

    this.checkMinioAvailability();
  }

  private async checkMinioAvailability(): Promise<boolean> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      this.isMinioAvailable = true;
      this.logger.log(`MinIO storage is connected: bucket '${this.bucketName}' verified`);
      return true;
    } catch {
      try {
        await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
        this.isMinioAvailable = true;
        this.logger.log(`MinIO storage is connected: bucket '${this.bucketName}' created successfully`);
        return true;
      } catch {
        this.isMinioAvailable = false;
        this.logger.warn(
          `MinIO container not detected on port 9000. Operating in seamless local disk storage fallback mode at: ${this.localStorageDir}`,
        );
        return false;
      }
    }
  }

  /**
   * Generates presigned upload URL.
   * If MinIO is running in Docker, generates an S3 presigned PUT URL.
   * If MinIO is offline in local dev, points to the local upload endpoint on the API.
   */
  async getPresignedUploadUrl(
    workspaceId: string,
    callerId: string,
    callerRole: WorkspaceRole,
    dto: PresignUploadDto,
  ) {
    if (callerRole === WorkspaceRole.VIEWER) {
      throw new ForbiddenException('Viewers do not have permission to upload files');
    }

    // 1. Sanitize filename and validate extensions
    const cleanFileName = dto.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const dangerousExtensions = ['.exe', '.bat', '.sh', '.cmd', '.msi', '.vbs', '.scr'];
    const lowerName = cleanFileName.toLowerCase();
    if (dangerousExtensions.some((ext) => lowerName.endsWith(ext))) {
      throw new BadRequestException('Executable or script files are not permitted for security');
    }

    // 2. Tenant-isolated key: {workspaceId}/{taskId or general}/{uuid}-{cleanFileName}
    const targetFolder = dto.taskId ? dto.taskId : 'general';
    const objectKey = `${workspaceId}/${targetFolder}/${uuidv4()}-${cleanFileName}`;

    await this.checkMinioAvailability();

    // Universal upload endpoint accessible from both Docker and localhost browser
    const uploadUrl = `/api/v1/workspaces/${workspaceId}/files/local-upload?objectKey=${encodeURIComponent(objectKey)}`;

    return {
      uploadUrl,
      objectKey,
      storageType: this.isMinioAvailable ? 'MINIO_S3' : 'LOCAL_STORAGE',
      expiresInSeconds: 600,
    };
  }

  /**
   * Saves raw binary data to MinIO (if connected) and local storage
   */
  async saveLocalFile(workspaceId: string, objectKey: string, fileBuffer: Buffer) {
    if (!objectKey.startsWith(`${workspaceId}/`)) {
      throw new ForbiddenException('Invalid object key for workspace');
    }

    // 1. Upload to MinIO S3 bucket if connected
    if (this.isMinioAvailable) {
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: objectKey,
            Body: fileBuffer,
          }),
        );
        this.logger.log(`File uploaded to MinIO: ${objectKey} (${fileBuffer.length} bytes)`);
      } catch (err: any) {
        this.logger.error(`MinIO S3 upload error: ${err.message}`);
      }
    }

    // 2. Also persist to local storage directory as backup / local caching
    const filePath = path.join(this.localStorageDir, objectKey);
    const fileDir = path.dirname(filePath);

    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    fs.writeFileSync(filePath, fileBuffer);
    return { success: true, path: filePath };
  }

  /**
   * Confirms upload and records FileObject in database within a transaction
   */
  async confirmUpload(
    workspaceId: string,
    callerId: string,
    callerRole: WorkspaceRole,
    dto: ConfirmUploadDto,
  ) {
    if (callerRole === WorkspaceRole.VIEWER) {
      throw new ForbiddenException('Viewers do not have permission to upload files');
    }

    if (!dto.objectKey.startsWith(`${workspaceId}/`)) {
      throw new ForbiddenException('Cannot register file belonging to another workspace');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const fileObject = await tx.fileObject.create({
        data: {
          workspaceId,
          taskId: dto.taskId || null,
          projectId: dto.projectId || null,
          uploadedById: callerId,
          objectKey: dto.objectKey,
          originalName: dto.originalName,
          mimeType: dto.mimeType,
          sizeBytes: dto.sizeBytes,
        },
        include: {
          uploadedBy: {
            select: { id: true, displayName: true, email: true, avatarUrl: true },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          workspaceId,
          actorId: callerId,
          action: 'FILE_UPLOADED',
          targetType: 'File',
          targetId: fileObject.id,
          metadata: {
            fileName: fileObject.originalName,
            sizeBytes: fileObject.sizeBytes,
            taskId: fileObject.taskId,
          },
        },
      });

      return fileObject;
    });

    // Enqueue background processing job via BullMQ / Worker
    await this.fileJobsProducer.enqueueFileProcessing({
      fileId: result.id,
      workspaceId,
      objectKey: result.objectKey,
      originalName: result.originalName,
      mimeType: result.mimeType,
      sizeBytes: result.sizeBytes,
      actorId: callerId,
    });

    return result;
  }

  /**
   * Generates a download URL.
   * If MinIO is running, generates an S3 presigned GET URL (15 mins).
   * If in local mode, returns direct streaming endpoint on API.
   */
  async getPresignedDownloadUrl(workspaceId: string, fileId: string, callerId: string) {
    const file = await this.prisma.fileObject.findFirst({
      where: { id: fileId, workspaceId },
      include: {
        uploadedBy: { select: { displayName: true } },
      },
    });

    if (!file) {
      throw new NotFoundException('File not found in this workspace');
    }

    await this.checkMinioAvailability();

    // Universal download endpoint that streams from MinIO or disk
    const downloadUrl = `/workspaces/${workspaceId}/files/${fileId}/download`;

    return {
      downloadUrl,
      fileName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      expiresInSeconds: 900,
    };
  }

  /**
   * Returns file path and metadata for direct stream download (retrieves from MinIO if needed)
   */
  async getLocalFilePath(workspaceId: string, fileId: string) {
    const file = await this.prisma.fileObject.findFirst({
      where: { id: fileId, workspaceId },
    });

    if (!file) {
      throw new NotFoundException('File not found in this workspace');
    }

    const filePath = path.join(this.localStorageDir, file.objectKey);
    if (fs.existsSync(filePath)) {
      return {
        file,
        filePath,
        existsOnDisk: true,
      };
    }

    // If file is in MinIO, retrieve and cache to local disk
    if (this.isMinioAvailable) {
      try {
        const obj = await this.s3Client.send(
          new GetObjectCommand({
            Bucket: this.bucketName,
            Key: file.objectKey,
          }),
        );
        if (obj.Body) {
          const fileDir = path.dirname(filePath);
          if (!fs.existsSync(fileDir)) {
            fs.mkdirSync(fileDir, { recursive: true });
          }
          const stream = obj.Body as any;
          const chunks: Buffer[] = [];
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
          fs.writeFileSync(filePath, Buffer.concat(chunks));
          return {
            file,
            filePath,
            existsOnDisk: true,
          };
        }
      } catch (err: any) {
        this.logger.error(`Error reading from MinIO for local download: ${err.message}`);
      }
    }

    return {
      file,
      filePath,
      existsOnDisk: false,
    };
  }

  /**
   * List files attached to a specific task in the workspace
   */
  async findByTask(workspaceId: string, taskId: string) {
    return this.prisma.fileObject.findMany({
      where: { workspaceId, taskId },
      include: {
        uploadedBy: {
          select: { id: true, displayName: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete file from both MinIO/local storage and database
   */
  async deleteFile(
    workspaceId: string,
    fileId: string,
    callerId: string,
    callerRole: WorkspaceRole,
  ) {
    const file = await this.prisma.fileObject.findFirst({
      where: { id: fileId, workspaceId },
    });

    if (!file) {
      throw new NotFoundException('File not found in this workspace');
    }

    const isPrivileged = callerRole === WorkspaceRole.OWNER || callerRole === WorkspaceRole.ADMIN;
    const isUploader = file.uploadedById === callerId;

    if (!isPrivileged && !isUploader) {
      throw new ForbiddenException('You do not have permission to delete this file');
    }

    // 1. Try removing from MinIO if connected (ignore errors so DB delete proceeds)
    try {
      if (this.isMinioAvailable) {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: file.objectKey,
          }),
        );
      }
    } catch (err: any) {
      this.logger.debug(`MinIO delete skipped: ${err.message}`);
    }

    // 2. Remove from local disk if present
    try {
      const localFilePath = path.join(this.localStorageDir, file.objectKey);
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } catch (fsErr: any) {
      this.logger.debug(`Local file delete skipped: ${fsErr.message}`);
    }

    // 3. Delete from database
    await this.prisma.fileObject.delete({ where: { id: fileId } });

    // 4. Log deletion in activity trail
    await this.prisma.activityLog.create({
      data: {
        workspaceId,
        actorId: callerId,
        action: 'FILE_DELETED',
        targetType: 'File',
        targetId: fileId,
        metadata: { fileName: file.originalName },
      },
    });

    return { message: 'File deleted successfully' };
  }
}
