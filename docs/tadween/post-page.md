# Public post page

`/p/:id` is the link Tadween gives out to show a post to a client or reviewer ("Preview" in the calendar and on Today opens it with `?share=true`). It is designed as the permalink of a post on a social network, because Tadween may grow into one later. Today it shows one post, lets anyone comment on it, and shows how it will look on the network. Nothing on the page posts to a network.

## What the page shows

The page reads `GET /public/posts/:id`, the endpoint Postiz already had. It returns the post and its follow-up parts for **one channel**. The server component (`app/(app)/(preview)/p/[id]/page.tsx`) keeps only these fields and passes them to the client:

| Field | Where it shows | Shown before this page |
| --- | --- | --- |
| Channel name, picture, network, `@profile` | Author row, details, network preview | Yes |
| Text and media of every part | Hero card, network preview | Yes |
| `publishDate` | Status chip, details | Yes ("Publication date") |
| `creationMethod` | Details ("Created with") | Yes (badge next to the name) |
| `state` | Status chip, details | **New** |

`state` reads as Published, Draft, or Scheduled for a date. A failed post (`ERROR`) never shows its error: it reads as Scheduled when its date is still ahead and as "Not published yet" once the date has passed. The endpoint also returns `error`, `settings`, `tags`, `releaseURL`, `group` and other columns. The page does not render them and does not pass them to the browser.

The page does not show the post's other channels (posts in the same group) or the customer, because the endpoint doesn't return them. Showing either would expose new data and needs a decision first.

## Building blocks

All of them live in `apps/frontend/src/components/tadween/post-page/`, use the Tadween UI kit (`components/tadween/ui`), and are styled in `app/tadween/post-page.scss` under `.tdw-ui.tdw-pp`.

| Component | File | What it does |
| --- | --- | --- |
| `TadweenPostPage` | `post.page.tsx` | The page: top bar, hero, side column, comments. Wraps everything in `PreviewCommentsProvider`. Also exports the `PublicPost` type. |
| `PostTopBar` | `post.page.tsx` | Brand (Logo + `branding.instanceName` from `useInstanceSettings`), theme toggle (`ModeComponent`), language (`LanguageComponent`), and one call to action: "Open {brand}" when logged in, "Create your own with {brand}" when registration is open, nothing otherwise. In `?share=true` mode it also shows "Share with a client". |
| `PostDetails` | `post.page.tsx` | Channel, status, date, thread length, media count, creation method. |
| `PostCard` | `post.card.tsx` | The hero. Author row with the avatar and a separate network mark (never a badge on the avatar), status chip, text, media, thread parts joined by a rail, `ActionBar`. |
| `PostStatus`, `NetworkMark`, `AuthorAvatar`, `networkName` | `post.card.tsx` | Pieces of the card, usable on their own. `AuthorAvatar` falls back to initials when a network picture link has expired. |
| `LocalDate`, `RelativeTime`, `useLocale` | `post.time.tsx` | Dates in the viewer's language and time zone, rendered after mount (no hydration mismatch). Arabic keeps Latin digits, like Today. |
| `MediaGallery` | `media.gallery.tsx` | 1 / 2 / 3 / 4+ layouts (the fourth tile shows "+N"). A lone video plays in place with native controls; everything else opens the lightbox (Esc closes, arrow keys move, RTL aware, focus returns to the tile). |
| `ActionBar` | `action.bar.tsx` | Like, Comment, Repost, Share. **Comment** scrolls to the comment box and focuses it; **Share** opens the phone share sheet on touch devices and copies the link elsewhere. **Like** and **Repost** are the design for later: disabled, "Coming soon" tooltip, no counts. |
| `CommentThread`, `focusComments` | `comment.thread.tsx` | The comments section. It renders the existing `CommentsComponents`, so endpoints and rules are unchanged: a guest gives a name (and passes reCAPTCHA when it is configured), a member of the post's team posts as themselves and can resolve threads, and selecting text in the post starts an anchored comment. |
| `NetworkPreview` | `network.preview.tsx` | "How it will look on …": one tab per channel (one today), a Phone / Desktop switch, and a device frame. |
| `ProviderPostPreview` | `provider.preview.tsx` | Loaded lazily by `NetworkPreview`. Renders the composer's own preview for the network (`CustomPreviewComponent` from the provider, or `GeneralPreviewComponent`) through `IntegrationContext`, the same way `provider-preview/preview.provider.component.tsx` does. It sets the launch store's `current` to the post, because the previews draw the shared draft when it is `global`. |
| `PostPageSkeleton`, `PostUnavailable`, `PostPageError` | `post.page.states.tsx` | Used by the route's `loading.tsx`, `not-found.tsx` and `error.tsx`. A deleted post, a wrong id and a mistyped link all show the same "not available" state, because the API can't tell them apart. |

## Text

`decoratePostContent` (`libraries/helpers/src/utils/sanitize.post.content.ts`) turns bare URLs into links and marks `#hashtags` (any script) in the sanitised HTML. It only wraps text that is already there, so `postContentPlainText` gives the same string before and after and comment anchors keep working. The post text is still rendered by `PostContentClient`. Each paragraph picks its own direction (`unicode-bidi: plaintext`), so an Arabic line in an English post (or the other way round) reads correctly. Links in a post open in a new tab.

## Link previews

`generateMetadata` sets the title to `{brand}: {first line}`, the description to the start of the text, and `og:image` / `twitter:image` to the first picture (or a video's thumbnail). The brand comes from `GET /instance/settings` on the server. The page sets `robots: noindex`, because preview links are shared on purpose and are not meant for search engines. Crawlers such as `facebookexternalhit` and `Twitterbot` get the tags in `<head>`.

## Layout

- Desktop: post and comments on the left, details and the network preview in a sticky column on the right.
- Below 1024px: one column, in the order post, comments, details, preview.
- 560px and below: the brand name and the long call to action collapse, and the status chip moves under the author.
- Light and dark follow the `mode` cookie (the page now mounts `ModeComponent`, so the toggle also works here). English and Arabic come from `translation.json` (`tdw_pp_*` keys).
- Motion: cards rise in, media eases on hover, the lightbox fades and scales. Everything is turned off under `prefers-reduced-motion`.
