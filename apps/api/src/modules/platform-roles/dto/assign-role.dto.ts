import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class AssignRoleDto {
  @IsNotEmpty()
  @IsString()
  platformUserId: string;

  @IsOptional()
  @IsBoolean()
  isTemporary?: boolean;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  approverName?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
