import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react-native';

interface Bid {
  id: string;
  amount: number;
  notes: string | null;
  created_at: string;
  job: {
    id: string;
    title: string;
    city: string;
    state: string;
    status: string;
    winning_bid_id: string | null;
  };
}

export default function MyBids() {
  const { session, loading: authLoading } = useAuth();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (session) {
      console.log('My Bids: Loading bids for user', session.user.id);
      loadBusinessAndBids(session.user.id);
    } else {
      console.log('My Bids: No session, stopping load');
      setLoading(false);
    }
  }, [authLoading, session]);

  useFocusEffect(
    useCallback(() => {
      if (session) {
        loadBusinessAndBids(session.user.id);
      }
    }, [session])
  );

  const loadBusinessAndBids = async (userId: string) => {
    try {
      console.log('My Bids: Querying businesses for owner_id:', userId);
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', userId)
        .maybeSingle();

      console.log('My Bids: Business query result:', { businessData, businessError });

      if (businessError) {
        console.error('My Bids: Business query error:', businessError);
        setLoading(false);
        return;
      }
      if (!businessData) {
        console.log('My Bids: No business found for user');
        setLoading(false);
        return;
      }

      console.log('My Bids: Found business, loading bids');
      setBusinessId(businessData.id);
      await loadBids(businessData.id);
    } catch (err) {
      console.error('Error loading business:', err);
      setLoading(false);
    }
  };

  const loadBids = async (busId: string) => {
    try {
      const { data, error } = await supabase
        .from('bids')
        .select(
          `
          id,
          amount,
          notes,
          created_at,
          job:jobs!bids_job_id_fkey(id, title, city, state, status, winning_bid_id)
        `
        )
        .eq('business_id', busId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBids(data || []);
    } catch (err) {
      console.error('Error loading bids:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (businessId) {
      loadBids(businessId);
    }
  };

  const getBidStatus = (bid: Bid) => {
    if (bid.job.winning_bid_id === bid.id) {
      return { text: 'WON', color: '#34C759', icon: CheckCircle };
    } else if (bid.job.status === 'awarded') {
      return { text: 'LOST', color: '#FF3B30', icon: XCircle };
    } else {
      return { text: 'PENDING', color: '#FF9500', icon: Clock };
    }
  };

  const renderBid = ({ item }: { item: Bid }) => {
    const status = getBidStatus(item);
    const StatusIcon = status.icon;

    return (
      <View style={styles.bidCard}>
        <View style={styles.bidHeader}>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {item.job.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
            <StatusIcon size={14} color="#fff" />
            <Text style={styles.statusText}>{status.text}</Text>
          </View>
        </View>

        <Text style={styles.jobLocation}>
          {item.job.city}, {item.job.state}
        </Text>

        <View style={styles.amountContainer}>
          <DollarSign size={20} color="#007AFF" />
          <Text style={styles.amountText}>${item.amount.toFixed(2)}</Text>
        </View>

        {item.notes && (
          <Text style={styles.notes} numberOfLines={2}>
            {item.notes}
          </Text>
        )}

        <Text style={styles.dateText}>
          Bid placed: {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
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
        data={bids}
        renderItem={renderBid}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No bids placed yet</Text>
            <Text style={styles.emptySubtext}>
              Browse available jobs to place your first bid
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
  bidCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  bidHeader: {
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
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  amountText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  notes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
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
