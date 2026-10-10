# AI tool pages: Postiz layout breakdown and what changed on ours

Studied 2026-10-10: https://postiz.com/claude, /chatgpt, /cursor, with /claude-cowork and /dots for the
pattern. Full-page captures at 1440 and 390 (Playwright, headless Chromium), plus a Firecrawl scrape of
each page for structure. Only the layout, the section order, the density and the component types are
taken from here. No copy, images, illustrations, logos, colours tied to a vendor, or brand assets are
reused: the words, the chat mock, the orbit and the one screenshot on our pages are Tadween's own.

## 1. The page template

Every Postiz AI-tool page is the same template with per-tool data. Dark theme only. Content sits in a
container of about 1200px with 30px gutters at 1440 (16px at 390). Headings are a geometric grotesk;
H1 about 64px, H2 about 40px (H2s are mostly questions), H3 about 24px, body 15–16px. Cards have a 1px
hairline border, about 20px radius and a slightly lighter fill than the page. Full-bleed colour appears
three times: the hero, the channel orbit and the closing CTA. Sections are separated by a hairline rule
and about 80–100px of space. Page height: /claude 11.6k px, /chatgpt 11.4k, /cursor 13.6k at 1440.

| # | Section | Layout and content |
|---|---|---|
| 1 | **Hero** (full-bleed brand gradient band) | Two columns. Left: eyebrow chip (tool glyph + "Tool + Postiz"), H1 (2–3 lines), 3 bullet points with square markers, two buttons (solid white "Add to Tool" and outlined "Start for $0"), then a small-print paragraph: one-line definition, "keep a human in the loop", "Last updated", links to sibling tools. Right: a 3D mascot poster with about 10 floating platform icons in white rounded tiles. |
| 2 | **How do I connect …? / How to … in N steps** | Left-aligned H2 + lead (about 60% width). Two equal cards side by side. Card 1 "Connect": numbered badge, time estimate on the right ("under a minute"), H3, text, a dark code window (three dots, label, Copy pill, monospace URL or command), fine print (plans, "no API key", alternative route). Card 2 "Ask": numbered badge, green "live in Postiz" status, H3, text, a framed chat mock (user bubble on the right, assistant reply with avatar, "via Postiz" + platform icons), "Also try" chips. Below: a row of 3–5 numbered steps (small text, circled numbers). Then a one-line stats strip. |
| 3 | **Channel orbit** (full-bleed gradient) | Centred H2 + lead; the tool's logo in a big white circle, with about 30 platform icons in two concentric rings joined by faint circles. All HTML. |
| 4 | **Comparison table** (/claude: official vs custom link; /chatgpt: official app vs custom MCP; /cursor: a 4-column route table, which /cursor places before the orbit) | Left H2 + lead, a rounded table card (first column bold labels, two or three value columns), a recommendation line under it. Scrolls sideways on phones. |
| 5 | **What can Tool do with Postiz?** | Left H2 + lead; 6 cards in a 3×2 grid (/cursor 9): small icon tile, title, 2–3 lines. |
| 6 | **What is the Postiz MCP?** | Left H2 + lead; one wide card split in two: left H3 + text + 5 check bullets, right a dark code window listing the connection and the tools. "Read more" line under it. |
| 7 | **What can I ask Tool to post?** | Left H2 + lead; 4 cards in a row: a coloured category label with platform icons on the right, an H3, then the prompt in an inset quote box. |
| 8 | **Which platforms can Tool post to?** | Left H2 + lead; 30 linked tiles in a 6-column grid (icon + name); a fine-print line. /cursor uses 25 cards with a one-line description each. |
| 9 | **Tool vs sibling** | /claude: 3 cards (this page highlighted with an accent border, the other two linked). /chatgpt and /cursor: a 2-column table, then a link line. /chatgpt adds a 21-card "Other AI agents" grid (logo, name, one line). |
| 10 | **Pricing, security, troubleshooting** (/claude; /dots has troubleshooting cards) | 3 cards: cost (+ link to pricing), how access is secured, "Something not working?" with 3 check bullets. |
| 11 | **FAQ** | Left H2; one bordered accordion card with 9–10 questions, the first open, a circular plus/close icon. FAQPage JSON-LD mirrors it. |
| 12 | **Related line** | One fine-print line of internal links and "Last updated". |
| 13 | **Closing CTA** | Rounded gradient card: H2, one-line sub, the same two buttons, mascot on the right. |
| 14 | Site pre-footer and footer | Shared across the site. |

Extra blocks on the longer pages (/cursor, /claude-cowork): code panels ("From the Agent panel",
"Parallel tasks"), "Why agents love Postiz" split card, a 3-card "Can it run on a schedule?" row.

**Phone (390):** everything goes to one column. The hero visual drops under the buttons; the two connect
cards stack; the step row stacks; the orbit shrinks in place; tables keep their columns and scroll
sideways (on /claude-cowork the page itself scrolls sideways at 390, scrollWidth 1196: a bug, not
copied). Feature, prompt and platform grids become one or two columns.

**Motion:** light. Cards fade up as they enter; the FAQ opens with a height animation; nothing loops
except the hero poster's subtle float.

## 2. What our pages were (localhost:4500, before this change)

About 6.9k px at 1440, light by default: breadcrumb and hero (chat mock on the right, no bullets, no
band), a centred "Connect in N steps" panel, 6 flat prompt items, a plain 3×2 can-do list, 6 channel
tiles, a 3-item security list, a 7-question FAQ, 2 related client cards and the CTA.

## 3. Differences found (Postiz → ours before)

1. No full-bleed tinted hero band, no bullet list, no small-print definition / human-in-the-loop / last checked line.
2. The chat mock sat in the hero only; there was no Connect card + Ask card pair.
3. Steps were a single centred panel, not a code card plus a row of numbered steps.
4. No comparison table.
5. No channel orbit band.
6. "What it can do" was a borderless check list, not 6 cards.
7. No "What is the MCP server?" split card with a tool list.
8. Prompts were 6 flat one-liners, not 4 categorised cards with channel icons.
9. Only 6 channel tiles, not the full grid of networks.
10. No "Tool vs sibling" section.
11. Security was a 3-item list; no pricing / security / troubleshooting cards.
12. FAQ had 7 questions, not 9–10, and was centred and narrow.
13. No related-links line with the last-checked date.
14. The closing CTA had no visual.
15. Section headings were centred; Postiz left-aligns them (except the orbit).
16. Page density and length were about 60% of Postiz's.

## 4. Our rebuild (same order, our words and visuals)

| Postiz section | Ours |
|---|---|
| Hero band with mascot | Hero band in Tadween's Nile gradient (same for every tool, never the vendor's colour), eyebrow "Tool + Tadween" with a neutral glyph, 3 bullets, "Start free trial" + "See the N steps", small print. Visual: the HTML chat mock of the tool talking to Tadween, with our channel icons floating around it. |
| Connect + Ask cards, step row | Same. The code window holds the real address or mcp.json block; the Ask card is a compact chat mock with "via Tadween"; the step row is the full, vendor-checked step list. |
| Orbit | Tadween logo in the centre, our channel icons in two rings, each linked to its channel page. |
| Comparison table | Per tool, honest: Claude plans (who can add a custom connector), ChatGPT plans (who can schedule: write actions), Cursor sign-in vs API key. Cursor's key method shows its own steps and snippets under the table. |
| 6 capability cards | The agent's real tools (same list as /ai-agent) and the "can't delete or rewrite" note. |
| What is the MCP? | Split card: how the tool uses Tadween (5 points) and a code window with the real address and the real MCP tool names. No clipping (it depends on server config). |
| 4 prompt cards | LinkedIn-first, one in Egyptian Arabic. |
| Platforms grid | Every network the app publishes to (20 with icons and links, plus the rest by name), no "30+". |
| Tool vs sibling | Claude vs Claude Code vs Cowork; ChatGPT vs Codex; Cursor vs Claude Code. Siblings without a page link to /ai-agent#clients. |
| Pricing, security, troubleshooting | 3 cards, no prices quoted (they are placeholders), troubleshooting per tool. |
| FAQ (9–10) | 10 per tool, FAQPage JSON-LD. |
| Related line | Links to /ai-agent, the other tool pages, channels and pricing, with the last-checked date. |
| Closing CTA with mascot | Nile card with the one real app screenshot (the calendar preview, light and dark). |
