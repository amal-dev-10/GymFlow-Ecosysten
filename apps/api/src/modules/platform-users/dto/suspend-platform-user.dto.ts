import { IsOptional, IsString } from 'class-validator';

export class SuspendPlatformUserDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
