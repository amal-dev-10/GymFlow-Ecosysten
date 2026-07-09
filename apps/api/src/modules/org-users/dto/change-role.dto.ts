import { IsOptional, IsString, IsArray } from 'class-validator';

export class ChangeRoleDto {
  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];
}
