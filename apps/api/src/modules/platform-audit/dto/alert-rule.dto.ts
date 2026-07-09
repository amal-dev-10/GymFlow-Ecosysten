import { IsNotEmpty, IsString, IsOptional, IsIn, IsObject, IsBoolean } from 'class-validator';

const TRIGGER_TYPES = ['CRITICAL_EVENT', 'FAILED_PAYMENT', 'REPEATED_LOGIN_FAILURES', 'HIGH_API_ERRORS', 'PERMISSION_CHANGES', 'SECURITY_RISK'];

export class CreateAlertRuleDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(TRIGGER_TYPES)
  triggerType: string;

  @IsObject()
  conditions: { threshold: number; windowMinutes: number };

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class UpdateAlertRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(TRIGGER_TYPES)
  triggerType?: string;

  @IsOptional()
  @IsObject()
  conditions?: { threshold: number; windowMinutes: number };

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
