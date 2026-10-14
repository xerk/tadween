# Chrome Web Store listing: Tadween (Skool connector) 1.0.0

Copy each block into the developer console. The facts here match the code in `apps/extension` and the backend
as of 2026-10-14; update this file when either changes.

## Package

- File: `tadween-extension-1.0.0.zip` (manifest version 3, version `1.0.0`)
- Name: **Tadween** (from the manifest; the store shows it as the title)
- Language: English. The package has no `_locales` folder, so the store has one listing language. Put the
  Arabic description below the English one in the same "Description" field.

## Short description (manifest `description`, max 132 characters)

English (116 characters, this is the one in the package):

> Connect your Skool account to Tadween, so you can schedule and publish posts to your Skool communities from Tadween.

Arabic (83 characters, for the Arabic site or a later localized package):

> اربط حسابك في Skool بتدوين، لتجدول منشوراتك وتنشرها في مجتمعاتك على Skool من تدوين.

## Description

English:

```
Tadween is a social media scheduler for people and brands. Skool has no public posting API, so Tadween connects to Skool through this extension.

How to connect Skool
1. Sign in to Skool in this browser, as you normally do.
2. In Tadween (studio.tadween.app), open Add channel and choose Skool.
3. Read the notice and confirm. The extension gives your Skool sign-in to your Tadween workspace, and Tadween publishes your scheduled posts to your Skool communities.

What the extension does
- Reads two Skool cookies, client_id and auth_token, and only when a Tadween page asks for them.
- Talks only to Tadween pages (tadween.app). Other websites can't reach it.
- For Skool channels you connected, tries once a day to send your current Skool sign-in to Tadween so the channel stays connected.

What it doesn't do
- No access to your browsing history, to other websites' cookies or to the pages you visit.
- No pop-up, no ads, no tracking, and no code loaded from the internet.

Tadween stores your Skool sign-in encrypted and uses it only to post to Skool for you. Sign out of Skool to end that session at any time, and remove the Skool channel in Tadween to stop posting.

Skool is a trademark of its owner. Tadween is not affiliated with or endorsed by Skool.
Privacy policy: https://tadween.app/privacy
```

Arabic:

```
تدوين أداة لجدولة منشوراتك على الشبكات الاجتماعية. لا توفّر منصة Skool واجهة برمجية عامة للنشر، لذلك يتصل تدوين بـ Skool عبر هذه الإضافة.

طريقة ربط Skool
١. سجّل الدخول إلى Skool في هذا المتصفح كالمعتاد.
٢. في تدوين (studio.tadween.app) افتح «إضافة قناة» واختر Skool.
٣. اقرأ التنبيه ثم أكّد. تمرّر الإضافة جلسة دخولك في Skool إلى مساحة عملك في تدوين، فينشر تدوين منشوراتك المجدولة في مجتمعاتك على Skool.

ما تفعله الإضافة
- تقرأ ملفّي تعريف ارتباط فقط من Skool، هما client_id وauth_token، وذلك فقط عندما تطلبهما صفحة من تدوين.
- لا تتواصل إلا مع صفحات تدوين (tadween.app)، ولا تستطيع المواقع الأخرى الوصول إليها.
- تحاول مرة كل يوم إرسال جلستك الحالية في Skool إلى تدوين، للقنوات التي ربطتها، حتى تبقى القناة متصلة.

ما لا تفعله
- لا تصل إلى سجل التصفح، ولا إلى ملفات تعريف الارتباط الخاصة بالمواقع الأخرى، ولا إلى محتوى الصفحات التي تزورها.
- لا نوافذ منبثقة، ولا إعلانات، ولا تتبّع، ولا تحمّل أي شيفرة من الإنترنت.

يحفظ تدوين جلسة دخولك في Skool مشفّرة، ولا يستخدمها إلا للنشر في Skool نيابةً عنك. يمكنك إنهاء هذه الجلسة في أي وقت بتسجيل الخروج من Skool، وإيقاف النشر بحذف قناة Skool من تدوين.

Skool علامة تجارية لمالكها، وتدوين غير تابع لها ولا معتمد منها.
سياسة الخصوصية: https://tadween.app/ar/privacy
```

## Category

**Productivity → Workflow & Planning.** (Second choice: Social & Communication.)

## Graphics (`store/`)

| Store field | File |
|---|---|
| Store icon (128×128) | `store-icon-128.png` (same file as the extension's `icon-128.png`: 96 px artwork, 16 px transparent margin) |
| Screenshots (1280×800, up to 5) | `screenshot-1-overview-1280x800.png`, `screenshot-2-add-channel-1280x800.png`, `screenshot-3-notice-1280x800.png` |
| Small promo tile (440×280) | `promo-tile-440x280.png` |

Screenshots 2 and 3 come from the test run on a demo workspace; they show no cookies, tokens or real accounts.

## Privacy tab

### Single purpose

```
Connect the user's Skool account to their Tadween workspace: when the user adds or reconnects a Skool channel on a Tadween page, the extension reads the user's Skool sign-in cookies and returns them to that page, so Tadween can publish the user's scheduled posts to Skool.
```

### Permission justifications

**cookies**
```
Reads the user's Skool sign-in cookies (client_id and auth_token) for https://www.skool.com when a Tadween page asks for them while the user adds or reconnects a Skool channel, and once a day for channels the user connected. Skool has no public posting API, so these cookies are how Tadween posts for the user. The host permission limits cookie access to skool.com.
```

**storage**
```
Keeps, in chrome.storage.local, one entry per Skool channel the user connected: the channel id, a token signed by Tadween that identifies the channel (it holds no cookies or passwords), and the Tadween API address. It is used for the daily reconnect and removed when the user deletes the channel in Tadween.
```

**alarms**
```
One alarm, once every 24 hours and only while the user has a connected Skool channel, to send the current Skool sign-in to Tadween so the channel stays connected. It is cleared when no Skool channels remain.
```

**Host permission `*://*.skool.com/*`**
```
Needed so the cookies API can read the two Skool sign-in cookies. The extension makes no requests to Skool, injects no scripts and reads no page content.
```

**externally_connectable (if the reviewer asks)**
```
Only https://studio.tadween.app and other https://*.tadween.app pages can message the extension. The service worker also checks the sender's origin and rejects any other page.
```

### Remote code

**No, I am not using remote code.** (All code is in the package; there is no `eval` and nothing is downloaded.)

### Data usage

What user data do you collect? Tick only:

- [x] **Authentication information** (the Skool sign-in cookies `client_id` and `auth_token`)

Leave unticked: personally identifiable information, health, financial and payment, personal communications,
location, web history, user activity, website content.

Certify all three:

- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

Privacy policy URL: `https://tadween.app/privacy`

## Privacy-policy paragraph (for tadween.app/privacy, before submitting)

English:

> **Tadween browser extension (Skool).** If you install the Tadween extension for Chrome and connect a Skool
> channel, the extension reads two cookies that Skool sets when you sign in (`client_id` and `auth_token`). It does
> this only when you add or reconnect a Skool channel on a Tadween page, and, while you have a connected Skool
> channel, once a day to keep it connected. The extension sends these cookies only to Tadween, over HTTPS. Tadween
> stores them encrypted (AES-256) on its servers and uses them only to act on your Skool account as you ask: to
> read your Skool profile and communities and to publish the posts you schedule. The extension does not read your
> browsing history, other websites' cookies or the content of pages you visit. On your device it keeps only an
> identifier of each connected Skool channel and a token signed by Tadween that identifies that channel. We don't
> sell this data, share it with third parties, or use it for advertising. Removing the Skool channel in Tadween
> stops all posting; signing out of Skool ends the session the cookies belong to. To have the stored cookies
> erased, delete your account or email support@tadween.app.

Arabic:

> **إضافة تدوين للمتصفح (Skool).** إذا ثبّتَّ إضافة تدوين على Chrome وربطت قناة Skool، تقرأ الإضافة ملفّي تعريف
> ارتباط يضعهما Skool عند تسجيل دخولك، هما `client_id` و`auth_token`. ولا تفعل ذلك إلا عندما تضيف قناة Skool أو تعيد
> ربطها من صفحة في تدوين، ومرة كل يوم ما دامت لديك قناة Skool متصلة، للإبقاء عليها متصلة. لا ترسل الإضافة هذين
> الملفين إلا إلى تدوين، عبر اتصال HTTPS. يحفظهما تدوين على خوادمه مشفّرَين (AES-256)، ولا يستخدمهما إلا للتصرف في
> حسابك على Skool بطلب منك: قراءة ملفك الشخصي ومجتمعاتك، ونشر المنشورات التي تجدولها. لا تقرأ الإضافة سجل التصفح،
> ولا ملفات تعريف الارتباط الخاصة بالمواقع الأخرى، ولا محتوى الصفحات التي تزورها. ولا تحفظ على جهازك إلا معرّف كل
> قناة Skool متصلة ورمزًا موقّعًا من تدوين يدل على تلك القناة. لا نبيع هذه البيانات، ولا نشاركها مع أطراف ثالثة،
> ولا نستخدمها في الإعلانات. حذف قناة Skool من تدوين يوقف النشر كله، وتسجيل الخروج من Skool ينهي الجلسة التي ينتمي
> إليها هذان الملفان. لمحو الملفات المحفوظة، احذف حسابك أو راسلنا على support@tadween.app.

Notes behind the wording (keep it true):

- Encryption: `AuthService.fixedEncryption` is AES-256-CBC with a key derived from the server's `JWT_SECRET`. The
  cookies are in `Integration.token` and `Integration.customInstanceDetails`.
- Deleting a channel is a soft delete (`deletedAt`); the encrypted row stays. That is why the text offers erasure
  on account deletion or by email, and doesn't promise it on channel removal. Account deletion
  (`UsersService.deleteAccount` → `deleteIntegrationsForAccount`) overwrites `token` and
  `customInstanceDetails` with hashes for the workspaces the user owns.
- The app passes the cookies once in its own URL (`/integrations/social/skool?code=…`, base64) before the POST.
  That URL is on Tadween's own HTTPS domain, but it can end up in browser history and in web-server access logs.
