import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  FILE_PROCESSING_QUEUE,
  JOB_PROCESS_FILE,
  ProcessFileJobData,
} from '../constants/queue.constants';
import { FileProcessingWorker } from '../workers/file-processing.worker';

@Injectable()
export class FileJobsProducer {
  private readonly logger = new Logger(FileJobsProducer.name);

  constructor(
    @Optional()
    @InjectQueue(FILE_PROCESSING_QUEUE)
    private readonly fileQueue: Queue | null,
    private readonly worker: FileProcessingWorker,
  ) {}

  /**
   * Enqueues file processing job to BullMQ with exponential backoff retries.
   * Falls back to async in-process execution if Redis is offline during local development.
   */
  async enqueueFileProcessing(data: ProcessFileJobData): Promise<void> {
    try {
      if (this.fileQueue) {
        await this.fileQueue.add(JOB_PROCESS_FILE, data, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000, // 2s, 4s, 8s backoff
          },
          removeOnComplete: true,
          removeOnFail: 50,
        });

        this.logger.log(
          `Enqueued background job to Redis BullMQ queue '${FILE_PROCESSING_QUEUE}' for file '${data.originalName}'`,
        );
        return;
      }
    } catch (err: any) {
      this.logger.warn(
        `Redis queue enqueue error (${err.message}). Executing file job asynchronously in fallback worker.`,
      );
    }

    // Resilient local fallback when Redis is offline
    setImmediate(async () => {
      try {
        await this.worker.executeFileProcessing(data);
      } catch (err: any) {
        this.logger.error(`Fallback file job execution error: ${err.message}`);
      }
    });
  }
}
