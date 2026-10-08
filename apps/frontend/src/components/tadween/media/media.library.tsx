'use client';

import React, {
  FC,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import { useDebounce } from 'use-debounce';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Icon,
  IconButton,
  Popover,
  SegmentedControl,
  Select,
  Skeleton,
} from '@gitroom/frontend/components/tadween/ui';
import {
  TadweenSheet,
  usePhoneLayout,
} from '@gitroom/frontend/components/tadween/sheet/tadween.sheet';
import { ThirdPartyMediaLibrary } from '@gitroom/frontend/components/third-parties/third-party.media-library';
import {
  useTodayActions,
  useTodayIntegrations,
} from '@gitroom/frontend/components/tadween/today/today.hooks';
import {
  downloadMedia,
  LibraryFolder,
  LibraryMedia,
  MediaQuery,
  MediaSort,
  MediaTypeFilter,
  MediaUsageFilter,
  mediaName,
  useMediaActions,
  useMediaFolders,
  useMediaPages,
} from '@gitroom/frontend/components/tadween/media/media.hooks';
import {
  DropTarget,
  FolderDrop,
  FolderNameDialog,
  FolderTree,
  MediaBreadcrumbs,
  MoveToDialog,
  useFolderIndex,
} from '@gitroom/frontend/components/tadween/media/media.folders';
import {
  FolderTile,
  MediaRow,
  MediaTile,
  MenuAction,
} from '@gitroom/frontend/components/tadween/media/media.items';
import {
  DetailsActions,
  MediaDetails,
  MediaLightbox,
} from '@gitroom/frontend/components/tadween/media/media.details';
import {
  UploadDock,
  UploadEntry,
  useMediaUploads,
} from '@gitroom/frontend/components/tadween/media/media.upload.dock';

// The media library, Drive-style: folders, grid / list, filters, selection
// (click, shift, ctrl / cmd, drag box, keyboard), drag to move, an upload dock,
// a details panel and a lightbox. `page` is /media; `picker` is the composer's
// "Insert media" modal (MediaBox), which returns the selected media in the
// order they were picked.

export type PickedMedia = LibraryMedia;

const VIEW_KEY = 'tdw-media-view';
const DETAILS_KEY = 'tdw-media-details';

const readStored = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    return null;
  }
};
const store = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch (err) {
    // private mode: the choice just isn't remembered
  }
};

// files (and the folders they sat in) from a drop; folders are read through
// the entries API so their structure comes along
const readDrop = async (data: DataTransfer): Promise<UploadEntry[]> => {
  const items = Array.from(data.items || []);
  const entries = items
    .map((item) => (item.kind === 'file' ? item.webkitGetAsEntry?.() : null))
    .filter(Boolean) as any[];
  if (!entries.length) {
    return Array.from(data.files || []).map((file) => ({ file }));
  }
  const out: UploadEntry[] = [];
  const walk = async (entry: any, dir: string): Promise<void> => {
    if (entry.isFile) {
      const file: File = await new Promise((resolve, reject) =>
        entry.file(resolve, reject)
      );
      out.push({ file, dir });
      return;
    }
    if (entry.isDirectory) {
      const reader = entry.createReader();
      const next = dir ? `${dir}/${entry.name}` : entry.name;
      // readEntries hands back the folder in chunks until it's empty
      for (;;) {
        const chunk: any[] = await new Promise((resolve, reject) =>
          reader.readEntries(resolve, reject)
        );
        if (!chunk.length) break;
        for (const child of chunk) await walk(child, next);
      }
    }
  };
  for (const entry of entries) await walk(entry, '');
  return out;
};

const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  return (
    !!el &&
    (el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.isContentEditable)
  );
};

type Confirm =
  | { kind: 'media'; ids: string[] }
  | { kind: 'folder'; folder: LibraryFolder }
  | null;

type Moving =
  | { kind: 'media'; ids: string[] }
  | { kind: 'folder'; folder: LibraryFolder }
  | null;

// Opens a post from "Used in" with the calendar's own editor
const PageDetails: FC<
  Omit<DetailsActions, 'onOpenPost'> & {
    media: LibraryMedia;
    folderName: string;
    reload: () => void;
  }
> = ({ reload, ...props }) => {
  const { integrations } = useTodayIntegrations();
  const { edit } = useTodayActions(integrations, reload);
  return (
    <MediaDetails
      {...props}
      onOpenPost={(group) => edit({ group } as any)()}
    />
  );
};

export const MediaLibrary: FC<{
  mode: 'page' | 'picker';
  // a picker that only takes images or videos
  type?: 'image' | 'video';
  onPick?: (media: PickedMedia[]) => void;
  onCancel?: () => void;
}> = ({ mode, type, onPick, onCancel }) => {
  const t = useT();
  const toaster = useToaster();
  const phone = usePhoneLayout();
  const picker = mode === 'picker';
  const actions = useMediaActions();

  // ── Where we are and what's shown ─────────────────────────────────────────
  const [folderId, setFolderId] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showDetails, setShowDetails] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 300);
  const [kind, setKind] = useState<MediaTypeFilter>('all');
  const [usage, setUsage] = useState<MediaUsageFilter>('all');
  const [sort, setSort] = useState<MediaSort>('newest');

  useEffect(() => {
    const stored = readStored(VIEW_KEY);
    if (stored === 'list' || stored === 'grid') setView(stored);
    if (readStored(DETAILS_KEY) === 'off') setShowDetails(false);
  }, []);

  const searching = !!debouncedSearch.trim();
  const query: MediaQuery = useMemo(
    () => ({
      // a search looks through every folder, like Drive
      folderId: searching ? undefined : folderId || 'root',
      search: debouncedSearch,
      type: kind,
      usage,
      sort,
    }),
    [searching, folderId, debouncedSearch, kind, usage, sort]
  );

  const pages = useMediaPages(query, type);
  const { media, hasMore, loadingMore, setSize, size } = pages;
  const folders = useMediaFolders();
  const allFolders = folders.data || [];
  const index = useFolderIndex(allFolders);
  const path = index.path(folderId);
  const rootLabel = t('tdw_media_all_media', 'All media');
  const currentName = path.length ? path[path.length - 1].name : rootLabel;

  const visibleFolders = useMemo(() => {
    if (searching) {
      const q = debouncedSearch.trim().toLowerCase();
      return allFolders.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (kind !== 'all' || usage !== 'all') return [];
    return index.children.get(folderId) || [];
  }, [searching, debouncedSearch, allFolders, index, folderId, kind, usage]);

  // the open folder was deleted (here or elsewhere): go back up
  useEffect(() => {
    if (folderId && folders.data && !index.byId.has(folderId)) {
      setFolderId(null);
    }
  }, [folderId, folders.data, index]);

  const reload = useCallback(() => {
    pages.mutate();
    folders.mutate();
  }, [pages.mutate, folders.mutate]);

  // ── Selection ─────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<LibraryMedia[]>([]);
  const [anchor, setAnchor] = useState<number | null>(null);
  const [focus, setFocus] = useState(0);
  const [selecting, setSelecting] = useState(false); // phones, page mode
  const [sheetOpen, setSheetOpen] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const selectedIds = useMemo(() => selected.map((p) => p.id), [selected]);
  const isSelected = useCallback(
    (id: string) => selectedIds.includes(id),
    [selectedIds]
  );

  // a new place starts with nothing selected (the picker keeps its picks)
  useEffect(() => {
    if (!picker) setSelected([]);
    setAnchor(null);
    setFocus(0);
  }, [query, picker]);

  // keep selected items fresh after a rename / move
  useEffect(() => {
    setSelected((prev) =>
      prev.map((p) => media.find((m) => m.id === p.id) || p)
    );
  }, [media]);

  const toggle = useCallback((item: LibraryMedia) => {
    setSelected((prev) =>
      prev.some((p) => p.id === item.id)
        ? prev.filter((p) => p.id !== item.id)
        : [...prev, item]
    );
  }, []);

  const range = useCallback(
    (from: number, to: number, add: boolean) => {
      const [a, b] = from < to ? [from, to] : [to, from];
      const items = media.slice(a, b + 1);
      setSelected((prev) =>
        add
          ? [...prev, ...items.filter((p) => !prev.some((x) => x.id === p.id))]
          : items
      );
    },
    [media]
  );

  const onItemClick = useCallback(
    (i: number) => (e: MouseEvent) => {
      const item = media[i];
      setFocus(i);
      if (e.shiftKey && anchor !== null) {
        range(anchor, i, picker || e.metaKey || e.ctrlKey);
        return;
      }
      setAnchor(i);
      if (picker || e.metaKey || e.ctrlKey || selecting) {
        toggle(item);
        return;
      }
      setSelected([item]);
      if (phone) setSheetOpen(true);
    },
    [media, anchor, picker, selecting, phone, range, toggle]
  );

  const selectAll = useCallback(() => setSelected(media), [media]);
  const clearSelection = useCallback(() => {
    setSelected([]);
    setSelecting(false);
  }, []);

  // ── Dialogs ───────────────────────────────────────────────────────────────
  const [newFolder, setNewFolder] = useState(false);
  const [renaming, setRenaming] = useState<LibraryFolder | null>(null);
  const [moving, setMoving] = useState<Moving>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const fail = useCallback(
    (err: any) =>
      toaster.show(
        err?.message || t('tdw_media_something_wrong', 'Something went wrong, try again'),
        'warning'
      ),
    [toaster, t]
  );

  const folderCount = (folder: LibraryFolder) =>
    folder.mediaCount + (index.children.get(folder.id)?.length || 0);

  const folderLabel = useCallback(
    (id: DropTarget) => (id ? index.byId.get(id)?.name || rootLabel : rootLabel),
    [index, rootLabel]
  );

  const moveMedia = useCallback(
    async (ids: string[], target: DropTarget) => {
      try {
        await actions.moveMedia(ids, target);
        toaster.show(
          t('tdw_media_moved_to', 'Moved {{count}} files to {{folder}}', {
            count: ids.length,
            folder: folderLabel(target),
          }),
          'success'
        );
        setSelected((prev) => prev.filter((p) => !ids.includes(p.id)));
        reload();
      } catch (err) {
        fail(err);
      }
    },
    [actions, toaster, t, folderLabel, reload, fail]
  );

  const moveFolder = useCallback(
    async (id: string, target: DropTarget) => {
      if (id === target || (target && index.isInside(target, id))) {
        toaster.show(
          t('tdw_media_cannot_move_into_itself', 'A folder can’t go inside itself'),
          'warning'
        );
        return;
      }
      try {
        await actions.moveFolder(id, target);
        reload();
      } catch (err) {
        fail(err);
      }
    },
    [actions, index, toaster, t, reload, fail]
  );

  const drop: FolderDrop | undefined = picker
    ? undefined
    : { onDropMedia: moveMedia, onDropFolder: moveFolder };

  const deleteMedia = useCallback(
    async (ids: string[]) => {
      try {
        await actions.deleteMedia(ids);
        setSelected((prev) => prev.filter((p) => !ids.includes(p.id)));
        setSheetOpen(false);
        setLightbox(null);
        toaster.show(
          t('tdw_media_deleted_count', 'Deleted {{count}} files', { count: ids.length }),
          'success'
        );
      } catch (err) {
        fail(err);
      } finally {
        reload();
      }
    },
    [actions, toaster, t, reload, fail]
  );

  const downloadAll = useCallback(async (items: LibraryMedia[]) => {
    // one after another: browsers block a burst of downloads
    for (const item of items) {
      await downloadMedia(item);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }, []);

  const folderActions = useCallback(
    (folder: LibraryFolder): MenuAction[] =>
      picker
        ? []
        : [
            {
              key: 'rename',
              label: t('tdw_media_rename', 'Rename'),
              icon: 'pencil',
              onClick: () => setRenaming(folder),
            },
            {
              key: 'move',
              label: t('tdw_media_move_to', 'Move to…'),
              icon: 'folder-input',
              onClick: () => setMoving({ kind: 'folder', folder }),
            },
            {
              key: 'delete',
              label: t('delete', 'Delete'),
              icon: 'trash-2',
              danger: true,
              onClick: () => setConfirm({ kind: 'folder', folder }),
            },
          ],
    [picker, t]
  );

  // ── Uploads ───────────────────────────────────────────────────────────────
  const uploads = useMediaUploads({
    type,
    onUploaded: (saved) => {
      reload();
      // the picker selects what was just uploaded, like before
      if (picker && saved.length) {
        setSelected((prev) => [
          ...prev,
          ...saved
            .filter((p) => !prev.some((x) => x.id === p.id))
            .map((p) => ({
              usedIn: 0,
              fileSize: 0,
              folderId: null,
              createdAt: new Date().toISOString(),
              thumbnail: null,
              alt: null,
              thumbnailTimestamp: null,
              originalName: null,
              ...p,
            })),
        ]);
      }
    },
    onFoldersCreated: () => folders.mutate(),
  });
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const uploadButton = useRef<HTMLSpanElement>(null);
  const [uploadMenu, setUploadMenu] = useState(false);
  const [dragging, setDragging] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const folderRef = useRef(folderId);
  folderRef.current = folderId;
  const uploadsRef = useRef(uploads);
  uploadsRef.current = uploads;

  const enqueue = useCallback((entries: UploadEntry[]) => {
    uploadsRef.current.add(entries, folderRef.current);
  }, []);

  // files dragged in from the desktop: the whole page (or the picker) is the
  // drop zone; media dragged inside the library are left to the folders
  useEffect(() => {
    const target: HTMLElement | Window = picker ? rootRef.current! : window;
    if (!target) return;
    let depth = 0;
    const hasFiles = (e: DragEvent) =>
      !!e.dataTransfer?.types?.includes('Files');
    const enter = (e: Event) => {
      if (!hasFiles(e as DragEvent)) return;
      depth++;
      setDragging(true);
    };
    const over = (e: Event) => {
      if (!hasFiles(e as DragEvent)) return;
      e.preventDefault();
    };
    const leave = (e: Event) => {
      if (!hasFiles(e as DragEvent)) return;
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    const dropped = async (e: Event) => {
      const event = e as DragEvent;
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      enqueue(await readDrop(event.dataTransfer!));
    };
    target.addEventListener('dragenter', enter);
    target.addEventListener('dragover', over);
    target.addEventListener('dragleave', leave);
    target.addEventListener('drop', dropped);
    return () => {
      target.removeEventListener('dragenter', enter);
      target.removeEventListener('dragover', over);
      target.removeEventListener('dragleave', leave);
      target.removeEventListener('drop', dropped);
    };
  }, [picker, enqueue]);

  // pasted images upload into the open folder
  useEffect(() => {
    const paste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return;
      const files = Array.from(e.clipboardData?.files || []);
      if (!files.length) return;
      e.preventDefault();
      enqueue(files.map((file) => ({ file })));
    };
    document.addEventListener('paste', paste);
    return () => document.removeEventListener('paste', paste);
  }, [enqueue]);

  // ── Infinite scroll ───────────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinel.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) setSize(size + 1);
      },
      {
        // phones scroll the page, everything else scrolls the browser
        root: picker || !phone ? scrollRef.current : null,
        rootMargin: '400px',
      }
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, size, setSize, picker, phone]);

  // ── Drag-select box ───────────────────────────────────────────────────────
  const [box, setBox] = useState<null | {
    x: number;
    y: number;
    w: number;
    h: number;
  }>(null);
  const boxStart = useRef<null | {
    x: number;
    y: number;
    base: LibraryMedia[];
    moved: boolean;
  }>(null);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || e.pointerType !== 'mouse') return;
    const target = e.target as HTMLElement;
    if (target.closest('[role="option"], button, a, input, video')) return;
    const rect = scrollRef.current!.getBoundingClientRect();
    boxStart.current = {
      x: e.clientX - rect.left + scrollRef.current!.scrollLeft,
      y: e.clientY - rect.top + scrollRef.current!.scrollTop,
      base: e.shiftKey || e.metaKey || e.ctrlKey || picker ? selected : [],
      moved: false,
    };
    scrollRef.current!.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const start = boxStart.current;
    if (!start) return;
    const el = scrollRef.current!;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left + el.scrollLeft;
    const y = e.clientY - rect.top + el.scrollTop;
    if (!start.moved && Math.hypot(x - start.x, y - start.y) < 5) return;
    start.moved = true;
    const next = {
      x: Math.min(x, start.x),
      y: Math.min(y, start.y),
      w: Math.abs(x - start.x),
      h: Math.abs(y - start.y),
    };
    setBox(next);
    const left = rect.left - el.scrollLeft + next.x;
    const top = rect.top - el.scrollTop + next.y;
    const hit = new Set<string>();
    el.querySelectorAll<HTMLElement>('[data-media-id]').forEach((node) => {
      const r = node.getBoundingClientRect();
      if (
        r.right > left &&
        r.left < left + next.w &&
        r.bottom > top &&
        r.top < top + next.h
      ) {
        hit.add(node.dataset.mediaId!);
      }
    });
    setSelected([
      ...start.base.filter((p) => !hit.has(p.id)),
      ...media.filter((p) => hit.has(p.id)),
    ]);
  };

  const onPointerUp = () => {
    const start = boxStart.current;
    boxStart.current = null;
    setBox(null);
    // a click on the empty space clears the selection
    if (start && !start.moved && !picker) setSelected([]);
  };

  // ── Keyboard ──────────────────────────────────────────────────────────────
  const focusItem = useCallback(
    (i: number) => {
      const item = media[i];
      if (!item) return;
      setFocus(i);
      scrollRef.current
        ?.querySelector<HTMLElement>(`[data-media-id="${item.id}"]`)
        ?.focus({ preventScroll: false });
    },
    [media]
  );

  const columns = () => {
    if (view === 'list') return 1;
    const tiles = scrollRef.current?.querySelectorAll<HTMLElement>(
      '.tdw-media-tile'
    );
    if (!tiles?.length) return 1;
    const top = tiles[0].offsetTop;
    let n = 0;
    tiles.forEach((p) => {
      if (p.offsetTop === top) n++;
    });
    return Math.max(1, n);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isTyping(e.target) || lightbox !== null) return;
    const rtl = document.documentElement.dir === 'rtl';
    const step: Record<string, number> = {
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
      ArrowDown: columns(),
      ArrowUp: -columns(),
    };
    if (step[e.key] !== undefined && media.length) {
      e.preventDefault();
      const next = Math.min(media.length - 1, Math.max(0, focus + step[e.key]));
      focusItem(next);
      if (e.shiftKey) {
        range(anchor ?? focus, next, picker);
      } else if (!picker && !e.metaKey && !e.ctrlKey) {
        setSelected([media[next]]);
        setAnchor(next);
      }
      return;
    }
    if (e.key === ' ' && media[focus]) {
      e.preventDefault();
      toggle(media[focus]);
      setAnchor(focus);
    } else if (e.key === 'Enter' && media[focus]) {
      e.preventDefault();
      setLightbox(focus);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && !picker && selected.length) {
      e.preventDefault();
      setConfirm({ kind: 'media', ids: selectedIds });
    } else if (e.key === 'Escape' && selected.length && !picker) {
      e.preventDefault();
      e.stopPropagation();
      clearSelection();
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      selectAll();
    }
  };

  // ── Rendering helpers ─────────────────────────────────────────────────────
  const single = selected.length === 1 ? selected[0] : undefined;
  const loading = pages.isLoading && !media.length;
  const filtered = kind !== 'all' || usage !== 'all';
  const empty = !loading && !media.length && !visibleFolders.length;

  const detailsActions = (item: LibraryMedia): Omit<DetailsActions, 'onOpenPost'> => ({
    onRename: async (name) => {
      try {
        await actions.renameMedia(item.id, name);
        pages.mutate();
      } catch (err) {
        fail(err);
        throw err;
      }
    },
    onSaveAlt: async (alt) => {
      try {
        await actions.saveAlt(item.id, alt);
        pages.mutate();
        toaster.show(t('tdw_media_alt_saved', 'Alt text saved'), 'success');
      } catch (err) {
        fail(err);
      }
    },
    onPreview: () => setLightbox(media.findIndex((p) => p.id === item.id)),
    onDownload: () => downloadMedia(item),
    onMove: () => setMoving({ kind: 'media', ids: [item.id] }),
    onDelete: () => setConfirm({ kind: 'media', ids: [item.id] }),
  });

  const sortOptions = [
    { value: 'newest' as MediaSort, label: t('tdw_media_sort_newest', 'Newest first') },
    { value: 'oldest' as MediaSort, label: t('tdw_media_sort_oldest', 'Oldest first') },
    { value: 'name-asc' as MediaSort, label: t('tdw_media_sort_name_asc', 'Name A to Z') },
    { value: 'name-desc' as MediaSort, label: t('tdw_media_sort_name_desc', 'Name Z to A') },
  ];
  const kindOptions: { value: MediaTypeFilter; label: string }[] = [
    { value: 'all', label: t('tdw_media_filter_all', 'All') },
    { value: 'image', label: t('tdw_media_filter_images', 'Images') },
    { value: 'video', label: t('tdw_media_filter_videos', 'Videos') },
    { value: 'gif', label: t('tdw_media_filter_gifs', 'GIFs') },
  ];
  const usageOptions = [
    { value: 'all' as MediaUsageFilter, label: t('tdw_media_usage_all', 'Any use') },
    { value: 'used' as MediaUsageFilter, label: t('tdw_media_usage_used', 'Used in posts') },
    { value: 'unused' as MediaUsageFilter, label: t('tdw_media_usage_unused', 'Not used yet') },
  ];

  const uploadControls = (
    <>
      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        accept={type === 'image' ? 'image/*' : type === 'video' ? 'video/mp4,video/quicktime' : 'image/*,video/mp4,video/quicktime'}
        onChange={(e) => {
          enqueue(Array.from(e.target.files || []).map((file) => ({ file })));
          e.target.value = '';
        }}
      />
      <input
        ref={folderInput}
        type="file"
        multiple
        hidden
        {...({ webkitdirectory: '', directory: '' } as any)}
        onChange={(e) => {
          enqueue(
            Array.from(e.target.files || []).map((file) => ({
              file,
              dir: (file.webkitRelativePath || '').split('/').slice(0, -1).join('/'),
            }))
          );
          e.target.value = '';
        }}
      />
      <span ref={uploadButton} className="pz-anchor tdw-media-upload">
        <Button
          variant={picker ? 'secondary' : 'primary'}
          size="sm"
          icon="upload"
          iconEnd="chevron-down"
          aria-haspopup="menu"
          aria-expanded={uploadMenu}
          onClick={() => setUploadMenu(!uploadMenu)}
        >
          {t('upload', 'Upload')}
        </Button>
        <Popover
          open={uploadMenu}
          onClose={() => setUploadMenu(false)}
          anchor={uploadButton as React.RefObject<HTMLElement>}
          align="end"
          width={220}
        >
          <div role="menu">
            <button
              type="button"
              role="menuitem"
              className="pz-menu-item"
              onClick={() => {
                setUploadMenu(false);
                fileInput.current?.click();
              }}
            >
              <Icon name="file" />
              {t('tdw_media_upload_files', 'Upload files')}
            </button>
            <button
              type="button"
              role="menuitem"
              className="pz-menu-item"
              onClick={() => {
                setUploadMenu(false);
                folderInput.current?.click();
              }}
            >
              <Icon name="folder-up" />
              {t('tdw_media_upload_folder', 'Upload a folder')}
            </button>
          </div>
        </Popover>
      </span>
    </>
  );

  const emptyState = () => {
    if (searching) {
      return (
        <EmptyState
          icon="search"
          title={t('tdw_media_no_results', 'No results for “{{query}}”', {
            query: debouncedSearch.trim(),
          })}
          body={t('tdw_media_no_results_body', 'Try another name, or clear the search.')}
          action={
            <Button size="sm" onClick={() => setSearch('')}>
              {t('tdw_media_clear_search', 'Clear search')}
            </Button>
          }
        />
      );
    }
    if (filtered) {
      return (
        <EmptyState
          icon="images"
          title={t('tdw_media_no_filtered', 'Nothing matches these filters')}
          action={
            <Button
              size="sm"
              onClick={() => {
                setKind('all');
                setUsage('all');
              }}
            >
              {t('tdw_media_clear_filters', 'Clear filters')}
            </Button>
          }
        />
      );
    }
    return (
      <EmptyState
        icon={folderId ? 'folder' : 'images'}
        title={
          folderId
            ? t('tdw_media_empty_folder', 'This folder is empty')
            : t('tdw_media_empty_library', 'Your media library is empty')
        }
        body={
          folderId
            ? t(
                'tdw_media_empty_folder_body',
                'Drop files here, paste an image, or drag media onto this folder from elsewhere in the library.'
              )
            : t(
                'tdw_media_empty_library_body',
                'Upload images and videos, or drop them anywhere on this page. Images up to 30 MB, videos up to 1 GB.'
              )
        }
        action={
          <Button variant="primary" size="sm" icon="upload" onClick={() => fileInput.current?.click()}>
            {t('upload', 'Upload')}
          </Button>
        }
      />
    );
  };

  const order = (id: string) =>
    picker ? selectedIds.indexOf(id) + 1 || undefined : undefined;

  const dragIdsFor = (item: LibraryMedia) =>
    picker ? undefined : isSelected(item.id) ? selectedIds : [item.id];

  const browse = (
    <div
      ref={scrollRef}
      className={clsx('tdw-media-scroll', box && 'is-boxing')}
      role="listbox"
      aria-multiselectable="true"
      aria-label={currentName}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {loading ? (
        <div className={view === 'grid' ? 'tdw-media-grid' : 'tdw-media-list'} aria-busy="true">
          {[...Array(view === 'grid' ? 12 : 8)].map((_, i) =>
            view === 'grid' ? (
              <div key={i} className="tdw-media-tile is-skeleton">
                <Skeleton height="100%" radius={12} className="tdw-media-skeleton" />
                <Skeleton width="70%" height={12} />
              </div>
            ) : (
              <div key={i} className="tdw-media-row is-skeleton">
                <Skeleton width={40} height={40} radius={8} />
                <Skeleton width="40%" height={12} />
              </div>
            )
          )}
        </div>
      ) : empty ? (
        <div className="tdw-media-empty">{emptyState()}</div>
      ) : view === 'grid' ? (
        <>
          {!!visibleFolders.length && (
            <>
              <h3 className="tdw-media-section">{t('tdw_media_folders', 'Folders')}</h3>
              <div className="tdw-media-folders">
                {visibleFolders.map((folder) => (
                  <FolderTile
                    key={folder.id}
                    folder={folder}
                    count={folderCount(folder)}
                    onOpen={() => {
                      setSearch('');
                      setFolderId(folder.id);
                    }}
                    actions={folderActions(folder)}
                    drop={drop}
                  />
                ))}
              </div>
            </>
          )}
          {!!media.length && (
            <>
              {!!visibleFolders.length && (
                <h3 className="tdw-media-section">{t('tdw_media_files', 'Files')}</h3>
              )}
              <div className="tdw-media-grid">
                {media.map((item, i) => (
                  <MediaTile
                    key={item.id}
                    media={item}
                    selected={isSelected(item.id)}
                    order={order(item.id)}
                    focused={focus === i}
                    picker={picker}
                    dragIds={dragIdsFor(item)}
                    onClick={onItemClick(i)}
                    onDoubleClick={() => setLightbox(i)}
                    onToggle={() => {
                      setAnchor(i);
                      toggle(item);
                    }}
                    onPreview={() => setLightbox(i)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="tdw-media-list">
          <div className="tdw-media-row is-head" aria-hidden="true">
            <span />
            <span />
            <span className="tdw-media-row-name">{t('tdw_media_name', 'Name')}</span>
            <span className="tdw-media-col is-type">{t('tdw_media_type', 'Type')}</span>
            <span className="tdw-media-col is-size">{t('tdw_media_size', 'Size')}</span>
            <span className="tdw-media-col is-dims">{t('tdw_media_dimensions', 'Dimensions')}</span>
            <span className="tdw-media-col is-date">{t('tdw_media_uploaded', 'Uploaded')}</span>
            {!picker && <span className="tdw-media-col is-used">{t('tdw_media_used_in', 'Used in posts')}</span>}
          </div>
          {visibleFolders.map((folder) => (
            <FolderTile
              key={folder.id}
              list
              folder={folder}
              count={folderCount(folder)}
              onOpen={() => {
                setSearch('');
                setFolderId(folder.id);
              }}
              actions={folderActions(folder)}
              drop={drop}
              extra={
                <span className="tdw-media-col is-type">
                  {t('tdw_media_items_count', '{{count}} items', { count: folderCount(folder) })}
                </span>
              }
            />
          ))}
          {media.map((item, i) => (
            <MediaRow
              key={item.id}
              media={item}
              selected={isSelected(item.id)}
              order={order(item.id)}
              focused={focus === i}
              picker={picker}
              dragIds={dragIdsFor(item)}
              onClick={onItemClick(i)}
              onDoubleClick={() => setLightbox(i)}
              onToggle={() => {
                setAnchor(i);
                toggle(item);
              }}
            />
          ))}
        </div>
      )}
      {hasMore && (
        <div ref={sentinel} className="tdw-media-more">
          {loadingMore && <Icon name="loader-circle" size={18} />}
        </div>
      )}
      {box && (
        <span
          className="tdw-media-box"
          style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
          aria-hidden="true"
        />
      )}
    </div>
  );

  const bulkBar = !picker && (selected.length > 1 || (selected.length && (phone || selecting))) ? (
    <div className="tdw-media-bulk" role="toolbar" aria-label={t('tdw_media_selection', 'Selection')}>
      <IconButton icon="x" label={t('tdw_media_clear_selection', 'Clear selection')} onClick={clearSelection} />
      <span className="tdw-media-bulk-count">
        {t('tdw_media_selected_count', '{{count}} selected', { count: selected.length })}
      </span>
      <span className="tdw-media-bulk-actions">
        <Button size="sm" variant="ghost" icon="folder-input" onClick={() => setMoving({ kind: 'media', ids: selectedIds })}>
          <span className="tdw-media-bulk-label">{t('tdw_media_move', 'Move')}</span>
        </Button>
        <Button size="sm" variant="ghost" icon="download" onClick={() => downloadAll(selected)}>
          <span className="tdw-media-bulk-label">{t('tdw_media_download', 'Download')}</span>
        </Button>
        <Button size="sm" variant="ghost" icon="trash-2" className="is-danger" onClick={() => setConfirm({ kind: 'media', ids: selectedIds })}>
          <span className="tdw-media-bulk-label">{t('delete', 'Delete')}</span>
        </Button>
      </span>
    </div>
  ) : null;

  const detailsPane =
    !picker && !phone && showDetails ? (
      <aside className="tdw-media-side" aria-label={t('tdw_media_details', 'Details')}>
        {single ? (
          <PageDetails
            media={single}
            folderName={folderLabel(single.folderId)}
            reload={reload}
            {...detailsActions(single)}
          />
        ) : (
          <div className="tdw-media-side-empty">
            <EmptyState
              size="sm"
              icon={selected.length ? 'layers' : 'info'}
              title={
                selected.length
                  ? t('tdw_media_selected_count', '{{count}} selected', { count: selected.length })
                  : currentName
              }
              body={
                selected.length
                  ? t('tdw_media_bulk_hint', 'Move, download or delete them together from the bar above.')
                  : t('tdw_media_details_hint', 'Select a file to see its details, where it’s used and its alt text.')
              }
            />
          </div>
        )}
      </aside>
    ) : null;

  return (
    <div
      ref={rootRef}
      className={clsx(
        'tdw-ui tdw-media',
        picker ? 'is-picker' : 'is-page',
        !picker && !phone && showDetails && 'has-side',
        (!!selected.length || selecting) && 'has-selection'
      )}
    >
      <div className="tdw-media-bar">
        <MediaBreadcrumbs
          path={searching ? [] : path}
          onOpen={(id) => {
            setSearch('');
            setFolderId(id);
          }}
          drop={drop}
          rootLabel={searching ? t('tdw_media_search_results', 'Search results') : rootLabel}
        />
        <div className="tdw-media-bar-end">
          <label className="tdw-media-search">
            <Icon name="search" size={16} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('tdw_media_search', 'Search media')}
              aria-label={t('tdw_media_search', 'Search media')}
            />
          </label>
          {!picker && (
            <IconButton
              icon="folder-plus"
              variant="secondary"
              label={t('tdw_media_new_folder', 'New folder')}
              onClick={() => setNewFolder(true)}
            />
          )}
          <span className="tdw-media-import">
            <ThirdPartyMediaLibrary onImported={reload} />
          </span>
          {uploadControls}
        </div>
      </div>

      {bulkBar || (
        <div className="tdw-media-filters">
          {!type && (
            <div className="tdw-media-chips" role="group" aria-label={t('tdw_media_type', 'Type')}>
              {kindOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={clsx('tdw-media-chip', kind === option.value && 'is-on')}
                  aria-pressed={kind === option.value}
                  onClick={() => setKind(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
          <div className="tdw-media-filters-end">
            {!picker && (
              <Select
                size="sm"
                aria-label={t('tdw_media_usage', 'Use in posts')}
                options={usageOptions}
                value={usage}
                onChange={setUsage}
                width={160}
              />
            )}
            <Select
              size="sm"
              icon="arrow-up-down"
              aria-label={t('tdw_media_sort', 'Sort')}
              options={sortOptions}
              value={sort}
              onChange={setSort}
              width={160}
            />
            <SegmentedControl
              size="sm"
              label={t('tdw_media_view', 'View')}
              value={view}
              onChange={(v) => {
                setView(v);
                store(VIEW_KEY, v);
              }}
              options={[
                { value: 'grid', label: <span className="pz-sr">{t('tdw_media_grid', 'Grid')}</span>, icon: 'layout-grid' },
                { value: 'list', label: <span className="pz-sr">{t('tdw_media_list', 'List')}</span>, icon: 'list' },
              ]}
            />
            {!picker && phone && (
              <IconButton
                icon="circle-check"
                variant={selecting ? 'primary' : 'ghost'}
                label={t('tdw_media_select_mode', 'Select')}
                aria-pressed={selecting}
                onClick={() => (selecting ? clearSelection() : setSelecting(true))}
              />
            )}
            {!picker && !phone && (
              <IconButton
                icon="panel-right"
                variant={showDetails ? 'secondary' : 'ghost'}
                label={t('tdw_media_details', 'Details')}
                aria-pressed={showDetails}
                onClick={() => {
                  setShowDetails(!showDetails);
                  store(DETAILS_KEY, showDetails ? 'off' : 'on');
                }}
              />
            )}
          </div>
        </div>
      )}

      <div className="tdw-media-body">
        {!picker && !phone && (
          <FolderTree
            folders={allFolders}
            current={searching ? '' : folderId}
            onOpen={(id) => {
              setSearch('');
              setFolderId(id);
            }}
            drop={drop}
            rootLabel={rootLabel}
          />
        )}
        <div className="tdw-media-main">
          {browse}
          {dragging && (
            <div className="tdw-media-dropzone" aria-hidden="true">
              <div className="tdw-media-dropzone-card">
                <Icon name="upload" size={28} />
                <strong>{t('tdw_media_drop_to_upload', 'Drop to upload')}</strong>
                <span>
                  {t('tdw_media_drop_into', 'Into {{folder}}', { folder: currentName })}
                </span>
              </div>
            </div>
          )}
          {picker && (
            <UploadDock
              contained
              items={uploads.items}
              onCancel={uploads.cancel}
              onRetry={uploads.retry}
              onCancelAll={uploads.cancelAll}
              onClose={uploads.clear}
            />
          )}
        </div>
        {detailsPane}
      </div>

      {picker && (
        <div className="tdw-media-picker-foot">
          <span className="tdw-media-picker-count">
            {selected.length
              ? t('tdw_media_selected_count', '{{count}} selected', { count: selected.length })
              : t('tdw_media_pick_hint', 'Pick one or more files')}
          </span>
          {!!selected.length && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                {t('tdw_media_clear_selection', 'Clear selection')}
              </Button>
              {/* the picker always let people delete what they selected */}
              <Button
                variant="ghost"
                size="sm"
                icon="trash-2"
                className="is-danger"
                onClick={() => setConfirm({ kind: 'media', ids: selectedIds })}
              >
                {t('delete', 'Delete')}
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={onCancel}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            disabled={!selected.length}
            onClick={() => onPick?.(selected)}
          >
            {t('add_selected_media', 'Add selected media')}
          </Button>
        </div>
      )}

      {!picker && (
        <UploadDock
          items={uploads.items}
          onCancel={uploads.cancel}
          onRetry={uploads.retry}
          onCancelAll={uploads.cancelAll}
          onClose={uploads.clear}
        />
      )}

      {!picker && phone && single && (
        <TadweenSheet
          open={sheetOpen && !selecting}
          onClose={() => setSheetOpen(false)}
          title={mediaName(single)}
          detent="large"
          className="tdw-media-sheet"
        >
          <div className="tdw-ui">
            <PageDetails
              media={single}
              folderName={folderLabel(single.folderId)}
              reload={reload}
              {...detailsActions(single)}
            />
          </div>
        </TadweenSheet>
      )}

      <MediaLightbox
        items={media}
        index={lightbox}
        onIndex={(i) => {
          setLightbox(i);
          setFocus(i);
          if (!picker) setSelected([media[i]]);
        }}
        onClose={() => {
          setLightbox(null);
          focusItem(focus);
        }}
        onDownload={downloadMedia}
      />

      <FolderNameDialog
        open={newFolder}
        onClose={() => setNewFolder(false)}
        title={t('tdw_media_new_folder', 'New folder')}
        initial={t('tdw_media_untitled_folder', 'Untitled folder')}
        confirmLabel={t('tdw_media_create', 'Create')}
        onSubmit={async (name) => {
          await actions.createFolder(name, folderId);
          folders.mutate();
        }}
      />
      <FolderNameDialog
        open={!!renaming}
        onClose={() => setRenaming(null)}
        title={t('tdw_media_rename_folder', 'Rename folder')}
        initial={renaming?.name}
        confirmLabel={t('tdw_media_rename', 'Rename')}
        onSubmit={async (name) => {
          await actions.renameFolder(renaming!.id, name);
          folders.mutate();
        }}
      />
      <MoveToDialog
        open={!!moving}
        onClose={() => setMoving(null)}
        folders={allFolders}
        rootLabel={rootLabel}
        title={
          moving?.kind === 'folder'
            ? t('tdw_media_move_folder_title', 'Move “{{name}}”', { name: moving.folder.name })
            : t('tdw_media_move_count_title', 'Move {{count}} files', {
                count: moving?.kind === 'media' ? moving.ids.length : 0,
              })
        }
        current={
          moving?.kind === 'folder'
            ? moving.folder.parentId
            : moving?.kind === 'media' && moving.ids.length === 1
            ? media.find((p) => p.id === moving.ids[0])?.folderId ?? folderId
            : folderId
        }
        disabled={
          moving?.kind === 'folder'
            ? (id) => id === moving.folder.id || index.isInside(id, moving.folder.id)
            : undefined
        }
        onMove={async (target) => {
          if (moving?.kind === 'folder') await moveFolder(moving.folder.id, target);
          if (moving?.kind === 'media') await moveMedia(moving.ids, target);
        }}
      />
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={
          confirm?.kind === 'folder'
            ? t('tdw_media_delete_folder_title', 'Delete “{{name}}”?', { name: confirm.folder.name })
            : t('tdw_media_delete_title', 'Delete {{count}} files?', {
                count: confirm?.kind === 'media' ? confirm.ids.length : 0,
              })
        }
        description={
          confirm?.kind === 'folder'
            ? t(
                'tdw_media_delete_folder_body',
                'Only the folder is deleted. What’s inside moves up to {{parent}}.',
                { parent: folderLabel(confirm.folder.parentId) }
              )
            : t(
                'tdw_media_delete_body',
                'They’re removed from the library. Posts that already use them don’t change.'
              )
        }
        confirmLabel={t('delete', 'Delete')}
        onConfirm={async () => {
          if (confirm?.kind === 'media') await deleteMedia(confirm.ids);
          if (confirm?.kind === 'folder') {
            try {
              await actions.deleteFolder(confirm.folder.id);
              if (folderId === confirm.folder.id) setFolderId(confirm.folder.parentId);
              reload();
            } catch (err) {
              fail(err);
            }
          }
        }}
      />
    </div>
  );
};
