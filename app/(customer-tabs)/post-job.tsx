import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { localDb } from '@/lib/localDb';
import { useRouter } from 'expo-router';
import JobPostSuccessModal from '@/components/JobPostSuccessModal';
import { useTheme } from '@/contexts/ThemeContext';

export default function PostJob() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (!title || !description || !location) {
      setError('Please fill in all required fields');
      return;
    }

    if (!userProfile) return;

    setLoading(true);
    try {
      await localDb.createJob({
        customer_id: userProfile.id,
        title,
        description,
        location,
        budget_min: parseFloat(budgetMin) || 0,
        budget_max: parseFloat(budgetMax) || 0,
        status: 'open',
      });

      setTitle('');
      setDescription('');
      setLocation('');
      setBudgetMin('');
      setBudgetMax('');
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error('Error posting job:', err);
      setError(err.message || 'Failed to post job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <JobPostSuccessModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onViewJobs={() => {
          setShowSuccessModal(false);
          router.push('/(customer-tabs)/my-jobs');
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.card }]}>Post a Welding Job</Text>
          <Text style={styles.headerSubtitle}>
            Describe your project and local businesses will bid on it
          </Text>
        </View>

        {error ? <Text style={[styles.error, { backgroundColor: theme.colors.error + '20', color: theme.colors.error }]}>{error}</Text> : null}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Job Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.input || theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="e.g., Steel Railing Installation"
              placeholderTextColor={theme.colors.textSecondary}
              value={title}
              onChangeText={setTitle}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.colors.input || theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Describe the welding work needed..."
              placeholderTextColor={theme.colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Location *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.input || theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="e.g., Austin, TX"
              placeholderTextColor={theme.colors.textSecondary}
              value={location}
              onChangeText={setLocation}
              editable={!loading}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Min Budget ($)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.input || theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="500"
                placeholderTextColor={theme.colors.textSecondary}
                value={budgetMin}
                onChangeText={setBudgetMin}
                keyboardType="numeric"
                editable={!loading}
              />
            </View>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Max Budget ($)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.input || theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="1000"
                placeholderTextColor={theme.colors.textSecondary}
                value={budgetMax}
                onChangeText={setBudgetMax}
                keyboardType="numeric"
                editable={!loading}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: theme.colors.primary },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.card} />
            ) : (
              <Text style={[styles.submitButtonText, { color: theme.colors.card }]}>
                Post Job
              </Text>
            )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    padding: 24,
    paddingTop: 32,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
  },
  form: {
    padding: 16,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  error: {
    padding: 12,
    borderRadius: 8,
    margin: 16,
    marginBottom: 0,
    textAlign: 'center',
  },
});
