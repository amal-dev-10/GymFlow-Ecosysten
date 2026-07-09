import { IsNotEmpty, IsString, IsEnum } from 'class-validator';

export enum FeatureStateInput {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
  BETA = 'BETA',
  ENTERPRISE_ONLY = 'ENTERPRISE_ONLY',
}

export class FeatureAccessInputDto {
  @IsNotEmpty()
  @IsString()
  featureKey: string;

  @IsNotEmpty()
  @IsEnum(FeatureStateInput)
  state: FeatureStateInput;
}
