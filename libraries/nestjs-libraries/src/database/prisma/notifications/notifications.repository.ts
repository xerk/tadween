import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsRepository {
  constructor(
    private _notifications: PrismaRepository<'notifications'>,
    private _user: PrismaRepository<'user'>,
    private _post: PrismaRepository<'post'>,
    private _integration: PrismaRepository<'integration'>
  ) {}

  // What the notifications panel shows about a post and its channel. Only
  // display fields: the channel's credentials never leave the repository.
  private readonly _postSummarySelect = {
    id: true,
    group: true,
    content: true,
    image: true,
    publishDate: true,
    state: true,
    error: true,
    integration: {
      select: {
        id: true,
        name: true,
        picture: true,
        providerIdentifier: true,
      },
    },
  } as const;

  getPostsByReleaseUrls(organizationId: string, urls: string[]) {
    return this._post.model.post.findMany({
      where: {
        organizationId,
        releaseURL: { in: urls },
        parentPostId: null,
        deletedAt: null,
      },
      select: {
        ...this._postSummarySelect,
        releaseURL: true,
      },
    });
  }

  getFailedPostsBetween(
    organizationId: string,
    providers: string[],
    from: Date,
    to: Date
  ) {
    return this._post.model.post.findMany({
      where: {
        organizationId,
        state: 'ERROR',
        parentPostId: null,
        deletedAt: null,
        publishDate: { gte: from, lte: to },
        integration: { providerIdentifier: { in: providers } },
      },
      select: this._postSummarySelect,
    });
  }

  getChannelsByProviders(organizationId: string, providers: string[]) {
    return this._integration.model.integration.findMany({
      where: {
        organizationId,
        deletedAt: null,
        providerIdentifier: { in: providers },
      },
      select: {
        id: true,
        name: true,
        picture: true,
        providerIdentifier: true,
        refreshNeeded: true,
      },
    });
  }

  getLastReadNotification(userId: string) {
    return this._user.model.user.findFirst({
      where: {
        id: userId,
      },
      select: {
        lastReadNotifications: true,
      },
    });
  }

  async getMainPageCount(organizationId: string, userId: string) {
    const { lastReadNotifications } = (await this.getLastReadNotification(
      userId
    ))!;

    return {
      total: await this._notifications.model.notifications.count({
        where: {
          organizationId,
          createdAt: {
            gt: lastReadNotifications!,
          },
        },
      }),
    };
  }

  async createNotification(organizationId: string, content: string) {
    await this._notifications.model.notifications.create({
      data: {
        organizationId,
        content,
      },
    });
  }

  async getNotificationsSince(organizationId: string, since: string) {
    return this._notifications.model.notifications.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(since),
        },
      },
    });
  }

  async getNotificationsPaginated(organizationId: string, page: number) {
    const limit = 100;
    const skip = page * limit;

    const where = {
      organizationId,
      deletedAt: null as Date | null,
    };

    const [notifications, total] = await Promise.all([
      this._notifications.model.notifications.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
        select: {
          id: true,
          content: true,
          link: true,
          createdAt: true,
        },
      }),
      this._notifications.model.notifications.count({ where }),
    ]);

    return {
      notifications,
      total,
      page,
      limit,
      hasMore: skip + notifications.length < total,
    };
  }

  async getNotifications(organizationId: string, userId: string) {
    const { lastReadNotifications } = (await this.getLastReadNotification(
      userId
    ))!;

    await this._user.model.user.update({
      where: {
        id: userId,
      },
      data: {
        lastReadNotifications: new Date(),
      },
    });

    return {
      lastReadNotifications,
      notifications: await this._notifications.model.notifications.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        take: 30,
        where: {
          organizationId,
        },
        select: {
          id: true,
          createdAt: true,
          content: true,
        },
      }),
    };
  }
}
