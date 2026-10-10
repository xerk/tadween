# Landing competitor notes (Tadween marketing site v3)

Study date: 2026-10-09. Patterns only. No copy, illustrations, logos or brand assets are to be reused.

Method: URL discovery with Firecrawl (map + scrape), then a headless Chromium pass (playwright-core, one browser, one page at a time) at 1440x900 desktop (DPR 1) and 390x844 phone (DPR 2, isMobile). Pages were scrolled to the bottom before capture and clipped at 12,000 px (desktop) / 10,000 px (phone). Metrics were read from computed styles.

Artifacts (scratchpad, not committed):
- Script: `/tmp/claude-1000/-home-xerk-code-xerk-postize/e64a9089-1afb-488b-9f39-f3186d04db31/scratchpad/landing-v3/shoot-competitors.mjs`
- Screenshots + `metrics.json`: `.../scratchpad/landing-v3/competitors/`
- Motion probe: `.../scratchpad/landing-v3/probe-motion.mjs`

How to read the numbers:
- "Container" is the outer max-width and the inner content width (outer minus side padding), from centred elements and computed `max-width`.
- "Section pad" is the computed top/bottom padding of top-level sections. Where a site puts padding on inner wrappers (Hootsuite, Publer, Metricool, SocialBee), the computed value is 0 and I estimated it from the screenshot. Those cells are marked "est."
- Some h1 readings were wrong because a hidden or visually small h1 came first in the DOM (Buffer, Publer, Metricool home). Those cells are marked "n/r" (not reliable) or estimated from the screenshot.

Capture caveats: Later and SocialBee cookie banners did not always dismiss (they stay in some shots). Scroll-reveal sections on Buffer `/linkedin`, Later home and Sprout `/features/social-media-publishing` show as blank areas in full-page captures. SocialBee `/linkedin-post-scheduler/` rendered unstyled and `/features` returned a bot-check page, so SocialBee is covered by its home and pricing pages only. Typefully home and Publer `/plans` scroll inside an inner container, so their full-page captures are one viewport tall.

---

## 1. Measured summary

| Site | Container outer / inner (desktop) | Section pad desktop / phone | H1 desktop / phone | H2 desktop / phone | Body | Header h | Fonts |
|---|---|---|---|---|---|---|---|
| Postiz (home, channel) | 1360 / 1320 | 90 / 50 | 70 / 40 (800) | 48 / 30 | 18-22 / 18 | 81 / 60 | Plus Jakarta Sans |
| Postiz (agent template) | 1360 / 1320 (tables 1254) | 72 / 48 | 64 / 42 (800) | 36 / 28 | 15-17 | 81 / 60 | Plus Jakarta Sans + mono |
| Postiz (/claude-code/linkedin) | 1360, text 900-1200 | 90 / 50 | 70 / 40 | 48 / 30 | 16-18 | 81 / 60 | same |
| Buffer | 1352 / 1280 (some 1424) | 72 / 35 | n/r (~64 visual) | 57 / 40 (network) | 15.5-18 | 73 / 69 | Stolzl (home), Figtree |
| Later | 1360 / 1200-1280 | 70-96 / 40-70 | 80 / 32 (home), 56 / 40 | 44-56 / 28-34 | 16-24 | 70 | display grotesk, heavy 900 |
| Hootsuite | 1280, text 832 | est. 80 / 0-40 | 48-54 / 32 | 36 / 24 | 16 | 75 / 45 | Montserrat |
| Sprout Social | 1360 / 1312 | 64-80 / 40-64 | 51-57 / 32-43 | 32-43 / 24-32 | 16-21 | 76 / 61 (floating card header) | Proxima Nova |
| Typefully | 1292 wide / 1056, text 768 | 64 / 48 | 44 / 28 | 36 / 26 | 14-16 | 48 | Inter |
| Taplio | 1200 / text 800 | 112-120 / 64 | 60-72 / 40-44 | 46-50 / 28-30 | 15 | est. 56 | custom display + Inter |
| Publer | 1200 | est. 80 | n/r | 56 / 32 | 16-18 | 56 (+ 2 promo bars) | Inter |
| Metricool | 1500 / 1360-1280 | est. 96 | 64 / 28-30 | 56 / 28 | 16-18 | 141 incl. promo bar | Plus Jakarta Sans |
| SocialBee | 1320 / 1140-1200 | est. 96 | 70 / n/r | 40 / 32 | 16 | 68 | Open Sans |

Patterns across the set:
- Content width clusters at 1200-1320 px of inner content. Long-form text blocks are 768-900 px.
- Desktop section padding is 64-96 px for most sites, 112-120 px on Taplio. Phone padding is about 0.55-0.65x desktop (Postiz 90 to 50, Postiz agent 72 to 48, Typefully 64 to 48).
- H1/H2 ratio: H2 is about 0.55-0.7 of H1 on desktop. Phone H1 is about 0.55-0.65 of desktop.
- Every site uses a single sans family. Display weight is 700-900.

---

## 2. Per-site notes

### Postiz (postiz.com)
- Layout: dark (#0e0e0e-like) full-width background, 1320 content. Home sections use 90 px padding. The agent/MCP template is denser: 72 px padding, 36 px H2, 15-17 px body, cards on a slightly lighter surface with 1 px borders and about 16 px radius.
- Product display: the home hero is a gradient panel containing stacked mock UIs (a terminal window and a chat app), not a raw screenshot. Further down are a large YouTube-style video thumbnail, a 2x3 grid of gradient cards ("Via <agent>"), each with a dark mock UI of that agent, and an auto-scrolling stats marquee. The channel page uses alternating left/right gradient cards with illustrated mock UI (calendar, AI assistant, team list).
- Nav: logo, then "AI Agents" (mega), Dev Docs, "Channels" (mega), News, Blog, Pricing, then Log In (outline) and "Start for $0" (filled pill). Both megas are 3-column icon+label grids on a dark rounded panel with no descriptions (`postiz-menu-ai-agents-desktop.jpg`, `postiz-menu-channels-desktop.jpg`). Floating "Discord Support" pill at bottom-right.
- Trust: Product Hunt laurels above the H1, a channel-icon wall (2 rows of 15) under the CTA, a stats marquee, and an "agentic vs classic" toggle that switches the hero.
- Pricing: H1 with monthly/yearly toggle, 4 equal columns with the highlighted plan in a solid brand-purple card with a "Popular" chip, long check lists, then a full comparison matrix (row per feature, check/cross/number).
- Channel page (`/channels/linkedin`) order: centered hero with a channel chip and floating UI fragments on both sides, then a 2x2 benefit card grid, a centered intro H2, 5 alternating feature rows (gradient card, text on one side and mock UI on the other), and an FAQ accordion.
- RTL: none. No hreflang.
- Motion: home has a horizontal stats marquee and a loop video. Agent pages float the hero icon tiles (`muse-float` CSS keyframes, 10 tiles).

### Buffer
- Layout: warm off-white background with faint grid lines in the hero, 1280 inner. 72 px section pad, 35 px on phone.
- Product display: real UI crops placed on flat pastel colour tiles (pink, green, yellow, blue), slightly overflowing the tile edge. Each 2x2 feature card is image-top, then eyebrow (PUBLISH / CREATE...), H3, text, "Learn more". A dark "MCP · API · AGENTS" panel shows a chat-input mock.
- Nav: Features / Integrations / Made for / Resources (all mega), Pricing, Log in (outline), "Get started free" (green pill). Features: 2-column list of icon, title, one-line description (8 items, "New" badge). Integrations: 3-column CHANNELS list with brand icons, a vertical divider, then a 2-column TOOLS list and a "See all" link. Resources: 2-column title + description list.
- Trust: user count line above a logo strip, a large team photo section, a "transparency" stats row (MAU, customers, team, ARR), a testimonial on the pricing page.
- Pricing: per-channel stepper (– 1 +) plus monthly/yearly toggle above 3 plan cards with a "Recommended" chip. A "machine-readable pricing for AI agents" link. Dark testimonial band, then a comparison table grouped by category with a dark category header row.
- Network page (`/linkedin`) order: split hero (text on a neutral half, product card on a blue half), 4-up icon benefits row, centered H2, alternating feature rows with eyebrow + H3 + text + CTA, resources, testimonials, FAQ.
- Feature page (`/publish`): hero, by-the-numbers stats, connect-accounts icon grid, benefits, 3 feature rows (scheduling, calendar, creation), testimonials, resources, final CTA band, FAQ.
- RTL: none (de, es, fr, it, nl, pt hreflang).
- Motion: logo marquee, small AI-scene animations (spark/fade-up).

### Later
- Layout: cream background with a subtle wavy texture, very heavy display type (900 weight, 80 px home H1). 1200-1280 inner.
- Product display: hero product mock with a play/pause control (looping product video, 568 px), photography, and 3D-ish objects as accents. Feature pages show a video-thumbnail "See it in action" block.
- Nav: audience-based, not feature-based: "For enterprise brands / For creators / For social media managers / Resources", all mega. Resources mega: left icon list (title + one-liner) and a right featured-report card with image. Feature pages add a second sub-nav row of tool tabs under the header ("Explore all our tools": Scheduling, Analytics, AI, Approvals, ...).
- Pricing: 3 plans with "Most popular" on the middle (orange-bordered), annual toggle with savings chip, logos strip above, collapsible comparison matrix grouped by category (accordions), FAQ accordion, purple CTA band.
- Network page (`/linkedin-scheduler`): hero (text + collage), 3-up benefits, a numbered 5-step "how it works" list next to an image, 4 alternating feature rows, single testimonial with portrait, resources grid (blogs/videos), CTA band.
- Feature page (`/social-media-scheduler/`): hero (text + looping UI video), 3-card "everything you need" grid, "See it in action" video split, full-width CTA band, 6-card "explore all tools" grid (cross-links), FAQ.

### Hootsuite
- Layout: white, 1280, text column 832. Very many short sections (18 on home) with alternating image/text rows.
- Product display: lifestyle photo hero with floating AI-chat chips and a "drafted posts" card over it. Feature rows use stylized UI cards (cropped panels, cursor glyphs, orange CTA chips) on soft blobs. No device frames.
- Nav: Products (mega, click), Integrations, Industries, Resources, Pricing, Enterprise, Sign in, "Start your free trial" (blue). Products mega: eyebrow + headline across the top, then 5 product cards in a row (icon, product name, one-line description) and "Explore the whole suite". Chatbot widget bottom-right. "Trending now" ticker bar under the hero.
- Pricing: 4 plans (one "Most popular" grey ribbon), per-user pricing, AI-assistant callout bar, then a comparison table collapsed by product area (accordions), logo strip, FAQ list.
- Network page (`/linkedin`): split hero (UI collage + LinkedIn badge), logo strip, dark band with network icons ("with all your other networks"), centered H2, 7 alternating feature rows, one G2 quote, CTA with illustration.
- Feature page (`/platform/publishing`) order: split hero (UI collage left, H1 + 2 CTAs right), 3-up icon benefits, about 7 alternating feature rows with stylized UI, a 3x3 icon grid of sub-features + CTA, a 4-up product-suite strip, a G2 badge + review carousel, a resources 3-card row, an FAQ list, and a CTA with an image.
- RTL: none (de, es, fr, it, pt).

### Sprout Social
- Layout: black page with white rounded "sheets" (about 40 px radius) for content blocks. The header is a floating white rounded card inset 40 px from the edges. 1360 / 1312.
- Product display: photo hero with floating metric cards (impressions, sentiment chart, AI suggestion card). The feature page uses a sticky scroll tour: the left visual stays pinned while the right column steps through numbered items (01-04) that swap the visual.
- Nav: Platform (mega, click), Solutions, Pricing, Resources, Log in, "Schedule a demo" (outline), "Try for free" (black). Platform mega: 3 labelled columns (Core / Premium / Additional), each item icon + title + 2-line description, plus a grey right rail with plain links (Platform, Integrations).
- Pricing: dark green gradient, 4 plans plus a separate "Essentials" promo card, plan-overview matrix with accordion groups, add-on cards, FAQ.
- Network page (`/integrations/linkedin/`) order: split hero ("Integrations: LinkedIn" eyebrow, H1, CTA, official-partner badge on the left; real app screenshot on blue circle shapes on the right), a tab row of sibling network pages (Overview / Facebook / X / Instagram / LinkedIn / Pinterest), an intro split + 3-up benefits, then 4 grouped rows (eyebrow PLAN & PUBLISH / COLLABORATE / MONITOR / ANALYZE, H2, 3 bold-lead mini paragraphs, "More on X" button, real UI screenshot right), an integrations icon grid, and a CTA. It is the cleanest example of real-UI framing on a network page.
- Feature page (`/features/social-media-publishing/`) order: hero (feature chip + H1), centered H2 intro, sticky-scroll tour (4 numbered items), CTA band, 3-up "more features" cards with UI on tinted tiles, a list of named sub-features, integrations, FAQ, resources.

### Typefully
- Layout: light, Inter, compact. 1056 content, 768 text, 64 px padding. H1 44, H2 36, body 14-16.
- Product display: the strongest "real UI" approach. The home page is a modal floating over the live, blurred app (sidebar, drafts list, compose toolbar visible behind). Feature cards hold simplified UI fragments. The network page hero is a real LinkedIn-post preview card.
- `/ai-agents` (agent page) order: split hero (H1 + avatar row on the left, chat-thread mock with a structured "draft review" card on the right), 2-column connector cards (ChatGPT, Claude, Notion, Claude Code & Codex with a copyable command, OpenClaw/Hermes with a copyable prompt, Cursor with steps) each with "Add to X" buttons, 3 capability cards, "Which setup should I use?" 2x2 Q&A grid, centered CTA. Total height 3,359 px desktop, about 1/5 of Postiz `/agent`.
- Network page (`/linkedin`): centered hero + real post preview + CTA, logo row, 3 feature cards, 3 alternating feature rows, a testimonial wall (tweets masonry), a 2-column FAQ, CTA.
- Pricing: no h1. Plan cards with toggle, a long table.
- Motion: spin gradient, vertical scroll mask, small WAAPI fades.

### Taplio (LinkedIn-only competitor, closest positioning)
- Layout: white with a light lavender tint, 1200 / 800 text, very generous padding (112-120 px). H1 60-72 with a coloured second line.
- Product display: hero is a working-looking prompt box (input, image button, send) with suggestion chips under it. Feature rows show small browser-chrome cards ("app.taplio.com/...") with clean UI fragments, checklist bullets and an "Explore" pill. Blue stats band (3 numbers). Testimonials auto-scroll.
- `/taplio-linkedin-mcp` order: H1 + copyable MCP URL field + 2 "Try with ChatGPT / Claude" buttons, a Claude chat mock, a works-with row, "what is" split (text + diagram), "add the server" (tabbed video embed), "27 tools" grid of mono-labelled tool chips grouped by category, "talk normally" 2x2 example prompt/response cards, hosted-vs-scraper comparison table, skills/playbooks rows.
- Pricing: 3 plans with "Top choice" middle, monthly/yearly with -% chip, team/agency strip, a 3-step "how your free trial works", a long comparison matrix with category groups, FAQ accordion.
- Motion: CTA border shimmer, typing cursor in the hero prompt, testimonial scroll.

### Publer
- Layout: white, 1200. Two promo bars above the header (sister-product links, "Meet Publer MCP").
- Product display: a large real app screenshot in the hero with a tab row above it (Plan / Schedule / Explore / Collaborate / Analyze) that swaps the shot. Accordion-plus-image "Everything you need" block, stat cards, G2 badges row.
- Nav: Features (mega, click), Free Tools, Integrations, Resources, Pricing, EN language switcher, Log in, CTA. Features mega: 3 columns x 5 items, each item a square icon tile + title + 2-line description, footer "View all features".
- Network page (`/integrations/linkedin`): centered hero with 3 phone/app mockups, channel icon row, then grouped 2-column feature card grids (Plan & schedule, Analytics, Create), each card titled + text + UI image, mobile-app section with QR, "more automations" pastel cards.
- Pricing (`/plans`, captured one viewport tall because the page scrolls inside an inner container): channel icon row above the H1, then 3 configurators in a row (social-accounts stepper, additional-members stepper, Monthly/Yearly segmented control with a "2 months free" chip), then 4 plan cards (Free / Professional "Most Popular" / Business / Enterprise) with differently coloured CTA buttons per tier.
- RTL: none (de, es, fr, it, sq).

### Metricool
- Layout: white with large orange/yellow striped graphic swooshes. 1360 / 1280.
- Product display: a real dashboard screenshot in a dark app frame (tab bar: Analytics, Reporting, Inbox, Planning...) with floating panels (chart, inbox) breaking out of the frame. A tabbed "Planner / Analytics / Reporting / Inbox..." product block. G2 badges, icon marquee.
- Network page (`/linkedin/`): hero with app frame, logo strip, "what successful companies have in common" (checklist + donut chart), tool tabs + numbered steps, network icon marquee, testimonial, dark team band, G2 quotes, mobile section.
- Feature page (`/planner`) order: centered hero + CTA + app-frame screenshot with a floating phone-preview card, a network icon row inside a bordered strip, a striped-graphic statement band, a green logo/CTA panel, "more than a calendar" (screenshot + pill tabs + 6 icon mini-features), a numbered accordion list next to an analytics card, a testimonial carousel.
- Pricing: the longest in the set (20,215 px). 4 plans (Free / Starter / Advanced / Custom) with an annual/monthly toggle, then a product-tab row and a very long matrix grouped by product (Social Media networks, Planner, Analytics, Reporting, Flows, Inbox, ...). Each group has a coloured lime header and repeats the 4 plan CTAs at its end.
- RTL: none (de, es, fr, it, nl, pt, pt-BR). EN switcher in the header.

### SocialBee
- Layout: dark hero with a large app screenshot in a purple frame, then light sections. 1140-1200.
- Product display: real UI screenshots with tabbed "five different tabs" blocks (Content creation, Scheduling, Analytics, Engagement, Collaboration), each tab a text list + image.
- Home includes a pricing teaser (3 plans) and audience tabs (Solopreneurs / Small businesses / Agencies).
- Pricing: dark hero band with annual/monthly toggle, 3 plans (middle "Most popular", yellow CTAs), a "14-day risk-free trial" strip, a long side-by-side matrix with yellow category header rows and network-icon cells, testimonials + logo wall, 4 "why more value" feature cards, a chat-before-buying card, a 2-column FAQ.
- RTL: none.

---

## 3. Navigation / mega-menu structures seen

| Site | Top-level items | Mega style |
|---|---|---|
| Postiz | AI Agents, Dev Docs, Channels, News, Blog, Pricing | Dark panel, 3-col icon + label grid, no descriptions (22 agents / 30 channels) |
| Buffer | Features, Integrations, Made for, Resources, Pricing | Light rounded panel. Features: 2-col icon + title + one-liner. Integrations: Channels 3-col \| divider \| Tools 2-col + "See all" |
| Hootsuite | Products, Integrations, Industries, Resources, Pricing, Enterprise | Full-width panel: eyebrow + headline, 5 product cards in a row, "Explore the whole suite" |
| Sprout | Platform, Solutions, Pricing, Resources | Full-width white sheet: 3 labelled columns (icon + title + 2-line desc) + grey right rail of plain links |
| Later | For enterprise brands, For creators, For social media managers, Resources | Left icon list (title + one-liner) + right featured content card |
| Publer | Features, Free Tools, Integrations, Resources, Pricing, EN | 3x5 grid of icon-tile + title + 2-line desc, footer "View all features" |

Triggers: Postiz, Buffer and Later open on hover. Hootsuite, Sprout and Publer open on click.

---

## 4. Section order templates observed

Feature page (Buffer, Later, Sprout, Hootsuite, Publer combined):
1. Hero: eyebrow/feature chip, H1, one-line sub, primary CTA (+ secondary), product visual on the right or below.
2. Proof strip: logos or user count.
3. 3-4 up benefit cards (icon + title + 1-2 lines).
4. Main feature walkthrough: 3-5 alternating rows, or a sticky-scroll tour (Sprout), or tabs (Publer, SocialBee).
5. "See it in action" video or GIF split (Later).
6. Testimonial (single large quote or wall).
7. Cross-links to other features (card grid).
8. FAQ accordion.
9. Closing CTA band.

Network page (Buffer, Hootsuite, Later, Publer, Metricool, Postiz):
1. Hero with the network badge/icon and a native-looking post preview or app mock in that network's look.
2. Logos or proof.
3. "Works with your other networks" icon row.
4. 4-up benefits.
5. How it works: numbered 3-5 steps (Later).
6. Alternating feature rows specific to the network (formats, best time, analytics, inbox, AI).
7. Testimonial.
8. Resources/guides for that network.
9. FAQ.
10. CTA band.

Pricing page (all):
1. H1, billing toggle with a savings chip (Buffer also has a per-channel stepper).
2. 3-4 plan cards, middle highlighted, CTA under the price.
3. Logos or testimonial band.
4. Comparison matrix grouped into collapsible categories, with a sticky plan header row.
5. Add-ons (Sprout).
6. FAQ.
7. CTA.

---

## 5. Postiz agent page anatomy

### 5.1 Information architecture (four levels)
1. `/agent`: hub ("AI agent social media posting"). Compares about 20 agents and the 3 connection surfaces.
2. `/mcp`: protocol page (what the MCP server is, the capability matrix, connect steps, install reference by client).
3. `/<agent>`: per-agent page (`/claude`, `/chatgpt`, `/cursor`, `/claude-code`, `/codex`, `/gemini`, `/manus`, `/muse`, `/kimi`, `/deepseek`, `/grok-bot`, `/grok-build`, `/hermes`, `/openclaw`, `/nanoclaw`, `/paperclip`, `/perplexity-computer`, `/dots`, `/cue`, `/claude-cowork`). Each has its own accent colour (Claude orange, others purple).
4. `/<agent>/<channel>`: per-agent-per-channel page (for example `/claude-code/linkedin`), with about 25 channels per agent. This is an SEO matrix of several hundred pages.

The "AI Agents" mega lists all agent pages plus "MCP Server" and "AI Agents CLI" (which points to `/agent`). The footer repeats the full list. There is no n8n page on postiz.com: n8n is a footer link to the npm package (and Make.com is an external link).

### 5.2 `/agent` section order (desktop 17,268 px, phone 27,341 px)
1. Hero (full-bleed purple gradient, 1320 container): breadcrumb-like chip (icon + "Postiz for AI agents"), H1 64 px/800 (3 lines, left), a 6-line definition paragraph, 2 CTAs (filled white pill "Start" + outline "View Docs"), a small human-in-the-loop note + "Last updated" date. Right: one large rounded app tile (about 156 px, the agent or terminal glyph) with about 10 white rounded channel tiles floating around it (CSS float keyframes). On phone the icon cluster moves under the CTAs.
2. "Which agents can post": left-aligned H2 36 px + 2-line sub, then a full-width bordered table (Agent / Made by / How it connects / Authentication / Guide link), 20 rows. On phone the table overflows sideways (columns cut), a weak point.
3. "How do agents connect": second table (Surface / Used by / Auth / Media and tools / Learn more), 3 rows.
4. "How do I connect any agent": 3 numbered step cards stacked. Each card is split: left (circle number, H3, paragraph), right (dark code window with traffic-light dots and a filename label: Connect / Authenticate / Prompt). The third window is a plain-text "You: ... / Agent: ..." exchange.
5. Full-bleed purple band, centered H2 48 px: "one account powers every channel". Visual: a radial orbit of about 30 white circular channel icons in 2 rings around a central agent tile (about 900 px tall).
6. "What can an agent do": 3x2 capability card grid (small outlined icon square, H3 about 17 px, 3-line text).
7. "How does the CLI work": a full-width terminal block, then 3 more numbered split step cards (Discovery / Post creation / Management) with code windows.
8. "One command, every platform": one long terminal block.
9. "Can an agent post on a schedule": 2 cards side by side ("From any chat app" with a chat-style code window, "Scheduled & proactive" with a JSON cron config window), then a wide split card: left 6-item checklist ("Why agents work well"), right a SKILL.md code window.
10. Command reference table (mono command chips + descriptions).
11. "Which platforms": grid of 25 linked platform cards (name + one-line capability).
12. FAQ: 10 questions, accordion.
13. Closing CTA ("Start automating") + global "Ready to get started" footer CTA.

### 5.3 `/mcp` section order (14,611 / 23,031 px)
1. Same hero pattern (MCP glyph tile, CTAs swapped: "Read the Docs" first), breadcrumb Home / AI agents / Postiz MCP.
2. "What is a social media MCP server": paragraph + 3x2 capability cards (plain English, 30+ platforms, connect with a link, schedule ahead, images and videos, stays in your account).
3. "What can an agent do through MCP": capability matrix table. Columns: Capability / "What you would ask" (italic example prompt) / Custom MCP link (highlighted column) / ChatGPT connector / Claude directory connector. Yes/No cells, footnote.
4. "How do I connect": 2 big cards side by side. Card 1: "1 Connect", "under a minute" tag, URL in a copy field. Card 2: "2 Ask", "live in Postiz" green dot, chat mock (right-aligned user bubble, left-aligned agent bubble with agent avatar and "via Postiz" + channel icons), "Also try" suggestion chips. Below: a 4-column numbered micro-steps row.
5. 3 per-client cards (ChatGPT / Claude / Claude Code): full-width white "Add to X" button, "Or add it manually" numbered list, JSON or terminal snippet.
6. "Install reference by client": table (Client link / How to connect / Command chip / Auth), about 12 rows.
7. FAQ (about 10).
8. CTA.

### 5.4 `/claude` (per-agent) section order (11,591 / 18,498 px)
1. Hero in the agent's accent gradient (orange for Claude): agent chip, H1, 3 bullet points with coloured dots, CTAs "Add to Claude" (filled) + "Start" (outline), disclaimer, right side a 3D mascot illustration surrounded by floating channel tiles.
2. "How to post in 3 steps": the same 2-card Connect | Ask block (copy field, chat mock, suggestion chips) + a 3-column micro-steps row + a one-line stats note (GitHub stars, channels, price).
3. Accent band with the channel orbit.
4. "Official connector vs custom link": comparison table + recommendation note.
5. 3x2 capability cards.
6. "What is the Postiz MCP": split card (checklist left, code window right).
7. "What can I ask": 4 example cards in a row (eyebrow use-case label in accent colour, channel icons top-right, title, prompt shown in a bordered quote box).
8. "Which platforms": 6-column grid of channel chips (icon + name), 30 items.
9. "Claude vs Claude Code vs Cowork": 3 cards, current page outlined in accent, others linked.
10. "Pricing, security, troubleshooting": 3 cards (the third a checklist).
11. FAQ accordion (first item open).
12. CTA.

### 5.5 `/claude-code/linkedin` (per-agent-per-channel) section order (16,297 / 20,967 px, home-style 90 px rhythm, centered headings)
1. Centered hero: breadcrumb (Home / Claude Code / LinkedIn), H1 with a hand-drawn underline on the agent name, paragraph, 3 buttons (Setup Guide filled, GitHub, "Copy MCP command"), disclaimer.
2. "How to post to LinkedIn from <agent>": one code window ("Setup once, then just ask").
3. "What can it do on LinkedIn": 3x2 cards with purple icon squares.
4. "How does it post": 3 numbered rows, text left and an "Example conversation" code window right.
5. LinkedIn settings reference table (field / type / required / description, mono chips).
6. Common configurations: stacked "Just ask" code windows.
7. Example prompts, then limits and gotchas.
8. What is <agent>, how Postiz works with it, "also works with" cards, cross-post section, account types (personal vs page).
9. FAQ.

### 5.6 Visual density, size and motion
- Visual language: dark surfaces, 1 px borders, about 16 px radius cards, monospace code windows with macOS traffic-light dots and filename labels, tables, and icon tiles. No real product screenshots of the Postiz app anywhere on these pages; the "product" is shown as terminal/chat text. The only illustrative assets are the hero glyph tile, the floating channel tiles, the channel orbit and the per-agent mascot.
- Density: high. 9-11 sections, 11.6k-17.3k px desktop and 18-27k px phone, mostly because of tables and code. Body text is small (15-17 px) and H2 drops to 36 px. Phone tables overflow horizontally.
- Motion: only the hero tile float (CSS `muse-float`, 10 tiles) and FAQ expand. No scroll reveals, no video on `/agent` or `/mcp` (one small looping video on per-agent pages). The home page is richer: stats marquee, loop video, a toggle that swaps the hero.
- Measured: container 1320, section pad 72/72 desktop and 48/48 phone, H1 64/42, H2 36/28, header 81/60.
- Comparison: Typefully `/ai-agents` covers the same ground (connectors, capabilities, which setup, API key) in 3,359 px using cards with inline copy buttons. Taplio `/taplio-linkedin-mcp` adds a copyable URL field in the hero and a tools grid grouped by category.

---

## 6. Trust and social-proof patterns
- Logo strip (grayscale, often a marquee) directly under the hero. Present on all sites except Postiz and Taplio home.
- User counts as a sentence ("N creators...") above the logos (Buffer, Typefully) or an avatar stack (Typefully agents page).
- Third-party badges: G2 badge rows (Metricool, SocialBee, Publer), Product Hunt laurels (Postiz).
- Stats rows: three big numbers (Hootsuite case stats, Taplio blue band, Publer cards, Buffer transparency metrics).
- Testimonials: a single large quote with a portrait (Later, Buffer pricing), a tweet masonry wall (Typefully), auto-scroll carousels (Taplio, Postiz metric cards).
- Human support: Buffer shows a team photo section. Hootsuite and Sprout use AI chat widgets.

## 7. CTA patterns
- Primary CTA is a filled pill or rectangle in the brand accent, repeated in the header (right), the hero, after every 2-3 sections (Hootsuite and Buffer repeat it on each feature row) and in a closing band.
- Email-capture hero CTA (Buffer, Sprout): input + button inline.
- Secondary: "Request a demo" / "Schedule a demo" (enterprise-leaning sites), "View docs" / "Copy MCP command" (agent pages).
- Microcopy under the CTA: no card required, free trial length.

## 8. Arabic / RTL handling
- None of the 10 sites has Arabic or RTL. hreflang sets: Buffer (de, en, es, fr, it, nl, pt), Hootsuite (de, es, fr, it, pt), Sprout (de, en, es, fr, it, pt), Publer (de, en, es, fr, it, sq), Metricool (de, en, es, fr, it, nl, pt, pt-BR), SocialBee (en). Postiz, Later, Typefully and Taplio have none.
- Language switchers: Publer and Metricool put "EN" in the header. Buffer, Hootsuite and Sprout put it in the footer.
- Implication: a fully mirrored Arabic site with native Arabic type would be unique in this category. Nobody else provides a reference implementation, so the RTL rules have to come from us.

---

## 9. What we adopt

1. Container: max-width 1280 px for inner content (1328 outer with 24 px side padding). Text measure 720-800 px for long copy. Wide tables and product shots may use the full 1280. Phone gutter 16 px (inner 358).
2. Section rhythm: 96 px top/bottom on desktop for marketing sections, 64 px for dense reference sections (agent/MCP tables). Phone 56 px (dense 40 px). Hero top padding 120 px desktop, 72 px phone. Separate dense sections with a 1 px divider instead of extra space, as Postiz does.
3. Type scale (desktop / phone): H1 64 / 40, H2 44 / 30, H3 22 / 19, lead 20 / 17, body 17 / 16, small 14. Weight 700 for headings. Arabic uses the same steps with line-height +0.15 and no negative letter-spacing.
4. Header: 72 px desktop / 60 px phone, sticky, logo left, centered nav, right "Log in" (ghost) + primary CTA. No promo bars stacked above it (Publer and Metricool use about 140 px; avoid).
5. Mega-menu: hover on desktop with a click fallback and keyboard support. Four items: Product (2-col icon + title + one-line description, about 8 items, like Buffer Features / Sprout Platform), Networks (LinkedIn featured in a left column with "Profile / Page" sub-links, other channels in a compact 3-col icon + label grid, like Buffer Integrations), AI agents (icon + label grid of connector pages + "MCP server" link, like Postiz), Resources (2-col title + description). Panel max 1040 px, 16 px radius, 1 px border.
6. Feature page template: Hero (feature chip, H1, sub, CTA + secondary, real UI shot) → proof strip → 3-up benefits → 3-4 alternating feature rows, or a sticky-scroll tour for the composer → "see it in action" short loop → testimonial → related features (3 cards) → FAQ (6-8) → CTA band.
7. Network page template: Hero with native-looking LinkedIn post preview rendered in our UI (Arabic and English variants) → proof strip → 4-up benefits → "how it works" numbered 3 steps → network-specific feature rows (formats: text, document carousel, image, video, Page vs profile; best time; analytics) → settings/limits reference table (taken from the Postiz agent-channel pages) → other networks icon row → FAQ → CTA.
8. Agent/MCP page template (lighter than Postiz): Hero with copyable MCP URL field + "Add to Claude / ChatGPT" buttons + chat mock → connector cards (2-col, each with inline copy command) → capability matrix (one table, not two) → 2-card Connect | Ask block with chat mock and suggestion chips → example prompts (4 cards) → FAQ. Target at most about 6,000 px desktop. Tables must reflow to stacked cards on phone; no horizontal overflow.
9. Product-shot framing: real Tadween UI (not illustrations), cropped to the relevant panel, on a flat tinted tile with 24 px radius, slightly overflowing the tile edge (Buffer). Optionally one floating detail card breaking out of the frame (Metricool, Sprout). No device frames except for the phone composer, shown in a minimal phone outline.
10. Code/chat mocks: one code-window component (traffic-light dots, filename label, copy button, mono 13-14 px) and one chat-thread component (user bubble on the reading-end side, agent bubble with avatar and "via Tadween" + channel icons). Both mirror in RTL. Code stays LTR inside an RTL page.
11. Pricing: H1 + monthly/yearly toggle with savings chip → 3 plan cards (middle highlighted with chip) → logos/testimonial band → comparison matrix with collapsible categories and sticky plan header → FAQ → CTA. Currency/price formatting localized (Arabic numerals optional).
12. Trust: logo/proof strip directly under every hero. One stats row (3 numbers) on home. Testimonials as single large quotes. Badges only if real. No fake metric cards.
13. CTA cadence: header + hero + after the main walkthrough + closing band. Show "no card required"-style microcopy under hero CTAs. Secondary CTA on agent pages is "Copy MCP URL".
14. Motion: restrained. Hero product shot fades/slides in once (≤400 ms, transform/opacity only). Logo strip marquee. Sticky-scroll tour on one page at most. Short muted autoplay loops (≤8 s, poster image, paused offscreen). All disabled under `prefers-reduced-motion`. No floating-tile loops.
15. Bilingual/RTL from day one: `dir="rtl"` + `lang="ar"` per route (`/ar/...`), hreflang pairs, logical CSS properties (`margin-inline`, `inset-inline-start`), mirrored layouts for alternating rows, icons that imply direction flipped, a language switcher in the header (not the footer).
16. Reuse at scale: like Postiz's agent × channel matrix, generate network and agent pages from one data file per network/agent (settings table, example prompts, FAQ) so the Arabic and English versions stay in sync.
