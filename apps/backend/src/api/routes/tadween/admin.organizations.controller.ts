import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlatformAdminGuard } from '@gitroom/backend/services/auth/platform.admin.guard';
import { AdminConsoleService } from '@gitroom/nestjs-libraries/database/prisma/tadween/admin-console.service';
import { AdminOrganizationsQueryDto } from '@gitroom/nestjs-libraries/dtos/tadween/admin.list.dto';

// Super-admin console: every workspace with its subscription (the Subscribers
// page). Read-only: plan changes go through PUT /admin/console/organizations/:id/tier.
// Nothing here calls Stripe; ids are the ones Postiz stored.
@ApiTags('Admin console')
@Controller('/admin/console/organizations')
@UseGuards(PlatformAdminGuard)
export class AdminOrganizationsController {
  constructor(private _console: AdminConsoleService) {}

  @Get('/')
  list(@Query() query: AdminOrganizationsQueryDto) {
    return this._console.listOrganizations(query);
  }

  @Get('/:id')
  detail(@Param('id') id: string) {
    return this._console.organizationDetail(id);
  }
}
