# Analytics and Agent

The Tadween versions of `/analytics` and `/agents`. Both pages keep Postiz's data and runtime and replace only the screens. Postiz's own components (`components/platform-analytics/*`, `components/agents/*`) stay in the tree untouched, apart from one `export` on `LoadMessages`, so upstream syncs merge cleanly.

| Page | Tadween component | Styles |
| --- | --- | --- |
| `/analytics` | `components/tadween/analytics/analytics.component.tsx` | `app/tadween/analytics.scss` |
| `/agents/new`, `/agents/[id]` | `components/tadween/agent/agent.workspace.tsx` (layout), `agent.chat.tsx` (page) | `app/tadween/agent.scss` |

Both are wrapped in `TadweenScope` (`.tdw-ui`), so they use the kit's token aliases (`--primary`, `--card`…) and nothing leaks into Postiz screens. Light/dark come from the `--tdw-*` tokens; RTL uses logical properties; motion is turned off under `prefers-reduced-motion`.

## Data

| What | Request | Notes |
| --- | --- | --- |
| Channels | `GET /integrations/list` (`useIntegrationList`) | Same SWR key as the calendar. |
| Network numbers | `GET /analytics/:integration?date=N` | Unchanged Postiz endpoint. Only requested for a channel that has an analytics API, is enabled and doesn't need reconnecting. |
| Posts published | `GET /analytics/posts/published?days=N[&integration=id]` | **New.** `GetPublishedPostsDto` → `AnalyticsController.getPublishedPosts` → `PostsService.getPublishedPostsSummary` → `PostsRepository.getPublishedPosts` / `countPublishedPosts`. Org-scoped; top-level `PUBLISHED` posts of non-deleted channels. Returns `{ days, total, previous, posts }`: exact counts for the period and the period before, and up to 500 newest posts as `{ id, publishDate, releaseURL, excerpt, integration { id, name, picture, providerIdentifier } }` (plain-text excerpt, 280 characters). |
| Saved chats | `GET /copilot/list`, `GET /copilot/:id/list` | Unchanged; SWR key `threads` as before. |
| Agent runtime | `POST /copilot/agent` (CopilotKit single endpoint, agent `postiz`) | Unchanged, including the `manualPosting` action (`Hooks`) and the `[--Media--]` / `[--integrations--]` blocks the composer appends to each message. |

The ranges each network answers for (`ANALYTICS_RANGES` in `analytics.hooks.tsx`) are Postiz's per-identifier lists moved as-is. A network that isn't listed has no analytics API and shows "Posts only".

## Reusable pieces

### `KpiTile` (`analytics.parts.tsx`)

One number with its label, an optional change against the previous period and a sparkline.

```tsx
<KpiTile label="Posts published" value="50" delta={12.5} deltaLabel="vs the 30 days before" trend={[1, 3, 2, 5]} />
```

`delta` is a percentage; pass `null` when the data can't say (it is never invented). `loading` renders the skeleton.

### `ChartCard` + `TadweenChart` (`analytics.parts.tsx`, `analytics.chart.tsx`)

A titled card with a total, around a chart.js area or bar chart. Colours come from `--tdw-*` and update when `<body>` switches theme; animation is off under reduced motion; whole-number data gets whole-number ticks. Pass a memoised `format`.

```tsx
<ChartCard title="Impressions" total="92,356">
  <TadweenChart points={[{ label: '3 Oct', value: 120 }]} format={formatCount} label="Impressions" />
</ChartCard>
```

### `RangePicker` (`analytics.parts.tsx`)

Segmented presets plus "Custom" (a popover asking for "the last N days", clamped to `max`).

```tsx
<RangePicker presets={[7, 30, 90]} max={90} value={days} onChange={setDays} />
```

### `ChannelList` (`analytics.parts.tsx`)

"All channels" plus each channel with its network mark and status: up to N days, posts only, reconnect needed, finish setup, disabled. On phones it becomes a scrolling row of chips.

### `ChatThreadList` (`agent.workspace.tsx`)

New chat, search and the saved chats. Used in the desktop rail and in the phone sheet (`TadweenSheet`).

### `ChatBubble` (`agent.parts.tsx`)

The user's message: text (escaped, `dir="auto"`), attached images and videos as thumbnails, the channel block dropped. The assistant side reuses CopilotKit's `AssistantMessage` (markdown, copy, regenerate) behind a Smart (Papyrus gold) mark.

### `ToolCard` (`agent.parts.tsx`)

One card per tool the agent runs, registered once with `useDefaultTool`. Known tools get a sentence ("Scheduled 3 posts", "Checked your channels"…); the scheduling tool also lists each post (channel, local date, text, preview link) and an "Open in calendar" button for that week. Unknown tools show their name and the raw input/output under "Details".

### `ChannelContextPicker` and `SuggestedPrompts` (`agent.parts.tsx`)

The composer's channel picker (one row of network marks and a count, never an avatar stack; customers as quick filters) and the empty-chat greeting with four LinkedIn-first prompts in the UI language. A prompt fills the composer; it doesn't send.

## States

| Page | State | What shows |
| --- | --- | --- |
| Analytics | No channels | Empty state with "Go to the calendar to add channels". |
| Analytics | Network without an API (e.g. LinkedIn profile) | Banner "No analytics from this network"; Tadween's own numbers still show. |
| Analytics | `refreshNeeded` / `inBetweenSteps` / `disabled` | Card with Reconnect (Postiz's refresh flow) or a link to the calendar. |
| Analytics | Network returned `[]` | Postiz's "needs to be refreshed" message with Refresh Channel. |
| Analytics | Request failed | "Couldn't load … analytics" with Try again and Reconnect. |
| Analytics | Loading | Skeleton tiles and charts. |
| Agent | No OpenAI key (`ai.available` false) | Empty state; admins also see the three steps to turn it on. |
| Agent | Empty chat | Greeting and suggested prompts. |
| Agent | Running | "Thinking…", the send button becomes Stop, tool cards spin until done. |

## Not done

- Rename and delete chats: the backend has no endpoints for them.
- Deltas for network metrics only show when the network reports `percentageChange`; Postiz's providers mostly send 0, so most tiles show none.
- A per-network breakdown of network metrics on "All channels" (it would call every network's API); the breakdown counts posts published from Tadween.
