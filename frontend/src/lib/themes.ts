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
    swatchBg: '#0F1117',
    swatchAccent: '#2DD4BF',
    vars: {
      '--bg':          '#0F1117',
      '--surface':     '#161B22',
      '--surface2':    '#1C2128',
      '--border':      '#30363D',
      '--accent':      '#2DD4BF',
      '--accent-dim':  'rgba(45,212,191,0.10)',
      '--accent2':     '#F97316',
      '--accent2-dim': 'rgba(249,115,22,0.10)',
      '--text':        '#E6EDF3',
      '--muted':       '#7D8590',
      '--muted2':      '#21262D',
      '--online':      '#3FB950',
      '--shadow':      '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)',
    },
  },
  {
    id: 'forest',
    label: 'Forest',
    swatchBg: '#0D1A0E',
    swatchAccent: '#A8E63D',
    vars: {
      '--bg':          '#0D1A0E',
      '--surface':     '#132115',
      '--surface2':    '#1A2B1C',
      '--border':      '#263D28',
      '--accent':      '#A8E63D',
      '--accent-dim':  'rgba(168,230,61,0.10)',
      '--accent2':     '#3ECFB2',
      '--accent2-dim': 'rgba(62,207,178,0.10)',
      '--text':        '#E4EDE4',
      '--muted':       '#6A7D6A',
      '--muted2':      '#1E301F',
      '--online':      '#4ADE80',
      '--shadow':      '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)',
    },
  },
  {
    id: 'amber',
    label: 'Amber',
    swatchBg: '#1A1205',
    swatchAccent: '#F0A500',
    vars: {
      '--bg':          '#1A1205',
      '--surface':     '#231A07',
      '--surface2':    '#2C220A',
      '--border':      '#3D300F',
      '--accent':      '#F0A500',
      '--accent-dim':  'rgba(240,165,0,0.10)',
      '--accent2':     '#E05C2A',
      '--accent2-dim': 'rgba(224,92,42,0.10)',
      '--text':        '#F0E6C8',
      '--muted':       '#7A6A40',
      '--muted2':      '#2C200A',
      '--online':      '#86EFAC',
      '--shadow':      '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)',
    },
  },
  {
    id: 'contrast',
    label: 'High Contrast',
    swatchBg: '#000000',
    swatchAccent: '#00FFCC',
    vars: {
      '--bg':          '#000000',
      '--surface':     '#0A0A0A',
      '--surface2':    '#141414',
      '--border':      '#333333',
      '--accent':      '#00FFCC',
      '--accent-dim':  'rgba(0,255,204,0.12)',
      '--accent2':     '#FF6B00',
      '--accent2-dim': 'rgba(255,107,0,0.12)',
      '--text':        '#FFFFFF',
      '--muted':       '#888888',
      '--muted2':      '#1A1A1A',
      '--online':      '#00FF88',
      '--shadow':      '0 1px 3px rgba(0,0,0,0.8)',
    },
  },
  {
    id: 'soft',
    label: 'Soft Light',
    swatchBg: '#F0FDFA',
    swatchAccent: '#0D9488',
    vars: {
      '--bg':          '#F0FDFA',
      '--surface':     '#FFFFFF',
      '--surface2':    '#E6FAF7',
      '--border':      '#99F6E4',
      '--accent':      '#0D9488',
      '--accent-dim':  'rgba(13,148,136,0.10)',
      '--accent2':     '#EA580C',
      '--accent2-dim': 'rgba(234,88,12,0.10)',
      '--text':        '#134E4A',
      '--muted':       '#5EADA4',
      '--muted2':      '#CCFBF1',
      '--online':      '#16A34A',
      '--shadow':      '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)',
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
  localStorage.setItem('lt-theme-v3', id);
}

export function loadSavedTheme(): ThemeId {
  return (localStorage.getItem('lt-theme-v3') as ThemeId) ?? 'default';
}
