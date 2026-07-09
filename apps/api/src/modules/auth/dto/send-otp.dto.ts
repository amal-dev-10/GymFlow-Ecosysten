import { IsNotEmpty, IsString, IsOptional, IsIn, Matches } from 'class-validator';

export class SendOtpDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'Invalid phone number format. Must be in standard E.164 format (e.g. +1234567890).' })
  phoneNumber: string;

  @IsOptional()
  @IsString()
  @IsIn(['signup', 'login'])
  mode?: 'signup' | 'login';
}
