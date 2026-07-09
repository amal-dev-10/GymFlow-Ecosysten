import { IsNotEmpty, IsString, IsDateString } from 'class-validator';

export class GrantTemporaryAccessDto {
  @IsNotEmpty()
  @IsString()
  platformUserId: string;

  @IsNotEmpty()
  @IsString()
  roleId: string;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsNotEmpty()
  @IsDateString()
  expiresAt: string;

  @IsNotEmpty()
  @IsString()
  approverName: string;
}
