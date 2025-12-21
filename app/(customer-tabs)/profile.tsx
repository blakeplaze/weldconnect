import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, TextInput, Switch } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { User, Phone, Mail, LogOut, Camera, DollarSign, Briefcase, Lock, FileText, Moon, Sun } from 'lucide-react-native';
import { pickImage, updateProfilePicture } from '@/lib/uploadImage';
import { supabase } from '@/lib/supabase';

interface CustomerStats {
  totalSpent: number;
  activeJobs: number;
}

export default function Profile() {
  const { userProfile, session, signOut, refreshProfile } = useAuth();
  const { theme, themeMode, setThemeMode } = useTheme();
  const router = useRouter();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (session?.user.id) {
      loadCustomerStats(session.user.id);
    }
  }, [session?.user.id]);

  const loadCustomerStats = async (userId: string) => {
    try {
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, status, winning_bid_id')
        .eq('customer_id', userId);

      if (jobsError) throw jobsError;

      const activeJobs = jobs?.filter(
        j => j.status === 'open' || j.status === 'awaiting_completion'
      ).length || 0;

      const completedJobsWithWinners = jobs?.filter(j => j.winning_bid_id !== null) || [];

      let totalSpent = 0;
      if (completedJobsWithWinners.length > 0) {
        const winningBidIds = completedJobsWithWinners.map(j => j.winning_bid_id);
        const { data: bids, error: bidsError } = await supabase
          .from('bids')
          .select('id, amount')
          .in('id', winningBidIds);

        if (bidsError) throw bidsError;

        totalSpent = bids?.reduce((sum, bid) => sum + Number(bid.amount), 0) || 0;
      }

      setStats({
        totalSpent,
        activeJobs,
      });
    } catch (err) {
      console.error('Error loading customer stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleUploadProfilePicture = async () => {
    if (!session?.user.id) return;

    try {
      setUploadingImage(true);
      const image = await pickImage();

      if (image) {
        await updateProfilePicture(session.user.id, image.uri);
        await refreshProfile();
        Alert.alert('Success', 'Profile picture updated successfully');
      }
    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      Alert.alert('Error', error.message || 'Failed to upload profile picture');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      Alert.alert('Success', 'Password updated successfully');
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      Alert.alert('Error', error.message || 'Failed to update password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSignOut = async () => {
    console.log('Profile: Sign out button pressed');
    try {
      console.log('Profile: Calling signOut function');
      await signOut();
      console.log('Profile: SignOut completed successfully');
    } catch (error: any) {
      console.error('Profile: Error signing out:', error);
      Alert.alert('Error', error?.message || 'Failed to sign out. Please try again.');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarContainer}>
            {userProfile?.profile_picture_url ? (
              <Image
                source={{ uri: userProfile.profile_picture_url }}
                style={styles.avatarImage}
              />
            ) : (
              <User size={48} color="#fff" />
            )}
          </View>
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={handleUploadProfilePicture}
            disabled={uploadingImage}
          >
            {uploadingImage ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Camera size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.name}>{userProfile?.full_name}</Text>
        <Text style={styles.userType}>Customer Account</Text>
        {session?.user.created_at && (
          <Text style={styles.accountDate}>
            Member since {new Date(session.user.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        )}
      </View>

      {!loadingStats && stats && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Activity</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
              <View style={[styles.statIconContainer, { backgroundColor: theme.colors.surfaceLight }]}>
                <DollarSign size={24} color="#34C759" />
              </View>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>${stats.totalSpent.toFixed(0)}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Spent</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
              <View style={[styles.statIconContainer, { backgroundColor: theme.colors.surfaceLight }]}>
                <Briefcase size={24} color="#007AFF" />
              </View>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{stats.activeJobs}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Active Jobs</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Account Information</Text>

        <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.infoRow}>
            <Mail size={20} color={theme.colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Email</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>{session?.user.email}</Text>
            </View>
          </View>

          {userProfile?.phone && (
            <View style={styles.infoRow}>
              <Phone size={20} color={theme.colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>Phone</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>{userProfile.phone}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Security</Text>

        {!changingPassword ? (
          <TouchableOpacity
            style={[styles.changePasswordButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.primary }]}
            onPress={() => setChangingPassword(true)}
          >
            <Lock size={20} color={theme.colors.primary} />
            <Text style={[styles.changePasswordText, { color: theme.colors.primary }]}>Change Password</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.passwordForm, { backgroundColor: theme.colors.card }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>New Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor={theme.colors.placeholderText}
                secureTextEntry
                editable={!updatingPassword}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Confirm Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={theme.colors.placeholderText}
                secureTextEntry
                editable={!updatingPassword}
              />
            </View>

            <View style={styles.passwordActions}>
              <TouchableOpacity
                style={[styles.passwordButton, styles.savePasswordButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleChangePassword}
                disabled={updatingPassword}
              >
                {updatingPassword ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.savePasswordButtonText}>Update Password</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.passwordButton, styles.cancelPasswordButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => {
                  setChangingPassword(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={updatingPassword}
              >
                <Text style={[styles.cancelPasswordButtonText, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={[styles.themeCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.themeRow}>
            <View style={styles.themeIconContainer}>
              {themeMode === 'dark' ? (
                <Moon size={20} color={theme.colors.primary} />
              ) : (
                <Sun size={20} color={theme.colors.primary} />
              )}
            </View>
            <View style={styles.themeContent}>
              <Text style={[styles.themeLabel, { color: theme.colors.text }]}>Dark Mode</Text>
              <Text style={[styles.themeDescription, { color: theme.colors.textSecondary }]}>
                {themeMode === 'dark' ? 'Dark theme enabled' : 'Light theme enabled'}
              </Text>
            </View>
            <Switch
              value={themeMode === 'dark'}
              onValueChange={(value) => setThemeMode(value ? 'dark' : 'light')}
              trackColor={{ false: '#d1d5db', true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Legal</Text>
        <TouchableOpacity
          style={[styles.privacyButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.primary }]}
          onPress={() => router.push('/privacy-policy')}
        >
          <FileText size={20} color={theme.colors.primary} />
          <Text style={[styles.privacyText, { color: theme.colors.primary }]}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={[styles.signOutButton, { backgroundColor: theme.colors.card }]} onPress={handleSignOut}>
          <LogOut size={20} color="#FF3B30" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 24,
    paddingTop: 32,
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  userType: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  accountDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    fontStyle: 'italic',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoContent: {
    flex: 1,
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  changePasswordText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  passwordForm: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#fff',
  },
  passwordActions: {
    gap: 12,
    marginTop: 8,
  },
  passwordButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  savePasswordButton: {
    backgroundColor: '#007AFF',
  },
  savePasswordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelPasswordButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelPasswordButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  privacyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  privacyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  themeCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeContent: {
    flex: 1,
    gap: 4,
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  themeDescription: {
    fontSize: 13,
  },
});
