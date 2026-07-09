import { IsNotEmpty, IsInt, Min } from 'class-validator';

export class ExtendTrialDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  days: number;
}
