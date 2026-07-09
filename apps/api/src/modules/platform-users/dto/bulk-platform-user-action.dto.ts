import { IsArray, IsString, IsIn, IsOptional, ArrayNotEmpty } from 'class-validator';

export class BulkPlatformUserActionDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  userIds: string[];

  @IsIn(['activate', 'suspend', 'assign_department', 'assign_role', 'export', 'delete'])
  action: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
