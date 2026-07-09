import { IsOptional, IsInt, Min, IsBoolean, IsObject } from 'class-validator';

export class UpdateRetentionSettingDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  defaultRetentionDays?: number | null;

  @IsOptional()
  @IsBoolean()
  archiveEnabled?: boolean;

  @IsOptional()
  @IsObject()
  categoryOverrides?: Record<string, number>;
}
