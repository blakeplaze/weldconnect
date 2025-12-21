import { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '@/lib/supabase';
import { registerForPushNotificationsAsync, savePushToken } from '@/lib/notifications';
import { router } from 'expo-router';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  userProfile: UserProfile | null;
  signUp: (email: string, password: string, fullName: string, userType: 'customer' | 'business', phone?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (userType: 'customer' | 'business') => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  markWalkthroughComplete: () => Promise<void>;
}

interface UserProfile {
  id: string;
  full_name: string;
  phone: string | null;
  user_type: 'customer' | 'business';
  last_job_posted_at: string | null;
  profile_picture_url: string | null;
  has_completed_walkthrough: boolean;
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
        console.log('AuthContext: Starting auth initialization');
        
        // Immediately hide splash screen if this takes too long (aggressive timeout for first launch)
        const quickTimeout = setTimeout(() => {
          if (mounted) {
            console.warn('AuthContext: Quick timeout - hiding splash screen early');
            SplashScreen.hideAsync().catch(() => {});
          }
        }, 3000); // Hide splash after 3 seconds even if auth isn't done
        
        // Add timeout wrapper for getSession to prevent hanging
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('getSession timeout')), 5000) // Reduced from 8s to 5s
        );
        
        let sessionResult;
        try {
          sessionResult = await Promise.race([sessionPromise, timeoutPromise]) as any;
          clearTimeout(quickTimeout);
        } catch (timeoutError) {
          clearTimeout(quickTimeout);
          console.error('AuthContext: getSession timed out or failed:', timeoutError);
          if (mounted) {
            setLoading(false);
            setInitialized(true);
            // Force hide splash screen immediately on timeout
            await SplashScreen.hideAsync().catch(() => {});
          }
          return;
        }
        
        const { data: { session }, error } = sessionResult;
        console.log('AuthContext: getSession completed', { hasSession: !!session, hasError: !!error });

        if (!mounted) return;

        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setLoading(false);
            setInitialized(true);
            // Force hide splash screen on error
            await SplashScreen.hideAsync().catch(() => {});
          }
          return;
        }

        setSession(session);
        if (session) {
          console.log('AuthContext: Session found, loading profile');
          try {
            await loadUserProfile(session.user.id);
          } catch (profileError) {
            console.error('AuthContext: Error loading profile, continuing anyway:', profileError);
            // Continue even if profile loading fails
            if (mounted) {
              setLoading(false);
              // Force hide splash screen on profile error
              await SplashScreen.hideAsync().catch(() => {});
            }
          }
        } else {
          console.log('AuthContext: No session, showing login');
          if (mounted) {
            setLoading(false);
            // Force hide splash screen when no session
            await SplashScreen.hideAsync().catch(() => {});
          }
        }
        if (mounted) {
          setInitialized(true);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
          setInitialized(true);
          // Force hide splash screen on any error
          await SplashScreen.hideAsync().catch(() => {});
        }
      }
    };

    timeoutId = setTimeout(() => {
      if (mounted && loading && !initialized) {
        console.warn('Auth initialization taking longer than expected - forcing loading to false');
        setLoading(false);
        setInitialized(true);
        // Force hide splash screen on final timeout
        SplashScreen.hideAsync().catch(() => {});
      }
    }, 10000); // Reduced from 15s to 10s

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
                const { data: existingProfile } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', session.user.id)
                  .maybeSingle();

                if (!existingProfile && Platform.OS === 'web' && typeof window !== 'undefined') {
                  const pendingUserType = localStorage.getItem('pendingUserType') as 'customer' | 'business' | null;

                  if (pendingUserType) {
                    console.log('AuthContext: Creating profile for OAuth user with type:', pendingUserType);
                    const fullName = session.user.user_metadata?.full_name ||
                                   session.user.user_metadata?.name ||
                                   session.user.email?.split('@')[0] ||
                                   'User';

                    await supabase.from('profiles').insert({
                      id: session.user.id,
                      full_name: fullName,
                      phone: null,
                      user_type: pendingUserType,
                    });

                    localStorage.removeItem('pendingUserType');
                  }
                }

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
      
      // Add timeout to profile loading to prevent hanging
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile query timeout')), 10000)
      );
      
      let profileResult;
      try {
        profileResult = await Promise.race([profilePromise, timeoutPromise]) as any;
      } catch (timeoutError) {
        console.error('Profile query timed out:', timeoutError);
        // Set loading to false even on timeout
        setLoading(false);
        SplashScreen.hideAsync().catch(() => {});
        throw timeoutError;
      }

      const { data, error } = profileResult;

      console.log('Profile data:', data);
      console.log('Profile error:', error);

      if (error) {
        console.error('Profile query error:', error);
        // Don't throw - allow app to continue without profile
        setUserProfile(null);
        setLoading(false);
        SplashScreen.hideAsync().catch(() => {});
        return;
      }

      if (!data) {
        console.warn('No profile found for user:', userId);
        setUserProfile(null);
      } else {
        setUserProfile(data);
      }

      // Register push notifications in background (don't wait for it)
      (async () => {
        try {
          const pushToken = await registerForPushNotificationsAsync();
          if (pushToken) {
            await savePushToken(userId, pushToken);
          }
        } catch (notifError) {
          console.error('Error registering push notifications:', notifError);
          // Don't block app initialization for notification errors
        }
      })();
      
      setLoading(false);
      SplashScreen.hideAsync().catch(() => {});
    } catch (error) {
      console.error('Error loading profile:', error);
      // Ensure loading is set to false and splash screen is hidden even on error
      setLoading(false);
      SplashScreen.hideAsync().catch(() => {});
      // Re-throw so caller can handle it
      throw error;
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

  const signInWithGoogle = async (userType: 'customer' | 'business') => {
    console.log('AuthContext: signInWithGoogle called for', userType);

    try {
      if (Platform.OS === 'web') {
        console.log('AuthContext: Using web OAuth flow');

        if (typeof window !== 'undefined') {
          localStorage.setItem('pendingUserType', userType);
        }

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            skipBrowserRedirect: false,
          },
        });

        if (error) {
          console.error('AuthContext: OAuth error:', error);
          throw new Error(error.message || 'Failed to initialize Google sign-in');
        }

        return;
      }

      console.log('AuthContext: Using mobile OAuth flow');
      const redirectTo = 'myapp://';

      console.log('AuthContext: Requesting OAuth URL from Supabase');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('AuthContext: OAuth URL request error:', error);
        throw new Error(error.message || 'Failed to initialize Google sign-in');
      }

      if (!data?.url) {
        console.error('AuthContext: No OAuth URL returned from Supabase');
        throw new Error('Google sign-in is not configured. Please enable Google OAuth in Supabase dashboard.');
      }

      console.log('AuthContext: Opening browser for OAuth');
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo
      );

      console.log('AuthContext: Browser result:', result.type);

      if (result.type === 'success') {
        const { url } = result;
        console.log('AuthContext: Parsing OAuth callback URL');

        const hashParams = url.split('#')[1];
        if (!hashParams) {
          throw new Error('No authentication data received from Google');
        }

        const params = new URLSearchParams(hashParams);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (!accessToken || !refreshToken) {
          throw new Error('Invalid authentication response from Google');
        }

        console.log('AuthContext: Setting session with tokens');
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) throw sessionError;

        if (sessionData.user) {
          console.log('AuthContext: Checking for existing profile');
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sessionData.user.id)
            .maybeSingle();

          if (!existingProfile) {
            console.log('AuthContext: Creating new profile');
            const fullName = sessionData.user.user_metadata?.full_name ||
                           sessionData.user.user_metadata?.name ||
                           sessionData.user.email?.split('@')[0] ||
                           'User';

            const { error: profileError } = await supabase.from('profiles').insert({
              id: sessionData.user.id,
              full_name: fullName,
              phone: null,
              user_type: userType,
            });

            if (profileError) throw profileError;
          }

          console.log('AuthContext: Loading user profile');
          setSession(sessionData.session);
          await loadUserProfile(sessionData.user.id);
          console.log('AuthContext: Google sign-in complete');
        }
      } else if (result.type === 'cancel') {
        console.log('AuthContext: User cancelled sign-in');
        throw new Error('Sign in was cancelled');
      } else {
        console.error('AuthContext: Unexpected browser result:', result);
        throw new Error('Failed to complete sign-in');
      }
    } catch (err) {
      console.error('AuthContext: signInWithGoogle error:', err);
      throw err;
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

  const markWalkthroughComplete = async () => {
    if (!session?.user.id) return;

    const { error } = await supabase
      .from('profiles')
      .update({ has_completed_walkthrough: true })
      .eq('id', session.user.id);

    if (error) {
      console.error('Error marking walkthrough complete:', error);
      throw error;
    }

    await refreshProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        userProfile,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        refreshProfile,
        markWalkthroughComplete,
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
