import {
  PrismaRepository,
  PrismaTransaction,
} from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SaveMediaInformationDto } from '@gitroom/nestjs-libraries/dtos/media/save.media.information.dto';
import {
  GetMediaDto,
  MediaTypeFilter,
} from '@gitroom/nestjs-libraries/dtos/media/get.media.dto';

// The library tells the kinds apart by extension: the `type` column is not
// filled in by the uploads
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.m4v'];
const GIF_EXTENSIONS = ['.gif'];

const pathEndsWith = (extensions: string[]): Prisma.MediaWhereInput[] =>
  extensions.map((ext) => ({
    path: { endsWith: ext, mode: 'insensitive' as const },
  }));

const typeFilter = (type?: MediaTypeFilter): Prisma.MediaWhereInput => {
  switch (type) {
    case 'video':
      return { OR: pathEndsWith(VIDEO_EXTENSIONS) };
    case 'gif':
      return { OR: pathEndsWith(GIF_EXTENSIONS) };
    case 'image':
      return {
        NOT: {
          OR: pathEndsWith([...VIDEO_EXTENSIONS, ...GIF_EXTENSIONS]),
        },
      };
    default:
      return {};
  }
};

@Injectable()
export class MediaRepository {
  constructor(
    private _media: PrismaRepository<'media'>,
    private _mediaFolder: PrismaRepository<'mediaFolder'>,
    private _post: PrismaRepository<'post'>,
    private _transaction: PrismaTransaction
  ) {}

  saveFile(org: string, fileName: string, filePath: string, originalName?: string) {
    return this._media.model.media.create({
      data: {
        organization: {
          connect: {
            id: org,
          },
        },
        name: fileName,
        path: filePath,
        originalName: originalName || null,
      },
      select: {
        id: true,
        name: true,
        originalName: true,
        path: true,
        thumbnail: true,
        alt: true,
        status: true,
      },
    });
  }

  startProcessing(org: string, id: string) {
    return this._media.model.media.update({
      where: { id, organizationId: org },
      data: { status: 'processing', processingError: null },
      select: { id: true, status: true },
    });
  }

  finishProcessing(
    org: string,
    id: string,
    data: { name?: string; path?: string; fileSize?: number; error?: string }
  ) {
    return this._media.model.media.update({
      where: { id, organizationId: org },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.path ? { path: data.path } : {}),
        ...(data.fileSize ? { fileSize: data.fileSize } : {}),
        status: data.error ? 'failed' : 'ready',
        processingError: data.error || null,
      },
      select: { id: true, status: true },
    });
  }

  getMediaStatus(org: string, id: string) {
    return this._media.model.media.findFirst({
      where: {
        id,
        organizationId: org,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        originalName: true,
        path: true,
        thumbnail: true,
        alt: true,
        status: true,
        processingError: true,
      },
    });
  }

  getMediaById(id: string) {
    return this._media.model.media.findUnique({
      where: {
        id,
      },
    });
  }

  deleteMedia(org: string, id: string) {
    return this._media.model.media.update({
      where: {
        id,
        organizationId: org,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  saveMediaInformation(org: string, data: SaveMediaInformationDto) {
    return this._media.model.media.update({
      where: {
        id: data.id,
        organizationId: org,
      },
      data: {
        alt: data.alt,
        thumbnail: data.thumbnail,
        thumbnailTimestamp: data.thumbnailTimestamp,
      },
      select: {
        id: true,
        name: true,
        originalName: true,
        alt: true,
        thumbnail: true,
        path: true,
        thumbnailTimestamp: true,
      },
    });
  }

  // usedPaths narrows the list to the media posts use (or don't), see
  // MediaService.getMedia
  async getMedia(
    org: string,
    query: GetMediaDto,
    usedPaths?: { in: string[] } | { notIn: string[] }
  ) {
    const limit = query.limit || 18;
    const pageNum = (query.page || 1) - 1;
    const trimmedSearch = query.search?.trim();
    const where: Prisma.MediaWhereInput = {
      organizationId: org,
      deletedAt: null,
      // still being normalized: it shows up once the workflow releases it
      status: { not: 'processing' },
      ...(trimmedSearch
        ? {
            originalName: {
              contains: trimmedSearch,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(query.folderId
        ? { folderId: query.folderId === 'root' ? null : query.folderId }
        : {}),
      ...(usedPaths ? { path: usedPaths } : {}),
      AND: [typeFilter(query.type)],
    };
    const order = query.order === 'asc' ? 'asc' : 'desc';
    const pages = Math.ceil(
      (await this._media.model.media.count({ where })) / limit
    );
    const results = await this._media.model.media.findMany({
      where,
      orderBy:
        query.sort === 'name'
          ? [
              // media saved without an original name sort by their stored name
              { originalName: { sort: order, nulls: 'last' } },
              { name: order },
            ]
          : [{ createdAt: order }, { id: order }],
      select: {
        id: true,
        name: true,
        originalName: true,
        path: true,
        thumbnail: true,
        alt: true,
        thumbnailTimestamp: true,
        fileSize: true,
        createdAt: true,
        folderId: true,
      },
      skip: pageNum * limit,
      take: limit,
    });

    return {
      pages,
      results,
    };
  }

  // the posts (not deleted) that carry any of these media, matched by path:
  // the composer stores its own ids for the media in Post.image
  getPostsUsingPaths(org: string, paths: string[]) {
    if (!paths.length) {
      return Promise.resolve([] as { group: string; image: string | null }[]);
    }
    return this._post.model.post.findMany({
      where: {
        organizationId: org,
        deletedAt: null,
        OR: paths.map((path) => ({ image: { contains: path } })),
      },
      select: { group: true, image: true },
    });
  }

  getPostsWithMedia(org: string) {
    return this._post.model.post.findMany({
      where: {
        organizationId: org,
        deletedAt: null,
        image: { not: null },
        NOT: { image: '[]' },
      },
      select: { group: true, image: true },
    });
  }

  getMediaUsage(org: string, path: string) {
    return this._post.model.post.findMany({
      where: {
        organizationId: org,
        deletedAt: null,
        image: { contains: path },
      },
      orderBy: { publishDate: 'desc' },
      select: {
        id: true,
        group: true,
        state: true,
        publishDate: true,
        content: true,
        integration: {
          select: {
            id: true,
            name: true,
            picture: true,
            providerIdentifier: true,
          },
        },
      },
      take: 200,
    });
  }

  getMediaDetails(org: string, id: string) {
    return this._media.model.media.findFirst({
      where: { id, organizationId: org, deletedAt: null },
      select: {
        id: true,
        name: true,
        originalName: true,
        path: true,
        thumbnail: true,
        alt: true,
        thumbnailTimestamp: true,
        fileSize: true,
        createdAt: true,
        folderId: true,
      },
    });
  }

  renameMedia(org: string, id: string, name: string) {
    return this._media.model.media.update({
      where: { id, organizationId: org, deletedAt: null },
      data: { originalName: name },
      select: { id: true, originalName: true },
    });
  }

  moveMedia(org: string, ids: string[], folderId: string | null) {
    return this._media.model.media.updateMany({
      where: { id: { in: ids }, organizationId: org, deletedAt: null },
      data: { folderId },
    });
  }

  getFolders(org: string) {
    return this._mediaFolder.model.mediaFolder.findMany({
      where: { organizationId: org, deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
        _count: {
          select: {
            media: {
              where: { deletedAt: null, status: { not: 'processing' } },
            },
          },
        },
      },
    });
  }

  getFolder(org: string, id: string) {
    return this._mediaFolder.model.mediaFolder.findFirst({
      where: { id, organizationId: org, deletedAt: null },
      select: { id: true, name: true, parentId: true },
    });
  }

  createFolder(org: string, name: string, parentId: string | null) {
    return this._mediaFolder.model.mediaFolder.create({
      data: { organizationId: org, name, parentId },
      select: { id: true, name: true, parentId: true },
    });
  }

  updateFolder(
    org: string,
    id: string,
    data: { name?: string; parentId?: string | null }
  ) {
    return this._mediaFolder.model.mediaFolder.update({
      where: { id, organizationId: org, deletedAt: null },
      data,
      select: { id: true, name: true, parentId: true },
    });
  }

  // what was inside goes up to the folder's parent, nothing is deleted with it
  deleteFolder(org: string, id: string, parentId: string | null) {
    return this._transaction.model.$transaction(async (tx) => {
      await tx.media.updateMany({
        where: { organizationId: org, folderId: id },
        data: { folderId: parentId },
      });
      await tx.mediaFolder.updateMany({
        where: { organizationId: org, parentId: id, deletedAt: null },
        data: { parentId },
      });
      return tx.mediaFolder.update({
        where: { id, organizationId: org },
        data: { deletedAt: new Date() },
        select: { id: true },
      });
    });
  }
}
