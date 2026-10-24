import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Reviewed the PR, looks clean and meets AC.', description: 'Comment text body' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  body: string;
}
