import { IsString, IsNumber, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreateMembershipPlanDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsString()
  durationType: string;

  @IsNumber()
  durationValue: number;

  @IsNumber()
  basePrice: number;

  @IsOptional()
  @IsNumber()
  joiningFee?: number;

  @IsOptional()
  @IsNumber()
  taxPercentage?: number;

  @IsOptional()
  @IsString()
  branchAccess?: string;

  @IsOptional()
  benefits?: any;
}

export class CreateMemberMembershipDto {
  @IsString()
  memberId: string;

  @IsString()
  membershipPlanId: string;

  @IsString()
  startDate: string;

  @IsString()
  endDate: string;

  @IsNumber()
  amountPaid: number;

  @IsOptional()
  @IsString()
  status?: string;
}
