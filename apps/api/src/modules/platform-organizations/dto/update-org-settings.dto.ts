import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateOrgSettingsDto {
  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  dateFormat?: string;

  @IsOptional()
  @IsIn(['ESSENTIAL', 'PROFESSIONAL', 'EXPERT'])
  workspaceExperienceOverride?: string | null;
}
