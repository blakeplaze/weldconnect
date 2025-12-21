export type ThemeMode = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  colors: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    background: string;
    surface: string;
    surfaceLight: string;
    card: string;
    border: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    textPrimary: string;
    input: string;
    error: string;
    errorLight: string;
    success: string;
    successLight: string;
    warning: string;
    warningLight: string;
    info: string;
    infoLight: string;
    shadow: string;
    overlay: string;
    tabBarBackground: string;
    tabBarActiveTint: string;
    tabBarInactiveTint: string;
    inputBackground: string;
    inputBorder: string;
    placeholderText: string;
  };
}

export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    primary: '#2563eb',
    primaryLight: '#dbeafe',
    primaryDark: '#1e40af',
    background: '#f9fafb',
    surface: '#ffffff',
    surfaceLight: '#f3f4f6',
    card: '#ffffff',
    border: '#e5e7eb',
    text: '#111827',
    textSecondary: '#4b5563',
    textMuted: '#9ca3af',
    textPrimary: '#111827',
    input: '#ffffff',
    error: '#dc2626',
    errorLight: '#fee2e2',
    success: '#16a34a',
    successLight: '#dcfce7',
    warning: '#ea580c',
    warningLight: '#fed7aa',
    info: '#0891b2',
    infoLight: '#cffafe',
    shadow: 'rgba(0, 0, 0, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.5)',
    tabBarBackground: '#ffffff',
    tabBarActiveTint: '#2563eb',
    tabBarInactiveTint: '#9ca3af',
    inputBackground: '#ffffff',
    inputBorder: '#d1d5db',
    placeholderText: '#9ca3af',
  },
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    primary: '#3b82f6',
    primaryLight: '#1e3a8a',
    primaryDark: '#60a5fa',
    background: '#0f172a',
    surface: '#1e293b',
    surfaceLight: '#334155',
    card: '#1e293b',
    border: '#334155',
    text: '#f1f5f9',
    textSecondary: '#cbd5e1',
    textMuted: '#64748b',
    textPrimary: '#f1f5f9',
    input: '#1e293b',
    error: '#ef4444',
    errorLight: '#7f1d1d',
    success: '#22c55e',
    successLight: '#14532d',
    warning: '#f97316',
    warningLight: '#7c2d12',
    info: '#06b6d4',
    infoLight: '#164e63',
    shadow: 'rgba(0, 0, 0, 0.3)',
    overlay: 'rgba(0, 0, 0, 0.7)',
    tabBarBackground: '#1e293b',
    tabBarActiveTint: '#3b82f6',
    tabBarInactiveTint: '#64748b',
    inputBackground: '#1e293b',
    inputBorder: '#475569',
    placeholderText: '#64748b',
  },
};
