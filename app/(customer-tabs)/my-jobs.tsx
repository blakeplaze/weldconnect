import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { Clock, CheckCircle, DollarSign, Star } from 'lucide-react-native';
import ReviewModal from '@/components/ReviewModal';

interface Job {
  id: string;
  title: string;
  city: string;
  state: string;
  status: string;
  created_at: string;
  bid_count?: number;
  winning_bid_id?: string;
  business_id?: string;
  business_name?: string;
  has_review?: boolean;
  review_rating?: number;
}

export default function MyJobs() {
  const { session } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const loadJobs = useCallback(async () => {
    if (!session?.user.id) {
      setLoading(false);
      return;
    }
    try {
      const { data: jobsData, error } = await supabase
        .from('jobs')
        .select('id, title, city, state, status, created_at, winning_bid_id')
        .eq('customer_id', session?.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const jobsWithDetails = await Promise.all(
        (jobsData || []).map(async (job) => {
          const { count } = await supabase
            .from('bids')
            .select('*', { count: 'exact', head: true })
            .eq('job_id', job.id);

          let businessId = null;
          let businessName = null;
          let hasReview = false;
          let reviewRating = null;

          if (job.winning_bid_id) {
            const { data: bidData } = await supabase
              .from('bids')
              .select('businesses!inner(owner_id, business_name)')
              .eq('id', job.winning_bid_id)
              .maybeSingle();

            if (bidData) {
              businessId = (bidData.businesses as any)?.owner_id;
              businessName = (bidData.businesses as any)?.business_name;

              const { data: reviewData } = await supabase
                .from('reviews')
                .select('rating')
                .eq('job_id', job.id)
                .maybeSingle();

              if (reviewData) {
                hasReview = true;
                reviewRating = reviewData.rating;
              }
            }
          }

          return {
            ...job,
            bid_count: count || 0,
            business_id: businessId,
            business_name: businessName,
            has_review: hasReview,
            review_rating: reviewRating,
          };
        })
      );

      setJobs(jobsWithDetails);
    } catch (err) {
      console.error('Error loading jobs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadJobs();
    }, [loadJobs])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadJobs();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return '#FF9500';
      case 'bidding':
        return '#007AFF';
      case 'awarded':
        return '#34C759';
      case 'completed':
        return '#999';
      default:
        return '#999';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
      case 'bidding':
        return <Clock size={16} color={getStatusColor(status)} />;
      case 'awarded':
      case 'completed':
        return <CheckCircle size={16} color={getStatusColor(status)} />;
      default:
        return null;
    }
  };

  const handleLeaveReview = (job: Job) => {
    setSelectedJob(job);
    setReviewModalVisible(true);
  };

  const renderJob = ({ item }: { item: Job }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => router.push(`/job-details/${item.id}` as any)}
    >
      <View style={styles.jobHeader}>
        <Text style={styles.jobTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          {getStatusIcon(item.status)}
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.jobLocation}>
        {item.city}, {item.state}
      </Text>
      <View style={styles.jobFooter}>
        <View style={styles.bidInfo}>
          <DollarSign size={16} color="#666" />
          <Text style={styles.bidCount}>
            {item.bid_count} {item.bid_count === 1 ? 'bid' : 'bids'}
          </Text>
        </View>
        <Text style={styles.dateText}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>

      {item.status === 'completed' && item.business_id && (
        <View style={styles.reviewSection}>
          {item.has_review ? (
            <View style={styles.ratingDisplay}>
              <Text style={styles.ratedText}>Your rating:</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={16}
                    color={star <= (item.review_rating || 0) ? '#FFD700' : '#CCC'}
                    fill={star <= (item.review_rating || 0) ? '#FFD700' : 'none'}
                  />
                ))}
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={(e) => {
                e.stopPropagation();
                handleLeaveReview(item);
              }}
            >
              <Star size={16} color="#007AFF" />
              <Text style={styles.reviewButtonText}>Leave Review</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={jobs}
        renderItem={renderJob}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No jobs posted yet</Text>
            <Text style={styles.emptySubtext}>
              Post your first job to get started
            </Text>
          </View>
        }
      />

      {selectedJob && (
        <ReviewModal
          visible={reviewModalVisible}
          jobId={selectedJob.id}
          businessId={selectedJob.business_id || ''}
          businessName={selectedJob.business_name || ''}
          customerId={session?.user.id || ''}
          onClose={() => {
            setReviewModalVisible(false);
            setSelectedJob(null);
          }}
          onSuccess={() => {
            loadJobs();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  jobTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  jobLocation: {
    fontSize: 14,
    color: '#666',
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  bidInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bidCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  reviewSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  reviewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratedText: {
    fontSize: 14,
    color: '#666',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
});
