import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MapPin, Phone, User, DollarSign, MessageCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

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
  };
}

export default function WonJobs() {
  const { session, loading: authLoading, userProfile } = useAuth();
  const router = useRouter();
  const [wonJobs, setWonJobs] = useState<WonJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
            customer_id
          )
        `
        )
        .eq('business_id', businessData.id);

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

  const renderJob = ({ item }: { item: WonJob }) => {
    const isExpanded = expandedId === item.id;

    return (
      <TouchableOpacity
        style={styles.jobCard}
        onPress={() => toggleExpand(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.jobHeader}>
          <Text style={styles.jobTitle}>{item.job.title}</Text>
          <View style={styles.amountBadge}>
            <DollarSign size={16} color="#34C759" />
            <Text style={styles.amountText}>${item.amount.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={isExpanded ? undefined : 2}>
          {item.job.description}
        </Text>

        <TouchableOpacity
          style={styles.messageButton}
          onPress={() => handleMessageCustomer(item)}
        >
          <MessageCircle size={18} color="#007AFF" />
          <Text style={styles.messageButtonText}>Message Customer</Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.detailsContainer}>
            <View style={styles.divider} />

            {item.job.address && (
              <View style={styles.detailRow}>
                <MapPin size={20} color="#666" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Address</Text>
                  <Text style={styles.detailValue}>{item.job.address}</Text>
                </View>
              </View>
            )}

            {item.job.contact_name && (
              <View style={styles.detailRow}>
                <User size={20} color="#666" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Contact Name</Text>
                  <Text style={styles.detailValue}>{item.job.contact_name}</Text>
                </View>
              </View>
            )}

            {item.job.contact_phone && (
              <View style={styles.detailRow}>
                <Phone size={20} color="#666" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Contact Phone</Text>
                  <Text style={styles.detailValue}>{item.job.contact_phone}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={styles.jobFooter}>
          <View style={styles.locationContainer}>
            <MapPin size={16} color="#666" />
            <Text style={styles.locationText}>
              {item.job.city}, {item.job.state}
            </Text>
          </View>
          <Text style={styles.tapText}>
            {isExpanded ? 'Tap to collapse' : 'Tap for details'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

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
        data={wonJobs}
        renderItem={renderJob}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No jobs won yet</Text>
            <Text style={styles.emptySubtext}>
              Keep bidding on available jobs to win projects
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
    gap: 12,
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
  amountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#34C759',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  detailsContainer: {
    gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
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
    color: '#999',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 16,
    color: '#1a1a1a',
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
    color: '#666',
  },
  tapText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
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
    textAlign: 'center',
  },
});
