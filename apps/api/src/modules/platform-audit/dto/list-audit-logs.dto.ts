import { IsOptional, IsString, IsInt, Min, IsIn, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ListAuditLogsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string; // matches user, email, action, event, resource, ip address, request id

  @IsOptional()
  @IsString()
  category?: string; // eventCategory (also doubles as "module")

  @IsOptional()
  @IsIn(['Information', 'Low', 'Medium', 'High', 'Critical'])
  severity?: string;

  @IsOptional()
  @IsString()
  userId?: string; // platform user (actor)

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsIn(['success', 'failure'])
  status?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  browser?: string;

  @IsOptional()
  @IsString()
  os?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: string;
}
