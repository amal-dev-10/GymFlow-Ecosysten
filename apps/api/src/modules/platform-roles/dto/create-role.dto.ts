import { IsNotEmpty, IsString, IsOptional, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class PermissionGrantDto {
  @IsNotEmpty()
  @IsString()
  permissionKey: string;

  @IsIn(['ALLOW', 'DENY'])
  effect: 'ALLOW' | 'DENY';

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateRoleDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  colorTag?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryKeys?: string[]; // step 2 of the wizard - informational scoping, not persisted separately

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionGrantDto)
  permissions?: PermissionGrantDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  inheritsRoleIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignUserIds?: string[]; // PlatformAdminUser ids to assign on creation (wizard step 4)

  @IsOptional()
  @IsString()
  fromTemplateId?: string;
}
