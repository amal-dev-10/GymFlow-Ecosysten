import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class AssignPlanDto {
  @IsNotEmpty()
  @IsString()
  planId: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}
