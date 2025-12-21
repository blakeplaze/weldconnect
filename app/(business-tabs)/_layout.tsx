import { Tabs, Redirect } from 'expo-router';
import { Briefcase, DollarSign, List, User, MessageCircle, HelpCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function BusinessTabLayout() {
  const { session, loading } = useAuth();
  const { theme } = useTheme();

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBarBackground,
        },
        tabBarActiveTintColor: theme.colors.tabBarActiveTint,
        tabBarInactiveTintColor: theme.colors.tabBarInactiveTint,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Available Jobs',
          tabBarIcon: ({ size, color }) => (
            <Briefcase size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-bids"
        options={{
          title: 'My Bids',
          tabBarIcon: ({ size, color }) => (
            <DollarSign size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="won-jobs"
        options={{
          title: 'Won Jobs',
          tabBarIcon: ({ size, color }) => <List size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ size, color }) => <MessageCircle size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          title: 'Help',
          tabBarIcon: ({ size, color }) => <HelpCircle size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
