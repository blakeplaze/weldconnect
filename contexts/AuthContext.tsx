import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { Platform } from 'react-native';

interface UserProfile {
  id: string;
  full_name: string;
  phone: string | null;
  user_type: 'customer' | 'business';
  last_job_posted_at: string | null;
  profile_picture_url: string | null;
  rating?: number;
  completed_jobs?: number;
}

interface AuthContextType {
  session: any | null;
  loading: boolean;
  userProfile: UserProfile | null;
  signUp: (email: string, password: string, fullName: string, userType: 'customer' | 'business', phone?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfilePicture: (imageUri: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      try {
        if (Platform.OS === 'web') {
          const savedUser = localStorage.getItem('weldconnect_user');
          if (savedUser) {
            const profile = JSON.parse(savedUser);
            setSession({ user: { id: profile.id } });
            setUserProfile(profile);
          }
        } else {
          const savedUser = await SecureStore.getItemAsync('weldconnect_user');
          if (savedUser) {
            const profile = JSON.parse(savedUser);
            setSession({ user: { id: profile.id } });
            setUserProfile(profile);
          }
        }
      } catch (e) {
        console.error('Failed to load mock session', e);
      } finally {
        setLoading(false);
        await SplashScreen.hideAsync().catch(() => {});
      }
    }
    initAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    const mockProfile: UserProfile = {
      id: 'mock-123',
      full_name: 'Test Welder',
      phone: '555-0199',
      user_type: 'business',
      last_job_posted_at: null,
      profile_picture_url: null,
    };

    setSession({ user: { id: mockProfile.id } });
    setUserProfile(mockProfile);

    if (Platform.OS === 'web') {
      localStorage.setItem('weldconnect_user', JSON.stringify(mockProfile));
    } else {
      await SecureStore.setItemAsync('weldconnect_user', JSON.stringify(mockProfile));
    }

    router.replace('/(business-tabs)');
  };

  const signUp = async (email: string, password: string, fullName: string, userType: 'customer' | 'business', phone?: string) => {
    const mockProfile: UserProfile = {
      id: Math.random().toString(36).substr(2, 9),
      full_name: fullName,
      phone: phone || null,
      user_type: userType,
      last_job_posted_at: null,
      profile_picture_url: null,
    };

    setSession({ user: { id: mockProfile.id } });
    setUserProfile(mockProfile);

    if (Platform.OS === 'web') {
      localStorage.setItem('weldconnect_user', JSON.stringify(mockProfile));
    } else {
      await SecureStore.setItemAsync('weldconnect_user', JSON.stringify(mockProfile));
    }

    if (userType === 'business') {
      router.replace('/(business-tabs)');
    } else {
      router.replace('/(customer-tabs)');
    }
  };

  const signOut = async () => {
    setSession(null);
    setUserProfile(null);

    if (Platform.OS === 'web') {
      localStorage.removeItem('weldconnect_user');
    } else {
      await SecureStore.deleteItemAsync('weldconnect_user');
    }

    router.replace('/auth/login');
  };

  const refreshProfile = async () => {
    if (!userProfile) return;

    try {
      if (Platform.OS === 'web') {
        const savedUser = localStorage.getItem('weldconnect_user');
        if (savedUser) {
          const profile = JSON.parse(savedUser);
          setUserProfile(profile);
        }
      } else {
        const savedUser = await SecureStore.getItemAsync('weldconnect_user');
        if (savedUser) {
          const profile = JSON.parse(savedUser);
          setUserProfile(profile);
        }
      }
    } catch (error) {
      console.error('Failed to refresh profile', error);
    }
  };

  const updateProfilePicture = async (imageUri: string) => {
    if (!userProfile) return;

    const updatedProfile = {
      ...userProfile,
      profile_picture_url: imageUri,
    };

    setUserProfile(updatedProfile);

    try {
      if (Platform.OS === 'web') {
        localStorage.setItem('weldconnect_user', JSON.stringify(updatedProfile));
      } else {
        await SecureStore.setItemAsync('weldconnect_user', JSON.stringify(updatedProfile));
      }
    } catch (error) {
      console.error('Failed to update profile picture', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        userProfile,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        updateProfilePicture,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
