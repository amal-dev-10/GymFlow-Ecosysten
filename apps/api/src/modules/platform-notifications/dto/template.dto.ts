import { IsNotEmpty, IsString, IsOptional, IsArray, IsIn } from 'class-validator';

export class CreateTemplateDto {
  @IsNotEmpty() @IsString() title: string;
  @IsNotEmpty() @IsString() category: string;
  @IsNotEmpty() @IsString() channel: string;
  @IsOptional() @IsString() subject?: string;
  @IsNotEmpty() @IsString() body: string;
  @IsOptional() @IsArray() variables?: string[];
  @IsOptional() @IsIn(['Draft', 'Active', 'Archived']) status?: string;
}

export class UpdateTemplateDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsArray() variables?: string[];
  @IsOptional() @IsIn(['Draft', 'Active', 'Archived']) status?: string;
}

export class PreviewTemplateDto {
  @IsOptional() sampleValues?: Record<string, string>;
}
