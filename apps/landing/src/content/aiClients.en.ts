import type { AiClientsDict } from './types';

// English copy for the AI client pages (/chatgpt, /claude-code…). The steps, snippets and
// vendor docs are in lib/aiClients.ts; each method's `steps` here has one line per step there,
// in the same order. Every step restates the vendor's current documentation and the steps in
// Settings → API & MCP. What the clients can do is the agent page's list, which follows the
// MCP tools the backend registers. Client names are their owners' trademarks, written as text.
export const aiClientsEn: AiClientsDict = {
  page: {
    eyebrow: 'Tadween in {name}',
    start: 'Start free trial',
    stepsLink: 'See the {n} steps',
    frameOnline: 'Tadween connected',
    frameInput: 'Reply to {name}…',
    recommended: 'recommended',
    connectTitle: 'Connect {name} in {n} steps',
    connectSub: 'Tadween is not an app in any AI directory: you add it to {name} yourself as a remote MCP server. It takes a minute, and you can remove it at any time.',
    docs: '{name}’s own documentation for these steps:',
    promptsTitle: 'What you can ask {name}',
    promptsSub: 'Plain requests, in English or Egyptian Arabic. Start by listing your channels to check the connection.',
    canTitle: 'What {name} can do in Tadween',
    canSub: 'The same tools the agent inside Tadween uses.',
    channelsTitle: 'LinkedIn first, and every channel you connect',
    channelsSub: '{name} schedules to the channels connected in your Tadween workspace, each with its own limits and settings.',
    securityTitle: 'Your workspace stays yours',
    security: [
      { icon: 'shield-check', title: 'You approve the connection', body: 'With sign-in, {name} opens a Tadween window and nothing connects until you approve it for your workspace. No password is shared with {name}.' },
      { icon: 'key', title: 'Keys stay out of URLs', body: 'With an API key, the key goes in an Authorization header or an environment variable. Never paste it into a URL or a shared chat.' },
      { icon: 'x', title: 'Disconnect in one click', body: 'Revoke an app that signed in under Settings, Approved apps. Rotate your key under Settings, API & MCP and the old one stops working.' },
    ],
    faqTitle: '{name} and Tadween: questions',
    relatedTitle: 'Other AI tools that work with Tadween',
    allClients: 'See every AI tool',
    ctaTitle: 'Plan your LinkedIn week from {name}',
    ctaBody: 'Start a seven-day trial, connect your LinkedIn, then connect {name}.',
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
      intro: 'Add Tadween to ChatGPT as a custom MCP app and sign in once. Then ask ChatGPT to draft a LinkedIn post, check your week, or schedule a post to your page.',
      blurb: 'Custom MCP app, sign in with Tadween',
      methods: {
        oauth: {
          label: 'Sign in (OAuth)',
          how: 'A custom app in ChatGPT on the web',
          steps: [
            'In ChatGPT on the web, open Settings → Apps → Advanced settings and turn on Developer mode. On Business only an admin or owner can do this; on Enterprise and Edu an admin can give you access.',
            'In Settings → Apps click Create. Name it Tadween, choose OAuth for authentication and paste this MCP server URL:',
            'Click Scan Tools, sign in to Tadween in the window that opens and approve, then click Create.',
            'In a new chat, pick Tadween from the tools menu, or mention it with @.',
          ],
        },
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
      prompts: [
        { lang: 'en', text: 'List my Tadween channels.' },
        { lang: 'en', text: 'Turn this article into a LinkedIn post for my company page and schedule it for Tuesday at 9:00.' },
        { lang: 'en', text: 'What is scheduled on LinkedIn this week?' },
        { lang: 'en', text: 'Save a draft about our new hire for Thursday. Don’t schedule it yet.' },
        { lang: 'ar', text: 'اكتب بوست لينكدإن عن الويبينار بتاعنا وجدوله يوم الحد الساعة ١٠ الصبح.' },
        { lang: 'ar', text: 'إيه المنشورات اللي متجدولة الأسبوع ده؟' },
      ],
      notes: [
        'Scheduling is a write action. OpenAI’s help center says full MCP support, including write actions, is in beta on ChatGPT Business, Enterprise and Edu. On Pro, custom MCP apps can only read for now: ChatGPT can list your channels and posts but not schedule. Other plans aren’t listed for custom MCP apps.',
        'Custom MCP apps work in ChatGPT on the web, not in the mobile apps. ChatGPT may ask you to confirm before it schedules.',
      ],
      faq: [
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
          content: 'No. ChatGPT is the chat assistant; Codex is OpenAI’s coding agent for the terminal and your editor. Both can connect to Tadween, and Codex can also use an API key. See the Codex page for its steps.',
        },
      ],
    },
    claude: {
      title: 'Claude MCP connector: schedule LinkedIn posts | Tadween',
      description: 'Add Tadween to Claude as a custom connector on the web or desktop, sign in, and ask Claude to write and schedule LinkedIn posts. Steps and example prompts.',
      h1: 'Schedule LinkedIn and social posts with Claude',
      intro: 'Add Tadween to Claude as a custom connector, on claude.ai or Claude Desktop, and sign in once. Then ask Claude to plan your LinkedIn week, write a post in Arabic or schedule one to your page.',
      blurb: 'Custom connector on the web and desktop',
      methods: {
        oauth: {
          label: 'Sign in (OAuth)',
          how: 'A custom connector, on the web or desktop',
          steps: [
            'In Claude, open Customize → Connectors. On Team and Enterprise plans an owner adds it once under Organization settings → Connectors, and each member then clicks Connect.',
            'Click + Add, then Add custom connector. Name it Tadween, paste this URL and click Continue:',
            'Review the authentication settings Claude detected and click Continue.',
            'Keep Sign in now, choose Register automatically as the OAuth client and click Add. Sign in to Tadween in the window that opens and approve your workspace.',
            'In a chat, click + → Connectors and turn Tadween on.',
          ],
        },
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
      prompts: [
        { lang: 'en', text: 'List my Tadween channels.' },
        { lang: 'en', text: 'Write a LinkedIn post from these meeting notes and save it as a draft for Monday.' },
        { lang: 'en', text: 'Show every post scheduled for next week, by day.' },
        { lang: 'en', text: 'Schedule a short X version of my last LinkedIn post for tomorrow at noon.' },
        { lang: 'ar', text: 'خطّط لي ٣ بوستات لينكدإن للأسبوع الجاي، واحد منهم بالإنجليزي.' },
        { lang: 'ar', text: 'اكتب بوست عن العرض الجديد وحطه مسودة يوم الخميس.' },
      ],
      notes: [
        'Custom connectors work on Claude’s Free, Pro, Max, Team and Enterprise plans. The Free plan allows one custom connector.',
        'Claude connects from Anthropic’s servers, so the same connector works on claude.ai, Claude Desktop and Cowork.',
      ],
      faq: [
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
    'claude-cowork': {
      title: 'Claude Cowork MCP: schedule LinkedIn posts | Tadween',
      description: 'Connect Tadween once in Claude and use it in Cowork: turn the files on your desktop into LinkedIn posts and schedule them. No terminal, no API key.',
      h1: 'Schedule LinkedIn and social posts with Claude Cowork',
      intro: 'Cowork uses the connectors on your Claude account. Add Tadween once, then let Cowork turn a folder of notes, a report or a deck into LinkedIn posts on your calendar.',
      blurb: 'Claude Desktop tasks, same connector',
      methods: {
        oauth: {
          label: 'Sign in (OAuth)',
          how: 'A custom connector on your Claude account',
          steps: [
            'In Claude Desktop, open Customize → Connectors. On Team and Enterprise plans an owner adds it under Organization settings → Connectors first.',
            'Click + Add, then Add custom connector. Name it Tadween, paste this URL and click Continue:',
            'Review the authentication settings Claude detected and click Continue.',
            'Keep Sign in now, choose Register automatically as the OAuth client and click Add. Sign in to Tadween and approve your workspace.',
            'Custom connectors on your Claude account work in Cowork too. Start a task and ask it to list your Tadween channels.',
          ],
        },
      },
      demo: {
        lang: 'en',
        prompt: 'Read the launch notes in my Q4 folder, write two LinkedIn posts from them and save both as drafts for next week.',
        tools: [
          { tool: 'integrationList', label: 'Found Maadi Lane Homes on LinkedIn' },
          { tool: 'integrationSchedulePostTool', label: 'Saved 2 drafts' },
        ],
        reply: 'Two drafts are in Tadween for Monday and Thursday. Each one quotes the figures from your notes.',
        posts: [
          { net: 'linkedin-page', name: 'Maadi Lane Homes', text: 'Phase two opens for viewings…', when: 'Draft · Mon' },
          { net: 'linkedin-page', name: 'Maadi Lane Homes', text: 'What buyers asked us most this quarter…', when: 'Draft · Thu' },
        ],
      },
      prompts: [
        { lang: 'en', text: 'List my Tadween channels.' },
        { lang: 'en', text: 'Turn the report in this folder into three LinkedIn posts and save them as drafts.' },
        { lang: 'en', text: 'Import the image at this link into my media library and use it in a new LinkedIn post for Monday.' },
        { lang: 'en', text: 'What goes out on LinkedIn this week? Summarise it in a table.' },
        { lang: 'ar', text: 'اقرا الملاحظات اللي في الفولدر ده واكتب منها بوستين لينكدإن مسودة.' },
        { lang: 'ar', text: 'جدول بوست عن الإطلاق يوم التلات الساعة ٩ الصبح.' },
      ],
      notes: [
        'Anthropic’s help center lists custom connectors on Claude, Cowork and Claude Desktop for Free, Pro, Max, Team and Enterprise plans.',
        'Media is added from a public link (Tadween imports it into your media library). Cowork can read your local files to write posts, but it uploads media only from a URL.',
      ],
      faq: [
        {
          title: 'Do I set up Tadween separately for Cowork?',
          content: 'No. Cowork uses the custom connectors on your Claude account. If Tadween is already connected in Claude, turn it on in your Cowork task.',
        },
        {
          title: 'Can I use the Claude Desktop config file instead?',
          content: 'Not for Cowork. Anthropic notes that local servers in claude_desktop_config.json aren’t available in Cowork. Use the custom connector above.',
        },
        {
          title: 'Do I need an API key?',
          content: 'No. The connector signs in with OAuth: you approve it in a Tadween window and there is no key to paste.',
        },
      ],
    },
    perplexity: {
      title: 'Perplexity MCP connector: schedule LinkedIn posts | Tadween',
      description: 'Add Tadween to Perplexity as a custom remote connector with OAuth, then research a topic and schedule the LinkedIn post in the same thread.',
      h1: 'Schedule LinkedIn and social posts with Perplexity',
      intro: 'Add Tadween to Perplexity as a custom remote connector and sign in. Research a topic, then ask Perplexity to turn what it found into a LinkedIn post and schedule it.',
      blurb: 'Custom remote connector, sign in',
      methods: {
        oauth: {
          label: 'Sign in (OAuth)',
          how: 'A custom remote connector',
          steps: [
            'In Perplexity, open Account settings → Connectors and click + Custom connector, then choose Remote.',
            'Name it Tadween and paste this MCP Server URL:',
            'Set Authentication to OAuth and Transport to Streamable HTTP. Tick the acknowledgement and click Add.',
            'Click the Tadween card, sign in to Tadween and approve your workspace.',
          ],
        },
      },
      demo: {
        lang: 'en',
        prompt: 'Summarise this week’s news on fintech rules in Egypt into a LinkedIn post for Rakeeza and schedule it for Thursday at 10:00.',
        tools: [
          { tool: 'integrationList', label: 'Found Rakeeza on LinkedIn' },
          { tool: 'integrationSchedulePostTool', label: 'Scheduled 1 post' },
        ],
        reply: 'Scheduled for Thursday at 10:00, with the three sources listed at the end of the post.',
        posts: [{ net: 'linkedin', name: 'Rakeeza', text: 'Three changes to fintech rules this week…', when: 'Thu 10:00' }],
      },
      prompts: [
        { lang: 'en', text: 'List my Tadween channels.' },
        { lang: 'en', text: 'Research what changed in LinkedIn’s algorithm this month and draft a post for my profile.' },
        { lang: 'en', text: 'Turn your last answer into a LinkedIn post and schedule it for tomorrow at 9:00.' },
        { lang: 'en', text: 'What’s on my LinkedIn calendar next week?' },
        { lang: 'ar', text: 'ابحث عن أخبار السوق الأسبوع ده واكتب منها بوست لينكدإن بالعربي.' },
        { lang: 'ar', text: 'جدول البوست ده لصفحة الشركة بكرة الساعة ٩.' },
      ],
      notes: [
        'Perplexity files custom connectors under its Enterprise features; check its help center, linked below, for your plan. On Enterprise, members can add their own only if an admin allows it; it is off by default.',
      ],
      faq: [
        {
          title: 'Do I need an API key for Perplexity?',
          content: 'No. Choose OAuth when you add the connector. Tadween supports dynamic client registration, so Perplexity doesn’t need a client ID or secret.',
        },
        {
          title: 'Which transport should I choose?',
          content: 'Streamable HTTP. Tadween’s MCP server speaks streamable HTTP at the address on this page.',
        },
        {
          title: 'The connector shows an error. What should I check?',
          content: 'Make sure you pasted the address ending in /mcp-oauth-dynamic, chose OAuth, and approved the sign-in window while signed in to Tadween. Remove the connector and add it again if the sign-in window closed early.',
        },
      ],
    },
    'claude-code': {
      title: 'Claude Code MCP: schedule LinkedIn posts | Tadween',
      description: 'Connect Tadween to Claude Code with one command, sign in or use an API key, and schedule LinkedIn posts from your terminal: changelogs, launches, release notes.',
      h1: 'Schedule LinkedIn and social posts with Claude Code',
      intro: 'One command adds Tadween to Claude Code. Then turn a changelog, a README or a release into LinkedIn posts without leaving the terminal.',
      blurb: 'One command in the terminal',
      methods: {
        oauth: {
          label: 'Sign in (OAuth)',
          how: 'Add the server, then sign in',
          steps: [
            'Run this in your terminal. Add --scope user to use it in every project:',
            'Start Claude Code, type /mcp, pick tadween and choose Authenticate. Sign in to Tadween in the browser and approve.',
          ],
        },
        key: {
          label: 'API key',
          how: 'Add the server with your key',
          steps: [
            'Copy your key from Tadween (Settings, API & MCP) and run this, with the key in place of <your-api-key>:',
            'Check it: tadween should say Connected.',
          ],
        },
      },
      demo: {
        lang: 'en',
        prompt: 'Read CHANGELOG.md, write a LinkedIn post about v2.4 for the Rakeeza page and schedule it for tomorrow at 9:00.',
        tools: [
          { tool: 'integrationList', label: 'Found Rakeeza on LinkedIn' },
          { tool: 'integrationSchedulePostTool', label: 'Scheduled 1 post' },
        ],
        reply: 'Scheduled for tomorrow at 09:00. It covers the three biggest changes in 2.4.',
        posts: [{ net: 'linkedin-page', name: 'Rakeeza', text: 'Rakeeza 2.4 is out: bilingual exports…', when: 'Sat 09:00' }],
      },
      prompts: [
        { lang: 'en', text: 'List my Tadween channels.' },
        { lang: 'en', text: 'Write a LinkedIn post from the last five commits and save it as a draft.' },
        { lang: 'en', text: 'Turn README.md into a launch post for LinkedIn and a short one for X, both tomorrow at 9:00.' },
        { lang: 'en', text: 'What is scheduled on our LinkedIn page this week?' },
        { lang: 'ar', text: 'اقرا CHANGELOG.md واكتب بوست لينكدإن بالعربي عن الإصدار الجديد.' },
        { lang: 'ar', text: 'جدول البوست ده على صفحة الشركة يوم الحد الساعة ٩.' },
      ],
      notes: ['Keep the key out of shared scripts and repositories. Use the sign-in method on shared machines.'],
      faq: [
        {
          title: 'Sign in or API key: which should I use?',
          content: 'Sign in is simpler and there is no key to store. Use the API key for scripts and CI, where no browser can open; keep it in a secret, never in a URL.',
        },
        {
          title: 'Can I use it in every project?',
          content: 'Yes. Add --scope user to the claude mcp add command and Tadween is available in all your projects.',
        },
        {
          title: 'The tools don’t show up. What should I check?',
          content: 'Run claude mcp list. If tadween isn’t Connected, authenticate again from /mcp, or check that the key has no extra spaces and wasn’t rotated.',
        },
      ],
    },
    codex: {
      title: 'Codex MCP: schedule LinkedIn posts from Codex | Tadween',
      description: 'Add Tadween to OpenAI Codex in the CLI or IDE extension, sign in or use an API key from an environment variable, and schedule LinkedIn posts from your code.',
      h1: 'Schedule LinkedIn and social posts with Codex',
      intro: 'Add Tadween to Codex once and it works in the Codex CLI, the IDE extension and the ChatGPT desktop app, which share one configuration. Then post about what you ship.',
      blurb: 'CLI, IDE extension and desktop app',
      methods: {
        oauth: {
          label: 'Sign in (OAuth)',
          how: 'Add the server, then log in',
          steps: ['Run this in your terminal:', 'Log in: a browser window opens. Sign in to Tadween and approve.'],
        },
        key: {
          label: 'API key',
          how: 'A bearer token from an environment variable',
          steps: [
            'Copy your key from Tadween (Settings, API & MCP) and put it in an environment variable, in your shell profile:',
            'Add the server to ~/.codex/config.toml. Codex reads the key from the variable, so it is never written in the file:',
            'Check it: tadween should be listed.',
          ],
        },
      },
      demo: {
        lang: 'en',
        prompt: 'We just merged the Arabic export feature. Write a LinkedIn post about it for Nile Studio and schedule it for Monday at 10:00.',
        tools: [
          { tool: 'integrationList', label: 'Found Nile Studio on LinkedIn' },
          { tool: 'integrationSchedulePostTool', label: 'Scheduled 1 post' },
        ],
        reply: 'Scheduled for Monday at 10:00 on Nile Studio.',
        posts: [{ net: 'linkedin-page', name: 'Nile Studio', text: 'You can now export every report in Arabic…', when: 'Mon 10:00' }],
      },
      prompts: [
        { lang: 'en', text: 'List my Tadween channels.' },
        { lang: 'en', text: 'Summarise this pull request as a LinkedIn post and save it as a draft.' },
        { lang: 'en', text: 'Schedule a release post on LinkedIn and X for Tuesday at 9:00.' },
        { lang: 'en', text: 'Which posts failed to publish this week?' },
        { lang: 'ar', text: 'اكتب بوست لينكدإن عن الميزة اللي لسه عاملينها merge.' },
        { lang: 'ar', text: 'وريني المنشورات اللي متجدولة الأسبوع الجاي.' },
      ],
      notes: ['The ChatGPT desktop app, the Codex CLI and the IDE extension share ~/.codex/config.toml, so you set this up once.'],
      faq: [
        {
          title: 'Can I add it from the IDE extension instead?',
          content: 'Yes. Open the gear menu, then MCP servers, then Add server. Choose Streamable HTTP, paste the address and save, then restart the extension and click Authenticate.',
        },
        {
          title: 'Why an environment variable for the key?',
          content: 'bearer_token_env_var tells Codex which variable holds the token, so the key stays out of config.toml and out of any repository.',
        },
        {
          title: 'Is Codex the same as ChatGPT?',
          content: 'No. Codex is OpenAI’s coding agent; ChatGPT is the chat assistant. Codex can sign in or use an API key; Tadween’s ChatGPT setup signs in. Both can schedule to Tadween, ChatGPT on the plans OpenAI lists for write actions.',
        },
      ],
    },
    cursor: {
      title: 'Cursor MCP: schedule LinkedIn posts from Cursor | Tadween',
      description: 'Add Tadween to Cursor’s mcp.json, sign in or read an API key from your environment, and ask Cursor’s agent to schedule LinkedIn posts about what you build.',
      h1: 'Schedule LinkedIn and social posts from Cursor',
      intro: 'Add one block to Cursor’s mcp.json and sign in. Then ask Cursor’s agent to announce a feature on LinkedIn while the code is still open.',
      blurb: 'A few lines in mcp.json',
      methods: {
        oauth: {
          label: 'Sign in (OAuth)',
          how: 'Add the server, then log in',
          steps: [
            'Add this to ~/.cursor/mcp.json (or to .cursor/mcp.json in one project) and save:',
            'Open Customize in Cursor’s sidebar and check that tadween is on. When Cursor asks you to sign in, sign in to Tadween in the browser and approve.',
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
      prompts: [
        { lang: 'en', text: 'List my Tadween channels.' },
        { lang: 'en', text: 'Write a LinkedIn post about the feature in this branch and save it as a draft.' },
        { lang: 'en', text: 'Schedule a thread on X and a LinkedIn post about this release for Monday at 9:00.' },
        { lang: 'en', text: 'What’s going out on LinkedIn tomorrow?' },
        { lang: 'ar', text: 'اكتب بوست لينكدإن عن الميزة اللي في البرانش ده بالعربي.' },
        { lang: 'ar', text: 'جدول البوست ده على البروفايل بتاعي يوم الأربع الساعة ١١.' },
      ],
      notes: ['On Enterprise, an admin may limit which MCP servers Cursor can use.'],
      faq: [
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
    vscode: {
      title: 'VS Code MCP: schedule LinkedIn posts with Copilot | Tadween',
      description: 'Add Tadween to VS Code’s mcp.json and schedule LinkedIn posts from GitHub Copilot agent mode. Sign in, or keep your key in VS Code’s secret storage.',
      h1: 'Schedule LinkedIn and social posts from VS Code',
      intro: 'Add Tadween to VS Code and GitHub Copilot’s agent mode can schedule posts for you. Sign in, or let VS Code ask for your key once and keep it in its secret storage.',
      blurb: 'GitHub Copilot agent mode',
      methods: {
        oauth: {
          label: 'Sign in (OAuth)',
          how: 'Add the server, then sign in',
          steps: [
            'Add this to .vscode/mcp.json in your project, or run MCP: Open User Configuration to use it everywhere, and save:',
            'Click Start above the server. VS Code asks to sign in: allow it, sign in to Tadween and approve.',
          ],
        },
        key: {
          label: 'API key',
          how: 'A key VS Code keeps in secret storage',
          steps: [
            'Create .vscode/mcp.json in your project, or run MCP: Open User Configuration from the Command Palette.',
            'Paste this and save. The key is not written in the file:',
            'Click Start above the server and paste your key from Tadween (Settings, API & MCP) when VS Code asks.',
            'Open Copilot Chat, switch to Agent mode and check that tadween is ticked in the tools picker.',
          ],
        },
      },
      demo: {
        lang: 'en',
        prompt: 'Draft a LinkedIn post about the open-source library we released today and save it as a draft for Sunday.',
        tools: [
          { tool: 'integrationList', label: 'Found Qolla on LinkedIn' },
          { tool: 'integrationSchedulePostTool', label: 'Saved 1 draft' },
        ],
        reply: 'The draft is in Tadween for Sunday. Open it there to add an image before you schedule it.',
        posts: [{ net: 'linkedin-page', name: 'Qolla', text: 'We just open-sourced our Arabic date parser…', when: 'Draft · Sun' }],
      },
      prompts: [
        { lang: 'en', text: 'List my Tadween channels.' },
        { lang: 'en', text: 'Write a LinkedIn post about the changes in this workspace and save it as a draft.' },
        { lang: 'en', text: 'Schedule the release post on LinkedIn for Thursday at 10:00.' },
        { lang: 'en', text: 'Show me next week’s LinkedIn posts.' },
        { lang: 'ar', text: 'اكتب بوست لينكدإن عن المكتبة اللي نزلناها النهارده.' },
        { lang: 'ar', text: 'إيه اللي هيتنشر على لينكدإن بكرة؟' },
      ],
      notes: ['On Copilot Business and Enterprise, the “MCP servers in Copilot” policy is off by default; an admin has to turn it on. Copilot Free, Pro and Pro+ aren’t affected.'],
      faq: [
        {
          title: 'Where does VS Code keep my key?',
          content: 'With the inputs block above, VS Code asks for the key the first time the server starts and keeps it in its secret storage. It isn’t written in mcp.json.',
        },
        {
          title: 'Does it work with GitHub Copilot only?',
          content: 'MCP tools in VS Code are used by Copilot Chat in Agent mode. Turn tadween on in the tools picker for the chat.',
        },
        {
          title: 'The server won’t start. What should I check?',
          content: 'Check the address, and that the key has no extra spaces and wasn’t rotated. Run MCP: List Servers to restart it and see its output.',
        },
      ],
    },
    'grok-build': {
      title: 'Grok Build MCP: schedule LinkedIn posts | Tadween',
      description: 'Connect Tadween to xAI’s Grok Build with one grok mcp add command, sign in or use an API key header, and schedule LinkedIn posts from your terminal.',
      h1: 'Schedule LinkedIn and social posts with Grok Build',
      intro: 'One command adds Tadween to Grok Build, xAI’s coding agent. Sign in in the browser the first time, then post about your work from the terminal.',
      blurb: 'xAI’s coding agent, one command',
      methods: {
        oauth: {
          label: 'Sign in (OAuth)',
          how: 'Add the server, then sign in',
          steps: ['Run this in your terminal:', 'The first time Grok Build uses Tadween, a browser window opens. Sign in to Tadween and approve.'],
        },
        key: {
          label: 'API key',
          how: 'A header read from your environment',
          steps: [
            'Copy your key from Tadween (Settings, API & MCP) and put it in an environment variable, in your shell profile:',
            'Add the server. The single quotes keep the shell from filling in the key; Grok Build reads ${TADWEEN_API_KEY} itself when it connects:',
          ],
        },
      },
      demo: {
        lang: 'en',
        prompt: 'Look at today’s commits and schedule a short LinkedIn update for Sett for 17:00.',
        tools: [
          { tool: 'integrationList', label: 'Found Sett on LinkedIn' },
          { tool: 'integrationSchedulePostTool', label: 'Scheduled 1 post' },
        ],
        reply: 'Scheduled for 17:00 today on Sett.',
        posts: [{ net: 'linkedin-page', name: 'Sett', text: 'Shipped today: faster invoices in Arabic…', when: 'Today 17:00' }],
      },
      prompts: [
        { lang: 'en', text: 'List my Tadween channels.' },
        { lang: 'en', text: 'Write a LinkedIn post from today’s commits and save it as a draft.' },
        { lang: 'en', text: 'Schedule a launch post on LinkedIn and X for Monday at 9:00.' },
        { lang: 'en', text: 'What did we post on LinkedIn last week?' },
        { lang: 'ar', text: 'اكتب بوست لينكدإن قصير عن اللي خلصناه النهارده.' },
        { lang: 'ar', text: 'جدول البوست ده الساعة ٥ العصر.' },
      ],
      notes: ['Grok Build stores the sign-in under ~/.grok, so you sign in once per machine.'],
      faq: [
        {
          title: 'Is Grok Build the same as the Grok app?',
          content: 'No. Grok Build is xAI’s coding agent for the terminal; this page is about it. The steps here don’t apply to the Grok chat app.',
        },
        {
          title: 'Sign in or API key?',
          content: 'Sign in is simplest on your own machine. Use the key for scripts, and keep it in an environment variable, never in a URL.',
        },
        {
          title: 'How do I keep the key out of my config?',
          content: 'Grok Build expands ${VAR} in headers when it connects. Keep the single quotes in the command above, so the shell passes the variable name and not the key, and only the name is saved.',
        },
      ],
    },
  },
};
