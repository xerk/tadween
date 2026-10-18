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
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { User } from '@prisma/client';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { AuthService as AuthChecker } from '@gitroom/helpers/auth/auth.service';
import { PlatformAdminGuard } from '@gitroom/backend/services/auth/platform.admin.guard';
import { PlatformSettingsService } from '@gitroom/nestjs-libraries/database/prisma/tadween/platform-settings.service';
import { ProviderSettingsService } from '@gitroom/nestjs-libraries/database/prisma/tadween/provider-settings.service';
import { PlansService } from '@gitroom/nestjs-libraries/database/prisma/tadween/plans.service';
import { AdminConsoleService } from '@gitroom/nestjs-libraries/database/prisma/tadween/admin-console.service';
import { ProviderCredentialsService } from '@gitroom/nestjs-libraries/database/prisma/tadween/provider-credentials.service';
import {
  AccessSettingsDto,
  AdminOrgTierDto,
  AdminUserActivationDto,
  BrandingSettingsDto,
  FeatureSettingsDto,
  PlanDto,
  YearlyDiscountDto,
  FounderWindowDto,
  ProviderCredentialsDto,
  ProviderSettingsDto,
  RegistrationSettingsDto,
} from '@gitroom/nestjs-libraries/dtos/tadween/admin.console.dto';
import {
  AdminOrganizationsQueryDto,
  AdminUsersQueryDto,
} from '@gitroom/nestjs-libraries/dtos/tadween/admin.list.dto';
import { FEATURES } from '@gitroom/nestjs-libraries/database/prisma/tadween/tadween.defaults';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { PartnersService } from '@gitroom/nestjs-libraries/database/prisma/partners/partners.service';
import {
  AdminCreateAffiliateDto,
  AdminMarkPayoutDto,
  AdminPartnersQueryDto,
  AdminReferralsQueryDto,
  AdminRejectReferralDto,
  AdminUpdatePartnerDto,
} from '@gitroom/nestjs-libraries/dtos/partners/partners.dto';
import { AdminListQueryDto } from '@gitroom/nestjs-libraries/dtos/tadween/admin.list.dto';
import { AccessService } from '@gitroom/nestjs-libraries/database/prisma/tadween/access.service';
import { paging } from '@gitroom/nestjs-libraries/database/prisma/tadween/admin-console.service';


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
    private _console: AdminConsoleService,
    private _credentials: ProviderCredentialsService,
    private _partners: PartnersService,
    private _access: AccessService
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

  // "About you" onboarding answers: counts and the latest free-text ones
  @Get('/onboarding')
  onboarding() {
    return this._console.onboarding();
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
        websiteUrl: body.websiteUrl || '',
        termsUrl: body.termsUrl || '',
        privacyUrl: body.privacyUrl || '',
        docsUrl: body.docsUrl || '',
        supportUrl: body.supportUrl || '',
        tutorialVideoUrl: body.tutorialVideoUrl || '',
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

  // Write-only: answers with set / not set per name, never a value.
  @Put('/providers/:identifier/credentials')
  saveCredentials(
    @GetUserFromRequest() user: User,
    @Req() req: Request,
    @Param('identifier') identifier: string,
    @Body() body: ProviderCredentialsDto
  ) {
    return this._credentials.save(
      identifier,
      body.values,
      this.adminId(req, user)
    );
  }

  // ── Plans ──────────────────────────────────────────────────────────────────
  @Get('/plans')
  async plans() {
    return {
      ...(await this._plans.listForAdmin()),
      // What Stripe charges per tier today when no plan overrides it.
      postizPricing: pricing,
    };
  }

  @Post('/plans')
  createPlan(@Body() body: PlanDto) {
    return this._plans.create(body);
  }

  @Put('/plans/yearly-discount')
  setYearlyDiscount(
    @GetUserFromRequest() user: User,
    @Req() req: Request,
    @Body() body: YearlyDiscountDto
  ) {
    return this._plans.setYearlyDiscount(
      body.yearlyDiscountPercent,
      this.adminId(req, user)
    );
  }

  @Put('/plans/founder')
  setFounderWindow(
    @GetUserFromRequest() user: User,
    @Req() req: Request,
    @Body() body: FounderWindowDto
  ) {
    return this._plans.setFounderWindow(body, this.adminId(req, user));
  }

  @Post('/plans/defaults')
  seedPlans(@GetUserFromRequest() user: User, @Req() req: Request) {
    return this._plans.seedDefaults(this.adminId(req, user));
  }

  @Put('/plans/:id')
  updatePlan(@Param('id') id: string, @Body() body: PlanDto) {
    return this._plans.update(id, body);
  }

  @Delete('/plans/:id')
  deletePlan(@Param('id') id: string) {
    return this._plans.remove(id);
  }

  // ── Free launch: payments switch, free plan, cap and waitlist ─────────────
  @Get('/access')
  access() {
    return this._access.adminState();
  }

  // Saving a higher cap (or none) lets the oldest waiting workspaces in
  @Put('/access')
  setAccess(
    @GetUserFromRequest() user: User,
    @Req() req: Request,
    @Body() body: AccessSettingsDto
  ) {
    return this._access.saveSettings(body, this.adminId(req, user));
  }

  @Get('/access/waitlist')
  waitlist(@Query() query: AdminListQueryDto) {
    const { page, pageSize } = paging(query);
    return this._access.listWaitlist(page, pageSize);
  }

  @Post('/access/waitlist/:id/admit')
  admit(@Param('id') id: string) {
    return this._access.admit(id);
  }

  // ── Users and workspaces ───────────────────────────────────────────────────
  @Get('/users')
  users(@Query() query: AdminUsersQueryDto) {
    return this._console.listUsers(query);
  }

  @Get('/users/:id')
  user(@Param('id') id: string) {
    return this._console.getUser(id);
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

  // Subscribers page: every workspace with its subscription. Nothing here
  // calls Stripe; the ids are the ones Postiz stored.
  @Get('/organizations')
  organizations(@Query() query: AdminOrganizationsQueryDto) {
    return this._console.listOrganizations(query);
  }

  @Get('/organizations/:id')
  organization(@Param('id') id: string) {
    return this._console.organizationDetail(id);
  }

  @Put('/organizations/:id/tier')
  setTier(@Param('id') id: string, @Body() body: AdminOrgTierDto) {
    return this._console.setOrgTier(id, body.tier);
  }

  // ── Growth: partners program ───────────────────────────────────────────────
  @Get('/partners')
  partners(@Query() query: AdminPartnersQueryDto) {
    return this._partners.adminPartners(query);
  }

  // Invite-only affiliates: the user's own workspace becomes an affiliate
  @Post('/partners')
  createAffiliate(
    @GetUserFromRequest() user: User,
    @Req() req: Request,
    @Body() body: AdminCreateAffiliateDto
  ) {
    return this._partners.createAffiliate(this.adminId(req, user), body);
  }

  @Put('/partners/:id')
  updatePartner(@Param('id') id: string, @Body() body: AdminUpdatePartnerDto) {
    return this._partners.updatePartner(id, body);
  }

  // Grants what is due now (free months, commission as balance)
  @Post('/partners/:id/apply')
  applyPartner(@Param('id') id: string) {
    return this._partners.applyNow(id);
  }

  // Next plan for a year / founder price for life, applied by hand in Stripe
  @Post('/partners/rewards/:id/applied')
  rewardApplied(@Param('id') id: string) {
    return this._partners.markRewardApplied(id);
  }

  @Get('/referrals')
  referrals(@Query() query: AdminReferralsQueryDto) {
    return this._partners.adminReferrals(query);
  }

  @Post('/referrals/:id/reject')
  rejectReferral(
    @Param('id') id: string,
    @Body() body: AdminRejectReferralDto
  ) {
    return this._partners.rejectReferral(id, body.reason || '');
  }

  @Get('/payouts')
  payouts(@Query() query: AdminListQueryDto) {
    return this._partners.adminPayouts(query);
  }

  // The monthly cash list with payout details, for the owner's Wise batch
  @Get('/payouts/export')
  async exportPayouts(@Res() res: Response) {
    const csv = await this._partners.payoutCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tadween-payouts-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(csv);
  }

  @Post('/payouts/:partnerId')
  markPaid(
    @GetUserFromRequest() user: User,
    @Req() req: Request,
    @Param('partnerId') partnerId: string,
    @Body() body: AdminMarkPayoutDto
  ) {
    return this._partners.markPaid(this.adminId(req, user), partnerId, body);
  }
}
