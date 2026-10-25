import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'Mobile App Redesign', description: 'Project name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Project name must be at least 2 characters long' })
  name: string;

  @ApiPropertyOptional({
    example: 'Revamping navigation, offline caching, and real-time sync for iOS & Android.',
    description: 'Detailed project description',
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateProjectDto {
  @ApiPropertyOptional({ example: 'Mobile App v2' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated project description' })
  @IsString()
  @IsOptional()
  description?: string;
}
