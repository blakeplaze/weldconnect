import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

export default function Index() {
  const { session, loading, userProfile } = useAuth();

  console.log('Index: Session:', !!session, 'Loading:', loading, 'UserType:', userProfile?.user_type);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!session) {
    console.log('Index: No session, redirecting to login');
    return <Redirect href="/auth/login" />;
  }

  if (!userProfile) {
    console.log('Index: No user profile yet, showing loading');
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16 }}>Loading profile...</Text>
      </View>
    );
  }

  if (userProfile.user_type === 'business') {
    console.log('Index: Redirecting to business tabs');
    return <Redirect href="/(business-tabs)" />;
  }

  console.log('Index: Redirecting to customer tabs');
  return <Redirect href="/(customer-tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
