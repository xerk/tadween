import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsEmail,
  IsIn,
  IsInt,
  IsUrl,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Registration and features ────────────────────────────────────────────────
export class RegistrationSettingsDto {
  @IsDefined()
  @IsIn(['open', 'invite', 'closed'])
  mode: 'open' | 'invite' | 'closed';
}

// `features` is a map of FeatureKey → boolean; unknown keys are dropped by the service.
export class FeatureSettingsDto {
  @IsDefined()
  @IsObject()
  features: Record<string, boolean>;
}

export class BrandingSettingsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  instanceName: string;

  @IsOptional()
  @ValidateIf((o) => !!o.supportEmail)
  @IsEmail()
  supportEmail?: string;

  @IsString()
  @IsIn(['en', 'ar', 'bn', 'de', 'es', 'fr', 'he', 'it', 'ja', 'ka_ge', 'ko', 'pt', 'ru', 'tr', 'vi', 'zh'])
  defaultLanguage: string;

  // IANA zone such as Africa/Cairo, or empty for the browser's own zone
  @IsString()
  @MaxLength(64)
  @Matches(/^$|^[A-Za-z_]+(\/[A-Za-z0-9_+\-]+)*$/)
  defaultTimezone: string;

  // Public links (terms, docs…); empty hides the link in the app

  @IsOptional()
  @ValidateIf((o) => !!o.websiteUrl)
  @IsUrl({ require_protocol: true, require_tld: false, protocols: ['http', 'https'] })
  @MaxLength(500)
  websiteUrl?: string;

  @IsOptional()
  @ValidateIf((o) => !!o.termsUrl)
  @IsUrl({ require_protocol: true, require_tld: false, protocols: ['http', 'https'] })
  @MaxLength(500)
  termsUrl?: string;

  @IsOptional()
  @ValidateIf((o) => !!o.privacyUrl)
  @IsUrl({ require_protocol: true, require_tld: false, protocols: ['http', 'https'] })
  @MaxLength(500)
  privacyUrl?: string;

  @IsOptional()
  @ValidateIf((o) => !!o.docsUrl)
  @IsUrl({ require_protocol: true, require_tld: false, protocols: ['http', 'https'] })
  @MaxLength(500)
  docsUrl?: string;

  @IsOptional()
  @ValidateIf((o) => !!o.supportUrl)
  @IsUrl({ require_protocol: true, require_tld: false, protocols: ['http', 'https'] })
  @MaxLength(500)
  supportUrl?: string;

  @IsOptional()
  @ValidateIf((o) => !!o.tutorialVideoUrl)
  @IsUrl({ require_protocol: true, require_tld: false, protocols: ['http', 'https'] })
  @MaxLength(500)
  tutorialVideoUrl?: string;
}

// ── Providers ────────────────────────────────────────────────────────────────
export class ProviderSettingItemDto {
  @IsString()
  @MaxLength(64)
  identifier: string;

  @IsBoolean()
  enabled: boolean;

  @IsInt()
  @Min(0)
  position: number;
}

export class ProviderSettingsDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ProviderSettingItemDto)
  providers: ProviderSettingItemDto[];
}

// ── Plans ────────────────────────────────────────────────────────────────────
export class PlanDto {
  @IsString()
  @Matches(/^[a-z0-9-]{2,32}$/)
  key: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  description?: string;

  @IsIn(['STANDARD', 'PRO', 'TEAM', 'ULTIMATE'])
  tier: 'STANDARD' | 'PRO' | 'TEAM' | 'ULTIMATE';

  // Whole units: Stripe prices are created from price * 100
  @IsInt()
  @Min(0)
  monthlyPriceUsd: number;

  // Whole units: Stripe prices are created from price * 100
  @IsInt()
  @Min(0)
  yearlyPriceUsd: number;

  // Whole units: Stripe prices are created from price * 100
  @IsInt()
  @Min(0)
  monthlyPriceEgp: number;

  // Whole units: Stripe prices are created from price * 100
  @IsInt()
  @Min(0)
  yearlyPriceEgp: number;

  @IsInt()
  @Min(0)
  trialDays: number;

  @IsBoolean()
  mostPopular: boolean;

  @IsInt()
  @Min(0)
  channels: number;

  // -1 unlimited, 0 no team
  @IsInt()
  @Min(-1)
  teamMembers: number;

  // -1 unlimited
  @IsInt()
  @Min(-1)
  postsPerMonth: number;

  // -1 unlimited, 0 AI off
  @IsInt()
  @Min(-1)
  aiCredits: number;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  features: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  providerPriceIdMonthly?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  providerPriceIdYearly?: string;

  @IsBoolean()
  active: boolean;

  @IsInt()
  @Min(0)
  position: number;
}

// ── Users ────────────────────────────────────────────────────────────────────
export class AdminUserActivationDto {
  @IsBoolean()
  activated: boolean;
}

export class AdminOrgTierDto {
  @IsIn(['FREE', 'STANDARD', 'PRO', 'TEAM', 'ULTIMATE'])
  tier: 'FREE' | 'STANDARD' | 'PRO' | 'TEAM' | 'ULTIMATE';
}
