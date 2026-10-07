// Tadween services registered in the global DatabaseModule (one spread there
// keeps the upstream file diff to two lines).
import { PlatformSettingsRepository } from '@gitroom/nestjs-libraries/database/prisma/tadween/platform-settings.repository';
import { PlatformSettingsService } from '@gitroom/nestjs-libraries/database/prisma/tadween/platform-settings.service';
import { ProviderSettingsRepository } from '@gitroom/nestjs-libraries/database/prisma/tadween/provider-settings.repository';
import { ProviderSettingsService } from '@gitroom/nestjs-libraries/database/prisma/tadween/provider-settings.service';
import { PlansRepository } from '@gitroom/nestjs-libraries/database/prisma/tadween/plans.repository';
import { PlansService } from '@gitroom/nestjs-libraries/database/prisma/tadween/plans.service';
import { AdminConsoleRepository } from '@gitroom/nestjs-libraries/database/prisma/tadween/admin-console.repository';
import { AdminConsoleService } from '@gitroom/nestjs-libraries/database/prisma/tadween/admin-console.service';

export const TADWEEN_DATABASE_PROVIDERS = [
  PlatformSettingsRepository,
  PlatformSettingsService,
  ProviderSettingsRepository,
  ProviderSettingsService,
  PlansRepository,
  PlansService,
  AdminConsoleRepository,
  AdminConsoleService,
];
