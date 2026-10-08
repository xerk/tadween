# Board

A Jira-style board of columns and cards. In the app it is the calendar's **Board** view
(`/launches?display=list`); the pieces are generic and can be used for any column-of-cards screen.

- Code: `apps/frontend/src/components/tadween/board/`
  - `board.tsx`: `Board`, `BoardColumn`, drag and drop, FLIP motion
  - `board.card.tsx`: `BoardCard`
  - `board.toolbar.tsx`: `BoardToolbar`
  - `posts.board.tsx`: `PostsBoard`, which wires the pieces to the calendar's posts
- Styles: `apps/frontend/src/app/tadween/board.scss` (Tadween `--tdw-*` tokens only)
- Render the pieces inside a `.tdw-ui` scope so the kit controls (Select, SegmentedControl, IconButton) are styled.

## Board

Lanes side by side. A lane scrolls vertically on its own, and the row scrolls sideways when it is wider than the screen.
On phones (`isPhone`) the lanes become a pager that snaps one lane at a time, with a tab switcher above it. You can
swipe between lanes or tap a tab. In RTL the lane order mirrors.

| Prop | Type | Notes |
|---|---|---|
| `lanes` | `BoardLane<T>[]` | `{ id, title, tone?, icon?, items, empty? }`. `items` are `{ id, draggable? }` plus your own fields |
| `renderCard` | `(item, lane) => ReactNode` | Usually a `BoardCard` |
| `label` | `string` | Accessible name of the board and of the phone tab list |
| `loading` | `boolean` | Shows shimmer skeleton cards in each lane |
| `isPhone` | `boolean` | One lane at a time, tabs, swipe |
| `collapsed` / `onToggleCollapse` | `string[]` / `(laneId) => void` | Desktop only. A collapsed lane is a 46px rail with its name written vertically |
| `canDrop` | `(itemId, from, to) => boolean` | Which moves are allowed. Without it every move is allowed |
| `onDrop` | `(itemId, from, to) => void` | Called after an allowed drop |
| `deniedHint` | `(itemId, from, to) => string \| undefined` | Shown at the foot of a lane that refuses the dragged card |

**Drag and drop** uses pointer events, so it works with a mouse, a pen and touch. A mouse lifts the card after 5px of
movement. On touch, a long press (320ms) lifts it, and a finger that moves before then scrolls or swipes as usual.
Escape cancels. Lanes near the edges auto-scroll. A card can be dropped on a phone tab.

Lane drop states (`data-drop` on `.tdw-board-col` and `.tdw-board-tab`):

| State | Meaning | Look |
|---|---|---|
| `idle` | No drag | Default |
| `origin` | The lane the card came from | Default, with a dashed placeholder where the card was |
| `allowed` | Accepts the card | Nile inner outline |
| `over` | Accepts, pointer on it | Nile tint and a 2px outline |
| `denied` | Refuses the card | Dimmed, with the hint |
| `refused` | Refuses, pointer on it | Red tint and the hint in red. The card flies back on release |

**Motion** (all of it is skipped under `prefers-reduced-motion`):
- FLIP. Cards glide to their new place when they change lane or a filter reflows them (Web Animations API, 380ms).
- Cards rise in on first paint with a light stagger. New cards rise in and removed cards fade and shrink out.
- Drag lift: the card scales to 1.035, tilts 1.5deg (mirrored in RTL), gets a large shadow and leaves a placeholder.
- A lane count ticks when its number changes.

## BoardColumn

Used by `Board`. You can also render it on its own.

| Prop | Type | Notes |
|---|---|---|
| `id` | `string` | Drop target id (`data-board-drop`) |
| `title` / `icon` | `ReactNode` | `icon` replaces the colour dot (for example a channel avatar) |
| `tone` | `'draft' \| 'scheduled' \| 'published' \| 'failed' \| 'neutral'` | Dot colour: muted, Nile, success, destructive, input grey |
| `count` | `number` | |
| `collapsed` / `onToggleCollapse` | | |
| `dropState` / `deniedHint` | | See the table above |
| `active` | `boolean` | Current lane on phones |

## BoardCard

| Prop | Type | Notes |
|---|---|---|
| `tone` | as above | Accent on the leading edge, tint of the time chip |
| `channels` | `{ id, name, picture?, identifier }[]` | Separate marks in a row, never stacked. The 5th one and later become "+N". One channel also shows its name. The network badge comes from `/icons/platforms/{identifier}.png` |
| `text` | `string` | Up to 3 lines (1 in compact). Uses `dir="auto"`, so Arabic reads right to left |
| `when` / `whenTitle` | `string` | Time chip and its tooltip |
| `tags` | `{ name, color? }[]` | Labels tinted with the tag colour |
| `customer` | `string` | |
| `error` | `string` | Only for `tone="failed"`. Falls back to a generic message |
| `badge` | `ReactNode` | Extra mark, for example how the post was created |
| `quickActions` | `ChipAction[]` | Buttons that appear on hover or focus |
| `actions` | `ChipAction[]` | Everything, in the ⋯ menu. On touch screens only ⋯ shows |
| `onOpen` / `openLabel` | | Click, or Enter while the card is focused |
| `density` | `'comfortable' \| 'compact'` | |

States: default, hover (lifts 1px with a medium shadow and shows the quick actions), focus-visible (ring), dragging
(ghost) and placeholder.

## BoardToolbar

| Prop | Type | Notes |
|---|---|---|
| `search` / `onSearch` | `string` | Escape clears it. The field widens on focus |
| `filters` | `BoardFilter[]` | `{ key, label, icon, value, options, onChange, emptyValue? }`. Each one is a kit `Select`, highlighted while it filters |
| `groupBy` / `groupByOptions` / `onGroupBy` | | |
| `period` / `onPeriod` | `'week' \| 'month'` | |
| `onPrevious` / `onNext` | | Arrows next to the period. Shown on phones only |
| `density` / `onDensity` | | |
| `summary` | `string` | For example "32 posts" |
| `onClear` | `() => void` | Shows "Clear filters" when set |

## Posts board rules (PostsBoard)

- Data comes from the calendar's range request (`GET /posts`) for the week or month shown. The cards are the same
  posts the week and month views show.
- Status columns map to `Post.state`: Drafts = `DRAFT`, Scheduled = `QUEUE`, Published = `PUBLISHED`,
  Failed = `ERROR`. There is no in-progress state, so there is no "Publishing" column.
- One card per post group and state, so a multi-channel post is one card with several channel marks.
- Group by: Status (default), Channel (one lane per shown channel), or Day (one lane per day of the period).
  Dragging only works when grouped by Status.
- The only allowed move is **Failed → Scheduled**. It sends `PUT /posts/:id/date { action: 'schedule' }`, the same
  request as dropping a failed chip on the calendar. The time is the post's own time if it is still ahead, otherwise
  the channel's next free slot (`GET /posts/find-slot/:integrationId`). A dialog confirms the time first, because
  no endpoint can put a post back to failed. Every other move has no endpoint and shows a hint instead.
- The group-by, density and collapsed-lanes preferences are stored in the cookies `tdw-board-group`,
  `tdw-board-density` and `tdw-board-collapsed`.
