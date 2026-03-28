export type ThemeName = 'dark' | 'light' | 'high-contrast' | 'aseprite';

export interface ThemeVars {
  '--bg-primary': string;
  '--bg-secondary': string;
  '--bg-tertiary': string;
  '--bg-sidebar': string;
  '--bg-input': string;
  '--bg-elevated': string;
  '--text-primary': string;
  '--text-secondary': string;
  '--text-muted': string;
  '--accent': string;
  '--accent-dim': string;
  '--accent-hover': string;
  '--accent-subtle': string;
  '--border': string;
  '--hover': string;
  '--active': string;
  '--danger': string;
  '--shadow-sm': string;
  '--shadow-md': string;
  '--shadow-lg': string;
  '--focus-ring': string;
}

export const THEMES: Record<ThemeName, ThemeVars> = {
  dark: {
    '--bg-primary': '#1a1a2e',
    '--bg-secondary': '#16213e',
    '--bg-tertiary': '#0f3460',
    '--bg-sidebar': '#12122a',
    '--bg-input': '#13132a',
    '--bg-elevated': '#1e1e3a',
    '--text-primary': '#e0e0e0',
    '--text-secondary': '#a0a0a0',
    '--text-muted': '#666',
    '--accent': '#4fc3f7',
    '--accent-dim': '#0288d1',
    '--accent-hover': '#81d4fa',
    '--accent-subtle': 'rgba(79,195,247,0.08)',
    '--border': '#2a2a4a',
    '--hover': '#252545',
    '--active': '#303060',
    '--danger': '#e84040',
    '--shadow-sm': '0 1px 2px rgba(0,0,0,0.3)',
    '--shadow-md': '0 4px 12px rgba(0,0,0,0.4)',
    '--shadow-lg': '0 8px 32px rgba(0,0,0,0.5)',
    '--focus-ring': '0 0 0 2px rgba(79,195,247,0.5)',
  },
  light: {
    '--bg-primary': '#f0f0f0',
    '--bg-secondary': '#ffffff',
    '--bg-tertiary': '#e0e8f0',
    '--bg-sidebar': '#e4e4e4',
    '--bg-input': '#ffffff',
    '--bg-elevated': '#ffffff',
    '--text-primary': '#1a1a1a',
    '--text-secondary': '#555',
    '--text-muted': '#999',
    '--accent': '#0277bd',
    '--accent-dim': '#01579b',
    '--accent-hover': '#0288d1',
    '--accent-subtle': 'rgba(2,119,189,0.06)',
    '--border': '#d0d0d0',
    '--hover': '#e8e8e8',
    '--active': '#d0d8e8',
    '--danger': '#d32f2f',
    '--shadow-sm': '0 1px 3px rgba(0,0,0,0.08)',
    '--shadow-md': '0 4px 12px rgba(0,0,0,0.12)',
    '--shadow-lg': '0 8px 32px rgba(0,0,0,0.16)',
    '--focus-ring': '0 0 0 2px rgba(2,119,189,0.4)',
  },
  'high-contrast': {
    '--bg-primary': '#000000',
    '--bg-secondary': '#111111',
    '--bg-tertiary': '#222222',
    '--bg-sidebar': '#0a0a0a',
    '--bg-input': '#0a0a0a',
    '--bg-elevated': '#1a1a1a',
    '--text-primary': '#ffffff',
    '--text-secondary': '#cccccc',
    '--text-muted': '#888888',
    '--accent': '#00e5ff',
    '--accent-dim': '#00b8d4',
    '--accent-hover': '#18ffff',
    '--accent-subtle': 'rgba(0,229,255,0.1)',
    '--border': '#444444',
    '--hover': '#222222',
    '--active': '#333333',
    '--danger': '#ff0000',
    '--shadow-sm': 'none',
    '--shadow-md': 'none',
    '--shadow-lg': '0 0 0 1px #444',
    '--focus-ring': '0 0 0 2px #00e5ff',
  },
  aseprite: {
    '--bg-primary': '#585858',
    '--bg-secondary': '#484848',
    '--bg-tertiary': '#3a3a3a',
    '--bg-sidebar': '#505050',
    '--bg-input': '#404040',
    '--bg-elevated': '#5a5a5a',
    '--text-primary': '#ffffff',
    '--text-secondary': '#d0d0d0',
    '--text-muted': '#909090',
    '--accent': '#aca5a0',
    '--accent-dim': '#8a8480',
    '--accent-hover': '#c0b8b2',
    '--accent-subtle': 'rgba(172,165,160,0.1)',
    '--border': '#6a6a6a',
    '--hover': '#626262',
    '--active': '#6e6e6e',
    '--danger': '#c04040',
    '--shadow-sm': '0 1px 2px rgba(0,0,0,0.3)',
    '--shadow-md': '0 4px 8px rgba(0,0,0,0.35)',
    '--shadow-lg': '0 8px 24px rgba(0,0,0,0.4)',
    '--focus-ring': '0 0 0 2px rgba(172,165,160,0.5)',
  },
};

export const THEME_LABELS: Record<ThemeName, string> = {
  dark: 'Dark',
  light: 'Light',
  'high-contrast': 'High Contrast',
  aseprite: 'Aseprite',
};
