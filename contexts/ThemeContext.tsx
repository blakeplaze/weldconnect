import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Theme, ThemeMode, lightTheme, darkTheme } from '../constants/theme';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, [session?.user.id]);

  const loadThemePreference = async () => {
    try {
      if (session?.user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('theme_preference')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!error && data?.theme_preference) {
          setThemeModeState(data.theme_preference as ThemeMode);
        } else {
          setThemeModeState((systemColorScheme as ThemeMode) || 'light');
        }
      } else {
        setThemeModeState((systemColorScheme as ThemeMode) || 'light');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
      setThemeModeState('light');
    } finally {
      setIsLoading(false);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);

    if (session?.user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ theme_preference: mode })
          .eq('id', session.user.id);

        if (error) {
          console.error('Error saving theme preference:', error);
        }
      } catch (error) {
        console.error('Error saving theme preference:', error);
      }
    }
  };

  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
