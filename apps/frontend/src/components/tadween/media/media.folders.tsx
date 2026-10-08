'use client';

import React, {
  DragEvent,
  FC,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  Button,
  Dialog,
  Icon,
  Input,
} from '@gitroom/frontend/components/tadween/ui';
import { LibraryFolder } from '@gitroom/frontend/components/tadween/media/media.hooks';

// Folders of the media library: breadcrumbs, the desktop tree, and the
// dialogs to name a folder and to move things into one. Media and folders are
// dragged with their own data types so a drop knows what it got.

export const DRAG_MEDIA = 'application/x-tdw-media';
export const DRAG_FOLDER = 'application/x-tdw-folder';

export type DropTarget = string | null;

export interface FolderDrop {
  onDropMedia: (ids: string[], folderId: DropTarget) => void;
  onDropFolder: (id: string, folderId: DropTarget) => void;
}

export const useFolderIndex = (folders: LibraryFolder[] = []) =>
  useMemo(() => {
    const byId = new Map(folders.map((p) => [p.id, p]));
    const children = new Map<string | null, LibraryFolder[]>();
    for (const folder of folders) {
      const parent =
        folder.parentId && byId.has(folder.parentId) ? folder.parentId : null;
      children.set(parent, [...(children.get(parent) || []), folder]);
    }
    const path = (id?: string | null) => {
      const list: LibraryFolder[] = [];
      let current = id ? byId.get(id) : undefined;
      while (current && !list.includes(current)) {
        list.unshift(current);
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
      return list;
    };
    // a folder can't go into itself or anything below it
    const isInside = (id: string, ancestor: string) =>
      path(id).some((p) => p.id === ancestor);
    return { byId, children, path, isInside };
  }, [folders]);

const accepts = (e: DragEvent) =>
  e.dataTransfer.types.includes(DRAG_MEDIA) ||
  e.dataTransfer.types.includes(DRAG_FOLDER);

// drop handlers for anything that takes media / folders (a tile, a crumb, a
// tree row); `over` lights it up while something hovers it
export const useDropTarget = (target: DropTarget, drop?: FolderDrop) => {
  const [over, setOver] = useState(false);
  if (!drop) {
    return { over: false, props: {} };
  }
  return {
    over,
    props: {
      onDragOver: (e: DragEvent) => {
        if (!accepts(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setOver(true);
      },
      onDragLeave: () => setOver(false),
      onDrop: (e: DragEvent) => {
        setOver(false);
        if (!accepts(e)) return;
        e.preventDefault();
        e.stopPropagation();
        const media = e.dataTransfer.getData(DRAG_MEDIA);
        const folder = e.dataTransfer.getData(DRAG_FOLDER);
        if (media) {
          drop.onDropMedia(JSON.parse(media), target);
        } else if (folder && folder !== target) {
          drop.onDropFolder(folder, target);
        }
      },
    },
  };
};

const Crumb: FC<{
  label: string;
  target: DropTarget;
  current: boolean;
  onOpen: (id: DropTarget) => void;
  drop?: FolderDrop;
}> = ({ label, target, current, onOpen, drop }) => {
  const { over, props } = useDropTarget(target, drop);
  return (
    <li className="tdw-media-crumb">
      <button
        type="button"
        className={clsx('tdw-media-crumb-btn', over && 'is-over')}
        aria-current={current ? 'page' : undefined}
        onClick={() => onOpen(target)}
        {...props}
      >
        {label}
      </button>
    </li>
  );
};

export const MediaBreadcrumbs: FC<{
  path: LibraryFolder[];
  onOpen: (id: DropTarget) => void;
  drop?: FolderDrop;
  rootLabel: string;
}> = ({ path, onOpen, drop, rootLabel }) => {
  const t = useT();
  // long paths keep the root and the last two folders
  const hidden = path.length > 3 ? path.slice(0, path.length - 2) : [];
  const shown = path.length > 3 ? path.slice(-2) : path;
  return (
    <nav aria-label={t('tdw_media_folder_path', 'Folder path')}>
      <ol className="tdw-media-crumbs">
        <Crumb
          label={rootLabel}
          target={null}
          current={!path.length}
          onOpen={onOpen}
          drop={drop}
        />
        {!!hidden.length && (
          <li className="tdw-media-crumb">
            <button
              type="button"
              className="tdw-media-crumb-btn"
              title={hidden.map((p) => p.name).join(' / ')}
              onClick={() => onOpen(hidden[hidden.length - 1].id)}
            >
              …
            </button>
          </li>
        )}
        {shown.map((folder, index) => (
          <Crumb
            key={folder.id}
            label={folder.name}
            target={folder.id}
            current={index === shown.length - 1}
            onOpen={onOpen}
            drop={drop}
          />
        ))}
      </ol>
    </nav>
  );
};

const TreeRow: FC<{
  folder: LibraryFolder;
  depth: number;
  index: ReturnType<typeof useFolderIndex>;
  current: string | null;
  open: Set<string>;
  toggle: (id: string) => void;
  onOpen: (id: DropTarget) => void;
  drop?: FolderDrop;
}> = ({ folder, depth, index, current, open, toggle, onOpen, drop }) => {
  const t = useT();
  const { over, props } = useDropTarget(folder.id, drop);
  const kids = index.children.get(folder.id) || [];
  const expanded = open.has(folder.id);
  return (
    <li role="treeitem" aria-expanded={kids.length ? expanded : undefined}>
      <div
        className={clsx(
          'tdw-media-tree-row',
          current === folder.id && 'is-current',
          over && 'is-over'
        )}
        style={{ paddingInlineStart: 8 + depth * 14 }}
        {...props}
      >
        <button
          type="button"
          className={clsx('tdw-media-tree-chev', !kids.length && 'is-empty')}
          aria-label={
            expanded
              ? t('tdw_media_collapse', 'Collapse')
              : t('tdw_media_expand', 'Expand')
          }
          tabIndex={kids.length ? 0 : -1}
          onClick={() => toggle(folder.id)}
        >
          <Icon name="chevron-right" size={14} />
        </button>
        <button
          type="button"
          className="tdw-media-tree-name"
          onClick={() => onOpen(folder.id)}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(DRAG_FOLDER, folder.id);
            e.dataTransfer.effectAllowed = 'move';
          }}
        >
          <Icon name="folder" size={16} />
          <span>{folder.name}</span>
        </button>
      </div>
      {expanded && !!kids.length && (
        <ul role="group">
          {kids.map((kid) => (
            <TreeRow
              key={kid.id}
              folder={kid}
              depth={depth + 1}
              index={index}
              current={current}
              open={open}
              toggle={toggle}
              onOpen={onOpen}
              drop={drop}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export const FolderTree: FC<{
  folders: LibraryFolder[];
  current: string | null;
  onOpen: (id: DropTarget) => void;
  drop?: FolderDrop;
  rootLabel: string;
}> = ({ folders, current, onOpen, drop, rootLabel }) => {
  const t = useT();
  const index = useFolderIndex(folders);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const root = useDropTarget(null, drop);

  // the open folder's parents unfold so it's visible
  useEffect(() => {
    if (!current) return;
    setOpen((prev) => {
      const next = new Set(prev);
      index.path(current).forEach((p) => next.add(p.id));
      return next;
    });
  }, [current, index]);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <nav
      className="tdw-media-tree"
      aria-label={t('tdw_media_folders', 'Folders')}
    >
      <div
        className={clsx(
          'tdw-media-tree-row is-root',
          current === null && 'is-current',
          root.over && 'is-over'
        )}
        {...root.props}
      >
        <button
          type="button"
          className="tdw-media-tree-name"
          onClick={() => onOpen(null)}
        >
          <Icon name="images" size={16} />
          <span>{rootLabel}</span>
        </button>
      </div>
      <ul role="tree" aria-label={t('tdw_media_folders', 'Folders')}>
        {(index.children.get(null) || []).map((folder) => (
          <TreeRow
            key={folder.id}
            folder={folder}
            depth={0}
            index={index}
            current={current}
            open={open}
            toggle={toggle}
            onOpen={onOpen}
            drop={drop}
          />
        ))}
      </ul>
    </nav>
  );
};

export const FolderNameDialog: FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  initial?: string;
  confirmLabel: string;
  onSubmit: (name: string) => Promise<void>;
}> = ({ open, onClose, title, initial = '', confirmLabel, onSubmit }) => {
  const t = useT();
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(initial);
      setError('');
    }
  }, [open]);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) {
      setError(t('tdw_media_folder_name_required', 'Give the folder a name'));
      return;
    }
    setBusy(true);
    try {
      await onSubmit(name.trim());
      onClose();
    } catch (err: any) {
      setError(
        err?.message ||
          t('tdw_media_something_wrong', 'Something went wrong, try again')
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button variant="primary" loading={busy} onClick={() => submit()}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form onSubmit={submit}>
        <Input
          autoFocus
          label={t('tdw_media_folder_name', 'Folder name')}
          value={name}
          maxLength={100}
          error={error || undefined}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          onFocus={(e) => e.target.select()}
        />
      </form>
    </Dialog>
  );
};

// Picks a destination folder; `disabled` are the folders that can't take it
// (a folder being moved and everything inside it)
export const MoveToDialog: FC<{
  open: boolean;
  onClose: () => void;
  folders: LibraryFolder[];
  title: string;
  current: string | null;
  disabled?: (id: string) => boolean;
  onMove: (folderId: DropTarget) => Promise<void>;
  rootLabel: string;
}> = ({
  open,
  onClose,
  folders,
  title,
  current,
  disabled,
  onMove,
  rootLabel,
}) => {
  const t = useT();
  const index = useFolderIndex(folders);
  const [at, setAt] = useState<string | null>(null);
  const [picked, setPicked] = useState<DropTarget | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setAt(current);
      setPicked(undefined);
    }
  }, [open]);

  const list = index.children.get(at) || [];
  const crumbs = index.path(at);
  const target = picked === undefined ? at : picked;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={target === current}
            onClick={async () => {
              setBusy(true);
              try {
                await onMove(target);
                onClose();
              } finally {
                setBusy(false);
              }
            }}
          >
            {t('tdw_media_move_here', 'Move here')}
          </Button>
        </>
      }
    >
      <div className="tdw-media-moveto">
        <MediaBreadcrumbs
          path={crumbs}
          onOpen={(id) => {
            setAt(id);
            setPicked(undefined);
          }}
          rootLabel={rootLabel}
        />
        <ul className="tdw-media-moveto-list" role="listbox" aria-label={title}>
          {!list.length && (
            <li className="tdw-media-moveto-empty">
              {t('tdw_media_no_subfolders', 'No folders here')}
            </li>
          )}
          {list.map((folder) => {
            const off = disabled?.(folder.id);
            const hasKids = !!index.children.get(folder.id)?.length;
            return (
              <li key={folder.id}>
                <div
                  className={clsx(
                    'tdw-media-moveto-row',
                    picked === folder.id && 'is-picked',
                    off && 'is-disabled'
                  )}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={picked === folder.id}
                    disabled={off}
                    className="tdw-media-moveto-name"
                    onClick={() => setPicked(folder.id)}
                    onDoubleClick={() => {
                      setAt(folder.id);
                      setPicked(undefined);
                    }}
                  >
                    <Icon name="folder" size={16} />
                    <span>{folder.name}</span>
                  </button>
                  {hasKids && !off && (
                    <button
                      type="button"
                      className="pz-iconbtn pz-btn-ghost pz-iconbtn-sm"
                      aria-label={t('tdw_media_open_folder', 'Open {{name}}', {
                        name: folder.name,
                      })}
                      onClick={() => {
                        setAt(folder.id);
                        setPicked(undefined);
                      }}
                    >
                      <Icon name="chevron-right" size={14} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Dialog>
  );
};
