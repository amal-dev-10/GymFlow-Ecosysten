import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PermissionGrantDto } from './create-role.dto';

export class SetPermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionGrantDto)
  permissions: PermissionGrantDto[];
}

export class SetGroupsDto {
  @IsArray()
  @Type(() => String)
  groupIds: string[];
}
