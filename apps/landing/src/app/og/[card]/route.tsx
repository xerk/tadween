import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { en } from '@/content/en';
import { CHANNELS, channelBySlug } from '@/lib/channels';

// Open Graph cards, one per page, drawn at build time (1200×630 PNG at /og/<card>.png).
// The text is English for both languages: the image renderer can't shape Arabic script,
// and a card with broken Arabic would be worse than a clean English one.

export const dynamic = 'force-static';
export const dynamicParams = false;

const PAGES: Record<string, { eyebrow: string; title: string }> = {
  home: { eyebrow: 'LinkedIn-first scheduling', title: en.hero.title },
  pricing: { eyebrow: 'Pricing', title: 'Four plans, from $9 a month. Seven days free.' },
  features: { eyebrow: 'Features', title: en.featuresPage.title },
  'ai-agent': { eyebrow: 'AI agent', title: en.agentPage.title },
  developers: { eyebrow: 'Developers', title: 'Public API, MCP server and webhooks' },
  channels: { eyebrow: 'Channels', title: en.channels.index.title },
};

export function generateStaticParams() {
  return [...Object.keys(PAGES), ...CHANNELS.map((c) => `channel-${c.slug}`)].map((card) => ({ card: `${card}.png` }));
}

const asset = async (file: string, type: string) =>
  `data:${type};base64,${(await readFile(path.join(process.cwd(), 'public', file))).toString('base64')}`;

export async function GET(_req: Request, { params }: { params: Promise<{ card: string }> }) {
  const card = (await params).card.replace(/\.png$/, '');
  const channel = card.startsWith('channel-') ? channelBySlug(card.slice('channel-'.length)) : undefined;
  const page = channel ? { eyebrow: channel.name, title: en.channels.items[channel.slug].h1 } : PAGES[card] ?? PAGES.home;
  const logo = await asset('logo.svg', 'image/svg+xml');
  const icon = channel ? await asset(channel.icon.replace(/^\//, ''), 'image/png') : null;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: '#f5f5f7', color: '#1d1d1f', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src={logo} width={56} height={56} style={{ borderRadius: 12 }} />
          <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.03em' }}>Tadween</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {icon ? <img src={icon} width={44} height={44} style={{ borderRadius: 10 }} /> : null}
            <span style={{ display: 'flex', padding: '8px 18px', borderRadius: 999, background: '#e2f3ef', color: '#0b7062', fontSize: 26, fontWeight: 600 }}>{page.eyebrow}</span>
          </div>
          <div style={{ fontSize: 68, lineHeight: 1.08, fontWeight: 700, letterSpacing: '-0.035em' }}>{page.title}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 24, color: '#68686e' }}>
          <span>LinkedIn first · English and Arabic · 30+ channels</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={{ width: 36, height: 24, borderRadius: 6, background: i === 3 ? '#94580a' : i % 2 ? '#0b7062' : '#e2f3ef' }} />
            ))}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
