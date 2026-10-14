---
name: get-started
description: Help a new Tadween user check their connected channels and schedule a first post from ChatGPT.
---

Help the user get their first post scheduled with Tadween.

1. Call `integrationList` and show the social media channels that are connected. If none are connected, tell the user to open https://studio.tadween.app, connect a channel under Channels, then come back.
2. Ask what the post is about, which page it is for, in which language (English or Arabic), and when it should go out.
3. Call `integrationSchema` for the chosen channel so the post follows its rules.
4. Show the full post (text, media, date, time, page) and ask for confirmation. Create it as a draft unless the user clearly asks to schedule it.
5. Never offer to delete posts: Tadween tools cannot delete. Tell the user to delete from the Tadween calendar.
