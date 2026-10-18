import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

// Tadween: the "About you" onboarding questions. The admin console reports on
// these values, so adding one means a label there too.
export const ONBOARDING_SOURCES = [
  'tiktok',
  'instagram',
  'youtube',
  'linkedin',
  'x',
  'facebook',
  'google',
  'ai_assistant',
  'friend',
  'other',
] as const;

export const ONBOARDING_ROLES = [
  'creator',
  'freelancer',
  'agency',
  'small_business',
  'company_team',
  'other',
] as const;

export const ONBOARDING_GOALS = [
  'grow_audience',
  'save_time',
  'manage_clients',
  'grow_business',
  'other',
] as const;

const trim = ({ value }: { value: any }) =>
  typeof value === 'string' ? value.trim() : value;

export class OnboardingAnswersDto {
  @IsIn(ONBOARDING_SOURCES)
  source: (typeof ONBOARDING_SOURCES)[number];

  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(120)
  sourceOther?: string;

  @IsIn(ONBOARDING_ROLES)
  role: (typeof ONBOARDING_ROLES)[number];

  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(120)
  roleOther?: string;

  @IsIn(ONBOARDING_GOALS)
  goal: (typeof ONBOARDING_GOALS)[number];

  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(120)
  goalOther?: string;

  // Only kept for agencies and company teams
  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(120)
  company?: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(120)
  website?: string;
}
