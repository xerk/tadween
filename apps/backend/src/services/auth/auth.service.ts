import { Injectable } from '@nestjs/common';
import { Provider, User } from '@prisma/client';
import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';
import { LoginUserDto } from '@gitroom/nestjs-libraries/dtos/auth/login.user.dto';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { AuthService as AuthChecker } from '@gitroom/helpers/auth/auth.service';
import { AuthProviderManager } from '@gitroom/backend/services/auth/providers/providers.manager';
import dayjs from 'dayjs';
import { ForgotReturnPasswordDto } from '@gitroom/nestjs-libraries/dtos/auth/forgot-return.password.dto';
import { EmailService } from '@gitroom/nestjs-libraries/services/email.service';
import { NewsletterService } from '@gitroom/nestjs-libraries/newsletter/newsletter.service';
import { PlatformSettingsService } from '@gitroom/nestjs-libraries/database/prisma/tadween/platform-settings.service';
import { PartnersService } from '@gitroom/nestjs-libraries/database/prisma/partners/partners.service';
import { PaymentService } from '@gitroom/nestjs-libraries/services/payment/payment.service';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';

@Injectable()
export class AuthService {
  constructor(
    private _userService: UsersService,
    private _organizationService: OrganizationService,
    private _emailService: EmailService,
    private _providerManager: AuthProviderManager,
    private _platformSettings: PlatformSettingsService,
    private _partners: PartnersService,
    private _paymentService: PaymentService,
    private _mediaService: MediaService
  ) {}

  // Tadween: the mode comes from the super-admin console, falling back to
  // DISABLE_REGISTRATION (closed) and INVITE_ONLY_REGISTRATION (invite).
  // Invite-only lets a valid signed invite through; closed still allows the
  // very first account so a fresh instance can be bootstrapped.
  getRegistrationMode() {
    return this._platformSettings.getRegistrationMode();
  }

  async canRegister(provider: string, hasInvite = false) {
    const mode = await this.getRegistrationMode();
    if (mode === 'open' || provider === Provider.GENERIC) {
      return true;
    }

    if (mode === 'invite' && hasInvite) {
      return true;
    }

    return (await this._organizationService.getCount()) === 0;
  }

  async routeAuth(
    provider: Provider,
    body: CreateOrgUserDto | LoginUserDto,
    ip: string,
    userAgent: string,
    addToOrg?: boolean | { orgId: string; role: 'USER' | 'ADMIN'; id: string },
    language?: string
  ) {
    if (provider === Provider.LOCAL) {
      if (process.env.DISALLOW_PLUS && body.email.includes('+')) {
        throw new Error('Email with plus sign is not allowed');
      }
      if (body instanceof CreateOrgUserDto) {
        body.email = body.email.toLowerCase();
      }
      const user = await this._userService.getUserByEmail(body.email);
      if (body instanceof CreateOrgUserDto) {
        if (user) {
          throw new Error('Email already exists');
        }

        if (
          !(await this.canRegister(
            provider,
            !!addToOrg && typeof addToOrg !== 'boolean'
          ))
        ) {
          throw new Error('Registration is disabled');
        }

        const create = await this._organizationService.createOrgAndUser(
          body,
          ip,
          userAgent
        );
        // never fails the sign-up
        await this._partners.attributeSignup(
          create.id,
          create.users[0].user.id,
          body.ref
        );

        // an invited teammate joins a workspace that has its own plan
        if (!addToOrg || typeof addToOrg === 'boolean') {
          await this.startSignupTrial(
            create.id,
            create.users[0].user.id,
            body.email
          );
        }

        const addedOrg =
          addToOrg && typeof addToOrg !== 'boolean'
            ? await this._organizationService.addUserToOrg(
                create.users[0].user.id,
                addToOrg.id,
                addToOrg.orgId,
                addToOrg.role
              )
            : false;

        await this.saveLanguage(create.users[0].user.id, language);
        const obj = { addedOrg, jwt: await this.jwt(create.users[0].user) };
        await this._emailService.sendTemplate(
          { email: body.email, language: language || null },
          'activateAccount',
          { url: `${process.env.FRONTEND_URL}/auth/activate/${obj.jwt}` },
          { sync: true }
        );
        return obj;
      }

      if (!user || !AuthChecker.comparePassword(body.password, user.password)) {
        throw new Error('Invalid user name or password');
      }

      if (!user.activated) {
        throw new Error('User is not activated');
      }

      const addedOrg =
        addToOrg && typeof addToOrg !== 'boolean'
          ? await this._organizationService.addUserToOrg(
              user.id,
              addToOrg.id,
              addToOrg.orgId,
              addToOrg.role
            )
          : false;

      return { addedOrg, jwt: await this.jwt(user) };
    }

    const user = await this.loginOrRegisterProvider(
      provider,
      body as CreateOrgUserDto,
      ip,
      userAgent,
      !!addToOrg && typeof addToOrg !== 'boolean',
      language
    );

    const addedOrg =
      addToOrg && typeof addToOrg !== 'boolean'
        ? await this._organizationService.addUserToOrg(
            user.id,
            addToOrg.id,
            addToOrg.orgId,
            addToOrg.role
          )
        : false;
    return { addedOrg, jwt: await this.jwt(user) };
  }

  // A new workspace starts its free trial without a card at sign-up (the
  // trial "Maybe later" starts), unless another account with this email
  // already pays: the same rule that blocks its checkout. Never throws.
  private async startSignupTrial(
    organizationId: string,
    userId: string,
    email: string
  ) {
    try {
      if (
        await this._userService.getUserWithActiveSubscriptionByEmail(
          email,
          userId
        )
      ) {
        return;
      }
      await this._paymentService.startSignupTrial(organizationId, userId);
    } catch (err) {
      console.error('signup_trial_not_started', {
        organization_id: organizationId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Tadween: the app language at sign-up (the i18next cookie), for emails
  private async saveLanguage(userId: string, language?: string) {
    // a cookie or header: only a language code ("ar", "en-US") is kept
    if (!language || !/^[a-z]{2}([-_][A-Za-z]{2,4})?$/.test(language)) {
      return;
    }
    try {
      await this._userService.setLanguage(userId, language);
    } catch (err) {
      // never fails the sign-up
    }
  }

  // Takes the name and photo the sign-in provider shares, each only when the
  // account has none (new, or created before providers shared them), so an
  // account with a name still gets its first photo. The photo is copied into
  // the user's own workspace media (once: only while the user has no photo)
  // so it doesn't depend on the provider URL. Runs in the background (a slow
  // photo host must not hold the sign-in) and never throws.
  private async fillProfile(
    user: { id: string; name?: string | null; pictureId?: string | null },
    providerUser: { name?: string; picture?: string },
    organizationId?: string
  ) {
    try {
      const needsName = !user.name && !!providerUser.name;
      const needsPicture = !user.pictureId && !!providerUser.picture;
      if (!needsName && !needsPicture) {
        return;
      }

      let pictureId: string | undefined;
      if (needsPicture) {
        // never a team the user was invited to
        const orgId =
          organizationId ||
          (await this._organizationService.getOrgsByUserId(user.id)).find(
            (org) => org.users[0]?.role === 'SUPERADMIN'
          )?.id;
        if (orgId) {
          pictureId = (
            await this._mediaService.uploadFromUrl(orgId, providerUser.picture)
          ).id;
        }
      }

      if (needsName || pictureId) {
        await this._userService.fillProfile(user.id, {
          name: needsName ? providerUser.name : undefined,
          pictureId,
        });
      }
    } catch (err) {
      console.error('provider_profile_not_saved', {
        user_id: user.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // After activation, or right after a provider sign-up. A workspace that
  // joined with an invite hears about its bonus. Never throws.
  private async sendWelcome(
    user: { id: string; email: string; name?: string | null; language?: string | null },
    organizationId?: string
  ) {
    try {
      const orgId =
        organizationId ||
        (await this._organizationService.getOrgsByUserId(user.id))[0]?.id;
      const referral = orgId ? await this._partners.welcomeOffer(orgId) : null;
      await this._emailService.sendTemplate(
        { email: user.email, language: user.language },
        'welcome',
        { name: user.name || '', ...(referral ? { referral } : {}) },
        { dedupeKey: `welcome_${user.id}` }
      );
    } catch (err) {
      console.error('welcome_email_not_sent', {
        user_id: user.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  public getOrgFromCookie(cookie?: string) {
    if (!cookie) {
      return false;
    }

    try {
      const getOrg: any = AuthChecker.verifyJWT(cookie);
      if (dayjs(getOrg.timeLimit).isBefore(dayjs())) {
        return false;
      }

      return getOrg as {
        email: string;
        role: 'USER' | 'ADMIN';
        orgId: string;
        id: string;
      };
    } catch (err) {
      return false;
    }
  }

  private async loginOrRegisterProvider(
    provider: Provider,
    body: CreateOrgUserDto,
    ip: string,
    userAgent: string,
    hasInvite = false,
    language?: string
  ) {
    const providerInstance = this._providerManager.getProvider(provider);
    const providerUser = await providerInstance.getUser(body.providerToken);

    if (!providerUser) {
      throw new Error('Invalid provider token');
    }

    const user = await this._userService.getUserByProvider(
      providerUser.id,
      provider
    );
    if (user) {
      this.fillProfile(user, providerUser);
      return user;
    }

    if (!(await this.canRegister(provider, hasInvite))) {
      throw new Error('Registration is disabled');
    }

    const create = await this._organizationService.createOrgAndUser(
      {
        company: body.company,
        email: providerUser.email,
        password: '',
        provider,
        providerId: providerUser.id,
        datafast_visitor_id: body.datafast_visitor_id,
      },
      ip,
      userAgent
    );

    // never fails the sign-up
    await this._partners.attributeSignup(
      create.id,
      create.users[0].user.id,
      body.ref
    );

    // an invited teammate joins a workspace that has its own plan
    if (!hasInvite) {
      await this.startSignupTrial(
        create.id,
        create.users[0].user.id,
        providerUser.email
      );
    }

    this._track('register', providerUser.email, body.datafast_visitor_id).catch(
      (err) => {}
    );

    await NewsletterService.register(providerUser.email);

    try {
      if (providerInstance?.postRegistration) {
        await providerInstance.postRegistration(body.providerToken, create.id);
      }
    } catch (err) {
      // Don't fail registration if postRegistration fails
    }

    this.fillProfile(create.users[0].user, providerUser, create.id);

    // a provider account is active right away: welcome now
    await this.saveLanguage(create.users[0].user.id, language);
    await this.sendWelcome(
      { ...create.users[0].user, language: language || null },
      create.id
    );

    return create.users[0].user;
  }

  private async _track(
    name: string,
    email: string,
    datafast_visitor_id: string
  ) {
    if (email && datafast_visitor_id && process.env.DATAFAST_API_KEY) {
      try {
        await fetch('https://datafa.st/api/v1/goals', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.DATAFAST_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            datafast_visitor_id: datafast_visitor_id,
            name: name,
            metadata: {
              email,
            },
          }),
        });
      } catch (err) {}
    }
  }

  async forgot(email: string) {
    const user = await this._userService.getUserByEmail(email);
    if (!user || user.providerName !== Provider.LOCAL) {
      return false;
    }

    const resetValues = AuthChecker.signJWT({
      id: user.id,
      expires: dayjs().add(20, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
    });

    await this._emailService.sendTemplate(
      { email: user.email, language: user.language },
      'resetPassword',
      { url: `${process.env.FRONTEND_URL}/auth/forgot/${resetValues}` },
      { sync: true }
    );
  }

  forgotReturn(body: ForgotReturnPasswordDto) {
    const user = AuthChecker.verifyJWT(body.token) as {
      id: string;
      expires: string;
    };
    if (dayjs(user.expires).isBefore(dayjs())) {
      return false;
    }

    return this._userService.updatePassword(user.id, body.password);
  }

  async activate(code: string, tracking: string) {
    const user = AuthChecker.verifyJWT(code) as {
      id: string;
      activated: boolean;
      email: string;
    };
    if (user.id && !user.activated) {
      const getUserAgain = await this._userService.getUserByEmail(user.email);
      if (getUserAgain.activated) {
        return false;
      }
      await this._userService.activateUser(user.id);
      user.activated = true;
      this._track('register', user.email, tracking).catch((err) => {});
      await NewsletterService.register(user.email);
      await this.sendWelcome(getUserAgain);
      return this.jwt(user as any);
    }

    return false;
  }

  async resendActivationEmail(email: string) {
    const user = await this._userService.getUserByEmail(email);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.activated) {
      throw new Error('Account is already activated');
    }

    const jwt = await this.jwt(user);

    await this._emailService.sendTemplate(
      { email: user.email, language: user.language },
      'activateAccount',
      { url: `${process.env.FRONTEND_URL}/auth/activate/${jwt}` },
      { sync: true }
    );

    return true;
  }

  oauthLink(provider: string, query?: any) {
    const providerInstance = this._providerManager.getProvider(provider);
    return providerInstance.generateLink(query);
  }

  async checkExists(
    provider: string,
    code: string,
    redirectUri?: string,
    state?: string,
    stateCookie?: string
  ) {
    // the mobile app passes redirect_uri and keeps no cookies, the web flow
    // never passes it, so the state nonce is only enforced for the web flow
    if (
      !process.env.NOT_SECURED &&
      !redirectUri &&
      (!state || state !== stateCookie)
    ) {
      throw new Error('Invalid state');
    }

    const providerInstance = this._providerManager.getProvider(provider);
    const token = await providerInstance.getToken(code, redirectUri);
    const user = await providerInstance.getUser(token);
    if (!user) {
      throw new Error('Invalid user');
    }
    const checkExists = await this._userService.getUserByProvider(
      user.id,
      provider as Provider
    );
    if (checkExists) {
      this.fillProfile(checkExists, user);
      return { jwt: await this.jwt(checkExists) };
    }

    return { token };
  }

  private async jwt(user: User) {
    if (user.password) {
      delete user.password;
    }
    return AuthChecker.signJWT(user);
  }
}
