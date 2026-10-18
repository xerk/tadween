import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlatformSettingsService } from '@gitroom/nestjs-libraries/database/prisma/tadween/platform-settings.service';
import { PlansService } from '@gitroom/nestjs-libraries/database/prisma/tadween/plans.service';
import { AuthProviderManager } from '@gitroom/backend/services/auth/providers/providers.manager';
import { AccessService } from '@gitroom/nestjs-libraries/database/prisma/tadween/access.service';

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
    private _authProviders: AuthProviderManager,
    private _access: AccessService
  ) {}

  @Get('/settings')
  async settings() {
    const [settings, plans, pricing, founder, paymentsEnabled] =
      await Promise.all([
        this._settings.getPublicSettings(),
        this._plans.getPublicPlans(),
        this._plans.getPricing(),
        this._plans.getFounderOffer(),
        this._access.paymentsEnabled(),
      ]);
    // `founder`: whether founder prices are charged now and how many spots
    // are left, for the pricing page's offer line. `billing.enabled`: payments
    // are on (Stripe keys and the /admin switch); the app hides all billing
    // UI otherwise.
    return {
      ...settings,
      plans,
      pricing,
      founder,
      billing: { enabled: paymentsEnabled },
      login: this._authProviders.getConfigured(),
    };
  }
}
