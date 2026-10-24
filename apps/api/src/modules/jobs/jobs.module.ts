import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FILE_PROCESSING_QUEUE } from './constants/queue.constants';
import { FileJobsProducer } from './producers/file-jobs.producer';
import { FileProcessingWorker } from './workers/file-processing.worker';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          retryStrategy: (times) => {
            // In local dev without Docker, don't spam reconnection logs
            if (times > 2) {
              return null;
            }
            return 1000;
          },
        },
      }),
    }),
    BullModule.registerQueue({
      name: FILE_PROCESSING_QUEUE,
    }),
  ],
  providers: [FileJobsProducer, FileProcessingWorker],
  exports: [FileJobsProducer, FileProcessingWorker],
})
export class JobsModule {}
