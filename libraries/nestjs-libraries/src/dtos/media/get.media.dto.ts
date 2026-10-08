import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export type MediaTypeFilter = 'image' | 'video' | 'gif';
export type MediaUsageFilter = 'used' | 'unused';

// GET /media. Without folderId the whole library is listed, like before folders
// existed; 'root' lists the media that sit in no folder
export class GetMediaDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 18;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  folderId?: string;

  @IsOptional()
  @IsIn(['image', 'video', 'gif'])
  type?: MediaTypeFilter;

  @IsOptional()
  @IsIn(['used', 'unused'])
  usage?: MediaUsageFilter;

  @IsOptional()
  @IsIn(['date', 'name'])
  sort?: 'date' | 'name' = 'date';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}
