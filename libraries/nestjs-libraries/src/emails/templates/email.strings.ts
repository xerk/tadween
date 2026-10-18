// Tadween: every word the emails (and the app's push notifications) say, in English and Arabic. The backend has
// no i18n setup (the app's i18next files are frontend-only), so the copy lives
// in this typed dictionary next to the templates: `ar` must have every key of
// `en` with the same arguments. Values passed in are already escaped.

const en = {
  dir: 'ltr' as 'ltr' | 'rtl',
  locale: 'en-GB',
  footer: {
    reason: {
      transactional: 'You got this email because of an action on your Tadween account.',
      notification: 'You got this email because notifications are on for your Tadween account.',
      billing: 'You got this email because you manage billing for this Tadween workspace.',
      partners: 'You got this email because your workspace is part of the Tadween partners program.',
      invite: 'You got this email because someone invited this address to Tadween.',
      internal: 'Internal message for the Tadween team.',
    },
    manage: 'Manage notifications',
    help: (email: string) => `Questions? Reply to this email or write to ${email}.`,
    buttonFallback: 'If the button doesn’t work, copy this link into your browser:',
  },

  activateAccount: {
    subject: 'Activate your Tadween account',
    preheader: 'One click and your account is ready.',
    title: 'Activate your account',
    body: 'Thanks for signing up. Confirm this email address to start planning your posts.',
    button: 'Activate account',
    note: 'If you didn’t create a Tadween account, you can ignore this email.',
  },
  resetPassword: {
    subject: 'Reset your Tadween password',
    preheader: 'This link expires in 20 minutes.',
    title: 'Reset your password',
    body: 'We got a request to reset the password for your account. Choose a new one with the button below.',
    button: 'Choose a new password',
    note: 'The link expires in 20 minutes. If you didn’t ask for this, ignore this email and your password stays the same.',
  },
  teamInvite: {
    subject: (inviter: string, workspace: string) =>
      `${inviter} invited you to ${workspace} on Tadween`,
    preheader: 'Join the team and plan posts together.',
    title: (workspace: string) => `Join ${workspace}`,
    body: (inviter: string, workspace: string) =>
      `${inviter} invited you to the ${workspace} workspace on Tadween, where the team plans and schedules its posts.`,
    button: 'Accept invitation',
    note: 'The invitation expires in 2 days.',
  },
  postFailed: {
    subject: (network: string) => `We couldn’t post to ${network}`,
    preheader: 'Open the post to fix it and try again.',
    title: (network: string) => `We couldn’t post to ${network}`,
    body: (network: string, channel: string) =>
      channel
        ? `Your post to ${channel} on ${network} wasn’t published.`
        : `Your post on ${network} wasn’t published.`,
    reason: 'What the network said',
    disabled: 'The channel is turned off. Turn it back on, then post again.',
    unconfirmedTitle: (network: string) => `Check your post on ${network}`,
    unconfirmedSubject: (network: string) => `We couldn’t confirm your post on ${network}`,
    unconfirmed: (channel: string) =>
      `The post was sent, but we couldn’t confirm it was published. Check ${channel} before posting again, so it doesn’t go out twice.`,
    button: 'Open calendar',
  },
  channelReconnect: {
    subject: (network: string) => `Reconnect your ${network} channel`,
    preheader: 'Scheduled posts wait until the channel is connected again.',
    title: (network: string) => `Reconnect ${network}`,
    body: (network: string, channel: string) =>
      channel
        ? `${network} disconnected ${channel}. Reconnect it to keep your scheduled posts going out on time.`
        : `${network} disconnected one of your channels. Reconnect it to keep your scheduled posts going out on time.`,
    button: 'Reconnect channel',
  },
  // Push notifications on the phone: a short title and one sentence
  push: {
    published: (network: string) => `Posted to ${network}`,
    publishedBody: 'Your post is live. Tap to see it.',
    other: 'Tadween',
  },
  digest: {
    subject: 'Your latest notifications',
    preheader: 'What happened on your channels.',
    title: 'Your latest notifications',
    body: 'Here’s what happened since the last update.',
    button: 'Open Tadween',
    link: 'View post',
  },
  loginChanged: {
    subject: 'Your login was changed',
    preheader: 'You now sign in with a different email.',
    title: 'Your login was changed',
    body: (email: string) =>
      `An administrator changed the login for your account. From now on you sign in with ${email}.`,
    note: 'Your plan and subscription didn’t change. To cancel a subscription, do it from Billing.',
    button: 'Sign in',
  },
  subscriptionCancelled: {
    subject: (workspace: string) => `Cancellation: ${workspace}`,
    preheader: 'A workspace cancelled its subscription.',
    title: 'A workspace cancelled',
    body: (workspace: string, email: string) =>
      `${workspace} (${email}) cancelled its subscription.`,
    feedback: 'Their feedback',
    noFeedback: 'No feedback given.',
  },
  notification: {
    button: 'Open Tadween',
    // Emails whose English title and HTML come from workflows that can't
    // change (streak): looked up by that title so they read in the user's language
    legacy: {
      'Streak Ended': {
        subject: 'Your posting streak ended',
        body: "You didn't post in the last 24 hours, so your streak ended. Schedule a post to start a new one.",
      },
      'Streak Reminder': {
        subject: 'Your streak ends in 2 hours',
        body: 'Schedule a post in the next 2 hours to keep your posting streak going.',
      },
    } as Record<string, { subject: string; body: string }>,
  },

  welcome: {
    subject: 'Welcome to Tadween',
    preheader: 'Connect a channel and schedule your first post.',
    title: (name: string) => (name ? `Welcome, ${name}` : 'Welcome to Tadween'),
    body: 'Tadween helps you plan a week of posts in one sitting and publish them on time.',
    steps: [
      'Connect a channel: Facebook, Instagram, LinkedIn, Threads or YouTube.',
      'Write a post, or let the assistant draft one with you.',
      'Pick a time and schedule it. We publish it for you.',
    ],
    button: 'Schedule your first post',
    referral: (credits: string) =>
      `You joined with an invite. When you make your first payment, we add ${credits} AI credits to your workspace.`,
    affiliate: (credits: string, days: string) =>
      `You joined with a creator’s invite: your trial is ${days} days, and we add ${credits} AI credits on your first payment.`,
  },
  waitlisted: {
    subject: 'You’re on the Tadween waitlist',
    preheader: (position: string) => `You’re number ${position} in line.`,
    title: (name: string) => (name ? `Thanks for signing up, ${name}` : 'Thanks for signing up'),
    body: 'Tadween is free during early access, and the free spots are taken for now. Your workspace is saved and waiting.',
    position: (position: string) => `You’re number ${position} in line.`,
    next: 'We let people in from the waitlist in the order they signed up. When it’s your turn, we’ll email you and you can start right away.',
    button: 'Check your place',
  },
  waitlistAdmitted: {
    subject: 'You’re in: welcome to Tadween',
    preheader: 'Your workspace is ready. Connect a channel and schedule your first post.',
    title: (name: string) => (name ? `You’re in, ${name}` : 'You’re in'),
    body: 'A spot opened up and your workspace is ready. Tadween helps you plan a week of posts in one sitting and publish them on time.',
    button: 'Schedule your first post',
  },
  trialEnding: {
    subject: 'Your trial ends in 3 days',
    preheader: (date: string) => `Your free trial ends on ${date}.`,
    title: 'Your trial ends in 3 days',
    withCard: (date: string, plan: string) =>
      `Your free trial of ${plan} ends on ${date}. We’ll charge the card on file then, and your posts keep going out without a break.`,
    withoutCard: (date: string, plan: string) =>
      `Your free trial of ${plan} ends on ${date}. Add a card before then to keep your channels and scheduled posts running.`,
    buttonCard: 'Review plan',
    buttonNoCard: 'Choose a plan',
  },
  trialEnded: {
    subject: 'Your free trial has ended',
    preheader: 'Choose a plan to keep publishing.',
    title: 'Your free trial has ended',
    body: 'Your trial ended without a plan, so scheduled posts are paused. Your drafts, channels and calendar are kept. Choose a plan to pick up where you left off.',
    button: 'Choose a plan',
  },
  paymentFailed: {
    subject: 'Your payment didn’t go through',
    preheader: 'Update your card to keep your plan.',
    title: 'Your payment didn’t go through',
    body: (amount: string) =>
      `We couldn’t charge ${amount} for your Tadween plan. Update your card so your posts keep going out. We’ll retry the payment automatically.`,
    button: 'Update card',
  },
  paymentReceipt: {
    subject: 'Payment received',
    startedSubject: (plan: string) => `Your ${plan} plan has started`,
    preheader: (amount: string) => `We received ${amount}. Thank you.`,
    title: 'Payment received',
    startedTitle: (plan: string) => `Your ${plan} plan has started`,
    body: (amount: string) => `We received your payment of ${amount}. Thank you.`,
    started: 'Everything in your plan is unlocked.',
    amount: 'Amount',
    plan: 'Plan',
    date: 'Date',
    button: 'View billing history',
  },

  referralSignedUp: {
    subject: 'A friend joined Tadween with your link',
    preheader: 'Your reward counts after their first payment.',
    title: 'A friend joined with your link',
    body: (credits: string) =>
      `Someone signed up for Tadween with your invite. When they pay for a plan, they get ${credits} AI credits, and after a 30-day hold the invite counts toward your next reward.`,
    button: 'See your invites',
  },
  referralFirstPayment: {
    subject: 'Your friend made their first payment',
    preheader: (date: string) => `It counts toward your rewards from ${date}.`,
    title: 'Your friend made their first payment',
    body: (date: string) =>
      `A friend you invited just paid for Tadween. To protect against refunds there’s a 30-day hold: the invite counts toward your rewards from ${date}.`,
    button: 'See your invites',
  },
  referralRewardEarned: {
    subject: 'You earned a reward',
    preheader: 'Thanks for bringing friends to Tadween.',
    title: 'You earned a reward',
    body: (count: string) =>
      `${count} friends you invited are now paying customers. Here’s your reward:`,
    credits: (credits: string) => `${credits} AI credits, added to your workspace.`,
    freeMonth: 'One free month of your plan, applied to your next invoice.',
    ambassador: 'You’re now a Tadween Ambassador. The badge shows on your Invite & earn page.',
    nextPlan: 'Your next plan free for 12 months. We’ll apply it to your subscription and let you know.',
    founder: 'Founder pricing for life. We’ll apply it to your subscription and let you know.',
    note: 'Credit rewards are capped at 10 a month. Anything over that is added next month.',
    button: 'See your rewards',
  },
  referralReversed: {
    subject: 'An invite no longer counts',
    preheader: 'A payment was refunded or disputed.',
    title: 'An invite no longer counts',
    refund: 'The payment of a friend you invited was refunded, so this invite no longer counts toward your rewards.',
    dispute: 'The payment of a friend you invited was disputed, so this invite no longer counts toward your rewards.',
    rejected: 'We reviewed an invite and it doesn’t qualify for the program, so it no longer counts toward your rewards.',
    button: 'See your invites',
  },
  referralWelcome: {
    subject: 'You joined Tadween with an invite',
    preheader: 'Your bonus credits arrive with your first payment.',
    title: 'You joined with an invite',
    body: (credits: string) =>
      `Your invite is linked to this workspace. When you make your first payment, we add ${credits} AI credits to your workspace, on top of your plan’s credits.`,
    button: 'Choose a plan',
  },

  affiliateApproved: {
    subject: 'Welcome to Founding Creators',
    preheader: 'Your link earns commission from today.',
    title: 'Welcome to Founding Creators',
    body: (rate: string) =>
      `You’re in. You earn ${rate} of every paid invoice from the customers you bring, for 12 months. The rate goes to 35% at 10 active customers and 40% at 30.`,
    audience: 'Your audience gets a 14-day trial and 500 AI credits on their first payment.',
    payout: 'Commission clears after a 30-day hold. Take it as Tadween balance (worth 1.5×) or as cash, paid by Wise once a month.',
    button: 'Get your link',
  },
  affiliateCommissionPending: {
    subject: (amount: string) => `New commission: ${amount}`,
    preheader: (date: string) => `It clears on ${date}.`,
    title: 'You earned a commission',
    body: (amount: string, rate: string) =>
      `A customer you brought paid an invoice. Your ${rate} commission is ${amount}.`,
    hold: (date: string) => `It’s on a 30-day hold and clears on ${date}.`,
    button: 'See your earnings',
  },
  affiliateCommissionCleared: {
    subject: (amount: string) => `${amount} in commission cleared`,
    preheader: 'It’s ready for your next payout.',
    title: 'Commission cleared',
    body: (amount: string) =>
      `${amount} in commission finished its hold and is now available. It goes out with your next payout.`,
    button: 'See your earnings',
  },
  affiliatePayoutSent: {
    subject: (amount: string) => `Payout sent: ${amount}`,
    preheader: 'Your commission is on its way.',
    title: 'Your payout is on its way',
    balance: (amount: string, credit: string) =>
      `We added ${credit} of Tadween balance for ${amount} in commission (balance is worth 1.5×). It’s used on your next invoices.`,
    cash: (amount: string) =>
      `We sent ${amount} to your payout account. It usually arrives in 1–3 business days.`,
    reference: 'Reference',
    button: 'See payouts',
  },
  affiliateTierUp: {
    subject: (rate: string) => `Your commission is now ${rate}`,
    preheader: 'Thanks for growing with Tadween.',
    title: (rate: string) => `Your commission is now ${rate}`,
    body: (count: string, rate: string) =>
      `You have ${count} paying customers, so new invoices earn you ${rate}.`,
    button: 'See your earnings',
  },
  affiliateCommissionReversed: {
    subject: 'A commission was reversed',
    preheader: 'A customer payment was refunded or disputed.',
    title: 'A commission was reversed',
    refund: (amount: string) =>
      `A customer you brought got a refund, so ${amount} in commission was taken back.`,
    dispute: (amount: string) =>
      `A customer you brought disputed a payment, so ${amount} in commission was taken back.`,
    rejected: (amount: string) =>
      `We reviewed a referral and it doesn’t qualify for the program, so ${amount} in commission was taken back.`,
    paid: 'It was already paid out, so it comes off your next payout.',
    button: 'See your earnings',
  },
};

export type EmailStrings = typeof en;

const ar: EmailStrings = {
  dir: 'rtl',
  // Arabic text with Western digits (0-9): the owner wants English numbers everywhere
  locale: 'ar-EG-u-nu-latn',
  footer: {
    reason: {
      transactional: 'وصلتك هذه الرسالة بسبب إجراء على حسابك في تدوين.',
      notification: 'وصلتك هذه الرسالة لأن الإشعارات مفعّلة في حسابك على تدوين.',
      billing: 'وصلتك هذه الرسالة لأنك تدير الفوترة لمساحة العمل هذه على تدوين.',
      partners: 'وصلتك هذه الرسالة لأن مساحة عملك مشتركة في برنامج شركاء تدوين.',
      invite: 'وصلتك هذه الرسالة لأن أحدهم دعا هذا البريد إلى تدوين.',
      internal: 'رسالة داخلية لفريق تدوين.',
    },
    manage: 'إدارة الإشعارات',
    help: (email: string) => `لديك سؤال؟ ردّ على هذه الرسالة أو راسلنا على ${email}.`,
    buttonFallback: 'إذا لم يعمل الزر، انسخ هذا الرابط في المتصفح:',
  },

  activateAccount: {
    subject: 'فعّل حسابك في تدوين',
    preheader: 'نقرة واحدة ويصبح حسابك جاهزًا.',
    title: 'فعّل حسابك',
    body: 'شكرًا لتسجيلك. أكّد عنوان بريدك الإلكتروني لتبدأ في تخطيط منشوراتك.',
    button: 'فعّل الحساب',
    note: 'إذا لم تنشئ حسابًا في تدوين، تجاهل هذه الرسالة.',
  },
  resetPassword: {
    subject: 'إعادة تعيين كلمة المرور في تدوين',
    preheader: 'تنتهي صلاحية الرابط خلال 20 دقيقة.',
    title: 'أعد تعيين كلمة المرور',
    body: 'وصلنا طلب لإعادة تعيين كلمة مرور حسابك. اختر كلمة مرور جديدة من الزر أدناه.',
    button: 'اختر كلمة مرور جديدة',
    note: 'تنتهي صلاحية الرابط خلال 20 دقيقة. إذا لم تطلب ذلك، تجاهل الرسالة وستبقى كلمة مرورك كما هي.',
  },
  teamInvite: {
    subject: (inviter: string, workspace: string) =>
      `${inviter} يدعوك إلى ${workspace} على تدوين`,
    preheader: 'انضم إلى الفريق وخططوا لمنشوراتكم معًا.',
    title: (workspace: string) => `انضم إلى ${workspace}`,
    body: (inviter: string, workspace: string) =>
      `دعاك ${inviter} إلى مساحة العمل ${workspace} على تدوين، حيث يخطط الفريق لمنشوراته ويجدولها.`,
    button: 'اقبل الدعوة',
    note: 'تنتهي صلاحية الدعوة بعد يومين.',
  },
  postFailed: {
    subject: (network: string) => `تعذّر النشر على ${network}`,
    preheader: 'افتح المنشور لإصلاحه وحاول مرة أخرى.',
    title: (network: string) => `تعذّر النشر على ${network}`,
    body: (network: string, channel: string) =>
      channel
        ? `لم يُنشر منشورك على ${channel} في ${network}.`
        : `لم يُنشر منشورك على ${network}.`,
    reason: 'رد الشبكة',
    disabled: 'هذه القناة متوقفة. أعد تشغيلها ثم انشر مرة أخرى.',
    unconfirmedTitle: (network: string) => `تحقّق من منشورك على ${network}`,
    unconfirmedSubject: (network: string) => `لم نتمكن من تأكيد منشورك على ${network}`,
    unconfirmed: (channel: string) =>
      `أُرسل المنشور، لكن لم نتمكن من تأكيد نشره. تحقّق من ${channel} قبل النشر مرة أخرى حتى لا يُنشر مرتين.`,
    button: 'افتح التقويم',
  },
  channelReconnect: {
    subject: (network: string) => `أعد ربط قناة ${network}`,
    preheader: 'تنتظر المنشورات المجدولة حتى تُربط القناة من جديد.',
    title: (network: string) => `أعد ربط ${network}`,
    body: (network: string, channel: string) =>
      channel
        ? `فصلت ${network} القناة ${channel}. أعد ربطها لتستمر منشوراتك المجدولة في الصدور في موعدها.`
        : `فصلت ${network} إحدى قنواتك. أعد ربطها لتستمر منشوراتك المجدولة في الصدور في موعدها.`,
    button: 'أعد ربط القناة',
  },
  push: {
    published: (network: string) => `تم النشر على ${network}`,
    publishedBody: 'منشورك ظاهر الآن. اضغط لتراه.',
    other: 'تدوين',
  },
  digest: {
    subject: 'آخر إشعاراتك',
    preheader: 'ما حدث على قنواتك.',
    title: 'آخر إشعاراتك',
    body: 'هذا ما حدث منذ آخر تحديث.',
    button: 'افتح تدوين',
    link: 'اعرض المنشور',
  },
  loginChanged: {
    subject: 'تغيّر بريد تسجيل الدخول',
    preheader: 'أصبحت تسجّل الدخول ببريد مختلف.',
    title: 'تغيّر بريد تسجيل الدخول',
    body: (email: string) =>
      `غيّر أحد المسؤولين بيانات الدخول لحسابك. من الآن تسجّل الدخول باستخدام ${email}.`,
    note: 'لم تتغير خطتك ولا اشتراكك. لإلغاء اشتراك، ألغِه من صفحة الفوترة.',
    button: 'سجّل الدخول',
  },
  subscriptionCancelled: {
    subject: (workspace: string) => `إلغاء اشتراك: ${workspace}`,
    preheader: 'ألغت مساحة عمل اشتراكها.',
    title: 'ألغت مساحة عمل اشتراكها',
    body: (workspace: string, email: string) =>
      `ألغت ${workspace} (${email}) اشتراكها.`,
    feedback: 'ملاحظاتهم',
    noFeedback: 'لم يتركوا ملاحظات.',
  },
  notification: {
    button: 'افتح تدوين',
    legacy: {
      'Streak Ended': {
        subject: 'انتهت سلسلة نشرك',
        body: 'لم تنشر خلال آخر 24 ساعة، فانتهت سلسلتك. جدول منشورًا لتبدأ سلسلة جديدة.',
      },
      'Streak Reminder': {
        subject: 'تنتهي سلسلتك خلال ساعتين',
        body: 'جدول منشورًا خلال الساعتين القادمتين لتحافظ على سلسلة نشرك.',
      },
    } as Record<string, { subject: string; body: string }>,
  },

  welcome: {
    subject: 'أهلًا بك في تدوين',
    preheader: 'اربط قناة وجدول أول منشور لك.',
    title: (name: string) => (name ? `أهلًا بك يا ${name}` : 'أهلًا بك في تدوين'),
    body: 'يساعدك تدوين على تخطيط منشورات أسبوع كامل في جلسة واحدة ونشرها في موعدها.',
    steps: [
      'اربط قناة: فيسبوك أو إنستغرام أو لينكدإن أو ثريدز أو يوتيوب.',
      'اكتب منشورًا، أو دع المساعد يكتب معك مسودة.',
      'اختر الوقت وجدوله، ونحن ننشره عنك.',
    ],
    button: 'جدول أول منشور',
    referral: (credits: string) =>
      `انضممت بدعوة من صديق. عند أول دفعة لك نضيف ${credits} رصيد ذكاء اصطناعي إلى مساحة عملك.`,
    affiliate: (credits: string, days: string) =>
      `انضممت بدعوة من صانع محتوى: فترتك التجريبية ${days} يومًا، ونضيف ${credits} رصيد ذكاء اصطناعي عند أول دفعة.`,
  },
  waitlisted: {
    subject: 'أنت على قائمة انتظار تدوين',
    preheader: (position: string) => `ترتيبك ${position} في القائمة.`,
    title: (name: string) => (name ? `شكرًا لتسجيلك يا ${name}` : 'شكرًا لتسجيلك'),
    body: 'تدوين مجاني خلال فترة الوصول المبكر، والأماكن المجانية ممتلئة الآن. مساحة عملك محفوظة وتنتظر دورها.',
    position: (position: string) => `ترتيبك ${position} في القائمة.`,
    next: 'ندخل المسجلين من قائمة الانتظار بترتيب تسجيلهم. عندما يأتي دورك نرسل لك رسالة وتبدأ فورًا.',
    button: 'اعرف ترتيبك',
  },
  waitlistAdmitted: {
    subject: 'دورك جاء: أهلًا بك في تدوين',
    preheader: 'مساحة عملك جاهزة. اربط قناة وجدول أول منشور لك.',
    title: (name: string) => (name ? `دورك جاء يا ${name}` : 'دورك جاء'),
    body: 'توفر مكان ومساحة عملك جاهزة الآن. يساعدك تدوين على تخطيط منشورات أسبوع كامل في جلسة واحدة ونشرها في موعدها.',
    button: 'جدول أول منشور',
  },
  trialEnding: {
    subject: 'تنتهي فترتك التجريبية بعد 3 أيام',
    preheader: (date: string) => `تنتهي فترتك التجريبية المجانية في ${date}.`,
    title: 'تنتهي فترتك التجريبية بعد 3 أيام',
    withCard: (date: string, plan: string) =>
      `تنتهي تجربتك المجانية لخطة ${plan} في ${date}. سنخصم المبلغ حينها من البطاقة المحفوظة، وتستمر منشوراتك دون انقطاع.`,
    withoutCard: (date: string, plan: string) =>
      `تنتهي تجربتك المجانية لخطة ${plan} في ${date}. أضف بطاقة قبل ذلك لتبقى قنواتك ومنشوراتك المجدولة تعمل.`,
    buttonCard: 'راجع الخطة',
    buttonNoCard: 'اختر خطة',
  },
  trialEnded: {
    subject: 'انتهت فترتك التجريبية المجانية',
    preheader: 'اختر خطة لتواصل النشر.',
    title: 'انتهت فترتك التجريبية المجانية',
    body: 'انتهت تجربتك دون اختيار خطة، لذا توقفت المنشورات المجدولة مؤقتًا. مسوداتك وقنواتك وتقويمك محفوظة. اختر خطة لتكمل من حيث توقفت.',
    button: 'اختر خطة',
  },
  paymentFailed: {
    subject: 'لم تنجح عملية الدفع',
    preheader: 'حدّث بطاقتك لتحتفظ بخطتك.',
    title: 'لم تنجح عملية الدفع',
    body: (amount: string) =>
      `لم نتمكن من خصم ${amount} لخطتك في تدوين. حدّث بطاقتك لتستمر منشوراتك في الصدور. سنعيد محاولة الدفع تلقائيًا.`,
    button: 'حدّث البطاقة',
  },
  paymentReceipt: {
    subject: 'استلمنا دفعتك',
    startedSubject: (plan: string) => `بدأت خطة ${plan}`,
    preheader: (amount: string) => `استلمنا ${amount}. شكرًا لك.`,
    title: 'استلمنا دفعتك',
    startedTitle: (plan: string) => `بدأت خطة ${plan}`,
    body: (amount: string) => `استلمنا دفعتك بقيمة ${amount}. شكرًا لك.`,
    started: 'أصبحت كل مزايا خطتك متاحة.',
    amount: 'المبلغ',
    plan: 'الخطة',
    date: 'التاريخ',
    button: 'اعرض سجل الفواتير',
  },

  referralSignedUp: {
    subject: 'انضم صديق إلى تدوين عبر رابطك',
    preheader: 'تُحتسب مكافأتك بعد أول دفعة له.',
    title: 'انضم صديق عبر رابطك',
    body: (credits: string) =>
      `سجّل شخص في تدوين بدعوتك. عندما يشترك في خطة يحصل على ${credits} رصيد ذكاء اصطناعي، وبعد فترة انتظار 30 يومًا تُحتسب الدعوة نحو مكافأتك التالية.`,
    button: 'اعرض دعواتك',
  },
  referralFirstPayment: {
    subject: 'دفع صديقك أول دفعة له',
    preheader: (date: string) => `تُحتسب نحو مكافآتك ابتداءً من ${date}.`,
    title: 'دفع صديقك أول دفعة له',
    body: (date: string) =>
      `دفع صديق دعوته اشتراكه في تدوين. ولحماية البرنامج من الاستردادات هناك فترة انتظار 30 يومًا: تُحتسب الدعوة نحو مكافآتك ابتداءً من ${date}.`,
    button: 'اعرض دعواتك',
  },
  referralRewardEarned: {
    subject: 'حصلت على مكافأة',
    preheader: 'شكرًا لدعوتك أصدقاءك إلى تدوين.',
    title: 'حصلت على مكافأة',
    body: (count: string) =>
      `أصبح ${count} من الأصدقاء الذين دعوتهم عملاء مشتركين. هذه مكافأتك:`,
    credits: (credits: string) => `${credits} رصيد ذكاء اصطناعي، أُضيف إلى مساحة عملك.`,
    freeMonth: 'شهر مجاني من خطتك، يُخصم من فاتورتك القادمة.',
    ambassador: 'أصبحت سفيرًا لتدوين، وتظهر الشارة في صفحة «ادعُ واكسب».',
    nextPlan: 'الخطة الأعلى مجانًا لمدة 12 شهرًا. سنطبقها على اشتراكك ونبلغك.',
    founder: 'سعر المؤسسين مدى الحياة. سنطبقه على اشتراكك ونبلغك.',
    note: 'الحد الأقصى 10 مكافآت رصيد في الشهر، وما يزيد يُضاف في الشهر التالي.',
    button: 'اعرض مكافآتك',
  },
  referralReversed: {
    subject: 'لم تعد إحدى الدعوات تُحتسب',
    preheader: 'استُردّت دفعة أو اعتُرض عليها.',
    title: 'لم تعد إحدى الدعوات تُحتسب',
    refund: 'استُردّت دفعة صديق دعوته، لذا لم تعد هذه الدعوة تُحتسب نحو مكافآتك.',
    dispute: 'اعتُرض على دفعة صديق دعوته، لذا لم تعد هذه الدعوة تُحتسب نحو مكافآتك.',
    rejected: 'راجعنا إحدى الدعوات ووجدنا أنها لا تستوفي شروط البرنامج، لذا لم تعد تُحتسب نحو مكافآتك.',
    button: 'اعرض دعواتك',
  },
  referralWelcome: {
    subject: 'انضممت إلى تدوين بدعوة',
    preheader: 'يصلك الرصيد الإضافي مع أول دفعة.',
    title: 'انضممت بدعوة',
    body: (credits: string) =>
      `ارتبطت دعوتك بمساحة العمل هذه. عند أول دفعة لك نضيف ${credits} رصيد ذكاء اصطناعي إلى مساحة عملك، فوق رصيد خطتك.`,
    button: 'اختر خطة',
  },

  affiliateApproved: {
    subject: 'أهلًا بك في برنامج صنّاع المحتوى المؤسسين',
    preheader: 'يبدأ رابطك في كسب العمولة من اليوم.',
    title: 'أهلًا بك في صنّاع المحتوى المؤسسين',
    body: (rate: string) =>
      `تم قبولك. تحصل على ${rate} من كل فاتورة مدفوعة للعملاء الذين تجلبهم، لمدة 12 شهرًا. ترتفع النسبة إلى 35% عند 10 عملاء نشطين، وإلى 40% عند 30.`,
    audience: 'يحصل جمهورك على تجربة مجانية لمدة 14 يومًا و500 رصيد ذكاء اصطناعي عند أول دفعة.',
    payout: 'تُتاح العمولة بعد فترة انتظار 30 يومًا. استلمها رصيدًا في تدوين (بقيمة 1.5 ضعف) أو نقدًا عبر Wise مرة كل شهر.',
    button: 'احصل على رابطك',
  },
  affiliateCommissionPending: {
    subject: (amount: string) => `عمولة جديدة: ${amount}`,
    preheader: (date: string) => `تُتاح في ${date}.`,
    title: 'حصلت على عمولة',
    body: (amount: string, rate: string) =>
      `دفع عميل جلبته فاتورة، وعمولتك بنسبة ${rate} هي ${amount}.`,
    hold: (date: string) => `العمولة في فترة انتظار 30 يومًا وتُتاح في ${date}.`,
    button: 'اعرض أرباحك',
  },
  affiliateCommissionCleared: {
    subject: (amount: string) => `أصبحت عمولة بقيمة ${amount} متاحة`,
    preheader: 'جاهزة للدفعة القادمة.',
    title: 'أصبحت العمولة متاحة',
    body: (amount: string) =>
      `أنهت عمولة بقيمة ${amount} فترة الانتظار وأصبحت متاحة، وستُصرف مع دفعتك القادمة.`,
    button: 'اعرض أرباحك',
  },
  affiliatePayoutSent: {
    subject: (amount: string) => `أُرسلت دفعتك: ${amount}`,
    preheader: 'عمولتك في الطريق إليك.',
    title: 'دفعتك في الطريق إليك',
    balance: (amount: string, credit: string) =>
      `أضفنا ${credit} رصيدًا في تدوين مقابل عمولة بقيمة ${amount} (الرصيد بقيمة 1.5 ضعف)، ويُستخدم في فواتيرك القادمة.`,
    cash: (amount: string) =>
      `أرسلنا ${amount} إلى حساب الاستلام الخاص بك، وعادة تصل خلال 1 إلى 3 أيام عمل.`,
    reference: 'المرجع',
    button: 'اعرض الدفعات',
  },
  affiliateTierUp: {
    subject: (rate: string) => `أصبحت عمولتك ${rate}`,
    preheader: 'شكرًا لنموك مع تدوين.',
    title: (rate: string) => `أصبحت عمولتك ${rate}`,
    body: (count: string, rate: string) =>
      `لديك ${count} من العملاء المشتركين، لذا تكسب ${rate} من الفواتير الجديدة.`,
    button: 'اعرض أرباحك',
  },
  affiliateCommissionReversed: {
    subject: 'أُلغيت إحدى العمولات',
    preheader: 'استُردّت دفعة عميل أو اعتُرض عليها.',
    title: 'أُلغيت إحدى العمولات',
    refund: (amount: string) =>
      `استرد عميل جلبته مبلغه، لذا خُصمت عمولة بقيمة ${amount}.`,
    dispute: (amount: string) =>
      `اعترض عميل جلبته على دفعة، لذا خُصمت عمولة بقيمة ${amount}.`,
    rejected: (amount: string) =>
      `راجعنا إحدى الإحالات ووجدنا أنها لا تستوفي شروط البرنامج، لذا خُصمت عمولة بقيمة ${amount}.`,
    paid: 'كانت العمولة قد صُرفت بالفعل، لذا تُخصم من دفعتك القادمة.',
    button: 'اعرض أرباحك',
  },
};

export const EMAIL_LANGUAGES = ['en', 'ar'] as const;
export type EmailLanguage = (typeof EMAIL_LANGUAGES)[number];

export const emailStrings: Record<EmailLanguage, EmailStrings> = { en, ar };
