import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { CheckCircle, DollarSign, MessageCircle, MapPin, User, Phone } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmModal from '@/components/ConfirmModal';
import SuccessModal from '@/components/SuccessModal';
import { useTheme } from '@/contexts/ThemeContext';
import { localDb, Job, Application } from '@/lib/localDb';

interface WonJob {
  application: Application;
  job: Job;
}

export default function WonJobs() {
  const { session, loading: authLoading, userProfile } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const [wonJobs, setWonJobs] = useState<WonJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [completingJobId, setCompletingJobId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<WonJob | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (session) {
      console.log('Won Jobs: Loading jobs for user', session.user.id);
      loadWonJobs(session.user.id);
    } else {
      console.log('Won Jobs: No session, stopping load');
      setLoading(false);
    }
  }, [authLoading, session]);

  const loadWonJobs = async (userId: string) => {
    try {
      console.log('Won Jobs: Loading applications for user:', userId);

      const applications = await localDb.getApplications({ business_id: userId });
      const acceptedApps = applications.filter(app => app.status === 'accepted');

      const wonJobsData: WonJob[] = [];
      for (const app of acceptedApps) {
        const job = await localDb.getJob(app.job_id);
        if (job) {
          wonJobsData.push({ application: app, job });
        }
      }

      setWonJobs(wonJobsData);
    } catch (err) {
      console.error('Error loading won jobs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    if (session) {
      setRefreshing(true);
      loadWonJobs(session.user.id);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleMessageCustomer = async (wonJob: WonJob) => {
    if (!userProfile?.id) return;

    try {
      console.log('Message customer feature - to be implemented');
    } catch (error) {
      console.error('Error opening conversation:', error);
    }
  };

  const handleMarkComplete = (job: WonJob) => {
    setSelectedJob(job);
    setShowConfirmModal(true);
  };

  const confirmMarkComplete = async () => {
    if (!selectedJob) return;

    setCompletingJobId(selectedJob.job.id);
    try {
      await localDb.updateJob(selectedJob.job.id, { status: 'completed' });

      setShowConfirmModal(false);
      setShowSuccessModal(true);

      if (session) {
        loadWonJobs(session.user.id);
      }
    } catch (error: any) {
      console.error('Error marking job as completed:', error);
    } finally {
      setCompletingJobId(null);
    }
  };

  const renderJob = ({ item }: { item: WonJob }) => {
    const isExpanded = expandedId === item.application.id;
    const isCompleted = item.job.status === 'completed';

    return (
      <TouchableOpacity
        style={[styles.jobCard, { backgroundColor: theme.colors.card }]}
        onPress={() => toggleExpand(item.application.id)}
        activeOpacity={0.7}
      >
        <View style={styles.jobHeader}>
          <View style={styles.titleContainer}>
            <Text style={[styles.jobTitle, { color: theme.colors.text }]}>{item.job.title}</Text>
            {isCompleted && (
              <View style={[styles.completedBadge, { backgroundColor: theme.colors.success + '20' }]}>
                <CheckCircle size={14} color={theme.colors.success} />
                <Text style={[styles.completedText, { color: theme.colors.success }]}>Completed</Text>
              </View>
            )}
          </View>
          <View style={[styles.amountBadge, { backgroundColor: theme.colors.success + '20' }]}>
            <DollarSign size={16} color={theme.colors.success} />
            <Text style={[styles.amountText, { color: theme.colors.success }]}>${item.application.bid_amount.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={[styles.description, { color: theme.colors.textSecondary }]} numberOfLines={isExpanded ? undefined : 2}>
          {item.job.description}
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.primary + '20' },
              isCompleted && { backgroundColor: theme.colors.textSecondary + '20', opacity: 0.5 }
            ]}
            onPress={() => handleMessageCustomer(item)}
            disabled={isCompleted}
          >
            <MessageCircle size={18} color={isCompleted ? theme.colors.textSecondary : theme.colors.primary} />
            <Text style={[
              styles.messageButtonText,
              { color: isCompleted ? theme.colors.textSecondary : theme.colors.primary }
            ]}>
              Message Customer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.success },
              (completingJobId === item.job.id || isCompleted) && { backgroundColor: theme.colors.textSecondary, opacity: 0.5 }
            ]}
            onPress={() => handleMarkComplete(item)}
            disabled={completingJobId === item.job.id || isCompleted}
          >
            {completingJobId === item.job.id ? (
              <ActivityIndicator size="small" color={theme.colors.card} />
            ) : (
              <>
                <CheckCircle size={18} color={theme.colors.card} />
                <Text style={[styles.completeButtonText, { color: theme.colors.card }]}>
                  {isCompleted ? 'Completed' : 'Mark Complete'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {isExpanded && (
          <View style={styles.detailsContainer}>
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            {item.job.image_urls && item.job.image_urls.length > 0 && (
              <View style={styles.imageContainer}>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Job Photo</Text>
                <Image
                  source={{ uri: item.job.image_urls[0] }}
                  style={styles.jobImage}
                  resizeMode="cover"
                />
              </View>
            )}

            <View style={styles.detailRow}>
              <MapPin size={20} color={theme.colors.textSecondary} />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Location</Text>
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>{item.job.location}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <DollarSign size={20} color={theme.colors.textSecondary} />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Budget Range</Text>
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                  ${item.job.budget_min} - ${item.job.budget_max}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.jobFooter}>
          <View style={styles.locationContainer}>
            <MapPin size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.locationText, { color: theme.colors.textSecondary }]}>
              {item.job.location}
            </Text>
          </View>
          <Text style={[styles.tapText, { color: theme.colors.primary }]}>
            {isExpanded ? 'Tap to collapse' : 'Tap for details'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={wonJobs}
        renderItem={renderJob}
        keyExtractor={(item) => item.application.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No jobs won yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
              Keep bidding on available jobs to win projects
            </Text>
          </View>
        }
      />

      <ConfirmModal
        visible={showConfirmModal}
        title="Mark Job as Completed"
        message="Are you sure you want to mark this job as completed? The customer will be able to leave a review."
        confirmText="Mark Complete"
        cancelText="Cancel"
        onConfirm={confirmMarkComplete}
        onCancel={() => setShowConfirmModal(false)}
        loading={completingJobId !== null}
      />

      <SuccessModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Job Completed!"
        message="The job has been marked as completed. The customer can now leave a review."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  jobCard: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleContainer: {
    flex: 1,
    gap: 6,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  amountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  detailsContainer: {
    gap: 12,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailContent: {
    flex: 1,
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 16,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 14,
  },
  tapText: {
    fontSize: 12,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  imageContainer: {
    gap: 8,
    marginBottom: 12,
  },
  jobImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
});
