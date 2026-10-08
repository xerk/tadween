import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlatformSettingsService } from '@gitroom/nestjs-libraries/database/prisma/tadween/platform-settings.service';
import { PlansService } from '@gitroom/nestjs-libraries/database/prisma/tadween/plans.service';
import { AuthProviderManager } from '@gitroom/backend/services/auth/providers/providers.manager';

// Public, unauthenticated instance settings the app reads on load: registration
// mode (sign-up page), feature switches (navigation), branding, the plans
// the pricing page shows, and which social sign-in providers are configured
// (booleans). Nothing secret or per-user is returned.
@ApiTags('Instance')
@Controller('/instance')
export class InstanceController {
  constructor(
    private _settings: PlatformSettingsService,
    private _plans: PlansService,
    private _authProviders: AuthProviderManager
  ) {}

  @Get('/settings')
  async settings() {
    const [settings, plans, pricing] = await Promise.all([
      this._settings.getPublicSettings(),
      this._plans.getPublicPlans(),
      this._plans.getPricing(),
    ]);
    return {
      ...settings,
      plans,
      pricing,
      login: this._authProviders.getConfigured(),
    };
  }
}
