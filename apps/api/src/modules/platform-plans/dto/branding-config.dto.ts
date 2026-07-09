import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class BrandingConfigDto {
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  accentColor?: string;

  @IsOptional()
  @IsBoolean()
  customLogo?: boolean;

  @IsOptional()
  @IsBoolean()
  customDomain?: boolean;

  @IsOptional()
  @IsBoolean()
  emailBranding?: boolean;
}
