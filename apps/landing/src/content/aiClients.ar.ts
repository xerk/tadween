import type { AiClientsDict } from './types';

// Arabic copy for the AI client pages (/ar/chatgpt, /ar/claude-code…). Same structure and the
// same facts as aiClients.en.ts; each method's `steps` has one line per step in
// lib/aiClients.ts. Menu and setting names stay in English, as the clients show them.
export const aiClientsAr: AiClientsDict = {
  page: {
    eyebrow: 'تدوين داخل {name}',
    start: 'ابدأ التجربة المجانية',
    stepsLink: 'اعرض خطوات الربط',
    frameOnline: 'تدوين متصل',
    frameInput: 'اكتب لـ{name}…',
    recommended: 'المُوصى بها',
    connectTitle: 'اربط {name} خطوة بخطوة',
    connectSub: 'تدوين ليس تطبيقًا في أي متجر للذكاء الاصطناعي: تضيفه إلى {name} بنفسك كخادم MCP بعيد. يستغرق ذلك دقيقة، ويمكنك إزالته في أي وقت.',
    docs: 'توثيق {name} الرسمي لهذه الخطوات:',
    promptsTitle: 'ماذا تطلب من {name}',
    promptsSub: 'طلبات بسيطة بالعربية أو الإنجليزية. ابدأ بعرض قنواتك لتتأكد من الاتصال.',
    canTitle: 'ما يستطيع {name} فعله في تدوين',
    canSub: 'الأدوات نفسها التي يستخدمها الوكيل داخل تدوين.',
    channelsTitle: 'لينكدإن أولًا، وكل قناة تربطها',
    channelsSub: 'يجدول {name} على القنوات المربوطة في مساحة عملك في تدوين، ولكلٍّ منها حدودها وإعداداتها.',
    securityTitle: 'مساحة عملك تبقى تحت يدك',
    security: [
      { icon: 'shield-check', title: 'أنت من يوافق على الاتصال', body: 'عند تسجيل الدخول يفتح {name} نافذة تدوين، ولا يتم الاتصال حتى توافق عليه لمساحة عملك. لا تُشارك كلمة مرورك مع {name}.' },
      { icon: 'key', title: 'المفاتيح لا توضع في الروابط', body: 'مع المفتاح البرمجي يوضع المفتاح في ترويسة Authorization أو في متغيّر بيئة. لا تلصقه في رابط أو في محادثة مشتركة أبدًا.' },
      { icon: 'x', title: 'افصل الاتصال بنقرة', body: 'ألغِ التطبيق الذي سجّل الدخول من الإعدادات، التطبيقات المعتمدة. وجدّد مفتاحك من الإعدادات، API وMCP فيتوقف المفتاح القديم فورًا.' },
    ],
    faqTitle: 'أسئلة عن {name} وتدوين',
    relatedTitle: 'أدوات ذكاء اصطناعي أخرى تعمل مع تدوين',
    allClients: 'اعرض كل الأدوات',
    ctaTitle: 'خطّط أسبوعك على لينكدإن من {name}',
    ctaBody: 'ابدأ تجربة لسبعة أيام، اربط لينكدإن، ثم اربط {name}.',
    sharedFaq: [
      {
        title: 'هل يوجد تطبيق رسمي لتدوين في {name}؟',
        content: 'لا. تدوين غير مُدرج في أي متجر لتطبيقات الذكاء الاصطناعي. تضيفه إلى {name} بنفسك كخادم MCP بعيد بالخطوات في هذه الصفحة، ويستخدم {name} الأدوات نفسها التي يستخدمها الوكيل داخل تدوين.',
      },
      {
        title: 'هل سينشر {name} دون أن يسألني؟',
        content: 'لا يستدعي {name} تدوين إلا عندما تطلب منه، وكثير من الأدوات تطلب تأكيدك قبل كل إجراء. ولا يستطيع حذف المنشورات أو إعادة كتابة منشور مجدول. كل منشور يجدوله يظهر في تقويمك، حيث يمكنك تعديله أو حذفه.',
      },
      {
        title: 'كيف أفصل {name}؟',
        content: 'إن كان {name} قد سجّل الدخول، فألغِه في تدوين من الإعدادات، التطبيقات المعتمدة. وإن كان يستخدم مفتاحك البرمجي، فجدّد المفتاح من الإعدادات، API وMCP، فيتوقف القديم فورًا.',
      },
      {
        title: 'ما الخطة التي أحتاجها في تدوين؟',
        content: 'اتصال MCP متاح في كل خطة مدفوعة، وكل خطة تبدأ بسبعة أيام مجانًا. الصور والفيديوهات التي يولّدها الوكيل تستهلك أرصدة الذكاء الاصطناعي في خطتك.',
      },
    ],
  },
  kinds: { assistant: 'مساعدات المحادثة', coding: 'وكلاء البرمجة والمحررات' },
  items: {
    chatgpt: {
      title: 'ChatGPT MCP: جدولة منشورات لينكدإن من ChatGPT | تدوين',
      description: 'أضف تدوين إلى ChatGPT كتطبيق MCP مخصّص، وسجّل الدخول، واطلب من ChatGPT كتابة منشورات لينكدإن وجدولتها. الخطوات والخطط وأمثلة الطلبات.',
      h1: 'جدولة منشورات لينكدإن والشبكات الاجتماعية مع ChatGPT',
      intro: 'أضف تدوين إلى ChatGPT كتطبيق MCP مخصّص وسجّل الدخول مرة واحدة. ثم اطلب من ChatGPT مسودة منشور على لينكدإن، أو مراجعة أسبوعك، أو جدولة منشور على صفحتك.',
      blurb: 'تطبيق MCP مخصّص، بتسجيل الدخول',
      methods: {
        oauth: {
          label: 'تسجيل الدخول (OAuth)',
          how: 'تطبيق مخصّص في ChatGPT على الويب',
          steps: [
            'في ChatGPT على الويب افتح Settings → Apps → Advanced settings وفعّل Developer mode. في Business يستطيع ذلك المسؤول أو المالك فقط، وفي Enterprise وEdu يمكن للمسؤول أن يمنحك الصلاحية.',
            'من Settings → Apps اضغط Create. سمّه Tadween، واختر OAuth للمصادقة، والصق عنوان خادم MCP هذا:',
            'اضغط Scan Tools، وسجّل الدخول إلى تدوين في النافذة التي تُفتح ووافق، ثم اضغط Create.',
            'في محادثة جديدة اختر Tadween من قائمة الأدوات، أو اذكره بعلامة @.',
          ],
        },
      },
      demo: {
        lang: 'ar',
        prompt: 'اكتب بوست لينكدإن لصفحة Nile Studio عن ليلة الاستوديو المفتوح يوم ٢٢ وجدوله يوم الحد الساعة ٩ الصبح.',
        tools: [
          { tool: 'integrationList', label: 'وجد Nile Studio على لينكدإن' },
          { tool: 'integrationSchedulePostTool', label: 'جدول منشورًا واحدًا' },
        ],
        reply: 'تمام. هيتنشر على Nile Studio يوم الحد الساعة ٩:٠٠. افتحه في تدوين لو حابب تعدّل حاجة قبلها.',
        posts: [{ net: 'linkedin-page', name: 'Nile Studio', text: 'ستوديو النيل بيفتح أبوابه يوم ٢٢…', when: 'الأحد ٠٩:٠٠' }],
      },
      prompts: [
        { lang: 'ar', text: 'اعرض قنواتي في تدوين.' },
        { lang: 'ar', text: 'اكتب بوست لينكدإن عن الويبينار بتاعنا وجدوله يوم الحد الساعة ١٠ الصبح.' },
        { lang: 'ar', text: 'إيه المنشورات اللي متجدولة الأسبوع ده؟' },
        { lang: 'ar', text: 'احفظ مسودة عن الموظف الجديد ليوم الخميس، ومتجدولهاش لسه.' },
        { lang: 'en', text: 'Turn this article into a LinkedIn post for my company page and schedule it for Tuesday at 9:00.' },
        { lang: 'en', text: 'What is scheduled on LinkedIn this week?' },
      ],
      notes: [
        'الجدولة إجراء كتابة. يذكر مركز مساعدة OpenAI أن دعم MCP الكامل، بما فيه إجراءات الكتابة، تجريبي على خطط ChatGPT Business وEnterprise وEdu. أما على Pro فتطبيقات MCP المخصّصة للقراءة فقط حاليًا: يعرض ChatGPT قنواتك ومنشوراتك لكنه لا يجدول. ولا تذكر OpenAI خططًا أخرى لتطبيقات MCP المخصّصة.',
        'تطبيقات MCP المخصّصة تعمل في ChatGPT على الويب، لا في تطبيقات الجوال. وقد يطلب ChatGPT تأكيدك قبل الجدولة.',
      ],
      faq: [
        {
          title: 'أي خطة في ChatGPT تستطيع الجدولة في تدوين؟',
          content: 'تذكر OpenAI أن دعم MCP الكامل، مع إجراءات الكتابة مثل الجدولة، متاح تجريبيًا على Business وEnterprise وEdu. أما Pro فيربط تطبيقات MCP المخصّصة للقراءة فقط، فيعرض ChatGPT تقويمك دون أن يضيف إليه. راجع مركز مساعدة OpenAI المرتبط أعلاه للقائمة الحالية.',
        },
        {
          title: 'هل أحتاج مفتاحًا برمجيًا مع ChatGPT؟',
          content: 'لا. إعداد تدوين في ChatGPT يسجّل الدخول عبر OAuth: تسجّل الدخول إلى تدوين في نافذة وتوافق، ولا مفتاح تلصقه.',
        },
        {
          title: 'هل ChatGPT هو نفسه Codex؟',
          content: 'لا. ChatGPT مساعد المحادثة، وCodex وكيل البرمجة من OpenAI في الطرفية والمحرر. كلاهما يتصل بتدوين، ويستطيع Codex أيضًا استخدام مفتاح برمجي. راجع صفحة Codex لخطواته.',
        },
      ],
    },
    claude: {
      title: 'موصِّل Claude MCP: جدولة منشورات لينكدإن | تدوين',
      description: 'أضف تدوين إلى Claude كموصِّل مخصّص على الويب أو سطح المكتب، وسجّل الدخول، واطلب من Claude كتابة منشورات لينكدإن وجدولتها. الخطوات وأمثلة الطلبات.',
      h1: 'جدولة منشورات لينكدإن والشبكات الاجتماعية مع Claude',
      intro: 'أضف تدوين إلى Claude كموصِّل مخصّص، على claude.ai أو Claude Desktop، وسجّل الدخول مرة واحدة. ثم اطلب من Claude أن يخطط أسبوعك على لينكدإن، أو يكتب منشورًا بالعربية، أو يجدول منشورًا على صفحتك.',
      blurb: 'موصِّل مخصّص على الويب وسطح المكتب',
      methods: {
        oauth: {
          label: 'تسجيل الدخول (OAuth)',
          how: 'موصِّل مخصّص، على الويب أو سطح المكتب',
          steps: [
            'في Claude افتح Customize → Connectors. في خطط Team وEnterprise يضيفه المالك مرة واحدة من Organization settings → Connectors، ثم يضغط كل عضو Connect.',
            'اضغط ‎+ Add ثم Add custom connector. سمّه Tadween، والصق هذا العنوان واضغط Continue:',
            'راجع إعدادات المصادقة التي اكتشفها Claude واضغط Continue.',
            'اترك Sign in now، واختر Register automatically كعميل OAuth، واضغط Add. سجّل الدخول إلى تدوين في النافذة التي تُفتح ووافق على مساحة عملك.',
            'في المحادثة اضغط + → Connectors وفعّل Tadween.',
          ],
        },
      },
      demo: {
        lang: 'ar',
        prompt: 'خطّط ٣ بوستات لينكدإن لـCairo Coffee Co. الأسبوع الجاي، واحد منهم بالإنجليزي، وجدولهم الاتنين والأربع والجمعة الساعة ٨:٣٠.',
        tools: [
          { tool: 'integrationList', label: 'وجد Cairo Coffee Co. على لينكدإن' },
          { tool: 'integrationSchedulePostTool', label: 'جدول ٣ منشورات' },
        ],
        reply: 'التلاتة على التقويم، وبوست الأربع بالإنجليزي.',
        posts: [
          { net: 'linkedin-page', name: 'Cairo Coffee Co.', text: 'بن جديد من سيدامو وصل…', when: 'الاثنين ٠٨:٣٠' },
          { net: 'linkedin-page', name: 'Cairo Coffee Co.', text: 'Cupping session this Thursday at 18:00…', when: 'الأربعاء ٠٨:٣٠' },
          { net: 'linkedin-page', name: 'Cairo Coffee Co.', text: 'تعرّف على الفريق اللي ورا المحمصة الجديدة…', when: 'الجمعة ٠٨:٣٠' },
        ],
      },
      prompts: [
        { lang: 'ar', text: 'اعرض قنواتي في تدوين.' },
        { lang: 'ar', text: 'خطّط لي ٣ بوستات لينكدإن للأسبوع الجاي، واحد منهم بالإنجليزي.' },
        { lang: 'ar', text: 'اكتب بوست عن العرض الجديد وحطه مسودة يوم الخميس.' },
        { lang: 'ar', text: 'وريني كل المنشورات المتجدولة الأسبوع الجاي يوم بيوم.' },
        { lang: 'en', text: 'Write a LinkedIn post from these meeting notes and save it as a draft for Monday.' },
        { lang: 'en', text: 'Schedule a short X version of my last LinkedIn post for tomorrow at noon.' },
      ],
      notes: [
        'الموصِّلات المخصّصة متاحة في خطط Claude المجانية وPro وMax وTeam وEnterprise. الخطة المجانية تسمح بموصِّل مخصّص واحد.',
        'يتصل Claude من خوادم Anthropic، لذلك يعمل الموصِّل نفسه على claude.ai وClaude Desktop وCowork.',
      ],
      faq: [
        {
          title: 'هل أحتاج مفتاحًا برمجيًا مع Claude؟',
          content: 'لا. يتصل Claude عبر OAuth: تسجّل الدخول إلى تدوين في نافذة وتوافق. لا شيء تلصقه سوى العنوان.',
        },
        {
          title: 'أي خيار أختار لعميل OAuth؟',
          content: 'اختر Register automatically. يدعم تدوين التسجيل الديناميكي للعملاء، فيسجّل Claude نفسه في أول اتصال.',
        },
        {
          title: 'ما الفرق بين Claude وClaude Code وCowork؟',
          content: 'Claude هو مساعد المحادثة على الويب وسطح المكتب. وCowork هو Claude Desktop حين ينجز مهام على ملفاتك، ويستخدم الموصِّلات نفسها. أما Claude Code فوكيل البرمجة في الطرفية، وله أمر إعداد خاص من سطر واحد.',
        },
      ],
    },
    'claude-cowork': {
      title: 'Claude Cowork MCP: جدولة منشورات لينكدإن | تدوين',
      description: 'اربط تدوين مرة واحدة في Claude واستخدمه في Cowork: حوّل الملفات على جهازك إلى منشورات لينكدإن وجدولها. بلا طرفية وبلا مفتاح برمجي.',
      h1: 'جدولة منشورات لينكدإن والشبكات الاجتماعية مع Claude Cowork',
      intro: 'يستخدم Cowork الموصِّلات المربوطة بحسابك في Claude. أضف تدوين مرة واحدة، ثم دع Cowork يحوّل مجلد ملاحظات أو تقريرًا أو عرضًا تقديميًا إلى منشورات لينكدإن على تقويمك.',
      blurb: 'مهام Claude Desktop، بالموصِّل نفسه',
      methods: {
        oauth: {
          label: 'تسجيل الدخول (OAuth)',
          how: 'موصِّل مخصّص على حسابك في Claude',
          steps: [
            'في Claude Desktop افتح Customize → Connectors. في خطط Team وEnterprise يضيفه المالك أولًا من Organization settings → Connectors.',
            'اضغط ‎+ Add ثم Add custom connector. سمّه Tadween، والصق هذا العنوان واضغط Continue:',
            'راجع إعدادات المصادقة التي اكتشفها Claude واضغط Continue.',
            'اترك Sign in now، واختر Register automatically كعميل OAuth، واضغط Add. سجّل الدخول إلى تدوين ووافق على مساحة عملك.',
            'الموصِّلات المخصّصة على حسابك في Claude تعمل في Cowork أيضًا. ابدأ مهمة واطلب منها عرض قنواتك في تدوين.',
          ],
        },
      },
      demo: {
        lang: 'ar',
        prompt: 'اقرا ملاحظات الإطلاق اللي في فولدر Q4 واكتب منها بوستين لينكدإن واحفظهم مسودات للأسبوع الجاي.',
        tools: [
          { tool: 'integrationList', label: 'وجد Maadi Lane Homes على لينكدإن' },
          { tool: 'integrationSchedulePostTool', label: 'حفظ مسودتين' },
        ],
        reply: 'المسودتين في تدوين ليوم الاتنين والخميس، وكل واحدة فيها الأرقام اللي في ملاحظاتك.',
        posts: [
          { net: 'linkedin-page', name: 'Maadi Lane Homes', text: 'المرحلة التانية مفتوحة للمعاينة…', when: 'مسودة · الاثنين' },
          { net: 'linkedin-page', name: 'Maadi Lane Homes', text: 'أكتر حاجة سألنا عنها المشترين الربع ده…', when: 'مسودة · الخميس' },
        ],
      },
      prompts: [
        { lang: 'ar', text: 'اعرض قنواتي في تدوين.' },
        { lang: 'ar', text: 'اقرا الملاحظات اللي في الفولدر ده واكتب منها بوستين لينكدإن مسودة.' },
        { lang: 'ar', text: 'جدول بوست عن الإطلاق يوم التلات الساعة ٩ الصبح.' },
        { lang: 'ar', text: 'ضيف الصورة اللي على اللينك ده لمكتبة الوسائط واستخدمها في بوست لينكدإن جديد يوم الاتنين.' },
        { lang: 'en', text: 'Turn the report in this folder into three LinkedIn posts and save them as drafts.' },
        { lang: 'en', text: 'What goes out on LinkedIn this week? Summarise it in a table.' },
      ],
      notes: [
        'يذكر مركز مساعدة Anthropic أن الموصِّلات المخصّصة متاحة في Claude وCowork وClaude Desktop على الخطط المجانية وPro وMax وTeam وEnterprise.',
        'تُضاف الوسائط من رابط عام (يستوردها تدوين إلى مكتبة الوسائط). يقرأ Cowork ملفاتك المحلية ليكتب المنشورات، لكنه يرفع الوسائط من رابط فقط.',
      ],
      faq: [
        {
          title: 'هل أربط تدوين بشكل منفصل لـCowork؟',
          content: 'لا. يستخدم Cowork الموصِّلات المخصّصة على حسابك في Claude. إن كان تدوين مربوطًا في Claude، ففعّله في مهمة Cowork.',
        },
        {
          title: 'هل أستطيع استخدام ملف إعدادات Claude Desktop بدلًا منه؟',
          content: 'ليس مع Cowork. تذكر Anthropic أن الخوادم المحلية في claude_desktop_config.json غير متاحة في Cowork. استخدم الموصِّل المخصّص أعلاه.',
        },
        {
          title: 'هل أحتاج مفتاحًا برمجيًا؟',
          content: 'لا. يسجّل الموصِّل الدخول عبر OAuth: توافق عليه في نافذة تدوين ولا مفتاح تلصقه.',
        },
      ],
    },
    perplexity: {
      title: 'موصِّل Perplexity MCP: جدولة منشورات لينكدإن | تدوين',
      description: 'أضف تدوين إلى Perplexity كموصِّل بعيد مخصّص عبر OAuth، ثم ابحث في موضوع واطلب كتابة منشور لينكدإن عنه وجدولته في المحادثة نفسها، بالعربية أو الإنجليزية.',
      h1: 'جدولة منشورات لينكدإن والشبكات الاجتماعية مع Perplexity',
      intro: 'أضف تدوين إلى Perplexity كموصِّل بعيد مخصّص وسجّل الدخول. ابحث في موضوع، ثم اطلب من Perplexity أن يحوّل ما وجده إلى منشور لينكدإن ويجدوله.',
      blurb: 'موصِّل بعيد مخصّص، بتسجيل الدخول',
      methods: {
        oauth: {
          label: 'تسجيل الدخول (OAuth)',
          how: 'موصِّل بعيد مخصّص',
          steps: [
            'في Perplexity افتح Account settings → Connectors واضغط ‎+ Custom connector، ثم اختر Remote.',
            'سمّه Tadween والصق عنوان MCP Server URL هذا:',
            'اجعل Authentication على OAuth وTransport على Streamable HTTP. ضع علامة الإقرار واضغط Add.',
            'اضغط بطاقة Tadween، وسجّل الدخول إلى تدوين ووافق على مساحة عملك.',
          ],
        },
      },
      demo: {
        lang: 'ar',
        prompt: 'لخّص أخبار قواعد الفينتك في مصر الأسبوع ده في بوست لينكدإن لـRakeeza وجدوله الخميس الساعة ١٠.',
        tools: [
          { tool: 'integrationList', label: 'وجد Rakeeza على لينكدإن' },
          { tool: 'integrationSchedulePostTool', label: 'جدول منشورًا واحدًا' },
        ],
        reply: 'متجدول الخميس الساعة ١٠:٠٠، والمصادر التلاتة في آخر البوست.',
        posts: [{ net: 'linkedin', name: 'Rakeeza', text: '٣ تغييرات في قواعد الفينتك الأسبوع ده…', when: 'الخميس ١٠:٠٠' }],
      },
      prompts: [
        { lang: 'ar', text: 'اعرض قنواتي في تدوين.' },
        { lang: 'ar', text: 'ابحث عن أخبار السوق الأسبوع ده واكتب منها بوست لينكدإن بالعربي.' },
        { lang: 'ar', text: 'جدول البوست ده لصفحة الشركة بكرة الساعة ٩.' },
        { lang: 'ar', text: 'إيه اللي على تقويم لينكدإن الأسبوع الجاي؟' },
        { lang: 'en', text: 'Research what changed in LinkedIn’s algorithm this month and draft a post for my profile.' },
        { lang: 'en', text: 'Turn your last answer into a LinkedIn post and schedule it for tomorrow at 9:00.' },
      ],
      notes: ['يضع Perplexity الموصِّلات المخصّصة ضمن مزايا Enterprise؛ راجع مركز مساعدته المرتبط أدناه لمعرفة خطتك. وفي Enterprise لا يضيف الأعضاء موصِّلاتهم إلا إذا سمح المسؤول، وهذا معطّل افتراضيًا.'],
      faq: [
        {
          title: 'هل أحتاج مفتاحًا برمجيًا مع Perplexity؟',
          content: 'لا. اختر OAuth عند إضافة الموصِّل. يدعم تدوين التسجيل الديناميكي للعملاء، فلا يحتاج Perplexity إلى Client ID أو Client Secret.',
        },
        {
          title: 'أي Transport أختار؟',
          content: 'Streamable HTTP. خادم MCP في تدوين يعمل بهذا النقل على العنوان في هذه الصفحة.',
        },
        {
          title: 'يظهر خطأ على الموصِّل. ماذا أراجع؟',
          content: 'تأكد أنك لصقت العنوان المنتهي بـ‎/mcp-oauth-dynamic، واخترت OAuth، ووافقت في نافذة الدخول وأنت مسجّل في تدوين. احذف الموصِّل وأضفه من جديد إن أُغلقت نافذة الدخول مبكرًا.',
        },
      ],
    },
    'claude-code': {
      title: 'Claude Code MCP: جدولة منشورات لينكدإن | تدوين',
      description: 'اربط تدوين بـClaude Code بأمر واحد، بتسجيل الدخول أو بمفتاح برمجي، وجدول منشورات لينكدإن من الطرفية: سجل التغييرات والإطلاقات وملاحظات الإصدار.',
      h1: 'جدولة منشورات لينكدإن والشبكات الاجتماعية مع Claude Code',
      intro: 'أمر واحد يضيف تدوين إلى Claude Code. ثم حوّل سجل التغييرات أو ملف README أو إصدارًا جديدًا إلى منشورات لينكدإن دون أن تغادر الطرفية.',
      blurb: 'أمر واحد في الطرفية',
      methods: {
        oauth: {
          label: 'تسجيل الدخول (OAuth)',
          how: 'أضف الخادم ثم سجّل الدخول',
          steps: [
            'شغّل هذا في الطرفية. أضف ‎--scope user لاستخدامه في كل مشروع:',
            'شغّل Claude Code واكتب ‎/mcp، واختر tadween ثم Authenticate. سجّل الدخول إلى تدوين في المتصفح ووافق.',
          ],
        },
        key: {
          label: 'مفتاح برمجي',
          how: 'أضف الخادم بمفتاحك',
          steps: [
            'انسخ مفتاحك من صفحة API وMCP في إعدادات تدوين وشغّل هذا، مع وضع المفتاح مكان ‎<your-api-key>:',
            'تحقّق: يجب أن يظهر tadween بحالة Connected.',
          ],
        },
      },
      demo: {
        lang: 'ar',
        prompt: 'اقرا CHANGELOG.md واكتب بوست لينكدإن عن إصدار 2.4 لصفحة Rakeeza وجدوله بكرة الساعة ٩.',
        tools: [
          { tool: 'integrationList', label: 'وجد Rakeeza على لينكدإن' },
          { tool: 'integrationSchedulePostTool', label: 'جدول منشورًا واحدًا' },
        ],
        reply: 'متجدول بكرة الساعة ٩:٠٠، وفيه أهم ٣ تغييرات في 2.4.',
        posts: [{ net: 'linkedin-page', name: 'Rakeeza', text: 'نزل إصدار 2.4: تصدير بلغتين…', when: 'السبت ٠٩:٠٠' }],
      },
      prompts: [
        { lang: 'ar', text: 'اعرض قنواتي في تدوين.' },
        { lang: 'ar', text: 'اقرا CHANGELOG.md واكتب بوست لينكدإن بالعربي عن الإصدار الجديد.' },
        { lang: 'ar', text: 'جدول البوست ده على صفحة الشركة يوم الحد الساعة ٩.' },
        { lang: 'ar', text: 'إيه اللي متجدول على صفحتنا في لينكدإن الأسبوع ده؟' },
        { lang: 'en', text: 'Write a LinkedIn post from the last five commits and save it as a draft.' },
        { lang: 'en', text: 'Turn README.md into a launch post for LinkedIn and a short one for X, both tomorrow at 9:00.' },
      ],
      notes: ['أبقِ المفتاح خارج السكربتات والمستودعات المشتركة. واستخدم تسجيل الدخول على الأجهزة المشتركة.'],
      faq: [
        {
          title: 'تسجيل الدخول أم المفتاح البرمجي؟',
          content: 'تسجيل الدخول أبسط ولا مفتاح تحفظه. استخدم المفتاح في السكربتات وCI حيث لا يمكن فتح متصفح، واحفظه كسرّ، لا في رابط.',
        },
        {
          title: 'هل أستطيع استخدامه في كل المشاريع؟',
          content: 'نعم. أضف ‎--scope user إلى أمر claude mcp add فيصبح تدوين متاحًا في كل مشاريعك.',
        },
        {
          title: 'الأدوات لا تظهر. ماذا أراجع؟',
          content: 'شغّل claude mcp list. إن لم يكن tadween بحالة Connected، فسجّل الدخول من جديد من ‎/mcp، أو تأكد أن المفتاح بلا مسافات زائدة ولم يُجدَّد.',
        },
      ],
    },
    codex: {
      title: 'Codex MCP: جدولة منشورات لينكدإن من Codex | تدوين',
      description: 'أضف تدوين إلى Codex من OpenAI في الطرفية أو إضافة المحرر، بتسجيل الدخول أو بمفتاح من متغيّر بيئة، وجدول منشورات لينكدإن من كودك.',
      h1: 'جدولة منشورات لينكدإن والشبكات الاجتماعية مع Codex',
      intro: 'أضف تدوين إلى Codex مرة واحدة فيعمل في Codex CLI وإضافة المحرر وتطبيق ChatGPT لسطح المكتب، لأنها تتشارك الإعدادات نفسها. ثم انشر عمّا تطلقه.',
      blurb: 'الطرفية وإضافة المحرر وتطبيق سطح المكتب',
      methods: {
        oauth: {
          label: 'تسجيل الدخول (OAuth)',
          how: 'أضف الخادم ثم سجّل الدخول',
          steps: ['شغّل هذا في الطرفية:', 'سجّل الدخول: تُفتح نافذة في المتصفح. سجّل الدخول إلى تدوين ووافق.'],
        },
        key: {
          label: 'مفتاح برمجي',
          how: 'رمز Bearer من متغيّر بيئة',
          steps: [
            'انسخ مفتاحك من صفحة API وMCP في إعدادات تدوين وضعه في متغيّر بيئة، في ملف إعدادات الطرفية:',
            'أضف الخادم إلى ‎~/.codex/config.toml. يقرأ Codex المفتاح من المتغيّر، فلا يُكتب في الملف أبدًا:',
            'تحقّق: يجب أن يظهر tadween في القائمة.',
          ],
        },
      },
      demo: {
        lang: 'ar',
        prompt: 'لسه عاملين merge لميزة التصدير بالعربي. اكتب بوست لينكدإن عنها لـNile Studio وجدوله الاتنين الساعة ١٠.',
        tools: [
          { tool: 'integrationList', label: 'وجد Nile Studio على لينكدإن' },
          { tool: 'integrationSchedulePostTool', label: 'جدول منشورًا واحدًا' },
        ],
        reply: 'متجدول الاتنين الساعة ١٠:٠٠ على Nile Studio.',
        posts: [{ net: 'linkedin-page', name: 'Nile Studio', text: 'دلوقتي تقدر تصدّر كل تقرير بالعربي…', when: 'الاثنين ١٠:٠٠' }],
      },
      prompts: [
        { lang: 'ar', text: 'اعرض قنواتي في تدوين.' },
        { lang: 'ar', text: 'اكتب بوست لينكدإن عن الميزة اللي لسه عاملينها merge.' },
        { lang: 'ar', text: 'وريني المنشورات اللي متجدولة الأسبوع الجاي.' },
        { lang: 'ar', text: 'إيه المنشورات اللي فشل نشرها الأسبوع ده؟' },
        { lang: 'en', text: 'Summarise this pull request as a LinkedIn post and save it as a draft.' },
        { lang: 'en', text: 'Schedule a release post on LinkedIn and X for Tuesday at 9:00.' },
      ],
      notes: ['يتشارك تطبيق ChatGPT لسطح المكتب وCodex CLI وإضافة المحرر الملف ‎~/.codex/config.toml، فتُعدّه مرة واحدة.'],
      faq: [
        {
          title: 'هل أستطيع إضافته من إضافة المحرر بدلًا من ذلك؟',
          content: 'نعم. افتح قائمة الترس، ثم MCP servers، ثم Add server. اختر Streamable HTTP والصق العنوان واحفظ، ثم أعد تشغيل الإضافة واضغط Authenticate.',
        },
        {
          title: 'لماذا متغيّر بيئة للمفتاح؟',
          content: 'يخبر bearer_token_env_var الأداة Codex بالمتغيّر الذي يحمل الرمز، فيبقى المفتاح خارج config.toml وخارج أي مستودع.',
        },
        {
          title: 'هل Codex هو نفسه ChatGPT؟',
          content: 'لا. Codex وكيل البرمجة من OpenAI، وChatGPT مساعد المحادثة. يتصل Codex بتسجيل الدخول أو بمفتاح برمجي، وإعداد تدوين في ChatGPT يسجّل الدخول. وكلاهما يجدول في تدوين، وChatGPT على الخطط التي تذكرها OpenAI لإجراءات الكتابة.',
        },
      ],
    },
    cursor: {
      title: 'Cursor MCP: جدولة منشورات لينكدإن من Cursor | تدوين',
      description: 'أضف تدوين إلى ملف mcp.json في Cursor، بتسجيل الدخول أو بمفتاح برمجي يُقرأ من بيئتك، واطلب من وكيل Cursor جدولة منشورات لينكدإن عمّا تبنيه.',
      h1: 'جدولة منشورات لينكدإن والشبكات الاجتماعية من Cursor',
      intro: 'أضف كتلة واحدة إلى ملف mcp.json في Cursor وسجّل الدخول. ثم اطلب من وكيل Cursor أن يعلن عن ميزة على لينكدإن والكود ما زال مفتوحًا.',
      blurb: 'بضعة أسطر في mcp.json',
      methods: {
        oauth: {
          label: 'تسجيل الدخول (OAuth)',
          how: 'أضف الخادم ثم سجّل الدخول',
          steps: [
            'أضف هذا إلى الملف ‎~/.cursor/mcp.json، أو إلى ‎.cursor/mcp.json داخل مشروع واحد، واحفظ:',
            'افتح Customize في الشريط الجانبي لـCursor وتأكد أن tadween مفعّل. وحين يطلب Cursor تسجيل الدخول، سجّل الدخول إلى تدوين في المتصفح ووافق.',
          ],
        },
        key: {
          label: 'مفتاح برمجي',
          how: 'مفتاح يُقرأ من بيئتك',
          steps: [
            'انسخ مفتاحك من صفحة API وMCP في إعدادات تدوين وضعه في متغيّر بيئة، في ملف إعدادات الطرفية:',
            'أضف هذا إلى ‎~/.cursor/mcp.json واحفظ. يقرأ Cursor المفتاح من المتغيّر، فلا يُكتب في الملف أبدًا:',
            'أعد تشغيل Cursor، ثم افتح Customize في الشريط الجانبي وتأكد أن tadween مفعّل.',
          ],
        },
      },
      demo: {
        lang: 'ar',
        prompt: 'اكتب بوست لينكدإن عن الوضع الداكن اللي لسه خلصناه وجدوله على البروفايل بتاعي الأربع الساعة ١١.',
        tools: [
          { tool: 'integrationList', label: 'وجد حسابك على لينكدإن' },
          { tool: 'integrationSchedulePostTool', label: 'جدول منشورًا واحدًا' },
        ],
        reply: 'متجدول الأربع الساعة ١١:٠٠ على البروفايل بتاعك.',
        posts: [{ net: 'linkedin', name: 'Omar Hassan', text: 'الوضع الداكن نزل، وبيمشي مع إعدادات جهازك…', when: 'الأربعاء ١١:٠٠' }],
      },
      prompts: [
        { lang: 'ar', text: 'اعرض قنواتي في تدوين.' },
        { lang: 'ar', text: 'اكتب بوست لينكدإن عن الميزة اللي في البرانش ده بالعربي.' },
        { lang: 'ar', text: 'جدول البوست ده على البروفايل بتاعي يوم الأربع الساعة ١١.' },
        { lang: 'ar', text: 'إيه اللي هيتنشر على لينكدإن بكرة؟' },
        { lang: 'en', text: 'Write a LinkedIn post about the feature in this branch and save it as a draft.' },
        { lang: 'en', text: 'Schedule a thread on X and a LinkedIn post about this release for Monday at 9:00.' },
      ],
      notes: ['في Enterprise قد يحدّد المسؤول خوادم MCP المسموح بها في Cursor.'],
      faq: [
        {
          title: 'إعداد عام أم لكل مشروع؟',
          content: 'يجعل ‎~/.cursor/mcp.json تدوين متاحًا في كل مشروع. أما ‎.cursor/mcp.json داخل مشروع فيحصره فيه.',
        },
        {
          title: 'هل أستطيع إبقاء المفتاح خارج mcp.json؟',
          content: 'نعم. طريقة المفتاح أعلاه تستخدم ‎${env:TADWEEN_API_KEY}، فلا يوجد في الملف سوى اسم المتغيّر. ومع تسجيل الدخول لا مفتاح إطلاقًا.',
        },
        {
          title: 'الأدوات لا تظهر. ماذا أراجع؟',
          content: 'افتح لوحة Output واختر MCP Logs. تأكد من العنوان، وأن TADWEEN_API_KEY مضبوط حيث يبدأ Cursor، وأن المفتاح لم يُجدَّد. ثم أعد تشغيل Cursor.',
        },
      ],
    },
    vscode: {
      title: 'VS Code MCP: جدولة منشورات لينكدإن مع Copilot | تدوين',
      description: 'أضف تدوين إلى ملف mcp.json في VS Code وجدول منشورات لينكدإن من وضع الوكيل في GitHub Copilot. سجّل الدخول، أو احفظ مفتاحك في مخزن أسرار VS Code.',
      h1: 'جدولة منشورات لينكدإن والشبكات الاجتماعية من VS Code',
      intro: 'أضف تدوين إلى VS Code فيستطيع وضع الوكيل في GitHub Copilot جدولة المنشورات لك. سجّل الدخول، أو دع VS Code يطلب مفتاحك مرة واحدة ويحفظه في مخزن أسراره.',
      blurb: 'وضع الوكيل في GitHub Copilot',
      methods: {
        oauth: {
          label: 'تسجيل الدخول (OAuth)',
          how: 'أضف الخادم ثم سجّل الدخول',
          steps: [
            'أضف هذا إلى ‎.vscode/mcp.json في مشروعك، أو شغّل MCP: Open User Configuration لاستخدامه في كل مكان، واحفظ:',
            'اضغط Start فوق الخادم. يطلب VS Code تسجيل الدخول: اسمح به، وسجّل الدخول إلى تدوين ووافق.',
          ],
        },
        key: {
          label: 'مفتاح برمجي',
          how: 'مفتاح يحفظه VS Code في مخزن الأسرار',
          steps: [
            'أنشئ ‎.vscode/mcp.json في مشروعك، أو شغّل MCP: Open User Configuration من لوحة الأوامر.',
            'الصق هذا واحفظ. المفتاح لا يُكتب في الملف:',
            'اضغط Start فوق الخادم، والصق مفتاحك من صفحة API وMCP في إعدادات تدوين حين يطلبه VS Code.',
            'افتح Copilot Chat، وانتقل إلى وضع Agent، وتأكد أن tadween مفعّل في قائمة الأدوات.',
          ],
        },
      },
      demo: {
        lang: 'ar',
        prompt: 'اكتب مسودة بوست لينكدإن عن المكتبة مفتوحة المصدر اللي نزلناها النهارده واحفظها ليوم الحد.',
        tools: [
          { tool: 'integrationList', label: 'وجد Qolla على لينكدإن' },
          { tool: 'integrationSchedulePostTool', label: 'حفظ مسودة واحدة' },
        ],
        reply: 'المسودة في تدوين ليوم الحد. افتحها هناك وضيف صورة قبل ما تجدولها.',
        posts: [{ net: 'linkedin-page', name: 'Qolla', text: 'فتحنا مصدر مكتبة قراءة التواريخ بالعربي…', when: 'مسودة · الأحد' }],
      },
      prompts: [
        { lang: 'ar', text: 'اعرض قنواتي في تدوين.' },
        { lang: 'ar', text: 'اكتب بوست لينكدإن عن المكتبة اللي نزلناها النهارده.' },
        { lang: 'ar', text: 'إيه اللي هيتنشر على لينكدإن بكرة؟' },
        { lang: 'ar', text: 'جدول بوست الإصدار على لينكدإن الخميس الساعة ١٠.' },
        { lang: 'en', text: 'Write a LinkedIn post about the changes in this workspace and save it as a draft.' },
        { lang: 'en', text: 'Show me next week’s LinkedIn posts.' },
      ],
      notes: ['في Copilot Business وEnterprise تكون سياسة «MCP servers in Copilot» معطّلة افتراضيًا ويجب أن يفعّلها المسؤول. ولا تتأثر بها خطط Copilot Free وPro وPro+‎.'],
      faq: [
        {
          title: 'أين يحفظ VS Code مفتاحي؟',
          content: 'مع كتلة inputs أعلاه يطلب VS Code المفتاح في أول تشغيل للخادم ويحفظه في مخزن أسراره. لا يُكتب في mcp.json.',
        },
        {
          title: 'هل يعمل مع GitHub Copilot فقط؟',
          content: 'أدوات MCP في VS Code يستخدمها Copilot Chat في وضع Agent. فعّل tadween من قائمة الأدوات في المحادثة.',
        },
        {
          title: 'الخادم لا يبدأ. ماذا أراجع؟',
          content: 'تأكد من العنوان، وأن المفتاح بلا مسافات زائدة ولم يُجدَّد. شغّل MCP: List Servers لإعادة تشغيله ورؤية مخرجاته.',
        },
      ],
    },
    'grok-build': {
      title: 'Grok Build MCP: جدولة منشورات لينكدإن | تدوين',
      description: 'اربط تدوين بـGrok Build من xAI بأمر grok mcp add واحد، بتسجيل الدخول أو بترويسة مفتاح برمجي، وجدول منشورات لينكدإن من الطرفية.',
      h1: 'جدولة منشورات لينكدإن والشبكات الاجتماعية مع Grok Build',
      intro: 'أمر واحد يضيف تدوين إلى Grok Build، وكيل البرمجة من xAI. سجّل الدخول في المتصفح أول مرة، ثم انشر عن عملك من الطرفية.',
      blurb: 'وكيل البرمجة من xAI، بأمر واحد',
      methods: {
        oauth: {
          label: 'تسجيل الدخول (OAuth)',
          how: 'أضف الخادم ثم سجّل الدخول',
          steps: ['شغّل هذا في الطرفية:', 'أول مرة يستخدم فيها Grok Build تدوين تُفتح نافذة في المتصفح. سجّل الدخول إلى تدوين ووافق.'],
        },
        key: {
          label: 'مفتاح برمجي',
          how: 'ترويسة تُقرأ من بيئتك',
          steps: [
            'انسخ مفتاحك من صفحة API وMCP في إعدادات تدوين وضعه في متغيّر بيئة، في ملف إعدادات الطرفية:',
            'أضف الخادم. علامات الاقتباس المفردة تمنع الطرفية من وضع المفتاح، ويقرأ Grok Build المتغيّر ‎${TADWEEN_API_KEY} بنفسه عند الاتصال:',
          ],
        },
      },
      demo: {
        lang: 'ar',
        prompt: 'بص على الكوميتات بتاعة النهارده وجدول تحديث قصير على لينكدإن لـSett الساعة ٥.',
        tools: [
          { tool: 'integrationList', label: 'وجد Sett على لينكدإن' },
          { tool: 'integrationSchedulePostTool', label: 'جدول منشورًا واحدًا' },
        ],
        reply: 'متجدول النهارده الساعة ٥:٠٠ على Sett.',
        posts: [{ net: 'linkedin-page', name: 'Sett', text: 'نزّلنا النهارده: فواتير أسرع بالعربي…', when: 'اليوم ١٧:٠٠' }],
      },
      prompts: [
        { lang: 'ar', text: 'اعرض قنواتي في تدوين.' },
        { lang: 'ar', text: 'اكتب بوست لينكدإن قصير عن اللي خلصناه النهارده.' },
        { lang: 'ar', text: 'جدول البوست ده الساعة ٥ العصر.' },
        { lang: 'ar', text: 'نزّلنا إيه على لينكدإن الأسبوع اللي فات؟' },
        { lang: 'en', text: 'Write a LinkedIn post from today’s commits and save it as a draft.' },
        { lang: 'en', text: 'Schedule a launch post on LinkedIn and X for Monday at 9:00.' },
      ],
      notes: ['يحفظ Grok Build تسجيل الدخول داخل ‎~/.grok، فتسجّل الدخول مرة واحدة لكل جهاز.'],
      faq: [
        {
          title: 'هل Grok Build هو نفسه تطبيق Grok؟',
          content: 'لا. Grok Build وكيل البرمجة من xAI في الطرفية، وهذه الصفحة عنه. الخطوات هنا لا تنطبق على تطبيق المحادثة Grok.',
        },
        {
          title: 'تسجيل الدخول أم المفتاح البرمجي؟',
          content: 'تسجيل الدخول أبسط على جهازك. استخدم المفتاح في السكربتات، واحفظه في متغيّر بيئة، لا في رابط.',
        },
        {
          title: 'كيف أبقي المفتاح خارج الإعدادات؟',
          content: 'يوسّع Grok Build ‎${VAR} في الترويسات عند الاتصال. أبقِ علامات الاقتباس المفردة في الأمر أعلاه، فتمرّر الطرفية اسم المتغيّر لا المفتاح، ولا يُحفظ إلا الاسم.',
        },
      ],
    },
  },
};
