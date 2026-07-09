import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateLeadStatusDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;
}
