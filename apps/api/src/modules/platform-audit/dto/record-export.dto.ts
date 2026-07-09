import { IsNotEmpty, IsIn, IsOptional, IsObject, IsInt, Min } from 'class-validator';

export class RecordExportDto {
  @IsNotEmpty()
  @IsIn(['CSV', 'EXCEL', 'PDF', 'JSON'])
  format: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @IsInt()
  @Min(0)
  rowCount: number;
}
