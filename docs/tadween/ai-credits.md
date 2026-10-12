# AI credits and AI models

Every AI action in Tadween is paid with **AI credits**. A workspace has two balances:

- **Plan credits**: `Plan.aiCredits` per month (Admin → Plans; `-1` = unlimited, `0` = AI off).
  They renew every billing month, on the day the subscription started (the same window
  image generation used before).
- **Purchased credits**: one-time top-up packs bought on Billing. They never expire and
  are spent only after the plan credits for the month are gone.

## What each action costs

| Action | Where | Credits | Env override |
|---|---|---|---|
| Write or rewrite a post | composer assistant (`/copilot/chat`), "Separate post" (`/posts/separate-posts`), post generator (`/posts/generator`) | 1 | `AI_CREDITS_WRITE` |
| Agent message | `/agents` (`/copilot/agent`), per message you send | 2 | `AI_CREDITS_AGENT_MESSAGE` |
| Image, standard (`OPENAI_IMAGE_QUALITY` low/medium) | AI image in the composer, Polotno, agent and MCP image tool, generator pictures | 5 | `AI_CREDITS_IMAGE` |
| Image, HD (`OPENAI_IMAGE_QUALITY=high`) | same | 20 | `AI_CREDITS_IMAGE_HD` |

An agent message that makes the agent generate an image costs the message plus the image.
Videos and clipping keep their own counters (`ai_videos`, `clipping_minutes` from the
static plan table); they are not paid with AI credits.

Not metered yet: the RSS auto-post AI rewrite (it runs in the background worker) and the
`/copilot/chat` requests that are not a new user message (thread loading, tool results).

## Behaviour

- Before an AI call the backend checks the balance. When it is lower than the action's
  cost it answers **HTTP 402** with `section: "ai_credits"`; the app opens the paywall
  ("You've used your AI credits this month") with **Buy more credits** and **Upgrade**.
  The agent page checks the balance before sending, because CopilotKit's requests don't
  go through the app's fetch wrapper.
  The composer assistant (CopilotPopup) has no such check yet: when it is refused, the
  popup shows no answer.
- Images and writing that finish inside the request are charged before the call (the
  balance check and the charge run in one serializable transaction, so parallel calls
  can't spend the same credits) and refunded if the call fails. Agent and composer chat messages are streamed, so they are
  charged when the response closes with a non-error status (also when the user stops the
  answer half way).
- Super admins acting as themselves are never refused, but their usage is still recorded.
  Installs without `STRIPE_PUBLISHABLE_KEY` (no billing) are never refused either.
- Fair use: at most `AI_AGENT_MESSAGES_PER_HOUR` (default **60**) agent messages per
  workspace per hour (Nest throttler, Redis storage). The 61st answers HTTP 429 and the
  workspace is blocked until the hour window ends. The agent UI does not show a message for
  the 429 yet; the chat simply does not answer.

## Storage

- `Credits` rows with `type = "ai_credits"`: `credits` = cost of the action, `action`
  (`write`, `agent_message`, `image`, `image_hd`) and `purchased` = the part paid from
  top-ups. Old `type = "ai_images"` rows (one image each) are left as they are; the ones in
  the current month count as one standard image each.
- `AiCreditPurchase`: one row per paid top-up, keyed by the Stripe Checkout Session id, so a
  webhook delivered twice credits once.

## Top-up packs

| Pack | Price | Credits |
|---|---|---|
| `pack_150` | $5 | 150 |
| `pack_350` | $10 | 350 |
| `pack_1000` | $25 | 1,000 |

Packs live in `libraries/nestjs-libraries/src/openai/ai.config.ts`. Payment is Stripe
Embedded Checkout in `payment` mode with inline prices (nothing to create in Stripe). The
webhook endpoint must receive **`checkout.session.completed`** (and, for delayed payment
methods, `checkout.session.async_payment_succeeded`); add them to the endpoint in the
Stripe Dashboard if it only lists subscription and invoice events.

## Models (env)

| Env | Default | Used by |
|---|---|---|
| `OPENAI_AGENT_MODEL` | `gpt-5-mini` | the `/agents` agent (Mastra), thread titles |
| `OPENAI_WRITING_MODEL` | `gpt-4.1-mini` | composer assistant, thread splitting, post generator, image prompt expansion, RSS auto-post, video slides/voice scripts |
| `OPENAI_IMAGE_MODEL` | `chatgpt-image-latest` | all image generation |
| `OPENAI_IMAGE_QUALITY` | `medium` | `low`, `medium` or `high` (HD, 20 credits) |

Before this change the agent ran on `gpt-5.2`, writing on `gpt-4.1`, and images on the
API default quality (`auto`, billed like `high`). Clip picking (`pickClips`) stays on
`gpt-4.1`; it is billed in clipping minutes. `OPENAI_BASE_URL` is honoured by every client
(useful for a local stub).

### Quality check before launch (owner)

The defaults were not tested against a real model: the local stacks have no OpenAI key.
With a key set, compare old and new models on Arabic before relying on the defaults:

1. Agent, Arabic: "اكتب منشور لينكدإن عن إطلاق منتجنا" and a scheduling request, with
   `OPENAI_AGENT_MODEL=gpt-5.2` and then the default. Check grammar, tone, dialect, and that
   tools (channels, schedule, image) are still called correctly.
2. Writing: the composer assistant on an Arabic post (rewrite, shorten, change tone) with
   `OPENAI_WRITING_MODEL=gpt-4.1` vs the default.
3. Thread splitting of a long Arabic post (keeps the wording, splits at sentence ends).
4. Images: the same prompt at `medium` vs `high`; check Arabic text in images is avoided or legible.
5. If the mini models are not good enough for Arabic, set the env to a stronger model
   (credits stay the same; only the cost per credit changes).
