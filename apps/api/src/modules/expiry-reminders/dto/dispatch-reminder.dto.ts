import { IsString, IsArray, IsOptional } from 'class-validator';

export class DispatchReminderDto {
  @IsString()
  ruleId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subscriptionIds?: string[];
}
