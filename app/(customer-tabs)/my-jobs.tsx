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
import { Clock, CheckCircle, DollarSign } from 'lucide-react-native';

interface Job {
  id: string;
  title: string;
  city: string;
  state: string;
  status: string;
  created_at: string;
  bid_count?: number;
}

export default function MyJobs() {
  const { session } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadJobs();
    }, [])
  );

  const loadJobs = async () => {
    try {
      const { data: jobsData, error } = await supabase
        .from('jobs')
        .select('id, title, city, state, status, created_at')
        .eq('customer_id', session?.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const jobsWithBids = await Promise.all(
        (jobsData || []).map(async (job) => {
          const { count } = await supabase
            .from('bids')
            .select('*', { count: 'exact', head: true })
            .eq('job_id', job.id);

          return { ...job, bid_count: count || 0 };
        })
      );

      setJobs(jobsWithBids);
    } catch (err) {
      console.error('Error loading jobs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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
});
