import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { WorkspaceRole } from '@prisma/client';

export class InviteMemberDto {
  @ApiProperty({ example: 'colleague@teamflow.dev', description: 'Member corporate email' })
  @IsEmail({}, { message: 'Please provide a valid email' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    enum: WorkspaceRole,
    example: WorkspaceRole.MEMBER,
    description: 'Workspace role: ADMIN, MEMBER, or VIEWER',
  })
  @IsEnum(WorkspaceRole, { message: 'Role must be OWNER, ADMIN, MEMBER, or VIEWER' })
  role: WorkspaceRole = WorkspaceRole.MEMBER;
}
