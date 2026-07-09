import { IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';

export class QuickSendDto {
  @IsNotEmpty() @IsString() title: string;
  @IsNotEmpty() @IsString() body: string;
  @IsNotEmpty() @IsString() notificationType: string;
  @IsNotEmpty() @IsString() channel: string;
  @IsOptional() @IsString() priority?: string;
  @IsNotEmpty() @IsString() audienceType: string;
  @IsOptional() @IsObject() audienceFilter?: { organizationIds?: string[] };
}
