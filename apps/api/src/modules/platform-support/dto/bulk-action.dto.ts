import { IsNotEmpty, IsArray, IsString, IsIn, IsOptional } from 'class-validator';

export class BulkTicketActionDto {
  @IsArray()
  @IsString({ each: true })
  ticketIds: string[];

  @IsIn(['assign', 'close', 'escalate', 'delete'])
  action: 'assign' | 'close' | 'escalate' | 'delete';

  @IsOptional()
  @IsString()
  assignedEngineerId?: string;

  @IsOptional()
  @IsString()
  escalateToLevel?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
