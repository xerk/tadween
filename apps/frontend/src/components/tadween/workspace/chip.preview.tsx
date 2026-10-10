'use client';

// The hover card of a calendar chip. A chip only fits one line of the post;
// resting the pointer on it for a second (or focusing it from the keyboard)
// shows the whole post next to it: channel, state, exact time, the full text,
// tags, the failure reason and the chip's own actions (ChipAction, the same
// list the ⋯ menu shows). It reads only what the calendar already loaded.
// Pointer-down (a click or the start of a drag) cancels it, so it never gets
// in the way of drag and drop; touch screens keep the ⋯ menu instead.
import React, { FC, RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { isUSCitizen } from '@gitroom/frontend/components/launches/helpers/isuscitizen.utils';
import { ChannelAvatar } from '@gitroom/frontend/components/tadween/workspace/channel.strip';
import { ChipAction } from '@gitroom/frontend/components/tadween/workspace/chip.more.menu';
import { Icon } from '@gitroom/frontend/components/tadween/ui';

const OPEN_DELAY = 1000;
const CLOSE_DELAY = 160;
const WIDTH = 340;
const GAP = 10;

// Paragraphs and line breaks survive as new lines; the rest is plain text
const fullText = (content: string) =>
  stripHtmlValidation(
    'none',
    (content || '').replace(/<\/p>\s*<p[^>]*>/gi, '\n').replace(/<br\s*\/?>/gi, '\n'),
    false,
    true,
    false
  ).trim();

export const ChipPreview: FC<{
  anchor: RefObject<HTMLElement>;
  post: any;
  stateKey: 'scheduled' | 'published' | 'failed' | 'draft';
  onEdit: () => void;
  actions: ChipAction[];
}> = ({ anchor, post, stateKey, onEdit, actions }) => {
  const t = useT();
  const card = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<null | { top: number; left: number; side: 'start' | 'end' }>(null);

  const close = useCallback(() => {
    clearTimeout(timer.current);
    setOpen(false);
    setPos(null);
  }, []);
  const later = useCallback((fn: () => void, ms: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  }, []);

  // Triggers live on the chip itself, so the chip's markup stays Postiz's
  useEffect(() => {
    const el = anchor.current;
    if (!el) return;
    const canHover = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const enter = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !canHover()) return;
      later(() => setOpen(true), open ? 0 : OPEN_DELAY);
    };
    const leave = (e: PointerEvent) => {
      if (card.current?.contains(e.relatedTarget as Node)) return;
      later(close, CLOSE_DELAY);
    };
    const down = () => close();
    const focus = () => {
      if (el.matches(':focus-visible') || el.querySelector(':focus-visible')) {
        later(() => setOpen(true), 300);
      }
    };
    const blur = (e: FocusEvent) => {
      if (!card.current?.contains(e.relatedTarget as Node)) later(close, CLOSE_DELAY);
    };
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('pointerdown', down);
    el.addEventListener('dragstart', down);
    el.addEventListener('focusin', focus);
    el.addEventListener('focusout', blur);
    return () => {
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('dragstart', down);
      el.removeEventListener('focusin', focus);
      el.removeEventListener('focusout', blur);
    };
  }, [anchor, open, close, later]);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Beside the chip, on its inline-end side; flips when there's no room and
  // slides up so it never leaves the window
  useLayoutEffect(() => {
    if (!open || !anchor.current || !card.current) return;
    const r = anchor.current.getBoundingClientRect();
    const h = card.current.offsetHeight;
    const rtl = document.documentElement.dir === 'rtl';
    const roomEnd = rtl ? r.left - GAP : window.innerWidth - r.right - GAP;
    const roomStart = rtl ? window.innerWidth - r.right - GAP : r.left - GAP;
    const side = roomEnd >= WIDTH + 8 || roomEnd >= roomStart ? 'end' : 'start';
    const toRight = (side === 'end') !== rtl;
    const left = toRight ? r.right + GAP : r.left - GAP - WIDTH;
    setPos({
      side,
      left: Math.min(Math.max(8, left), window.innerWidth - WIDTH - 8),
      top: Math.min(Math.max(8, r.top), window.innerHeight - h - 8),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    // Scrolling the calendar moves the chip away; scrolling the text doesn't
    const scroll = (e: Event) => {
      if (!card.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('keydown', key);
    window.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('keydown', key);
      window.removeEventListener('scroll', scroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open, close]);

  if (!open) return null;

  const date = newDayjs(post.publishDate).local();
  const text = fullText(post.content);
  const run = (fn: () => void) => () => {
    close();
    fn();
  };

  return createPortal(
    <div
      ref={card}
      role="dialog"
      aria-label={t('tdw_ws_post_preview', 'Post preview')}
      className={clsx('tdw-ui tdw-chip-card', pos && `is-${pos.side}`)}
      data-state={stateKey}
      style={{ width: WIDTH, top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
      // A portal still bubbles through the chip's React tree
      onClick={(e) => e.stopPropagation()}
      onPointerEnter={() => clearTimeout(timer.current)}
      onPointerLeave={(e) => {
        if (!anchor.current?.contains(e.relatedTarget as Node)) later(close, CLOSE_DELAY);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node) && !anchor.current?.contains(e.relatedTarget as Node)) {
          later(close, CLOSE_DELAY);
        }
      }}
    >
      <div className="tdw-chip-card-head">
        <ChannelAvatar
          channel={{
            identifier: post.integration?.providerIdentifier,
            picture: post.integration?.picture,
            name: post.integration?.name,
          }}
          size={32}
        />
        <div className="tdw-chip-card-who">
          <b>{post.integration?.name}</b>
          <span>
            {date.format('ddd, ll')} · {date.format(isUSCitizen() ? 'hh:mm A' : 'HH:mm')}
          </span>
        </div>
        <span className={clsx('tdw-chip-card-state', `is-${stateKey}`)}>
          {stateKey === 'failed'
            ? t('tdw_ws_state_failed', 'Failed')
            : stateKey === 'published'
            ? t('tdw_ws_state_published', 'Published')
            : stateKey === 'draft'
            ? t('tdw_ws_state_draft', 'Draft')
            : t('tdw_ws_state_scheduled', 'Scheduled')}
        </span>
      </div>
      {stateKey === 'failed' && (
        <div className="tdw-chip-card-error" role="note">
          <Icon name="triangle-alert" size={14} />
          <span>{post.error || t('tdw_ws_failed_unknown', 'Publishing failed. Open the post to try again.')}</span>
        </div>
      )}
      <p className="tdw-chip-card-text" dir="auto" tabIndex={text.length > 280 ? 0 : -1}>
        {text || t('no_content', 'no content')}
      </p>
      {!!post.tags?.length && (
        <div className="tdw-chip-card-tags">
          {post.tags.map((p: any) => (
            <span key={p.tag.id || p.tag.name}>
              <i style={{ backgroundColor: p.tag.color || 'var(--tdw-muted-foreground)' }} />
              {p.tag.name}
            </span>
          ))}
        </div>
      )}
      <div className="tdw-chip-card-acts">
        <button type="button" className="tdw-chip-card-edit" onClick={run(onEdit)}>
          <Icon name="pencil" size={14} />
          {t('edit', 'Edit')}
        </button>
        <span className="tdw-chip-card-grow" />
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            className={clsx('tdw-chip-card-act', action.danger && 'is-danger')}
            aria-label={action.label}
            title={action.label}
            onClick={run(action.onClick)}
          >
            {action.icon}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
};
