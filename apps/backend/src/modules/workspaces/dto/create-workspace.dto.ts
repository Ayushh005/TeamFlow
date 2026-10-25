import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateWorkspaceDto {
  @ApiProperty({ example: 'FinTech Engineering', description: 'Name of the workspace' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Workspace name must be at least 2 characters long' })
  name: string;
}
