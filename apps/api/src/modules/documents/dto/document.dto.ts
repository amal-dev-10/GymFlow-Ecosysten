import { IsEnum, IsNotEmpty, IsString, IsUrl } from 'class-validator';

export enum DocumentTargetType {
  MEMBER = 'MEMBER',
  EMPLOYEE = 'EMPLOYEE',
}

export class GeneratePresignedUrlDto {
  @IsNotEmpty()
  @IsString()
  targetId: string; // Member ID or Employee ID

  @IsEnum(DocumentTargetType)
  targetType: DocumentTargetType;

  @IsNotEmpty()
  @IsString()
  fileName: string;

  @IsNotEmpty()
  @IsString()
  contentType: string;
}

export class ConfirmDocumentUploadDto {
  @IsNotEmpty()
  @IsString()
  targetId: string;

  @IsEnum(DocumentTargetType)
  targetType: DocumentTargetType;

  @IsNotEmpty()
  @IsString()
  documentType: string;

  @IsNotEmpty()
  @IsUrl()
  url: string;
}
