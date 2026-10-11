import type { LegalCopy } from './types';

// The Terms, Privacy Policy, Refund Policy and Contact page in English. Every
// company-specific value is a {token} filled from NEXT_PUBLIC_LEGAL_* (lib/config.ts) or shown
// as a marked placeholder; docs/tadween/legal.md lists them. Links are tokens too, labelled
// in `links`. Keep the section ids the same in legal.ar.ts so the anchors line up.
export const legalEn: LegalCopy = {
  crumb: 'Legal',
  updated: 'Last updated: {date}',
  toc: 'On this page',
  placeholders: {
    company: '[Company legal name]',
    state: '[US state of formation]',
    address: '[Registered business address]',
    email: '[Support email]',
    law: '[Governing law state]',
    venue: '[Court venue, e.g. county and state]',
    refundDays: '[number of]',
    aiProviders: '[AI providers you use, e.g. OpenAI]',
    emailProvider: '[Email delivery provider]',
    hostingProvider: '[Hosting and file storage provider]',
    analytics: '[Analytics and error-monitoring tools, or “none”]',
  },
  links: {
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    refund: 'Refund and Cancellation Policy',
    contact: 'Contact page',
    youtubeTerms: 'YouTube Terms of Service',
    googlePrivacy: 'Google Privacy Policy',
    googleUserData: 'Google API Services User Data Policy',
    googlePermissions: 'Google security settings',
    linkedinTerms: 'LinkedIn User Agreement and API Terms',
    metaTerms: 'Meta Platform Terms',
    stripePrivacy: 'Stripe Privacy Policy',
  },
  pricingAgree: 'By starting a trial or subscribing, you agree to the {terms} and the {refund}.',

  terms: {
    metaTitle: 'Terms of Service | Tadween',
    metaDescription: 'The terms that apply when you use Tadween: accounts, subscriptions and billing, trials, cancellation, acceptable use, connected social platforms and liability.',
    title: 'Terms of Service',
    sub: 'The agreement between you and {company} for using Tadween. Please read it before you sign up.',
    sections: [
      {
        id: 'agreement',
        title: '1. About these terms',
        body: [
          'Tadween (the “Service”) is a software-as-a-service product operated by {company}, a company organised under the laws of {state}, with its address at {address} (“we”, “us”, “our”).',
          'These Terms of Service (the “Terms”) apply to our website and to the Tadween web application. By creating an account, starting a trial, subscribing or otherwise using the Service, you agree to these Terms and to our {privacy}. If you use the Service on behalf of a company or other organisation, you confirm that you are authorised to accept these Terms for it, and “you” includes that organisation.',
          'If you do not agree to these Terms, do not use the Service.',
        ],
      },
      {
        id: 'service',
        title: '2. The Service',
        body: [
          'Tadween is a social media scheduling tool. It lets you connect social media accounts, write and preview posts, schedule them on a calendar, publish them at the time you choose, work with your team, store media for your posts and see analytics where the social platform provides them.',
          'Tadween publishes to social platforms such as LinkedIn, Instagram, Facebook, Threads and YouTube through their official APIs, using access you grant through each platform’s own sign-in (OAuth) screen. We do not ask for or store your social media passwords.',
          'The Service is delivered online: you get access in your browser right after you sign up or pay, and nothing is shipped.',
          'We keep improving the Service, so features may be added, changed or removed over time. If we remove a feature that is a material part of a paid plan, we will tell you in advance where reasonably possible.',
        ],
      },
      {
        id: 'accounts',
        title: '3. Accounts',
        body: [
          'You must be at least 18 years old, or the age of legal majority where you live, to create an account.',
          'You agree to give accurate sign-up information and keep it up to date, keep your login details secure, and tell us promptly at {email} if you believe someone has accessed your account without permission. You are responsible for activity under your account, including activity by team members you invite.',
        ],
      },
      {
        id: 'acceptable-use',
        title: '4. Acceptable use',
        body: [
          'You are responsible for the content you create, upload, schedule and publish through the Service. You agree not to use the Service to:',
          {
            list: [
              'break any law or regulation, or infringe anyone’s intellectual property, privacy or other rights;',
              'publish content that is unlawful, defamatory, harassing, hateful, sexually exploitative of minors, or that promotes violence;',
              'send spam, run deceptive or misleading campaigns, impersonate others, or artificially inflate engagement (for example fake accounts, follow/unfollow schemes or automated likes);',
              'break the terms, policies or community rules of any social platform you connect, including their automation and API rules;',
              'distribute malware, probe or attack the Service or other systems, or try to get around usage limits or security measures;',
              'copy, resell or offer the Service to others as your own product, except as your plan allows (for example managing clients’ channels on an agency plan).',
            ],
          },
          'We may remove content, pause scheduled posts or suspend accounts that we reasonably believe break this section, and where appropriate we will tell you why.',
        ],
      },
      {
        id: 'subscriptions',
        title: '5. Subscriptions, trials and billing',
        body: [
          'Paid plans are subscriptions billed in advance, monthly or yearly, in US dollars. The plans, prices and what each includes are shown on our pricing page and at checkout. Taxes may be added where required by law.',
          {
            list: [
              'Payment processing. Payments are processed by Stripe. Your card details are entered with and stored by Stripe; we do not store full card numbers. You authorise us, through Stripe, to charge your payment method for each billing period.',
              'Free trial. New subscriptions may start with a free trial (currently 7 days), as shown at checkout. A payment method is collected when the trial starts, and we may place a temporary authorisation (for example US$1) on your card to check that it is valid; it is released and not charged. Unless you cancel before the trial ends, the subscription starts automatically and your payment method is charged the plan price at the end of the trial.',
              'Automatic renewal. Your subscription renews automatically at the end of each billing period (monthly or yearly) for the same period, at the then-current price, until you cancel. You can see your plan and billing details in Settings → Billing or in the billing portal provided by Stripe.',
              'Plan changes. Upgrades take effect immediately and you are charged the prorated difference at once; downgrades may result in a prorated credit toward future payments, as shown at the time of the change.',
              'Price changes. We may change our prices. A price change will not affect a billing period you have already paid for. We will tell you by email or in the app before a new price applies to your next renewal, so you can cancel before then if you do not accept it.',
              'Failed payments. If a payment fails, we may retry it and may limit or suspend paid features until the balance is paid.',
              'Receipts. A receipt for each payment is sent to your billing email by Stripe on our behalf.',
            ],
          },
        ],
      },
      {
        id: 'cancellation',
        title: '6. Cancellation and refunds',
        body: [
          'You can cancel at any time in Settings → Billing in the app (where you can also open the billing portal provided by Stripe), or by writing to {email}. When you cancel, your subscription will not renew and you keep access to your paid plan until the end of the billing period you have already paid for. If you cancel during a free trial, you will not be charged.',
          'Refunds are covered by our {refund}, which is part of these Terms. Nothing in these Terms limits any refund or cancellation right you have under the law that applies to you.',
        ],
      },
      {
        id: 'your-content',
        title: '7. Your content',
        body: [
          'You keep all rights to the text, images, videos and other content you upload or create in the Service (“Your Content”). You give us a limited, worldwide licence to host, store, copy, process, display and transmit Your Content only as needed to run the Service for you, for example to show it in your calendar, generate previews and publish it to the platforms you choose. This licence ends when Your Content is deleted from the Service, except for copies kept for a limited time in backups or where the law requires us to keep them.',
          'You confirm that you have the rights needed to use and publish Your Content, and that publishing it does not infringe anyone else’s rights.',
        ],
      },
      {
        id: 'our-rights',
        title: '8. Our intellectual property and open source',
        body: [
          'The Tadween name, logo, website and the parts of the Service we created are owned by us or our licensors. Except for the rights given in these Terms, no rights are granted to you.',
          'Tadween is built on Postiz, open-source software licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). Your rights to the open-source code under that licence are not limited by these Terms. These Terms govern your use of the hosted Service that we operate.',
          'If you send us feedback or suggestions, we may use them without any obligation to you.',
        ],
      },
      {
        id: 'third-party-platforms',
        title: '9. Social platforms and other third-party services',
        body: [
          'The Service connects to third-party platforms that we do not control, including LinkedIn, Meta (Facebook, Instagram and Threads), Google (YouTube) and others you choose to connect. Your use of each platform is governed by that platform’s own terms and policies, for example the {linkedinTerms} and the {metaTerms}. You are responsible for following them.',
          'YouTube. Tadween uses YouTube API Services to upload and manage videos on YouTube channels you connect. By connecting a YouTube channel or using Tadween’s YouTube features, you agree to be bound by the {youtubeTerms}. Google’s handling of your data is described in the {googlePrivacy}.',
          'Platforms can change or limit their APIs, rate limits, features or approval of apps like ours at any time. When that happens, some features may stop working or a post may fail to publish. We will try to tell you when a post fails, but we are not responsible for actions taken by a platform, including removing content or restricting your account there.',
          'Trademarks. LinkedIn, Facebook, Instagram, Threads, YouTube and other platform names, and Claude and Claude Code (Anthropic), ChatGPT (OpenAI), Cursor (Anysphere), GitHub Copilot (GitHub), VS Code (Microsoft), Gemini (Google), Hermes Agent (Nous Research), Windsurf and n8n, are trademarks of their respective owners. We use these names and logos only to describe what Tadween works with; Tadween is not affiliated with, sponsored by or endorsed by them.',
        ],
      },
      {
        id: 'ai',
        title: '10. AI features',
        body: [
          'Some features use artificial intelligence to suggest or generate text, images or other content (“AI Output”). These features are optional. To provide them, the prompts and content you send to an AI feature are processed by our AI providers, as described in our {privacy}.',
          'AI Output can be inaccurate, incomplete, similar to content generated for others, or unsuitable for your purpose. Review AI Output before you publish it. You are responsible for what you publish, including AI Output. As between you and us, you may use AI Output you generate in the Service, subject to these Terms and the law.',
        ],
      },
      {
        id: 'availability',
        title: '11. Availability and support',
        body: [
          'We work to keep the Service available and to publish posts at the time you scheduled, but we do not promise that it will be uninterrupted, error-free or that every post will publish exactly on time. Maintenance, platform outages, API changes and events outside our control can cause delays or failures.',
          'For help, contact us at {email}. Please keep your own copies of content that matters to you.',
        ],
      },
      {
        id: 'disclaimers',
        title: '12. Disclaimers',
        body: [
          'To the fullest extent permitted by law, the Service is provided “as is” and “as available”, without warranties of any kind, whether express or implied, including implied warranties of merchantability, fitness for a particular purpose and non-infringement. We do not guarantee any particular result from using the Service, such as reach, engagement, followers or sales.',
          'Some jurisdictions do not allow certain warranties to be excluded, so some of these exclusions may not apply to you.',
        ],
      },
      {
        id: 'liability',
        title: '13. Limitation of liability',
        body: [
          'To the fullest extent permitted by law, we will not be liable for any indirect, incidental, special, consequential or punitive damages, or for any loss of profits, revenue, data, goodwill or business opportunities, arising out of or related to the Service or these Terms, even if we were told such damages were possible.',
          'To the fullest extent permitted by law, our total liability for all claims arising out of or related to the Service or these Terms is limited to the greater of (a) the amount you paid us for the Service in the 12 months before the event giving rise to the claim and (b) US$100.',
          'Nothing in these Terms excludes or limits liability that cannot be excluded or limited under applicable law.',
        ],
      },
      {
        id: 'indemnity',
        title: '14. Indemnity',
        body: [
          'To the extent permitted by law, you agree to defend and indemnify us against claims, damages and costs (including reasonable legal fees) brought by third parties that arise from Your Content, your use of the Service in breach of these Terms, or your breach of a social platform’s terms.',
        ],
      },
      {
        id: 'termination',
        title: '15. Suspension and termination',
        body: [
          'You can stop using the Service at any time, and you can delete your account in the app’s settings. Deleting your account also cancels the subscriptions of the workspaces you own, and access ends immediately. Deleting your account does not by itself refund any payment; if you may be eligible for a refund under our {refund}, request it before you delete your account.',
          'We may suspend or end your access if you seriously or repeatedly break these Terms, if you do not pay, or if we must do so to comply with the law or a platform’s requirements. Where reasonable, we will give notice first. If we end the Service for reasons other than your breach, we will refund the unused part of any prepaid period.',
          'Sections that by their nature should survive termination (such as Your Content (section 7), disclaimers, limitation of liability, indemnity and governing law) will continue to apply.',
        ],
      },
      {
        id: 'law',
        title: '16. Governing law and disputes',
        body: [
          'These Terms are governed by the laws of the State of {law}, United States, without regard to its conflict-of-law rules. Any dispute arising out of or related to these Terms or the Service will be brought exclusively in the state or federal courts located in {venue}, and you and we consent to their jurisdiction.',
          'Before starting a formal dispute, please contact us at {email} so we can try to resolve it informally. If you are a consumer, you may also have rights under the mandatory laws of the country where you live, and nothing in this section takes those rights away.',
        ],
      },
      {
        id: 'changes',
        title: '17. Changes to these terms',
        body: [
          'We may update these Terms from time to time. We will change the “Last updated” date above and, for material changes, tell you by email or in the app before they take effect. If you keep using the Service after the changes take effect, you accept the updated Terms. If you do not agree, you can cancel before then.',
        ],
      },
      {
        id: 'contact',
        title: '18. Contact',
        body: ['{company}', '{address}', 'Email: {email}', 'You can also reach us through our {contact}.'],
      },
    ],
  },

  privacy: {
    metaTitle: 'Privacy Policy | Tadween',
    metaDescription: 'What personal data Tadween collects, why, who processes it, how long we keep it, how connected social accounts and YouTube data are handled, and your rights.',
    title: 'Privacy Policy',
    sub: 'How {company} collects, uses and protects personal data when you use Tadween.',
    sections: [
      {
        id: 'who-we-are',
        title: '1. Who we are',
        body: [
          'Tadween is operated by {company}, {address} (“we”, “us”). We are responsible for the personal data described in this policy. For any privacy question or request, contact us at {email}.',
          'This policy covers our website and the Tadween web application (together, the “Service”). It does not cover the social platforms you connect, which have their own privacy policies.',
        ],
      },
      {
        id: 'data-we-collect',
        title: '2. Data we collect',
        body: [
          {
            list: [
              'Account data: your name, email address, password (stored as a one-way hash), profile picture if you add one, language and time-zone settings, and the workspaces and team members you set up. If you sign in with a third-party provider, we receive the basic profile details that provider shares.',
              'Connected social accounts: when you connect a social account, we receive and store access and refresh tokens issued by that platform, along with the account’s ID, name, profile picture and the pages or channels you choose to connect. We use these only to provide the features you use (see section 4).',
              'Your content: posts, drafts, comments, schedules, tags, signatures, uploaded images and videos, and other content you create or upload in the Service.',
              'Analytics from platforms: when you use analytics features, we fetch statistics such as impressions, reactions and followers from the platforms you connected, where those platforms make them available.',
              'Billing data: your plan, subscription status, billing history, and the billing name, email and country you give at checkout. Card details are collected and stored by Stripe; we receive only limited details such as the card brand, last four digits and expiry date.',
              'AI feature inputs: the prompts and content you send to AI features, and the results.',
              'Support messages: what you send us by email or other channels.',
              'Technical data: IP address, browser and device type, log records of requests and errors, and cookies described in section 7.',
            ],
          },
        ],
      },
      {
        id: 'how-we-use',
        title: '3. How we use data and our legal bases',
        body: [
          'We use personal data to:',
          {
            list: [
              'provide the Service: create your account, store and schedule your content, publish it to the platforms you choose, show previews and analytics, and run team features (legal basis: performance of our contract with you);',
              'process payments and manage subscriptions, trials and refunds (contract, and legal obligations such as tax and accounting rules);',
              'send service emails, such as sign-up confirmation, password resets, invitations, billing notices (some sent by Stripe on our behalf) and important changes (contract and legitimate interests);',
              'provide AI features when you choose to use them (contract);',
              'keep the Service secure, prevent abuse and fraud, fix errors and understand how the Service is used so we can improve it (legitimate interests);',
              'comply with the law and respond to lawful requests (legal obligation).',
            ],
          },
          'We do not sell your personal data, and we do not use your content or data from connected platforms for advertising.',
        ],
      },
      {
        id: 'social-accounts',
        title: '4. Connected social accounts',
        body: [
          'You connect each social account yourself, through that platform’s own sign-in and consent screen. We use the tokens and data we receive only to do what you ask in the Service: publish and schedule your posts, add first comments, read the information needed to show your accounts and previews, and fetch analytics. We do not use them for any other purpose, and we do not share them except with the service providers that host and run the Service for us (section 6).',
          'You can disconnect a channel in the app at any time. You can also remove Tadween’s access in the security or connected-apps settings of the platform itself. After you disconnect or remove access, we stop accessing that platform on your behalf. Disconnecting does not by itself erase the tokens and account data we stored for that channel; to have them deleted, delete your account or contact us at {email}.',
        ],
      },
      {
        id: 'google-youtube',
        title: '5. YouTube and Google user data',
        body: [
          'Tadween uses YouTube API Services. When you connect a YouTube channel, you authorise Tadween through Google to access your Google account name, email address and profile picture, and to manage your YouTube channel, so that we can upload the videos you schedule, set their titles, descriptions, thumbnails and privacy settings, read your channel and video details, and show statistics from YouTube Analytics reports in the app. We store the access and refresh tokens Google issues and the channel and video information needed for those features until you delete the channel or your account, or ask us to delete them.',
          'By using Tadween’s YouTube features, you agree to the {youtubeTerms}. Google’s use of data is described in the {googlePrivacy}.',
          'Tadween’s use and transfer to any other app of information received from Google APIs will adhere to the {googleUserData}, including the Limited Use requirements. In particular, we use Google user data only to provide and improve the user-facing features described above; we do not transfer it to others except as needed to provide those features, for security, to comply with law, or as part of a merger or acquisition with your prior consent; we do not use it for advertising; and our staff do not read it unless you ask us to (for example for support), it is needed for security, or the law requires it. We do not use Google user data to develop, improve or train generalised artificial intelligence or machine-learning models, and we do not transfer it to AI providers for that purpose.',
          'In addition to disconnecting the channel in Tadween, you can revoke Tadween’s access to your Google data at any time in the {googlePermissions}. When access is revoked, we delete the YouTube data we stored under that permission within 7 days of learning about it. The Tadween app also stores and reads cookies on your device, as described in section 7. For questions or complaints about how we handle Google user data, contact us at {email}.',
        ],
      },
      {
        id: 'sharing',
        title: '6. Service providers and sharing',
        body: [
          'We share personal data only with service providers that process it on our behalf to run the Service, under contracts that limit their use of it, and only as much as each needs:',
          {
            list: [
              'Stripe: payment processing, subscriptions and invoices. Stripe also processes data as described in the {stripePrivacy}.',
              'AI providers ({aiProviders}): process prompts and content when you use AI features.',
              'Email delivery ({emailProvider}): sends account and service emails.',
              'Hosting and storage ({hostingProvider}): hosts our servers, databases and the media you upload.',
              'Analytics and error monitoring ({analytics}): help us understand usage and fix errors.',
            ],
          },
          'When you publish, your content is of course sent to the social platforms you chose, and their own privacy policies apply to it there. We may also disclose data if the law requires it, to protect the rights and safety of our users or others, or as part of a merger, acquisition or sale of assets (in which case this policy will continue to protect your data, and we will tell you).',
        ],
      },
      {
        id: 'cookies',
        title: '7. Cookies and local storage',
        body: [
          'The Tadween app uses cookies that are necessary to keep you signed in and to keep the Service secure. Our website stores your light or dark theme choice in your browser’s local storage. Where we use the analytics or error-monitoring tools listed in section 6, they may set their own cookies or similar identifiers. You can block or delete cookies in your browser settings, but the app will not work without the cookies needed to sign in.',
        ],
      },
      {
        id: 'retention',
        title: '8. How long we keep data',
        body: [
          'We keep your account data and content for as long as your account is active. You can delete your account in the app’s settings. When you do, your workspaces, connected channels and posts are removed from your account and can no longer be accessed, the tokens of connected channels are destroyed, and your user record is de-identified. Some content may remain in our database and backups for a limited time; to have it permanently erased, contact us at {email}.',
          'We keep billing records for as long as tax and accounting laws require. We keep logs for a limited period for security and troubleshooting. If you want data deleted sooner, or have a question about a specific type of data, contact us at {email}.',
        ],
      },
      {
        id: 'security',
        title: '9. Security',
        body: [
          'We use reasonable technical and organisational measures to protect personal data, including encrypted connections (HTTPS), hashed passwords, restricted access to production systems and payment handling by Stripe. No system is perfectly secure, so we cannot guarantee absolute security. If we become aware of a breach that affects your personal data, we will notify you and the authorities where the law requires.',
        ],
      },
      {
        id: 'your-rights',
        title: '10. Your rights',
        body: [
          'Depending on where you live (for example in the European Economic Area, the United Kingdom or certain US states), you may have the right to:',
          {
            list: [
              'access the personal data we hold about you and get a copy of it;',
              'correct inaccurate data (you can update most account details yourself in the app);',
              'delete your data (you can delete your account in the app’s settings, and ask us to permanently erase what remains);',
              'object to or restrict certain processing, and withdraw consent where we rely on it;',
              'receive your data in a portable format;',
              'complain to your local data protection authority.',
            ],
          },
          'To make a request, email {email} from the address on your account. We may need to verify your identity, and we will respond within the time the law requires. We will not treat you differently for exercising your rights.',
        ],
      },
      {
        id: 'transfers',
        title: '11. International transfers',
        body: [
          'We are based in the United States, and we and our service providers may process personal data in the United States and other countries. Where the law requires, we use appropriate safeguards for these transfers, such as the European Commission’s Standard Contractual Clauses.',
        ],
      },
      {
        id: 'children',
        title: '12. Children',
        body: [
          'The Service is not intended for children and you must be at least 18 to create an account. We do not knowingly collect personal data from anyone under 18. If you believe a child has given us personal data, contact us and we will delete it.',
        ],
      },
      {
        id: 'changes',
        title: '13. Changes to this policy',
        body: [
          'We may update this policy from time to time. We will change the “Last updated” date above and, for material changes, tell you by email or in the app before they take effect.',
        ],
      },
      {
        id: 'contact',
        title: '14. Contact',
        body: ['{company}', '{address}', 'Email: {email}', 'You can also reach us through our {contact}.'],
      },
    ],
  },

  refund: {
    metaTitle: 'Refund and Cancellation Policy | Tadween',
    metaDescription: 'How to cancel a Tadween subscription, what happens to your access, how the free trial works and when you can get a refund.',
    title: 'Refund and Cancellation Policy',
    sub: 'How cancelling, trials and refunds work for Tadween subscriptions.',
    sections: [
      {
        id: 'overview',
        title: '1. Summary',
        body: [
          {
            list: [
              'You can cancel at any time. You keep access until the end of the period you paid for, and you will not be charged again.',
              'If you cancel during the free trial, you are not charged.',
            ],
          },
          { when: 'window', list: ['If Tadween is not right for you, you can ask for a full refund within {refundDays} days of your first payment for a new subscription.'] },
          { when: 'none', list: ['Payments are not refundable, except where the law requires a refund.'] },
        ],
      },
      {
        id: 'cancel',
        title: '2. How to cancel',
        body: [
          'You can cancel your subscription at any time in the Tadween app under Settings → Billing, where you can also open the billing portal provided by Stripe. You can also email {email} from the address on your account and we will cancel it for you.',
          'When you cancel, your subscription will not renew. You keep access to your paid plan until the end of the current billing period (monthly or yearly) that you have already paid for. After that, paid features stop and you will not be charged again.',
        ],
      },
      {
        id: 'trial',
        title: '3. Free trial',
        body: [
          'New subscriptions may start with a free trial (currently 7 days), as shown at checkout. We collect a payment method when the trial starts, but you are not charged during the trial. We may place a temporary authorisation (for example US$1) on your card to check that it is valid; it is released and not charged. If you cancel before the trial ends, you will not be charged at all. If you do not cancel, your subscription starts automatically at the end of the trial and your payment method is charged the price of the plan and billing period you chose.',
        ],
      },
      {
        id: 'refunds',
        title: '4. Refunds',
        body: [
          { when: 'window', text: 'First payment. If you are not satisfied, you can request a full refund of the first payment for a new subscription within {refundDays} days of that payment. This applies once per customer. When we refund it, we also cancel the subscription.' },
          { when: 'window', text: 'Renewals. Renewal payments (monthly or yearly) are not refundable, except where the law requires otherwise. Cancel before your renewal date to avoid the next charge. If you were charged for a renewal you did not intend to keep and have not used the Service since, contact us and we will review your request.' },
          { when: 'none', text: 'Because new subscriptions usually include a free trial and you can cancel at any time, payments are not refundable, except where the law requires a refund.' },
          'Billing errors. If you were charged in error, for example twice for the same period, we will refund the incorrect charge.',
          { when: 'window', text: 'Partial periods. Except as described above or required by law, we do not give refunds or credits for unused time in a billing period, for downgrades, or for features you did not use.' },
          { when: 'none', text: 'Partial periods. We do not give refunds or credits for unused time in a billing period, for downgrades, or for features you did not use, except where the law requires it.' },
        ],
      },
      {
        id: 'request',
        title: '5. How to request a refund',
        body: [
          'Email {email} from the address on your account. Include the email of the account, the date and amount of the charge, and the reason for your request. We aim to reply within two business days.',
          'Approved refunds are made to the original payment method through Stripe. Depending on your bank or card issuer, it can take 5 to 10 business days for the refund to appear on your statement.',
        ],
      },
      {
        id: 'law',
        title: '6. Your legal rights',
        body: [
          'This policy does not limit any refund, withdrawal or cancellation right you have under consumer protection laws that apply to you. If such a law gives you more rights than this policy, the law applies.',
        ],
      },
      {
        id: 'changes',
        title: '7. Changes',
        body: [
          'We may update this policy. Changes apply to payments made after the updated policy is posted, and we will change the “Last updated” date above. This policy is part of our {terms}.',
        ],
      },
      {
        id: 'contact',
        title: '8. Contact',
        body: ['{company}', '{address}', 'Email: {email}'],
      },
    ],
  },

  contact: {
    metaTitle: 'Contact | Tadween',
    metaDescription: 'How to reach the Tadween team for support, billing, refunds and privacy requests.',
    title: 'Contact us',
    sub: 'Questions about your account, billing, refunds or privacy? Write to us and a person will reply.',
    sections: [
      {
        id: 'email',
        title: 'Email',
        body: ['{email}', 'We aim to reply within two business days. For billing or refund questions, please write from the email address on your account and include the date of the charge.'],
      },
      {
        id: 'company',
        title: 'Company',
        body: ['Tadween is operated by {company}.', '{address}'],
      },
      {
        id: 'policies',
        title: 'Policies',
        body: ['Read our {terms}, {privacy} and {refund}.'],
      },
    ],
  },
};
