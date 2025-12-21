import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/hooks/useNotifications';
import { ErrorBoundary } from '@/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutContent() {
  const { themeMode } = useTheme();
  useNotifications();

  // Safety timeout: ensure splash screen is always hidden after 5 seconds (aggressive for first launch)
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      console.warn('RootLayout: Safety timeout - forcing splash screen to hide');
      SplashScreen.hideAsync().catch(() => {});
    }, 5000); // Reduced from 20s to 5s for faster first launch experience

    return () => clearTimeout(safetyTimeout);
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/signup" />
        <Stack.Screen name="auth/forgot-password" />
        <Stack.Screen name="auth/reset-password" />
        <Stack.Screen name="(customer-tabs)" />
        <Stack.Screen name="(business-tabs)" />
        <Stack.Screen name="job-details/[id]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="privacy-policy" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <RootLayoutContent />
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
