import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';

export class CreateJobDto {
  @IsNotEmpty() @IsString() name: string;
  @IsNotEmpty() @IsString() category: string;
  @IsOptional() @IsString() workflowType?: string;
  @IsOptional() @IsString() description?: string;
  @IsNotEmpty() @IsIn(['EVERY_MINUTE', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM_CRON']) scheduleType: string;
  @IsOptional() @IsString() cronExpression?: string;
  @IsNotEmpty() @IsString() queueKey: string;
}

export class UpdateJobDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() workflowType?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(['EVERY_MINUTE', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM_CRON']) scheduleType?: string;
  @IsOptional() @IsString() cronExpression?: string;
  @IsOptional() @IsString() queueKey?: string;
}
