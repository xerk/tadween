import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '@gitroom/nestjs-libraries/database/prisma/users/users.repository';
import { Provider, Role } from '@prisma/client';
import { UserDetailDto } from '@gitroom/nestjs-libraries/dtos/users/user.details.dto';
import { EmailNotificationsDto } from '@gitroom/nestjs-libraries/dtos/users/email-notifications.dto';
import { DeviceDto } from '@gitroom/nestjs-libraries/dtos/users/device.dto';
import { OnboardingAnswersDto } from '@gitroom/nestjs-libraries/dtos/users/onboarding.answers.dto';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { IntegrationRepository } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.repository';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';

@Injectable()
export class UsersService {
  constructor(
    private _usersRepository: UsersRepository,
    private _organizationRepository: OrganizationRepository,
    private _integrationRepository: IntegrationRepository,
    private _notificationService: NotificationService
  ) {}

  private readonly _logger = new Logger(UsersService.name);

  getUserByEmail(email: string) {
    return this._usersRepository.getUserByEmail(email);
  }

  getUserById(id: string) {
    return this._usersRepository.getUserById(id);
  }

  getUserWithActiveSubscriptionByEmail(email: string, excludeUserId: string) {
    return this._usersRepository.getUserWithActiveSubscriptionByEmail(
      email,
      excludeUserId
    );
  }

  getImpersonateUser(name: string) {
    return this._organizationRepository.getImpersonateUser(name);
  }

  getUserByProvider(providerId: string, provider: Provider) {
    return this._usersRepository.getUserByProvider(providerId, provider);
  }

  async switchUser(
    currentUserId: string,
    targetUserId: string,
    adminId: string
  ) {
    const { kept, switched } =
      await this._usersRepository.switchUserCredentials(
        currentUserId,
        targetUserId
      );

    this._logger.log(
      `User login switch performed by admin ${adminId}: account ${
        kept.id
      } login ${switched.email} -> ${kept.email}; account ${
        switched.id
      } login ${kept.email} -> ${switched.email}`
    );

    // the swap is already committed; a notification failure must not fail it
    if (this._notificationService.hasEmailProvider()) {
      await Promise.all(
        [kept, switched].map((account) =>
          this._notificationService
            .sendTemplate(account.email, 'loginChanged', {
              email: account.email,
            })
            .catch((err) =>
              this._logger.error(`Failed to notify ${account.email}`, err)
            )
        )
      );
    }

    return { kept, switched };
  }

  async getOrgsToDeleteForAccount(userId: string) {
    const orgs = await this._organizationRepository.getOrgsByUserId(userId);
    const ownedOrgs = orgs.filter(
      (org) => org.users[0].role === Role.SUPERADMIN
    );

    const teams = await Promise.all(
      ownedOrgs.map((org) => this._organizationRepository.getTeam(org.id))
    );

    return ownedOrgs.filter(
      (org, index) =>
        !teams[index]?.users?.some(
          (member) =>
            member.user.id !== userId && member.role === Role.SUPERADMIN
        )
    );
  }

  async getDeleteAccountInfo(userId: string) {
    const ownedOrgs = await this.getOrgsToDeleteForAccount(userId);
    const teams = await Promise.all(
      ownedOrgs.map((org) => this._organizationRepository.getTeam(org.id))
    );

    return {
      hasSubscription: ownedOrgs.some((org) => !!org.subscription),
      hasAdditionalMembers: teams.some((team) =>
        team?.users?.some((member) => member.user.id !== userId)
      ),
    };
  }

  async deleteAccount(userId: string) {
    const deletedOrgs = await this.getOrgsToDeleteForAccount(userId);
    const orgs = await this._organizationRepository.getOrgsByUserId(userId);

    for (const org of orgs) {
      if (deletedOrgs.some((deletedOrg) => deletedOrg.id === org.id)) {
        const team = await this._organizationRepository.getTeam(org.id);
        for (const member of team?.users || []) {
          if (member.user.id !== userId) {
            await this._organizationRepository.deleteTeamMember(
              org.id,
              member.user.id
            );
          }
        }

        await this._integrationRepository.deleteIntegrationsForAccount(org.id);
        await this._organizationRepository.deleteOrganization(org.id);
      } else {
        await this._organizationRepository.deleteTeamMember(org.id, userId);
      }
    }

    await this._usersRepository.deleteAccount(userId);

    this._logger.log(
      `Account ${userId} deleted, organizations removed: ${deletedOrgs
        .map((org) => org.id)
        .join(', ')}`
    );

    return { deletedOrgs };
  }

  activateUser(id: string) {
    return this._usersRepository.activateUser(id);
  }

  updatePassword(id: string, password: string) {
    return this._usersRepository.updatePassword(id, password);
  }

  getPersonal(userId: string) {
    return this._usersRepository.getPersonal(userId);
  }

  changePersonal(userId: string, body: UserDetailDto) {
    return this._usersRepository.changePersonal(userId, body);
  }

  getEmailNotifications(userId: string) {
    return this._usersRepository.getEmailNotifications(userId);
  }

  updateEmailNotifications(userId: string, body: EmailNotificationsDto) {
    return this._usersRepository.updateEmailNotifications(userId, body);
  }

  fillProfile(userId: string, profile: { name?: string; pictureId?: string }) {
    return this._usersRepository.fillProfile(userId, profile);
  }

  // Tadween: the mobile app's push token for this phone
  saveDevice(userId: string, body: DeviceDto) {
    return this._usersRepository.saveDevice(userId, body);
  }

  deleteDevice(userId: string, token: string) {
    return this._usersRepository.deleteDevice(userId, token);
  }

  setLanguage(userId: string, language: string) {
    return this._usersRepository.setLanguage(userId, language);
  }

  // A free-text answer is only kept next to "other", and the company only for
  // agencies and company teams
  saveOnboardingAnswers(userId: string, body: OnboardingAnswersDto) {
    const text = (value: string | undefined, keep: boolean) =>
      keep && value ? value : null;
    const business = body.role === 'agency' || body.role === 'company_team';
    return this._usersRepository.saveOnboardingAnswers(userId, {
      source: body.source,
      sourceOther: text(body.sourceOther, body.source === 'other'),
      role: body.role,
      roleOther: text(body.roleOther, body.role === 'other'),
      goal: body.goal,
      goalOther: text(body.goalOther, body.goal === 'other'),
      company: text(body.company, business),
      website: text(body.website, business),
    });
  }

  async onboardingAnswered(userId: string) {
    return !!(await this._usersRepository.getOnboardingAnsweredAt(userId));
  }
}
