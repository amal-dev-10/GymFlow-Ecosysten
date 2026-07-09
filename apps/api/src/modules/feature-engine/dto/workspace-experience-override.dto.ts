import { IsOptional, IsEnum } from 'class-validator';

export enum WorkspaceExperienceInput {
  ESSENTIAL = 'ESSENTIAL',
  PROFESSIONAL = 'PROFESSIONAL',
  EXPERT = 'EXPERT',
}

export class SetWorkspaceExperienceOverrideDto {
  // Omit / null clears the override, falling back to the plan default.
  @IsOptional()
  @IsEnum(WorkspaceExperienceInput)
  workspaceExperienceOverride?: WorkspaceExperienceInput | null;
}
