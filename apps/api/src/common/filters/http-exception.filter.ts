import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message: string | string[] = 'Internal server error';

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      message = (exceptionResponse as any).message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.method}] ${request.url} - Status: ${status}`,
        exception instanceof Error ? exception.stack : JSON.stringify(exception),
      );
    } else {
      this.logger.warn(`[${request.method}] ${request.url} - Status: ${status} - ${JSON.stringify(message)}`);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      error:
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'error' in exceptionResponse
          ? (exceptionResponse as any).error
          : HttpStatus[status],
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
