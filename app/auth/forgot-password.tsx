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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error] = useState('Password reset is not available in demo mode');
  const [success] = useState(false);
  const [loading] = useState(false);
  const { theme } = useTheme();
  const router = useRouter();

  const handleResetPassword = async () => {
    // Not implemented in demo mode
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.card }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Text style={[styles.logo, { color: theme.colors.primary }]}>WeldConnect</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Reset Your Password</Text>
        </View>

        {error ? <Text style={[styles.error, { backgroundColor: theme.colors.errorLight, color: theme.colors.error }]}>{error}</Text> : null}
        {success ? (
          <View style={[styles.successContainer, { backgroundColor: theme.colors.successLight }]}>
            <Text style={[styles.successText, { color: theme.colors.success }]}>
              Password reset email sent! Check your inbox for instructions.
            </Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>

          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
            placeholder="Email"
            placeholderTextColor={theme.colors.placeholderText}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading && !success}
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }, (loading || success) && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading || success}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.card} />
            ) : (
              <Text style={[styles.buttonText, { color: theme.colors.card }]}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={[styles.linkText, { color: theme.colors.primary }]}>
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
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  form: {
    gap: 16,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  linkText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 8,
  },
  error: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  successContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
});
