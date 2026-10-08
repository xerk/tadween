'use client';

import React, {
  FC,
  MouseEvent,
  ReactNode,
  useCallback,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Icon, Popover } from '@gitroom/frontend/components/tadween/ui';
import {
  formatBytes,
  formatDuration,
  LibraryFolder,
  LibraryMedia,
  mediaKind,
  mediaName,
  useMediaSize,
} from '@gitroom/frontend/components/tadween/media/media.hooks';
import {
  DRAG_FOLDER,
  DRAG_MEDIA,
  FolderDrop,
  useDropTarget,
} from '@gitroom/frontend/components/tadween/media/media.folders';

// Tiles (grid) and rows (list) for media and folders. Dimensions and video
// length aren't stored, so they're read from the loaded preview and kept here
// for the list's columns and the details panel.

export interface MediaMeta {
  width?: number;
  height?: number;
  duration?: number;
}

const metaCache = new Map<string, MediaMeta>();
export const getMediaMeta = (path: string) => metaCache.get(path);

export const MediaThumb: FC<{
  media: LibraryMedia;
  onMeta?: (meta: MediaMeta) => void;
  className?: string;
}> = ({ media, onMeta, className }) => {
  const kind = mediaKind(media.path);
  const save = (meta: MediaMeta) => {
    metaCache.set(media.path, { ...metaCache.get(media.path), ...meta });
    onMeta?.(metaCache.get(media.path)!);
  };
  if (kind === 'video') {
    return (
      <video
        className={clsx('tdw-media-thumb', className)}
        src={`${media.path}#t=0.1`}
        poster={media.thumbnail || undefined}
        preload="metadata"
        muted
        playsInline
        onLoadedMetadata={(e) =>
          save({
            width: e.currentTarget.videoWidth,
            height: e.currentTarget.videoHeight,
            duration: e.currentTarget.duration,
          })
        }
      />
    );
  }
  if (kind === 'file') {
    return (
      <span className={clsx('tdw-media-thumb is-file', className)}>
        <Icon name="file" size={28} />
      </span>
    );
  }
  return (
    <img
      className={clsx('tdw-media-thumb', className)}
      src={media.path}
      alt={media.alt || ''}
      loading="lazy"
      draggable={false}
      onLoad={(e) =>
        save({
          width: e.currentTarget.naturalWidth,
          height: e.currentTarget.naturalHeight,
        })
      }
    />
  );
};

export interface ItemHandlers {
  onClick: (e: MouseEvent) => void;
  onDoubleClick?: () => void;
  onToggle: () => void;
  onPreview?: () => void;
}

const dragMedia = (ids: string[]) => (e: React.DragEvent) => {
  e.dataTransfer.setData(DRAG_MEDIA, JSON.stringify(ids));
  e.dataTransfer.effectAllowed = 'move';
  const ghost = document.createElement('div');
  ghost.className = 'tdw-media-drag-ghost';
  ghost.textContent = String(ids.length);
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, 16, 16);
  setTimeout(() => ghost.remove(), 0);
};

const Badges: FC<{ media: LibraryMedia; meta?: MediaMeta }> = ({
  media,
  meta,
}) => {
  const kind = mediaKind(media.path);
  return (
    <>
      {kind === 'gif' && <span className="tdw-media-badge">GIF</span>}
      {kind === 'video' && (
        <span className="tdw-media-badge is-video">
          <Icon name="play" size={10} />
          {formatDuration(meta?.duration)}
        </span>
      )}
    </>
  );
};

export const MediaTile: FC<
  ItemHandlers & {
    media: LibraryMedia;
    selected: boolean;
    order?: number;
    focused: boolean;
    dragIds?: string[];
    picker?: boolean;
  }
> = ({
  media,
  selected,
  order,
  focused,
  dragIds,
  picker,
  onClick,
  onDoubleClick,
  onToggle,
  onPreview,
}) => {
  const t = useT();
  const [meta, setMeta] = useState<MediaMeta | undefined>(
    getMediaMeta(media.path)
  );
  const name = mediaName(media);
  return (
    <div
      role="option"
      aria-selected={selected}
      aria-label={name}
      tabIndex={focused ? 0 : -1}
      data-media-id={media.id}
      className={clsx(
        'tdw-media-tile',
        selected && 'is-selected',
        focused && 'is-focused'
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      draggable={!!dragIds}
      onDragStart={dragIds ? dragMedia(dragIds) : undefined}
    >
      <div className="tdw-media-tile-frame">
        <MediaThumb media={media} onMeta={setMeta} />
        <Badges media={media} meta={meta} />
        <button
          type="button"
          className="tdw-media-check"
          aria-label={
            selected
              ? t('tdw_media_deselect', 'Deselect {{name}}', { name })
              : t('tdw_media_select', 'Select {{name}}', { name })
          }
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          {order ? (
            <span className="tdw-media-check-num">{order}</span>
          ) : (
            <Icon name="check" size={12} />
          )}
        </button>
        {onPreview && (
          <button
            type="button"
            className="tdw-media-expand"
            aria-label={t('tdw_media_preview', 'Preview')}
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
          >
            <Icon name="maximize-2" size={14} />
          </button>
        )}
      </div>
      <div className="tdw-media-tile-name" title={name} dir="auto">
        {name}
      </div>
      {!picker && !!media.usedIn && (
        <div className="tdw-media-tile-meta">
          {t('tdw_media_used_in_count', 'In {{count}} posts', {
            count: media.usedIn,
          })}
        </div>
      )}
    </div>
  );
};

// the ⋯ menu of a folder
export interface MenuAction {
  key: string;
  label: string;
  icon: string;
  onClick: () => void;
  danger?: boolean;
}

export const ItemMenu: FC<{ actions: MenuAction[]; label: string }> = ({
  actions,
  label,
}) => {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  if (!actions.length) return null;
  return (
    <span className="tdw-media-menu" onClick={(e) => e.stopPropagation()}>
      <button
        ref={anchor}
        type="button"
        className="pz-iconbtn pz-btn-ghost pz-iconbtn-sm"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <Icon name="ellipsis" size={14} />
      </button>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchor={anchor as React.RefObject<HTMLElement>}
        align="end"
        width={200}
      >
        <div role="menu">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              role="menuitem"
              className={clsx('pz-menu-item', action.danger && 'is-danger')}
              onClick={() => {
                setOpen(false);
                action.onClick();
              }}
            >
              <Icon name={action.icon} />
              {action.label}
            </button>
          ))}
        </div>
      </Popover>
    </span>
  );
};

export const FolderTile: FC<{
  folder: LibraryFolder;
  onOpen: () => void;
  actions: MenuAction[];
  drop?: FolderDrop;
  list?: boolean;
  extra?: ReactNode;
  // files and subfolders inside
  count: number;
}> = ({ folder, onOpen, actions, drop, list, extra, count }) => {
  const t = useT();
  const { over, props } = useDropTarget(folder.id, drop);
  return (
    <div
      role="option"
      aria-selected={false}
      tabIndex={0}
      className={clsx(
        list ? 'tdw-media-row is-folder' : 'tdw-media-folder',
        over && 'is-over'
      )}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen();
      }}
      draggable={!!drop}
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_FOLDER, folder.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      {...props}
    >
      <span className="tdw-media-folder-icon" aria-hidden="true">
        <Icon name="folder" size={list ? 18 : 20} />
      </span>
      {list ? (
        <>
          <span
            className="tdw-media-folder-name"
            title={folder.name}
            dir="auto"
          >
            {folder.name}
          </span>
          {extra}
        </>
      ) : (
        <span className="tdw-media-folder-text">
          <span
            className="tdw-media-folder-name"
            title={folder.name}
            dir="auto"
          >
            {folder.name}
          </span>
          <span className="tdw-media-folder-count">
            {t('tdw_media_items_count', '{{count}} items', {
              count,
            })}
          </span>
        </span>
      )}
      <ItemMenu
        actions={actions}
        label={t('tdw_media_folder_actions', 'Actions for {{name}}', {
          name: folder.name,
        })}
      />
    </div>
  );
};

// in the app's language, with Latin digits for Arabic like the Today page
export const useFormatDate = () => {
  const { i18n } = useTranslation();
  return useCallback(
    (date: string) => {
      const lang = (i18n.resolvedLanguage || 'en').replace('_', '-');
      try {
        return new Intl.DateTimeFormat(
          lang === 'ar' ? 'ar-EG-u-nu-latn' : lang,
          { dateStyle: 'medium' }
        ).format(new Date(date));
      } catch (err) {
        return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
          new Date(date)
        );
      }
    },
    [i18n.resolvedLanguage]
  );
};

export const kindLabel = (t: ReturnType<typeof useT>, path: string) => {
  switch (mediaKind(path)) {
    case 'video':
      return t('tdw_media_kind_video', 'Video');
    case 'gif':
      return t('tdw_media_kind_gif', 'GIF');
    case 'image':
      return t('tdw_media_kind_image', 'Image');
    default:
      return t('tdw_media_kind_file', 'File');
  }
};

export const MediaRow: FC<
  ItemHandlers & {
    media: LibraryMedia;
    selected: boolean;
    order?: number;
    focused: boolean;
    dragIds?: string[];
    picker?: boolean;
  }
> = ({
  media,
  selected,
  order,
  focused,
  dragIds,
  picker,
  onClick,
  onDoubleClick,
  onToggle,
}) => {
  const t = useT();
  const [meta, setMeta] = useState<MediaMeta | undefined>(
    getMediaMeta(media.path)
  );
  const size = useMediaSize(media);
  const formatDate = useFormatDate();
  const name = mediaName(media);
  return (
    <div
      role="option"
      aria-selected={selected}
      aria-label={name}
      tabIndex={focused ? 0 : -1}
      data-media-id={media.id}
      className={clsx(
        'tdw-media-row',
        selected && 'is-selected',
        focused && 'is-focused'
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      draggable={!!dragIds}
      onDragStart={dragIds ? dragMedia(dragIds) : undefined}
    >
      <button
        type="button"
        className="tdw-media-check"
        aria-label={
          selected
            ? t('tdw_media_deselect', 'Deselect {{name}}', { name })
            : t('tdw_media_select', 'Select {{name}}', { name })
        }
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        {order ? (
          <span className="tdw-media-check-num">{order}</span>
        ) : (
          <Icon name="check" size={12} />
        )}
      </button>
      <span className="tdw-media-row-thumb">
        <MediaThumb media={media} onMeta={setMeta} />
      </span>
      <span className="tdw-media-row-name">
        <span className="tdw-media-row-title" title={name} dir="auto">
          {name}
        </span>
        <span className="tdw-media-row-sub">
          {kindLabel(t, media.path)} · <bdi>{formatDate(media.createdAt)}</bdi>
        </span>
      </span>
      <span className="tdw-media-col is-type">{kindLabel(t, media.path)}</span>
      <span className="tdw-media-col is-size">
        <bdi>{formatBytes(size) || '—'}</bdi>
      </span>
      <span className="tdw-media-col is-dims">
        <bdi>
          {meta?.width ? `${meta.width} × ${meta.height}` : '—'}
          {meta?.duration ? ` · ${formatDuration(meta.duration)}` : ''}
        </bdi>
      </span>
      <span className="tdw-media-col is-date">
        {formatDate(media.createdAt)}
      </span>
      {!picker && (
        <span className="tdw-media-col is-used">
          {media.usedIn
            ? t('tdw_media_used_in_count', 'In {{count}} posts', {
                count: media.usedIn,
              })
            : t('tdw_media_unused', 'Unused')}
        </span>
      )}
    </div>
  );
};
