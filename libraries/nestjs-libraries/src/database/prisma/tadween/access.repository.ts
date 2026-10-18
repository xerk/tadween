import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// A workspace on the free plan: created after the early-access cutoff, not
// deleted, and without a live plan (admin-granted or paid).
const freeWorkspaces = (cutoff: Date): Prisma.OrganizationWhereInput => ({
  createdAt: { gte: cutoff },
  deletedAt: null,
  OR: [
    { subscription: { is: null } },
    { subscription: { is: { deletedAt: { not: null } } } },
  ],
});

// Read and write models of the free launch: plan resolution, the free-plan
// count and the waitlist. Selects only what the callers use.
@Injectable()
export class AccessRepository {
  constructor(
    private _organization: PrismaRepository<'organization'>,
    private _userOrganization: PrismaRepository<'userOrganization'>
  ) {}

  getOrganization(id: string) {
    return this._organization.model.organization.findUnique({
      where: { id },
      select: {
        id: true,
        createdAt: true,
        waitlistedAt: true,
        subscription: {
          select: {
            subscriptionTier: true,
            totalChannels: true,
            deletedAt: true,
          },
        },
      },
    });
  }

  // Free workspaces that have access (the ones the cap counts)
  countAdmitted(cutoff: Date) {
    return this._organization.model.organization.count({
      where: { ...freeWorkspaces(cutoff), waitlistedAt: null },
    });
  }

  countWaitlisted() {
    return this._organization.model.organization.count({
      where: { deletedAt: null, waitlistedAt: { not: null } },
    });
  }

  // 1 = next in line
  waitlistPosition(waitlistedAt: Date) {
    return this._organization.model.organization.count({
      where: { deletedAt: null, waitlistedAt: { not: null, lte: waitlistedAt } },
    });
  }

  oldestWaitlisted(take: number) {
    return this._organization.model.organization.findMany({
      where: { deletedAt: null, waitlistedAt: { not: null } },
      orderBy: [{ waitlistedAt: 'asc' }, { id: 'asc' }],
      take,
      select: { id: true },
    });
  }

  listWaitlisted(skip: number, take: number) {
    const where: Prisma.OrganizationWhereInput = {
      deletedAt: null,
      waitlistedAt: { not: null },
    };
    return Promise.all([
      this._organization.model.organization.count({ where }),
      this._organization.model.organization.findMany({
        where,
        orderBy: [{ waitlistedAt: 'asc' }, { id: 'asc' }],
        skip,
        take,
        select: {
          id: true,
          name: true,
          createdAt: true,
          waitlistedAt: true,
          users: {
            where: { role: 'SUPERADMIN' },
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: {
              user: { select: { id: true, email: true, name: true } },
            },
          },
        },
      }),
    ]);
  }

  // Clears the flag; 0 when the workspace was not waitlisted (already let in)
  async admit(id: string) {
    return (
      await this._organization.model.organization.updateMany({
        where: { id, waitlistedAt: { not: null } },
        data: { waitlistedAt: null },
      })
    ).count;
  }

  // Who hears that the workspace is in: its owners
  owners(organizationId: string) {
    return this._userOrganization.model.userOrganization.findMany({
      where: {
        organizationId,
        role: 'SUPERADMIN',
        disabled: false,
        // an owner who hasn't activated yet gets the welcome on activation
        user: { deletedAt: null, activated: true },
      },
      select: {
        user: {
          select: { id: true, email: true, name: true, language: true },
        },
      },
    });
  }
}
