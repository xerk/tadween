import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization, User } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { PartnersService } from '@gitroom/nestjs-libraries/database/prisma/partners/partners.service';
import {
  ClaimReferralDto,
  PartnerApplicationDto,
  PartnerPayoutSettingsDto,
} from '@gitroom/nestjs-libraries/dtos/partners/partners.dto';

// Tadween partners program for the current workspace: Invite & earn (every
// workspace) and the affiliate dashboard (/partners). 404 while the
// `affiliate` feature switch is off.
@ApiTags('Partners')
@Controller('/partners')
export class PartnersController {
  constructor(private _partners: PartnersService) {}

  @Get('/me')
  me(@GetOrgFromRequest() org: Organization, @GetUserFromRequest() user: User) {
    return this._partners.getMine(org, user.id);
  }

  // The longer free trial of a workspace an affiliate brought (billing)
  @Get('/invited')
  invited(@GetOrgFromRequest() org: Organization) {
    return this._partners.invitedTrial(org.id);
  }

  // "Who invited you?" during the first days after sign-up
  @Post('/claim')
  claim(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: ClaimReferralDto
  ) {
    return this._partners.claim(org, user.id, body.code);
  }

  // "Become a partner": the application goes to the team's inbox
  @Post('/apply')
  apply(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: PartnerApplicationDto
  ) {
    return this._partners.apply(org, user, body);
  }

  @Put('/payout')
  payout(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: PartnerPayoutSettingsDto
  ) {
    return this._partners.updatePayoutSettings(org.id, user.id, body);
  }
}
