import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFeatureDependencyDto {
  @IsNotEmpty()
  @IsString()
  featureKey: string;

  @IsNotEmpty()
  @IsString()
  requiresFeatureKey: string;
}
