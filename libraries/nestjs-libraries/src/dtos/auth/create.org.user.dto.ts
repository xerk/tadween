import {
  IsDefined,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Provider } from '@prisma/client';

export class CreateOrgUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  @IsDefined()
  @ValidateIf((o) => !o.providerToken)
  password: string;

  @IsString()
  @IsDefined()
  provider: Provider;

  @IsString()
  @IsDefined()
  @ValidateIf((o) => !o.password)
  providerToken: string;

  @IsEmail()
  @IsDefined()
  @ValidateIf((o) => !o.providerToken)
  email: string;

  // Tadween: sign-up asks only for the account; without it the workspace is
  // named after the person (AuthService.workspaceName) and renamed later
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(128)
  company?: string;

  datafast_visitor_id: string;

  // Tadween partners program: the referral code from the landing cookie or
  // the ?ref= link (ignored when unknown)
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{3,32}$/)
  ref?: string;
}
