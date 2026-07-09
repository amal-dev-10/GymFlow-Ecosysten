import { IsString, IsOptional, IsIn, IsBoolean, IsArray } from 'class-validator';

export class CreateMetadataDto {
  @IsString()
  @IsIn(['Category', 'Muscle', 'Equipment', 'ExerciseType', 'Difficulty', 'MovementPattern', 'BodyRegion', 'Tag'])
  type: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  @IsIn(['Active', 'Archived'])
  status?: string;
}

export class UpdateMetadataDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  @IsIn(['Active', 'Archived'])
  status?: string;
}

export class MergeMetadataDto {
  @IsString()
  sourceId: string; // The duplicate item to be merged (e.g. "Pecs")

  @IsString()
  targetId: string; // The canonical item to merge into (e.g. "Chest")
}

export class BulkImportDto {
  @IsArray()
  items: CreateMetadataDto[];
}
