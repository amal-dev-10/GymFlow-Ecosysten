import { IsNotEmpty, IsString, IsOptional, IsIn, IsNumber, Min, IsBoolean, IsArray, IsDateString, IsInt } from 'class-validator';

export class CreateCouponDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsIn(['PERCENTAGE', 'FIXED'])
  discountType: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  discountValue: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @IsOptional()
  @IsBoolean()
  stackable?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicablePlanIds?: string[];

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

export class UpdateCouponDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  stackable?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicablePlanIds?: string[];

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
