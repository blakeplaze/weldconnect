import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
<<<<<<< HEAD
import { ErrorBoundary } from '@/components/ErrorBoundary';
=======
>>>>>>> 79fb8c9f9b70f413c4fced27192deaabf900ebd5

function RootLayoutContent() {
  useNotifications();

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/signup" />
        <Stack.Screen name="(customer-tabs)" />
        <Stack.Screen name="(business-tabs)" />
        <Stack.Screen name="job-details/[id]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="privacy-policy" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
<<<<<<< HEAD
    <ErrorBoundary>
      <AuthProvider>
        <RootLayoutContent />
      </AuthProvider>
    </ErrorBoundary>
=======
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
>>>>>>> 79fb8c9f9b70f413c4fced27192deaabf900ebd5
  );
}
