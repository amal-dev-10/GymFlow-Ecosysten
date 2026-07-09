import { IsNotEmpty, IsString, IsOptional, IsIn, IsArray, IsBoolean } from 'class-validator';

const ARTICLE_TYPES = ['Article', 'FAQ', 'Troubleshooting', 'Internal'];

export class CreateKbArticleDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  category: string;

  @IsNotEmpty()
  @IsString()
  body: string;

  @IsIn(ARTICLE_TYPES)
  type: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateKbArticleDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsIn(ARTICLE_TYPES)
  type?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
