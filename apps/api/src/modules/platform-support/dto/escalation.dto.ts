import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';

export const ESCALATION_LEVELS = ['Support', 'Engineering', 'Operations', 'Finance', 'Platform Admin'];

export class CreateEscalationDto {
  @IsIn(ESCALATION_LEVELS)
  toLevel: string;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  ownerName?: string;
}

export class ResolveEscalationDto {
  @IsNotEmpty()
  @IsString()
  resolution: string;
}
