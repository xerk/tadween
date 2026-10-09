import {
  IsDefined,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// Query of every super-admin console list (DataTable): paging, one sort column,
// free-text search. Each endpoint whitelists the `sort` values it accepts; an
// unknown one falls back to that list's default order.
export class AdminListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(/^[a-zA-Z]+$/)
  sort?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

export const ORGANIZATION_STATUSES = [
  'active',
  'trialing',
  'cancelled',
  'lifetime',
  'none',
] as const;
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

export class AdminOrganizationsQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsIn(['STANDARD', 'PRO', 'TEAM', 'ULTIMATE', 'NONE'])
  tier?: 'STANDARD' | 'PRO' | 'TEAM' | 'ULTIMATE' | 'NONE';

  @IsOptional()
  @IsIn(ORGANIZATION_STATUSES as unknown as string[])
  status?: OrganizationStatus;
}

export class AdminUsersQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsOptional()
  @IsIn(['superadmin', 'member'])
  role?: 'superadmin' | 'member';
}

// Env var name → new value. A string sets (or replaces) the console value; null
// or "" removes it so the env var is used again. Names a provider doesn't
// declare are rejected by the service.
export class ProviderCredentialsDto {
  @IsDefined()
  @IsObject()
  values: Record<string, string | null>;
}
