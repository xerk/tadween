import type { AiClientsDict } from './types';

// English copy for the AI client pages (/chatgpt, /claude, /cursor). The steps, snippets and
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
          content: 'No. ChatGPT is the chat assistant; Codex is OpenAI’s coding agent for the terminal and your editor. Both can connect to Tadween, and Codex can also use an API key.',
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
  },
};
