import { IsNotEmpty, IsString, IsOptional, IsEnum, IsInt, Min, IsDateString, ValidateIf } from 'class-validator';

export enum OverrideScopeInput {
  FEATURE = 'FEATURE',
  RESOURCE = 'RESOURCE',
}

export enum OverrideTypeInput {
  TEMPORARY = 'TEMPORARY',
  PERMANENT = 'PERMANENT',
  EMERGENCY = 'EMERGENCY',
}

export enum FeatureStateInput {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
  BETA = 'BETA',
  ENTERPRISE_ONLY = 'ENTERPRISE_ONLY',
  HIDDEN = 'HIDDEN',
  COMING_SOON = 'COMING_SOON',
}

export enum ResourceLimitTypeInput {
  LIMITED = 'LIMITED',
  UNLIMITED = 'UNLIMITED',
  DISABLED = 'DISABLED',
}

export class CreateOverrideDto {
  @IsNotEmpty()
  @IsString()
  organizationId: string;

  @IsNotEmpty()
  @IsEnum(OverrideScopeInput)
  scope: OverrideScopeInput;

  @ValidateIf((o) => o.scope === OverrideScopeInput.FEATURE)
  @IsNotEmpty()
  @IsString()
  featureKey?: string;

  @ValidateIf((o) => o.scope === OverrideScopeInput.RESOURCE)
  @IsNotEmpty()
  @IsString()
  resourceKey?: string;

  @IsNotEmpty()
  @IsEnum(OverrideTypeInput)
  overrideType: OverrideTypeInput;

  @ValidateIf((o) => o.scope === OverrideScopeInput.FEATURE)
  @IsNotEmpty()
  @IsEnum(FeatureStateInput)
  featureState?: FeatureStateInput;

  @ValidateIf((o) => o.scope === OverrideScopeInput.RESOURCE)
  @IsNotEmpty()
  @IsEnum(ResourceLimitTypeInput)
  limitType?: ResourceLimitTypeInput;

  @ValidateIf((o) => o.scope === OverrideScopeInput.RESOURCE && o.limitType === ResourceLimitTypeInput.LIMITED)
  @IsInt()
  @Min(0)
  limitValue?: number;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  approverName?: string;

  @ValidateIf((o) => o.overrideType === OverrideTypeInput.TEMPORARY)
  @IsNotEmpty()
  @IsDateString()
  expiresAt?: string;
}
