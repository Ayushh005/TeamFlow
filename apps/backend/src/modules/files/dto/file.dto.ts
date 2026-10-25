import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PresignUploadDto {
  @ApiProperty({ description: 'Original file name including extension', example: 'architecture-diagram.png' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ description: 'MIME type of the file', example: 'image/png' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes (max 10MB = 10,485,760 bytes)', example: 1048576 })
  @IsNumber()
  @Min(1)
  @Max(10485760, { message: 'File size exceeds maximum limit of 10MB' })
  sizeBytes: number;

  @ApiPropertyOptional({ description: 'Associated Task ID' })
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiPropertyOptional({ description: 'Associated Project ID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}

export class ConfirmUploadDto {
  @ApiProperty({ description: 'Object storage key returned from presign step' })
  @IsString()
  @IsNotEmpty()
  objectKey: string;

  @ApiProperty({ description: 'Original file name' })
  @IsString()
  @IsNotEmpty()
  originalName: string;

  @ApiProperty({ description: 'MIME type' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsNumber()
  @Min(1)
  sizeBytes: number;

  @ApiPropertyOptional({ description: 'Associated Task ID' })
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiPropertyOptional({ description: 'Associated Project ID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}
