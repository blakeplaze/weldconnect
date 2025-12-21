import { useState, useCallback } from 'react';
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
import { DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useApplications } from '@/contexts/DatabaseContext';

export default function MyBids() {
  const { userProfile } = useAuth();
  const { theme } = useTheme();
  const { applications, loading, refresh } = useApplications({ business_id: userProfile?.id });
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const getBidStatus = (status: string) => {
    if (status === 'accepted') {
      return { text: 'WON', color: theme.colors.success, icon: CheckCircle };
    } else if (status === 'rejected') {
      return { text: 'LOST', color: theme.colors.error, icon: XCircle };
    } else {
      return { text: 'PENDING', color: theme.colors.warning, icon: Clock };
    }
  };

  const renderBid = ({ item }: { item: any }) => {
    const status = getBidStatus(item.status);
    const StatusIcon = status.icon;

    return (
      <View style={[styles.bidCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.bidHeader}>
          <Text style={[styles.jobTitle, { color: theme.colors.text }]} numberOfLines={1}>
            Job Application
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
            <StatusIcon size={14} color={theme.colors.card} />
            <Text style={[styles.statusText, { color: theme.colors.card }]}>{status.text}</Text>
          </View>
        </View>

        <View style={styles.amountContainer}>
          <DollarSign size={20} color={theme.colors.primary} />
          <Text style={[styles.amountText, { color: theme.colors.primary }]}>${item.bid_amount.toFixed(2)}</Text>
        </View>

        {item.message && (
          <Text style={[styles.notes, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {item.message}
          </Text>
        )}

        <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
          Bid placed: {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
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
        data={applications}
        renderItem={renderBid}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No bids placed yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
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
  },
  notes: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  dateText: {
    fontSize: 12,
    marginTop: 8,
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
});
