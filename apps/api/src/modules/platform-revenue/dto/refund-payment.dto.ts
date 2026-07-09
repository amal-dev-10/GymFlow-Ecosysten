import { IsNotEmpty, IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class PlatformRefundPaymentDto {
  @IsNotEmpty()
  @IsString()
  organizationId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
