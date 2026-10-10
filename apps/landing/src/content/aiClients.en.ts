import type { AiClientsDict } from './types';

// English copy for the AI client pages (/chatgpt, /claude, /cursor). The steps, snippets and
// vendor docs are in lib/aiClients.ts; each method's `steps` here has one line per step there,
// in the same order. Every step restates the vendor's current documentation and the steps in
// Settings → API & MCP. What the clients can do is the agent page's list, which follows the
// MCP tools the backend registers. Client names are their owners' trademarks, written as text.
export const aiClientsEn: AiClientsDict = {
  page: {
    eyebrow: '{name} + Tadween',
    start: 'Start free trial',
    stepsLink: 'See the {n} steps',
    smallPrint:
      'Tadween is a LinkedIn-first social media scheduler. {name} drives it through Tadween’s MCP server, with the same tools as the agent inside the app. Keep a person in the loop and read what it schedules. Steps checked against {name}’s own documentation on 10 October 2026.',
    smallPrintLink: 'Every AI tool that works with Tadween',
    connectTitle: 'How to connect {name} to Tadween in {n} steps',
    connectSub: 'Add, sign in, ask. Tadween is not an app in any AI directory, so you add it to {name} yourself as a remote MCP server. It takes about a minute, and you can remove it at any time.',
    frameOnline: 'Tadween connected',
    frameInput: 'Reply to {name}…',
    connectLabel: 'Connect',
    connectTime: 'about a minute',
    askLabel: 'Ask',
    askLive: 'live in Tadween',
    askTitle: 'Then ask {name} to post',
    askBody: 'Once connected, {name} calls Tadween’s tools when you ask. Scheduled posts go out at their time, even after you close the chat.',
    via: 'via Tadween',
    alsoTry: 'Also try',
    docs: '{name}’s own documentation for these steps:',
    otherMethod: 'With an API key instead',
    orbitTitle: 'One connection reaches every channel you run',
    orbitSub: 'Connect your accounts in Tadween once. From then on {name} can schedule to any of them, and Tadween publishes at the time you set.',
    canTitle: 'What can {name} do in Tadween?',
    canSub: 'The same tools the agent inside Tadween uses, on the channels you connected.',
    mcpTitle: 'What is the Tadween MCP server?',
    mcpSub: 'MCP, the Model Context Protocol, is the open standard AI tools use to plug into other apps. Tadween’s MCP server gives {name} a set of tools for your workspace, so it can read your channels and calendar and schedule posts without you opening the dashboard.',
    mcpCardTitle: 'How {name} uses Tadween',
    mcpCardBody: 'Once Tadween is added, {name} finds its tools on its own and calls them when a request needs them.',
    mcpPoints: [
      'It lists the channels connected to your workspace',
      'It reads each channel’s rules and settings before it writes',
      'It drafts, schedules or publishes, exactly as you asked',
      'It checks your calendar for what is already planned',
      'It works next to {name}’s other tools and connectors',
    ],
    mcpCodeLabel: 'Tadween MCP tools',
    mcpTools: {
      integrationList: 'your connected channels',
      groupList: 'your customers, for agencies',
      integrationSchema: 'each channel’s rules and settings',
      triggerTool: 'live data a channel’s settings need',
      integrationSchedulePostTool: 'draft, schedule or publish a post',
      postsListTool: 'the posts in a date range',
      postSettingsTool: 'change a waiting post’s settings, not its text or time',
      uploadFromUrlTool: 'bring in an image or video from a public link',
      generateImageTool: 'make an image, with your AI credits',
      generateVideoTool: 'make a short video, with your AI credits',
    },
    promptsTitle: 'What can I ask {name} to post?',
    promptsSub: 'Anything you would ask a colleague, in English or Egyptian Arabic. Name the channel, the day and the tone, and {name} does the rest through Tadween.',
    channelsTitle: 'Which channels can {name} post to?',
    channelsSub: 'Every network Tadween publishes to. Connect an account in Tadween once, then ask {name} to post to it by name.',
    channelsNote: 'LinkedIn profiles and pages come first in Tadween. Each network keeps its own limits and settings, and {name} reads them before it posts.',
    thisPage: 'This page',
    helpTitle: 'Pricing, security and troubleshooting',
    costTitle: 'How much does it cost?',
    costBody: 'Connecting {name} costs nothing extra. The MCP connection comes with every paid Tadween plan, and every plan starts with seven days free. Images and videos the agent makes use your plan’s AI credits.',
    costLink: 'Compare plans',
    securityTitle: 'How is access kept safe?',
    securityBody: 'With sign-in, {name} opens a Tadween window and nothing connects until you approve it; no password is shared. A key, where a client takes one, goes in a header or an environment variable, never in a URL. Revoke an app under Settings, Approved apps, or rotate your key under Settings, API & MCP.',
    troubleTitle: 'Something not working?',
    faqTitle: 'Frequently asked questions about {name} and Tadween',
    relatedTitle: 'Other AI tools that work with Tadween',
    allClients: 'See every AI tool',
    relatedLabel: 'Related:',
    updated: 'Steps last checked on 10 October 2026.',
    ctaTitle: 'Let {name} plan your LinkedIn week',
    ctaBody: 'Start a seven-day trial, connect LinkedIn, then connect {name} and ask.',
    sharedFaq: [
      {
        title: 'Is there an official Tadween app for {name}?',
        content: 'No. Tadween isn’t listed in any AI app directory. You add it to {name} yourself as a remote MCP server, with the steps on this page, and {name} uses the same tools as the agent inside Tadween.',
      },
      {
        title: 'Will {name} post without asking me?',
        content: '{name} calls Tadween only when you ask it to, and many clients ask you to confirm each action. It can’t delete posts or rewrite one that is already scheduled. Every post it schedules is on your calendar, where you can edit or remove it.',
      },
      {
        title: 'Will posts go out if I close {name}?',
        content: 'Yes. When {name} schedules a post, Tadween keeps it and publishes it at its time, whether or not the chat is open.',
      },
      {
        title: 'Does {name} see my LinkedIn password?',
        content: 'No. Your social accounts are connected in Tadween, and {name} only talks to Tadween. It never sees your LinkedIn or other social logins.',
      },
      {
        title: 'How do I disconnect {name}?',
        content: 'If {name} signed in, revoke it in Tadween under Settings, Approved apps. If it uses your API key, rotate the key under Settings, API & MCP; the old key stops working right away.',
      },
      {
        title: 'Which Tadween plan do I need?',
        content: 'The MCP connection comes with every paid plan, and every plan starts with seven days free. Images and videos the agent generates use your plan’s AI credits.',
      },
    ],
  },
  kinds: { assistant: 'Chat assistants', coding: 'Coding agents and editors' },
  items: {
    chatgpt: {
      title: 'ChatGPT MCP: schedule LinkedIn posts from ChatGPT | Tadween',
      description: 'Add Tadween to ChatGPT as a custom MCP app, sign in, and ask ChatGPT to write and schedule your LinkedIn posts. Steps, plans and example prompts.',
      h1: 'Schedule LinkedIn and social posts with ChatGPT',
      bullets: ['A custom MCP app in ChatGPT on the web', 'Draft, check and schedule LinkedIn posts by asking', 'Scheduling needs ChatGPT Business, Enterprise or Edu'],
      blurb: 'Custom MCP app, sign in with Tadween',
      methods: {
        oauth: {
          label: 'Sign in (OAuth)',
          how: 'A custom app in ChatGPT on the web',
          steps: [
            'In ChatGPT on the web, open Settings → Apps → Advanced settings and turn on Developer mode. On Business only an admin or owner can do this; on Enterprise and Edu an admin can give you access.',
            'In Settings → Apps click Create. Name it Tadween, choose OAuth for authentication and paste the MCP server URL above.',
            'Click Scan Tools, sign in to Tadween in the window that opens and approve, then click Create.',
            'In a new chat, pick Tadween from the tools menu, or mention it with @.',
          ],
        },
      },
      connect: {
        title: 'Add Tadween as a custom app',
        body: 'Turn on Developer mode, create an app in ChatGPT’s settings with this address and OAuth, then sign in to Tadween when ChatGPT asks.',
      },
      demo: {
        lang: 'en',
        prompt: 'Draft a LinkedIn post for Nile Studio about our open studio night on the 22nd and schedule it for Sunday at 9:00.',
        tools: [
          { tool: 'integrationList', label: 'Found Nile Studio on LinkedIn' },
          { tool: 'integrationSchedulePostTool', label: 'Scheduled 1 post' },
        ],
        reply: 'Done. It goes out on Nile Studio on Sunday at 09:00. Open it in Tadween to change anything before then.',
        posts: [{ net: 'linkedin-page', name: 'Nile Studio', text: 'Nile Studio opens its doors on the 22nd…', when: 'Sun 09:00' }],
      },
      ask: {
        prompt: 'What is scheduled on LinkedIn this week?',
        reply: 'Three posts: Monday and Wednesday at 08:30 on your page, and Thursday at 12:00 on your profile. Want me to draft one for Friday?',
        nets: ['linkedin', 'linkedin-page'],
      },
      alsoTry: ['List my Tadween channels', 'Save a draft for Thursday', 'Turn this article into a post'],
      compare: {
        title: 'Which ChatGPT plans can schedule with Tadween?',
        sub: 'Listing your channels and posts only reads. Scheduling is a write action, and OpenAI allows those in custom MCP apps on some plans only.',
        head: ['ChatGPT plan', 'Custom MCP apps', 'Schedule posts (write actions)'],
        rows: [
          ['Business', 'Yes. Only an admin or owner can turn on Developer mode', 'Yes, in beta'],
          ['Enterprise and Edu', 'Yes. An admin can give you access', 'Yes, in beta'],
          ['Pro', 'Yes', 'Not yet: read only, so it lists channels and posts'],
          ['Other plans', 'Not listed for custom MCP apps', 'No'],
        ],
        note: 'From OpenAI’s help center, linked above. Plans change, so check it for the current list.',
      },
      prompts: [
        { tag: 'Repurpose', nets: ['linkedin-page'], title: 'Turn an article into a post', text: 'Turn this article into a LinkedIn post for my company page and schedule it for Tuesday at 9:00.', lang: 'en' },
        { tag: 'Check the week', nets: ['linkedin', 'linkedin-page'], title: 'See what is scheduled', text: 'What is scheduled on LinkedIn this week?', lang: 'en' },
        { tag: 'Draft first', nets: ['linkedin'], title: 'Save a draft to review', text: 'Save a draft about our new hire for Thursday. Don’t schedule it yet.', lang: 'en' },
        { tag: 'In Arabic', nets: ['linkedin-page'], title: 'Write in Egyptian Arabic', text: 'اكتب بوست لينكدإن عن الويبينار بتاعنا وجدوله يوم الحد الساعة ١٠ الصبح.', lang: 'ar' },
      ],
      versus: {
        title: 'Is ChatGPT the same as Codex?',
        sub: 'No. Both are OpenAI products and both can connect to Tadween. This page is for ChatGPT, the chat assistant.',
        items: [
          { name: 'ChatGPT', body: 'OpenAI’s chat assistant on chatgpt.com. Add Tadween as a custom MCP app with sign-in, and ask in the chat.', href: 'self' },
          { name: 'Codex', body: 'OpenAI’s coding agent for the terminal and your editor. It connects to Tadween as a remote MCP server, with sign-in or an API key.', href: 'agent' },
          { name: 'Claude', body: 'Anthropic’s chat assistant. Tadween connects to it as a custom connector, on every Claude plan.', href: 'claude' },
        ],
      },
      notes: [
        'Scheduling is a write action. OpenAI’s help center says full MCP support, including write actions, is in beta on ChatGPT Business, Enterprise and Edu. On Pro, custom MCP apps can only read for now: ChatGPT can list your channels and posts but not schedule. Other plans aren’t listed for custom MCP apps.',
        'Custom MCP apps work in ChatGPT on the web, not in the mobile apps. ChatGPT may ask you to confirm before it schedules.',
      ],
      trouble: [
        'ChatGPT lists your posts but won’t schedule: your plan may be read only. Write actions need Business, Enterprise or Edu.',
        'Tadween isn’t in the chat: pick it from the tools menu, or mention it with @.',
        'The app won’t save: check that Developer mode is on, that you chose OAuth, and that you signed in to Tadween.',
      ],
      faq: [
        {
          title: 'How do I connect Tadween to ChatGPT?',
          content: 'In ChatGPT on the web, turn on Developer mode under Settings → Apps → Advanced settings. Then click Create in Settings → Apps, name it Tadween, choose OAuth, paste {api}/mcp-oauth-dynamic, click Scan Tools and sign in to Tadween.',
        },
        {
          title: 'Which ChatGPT plan can schedule posts in Tadween?',
          content: 'OpenAI lists full MCP support, with write actions such as scheduling, on Business, Enterprise and Edu, in beta. Pro can connect custom MCP apps with read access only, so ChatGPT can show your calendar but not add to it. Check OpenAI’s help center, linked above, for the current list.',
        },
        {
          title: 'Do I need an API key for ChatGPT?',
          content: 'No. Tadween’s ChatGPT setup signs in with OAuth: you sign in to Tadween in a window and approve it. There is no key to paste.',
        },
        {
          title: 'Is ChatGPT the same as Codex?',
          content: 'No. ChatGPT is the chat assistant; Codex is OpenAI’s coding agent for the terminal and your editor. Both can connect to Tadween, and Codex can also use an API key.',
        },
      ],
    },
    claude: {
      title: 'Claude MCP connector: schedule LinkedIn posts | Tadween',
      description: 'Add Tadween to Claude as a custom connector on the web or desktop, sign in, and ask Claude to write and schedule LinkedIn posts. Steps and example prompts.',
      h1: 'Schedule LinkedIn and social posts with Claude',
      bullets: ['A custom connector on claude.ai and Claude Desktop', 'Plan, write and schedule LinkedIn posts by asking', 'Sign in with Tadween: no API key to paste'],
      blurb: 'Custom connector on the web and desktop',
      methods: {
        oauth: {
          label: 'Sign in (OAuth)',
          how: 'A custom connector, on the web or desktop',
          steps: [
            'In Claude, open Customize → Connectors. On Team and Enterprise plans an owner adds it once under Organization settings → Connectors, and each member then clicks Connect.',
            'Click + Add, then Add custom connector. Name it Tadween, paste the remote MCP server URL above and click Continue.',
            'Review the authentication settings Claude detected and click Continue.',
            'Keep Sign in now, choose Register automatically as the OAuth client and click Add. Sign in to Tadween in the window that opens and approve your workspace.',
            'In a chat, click + → Connectors and turn Tadween on.',
          ],
        },
      },
      connect: {
        title: 'Add Tadween as a custom connector',
        body: 'Paste this address in Claude under Customize → Connectors → Add custom connector, then sign in to Tadween when Claude asks.',
      },
      demo: {
        lang: 'en',
        prompt: 'Plan three LinkedIn posts for Cairo Coffee Co. next week, one in Arabic, and schedule them Monday, Wednesday and Friday at 8:30.',
        tools: [
          { tool: 'integrationList', label: 'Found Cairo Coffee Co. on LinkedIn' },
          { tool: 'integrationSchedulePostTool', label: 'Scheduled 3 posts' },
        ],
        reply: 'All three are on your calendar. The Wednesday post is in Arabic.',
        posts: [
          { net: 'linkedin-page', name: 'Cairo Coffee Co.', text: 'New single origin from Sidamo…', when: 'Mon 08:30' },
          { net: 'linkedin-page', name: 'Cairo Coffee Co.', text: 'جلسة تذوق يوم الخميس الساعة ٦…', when: 'Wed 08:30' },
          { net: 'linkedin-page', name: 'Cairo Coffee Co.', text: 'Meet the team behind our new roastery…', when: 'Fri 08:30' },
        ],
      },
      ask: {
        prompt: 'Schedule a post to our LinkedIn page for tomorrow at 9:00 welcoming Mona to the team. Keep it warm and short.',
        reply: 'Done. I found your LinkedIn page and scheduled it for 09:00 tomorrow. Want an Arabic version for Thursday too?',
        nets: ['linkedin-page'],
      },
      alsoTry: ['List my Tadween channels', 'Plan next week on LinkedIn', 'Save it as a draft instead'],
      compare: {
        title: 'Which Claude plans can add Tadween?',
        sub: 'Tadween connects to Claude as a custom connector. Every Claude plan can add one; who adds it depends on the plan.',
        head: ['Claude plan', 'Custom connectors', 'Who adds Tadween'],
        rows: [
          ['Free', 'Yes, one custom connector', 'You, under Customize → Connectors'],
          ['Pro and Max', 'Yes', 'You, under Customize → Connectors'],
          ['Team and Enterprise', 'Yes', 'An owner, under Organization settings → Connectors; then each member clicks Connect'],
        ],
        note: 'Claude connects from Anthropic’s servers, so the same connector works on claude.ai, Claude Desktop and Cowork. Claude’s help center, linked above, has the current plans.',
      },
      prompts: [
        { tag: 'Plan a week', nets: ['linkedin', 'linkedin-page'], title: 'Plan your LinkedIn week', text: 'Plan three LinkedIn posts for next week from these notes and schedule them Monday, Wednesday and Friday at 8:30.', lang: 'en' },
        { tag: 'From notes', nets: ['linkedin'], title: 'Turn notes into a post', text: 'Write a LinkedIn post from these meeting notes and save it as a draft for Monday.', lang: 'en' },
        { tag: 'Check the calendar', nets: ['linkedin', 'x'], title: 'See what is going out', text: 'Show every post scheduled for next week, by day.', lang: 'en' },
        { tag: 'In Arabic', nets: ['linkedin-page'], title: 'Write in Egyptian Arabic', text: 'اكتب بوست عن العرض الجديد وحطه مسودة يوم الخميس.', lang: 'ar' },
      ],
      versus: {
        title: 'Claude, Claude Code or Cowork: which one is this?',
        sub: 'They are three Anthropic products, and each can connect to Tadween. This page is for Claude, the chat assistant.',
        items: [
          { name: 'Claude', body: 'The chat assistant on claude.ai and Claude Desktop. Add Tadween as a custom connector and ask in the chat. No terminal and no key.', href: 'self' },
          { name: 'Claude Code', body: 'Anthropic’s coding agent in the terminal. One claude mcp add command adds Tadween, then you sign in from /mcp.', href: 'agent' },
          { name: 'Cowork', body: 'Claude Desktop working through tasks with your files. It uses the connectors you added in Claude, so Tadween is already there.', href: 'agent' },
        ],
      },
      notes: [
        'Custom connectors work on Claude’s Free, Pro, Max, Team and Enterprise plans. The Free plan allows one custom connector.',
        'Claude connects from Anthropic’s servers, so the same connector works on claude.ai, Claude Desktop and Cowork.',
      ],
      trouble: [
        'Claude sees no channels: connect your social accounts in Tadween first, then ask Claude to list your channels.',
        'Tadween isn’t in the chat: click + → Connectors and turn Tadween on for this chat.',
        'Claude asks you to sign in again: connect it from Customize → Connectors and approve your workspace once more.',
      ],
      faq: [
        {
          title: 'How do I connect Tadween to Claude?',
          content: 'In Claude, open Customize → Connectors, click + Add, then Add custom connector. Name it Tadween, paste {api}/mcp-oauth-dynamic, choose Register automatically as the OAuth client, and sign in to Tadween to approve your workspace.',
        },
        {
          title: 'Do I need an API key for Claude?',
          content: 'No. Claude connects with OAuth: you sign in to Tadween in a window and approve it. There is nothing to paste but the URL.',
        },
        {
          title: 'Which OAuth client option should I pick?',
          content: 'Choose Register automatically. Tadween supports dynamic client registration, so Claude registers itself the first time it connects.',
        },
        {
          title: 'What’s the difference between Claude, Claude Code and Cowork?',
          content: 'Claude is the chat assistant on the web and desktop. Cowork is Claude Desktop working on tasks with your files, and it uses the same connectors. Claude Code is the coding agent in your terminal, with its own one-line setup.',
        },
      ],
    },
    cursor: {
      title: 'Cursor MCP: schedule LinkedIn posts from Cursor | Tadween',
      description: 'Add Tadween to Cursor’s mcp.json, sign in or read an API key from your environment, and ask Cursor’s agent to schedule LinkedIn posts about what you build.',
      h1: 'Schedule LinkedIn and social posts from Cursor',
      bullets: ['One block in Cursor’s mcp.json', 'Sign in with Tadween, or read an API key from your environment', 'Post about what you built without leaving the editor'],
      blurb: 'A few lines in mcp.json',
      methods: {
        oauth: {
          label: 'Sign in (OAuth)',
          how: 'Add the server, then log in',
          steps: [
            'Add the block above to ~/.cursor/mcp.json (or to .cursor/mcp.json in one project) and save.',
            'Open Customize in Cursor’s sidebar and check that tadween is on. When Cursor asks you to sign in, sign in to Tadween in the browser and approve.',
            'In the agent chat, ask “List my Tadween channels” to check the connection.',
          ],
        },
        key: {
          label: 'API key',
          how: 'A key read from your environment',
          steps: [
            'Copy your key from Tadween (Settings, API & MCP) and put it in an environment variable, in your shell profile:',
            'Add this to ~/.cursor/mcp.json and save. Cursor reads the key from the variable, so it is never written in the file:',
            'Restart Cursor, then open Customize in the sidebar and check that tadween is on.',
          ],
        },
      },
      connect: {
        title: 'Add Tadween to mcp.json',
        body: 'Paste this into Cursor’s mcp.json and save. Cursor asks you to sign in to Tadween the first time it connects.',
      },
      demo: {
        lang: 'en',
        prompt: 'Write a LinkedIn post announcing the dark mode we just finished and schedule it on my profile for Wednesday at 11:00.',
        tools: [
          { tool: 'integrationList', label: 'Found your LinkedIn profile' },
          { tool: 'integrationSchedulePostTool', label: 'Scheduled 1 post' },
        ],
        reply: 'Scheduled for Wednesday at 11:00 on your profile.',
        posts: [{ net: 'linkedin', name: 'Omar Hassan', text: 'Dark mode is live, and it follows your system…', when: 'Wed 11:00' }],
      },
      ask: {
        prompt: 'Write a LinkedIn post about the feature in this branch and save it as a draft for Wednesday.',
        reply: 'Saved as a draft for Wednesday on your LinkedIn profile. It’s on your Tadween calendar to review.',
        nets: ['linkedin'],
      },
      alsoTry: ['List my Tadween channels', 'What goes out tomorrow?', 'Post this release to X too'],
      compare: {
        title: 'Sign in or API key: which should I pick?',
        sub: 'Both reach the same Tadween tools. Sign-in keeps every secret out of your files; a key is read from your environment.',
        head: ['', 'Sign in (OAuth)', 'API key'],
        rows: [
          ['Address', '{api}/mcp-oauth-dynamic', '{api}/mcp'],
          ['What goes in mcp.json', 'The address only', 'The address and an Authorization header that reads ${env:TADWEEN_API_KEY}'],
          ['Where the secret lives', 'Nowhere in your files: you approve Cursor in a Tadween window', 'In an environment variable in your shell profile'],
          ['How to switch it off', 'Revoke Cursor under Settings, Approved apps', 'Rotate the key under Settings, API & MCP'],
        ],
        note: 'Sign-in is the simpler choice. Either one works in every project from ~/.cursor/mcp.json, or in one project from .cursor/mcp.json.',
      },
      prompts: [
        { tag: 'Ship it', nets: ['linkedin'], title: 'Announce what you built', text: 'Write a LinkedIn post about the feature in this branch and save it as a draft.', lang: 'en' },
        { tag: 'Release notes', nets: ['linkedin', 'x'], title: 'One release, two channels', text: 'Schedule a thread on X and a LinkedIn post about this release for Monday at 9:00.', lang: 'en' },
        { tag: 'Check tomorrow', nets: ['linkedin'], title: 'See what goes out', text: 'What’s going out on LinkedIn tomorrow?', lang: 'en' },
        { tag: 'In Arabic', nets: ['linkedin'], title: 'Write in Egyptian Arabic', text: 'اكتب بوست لينكدإن عن الميزة اللي في البرانش ده بالعربي.', lang: 'ar' },
      ],
      versus: {
        title: 'Cursor, Claude Code or Codex?',
        sub: 'All three are coding agents that can post to Tadween while you work. This page is for Cursor, the editor.',
        items: [
          { name: 'Cursor', body: 'An AI code editor. Add Tadween to mcp.json and ask its agent from the editor, with sign-in or an API key.', href: 'self' },
          { name: 'Claude Code', body: 'Anthropic’s agent in the terminal. One claude mcp add command adds Tadween, then you sign in from /mcp.', href: 'agent' },
          { name: 'Codex', body: 'OpenAI’s coding agent for the terminal and editor. It connects as a remote MCP server, with sign-in or a key.', href: 'agent' },
        ],
      },
      notes: ['On Enterprise, an admin may limit which MCP servers Cursor can use.'],
      trouble: [
        'The tools don’t show up: open the Output panel, pick MCP Logs and check that the address is exact.',
        'With a key: check that TADWEEN_API_KEY is set where Cursor starts and that the key wasn’t rotated, then restart Cursor.',
        'Tadween is off: open Customize in the sidebar and turn tadween on.',
      ],
      faq: [
        {
          title: 'How do I connect Tadween to Cursor?',
          content: 'Add a tadween server with the address {api}/mcp-oauth-dynamic to ~/.cursor/mcp.json and save. Open Customize in Cursor’s sidebar, check that tadween is on, and sign in to Tadween when Cursor asks.',
        },
        {
          title: 'Global or per-project config?',
          content: '~/.cursor/mcp.json makes Tadween available in every project. .cursor/mcp.json in a project limits it to that project.',
        },
        {
          title: 'Can I keep the key out of mcp.json?',
          content: 'Yes. The key method above uses ${env:TADWEEN_API_KEY}, so only the variable name is in the file. With sign-in there is no key at all.',
        },
        {
          title: 'The tools don’t show up. What should I check?',
          content: 'Open the Output panel and pick MCP Logs. Check that the address is exact, that TADWEEN_API_KEY is set where Cursor starts, and that the key wasn’t rotated. Then restart Cursor.',
        },
      ],
    },
  },
};
