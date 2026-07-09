import { IsNotEmpty, IsString, IsNumber, Min, IsOptional, IsDateString } from 'class-validator';

export class PlatformGenerateInvoiceDto {
  @IsNotEmpty()
  @IsString()
  organizationId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;
}
