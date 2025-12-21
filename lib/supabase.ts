import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');

  throw new Error(
    `Missing required Supabase environment variables: ${missingVars.join(', ')}\n` +
    `Please set these in your .env file or app.json extra section.`
  );
}

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T | null> => {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => {
      console.warn('SecureStore operation timed out');
      resolve(null);
    }, timeoutMs))
  ]);
};

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage === 'undefined') {
          return null;
        }
        return localStorage.getItem(key);
      }
      console.log(`SecureStore: Getting item ${key}`);
      const result = await withTimeout(SecureStore.getItemAsync(key));
      console.log(`SecureStore: Got item ${key}:`, result ? 'exists' : 'null');
      return result;
    } catch (error) {
      console.error(`SecureStore: Error getting item ${key}:`, error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
        return;
      }
      await withTimeout(SecureStore.setItemAsync(key, value));
    } catch (error) {
      console.error('Error setting item in secure store:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
        return;
      }
      await withTimeout(SecureStore.deleteItemAsync(key));
    } catch (error) {
      console.error('Error removing item from secure store:', error);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
