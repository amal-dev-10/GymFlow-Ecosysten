import { IsArray, IsString } from 'class-validator';

export class AssignGymsDto {
  @IsArray()
  @IsString({ each: true })
  gymIds: string[];
}
