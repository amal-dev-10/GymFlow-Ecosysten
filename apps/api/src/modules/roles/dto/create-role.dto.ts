import { IsNotEmpty, IsString, IsOptional, IsArray, IsEnum } from 'class-validator';

export class CreateRoleDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: 'Administration' | 'Operations' | 'Finance' | 'Fitness' | 'Custom';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[]; // list of permission strings, e.g. ["member.create"]

  @IsOptional()
  gymScope?: 'all' | string[]; // "all" or specific gym branch IDs
}
