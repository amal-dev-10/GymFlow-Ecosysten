import { IsNotEmpty, IsString, IsOptional, IsIn, IsInt, Min, Max, MaxLength } from 'class-validator';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export class CreateSupportTicketDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  subject: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

export class PostSupportMessageDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  body: string;
}

export class SupportCsatDto {
  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
