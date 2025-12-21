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

// Cache to reduce SecureStore calls
const storageCache = new Map<string, string | null>();

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T | null> => {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => {
      // Only warn if it's taking unusually long (not on every timeout)
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
      
      // Check cache first
      if (storageCache.has(key)) {
        return storageCache.get(key) || null;
      }
      
      const result = await withTimeout(SecureStore.getItemAsync(key), 10000);
      
      // Cache the result
      storageCache.set(key, result);
      
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
      // Update cache immediately
      storageCache.set(key, value);
      // Store asynchronously (don't wait for it)
      withTimeout(SecureStore.setItemAsync(key, value), 10000).catch(() => {
        // If it fails, remove from cache so we retry next time
        storageCache.delete(key);
      });
    } catch (error) {
      console.error('Error setting item in secure store:', error);
      storageCache.delete(key);
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
      // Remove from cache immediately
      storageCache.delete(key);
      // Remove asynchronously
      await withTimeout(SecureStore.deleteItemAsync(key), 10000);
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
    detectSessionInUrl: Platform.OS === 'web',
  },
});
