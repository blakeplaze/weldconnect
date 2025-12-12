import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { User, Phone, Mail, LogOut, Camera, DollarSign, Briefcase } from 'lucide-react-native';
import { pickImage, updateProfilePicture } from '@/lib/uploadImage';
import { supabase } from '@/lib/supabase';

interface CustomerStats {
  totalSpent: number;
  activeJobs: number;
}

export default function Profile() {
  const { userProfile, session, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

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

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
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
      </View>

      {!loadingStats && stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <DollarSign size={24} color="#34C759" />
              </View>
              <Text style={styles.statValue}>${stats.totalSpent.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Total Spent</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Briefcase size={24} color="#007AFF" />
              </View>
              <Text style={styles.statValue}>{stats.activeJobs}</Text>
              <Text style={styles.statLabel}>Active Jobs</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Mail size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{session?.user.email}</Text>
            </View>
          </View>

          {userProfile?.phone && (
            <View style={styles.infoRow}>
              <Phone size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{userProfile.phone}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
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
});
