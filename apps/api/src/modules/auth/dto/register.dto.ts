import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'alex@teamflow.dev', description: 'User corporate email' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ example: 'Password123!', description: 'Password (min 6 characters)' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({ example: 'Alex Morgan', description: 'User full display name' })
  @IsString()
  @IsNotEmpty({ message: 'Display name is required' })
  displayName: string;
}
