export const FILE_PROCESSING_QUEUE = 'file-processing-queue';
export const JOB_PROCESS_FILE = 'process-file';

export interface ProcessFileJobData {
  fileId: string;
  workspaceId: string;
  objectKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  actorId: string;
}
