import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AdminListQueryDto } from '@gitroom/nestjs-libraries/dtos/tadween/admin.list.dto';

// "Who invited you?"
export class ClaimReferralDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{3,32}$/)
  code: string;
}

// An affiliate's payout preference and details (details are encrypted at rest
// and only ever returned masked)
export class PartnerPayoutSettingsDto {
  @IsIn(['BALANCE', 'CASH'])
  preference: 'BALANCE' | 'CASH';

  @IsOptional()
  @IsIn(['wise', 'payoneer', 'bank'])
  method?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  details?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{2}$/)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  mawthooqNumber?: string;

  @IsOptional()
  @IsBoolean()
  taxFormAccepted?: boolean;
}

// ── Super admin ───────────────────────────────────────────────────────────────
export class AdminCreateAffiliateDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  commissionRate?: number | null;
}

export class AdminUpdatePartnerDto {
  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status?: 'ACTIVE' | 'SUSPENDED';

  @IsOptional()
  @IsIn(['REFERRER', 'AFFILIATE'])
  kind?: 'REFERRER' | 'AFFILIATE';

  // null: back to the tier's rate
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  commissionRate?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  commissionMonths?: number;

  @IsOptional()
  @IsBoolean()
  ambassador?: boolean;
}

export class AdminRejectReferralDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class AdminMarkPayoutDto {
  @IsString()
  @MaxLength(200)
  reference: string;

  @IsOptional()
  @IsIn(['wise', 'payoneer', 'bank', 'manual'])
  method?: string;
}

export class AdminPartnersQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsIn(['REFERRER', 'AFFILIATE'])
  kind?: 'REFERRER' | 'AFFILIATE';

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status?: 'ACTIVE' | 'SUSPENDED';
}

export class AdminReferralsQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsIn(['SIGNED_UP', 'PAID', 'QUALIFIED', 'REJECTED', 'REFUNDED'])
  status?: 'SIGNED_UP' | 'PAID' | 'QUALIFIED' | 'REJECTED' | 'REFUNDED';

  @IsOptional()
  @IsIn(['flagged'])
  flags?: 'flagged';
}
