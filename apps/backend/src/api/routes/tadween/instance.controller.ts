import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlatformSettingsService } from '@gitroom/nestjs-libraries/database/prisma/tadween/platform-settings.service';
import { PlansService } from '@gitroom/nestjs-libraries/database/prisma/tadween/plans.service';

// Public, unauthenticated instance settings the app reads on load: registration
// mode (sign-up page), feature switches (navigation), branding, and the plans
// the pricing page shows. Nothing secret or per-user is returned.
@ApiTags('Instance')
@Controller('/instance')
export class InstanceController {
  constructor(
    private _settings: PlatformSettingsService,
    private _plans: PlansService
  ) {}

  @Get('/settings')
  async settings() {
    const [settings, plans, pricing, founder] = await Promise.all([
      this._settings.getPublicSettings(),
      this._plans.getPublicPlans(),
      this._plans.getPricing(),
      this._plans.getFounderOffer(),
    ]);
    // `founder`: whether founder prices are charged now and how many spots
    // are left, for the pricing page's offer line
    return { ...settings, plans, pricing, founder };
  }
}
