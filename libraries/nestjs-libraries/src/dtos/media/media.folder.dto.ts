import {
  ArrayMaxSize,
  IsArray,
  IsDefined,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: any }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateMediaFolderDto {
  @IsDefined()
  @IsString()
  @Transform(trim)
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

// name renames the folder, parentId moves it (null moves it to the top level)
export class UpdateMediaFolderDto {
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ValidateIf((o) => o.parentId !== null && o.parentId !== undefined)
  @IsString()
  parentId?: string | null;
}

// folderId null moves the media out of every folder
export class MoveMediaDto {
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  ids: string[];

  @ValidateIf((o) => o.folderId !== null)
  @IsString()
  folderId: string | null;
}

export class RenameMediaDto {
  @IsDefined()
  @IsString()
  @Transform(trim)
  @MinLength(1)
  @MaxLength(255)
  name: string;
}
