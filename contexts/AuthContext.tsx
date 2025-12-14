import { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { registerForPushNotificationsAsync, savePushToken } from '@/lib/notifications';
import { router } from 'expo-router';

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
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setLoading(false);
            setInitialized(true);
          }
          return;
        }

        setSession(session);
        if (session) {
          await loadUserProfile(session.user.id);
        } else {
          setLoading(false);
        }
        setInitialized(true);
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    timeoutId = setTimeout(() => {
      if (mounted && loading && !initialized) {
        console.error('Auth initialization timeout - forcing loading to false');
        setLoading(false);
        setInitialized(true);
      }
    }, 10000);

    initAuth();

    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted || !initialized) return;

        console.log('Auth state changed:', _event, 'session:', !!session);

        if (_event === 'SIGNED_OUT' || _event === 'USER_DELETED') {
          setSession(null);
          setUserProfile(null);
          setLoading(false);
          return;
        }

        if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED') {
          setSession(session);
          if (session?.user?.id) {
            (async () => {
              try {
                await loadUserProfile(session.user.id);
              } catch (error) {
                console.error('Error loading profile in auth state change:', error);
              }
            })();
          }
        }
      });
      subscription = data;
    } catch (error) {
      console.error('Error setting up auth state change listener:', error);
    }

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from auth state change:', error);
        }
      }
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

      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          await savePushToken(userId, pushToken);
        }
      } catch (notifError) {
        console.error('Error registering push notifications:', notifError);
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
    console.log('AuthContext: signIn called');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('AuthContext: signIn error:', error);
      throw error;
    }

    console.log('AuthContext: signIn successful, user:', data.user?.id);

    if (data.session) {
      console.log('AuthContext: Setting session from signIn');
      setSession(data.session);
      await loadUserProfile(data.user.id);
    }
  };

  const signOut = async () => {
    console.log('SignOut: Starting sign out process');
    try {
      console.log('SignOut: Calling supabase.auth.signOut()');
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('SignOut: Supabase signOut returned error:', error);
        if (error.message !== 'Auth session missing!') {
          throw error;
        }
        console.log('SignOut: Auth session missing, but thats ok');
      }

      console.log('SignOut: Clearing local state');
      setSession(null);
      setUserProfile(null);

      console.log('SignOut: Redirecting to login');
      router.replace('/auth/login');

      console.log('SignOut: Successfully completed');
    } catch (err: any) {
      console.error('SignOut: Exception caught:', err);
      if (err.message === 'Auth session missing!' || err.name === 'AuthSessionMissingError') {
        console.log('SignOut: Session already cleared');
        setSession(null);
        setUserProfile(null);
        router.replace('/auth/login');
        return;
      }
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
