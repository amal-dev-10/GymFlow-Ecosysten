import { IsNotEmpty, IsString } from 'class-validator';

export class RetryPaymentDto {
  @IsNotEmpty()
  @IsString()
  organizationId: string;
}
