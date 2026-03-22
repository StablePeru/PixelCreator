export type ThemeName = 'dark' | 'light' | 'high-contrast' | 'aseprite';

export interface ThemeVars {
  '--bg-primary': string;
  '--bg-secondary': string;
  '--bg-tertiary': string;
  '--bg-sidebar': string;
  '--text-primary': string;
  '--text-secondary': string;
  '--text-muted': string;
  '--accent': string;
  '--accent-dim': string;
  '--border': string;
  '--hover': string;
  '--active': string;
  '--danger': string;
}

export const THEMES: Record<ThemeName, ThemeVars> = {
  dark: {
    '--bg-primary': '#1a1a2e',
    '--bg-secondary': '#16213e',
    '--bg-tertiary': '#0f3460',
    '--bg-sidebar': '#12122a',
    '--text-primary': '#e0e0e0',
    '--text-secondary': '#a0a0a0',
    '--text-muted': '#666',
    '--accent': '#6ebe3a',
    '--accent-dim': '#4a8c28',
    '--border': '#2a2a4a',
    '--hover': '#252545',
    '--active': '#303060',
    '--danger': '#e84040',
  },
  light: {
    '--bg-primary': '#f0f0f0',
    '--bg-secondary': '#ffffff',
    '--bg-tertiary': '#e0e8f0',
    '--bg-sidebar': '#e4e4e4',
    '--text-primary': '#1a1a1a',
    '--text-secondary': '#555',
    '--text-muted': '#999',
    '--accent': '#2d8a1e',
    '--accent-dim': '#1d6a10',
    '--border': '#ccc',
    '--hover': '#e8e8e8',
    '--active': '#d0d0e0',
    '--danger': '#d32f2f',
  },
  'high-contrast': {
    '--bg-primary': '#000000',
    '--bg-secondary': '#111111',
    '--bg-tertiary': '#222222',
    '--bg-sidebar': '#0a0a0a',
    '--text-primary': '#ffffff',
    '--text-secondary': '#cccccc',
    '--text-muted': '#888888',
    '--accent': '#00ff00',
    '--accent-dim': '#00aa00',
    '--border': '#444444',
    '--hover': '#222222',
    '--active': '#333333',
    '--danger': '#ff0000',
  },
  aseprite: {
    '--bg-primary': '#585858',
    '--bg-secondary': '#484848',
    '--bg-tertiary': '#3a3a3a',
    '--bg-sidebar': '#505050',
    '--text-primary': '#ffffff',
    '--text-secondary': '#d0d0d0',
    '--text-muted': '#909090',
    '--accent': '#aca5a0',
    '--accent-dim': '#8a8480',
    '--border': '#6a6a6a',
    '--hover': '#626262',
    '--active': '#6e6e6e',
    '--danger': '#c04040',
  },
};

export const THEME_LABELS: Record<ThemeName, string> = {
  dark: 'Dark',
  light: 'Light',
  'high-contrast': 'High Contrast',
  aseprite: 'Aseprite',
};
