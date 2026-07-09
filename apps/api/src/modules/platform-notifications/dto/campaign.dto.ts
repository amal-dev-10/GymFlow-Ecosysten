import { IsNotEmpty, IsString, IsOptional, IsObject, IsIn } from 'class-validator';

export class CreateCampaignDto {
  @IsNotEmpty() @IsString() name: string;
  @IsNotEmpty() @IsString() notificationType: string;
  @IsNotEmpty() @IsString() channel: string;
  @IsOptional() @IsString() templateId?: string;
  @IsOptional() @IsString() bodyOverride?: string;
  @IsNotEmpty() @IsString() audienceType: string;
  @IsOptional() @IsObject() audienceFilter?: { organizationIds?: string[] };
  @IsOptional() @IsString() priority?: string;
  @IsNotEmpty() @IsIn(['NOW', 'SCHEDULED', 'RECURRING']) scheduleType: string;
  @IsOptional() @IsString() scheduledFor?: string;
  @IsOptional() @IsIn(['DAILY', 'WEEKLY', 'MONTHLY']) recurringFrequency?: string;
  @IsOptional() @IsString() expiresAt?: string;
  @IsOptional() @IsString() timezone?: string;
}

export class UpdateCampaignDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() scheduledFor?: string;
  @IsOptional() @IsString() expiresAt?: string;
}

export class ResolveAudienceDto {
  @IsNotEmpty() @IsString() audienceType: string;
  @IsOptional() @IsObject() audienceFilter?: { organizationIds?: string[] };
}
