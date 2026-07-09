import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateSettingsCategoryDto {
  @IsObject()
  values: Record<string, any>;

  @IsOptional()
  @IsString()
  changeNote?: string;
}
