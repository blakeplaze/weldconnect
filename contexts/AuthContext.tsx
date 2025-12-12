import { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { registerForPushNotificationsAsync, savePushToken } from '@/lib/notifications';

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  userProfile: UserProfile | null;
  signUp: (email: string, password: string, fullName: string, userType: 'customer' | 'business', phone?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

interface UserProfile {
  id: string;
  full_name: string;
  phone: string | null;
  user_type: 'customer' | 'business';
  last_job_posted_at: string | null;
  profile_picture_url: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(session);
        if (session) {
          await loadUserProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      setSession(session);
      if (session) {
        await loadUserProfile(session.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('Loading profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      console.log('Profile data:', data);
      console.log('Profile error:', error);

      if (error) {
        console.error('Profile query error:', error);
        throw error;
      }

      if (!data) {
        console.warn('No profile found for user:', userId);
      }

      setUserProfile(data);

      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) {
        await savePushToken(userId, pushToken);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (session?.user.id) {
      await loadUserProfile(session.user.id);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    userType: 'customer' | 'business',
    phone?: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName,
        phone: phone || null,
        user_type: userType,
      });

      if (profileError) throw profileError;

      await loadUserProfile(data.user.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signOut = async () => {
    console.log('SignOut: Starting sign out process');
    try {
      const { error } = await supabase.auth.signOut();
      if (error && error.message !== 'Auth session missing!') {
        console.error('SignOut: Supabase error:', error);
        throw error;
      }
      console.log('SignOut: Successfully signed out');
    } catch (err: any) {
      if (err.message === 'Auth session missing!' || err.name === 'AuthSessionMissingError') {
        console.log('SignOut: Session already cleared, proceeding');
        setSession(null);
        setUserProfile(null);
        return;
      }
      console.error('SignOut: Caught error:', err);
      throw err;
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
