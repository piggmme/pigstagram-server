import { IsString, IsOptional, IsArray, ArrayNotEmpty } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsOptional()
  caption?: string;

  @IsArray()
  @ArrayNotEmpty()
  images: string[];
}
