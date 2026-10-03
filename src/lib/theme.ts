export interface ThemeConfig {
  id: string;
  name: string;
  category: 'light' | 'dark';
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
    id: 'neon-lime',
    name: 'Neon Lime & Greyish White (Default)',
    category: 'light',
    description: 'Crisp greyish white canvas paired with high-energy solid neon lime and deep graphite typography.',
    bgClass: 'bg-[#F0F2F6] text-slate-900',
    cardBgClass: 'bg-white shadow-xs',
    borderClass: 'border-slate-200',
    accentClass: 'bg-[#00E676] hover:bg-[#00c864] text-slate-950 font-black shadow-xs',
    accentTextClass: 'text-emerald-700 font-bold',
    previewColors: ['#F0F2F6', '#FFFFFF', '#00E676'],
  },
  {
    id: 'neon-cyan',
    name: 'Electric Neon Cyan',
    category: 'light',
    description: 'Modern cool grey-white foundation powered by punchy solid electric cyan and maritime accents.',
    bgClass: 'bg-[#EDF2F7] text-slate-900',
    cardBgClass: 'bg-white shadow-xs',
    borderClass: 'border-slate-200',
    accentClass: 'bg-[#00D2FF] hover:bg-[#00b8e6] text-slate-950 font-black shadow-xs',
    accentTextClass: 'text-cyan-700 font-bold',
    previewColors: ['#EDF2F7', '#FFFFFF', '#00D2FF'],
  },
  {
    id: 'neon-amber',
    name: 'Solid Solar Amber',
    category: 'light',
    description: 'Warm greyish white with solid punchy industrial neon amber badges and buttons.',
    bgClass: 'bg-[#F4F3F0] text-stone-900',
    cardBgClass: 'bg-white shadow-xs',
    borderClass: 'border-stone-200',
    accentClass: 'bg-[#FFB700] hover:bg-[#e6a500] text-stone-950 font-black shadow-xs',
    accentTextClass: 'text-amber-700 font-bold',
    previewColors: ['#F4F3F0', '#FFFFFF', '#FFB700'],
  },
  {
    id: 'neon-violet',
    name: 'Ultra Neon Violet',
    category: 'light',
    description: 'Silky pearl-grey canvas energized with punchy ultraviolet purple action points.',
    bgClass: 'bg-[#F2F1F8] text-slate-900',
    cardBgClass: 'bg-white shadow-xs',
    borderClass: 'border-slate-200',
    accentClass: 'bg-[#9333EA] hover:bg-[#7e22ce] text-white font-bold shadow-xs',
    accentTextClass: 'text-purple-700 font-bold',
    previewColors: ['#F2F1F8', '#FFFFFF', '#9333EA'],
  },
  {
    id: 'neon-pink',
    name: 'Neon Laser Magenta',
    category: 'light',
    description: 'Crisp greyish white backdrop with punchy solid neon hot-pink indicators for high visibility.',
    bgClass: 'bg-[#F5F2F4] text-zinc-900',
    cardBgClass: 'bg-white shadow-xs',
    borderClass: 'border-zinc-200',
    accentClass: 'bg-[#FF007F] hover:bg-[#e00070] text-white font-bold shadow-xs',
    accentTextClass: 'text-pink-700 font-bold',
    previewColors: ['#F5F2F4', '#FFFFFF', '#FF007F'],
  },
  {
    id: 'neon-orange',
    name: 'Blaze Neon Tangerine',
    category: 'light',
    description: 'Vibrant neon tangerine on chalk grey-white surfaces for instant action visibility.',
    bgClass: 'bg-[#F6F3F0] text-neutral-900',
    cardBgClass: 'bg-white shadow-xs',
    borderClass: 'border-neutral-200',
    accentClass: 'bg-[#FF6600] hover:bg-[#e65c00] text-white font-bold shadow-xs',
    accentTextClass: 'text-orange-700 font-bold',
    previewColors: ['#F6F3F0', '#FFFFFF', '#FF6600'],
  },
  {
    id: 'neon-cobalt',
    name: 'Punchy Cobalt Blue',
    category: 'light',
    description: 'Clean enterprise grey-white balanced with saturated punchy electric cobalt blue.',
    bgClass: 'bg-[#EEF2F9] text-slate-900',
    cardBgClass: 'bg-white shadow-xs',
    borderClass: 'border-slate-200',
    accentClass: 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold shadow-xs',
    accentTextClass: 'text-blue-700 font-bold',
    previewColors: ['#EEF2F9', '#FFFFFF', '#2563EB'],
  },
  {
    id: 'neon-matrix-dark',
    name: 'Matrix Neon (Night Dock)',
    category: 'dark',
    description: 'High-contrast dark charcoal edition with the exact same solid neon accents for night shifts.',
    bgClass: 'bg-slate-950 text-slate-100',
    cardBgClass: 'bg-slate-900/95',
    borderClass: 'border-slate-800',
    accentClass: 'bg-[#00E676] hover:bg-[#00c864] text-slate-950 font-black shadow-xs',
    accentTextClass: 'text-[#00E676] font-bold',
    previewColors: ['#020617', '#0f172a', '#00E676'],
  },
];

const THEME_STORAGE_KEY = 'logitrack_active_theme_v2';

export function getSavedTheme(): string {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'neon-lime';
  } catch {
    return 'neon-lime';
  }
}

export function saveTheme(themeId: string): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch (e) {
    console.error('Failed to save theme preference', e);
  }
}
