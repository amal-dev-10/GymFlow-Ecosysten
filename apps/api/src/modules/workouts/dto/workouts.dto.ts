import { IsString, IsOptional, IsInt, IsBoolean, IsArray, IsJSON } from 'class-validator';

export class CreateWorkoutDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  difficulty?: string;

  @IsInt()
  @IsOptional()
  duration?: number;

  @IsInt()
  @IsOptional()
  calories?: number;

  @IsString()
  @IsOptional()
  visibility?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsBoolean()
  @IsOptional()
  isTemplate?: boolean;

  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  memberNotes?: string;

  @IsString()
  @IsOptional()
  prepNotes?: string;

  @IsString()
  @IsOptional()
  equipmentNotes?: string;

  @IsArray()
  @IsOptional()
  structure?: any[];
}

export class UpdateWorkoutDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  difficulty?: string;

  @IsInt()
  @IsOptional()
  duration?: number;

  @IsInt()
  @IsOptional()
  calories?: number;

  @IsString()
  @IsOptional()
  visibility?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsBoolean()
  @IsOptional()
  isTemplate?: boolean;

  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  memberNotes?: string;

  @IsString()
  @IsOptional()
  prepNotes?: string;

  @IsString()
  @IsOptional()
  equipmentNotes?: string;

  @IsArray()
  @IsOptional()
  structure?: any[];
  
  @IsString()
  @IsOptional()
  versionNotes?: string; // Optional message describing this update version
}

export class BulkWorkoutActionDto {
  @IsArray()
  ids: string[];

  @IsString()
  action: 'archive' | 'delete' | 'publish';
}
