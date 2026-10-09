import { Body, Controller, Param, Put, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { User } from '@prisma/client';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { AuthService as AuthChecker } from '@gitroom/helpers/auth/auth.service';
import { PlatformAdminGuard } from '@gitroom/backend/services/auth/platform.admin.guard';
import { ProviderCredentialsService } from '@gitroom/nestjs-libraries/database/prisma/tadween/provider-credentials.service';
import { ProviderCredentialsDto } from '@gitroom/nestjs-libraries/dtos/tadween/admin.list.dto';

// Super-admin console: provider app credentials. Write-only: the response is
// the set / not set status, never a value.
@ApiTags('Admin console')
@Controller('/admin/console/providers')
@UseGuards(PlatformAdminGuard)
export class AdminCredentialsController {
  constructor(private _credentials: ProviderCredentialsService) {}

  // While impersonating, `user` is the impersonated account; the admin is the
  // login in the JWT (same as AdminConsoleController).
  private adminId(req: Request, user: User) {
    try {
      const auth = (req.headers.auth as string) || req.cookies?.auth;
      const payload = AuthChecker.verifyJWT(auth) as { id?: string } | null;
      return payload?.id || user.id;
    } catch {
      return user.id;
    }
  }

  @Put('/:identifier/credentials')
  save(
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
}
