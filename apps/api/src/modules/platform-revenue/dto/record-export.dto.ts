import { IsNotEmpty, IsIn, IsOptional, IsObject, IsInt, Min } from 'class-validator';

export class RecordRevenueExportDto {
  @IsNotEmpty()
  @IsIn(['CSV', 'EXCEL', 'PDF'])
  format: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @IsInt()
  @Min(0)
  rowCount: number;
}
