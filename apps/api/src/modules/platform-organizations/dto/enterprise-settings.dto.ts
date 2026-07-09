import { IsOptional, IsBoolean, IsNumber, Min, IsString } from 'class-validator';

export class UpdateEnterpriseSettingsDto {
  @IsOptional()
  @IsBoolean()
  isEnterpriseCustom?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  customPrice?: number | null;

  @IsOptional()
  @IsString()
  privateNotes?: string;

  @IsOptional()
  @IsString()
  dedicatedSupportContact?: string;

  @IsOptional()
  @IsString()
  customSlaTerms?: string;
}
