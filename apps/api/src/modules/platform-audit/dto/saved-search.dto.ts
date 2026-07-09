import { IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';

export class CreateSavedSearchDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsObject()
  filters: Record<string, unknown>;
}

export class UpdateSavedSearchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;
}
