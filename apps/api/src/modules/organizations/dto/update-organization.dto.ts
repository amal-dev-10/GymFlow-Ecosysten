import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  businessType?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  dateFormat?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  supportContact?: string;

  @IsOptional()
  @IsString()
  supportEmail?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  faviconUrl?: string;

  @IsOptional()
  @IsBoolean()
  allowMemberSelfRegistration?: boolean;

  @IsOptional()
  @IsBoolean()
  enableMultiBranchOperations?: boolean;

  @IsOptional()
  @IsBoolean()
  enableAttendanceTracking?: boolean;

  @IsOptional()
  @IsBoolean()
  enableWorkoutManagement?: boolean;

  @IsOptional()
  @IsBoolean()
  enableDietManagement?: boolean;

  @IsOptional()
  @IsBoolean()
  enablePersonalTraining?: boolean;

  @IsOptional()
  settings?: any;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  isActive?: boolean;
}
