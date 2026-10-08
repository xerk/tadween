'use client';

import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useUppyUploader } from '@gitroom/frontend/components/media/new.uploader';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { Icon, IconButton } from '@gitroom/frontend/components/tadween/ui';
import {
  formatBytes,
  useMediaActions,
} from '@gitroom/frontend/components/tadween/media/media.hooks';

// The upload dock: files dropped, pasted or picked anywhere in the library go
// through Postiz's own uploader (useUppyUploader: same endpoints, storage,
// compression and processing), one batch at a time, and land in the folder
// that was open when they were added. Each file keeps its own row with
// progress, cancel and retry, like Drive's upload panel.

export type UploadStatus =
  | 'queued'
  | 'uploading'
  | 'processing'
  | 'done'
  | 'error'
  | 'canceled';

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  status: UploadStatus;
  progress: number;
  error?: string;
  file: File;
  folderId: string | null;
  preview?: string;
}

// a file with the folders it sat in, relative to what was dropped / picked
export interface UploadEntry {
  file: File;
  dir?: string;
}

// Postiz uploads one session of up to 1 GB at a time (MediaBox's limit)
const MAX_BATCH_SIZE = 1024 * 1024 * 1024;
// no more files than the uploaders send at once (XHR 5, S3 6): a file that is
// removed while it still waits in Uppy's queue never settles its batch
const MAX_BATCH_FILES = 5;
const MAX_IMAGE_SIZE = 30 * 1024 * 1024;
const MAX_VIDEO_SIZE = 1000 * 1024 * 1024;
const IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
];

let counter = 0;
const nextId = () => `upload-${Date.now()}-${counter++}`;

const isActive = (status: UploadStatus) =>
  status === 'queued' || status === 'uploading' || status === 'processing';

export const useMediaUploads = (props: {
  type?: 'image' | 'video';
  onUploaded: (media: any[]) => void;
  onFoldersCreated?: () => void;
}) => {
  const t = useT();
  const { mediaProcessing, transloadit } = useVariables();
  const actions = useMediaActions();
  const setLocked = useLaunchStore((state) => state.setLocked);
  const [items, setItems] = useState<UploadItem[]>([]);
  const itemsRef = useRef<UploadItem[]>([]);
  const batch = useRef<{ ids: string[]; folderId: string | null } | null>(null);
  const uppyIds = useRef(new Map<string, string>());
  // media already moved into their folder as each file finished
  const moves = useRef(new Map<string, Promise<unknown>>());
  const propsRef = useRef(props);
  propsRef.current = props;

  const update = useCallback((fn: (list: UploadItem[]) => UploadItem[]) => {
    itemsRef.current = fn(itemsRef.current);
    setItems(itemsRef.current);
  }, []);
  const patch = useCallback(
    (id: string, values: Partial<UploadItem>) =>
      update((list) =>
        list.map((p) => (p.id === id ? { ...p, ...values } : p))
      ),
    [update]
  );

  const uppy = useUppyUploader({
    allowedFileTypes:
      props.type === 'image'
        ? 'image/*'
        : props.type === 'video'
        ? 'video/mp4'
        : 'image/*,video/mp4',
    // the uploader keeps the callbacks it was created with, so they read refs
    onUploadSuccess: async (saved: any[]) => {
      const folderId = batch.current?.folderId || null;
      const media = (saved || []).filter((p) => p?.id);
      // Transloadit only hands the saved media over here, at the end
      const rest = media.filter((p) => !moves.current.has(p.id));
      if (folderId && rest.length) {
        moves.current.set(
          rest[0].id,
          actions.moveMedia(
            rest.map((p) => p.id),
            folderId
          )
        );
      }
      // the files are uploaded either way; a failed move leaves them at the top
      await Promise.allSettled(Array.from(moves.current.values()));
      moves.current.clear();
      propsRef.current.onUploaded(media);
    },
    onStart: () => {},
    onEnd: () => {},
  });

  // the same checks the uploader's pre-processors make, done per file up
  // front so one wrong file fails alone instead of the whole batch
  const validate = useCallback(
    (file: File) => {
      const isImage = IMAGE_TYPES.includes(file.type);
      const videoTypes = [
        'video/mp4',
        ...(mediaProcessing || transloadit?.length ? ['video/quicktime'] : []),
      ];
      const isVideo = videoTypes.includes(file.type);
      if (
        (!isImage && !isVideo) ||
        (props.type === 'image' && !isImage) ||
        (props.type === 'video' && !isVideo)
      ) {
        return t(
          'tdw_media_type_not_allowed',
          'This file type is not supported'
        );
      }
      if (isImage && file.size > MAX_IMAGE_SIZE) {
        return t('tdw_media_image_too_large', 'Images can be up to 30 MB');
      }
      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        return t('tdw_media_video_too_large', 'Videos can be up to 1 GB');
      }
      return '';
    },
    [mediaProcessing, transloadit, props.type, t]
  );

  const startNextRef = useRef<() => void>(() => {});
  const finishBatch = useCallback(() => {
    batch.current = null;
    setTimeout(() => startNextRef.current(), 0);
  }, []);

  const startNext = useCallback(() => {
    if (batch.current) return;
    const queued = itemsRef.current.filter((p) => p.status === 'queued');
    if (!queued.length) return;
    const folderId = queued[0].folderId;
    let total = 0;
    let count = 0;
    const take = queued.filter((p) => {
      if (p.folderId !== folderId || count >= MAX_BATCH_FILES) return false;
      if (total && total + p.size > MAX_BATCH_SIZE) return false;
      count++;
      total += p.size;
      return true;
    });
    batch.current = { ids: take.map((p) => p.id), folderId };
    update((list) =>
      list.map((p) =>
        take.some((x) => x.id === p.id)
          ? { ...p, status: 'uploading', progress: 0, error: undefined }
          : p
      )
    );
    let added = 0;
    for (const item of take) {
      try {
        const uppyId = uppy.addFile({
          name: item.name,
          type: item.file.type,
          data: item.file,
          meta: { tdwUploadId: item.id },
        });
        uppyIds.current.set(item.id, uppyId);
        added++;
      } catch (err: any) {
        patch(item.id, {
          status: 'error',
          error: err?.message || t('tdw_media_upload_failed', 'Upload failed'),
        });
      }
    }
    if (!added) {
      finishBatch();
    }
  }, [uppy, update, patch, finishBatch, t]);
  startNextRef.current = startNext;

  useEffect(() => {
    const idOf = (file: any) => file?.meta?.tdwUploadId as string | undefined;
    const onProgress = (file: any, progress: any) => {
      const id = idOf(file);
      if (!id || !progress?.bytesTotal) return;
      patch(id, { progress: progress.bytesUploaded / progress.bytesTotal });
    };
    const onSuccess = (file: any, response: any) => {
      const id = idOf(file);
      if (id) patch(id, { status: 'done', progress: 1 });
      // into the open folder as soon as the file is saved (local / R2)
      const media = response?.body?.saved || response?.body;
      const folderId = batch.current?.folderId;
      if (folderId && media?.id && !moves.current.has(media.id)) {
        moves.current.set(media.id, actions.moveMedia([media.id], folderId));
      }
    };
    const onProcessing = (file: any) => {
      const id = idOf(file);
      if (id) patch(id, { status: 'processing', progress: 1 });
    };
    const onProcessed = (file: any) => {
      const id = idOf(file);
      if (id && !file?.error) patch(id, { status: 'done' });
    };
    const onFileError = (file: any, error: any) => {
      const id = idOf(file);
      if (id)
        patch(id, {
          status: 'error',
          error:
            error?.message || t('tdw_media_upload_failed', 'Upload failed'),
        });
    };
    // whatever the batch didn't finish failed with it
    const endBatch = () => {
      const ids = batch.current?.ids || [];
      update((list) =>
        list.map((p) =>
          ids.includes(p.id) &&
          (p.status === 'uploading' || p.status === 'processing')
            ? {
                ...p,
                status: p.progress >= 1 ? 'done' : 'error',
                error:
                  p.progress >= 1
                    ? undefined
                    : t('tdw_media_upload_failed', 'Upload failed'),
              }
            : p
        )
      );
      finishBatch();
    };
    uppy.on('upload-progress', onProgress);
    uppy.on('upload-success', onSuccess);
    uppy.on('postprocess-progress', onProcessing);
    uppy.on('postprocess-complete', onProcessed);
    uppy.on('upload-error', onFileError);
    // like the uploader: a single file failing leaves the batch running
    const onError = () => {
      if (!Object.keys(uppy.getState().currentUploads).length) endBatch();
    };
    uppy.on('complete', endBatch);
    uppy.on('error', onError);
    return () => {
      uppy.off('upload-progress', onProgress);
      uppy.off('upload-success', onSuccess);
      uppy.off('postprocess-progress', onProcessing);
      uppy.off('postprocess-complete', onProcessed);
      uppy.off('upload-error', onFileError);
      uppy.off('complete', endBatch);
      uppy.off('error', onError);
    };
  }, [uppy, patch, update, finishBatch, actions, t]);

  // previews are object URLs, released with their rows
  useEffect(
    () => () => {
      itemsRef.current.forEach(
        (p) => p.preview && URL.revokeObjectURL(p.preview)
      );
    },
    []
  );

  // folders that came with the files are recreated under the open folder
  const resolveFolders = useCallback(
    async (entries: UploadEntry[], folderId: string | null) => {
      const ids = new Map<string, string | null>([['', folderId]]);
      const dirs = Array.from(
        new Set(entries.map((p) => (p.dir || '').replace(/^\/+|\/+$/g, '')))
      ).sort();
      let created = false;
      for (const dir of dirs) {
        const parts = dir ? dir.split('/') : [];
        for (let i = 1; i <= parts.length; i++) {
          const key = parts.slice(0, i).join('/');
          if (ids.has(key)) continue;
          const parent = ids.get(parts.slice(0, i - 1).join('/')) || null;
          const folder = await actions.createFolder(parts[i - 1], parent);
          ids.set(key, folder.id);
          created = true;
        }
      }
      if (created) propsRef.current.onFoldersCreated?.();
      return ids;
    },
    [actions]
  );

  const add = useCallback(
    async (entries: UploadEntry[], folderId: string | null) => {
      if (!entries.length) return;
      let folders = new Map<string, string | null>([['', folderId]]);
      try {
        folders = await resolveFolders(entries, folderId);
      } catch (err) {
        // the files still upload, into the open folder
      }
      const added: UploadItem[] = entries.map(({ file, dir }) => {
        const error = validate(file);
        return {
          id: nextId(),
          name: file.name,
          size: file.size,
          status: error ? 'error' : 'queued',
          progress: 0,
          error: error || undefined,
          file,
          folderId:
            folders.get((dir || '').replace(/^\/+|\/+$/g, '')) ?? folderId,
          preview: file.type.startsWith('image/')
            ? URL.createObjectURL(file)
            : undefined,
        };
      });
      update((list) => [...list, ...added]);
      startNext();
    },
    [resolveFolders, validate, update, startNext]
  );

  const cancel = useCallback(
    (id: string) => {
      const item = itemsRef.current.find((p) => p.id === id);
      if (!item || !isActive(item.status)) return;
      patch(id, { status: 'canceled' });
      const uppyId = uppyIds.current.get(id);
      if (item.status !== 'queued' && uppyId && uppy.getFile(uppyId)) {
        uppy.removeFile(uppyId);
      }
      // the last running file of a batch: nothing will report its end
      const left = (batch.current?.ids || []).filter((x) =>
        itemsRef.current.some(
          (p) =>
            p.id === x &&
            (p.status === 'uploading' || p.status === 'processing')
        )
      );
      if (batch.current?.ids.includes(id) && !left.length) {
        // the rest is done: Uppy reports the end itself, unless the removed
        // file was still waiting, then the batch is closed here
        const current = batch.current;
        setTimeout(() => {
          if (batch.current !== current) return;
          uppy.cancelAll();
          setLocked(false);
          finishBatch();
          Promise.allSettled(Array.from(moves.current.values())).then(() => {
            moves.current.clear();
            propsRef.current.onUploaded([]);
          });
        }, 4000);
      }
    },
    [uppy, patch, setLocked, finishBatch]
  );

  const retry = useCallback(
    (id: string) => {
      patch(id, { status: 'queued', progress: 0, error: undefined });
      startNext();
    },
    [patch, startNext]
  );

  const cancelAll = useCallback(() => {
    itemsRef.current
      .filter((p) => isActive(p.status))
      .forEach((p) => cancel(p.id));
  }, [cancel]);

  const clear = useCallback(() => {
    update((list) => {
      list
        .filter((p) => !isActive(p.status))
        .forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
      return list.filter((p) => isActive(p.status));
    });
  }, [update]);

  const active = items.some((p) => isActive(p.status));
  return { items, add, cancel, retry, cancelAll, clear, active };
};

const statusIcon: Record<UploadStatus, string> = {
  queued: 'clock',
  uploading: 'loader-circle',
  processing: 'loader-circle',
  done: 'circle-check',
  error: 'circle-x',
  canceled: 'circle-x',
};

export const UploadDock: FC<{
  items: UploadItem[];
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onCancelAll: () => void;
  onClose: () => void;
  // inside the picker it sits in the browser instead of the page corner
  contained?: boolean;
}> = ({ items, onCancel, onRetry, onCancelAll, onClose, contained }) => {
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);
  // a dock that was closed opens expanded again with the next upload
  const shown = items.length > 0;
  useEffect(() => {
    if (!shown) setCollapsed(false);
  }, [shown]);
  const counts = useMemo(() => {
    const done = items.filter((p) => p.status === 'done').length;
    const failed = items.filter((p) => p.status === 'error').length;
    const active = items.filter((p) => isActive(p.status)).length;
    const bytes = items
      .filter((p) => p.status !== 'canceled' && p.status !== 'error')
      .reduce(
        (acc, p) => ({
          total: acc.total + p.size,
          sent: acc.sent + p.size * Math.min(1, p.progress),
        }),
        { total: 0, sent: 0 }
      );
    return {
      done,
      failed,
      active,
      progress: bytes.total ? bytes.sent / bytes.total : 0,
    };
  }, [items]);

  if (!items.length) return null;

  const title = counts.active
    ? t('tdw_media_uploading_count', 'Uploading {{count}} files', {
        count: counts.active,
      })
    : counts.failed
    ? t(
        'tdw_media_upload_failed_count',
        '{{failed}} failed, {{done}} uploaded',
        {
          failed: counts.failed,
          done: counts.done,
        }
      )
    : t('tdw_media_upload_all_done', 'All done, {{count}} uploaded', {
        count: counts.done,
      });

  return (
    <section
      className={clsx(
        'tdw-media-dock',
        contained && 'is-contained',
        collapsed && 'is-collapsed'
      )}
      aria-label={t('tdw_media_uploads', 'Uploads')}
    >
      <header className="tdw-media-dock-head">
        <span
          className={clsx(
            'tdw-media-dock-state',
            counts.active
              ? 'is-active'
              : counts.failed
              ? 'is-failed'
              : 'is-done'
          )}
          aria-hidden="true"
        >
          <Icon
            name={
              counts.active
                ? 'loader-circle'
                : counts.failed
                ? 'triangle-alert'
                : 'circle-check'
            }
            size={16}
          />
        </span>
        <button
          type="button"
          className="tdw-media-dock-title"
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
        >
          <span role="status" aria-live="polite">
            {title}
          </span>
        </button>
        <IconButton
          icon={collapsed ? 'chevron-up' : 'chevron-down'}
          label={
            collapsed
              ? t('tdw_media_expand', 'Expand')
              : t('tdw_media_collapse', 'Collapse')
          }
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
        />
        {counts.active ? (
          <IconButton
            icon="x"
            label={t('tdw_media_cancel_all', 'Cancel all uploads')}
            size="sm"
            onClick={onCancelAll}
          />
        ) : (
          <IconButton
            icon="x"
            label={t('tdw_media_close', 'Close')}
            size="sm"
            onClick={onClose}
          />
        )}
      </header>
      {!!counts.active && (
        <span className="pz-progress tdw-media-dock-total" aria-hidden="true">
          <span style={{ width: `${Math.round(counts.progress * 100)}%` }} />
        </span>
      )}
      <ul className="tdw-media-dock-list">
        {items.map((item) => (
          <li
            key={item.id}
            className={clsx('tdw-media-dock-row', `is-${item.status}`)}
          >
            <span className="tdw-media-dock-thumb" aria-hidden="true">
              {item.preview ? (
                <img src={item.preview} alt="" />
              ) : (
                <Icon
                  name={
                    item.file.type.startsWith('video/') ? 'play' : 'file-text'
                  }
                  size={14}
                />
              )}
            </span>
            <span className="tdw-media-dock-info">
              <span
                className="tdw-media-dock-name"
                title={item.name}
                dir="auto"
              >
                {item.name}
              </span>
              <span className="tdw-media-dock-meta">
                {item.status === 'error' ? (
                  item.error
                ) : item.status === 'canceled' ? (
                  t('tdw_media_upload_canceled', 'Canceled')
                ) : item.status === 'queued' ? (
                  t('tdw_media_upload_waiting', 'Waiting')
                ) : item.status === 'processing' ? (
                  t('tdw_media_upload_processing', 'Processing')
                ) : item.status === 'done' ? (
                  <bdi>{formatBytes(item.size)}</bdi>
                ) : (
                  <bdi>{`${
                    formatBytes(item.size * item.progress) || '0 B'
                  } / ${formatBytes(item.size)}`}</bdi>
                )}
              </span>
              {item.status === 'uploading' && (
                <span className="pz-progress" aria-hidden="true">
                  <span
                    style={{ width: `${Math.round(item.progress * 100)}%` }}
                  />
                </span>
              )}
            </span>
            {isActive(item.status) ? (
              <IconButton
                icon="x"
                size="sm"
                label={t('tdw_media_cancel_upload', 'Cancel {{name}}', {
                  name: item.name,
                })}
                onClick={() => onCancel(item.id)}
              />
            ) : item.status === 'error' || item.status === 'canceled' ? (
              <IconButton
                icon="refresh-cw"
                size="sm"
                label={t('tdw_media_retry_upload', 'Retry {{name}}', {
                  name: item.name,
                })}
                onClick={() => onRetry(item.id)}
              />
            ) : (
              <span
                className={clsx('tdw-media-dock-status', `is-${item.status}`)}
                aria-label={t('tdw_media_upload_done', 'Uploaded')}
              >
                <Icon name={statusIcon[item.status]} size={16} />
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};
