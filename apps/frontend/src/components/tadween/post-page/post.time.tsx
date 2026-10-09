'use client';

// Dates on the post page, in the viewer's language and time zone. Both render
// after mount only, so the server's time zone never causes a hydration
// mismatch.
import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Arabic keeps Latin digits, like the rest of Tadween (see Today).
export const useLocale = () => {
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage || 'en').replace('_', '-');
  return lang === 'ar' ? 'ar-EG-u-nu-latn' : lang;
};

export const LocalDate: FC<{
  date: string;
  options?: Intl.DateTimeFormatOptions;
}> = ({ date, options = { dateStyle: 'medium', timeStyle: 'short' } }) => {
  const locale = useLocale();
  const [text, setText] = useState('');
  useEffect(() => {
    try {
      setText(new Intl.DateTimeFormat(locale, options).format(new Date(date)));
    } catch {
      setText(new Date(date).toLocaleString());
    }
  }, [date, locale]);
  return (
    <time dateTime={date} suppressHydrationWarning>
      {text}
    </time>
  );
};

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
  ['week', 4.35],
  ['month', 12],
  ['year', Infinity],
];

// "5 minutes ago", with the full date on hover.
export const RelativeTime: FC<{ date: string }> = ({ date }) => {
  const locale = useLocale();
  const [text, setText] = useState({ relative: '', full: '' });
  useEffect(() => {
    const then = new Date(date);
    let value = (then.getTime() - Date.now()) / 1000;
    let unit: Intl.RelativeTimeFormatUnit = 'second';
    for (const [step, size] of RELATIVE_STEPS) {
      unit = step;
      if (Math.abs(value) < size) {
        break;
      }
      value /= size;
    }
    try {
      const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      setText({
        relative:
          unit === 'second'
            ? format.format(0, 'second')
            : format.format(Math.round(value), unit),
        full: new Intl.DateTimeFormat(locale, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(then),
      });
    } catch {
      setText({ relative: then.toLocaleString(), full: '' });
    }
  }, [date, locale]);
  return (
    <time dateTime={date} title={text.full} suppressHydrationWarning>
      {text.relative}
    </time>
  );
};
