import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class AssignOrganizationDto {
  @IsNotEmpty()
  @IsString()
  organizationId: string;

  @IsNotEmpty()
  @IsIn(['View', 'Manage', 'Full'])
  accessLevel: string;
}
