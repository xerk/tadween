import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsEmail,
  IsISO8601,
  IsIn,
  IsInt,
  IsUrl,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
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
  @IsIn(['en', 'ar', 'bn', 'de', 'es', 'fr', 'it', 'ja', 'ka_ge', 'ko', 'pt', 'ru', 'tr', 'vi', 'zh'])
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

// Env var name → new value. A string sets (or replaces) the console value; null
// or "" removes it so the env var is used again. Names a provider doesn't
// declare are rejected by the service.
export class ProviderCredentialsDto {
  @IsDefined()
  @IsObject()
  values: Record<string, string | null>;
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

  // The list ("regular") price, in whole units: Stripe prices are created
  // from price * 100
  @IsInt()
  @Min(0)
  monthlyPriceUsd: number;

  // Charged instead of the list price while the founder window is open.
  // null removes the founder offer; left out keeps the stored value.
  @IsOptional()
  @IsInt()
  @Min(0)
  founderMonthlyPriceUsd?: number | null;

  // Ignored on save: the server derives it from the monthly price and the
  // yearly discount (PlansService.withYearlyPrice).
  @IsOptional()
  @IsInt()
  @Min(0)
  yearlyPriceUsd?: number;

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

  // Webhooks allowed (-1 unlimited, 0 none). null = the tier's static value;
  // left out keeps the stored value.
  @IsOptional()
  @IsInt()
  @Min(-1)
  webhooks?: number | null;

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

// The founder offer's window (PlatformSettingsService.getFounderWindow)
export class FounderWindowDto {
  // Paying workspaces that get the founder price; 0 turns the offer off
  @IsInt()
  @Min(0)
  @Max(100000)
  cap: number;

  // Count paying workspaces subscribed from this date (null: all time)
  @IsOptional()
  @IsISO8601()
  startsAt?: string | null;

  // The offer closes on this date even with spots left (null: no end)
  @IsOptional()
  @IsISO8601()
  endsAt?: string | null;
}

export class YearlyDiscountDto {
  // Percent off 12 monthly payments for yearly billing
  @IsInt()
  @Min(0)
  @Max(90)
  yearlyDiscountPercent: number;
}
