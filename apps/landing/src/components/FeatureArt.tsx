import type { ArtKind } from '@/content/types';
import { Icon } from './Icon';

/* Small product illustrations for the feature cards: drawn with the app's tokens, decorative
   only (aria-hidden), and animated in CSS when the card scrolls into view (`.is-in`, set by
   the motion engine) so reduced motion simply shows the finished state. */

const BARS = [38, 54, 46, 72, 60, 88, 66];

export function FeatureArt({ kind, rtl }: { kind: ArtKind; rtl: boolean }) {
  switch (kind) {
    case 'linkedin':
      return (
        <div className="pz-art-box is-li" aria-hidden="true">
          <div className="pz-art-card">
            <span className="pz-art-row">
              <i className="pz-art-dot" />
              <i className="pz-art-line w40" />
            </span>
            <i className="pz-art-line w90" />
            <i className="pz-art-line w70" />
            <span className="pz-art-more">…</span>
          </div>
          <div className="pz-art-bubble">
            <Icon name="message-square" size={12} />
            <i className="pz-art-line w60" />
          </div>
        </div>
      );
    case 'arabic':
      return (
        <div className="pz-art-box is-ar" aria-hidden="true">
          <p className="pz-art-artext" lang="ar" dir="rtl">
            اكتب بالعربية،
            <br />
            وشاهدها كما يجب.
          </p>
          <span className="pz-art-dir">
            <Icon name="arrow-right" size={14} className="pz-art-rtl" />
            RTL
          </span>
        </div>
      );
    case 'calendar':
      return (
        <div className="pz-art-box is-cal" aria-hidden="true">
          <div className="pz-art-cal">
            {Array.from({ length: 15 }, (_, i) => (
              <i key={i} className={i === 3 || i === 9 ? 'is-post' : i === 6 ? 'is-soft' : undefined} />
            ))}
            <b className="pz-art-drag" />
          </div>
        </div>
      );
    case 'team':
      return (
        <div className="pz-art-box is-team" aria-hidden="true">
          <span className="pz-art-faces">
            {['MA', 'KS', 'NR', '+3'].map((x) => (
              <span key={x} className="pz-avatar">
                {x}
              </span>
            ))}
          </span>
          <span className="pz-art-pill">
            <Icon name="link" size={12} />
            /p/8f2c
          </span>
          <span className="pz-art-bubble is-comment">
            <Icon name="message-square" size={12} />
            <i className="pz-art-line w60" />
          </span>
        </div>
      );
    case 'analytics':
      return (
        <div className="pz-art-box is-chart" aria-hidden="true">
          <div className="pz-art-bars">
            {BARS.map((h, i) => (
              <i key={i} style={{ ['--h' as string]: `${h}%`, ['--d' as string]: `${i * 60}ms` }} />
            ))}
          </div>
        </div>
      );
    case 'media':
      return (
        <div className="pz-art-box is-media" aria-hidden="true">
          <div className="pz-art-tiles">
            {Array.from({ length: 6 }, (_, i) => (
              <i key={i} className={`t${i % 3}`} />
            ))}
          </div>
          <span className="pz-art-pill is-float">
            <Icon name="upload" size={12} />
            https://…/cover.jpg
          </span>
        </div>
      );
    case 'agent':
      return (
        <div className="pz-art-box is-agent" aria-hidden="true">
          <span className="pz-art-msg is-user">
            <i className="pz-art-line w80" />
          </span>
          {[0, 1, 2].map((i) => (
            <span key={i} className="pz-art-call" style={{ ['--d' as string]: `${200 + i * 220}ms` }}>
              <Icon name="circle-check" size={12} />
              <i className={`pz-art-line ${i === 2 ? 'w50' : 'w70'}`} />
            </span>
          ))}
        </div>
      );
    case 'automation':
      return (
        <div className="pz-art-box is-auto" aria-hidden="true">
          <span className="pz-art-node">
            <Icon name="rss" size={16} />
          </span>
          <span className={rtl ? 'pz-art-wire is-rtl' : 'pz-art-wire'} />
          <span className="pz-art-node is-main">
            <Icon name="calendar" size={16} />
          </span>
          <span className={rtl ? 'pz-art-wire is-rtl' : 'pz-art-wire'} />
          <span className="pz-art-node">
            <Icon name="webhook" size={16} />
          </span>
        </div>
      );
  }
}
