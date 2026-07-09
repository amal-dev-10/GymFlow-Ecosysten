import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateMemberDto {
  @IsNotEmpty()
  @IsString()
  homeGymId: string;

  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  dob?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  aiInsights?: any;
}

export class AddMeasurementDto {
  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsNumber()
  bodyFatPercentage?: number;
}
