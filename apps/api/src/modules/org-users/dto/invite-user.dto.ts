import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class InviteUserDto {
  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gymIds?: string[];

  @IsOptional()
  @IsString()
  message?: string;
}
