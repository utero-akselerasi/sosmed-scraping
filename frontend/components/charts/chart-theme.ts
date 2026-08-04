import type { Theme } from '@/contexts/theme-context';

export interface ChartThemeColors {
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  label: string;
}

export const CHART_THEMES: Record<Theme, ChartThemeColors> = {
  light: {
    grid: '#e5e7eb',
    axis: '#6b7280',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e5e7eb',
    tooltipText: '#111827',
    label: '#111827',
  },
  dark: {
    grid: '#334155',
    axis: '#94a3b8',
    tooltipBg: '#1e293b',
    tooltipBorder: '#334155',
    tooltipText: '#f1f5f9',
    label: '#f1f5f9',
  },
};

export function getChartTheme(theme: Theme): ChartThemeColors {
  return CHART_THEMES[theme];
}

export function getChartTooltipStyle(theme: Theme) {
  const t = CHART_THEMES[theme];
  return {
    backgroundColor: t.tooltipBg,
    border: `1px solid ${t.tooltipBorder}`,
    borderRadius: '10px',
    padding: '8px 12px',
    color: t.tooltipText,
    fontSize: '12px',
    boxShadow: '0 10px 30px -5px rgb(15 23 42 / 0.2)',
  };
}
