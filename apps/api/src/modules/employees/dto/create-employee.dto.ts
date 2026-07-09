import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateEmployeeDto {
  @IsNotEmpty()
  @IsString()
  userId: string; // The user they are linking to

  @IsOptional()
  @IsString()
  employeeIdNumber?: string;

  @IsOptional()
  @IsString()
  designation?: string;
}

export class AssignGymDto {
  @IsNotEmpty()
  @IsString()
  gymId: string;

  @IsOptional()
  isPrimary?: boolean;

  @IsOptional()
  isBranchManager?: boolean;
}
