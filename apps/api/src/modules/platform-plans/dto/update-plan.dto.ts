import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  IsInt,
  IsEnum,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ResourceLimitInputDto } from './resource-limit-input.dto';
import { FeatureAccessInputDto } from './feature-access-input.dto';
import { BrandingConfigDto } from './branding-config.dto';
import { PlanStatusInput, PlanVisibilityInput, BillingCycleInput, WorkspaceExperienceInput } from './create-plan.dto';

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  internalCode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  badge?: string;

  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @IsOptional()
  @IsEnum(PlanStatusInput)
  status?: PlanStatusInput;

  @IsOptional()
  @IsEnum(PlanVisibilityInput)
  visibility?: PlanVisibilityInput;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(BillingCycleInput)
  billingCycle?: BillingCycleInput;

  @IsOptional()
  @IsInt()
  @Min(0)
  trialDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  setupFee?: number;

  @IsOptional()
  @IsBoolean()
  taxIncluded?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsEnum(WorkspaceExperienceInput)
  workspaceExperienceDefault?: WorkspaceExperienceInput;

  @IsOptional()
  @IsBoolean()
  allowExperienceOverride?: boolean;

  @IsOptional()
  @IsBoolean()
  brandingAllowed?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => BrandingConfigDto)
  brandingConfig?: BrandingConfigDto;

  @IsOptional()
  @IsBoolean()
  downgradeAllowed?: boolean;

  @IsOptional()
  @IsBoolean()
  autoUpgrade?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodDays?: number;

  @IsOptional()
  @IsString()
  trialConversionPlanId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceLimitInputDto)
  resourceLimits?: ResourceLimitInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeatureAccessInputDto)
  featureAccess?: FeatureAccessInputDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  upgradeableToPlanIds?: string[];
}
