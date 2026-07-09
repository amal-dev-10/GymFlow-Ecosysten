import { IsString, IsOptional, IsArray } from 'class-validator';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: 'Administration' | 'Operations' | 'Finance' | 'Fitness' | 'Custom';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @IsOptional()
  gymScope?: 'all' | string[];
}
