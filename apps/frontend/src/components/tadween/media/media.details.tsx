'use client';

import React, { FC, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  Avatar,
  Button,
  Icon,
  IconButton,
  Skeleton,
  usePresence,
} from '@gitroom/frontend/components/tadween/ui';
import {
  formatBytes,
  formatDuration,
  LibraryMedia,
  mediaKind,
  mediaName,
  MediaUsage,
  useMediaSize,
  useMediaUsage,
} from '@gitroom/frontend/components/tadween/media/media.hooks';
import {
  useFormatDate,
  getMediaMeta,
  kindLabel,
  MediaMeta,
  MediaThumb,
} from '@gitroom/frontend/components/tadween/media/media.items';

// The details panel (a side panel on desktop, a bottom sheet on phones) and
// the lightbox. Rename edits the media's display name (originalName); alt text
// is saved through /media/information like the composer's media settings.

export interface DetailsActions {
  onRename: (name: string) => Promise<void>;
  onSaveAlt: (alt: string) => Promise<void>;
  onPreview: () => void;
  onDownload: () => void;
  onMove: () => void;
  onDelete: () => void;
  onOpenPost?: (group: string) => void;
}

const stateLabel = (t: ReturnType<typeof useT>, state: MediaUsage['state']) => {
  switch (state) {
    case 'PUBLISHED':
      return t('tdw_media_post_published', 'Published');
    case 'ERROR':
      return t('tdw_media_post_failed', 'Failed');
    case 'DRAFT':
      return t('tdw_media_post_draft', 'Draft');
    default:
      return t('tdw_media_post_scheduled', 'Scheduled');
  }
};

const stateClass: Record<MediaUsage['state'], string> = {
  PUBLISHED: 'pz-status-published',
  ERROR: 'pz-status-failed',
  DRAFT: 'pz-status-draft',
  QUEUE: 'pz-status-scheduled',
};

const InlineName: FC<{
  value: string;
  onSave: (name: string) => Promise<void>;
}> = ({ value, onSave }) => {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(value);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setName(value);
    setEditing(false);
  }, [value]);

  // Enter submits and the blur that follows must not save a second time
  const saving = useRef(false);
  const save = async () => {
    if (saving.current) return;
    const next = name.trim();
    if (!next || next === value) {
      setEditing(false);
      setName(value);
      return;
    }
    saving.current = true;
    setBusy(true);
    try {
      await onSave(next);
      setEditing(false);
    } catch (err) {
      // the library already showed the error; the field stays open to retry
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <div className="tdw-media-details-name">
        <h2 title={value} dir="auto">
          {value}
        </h2>
        <IconButton
          icon="pencil"
          size="sm"
          label={t('tdw_media_rename', 'Rename')}
          onClick={() => setEditing(true)}
        />
      </div>
    );
  }
  return (
    <form
      className="tdw-media-details-name is-editing"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <input
        className="pz-input"
        autoFocus
        value={name}
        maxLength={255}
        disabled={busy}
        aria-label={t('tdw_media_file_name', 'File name')}
        onChange={(e) => setName(e.target.value)}
        onFocus={(e) => {
          // select the name without its extension, like Finder
          const dot = e.target.value.lastIndexOf('.');
          e.target.setSelectionRange(0, dot > 0 ? dot : e.target.value.length);
        }}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            setName(value);
            setEditing(false);
          }
        }}
      />
    </form>
  );
};

const AltText: FC<{
  media: LibraryMedia;
  onSave: (alt: string) => Promise<void>;
}> = ({ media, onSave }) => {
  const t = useT();
  const [alt, setAlt] = useState(media.alt || '');
  const [busy, setBusy] = useState(false);
  useEffect(() => setAlt(media.alt || ''), [media.id, media.alt]);
  const dirty = alt !== (media.alt || '');
  return (
    <div className="tdw-media-details-alt">
      <label className="pz-label" htmlFor={`alt-${media.id}`}>
        {t('tdw_media_alt_text', 'Alt text')}
      </label>
      <textarea
        id={`alt-${media.id}`}
        className="pz-input pz-textarea"
        rows={2}
        value={alt}
        placeholder={t(
          'tdw_media_alt_placeholder',
          'Describe the image for people who use screen readers'
        )}
        onChange={(e) => setAlt(e.target.value)}
      />
      {dirty && (
        <div className="tdw-media-details-alt-actions">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAlt(media.alt || '')}
          >
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            size="sm"
            variant="primary"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onSave(alt);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t('save', 'Save')}
          </Button>
        </div>
      )}
    </div>
  );
};

const UsedIn: FC<{
  media: LibraryMedia;
  onOpenPost?: (group: string) => void;
}> = ({ media, onOpenPost }) => {
  const t = useT();
  const { data, isLoading } = useMediaUsage(media.id);
  const formatDate = useFormatDate();
  return (
    <section className="tdw-media-details-used">
      <h3>
        {isLoading || !data?.length
          ? t('tdw_media_used_in', 'Used in posts')
          : t('tdw_media_used_in_n', 'Used in {{count}} posts', {
              count: data?.length || 0,
            })}
      </h3>
      {isLoading && <Skeleton height={44} radius={10} />}
      {!isLoading && !data?.length && (
        <p className="tdw-media-details-muted">
          {t('tdw_media_not_used', 'No post uses this file yet.')}
        </p>
      )}
      <ul>
        {(data || []).map((usage) => (
          <li key={usage.group}>
            <button
              type="button"
              className="tdw-media-usage"
              disabled={!onOpenPost}
              onClick={() => onOpenPost?.(usage.group)}
            >
              <span className="tdw-media-usage-avatars" aria-hidden="true">
                {usage.integrations.slice(0, 3).map((integration) => (
                  <Avatar
                    key={integration.id}
                    name={integration.name}
                    src={integration.picture || undefined}
                    size={22}
                  />
                ))}
              </span>
              <span className="tdw-media-usage-text">
                <span className="tdw-media-usage-content">
                  {usage.content.trim() ||
                    t('tdw_media_post_no_text', 'Post without text')}
                </span>
                <span className="tdw-media-usage-meta">
                  <span className={clsx('pz-status', stateClass[usage.state])}>
                    {stateLabel(t, usage.state)}
                  </span>
                  {formatDate(usage.publishDate)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export const MediaDetails: FC<
  DetailsActions & {
    media: LibraryMedia;
    folderName: string;
  }
> = ({
  media,
  folderName,
  onRename,
  onSaveAlt,
  onPreview,
  onDownload,
  onMove,
  onDelete,
  onOpenPost,
}) => {
  const t = useT();
  const toaster = useToaster();
  const [meta, setMeta] = useState<MediaMeta | undefined>(
    getMediaMeta(media.path)
  );
  useEffect(() => setMeta(getMediaMeta(media.path)), [media.path]);
  const size = useMediaSize(media);
  const formatDate = useFormatDate();
  const kind = mediaKind(media.path);

  const facts: [string, string][] = [
    [t('tdw_media_type', 'Type'), kindLabel(t, media.path)],
    [t('tdw_media_size', 'Size'), formatBytes(size) || '—'],
    [
      t('tdw_media_dimensions', 'Dimensions'),
      meta?.width ? `${meta.width} × ${meta.height}` : '—',
    ],
    ...(kind === 'video'
      ? ([
          [
            t('tdw_media_duration', 'Duration'),
            formatDuration(meta?.duration) || '—',
          ],
        ] as [string, string][])
      : []),
    [t('tdw_media_uploaded', 'Uploaded'), formatDate(media.createdAt)],
    [t('tdw_media_location', 'Location'), folderName],
  ];

  return (
    <div className="tdw-media-details">
      <div className="tdw-media-details-preview">
        {kind === 'video' ? (
          <video
            key={media.id}
            src={media.path}
            controls
            playsInline
            preload="metadata"
            poster={media.thumbnail || undefined}
            onLoadedMetadata={(e) =>
              setMeta({
                width: e.currentTarget.videoWidth,
                height: e.currentTarget.videoHeight,
                duration: e.currentTarget.duration,
              })
            }
          />
        ) : (
          <button
            type="button"
            className="tdw-media-details-zoom"
            onClick={onPreview}
            aria-label={t('tdw_media_open_preview', 'Open preview')}
          >
            <MediaThumb media={media} onMeta={setMeta} />
            <span className="tdw-media-details-zoom-hint" aria-hidden="true">
              <Icon name="zoom-in" size={16} />
            </span>
          </button>
        )}
      </div>
      <InlineName value={mediaName(media)} onSave={onRename} />
      <div className="tdw-media-details-actions">
        <Button size="sm" icon="download" onClick={onDownload}>
          {t('tdw_media_download', 'Download')}
        </Button>
        <IconButton
          icon="link"
          variant="secondary"
          label={t('tdw_media_copy_link', 'Copy link')}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(media.path);
              toaster.show(
                t('tdw_media_link_copied', 'Link copied'),
                'success'
              );
            } catch (err) {
              toaster.show(
                t('tdw_media_link_not_copied', 'Could not copy the link'),
                'warning'
              );
            }
          }}
        />
        <IconButton
          icon="folder-input"
          variant="secondary"
          label={t('tdw_media_move', 'Move')}
          onClick={onMove}
        />
        <IconButton
          icon="trash-2"
          variant="secondary"
          className="is-danger"
          label={t('delete', 'Delete')}
          onClick={onDelete}
        />
      </div>
      <dl className="tdw-media-details-facts">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              <bdi>{value}</bdi>
            </dd>
          </div>
        ))}
      </dl>
      {kind !== 'file' && <AltText media={media} onSave={onSaveAlt} />}
      <UsedIn media={media} onOpenPost={onOpenPost} />
    </div>
  );
};

export const MediaLightbox: FC<{
  items: LibraryMedia[];
  index: number | null;
  onIndex: (index: number) => void;
  onClose: () => void;
  onDownload: (media: LibraryMedia) => void;
}> = ({ items, index, onIndex, onClose, onDownload }) => {
  const t = useT();
  const open = index !== null && !!items[index];
  const { mounted, state } = usePresence(open, 220);
  const [zoom, setZoom] = useState(false);
  const last = useRef<LibraryMedia | undefined>(undefined);
  if (open) last.current = items[index!];
  const media = last.current;

  useEffect(() => setZoom(false), [index]);

  useEffect(() => {
    if (!open) return;
    const rtl = document.documentElement.dir === 'rtl';
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        const forward = (e.key === 'ArrowRight') !== rtl;
        const next = index! + (forward ? 1 : -1);
        if (next >= 0 && next < items.length) onIndex(next);
      }
    };
    document.addEventListener('keydown', key, true);
    return () => document.removeEventListener('keydown', key, true);
  }, [open, index, items.length, onIndex, onClose]);

  if (!mounted || !media || typeof document === 'undefined') return null;
  const kind = mediaKind(media.path);

  return createPortal(
    <div className="tdw-ui">
      <div
        className="tdw-media-lightbox"
        data-state={state}
        role="dialog"
        aria-modal="true"
        aria-label={mediaName(media)}
      >
        <header className="tdw-media-lightbox-head">
          <span className="tdw-media-lightbox-title">{mediaName(media)}</span>
          <span className="tdw-media-lightbox-count">
            {(index ?? 0) + 1} / {items.length}
          </span>
          {kind !== 'video' && (
            <IconButton
              icon={zoom ? 'zoom-out' : 'zoom-in'}
              label={
                zoom
                  ? t('tdw_media_zoom_out', 'Zoom out')
                  : t('tdw_media_zoom_in', 'Zoom in')
              }
              onClick={() => setZoom(!zoom)}
            />
          )}
          <IconButton
            icon="download"
            label={t('tdw_media_download', 'Download')}
            onClick={() => onDownload(media)}
          />
          <IconButton
            icon="x"
            label={t('tdw_media_close', 'Close')}
            onClick={onClose}
          />
        </header>
        <div
          className={clsx('tdw-media-lightbox-stage', zoom && 'is-zoomed')}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {kind === 'video' ? (
            <video
              key={media.id}
              src={media.path}
              controls
              autoPlay
              playsInline
            />
          ) : (
            <img
              key={media.id}
              src={media.path}
              alt={media.alt || ''}
              onClick={() => setZoom(!zoom)}
            />
          )}
        </div>
        {index! > 0 && (
          <button
            type="button"
            className="tdw-media-lightbox-nav is-prev"
            aria-label={t('tdw_media_previous', 'Previous')}
            onClick={() => onIndex(index! - 1)}
          >
            <Icon name="chevron-left" size={22} />
          </button>
        )}
        {index! < items.length - 1 && (
          <button
            type="button"
            className="tdw-media-lightbox-nav is-next"
            aria-label={t('tdw_media_next', 'Next')}
            onClick={() => onIndex(index! + 1)}
          >
            <Icon name="chevron-right" size={22} />
          </button>
        )}
      </div>
    </div>,
    document.body
  );
};
