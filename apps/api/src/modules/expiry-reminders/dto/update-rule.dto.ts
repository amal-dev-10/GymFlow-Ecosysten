import { IsString, IsInt, IsArray, IsOptional, IsBoolean } from 'class-validator';

export class UpdateRuleDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsInt()
  triggerDays?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @IsOptional()
  @IsString()
  templateSms?: string;

  @IsOptional()
  @IsString()
  templateWhatsApp?: string;

  @IsOptional()
  @IsString()
  templateEmail?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
