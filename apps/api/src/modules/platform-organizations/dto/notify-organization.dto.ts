import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class NotifyOrganizationDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  message?: string;
}
