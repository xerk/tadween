'use client';

import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

// Data for the media library (/media and the composer's picker). Every request
// goes to MediaController: GET /media (paged, filtered), /media/folders,
// /media/:id/usage, and the folder / move / rename / delete actions.

export type MediaKind = 'image' | 'video' | 'gif' | 'file';
export type MediaTypeFilter = 'all' | 'image' | 'video' | 'gif';
export type MediaUsageFilter = 'all' | 'used' | 'unused';
export type MediaSort = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

export interface LibraryMedia {
  id: string;
  name: string;
  originalName: string | null;
  path: string;
  thumbnail: string | null;
  alt: string | null;
  thumbnailTimestamp: number | null;
  fileSize: number;
  createdAt: string;
  folderId: string | null;
  usedIn: number;
}

export interface LibraryFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  mediaCount: number;
}

export interface MediaUsage {
  group: string;
  postId: string;
  state: 'QUEUE' | 'PUBLISHED' | 'ERROR' | 'DRAFT';
  publishDate: string;
  content: string;
  integrations: {
    id: string;
    name: string;
    picture: string | null;
    providerIdentifier: string;
  }[];
}

export interface MediaQuery {
  // undefined lists every folder (search), 'root' the media in no folder
  folderId?: string;
  search: string;
  type: MediaTypeFilter;
  usage: MediaUsageFilter;
  sort: MediaSort;
}

export const MEDIA_PAGE_SIZE = 40;

export const mediaKind = (path: string): MediaKind => {
  const ext = (path || '').split('?')[0].split('.').pop()?.toLowerCase();
  if (ext === 'gif') return 'gif';
  if (['mp4', 'mov', 'webm', 'm4v'].includes(ext || '')) return 'video';
  if (['png', 'jpg', 'jpeg', 'webp', 'avif', 'svg', 'bmp'].includes(ext || ''))
    return 'image';
  return 'file';
};

export const mediaName = (media: Pick<LibraryMedia, 'originalName' | 'name'>) =>
  media.originalName || media.name;

export const formatBytes = (bytes?: number | null) => {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
};

export const formatDuration = (seconds?: number) => {
  if (!seconds || !isFinite(seconds)) return '';
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m % 60)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
};

const swrOptions = {
  revalidateOnFocus: false,
  refreshWhenHidden: false,
  refreshWhenOffline: false,
};

const toParams = (query: MediaQuery, page: number, type?: 'image' | 'video') => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(MEDIA_PAGE_SIZE),
    sort: query.sort.startsWith('name') ? 'name' : 'date',
    order:
      query.sort === 'oldest' || query.sort === 'name-asc' ? 'asc' : 'desc',
  });
  if (query.search.trim()) params.set('search', query.search.trim());
  if (query.folderId) params.set('folderId', query.folderId);
  // a picker that only takes videos (or images) never lists the rest
  const kind = type || (query.type !== 'all' ? query.type : undefined);
  if (kind) params.set('type', kind);
  if (query.usage !== 'all') params.set('usage', query.usage);
  return params.toString();
};

// GET /media, page after page as the grid scrolls
export const useMediaPages = (query: MediaQuery, type?: 'image' | 'video') => {
  const fetch = useFetch();
  const getKey = useCallback(
    (index: number, previous: { pages: number } | null) => {
      if (previous && index >= previous.pages) return null;
      return `media-library?${toParams(query, index + 1, type)}`;
    },
    [query, type]
  );
  const load = useCallback(
    async (key: string) =>
      (await fetch(`/media?${key.split('?')[1]}`)).json() as Promise<{
        pages: number;
        results: LibraryMedia[];
      }>,
    []
  );
  const swr = useSWRInfinite(getKey, load, {
    ...swrOptions,
    revalidateFirstPage: false,
  });
  const media = useMemo(
    () => (swr.data || []).flatMap((p) => p?.results || []),
    [swr.data]
  );
  const pages = swr.data?.[0]?.pages || 0;
  return {
    ...swr,
    media,
    hasMore: swr.size < pages,
    loadingMore:
      swr.isValidating && !!swr.data && swr.data.length < swr.size,
  };
};

export const useMediaFolders = () => {
  const fetch = useFetch();
  const load = useCallback(
    async () => (await fetch('/media/folders')).json() as Promise<LibraryFolder[]>,
    []
  );
  return useSWR('media-library-folders', load, swrOptions);
};

export const useMediaUsage = (id?: string) => {
  const fetch = useFetch();
  const load = useCallback(
    async () => (await fetch(`/media/${id}/usage`)).json() as Promise<MediaUsage[]>,
    [id]
  );
  return useSWR(id ? `media-library-usage-${id}` : null, load, swrOptions);
};

// Older media have no stored size: the file's own Content-Length stands in
export const useMediaSize = (media?: Pick<LibraryMedia, 'path' | 'fileSize'>) => {
  const load = useCallback(async () => {
    const res = await window.fetch(media!.path, { method: 'HEAD' });
    return Number(res.headers.get('content-length')) || 0;
  }, [media?.path]);
  const { data } = useSWR(
    media && !media.fileSize ? `media-library-size-${media.path}` : null,
    load,
    { ...swrOptions, shouldRetryOnError: false }
  );
  return media?.fileSize || data || 0;
};

const json = (body: unknown) => ({
  method: 'POST',
  body: JSON.stringify(body),
});

export const useMediaActions = () => {
  const fetch = useFetch();

  const ok = async (res: Response) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        Array.isArray(body?.message) ? body.message[0] : body?.message || ''
      );
    }
    return res.json().catch(() => ({}));
  };

  return useMemo(
    () => ({
      createFolder: async (name: string, parentId?: string | null) =>
        ok(
          await fetch('/media/folders', json({ name, parentId: parentId || undefined }))
        ) as Promise<{ id: string; name: string; parentId: string | null }>,
      renameFolder: async (id: string, name: string) =>
        ok(
          await fetch(`/media/folders/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name }),
          })
        ),
      moveFolder: async (id: string, parentId: string | null) =>
        ok(
          await fetch(`/media/folders/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ parentId }),
          })
        ),
      deleteFolder: async (id: string) =>
        ok(await fetch(`/media/folders/${id}`, { method: 'DELETE' })),
      moveMedia: async (ids: string[], folderId: string | null) =>
        ok(await fetch('/media/move', json({ ids, folderId }))),
      renameMedia: async (id: string, name: string) =>
        ok(
          await fetch(`/media/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name }),
          })
        ),
      deleteMedia: async (ids: string[]) =>
        Promise.all(
          ids.map(async (id) =>
            ok(await fetch(`/media/${id}`, { method: 'DELETE' }))
          )
        ),
      // the composer's media settings save alt text the same way
      saveAlt: async (id: string, alt: string) =>
        ok(await fetch('/media/information', json({ id, alt }))),
    }),
    []
  );
};

// Saves a media under its own name; cross-origin files the browser won't
// hand over as a blob open in a new tab instead
export const downloadMedia = async (
  media: Pick<LibraryMedia, 'path' | 'originalName' | 'name'>
) => {
  try {
    const res = await window.fetch(media.path);
    if (!res.ok) throw new Error();
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = mediaName(media);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    window.open(media.path, '_blank', 'noopener');
  }
};
