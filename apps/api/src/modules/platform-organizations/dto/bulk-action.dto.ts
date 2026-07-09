import { IsArray, IsString, IsIn, IsOptional, ArrayNotEmpty } from 'class-validator';

export class BulkActionDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  organizationIds: string[];

  @IsIn(['suspend', 'activate', 'archive', 'assign_plan', 'notify'])
  action: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
