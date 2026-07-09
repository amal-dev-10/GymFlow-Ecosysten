import { IsNotEmpty, IsString, IsOptional, IsInt, Min } from 'class-validator';

export class EvaluateFeatureDto {
  @IsNotEmpty()
  @IsString()
  organizationId: string;

  @IsNotEmpty()
  @IsString()
  featureKey: string;
}

export class EvaluateResourceDto {
  @IsNotEmpty()
  @IsString()
  organizationId: string;

  @IsNotEmpty()
  @IsString()
  resourceKey: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  requestedAmount?: number;
}
