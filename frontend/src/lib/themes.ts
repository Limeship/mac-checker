export type ThemeId = 'default' | 'forest' | 'amber' | 'contrast' | 'soft';

export interface Theme {
  id: ThemeId;
  label: string;
  swatchBg: string;
  swatchAccent: string;
  vars: Record<string, string>;
}

export const themes: Theme[] = [
  {
    id: 'default',
    label: 'Default',
    swatchBg: '#0A0C10',
    swatchAccent: '#38BDF8',
    vars: {
      '--bg':        '#0A0C10',
      '--surface':   '#0F1318',
      '--surface2':  '#161C24',
      '--border':    '#1E2A36',
      '--accent':    '#38BDF8',
      '--accent-dim':'rgba(56,189,248,0.12)',
      '--accent2':   '#818CF8',
      '--accent2-dim':'rgba(129,140,248,0.11)',
      '--text':      '#C8D4E0',
      '--muted':     '#3D5060',
      '--muted2':    '#1E2A36',
      '--online':    '#34D399',
      '--shadow':    '0 8px 32px rgba(0,0,0,0.6)',
    },
  },
  {
    id: 'forest',
    label: 'Forest',
    swatchBg: '#0D0F0D',
    swatchAccent: '#A8E63D',
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
    id: 'amber',
    label: 'Amber',
    swatchBg: '#0F0D08',
    swatchAccent: '#F0A500',
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
    swatchBg: '#000000',
    swatchAccent: '#A8E63D',
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
    swatchBg: '#F5F7F2',
    swatchAccent: '#5A9A00',
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
  localStorage.setItem('lt-theme-v2', id);
}

export function loadSavedTheme(): ThemeId {
  return (localStorage.getItem('lt-theme-v2') as ThemeId) ?? 'default';
}
