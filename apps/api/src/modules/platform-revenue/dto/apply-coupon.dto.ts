import { IsNotEmpty, IsString } from 'class-validator';

export class PlatformApplyCouponDto {
  @IsNotEmpty()
  @IsString()
  organizationId: string;

  @IsNotEmpty()
  @IsString()
  code: string;
}
