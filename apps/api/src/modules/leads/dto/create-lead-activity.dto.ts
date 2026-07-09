import { IsNotEmpty, IsString, IsOptional, IsDateString, IsIn } from 'class-validator';

export class CreateLeadActivityDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['Call', 'Meeting', 'Email'])
  activityType: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  activityDate?: string;
}
