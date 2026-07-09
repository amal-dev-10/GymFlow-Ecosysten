import { IsNotEmpty, IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class RefundPaymentDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
