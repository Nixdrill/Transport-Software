export interface ThemeConfig {
  id: string;
  name: string;
  category: 'dark' | 'light';
  description: string;
  bgClass: string;
  cardBgClass: string;
  borderClass: string;
  accentClass: string;
  accentTextClass: string;
  previewColors: string[]; // [bg, card, accent]
}

export const AVAILABLE_THEMES: ThemeConfig[] = [
  {
    id: 'slate',
    name: 'Slate Logistics (Default)',
    category: 'dark',
    description: 'Deep slate blue and indigo, designed for 24/7 dispatch control rooms.',
    bgClass: 'bg-slate-950 text-slate-100',
    cardBgClass: 'bg-slate-900/90',
    borderClass: 'border-slate-800',
    accentClass: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    accentTextClass: 'text-indigo-400',
    previewColors: ['#020617', '#0f172a', '#4f46e5'],
  },
  {
    id: 'emerald',
    name: 'Emerald Fleet',
    category: 'dark',
    description: 'Deep forest green and emerald accents, inspired by eco-logistics.',
    bgClass: 'bg-stone-950 text-emerald-50',
    cardBgClass: 'bg-emerald-950/40',
    borderClass: 'border-emerald-900/60',
    accentClass: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    accentTextClass: 'text-emerald-400',
    previewColors: ['#0c0a09', '#064e3b', '#10b981'],
  },
  {
    id: 'amber',
    name: 'Cyberpunk Amber',
    category: 'dark',
    description: 'High-contrast black and luminous industrial amber for night yard operations.',
    bgClass: 'bg-neutral-950 text-amber-50',
    cardBgClass: 'bg-neutral-900/90',
    borderClass: 'border-amber-900/50',
    accentClass: 'bg-amber-600 hover:bg-amber-500 text-black font-bold',
    accentTextClass: 'text-amber-400',
    previewColors: ['#0a0a0a', '#171717', '#f59e0b'],
  },
  {
    id: 'ocean',
    name: 'Oceanic Blue',
    category: 'dark',
    description: 'Maritime freight dark navy with vibrant sky and cyan accents.',
    bgClass: 'bg-sky-950/80 text-sky-50',
    cardBgClass: 'bg-slate-900/95',
    borderClass: 'border-sky-900/60',
    accentClass: 'bg-sky-600 hover:bg-sky-500 text-white',
    accentTextClass: 'text-sky-400',
    previewColors: ['#082f49', '#0f172a', '#0284c7'],
  },
  {
    id: 'crimson',
    name: 'Crimson Express',
    category: 'dark',
    description: 'Intense charcoal dark with crimson and ruby accents for urgent courier fleets.',
    bgClass: 'bg-zinc-950 text-rose-50',
    cardBgClass: 'bg-zinc-900/90',
    borderClass: 'border-rose-950',
    accentClass: 'bg-rose-600 hover:bg-rose-500 text-white',
    accentTextClass: 'text-rose-400',
    previewColors: ['#09090b', '#18181b', '#e11d48'],
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    category: 'dark',
    description: 'Premium violet and amethyst luxury freight palette.',
    bgClass: 'bg-indigo-950/90 text-purple-50',
    cardBgClass: 'bg-purple-950/40',
    borderClass: 'border-purple-900/60',
    accentClass: 'bg-purple-600 hover:bg-purple-500 text-white',
    accentTextClass: 'text-purple-400',
    previewColors: ['#1e1b4b', '#3b0764', '#9333ea'],
  },
  {
    id: 'monochrome',
    name: 'Steel Monochrome',
    category: 'dark',
    description: 'Pure titanium graphite and neutral gray for minimalist, distraction-free entry.',
    bgClass: 'bg-black text-zinc-100',
    cardBgClass: 'bg-zinc-900/90',
    borderClass: 'border-zinc-800',
    accentClass: 'bg-zinc-100 hover:bg-zinc-300 text-black font-bold',
    accentTextClass: 'text-zinc-300',
    previewColors: ['#000000', '#18181b', '#f4f4f5'],
  },
  {
    id: 'light',
    name: 'Daytime Dock (Light)',
    category: 'light',
    description: 'High-contrast daylight theme designed for outdoor tablets and sunny loading bays.',
    bgClass: 'bg-slate-100 text-slate-900',
    cardBgClass: 'bg-white shadow-sm',
    borderClass: 'border-slate-300',
    accentClass: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    accentTextClass: 'text-indigo-600 font-semibold',
    previewColors: ['#f1f5f9', '#ffffff', '#4f46e5'],
  },
];

const THEME_STORAGE_KEY = 'logitrack_active_theme_v1';

export function getSavedTheme(): string {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'slate';
  } catch {
    return 'slate';
  }
}

export function saveTheme(themeId: string): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch (e) {
    console.error('Failed to save theme preference', e);
  }
}
