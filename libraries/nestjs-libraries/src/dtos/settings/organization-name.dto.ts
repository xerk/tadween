import { IsString, MaxLength, MinLength } from 'class-validator';

// Tadween: renaming the workspace (the same bounds as `company` at sign-up)
export class OrganizationNameDto {
  @IsString()
  @MinLength(3)
  @MaxLength(128)
  name: string;
}
