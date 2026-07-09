import { IsNotEmpty, IsString, IsInt, IsOptional, Min } from 'class-validator';

export class TrackUsageDto {
  @IsNotEmpty()
  @IsString()
  featureName: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  incrementValue?: number;
}
