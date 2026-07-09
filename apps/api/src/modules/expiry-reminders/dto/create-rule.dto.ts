import { IsString, IsInt, IsArray, IsOptional, IsBoolean } from 'class-validator';

export class CreateRuleDto {
  @IsString()
  label: string;

  @IsInt()
  triggerDays: number;

  @IsArray()
  @IsString({ each: true })
  channels: string[];

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
