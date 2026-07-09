import { IsInt, Min, Max, IsOptional, IsString } from 'class-validator';

export class RecordCsatDto {
  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
