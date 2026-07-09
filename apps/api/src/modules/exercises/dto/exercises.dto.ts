import { IsString, IsOptional, IsArray, IsNumber, IsBoolean, IsIn } from 'class-validator';

export class CreateExerciseDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  instructions: string[];

  @IsString()
  primaryMuscle: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  secondaryMuscles?: string[];

  @IsString()
  equipment: string;

  @IsString()
  difficulty: string;

  @IsString()
  category: string;

  @IsString()
  @IsOptional()
  movementPattern?: string;

  @IsString()
  @IsOptional()
  gifUrl?: string;

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  safetyTips?: string[];

  @IsString()
  @IsOptional()
  trainerNotes?: string;

  @IsNumber()
  @IsOptional()
  caloriesBurned?: number;

  @IsNumber()
  @IsOptional()
  metValue?: number;

  @IsString()
  @IsOptional()
  @IsIn(['Public', 'Private', 'Unlisted'])
  visibility?: string;
}

export class UpdateExerciseDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  instructions?: string[];

  @IsString()
  @IsOptional()
  primaryMuscle?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  secondaryMuscles?: string[];

  @IsString()
  @IsOptional()
  equipment?: string;

  @IsString()
  @IsOptional()
  difficulty?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  movementPattern?: string;

  @IsString()
  @IsOptional()
  gifUrl?: string;

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  safetyTips?: string[];

  @IsString()
  @IsOptional()
  trainerNotes?: string;

  @IsNumber()
  @IsOptional()
  caloriesBurned?: number;

  @IsNumber()
  @IsOptional()
  metValue?: number;

  @IsString()
  @IsOptional()
  @IsIn(['Public', 'Private', 'Unlisted'])
  visibility?: string;
}

export class BulkActionDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];

  @IsString()
  @IsIn(['favorite', 'unfavorite', 'tag', 'category', 'delete'])
  action: string;

  @IsOptional()
  value?: any;
}
