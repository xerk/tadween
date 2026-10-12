'use client';

import { FC, useEffect, useRef, useState } from 'react';
import DrawChart from 'chart.js/auto';

// Area / bar chart for the analytics page, drawn with chart.js (already used by
// Postiz's analytics). Colours come from the --tdw-* tokens, so it follows
// light/dark; it redraws when <body> switches theme. No animation under
// prefers-reduced-motion.

export interface ChartPoint {
  label: string; // shown in the tooltip title and on the x axis
  value: number;
}

const token = (name: string, fallback: string) =>
  (typeof window !== 'undefined' &&
    getComputedStyle(document.body).getPropertyValue(name).trim()) ||
  fallback;

const withAlpha = (color: string, alpha: number) => {
  const hex = color.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) {
    return color;
  }
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// bumps when <body> changes theme class, so charts pick up the new tokens
const useThemeVersion = () => {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const observer = new MutationObserver(() => setVersion((v) => v + 1));
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);
  return version;
};

export const TadweenChart: FC<{
  points: ChartPoint[];
  type?: 'area' | 'bar';
  format: (value: number) => string;
  label: string;
  height?: number;
}> = ({ points, type = 'area', format, label, height = 180 }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const theme = useThemeVersion();

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    const primary = token('--tdw-primary', '#0b7062');
    const grid = token('--tdw-border', '#e2e2e7');
    const muted = token('--tdw-muted-foreground', '#68686e');
    const popover = token('--tdw-popover', '#ffffff');
    const foreground = token('--tdw-foreground', '#1d1d1f');
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const ctx = ref.current.getContext('2d')!;
    const fill = ctx.createLinearGradient(0, 0, 0, height);
    fill.addColorStop(0, withAlpha(primary, 0.28));
    fill.addColorStop(1, withAlpha(primary, 0));

    // a single point still draws a flat line
    const list = points.length === 1 ? [points[0], points[0]] : points;

    const chart = new DrawChart(ref.current, {
      type: type === 'bar' ? 'bar' : 'line',
      data: {
        labels: list.map((p) => p.label),
        datasets: [
          {
            label,
            data: list.map((p) => p.value),
            borderColor: primary,
            backgroundColor: type === 'bar' ? withAlpha(primary, 0.85) : fill,
            borderWidth: type === 'bar' ? 0 : 2,
            borderRadius: type === 'bar' ? 4 : 0,
            maxBarThickness: 18,
            fill: type !== 'bar',
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: primary,
            pointHoverBorderColor: popover,
            pointHoverBorderWidth: 2,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        animation: reduced ? false : { duration: 600, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { top: 6, left: 0, right: 4, bottom: 0 } },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: muted,
              maxTicksLimit: 6,
              maxRotation: 0,
              autoSkipPadding: 12,
              font: { size: 11 },
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: grid, drawTicks: false },
            border: { display: false, dash: [3, 3] },
            ticks: {
              color: muted,
              maxTicksLimit: 4,
              // counts never get "0.5" ticks
              precision: points.every((p) => Number.isInteger(p.value))
                ? 0
                : undefined,
              padding: 8,
              font: { size: 11 },
              callback: (value) => format(Number(value)),
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: popover,
            titleColor: muted,
            bodyColor: foreground,
            borderColor: grid,
            borderWidth: 1,
            padding: 10,
            cornerRadius: 10,
            displayColors: false,
            titleFont: { size: 12, weight: 'normal' },
            bodyFont: { size: 14, weight: 'bold' },
            callbacks: {
              label: (item) => `${label}: ${format(Number(item.raw))}`,
            },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [points, type, theme, label, format, height]);

  return (
    <div className="tdw-an-canvas" style={{ height }} dir="ltr">
      <canvas ref={ref} role="img" aria-label={label} />
    </div>
  );
};
