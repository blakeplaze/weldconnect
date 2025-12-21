import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleResetPassword = async () => {
    setError('');
    setSuccess(false);

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'exp://localhost:8081/--/auth/reset-password',
      });

      if (error) throw error;

      setSuccess(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/image.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>Reset Your Password</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>
              Password reset email sent! Check your inbox for instructions.
            </Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Text style={styles.description}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading && !success}
          />

          <TouchableOpacity
            style={[styles.button, (loading || success) && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading || success}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.linkText}>
              Back to Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: 'transparent',
  },
  logo: {
    width: 320,
    height: 80,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  form: {
    gap: 16,
  },
  description: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  input: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  linkText: {
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 8,
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    color: '#2e7d32',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
});
