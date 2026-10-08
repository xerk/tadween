# Media library

`/media` and the composer's "Insert media" picker share one component, `MediaLibrary`, built like a file browser (Google Drive, Dropbox): folders, grid and list views, filters, selection, drag to move, an upload dock, a details panel and a lightbox. This page lists the pieces, their props and their states, so they can be added to the design system.

Code: `apps/frontend/src/components/tadween/media/*`. Styles: `apps/frontend/src/app/tadween/media.scss` (loaded from `global.scss`). Everything renders inside `.tdw-ui`, so it uses the kit's tokens and primitives (`components/tadween/ui`).

## Data

| What | Endpoint | Notes |
| --- | --- | --- |
| Media, paged | `GET /media?page&limit&search&folderId&type&usage&sort&order` | `folderId` missing lists every folder (what the endpoint always did), `root` lists media in no folder. `type`: `image`, `video`, `gif` (by file extension, the `type` column is never filled in). `usage`: `used`, `unused`. `sort`: `date`, `name`. Each result now also has `fileSize`, `createdAt`, `folderId` and `usedIn` (number of post groups that use it). |
| Folders | `GET /media/folders` | Flat list `{ id, name, parentId, createdAt, mediaCount }`; the tree is built on the client. |
| Create folder | `POST /media/folders { name, parentId? }` | |
| Rename / move folder | `PUT /media/folders/:id { name?, parentId? }` | `parentId: null` moves it to the top. A folder can't go inside itself or its own subfolders (400). |
| Delete folder | `DELETE /media/folders/:id` | Soft delete. Files and subfolders move up to the parent; no media is deleted. |
| Move media | `POST /media/move { ids, folderId }` | `folderId: null` moves them to the top. |
| Rename media | `PUT /media/:id { name }` | Changes the display name (`originalName`), never the file. |
| Used in | `GET /media/:id/usage` | One row per post group: state, date, text excerpt, channels. Matched on the media `path` inside `Post.image`, because the composer stores its own ids there. |
| Alt text | `POST /media/information { id, alt }` | The endpoint the composer's media settings already use. |

Hooks (`media.hooks.tsx`, one SWR call each): `useMediaPages` (`useSWRInfinite`, 40 per page), `useMediaFolders`, `useMediaUsage`, `useMediaSize` (a `HEAD` request for older media whose size was never stored), `useMediaActions` (the mutations), `downloadMedia`.

### Schema

`MediaFolder { id, name, organizationId, parentId?, createdAt, updatedAt, deletedAt? }` and a nullable `Media.folderId`. Additive: every existing media keeps `folderId = null` and shows at the top level. Apply with `pnpm run prisma-db-push`.

## Components

### `MediaLibrary` (`media.library.tsx`)

| Prop | Type | |
| --- | --- | --- |
| `mode` | `'page' \| 'picker'` | `page` is `/media`; `picker` is the composer's modal (`MediaBox`). |
| `type` | `'image' \| 'video'` | Picker only: limits the list and the uploads to one kind (some providers' fields take only one). |
| `onPick` | `(media[]) => void` | Picker: the selection, in the order it was picked. |
| `onCancel` | `() => void` | Picker: Cancel. |

Layout: toolbar (breadcrumbs, search, new folder, import, upload) → filters (type chips, use, sort, grid / list, details) or the bulk bar while several are selected → folder tree (desktop page) · files · details panel (desktop page). The picker adds a footer: count, Clear selection, Delete, Cancel, Add selected media.

States: loading (skeleton tiles or rows), empty library, empty folder, no search results, nothing matches the filters, files being dropped (overlay), uploads running (dock).

Selection:
- Page: click selects one, Ctrl / Cmd + click toggles, Shift + click selects a range, drag on empty space draws a box, Ctrl / Cmd + A selects everything loaded.
- Picker: click toggles (numbered in pick order), Shift + click adds a range.
- Keyboard: arrows move (Shift extends), Space toggles, Enter opens the lightbox, Delete asks to delete, Escape clears.
- Phones (page): tap opens the details sheet; the Select button turns taps into selection and shows the bulk bar.

Moving: drag files (or the selection) onto a folder tile, a breadcrumb or a tree row; drag a folder onto another; or "Move to…".

Uploads: Upload → Upload files / Upload a folder, a drop anywhere on the page (or the picker), or a paste. Files go into the open folder; a dropped or picked folder is recreated with its subfolders.

### `UploadDock` and `useMediaUploads` (`media.upload.dock.tsx`)

`useMediaUploads({ type?, onUploaded, onFoldersCreated? })` returns `{ items, add(entries, folderId), cancel(id), retry(id), cancelAll(), clear(), active }`. It drives Postiz's own uploader (`useUppyUploader`: same endpoints, storage, compression and processing) one batch at a time (up to 5 files and 1 GB), checks type and size per file first so one bad file fails alone, and moves each saved media into its folder.

`UploadDock` props: `items`, `onCancel`, `onRetry`, `onCancelAll`, `onClose`, `contained` (inside the picker instead of the page corner).

Row states: `queued` (Waiting), `uploading` (bytes and a bar), `processing` (R2 normalizer), `done` (size and a check), `error` (reason, Retry), `canceled` (Retry). Header: "Uploading N files" with a total bar, "All done, N uploaded" or "N failed, M uploaded"; collapse / expand; Cancel all while running, Close when finished. Bottom right on desktop (bottom left in RTL), a bar along the bottom on phones.

### Folders (`media.folders.tsx`)

| Component | Props |
| --- | --- |
| `MediaBreadcrumbs` | `path`, `onOpen(id \| null)`, `drop?`, `rootLabel`. Long paths keep the root and the last two folders. Every crumb is a drop target. |
| `FolderTree` | `folders`, `current`, `onOpen`, `drop?`, `rootLabel`. Desktop page only; opens the path to the current folder. |
| `FolderNameDialog` | `open`, `onClose`, `title`, `initial?`, `confirmLabel`, `onSubmit(name)`. New folder and rename. |
| `MoveToDialog` | `open`, `onClose`, `folders`, `title`, `current`, `disabled?(id)`, `onMove(folderId \| null)`, `rootLabel`. Browse with breadcrumbs, pick, Move here. |
| `useFolderIndex(folders)` | `{ byId, children, path(id), isInside(id, ancestor) }` |
| `useDropTarget(target, drop?)` | `{ over, props }` to spread on anything that accepts dragged media or folders. |

### Items (`media.items.tsx`)

| Component | Notes |
| --- | --- |
| `MediaTile` | Grid tile: thumbnail (video first frame or stored thumbnail), GIF badge, video length, check (pick number in the picker), Preview button, name, "In N posts". States: hover, selected, focused. |
| `MediaRow` | List row: check, thumbnail, name, type, size, dimensions, uploaded, used in. Columns drop by the width the list gets (container query): below 860px type and dimensions go, below 520px only the name stays with type and date under it. |
| `FolderTile` | Grid tile or list row for a folder: name, item count, ⋯ menu (Rename, Move to…, Delete). |
| `MediaThumb` | `<img>`, `<video>` or a file icon; reports width, height and length once loaded (dimensions are not stored). |
| `ItemMenu` | ⋯ button with a kit popover menu. |

### Details and lightbox (`media.details.tsx`)

`MediaDetails`: large preview (image opens the lightbox, video plays inline), inline rename (Enter saves, Escape cancels), Download, Copy link, Move, Delete, facts (type, size, dimensions, length, uploaded, location), alt text, and "Used in N posts" (each row opens the post in the calendar's editor). A side panel on desktop, a bottom sheet (`TadweenSheet`) on phones.

`MediaLightbox`: full-screen viewer with previous / next (buttons and arrow keys, mirrored in RTL), zoom for images, download, Escape to close.

## Accessibility and motion

The file area is a `listbox` with `aria-multiselectable`; tiles and rows are `option`s with roving focus. Icon buttons have labels. The dock's title is a live region. Animations (dock and bulk bar rising, folder drop highlight) stop under `prefers-reduced-motion`.

## Not included

- Storage usage: `Media.fileSize` is only filled in by the R2 normalizer, so existing media have no size. A total would be wrong, so there is no indicator yet. Sizes shown in the UI fall back to the file's `Content-Length`.
- Sorting by size or type: sizes aren't stored and the type is only known from the extension, so the list sorts by date and name.
- Uploader name: `Media` doesn't record who uploaded a file.
- Documents filter: the uploader only accepts images and MP4 videos.
- Bulk download is one download per file; there is no zip.
