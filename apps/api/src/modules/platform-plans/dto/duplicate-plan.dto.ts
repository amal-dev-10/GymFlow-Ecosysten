import { IsNotEmpty, IsEnum } from 'class-validator';

export enum DuplicateModeInput {
  CLONE = 'clone',
  VERSION = 'version',
}

export class DuplicatePlanDto {
  @IsNotEmpty()
  @IsEnum(DuplicateModeInput)
  mode: DuplicateModeInput;
}
