import { IsNotEmpty, IsString, IsEnum, IsOptional, IsInt, Min } from 'class-validator';

export enum ResourceLimitTypeInput {
  LIMITED = 'LIMITED',
  UNLIMITED = 'UNLIMITED',
  DISABLED = 'DISABLED',
}

export class ResourceLimitInputDto {
  @IsNotEmpty()
  @IsString()
  resourceKey: string;

  @IsNotEmpty()
  @IsEnum(ResourceLimitTypeInput)
  limitType: ResourceLimitTypeInput;

  @IsOptional()
  @IsInt()
  @Min(0)
  limitValue?: number;
}
