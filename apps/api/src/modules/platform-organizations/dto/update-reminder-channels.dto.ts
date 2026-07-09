import { IsBoolean, IsOptional, IsString, IsInt, Min } from 'class-validator';

export class UpdateReminderChannelsDto {
  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  whatsAppEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsString()
  smsSenderId?: string;

  @IsOptional()
  @IsString()
  whatsAppSenderId?: string;

  @IsOptional()
  @IsString()
  emailFromName?: string;

  @IsOptional()
  @IsString()
  emailFromAddress?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyLimit?: number | null;
}
