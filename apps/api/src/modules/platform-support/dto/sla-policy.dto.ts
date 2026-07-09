import { IsInt, Min, IsIn } from 'class-validator';

export class UpdateSlaPolicyDto {
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority: string;

  @IsInt()
  @Min(1)
  firstResponseMinutes: number;

  @IsInt()
  @Min(1)
  resolutionMinutes: number;
}
