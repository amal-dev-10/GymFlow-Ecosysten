import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class ListOrganizationsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  // Platform lifecycle status (ACTIVE | SUSPENDED | ARCHIVED)
  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED', 'ARCHIVED'])
  status?: string;

  // Computed status band (ACTIVE | TRIAL | GRACE_PERIOD | PAUSED | PENDING_PAYMENT | SUSPENDED | EXPIRED | ARCHIVED)
  @IsOptional()
  @IsIn(['ACTIVE', 'TRIAL', 'GRACE_PERIOD', 'PAUSED', 'PENDING_PAYMENT', 'SUSPENDED', 'EXPIRED', 'ARCHIVED'])
  derivedStatus?: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  subscriptionStatus?: string;

  @IsOptional()
  @IsIn(['ESSENTIAL', 'PROFESSIONAL', 'EXPERT'])
  experience?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsIn(['EXCELLENT', 'GOOD', 'WARNING', 'CRITICAL'])
  health?: string;

  @IsOptional()
  @IsString()
  trial?: string;

  @IsOptional()
  @IsString()
  enterprise?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minMembers?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minBranches?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: string;
}
