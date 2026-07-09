import { IsNotEmpty, IsString, IsInt, Min } from 'class-validator';

export class PlatformExtendTrialDto {
  @IsNotEmpty()
  @IsString()
  organizationId: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  days: number;
}
