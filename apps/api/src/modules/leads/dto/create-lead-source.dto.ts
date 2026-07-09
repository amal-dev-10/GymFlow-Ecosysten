import { IsNotEmpty, IsString } from 'class-validator';

export class CreateLeadSourceDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}
