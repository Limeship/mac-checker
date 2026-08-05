export type ThemeId = 'forest' | 'slate' | 'amber' | 'contrast' | 'soft';

export interface Theme {
  id: ThemeId;
  label: string;
  swatch: string; // preview color for the picker
  vars: Record<string, string>;
}

export const themes: Theme[] = [
  {
    id: 'forest',
    label: 'Forest',
    swatch: '#A8E63D',
    vars: {
      '--bg':        '#0D0F0D',
      '--surface':   '#141A14',
      '--surface2':  '#1C241C',
      '--border':    '#263026',
      '--accent':    '#A8E63D',
      '--accent-dim':'rgba(168,230,61,0.13)',
      '--accent2':   '#3ECFB2',
      '--accent2-dim':'rgba(62,207,178,0.11)',
      '--text':      '#E4EDE4',
      '--muted':     '#6A7D6A',
      '--muted2':    '#3A4A3A',
      '--online':    '#4ADE80',
      '--shadow':    '0 6px 24px rgba(0,0,0,0.5)',
    },
  },
  {
    id: 'slate',
    label: 'Slate',
    swatch: '#7DD3FC',
    vars: {
      '--bg':        '#0C0E12',
      '--surface':   '#13161D',
      '--surface2':  '#1A1F2B',
      '--border':    '#252C3A',
      '--accent':    '#7DD3FC',
      '--accent-dim':'rgba(125,211,252,0.13)',
      '--accent2':   '#A78BFA',
      '--accent2-dim':'rgba(167,139,250,0.12)',
      '--text':      '#E2E8F4',
      '--muted':     '#607080',
      '--muted2':    '#2E3848',
      '--online':    '#34D399',
      '--shadow':    '0 6px 24px rgba(0,0,0,0.5)',
    },
  },
  {
    id: 'amber',
    label: 'Amber',
    swatch: '#F0A500',
    vars: {
      '--bg':        '#0F0D08',
      '--surface':   '#181408',
      '--surface2':  '#221C0C',
      '--border':    '#302610',
      '--accent':    '#F0A500',
      '--accent-dim':'rgba(240,165,0,0.14)',
      '--accent2':   '#E05C2A',
      '--accent2-dim':'rgba(224,92,42,0.12)',
      '--text':      '#F0E6C8',
      '--muted':     '#7A6A40',
      '--muted2':    '#3A2E10',
      '--online':    '#86EFAC',
      '--shadow':    '0 6px 24px rgba(0,0,0,0.6)',
    },
  },
  {
    id: 'contrast',
    label: 'High Contrast',
    swatch: '#FFFFFF',
    vars: {
      '--bg':        '#000000',
      '--surface':   '#0A0A0A',
      '--surface2':  '#141414',
      '--border':    '#333333',
      '--accent':    '#A8E63D',
      '--accent-dim':'rgba(168,230,61,0.15)',
      '--accent2':   '#00FFCC',
      '--accent2-dim':'rgba(0,255,204,0.12)',
      '--text':      '#FFFFFF',
      '--muted':     '#888888',
      '--muted2':    '#333333',
      '--online':    '#00FF88',
      '--shadow':    '0 6px 24px rgba(0,0,0,0.8)',
    },
  },
  {
    id: 'soft',
    label: 'Soft Light',
    swatch: '#5A9A00',
    vars: {
      '--bg':        '#F5F7F2',
      '--surface':   '#FFFFFF',
      '--surface2':  '#EEF2EA',
      '--border':    '#D4DFD0',
      '--accent':    '#5A9A00',
      '--accent-dim':'rgba(90,154,0,0.10)',
      '--accent2':   '#1A9B85',
      '--accent2-dim':'rgba(26,155,133,0.10)',
      '--text':      '#1A2A1A',
      '--muted':     '#6A806A',
      '--muted2':    '#B8CCB4',
      '--online':    '#22A84A',
      '--shadow':    '0 4px 16px rgba(0,0,0,0.10)',
    },
  },
];

export function applyTheme(id: ThemeId) {
  const theme = themes.find(t => t.id === id);
  if (!theme) return;
  const root = document.documentElement;
  for (const [key, val] of Object.entries(theme.vars)) {
    root.style.setProperty(key, val);
  }
  root.setAttribute('data-theme', id === 'soft' ? 'light' : 'dark');
  localStorage.setItem('lt-theme', id);
}

export function loadSavedTheme(): ThemeId {
  return (localStorage.getItem('lt-theme') as ThemeId) ?? 'forest';
}
