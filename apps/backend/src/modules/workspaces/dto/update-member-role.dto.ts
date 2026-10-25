import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { WorkspaceRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @ApiProperty({
    enum: WorkspaceRole,
    example: WorkspaceRole.ADMIN,
    description: 'Updated role in the workspace',
  })
  @IsEnum(WorkspaceRole, { message: 'Role must be OWNER, ADMIN, MEMBER, or VIEWER' })
  @IsNotEmpty()
  role: WorkspaceRole;
}
