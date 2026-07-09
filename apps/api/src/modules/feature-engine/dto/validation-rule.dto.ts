import { IsOptional, IsBoolean, IsInt, Min } from 'class-validator';

export class UpdateValidationRuleDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  warningThresholdValue?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  graceDays?: number;

  @IsOptional()
  @IsBoolean()
  autoSuspendEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  autoUpgradeRecommend?: boolean;

  @IsOptional()
  @IsBoolean()
  displayUpgradeBanner?: boolean;
}
