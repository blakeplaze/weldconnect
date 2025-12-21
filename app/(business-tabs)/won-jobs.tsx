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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MapPin, Phone, User, DollarSign, MessageCircle, CheckCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import ConfirmModal from '@/components/ConfirmModal';
import SuccessModal from '@/components/SuccessModal';
import { useTheme } from '@/contexts/ThemeContext';

interface WonJob {
  id: string;
  job_id: string;
  amount: number;
  job: {
    id: string;
    title: string;
    description: string;
    city: string;
    state: string;
    address: string | null;
    contact_name: string | null;
    contact_phone: string | null;
    status: string;
    customer_id: string;
    job_image_url: string | null;
  };
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
      console.log('Won Jobs: Querying businesses for owner_id:', userId);
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', userId)
        .maybeSingle();

      console.log('Won Jobs: Business query result:', { businessData, businessError });

      if (businessError) {
        console.error('Won Jobs: Business query error:', businessError);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (!businessData) {
        console.log('Won Jobs: No business found for user');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      console.log('Won Jobs: Found business, loading won jobs');
      const { data, error } = await supabase
        .from('bids')
        .select(
          `
          id,
          job_id,
          amount,
          job:jobs!bids_job_id_fkey(
            id,
            title,
            description,
            city,
            state,
            address,
            contact_name,
            contact_phone,
            status,
            winning_bid_id,
            customer_id,
            job_image_url,
            created_at
          )
        `
        )
        .eq('business_id', businessData.id)
        .order('created_at', { foreignTable: 'jobs', ascending: false });

      if (error) {
        console.error('Won Jobs: Bids query error:', error);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const normalizedData = (data || []).map((bid: any) => ({
        ...bid,
        job: Array.isArray(bid.job) ? bid.job[0] : bid.job,
      }));

      const won = normalizedData.filter(
        (bid: any) => bid.job.winning_bid_id === bid.id
      );
      setWonJobs(won);
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

  const handleMessageCustomer = async (job: WonJob) => {
    if (!userProfile?.id) return;

    try {
      const { data: existingConversation, error: findError } = await supabase
        .from('conversations')
        .select('id')
        .eq('job_id', job.job_id)
        .eq('business_id', userProfile.id)
        .maybeSingle();

      if (findError) throw findError;

      if (existingConversation) {
        router.push(`/chat/${existingConversation.id}`);
      } else {
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert({
            job_id: job.job_id,
            customer_id: job.job.customer_id,
            business_id: userProfile.id,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        router.push(`/chat/${newConversation.id}`);
      }
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

    setCompletingJobId(selectedJob.job_id);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'completed' })
        .eq('id', selectedJob.job_id);

      if (error) throw error;

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
    const isExpanded = expandedId === item.id;
    const isAwarded = item.job.status === 'awarded';
    const isCompleted = item.job.status === 'completed';

    return (
      <TouchableOpacity
        style={[styles.jobCard, { backgroundColor: theme.colors.card }]}
        onPress={() => toggleExpand(item.id)}
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
            <Text style={[styles.amountText, { color: theme.colors.success }]}>${item.amount.toFixed(2)}</Text>
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

          {(isAwarded || isCompleted) && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.success },
                (completingJobId === item.job_id || isCompleted) && { backgroundColor: theme.colors.textSecondary, opacity: 0.5 }
              ]}
              onPress={() => handleMarkComplete(item)}
              disabled={completingJobId === item.job_id || isCompleted}
            >
              {completingJobId === item.job_id ? (
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
          )}
        </View>

        {isExpanded && (
          <View style={styles.detailsContainer}>
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            {item.job.job_image_url && (
              <View style={styles.imageContainer}>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Job Photo</Text>
                <Image
                  source={{ uri: item.job.job_image_url }}
                  style={styles.jobImage}
                  resizeMode="cover"
                />
              </View>
            )}

            {item.job.address && (
              <View style={styles.detailRow}>
                <MapPin size={20} color={theme.colors.textSecondary} />
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Address</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>{item.job.address}</Text>
                </View>
              </View>
            )}

            {item.job.contact_name && (
              <View style={styles.detailRow}>
                <User size={20} color={theme.colors.textSecondary} />
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Contact Name</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>{item.job.contact_name}</Text>
                </View>
              </View>
            )}

            {item.job.contact_phone && (
              <View style={styles.detailRow}>
                <Phone size={20} color={theme.colors.textSecondary} />
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Contact Phone</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>{item.job.contact_phone}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={styles.jobFooter}>
          <View style={styles.locationContainer}>
            <MapPin size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.locationText, { color: theme.colors.textSecondary }]}>
              {item.job.city}, {item.job.state}
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
        keyExtractor={(item) => item.id}
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
