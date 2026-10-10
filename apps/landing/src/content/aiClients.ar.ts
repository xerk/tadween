import type { AiClientsDict } from './types';

// Arabic copy for the AI client pages (/ar/chatgpt, /ar/claude, /ar/cursor). Same structure and the
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
          content: 'لا. ChatGPT مساعد المحادثة، وCodex وكيل البرمجة من OpenAI في الطرفية والمحرر. كلاهما يتصل بتدوين، ويستطيع Codex أيضًا استخدام مفتاح برمجي.',
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
  },
};
