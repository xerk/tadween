import { IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: any }) =>
  typeof value === 'string' ? value.trim() : value;

// Tadween: renaming the workspace (the same bounds as `company` at sign-up)
export class OrganizationNameDto {
  @IsString()
  @Transform(trim)
  @MinLength(3)
  @MaxLength(128)
  name: string;
}
