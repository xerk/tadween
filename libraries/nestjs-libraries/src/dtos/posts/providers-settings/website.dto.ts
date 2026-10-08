import {
  ArrayMaxSize,
  IsArray,
  IsDefined,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MediaDto } from '@gitroom/nestjs-libraries/dtos/media/media.dto';
import { JSONSchema } from 'class-validator-jsonschema';

export class WebsiteTagsSettings {
  @IsString()
  @MaxLength(50)
  value: string;

  @IsString()
  @MaxLength(50)
  label: string;
}

export class WebsiteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @IsDefined()
  @JSONSchema({ description: 'Article title, required' })
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @JSONSchema({ description: 'Short summary shown in lists and previews' })
  summary?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => WebsiteTagsSettings)
  tags?: WebsiteTagsSettings[];

  @IsOptional()
  @ValidateNested()
  @Type(() => MediaDto)
  @JSONSchema({
    description:
      'Cover picture from the media library, defaults to the first picture of the post',
  })
  cover?: MediaDto;
}
