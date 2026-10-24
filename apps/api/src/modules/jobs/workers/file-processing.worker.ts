import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  FILE_PROCESSING_QUEUE,
  JOB_PROCESS_FILE,
  ProcessFileJobData,
} from '../constants/queue.constants';

@Processor(FILE_PROCESSING_QUEUE)
export class FileProcessingWorker extends WorkerHost {
  private readonly logger = new Logger(FileProcessingWorker.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /**
   * BullMQ queue job processor
   */
  async process(job: Job<ProcessFileJobData, any, string>): Promise<any> {
    this.logger.log(
      `Processing background job ${job.id} for file '${job.data.originalName}' (attempt ${job.attemptsMade + 1}/${job.opts.attempts || 3})`,
    );

    return this.executeFileProcessing(job.data);
  }

  /**
   * Core async file processing logic:
   * 1. Simulates metadata extraction & thumbnail placeholder generation
   * 2. Logs background audit trail entry
   */
  async executeFileProcessing(data: ProcessFileJobData): Promise<{ status: string; processedAt: string }> {
    const isImage = data.mimeType.startsWith('image/');
    const isPdf = data.mimeType === 'application/pdf';

    const metadata = {
      processed: true,
      hasThumbnail: isImage || isPdf,
      fileCategory: isImage ? 'IMAGE' : isPdf ? 'DOCUMENT' : 'GENERIC',
      checksumType: 'SHA256_SIMULATED',
      processedAt: new Date().toISOString(),
    };

    // Log async background completion in audit log
    await this.prisma.activityLog.create({
      data: {
        workspaceId: data.workspaceId,
        actorId: data.actorId,
        action: 'FILE_PROCESSED',
        targetType: 'File',
        targetId: data.fileId,
        metadata: {
          fileName: data.originalName,
          ...metadata,
        },
      },
    });

    this.logger.log(
      `Successfully processed file '${data.originalName}' [${data.fileId}] asynchronously`,
    );

    return {
      status: 'COMPLETED',
      processedAt: metadata.processedAt,
    };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} in queue '${FILE_PROCESSING_QUEUE}' completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `Job ${job.id} in queue '${FILE_PROCESSING_QUEUE}' failed: ${err.message}`,
      err.stack,
    );
  }
}
