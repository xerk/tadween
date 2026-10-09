import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { User } from '@prisma/client';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { AuthService as AuthChecker } from '@gitroom/helpers/auth/auth.service';
import { PlatformAdminGuard } from '@gitroom/backend/services/auth/platform.admin.guard';
import { PlatformSettingsService } from '@gitroom/nestjs-libraries/database/prisma/tadween/platform-settings.service';
import { ProviderSettingsService } from '@gitroom/nestjs-libraries/database/prisma/tadween/provider-settings.service';
import { PlansService } from '@gitroom/nestjs-libraries/database/prisma/tadween/plans.service';
import { AdminConsoleService } from '@gitroom/nestjs-libraries/database/prisma/tadween/admin-console.service';
import {
  AdminOrgTierDto,
  AdminUserActivationDto,
  BrandingSettingsDto,
  FeatureSettingsDto,
  PlanDto,
  ProviderSettingsDto,
  RegistrationSettingsDto,
} from '@gitroom/nestjs-libraries/dtos/tadween/admin.console.dto';
import { AdminUsersQueryDto } from '@gitroom/nestjs-libraries/dtos/tadween/admin.list.dto';
import { FEATURES } from '@gitroom/nestjs-libraries/database/prisma/tadween/tadween.defaults';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';

// Tadween super-admin console. Every route is behind AuthMiddleware (listed in
// api.module's authenticated controllers) and PlatformAdminGuard (403 otherwise).
@ApiTags('Admin console')
@Controller('/admin/console')
@UseGuards(PlatformAdminGuard)
export class AdminConsoleController {
  constructor(
    private _settings: PlatformSettingsService,
    private _providers: ProviderSettingsService,
    private _plans: PlansService,
    private _console: AdminConsoleService
  ) {}

  // While impersonating, `user` is the impersonated account; the admin is the
  // login in the JWT.
  private adminId(req: Request, user: User) {
    try {
      const auth = (req.headers.auth as string) || req.cookies?.auth;
      const payload = AuthChecker.verifyJWT(auth) as { id?: string } | null;
      return payload?.id || user.id;
    } catch {
      return user.id;
    }
  }

  // ── Overview ───────────────────────────────────────────────────────────────
  @Get('/overview')
  overview() {
    return this._console.overview();
  }

  // ── Settings: registration, features, branding ─────────────────────────────
  @Get('/settings')
  async getSettings() {
    return {
      ...(await this._settings.getPublicSettings()),
      featureDefinitions: FEATURES,
      env: {
        DISABLE_REGISTRATION: process.env.DISABLE_REGISTRATION === 'true',
        INVITE_ONLY_REGISTRATION:
          process.env.INVITE_ONLY_REGISTRATION === 'true',
        TADWEEN_DISABLED_FEATURES: process.env.TADWEEN_DISABLED_FEATURES || '',
      },
    };
  }

  @Put('/settings/registration')
  async setRegistration(
    @GetUserFromRequest() user: User,
    @Req() req: Request,
    @Body() body: RegistrationSettingsDto
  ) {
    await this._settings.setRegistrationMode(body.mode, this.adminId(req, user));
    return this._settings.getPublicSettings();
  }

  @Put('/settings/features')
  async setFeatures(
    @GetUserFromRequest() user: User,
    @Req() req: Request,
    @Body() body: FeatureSettingsDto
  ) {
    await this._settings.setFeatures(body.features, this.adminId(req, user));
    return this._settings.getPublicSettings();
  }

  @Put('/settings/branding')
  async setBranding(
    @GetUserFromRequest() user: User,
    @Req() req: Request,
    @Body() body: BrandingSettingsDto
  ) {
    await this._settings.setBranding(
      {
        instanceName: body.instanceName,
        supportEmail: body.supportEmail || '',
        defaultLanguage: body.defaultLanguage,
        defaultTimezone: body.defaultTimezone,
      },
      this.adminId(req, user)
    );
    return this._settings.getPublicSettings();
  }

  // ── Providers ──────────────────────────────────────────────────────────────
  @Get('/providers')
  providers() {
    return this._providers.getAdminProviders();
  }

  @Put('/providers')
  saveProviders(@Body() body: ProviderSettingsDto) {
    return this._providers.save(body.providers);
  }

  // ── Plans ──────────────────────────────────────────────────────────────────
  @Get('/plans')
  async plans() {
    return {
      plans: await this._plans.listForAdmin(),
      // What Stripe charges per tier today when no plan overrides it.
      postizPricing: pricing,
    };
  }

  @Post('/plans')
  createPlan(@Body() body: PlanDto) {
    return this._plans.create(body);
  }

  @Post('/plans/defaults')
  seedPlans() {
    return this._plans.seedDefaults();
  }

  @Put('/plans/:id')
  updatePlan(@Param('id') id: string, @Body() body: PlanDto) {
    return this._plans.update(id, body);
  }

  @Delete('/plans/:id')
  deletePlan(@Param('id') id: string) {
    return this._plans.remove(id);
  }

  // ── Users and workspaces ───────────────────────────────────────────────────
  @Get('/users')
  users(@Query() query: AdminUsersQueryDto) {
    return this._console.listUsers(query);
  }

  @Put('/users/:id/activation')
  setActivation(
    @GetUserFromRequest() user: User,
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: AdminUserActivationDto
  ) {
    return this._console.setActivated(
      this.adminId(req, user),
      id,
      body.activated
    );
  }

  @Put('/organizations/:id/tier')
  setTier(@Param('id') id: string, @Body() body: AdminOrgTierDto) {
    return this._console.setOrgTier(id, body.tier);
  }
}
