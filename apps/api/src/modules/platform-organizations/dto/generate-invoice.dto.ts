import { IsNotEmpty, IsNumber, Min, IsOptional, IsString, IsDateString } from 'class-validator';

export class GenerateInvoiceDto {
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
}
