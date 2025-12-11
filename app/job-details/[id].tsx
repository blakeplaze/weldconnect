import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { MapPin, DollarSign, Clock, CheckCircle, Award } from 'lucide-react-native';
import JobAwardConfirmModal from '@/components/JobAwardConfirmModal';
import JobAwardSuccessModal from '@/components/JobAwardSuccessModal';

interface Job {
  id: string;
  title: string;
  description: string;
  city: string;
  state: string;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  status: string;
  winning_bid_id: string | null;
  created_at: string;
  job_image_url: string | null;
}

interface Bid {
  id: string;
  amount: number;
  notes: string | null;
  created_at: string;
  business: {
    business_name: string;
  };
}

export default function JobDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [awarding, setAwarding] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [winningBid, setWinningBid] = useState<{ businessName: string; amount: number } | undefined>();

  useEffect(() => {
    loadJobDetails();
  }, [id]);

  const loadJobDetails = async () => {
    try {
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (jobError) throw jobError;
      setJob(jobData);

      const { data: bidsData, error: bidsError } = await supabase
        .from('bids')
        .select(
          `
          id,
          amount,
          notes,
          created_at,
          business:businesses(business_name)
        `
        )
        .eq('job_id', id)
        .order('amount', { ascending: true });

      if (bidsError) throw bidsError;
      setBids(bidsData || []);
    } catch (err) {
      console.error('Error loading job details:', err);
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const calculateAverage = () => {
    if (bids.length === 0) return 0;
    const sum = bids.reduce((acc, bid) => acc + bid.amount, 0);
    return sum / bids.length;
  };

  const handleAwardJob = () => {
    if (bids.length === 0) {
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmAwardJob = async () => {
    setAwarding(true);
    try {
      const { data, error } = await supabase.rpc('calculate_and_award_job', {
        p_job_id: id,
      });

      if (error) throw error;

      const winningBidId = data?.[0]?.v_winner_bid_id;
      const winningBidAmount = data?.[0]?.v_winner_amount;

      if (winningBidId) {
        const winningBidData = bids.find(b => b.id === winningBidId);
        if (winningBidData) {
          setWinningBid({
            businessName: winningBidData.business.business_name,
            amount: winningBidAmount || winningBidData.amount,
          });
        }
      }

      setShowConfirmModal(false);
      setShowSuccessModal(true);
      await loadJobDetails();
    } catch (err: any) {
      console.error('Error awarding job:', err);
      setShowConfirmModal(false);
    } finally {
      setAwarding(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Job not found</Text>
      </View>
    );
  }

  const average = calculateAverage();
  const isAwarded = job.status === 'awarded';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.statusContainer}>
          {isAwarded ? (
            <CheckCircle size={20} color="#34C759" />
          ) : (
            <Clock size={20} color="#FF9500" />
          )}
          <Text style={[styles.status, isAwarded && styles.statusAwarded]}>
            {job.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>{job.title}</Text>
        <View style={styles.locationRow}>
          <MapPin size={16} color="#666" />
          <Text style={styles.location}>
            {job.city}, {job.state}
          </Text>
        </View>
      </View>

      {job.job_image_url && (
        <View style={styles.imageCard}>
          <Image source={{ uri: job.job_image_url }} style={styles.jobImage} />
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{job.description}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Bids Received ({bids.length})</Text>

        {bids.length > 0 && (
          <View style={styles.averageContainer}>
            <Award size={20} color="#FF9500" />
            <Text style={styles.averageLabel}>Average Bid:</Text>
            <Text style={styles.averageAmount}>${average.toFixed(2)}</Text>
          </View>
        )}

        {bids.length === 0 ? (
          <Text style={styles.noBidsText}>No bids yet</Text>
        ) : (
          <View style={styles.bidsList}>
            {bids.map((bid) => (
              <View
                key={bid.id}
                style={[
                  styles.bidItem,
                  job.winning_bid_id === bid.id && styles.winningBid,
                ]}
              >
                <View style={styles.bidHeader}>
                  <Text style={styles.businessName}>{bid.business.business_name}</Text>
                  <View style={styles.bidAmountContainer}>
                    <DollarSign size={16} color="#007AFF" />
                    <Text style={styles.bidAmount}>${bid.amount.toFixed(2)}</Text>
                  </View>
                </View>
                {bid.notes && (
                  <Text style={styles.bidNotes}>{bid.notes}</Text>
                )}
                {job.winning_bid_id === bid.id && (
                  <View style={styles.winnerBadge}>
                    <CheckCircle size={14} color="#34C759" />
                    <Text style={styles.winnerText}>WINNER</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {!isAwarded && bids.length > 0 && (
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.awardButton}
            onPress={handleAwardJob}
          >
            <Award size={20} color="#fff" />
            <Text style={styles.awardButtonText}>Award Job to Winner</Text>
          </TouchableOpacity>
          <Text style={styles.awardHint}>
            The bid closest to the average will automatically win
          </Text>
        </View>
      )}

      {isAwarded && job.address && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Job Contact Details</Text>
          <Text style={styles.contactInfo}>
            These details have been shared with the winning bidder
          </Text>
          {job.address && (
            <Text style={styles.detailText}>Address: {job.address}</Text>
          )}
          {job.contact_name && (
            <Text style={styles.detailText}>Contact: {job.contact_name}</Text>
          )}
          {job.contact_phone && (
            <Text style={styles.detailText}>Phone: {job.contact_phone}</Text>
          )}
        </View>
      )}

      <JobAwardConfirmModal
        visible={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmAwardJob}
        averageAmount={average}
        bidCount={bids.length}
        loading={awarding}
      />

      <JobAwardSuccessModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        winningBid={winningBid}
      />
    </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    paddingVertical: 8,
  },
  backText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
  },
  statusAwarded: {
    color: '#34C759',
  },
  section: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  imageCard: {
    backgroundColor: '#fff',
    marginBottom: 8,
    overflow: 'hidden',
  },
  jobImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  averageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#fff9e6',
    borderRadius: 8,
    marginBottom: 16,
  },
  averageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  averageAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF9500',
  },
  noBidsText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 24,
  },
  bidsList: {
    gap: 12,
  },
  bidItem: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  winningBid: {
    backgroundColor: '#e8f5e9',
    borderColor: '#34C759',
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  bidAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bidAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  bidNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  winnerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34C759',
  },
  awardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  awardButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  awardHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  contactInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
  },
});
